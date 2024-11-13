/* eslint-disable curly */
import * as vscode from 'vscode';
import { Tokenizer, Token, TokenType } from '../core/tokenizer'
import { Parser, SegmentType } from '../core/parser'
import { Definer, DefinerConfig, EditorContext } from '../core/definer'

type Context = { begin: number; end: number; text: string }

class Extension
{
    editor: vscode.TextEditor;

    constructor(editor: vscode.TextEditor) {
        this.editor = editor;
    }

    private getTextBeforeSelection(): string {
        const cursorPos = this.editor.selection.active;
        const document = this.editor.document;
        const textUpToCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), cursorPos));
        return textUpToCursor;
    }

	private getSelections(): string[] | undefined {
        const cursorPos = this.editor.selection.active;
        const selection = this.editor.selection;
        // if selection is empty, get that line as selection
        if (selection.isEmpty) {
            return [this.editor.document.lineAt(cursorPos.line).text];
        }
        let ranges: string[] = [];
        for (const sel of this.editor.selections) {
            ranges.push(this.editor.document.getText(new vscode.Range(sel.start, sel.end)));
        }
        if (ranges.length != 0) {
            return ranges;
        }
        return undefined;
    }

	public async copyDefinition() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			throw new Error("no editor");
		}
		const selections = this.getSelections();
		if (!selections) {
			throw new Error("no selections");
		}
		const context = new EditorContext(selections[0], this.getTextBeforeSelection());
		const definer = new Definer(context, new DefinerConfig());
		const def = definer.defineMethods();
		if (!def) {
			throw new Error("defineMethod failed");
		}
		await vscode.env.clipboard.writeText(def);
		vscode.window.showInformationMessage(`✔️ Copied: ${def}`);
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('cpp-def-paster.copyDefinition', async () => {
		try {
			let editor = vscode.window.activeTextEditor;
			if (!editor) 
				throw new Error("no editor");
			const extension = new Extension(editor);
			await extension.copyDefinition();
		} catch (error) {
			vscode.commands.executeCommand("editor.action.clipboardCopyAction");
		}
	}));
	context.subscriptions.push(vscode.commands.registerCommand('cpp-def-paster.magicCopy', async () => {
		const config = vscode.workspace.getConfiguration();
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;
		const selection = editor.selection;
		const startPos = selection.start;
		const endPos = selection.end;
		const cursorPos = editor.selection.active;
		const isMultiSelect = editor.selections.length !== 1;
		const isZeroLengthSelect = startPos.compareTo(endPos) === 0;
		const isRightToLeftSelect = startPos.compareTo(cursorPos) === 0;
		if (!isMultiSelect && !isZeroLengthSelect && isRightToLeftSelect) {
			try {
				let editor = vscode.window.activeTextEditor;
				if (!editor) 
					throw new Error("no editor");
				const extension = new Extension(editor);
				await extension.copyDefinition();
			} catch (error) {
				vscode.window.showInformationMessage(`Failed to copy def. Falling back to normal copy.`);
				vscode.commands.executeCommand("editor.action.clipboardCopyAction");
			}
		} else {
			vscode.commands.executeCommand("editor.action.clipboardCopyAction");
		}

	}));
	console.log('activated');
}

export function deactivate() { }
