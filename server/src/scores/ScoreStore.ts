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

/**
 * A stored score along with its rank among all stored scores. Rank is
 * 1-based; ties (equal `timeMs`) share the same rank.
 */
export interface ScoreWithRank extends Score {
	rank: number;
}

/**
 * A score as returned right after creation, including its secret edit
 * token. The token is never included in `list()` results or in any other
 * response after this one.
 */
export interface NewScoreResult extends ScoreWithRank {
	editToken: string;
}

/**
 * A stored score together with its (private) edit token, as persisted by a
 * store's backing storage.
 */
export interface StoredScore extends Score {
	/**
	 * The secret required to rename this score. Older records (written
	 * before this field existed) may not have one, in which case they can
	 * no longer be renamed.
	 */
	editToken?: string;
}

export type RenameResult =
	| {kind: 'ok'; score: ScoreWithRank}
	| {kind: 'not_found'}
	| {kind: 'forbidden'};

export interface ScoreStore {
	/** Prepare the backing storage (create tables / files). Safe to call more than once. */
	init(): Promise<void>;
	/** Persist a score and return the stored record with its id, timestamp, rank, and edit token. */
	add(score: NewScore): Promise<NewScoreResult>;
	/** Return up to `limit` scores, fastest first. Ties are ordered by earliest submission. */
	list(limit: number): Promise<Score[]>;
	/**
	 * Rename an existing score, if `editToken` matches the one it was
	 * created with (compared in constant time). Returns the updated score
	 * with its current rank, or `not_found` / `forbidden`.
	 */
	rename(id: number, name: string, editToken: string): Promise<RenameResult>;
	/** Release connections / handles. */
	close(): Promise<void>;
}
