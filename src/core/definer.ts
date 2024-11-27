import { Tokenizer, Token, TokenType } from './tokenizer'
import { Parser, MethodDecl, ClassDecl, Segment, ClassName } from './parser'

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
	textAfterDef: string = "";
	textBetweenMultipleDefs: string = "\n{\n}\n";
	textAfterMultipleDefs: string = "\n{\n}\n";
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

	public defineMethods() {
		let tokenizer = new Tokenizer(this.editorContext.textUpToCursor);
		let parser = new Parser(tokenizer);
		let classDecl = parser.parseTextUpToCursor();
		if (!classDecl)
			return undefined;
		tokenizer = new Tokenizer(this.selection);
		parser = new Parser(tokenizer);
		let methodDecls = parser.parseMethodDecls();
		if (!methodDecls)
			return undefined;
		if (methodDecls.length === 1) {
			let def = this.defineMethod(classDecl, methodDecls[0]).trim() + this.definerConfig.textAfterDef;
			return def;
		}

		let allDefs = "";
		let firstOne = true;
		for (let methodDecl of methodDecls) {
			if (!firstOne)
				allDefs += this.definerConfig.textBetweenMultipleDefs;
			let def = this.defineMethod(classDecl, methodDecl).trim() + this.definerConfig.textAfterDef;
			allDefs += def;
			firstOne = false;
		}
		allDefs += this.definerConfig.textAfterMultipleDefs;
		return allDefs;
	}

	private classNameToStr(className: ClassName): string {
		let str = className.name;
		if (className.args === undefined) {
			return str;
		}
		str += "<";
		let args = "";
		let isFirst = true;
		for (let arg of className.args) {
			if (!isFirst) {
				args += ", ";
			}
			args += this.classNameToStr(arg);
			isFirst = false;
		}
		args = args.trim();
		str += args + ">"
		return str;
	}

	private handleMethodNameSegmentFallback(nameSegment: Segment, classDecl: ClassDecl, methodDecl: MethodDecl): string {
		let decl = classDecl.className + "::" + nameSegment.text;
		return decl;
	}

	private handleMethodNameSegment(nameSegment: Segment, classDecl: ClassDecl, methodDecl: MethodDecl): string {
		// if we failed to parse the param list
		if (methodDecl.params === undefined) {
			return this.handleMethodNameSegmentFallback(nameSegment, classDecl, methodDecl);
		}
		// if we parsed the param list
		const tokenizer = new Tokenizer(nameSegment.text);
		let token = tokenizer.next();
		if (token === undefined || token.type !== TokenType.Ident) {
			return this.handleMethodNameSegmentFallback(nameSegment, classDecl, methodDecl);
		}
		let paramListStr = "";
		let firstParam = true;
		for (let param of methodDecl.params) {
			if (firstParam) {
				paramListStr += param.text;
			} else {
				paramListStr += ", " + param.text;
			}
			firstParam = false;
		}
		paramListStr = paramListStr.trim();
		let decl = classDecl.className + "::" + token.text + "(" + paramListStr + ")";
		return decl;
	}

	private defineMethod(classDecl: ClassDecl, methodDecl: MethodDecl): string {
		let index = 0;
		let decl = "";
		for (let segment of methodDecl.segments) {

			const segmentText = segment.text;
			// name of the method
			if (index === methodDecl.nameSegment) {
				decl += this.handleMethodNameSegment(segment, classDecl, methodDecl);
				decl += " ";
			}
			else {
				// other segments
				if (!this.definerConfig.discardedSegments.includes(segmentText)) {
					decl += segmentText;
					decl += " ";
				}
			}

			index++;
		}
		decl = decl.trim();
		return decl;
	}

}