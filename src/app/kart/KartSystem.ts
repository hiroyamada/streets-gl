import System from "~/app/System";
import SceneSystem from "~/app/systems/SceneSystem";
import ControlsSystem, {NavigationMode} from "~/app/systems/ControlsSystem";
import TerrainSystem from "~/app/systems/TerrainSystem";
import SettingsSystem from "~/app/systems/SettingsSystem";
import ColoredBox from "~/app/kart/ColoredBox";
import KartController from "~/app/kart/KartController";
import Star, {StarDefinitions} from "~/app/kart/Stars";
import HUD from "~/app/kart/HUD";
import RaceAudio from "~/app/kart/RaceAudio";
import RaceMusic from "~/app/kart/RaceMusic";
import RaceState, {GoDisplayDuration, RacePhase} from "~/app/kart/RaceState";
import Vec3 from "~/lib/math/Vec3";
import MathUtils from "~/lib/math/MathUtils";
import Config from "~/app/Config";

// During the final stretch of the race (once only one star remains) the music
// speeds up a little to build excitement, mirroring Mario Kart's final-lap sting.
const FinalStretchTempoMultiplier = 1.12;

const PickupDistance = 3;
const StarHoverHeight = 1;
const StarBobAmplitude = 0.25;
const StarSpinSpeed = 1.5;
const StarPopDuration = 300;
const JumpStartPenalty = 0.7;
const DriftReadyTime = 0.6;
const ArrowEdgeInset = 44;

export default class KartSystem extends System {
	public objects: ColoredBox[] = [];
	private kartBox: ColoredBox = null;
	private stars: Star[] = [];
	private hud: HUD = null;
	private audio: RaceAudio = new RaceAudio();
	private music: RaceMusic = null;
	private wasKartModeActive: boolean = false;
	private race: RaceState = null;
	private lastCountdownValue: number = -1;
	private goShownAt: number = null;
	private throttleDuringCountdown: boolean = false;
	private lastBoostStarted: boolean = false;

	public postInit(): void {
		const {lat} = Config.StartPosition;
		const worldScale = MathUtils.getMercatorScaleFactor(lat);
		const wrapper = this.systemManager.getSystem(SceneSystem).objects.wrapper;

		this.kartBox = new ColoredBox(
			2 * worldScale,
			0.8 * worldScale,
			1.2 * worldScale,
			new Vec3(0.9, 0.15, 0.1),
			new Vec3(0, 0, 0)
		);

		this.objects.push(this.kartBox);
		wrapper.add(this.kartBox);

		this.stars = StarDefinitions.map((def, i) => {
			const star = Star.create(def, worldScale, i * (Math.PI / 4));

			star.box.position.x = star.x;
			star.box.position.z = star.z;
			star.box.updateMatrix();
			star.beam.position.x = star.x;
			star.beam.position.z = star.z;
			star.beam.updateMatrix();

			this.objects.push(star.box, star.beam);
			wrapper.add(star.box, star.beam);

			return star;
		});

		this.race = new RaceState(this.stars.length);
		this.hud = new HUD();
		this.music = new RaceMusic(this.audio.getContext());
		this.listenToMusicSettings();

		document.addEventListener('keydown', (e: KeyboardEvent) => this.keyDownEvent(e));

		this.restart();
	}

	// Reacts live to the Settings panel so toggling music or dragging the volume slider
	// takes effect immediately, without polling the schema every frame.
	private listenToMusicSettings(): void {
		const settings = this.systemManager.getSystem(SettingsSystem).settings;

		settings.onChange('music', ({statusValue}) => {
			const enabled = statusValue === 'on';

			this.music.setEnabled(enabled);

			if (enabled && this.systemManager.getSystem(ControlsSystem).mode === NavigationMode.Kart) {
				this.music.start();
			}
		});

		settings.onChange('musicVolume', ({numberValue}) => {
			this.music.setVolume((numberValue ?? 60) / 100);
		});
	}

	private keyDownEvent(e: KeyboardEvent): void {
		const active = document.activeElement;

		if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
			return;
		}

		this.audio.unlock();
		this.music.unlock();

		if (e.code === 'KeyR' || (e.code === 'Space' && this.race.phase === RacePhase.Finished)) {
			this.restart();
		} else if (e.code === 'KeyM') {
			this.hud.setEngineSound(this.audio.toggleEngine());
		}
	}

	public restart(): void {
		const now = performance.now();

		for (const star of this.stars) {
			star.reset();
		}

		this.race.reset(now);
		this.lastCountdownValue = -1;
		this.goShownAt = null;
		this.throttleDuringCountdown = false;
		this.hud.hideFinish();
		this.hud.hideCountdown();
		this.hud.setCount(0, this.stars.length);
		this.hud.setTimer(RaceState.formatTime(0));
		this.updateActiveStar();

		this.music.setTempoMultiplier(1);

		if (this.systemManager.getSystem(ControlsSystem).mode === NavigationMode.Kart) {
			// Restarting mid-race (e.g. pressing R) should pick the loop back up from the
			// top rather than leaving it mid-bar at the wrong tempo.
			this.music.stop();
			this.music.start();
		}

		const controller = this.controller;

		if (controller) {
			controller.reset();
			controller.locked = true;
			controller.introProgress = 0;
		}
	}

	private get controller(): KartController {
		return this.systemManager.getSystem(ControlsSystem).kartController;
	}

	private updateActiveStar(): void {
		for (let i = 0; i < this.stars.length; i++) {
			this.stars[i].setActive(i === this.race.nextStarIndex);
		}
	}

	private updateCountdown(controller: KartController, now: number): void {
		const value = this.race.getCountdownValue(now);

		controller.introProgress = this.race.getCountdownProgress(now);

		if (value > 0) {
			if (value !== this.lastCountdownValue) {
				this.lastCountdownValue = value;
				this.hud.showCountdown(value.toString());
				this.audio.countdownBeep();
			}

			// Holding the throttle during 3 or 2 is a jump start; during 1 it's a rocket start.
			if (controller.throttle > 0 && value >= 2) {
				this.throttleDuringCountdown = true;
			}

			return;
		}

		// GO!
		this.race.start(now);
		this.goShownAt = now;
		this.hud.showCountdown('GO!');
		this.audio.goBeep();
		controller.locked = false;
		controller.introProgress = 1;

		if (this.throttleDuringCountdown) {
			controller.applyThrottlePenalty(JumpStartPenalty);
			this.audio.falseStartSound();
		} else if (controller.throttle > 0) {
			controller.applyBoost();
		}
	}

	private updateStars(controller: KartController, deltaTime: number, now: number): void {
		const terrainHeightProvider = this.systemManager.getSystem(TerrainSystem).terrainHeightProvider;
		const worldScale = controller.worldScale;
		const time = now / 1000;

		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			if (star.collected && star.popStart === null) {
				continue;
			}

			const groundHeight = terrainHeightProvider.getHeightGlobalInterpolated(star.x, star.z, true);

			if (groundHeight !== null) {
				star.baseHeight = groundHeight;
			}

			const bob = StarBobAmplitude * worldScale * Math.sin(time * 2 + star.phase);

			star.box.position.y = star.baseHeight + StarHoverHeight * worldScale + bob;
			star.box.rotation.y += StarSpinSpeed * deltaTime;

			if (star.popStart !== null) {
				// Pickup pop: scale up quickly, then vanish.
				const t = (now - star.popStart) / StarPopDuration;

				if (t >= 1) {
					star.popStart = null;
					star.box.visible = false;
				} else {
					const scale = 1 + t * 1.5;
					star.box.scale.set(scale, scale, scale);
				}
			}

			star.box.updateMatrix();
			star.box.updateMatrixWorld();

			if (star.beam.visible) {
				star.beam.position.y = star.baseHeight;
				star.beam.updateMatrix();
				star.beam.updateMatrixWorld();
			}

			if (star.collected || i !== this.race.nextStarIndex || this.race.phase !== RacePhase.Racing) {
				continue;
			}

			const distance = Math.hypot(controller.position.x - star.x, controller.position.z - star.z);

			if (distance < PickupDistance * worldScale) {
				this.collectStar(star, now);
			}
		}
	}

	private collectStar(star: Star, now: number): void {
		star.collected = true;
		star.popStart = now;
		star.beam.visible = false;

		const split = this.race.recordSplit(now);

		this.hud.setCount(this.race.nextStarIndex, this.stars.length);
		this.hud.flashSplit(RaceState.formatTime(split));
		this.hud.floatPickup();
		this.audio.pickupChime();
		this.updateActiveStar();

		if (this.race.isComplete) {
			const isNewBest = this.race.finish(now);
			const total = this.race.getElapsed(now);

			this.audio.finishFanfare();
			this.music.duck();
			this.hud.showFinish(
				RaceState.formatTime(total),
				this.race.splits.map((time, i) => ({name: this.stars[i].name, text: RaceState.formatTime(time)})),
				RaceState.formatTime(this.race.bestTime),
				isNewBest
			);
		}
	}

	private updateKartGlow(controller: KartController): void {
		const glow = this.kartBox.glow;

		if (controller.isBoosting) {
			const f = controller.boostTime;
			glow.set(2 * f, 2 * f, 2.5 * f);
		} else if (controller.isDrifting && controller.driftTime >= DriftReadyTime) {
			glow.set(2.0, 0.9, 0.2);
		} else if (controller.isDrifting) {
			glow.set(0.2, 0.6, 2.0);
		} else {
			glow.set(0, 0, 0);
		}
	}

	private updateNextStarHUD(controller: KartController): void {
		const next = this.stars[this.race.nextStarIndex];

		if (!next || this.race.phase === RacePhase.Finished) {
			this.hud.setNext(null, 0);
			this.hud.setArrow(false, 0, 0, 0);
			return;
		}

		const distance = Math.hypot(controller.position.x - next.x, controller.position.z - next.z);

		this.hud.setNext(next.name, distance / controller.worldScale);

		// Project the star onto the screen; the camera works in wrapper space (world minus
		// the camera's x/z), so convert first.
		const camera = this.systemManager.getSystem(SceneSystem).objects.camera;
		const wrapperPosition = new Vec3(
			next.x - camera.position.x,
			next.box.position.y,
			next.z - camera.position.z
		);
		const viewPosition = Vec3.applyMatrix4(wrapperPosition, camera.matrixWorldInverse);
		const clipPosition = Vec3.applyMatrix4(viewPosition, camera.projectionMatrix);
		const inFront = viewPosition.z < 0;
		const onScreen = inFront && Math.abs(clipPosition.x) < 0.95 && Math.abs(clipPosition.y) < 0.9;

		if (onScreen) {
			this.hud.setArrow(false, 0, 0, 0);
			return;
		}

		let dx = clipPosition.x;
		let dy = -clipPosition.y;

		if (!inFront) {
			dx = -dx;
			dy = -dy;
		}

		const length = Math.hypot(dx, dy) || 1;
		dx /= length;
		dy /= length;

		const halfWidth = window.innerWidth / 2 - ArrowEdgeInset;
		const halfHeight = window.innerHeight / 2 - ArrowEdgeInset;
		const scale = Math.min(halfWidth / Math.abs(dx || 1e-6), halfHeight / Math.abs(dy || 1e-6));
		const x = window.innerWidth / 2 + dx * scale;
		const y = window.innerHeight / 2 + dy * scale;

		this.hud.setArrow(true, x, y, Math.atan2(dy, dx));
	}

	private updateMusicActivity(): void {
		const kartModeActive = this.systemManager.getSystem(ControlsSystem).mode === NavigationMode.Kart;

		if (kartModeActive && !this.wasKartModeActive) {
			this.music.start();
		} else if (!kartModeActive && this.wasKartModeActive) {
			this.music.stop();
		}

		this.wasKartModeActive = kartModeActive;

		if (!kartModeActive) {
			return;
		}

		// Final-stretch sting: once the last star is up for grabs, nudge the tempo for
		// extra urgency, mirroring Mario Kart's final-lap music speed-up.
		const isFinalStretch = this.race.phase === RacePhase.Racing && this.race.nextStarIndex === this.stars.length - 1;

		this.music.setTempoMultiplier(isFinalStretch ? FinalStretchTempoMultiplier : 1);
	}

	public update(deltaTime: number): void {
		this.updateMusicActivity();

		const controller = this.controller;

		if (!controller) {
			return;
		}

		const now = performance.now();

		this.kartBox.position.x = controller.position.x;
		this.kartBox.position.y = controller.position.y;
		this.kartBox.position.z = controller.position.z;
		this.kartBox.rotation.y = controller.heading;
		// SceneSystem has already refreshed world matrices this frame, so refresh this one
		// explicitly; otherwise the kart renders one frame behind the camera and stutters.
		this.kartBox.updateMatrix();
		this.kartBox.updateMatrixWorld();

		if (this.race.phase === RacePhase.Countdown) {
			this.updateCountdown(controller, now);
		} else if (this.goShownAt !== null && now - this.goShownAt > GoDisplayDuration) {
			this.goShownAt = null;
			this.hud.hideCountdown();
		}

		if (controller.boostStarted && !this.lastBoostStarted) {
			this.audio.boostSound();
		}
		this.lastBoostStarted = controller.boostStarted;
		controller.boostStarted = false;

		this.updateStars(controller, deltaTime, now);
		this.updateKartGlow(controller);
		this.updateNextStarHUD(controller);
		this.hud.setTimer(RaceState.formatTime(this.race.getElapsed(now)));
		this.audio.setEngine(controller.speedRatio, controller.isBoosting);
	}
}
