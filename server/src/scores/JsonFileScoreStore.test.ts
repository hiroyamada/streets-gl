import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import JsonFileScoreStore from './JsonFileScoreStore';

describe('JsonFileScoreStore', () => {
	let dir: string;
	let filePath: string;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-store-'));
		filePath = path.join(dir, 'nested', 'scores.json');
	});

	afterEach(() => {
		fs.rmSync(dir, {recursive: true, force: true});
	});

	test('init creates the parent directory and the file', async () => {
		const store = new JsonFileScoreStore(filePath);

		await store.init();

		expect(fs.existsSync(filePath)).toBe(true);

		const contents = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

		expect(contents).toEqual({nextId: 1, scores: []});
	});

	test('init does not overwrite an existing file', async () => {
		fs.mkdirSync(path.dirname(filePath), {recursive: true});
		fs.writeFileSync(filePath, JSON.stringify({
			nextId: 5,
			scores: [{id: 4, name: 'Existing', timeMs: 1000, createdAt: '2020-01-01T00:00:00.000Z'}]
		}));

		const store = new JsonFileScoreStore(filePath);

		await store.init();

		const scores = await store.list(10);

		expect(scores).toHaveLength(1);
		expect(scores[0].id).toBe(4);
	});

	test('add assigns incrementing ids and an ISO createdAt', async () => {
		const store = new JsonFileScoreStore(filePath);

		await store.init();

		const first = await store.add({name: 'Alice', timeMs: 1000});
		const second = await store.add({name: 'Bob', timeMs: 2000});

		expect(first.id).toBe(1);
		expect(second.id).toBe(2);
		expect(() => new Date(first.createdAt).toISOString()).not.toThrow();
		expect(new Date(first.createdAt).toISOString()).toBe(first.createdAt);
	});

	test('list sorts by timeMs ascending, ties broken by insertion order', async () => {
		const store = new JsonFileScoreStore(filePath);

		await store.init();

		await store.add({name: 'Slow', timeMs: 5000});
		await store.add({name: 'Fast', timeMs: 1000});
		await store.add({name: 'AlsoFast', timeMs: 1000});

		const scores = await store.list(10);

		expect(scores.map(s => s.name)).toEqual(['Fast', 'AlsoFast', 'Slow']);
	});

	test('list respects the limit', async () => {
		const store = new JsonFileScoreStore(filePath);

		await store.init();

		for (let i = 0; i < 5; i++) {
			await store.add({name: `Player${i}`, timeMs: 1000 + i});
		}

		const scores = await store.list(2);

		expect(scores).toHaveLength(2);
		expect(scores.map(s => s.timeMs)).toEqual([1000, 1001]);
	});

	test('data persists across a second instance reading the same file', async () => {
		const store1 = new JsonFileScoreStore(filePath);

		await store1.init();
		await store1.add({name: 'Alice', timeMs: 1000});

		const store2 = new JsonFileScoreStore(filePath);

		await store2.init();

		const scores = await store2.list(10);

		expect(scores).toHaveLength(1);
		expect(scores[0].name).toBe('Alice');
	});

	test('concurrent adds do not interleave writes and all get unique ids', async () => {
		const store = new JsonFileScoreStore(filePath);

		await store.init();

		const results = await Promise.all(
			Array.from({length: 20}, (_, i) => store.add({name: `Player${i}`, timeMs: 1000 + i}))
		);

		const ids = results.map(r => r.id);
		const uniqueIds = new Set(ids);

		expect(uniqueIds.size).toBe(20);

		const raw = fs.readFileSync(filePath, 'utf-8');
		const parsed = JSON.parse(raw);

		expect(parsed.scores).toHaveLength(20);

		const scores = await store.list(20);

		expect(scores).toHaveLength(20);
	});
});
