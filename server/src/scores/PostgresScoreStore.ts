import {Pool} from 'pg';
import {generateEditToken, editTokensMatch} from './editToken';
import {NewScore, NewScoreResult, RenameResult, Score, ScoreStore} from './ScoreStore';

interface ScoreRow {
	id: string | number;
	name: string;
	time_ms: number;
	created_at: Date | string;
}

interface ScoreRowWithToken extends ScoreRow {
	edit_token: string | null;
}

const POSTGRES_DUPLICATE_TABLE = '42P07';
const POSTGRES_DUPLICATE_OBJECT = '42710';
const POSTGRES_DUPLICATE_COLUMN = '42701';

function isAlreadyExistsError(err: unknown): boolean {
	const code = (err as {code?: unknown})?.code;

	if (code === POSTGRES_DUPLICATE_TABLE || code === POSTGRES_DUPLICATE_OBJECT || code === POSTGRES_DUPLICATE_COLUMN) {
		return true;
	}

	// pg-mem doesn't attach a Postgres error code to its errors, so fall back
	// to matching the message it (and real Postgres) raises for this case.
	const message = (err as {message?: unknown})?.message;

	return typeof message === 'string' && /already exists/i.test(message);
}

function rowToScore(row: ScoreRow): Score {
	const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString();

	return {
		id: Number(row.id),
		name: row.name,
		timeMs: row.time_ms,
		createdAt
	};
}

export default class PostgresScoreStore implements ScoreStore {
	private readonly pool: Pool;

	public constructor(pool: Pool) {
		this.pool = pool;
	}

	public async init(): Promise<void> {
		// "CREATE TABLE/INDEX IF NOT EXISTS" makes init() safe to call more than
		// once against real Postgres, but pg-mem (used in tests) fails to fully
		// resolve its AST when the guard turns the statement into a no-op, so we
		// fall back to catching Postgres's "already exists" error codes instead.
		try {
			await this.pool.query(`
				CREATE TABLE scores (
					id BIGSERIAL PRIMARY KEY,
					name TEXT NOT NULL,
					time_ms INTEGER NOT NULL,
					created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
				);
			`);
		} catch (err) {
			if (!isAlreadyExistsError(err)) {
				throw err;
			}
		}

		try {
			await this.pool.query(`
				CREATE INDEX scores_time_ms_idx ON scores (time_ms, id);
			`);
		} catch (err) {
			if (!isAlreadyExistsError(err)) {
				throw err;
			}
		}

		// Migrate existing deployments that predate the edit_token column.
		// "ADD COLUMN IF NOT EXISTS" is itself idempotent against real
		// Postgres; the try/catch below is only for pg-mem parity with the
		// other statements in this method.
		try {
			await this.pool.query(`
				ALTER TABLE scores ADD COLUMN IF NOT EXISTS edit_token TEXT;
			`);
		} catch (err) {
			if (!isAlreadyExistsError(err)) {
				throw err;
			}
		}
	}

	public async add(score: NewScore): Promise<NewScoreResult> {
		const editToken = generateEditToken();

		const result = await this.pool.query<ScoreRow>(
			`INSERT INTO scores (name, time_ms, edit_token) VALUES ($1, $2, $3) RETURNING id, name, time_ms, created_at;`,
			[score.name, score.timeMs, editToken]
		);

		const stored = rowToScore(result.rows[0]);

		// A second, separate query: under a concurrent insert between these two
		// queries, the computed rank could be off by one. That's acceptable here
		// since rank is only informational feedback to the submitting client.
		const rank = await this.rankOf(stored.timeMs);

		return {...stored, rank, editToken};
	}

	public async list(limit: number): Promise<Score[]> {
		const result = await this.pool.query<ScoreRow>(
			`SELECT id, name, time_ms, created_at FROM scores ORDER BY time_ms ASC, id ASC LIMIT $1;`,
			[limit]
		);

		return result.rows.map(rowToScore);
	}

	public async rename(id: number, name: string, editToken: string): Promise<RenameResult> {
		const result = await this.pool.query<ScoreRowWithToken>(
			`SELECT id, name, time_ms, created_at, edit_token FROM scores WHERE id = $1;`,
			[id]
		);

		const row = result.rows[0];

		if (!row) {
			return {kind: 'not_found'};
		}

		if (!editTokensMatch(row.edit_token ?? undefined, editToken)) {
			return {kind: 'forbidden'};
		}

		const updateResult = await this.pool.query<ScoreRow>(
			`UPDATE scores SET name = $1 WHERE id = $2 RETURNING id, name, time_ms, created_at;`,
			[name, id]
		);

		const stored = rowToScore(updateResult.rows[0]);
		const rank = await this.rankOf(stored.timeMs);

		return {kind: 'ok', score: {...stored, rank}};
	}

	private async rankOf(timeMs: number): Promise<number> {
		// pg returns COUNT(*) as a string (it's a bigint), so it must be
		// converted with Number() before doing arithmetic on it.
		const rankResult = await this.pool.query<{faster: string}>(
			`SELECT COUNT(*) AS faster FROM scores WHERE time_ms < $1;`,
			[timeMs]
		);

		return Number(rankResult.rows[0].faster) + 1;
	}

	public async close(): Promise<void> {
		await this.pool.end();
	}
}
