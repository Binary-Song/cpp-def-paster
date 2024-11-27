/* eslint-disable curly */
export enum TokenType {
	Unknown,
	/**
	 * A space, tab, etc
	 */
	Space,
	/**
	 * A line or block comment.
	 */
	Comment,
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
	 * A string literal.
	 */
	StringLiteral,
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
	/**
	 * `=`
	 */
	Eq,
}

export class Token {
	text: string;
	type: TokenType;
	constructor(text: string, type: TokenType) {
		this.text = text;
		this.type = type;
	}
}

enum QuoteType {
	Single,
	Double,
}
/** 
 * A simple C++ tokenizer.
 */
export class Tokenizer {
	text: string;

	constructor(text: string) {
		this.text = text;
	}

	public clone() {
		return new Tokenizer(this.text);
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
			return this.chop(m[0].length, TokenType.Space);
		}
		else if (m = this.text.startsWith("/*")) {
			return this.tokenizeBlockComment();
		} else if (m = this.text.match(/^(#|\/\/).*\n/g)) {
			return this.chop(m[0].length, TokenType.Comment);
		}
		else if (m = this.text.startsWith("'")) {
			return this.tokenizeStringLiteral(QuoteType.Single);
		} else if (m = this.text.startsWith('"')) {
			return this.tokenizeStringLiteral(QuoteType.Double);
		} else if (m = this.text.match(/^\b(class|struct|interface)\b/g)) {
			return this.chop(m[0].length, TokenType.ClassKeyword);
		} else if (m = this.text.match(/^\b(public|private|protected)\b/g)) {
			return this.chop(m[0].length, TokenType.PublicKeyword);
		} else if (m = this.text.match(/^\w+/g)) {
			return this.chop(m[0].length, TokenType.Ident);
		} else if (m = this.text.match(/^\(/g)) {
			return this.chop(m[0].length, TokenType.LParen);
		} else if (m = this.text.match(/^\)/g)) {
			return this.chop(m[0].length, TokenType.RParen);
		} else if (m = this.text.match(/^{/g)) {
			return this.chop(m[0].length, TokenType.LBrace);
		} else if (m = this.text.match(/^}/g)) {
			return this.chop(m[0].length, TokenType.RBrace);
		} else if (m = this.text.match(/^\[/g)) {
			return this.chop(m[0].length, TokenType.LBracket);
		} else if (m = this.text.match(/^\]/g)) {
			return this.chop(m[0].length, TokenType.RBracket);
		} else if (m = this.text.match(/^;/g)) {
			return this.chop(m[0].length, TokenType.SemiColumn);
		} else if (m = this.text.match(/^::/g)) {
			return this.chop(m[0].length, TokenType.ColumnColumn);
		} else if (m = this.text.match(/^:/g)) {
			return this.chop(m[0].length, TokenType.Column);
		} else if (m = this.text.match(/^,/g)) {
			return this.chop(m[0].length, TokenType.Comma);
		} else if (m = this.text.match(/^\</g)) {
			return this.chop(m[0].length, TokenType.LAngleBracket);
		} else if (m = this.text.match(/^\>/g)) {
			return this.chop(m[0].length, TokenType.RAngleBracket);
		} else if (m = this.text.match(/^~/g)) {
			return this.chop(m[0].length, TokenType.Tilde);
		} else if (m = this.text.match(/^\*/g)) {
			return this.chop(m[0].length, TokenType.Star);
		} else if (m = this.text.match(/^&/g)) {
			return this.chop(m[0].length, TokenType.Ampersand);
		} else if (m = this.text.match(/^=/g)) {
			return this.chop(m[0].length, TokenType.Eq);
		}
		return this.chop(1, TokenType.Unknown);
	}

	private chop(len: number): string;
	private chop(len: number, tokenType: TokenType): Token;
	private chop(len: number, tokenType?: TokenType): Token | string {
		if (tokenType === undefined) {
			const text = this.text.slice(0, len);
			this.text = this.text.slice(len);
			return text;
		}
		else {
			const text = this.text.slice(0, len);
			this.text = this.text.slice(len);
			return new Token(text, tokenType);
		}
	}

	private tokenizeBlockComment() {
		let comment = "";
		if (!this.text.startsWith("/*"))
			throw new Error("tokenizeBlockComment: caller should ensure that we start with /*");

		// Nested block comment support (for MSVC compatibility)
		let layer = 0;
		while (true) {
			if (this.text.startsWith("/*")) {
				layer += 1;
				comment += this.chop(2);
			} else if (this.text.startsWith("*/")) {
				layer -= 1;
				comment += this.chop(2);
				if (layer === 0) {
					break;
				}
			} else if (this.text.length === 0) {
				break;
			}
			else {
				comment += this.chop(1);
			}
		}
		return new Token(comment, TokenType.Comment);
	}

	private tokenizeStringLiteral(quoteType: QuoteType) {
		const quote = quoteType == QuoteType.Single ? "\'" : "\"";
		const backslashQuote = quoteType ? "\\\'" : "\\\"";
		if (!this.text.startsWith(quote))
			throw new Error("tokenizeStringLiteral: caller should ensure that we should start with a quote");
		let str = "";
		while (true) {
			if (this.text.startsWith(backslashQuote)) {
				str += this.chop(2);
			} else if (this.text.startsWith(quote)) {
				str += this.chop(1);
				break;
			} else {
				str += this.chop(1);
			}
		}
		return new Token(str, TokenType.StringLiteral)
	}
}

export class TokenizerStack {
	private stack: Tokenizer[] = [];
	private bottom: Tokenizer;

	constructor(tokenizer: Tokenizer) {
		this.bottom = tokenizer;
	}

	public push() {
		let t = this.current;
		if (t)
			this.stack.push(t.clone());
	}

	public pop() {
		return this.stack.pop()!;
	}

	public apply() {
		let cur = this.stack.pop()!;
		this.stack.pop()!;
		this.stack.push(cur);
	}

	public get current(): Tokenizer {
		const top = this.stack.at(this.stack.length - 1);
		if (top === undefined)
			return this.bottom;
		return top;
	}

	public set current(value: Tokenizer) {
		if (this.stack.length === 0)
			this.bottom = value;
		else
			this.stack[this.stack.length - 1] = value;
	}
}
