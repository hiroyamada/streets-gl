// Bearing math for the always-visible compass-style navigation arrow.
//
// Convention (matches KartController.getForwardVector and the chase camera):
//   * Forward at heading h is (cos h, -sin h) on the XZ ground plane (see
//     KartController.getForwardVector). Increasing heading turns +x toward -z,
//     which the KartController comment (~line 204-205) notes appears as
//     screen-left for the chase camera.
//   * That means the "screen-left" direction relative to a forward vector
//     (fx, fz) is (fz, -fx), and the "screen-right" direction is (-fz, fx).
//
// getStarBearing returns the angle from the forward direction to the star
// direction, expressed the way the HUD arrow rotates on screen:
//   * 0 means the star is straight ahead (arrow points up).
//   * Positive means the star is to the right on screen (arrow rotates
//     clockwise); negative means it's to the left.
//   * Directly behind resolves to +PI (the atan2 range is (-PI, PI]).
export function getStarBearing(
	kartX: number,
	kartZ: number,
	starX: number,
	starZ: number,
	forwardX: number,
	forwardZ: number
): number {
	const forwardLength = Math.hypot(forwardX, forwardZ);

	if (forwardLength < 1e-10) {
		return 0;
	}

	const fx = forwardX / forwardLength;
	const fz = forwardZ / forwardLength;

	const dx = starX - kartX;
	const dz = starZ - kartZ;

	// Screen-right direction relative to forward, per the convention above.
	const rightX = -fz;
	const rightZ = fx;

	const forwardComponent = dx * fx + dz * fz;
	const rightComponent = dx * rightX + dz * rightZ;

	if (forwardComponent === 0 && rightComponent === 0) {
		return 0;
	}

	return Math.atan2(rightComponent, forwardComponent);
}
