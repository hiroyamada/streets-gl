import {NewScore} from './ScoreStore';

export const MAX_NAME_LENGTH = 20;
export const MAX_TIME_MS = 24 * 60 * 60 * 1000;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1f\x7f]/g;

export type ValidationResult =
	| {ok: true; value: NewScore}
	| {ok: false; error: string};

export function validateNewScore(body: unknown): ValidationResult {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return {ok: false, error: 'Request body must be an object'};
	}

	const {name, timeMs} = body as Record<string, unknown>;

	if (typeof name !== 'string') {
		return {ok: false, error: 'name must be a string'};
	}

	const cleanedName = name.trim().replace(CONTROL_CHARS_REGEX, '');

	if (cleanedName.length < 1 || cleanedName.length > MAX_NAME_LENGTH) {
		return {ok: false, error: `name must be between 1 and ${MAX_NAME_LENGTH} characters`};
	}

	if (typeof timeMs !== 'number' || !Number.isFinite(timeMs)) {
		return {ok: false, error: 'timeMs must be a finite number'};
	}

	if (!Number.isInteger(timeMs)) {
		return {ok: false, error: 'timeMs must be an integer'};
	}

	if (timeMs <= 0) {
		return {ok: false, error: 'timeMs must be greater than 0'};
	}

	if (timeMs > MAX_TIME_MS) {
		return {ok: false, error: `timeMs must be at most ${MAX_TIME_MS}`};
	}

	return {ok: true, value: {name: cleanedName, timeMs}};
}
