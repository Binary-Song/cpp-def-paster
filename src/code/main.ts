/* eslint-disable curly */
import * as vscode from 'vscode';
import { Tokenizer, Token, TokenType } from '../core/tokenizer'
import { Parser, SegmentType } from '../core/parser'
import { Definer, DefinerConfig, EditorContext } from '../core/definer'

type Context = { begin: number; end: number; text: string }

export class Extension {
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

	public getConfig<T>(key: string) {
		let c = vscode.workspace.getConfiguration('cpp-def-paster')
		let deflt = c.inspect<T>(key)?.defaultValue;
		if (deflt === undefined)
			return undefined;
		return c.get<T>(key, deflt);
	}

	public getDefinition(): string | undefined {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return undefined;
		}
		const selections = this.getSelections();
		if (!selections) {
			return undefined;
		}
		const context = new EditorContext(selections[0], this.getTextBeforeSelection());
		let config = new DefinerConfig();
		config.textAfterDef = this.getConfig<string>('definition.textAfterDef') ?? config.textAfterDef;
		config.textBetweenMultipleDefs = this.getConfig<string>('definition.textBetweenMultipleDefs') ?? config.textBetweenMultipleDefs;
		config.textAfterMultipleDefs = this.getConfig<string>('definition.textAfterMultipleDefs') ?? config.textAfterMultipleDefs;
		const definer = new Definer(context, config);
		const def = definer.defineMethods();
		if (!def) {
			return undefined;
		}
		return def;
	}

	public tryGetDefinition(): string | undefined {
		try {
			return this.getDefinition();
		}
		catch (error) { return undefined; }
	}

	public async copyDefinition() {
		const def = this.tryGetDefinition();
		if (def === undefined) {
			fallbackCopy();
			return;
		}
		else {
			await vscode.env.clipboard.writeText(def);
			vscode.window.showInformationMessage(vscode.l10n.t('✔️ Copied: {0}', def));
		}
	}
}

export function fallbackCopy() {
	vscode.commands.executeCommand("editor.action.clipboardCopyAction");
}

export function copyDefinition() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		fallbackCopy();
		return;
	}
	const extension = new Extension(editor);
	extension.copyDefinition();
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('cpp-def-paster.copyDefinition', async () => {
		copyDefinition();
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
			copyDefinition();
		} else {
			fallbackCopy();
		}

	}));
	console.log('activated');
}

export function deactivate() { }
