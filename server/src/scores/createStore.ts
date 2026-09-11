import * as path from 'path';
import {URL} from 'url';
import {Pool} from 'pg';
import {ScoreStore} from './ScoreStore';
import JsonFileScoreStore from './JsonFileScoreStore';
import PostgresScoreStore from './PostgresScoreStore';

function shouldUseSSL(connectionString: string, env: NodeJS.ProcessEnv): boolean {
	if (env.DATABASE_SSL === 'disable') {
		return false;
	}

	try {
		const {hostname} = new URL(connectionString);

		if (hostname === 'localhost' || hostname === '127.0.0.1') {
			return false;
		}
	} catch {
		// Not a parseable URL; fall through to the default of using SSL.
	}

	return true;
}

export function createStoreFromEnv(env: NodeJS.ProcessEnv): ScoreStore {
	const connectionString = env.DATABASE_URL;

	if (connectionString) {
		// Hosted Postgres providers (e.g. Supabase's connection pooler) terminate
		// TLS with certificates that aren't in Node's default trust store, so we
		// disable certificate verification rather than failing to connect.
		// Certificate *presence* (encryption in transit) is still required.
		const ssl = shouldUseSSL(connectionString, env) ? {rejectUnauthorized: false} : undefined;

		const pool = new Pool({
			connectionString,
			ssl,
			max: 5
		});

		return new PostgresScoreStore(pool);
	}

	const filePath = env.SCORES_FILE || path.join(process.cwd(), 'server', 'data', 'scores.json');

	return new JsonFileScoreStore(filePath);
}
