import Object3D from "~/lib/core/Object3D";
import Vec3 from "~/lib/math/Vec3";
import MathUtils from "~/lib/math/MathUtils";
import ColoredMesh from "~/app/kart/ColoredMesh";
import GeometryBuilder from "~/app/kart/GeometryBuilder";
import KartController from "~/app/kart/KartController";

// Palette (linear-ish RGB)
const Red = new Vec3(0.85, 0.08, 0.06);
const DarkRed = new Vec3(0.55, 0.04, 0.03);
const Blue = new Vec3(0.08, 0.2, 0.75);
const Skin = new Vec3(0.95, 0.72, 0.55);
const Brown = new Vec3(0.28, 0.14, 0.06);
const White = new Vec3(0.95, 0.95, 0.95);
const Black = new Vec3(0.05, 0.05, 0.05);
const Rubber = new Vec3(0.09, 0.09, 0.1);
const Chrome = new Vec3(0.75, 0.76, 0.78);
const DarkMetal = new Vec3(0.25, 0.26, 0.28);
const Seat = new Vec3(0.12, 0.12, 0.13);
const Flame = new Vec3(1.0, 0.55, 0.1);
const Yellow = new Vec3(1.0, 0.8, 0.15);

// A drift is "charged" (release for a boost) once held this long, in seconds.
export const DriftReadyTime = 0.6;

const DriftColor = new Vec3(0.3, 0.6, 1.0);
const DriftGlow = new Vec3(0.2, 0.6, 2.0);
const DriftReadyColor = new Vec3(1.0, 0.6, 0.15);
const DriftReadyGlow = new Vec3(2.0, 0.9, 0.2);
const BoostWheelGlow = new Vec3(0.6, 0.6, 0.8);

// Geometry (metres, before world scaling). +X forward, +Y up, +Z right.
export const WheelRadius = 0.3;
const WheelWidth = 0.24;
const FrontAxleX = 0.62;
const RearAxleX = -0.62;
const TrackHalfWidth = 0.62;
const MaxSteerAngle = MathUtils.toRad(28);
const LeanAngle = MathUtils.toRad(4);
const DriftLeanAngle = MathUtils.toRad(9);
const PitchAngle = MathUtils.toRad(2);
const HopStretchFactor = 0.05;
const MaxHopStretch = 0.18;

function buildBodyGeometry(): GeometryBuilder {
	const g = new GeometryBuilder();

	// Chassis pan and rear bumper.
	g.addBox([-1.0, 0.16, -0.44], [1.0, 0.3, 0.44], Red);
	g.addBox([-1.05, 0.28, -0.46], [-0.9, 0.44, 0.46], DarkRed);
	g.addBox([1.0, 0.2, -0.36], [1.12, 0.36, 0.36], Chrome); // front bumper

	// Cockpit tub: floor plus raised side pods.
	g.addBox([-0.65, 0.3, -0.3], [0.35, 0.42, 0.3], Seat);
	g.addFrustum(-0.7, 0.4, 0.3, 0.66, 0.28, 0.46, -0.66, 0.36, 0.3, 0.44, Red); // right pod
	g.addFrustum(-0.7, 0.4, 0.3, 0.66, -0.46, -0.28, -0.66, 0.36, -0.44, -0.3, Red); // left pod
	g.addBox([-0.7, 0.3, -0.46], [-0.52, 0.62, 0.46], Red); // rear cross member

	// Sloping hood and nose cone.
	g.addFrustum(0.35, 1.0, 0.3, 0.62, -0.44, 0.44, 0.4, 0.82, -0.34, 0.34, Red);
	g.addFrustum(0.8, 1.05, 0.3, 0.5, -0.36, 0.36, 0.85, 0.96, -0.22, 0.22, Red);
	g.addBox([0.45, 0.62, -0.05], [0.8, 0.645, 0.05], White); // hood stripe
	g.addCylinder([0.995, 0.42, 0], 0.09, 0.02, 'x', 12, White, Yellow, 0.06); // emblem

	// Wheel arches / mud guards over the rear wheels.
	g.addFrustum(-0.95, -0.3, 0.3, 0.52, 0.44, 0.78, -0.9, -0.36, 0.46, 0.76, Red);
	g.addFrustum(-0.95, -0.3, 0.3, 0.52, -0.78, -0.44, -0.9, -0.36, -0.76, -0.46, Red);

	// Seat: cushion and backrest that leans back slightly.
	g.addBox([-0.55, 0.4, -0.27], [-0.1, 0.5, 0.27], Seat);
	g.addFrustum(-0.62, -0.42, 0.5, 1.02, -0.28, 0.28, -0.7, -0.5, -0.24, 0.24, Seat);
	g.addBox([-0.72, 0.62, -0.12], [-0.62, 0.9, 0.12], Red); // headrest support

	// Engine block and exhaust pipes.
	g.addBox([-0.98, 0.44, -0.3], [-0.72, 0.68, 0.3], DarkMetal);
	g.addCylinder([-1.06, 0.58, 0.2], 0.07, 0.24, 'x', 10, Chrome, Black, 0.05);
	g.addCylinder([-1.06, 0.58, -0.2], 0.07, 0.24, 'x', 10, Chrome, Black, 0.05);

	// Steering column and wheel.
	g.addCylinder([0.3, 0.72, 0], 0.025, 0.36, 'x', 8, DarkMetal);
	g.addRing([0.14, 0.8, 0], 0.15, 0.028, 16, 8, Black);
	g.addBox([0.125, 0.79, -0.13], [0.155, 0.81, 0.13], Black); // spoke
	g.addCylinder([0.14, 0.8, 0], 0.05, 0.03, 'x', 10, Black, Red, 0.035);

	// Driver: legs, shoes, torso with overalls, arms and gloves.
	g.addBox([-0.3, 0.5, -0.17], [0.28, 0.66, 0.17], Blue);
	g.addBox([0.28, 0.42, 0.04], [0.5, 0.56, 0.2], Brown);
	g.addBox([0.28, 0.42, -0.2], [0.5, 0.56, -0.04], Brown);
	g.addFrustum(-0.5, -0.14, 0.5, 1.02, -0.26, 0.26, -0.48, -0.16, -0.22, 0.22, Red);
	g.addBox([-0.16, 0.5, -0.16], [-0.12, 0.88, 0.16], Blue); // bib
	g.addBox([-0.48, 0.88, 0.1], [-0.16, 0.92, 0.14], Blue); // straps
	g.addBox([-0.48, 0.88, -0.14], [-0.16, 0.92, -0.1], Blue);
	g.addCylinder([-0.16, 0.86, 0.24], 0.055, 0.5, 'x', 8, Red);
	g.addCylinder([-0.16, 0.86, -0.24], 0.055, 0.5, 'x', 8, Red);
	g.addSphere([0.1, 0.86, 0.2], 0.075, 8, 6, White);
	g.addSphere([0.1, 0.86, -0.2], 0.075, 8, 6, White);
	g.addBox([-0.42, 1.02, -0.05], [-0.22, 1.06, 0.05], Skin); // neck

	// Head, ears, nose, moustache, eyes.
	g.addSphere([-0.32, 1.26, 0], 0.22, 12, 8, Skin);
	g.addSphere([-0.32, 1.26, 0.22], 0.05, 8, 6, Skin);
	g.addSphere([-0.32, 1.26, -0.22], 0.05, 8, 6, Skin);
	g.addSphere([-0.1, 1.22, 0], 0.07, 8, 6, Skin);
	g.addBox([-0.16, 1.12, -0.11], [-0.1, 1.18, 0.11], Brown);
	g.addSphere([-0.12, 1.3, 0.07], 0.04, 8, 6, White);
	g.addSphere([-0.12, 1.3, -0.07], 0.04, 8, 6, White);
	g.addSphere([-0.085, 1.3, 0.07], 0.018, 6, 4, Blue);
	g.addSphere([-0.085, 1.3, -0.07], 0.018, 6, 4, Blue);

	// Cap: dome, brim and emblem.
	g.addSphere([-0.32, 1.28, 0], 0.235, 12, 6, Red, 0.15, 1);
	g.addFrustum(-0.12, 0.14, 1.32, 1.35, -0.16, 0.16, -0.12, 0.1, -0.13, 0.13, Red);
	g.addCylinder([-0.11, 1.43, 0], 0.06, 0.02, 'x', 12, White, Red, 0.03);

	return g;
}

function buildWheelGeometry(): GeometryBuilder {
	const g = new GeometryBuilder();

	g.addCylinder([0, 0, 0], WheelRadius, WheelWidth, 'z', 16, Rubber, Chrome, WheelRadius * 0.6);
	g.addCylinder([0, 0, 0], WheelRadius * 0.22, WheelWidth + 0.02, 'z', 10, Red);

	// Tread blocks give the tyre a visible rolling motion.
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * Math.PI * 2;
		const r = WheelRadius + 0.015;

		g.addCylinder(
			[Math.cos(angle) * r, Math.sin(angle) * r, 0],
			0.035, WheelWidth, 'z', 4, Black
		);
	}

	return g;
}

function buildFlameGeometry(): GeometryBuilder {
	const g = new GeometryBuilder();

	for (const z of [0.2, -0.2]) {
		g.addFrustum(-1.6, -1.18, 0.52, 0.64, z - 0.06, z + 0.06, -1.5, -1.18, z - 0.03, z + 0.03, Flame);
	}

	return g;
}

function buildSparksGeometry(): GeometryBuilder {
	const g = new GeometryBuilder();

	// A fan of spark shards trailing behind and flaring outward from each rear wheel's
	// contact patch, Mario Kart drift-spark style. Tapered frustums, wide at the base
	// (near the tyre) and narrow at the tip, tilted back and up and out so the spray
	// reads clearly from a chase camera. White so `color`/`glow` set the hue.
	const wheelBackX = RearAxleX - WheelRadius; // just behind the tyre
	const farBackX = -1.45;
	const tyreOuterZ = TrackHalfWidth + WheelWidth / 2; // clear of the tyre
	const flareOuterZ = TrackHalfWidth + 0.45; // clear of the mud guards (end at 0.78)

	const shardCount = 5;

	for (const side of [1, -1]) {
		for (let i = 0; i < shardCount; i++) {
			const t = i / (shardCount - 1);

			const length = MathUtils.lerp(0.45, 0.25, t);
			const baseWidth = MathUtils.lerp(0.2, 0.12, t);
			const tipWidth = baseWidth * 0.5;
			const height = MathUtils.lerp(0.22, 0.12, t);

			// Base: near the tyre, at the ground.
			const baseXNear = wheelBackX - t * 0.15;
			const baseXFar = baseXNear - length;
			const baseZNear = tyreOuterZ + t * 0.12;
			const baseZFar = baseZNear + baseWidth;

			// Tip: further back, further outward and raised, tapering to a point.
			const tipXNear = baseXNear - 0.08 - t * 0.15;
			const tipXFar = tipXNear - length * 0.55;
			const tipZNear = baseZNear + 0.1 + t * (flareOuterZ - tyreOuterZ);
			const tipZFar = tipZNear + tipWidth;

			if (side > 0) {
				g.addFrustum(
					baseXFar, baseXNear, 0, height, baseZNear, baseZFar,
					tipXFar, tipXNear, tipZNear, tipZFar,
					White
				);
			} else {
				g.addFrustum(
					baseXFar, baseXNear, 0, height, -baseZFar, -baseZNear,
					tipXFar, tipXNear, -tipZFar, -tipZNear,
					White
				);
			}
		}

		// A few tiny flying embers, further out and back than the main fan.
		for (let i = 0; i < 3; i++) {
			const t = i / 2;
			const size = 0.08;
			const emberX = farBackX - t * 0.2;
			const emberZ = (flareOuterZ + 0.1 + t * 0.15) * side;
			const emberHeight = 0.05 + t * 0.05;

			g.addBox(
				[emberX - size / 2, 0, Math.min(emberZ, emberZ - side * size)],
				[emberX + size / 2, emberHeight, Math.max(emberZ, emberZ - side * size)],
				White
			);
		}
	}

	return g;
}

/**
 * The player's go-kart: a chassis with a driver, four wheels that roll and steer,
 * and exhaust flames that show while boosting.
 */
export default class KartModel {
	public readonly root: Object3D = new Object3D();
	public readonly body: ColoredMesh;
	public readonly flames: ColoredMesh;
	public readonly sparks: ColoredMesh;
	public readonly wheels: ColoredMesh[] = [];
	public readonly renderables: ColoredMesh[] = [];
	private wheelSpin: number = 0;
	private lean: number = 0;
	private pitch: number = 0;
	private hopStretch: number = 0;
	private previousSpeed: number = 0;

	public constructor(worldScale: number) {
		this.root.scale.set(worldScale, worldScale, worldScale);

		this.body = new ColoredMesh(buildBodyGeometry().build());
		this.root.add(this.body);

		this.flames = new ColoredMesh(buildFlameGeometry().build(), new Vec3(1, 1, 1), new Vec3(3.0, 1.4, 0.3));
		this.flames.visible = false;
		this.root.add(this.flames);

		this.sparks = new ColoredMesh(buildSparksGeometry().build(), Vec3.clone(DriftColor), Vec3.clone(DriftGlow));
		this.sparks.visible = false;
		this.root.add(this.sparks);

		const wheelGeometry = buildWheelGeometry().build();

		for (const [x, z] of [
			[FrontAxleX, TrackHalfWidth],
			[FrontAxleX, -TrackHalfWidth],
			[RearAxleX, TrackHalfWidth],
			[RearAxleX, -TrackHalfWidth]
		]) {
			const wheel = new ColoredMesh(wheelGeometry);

			wheel.position.set(x, WheelRadius, z);
			this.wheels.push(wheel);
			this.root.add(wheel);
		}

		this.renderables.push(this.body, this.flames, this.sparks, ...this.wheels);
	}

	public update(controller: KartController, deltaTime: number): void {
		const speed = controller.speed / controller.worldScale;
		const speedFactor = MathUtils.clamp(Math.abs(speed) / 18, 0, 1);
		const time = performance.now() / 1000;

		this.root.position.set(controller.position.x, controller.position.y, controller.position.z);
		this.root.rotation.y = controller.heading;

		// Body lean into turns (more while drifting) plus a little pitch under acceleration.
		const targetLean = -controller.steer * speedFactor * (controller.isDrifting ? DriftLeanAngle : LeanAngle);
		const accel = deltaTime > 0 ? (speed - this.previousSpeed) / deltaTime : 0;
		const targetPitch = -MathUtils.clamp(accel / 12, -1, 1) * PitchAngle;
		const smoothing = 1 - Math.exp(-10 * deltaTime);

		this.lean += (targetLean - this.lean) * smoothing;
		this.pitch += (targetPitch - this.pitch) * smoothing;
		this.previousSpeed = speed;

		this.body.rotation.x = this.lean;
		this.body.rotation.z = this.pitch;

		// Squash/stretch driven by vertical velocity: stretches tall on the way up
		// (positive hopVelocity) and squashes flat on the way down/landing.
		const hopVelocity = controller.hopVelocity / controller.worldScale;
		const targetHopStretch = MathUtils.clamp(hopVelocity * HopStretchFactor, -MaxHopStretch, MaxHopStretch);

		this.hopStretch += (targetHopStretch - this.hopStretch) * smoothing;
		this.body.scale.set(1 - this.hopStretch * 0.5, 1 + this.hopStretch, 1 - this.hopStretch * 0.5);

		// Wheels roll with the ground speed; the front pair also turns with the steering.
		this.wheelSpin -= speed * deltaTime / WheelRadius;
		this.wheelSpin = MathUtils.mod(this.wheelSpin, Math.PI * 2);

		const steerAngle = -controller.steer * MaxSteerAngle;

		// Wheels tuck up toward the body while airborne, like they're relaxing off the ground.
		const hopHeight = controller.hopHeight / controller.worldScale;
		const wheelTuck = controller.isAirborne ? Math.min(hopHeight * 0.3, WheelRadius * 0.6) : 0;

		for (let i = 0; i < this.wheels.length; i++) {
			const wheel = this.wheels[i];

			wheel.rotation.z = this.wheelSpin;
			wheel.rotation.y = i < 2 ? steerAngle : 0;
			wheel.position.y = WheelRadius - wheelTuck;
		}

		// Exhaust flames flicker while the boost is active, fading out as it runs down;
		// the wheels also pick up a soft glow so the boost still reads across the kart.
		const boosting = controller.isBoosting;

		this.flames.visible = boosting;

		if (boosting) {
			const f = controller.boostTime;
			const flicker = 0.75 + 0.25 * Math.sin(time * 40) * Math.cos(time * 23);

			this.flames.scale.set(flicker, 1, 1);
			this.flames.position.x = -1.18 * (1 - flicker);
			this.flames.glow.set(3.0 * f + 0.5, 1.4 * f + 0.3, 0.3 * f);

			for (const wheel of this.wheels) {
				wheel.glow.set(BoostWheelGlow.x, BoostWheelGlow.y, BoostWheelGlow.z);
			}
		} else {
			for (const wheel of this.wheels) {
				wheel.glow.set(0, 0, 0);
			}
		}

		// Drift sparks kick up behind the rear wheels while drifting, turning from blue to
		// orange once the drift is "charged" (ready to release for a boost); flicker a bit
		// each frame so they read as alive rather than static decals.
		this.sparks.visible = controller.isDrifting;

		if (controller.isDrifting) {
			const ready = controller.driftTime >= DriftReadyTime;

			if (ready) {
				this.sparks.color.set(DriftReadyColor.x, DriftReadyColor.y, DriftReadyColor.z);
				this.sparks.glow.set(DriftReadyGlow.x, DriftReadyGlow.y, DriftReadyGlow.z);
			} else {
				this.sparks.color.set(DriftColor.x, DriftColor.y, DriftColor.z);
				this.sparks.glow.set(DriftGlow.x, DriftGlow.y, DriftGlow.z);
			}

			// Jitter only the height so the sparks stay anchored over the rear wheels
			// instead of sliding along the car with the root-relative scale.
			const jitter = 1 + 0.3 * Math.sin(time * 50) * Math.cos(time * 31);

			this.sparks.scale.set(1, MathUtils.clamp(jitter, 0.7, 1.3), 1);
			this.sparks.position.y = Math.max(0, 0.015 * Math.sin(time * 60));
		}

		// The scene's world matrices were refreshed before this system ran, so recompute
		// this hierarchy explicitly; otherwise the kart renders one frame behind the camera.
		this.root.updateMatrix();
		this.root.updateMatrixWorld();

		for (const child of this.root.children) {
			child.updateMatrix();
			child.updateMatrixWorldRecursively();
		}
	}
}
