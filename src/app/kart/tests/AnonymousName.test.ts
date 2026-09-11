import {Animals, randomAnonymousName} from "~/app/kart/AnonymousName";

describe('randomAnonymousName', () => {
	test('starts with "Anonymous " and stays within the 20 char name limit', () => {
		for (const animal of Animals) {
			expect(`Anonymous ${animal}`.length).toBeLessThanOrEqual(20);
		}
	});

	test('is deterministic given an injected RNG', () => {
		expect(randomAnonymousName(() => 0)).toBe(`Anonymous ${Animals[0]}`);
		expect(randomAnonymousName(() => 0.999999)).toBe(`Anonymous ${Animals[Animals.length - 1]}`);
	});

	test('always starts with "Anonymous "', () => {
		for (let i = 0; i < 20; i++) {
			expect(randomAnonymousName(() => i / 20)).toMatch(/^Anonymous /);
		}
	});
});
