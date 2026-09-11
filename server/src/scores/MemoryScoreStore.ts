import {NewScore, Score, ScoreStore} from './ScoreStore';

/**
 * Simple in-memory ScoreStore implementation, intended for tests only.
 */
export default class MemoryScoreStore implements ScoreStore {
	private scores: Score[] = [];
	private nextId = 1;

	public async init(): Promise<void> {
		return undefined;
	}

	public async add(score: NewScore): Promise<Score> {
		const stored: Score = {
			id: this.nextId,
			name: score.name,
			timeMs: score.timeMs,
			createdAt: new Date().toISOString()
		};

		this.nextId += 1;
		this.scores.push(stored);

		return stored;
	}

	public async list(limit: number): Promise<Score[]> {
		const sorted = [...this.scores].sort((a, b) => {
			if (a.timeMs !== b.timeMs) {
				return a.timeMs - b.timeMs;
			}

			return a.id - b.id;
		});

		return sorted.slice(0, limit);
	}

	public async close(): Promise<void> {
		return undefined;
	}
}
