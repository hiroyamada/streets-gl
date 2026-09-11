import {getStarBearing} from "~/app/kart/StarNavigation";

describe('StarNavigation', () => {
	test('star straight ahead gives 0', () => {
		expect(getStarBearing(0, 0, 10, 0, 1, 0)).toBeCloseTo(0);
	});

	test('star directly behind gives ±PI', () => {
		expect(Math.abs(getStarBearing(0, 0, -10, 0, 1, 0))).toBeCloseTo(Math.PI);
	});

	test('star to the right of forward gives +PI/2', () => {
		// Forward is +x; screen-right relative to (fx=1, fz=0) is (-fz, fx) = (0, 1).
		expect(getStarBearing(0, 0, 0, 10, 1, 0)).toBeCloseTo(Math.PI / 2);
	});

	test('star to the left of forward gives -PI/2', () => {
		expect(getStarBearing(0, 0, 0, -10, 1, 0)).toBeCloseTo(-Math.PI / 2);
	});

	test('rotated forward vector still gives correct relative angles', () => {
		// Heading PI/2: forward = (cos(PI/2), -sin(PI/2)) = (0, -1).
		const fx = Math.cos(Math.PI / 2);
		const fz = -Math.sin(Math.PI / 2);

		// Star straight ahead along the rotated forward direction.
		expect(getStarBearing(0, 0, fx * 10, fz * 10, fx, fz)).toBeCloseTo(0);

		// Star to the right: right = (-fz, fx) = (1, 0).
		expect(getStarBearing(0, 0, 10, 0, fx, fz)).toBeCloseTo(Math.PI / 2);

		// Star to the left: left = (fz, -fx) = (-1, 0).
		expect(getStarBearing(0, 0, -10, 0, fx, fz)).toBeCloseTo(-Math.PI / 2);
	});

	test('zero distance returns 0 without NaN', () => {
		const angle = getStarBearing(5, 5, 5, 5, 1, 0);

		expect(angle).toBe(0);
		expect(Number.isNaN(angle)).toBe(false);
	});

	test('zero-length forward vector returns 0 without NaN', () => {
		const angle = getStarBearing(0, 0, 10, 10, 0, 0);

		expect(angle).toBe(0);
		expect(Number.isNaN(angle)).toBe(false);
	});
});
