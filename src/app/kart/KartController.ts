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
const CollisionProbeDistance = 1.2;
const WallSlideFriction = 0.9;
const WallBounce = 0.25;

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
	public worldScale: number = 1;

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
		this.position.x = startPosition.x;
		this.position.z = startPosition.y;
		this.heading = 0;
		this.moveHeading = 0;
		this.speed = 0;
		this.isDrifting = false;
		this.driftTime = 0;
		this.boostTime = 0;
	}

	private updateDrift(dt: number, maxSpeed: number): number {
		const canDrift = this.drift && this.steer !== 0 && this.speed > 0.3 * maxSpeed;

		if (canDrift) {
			this.isDrifting = true;
			this.driftTime += dt;
		} else if (this.isDrifting) {
			this.isDrifting = false;

			if (this.driftTime >= DriftMinTime) {
				this.boostTime = BoostDuration;
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

		if (this.throttle !== 0) {
			const isOpposingMotion = this.speed !== 0 && Math.sign(this.throttle) !== Math.sign(this.speed);
			const rate = isOpposingMotion ? brake : acceleration;

			this.speed += this.throttle * rate * dt;
		} else if (this.speed !== 0) {
			const frictionDelta = friction * dt;

			if (Math.abs(this.speed) <= frictionDelta) {
				this.speed = 0;
			} else {
				this.speed -= Math.sign(this.speed) * frictionDelta;
			}
		}

		const steerMultiplier = this.updateDrift(dt, maxSpeed);
		const boostFactor = this.boostTime / BoostDuration;
		const boostedMaxSpeed = maxSpeed + BoostSpeed * this.worldScale * boostFactor;

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
		this.position.y = groundHeight ?? this.position.y;
	}
}
