const _ = require('lodash');

const initWatchVal = () => {};

class Scope {
	constructor() {
		this.$$watchers = [];
		this.$$lastDirtyWatch = null;
		this.$$asyncQueue = [];
		this.$$applyAsyncQueue = [];
		this.$$applyAsyncId = null;
		this.$$postDigestQueue = [];
		this.$$phase = null;
		this.$$children = [];
		this.$root = this;
	}

	$new(isolated, parent) {
		let child;
		parent = parent || this;
		if (isolated) {
			child = new Scope();
			child.$root = parent.$root;
			child.$$asyncQueue = parent.$$asyncQueue;
			child.$$postDigestQueue = parent.$$postDigestQueue;
			child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
		} else {
			child = Object.create(this);

			child.$$watchers = [];
			child.$$children = [];
		}
		parent.$$children.push(child);
		child.$parent = parent;
		
		return child;
	}

	$destroy() {
		if (this.$parent) {
			let siblings = this.$parent.$children;
			let indexOfThis = siblings.indexOf(this);
			if (indexOfThis >= 0) {
				siblings.splice(indexOfThis, 1);
			}
		}
		this.$$watchers = null;
	}

	$begisnPhase(phase) {
		if (this.$$phase) {
			throw `${this.$$phase} already in process`;
		}
		this.$$phase = phase;
	}

	$clearPhase() {
		this.$$phase = null;
	}

	$watch(watchFn, listenerFn, valueEq) {
		const watcher = {
			watchFn: watchFn,
			listenerFn: listenerFn || (() => {}),
			last: initWatchVal,
			valueEq: !!valueEq
		};

		this.$$watchers.push(watcher);
		this.$root.$$lastDirtyWatch = null;

		return () => {
			let index = this.$$watchers.indexOf(watcher);
			if (index >= 0) {
				this.$$watchers.splice(index, 1);
				this.$root.$$lastDirtyWatch = null;
			}
		};
	}

	$digest() {
		let dirty, ttl = 10;
		this.$root.$$lastDirtyWatch = null;
		this.$begisnPhase('$digest');

		if (this.$root.$$applyAsyncId) {
			clearTimeout(this.$root.$$applyAsyncId);
			this.$$flushApplyAsync();
		}

		do {
			while (this.$$asyncQueue.length) {
				try {
					const asyncTask = this.$$asyncQueue.shift();
					asyncTask.scope.$eval(asyncTask.expression);
				} catch (e) {
					console.error(e);
				}
			}
			dirty = this.$$digestOnce();
			if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
				this.$clearPhase();
				throw 'digest max';
			}
		} while (dirty || this.$$asyncQueue.length);
		this.$clearPhase();

		while(this.$$postDigestQueue.length) {
			try {
				this.$$postDigestQueue.shift()(this);
			} catch (e) {
				console.error(e);
			}
		}
	}

	$$everyScope(fn) {
		if (fn.call(this)) {
			return this.$$children.every((child) => {
				return child.$$everyScope(fn);
			});
		} else {
			return false;
		}
	}

	$$digestOnce() {
		let newVal,
			oldVal,
			dirty,
			self = this,
			continueLoop = true;

		// use normal function due to the context binding needs.
		let iterator = function () {
			this.$$watchers.some((watcher) => {
				try {
					if (watcher) {
						newVal = watcher.watchFn(this);
						oldVal = watcher.last;

						if (!this.$$areEqual(newVal, oldVal, watcher.valueEq)) {
							oldVal = (oldVal === initWatchVal) ? newVal : oldVal;
							watcher.listenerFn(newVal, oldVal, this);
							watcher.last = newVal;
							this.$root.$$lastDirtyWatch = watcher;
							dirty = true;
						} else if (watcher === this.$root.$$lastDirtyWatch) {
							continueLoop = false;
							return true;
						}
					}
				} catch (e) {
					console.error(e);
				}
			});
			return continueLoop;
		};


		this.$$everyScope(iterator);

		return dirty;
	}

	$$areEqual(newVal, oldVal, valueEq) {
		if (valueEq) {
			return _.isEqual(newVal, oldVal);
		} else {
			return Object.is(newVal,oldVal);
		}
	}

	$eval(expr, locals) {
		return expr(this, locals);
	}


	$apply(expr) {
		try {
			this.$begisnPhase('$apply');
			this.$eval(expr);
		} finally {
			this.$clearPhase();
			this.$root.$digest();
		}
	}

	$evalAsync(expr) {
		if (!this.$$phase && !this.$$asyncQueue.length) {
			setTimeout(() => {
				if (this.$$asyncQueue.length) {
					this.$root.$digest();
				}
			}, 0);
		}
		this.$$asyncQueue.push({scope: this, expression: expr});
	}

	$$flushApplyAsync() {
		while (this.$$applyAsyncQueue.length) {
			try {
				this.$$applyAsyncQueue.shift()();
			} catch (e) {
				console.error(e);
			}
		}
		this.$root.$$applyAsyncId = null;
	}

	$applyAsync(expr) {
		this.$$applyAsyncQueue.push(() => {
			this.$eval(expr);
		});

		if (this.$root.$$applyAsyncId === null) {
			this.$root.$$applyAsyncId = setTimeout(() => {
				this.$apply(this.$$flushApplyAsync.bind(this));
			}, 0);
		}
	}

	$$postDigest(fn) {
		this.$$postDigestQueue.push(fn);
	}


	$watchGroup(watchFns, listenerFn) {
		const newVals = new Array(watchFns.length);
		const oldVals = new Array(watchFns.length);
		let changeReactionScheduled = false;
		let firstRun = true;

		if (!watchFns.length) {
			let shouldCall = true;
			this.$evalAsync(() => {
				if (shouldCall) {
					listenerFn(newVals, oldVals, this);
				}
			});
			return () => {
				shouldCall = false;
			};
		}

		const watchGroupListener = () => {
			if (firstRun) {
				firstRun = false;
				listenerFn(newVals, newVals, this);
			} else {
				listenerFn(newVals, oldVals, this);
			}
			changeReactionScheduled = false;
		};

		let destroyFunctions = watchFns.map((watchFn, i) => {
			return this.$watch(watchFn, (newVal, oldVal) => {
				newVals[i] = newVal;
				oldVals[i] = oldVal;
				if (!changeReactionScheduled) {
					changeReactionScheduled = true;
					this.$evalAsync(watchGroupListener);
				}
			});
		});

		return () => {
			destroyFunctions.forEach((destroyFn) => {
				destroyFn();
			});
		};
	}

}

export default Scope