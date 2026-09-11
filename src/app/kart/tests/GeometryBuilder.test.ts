import GeometryBuilder, {GeometryData} from "~/app/kart/GeometryBuilder";
import KartModel from "~/app/kart/KartModel";
import KartController from "~/app/kart/KartController";
import Vec3 from "~/lib/math/Vec3";

const White = new Vec3(1, 1, 1);

function triangleCount(geometry: GeometryData): number {
	return geometry.position.length / 9;
}

/**
 * For a convex, closed shape centred on `center`, every face normal must point away
 * from the centre; otherwise the winding is inside out and the face would be lit wrongly.
 */
function expectOutwardNormals(geometry: GeometryData, center: [number, number, number]): void {
	const {position, normal} = geometry;

	expect(normal.length).toBe(position.length);

	for (let i = 0; i < position.length; i += 9) {
		const cx = (position[i] + position[i + 3] + position[i + 6]) / 3 - center[0];
		const cy = (position[i + 1] + position[i + 4] + position[i + 7]) / 3 - center[1];
		const cz = (position[i + 2] + position[i + 5] + position[i + 8]) / 3 - center[2];
		const dot = cx * normal[i] + cy * normal[i + 1] + cz * normal[i + 2];

		expect(dot).toBeGreaterThan(0);
	}
}

describe('GeometryBuilder', () => {
	it('builds a box with outward-facing flat normals', () => {
		const g = new GeometryBuilder();
		g.addBox([-1, 0, -2], [1, 4, 2], White);
		const geometry = g.build();

		expect(triangleCount(geometry)).toBe(12);
		expect(geometry.color.length).toBe(geometry.position.length);
		expectOutwardNormals(geometry, [0, 2, 0]);
	});

	it('builds tapered frustums with outward-facing normals', () => {
		const g = new GeometryBuilder();
		g.addFrustum(-1, 1, 0, 1, -1, 1, -0.5, 0.5, -0.5, 0.5, White);
		expectOutwardNormals(g.build(), [0, 0.5, 0]);
	});

	it('builds cylinders along every axis with outward-facing normals', () => {
		for (const axis of ['x', 'y', 'z'] as const) {
			const g = new GeometryBuilder();
			g.addCylinder([0, 0, 0], 1, 2, axis, 12, White, White, 0.5);
			expectOutwardNormals(g.build(), [0, 0, 0]);
		}
	});

	it('builds full and clipped spheres with outward-facing normals', () => {
		const full = new GeometryBuilder();
		full.addSphere([0, 0, 0], 1, 12, 8, White);
		expectOutwardNormals(full.build(), [0, 0, 0]);

		const cap = new GeometryBuilder();
		cap.addSphere([0, 0, 0], 1, 12, 6, White, 0.2, 1);
		expectOutwardNormals(cap.build(), [0, 0.5, 0]);
	});

	it('builds a ring whose normals point away from the tube centre line', () => {
		const g = new GeometryBuilder();
		g.addRing([0, 0, 0], 1, 0.1, 16, 8, White);
		const {position, normal} = g.build();

		for (let i = 0; i < position.length; i += 9) {
			const cx = (position[i] + position[i + 3] + position[i + 6]) / 3;
			const cy = (position[i + 1] + position[i + 4] + position[i + 7]) / 3;
			const cz = (position[i + 2] + position[i + 5] + position[i + 8]) / 3;
			const ringRadius = Math.hypot(cy, cz);
			const tx = cx;
			const ty = cy - cy / ringRadius;
			const tz = cz - cz / ringRadius;

			expect(tx * normal[i] + ty * normal[i + 1] + tz * normal[i + 2]).toBeGreaterThan(0);
		}
	});
});

describe('KartModel', () => {
	it('creates a body, flames and four wheels and follows the controller', () => {
		const model = new KartModel(1);
		const controller = new KartController();

		expect(model.wheels.length).toBe(4);
		expect(model.renderables.length).toBe(7);
		expect(model.flames.visible).toBe(false);
		expect(model.sparks.visible).toBe(false);

		controller.position.set(10, 2, -5);
		controller.heading = 0.7;
		controller.speed = 10;
		controller.steer = 1;
		controller.boostTime = 0.5;

		model.update(controller, 1 / 60);

		expect(model.root.position.x).toBe(10);
		expect(model.root.position.y).toBe(2);
		expect(model.root.position.z).toBe(-5);
		expect(model.root.rotation.y).toBe(0.7);
		expect(model.flames.visible).toBe(true);

		// Front wheels steer, rear wheels do not; all of them roll.
		expect(model.wheels[0].rotation.y).toBeLessThan(0);
		expect(model.wheels[2].rotation.y).toBe(0);
		expect(model.wheels[3].rotation.z).not.toBe(0);

		for (const object of model.renderables) {
			for (const value of object.matrixWorld.values) {
				expect(Number.isFinite(value)).toBe(true);
			}
		}
	});

	it('shows drift sparks only while drifting, coloured by how charged the drift is', () => {
		const model = new KartModel(1);
		const controller = new KartController();
		controller.locked = false;

		model.update(controller, 1 / 60);
		expect(model.sparks.visible).toBe(false);

		controller.isDrifting = true;
		controller.driftTime = 0.2;
		model.update(controller, 1 / 60);

		expect(model.sparks.visible).toBe(true);
		expect(model.sparks.glow.z).toBeGreaterThan(model.sparks.glow.x);

		controller.driftTime = 1;
		model.update(controller, 1 / 60);

		expect(model.sparks.visible).toBe(true);
		expect(model.sparks.glow.x).toBeGreaterThan(model.sparks.glow.z);

		controller.isDrifting = false;
		model.update(controller, 1 / 60);
		expect(model.sparks.visible).toBe(false);
	});
});
