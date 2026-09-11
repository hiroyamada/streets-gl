// Animal names used for randomly generated player names. Kept short enough that
// `Anonymous ${animal}` never exceeds the 20 character name limit (10 chars max here).
export const Animals: string[] = [
	'Otter', 'Fox', 'Wolf', 'Hawk', 'Panda', 'Tiger', 'Koala', 'Rabbit',
	'Falcon', 'Badger', 'Raven', 'Lynx', 'Moose', 'Gecko', 'Heron', 'Marmot'
];

const Prefix = 'Anonymous ';

// Picks a random "Anonymous <Animal>" name. `random` defaults to Math.random but can be
// injected for deterministic tests.
export function randomAnonymousName(random: () => number = Math.random): string {
	const index = Math.floor(random() * Animals.length) % Animals.length;

	return `${Prefix}${Animals[index]}`;
}
