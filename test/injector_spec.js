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
});