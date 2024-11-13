/* eslint-disable curly */
import * as alg from '../tools/algorithm'
import { TokenType, Token, Tokenizer } from './tokenizer'

/**
 * The name of a class.
 * e.g. 'MyClass', 'MyTemplatedClass<int>'
 */
export type ClassName = { name: string, args: ClassName[] | undefined };

/**
 * Base class declaration, part of a class declaration.
 * e.g. 'public MyBase' as in 'class MyClass : public MyBase'.
 */
export type BaseDecl = { access: string | undefined, className: ClassName };

/**
 * Class declaration. Goes up until a left curly brace.
 * e.g. 'class MyClass {'
 */
export type ClassDecl = { className: string, attribute: string | undefined, bases: BaseDecl[] | undefined };

export enum SegmentType {
    /**
     * A segment that looks like a standard C++ attribute.
     * @example `[[no_discard]]`
     */
    AttributeLike,
    /**
     * A symbol, operator, etc.
     * @example `*`
     * @example `&`
     */
    Symbol,
    /**
     * `operator+` etc.
     * @example `operator+`
     * @example `operator*`
     */
    OperatorName,
    /**
     * An identifier.
     * @example `Q_DECL_EXPORT`
     * @example `std::uint8_t`
     * @example `const`
     */
    MacroLike,
    /**
     * An identifier followed by `()` containing args.
     * @example `__attribute__((visibility("default")))`
     * @example `foo()`
     */
    FunctionLikeWithParen,
    /**
     * An identifier followed by `<>` containing args.
     * @example `std::vector<int>`
     */
    FunctionLikeWithAngleBrackets,
    /**
     * An identifier followed by `[]` containing args.
     * @example `int[8]`
     */
    FunctionLikeWithBrackets,
}

/**
 * A segment is a 'word' in a method declaration. See {@link SegmentType}.
 */
export type Segment = { text: string, type: SegmentType }

/**
 * A method declaration.
 */
export type MethodDecl = { nameSegment: number, segments: Segment[] }

/**
 * Parses part of the C++ language.
 */
export class Parser {

    tokenizer: Tokenizer;

    constructor(tokenizer: Tokenizer) {
        this.tokenizer = tokenizer;
    }

    /**
     * Get next token that is not a space/comment etc.
     * @returns 
     */
    private nextGoodToken(): Token | undefined {
        let token;
        while (token = this.tokenizer.next()) {
            switch (token.type) {
                case TokenType.Space:
                case TokenType.Comment:
                    break;
                default:
                    return token;
            }
        }
        return undefined;
    }

    public parseTextUpToCursor(): ClassDecl | undefined {
        let tokenizer = this.tokenizer;
        let token;
        let scopeStack: { classDecl: ClassDecl | undefined }[] = [];
        let limit = 200000;
        while ((token = tokenizer.next()) !== undefined) {
            if (limit-- <= 0)
                return undefined;
            if (token.type == TokenType.ClassKeyword) {
                let tokenText = token.text;
                let classDecl = this.tryParse(() => {
                    tokenizer.prepend(tokenText);
                    return this.parseClassDecl();
                });
                if (classDecl) {
                    scopeStack.push({ classDecl: classDecl });
                }
            }
            else if (token.type == TokenType.LBrace) {
                scopeStack.push({ classDecl: undefined });
            }
            else if (token.type == TokenType.RBrace) {
                if (scopeStack.length > 0) {
                    scopeStack.pop();
                }
            }
        }
        if (scopeStack.length === 0) {
            return undefined;
        }
        for (let i = scopeStack.length - 1; i >= 0; i--) {
            if (scopeStack[i].classDecl !== undefined) {
                return scopeStack[i].classDecl;
            }
        }
        return undefined;
    }

    /**
     * Parses the `class` keyword, any attributes following the `class` keyword, the class name and the `final` specifier. 
     * @example `class MyClass`
     * @example `class __declspec(dllexport) MyClass`
     * @example `class EXPORT_STUFF MyClass final`
     */
    private parseNameAndAttrInClassDecl(): { name: string; attribute: string | undefined; postAttribute: string | undefined } | undefined {
        const classKw = this.nextGoodToken();
        if (!classKw || classKw.type !== TokenType.ClassKeyword) { return undefined; }

        let count = 0;
        /** if the input is `class EXPORT MyClass FINAL {`
         * find segments between `class` and `{` */
        let segments: Segment[] = [];
        while (true) {
            const token = this.nextGoodToken();
            if (!token)
                return undefined;
            this.tokenizer.prepend(token.text);
            if (token.type === TokenType.Column ||
                token.type === TokenType.LBrace
            ) {
                break;
            }
            const seg = this.parseSegment();
            if (!seg) {
                return undefined;
            }
            segments.push(seg);
            if (count++ > 50)
                return undefined;
        }

        if (segments.length === 0) {
            return undefined;
        }

        // find last 'macro like' segment as it is the most likely to be the class's name
        const keySegmentIndex = alg.findLastIndex(segments,
            (seg: Segment) => seg.text !== "final" && seg.type === SegmentType.MacroLike);
        if (keySegmentIndex === undefined)
            return undefined;
        let attr: string | undefined = "";
        let postAttr: string | undefined = "";
        let className = segments[keySegmentIndex].text;
        for (let i = 0; i < segments.length; i++) {
            if (i < keySegmentIndex)
                attr += segments[i].text + " ";
            else if (i > keySegmentIndex)
                postAttr += segments[i].text + " ";
        }
        attr = attr.trim();
        postAttr = postAttr.trim();
        if (attr === "")
            attr = undefined;
        if (postAttr === "")
            postAttr = undefined;
        return { name: className, attribute: attr, postAttribute: postAttr };
    }

    /**
     * Parses class declaration until left curly brace.
     * @example `class EXPORT_STUFF MyClass final {`
     * @example `class MyClass : public Base1, public Base2 {`
     */
    public parseClassDecl(): ClassDecl | undefined {
        const nameAndAttr = this.parseNameAndAttrInClassDecl();
        if (!nameAndAttr) {
            return undefined;
        }
        let token = this.nextGoodToken();
        if (!token) {
            return undefined;
        }
        // class A : ... {
        //         \__ token
        if (token.type === TokenType.Column) {
            let bases;
            if (bases = this.parseBaseList()) {
                const brace = this.nextGoodToken();
                if (!brace || brace.type !== TokenType.LBrace) { return undefined; }
                return {
                    className: nameAndAttr.name,
                    attribute: nameAndAttr.attribute,
                    bases: bases,
                };
            }
            return undefined;
        }
        // class A {
        //         \___ token
        else if (token.type === TokenType.LBrace) {
            return {
                className: nameAndAttr.name,
                attribute: nameAndAttr.attribute,
                bases: undefined,
            };
        }
        else {
            return undefined;
        }
    }

    /**
     * Parses a comma separated list of anything.
     */
    private parseCommaSeparatedList<Item>(parseItem: () => Item | undefined): Item[] | undefined {
        let items: Item[] = [];
        let count = 0;
        while (count < 99) {
            const item = parseItem();
            if (!item) { return undefined; }
            items.push(item);
            let maybeComma = this.nextGoodToken();
            if (!maybeComma) { return items; }
            if (maybeComma.type !== TokenType.Comma) {
                this.tokenizer.prepend(maybeComma.text);
                return items;
            }
            count++;
        }
        return undefined;
    }

    /**
     * Parses a comma separated list of base specifiers.
     * @example `public Base1, public Base2, ... , public BaseN`
     */
    private parseBaseList(): BaseDecl[] | undefined {
        const items = this.parseCommaSeparatedList(() => {
            return this.parseBase();
        });
        return items;
    }

    /**
     * Parses a base specifier.
     * @example `Base`
     * @example `private std::vector<int>`
     */
    private parseBase(): BaseDecl | undefined {
        const publicKwOrIdent = this.nextGoodToken();
        if (!publicKwOrIdent) { return undefined; }
        switch (publicKwOrIdent.type) {
            case TokenType.PublicKeyword: {
                let r;
                if (r = this.parseClassName()) {
                    return {
                        access: publicKwOrIdent.text,
                        className: r
                    };
                }
            }
                break;
            case TokenType.Ident: {
                this.tokenizer.prepend(publicKwOrIdent.text);
                let r;
                if (r = this.parseClassName()) {
                    return {
                        access: undefined,
                        className: r
                    };
                }
            }
                break;
            default:
                return undefined;
        }
        return undefined;
    }

    /**
     * Parses a qualified name.
     * @example `A`
     * @example `ns::B`
     * @example `ns::~C`
     */
    private parseQualifiedName() {
        let name = "";
        let token;
        let lastTokenType = undefined;
        const nonrepeatableTokens = [TokenType.Ident, TokenType.ColumnColumn, TokenType.Tilde];
        const repeatableTokens: TokenType[] = [];
        while (token = this.nextGoodToken()) {
            const isRepeatableToken = repeatableTokens.includes(token.type);
            const isNonRepeatableToken = nonrepeatableTokens.includes(token.type);
            const isAllowedToken = isRepeatableToken || isNonRepeatableToken;
            if (!isAllowedToken ||
                isNonRepeatableToken && token.type === lastTokenType) {
                this.tokenizer.prepend(token.text);
                break;
            }
            name = name + token.text;
            lastTokenType = token.type;
        }
        if (name === "") {
            return undefined;
        }
        return name;
    }

    /**
     * Parses a qualified name optionally followed by template args.
     * @example `ns::MyClassTemplate<>`
     */
    private parseClassName(): ClassName | undefined {
        const ident = this.parseQualifiedName();
        if (!ident) { return undefined; }
        const maybeLAngleBracket = this.nextGoodToken();
        if (!maybeLAngleBracket) { return { name: ident, args: [] }; }
        if (maybeLAngleBracket.type !== TokenType.LAngleBracket) {
            this.tokenizer.prepend(maybeLAngleBracket.text);
            return { name: ident, args: undefined };
        }
        const args = this.parseTemplateArgList();
        if (!args) { return undefined; }
        const rAngleBracket = this.nextGoodToken();
        if (!rAngleBracket || rAngleBracket.type !== TokenType.RAngleBracket) { return undefined; }
        return { name: ident, args: args };
    }

    /**
     * Parses template args.
     * @example `int, double, WTF<int>`
     */
    private parseTemplateArgList(): ClassName[] | undefined {
        const args = this.parseCommaSeparatedList(() => {
            return this.parseClassName();
        });
        return args;
    }

    /**
     * Parses a method declaration. To simplify things, we see methods as an array of `Segment`s. The last segment with a pair of parentheses is considered to be the method's name.
     */
    public parseMethodDecl(): MethodDecl | undefined {
        let seg;
        let segments: Segment[] = [];
        while (seg = this.parseSegment()) {
            segments.push(seg);
            const semi = this.nextGoodToken();
            if (!semi)
                return undefined;
            if (semi.type === TokenType.SemiColumn) {
                // find the method name
                for (let i = segments.length - 1; i >= 0; i--) {
                    const currentSegment = segments[i];
                    if (currentSegment.type === SegmentType.FunctionLikeWithParen) {
                        return { nameSegment: i, segments: segments };
                    }
                }
                return undefined;
            } else {
                this.tokenizer.prepend(semi.text);
            }
        }
        return undefined;
    }

    /**
     * Parses consecutive method declarations.
     */
    public parseMethodDecls(): MethodDecl[] | undefined {
        let methods: MethodDecl[] = [];
        let method;
        while (method = this.parseMethodDecl()) {
            methods.push(method);
        }
        return methods.length > 0 ? methods : undefined;
    }


    /**
     * Attempts to parse an AST node using the provided parsing function.
     * The tokenizer state is saved before parsing. If parsing fails (i.e., `tryFn` returns `undefined`),
     * the tokenizer is restored to the saved state.
     * 
     * @param tryFn - A function that attempts to parse an AST node and returns it, or `undefined` if parsing fails.
     * @returns The parsed AST node if successful, otherwise `undefined`.
     */
    private tryParse<Ast>(tryFn: () => Ast | undefined) {
        this.tokenizer.push();
        const ast = tryFn();
        if (ast === undefined) // failed
            this.tokenizer.pop()
        else
            this.tokenizer.drop();
        return ast;
    }

    /**
     * Parses a segment. See {@link Segment}.
     */
    private parseSegment(): Segment | undefined {
        let segment;
        if (segment = this.tryParse(() => this.parseNamedSegment())) {
            return segment;
        }
        if (segment = this.tryParse(() => this.parseAttributeLikeSegment())) {
            return segment;
        }
        if (segment = this.tryParse(() => this.parseSymbolSegment())) {
            return segment;
        }
        return undefined;
    }

    /**
     * See {@link SegmentType.Symbol}
     */
    private parseSymbolSegment(): Segment | undefined {
        const token = this.nextGoodToken();
        if (!token)
            return undefined;
        switch (token.type) {
            case TokenType.Ampersand:
            case TokenType.Star:
                return { text: token.text, type: SegmentType.Symbol };
        }
        return undefined;
    }

    private parseOperatorNameSegment(): Segment | undefined {
        // const token = this.nextGoodToken();
        // if (!token)
        //     return undefined;
        // if (token.type === TokenType.Ident && token.text == "operator") {
        //     const op = this.nextGoodToken();
        //     if (!op)
        //         return undefined;
        //     switch (op.type) {
        //         case TokenType.Plus:
        //     }
        //     return { text: token.text + op.text, type: SegmentType.OperatorName };
        // }
        return undefined;
    }

    /**
     * See {@link SegmentType.AttributeLike}
     */
    private parseAttributeLikeSegment(): Segment | undefined {
        const token = this.nextGoodToken();
        if (!token)
            return undefined;
        if (token.type === TokenType.LBracket) {
            this.tokenizer.prepend(token.text);
            const content = this.parseBracketContent(TokenType.LBracket, TokenType.RBracket);
            if (!content)
                return undefined;
            return { text: content, type: SegmentType.AttributeLike };
        }
        return undefined;
    }

    /**
     * Parses a macro-like or function-like segment. See {@link SegmentType}.
     */
    private parseNamedSegment(): Segment | undefined {
        const qualName = this.parseQualifiedName();
        if (!qualName)
            return undefined;
        const token = this.nextGoodToken();
        if (!token)
            return { text: qualName, type: SegmentType.MacroLike };

        // if token is a type of parenthesis, rightParen will be defined
        let rightParen = undefined;
        let segmentType = undefined;
        if (token.type === TokenType.LParen) {
            rightParen = TokenType.RParen;
            segmentType = SegmentType.FunctionLikeWithParen;
        } else if (token.type === TokenType.LAngleBracket) {
            rightParen = TokenType.RAngleBracket;
            segmentType = SegmentType.FunctionLikeWithAngleBrackets;
        } else if (token.type === TokenType.LBracket) {
            rightParen = TokenType.RBracket;
            segmentType = SegmentType.FunctionLikeWithBrackets;
        }

        // with args. e.g. FOO(BAR<int>, BAZ)
        if (rightParen) {
            this.tokenizer.prepend(token.text);
            const content = this.parseBracketContent(token.type, rightParen);
            if (content === undefined)
                return undefined;
            return { text: qualName + content, type: segmentType! };
        }
        // no args. e.g. FOO
        this.tokenizer.prepend(token.text);
        return { text: qualName, type: SegmentType.MacroLike };
    }

    /**
     *  Parses whatever is inside the brackets.
     *  @returns The brackets and everything inside the brackets.
     */
    private parseBracketContent(leftParen: TokenType, rightParen: TokenType): string | undefined {
        const begin = this.nextGoodToken();
        if (!begin || begin.type !== leftParen)
            return undefined;
        let token;
        let owed = 1;
        let content = begin.text;
        while (token = this.tokenizer.next()) {
            if (token.type === leftParen) {
                content += token.text;
                owed++;
            }
            else if (token.type === rightParen) {
                owed--;
                content += token.text;
                if (owed === 0) {
                    return content;
                }
            } else {
                content += token.text;
            }
        }
        return undefined;
    }
}

