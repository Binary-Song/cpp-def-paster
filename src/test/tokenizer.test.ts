import * as assert from 'assert';
import * as vscode from 'vscode';
import { Tokenizer, Token, TokenType } from '../core/tokenizer'
import { Parser, SegmentType } from '../core/parser'
import { Definer, DefinerConfig, EditorContext } from '../core/definer'
import { tokenizeTest, defineMethodTest } from '../test/testlib'

suite('tokenizer', () => {
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
			new Token("//*/*/*\n", TokenType.Comment),
			new Token("*", TokenType.Star),
			new Token("/*/\nstuff", TokenType.Comment),
		], (token: Token) => { return true });
	});
	test('tokenize nested comment', () => {
		tokenizeTest("int*/*/**/*/", [
			new Token("int", TokenType.Ident),
			new Token("*", TokenType.Star),
			new Token("/*/**/*/", TokenType.Comment),
		], (token: Token) => { return true });
	});
	// todo: add real preprocessing
	test('tokenize preprocessor', () => {
		tokenizeTest("#ssss*/*/**/*/\n", [
			new Token("#ssss*/*/**/*/\n", TokenType.Comment),
		], (token: Token) => { return true });
	});
});
