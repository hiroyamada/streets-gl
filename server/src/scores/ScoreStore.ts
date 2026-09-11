/**
 * A recorded high score. Lower `timeMs` is better (it is a race time).
 */
export interface Score {
	id: number;
	name: string;
	timeMs: number;
	/** ISO 8601 timestamp */
	createdAt: string;
}

export interface NewScore {
	name: string;
	timeMs: number;
}

export interface ScoreStore {
	/** Prepare the backing storage (create tables / files). Safe to call more than once. */
	init(): Promise<void>;
	/** Persist a score and return the stored record with its id and timestamp. */
	add(score: NewScore): Promise<Score>;
	/** Return up to `limit` scores, fastest first. Ties are ordered by earliest submission. */
	list(limit: number): Promise<Score[]>;
	/** Release connections / handles. */
	close(): Promise<void>;
}
