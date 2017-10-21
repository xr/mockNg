import { setupModuleLoader } from "../src/loader";

describe('setupModuleLoader', () => {

	beforeEach(() => {
		delete window.angular;
	});

	it('exposes angular on the window', () => {
		setupModuleLoader(window);
		expect(window.angular).toBeDefined();
	});

	it('create angular once', () => {
		setupModuleLoader(window);
		let ng = window.angular;
		setupModuleLoader(window);
		expect(window.angular).toBe(ng);
	});

	it('exposes the angular module function', () => {
		setupModuleLoader(window);
		expect(window.angular.module).toBeDefined();
	});

});

describe('modules', () => {
	beforeEach(() => {
		setupModuleLoader(window);
	});

	it('reg a module', () => {
		let myModule = window.angular.module('myModule', []);
		expect(myModule).toBeDefined();
		expect(myModule.name).toEqual('myModule');
	});

	it('attaches the requires arr to the registered module', () => {
		let myModule = window.angular.module('myModule', ['dep']);
		expect(myModule.requires).toEqual(['dep']);
	});

	it('allows getting a module', () => {
		let myModule = window.angular.module('myModule', []);
		let gotModule = window.angular.module('myModule');

		expect(gotModule).toBeDefined();
		expect(gotModule).toBe(myModule);
	});
});