import {Pool} from 'pg';
import {NewScore, Score, ScoreStore} from './ScoreStore';

interface ScoreRow {
	id: string | number;
	name: string;
	time_ms: number;
	created_at: Date | string;
}

const POSTGRES_DUPLICATE_TABLE = '42P07';

function isAlreadyExistsError(err: unknown): boolean {
	const code = (err as {code?: unknown})?.code;

	if (code === POSTGRES_DUPLICATE_TABLE) {
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
	}

	public async add(score: NewScore): Promise<Score> {
		const result = await this.pool.query<ScoreRow>(
			`INSERT INTO scores (name, time_ms) VALUES ($1, $2) RETURNING id, name, time_ms, created_at;`,
			[score.name, score.timeMs]
		);

		return rowToScore(result.rows[0]);
	}

	public async list(limit: number): Promise<Score[]> {
		const result = await this.pool.query<ScoreRow>(
			`SELECT id, name, time_ms, created_at FROM scores ORDER BY time_ms ASC, id ASC LIMIT $1;`,
			[limit]
		);

		return result.rows.map(rowToScore);
	}

	public async close(): Promise<void> {
		await this.pool.end();
	}
}
