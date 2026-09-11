import {generateEditToken, editTokensMatch} from './editToken';
import {NewScore, NewScoreResult, RenameResult, Score, ScoreStore, StoredScore} from './ScoreStore';

/**
 * Simple in-memory ScoreStore implementation, intended for tests only.
 */
export default class MemoryScoreStore implements ScoreStore {
	private scores: StoredScore[] = [];
	private nextId = 1;

	public async init(): Promise<void> {
		return undefined;
	}

	public async add(score: NewScore): Promise<NewScoreResult> {
		const editToken = generateEditToken();

		const stored: StoredScore = {
			id: this.nextId,
			name: score.name,
			timeMs: score.timeMs,
			createdAt: new Date().toISOString(),
			editToken
		};

		this.nextId += 1;
		this.scores.push(stored);

		const rank = this.rankOf(stored.timeMs);

		return {id: stored.id, name: stored.name, timeMs: stored.timeMs, createdAt: stored.createdAt, rank, editToken};
	}

	public async list(limit: number): Promise<Score[]> {
		const sorted = this.sorted();

		return sorted.slice(0, limit).map(({editToken, ...score}) => score);
	}

	public async rename(id: number, name: string, editToken: string): Promise<RenameResult> {
		const stored = this.scores.find(s => s.id === id);

		if (!stored) {
			return {kind: 'not_found'};
		}

		if (!editTokensMatch(stored.editToken, editToken)) {
			return {kind: 'forbidden'};
		}

		stored.name = name;

		const rank = this.rankOf(stored.timeMs);

		return {
			kind: 'ok',
			score: {id: stored.id, name: stored.name, timeMs: stored.timeMs, createdAt: stored.createdAt, rank}
		};
	}

	private rankOf(timeMs: number): number {
		return this.scores.filter(s => s.timeMs < timeMs).length + 1;
	}

	private sorted(): StoredScore[] {
		return [...this.scores].sort((a, b) => {
			if (a.timeMs !== b.timeMs) {
				return a.timeMs - b.timeMs;
			}

			return a.id - b.id;
		});
	}

	public async close(): Promise<void> {
		return undefined;
	}
}
