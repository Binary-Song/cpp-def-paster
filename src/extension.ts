import * as vscode from 'vscode';

export enum TokenType {
	Unknown,
	Space,
	ClassKeyword,
	PublicKeyword,
	Ident,
	LParen,
	RParen,
	LBrace,
	RBrace,
	SemiColumn,
	ColumnColumn,
	Column,
	LAngleBracket,
	RAngleBracket,
	Comma,
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

	constructor(text: string) {
		this.stack = [];
		this.stack.push(text);
	}

	/** 
	 * Text to be tokenized.
	 */
	get text() {
		return this.stack[this.stack.length - 1];
	}

	set text(value: string) {
		this.stack[this.stack.length - 1] = value;
	}

	public save() {
		this.stack.push(this.text);
	}

	public restore() {
		this.stack.pop();
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
type ClassName = { name: string, args: ClassName[] };

/**
 * Base class declaration, part of a class declaration.
 * e.g. 'public MyBase' as in 'class MyClass : public MyBase'.
 */
type BaseDecl = { access: string, className: ClassName };

/**
 * Class declaration. Goes up until a left curly brace.
 * e.g. 'class MyClass {'
 */
type ClassDecl = { className: string, attribute: string, bases: BaseDecl[] };

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
	private parseNameAndAttrInClassDecl() {
		const classKw = this.nextGoodToken();
		if (!classKw || classKw.type !== TokenType.ClassKeyword) { return undefined; }
		const token1 = this.nextGoodToken();
		if (!token1 || token1.type !== TokenType.Ident) { return undefined; }
		const token2 = this.nextGoodToken();
		if (!token2) { return { name: token1.text, attribute: "" }; }
		if (token2.type !== TokenType.Ident) {
			this.tokenizer.prepend(token2.text);
			return { name: token1.text, attribute: "" };
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
				bases: [],
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
						access: "default",
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

	// parses:
	//     MyClass
	//     MyClassTemplate<int>
	//     MyClassTemplate<int, double, ... , float, WTF<int> >
	private parseClassName(): ClassName | undefined {
		const ident = this.nextGoodToken();
		if (!ident || ident.type !== TokenType.Ident) { return undefined; }
		const maybeLAngleBracket = this.nextGoodToken();
		if (!maybeLAngleBracket) { return { name: ident.text, args: [] }; }
		if (maybeLAngleBracket.type !== TokenType.LAngleBracket) {
			this.tokenizer.prepend(maybeLAngleBracket.text);
			return { name: ident.text, args: [] };
		}
		const args = this.parseTemplateArgList();
		if (!args) { return undefined; }
		const rAngleBracket = this.nextGoodToken();
		if (!rAngleBracket || rAngleBracket.type !== TokenType.RAngleBracket) { return undefined; }
		return { name: ident.text, args: args };
	}

	// parses:
	//     int, double, ... , float, WTF<int>
	private parseTemplateArgList(): ClassName[] | undefined {
		const args = this.parseCommaSeparatedList(() => {
			return this.parseClassName();
		});
		return args;
	}
}

function extractClassName(text: string) {
	const tokenizer = new Tokenizer(text);
	const parser = new Parser(tokenizer);
	let r;
	if (r = parser.parse()) {
		return r.className;
	}
	return undefined;
}

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('cpp-def-paster.copyAsDefinition', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.');
			return;
		}
		const position = editor.selection.active;
		const document = editor.document;
		const textUpToCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
		// Broad matching. Find substrings starting with 'class' ending with '{'.
		const pass1Matches = textUpToCursor.match(/(struct|class)[^;]+?{/g);
		if (!pass1Matches) {
			vscode.window.showInformationMessage(`Class not found in ${textUpToCursor}`);
			return;
		}
		for (let pass1Match of pass1Matches) {
			let name = extractClassName(pass1Match);
			if (!name) { continue; }
			vscode.window.showInformationMessage(`name = ${name}, excerpt = ${pass1Match}`);
		}
		vscode.window.showInformationMessage("done");
	});

	context.subscriptions.push(disposable);
	console.log('cpp-def-paster activated');
}

export function deactivate() { }
