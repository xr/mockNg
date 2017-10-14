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

describe('$eval', () => {
	let scope;

	beforeEach(() => {
		scope = new Scope();
	});

	it('execs $eval func and returns results', () => {
		scope.a = 42;

		let result = scope.$eval((scope) => {
			return scope.a;
		});

		expect(result).toBe(42);
	});

	it('passes the 2nd $eval arg straight through', () => {
		scope.a = 42;

		let result = scope.$eval((scope, arg) => {
			return scope.a + arg;
		}, 2);

		expect(result).toBe(44);
	});
});

describe('$apply', () => {
	let scope;

	beforeEach(() => {
		scope = new Scope();
	});

	it('exec the given fn and starts the digest', () => {
		scope.a = 'a';
		scope.counter = 0;

		scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => {
			scope.counter++;
		});

		scope.$digest();
		expect(scope.counter).toBe(1);

		scope.$apply((scope) => {
			scope.a = 'b';
		});
		expect(scope.counter).toBe(2);
	});
});

describe('$evalAsync', () => {
	let scope;

	beforeEach(() => {
		scope = new Scope();
	});

	it('exec the given fn later in the same cycle', () => {
		scope.a = [1,2,3];
		scope.asyncEvaluated = false;
		scope.asyncEvaluatedImmediately = false;

		scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => {
			scope.$evalAsync((scope) => {
				scope.asyncEvaluated = true;
			});
			scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
		});

		scope.$digest();
		expect(scope.asyncEvaluatedImmediately).toBe(false);
		expect(scope.asyncEvaluated).toBe(true);
	});

	it('schedules a digest in $evalAsync', (done) => {
		scope.a = 'abc';
		scope.counter = 0;
		scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => {
			scope.counter++;
		});

		scope.$evalAsync((scope) => {});
		expect(scope.counter).toBe(0);
		setTimeout(() => {
			expect(scope.counter).toBe(1);
			done();
		}, 50);
	});
});

describe('$digest', () => {
	let scope;

	beforeEach(() => {
		scope = new Scope();
	});

	it('has a $$phase field whose value is the current digest phse', () => {
		scope.a = [1,2,3];
		scope.phaseInWatchFn = undefined;
		scope.phaseInListenerFn = undefined;
		scope.phaseInApplyFn = undefined;

		scope.$watch((scope) => {
			scope.phaseInWatchFn = scope.$$phase;
			return scope.a;
		}, (newVal, oldVal, scope) => {
			scope.phaseInListenerFn = scope.$$phase;
		});

		scope.$apply((scope) => {
			scope.phaseInApplyFn = scope.$$phase;
		});

		expect(scope.phaseInWatchFn).toBe('$digest');
		expect(scope.phaseInListenerFn).toBe('$digest');
		expect(scope.phaseInApplyFn).toBe('$apply');
	});
});


describe('$applyAsync', () => {
	let scope;

	beforeEach(() => {
		scope = new Scope();
	});

	it('allows async $apply with $applyAsync', (done) => {
		scope.counter = 0;

		scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => scope.counter++);
		scope.$digest();
		expect(scope.counter).toBe(1);

		scope.$applyAsync((scope) => {
			scope.a = 1;
		});

		expect(scope.counter).toBe(1);

		setTimeout(() => {
			expect(scope.counter).toBe(2);
			done();
		}, 50);
	});

});

describe('$$postDigest', () => {
	let scope;

	beforeEach(() => {
		scope = new Scope();
	});

	it('allow the code run in $$postDigest', () => {
		scope.counter = 0;

		scope.$$postDigest((scope) => {scope.counter++;});
		scope.$watch((scope) => scope.a, (newVal, oldVal, scope) => {scope.counter++;});
		
		scope.$digest();
		expect(scope.counter).toBe(2);
	});

});

describe('$watchGroup', () => {
	let scope;

	beforeEach(() => {
		scope = new Scope();
	});

	it('takes watches as an array and calls listener with arrays', () => {
		let gotNewVal, gotOldVal;

		scope.a = 1;
		scope.b = 2;

		scope.$watchGroup([
			(scope) => scope.a,
			(scope) => scope.b
		], (newVal, oldVal, scope) => {
			gotNewVal = newVal;
			gotOldVal = oldVal;
		});
		scope.$digest();

		expect(gotNewVal).toEqual([1,2]);
		expect(gotOldVal).toEqual([1,2]);
	});
});

describe('childScope', () => {
	let scope;

	beforeEach(() => {
		scope = new Scope();
	});

	it('shadows a parents property with the same name', () => {
		const parent = new Scope();
		const child = parent.$new();

		parent.name = 'Joe';
		child.name = 'Jill';

		expect(child.name).toBe('Jill');
		expect(parent.name).toBe('Joe');
	});

	it('does not shadow members of parent scopes attributes', () => {
		const parent = new Scope();
		

		parent.user = {name: 'Joe'};
		const child = parent.$new();
		child.user.name = 'Jill';

		expect(child.user.name).toBe('Jill');
		expect(parent.user.name).toBe('Jill');
	});

	it('does not digest its parents', () => {
		const parent = new Scope();
		const child = parent.$new();

		parent.a = 'abc';
		parent.$watch((scope) => scope.a, (newVal, oldVal, scope) => {
			scope.aWas = newVal;
		});

		child.$digest();
		expect(child.aWas).toBeUndefined();
	});

	it('digest its children', () => {
		const parent = new Scope();
		const child = parent.$new();

		parent.a = 'abc';
		child.$watch((scope) => scope.a, (newVal, oldVal, scope) => {
			scope.aWas = newVal;
		});

		parent.$digest();
		expect(child.aWas).toBe('abc');
	});

	it('does not have access to parent attributes when isolated', () => {
		const parent = new Scope();
		const child = parent.$new(true);

		parent.a = 'a';

		expect(child.a).toBeUndefined();
	});

	it('digest its isolated children', () => {
		const parent = new Scope();
		const child = parent.$new(true);

		child.a = 'abc';
		child.$watch((scope) => scope.a, (newVal, oldVal, scope) => {
			scope.aWas = newVal;
		});

		parent.$digest();
		expect(child.aWas).toBe('abc');
	});

	it('digests from root on $appy when isolated', () => {
		const parent = new Scope();
		const child = parent.$new(true);
		const child2 = child.$new();

		parent.a = 'abc';
		parent.counter = 0;
		parent.$watch((scope) => scope.a, (newVal, oldVal, scope) => {
			scope.counter++
		});

		child2.$apply(() => {});
		expect(parent.counter).toBe(1);
	});
});


