import * as path from 'path';
import * as dotenv from 'dotenv';
import {createApp} from './app';
import {createStoreFromEnv} from './scores/createStore';

// Load the repo-root .env file before anything below reads process.env.
//
// We use the `dotenv` package rather than Node's built-in
// `process.loadEnvFile` (Node 20.12+/21.7+) because the production Docker
// image is built FROM node:19 (see Dockerfile), which predates that API.
// `dotenv.config()` behaves the same way we need here: it never overrides
// variables already present in the real environment (Coolify's runtime env
// wins over the file), it strips surrounding double quotes from values, and
// it silently no-ops (does not throw) when the .env file is absent, which is
// the case in the Docker image. __dirname resolves two levels up to the repo
// root whether this runs as server/src/index.ts (tsx) or the compiled
// server/dist/index.js, so this works regardless of the process's cwd.
dotenv.config({path: path.resolve(__dirname, '../../.env'), quiet: true});

const PORT = Number(process.env.PORT) || 8080;

const STATIC_DIR = process.env.STATIC_DIR
	?? (process.env.NODE_ENV === 'production' ? path.resolve(__dirname, '../../build') : undefined);

async function main(): Promise<void> {
	const store = createStoreFromEnv(process.env);

	try {
		await store.init();
	} catch (err) {
		console.error('Failed to initialize score store:', err);
		process.exit(1);

		return;
	}

	const storeDescription = process.env.DATABASE_URL
		? 'Postgres'
		: `JSON file (${process.env.SCORES_FILE ?? path.join(process.cwd(), 'server', 'data', 'scores.json')})`;

	const app = createApp(store, {staticDir: STATIC_DIR, rateLimit: true});

	const server = app.listen(PORT, '0.0.0.0', () => {
		console.log(`Score store: ${storeDescription}. Listening on port ${PORT}.`);
	});

	const shutdown = (): void => {
		server.close(() => {
			store.close()
				.then(() => process.exit(0))
				.catch((err) => {
					console.error('Error closing score store:', err);
					process.exit(1);
				});
		});
	};

	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
