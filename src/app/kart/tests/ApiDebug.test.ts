import {formatApiDebugEntry, sendApiDebugRequest} from "~/app/kart/ApiDebug";

function textResponse(status: number, text: string): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		text: (): Promise<string> => Promise.resolve(text)
	} as unknown as Response;
}

describe('sendApiDebugRequest', () => {
	test('listScores sends a GET to /api/scores?limit=10 and builds a matching entry', async () => {
		const fetchMock = jest.fn().mockResolvedValue(textResponse(200, '[{"id":1}]'));
		const now = jest.fn().mockReturnValueOnce(1000).mockReturnValueOnce(1043);

		const entry = await sendApiDebugRequest('listScores', {fetch: fetchMock as unknown as typeof fetch, now});

		expect(fetchMock).toHaveBeenCalledWith('/api/scores?limit=10', undefined);
		expect(entry.method).toBe('GET');
		expect(entry.url).toBe('/api/scores?limit=10');
		expect(entry.status).toBe(200);
		expect(entry.ok).toBe(true);
		expect(entry.body).toBe('[{"id":1}]');
		expect(entry.error).toBeNull();
		expect(entry.startedAt).toBe(1000);
		expect(entry.durationMs).toBe(43);
	});

	test('submitTestScore sends a POST with the DEBUG name and a random timeMs in range', async () => {
		const fetchMock = jest.fn().mockResolvedValue(textResponse(201, '{"id":2}'));

		const entry = await sendApiDebugRequest('submitTestScore', {fetch: fetchMock as unknown as typeof fetch});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/scores');
		expect(init.method).toBe('POST');
		expect(init.headers).toEqual({'Content-Type': 'application/json'});

		const body = JSON.parse(init.body);
		expect(body.name).toBe('DEBUG');
		expect(typeof body.timeMs).toBe('number');
		expect(body.timeMs).toBeGreaterThanOrEqual(60000);
		expect(body.timeMs).toBeLessThanOrEqual(120000);

		expect(entry.method).toBe('POST');
		expect(entry.status).toBe(201);
		expect(entry.ok).toBe(true);
		expect(entry.body).toBe('{"id":2}');
	});

	test('a non-2xx response sets ok=false and keeps the body', async () => {
		const fetchMock = jest.fn().mockResolvedValue(textResponse(500, '{"error":"boom"}'));

		const entry = await sendApiDebugRequest('listScores', {fetch: fetchMock as unknown as typeof fetch});

		expect(entry.ok).toBe(false);
		expect(entry.status).toBe(500);
		expect(entry.body).toBe('{"error":"boom"}');
		expect(entry.error).toBeNull();
	});

	test('a fetch rejection produces a null status and an error string', async () => {
		const fetchMock = jest.fn().mockRejectedValue(new Error('network down'));

		const entry = await sendApiDebugRequest('listScores', {fetch: fetchMock as unknown as typeof fetch});

		expect(entry.status).toBeNull();
		expect(entry.ok).toBe(false);
		expect(entry.error).toBe('network down');
		expect(entry.body).toBe('');
	});

	test('a rejection with a non-Error value is stringified', async () => {
		const fetchMock = jest.fn().mockRejectedValue('offline');

		const entry = await sendApiDebugRequest('listScores', {fetch: fetchMock as unknown as typeof fetch});

		expect(entry.error).toBe('offline');
	});

	test('a long body is truncated to ~2000 chars', async () => {
		const longBody = 'x'.repeat(3000);
		const fetchMock = jest.fn().mockResolvedValue(textResponse(200, longBody));

		const entry = await sendApiDebugRequest('listScores', {fetch: fetchMock as unknown as typeof fetch});

		expect(entry.body.length).toBeLessThan(3000);
		expect(entry.body.startsWith('x'.repeat(2000))).toBe(true);
		expect(entry.body).toContain('truncated');
	});

	test('assigns increasing ids across calls', async () => {
		const fetchMock = jest.fn().mockResolvedValue(textResponse(200, ''));

		const first = await sendApiDebugRequest('listScores', {fetch: fetchMock as unknown as typeof fetch});
		const second = await sendApiDebugRequest('listScores', {fetch: fetchMock as unknown as typeof fetch});

		expect(second.id).toBeGreaterThan(first.id);
	});
});

describe('formatApiDebugEntry', () => {
	test('formats a successful response', () => {
		const summary = formatApiDebugEntry({
			id: 1,
			kind: 'listScores',
			method: 'GET',
			url: '/api/scores?limit=10',
			startedAt: 0,
			durationMs: 43,
			status: 200,
			ok: true,
			body: '[]',
			error: null
		});

		expect(summary).toBe('GET /api/scores?limit=10 → 200 (43 ms)');
	});

	test('formats a network error', () => {
		const summary = formatApiDebugEntry({
			id: 1,
			kind: 'submitTestScore',
			method: 'POST',
			url: '/api/scores',
			startedAt: 0,
			durationMs: 5,
			status: null,
			ok: false,
			body: '',
			error: 'network down'
		});

		expect(summary).toBe('POST /api/scores → network error: network down');
	});
});
