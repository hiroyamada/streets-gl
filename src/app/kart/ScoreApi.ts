export interface SubmittedScore {
	id: number;
	name: string;
	timeMs: number;
	createdAt: string;
	rank: number;
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

export async function submitScore(name: string, timeMs: number): Promise<SubmittedScore> {
	const response = await fetch('/api/scores', {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({name, timeMs})
	});

	if (!response.ok) {
		throw new Error(await readErrorMessage(response));
	}

	return await response.json() as SubmittedScore;
}

export async function fetchTopScores(limit: number): Promise<ScoreEntry[]> {
	const response = await fetch(`/api/scores?limit=${encodeURIComponent(limit.toString())}`);

	if (!response.ok) {
		throw new Error(await readErrorMessage(response));
	}

	return await response.json() as ScoreEntry[];
}
