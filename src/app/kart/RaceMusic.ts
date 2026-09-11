import {
	ArpTrack,
	Bpm,
	DrumHit,
	getDrumHitsAtStep,
	getNoteStartingAtStep,
	MelodyTrack,
	BassTrack,
	secondsPerStep,
	semitoneToFrequency,
	TotalSteps
} from "~/app/kart/MusicScore";

// Procedurally generated, upbeat chiptune background loop for the kart mini-game, built
// entirely from Web Audio oscillators/noise (no audio files). Uses a classic lookahead
// scheduler: a fast timer periodically schedules any notes that fall within a short
// window ahead of the audio clock, so timing stays sample-accurate even though the
// timer itself is imprecise.
const SchedulerIntervalMs = 25;
const ScheduleAheadTime = 0.1; // seconds

export default class RaceMusic {
	private context: AudioContext = null;
	private masterGain: GainNode = null;
	private volume: number = 0.6;
	private enabled: boolean = true;
	private tempoMultiplier: number = 1;

	private timerId: ReturnType<typeof setInterval> = null;
	private nextStepTime: number = 0;
	private nextStepIndex: number = 0;
	private playing: boolean = false;

	// Reuses an existing AudioContext (e.g. RaceAudio's) when one is supplied, so the
	// game doesn't juggle multiple contexts / gesture-unlock states.
	public constructor(context?: AudioContext) {
		if (context) {
			this.context = context;
		}
	}

	private ensureContext(): boolean {
		try {
			if (!this.context) {
				const Ctx = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;

				if (!Ctx) {
					return false;
				}

				this.context = new Ctx();
			}

			if (this.context.state === 'suspended') {
				this.context.resume();
			}

			if (!this.masterGain) {
				this.masterGain = this.context.createGain();
				this.masterGain.gain.value = this.enabled ? this.volume : 0;
				this.masterGain.connect(this.context.destination);
			}

			return true;
		} catch (e) {
			return false;
		}
	}

	// Call from a user-gesture handler (same place RaceAudio.unlock() is called) so the
	// shared/underlying AudioContext resumes under browser autoplay policies.
	public unlock(): void {
		this.ensureContext();
	}

	public start(): void {
		if (this.playing || !this.enabled || !this.ensureContext()) {
			return;
		}

		this.playing = true;
		this.nextStepIndex = 0;
		this.nextStepTime = this.context.currentTime + 0.05;
		this.timerId = setInterval(() => this.scheduler(), SchedulerIntervalMs);
	}

	public stop(): void {
		if (!this.playing) {
			return;
		}

		this.playing = false;

		if (this.timerId !== null) {
			clearInterval(this.timerId);
			this.timerId = null;
		}
	}

	public get isPlaying(): boolean {
		return this.playing;
	}

	public setVolume(volume: number): void {
		this.volume = Math.min(1, Math.max(0, volume));

		if (this.masterGain) {
			this.masterGain.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.context.currentTime, 0.05);
		}
	}

	public setEnabled(enabled: boolean): void {
		this.enabled = enabled;

		if (this.masterGain) {
			this.masterGain.gain.setTargetAtTime(enabled ? this.volume : 0, this.context.currentTime, 0.05);
		}

		if (!enabled) {
			this.stop();
		}
	}

	// Speeds the loop up (e.g. >1 during the final stretch of a race) without breaking
	// the scheduler - only affects steps scheduled from this point forward.
	public setTempoMultiplier(multiplier: number): void {
		this.tempoMultiplier = Math.max(0.1, multiplier);
	}

	// Briefly ducks the music so the finish fanfare / sfx read clearly, then restores.
	public duck(durationSeconds: number = 1.2, duckedVolume: number = 0.12): void {
		if (!this.masterGain || !this.enabled) {
			return;
		}

		const now = this.context.currentTime;

		this.masterGain.gain.cancelScheduledValues(now);
		this.masterGain.gain.setTargetAtTime(this.volume * duckedVolume, now, 0.05);
		this.masterGain.gain.setTargetAtTime(this.volume, now + durationSeconds, 0.3);
	}

	public dispose(): void {
		this.stop();

		if (this.masterGain) {
			this.masterGain.disconnect();
			this.masterGain = null;
		}
	}

	private scheduler(): void {
		if (!this.context) {
			return;
		}

		while (this.nextStepTime < this.context.currentTime + ScheduleAheadTime) {
			this.scheduleStep(this.nextStepIndex, this.nextStepTime);

			this.nextStepTime += secondsPerStep(Bpm, this.tempoMultiplier);
			this.nextStepIndex = (this.nextStepIndex + 1) % TotalSteps;
		}
	}

	private scheduleStep(step: number, time: number): void {
		const stepDuration = secondsPerStep(Bpm, this.tempoMultiplier);

		const melodyNote = getNoteStartingAtStep(MelodyTrack, step);
		if (melodyNote && melodyNote.note !== null) {
			this.playTone(melodyNote.note, time, melodyNote.lengthSteps * stepDuration, 'square', 0.11 * melodyNote.velocity);
		}

		const bassNote = getNoteStartingAtStep(BassTrack, step);
		if (bassNote && bassNote.note !== null) {
			this.playTone(bassNote.note, time, bassNote.lengthSteps * stepDuration, 'triangle', 0.16 * bassNote.velocity);
		}

		const arpNote = getNoteStartingAtStep(ArpTrack, step);
		if (arpNote && arpNote.note !== null) {
			this.playTone(arpNote.note, time, arpNote.lengthSteps * stepDuration, 'square', 0.045 * arpNote.velocity, 0.02);
		}

		for (const hit of getDrumHitsAtStep(step)) {
			this.playDrum(hit, time);
		}
	}

	private playTone(
		semitoneFromC4: number,
		time: number,
		duration: number,
		type: OscillatorType,
		volume: number,
		pulseWidthDetune: number = 0
	): void {
		const frequency = semitoneToFrequency(semitoneFromC4);
		const oscillator = this.context.createOscillator();
		const gain = this.context.createGain();

		oscillator.type = type;
		oscillator.frequency.setValueAtTime(frequency, time);

		if (pulseWidthDetune) {
			oscillator.detune.setValueAtTime(pulseWidthDetune * 100, time);
		}

		// Short attack/release envelope so notes don't click, and a slight release tail
		// so back-to-back 16th notes still feel connected rather than staccato-clipped.
		const attack = 0.008;
		const release = Math.min(0.05, duration * 0.3);
		const sustainEnd = Math.max(time + attack, time + duration - release);

		gain.gain.setValueAtTime(0, time);
		gain.gain.linearRampToValueAtTime(volume, time + attack);
		gain.gain.setValueAtTime(volume, sustainEnd);
		gain.gain.linearRampToValueAtTime(0, time + duration);

		oscillator.connect(gain);
		gain.connect(this.masterGain);
		oscillator.start(time);
		oscillator.stop(time + duration + 0.02);
	}

	private playDrum(hit: DrumHit, time: number): void {
		switch (hit) {
			case DrumHit.Kick:
				this.playKick(time);
				break;
			case DrumHit.Snare:
				this.playSnare(time);
				break;
			case DrumHit.HiHat:
				this.playHiHat(time);
				break;
		}
	}

	private playKick(time: number): void {
		const oscillator = this.context.createOscillator();
		const gain = this.context.createGain();

		oscillator.type = 'sine';
		oscillator.frequency.setValueAtTime(150, time);
		oscillator.frequency.exponentialRampToValueAtTime(45, time + 0.12);

		gain.gain.setValueAtTime(0.28, time);
		gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

		oscillator.connect(gain);
		gain.connect(this.masterGain);
		oscillator.start(time);
		oscillator.stop(time + 0.18);
	}

	private createNoiseBuffer(duration: number): AudioBuffer {
		const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
		const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
		const data = buffer.getChannelData(0);

		for (let i = 0; i < length; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		return buffer;
	}

	private playSnare(time: number): void {
		const noise = this.context.createBufferSource();
		noise.buffer = this.createNoiseBuffer(0.15);

		const filter = this.context.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.value = 1800;
		filter.Q.value = 0.8;

		const gain = this.context.createGain();
		gain.gain.setValueAtTime(0.18, time);
		gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

		noise.connect(filter);
		filter.connect(gain);
		gain.connect(this.masterGain);
		noise.start(time);
		noise.stop(time + 0.15);
	}

	private playHiHat(time: number): void {
		const noise = this.context.createBufferSource();
		noise.buffer = this.createNoiseBuffer(0.05);

		const filter = this.context.createBiquadFilter();
		filter.type = 'highpass';
		filter.frequency.value = 7000;

		const gain = this.context.createGain();
		gain.gain.setValueAtTime(0.07, time);
		gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

		noise.connect(filter);
		filter.connect(gain);
		gain.connect(this.masterGain);
		noise.start(time);
		noise.stop(time + 0.05);
	}
}
