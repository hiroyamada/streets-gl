export enum RacePhase {
	Title,
	Countdown,
	Racing,
	Finished
}

export const CountdownDuration = 3000;
export const GoDisplayDuration = 900;
export const CourseName = 'Shibuya Circuit';
const BestTimeStorageKey = 'shibuyaKart.bestTime';

// Race bookkeeping: title screen, countdown, timer, split times, best time. Times are in
// milliseconds.
export default class RaceState {
	public phase: RacePhase = RacePhase.Title;
	public titleStart: number = 0;
	public countdownStart: number = 0;
	public raceStart: number = null;
	public finishTime: number = null;
	public splits: number[] = [];
	public nextStarIndex: number = 0;
	public falseStart: boolean = false;
	public bestTime: number = null;
	public readonly totalStars: number;

	public constructor(totalStars: number) {
		this.totalStars = totalStars;
		this.bestTime = RaceState.loadBestTime();
	}

	private static loadBestTime(): number {
		try {
			const value = parseFloat(localStorage.getItem(BestTimeStorageKey));

			return isNaN(value) ? null : value;
		} catch (e) {
			return null;
		}
	}

	private static saveBestTime(time: number): void {
		try {
			localStorage.setItem(BestTimeStorageKey, time.toString());
		} catch (e) {
			// Storage unavailable (private mode etc.) - ignore.
		}
	}

	public reset(now: number): void {
		this.phase = RacePhase.Title;
		this.titleStart = now;
		this.raceStart = null;
		this.finishTime = null;
		this.splits = [];
		this.nextStarIndex = 0;
		this.falseStart = false;
	}

	// Milliseconds since the title screen appeared, for the cinematic camera.
	public getTitleElapsed(now: number): number {
		return now - this.titleStart;
	}

	// Advances from the title screen into the 3-2-1 countdown. Only valid from Title; returns
	// whether the transition happened, so a repeated Space press is harmless.
	public beginCountdown(now: number): boolean {
		if (this.phase !== RacePhase.Title) {
			return false;
		}

		this.phase = RacePhase.Countdown;
		this.countdownStart = now;

		return true;
	}

	// 3, 2, 1 during the countdown; 0 once it's time to go.
	public getCountdownValue(now: number): number {
		const elapsed = now - this.countdownStart;

		return Math.max(0, 3 - Math.floor(elapsed / 1000));
	}

	public getCountdownProgress(now: number): number {
		return Math.min(1, Math.max(0, (now - this.countdownStart) / CountdownDuration));
	}

	public start(now: number): void {
		this.phase = RacePhase.Racing;
		this.raceStart = now;
	}

	public getElapsed(now: number): number {
		if (this.raceStart === null) {
			return 0;
		}

		return (this.finishTime ?? now) - this.raceStart;
	}

	public recordSplit(now: number): number {
		const split = this.getElapsed(now);

		this.splits.push(split);
		this.nextStarIndex++;

		return split;
	}

	public get isComplete(): boolean {
		return this.nextStarIndex >= this.totalStars;
	}

	// Returns true when this run is a new best time.
	public finish(now: number): boolean {
		this.phase = RacePhase.Finished;
		this.finishTime = now;

		const total = this.getElapsed(now);

		if (this.bestTime === null || total < this.bestTime) {
			this.bestTime = total;
			RaceState.saveBestTime(total);

			return true;
		}

		return false;
	}

	// Mario Kart style: 1'02"34
	public static formatTime(ms: number): string {
		const clamped = Math.max(0, ms);
		const minutes = Math.floor(clamped / 60000);
		const seconds = Math.floor((clamped % 60000) / 1000);
		const hundredths = Math.floor((clamped % 1000) / 10);

		return `${minutes}'${seconds.toString().padStart(2, '0')}"${hundredths.toString().padStart(2, '0')}`;
	}
}
