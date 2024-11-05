import * as assert from 'assert';
import * as vscode from 'vscode';
import { Tokenizer, Token, TokenType } from '../core/tokenizer'
import { Parser, SegmentType } from '../core/parser'
import { Definer, DefinerConfig, EditorContext } from '../core/definer'

/**
 * Tokenize a string and check the result.
 * @param pred Filters the tokens. Returns whether the token will be kept.
 * By default, this discards `Space`s and `Comment`s
 */
function tokenizeTest(inputText: string, expectedTokens: Token[], pred?: (token: Token) => boolean) {
	const tokenizer = new Tokenizer(inputText);
	let token;
	let actual: Token[] = [];

	while (token = tokenizer.next()) {
		const keep : boolean = pred ? pred(token) : (token.type !== TokenType.Space && token.type !== TokenType.Comment);
		if (keep) {
			actual.push(token);
		}
	}
	for (let i = 0; i < Math.min(actual.length, expectedTokens.length); i++) {
		const expectedToken = expectedTokens[i];
		const actualToken = actual[i];
		assert.strictEqual(actualToken.text, expectedToken.text, `token text mismatch, index = ${i}`);
		assert.strictEqual(actualToken.type, expectedToken.type, `token type mismatch, index = ${i}`);
	}
	assert.strictEqual(actual.length, expectedTokens.length);
};

suite('cpp-def-paster', () => {
	vscode.window.showInformationMessage('Start all tests.');
	test('tokenizer 1', () => {
		tokenizeTest("class   FUNNY_EXPORT Class1 : public FOO<int, double>, Bar {} ;", [
			new Token("class", TokenType.ClassKeyword),
			new Token("FUNNY_EXPORT", TokenType.Ident),
			new Token("Class1", TokenType.Ident),
			new Token(":", TokenType.Column),
			new Token("public", TokenType.PublicKeyword),
			new Token("FOO", TokenType.Ident),
			new Token("<", TokenType.LAngleBracket),
			new Token("int", TokenType.Ident),
			new Token(",", TokenType.Comma),
			new Token("double", TokenType.Ident),
			new Token(">", TokenType.RAngleBracket),
			new Token(",", TokenType.Comma),
			new Token("Bar", TokenType.Ident),
			new Token("{", TokenType.LBrace),
			new Token("}", TokenType.RBrace),
			new Token(";", TokenType.SemiColumn),
		])
	});
	test('tokenizer 2', () => {
		tokenizeTest("int*__stdcall", [
			new Token("int", TokenType.Ident),
			new Token("*", TokenType.Star),
			new Token("__stdcall", TokenType.Ident),
		]);
	});
	test('tokenize comment 1', () => {
		tokenizeTest("int//*/*/*\n*/*/\nstuff", [
			new Token("int", TokenType.Ident),
			new Token("//*/*/**/*/\n", TokenType.Comment),
			new Token("stuff", TokenType.Ident),
		], (token: Token) => { return true});
	});
	test('tokenize nested comment', () => {
		tokenizeTest("int*/*/**/*/", [
			new Token("int", TokenType.Ident),
			new Token("*", TokenType.Star),
			new Token("/*/**/*/", TokenType.Comment),
		], (token: Token) => { return true});
	});
	// todo: add real preprocessing
	test('tokenize preprocessor', () => {
		tokenizeTest("#ssss*/*/**/*/\n", [
			new Token("#ssss*/*/**/*/\n", TokenType.Comment),
		], (token: Token) => { return true});
	});
	test('parseClassDecl 1', () => {
		const tokenizer = new Tokenizer("class Happy : Base1<int> {};");
		const parser = new Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.deepStrictEqual(result, {
			className: 'Happy',
			attribute: undefined,
			bases: [
				{
					access: undefined,
					className: {
						name: 'Base1',
						args: [{
							name: 'int',
							args: undefined
						}]
					}
				}
			]
		});
	});
	test('parseClassDecl 2', () => {
		const tokenizer = new Tokenizer("class Happy {};");
		const parser = new Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.deepStrictEqual(result, {
			className: 'Happy',
			attribute: undefined,
			bases: undefined
		});
	});
	test('parseClassDecl 3', () => {
		const tokenizer = new Tokenizer("class Happy:public Base{");
		const parser = new Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.deepStrictEqual(result, {
			className: 'Happy',
			attribute: undefined,
			bases: [{
				access: 'public',
				className: {
					name: 'Base', args: undefined
				}
			}]
		});
	});
	test('parseClassDecl 4', () => {
		const tokenizer = new Tokenizer("class Happy:Nest1<Nest2<double>>{");
		const parser = new Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.deepStrictEqual(result, {
			className: 'Happy',
			attribute: undefined,
			bases: [
				{
					access: undefined,
					className: {
						name: 'Nest1',
						args: [
							{ name: 'Nest2', args: [{ name: 'double', args: undefined }] }
						]
					}
				}
			]
		});
	});
	test('parseClassDecl 5', () => {
		const tokenizer = new Tokenizer("class EXPORT Happy : Base1<int> {};");
		const parser = new Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.deepStrictEqual(result, {
			className: 'Happy',
			attribute: 'EXPORT',
			bases: [
				{
					access: undefined,
					className: { name: 'Base1', args: [{ name: 'int', args: undefined }] }
				}
			]
		});
	});
	test('parseClassDecl 6', () => {
		const tokenizer = new Tokenizer("class EXPORT Happy:std::Nest1<std::Nest2<std::double>>{");
		const parser = new Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.deepStrictEqual(result, {
			className: 'Happy',
			attribute: 'EXPORT',
			bases: [
				{
					access: undefined,
					className: {
						name: 'std::Nest1',
						args: [
							{
								name: 'std::Nest2',
								args: [
									{
										name: 'std::double',
										args: undefined
									}
								]
							}
						]
					}
				}
			]
		});
	});
	test('parseClassDecl 7', () => {
		const tokenizer = new Tokenizer("class Happy:std::Nest1<std::Nest2<std::double>,a<b>,c>,d,e{");
		const parser = new Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.deepStrictEqual(result, {
			className: 'Happy',
			attribute: undefined,
			bases: [
				{
					access: undefined,
					className: {
						name: 'std::Nest1',
						args: [
							{
								name: 'std::Nest2',
								args: [{ name: 'std::double', args: undefined }]
							},
							{ name: 'a', args: [{ name: 'b', args: undefined }] },
							{ name: 'c', args: undefined }
						]
					}
				},
				{ access: undefined, className: { name: 'd', args: undefined } },
				{ access: undefined, className: { name: 'e', args: undefined } }
			]
		});
	});
	test('parseClassDecl 8', () => {
		const tokenizer = new Tokenizer("interface __declspec(('bs')) BS Foo final{");
		const parser = new Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.deepStrictEqual(result, {
			className: 'Foo',
			attribute: "__declspec(('bs')) BS",
			bases: undefined
		});
	});
	test('parseMethodDecl 1', () => {
		const tokenizer = new Tokenizer("__declspec('blablabla') void __stdcall f() const volatile noexcept wtf ;");
		const parser = new Parser(tokenizer);
		const result = parser.parseMethodDecl();
		assert.deepStrictEqual(result, {
			nameSegment: 3,
			segments: [
				{ text: "__declspec('blablabla')", type: SegmentType.FunctionLikeWithParen },
				{ text: 'void', type: SegmentType.MacroLike },
				{ text: '__stdcall', type: SegmentType.MacroLike },
				{ text: 'f()', type: SegmentType.FunctionLikeWithParen },
				{ text: 'const', type: SegmentType.MacroLike },
				{ text: 'volatile', type: SegmentType.MacroLike },
				{ text: 'noexcept', type: SegmentType.MacroLike },
				{ text: 'wtf', type: SegmentType.MacroLike }
			]
		});
	});
	test('parseMethodDecl 2', () => {
		const tokenizer = new Tokenizer("[[no_discard]] void*&** __stdcall f() const&& volatile noexcept;");
		const parser = new Parser(tokenizer);
		const result = parser.parseMethodDecl();
		assert.deepStrictEqual(result, {
			nameSegment: 7,
			segments: [
				{ text: '[[no_discard]]', type: SegmentType.AttributeLike },
				{ text: 'void', type: SegmentType.MacroLike },
				{ text: '*', type: SegmentType.Symbol },
				{ text: '&', type: SegmentType.Symbol },
				{ text: '*', type: SegmentType.Symbol },
				{ text: '*', type: SegmentType.Symbol },
				{ text: '__stdcall', type: SegmentType.MacroLike },
				{ text: 'f()', type: SegmentType.FunctionLikeWithParen },
				{ text: 'const', type: SegmentType.MacroLike },
				{ text: '&', type: SegmentType.Symbol },
				{ text: '&', type: SegmentType.Symbol },
				{ text: 'volatile', type: SegmentType.MacroLike },
				{ text: 'noexcept', type: SegmentType.MacroLike },
			]
		});
	});
	test('definition 1', () => {
		let classCtx = "class Happy:std::Nest1<std::Nest2<std::double>>{";
		let methodCtx = "virtual __declspec('blablabla') void __stdcall f() const volatile noexcept wtf ;";
		const definer = new Definer(new EditorContext(methodCtx, classCtx), new DefinerConfig());
		const defn = definer.defineMethods();
		assert.strictEqual(defn, "__declspec('blablabla') void __stdcall Happy::f() const volatile noexcept wtf ");
	});
	test('definition 2', () => {
		let classCtx = "class Happy:std::Nest1<std::Nest2<std::double>,a<b>,c>,d,e{";
		let methodCtx = "virtual static __declspec('') void __stdcall f() const volatile noexcept override;";
		const definer = new Definer(new EditorContext(methodCtx, classCtx), new DefinerConfig());
		const defn = definer.defineMethods();
		assert.strictEqual(defn, "__declspec('') void __stdcall Happy::f() const volatile noexcept ");
	});
	test('definition 3', () => {
		let classCtx = "class Happy final:d,e{";
		let methodCtx = "virtual static __declspec('') void __stdcall f() const volatile noexcept override final;";
		const definer = new Definer(new EditorContext(methodCtx, classCtx), new DefinerConfig());
		const defn = definer.defineMethods();
		assert.strictEqual(defn, "__declspec('') void __stdcall Happy::f() const volatile noexcept ");
	});
	test('definition 4', () => {
		let classCtx = "// class Comment {};\nclass A {\n";
		let methodCtx = "virtual void _f() const";
		const definer = new Definer(new EditorContext(methodCtx, classCtx), new DefinerConfig());
		const defn = definer.defineMethods();
		assert.strictEqual(defn, "void __stdcall A::_f() const");
	});
});
