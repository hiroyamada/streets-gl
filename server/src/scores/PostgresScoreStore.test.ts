import {newDb} from 'pg-mem';
import PostgresScoreStore from './PostgresScoreStore';

function createStore(): PostgresScoreStore {
	const db = newDb();
	const {Pool} = db.adapters.createPg();

	return new PostgresScoreStore(new Pool());
}

describe('PostgresScoreStore', () => {
	test('init is idempotent', async () => {
		const store = createStore();

		await store.init();
		await store.init();

		const scores = await store.list(10);

		expect(scores).toEqual([]);
	});

	test('add returns a numeric id and an ISO createdAt', async () => {
		const store = createStore();

		await store.init();

		const score = await store.add({name: 'Alice', timeMs: 1000});

		expect(typeof score.id).toBe('number');
		expect(score.name).toBe('Alice');
		expect(score.timeMs).toBe(1000);
		expect(score.rank).toBe(1);
		expect(() => new Date(score.createdAt).toISOString()).not.toThrow();
		expect(new Date(score.createdAt).toISOString()).toBe(score.createdAt);
	});

	test('add returns the rank of the submitted score', async () => {
		const store = createStore();

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

	test('list orders by timeMs ascending, ties broken by id', async () => {
		const store = createStore();

		await store.init();

		await store.add({name: 'Slow', timeMs: 5000});
		await store.add({name: 'Fast', timeMs: 1000});
		await store.add({name: 'AlsoFast', timeMs: 1000});

		const scores = await store.list(10);

		expect(scores.map(s => s.name)).toEqual(['Fast', 'AlsoFast', 'Slow']);
	});

	test('list respects the limit', async () => {
		const store = createStore();

		await store.init();

		for (let i = 0; i < 5; i++) {
			await store.add({name: `Player${i}`, timeMs: 1000 + i});
		}

		const scores = await store.list(2);

		expect(scores).toHaveLength(2);
		expect(scores.map(s => s.timeMs)).toEqual([1000, 1001]);
	});

	test('add returns an editToken, not included in list results', async () => {
		const store = createStore();

		await store.init();

		const added = await store.add({name: 'Alice', timeMs: 1000});

		expect(typeof added.editToken).toBe('string');
		expect(added.editToken.length).toBeGreaterThan(0);

		const scores = await store.list(10);

		expect(scores[0]).not.toHaveProperty('edit_token');
		expect(scores[0]).not.toHaveProperty('editToken');
	});

	test('rename updates the name and returns the current rank when given the correct token', async () => {
		const store = createStore();

		await store.init();

		const added = await store.add({name: 'Alice', timeMs: 5000});

		await store.add({name: 'Bob', timeMs: 1000});

		const result = await store.rename(added.id, 'Alicia', added.editToken);

		expect(result.kind).toBe('ok');

		if (result.kind === 'ok') {
			expect(result.score).toMatchObject({id: added.id, name: 'Alicia', timeMs: 5000, rank: 2});
		}

		const scores = await store.list(10);

		expect(scores.find(s => s.id === added.id)?.name).toBe('Alicia');
	});

	test('rename returns forbidden for a wrong token', async () => {
		const store = createStore();

		await store.init();

		const added = await store.add({name: 'Alice', timeMs: 1000});

		const result = await store.rename(added.id, 'Eve', 'wrong-token');

		expect(result).toEqual({kind: 'forbidden'});
	});

	test('rename returns not_found for an unknown id', async () => {
		const store = createStore();

		await store.init();

		const result = await store.rename(999, 'Eve', 'whatever');

		expect(result).toEqual({kind: 'not_found'});
	});

	test('init is idempotent even when run against a table that already has edit_token', async () => {
		const store = createStore();

		await store.init();
		await store.init();

		const added = await store.add({name: 'Alice', timeMs: 1000});

		expect(typeof added.editToken).toBe('string');
	});
});
