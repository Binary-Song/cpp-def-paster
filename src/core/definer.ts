import { Tokenizer, Token, TokenType } from './tokenizer'
import { Parser, MethodDecl, ClassDecl } from './parser'

/**
 * The definition will be generated based on these strings.
 */
export class EditorContext {
	selection: string;
	textUpToCursor: string;

	constructor(selection: string, textUpToCursor: string) {
		this.selection = selection;
		this.textUpToCursor = textUpToCursor;
	}
}

/**
 * The configuration for the definer.
 */
export class DefinerConfig {
	body: string = "\n{\n}\n";
	discardedSegments: string[] = ["override", "virtual", "explicit", "static", "final"];
}

export class Definer {

	public editorContext: EditorContext;
	public definerConfig: DefinerConfig;

	constructor(editorContext: EditorContext, config: DefinerConfig) {
		this.editorContext = editorContext;
		this.definerConfig = config;
	}

	private get selection(): string {
		return this.editorContext.selection;
	}

	private get textUpToCursor(): string {
		return this.editorContext.textUpToCursor;
	}

	private get body(): string {
		return this.definerConfig.body;
	}

	public defineMethods() {
		const classDeclContext = this.getClassDeclContext();
		if (classDeclContext === undefined)
			return undefined;
		let tokenizer = new Tokenizer(classDeclContext);
		let parser = new Parser(tokenizer);
		let classDecl = parser.parseClassDecl();
		if (!classDecl)
			return undefined;
		tokenizer = new Tokenizer(this.selection);
		parser = new Parser(tokenizer);
		let methodDecls = parser.parseMethodDecls();
		if (!methodDecls)
			return undefined;
		let allDefs = "";
		for (let methodDecl of methodDecls) {
			let def = this.defineMethod(classDecl, methodDecl);
			allDefs += def;
			allDefs += this.body;
			allDefs = allDefs.trimEnd();
			allDefs += "\n\n";
		}
		return allDefs.trim();
	}

	private defineMethod(classDecl: ClassDecl, methodDecl: MethodDecl): string {
		let index = 0;
		let decl = "";
		for (let segment of methodDecl.segments) {
			if (index === methodDecl.nameSegment) {
				decl += classDecl.className;
				decl += "::";
			}
			let newText = segment.text;
			if (!this.definerConfig.discardedSegments.includes(newText)) {
				decl += newText;
				decl += " ";
			}
			index++;
		}
		decl = decl.trim();
		return decl;
	}

	private getClassDeclContext() {
		const textUpToCursor = this.textUpToCursor;
		const regex = /\b(struct|class|interface)\b[^;]+?{/g;
		type Context = { begin: number, end: number, text: string }
		const contexts: Context[] = [];
		const findContext = (pos: number) => {
			for (const context of contexts) {
				if (context.end - 1 === pos)
					return context;
			}
			return undefined;
		};
		let match;
		while ((match = regex.exec(textUpToCursor)) !== null) {
			contexts.push({
				begin: match.index,
				end: match.index + match[0].length,
				text: match[0],
			});
		}
		if (!contexts || contexts.length === 0)
			return undefined;
		let contextStack: { context: Context; layer: number }[] = [];
		let layer = 0;
		for (let pos = contexts[0].begin; pos < textUpToCursor.length; pos++) {
			const ch = textUpToCursor[pos];
			if (ch === "{") {
				layer++;
				let c;
				if (c = findContext(pos)) {
					contextStack.push({ context: c, layer: layer });
				}
			}
			else if (ch === "}") {
				if (contextStack.length && contextStack[contextStack.length - 1].layer === layer) {
					contextStack.pop();
				}
				layer--;
			}
		}
		if (contextStack) {
			return contextStack[contextStack.length - 1].context.text;
		}
		return undefined;
	}
}