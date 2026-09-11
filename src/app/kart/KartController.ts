import Vec3 from "~/lib/math/Vec3";
import MathUtils from "~/lib/math/MathUtils";
import Config from "~/app/Config";
import BuildingCollider from "~/app/kart/BuildingCollider";

const MaxSpeed = 18;
const Acceleration = 12;
const Brake = 20;
const Friction = 4;
const SteerRate = 2.2;
const ReverseMaxSpeed = 6;
const MaxDeltaTime = 0.1;
const DriftSteerMultiplier = 1.8;
const DriftMinTime = 0.6;
const DriftSlideRate = 3;
const GripRate = 12;
const BoostSpeed = 8;
const BoostDuration = 1;
const MushroomBoostSpeed = 14;
const MushroomBoostDuration = 1.6;
const CollisionProbeDistance = 1.2;
const WallSlideFriction = 0.9;
const WallBounce = 0.25;
const HopSpeed = 6.5;    // initial vertical velocity @ worldScale 1
const HopGravity = 24;   // @ worldScale 1
// Start a little south of the first star (world x = north) so it's the first target ahead.
const StartOffsetSouth = 30;

export default class KartController {
	public position: Vec3 = new Vec3();
	public heading: number = 0;
	public moveHeading: number = 0;
	public speed: number = 0;
	public throttle: number = 0;
	public steer: number = 0;
	public drift: boolean = false;
	public isDrifting: boolean = false;
	public driftTime: number = 0;
	public boostTime: number = 0;
	public boostDuration: number = BoostDuration;
	public boostSpeed: number = BoostSpeed;
	public hopHeight: number = 0;
	public hopVelocity: number = 0;
	public hopRequested: boolean = false;
	public worldScale: number = 1;
	// Race flow: the kart is held on the start line during the countdown, a jump-start
	// penalty briefly disables the throttle, and the camera intro is driven from here.
	public locked: boolean = true;
	public throttleLockTime: number = 0;
	public introProgress: number = 1;
	public boostStarted: boolean = false;
	// Title screen: while true, the camera orbits slowly around the kart driven by
	// cinematicAngle instead of the usual chase/intro camera.
	public cinematic: boolean = false;
	public cinematicAngle: number = 0;

	public constructor() {
		this.reset();
	}

	public static getForwardVector(heading: number): Vec3 {
		return new Vec3(Math.cos(heading), 0, -Math.sin(heading));
	}

	public reset(): void {
		const {lat, lon} = Config.StartPosition;
		const startPosition = MathUtils.degrees2meters(lat, lon);

		this.worldScale = MathUtils.getMercatorScaleFactor(lat);
		this.position.x = startPosition.x - StartOffsetSouth * this.worldScale;
		this.position.z = startPosition.y;
		this.heading = 0;
		this.moveHeading = 0;
		this.speed = 0;
		this.isDrifting = false;
		this.driftTime = 0;
		this.boostTime = 0;
		this.boostDuration = BoostDuration;
		this.boostSpeed = BoostSpeed;
		this.hopHeight = 0;
		this.hopVelocity = 0;
		this.hopRequested = false;
		this.throttleLockTime = 0;
		this.boostStarted = false;
		this.cinematic = false;
		this.cinematicAngle = 0;
	}

	public get maxSpeed(): number {
		return MaxSpeed * this.worldScale;
	}

	public get speedRatio(): number {
		return Math.min(1, Math.abs(this.speed) / this.maxSpeed);
	}

	public get isBoosting(): boolean {
		return this.boostTime > 0;
	}

	public get isAirborne(): boolean {
		return this.hopHeight > 0;
	}

	public applyBoost(): void {
		this.boostTime = BoostDuration;
		this.boostDuration = BoostDuration;
		this.boostSpeed = BoostSpeed;
		this.boostStarted = true;
	}

	// Mushroom item: a stronger, longer boost than the drift mini-turbo. Immediately kicks
	// the current speed up toward the new boosted max so it feels like a real kick even from
	// a near-stop, rather than only raising the ceiling for future acceleration.
	public applyMushroomBoost(): void {
		this.boostTime = MushroomBoostDuration;
		this.boostDuration = MushroomBoostDuration;
		this.boostSpeed = MushroomBoostSpeed;

		const kickSpeed = this.maxSpeed * 0.6;

		if (this.speed >= 0) {
			this.speed = Math.max(this.speed, kickSpeed);
		}

		// The drift-boost rising edge (handled in KartSystem.update) plays a different sound;
		// the mushroom plays its own sound explicitly, so don't trigger that edge here.
		this.boostStarted = false;
	}

	public applyThrottlePenalty(seconds: number): void {
		this.throttleLockTime = seconds;
	}

	private updateDrift(dt: number, maxSpeed: number): number {
		const canDrift = this.drift && this.steer !== 0 && this.speed > 0.3 * maxSpeed;

		if (canDrift) {
			this.isDrifting = true;
			this.driftTime += dt;
		} else if (this.isDrifting) {
			this.isDrifting = false;

			if (this.driftTime >= DriftMinTime) {
				this.applyBoost();
			}

			this.driftTime = 0;
		}

		if (this.boostTime > 0) {
			this.boostTime = Math.max(0, this.boostTime - dt);
		}

		return this.isDrifting ? DriftSteerMultiplier : 1;
	}

	private canMoveTo(x: number, z: number, dirX: number, dirZ: number, collider: BuildingCollider): boolean {
		const probe = CollisionProbeDistance * this.worldScale;

		return !collider.isBlocked(x, z) && !collider.isBlocked(x + dirX * probe, z + dirZ * probe);
	}

	private moveWithCollision(dx: number, dz: number, collider: BuildingCollider): void {
		const length = Math.hypot(dx, dz);

		if (!collider || length === 0 || collider.isBlocked(this.position.x, this.position.z)) {
			// No collider, no movement, or already inside a building (let it drive out).
			this.position.x += dx;
			this.position.z += dz;
			return;
		}

		const dirX = dx / length;
		const dirZ = dz / length;

		if (this.canMoveTo(this.position.x + dx, this.position.z + dz, dirX, dirZ, collider)) {
			this.position.x += dx;
			this.position.z += dz;
			return;
		}

		// Blocked: try sliding along one axis so the kart hugs the wall instead of stopping dead.
		if (dx !== 0 && this.canMoveTo(this.position.x + dx, this.position.z, Math.sign(dx), 0, collider)) {
			this.position.x += dx;
			this.speed *= WallSlideFriction;
			return;
		}

		if (dz !== 0 && this.canMoveTo(this.position.x, this.position.z + dz, 0, Math.sign(dz), collider)) {
			this.position.z += dz;
			this.speed *= WallSlideFriction;
			return;
		}

		this.speed = -this.speed * WallBounce;
		this.isDrifting = false;
		this.driftTime = 0;
	}

	public update(deltaTime: number, groundHeight: number | null, collider: BuildingCollider = null): void {
		const dt = Math.min(deltaTime, MaxDeltaTime);
		const maxSpeed = MaxSpeed * this.worldScale;
		const reverseMaxSpeed = ReverseMaxSpeed * this.worldScale;
		const acceleration = Acceleration * this.worldScale;
		const brake = Brake * this.worldScale;
		const friction = Friction * this.worldScale;

		if (this.locked) {
			this.speed = 0;
			this.moveHeading = this.heading;
			this.hopHeight = 0;
			this.hopVelocity = 0;
			this.hopRequested = false;
			this.position.y = groundHeight ?? this.position.y;
			return;
		}

		if (this.throttleLockTime > 0) {
			this.throttleLockTime = Math.max(0, this.throttleLockTime - dt);
		}

		const throttle = this.throttleLockTime > 0 ? 0 : this.throttle;

		if (throttle !== 0) {
			const isOpposingMotion = this.speed !== 0 && Math.sign(throttle) !== Math.sign(this.speed);
			const rate = isOpposingMotion ? brake : acceleration;

			this.speed += throttle * rate * dt;
		} else if (this.speed !== 0) {
			const frictionDelta = friction * dt;

			if (Math.abs(this.speed) <= frictionDelta) {
				this.speed = 0;
			} else {
				this.speed -= Math.sign(this.speed) * frictionDelta;
			}
		}

		const steerMultiplier = this.updateDrift(dt, maxSpeed);
		const boostFactor = this.boostTime / this.boostDuration;
		const boostedMaxSpeed = maxSpeed + this.boostSpeed * this.worldScale * boostFactor;

		if (boostFactor > 0 && this.speed >= 0) {
			this.speed = Math.max(this.speed, boostedMaxSpeed);
		}

		this.speed = MathUtils.clamp(this.speed, -reverseMaxSpeed, boostedMaxSpeed);

		const speedFactor = MathUtils.clamp(Math.abs(this.speed) / maxSpeed, 0.3, 1);

		// Positive heading turns +x toward -z (west when facing north), which is screen-left
		// for the chase camera, so steer=+1 (D / ArrowRight) must decrease the heading.
		this.heading -= this.steer * SteerRate * steerMultiplier * speedFactor * dt * Math.sign(this.speed);

		// The direction of travel lags behind the heading while drifting (the kart slides),
		// and snaps back quickly when gripping.
		const followRate = this.isDrifting ? DriftSlideRate : GripRate;
		const followAlpha = 1 - Math.exp(-followRate * dt);
		this.moveHeading = MathUtils.lerpAngle(this.moveHeading, this.heading, followAlpha);

		const forward = KartController.getForwardVector(this.moveHeading);

		this.moveWithCollision(forward.x * this.speed * dt, forward.z * this.speed * dt, collider);

		if (this.hopRequested) {
			if (this.hopHeight <= 0) {
				this.hopVelocity = HopSpeed * this.worldScale;
			}
			this.hopRequested = false;
		}

		this.hopVelocity -= HopGravity * this.worldScale * dt;
		this.hopHeight = Math.max(0, this.hopHeight + this.hopVelocity * dt);

		if (this.hopHeight <= 0) {
			this.hopVelocity = 0;
		}

		const baseHeight = groundHeight ?? (this.position.y - this.hopHeight);
		this.position.y = baseHeight + this.hopHeight;
	}
}
