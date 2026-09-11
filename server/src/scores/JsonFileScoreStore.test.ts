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

	test('add returns the rank of the submitted score', async () => {
		const store = new JsonFileScoreStore(filePath);

		await store.init();

		const first = await store.add({name: 'Alice', timeMs: 5000});

		expect(first.rank).toBe(1);

		const faster = await store.add({name: 'Bob', timeMs: 1000});

		expect(faster.rank).toBe(1);

		const tie = await store.add({name: 'Carol', timeMs: 1000});

		expect(tie.rank).toBe(1);

		const slower = await store.add({name: 'Dave', timeMs: 9000});

		expect(slower.rank).toBe(4);
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

	test('add returns an editToken, not included in list results', async () => {
		const store = new JsonFileScoreStore(filePath);

		await store.init();

		const added = await store.add({name: 'Alice', timeMs: 1000});

		expect(typeof added.editToken).toBe('string');
		expect(added.editToken.length).toBeGreaterThan(0);

		const scores = await store.list(10);

		expect(scores[0]).not.toHaveProperty('editToken');
	});

	test('rename updates the name and returns the current rank when given the correct token', async () => {
		const store = new JsonFileScoreStore(filePath);

		await store.init();

		const added = await store.add({name: 'Alice', timeMs: 5000});

		await store.add({name: 'Bob', timeMs: 1000});

		const result = await store.rename(added.id, 'Alicia', added.editToken);

		expect(result).toEqual({
			kind: 'ok',
			score: {id: added.id, name: 'Alicia', timeMs: 5000, createdAt: added.createdAt, rank: 2}
		});

		const scores = await store.list(10);

		expect(scores.find(s => s.id === added.id)?.name).toBe('Alicia');
	});

	test('rename returns forbidden for a wrong token', async () => {
		const store = new JsonFileScoreStore(filePath);

		await store.init();

		const added = await store.add({name: 'Alice', timeMs: 1000});

		const result = await store.rename(added.id, 'Eve', 'wrong-token');

		expect(result).toEqual({kind: 'forbidden'});

		const scores = await store.list(10);

		expect(scores[0].name).toBe('Alice');
	});

	test('rename returns not_found for an unknown id', async () => {
		const store = new JsonFileScoreStore(filePath);

		await store.init();

		const result = await store.rename(999, 'Eve', 'whatever');

		expect(result).toEqual({kind: 'not_found'});
	});

	test('rename returns forbidden for a pre-existing record with no editToken, and does not crash on load', async () => {
		fs.mkdirSync(path.dirname(filePath), {recursive: true});
		fs.writeFileSync(filePath, JSON.stringify({
			nextId: 5,
			scores: [{id: 4, name: 'Existing', timeMs: 1000, createdAt: '2020-01-01T00:00:00.000Z'}]
		}));

		const store = new JsonFileScoreStore(filePath);

		await store.init();

		const result = await store.rename(4, 'New Name', 'anything');

		expect(result).toEqual({kind: 'forbidden'});

		const scores = await store.list(10);

		expect(scores[0].name).toBe('Existing');
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
