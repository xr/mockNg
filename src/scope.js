const _ = require('lodash');

const initWatchVal = () => {};

export default class Scope {
	constructor() {
		this.$$watchers = [];
		this.$$lastDirtyWatch = null;
		this.$$asyncQueue = [];
		this.$$applyAsyncQueue = [];
		this.$$applyAsyncId = null;
		this.$$postDigestQueue = [];
		this.$$phase = null;
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
		this.$$lastDirtyWatch = null;

		return () => {
			let index = this.$$watchers.indexOf(watcher);
			if (index >= 0) {
				this.$$watchers.splice(index, 1);
				this.$$lastDirtyWatch = null;
			}
		}
	}

	$digest() {
		let dirty, ttl = 10;
		this.$$lastDirtyWatch = null;
		this.$begisnPhase('$digest');

		if (this.$$applyAsyncId) {
			clearTimeout(this.$$applyAsyncId);
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

	$$digestOnce() {
		let newVal, oldVal, dirty;
		this.$$watchers.some((watcher) => {
			try {
				if (watcher) {
					newVal = watcher.watchFn(this);
					oldVal = watcher.last;

					if (!this.$$areEqual(newVal, oldVal, watcher.valueEq)) {
						oldVal = (oldVal === initWatchVal) ? newVal : oldVal;
						watcher.listenerFn(newVal, oldVal, this);
						watcher.last = newVal;
						this.$$lastDirtyWatch = watcher;
						dirty = true;
					} else if (watcher === this.$$lastDirtyWatch) {
						return true;
					}
				}
			} catch (e) {
				console.error(e);
			}
		});

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
			this.$digest();
		}
	}

	$evalAsync(expr) {
		if (!this.$$phase && !this.$$asyncQueue.length) {
			setTimeout(() => {
				if (this.$$asyncQueue.length) {
					this.$digest();
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
		this.$$applyAsyncId = null;
	}

	$applyAsync(expr) {
		this.$$applyAsyncQueue.push(() => {
			this.$eval(expr);
		});

		if (this.$$applyAsyncId === null) {
			this.$$applyAsyncId = setTimeout(() => {
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