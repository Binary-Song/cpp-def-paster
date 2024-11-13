import * as assert from 'assert';
import * as vscode from 'vscode';
import { Tokenizer, Token, TokenType } from '../core/tokenizer'
import { Parser, SegmentType } from '../core/parser'
import { Definer, DefinerConfig, EditorContext } from '../core/definer'
import { tokenizeTest, defineMethodTest } from '../test/testlib'

suite('parser', () => {
	vscode.window.showInformationMessage('Start all tests.');
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
});
