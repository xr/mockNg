import Scope from "../src/scope";

describe('Scope', () => {
	it('can construct', () => {
		const scope = new Scope();
    	expect(scope.test()).toBe(1);
	});
});