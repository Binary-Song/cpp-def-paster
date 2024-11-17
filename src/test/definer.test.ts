import * as assert from 'assert';
import * as vscode from 'vscode';
import { Tokenizer, Token, TokenType } from '../core/tokenizer'
import { Parser, SegmentType } from '../core/parser'
import { Definer, DefinerConfig, EditorContext } from '../core/definer'
import { tokenizeTest, defineMethodTest, defineMethodTest2 } from '../test/testlib'

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
	test('definition 4', () => {
		let classCtx = "class Happy final:d,e{";
		let methodCtx = "virtual void f(int a) const ;";
		let expected =  "void Happy::f(int a) const";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition 5', () => {
		let classCtx = "class Happy final:d,e{";
		let methodCtx = "virtual void f(int a, int b) const ;";
		let expected =  "void Happy::f(int a, int b) const";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition 6', () => {
		let classCtx = "class Happy final:d,e{";
		let methodCtx = "virtual void f(int ) const ;";
		let expected =  "void Happy::f(int ) const";
		defineMethodTest(classCtx, methodCtx, expected);
	});
	test('definition 7', () => {
		let classCtx = "class Happy final:d,e{";
		let methodCtx = "virtual void f(int a = 1) const ;";
		let expected =  "void Happy::f(int a) const";
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
	// test('definition with operator overload', () => {
	// 	let classCtx = "class Happy {";
	// 	let methodCtx = "Happy& operator=(const Happy& other);";
	// 	let expected = "Happy& Happy::operator=(const Happy& other)";
	// 	defineMethodTest(classCtx, methodCtx, expected);
	// });
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
	test('definition with custom cfg', () => {
		let classCtx = "class Happy {";
		let methodCtx = "~Happy();Happy();f();";
		let expected = "Happy::~Happy()<1><2>Happy::Happy()<1><2>Happy::f()<1><3>";
		let cfg = new DefinerConfig();
		cfg.textAfterDef = "<1>";
		cfg.textBetweenMultipleDefs = "<2>";
		cfg.textAfterMultipleDefs = "<3>";
		defineMethodTest2(cfg, classCtx, methodCtx, expected);
	});
	test('crazy mess', () => {
		const code  = `
		// -------------------------- 
		// 测试测试测试测试测试测试测试测试测试
// -------------------------------------- 
#ifndef __XXXXXX_H__
#define __XXXXXX_H__
 
#include "DATAREDACTED.h"
#include "DATAREDACTED.h"
#include "DATAREDACTED.h"

#ifdef XXX
#include "DATAREDACTED.h"
#endif

#include "DATAREDACTED.h"
#include "DATAREDACTED.h"

#include <DATAREDACTED.h>
#include <DATAREDACTED.h>
#include "DATAREDACTED.h"
#include "DATAREDACTED.h"
#include <DATAREDACTED.h>

#ifndef XX
#include "DATAREDACTED.h"
#endif
#include "DATAREDACTED.h"
#include "DATAREDACTED.h"
#include <DATAREDACTED.h>
#ifdef XXXX
#include <DATAREDACTED.h>
#include "DATAREDACTED.h"
#endif

// !@#$%^&*()_+ COMMMMMMMENT !!!!

#define X_XX_XXX_XXXX 9999

class A;
class B;
class C;
class D;
#ifdef _OS
class E;
class F;
#endif
class G;
class H;
class I;
class J;
class K;

#ifdef 
class DATAREDACTED
{
public:
	DATAREDACTED() { }
	inline aa aa() const { return aa; }
	inline aa aa() const { return aa; }
	inline aa aa() const { return aa; }
	inline aa aa() const { return aa; }
	inline aa::aa aa() const { return aa; }
	inline aaa::aa aa() const { return aa; }
	inline aa::aa aa() const { return aa; }
	inline aa aa() const { return aa; }
	inline aa::aa bb() const { return aa; }
	inline aa aa() const  { return aa; }
	inline aa::aa aa() const { return aa; }
	
private:
	xx xx;
	xx xx;
	xx xx;
	xx xx;
};
#endif

class STUPID_DECL TTTT
	: public X1
	, public X2
	, public X3<A1>
	, public X4<A1>
	, public X5
	, public X6
	, public X7
	, public X8
{
	SOME_MACRO
#ifdef
	X_XXX_XXXXX_XXXXXXX(1, 2, 3, 4, 5, 6, 7, 8, 9, 0)
#endif
public:
	TTTT(AA *aa, 
			AA* aa, 
			AA* aa = NULL, 
			AA* aa = NULL, 
		   const AA& aa = aa(),
		   aa::aa aa = aa::aa);
	~TTTT();
	bar* foo() const; `;
		let classCtx = code;
		let methodCtx = "bar* foo() const; ";
		let expected = "bar * TTTT::foo() const";
		defineMethodTest(classCtx, methodCtx, expected);
	}
	);
});
