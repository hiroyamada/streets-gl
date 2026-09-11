import * as fs from 'fs';
import * as path from 'path';
import {NewScore, Score, ScoreStore, ScoreWithRank} from './ScoreStore';

interface JsonFileContents {
	nextId: number;
	scores: Score[];
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

		this.data = JSON.parse(raw) as JsonFileContents;
	}

	public async add(score: NewScore): Promise<ScoreWithRank> {
		const task = this.writeQueue.then(() => this.doAdd(score));

		// Keep the queue chain alive even if this particular write fails, so
		// subsequent calls aren't stuck behind a rejected promise forever.
		this.writeQueue = task.then(
			() => undefined,
			() => undefined
		);

		return task;
	}

	private async doAdd(score: NewScore): Promise<ScoreWithRank> {
		const stored: Score = {
			id: this.data.nextId,
			name: score.name,
			timeMs: score.timeMs,
			createdAt: new Date().toISOString()
		};

		this.data.nextId += 1;
		this.data.scores.push(stored);

		await this.writeToDisk();

		const faster = this.data.scores.filter(s => s.timeMs < stored.timeMs).length;

		return {...stored, rank: faster + 1};
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

		return sorted.slice(0, limit);
	}

	public async close(): Promise<void> {
		return undefined;
	}
}
