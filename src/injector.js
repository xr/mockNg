'use strict';

export function createInjector(modulesToLoad, strictDi) {
	const instanceCache = {};
	const providerCache = {};
	const loadedModules = {};
	const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
	const FN_ARG = /^\s*(\S+)\s*$/;
	strictDi = (strictDi === true);

	const $provide = {
		constant: (key, value) => {
			instanceCache[key] = value;
		},
		provider: (key, provider) => {
			providerCache[`${key}Provider`] = provider;
		}
	};

	function instantiate(Constructor, locals) {
		var UnwrappedConstructor = Array.isArray(Constructor) ? Constructor[Constructor.length - 1] : Constructor;
		var instance = Object.create(UnwrappedConstructor.prototype);
		invoke(Constructor, instance, locals);
		return instance;
	}

	function invoke(fn, context, locals) {
		context = context || null;
		let injects = annotate(fn);
		let args = injects.map((key) => {
			return locals && locals.hasOwnProperty(key) ? locals[key] : getService(key);
		});

		if (Array.isArray(fn)) {
			fn = fn[fn.length - 1];
		}
		
		return fn.apply(context, args);
	}

	function annotate(fn) {
		if (Array.isArray(fn)) {
			return fn.slice(0, fn.length - 1);
		} else if (fn.$inject) {
			return fn.$inject;
		} else if (!fn.length) {
			return [];
		} else {
			if (strictDi) {
				throw 'fn is not using explicit annotation and strict mode';
			}
			var argDeclaration = fn.toString().match(FN_ARGS);
			return argDeclaration[1].split(',').map((argName) => {
				return argName.match(FN_ARG)[1];
			});
		}
	}

	modulesToLoad.forEach(function loadModule(moduleName) {
		if (!loadedModules.hasOwnProperty(moduleName)) {
			loadedModules[moduleName] = true;
			const module = window.angular.module(moduleName);
			module.requires.forEach(loadModule);
			module._invokeQueue.forEach((invokeArgs) => {
				const method = invokeArgs[0];
				const value = invokeArgs[1];

				$provide[method].apply($provide, value);
			});
		}
	});

	function getService(name) {
	  if (instanceCache.hasOwnProperty(name)) {
	    return instanceCache[name];
	  } else if (providerCache.hasOwnProperty(name + 'Provider')) {
	    var provider = providerCache[name + 'Provider'];
	    return invoke(provider.$get, provider);
	  }
	}

	return {
		has: (key) => {
			return instanceCache.hasOwnProperty(key) || providerCache.hasOwnProperty(key + 'Provider');
		},
		get: getService,
		invoke: invoke,
		annotate: annotate,
		instantiate: instantiate
	};
}