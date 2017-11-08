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

	it('invokes an array-annotated function with dependency injection', function() {
	  var module = window.angular.module('myModule', []);
	  module.constant('a', 1);
	  module.constant('b', 2);
	  var injector = createInjector(['myModule']);
	  var fn = ['a', 'b', function(one, two) { return one + two; }];
	  expect(injector.invoke(fn)).toBe(3);
	});

	it('invokes a non-annotated function with dependency injection', function() {
	  var module = window.angular.module('myModule', []);
	  module.constant('a', 1);
	  module.constant('b', 2);
	  var injector = createInjector(['myModule']);
	  var fn = function(a, b) { return a + b; };
	  expect(injector.invoke(fn)).toBe(3);
	});

	it('instantiates an annotated constructor function', function() {
	  var module = window.angular.module('myModule', []);
	  module.constant('a', 1);
	  module.constant('b', 2);
	  var injector = createInjector(['myModule']);
	  function Type(one, two) {
	    this.result =  one + two;
	  }
	  Type.$inject = ['a', 'b'];
	  var instance = injector.instantiate(Type);
	  expect(instance.result).toBe(3);
	});

	it('instantiates an array-annotated constructor function', function() {
	  var module = window.angular.module('myModule', []);
	  module.constant('a', 1);
	  module.constant('b', 2);
	  var injector = createInjector(['myModule']);
	  function Type(one, two) {
	    this.result = one + two;
	  }
	  var instance = injector.instantiate(['a', 'b', Type]);
	  expect(instance.result).toBe(3);
	});

	it('instantiates a non-annotated constructor function', function() {
	  var module = window.angular.module('myModule', []);
	  module.constant('a', 1);
	  module.constant('b', 2);
	  var injector = createInjector(['myModule']);
	  function Type(a, b) {
	    this.result = a + b;
	  }
	  var instance = injector.instantiate(Type);
	  expect(instance.result).toBe(3);
	});

	it('supports locals when instantiating', function() {
	  var module = window.angular.module('myModule', []);
	  module.constant('a', 1);
	  module.constant('b', 2);
	  var injector = createInjector(['myModule']);
	  function Type(a, b) {
	    this.result = a + b;
	  }
	  var instance = injector.instantiate(Type, {b: 3});
	  expect(instance.result).toBe(4);
	});

	it('allows registering a provider and uses its $get', function() {
		var module = window.angular.module('myModule', []);
		module.provider('a', {
			$get: function() {
				return 42;
			}
		});
		var injector = createInjector(['myModule']);
		expect(injector.has('a')).toBe(true);
		expect(injector.get('a')).toBe(42);
	});

	it('injects the $get method of a provider', function() {
		var module = window.angular.module('myModule', []);
		module.constant('a', 1);
		module.provider('b', {
			$get: function(a) {
				return a + 2;
			}
		});
		var injector = createInjector(['myModule']);
		expect(injector.get('b')).toBe(3);
	});

	it('injects the $get method of a provider lazily', function() {
		var module = window.angular.module('myModule', []);
		module.provider('b', {
			$get: function(a) {
				return a + 2;
			}
		});
		module.provider('a', {
			$get: () => 1
		});
		var injector = createInjector(['myModule']);
		expect(injector.get('b')).toBe(3);
	});

	it('instantiates a dependency only once', function() {
		var module = window.angular.module('myModule', []);
		module.provider('a', {$get: function() { return {}; }});
		var injector = createInjector(['myModule']);
		expect(injector.get('a')).toBe(injector.get('a'));
	});

	it('injects another provider to a provider constructor function', function() {
		var module = window.angular.module('myModule', []);
		module.provider('a', function AProvider() {
			var value = 1;
			this.setValue = function(v) { value = v; };
			this.$get = function() { return value; };
		});
		module.provider('b', function BProvider(aProvider) {
			aProvider.setValue(2);
			this.$get = function() { };
		});
		var injector = createInjector(['myModule']);
		expect(injector.get('a')).toBe(2);
	});

	it('does not inject an instance to a provider constructor function', function() {
	  var module = window.angular.module('myModule', []);
	  module.provider('a', function AProvider() {
	    this.$get = function() { return 1; };
	});
	  module.provider('b', function BProvider(a) {
	    this.$get = function() { return a; };
	});
	  expect(function() {
	    createInjector(['myModule']);
	  }).toThrow();
	});

	it('does not inject a provider to a $get function', function() {
	  var module = window.angular.module('myModule', []);
	  module.provider('a', function AProvider() {
	    this.$get = function() { return 1; };
	  });
	  module.provider('b', function BProvider() {
	    this.$get = function(aProvider) { return aProvider.$get(); };
	  });
	  var injector = createInjector(['myModule']);
	  expect(function() {
	    injector.get('b');
	  }).toThrow();
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