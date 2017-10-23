export function setupModuleLoader (window) {
	let ensure = (obj, name, factory) => {
		return obj[name] || (obj[name] = factory());
	};

	let createModule = function(name, requires, modules) {
		if (name === 'hasOwnProperty') {
			throw 'invalid module name';
		}

		let invokeQueue = [];

		let moduleInstance = {
			name: name,
			requires: requires,
			constant: (key, value) => {
				if (key === 'hasOwnProperty') {
					throw 'invalid constant name';
				}
				invokeQueue.push([
					'constant',
					[key, value]
				]);
			},
			_invokeQueue: invokeQueue
		};

		modules[name] = moduleInstance;

		return moduleInstance;
	};

	let getModule = function (name, modules) {
		if (modules.hasOwnProperty(name)) {
			return modules[name];
		} else {
			throw 'module not available';
		}
	};

	let angular = ensure(window, 'angular', Object);

	let module = ensure(angular, 'module', () => {
		let modules = {};
		return (name, requires) => {
			if (requires) {
				return createModule(name, requires, modules);
			} else {
				return getModule(name, modules);
			}
		};
	});
}