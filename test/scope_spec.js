import Scope from "../src/scope";

describe('Scope', () => {
	let scope;

	beforeEach(() => {
		scope = new Scope();
	});

	it('can construct', () => {
		const watchFn = () => 'wat';
		const listnerFn = jasmine.createSpy();
		scope.$watch(watchFn, listnerFn);
		
		scope.$digest();

		expect(listnerFn).toHaveBeenCalled();
	});

	it('calls the watch function with the scope as argument', () => {
		const watchFn = jasmine.createSpy();
		const listnerFn = () => '';

		scope.$watch(watchFn, listnerFn);
		
		scope.$digest();

		expect(watchFn).toHaveBeenCalledWith(scope);
	});

	it('calls the listnerFn when the watched value changes', () => {
		scope.a = 'a';
		scope.counter = 0;

		scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => scope.counter++);

		expect(scope.counter).toBe(0);

		scope.$digest();
		expect(scope.counter).toBe(1);
		scope.$digest();
		expect(scope.counter).toBe(1);

		scope.a = 'b';
		expect(scope.counter).toBe(1);
		scope.$digest();
		expect(scope.counter).toBe(2);
	});

	it('calls the listnerFn when the watched value is undefined', () => {
		scope.counter = 0;

		scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => scope.counter++);

		scope.$digest();
		expect(scope.counter).toBe(1);
	});

	it('calls the listnerFn when the watched value is null', () => {
		scope.counter = 0;
		scope.a = null;

		scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => scope.counter++);

		scope.$digest();
		expect(scope.counter).toBe(1);
	});

	it('calls the listnerFn with newVal as oldVal the first time', () => {
		scope.a = 'hello';

		const watchFn = (scope) => scope.a;
		const listnerFn = jasmine.createSpy();

		scope.$watch(watchFn, listnerFn);
		
		scope.$digest();

		expect(listnerFn).toHaveBeenCalledWith('hello', 'hello', scope);
	});

	it('calls the watchFn without listnerFn', () => {

		const watchFn = jasmine.createSpy();

		scope.$watch(watchFn);
		
		scope.$digest();

		expect(watchFn).toHaveBeenCalled();
	});

	it('triggers the chain watchers in same digest', () => {
		scope.a = 'a';

		scope.$watch((scope) => scope.addLater, (newVal, oldVal, scope) => {
			if (newVal) {
				scope.checkMe = scope.a.toUpperCase();
			}
		});

		scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => {
			if (newVal) {
				scope.addLater = scope.a;
			}
		});

		scope.$digest();
		expect(scope.checkMe).toBe('A');

		scope.a = 'b';
		scope.$digest();
		expect(scope.checkMe).toBe('B');
	});

	it('gives up after 10', () => {
		scope.a = 1;

		scope.$watch((scope) => scope.addLater, (newVal, oldVal, scope) => {
			if (newVal) {
				scope.a += scope.addLater;
			}
		});

		scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => {
			scope.addLater = newVal;
		});

		expect((function () {
			scope.$digest();
		})).toThrow();
	});

	it('computes based on the value if enabled', () => {
		scope.a = [1,2,3];
		scope.counter = 0;

		scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => {
			scope.counter++;
		}, true);

		expect(scope.counter).toBe(0);
		scope.$digest();
		expect(scope.counter).toBe(1);

		scope.a = [1,2,3];
		scope.$digest();
		expect(scope.counter).toBe(1);

		scope.a = scope.a.push(3);
		scope.$digest();
		expect(scope.counter).toBe(2);
	});

	it('allows destroying a $watch', () => {
		scope.a = 'a';
		scope.counter = 0;

		let destroyWatchFn = scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => {
			scope.counter++;
		});

		expect(scope.counter).toBe(0);
		scope.$digest();
		expect(scope.counter).toBe(1);

		destroyWatchFn();
		scope.$digest();
		expect(scope.counter).toBe(1);
	});
});