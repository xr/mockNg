import { setupModuleLoader } from "../src/loader";
import { createInjector } from "../src/injector";

describe('injector', () => {
	beforeEach(() => {
		delete window.angular;
		setupModuleLoader(window);
	});
	
	it('can be created', () => {
		let injector = createInjector([]);
		expect(injector).toBeDefined();
	});

	it('has a constant that has been registed to a module', () => {
		let module = window.angular.module('myModule', []);
		module.constant('aConst', 42);
		let injector = createInjector(['myModule']);
		expect(injector.has('aConst')).toBe(true);
	});

	it('return a registerd constant', () => {
		let module = window.angular.module('myModule', []);
		module.constant('aConst', 42);
		let injector = createInjector(['myModule']);
		expect(injector.get('aConst')).toBe(42);
	});

	it('loads multiple modules', () => {
		let module1 = window.angular.module('myModule', []);
		let module2 = window.angular.module('myOtherModule', []);

		module1.constant('aConst', 42);
		module2.constant('anotherConst', 43);
		let injector = createInjector(['myModule', 'myOtherModule']);

		expect(injector.has('aConst')).toBe(true);
		expect(injector.has('anotherConst')).toBe(true);
	});

	it('loads the modules of a module', () => {
		let module1 = window.angular.module('myModule', []);
		let module2 = window.angular.module('myOtherModule', ['myModule']);
		let module3 = window.angular.module('myThirdModule', ['myOtherModule']);
		module1.constant('aConst', 42);
		module2.constant('anotherConst', 43);
		module3.constant('aThirdConst', 44);

		let injector = createInjector(['myThirdModule']);
		expect(injector.has('aConst')).toBe(true);
		expect(injector.has('anotherConst')).toBe(true);
		expect(injector.has('aThirdConst')).toBe(true);
	});

	it('loads each module only once', function() {
		window.angular.module('myModule', ['myOtherModule']);
		window.angular.module('myOtherModule', ['myModule']);
		createInjector(['myModule']);
	});

	it('invokes an annotated function with dependency injection', function() {
		var module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		var injector = createInjector(['myModule']);
		var fn = function(one, two) { return one + two; };
		fn.$inject = ['a', 'b'];
		expect(injector.invoke(fn)).toBe(3);
	});

	it('invokes a function with the given this context', function() {
		var module = window.angular.module('myModule', []);
		module.constant('a', 1);
		var injector = createInjector(['myModule']);
		var obj = {
			two: 2,
			fn: function(one) { return one + this.two; }
		};
		obj.fn.$inject = ['a'];
		expect(injector.invoke(obj.fn, obj)).toBe(3);
	});

	it('overrides dependencies with locals when invoking', function() {
		var module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.constant('b', 2);
		var injector = createInjector(['myModule']);
		var fn = function(one, two) { return one + two; };
		fn.$inject = ['a', 'b'];
		expect(injector.invoke(fn, undefined, {b: 3})).toBe(4);
	});
});

describe('annotate', function() {
	it('returns the $inject annotation of a function when it has one', function() {
		var injector = createInjector([]);
		var fn = function() { };
		fn.$inject = ['a', 'b'];
		expect(injector.annotate(fn)).toEqual(['a', 'b']);
	});

	it('returns the array-style annotations of a function', function() {
		var injector = createInjector([]);
		var fn = ['a', 'b', function() { }];
		expect(injector.annotate(fn)).toEqual(['a', 'b']);
	});

	it('returns annotations parsed from function args when not annotated', function() {
		var injector = createInjector([]);
		var fn = function(a, b) { };
		expect(injector.annotate(fn)).toEqual(['a', 'b']);
	});
});