import * as vscode from 'vscode';

function extractClassName(text: string) {
	let patts: [patt: RegExp, classNameGroupIdx: number][] =
		[
			/* */[/^(struct|class)\s+([a-zA-Z0-9_<>]+)?\s*([a-zA-Z0-9_<>]+)\s*([:,]\s*(public|private|protected)?\s*[a-zA-Z0-9_<>]+\s*)*\s*{$/g, 2],
			//                       aaaaaaaaaaaaaaaaaa   nnnnnnnnnnnnnnn     bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
			// a: 'attribute' for the class. For example, 'MY_EXPORT' as in 'class MY_EXPORT Car'
			// n: class name
			// b: base classes
		];
	for (let [patt, classNameGroupIdx] of patts) {
		let match = patt.exec(text)
		if (!match)
			continue
		let className = match[classNameGroupIdx]
		return className
	}
	return null
}

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('cpp-def-paster.copyAsDefinition', async () => {
		const editor = vscode.window.activeTextEditor
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.')
			return
		}
		const position = editor.selection.active
		const document = editor.document
		const textUpToCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position))
		const pass1Matches = textUpToCursor.match(/class(.|\s)+?{/g)
		if (!pass1Matches) {
			vscode.window.showInformationMessage(`Class not found in ${textUpToCursor}`)
			return;
		}
		for (let pass1Match of pass1Matches) {
			if (extractClassName(pass1Match) !== null) {
				vscode.window.showInformationMessage(pass1Match)
			}
		}
		vscode.window.showInformationMessage("done")
	});

	context.subscriptions.push(disposable);
	console.log('cpp-def-paster activated');
}

export function deactivate() { }
