export interface SubmittedScore {
	id: number;
	name: string;
	timeMs: number;
	createdAt: string;
	rank: number;
	editToken: string;
}

export interface ScoreEntry {
	id: number;
	name: string;
	timeMs: number;
	createdAt: string;
}

async function readErrorMessage(response: Response): Promise<string> {
	try {
		const body = await response.json();

		if (body && typeof body.error === 'string') {
			return body.error;
		}
	} catch (e) {
		// Response body wasn't JSON - fall through to the generic message.
	}

	return `Request failed with status ${response.status}`;
}

// A 2xx response's `ok` flag says nothing about whether there's a body to parse
// (e.g. a bare 201/204, or a 200 with an empty payload from a proxy in between).
// Read the body as text first and only attempt JSON.parse on it when it's
// actually non-empty, so a bodyless success doesn't surface as a SyntaxError.
async function parseJsonBody<T>(response: Response): Promise<T | null> {
	const text = await response.text();

	if (text.trim() === '') {
		return null;
	}

	try {
		return JSON.parse(text) as T;
	} catch (e) {
		throw new Error(`Received a malformed response from the server (status ${response.status})`);
	}
}

// Returns null when the save succeeded but the server didn't echo back the stored
// score (a bodyless 2xx) - callers should treat that as a successful save with no
// payload, not a failure.
export async function submitScore(name: string, timeMs: number): Promise<SubmittedScore | null> {
	const response = await fetch('/api/scores', {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({name, timeMs})
	});

	if (!response.ok) {
		throw new Error(await readErrorMessage(response));
	}

	return await parseJsonBody<SubmittedScore>(response);
}

export async function fetchTopScores(limit: number): Promise<ScoreEntry[]> {
	const response = await fetch(`/api/scores?limit=${encodeURIComponent(limit.toString())}`);

	if (!response.ok) {
		throw new Error(await readErrorMessage(response));
	}

	return (await parseJsonBody<ScoreEntry[]>(response)) ?? [];
}

// Returns null when the rename succeeded but the server didn't echo back the stored
// score (a bodyless 2xx) - callers should treat that as a successful rename with no
// payload, not a failure.
export async function updateScoreName(
	id: number, editToken: string, name: string
): Promise<(ScoreEntry & {rank: number}) | null> {
	const response = await fetch(`/api/scores/${encodeURIComponent(id.toString())}`, {
		method: 'PATCH',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({name, editToken})
	});

	if (!response.ok) {
		throw new Error(await readErrorMessage(response));
	}

	return await parseJsonBody<ScoreEntry & {rank: number}>(response);
}
