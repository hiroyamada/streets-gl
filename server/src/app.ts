import * as path from 'path';
// Imported with `= require(...)` rather than a default import so this keeps
// working under tsconfigs that don't set esModuleInterop (express's CJS
// export is a callable function, not an ES module with a `.default`).
import express = require('express');
import {Application, NextFunction, Request, Response} from 'express';
import {ScoreStore} from './scores/ScoreStore';
import {createScoresRouter} from './scores/router';

export interface CreateAppOptions {
	staticDir?: string;
	rateLimit?: boolean;
}

export function createApp(store: ScoreStore, options: CreateAppOptions = {}): Application {
	const app = express();

	// We run behind a PaaS load balancer / reverse proxy, so req.ip and
	// req.secure need to be derived from the X-Forwarded-* headers of the
	// single trusted hop in front of us (also required for express-rate-limit
	// to key on the real client IP instead of the proxy's).
	app.set('trust proxy', 1);

	app.disable('x-powered-by');

	app.use(express.json({limit: '10kb'}));

	app.get('/api/health', (req: Request, res: Response): void => {
		res.status(200).json({ok: true});
	});

	app.use('/api/scores', createScoresRouter(store, {rateLimit: options.rateLimit}));

	app.use('/api', (req: Request, res: Response): void => {
		res.status(404).json({error: 'Not found'});
	});

	if (options.staticDir) {
		const staticDir = options.staticDir;

		app.use(express.static(staticDir, {maxAge: '1d'}));

		app.get('*', (req: Request, res: Response): void => {
			res.sendFile(path.join(staticDir, 'index.html'));
		});
	}

	app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
		const status = (err as {status?: number; statusCode?: number}).status
			?? (err as {status?: number; statusCode?: number}).statusCode;

		if (err instanceof SyntaxError && status === 400) {
			res.status(400).json({error: 'Invalid JSON'});

			return;
		}

		// Other client-side body errors (e.g. payload too large → 413) carry a
		// 4xx status from body-parser; pass that through rather than reporting
		// them as server failures.
		if (typeof status === 'number' && status >= 400 && status < 500) {
			res.status(status).json({error: 'Bad request'});

			return;
		}

		console.error(err);

		res.status(500).json({error: 'Internal server error'});
	});

	return app;
}
