import { Tokenizer, Token, TokenType } from '../core/tokenizer'
import { Parser, SegmentType } from '../core/parser'
import { Definer, DefinerConfig, EditorContext } from '../core/definer'
import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * Tokenize a string and check the result.
 * @param pred Filters the tokens. Returns whether the token will be kept.
 * By default, this discards `Space`s and `Comment`s
 */
export function tokenizeTest(inputText: string, expectedTokens: Token[], pred?: (token: Token) => boolean) {
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

export function defineMethodTest(classCtx: string, methodCtx: string, expected: string | undefined)
{
	let config =  new DefinerConfig();
	let editorCtx = new EditorContext(methodCtx, classCtx);
	config.body = "";
	const definer = new Definer(editorCtx, config);
	let res = definer.defineMethods();
	assert.strictEqual(res, expected ? expected.trim() : undefined );
}