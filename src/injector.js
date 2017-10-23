'use strict';

export function createInjector(modulesToLoad) {
	const cache = {};

	const $provide = {
		constant: (key, value) => {
			cache[key] = value;
		}
	};

	modulesToLoad.forEach((moduleName) => {
		const module = window.angular.module(moduleName);
		module._invokeQueue.forEach((invokeArgs) => {
			const method = invokeArgs[0];
			const value = invokeArgs[1];

			$provide[method].apply($provide, value);
		});
	});

	return {
		has: (key) => {
			return cache.hasOwnProperty(key);
		},
		get: (key) => {
			return cache[key];
		}
	};
}