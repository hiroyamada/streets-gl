import Vec3 from "~/lib/math/Vec3";
import MathUtils from "~/lib/math/MathUtils";
import Config from "~/app/Config";

const MaxSpeed = 18;
const Acceleration = 12;
const Brake = 20;
const Friction = 4;
const SteerRate = 2.2;
const ReverseMaxSpeed = 6;
const MaxDeltaTime = 0.1;

export default class KartController {
	public position: Vec3 = new Vec3();
	public heading: number = 0;
	public speed: number = 0;
	public throttle: number = 0;
	public steer: number = 0;
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
		this.speed = 0;
	}

	public update(deltaTime: number, groundHeight: number | null): void {
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

		this.speed = MathUtils.clamp(this.speed, -reverseMaxSpeed, maxSpeed);

		const speedFactor = MathUtils.clamp(Math.abs(this.speed) / maxSpeed, 0.3, 1);

		// Positive heading turns +x toward -z (west when facing north), which is screen-left
		// for the chase camera, so steer=+1 (D / ArrowRight) must decrease the heading.
		this.heading -= this.steer * SteerRate * speedFactor * dt * Math.sign(this.speed);

		const forward = KartController.getForwardVector(this.heading);

		this.position.x += forward.x * this.speed * dt;
		this.position.z += forward.z * this.speed * dt;
		this.position.y = groundHeight ?? this.position.y;
	}
}
