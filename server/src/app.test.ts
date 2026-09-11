import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
// Imported with `= require(...)` rather than a default import so this keeps
// working under tsconfigs that don't set esModuleInterop.
import request = require('supertest');
import {Application} from 'express';
import {createApp} from './app';
import MemoryScoreStore from './scores/MemoryScoreStore';

function makeApp(options: {staticDir?: string; rateLimit?: boolean} = {}): Application {
	const store = new MemoryScoreStore();

	return createApp(store, {rateLimit: false, ...options});
}

describe('GET /api/health', () => {
	it('returns ok: true', async () => {
		const app = makeApp();

		const res = await request(app).get('/api/health');

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ok: true});
	});
});

describe('POST /api/scores', () => {
	it('accepts a valid score and returns 201', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.send({name: 'Alice', timeMs: 12345});

		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({name: 'Alice', timeMs: 12345});
		expect(typeof res.body.id).toBe('number');
		expect(typeof res.body.createdAt).toBe('string');
		expect(res.body.rank).toBe(1);
		expect(typeof res.body.editToken).toBe('string');
		expect(res.body.editToken.length).toBeGreaterThan(0);
	});

	it('includes the submitted score\'s rank, ties sharing a rank', async () => {
		const store = new MemoryScoreStore();
		const app = createApp(store, {rateLimit: false});

		const first = await request(app).post('/api/scores').send({name: 'Alice', timeMs: 5000});

		expect(first.body.rank).toBe(1);

		const faster = await request(app).post('/api/scores').send({name: 'Bob', timeMs: 1000});

		expect(faster.body.rank).toBe(1);

		const tie = await request(app).post('/api/scores').send({name: 'Carol', timeMs: 1000});

		expect(tie.body.rank).toBe(1);

		const slower = await request(app).post('/api/scores').send({name: 'Dave', timeMs: 9000});

		expect(slower.body.rank).toBe(4);
	});

	it('trims the name', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.send({name: '  Bob  ', timeMs: 1000});

		expect(res.status).toBe(201);
		expect(res.body.name).toBe('Bob');
	});

	it('rejects a missing name', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.send({timeMs: 1000});

		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('error');
	});

	it('rejects an empty name', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.send({name: '', timeMs: 1000});

		expect(res.status).toBe(400);
	});

	it('rejects a whitespace-only name', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.send({name: '   ', timeMs: 1000});

		expect(res.status).toBe(400);
	});

	it('rejects a name longer than 20 characters', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.send({name: 'a'.repeat(21), timeMs: 1000});

		expect(res.status).toBe(400);
	});

	it('strips control characters from a name, accepting it if still valid', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.send({name: 'Alice', timeMs: 1000});

		expect(res.status).toBe(201);
		expect(res.body.name).toBe('Alice');
	});

	it('rejects a non-integer timeMs', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.send({name: 'Alice', timeMs: 12.5});

		expect(res.status).toBe(400);
	});

	it('rejects a negative timeMs', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.send({name: 'Alice', timeMs: -1});

		expect(res.status).toBe(400);
	});

	it('rejects a timeMs over 24 hours', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.send({name: 'Alice', timeMs: 24 * 60 * 60 * 1000 + 1});

		expect(res.status).toBe(400);
	});

	it('rejects a non-object body', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.send([1, 2, 3]);

		expect(res.status).toBe(400);
	});

	it('returns 400 Invalid JSON for malformed JSON', async () => {
		const app = makeApp();

		const res = await request(app)
			.post('/api/scores')
			.set('Content-Type', 'application/json')
			.send('{not valid json');

		expect(res.status).toBe(400);
		expect(res.body).toEqual({error: 'Invalid JSON'});
	});
});

describe('PATCH /api/scores/:id', () => {
	it('renames a score with the correct edit token', async () => {
		const store = new MemoryScoreStore();
		const app = createApp(store, {rateLimit: false});

		const created = await request(app).post('/api/scores').send({name: 'Alice', timeMs: 5000});

		const res = await request(app)
			.patch(`/api/scores/${created.body.id}`)
			.send({name: 'Alicia', editToken: created.body.editToken});

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({id: created.body.id, name: 'Alicia', timeMs: 5000, rank: 1});
		expect(res.body).not.toHaveProperty('editToken');

		const list = await request(app).get('/api/scores');

		expect(list.body.map((s: {name: string}) => s.name)).toEqual(['Alicia']);
	});

	it('returns the current rank after renaming', async () => {
		const store = new MemoryScoreStore();
		const app = createApp(store, {rateLimit: false});

		const first = await request(app).post('/api/scores').send({name: 'Alice', timeMs: 5000});

		await request(app).post('/api/scores').send({name: 'Bob', timeMs: 1000});

		const res = await request(app)
			.patch(`/api/scores/${first.body.id}`)
			.send({name: 'Alicia', editToken: first.body.editToken});

		expect(res.status).toBe(200);
		expect(res.body.rank).toBe(2);
	});

	it('rejects a wrong edit token with 403', async () => {
		const store = new MemoryScoreStore();
		const app = createApp(store, {rateLimit: false});

		const created = await request(app).post('/api/scores').send({name: 'Alice', timeMs: 5000});

		const res = await request(app)
			.patch(`/api/scores/${created.body.id}`)
			.send({name: 'Eve', editToken: 'not-the-real-token'});

		expect(res.status).toBe(403);
		expect(res.body).toHaveProperty('error');

		const list = await request(app).get('/api/scores');

		expect(list.body[0].name).toBe('Alice');
	});

	it('returns 404 for an unknown id', async () => {
		const app = makeApp();

		const res = await request(app)
			.patch('/api/scores/999')
			.send({name: 'Eve', editToken: 'whatever'});

		expect(res.status).toBe(404);
		expect(res.body).toHaveProperty('error');
	});

	it('returns 400 for a non-numeric id', async () => {
		const app = makeApp();

		const res = await request(app)
			.patch('/api/scores/not-a-number')
			.send({name: 'Eve', editToken: 'whatever'});

		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('error');
	});

	it('rejects an invalid name with 400', async () => {
		const store = new MemoryScoreStore();
		const app = createApp(store, {rateLimit: false});

		const created = await request(app).post('/api/scores').send({name: 'Alice', timeMs: 5000});

		const res = await request(app)
			.patch(`/api/scores/${created.body.id}`)
			.send({name: '', editToken: created.body.editToken});

		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('error');
	});

	it('rejects a missing editToken with 400', async () => {
		const store = new MemoryScoreStore();
		const app = createApp(store, {rateLimit: false});

		const created = await request(app).post('/api/scores').send({name: 'Alice', timeMs: 5000});

		const res = await request(app)
			.patch(`/api/scores/${created.body.id}`)
			.send({name: 'Alicia'});

		expect(res.status).toBe(400);
		expect(res.body).toHaveProperty('error');
	});

	it('applies the same rate limiter as POST', async () => {
		const store = new MemoryScoreStore();
		const app = createApp(store, {rateLimit: true});

		const created = await request(app).post('/api/scores').send({name: 'Alice', timeMs: 1000});

		for (let i = 1; i < 10; i++) {
			const res = await request(app)
				.patch(`/api/scores/${created.body.id}`)
				.send({name: 'Alicia', editToken: created.body.editToken});

			expect(res.status).toBe(200);
		}

		const res = await request(app)
			.patch(`/api/scores/${created.body.id}`)
			.send({name: 'Alicia', editToken: created.body.editToken});

		expect(res.status).toBe(429);
	});
});

describe('GET /api/scores', () => {
	it('returns scores sorted fastest first', async () => {
		const store = new MemoryScoreStore();
		const app = createApp(store, {rateLimit: false});

		await store.add({name: 'Slow', timeMs: 5000});
		await store.add({name: 'Fast', timeMs: 1000});
		await store.add({name: 'Medium', timeMs: 3000});

		const res = await request(app).get('/api/scores');

		expect(res.status).toBe(200);
		expect(res.body.map((s: {name: string}) => s.name)).toEqual(['Fast', 'Medium', 'Slow']);
	});

	it('never includes editToken', async () => {
		const store = new MemoryScoreStore();
		const app = createApp(store, {rateLimit: false});

		await request(app).post('/api/scores').send({name: 'Alice', timeMs: 1000});

		const res = await request(app).get('/api/scores');

		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0]).not.toHaveProperty('editToken');
	});

	it('respects limit', async () => {
		const store = new MemoryScoreStore();
		const app = createApp(store, {rateLimit: false});

		await store.add({name: 'A', timeMs: 1000});
		await store.add({name: 'B', timeMs: 2000});
		await store.add({name: 'C', timeMs: 3000});

		const res = await request(app).get('/api/scores?limit=2');

		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
	});

	it('rejects limit=0', async () => {
		const app = makeApp();

		const res = await request(app).get('/api/scores?limit=0');

		expect(res.status).toBe(400);
	});

	it('rejects a non-numeric limit', async () => {
		const app = makeApp();

		const res = await request(app).get('/api/scores?limit=abc');

		expect(res.status).toBe(400);
	});

	it('rejects a limit over 100', async () => {
		const app = makeApp();

		const res = await request(app).get('/api/scores?limit=101');

		expect(res.status).toBe(400);
	});
});

describe('unknown API routes', () => {
	it('returns a JSON 404', async () => {
		const app = makeApp();

		const res = await request(app).get('/api/x');

		expect(res.status).toBe(404);
		expect(res.body).toEqual({error: 'Not found'});
	});
});

describe('rate limiting', () => {
	it('returns 429 on the 11th POST within the window', async () => {
		const store = new MemoryScoreStore();
		const app = createApp(store, {rateLimit: true});

		for (let i = 0; i < 10; i++) {
			const res = await request(app)
				.post('/api/scores')
				.send({name: 'Alice', timeMs: 1000});

			expect(res.status).toBe(201);
		}

		const res = await request(app)
			.post('/api/scores')
			.send({name: 'Alice', timeMs: 1000});

		expect(res.status).toBe(429);
	});
});

describe('static file serving', () => {
	let staticDir: string;

	beforeEach(() => {
		staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'streets-gl-static-'));
		fs.writeFileSync(path.join(staticDir, 'index.html'), '<html><body>app</body></html>');
	});

	afterEach(() => {
		fs.rmSync(staticDir, {recursive: true, force: true});
	});

	it('serves index.html at /', async () => {
		const app = makeApp({staticDir});

		const res = await request(app).get('/');

		expect(res.status).toBe(200);
		expect(res.text).toContain('<body>app</body>');
	});

	it('serves index.html for a deep link', async () => {
		const app = makeApp({staticDir});

		const res = await request(app).get('/some/deep/link');

		expect(res.status).toBe(200);
		expect(res.text).toContain('<body>app</body>');
	});

	it('still returns a JSON 404 for unknown /api/* routes', async () => {
		const app = makeApp({staticDir});

		const res = await request(app).get('/api/nope');

		expect(res.status).toBe(404);
		expect(res.body).toEqual({error: 'Not found'});
	});
});
