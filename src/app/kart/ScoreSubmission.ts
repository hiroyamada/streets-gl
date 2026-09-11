import HUD from "~/app/kart/HUD";
import {fetchTopScores, submitScore, updateScoreName, SubmittedScore, ScoreEntry} from "~/app/kart/ScoreApi";
import {randomAnonymousName} from "~/app/kart/AnonymousName";

const PlayerNameStorageKey = 'shibuyaKart.playerName';
const LeaderboardSize = 10;

type SubmitStatus = 'idle' | 'pending' | 'succeeded' | 'failed';

interface SavedScore {
	id: number;
	editToken: string;
	name: string;
	rank: number;
}

// Orchestrates the finish-screen flow: submitting the time automatically, showing a
// provisional leaderboard as soon as the top scores are known, then reconciling it once
// the submission resolves, and finally letting the player rename their entry afterwards.
// Kept free of DOM details (that's HUD's job) so the request/response logic can be
// reasoned about (and tested) on its own.
export default class ScoreSubmission {
	private readonly hud: HUD;
	private submitStatus: SubmitStatus = 'idle';
	private renameStatus: 'idle' | 'pending' = 'idle';
	private defaultName: string = '';
	private timeMs: number = 0;
	private savedScore: SavedScore = null;
	// A rename the player asked for while a rename (or submit) was already in flight;
	// applied once the in-flight one resolves so the effective name is always the last
	// one the player asked for.
	private pendingName: string = null;
	// Bumped by reset() so an in-flight request from a race that's already been reset
	// can tell it's stale and stop short of touching state/localStorage/HUD for the
	// next race.
	private generation: number = 0;

	public constructor(hud: HUD) {
		this.hud = hud;
	}

	private static loadPlayerName(): string | null {
		try {
			const value = localStorage.getItem(PlayerNameStorageKey);

			return value && value.trim() !== '' ? value : null;
		} catch (e) {
			return null;
		}
	}

	private static savePlayerName(name: string): void {
		try {
			localStorage.setItem(PlayerNameStorageKey, name);
		} catch (e) {
			// Storage unavailable (private mode etc.) - ignore.
		}
	}

	// Call once per race, right before finish is shown.
	public reset(): void {
		this.submitStatus = 'idle';
		this.renameStatus = 'idle';
		this.defaultName = '';
		this.timeMs = 0;
		this.savedScore = null;
		this.pendingName = null;
		this.generation++;
	}

	// Shows the score form and kicks off the auto-submit flow for the race that just
	// finished.
	public present(timeMs: number): void {
		const generation = this.generation;

		this.timeMs = timeMs;
		this.defaultName = ScoreSubmission.loadPlayerName() ?? randomAnonymousName();

		this.hud.showScoreForm(this.defaultName, 'Update name', (name: string): void => {
			this.onFormSubmit(name);
		});
		this.hud.setScoreSaving();
		this.hud.focusScoreInput();

		fetchTopScores(LeaderboardSize).then((top) => {
			// If the submit has already succeeded (and possibly rendered the final
			// board) by the time this resolves, don't clobber it with the provisional
			// one - the provisional board is only meaningful before submitStatus flips.
			if (this.generation === generation && this.submitStatus !== 'succeeded') {
				this.renderProvisional(top);
			}
		}).catch((e: unknown): void => {
			console.warn('Failed to load kart leaderboard', e);
		});

		this.submit(this.defaultName, generation).catch((): void => {
			// Already surfaced to the player via hud.setScoreError.
		});
	}

	// The provisional own row, inserted into the top-scores list at the rank it would
	// occupy (or shown outside the list if it wouldn't make the top LeaderboardSize).
	private renderProvisional(top: ScoreEntry[]): void {
		const provisionalRank = 1 + top.filter((entry) => entry.timeMs < this.timeMs).length;
		const ownEntry = {id: -1, name: this.defaultName, timeMs: this.timeMs};

		if (provisionalRank <= LeaderboardSize) {
			const combined: {id: number; name: string; timeMs: number}[] = top.slice();
			combined.splice(provisionalRank - 1, 0, ownEntry);
			combined.length = Math.min(combined.length, LeaderboardSize);
			this.hud.showLeaderboard(combined, ownEntry.id);
		} else {
			this.hud.showLeaderboard(top, ownEntry.id, {rank: provisionalRank, name: ownEntry.name, timeMs: ownEntry.timeMs});
		}
	}

	private onFormSubmit(name: string): void {
		if (this.submitStatus === 'pending') {
			this.pendingName = name;
			return;
		}

		if (this.submitStatus === 'failed') {
			this.submit(name, this.generation).catch((): void => {
				// Already surfaced to the player via hud.setScoreError.
			});
			return;
		}

		// Submit already succeeded - this is a rename.
		this.rename(name);
	}

	private async submit(name: string, generation: number): Promise<void> {
		this.submitStatus = 'pending';

		if (this.generation === generation) {
			this.hud.setScoreSaving();
		}

		try {
			const result: SubmittedScore = await submitScore(name, Math.round(this.timeMs));

			if (this.generation !== generation) {
				return;
			}

			this.submitStatus = 'succeeded';
			this.savedScore = {id: result.id, editToken: result.editToken, name: result.name, rank: result.rank};

			if (name !== this.defaultName) {
				ScoreSubmission.savePlayerName(name);
			}

			this.hud.setScoreSaved(result.name, result.rank);

			await this.refreshFinalBoard(generation);

			if (this.generation !== generation) {
				return;
			}

			if (this.pendingName !== null) {
				const nextName = this.pendingName;
				this.pendingName = null;
				this.rename(nextName);
			}
		} catch (e) {
			if (this.generation === generation) {
				this.submitStatus = 'failed';
				this.hud.setScoreError("Couldn't save your time");
			}

			throw e;
		}
	}

	private async refreshFinalBoard(generation: number): Promise<void> {
		const saved = this.savedScore;

		try {
			const top = await fetchTopScores(LeaderboardSize);

			if (this.generation !== generation) {
				return;
			}

			const inTop = top.some((entry) => entry.id === saved.id);
			const ownOutside = inTop ? null : {rank: saved.rank, name: saved.name, timeMs: this.timeMs};

			this.hud.showLeaderboard(top, saved.id, ownOutside);
		} catch (e) {
			if (this.generation === generation) {
				// At minimum show the player's own row even without a full board.
				this.hud.showLeaderboard([], null, {rank: saved.rank, name: saved.name, timeMs: this.timeMs});
			}
		}
	}

	private rename(name: string): void {
		const saved = this.savedScore;

		if (!saved || name === '' || name === saved.name) {
			return;
		}

		if (this.renameStatus === 'pending') {
			this.pendingName = name;
			return;
		}

		const generation = this.generation;

		this.renameStatus = 'pending';
		this.hud.setScoreBusy('Updating…');

		updateScoreName(saved.id, saved.editToken, name).then((result) => {
			this.renameStatus = 'idle';

			if (this.generation !== generation) {
				return;
			}

			this.savedScore = {...saved, name: result.name, rank: result.rank};
			ScoreSubmission.savePlayerName(result.name);
			this.hud.setScoreSaved(result.name, result.rank);
			this.hud.updateOwnName(result.name);

			if (this.pendingName !== null) {
				const nextName = this.pendingName;
				this.pendingName = null;
				this.rename(nextName);
			}
		}).catch((e: unknown) => {
			this.renameStatus = 'idle';

			if (this.generation === generation) {
				this.hud.setScoreEditError("Couldn't update your name");
			}

			console.warn('Failed to update kart score name', e);
		});
	}
}
