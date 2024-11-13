import * as assert from 'assert';
import * as vscode from 'vscode';
import { Tokenizer, Token, TokenType } from '../core/tokenizer'
import { Parser, SegmentType } from '../core/parser'
import { Definer, DefinerConfig, EditorContext } from '../core/definer'
import { tokenizeTest, defineMethodTest } from '../test/testlib'

suite('definer', () => {
	vscode.window.showInformationMessage('Start all tests.');
	test('definition 1', () => {
		let classCtx = "class Happy:std::Nest1<std::Nest2<std::double>>{";
		let methodCtx = "virtual __declspec('blablabla') void __stdcall f() const volatile noexcept wtf ;";
		let expected = "__declspec('blablabla') void __stdcall Happy::f() const volatile noexcept wtf ";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition 2', () => {
		let classCtx = "class Happy:std::Nest1<std::Nest2<std::double>,a<b>,c>,d,e{";
		let methodCtx = "virtual static __declspec('') void __stdcall f() const volatile noexcept override;";
		let expected =  "__declspec('') void __stdcall Happy::f() const volatile noexcept ";
		defineMethodTest(classCtx, methodCtx, expected);
	
	});
	test('definition 3', () => {
		let classCtx = "class Happy final:d,e{";
		let methodCtx = "virtual static __declspec('') void __stdcall f() const volatile noexcept override final;";
		let expected =  "__declspec('') void __stdcall Happy::f() const volatile noexcept ";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition: `class` in comment', () => {
		let classCtx = "// class Comment {};\nclass A {\n";
		let methodCtx = "virtual void _f() const;";
		let expected = "void A::_f() const";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition with multiple inheritance', () => {
		let classCtx = "class Happy: public A, protected B, private C {";
		let methodCtx = "void f();";
		let expected = "void Happy::f()";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition with nested class', () => {
		let classCtx = "class Outer { class Inner {";
		let methodCtx = "void f();";
		let expected = "void Inner::f()";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition with namespace', () => {
		let classCtx = "namespace NS { class Happy {";
		let methodCtx = "void f();";
		let expected = "void Happy::f()";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition with macro', () => {
		let classCtx = "#define MACRO class Happy {";
		let methodCtx = "void f();";
		let expected = "void Happy::f()";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition with friend function', () => {
		let classCtx = "class Happy {\nfriend void g();";
		let methodCtx = "void f();";
		let expected = "void Happy::f()";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition with operator overload', () => {
		let classCtx = "class Happy {";
		let methodCtx = "Happy& operator=(const Happy& other);";
		let expected = "Happy& Happy::operator=(const Happy& other)";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition with constructor', () => {
		let classCtx = "class Happy {";
		let methodCtx = "Happy();";
		let expected = "Happy::Happy()";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition with destructor', () => {
		let classCtx = "class Happy {";
		let methodCtx = "~Happy();";
		let expected = "Happy::~Happy()";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition with lambda', () => {
		let classCtx = "class Happy {";
		let methodCtx = "auto f = [](){};";
		let expected = undefined;
		defineMethodTest(classCtx, methodCtx, expected);
	});
});
