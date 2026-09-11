export type ApiDebugRequestKind = 'listScores' | 'submitTestScore';

export interface ApiDebugEntry {
	id: number;
	kind: ApiDebugRequestKind;
	method: 'GET' | 'POST';
	url: string;
	startedAt: number;
	durationMs: number;
	status: number | null;
	ok: boolean;
	body: string;
	error: string | null;
}

const MAX_BODY_LENGTH = 2000;

let nextId = 1;

function truncateBody(text: string): string {
	if (text.length <= MAX_BODY_LENGTH) {
		return text;
	}

	return text.slice(0, MAX_BODY_LENGTH) + `... (truncated, ${text.length} chars total)`;
}

function randomTimeMs(): number {
	return 60000 + Math.floor(Math.random() * (120000 - 60000 + 1));
}

export async function sendApiDebugRequest(
	kind: ApiDebugRequestKind,
	deps: {fetch?: typeof fetch; now?: () => number} = {}
): Promise<ApiDebugEntry> {
	const fetchImpl = deps.fetch ?? fetch;
	const now = deps.now ?? Date.now;

	const id = nextId++;
	const startedAt = now();

	let method: 'GET' | 'POST';
	let url: string;
	let init: RequestInit | undefined;

	if (kind === 'listScores') {
		method = 'GET';
		url = '/api/scores?limit=10';
		init = undefined;
	} else {
		method = 'POST';
		url = '/api/scores';
		init = {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({name: 'DEBUG', timeMs: randomTimeMs()})
		};
	}

	try {
		const response = await fetchImpl(url, init);
		const text = await response.text();

		return {
			id,
			kind,
			method,
			url,
			startedAt,
			durationMs: now() - startedAt,
			status: response.status,
			ok: response.ok,
			body: truncateBody(text),
			error: null
		};
	} catch (e) {
		return {
			id,
			kind,
			method,
			url,
			startedAt,
			durationMs: now() - startedAt,
			status: null,
			ok: false,
			body: '',
			error: e instanceof Error ? e.message : String(e)
		};
	}
}

export function formatApiDebugEntry(entry: ApiDebugEntry): string {
	if (entry.error !== null) {
		return `${entry.method} ${entry.url} → network error: ${entry.error}`;
	}

	return `${entry.method} ${entry.url} → ${entry.status} (${entry.durationMs} ms)`;
}
