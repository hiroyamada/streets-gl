import {NextFunction, Request, Response, Router} from 'express';
// Named import (rather than the default export) so this doesn't depend on
// esModuleInterop being enabled.
import {rateLimit} from 'express-rate-limit';
import {ScoreStore} from './ScoreStore';
import {validateNewScore} from './validate';

export interface ScoresRouterOptions {
	rateLimit?: boolean;
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function wrap(handler: AsyncHandler): (req: Request, res: Response, next: NextFunction) => void {
	return (req, res, next) => {
		handler(req, res, next).catch(next);
	};
}

const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

function parseLimit(raw: unknown): {ok: true; value: number} | {ok: false; error: string} {
	if (raw === undefined) {
		return {ok: true, value: DEFAULT_LIMIT};
	}

	if (typeof raw !== 'string' || raw.trim() === '') {
		return {ok: false, error: 'limit must be an integer'};
	}

	if (!/^-?\d+$/.test(raw.trim())) {
		return {ok: false, error: 'limit must be an integer'};
	}

	const value = Number(raw);

	if (!Number.isInteger(value) || value < MIN_LIMIT || value > MAX_LIMIT) {
		return {ok: false, error: `limit must be between ${MIN_LIMIT} and ${MAX_LIMIT}`};
	}

	return {ok: true, value};
}

export function createScoresRouter(store: ScoreStore, options: ScoresRouterOptions = {}): Router {
	const router = Router();

	const postLimiter = rateLimit({
		windowMs: 60_000,
		limit: 10,
		standardHeaders: true,
		legacyHeaders: false,
		message: {error: 'Too many submissions, try again later'}
	});

	const postMiddleware = options.rateLimit === false ? [] : [postLimiter];

	router.post('/', ...postMiddleware, wrap(async (req: Request, res: Response): Promise<void> => {
		const result = validateNewScore(req.body);

		// Narrow via the `error` property (rather than `!result.ok`) so this
		// keeps working under tsconfigs that disable strictNullChecks, where
		// boolean-literal discriminants don't narrow reliably.
		if ('error' in result) {
			res.status(400).json({error: result.error});

			return;
		}

		const stored = await store.add(result.value);

		res.status(201).json(stored);
	}));

	router.get('/', wrap(async (req: Request, res: Response): Promise<void> => {
		const parsed = parseLimit(req.query.limit);

		if ('error' in parsed) {
			res.status(400).json({error: parsed.error});

			return;
		}

		const scores = await store.list(parsed.value);

		res.status(200).json(scores);
	}));

	return router;
}
