import {fetchTopScores, submitScore, updateScoreName} from "~/app/kart/ScoreApi";

function jsonResponse(status: number, body: unknown): Response {
	return textResponse(status, JSON.stringify(body));
}

function textResponse(status: number, text: string): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: (): Promise<unknown> => Promise.resolve(JSON.parse(text)),
		text: (): Promise<string> => Promise.resolve(text)
	} as unknown as Response;
}

describe('submitScore', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('posts the name and time and returns the stored score', async () => {
		const stored = {
			id: 1, name: 'Otter', timeMs: 62340, createdAt: '2024-01-01T00:00:00.000Z', rank: 3, editToken: 'secret'
		};
		const fetchMock = jest.fn().mockResolvedValue(jsonResponse(201, stored));
		global.fetch = fetchMock as unknown as typeof fetch;

		const result = await submitScore('Otter', 62340);

		expect(result).toEqual(stored);
		expect(fetchMock).toHaveBeenCalledWith('/api/scores', {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({name: 'Otter', timeMs: 62340})
		});
	});

	test('propagates the server error message on a 400 response', async () => {
		global.fetch = jest.fn().mockResolvedValue(
			jsonResponse(400, {error: 'name must be between 1 and 20 characters'})
		) as unknown as typeof fetch;

		await expect(submitScore('', 100)).rejects.toThrow('name must be between 1 and 20 characters');
	});

	test('propagates a network failure', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

		await expect(submitScore('Otter', 100)).rejects.toThrow('network down');
	});

	test('resolves to null on a bodyless 2xx response instead of throwing', async () => {
		global.fetch = jest.fn().mockResolvedValue(textResponse(201, '')) as unknown as typeof fetch;

		await expect(submitScore('Otter', 100)).resolves.toBeNull();
	});

	test('resolves to null when the 2xx body is whitespace only', async () => {
		global.fetch = jest.fn().mockResolvedValue(textResponse(200, '   \n')) as unknown as typeof fetch;

		await expect(submitScore('Otter', 100)).resolves.toBeNull();
	});

	test('throws a clear error on a malformed 2xx body', async () => {
		global.fetch = jest.fn().mockResolvedValue(textResponse(200, '{not json')) as unknown as typeof fetch;

		await expect(submitScore('Otter', 100)).rejects.toThrow('malformed response from the server');
	});
});

describe('fetchTopScores', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('fetches the leaderboard with the given limit', async () => {
		const scores = [{id: 1, name: 'Otter', timeMs: 62340, createdAt: '2024-01-01T00:00:00.000Z'}];
		const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, scores));
		global.fetch = fetchMock as unknown as typeof fetch;

		const result = await fetchTopScores(10);

		expect(result).toEqual(scores);
		expect(fetchMock).toHaveBeenCalledWith('/api/scores?limit=10');
	});

	test('throws with a generic message when the error body has no message', async () => {
		global.fetch = jest.fn().mockResolvedValue(jsonResponse(500, {})) as unknown as typeof fetch;

		await expect(fetchTopScores(10)).rejects.toThrow('Request failed with status 500');
	});

	test('propagates a network failure', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

		await expect(fetchTopScores(10)).rejects.toThrow('offline');
	});

	test('resolves to an empty leaderboard on a bodyless 2xx response', async () => {
		global.fetch = jest.fn().mockResolvedValue(textResponse(204, '')) as unknown as typeof fetch;

		await expect(fetchTopScores(10)).resolves.toEqual([]);
	});

	test('resolves to an empty leaderboard when the 2xx body is whitespace only', async () => {
		global.fetch = jest.fn().mockResolvedValue(textResponse(200, '  ')) as unknown as typeof fetch;

		await expect(fetchTopScores(10)).resolves.toEqual([]);
	});

	test('throws a clear error on a malformed 2xx body', async () => {
		global.fetch = jest.fn().mockResolvedValue(textResponse(200, 'not json')) as unknown as typeof fetch;

		await expect(fetchTopScores(10)).rejects.toThrow('malformed response from the server');
	});
});

describe('updateScoreName', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('patches the score with the new name and edit token', async () => {
		const updated = {id: 1, name: 'Fox', timeMs: 62340, createdAt: '2024-01-01T00:00:00.000Z', rank: 2};
		const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, updated));
		global.fetch = fetchMock as unknown as typeof fetch;

		const result = await updateScoreName(1, 'secret', 'Fox');

		expect(result).toEqual(updated);
		expect(fetchMock).toHaveBeenCalledWith('/api/scores/1', {
			method: 'PATCH',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({name: 'Fox', editToken: 'secret'})
		});
	});

	test('propagates the server error message on a 403 response', async () => {
		global.fetch = jest.fn().mockResolvedValue(
			jsonResponse(403, {error: 'invalid edit token'})
		) as unknown as typeof fetch;

		await expect(updateScoreName(1, 'wrong', 'Fox')).rejects.toThrow('invalid edit token');
	});

	test('propagates a network failure', async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

		await expect(updateScoreName(1, 'secret', 'Fox')).rejects.toThrow('offline');
	});

	test('resolves to null on a bodyless 2xx response instead of throwing', async () => {
		global.fetch = jest.fn().mockResolvedValue(textResponse(204, '')) as unknown as typeof fetch;

		await expect(updateScoreName(1, 'secret', 'Fox')).resolves.toBeNull();
	});

	test('resolves to null when the 2xx body is whitespace only', async () => {
		global.fetch = jest.fn().mockResolvedValue(textResponse(200, '   \n')) as unknown as typeof fetch;

		await expect(updateScoreName(1, 'secret', 'Fox')).resolves.toBeNull();
	});

	test('throws a clear error on a malformed 2xx body', async () => {
		global.fetch = jest.fn().mockResolvedValue(textResponse(200, '{not json')) as unknown as typeof fetch;

		await expect(updateScoreName(1, 'secret', 'Fox')).rejects.toThrow('malformed response from the server');
	});
});
