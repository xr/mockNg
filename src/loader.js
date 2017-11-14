export function setupModuleLoader (window) {
	let ensure = (obj, name, factory) => {
		return obj[name] || (obj[name] = factory());
	};

	let createModule = function(name, requires, modules) {
		if (name === 'hasOwnProperty') {
			throw 'invalid module name';
		}

		let configBlocks = [];
		let invokeQueue = [];

		let invokeLater = function(service, method, arrayMethod, queue) {
		  return function() {
		  	queue = queue || invokeQueue;
		  	let item = [service, method, arguments];
		    queue[arrayMethod || 'push'](item);
		    return moduleInstance;
		  };
		};

		let moduleInstance = {
			name: name,
			requires: requires,
			constant: invokeLater('$provide', 'constant', 'unshift'),
			provider: invokeLater('$provide', 'provider'),
			config: invokeLater('$injector', 'invoke', 'push', configBlocks),
			run: function (fn) {
				moduleInstance._runBlocks.push(fn);
  				return moduleInstance;
			},
			_invokeQueue: invokeQueue,
			_configBlocks: configBlocks,
			_runBlocks: []
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