'use strict';

export function createInjector(modulesToLoad, strictDi) {
	
	const loadedModules = {};
	const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
	const FN_ARG = /^\s*(\S+)\s*$/;
	const INSTANTIATING = {};
	strictDi = (strictDi === true);

	const providerCache = {};
	const providerInjector = providerCache.$injector = createInternalInjector(providerCache, function() {
		throw 'Unknown provider';
	});
	const instanceCache = {};
	const instanceInjector = instanceCache.$injector = createInternalInjector(instanceCache, function(name) {
		const provider = providerInjector.get(name + 'Provider');
		return instanceInjector.invoke(provider.$get, provider);
	});


	const $provide = providerCache.$provide = {
		constant: (key, value) => {
			providerCache[key] = value;
			instanceCache[key] = value;
		},
		provider: (key, provider) => {
			if (typeof provider === 'function') {
				provider = providerInjector.instantiate(provider);
			}
			providerCache[`${key}Provider`] = provider;
		}
	};


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

	function createInternalInjector(cache, factoryFn) {
		function getService(name) {
		  	if (cache.hasOwnProperty(name)) {
		  		if (cache[name] === INSTANTIATING) {
		  			throw new Error('Circular dependency found');
		  		}
		  		return cache[name];
		  	} else {
				cache[name] = INSTANTIATING;
				try {
					return (cache[name] = factoryFn(name));
				} finally {
					if (cache[name] === INSTANTIATING) {
						delete cache[name];
					} 
				}
			}
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

		function instantiate(Constructor, locals) {
			var UnwrappedConstructor = Array.isArray(Constructor) ? Constructor[Constructor.length - 1] : Constructor;
			var instance = Object.create(UnwrappedConstructor.prototype);
			invoke(Constructor, instance, locals);
			return instance;
		}

		return {
			has: (key) => {
				return cache.hasOwnProperty(key) || providerCache.hasOwnProperty(key + 'Provider');
			},
			get: getService,
			invoke: invoke,
			annotate: annotate,
			instantiate: instantiate
		};
	}

	function runInvokeQueue(queue) {
		queue.forEach((invokeArgs) => {
			var service = providerInjector.get(invokeArgs[0]);
			var method = invokeArgs[1];
			var args = invokeArgs[2];
			service[method].apply(service, args);
		});
	}


	let runBlocks = [];
	modulesToLoad.forEach(function loadModule(moduleName) {
		if (!loadedModules.hasOwnProperty(moduleName)) {
			loadedModules[moduleName] = true;
			const module = window.angular.module(moduleName);
			module.requires.forEach(loadModule);
			runInvokeQueue(module._invokeQueue);
			runInvokeQueue(module._configBlocks);
			runBlocks = runBlocks.concat(module._runBlocks);
		}
	});

	runBlocks.forEach((runBlock) => {
	  instanceInjector.invoke(runBlock);
	});

	return instanceInjector;
}