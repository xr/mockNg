const _ = require('lodash');

const initWatchVal = () => {};

export default class Scope {
	constructor() {
		this.$$watchers = [];
		this.$$lastDirtyWatch = null;
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
		do {
			dirty = this.$$digestOnce();
			if (dirty && !(ttl--)) {
				throw 'digest max';
			}
		} while (dirty);
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


}