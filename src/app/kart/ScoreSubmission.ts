import HUD from "~/app/kart/HUD";
import {fetchTopScores, submitScore} from "~/app/kart/ScoreApi";
import {randomAnonymousName} from "~/app/kart/AnonymousName";

const PlayerNameStorageKey = 'shibuyaKart.playerName';
const LeaderboardSize = 10;

type Status = 'idle' | 'pending' | 'succeeded';

// Orchestrates the "save your time" flow shown on the finish overlay: prefilling a
// default name, submitting it to the server, and rendering the resulting leaderboard.
// Kept free of DOM details (that's HUD's job) so the request/response logic can be
// reasoned about (and tested) on its own.
export default class ScoreSubmission {
	private readonly hud: HUD;
	private status: Status = 'idle';
	private defaultName: string = '';
	private timeMs: number = 0;
	// Bumped by reset() so an in-flight submit() from a race that's already been reset
	// (e.g. a fire-and-forget auto-submit on restart) can tell it's stale and stop short
	// of touching status/localStorage/HUD for the next race.
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
		this.status = 'idle';
		this.defaultName = '';
		this.timeMs = 0;
		this.generation++;
	}

	// Shows the score form on the HUD for the race that just finished.
	public present(timeMs: number): void {
		this.timeMs = timeMs;
		this.defaultName = ScoreSubmission.loadPlayerName() ?? randomAnonymousName();

		this.hud.showScoreForm(this.defaultName, (name: string): void => {
			this.submit(name).catch((): void => {
				// Already surfaced to the player via hud.setScoreError.
			});
		});
		this.hud.focusScoreInput();
	}

	// Called from KartSystem.restart() so the time is never silently lost: if the
	// player restarts before a submission has started (or succeeded), submit whatever
	// name is currently in the box (or the default) fire-and-forget.
	public submitOnRestartIfNeeded(): void {
		if (this.status !== 'idle') {
			return;
		}

		const name = this.hud.getScoreNameInput() || this.defaultName;

		this.submit(name).catch((e: unknown): void => {
			console.warn('Failed to auto-submit kart score', e);
		});
	}

	private async submit(name: string): Promise<void> {
		if (this.status !== 'idle') {
			return;
		}

		const generation = this.generation;
		const isDefault = name === this.defaultName;

		this.status = 'pending';
		this.hud.setScoreSaving();

		try {
			const result = await submitScore(name, Math.round(this.timeMs));

			// The race this submission belonged to has since been reset (e.g. the
			// player restarted before this fire-and-forget request resolved) - the
			// upload above still happened, which is the point, but there's no longer
			// an overlay or a `status`/name to update for it.
			if (this.generation !== generation) {
				return;
			}

			this.status = 'succeeded';

			if (!isDefault) {
				ScoreSubmission.savePlayerName(name);
			}

			// A null result means the save succeeded but the server didn't echo back
			// the stored score (a bodyless 2xx) - fall back to what was submitted.
			this.hud.setScoreSaved(result ? result.name : name, result ? result.rank : undefined);

			try {
				const top = await fetchTopScores(LeaderboardSize);

				if (this.generation === generation) {
					this.hud.showLeaderboard(top, result ? result.id : -1);
				}
			} catch (e) {
				console.warn('Failed to load kart leaderboard', e);
			}
		} catch (e) {
			if (this.generation === generation) {
				this.status = 'idle';
				this.hud.setScoreError("Couldn't save your time");
			}

			throw e;
		}
	}
}
