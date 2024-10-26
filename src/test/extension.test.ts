import * as assert from 'assert';

import * as vscode from 'vscode';
import * as x from '../extension';

suite('cpp-def-paster', () => {
	vscode.window.showInformationMessage('Start all tests.');
	test('tokenizer 1', () => {
		const tokenizer = new x.Tokenizer("class   FUNNY_EXPORT Class1 : public FOO<int, double>, Bar {} ;");
		let token;
		const expected: x.Token[] = [
			new x.Token("class", x.TokenType.ClassKeyword),
			new x.Token("FUNNY_EXPORT", x.TokenType.Ident),
			new x.Token("Class1", x.TokenType.Ident),
			new x.Token(":", x.TokenType.Column),
			new x.Token("public", x.TokenType.PublicKeyword),
			new x.Token("FOO", x.TokenType.Ident),
			new x.Token("<", x.TokenType.LAngleBracket),
			new x.Token("int", x.TokenType.Ident),
			new x.Token(",", x.TokenType.Comma),
			new x.Token("double", x.TokenType.Ident),
			new x.Token(">", x.TokenType.RAngleBracket),
			new x.Token(",", x.TokenType.Comma),
			new x.Token("Bar", x.TokenType.Ident),
			new x.Token("{", x.TokenType.LBrace),
			new x.Token("}", x.TokenType.RBrace),
			new x.Token(";", x.TokenType.SemiColumn),
		];
		let actual: x.Token[] = [];
		while (token = tokenizer.next()) {
			if (token.type !== x.TokenType.Space) { actual.push(token); }
		}

		for (let i = 0; i < Math.min(actual.length, expected.length); i++) {
			const expectedToken = expected[i];
			const actualToken = actual[i];
			assert.strictEqual(actualToken.text, expectedToken.text, `token text mismatch, index = ${i}`);
			assert.strictEqual(actualToken.type, expectedToken.type, `token type mismatch, index = ${i}`);
		}
		assert.strictEqual(actual.length, expected.length);
	});
	test('tokenizer 2', () => {
		const tokenizer = new x.Tokenizer("int*__stdcall");
		let token;
		const expected: x.Token[] = [
			new x.Token("int", x.TokenType.Ident),
			new x.Token("*", x.TokenType.Star),
			new x.Token("__stdcall", x.TokenType.Ident),
		];
		let actual: x.Token[] = [];
		while (token = tokenizer.next()) {
			if (token.type !== x.TokenType.Space) { actual.push(token); }
		}
		for (let i = 0; i < Math.min(actual.length, expected.length); i++) {
			const expectedToken = expected[i];
			const actualToken = actual[i];
			assert.strictEqual(actualToken.text, expectedToken.text, `token text mismatch, index = ${i}`);
			assert.strictEqual(actualToken.type, expectedToken.type, `token type mismatch, index = ${i}`);
		}
		assert.strictEqual(actual.length, expected.length);
	});
	test('parseClassDecl 1', () => {
		const tokenizer = new x.Tokenizer("class Happy : Base1<int> {};");
		const parser = new x.Parser(tokenizer);
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
		const tokenizer = new x.Tokenizer("class Happy {};");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.deepStrictEqual(result, {
			className: 'Happy',
			attribute: undefined,
			bases: undefined
		});
	});
	test('parseClassDecl 3', () => {
		const tokenizer = new x.Tokenizer("class Happy:public Base{");
		const parser = new x.Parser(tokenizer);
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
		const tokenizer = new x.Tokenizer("class Happy:Nest1<Nest2<double>>{");
		const parser = new x.Parser(tokenizer);
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
		const tokenizer = new x.Tokenizer("class EXPORT Happy : Base1<int> {};");
		const parser = new x.Parser(tokenizer);
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
		const tokenizer = new x.Tokenizer("class EXPORT Happy:std::Nest1<std::Nest2<std::double>>{");
		const parser = new x.Parser(tokenizer);
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
		const tokenizer = new x.Tokenizer("class Happy:std::Nest1<std::Nest2<std::double>,a<b>,c>,d,e{");
		const parser = new x.Parser(tokenizer);
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
	test('parseMethodDecl 1', () => {
		const tokenizer = new x.Tokenizer("__declspec('blablabla') void __stdcall f() const volatile noexcept wtf ;");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseMethodDecl();
		assert.deepStrictEqual(result, {
			nameSegment: 3,
			segments: [
				{ text: "__declspec('blablabla')", type: x.SegmentType.FunctionLikeWithParen },
				{ text: 'void', type: x.SegmentType.MacroLike },
				{ text: '__stdcall', type: x.SegmentType.MacroLike },
				{ text: 'f()', type: x.SegmentType.FunctionLikeWithParen },
				{ text: 'const', type: x.SegmentType.MacroLike },
				{ text: 'volatile', type: x.SegmentType.MacroLike },
				{ text: 'noexcept', type: x.SegmentType.MacroLike },
				{ text: 'wtf', type: x.SegmentType.MacroLike }
			]
		});
	});
	test('parseMethodDecl 2', () => {
		const tokenizer = new x.Tokenizer("[[no_discard]] void*&** __stdcall f() const&& volatile noexcept;");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseMethodDecl();
		assert.deepStrictEqual(result, {
			nameSegment: 7,
			segments: [
				{ text: '[[no_discard]]', type: x.SegmentType.AttributeLike },
				{ text: 'void', type: x.SegmentType.MacroLike },
				{ text: '*', type: x.SegmentType.Symbol },
				{ text: '&', type: x.SegmentType.Symbol },
				{ text: '*', type: x.SegmentType.Symbol },
				{ text: '*', type: x.SegmentType.Symbol },
				{ text: '__stdcall', type: x.SegmentType.MacroLike },
				{ text: 'f()', type: x.SegmentType.FunctionLikeWithParen },
				{ text: 'const', type: x.SegmentType.MacroLike },
				{ text: '&', type: x.SegmentType.Symbol },
				{ text: '&', type: x.SegmentType.Symbol },
				{ text: 'volatile', type: x.SegmentType.MacroLike },
				{ text: 'noexcept', type: x.SegmentType.MacroLike },
			]
		});
	});
	test('definition 1', () => {
		let classCtx = "class Happy:std::Nest1<std::Nest2<std::double>>{";
		let methodCtx = "virtual __declspec('blablabla') void __stdcall f() const volatile noexcept wtf ;";
		const defn = x.defineMethod(classCtx, methodCtx);
		assert.strictEqual(defn, "__declspec('blablabla') void __stdcall Happy::f() const volatile noexcept wtf ");
	});
	test('definition 2', () => {
		let classCtx = "class Happy:std::Nest1<std::Nest2<std::double>,a<b>,c>,d,e{";
		let methodCtx = "virtual static __declspec('') void __stdcall f() const volatile noexcept override;";
		const defn = x.defineMethod(classCtx, methodCtx);
		assert.strictEqual(defn, "__declspec('') void __stdcall Happy::f() const volatile noexcept ");
	});
});
