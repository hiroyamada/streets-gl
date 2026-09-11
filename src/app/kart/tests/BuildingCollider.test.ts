import BuildingCollider from "~/app/kart/BuildingCollider";
import KartController from "~/app/kart/KartController";
import Vec3 from "~/lib/math/Vec3";
import MathUtils from "~/lib/math/MathUtils";

jest.mock('~/app/systems/TileSystem', () => ({}));
jest.mock('~/app/Config', () => ({__esModule: true, default: {TileSize: 611.4962158203125, StartPosition: {lat: 35.6595, lon: 139.7005}}}));

// A 10x10 m building at local (100..110, 200..210): roof (2 triangles at y=10) + one vertical wall.
const roof = [
	100, 10, 200, 110, 10, 200, 110, 10, 210,
	100, 10, 200, 110, 10, 210, 100, 10, 210
];
const wall = [100, 0, 200, 110, 0, 200, 110, 10, 200];

function makeCollider(tileX: number, tileY: number): {collider: BuildingCollider; origin: Vec3} {
	const origin = MathUtils.tile2meters(tileX, tileY + 1);
	const tile = {
		position: new Vec3(origin.x, 0, origin.y),
		extrudedMesh: {positionBuffer: new Float32Array([...roof, ...wall])}
	};
	const tileSystem = {getTile: (x: number, y: number): unknown => (x === tileX && y === tileY ? tile : null)};
	const collider = new BuildingCollider(tileSystem as never);

	return {collider, origin: new Vec3(origin.x, 0, origin.y)};
}

describe('BuildingCollider', () => {
	const tilePos = MathUtils.degrees2tile(35.6595, 139.7005, 16);
	const tileX = Math.floor(tilePos.x);
	const tileY = Math.floor(tilePos.y);
	const {collider, origin} = makeCollider(tileX, tileY);

	test('point inside the footprint is blocked', () => {
		expect(collider.isBlocked(origin.x + 105, origin.z + 205)).toBe(true);
	});

	test('points outside the footprint are free', () => {
		expect(collider.isBlocked(origin.x + 95, origin.z + 205)).toBe(false);
		expect(collider.isBlocked(origin.x + 105, origin.z + 215)).toBe(false);
		expect(collider.isBlocked(origin.x + 300, origin.z + 300)).toBe(false);
	});

	test('unloaded tile is free', () => {
		expect(collider.isBlocked(origin.x + 2000, origin.z + 2000)).toBe(false);
	});
});

describe('KartController collisions', () => {
	const tilePos = MathUtils.degrees2tile(35.6595, 139.7005, 16);
	const {collider, origin} = makeCollider(Math.floor(tilePos.x), Math.floor(tilePos.y));

	function makeKart(x: number, z: number, heading: number): KartController {
		const kart = new KartController();
		kart.position.x = origin.x + x;
		kart.position.z = origin.z + z;
		kart.heading = heading;
		kart.moveHeading = heading;
		kart.locked = false;
		return kart;
	}

	test('driving head-on into a wall stops before it', () => {
		// Heading 0 = +x. Start 5 m west of the building, drive at it.
		const kart = makeKart(90, 205, 0);
		kart.throttle = 1;
		for (let i = 0; i < 120; i++) {
			kart.update(1 / 60, 0, collider);
		}
		expect(kart.position.x - origin.x).toBeLessThan(100);
		expect(kart.position.x - origin.x).toBeGreaterThan(90);
	});

	test('driving diagonally into a wall slides along it', () => {
		// Move toward +x and +z (heading = -45deg gives forward (cos, 0, +sin)).
		const kart = makeKart(92, 195, -Math.PI / 4);
		kart.throttle = 1;
		for (let i = 0; i < 120; i++) {
			kart.update(1 / 60, 0, collider);
		}
		expect(kart.position.x - origin.x).toBeLessThan(100);
		expect(kart.position.z - origin.z).toBeGreaterThan(200);
	});

	test('driving in free space is unaffected', () => {
		const kart = makeKart(300, 300, 0);
		kart.throttle = 1;
		for (let i = 0; i < 60; i++) {
			kart.update(1 / 60, 0, collider);
		}
		expect(kart.position.x - origin.x).toBeGreaterThan(305);
	});
});
