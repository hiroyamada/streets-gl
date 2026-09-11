import * as fs from 'fs';
import * as path from 'path';
import {generateEditToken, editTokensMatch} from './editToken';
import {NewScore, NewScoreResult, RenameResult, Score, ScoreStore, StoredScore} from './ScoreStore';

interface JsonFileContents {
	nextId: number;
	scores: StoredScore[];
}

export default class JsonFileScoreStore implements ScoreStore {
	private readonly filePath: string;
	private data: JsonFileContents = {nextId: 1, scores: []};
	private writeQueue: Promise<void> = Promise.resolve();

	public constructor(filePath: string) {
		this.filePath = filePath;
	}

	public async init(): Promise<void> {
		const dir = path.dirname(this.filePath);

		await fs.promises.mkdir(dir, {recursive: true});

		if (!fs.existsSync(this.filePath)) {
			const initial: JsonFileContents = {nextId: 1, scores: []};

			await fs.promises.writeFile(this.filePath, JSON.stringify(initial));
		}

		const raw = await fs.promises.readFile(this.filePath, 'utf-8');

		// Older files may contain records with no `editToken` (written before
		// it existed); those simply parse in as `editToken: undefined` and are
		// treated as not renameable.
		this.data = JSON.parse(raw) as JsonFileContents;
	}

	public async add(score: NewScore): Promise<NewScoreResult> {
		const task = this.writeQueue.then(() => this.doAdd(score));

		// Keep the queue chain alive even if this particular write fails, so
		// subsequent calls aren't stuck behind a rejected promise forever.
		this.writeQueue = task.then(
			() => undefined,
			() => undefined
		);

		return task;
	}

	private async doAdd(score: NewScore): Promise<NewScoreResult> {
		const editToken = generateEditToken();

		const stored: StoredScore = {
			id: this.data.nextId,
			name: score.name,
			timeMs: score.timeMs,
			createdAt: new Date().toISOString(),
			editToken
		};

		this.data.nextId += 1;
		this.data.scores.push(stored);

		await this.writeToDisk();

		const rank = this.rankOf(stored.timeMs);

		return {id: stored.id, name: stored.name, timeMs: stored.timeMs, createdAt: stored.createdAt, rank, editToken};
	}

	public async rename(id: number, name: string, editToken: string): Promise<RenameResult> {
		const task = this.writeQueue.then(() => this.doRename(id, name, editToken));

		this.writeQueue = task.then(
			() => undefined,
			() => undefined
		);

		return task;
	}

	private async doRename(id: number, name: string, editToken: string): Promise<RenameResult> {
		const stored = this.data.scores.find(s => s.id === id);

		if (!stored) {
			return {kind: 'not_found'};
		}

		if (!editTokensMatch(stored.editToken, editToken)) {
			return {kind: 'forbidden'};
		}

		stored.name = name;

		await this.writeToDisk();

		const rank = this.rankOf(stored.timeMs);

		return {
			kind: 'ok',
			score: {id: stored.id, name: stored.name, timeMs: stored.timeMs, createdAt: stored.createdAt, rank}
		};
	}

	private rankOf(timeMs: number): number {
		return this.data.scores.filter(s => s.timeMs < timeMs).length + 1;
	}

	private async writeToDisk(): Promise<void> {
		const tmpPath = `${this.filePath}.tmp`;

		await fs.promises.writeFile(tmpPath, JSON.stringify(this.data));
		await fs.promises.rename(tmpPath, this.filePath);
	}

	public async list(limit: number): Promise<Score[]> {
		const sorted = [...this.data.scores].sort((a, b) => {
			if (a.timeMs !== b.timeMs) {
				return a.timeMs - b.timeMs;
			}

			return a.id - b.id;
		});

		return sorted.slice(0, limit).map(({editToken, ...score}) => score);
	}

	public async close(): Promise<void> {
		return undefined;
	}
}
