import * as path from 'path';
import {createApp} from './app';
import {createStoreFromEnv} from './scores/createStore';

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
