// Pure, AudioContext-free music data and helpers for the kart race BGM.
// Everything here is plain data/math so it can be unit tested without Web Audio.

export const enum InstrumentTrack {
	Melody = 'melody',
	Bass = 'bass',
	Arp = 'arp',
	Drums = 'drums'
}

export const enum DrumHit {
	Kick = 'kick',
	Snare = 'snare',
	HiHat = 'hihat'
}

export interface ScoreNote {
	// Semitone offset from C4 (MIDI 60), null = rest.
	note: number | null;
	// Length in steps (a step is a 16th note).
	length: number;
	// 0..1, relative loudness within the track.
	velocity?: number;
}

export const StepsPerBeat = 4; // 16th notes
export const BeatsPerBar = 4;
export const StepsPerBar = StepsPerBeat * BeatsPerBar; // 16
export const Bpm = 150;

// Note-name helper: converts a semitone offset from C4 (MIDI 60) to a frequency in Hz.
export function semitoneToFrequency(semitoneFromC4: number): number {
	const A4 = 440;
	// C4 is 9 semitones below A4.
	return A4 * Math.pow(2, (semitoneFromC4 - 9) / 12);
}

// C major scale degrees relative to C4, spanning two octaves down/up as needed.
const C = 0, D = 2, E = 4, F = 5, G = 7, A = 9, B = 11;
const REST: number | null = null;

function bar(...notes: ScoreNote[]): ScoreNote[] {
	const total = notes.reduce((sum, n) => sum + n.length, 0);

	if (total !== StepsPerBar) {
		throw new Error(`Bar does not sum to ${StepsPerBar} steps (got ${total})`);
	}

	return notes;
}

function n(note: number | null, length: number, velocity: number = 1): ScoreNote {
	return {note, length, velocity};
}

// An upbeat, bouncy 8-bar hook in C major (~150 BPM). The lead alternates a
// call-and-response phrase; bars 5-8 answer bars 1-4 an octave/scale-step apart
// before looping back to the top.
const MelodyBars: ScoreNote[][] = [
	// Bar 1: the hook - a dotted-eighth anticipation into a bright leap, syncopated and bouncy.
	bar(n(C + 12, 3), n(E + 12, 1), n(G + 12, 2), n(C + 24, 2), n(G + 12, 2), n(E + 12, 2), n(D + 12, 2), n(REST, 2)),
	// Bar 2: answer, stepping down a degree.
	bar(n(D + 12, 3), n(F + 12, 1), n(A + 12, 2), n(D + 24, 2), n(A + 12, 2), n(F + 12, 2), n(E + 12, 2), n(REST, 2)),
	// Bar 3: repeat the hook a third up for lift.
	bar(n(E + 12, 3), n(G + 12, 1), n(B + 12, 2), n(E + 24, 2), n(B + 12, 2), n(G + 12, 2), n(F + 12, 2), n(REST, 2)),
	// Bar 4: turnaround back to C, resolving with a held leading tone.
	bar(n(D + 12, 2), n(C + 12, 1), n(D + 12, 1), n(E + 12, 2), n(D + 12, 1), n(C + 12, 1), n(REST, 4), n(G + 11, 4)),
	// Bar 5: the hook again, bright and confident.
	bar(n(C + 12, 3), n(E + 12, 1), n(G + 12, 2), n(C + 24, 2), n(G + 12, 2), n(E + 12, 2), n(D + 12, 2), n(REST, 2)),
	// Bar 6: same shape, higher answer.
	bar(n(E + 12, 3), n(G + 12, 1), n(B + 12, 2), n(E + 24, 2), n(B + 12, 2), n(G + 12, 2), n(F + 12, 2), n(REST, 2)),
	// Bar 7: quick descending run, building energy for the loop point.
	bar(n(G + 12, 1), n(F + 12, 1), n(E + 12, 1), n(D + 12, 1), n(C + 12, 1), n(D + 12, 1), n(E + 12, 1), n(F + 12, 1),
		n(G + 12, 2), n(E + 12, 2), n(C + 12, 4)),
	// Bar 8: final flourish resolving on the tonic, held to loop seamlessly back into bar 1.
	bar(n(D + 12, 1), n(E + 12, 1), n(F + 12, 1), n(G + 12, 1), n(A + 12, 2), n(G + 12, 2), n(E + 12, 2), n(C + 12, 6))
];

// Walking bass on roots and fifths under each chord, quarter-note driven with the
// odd syncopated 8th for bounce.
const BassBars: ScoreNote[][] = [
	bar(n(C - 12, 4), n(G - 12, 4), n(C - 12, 4), n(G - 12, 3), n(C - 12, 1)),
	bar(n(D - 12, 4), n(A - 12, 4), n(D - 12, 4), n(A - 12, 3), n(D - 12, 1)),
	bar(n(E - 12, 4), n(B - 12, 4), n(E - 12, 4), n(B - 12, 3), n(E - 12, 1)),
	bar(n(F - 12, 4), n(C - 12, 4), n(G - 12, 4), n(G - 12, 3), n(G - 12, 1)),
	bar(n(C - 12, 4), n(G - 12, 4), n(C - 12, 4), n(G - 12, 3), n(C - 12, 1)),
	bar(n(E - 12, 4), n(B - 12, 4), n(E - 12, 4), n(B - 12, 3), n(E - 12, 1)),
	bar(n(F - 12, 4), n(G - 12, 4), n(A - 12, 4), n(G - 12, 4)),
	bar(n(F - 12, 4), n(G - 12, 4), n(C - 12, 8))
];

// Sparse pulse-wave arpeggio filling in the harmony (root-third-fifth), mostly
// resting so it doesn't clutter the mix.
const ArpBars: ScoreNote[][] = [
	bar(n(REST, 4), n(C + 12, 1), n(E + 12, 1), n(G + 12, 1), n(E + 12, 1), n(REST, 8)),
	bar(n(REST, 4), n(D + 12, 1), n(F + 12, 1), n(A + 12, 1), n(F + 12, 1), n(REST, 8)),
	bar(n(REST, 4), n(E + 12, 1), n(G + 12, 1), n(B + 12, 1), n(G + 12, 1), n(REST, 8)),
	bar(n(REST, 16)),
	bar(n(REST, 4), n(C + 12, 1), n(E + 12, 1), n(G + 12, 1), n(E + 12, 1), n(REST, 8)),
	bar(n(REST, 4), n(E + 12, 1), n(G + 12, 1), n(B + 12, 1), n(G + 12, 1), n(REST, 8)),
	bar(n(REST, 16)),
	bar(n(REST, 16))
];

// Drum pattern per bar: which of the 16 steps trigger which hit(s). Four-on-the-floor
// kick with off-beat snare and steady 8th-note hi-hats, standard kart-racer bounce.
// The last bar (8) adds a 16th-note hi-hat fill on its final beat to lead back into the loop.
const DrumStepPattern: DrumHit[][][] = buildDrumPattern();

function buildDrumPattern(): DrumHit[][][] {
	const bars: DrumHit[][][] = [];

	const totalBars = MelodyBars.length;

	for (let b = 0; b < totalBars; b++) {
		const steps: DrumHit[][] = [];
		const isFillBar = b === totalBars - 1;

		for (let s = 0; s < StepsPerBar; s++) {
			const hits: DrumHit[] = [];

			// Kick on 1 and the "and" of 2 (steps 0, 6, 8, 14) - bouncy four-on-the-floor variant.
			if (s === 0 || s === 6 || s === 8 || s === 14) {
				hits.push(DrumHit.Kick);
			}

			// Snare on beats 2 and 4 (steps 4 and 12).
			if (s === 4 || s === 12) {
				hits.push(DrumHit.Snare);
			}

			// Hi-hat on every 8th note; the fill bar's last beat goes to steady 16ths.
			if (s % 2 === 0 || (isFillBar && s >= 12)) {
				hits.push(DrumHit.HiHat);
			}

			steps.push(hits);
		}

		bars.push(steps);
	}

	return bars;
}

export const TotalBars = MelodyBars.length;
export const TotalSteps = TotalBars * StepsPerBar;

export interface ScheduledNote {
	track: InstrumentTrack.Melody | InstrumentTrack.Bass | InstrumentTrack.Arp;
	note: number | null;
	stepIndex: number;
	lengthSteps: number;
	velocity: number;
}

// Flatten a bars-of-variable-length-notes track into one note per absolute step,
// so lookups by step index are O(1) and every step falls inside exactly one note.
function flattenTrack(track: InstrumentTrack.Melody | InstrumentTrack.Bass | InstrumentTrack.Arp, bars: ScoreNote[][]): ScheduledNote[] {
	const flat: ScheduledNote[] = [];
	let step = 0;

	for (const barNotes of bars) {
		for (const note of barNotes) {
			flat.push({
				track,
				note: note.note,
				stepIndex: step,
				lengthSteps: note.length,
				velocity: note.velocity ?? 1
			});
			step += note.length;
		}
	}

	return flat;
}

export const MelodyTrack = flattenTrack(InstrumentTrack.Melody, MelodyBars);
export const BassTrack = flattenTrack(InstrumentTrack.Bass, BassBars);
export const ArpTrack = flattenTrack(InstrumentTrack.Arp, ArpBars);

// Which drum hits (if any) trigger at a given absolute step, 0-based, wrapping at TotalSteps.
export function getDrumHitsAtStep(step: number): DrumHit[] {
	const wrapped = ((step % TotalSteps) + TotalSteps) % TotalSteps;
	const barIndex = Math.floor(wrapped / StepsPerBar);
	const stepInBar = wrapped % StepsPerBar;

	return DrumStepPattern[barIndex][stepInBar] ?? [];
}

// Given a flattened track and an absolute step, find the note that is *starting*
// at that step (if any) - used by the scheduler to know when to trigger a new
// oscillator. Returns null if no note starts exactly at this step.
export function getNoteStartingAtStep(track: ScheduledNote[], step: number): ScheduledNote | null {
	const wrapped = ((step % TotalSteps) + TotalSteps) % TotalSteps;

	for (const note of track) {
		if (note.stepIndex === wrapped) {
			return note;
		}
	}

	return null;
}

// Seconds per step at the given BPM and tempo multiplier (1 = normal speed).
export function secondsPerStep(bpm: number = Bpm, tempoMultiplier: number = 1): number {
	const secondsPerBeat = 60 / (bpm * tempoMultiplier);

	return secondsPerBeat / StepsPerBeat;
}
