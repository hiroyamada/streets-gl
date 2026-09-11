import ScoreSubmission from "~/app/kart/ScoreSubmission";
import HUD from "~/app/kart/HUD";
import {fetchTopScores, submitScore} from "~/app/kart/ScoreApi";

jest.mock('~/app/kart/ScoreApi');

const submitScoreMock = submitScore as jest.MockedFunction<typeof submitScore>;
const fetchTopScoresMock = fetchTopScores as jest.MockedFunction<typeof fetchTopScores>;

// A stub good enough to stand in for HUD from ScoreSubmission's point of view: it just
// records what was called, and lets present() wire up the submit callback.
function makeFakeHud(): {hud: HUD; calls: string[]; triggerSubmit: (name: string) => void} {
	const calls: string[] = [];
	let onSubmit: (name: string) => void = (): void => {};
	let inputValue = '';

	const hud = {
		showScoreForm: (defaultName: string, submit: (name: string) => void): void => {
			calls.push(`showScoreForm:${defaultName}`);
			inputValue = defaultName;
			onSubmit = submit;
		},
		focusScoreInput: (): void => {
			calls.push('focusScoreInput');
		},
		getScoreNameInput: (): string => inputValue,
		setScoreSaving: (): void => {
			calls.push('setScoreSaving');
		},
		setScoreSaved: (name: string, rank: number): void => {
			calls.push(`setScoreSaved:${name}:${rank}`);
		},
		setScoreError: (message: string): void => {
			calls.push(`setScoreError:${message}`);
		},
		showLeaderboard: (entries: {id: number}[], highlightId: number): void => {
			calls.push(`showLeaderboard:${entries.length}:${highlightId}`);
		}
	} as unknown as HUD;

	return {
		hud,
		calls,
		triggerSubmit: (name: string): void => {
			inputValue = name;
			onSubmit(name);
		}
	};
}

describe('ScoreSubmission', () => {
	beforeEach(() => {
		submitScoreMock.mockReset();
		fetchTopScoresMock.mockReset();
	});

	test('manual submit success saves the score and shows the leaderboard', async () => {
		const {hud, calls, triggerSubmit} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		submitScoreMock.mockResolvedValue({id: 7, name: 'Otter', timeMs: 1000, createdAt: '', rank: 3});
		fetchTopScoresMock.mockResolvedValue([{id: 7, name: 'Otter', timeMs: 1000, createdAt: ''}]);

		submission.present(1000);
		triggerSubmit('Otter');

		// Let the submit() promise chain (including the leaderboard fetch) settle.
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		expect(submitScoreMock).toHaveBeenCalledWith('Otter', 1000);
		expect(calls).toContain('setScoreSaving');
		expect(calls).toContain('setScoreSaved:Otter:3');
		expect(calls).toContain('showLeaderboard:1:7');
	});

	test('submit failure shows an error and allows retrying', async () => {
		const {hud, calls, triggerSubmit} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		submitScoreMock.mockRejectedValueOnce(new Error('nope'));
		submitScoreMock.mockResolvedValueOnce({id: 1, name: 'Otter', timeMs: 1000, createdAt: '', rank: 1});
		fetchTopScoresMock.mockResolvedValue([]);

		submission.present(1000);
		triggerSubmit('Otter');
		await flush();

		expect(calls).toContain("setScoreError:Couldn't save your time");
		expect(calls).not.toContain('setScoreSaved:Otter:1');

		// Retry after the failure.
		triggerSubmit('Otter');
		await flush();

		expect(submitScoreMock).toHaveBeenCalledTimes(2);
		expect(calls).toContain('setScoreSaved:Otter:1');
	});

	test('a stale auto-submitted request does not touch the next race', async () => {
		const {hud, calls, triggerSubmit} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		let resolveFirst: (value: {id: number; name: string; timeMs: number; createdAt: string; rank: number}) => void;
		const firstRequest = new Promise<{id: number; name: string; timeMs: number; createdAt: string; rank: number}>(
			(resolve) => {
				resolveFirst = resolve;
			}
		);
		submitScoreMock.mockReturnValueOnce(firstRequest);

		// Race 1 finishes, the player restarts before submitting - KartSystem calls
		// submitOnRestartIfNeeded() (fire-and-forget) then immediately reset().
		submission.present(1000);
		submission.submitOnRestartIfNeeded();
		submission.reset();

		// Race 2 starts and the player saves their time before race 1's request resolves.
		submitScoreMock.mockResolvedValueOnce({id: 2, name: 'Fox', timeMs: 500, createdAt: '', rank: 1});
		fetchTopScoresMock.mockResolvedValue([]);
		submission.present(500);
		triggerSubmit('Fox');
		await flush();

		expect(calls).toContain('setScoreSaved:Fox:1');

		// Now the stale race-1 request resolves.
		resolveFirst({id: 1, name: 'Anonymous Otter', timeMs: 1000, createdAt: '', rank: 5});
		await flush();

		// It must not have clobbered race 2's already-saved state.
		expect(calls.filter((c) => c.startsWith('setScoreSaved'))).toEqual(['setScoreSaved:Fox:1']);
	});

	test('a bodyless success (null result) still reports the save and shows the leaderboard', async () => {
		const {hud, calls, triggerSubmit} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		submitScoreMock.mockResolvedValue(null);
		fetchTopScoresMock.mockResolvedValue([{id: 7, name: 'Otter', timeMs: 1000, createdAt: ''}]);

		submission.present(1000);
		triggerSubmit('Otter');
		await flush();

		expect(calls).toContain('setScoreSaved:Otter:undefined');
		expect(calls).not.toContain("setScoreError:Couldn't save your time");
		expect(calls).toContain('showLeaderboard:1:-1');
	});

	test('a second submit while one is pending is ignored', async () => {
		const {hud, triggerSubmit} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		let resolveFirst: (value: {id: number; name: string; timeMs: number; createdAt: string; rank: number}) => void;
		submitScoreMock.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveFirst = resolve;
			})
		);
		fetchTopScoresMock.mockResolvedValue([]);

		submission.present(1000);
		triggerSubmit('Otter');
		triggerSubmit('Otter');

		expect(submitScoreMock).toHaveBeenCalledTimes(1);

		resolveFirst({id: 1, name: 'Otter', timeMs: 1000, createdAt: '', rank: 1});
		await flush();
	});
});

async function flush(): Promise<void> {
	for (let i = 0; i < 5; i++) {
		await Promise.resolve();
	}
}
