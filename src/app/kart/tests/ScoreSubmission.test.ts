import ScoreSubmission from "~/app/kart/ScoreSubmission";
import HUD from "~/app/kart/HUD";
import {fetchTopScores, submitScore, updateScoreName} from "~/app/kart/ScoreApi";

jest.mock('~/app/kart/ScoreApi');

// The test environment (jest's default "node" env) has no localStorage global; give
// ScoreSubmission's loadPlayerName/savePlayerName something real to read and write so
// persistence behaviour can be tested.
class MemoryStorage {
	private store = new Map<string, string>();

	public getItem(key: string): string | null {
		return this.store.has(key) ? this.store.get(key) : null;
	}

	public setItem(key: string, value: string): void {
		this.store.set(key, value);
	}

	public removeItem(key: string): void {
		this.store.delete(key);
	}
}

(globalThis as unknown as {localStorage: MemoryStorage}).localStorage = new MemoryStorage();

const submitScoreMock = submitScore as jest.MockedFunction<typeof submitScore>;
const fetchTopScoresMock = fetchTopScores as jest.MockedFunction<typeof fetchTopScores>;
const updateScoreNameMock = updateScoreName as jest.MockedFunction<typeof updateScoreName>;

interface Entry {
	id: number;
	name: string;
	timeMs: number;
}

interface OwnOutside {
	rank: number;
	name: string;
	timeMs: number;
}

// A stub good enough to stand in for HUD from ScoreSubmission's point of view: it just
// records what was called, and lets present() wire up the submit callback.
function makeFakeHud(): {hud: HUD; calls: string[]; triggerSubmit: (name: string) => void} {
	const calls: string[] = [];
	let onSubmit: (name: string) => void = (): void => {};
	let inputValue = '';

	const hud = {
		showScoreForm: (defaultName: string, buttonLabel: string, submit: (name: string) => void): void => {
			calls.push(`showScoreForm:${defaultName}:${buttonLabel}`);
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
		setScoreBusy: (label: string): void => {
			calls.push(`setScoreBusy:${label}`);
		},
		setScoreSaved: (name: string, rank: number): void => {
			calls.push(`setScoreSaved:${name}:${rank}`);
		},
		setScoreError: (message: string): void => {
			calls.push(`setScoreError:${message}`);
		},
		setScoreEditError: (message: string): void => {
			calls.push(`setScoreEditError:${message}`);
		},
		setScoreStatus: (text: string): void => {
			calls.push(`setScoreStatus:${text}`);
		},
		setScoreButtonLabel: (label: string): void => {
			calls.push(`setScoreButtonLabel:${label}`);
		},
		updateOwnName: (name: string): void => {
			calls.push(`updateOwnName:${name}`);
		},
		showLeaderboard: (entries: Entry[], highlightId: number | null, ownOutside: OwnOutside | null = null): void => {
			const ids = entries.map((e) => e.id).join(',');
			const own = ownOutside ? `${ownOutside.rank}:${ownOutside.name}` : 'none';
			calls.push(`showLeaderboard:[${ids}]:${highlightId}:${own}`);
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

function deferred<T>(): {promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void} {
	const box: {resolve: (v: T) => void; reject: (e: unknown) => void} = {
		resolve: () => {},
		reject: () => {}
	};
	const promise = new Promise<T>((res, rej) => {
		box.resolve = res;
		box.reject = rej;
	});

	return {promise, resolve: box.resolve, reject: box.reject};
}

async function flush(): Promise<void> {
	for (let i = 0; i < 6; i++) {
		await Promise.resolve();
	}
}

describe('ScoreSubmission', () => {
	beforeEach(() => {
		submitScoreMock.mockReset();
		fetchTopScoresMock.mockReset();
		updateScoreNameMock.mockReset();

		try {
			localStorage.removeItem('shibuyaKart.playerName');
		} catch (e) {
			// ignore - private mode etc.
		}
	});

	test('present() submits the default name automatically without waiting for a click', async () => {
		const {hud, calls} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		const submit = deferred<Awaited<ReturnType<typeof submitScore>>>();
		submitScoreMock.mockReturnValue(submit.promise);
		fetchTopScoresMock.mockResolvedValue([]);

		submission.present(1000);
		await flush();

		expect(submitScoreMock).toHaveBeenCalledTimes(1);
		expect(submitScoreMock.mock.calls[0][1]).toBe(1000);
		expect(calls).toContain('focusScoreInput');
		expect(calls).toContain('setScoreSaving');
	});

	test('renders a provisional board (own row inside the top list) before the submit resolves', async () => {
		const {hud, calls} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		const submit = deferred<Awaited<ReturnType<typeof submitScore>>>();
		submitScoreMock.mockReturnValue(submit.promise);
		fetchTopScoresMock.mockResolvedValueOnce([
			{id: 1, name: 'Fox', timeMs: 800, createdAt: ''},
			{id: 2, name: 'Hawk', timeMs: 1200, createdAt: ''}
		]);

		submission.present(1000);
		await flush();

		// Own time (1000) beats Hawk (1200) but not Fox (800) -> provisional rank 2,
		// so it's spliced in between them, own row keyed with the -1 sentinel id.
		expect(calls).toContain('showLeaderboard:[1,-1,2]:-1:none');
	});

	test('renders the own row outside the top list when it would not make the cut', async () => {
		try {
			localStorage.setItem('shibuyaKart.playerName', 'Player1');
		} catch (e) {
			// ignore
		}

		const {hud, calls} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		const submit = deferred<Awaited<ReturnType<typeof submitScore>>>();
		submitScoreMock.mockReturnValue(submit.promise);

		const top = Array.from({length: 10}, (_, i) => ({id: i + 1, name: `P${i}`, timeMs: (i + 1) * 100, createdAt: ''}));
		fetchTopScoresMock.mockResolvedValueOnce(top);

		// All 10 top entries (up to 1000ms) beat this 5000ms time -> provisional rank 11,
		// past LeaderboardSize (10), so it's shown as an own-outside row instead.
		submission.present(5000);
		await flush();

		const ids = top.map((e) => e.id).join(',');
		expect(calls).toContain(`showLeaderboard:[${ids}]:-1:11:Player1`);
	});

	test('renders the final board with the real id once submit resolves', async () => {
		const {hud, calls} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		submitScoreMock.mockResolvedValue({id: 7, name: 'Otter', timeMs: 1000, createdAt: '', rank: 3, editToken: 'tok'});
		fetchTopScoresMock.mockResolvedValueOnce([]);
		fetchTopScoresMock.mockResolvedValueOnce([{id: 7, name: 'Otter', timeMs: 1000, createdAt: ''}]);

		submission.present(1000);
		await flush();

		expect(calls).toContain('setScoreSaved:Otter:3');
		expect(calls).toContain('showLeaderboard:[7]:7:none');
	});

	test('final board shows an own-outside row when the saved score misses the top list', async () => {
		const {hud, calls} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		submitScoreMock.mockResolvedValue({id: 7, name: 'Otter', timeMs: 9000, createdAt: '', rank: 15, editToken: 'tok'});
		fetchTopScoresMock.mockResolvedValueOnce([]);
		fetchTopScoresMock.mockResolvedValueOnce([{id: 1, name: 'Fast', timeMs: 100, createdAt: ''}]);

		submission.present(9000);
		await flush();

		expect(calls).toContain('showLeaderboard:[1]:7:15:Otter');
	});

	test('rename after a successful submit persists the name and updates the board in place', async () => {
		const {hud, calls, triggerSubmit} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		submitScoreMock.mockResolvedValue({id: 7, name: 'Otter', timeMs: 1000, createdAt: '', rank: 3, editToken: 'tok'});
		fetchTopScoresMock.mockResolvedValue([{id: 7, name: 'Otter', timeMs: 1000, createdAt: ''}]);

		submission.present(1000);
		await flush();

		expect(calls).toContain('setScoreSaved:Otter:3');

		updateScoreNameMock.mockResolvedValue({id: 7, name: 'Otter2', timeMs: 1000, createdAt: '', rank: 2});
		triggerSubmit('Otter2');
		await flush();

		expect(updateScoreNameMock).toHaveBeenCalledWith(7, 'tok', 'Otter2');
		expect(calls).toContain('setScoreSaved:Otter2:2');
		expect(calls).toContain('updateOwnName:Otter2');

		let saved: string | null = null;
		try {
			saved = localStorage.getItem('shibuyaKart.playerName');
		} catch (e) {
			// jsdom always provides localStorage - ignore if not.
		}
		expect(saved).toBe('Otter2');
	});

	test('a bodyless rename response still reports the save, keeping the last known rank', async () => {
		const {hud, calls, triggerSubmit} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		submitScoreMock.mockResolvedValue({id: 7, name: 'Otter', timeMs: 1000, createdAt: '', rank: 3, editToken: 'tok'});
		fetchTopScoresMock.mockResolvedValue([{id: 7, name: 'Otter', timeMs: 1000, createdAt: ''}]);

		submission.present(1000);
		await flush();

		expect(calls).toContain('setScoreSaved:Otter:3');

		updateScoreNameMock.mockResolvedValue(null);
		triggerSubmit('Otter2');
		await flush();

		expect(updateScoreNameMock).toHaveBeenCalledWith(7, 'tok', 'Otter2');
		expect(calls).toContain('setScoreSaved:Otter2:3');
		expect(calls).toContain('updateOwnName:Otter2');
	});

	test('a rename requested while the submit is still pending is applied once it resolves', async () => {
		const {hud, calls, triggerSubmit} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		const submit = deferred<Awaited<ReturnType<typeof submitScore>>>();
		submitScoreMock.mockReturnValue(submit.promise);
		fetchTopScoresMock.mockResolvedValue([]);

		submission.present(1000);
		await flush();

		// The submit for the default name is still pending - this "Update name" click
		// should be queued, not fired as a rename yet (there's no saved id to rename).
		triggerSubmit('Otter2');
		await flush();
		expect(updateScoreNameMock).not.toHaveBeenCalled();

		submit.resolve({id: 7, name: 'Anonymous Otter', timeMs: 1000, createdAt: '', rank: 3, editToken: 'tok'});
		updateScoreNameMock.mockResolvedValue({id: 7, name: 'Otter2', timeMs: 1000, createdAt: '', rank: 2});
		await flush();

		expect(updateScoreNameMock).toHaveBeenCalledWith(7, 'tok', 'Otter2');
		expect(calls).toContain('setScoreSaved:Otter2:2');
	});

	test('submit failure shows an error with a Retry label and resubmits the typed name', async () => {
		const {hud, calls, triggerSubmit} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		submitScoreMock.mockRejectedValueOnce(new Error('nope'));
		submitScoreMock.mockResolvedValueOnce({id: 1, name: 'Otter2', timeMs: 1000, createdAt: '', rank: 1, editToken: 'tok'});
		fetchTopScoresMock.mockResolvedValue([]);

		submission.present(1000);
		await flush();

		expect(calls).toContain("setScoreError:Couldn't save your time");
		expect(calls).not.toContain('setScoreSaved:Otter2:1');

		triggerSubmit('Otter2');
		await flush();

		expect(submitScoreMock).toHaveBeenCalledTimes(2);
		expect(submitScoreMock).toHaveBeenNthCalledWith(2, 'Otter2', 1000);
		expect(calls).toContain('setScoreSaved:Otter2:1');
	});

	test('a stale request from a race that was reset does not touch the next race', async () => {
		const {hud, calls} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		const first = deferred<Awaited<ReturnType<typeof submitScore>>>();
		submitScoreMock.mockReturnValueOnce(first.promise);
		fetchTopScoresMock.mockResolvedValue([]);

		// Race 1 finishes and starts submitting, but the player restarts (resets) before
		// it resolves.
		submission.present(1000);
		await flush();
		submission.reset();

		// Race 2 starts and finishes submitting before race 1's request resolves.
		submitScoreMock.mockResolvedValueOnce({id: 2, name: 'Fox', timeMs: 500, createdAt: '', rank: 1, editToken: 'tok2'});
		submission.present(500);
		await flush();

		expect(calls).toContain('setScoreSaved:Fox:1');

		// Now the stale race-1 request resolves.
		first.resolve({id: 1, name: 'Anonymous Otter', timeMs: 1000, createdAt: '', rank: 5, editToken: 'tok1'});
		await flush();

		// It must not have clobbered race 2's already-saved state.
		expect(calls.filter((c) => c.startsWith('setScoreSaved'))).toEqual(['setScoreSaved:Fox:1']);
	});

	test('a bodyless success (null result) still reports the save and shows the leaderboard', async () => {
		try {
			localStorage.setItem('shibuyaKart.playerName', 'Otter');
		} catch (e) {
			// ignore - private mode etc.
		}

		const {hud, calls} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		submitScoreMock.mockResolvedValue(null);
		fetchTopScoresMock.mockResolvedValueOnce([]);
		fetchTopScoresMock.mockResolvedValueOnce([{id: 7, name: 'Otter', timeMs: 1000, createdAt: ''}]);

		submission.present(1000);
		await flush();

		expect(calls).toContain('setScoreSaved:Otter:undefined');
		expect(calls).not.toContain("setScoreError:Couldn't save your time");
		expect(calls).toContain('showLeaderboard:[7]:-1:none');
	});

	test('a provisional-board fetch that resolves after the final board was shown does not overwrite it', async () => {
		const {hud, calls} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		const provisionalFetch = deferred<Awaited<ReturnType<typeof fetchTopScores>>>();
		submitScoreMock.mockResolvedValue({id: 7, name: 'Otter', timeMs: 1000, createdAt: '', rank: 3, editToken: 'tok'});
		fetchTopScoresMock.mockReturnValueOnce(provisionalFetch.promise);
		fetchTopScoresMock.mockResolvedValueOnce([{id: 7, name: 'Otter', timeMs: 1000, createdAt: ''}]);

		submission.present(1000);
		await flush();

		// The submit (and its own refetch) already resolved and rendered the final
		// board before the original provisional fetch below resolves.
		expect(calls).toContain('showLeaderboard:[7]:7:none');
		const boardCallsBefore = calls.filter((c) => c.startsWith('showLeaderboard')).length;

		provisionalFetch.resolve([{id: 1, name: 'Someone', timeMs: 1200, createdAt: ''}]);
		await flush();

		// No further board render should have happened - the stale provisional
		// result must not clobber the already-final board.
		expect(calls.filter((c) => c.startsWith('showLeaderboard')).length).toBe(boardCallsBefore);
	});

	test('a stale race-1 continuation resuming after reset does not steal or drop race 2\'s queued rename', async () => {
		const {hud, calls, triggerSubmit} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		const submit1 = deferred<Awaited<ReturnType<typeof submitScore>>>();
		const refetch1 = deferred<Awaited<ReturnType<typeof fetchTopScores>>>();
		const submit2 = deferred<Awaited<ReturnType<typeof submitScore>>>();

		submitScoreMock.mockReturnValueOnce(submit1.promise);
		fetchTopScoresMock
			.mockResolvedValueOnce([]) // race 1 provisional
			.mockReturnValueOnce(refetch1.promise); // race 1's post-submit refetch

		// Race 1: submit starts, and a rename is queued while it's still pending.
		submission.present(1000);
		await flush();
		triggerSubmit('Otter2');
		await flush();

		// Race 1's submit resolves; its post-submit refetch (refetch1) is left hanging,
		// so its continuation is suspended right before it would act on pendingName.
		submit1.resolve({id: 1, name: 'Anonymous Otter', timeMs: 1000, createdAt: '', rank: 5, editToken: 'tok1'});
		await flush();
		expect(calls).toContain('setScoreSaved:Anonymous Otter:5');

		// Player restarts: race 1 is reset (bumping the generation) before its refetch
		// settles.
		submission.reset();

		// Race 2 starts, and a rename is queued while its submit is still pending too.
		submitScoreMock.mockReturnValueOnce(submit2.promise);
		fetchTopScoresMock.mockResolvedValueOnce([]); // race 2 provisional
		submission.present(500);
		triggerSubmit('Fox2');
		await flush();

		// Now race 1's stale refetch finally resolves. Its continuation must notice the
		// generation has moved on and stop - not consume/clear race 2's pending rename.
		refetch1.resolve([{id: 1, name: 'Anonymous Otter', timeMs: 1000, createdAt: ''}]);
		await flush();
		expect(updateScoreNameMock).not.toHaveBeenCalled();

		// Race 2's own submit resolves; it must still see (and apply) its own queued rename.
		fetchTopScoresMock.mockResolvedValueOnce([{id: 2, name: 'Fox', timeMs: 500, createdAt: ''}]); // race 2 refetch
		updateScoreNameMock.mockResolvedValue({id: 2, name: 'Fox2', timeMs: 500, createdAt: '', rank: 1});
		submit2.resolve({id: 2, name: 'Fox', timeMs: 500, createdAt: '', rank: 1, editToken: 'tok2'});
		await flush();

		expect(updateScoreNameMock).toHaveBeenCalledTimes(1);
		expect(updateScoreNameMock).toHaveBeenCalledWith(2, 'tok2', 'Fox2');
		expect(calls).toContain('setScoreSaved:Fox2:1');
	});

	test('the anonymous default name is not persisted, but a typed name is', async () => {
		const {hud, calls, triggerSubmit} = makeFakeHud();
		const submission = new ScoreSubmission(hud);

		try {
			localStorage.removeItem('shibuyaKart.playerName');
		} catch (e) {
			// ignore
		}

		submitScoreMock.mockResolvedValue({id: 1, name: 'Anonymous Otter', timeMs: 1000, createdAt: '', rank: 1, editToken: 'tok'});
		fetchTopScoresMock.mockResolvedValue([]);

		submission.present(1000);
		await flush();

		const defaultNameCall = calls.find((c) => c.startsWith('showScoreForm:'));
		expect(defaultNameCall).toBeDefined();

		let saved: string | null = null;
		try {
			saved = localStorage.getItem('shibuyaKart.playerName');
		} catch (e) {
			// ignore
		}
		expect(saved).toBeNull();

		// Failure + retry with a typed name should persist it.
		submitScoreMock.mockReset();
		submitScoreMock.mockRejectedValueOnce(new Error('nope'));
		submitScoreMock.mockResolvedValueOnce({id: 2, name: 'Zed', timeMs: 1000, createdAt: '', rank: 1, editToken: 'tok2'});

		submission.reset();
		submission.present(1000);
		await flush();
		triggerSubmit('Zed');
		await flush();

		try {
			saved = localStorage.getItem('shibuyaKart.playerName');
		} catch (e) {
			// ignore
		}
		expect(saved).toBe('Zed');
	});
});
