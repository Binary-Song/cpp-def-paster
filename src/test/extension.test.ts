import * as assert from 'assert';
import * as vscode from 'vscode';
import { Tokenizer, Token, TokenType } from '../core/tokenizer'
import { Parser, SegmentType } from '../core/parser'
import { Definer, DefinerConfig, EditorContext } from '../core/definer'
import { tokenizeTest, defineMethodTest, defineMethodTest2 } from '../test/testlib'
import { Extension } from '../code/main'
suite('extension', () => {
	test('fallback', async () => {
		const code = 'void foo; void bar;';

		await vscode.workspace.openTextDocument({ content: code, language: 'cpp' }).then(doc => vscode.window.showTextDocument(doc));
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			assert.fail('no active editor');
		}
		let ext = new Extension(editor);
		vscode.languages.setTextDocumentLanguage(editor.document, 'cpp');
		editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, code.length));
		await ext.copyDefinition();
		const clipboardText = await vscode.env.clipboard.readText();
		assert.strictEqual(clipboardText, code);
	}
	);
});
