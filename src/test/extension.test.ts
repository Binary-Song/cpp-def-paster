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
	test('parser 1', () => {
		const tokenizer = new x.Tokenizer("class Happy : Base1<int> {};");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.strictEqual(JSON.stringify(result), '{"className":"Happy","attribute":"","bases":[{"access":"default","className":{"name":"Base1","args":[{"name":"int","args":[]}]}}]}', `bad parse`);
	});
	test('parser 2', () => {
		const tokenizer = new x.Tokenizer("class Happy {};");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.strictEqual(JSON.stringify(result), '{"className":"Happy","attribute":"","bases":[]}', `bad parse`);
	});
	test('parser 3', () => {
		const tokenizer = new x.Tokenizer("class Happy:public Base{");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.strictEqual(JSON.stringify(result), '{"className":"Happy","attribute":"","bases":[{"access":"public","className":{"name":"Base","args":[]}}]}', `bad parse`);
	});
	test('parser 4', () => {
		const tokenizer = new x.Tokenizer("class Happy:Nest1<Nest2<double>>{");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.strictEqual(JSON.stringify(result), '{"className":"Happy","attribute":"","bases":[{"access":"default","className":{"name":"Nest1","args":[{"name":"Nest2","args":[{"name":"double","args":[]}]}]}}]}', `bad parse`);
	});
	test('parser 5', () => {
		const tokenizer = new x.Tokenizer("class EXPORT Happy : Base1<int> {};");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.strictEqual(JSON.stringify(result), '{"className":"Happy","attribute":"EXPORT","bases":[{"access":"default","className":{"name":"Base1","args":[{"name":"int","args":[]}]}}]}', `bad parse`);
	});
	test('parser 6', () => {
		const tokenizer = new x.Tokenizer("class EXPORT Happy {};");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.strictEqual(JSON.stringify(result), '{"className":"Happy","attribute":"EXPORT","bases":[]}', `bad parse`);
	});
	test('parser 7', () => {
		const tokenizer = new x.Tokenizer("class  EXPORT  Happy:public Base{");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.strictEqual(JSON.stringify(result), '{"className":"Happy","attribute":"EXPORT","bases":[{"access":"public","className":{"name":"Base","args":[]}}]}', `bad parse`);
	});
	test('parser 8', () => {
		const tokenizer = new x.Tokenizer("class EXPORT Happy:Nest1<Nest2<double>>{");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.strictEqual(JSON.stringify(result), '{"className":"Happy","attribute":"EXPORT","bases":[{"access":"default","className":{"name":"Nest1","args":[{"name":"Nest2","args":[{"name":"double","args":[]}]}]}}]}', `bad parse`);
	});
	test('parser 9', () => {
		const tokenizer = new x.Tokenizer("class EXPORT Happy:std::Nest1<std::Nest2<std::double>>{");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.strictEqual(JSON.stringify(result), '{"className":"Happy","attribute":"EXPORT","bases":[{"access":"default","className":{"name":"std::Nest1","args":[{"name":"std::Nest2","args":[{"name":"std::double","args":[]}]}]}}]}', `bad parse`);
	});
	test('parser 10', () => {
		const tokenizer = new x.Tokenizer("class Happy:std::Nest1<std::Nest2<std::double>>{");
		const parser = new x.Parser(tokenizer);
		const result = parser.parseClassDecl();
		assert.strictEqual(JSON.stringify(result), '{"className":"Happy","attribute":"","bases":[{"access":"default","className":{"name":"std::Nest1","args":[{"name":"std::Nest2","args":[{"name":"std::double","args":[]}]}]}}]}', `bad parse`);
	});
});
