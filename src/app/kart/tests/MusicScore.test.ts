import {
	ArpTrack,
	BassTrack,
	Bpm,
	getDrumHitsAtStep,
	getNoteStartingAtStep,
	MelodyTrack,
	secondsPerStep,
	semitoneToFrequency,
	StepsPerBar,
	TotalBars,
	TotalSteps
} from "~/app/kart/MusicScore";

describe('semitoneToFrequency', () => {
	test('converts C4 (0 semitones from C4) to ~261.63 Hz', () => {
		expect(semitoneToFrequency(0)).toBeCloseTo(261.63, 1);
	});

	test('A4 (9 semitones from C4) is exactly 440 Hz (concert pitch)', () => {
		expect(semitoneToFrequency(9)).toBeCloseTo(440, 5);
	});

	test('one octave up doubles the frequency', () => {
		const base = semitoneToFrequency(3);
		const octaveUp = semitoneToFrequency(3 + 12);

		expect(octaveUp).toBeCloseTo(base * 2, 5);
	});

	test('one octave down halves the frequency', () => {
		const base = semitoneToFrequency(5);
		const octaveDown = semitoneToFrequency(5 - 12);

		expect(octaveDown).toBeCloseTo(base / 2, 5);
	});
});

describe('secondsPerStep', () => {
	test('at 150 BPM a 16th note is 0.1s', () => {
		expect(secondsPerStep(150, 1)).toBeCloseTo(0.1, 6);
	});

	test('a tempo multiplier > 1 shortens the step', () => {
		const normal = secondsPerStep(Bpm, 1);
		const fast = secondsPerStep(Bpm, 1.12);

		expect(fast).toBeLessThan(normal);
		expect(fast).toBeCloseTo(normal / 1.12, 6);
	});

	test('defaults to the song tempo when called with no arguments', () => {
		expect(secondsPerStep()).toBeCloseTo(secondsPerStep(Bpm, 1), 6);
	});
});

describe('score integrity', () => {
	test('the song is a whole number of bars, each StepsPerBar long', () => {
		expect(TotalBars).toBeGreaterThanOrEqual(8);
		expect(TotalBars).toBeLessThanOrEqual(16);
		expect(TotalSteps).toBe(TotalBars * StepsPerBar);
	});

	test.each([
		['melody', MelodyTrack],
		['bass', BassTrack],
		['arp', ArpTrack]
	])('%s track notes exactly tile every step with no gaps or overlaps', (_name, track) => {
		let expectedNextStep = 0;

		for (const note of track) {
			expect(note.stepIndex).toBe(expectedNextStep);
			expect(note.lengthSteps).toBeGreaterThan(0);
			expectedNextStep += note.lengthSteps;
		}

		expect(expectedNextStep).toBe(TotalSteps);
	});

	test.each([
		['melody', MelodyTrack],
		['bass', BassTrack],
		['arp', ArpTrack]
	])('%s track notes (when not rests) are valid finite semitone values', (_name, track) => {
		for (const note of track) {
			if (note.note !== null) {
				expect(Number.isFinite(note.note)).toBe(true);
				// Sanity range: within four octaves of C4 in either direction.
				expect(note.note).toBeGreaterThan(-48);
				expect(note.note).toBeLessThan(48);
			}
		}
	});

	test('the melody track contains at least one audible note (it is not silent)', () => {
		expect(MelodyTrack.some(note => note.note !== null)).toBe(true);
	});

	test('drum hits are defined for every step of every bar', () => {
		for (let step = 0; step < TotalSteps; step++) {
			const hits = getDrumHitsAtStep(step);

			expect(Array.isArray(hits)).toBe(true);
		}
	});

	test('the kick lands on the downbeat of every bar (four-on-the-floor feel)', () => {
		for (let bar = 0; bar < TotalBars; bar++) {
			const hits = getDrumHitsAtStep(bar * StepsPerBar);

			expect(hits).toContain('kick');
		}
	});

	test('drum pattern lookups wrap around past the end of the loop', () => {
		const first = getDrumHitsAtStep(0);
		const wrapped = getDrumHitsAtStep(TotalSteps);
		const wrappedFar = getDrumHitsAtStep(TotalSteps * 3 + 5);
		const direct = getDrumHitsAtStep(5);

		expect(wrapped).toEqual(first);
		expect(wrappedFar).toEqual(direct);
	});

	test('drum pattern lookups handle negative steps by wrapping', () => {
		const last = getDrumHitsAtStep(TotalSteps - 1);
		const negative = getDrumHitsAtStep(-1);

		expect(negative).toEqual(last);
	});

	test('getNoteStartingAtStep finds the note beginning exactly at a step', () => {
		const firstMelodyNote = MelodyTrack[0];

		expect(getNoteStartingAtStep(MelodyTrack, 0)).toEqual(firstMelodyNote);
	});

	test('getNoteStartingAtStep returns null mid-note (no note starts there)', () => {
		// The first melody note is longer than 1 step, so step 1 is mid-note.
		expect(MelodyTrack[0].lengthSteps).toBeGreaterThan(1);
		expect(getNoteStartingAtStep(MelodyTrack, 1)).toBeNull();
	});

	test('getNoteStartingAtStep wraps step indices past the loop length', () => {
		const atStart = getNoteStartingAtStep(MelodyTrack, 0);
		const wrapped = getNoteStartingAtStep(MelodyTrack, TotalSteps);

		expect(wrapped).toEqual(atStart);
	});
});
