/* eslint-disable curly */
import * as vscode from 'vscode';

export enum TokenType {
	Unknown,
	/**
	 * A space, tab, etc
	 */
	Space,
	/**
	 * `class` or `struct`
	 */
	ClassKeyword,
	/**
	 * `public`, `private` or `protected`
	 */
	PublicKeyword,
	/**
	 * An alphanumeric word basically.
	 */
	Ident,
	/**
	 * `(`
	 */
	LParen,
	/**
	 * `)`
	 */
	RParen,
	/**
	 * `{`
	 */
	LBrace,
	/**
	 * `}`
	 */
	RBrace,
	/**
	 * `[`
	 */
	LBracket,
	/**
	 * `]`
	 */
	RBracket,
	/**
	 * `;`
	 */
	SemiColumn,
	/**
	 * `::`
	 */
	ColumnColumn,
	/**
	 * `:`
	 */
	Column,
	/**
	 * `<`
	 */
	LAngleBracket,
	/**
	 * `>`
	 */
	RAngleBracket,
	/**
	 * `,`
	 */
	Comma,
	/**
	 * `~`
	 */
	Tilde,
	/**
	 * `*`
	 */
	Star,
	/**
	 * `&`
	 */
	Ampersand,
}

export class Token {
	text: string;
	type: TokenType;
	constructor(text: string, type: TokenType) {
		this.text = text;
		this.type = type;
	}
}

/** 
 * A simple C++ tokenizer.
 */
export class Tokenizer {
	stack: string[];
	text: string;

	constructor(text: string) {
		this.stack = [];
		this.text = text;
	}

	/** 
	 * Push the text to be parsed onto an internal stack.
	 */
	public save() {
		this.stack.push(this.text);
	}

	/** 
	 * Pop the internal stack to restore the last saved text.
	 * @param drop If true, simply drop the last saved text.
	 */
	public restore(drop?: boolean) {
		drop = drop ?? false;
		let stackText = this.stack.pop();
		if (stackText !== undefined) {
			if (!drop)
				this.text = stackText;
		} else {
			throw new Error(`Tokenizer.restore: stack is empty!`);
		}
	}

	/** 
	 * Adds to the front of text.
	 */
	public prepend(value: string) {
		this.text = value + this.text;
	}

	/** 
	 * Consumes some text and returns a token. If successful, a 
	 * prefix of the text will be removed.
	 */
	public next() {
		let m;
		if (this.text.length === 0) {
			return undefined;
		} else if (m = this.text.match(/^\s+/g)) {
			return this.sliceToken(m[0].length, TokenType.Space);
		} else if (m = this.text.match(/^(class|struct)/g)) {
			return this.sliceToken(m[0].length, TokenType.ClassKeyword);
		} else if (m = this.text.match(/^(public|private|protected)/g)) {
			return this.sliceToken(m[0].length, TokenType.PublicKeyword);
		} else if (m = this.text.match(/^\w+/g)) {
			return this.sliceToken(m[0].length, TokenType.Ident);
		} else if (m = this.text.match(/^\(/g)) {
			return this.sliceToken(m[0].length, TokenType.LParen);
		} else if (m = this.text.match(/^\)/g)) {
			return this.sliceToken(m[0].length, TokenType.RParen);
		} else if (m = this.text.match(/^{/g)) {
			return this.sliceToken(m[0].length, TokenType.LBrace);
		} else if (m = this.text.match(/^}/g)) {
			return this.sliceToken(m[0].length, TokenType.RBrace);
		} else if (m = this.text.match(/^\[/g)) {
			return this.sliceToken(m[0].length, TokenType.LBracket);
		} else if (m = this.text.match(/^\]/g)) {
			return this.sliceToken(m[0].length, TokenType.RBracket);
		} else if (m = this.text.match(/^;/g)) {
			return this.sliceToken(m[0].length, TokenType.SemiColumn);
		} else if (m = this.text.match(/^::/g)) {
			return this.sliceToken(m[0].length, TokenType.ColumnColumn);
		} else if (m = this.text.match(/^:/g)) {
			return this.sliceToken(m[0].length, TokenType.Column);
		} else if (m = this.text.match(/^,/g)) {
			return this.sliceToken(m[0].length, TokenType.Comma);
		} else if (m = this.text.match(/^\</g)) {
			return this.sliceToken(m[0].length, TokenType.LAngleBracket);
		} else if (m = this.text.match(/^\>/g)) {
			return this.sliceToken(m[0].length, TokenType.RAngleBracket);
		} else if (m = this.text.match(/^~/g)) {
			return this.sliceToken(m[0].length, TokenType.Tilde);
		} else if (m = this.text.match(/^\*/g)) {
			return this.sliceToken(m[0].length, TokenType.Star);
		} else if (m = this.text.match(/^&/g)) {
			return this.sliceToken(m[0].length, TokenType.Ampersand);
		}
		return this.sliceToken(1, TokenType.Unknown);
	}

	private sliceToken(len: number, tt: TokenType) {
		const token = new Token(this.text.slice(0, len), tt);
		this.text = this.text.slice(len, undefined);
		return token;
	}
}

/**
 * The name of a class.
 * e.g. 'MyClass', 'MyTemplatedClass<int>'
 */
type ClassName = { name: string, args: ClassName[] | undefined };

/**
 * Base class declaration, part of a class declaration.
 * e.g. 'public MyBase' as in 'class MyClass : public MyBase'.
 */
type BaseDecl = { access: string | undefined, className: ClassName };

/**
 * Class declaration. Goes up until a left curly brace.
 * e.g. 'class MyClass {'
 */
type ClassDecl = { className: string, attribute: string | undefined, bases: BaseDecl[] | undefined };

export enum SegmentType {
	AttributeLike,
	Symbol,
	MacroLike,
	FunctionLikeWithParen,
	FunctionLikeWithAngleBrackets,
	FunctionLikeWithBrackets,
}

/**
 * A segment is a 'word' in a method declaration. e.g.
 * `__attribute__((visibility("default")))`, `std::vector<int>`, `__stdcall`, `f()`, `const`, `MY_EXPORT`,
 * are all segments.
 */
type Segment = { text: string, type: SegmentType }

/**
 * A segment-based method declaration.
 */
type MethodDecl = { nameSegment: number, segments: Segment[] }

/**
 * Parses part of the C++ language.
 */
export class Parser {

	tokenizer: Tokenizer;

	constructor(tokenizer: Tokenizer) {
		this.tokenizer = tokenizer;
	}

	private nextGoodToken(): Token | undefined {
		let token;
		while (token = this.tokenizer.next()) {
			if (token.type !== TokenType.Space) { return token; }
		}
		return undefined;
	}
	// parses:
	//     class MyClass
	//     class EXPORT_STUFF MyClass
	private parseNameAndAttrInClassDecl(): { name: string; attribute: string | undefined } | undefined {
		const classKw = this.nextGoodToken();
		if (!classKw || classKw.type !== TokenType.ClassKeyword) { return undefined; }
		const token1 = this.nextGoodToken();
		if (!token1 || token1.type !== TokenType.Ident) { return undefined; }
		const token2 = this.nextGoodToken();
		if (!token2) {
			return {
				name: token1.text, attribute: undefined
			};
		}
		if (token2.type !== TokenType.Ident) {
			this.tokenizer.prepend(token2.text);
			return {
				name: token1.text, attribute: undefined
			};
		}
		return { name: token2.text, attribute: token1.text };
	}

	// parses:
	//     class MyClass {
	//     class EXPORT_STUFF MyClass {
	//     class MyClass : <base-list> {
	public parseClassDecl(): ClassDecl | undefined {
		const nameAndAttr = this.parseNameAndAttrInClassDecl();
		if (!nameAndAttr) { return undefined; }
		const token = this.nextGoodToken();
		if (!token) { return undefined; }
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
		else { return undefined; }
	}

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

	// parses:
	//     public Base1, public Base2, ... , public BaseN
	private parseBaseList(): BaseDecl[] | undefined {
		const items = this.parseCommaSeparatedList(() => {
			return this.parseBase();
		});
		return items;
	}

	// parses:
	//     public Base
	//     Base
	//     public TemplatedBase<int>
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
	 * Parses 'A', 'ns::B', 'ns1::ns2::C', '~D'
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

	// parses:
	//     MyClass
	//     MyClassTemplate<int>
	//     MyClassTemplate<int, double, ... , float, WTF<int> >
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

	// parses:
	//     int, double, ... , float, WTF<int>
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
	private parseSegment(): Segment | undefined {
		/**
		 * Currently a segment has many variations (see `SegmentType` ). This parser will try ONE variation. If that fails, it will restore the tokenizer state so we can try the next variation from a clean slate. Otherwise, keep it that way.
		 * @param subParse A parsing function that parses one variation of a segment.
		 * @returns A `Segment` if successful, an `undefined` if not.
		 */
		const tryParseSegment = (subParse: () => Segment | undefined) => {
			this.tokenizer.save();
			const seg = subParse();
			// If failed, dont drop the saved stuff. 
			const dontDrop = (seg === undefined);
			this.tokenizer.restore(!dontDrop);
			return seg;
		};
		let segment;
		if (segment = tryParseSegment(() => { return this.parseNamedSegment(); })) {
			return segment;
		}
		if (segment = tryParseSegment(() => { return this.parseAttributeLikeSegment(); })) {
			return segment;
		}
		if (segment = tryParseSegment(() => { return this.parseSymbolSegment(); })) {
			return segment;
		}
		return undefined;
	}

	/**
	 * Parses a 'symbol segment'. aka a segment that is just a symbol or operator etc.
	 * e.g. `&`, `*`
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

	/**
	 * Parses a 'bracket segment'. aka a segment that starts with a bracket.
	 * e.g. '[[attribute]]'
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
	 * Parses a 'named segment', aka a segment that starts with a name, optionally followed by 
	 * parentheses. 
	 * e.g. `FOO`, `BAR(arg1, arg2)`, `std::vector<int>`
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

export function defineMethod(classDeclContext: string, methodDeclContext: string) {
	let tokenizer = new Tokenizer(classDeclContext);
	let parser = new Parser(tokenizer);
	let classDecl = parser.parseClassDecl();
	if (!classDecl)
		return undefined;
	tokenizer = new Tokenizer(methodDeclContext);
	parser = new Parser(tokenizer);
	let methodDecl = parser.parseMethodDecl();
	if (!methodDecl)
		return undefined;
	let index = 0;
	let decl = "";
	const removedSegments = ["override", "virtual", "explicit", "static"];
	for (let segment of methodDecl.segments) {
		if (index === methodDecl.nameSegment) {
			decl += classDecl.className;
			decl += "::";
		}
		let newText = segment.text;
		if (!removedSegments.includes(newText)) {
			decl += newText;
			decl += " ";
		}

		index++;
	}
	return decl;
}

type Context = { begin: number; end: number; text: string }

/**
 * Find which class the cursor is currently in. Return the class declaration's prefix.
 * @param editor 
 * @returns 
 */
function getClassDeclContext(editor: vscode.TextEditor) {
	const cursorPos = editor.selection.active;
	const document = editor.document;
	const textUpToCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), cursorPos));
	const regex = /(struct|class)[^;]+?{/g;
	const contexts: Context[] = [];
	const findContext = (pos: number) => {
		for (const context of contexts) {
			if (context.end - 1 === pos)
				return context;
		}
		return undefined;
	};
	let match;
	while ((match = regex.exec(textUpToCursor)) !== null) {
		contexts.push({
			begin: match.index,
			end: match.index + match[0].length,
			text: match[0],
		});
	}
	if (!contexts || contexts.length === 0)
		return undefined;
	let contextStack: { context: Context; layer: number }[] = [];
	let layer = 0;
	for (let pos = contexts[0].begin; pos < textUpToCursor.length; pos++) {
		const ch = textUpToCursor[pos];
		if (ch === "{") {
			layer++;
			let c;
			if (c = findContext(pos)) {
				contextStack.push({ context: c, layer: layer });
			}
		}
		else if (ch === "}") {
			if (contextStack && contextStack[contextStack.length - 1].layer === layer) {
				contextStack.pop();
			}
			layer--;
		}
	}
	if (contextStack) {
		// todo: support nested class
		return contextStack[contextStack.length - 1].context.text;
	}
	return undefined;
}

function getMethodDeclContext(editor: vscode.TextEditor) {
	return getSelectionOrLine(editor);
}

function getSelectionOrLine(editor: vscode.TextEditor) {
	const selection = editor.selection; // Get the current selection
	let text;
	if (selection.isEmpty) {
		// Get the line of text where the cursor is
		const position = selection.active; // Current cursor position
		text = editor.document.lineAt(position.line).text; // Line text
	} else {
		// Get the selected text
		text = editor.document.getText(selection);
	}
	return text;
}

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('cpp-def-paster.copyDefinition', async () => {
		let ok = false;
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			console.error('no editor');
			vscode.window.showErrorMessage("Failed to copy definition.");
			return;
		}
		do {
			const classDeclContext = getClassDeclContext(editor);
			if (!classDeclContext) {
				console.error('getClassDeclContext failed');
				break;
			}
			const methodDeclContext = getMethodDeclContext(editor);
			if (!methodDeclContext) {
				console.error('getMethodDeclContext failed');
				break;
			}
			const def = defineMethod(classDeclContext, methodDeclContext);
			if (!def) {
				console.error('defineMethod failed');
				break;
			}
			ok = true;
			await vscode.env.clipboard.writeText(def);
			vscode.window.showInformationMessage(`✔️ Copied: ${def}`);
		} while (false);
		if (!ok) {
			const sel = getSelectionOrLine(editor);
			if (sel) {
				await vscode.env.clipboard.writeText(sel);
				vscode.window.showErrorMessage('Failed to copy definition. Copied current selection instead.');
			} else {
				vscode.window.showErrorMessage('Failed to copy definition.');
			}
		}
	});

	context.subscriptions.push(disposable);
	console.log('activated');
}

export function deactivate() { }
