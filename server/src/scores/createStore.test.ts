import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {createStoreFromEnv} from './createStore';
import JsonFileScoreStore from './JsonFileScoreStore';
import PostgresScoreStore from './PostgresScoreStore';

describe('createStoreFromEnv', () => {
	test('returns a JsonFileScoreStore at SCORES_FILE when DATABASE_URL is unset', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-store-'));
		const filePath = path.join(dir, 'scores.json');

		try {
			const store = createStoreFromEnv({SCORES_FILE: filePath} as NodeJS.ProcessEnv);

			expect(store).toBeInstanceOf(JsonFileScoreStore);
		} finally {
			fs.rmSync(dir, {recursive: true, force: true});
		}
	});

	test('returns a PostgresScoreStore when DATABASE_URL is set', () => {
		const store = createStoreFromEnv({
			DATABASE_URL: 'postgres://user:pass@localhost:5432/scores'
		} as NodeJS.ProcessEnv);

		expect(store).toBeInstanceOf(PostgresScoreStore);
	});
});
