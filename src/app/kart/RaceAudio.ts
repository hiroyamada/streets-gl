// Small synthesized sound set (no audio files): countdown beeps, pickup chime, boost,
// finish fanfare and an optional engine hum pitched by speed.
export default class RaceAudio {
	private context: AudioContext = null;
	private engineOscillator: OscillatorNode = null;
	private engineGain: GainNode = null;
	public engineEnabled: boolean = false;

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

			return true;
		} catch (e) {
			return false;
		}
	}

	// Browsers only allow audio after a user gesture; call this from a key handler.
	public unlock(): void {
		this.ensureContext();
	}

	// Exposes the (lazily created) shared AudioContext so other synthesized audio, such
	// as RaceMusic, can reuse it instead of juggling separate contexts / gesture-unlocks.
	public getContext(): AudioContext {
		this.ensureContext();

		return this.context;
	}

	private tone(
		frequency: number,
		duration: number,
		type: OscillatorType = 'square',
		volume: number = 0.12,
		delay: number = 0,
		endFrequency: number = frequency
	): void {
		if (!this.ensureContext()) {
			return;
		}

		const start = this.context.currentTime + delay;
		const oscillator = this.context.createOscillator();
		const gain = this.context.createGain();

		oscillator.type = type;
		oscillator.frequency.setValueAtTime(frequency, start);
		oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
		gain.gain.setValueAtTime(volume, start);
		gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

		oscillator.connect(gain);
		gain.connect(this.context.destination);
		oscillator.start(start);
		oscillator.stop(start + duration + 0.05);
	}

	public countdownBeep(): void {
		this.tone(440, 0.18);
	}

	public goBeep(): void {
		this.tone(880, 0.6);
	}

	public pickupChime(): void {
		this.tone(988, 0.1, 'triangle', 0.18);
		this.tone(1319, 0.3, 'triangle', 0.18, 0.09);
	}

	public boostSound(): void {
		this.tone(300, 0.35, 'sawtooth', 0.08, 0, 1000);
	}

	public falseStartSound(): void {
		this.tone(200, 0.4, 'sawtooth', 0.1, 0, 120);
	}

	public finishFanfare(): void {
		const notes = [523, 659, 784, 1047];

		for (let i = 0; i < notes.length; i++) {
			this.tone(notes[i], i === notes.length - 1 ? 0.6 : 0.18, 'square', 0.1, i * 0.15);
		}
	}

	public toggleEngine(): boolean {
		this.engineEnabled = !this.engineEnabled;

		if (!this.engineEnabled && this.engineGain) {
			this.engineGain.gain.value = 0;
		}

		return this.engineEnabled;
	}

	// speedRatio: 0..1 (fraction of max speed); boosting adds a higher pitch.
	public setEngine(speedRatio: number, boosting: boolean): void {
		if (!this.engineEnabled || !this.ensureContext()) {
			return;
		}

		if (!this.engineOscillator) {
			this.engineOscillator = this.context.createOscillator();
			this.engineGain = this.context.createGain();

			const filter = this.context.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.value = 600;

			this.engineOscillator.type = 'sawtooth';
			this.engineGain.gain.value = 0;
			this.engineOscillator.connect(filter);
			filter.connect(this.engineGain);
			this.engineGain.connect(this.context.destination);
			this.engineOscillator.start();
		}

		const frequency = 60 + speedRatio * 140 + (boosting ? 40 : 0);
		const volume = 0.03 + speedRatio * 0.05;

		this.engineOscillator.frequency.setTargetAtTime(frequency, this.context.currentTime, 0.05);
		this.engineGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.05);
	}
}
