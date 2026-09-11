import Vec3 from "~/lib/math/Vec3";

export interface GeometryData {
	position: Float32Array;
	normal: Float32Array;
	color: Float32Array;
}

type Point = [number, number, number];

/**
 * Accumulates flat-shaded triangles with per-vertex colors. All primitives are added
 * in the kart's local frame: +X is forward, +Y is up, +Z is the right-hand side.
 */
export default class GeometryBuilder {
	private readonly position: number[] = [];
	private readonly normal: number[] = [];
	private readonly color: number[] = [];

	public build(): GeometryData {
		return {
			position: new Float32Array(this.position),
			normal: new Float32Array(this.normal),
			color: new Float32Array(this.color)
		};
	}

	public addTriangle(a: Point, b: Point, c: Point, color: Vec3): void {
		const ab = new Vec3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
		const ac = new Vec3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
		const n = Vec3.normalize(Vec3.cross(ab, ac));

		for (const vertex of [a, b, c]) {
			this.position.push(vertex[0], vertex[1], vertex[2]);
			this.normal.push(n.x, n.y, n.z);
			this.color.push(color.x, color.y, color.z);
		}
	}

	/** Quad a -> b -> c -> d; the face normal is the cross product of (b - a) and (c - a). */
	public addQuad(a: Point, b: Point, c: Point, d: Point, color: Vec3): void {
		this.addTriangle(a, b, c, color);
		this.addTriangle(a, c, d, color);
	}

	/**
	 * Axis-aligned box whose bottom face sits at `min` and top face at `max`.
	 */
	public addBox(min: Point, max: Point, color: Vec3): void {
		this.addFrustum(
			min[0], max[0],
			min[1], max[1],
			min[2], max[2],
			min[0], max[0],
			min[2], max[2],
			color
		);
	}

	/**
	 * A box whose top face may be shrunk or shifted relative to the bottom face, which
	 * gives sloped panels (hoods, noses, seat backs) out of a single primitive.
	 */
	public addFrustum(
		bx0: number, bx1: number,
		y0: number, y1: number,
		bz0: number, bz1: number,
		tx0: number, tx1: number,
		tz0: number, tz1: number,
		color: Vec3
	): void {
		const b0: Point = [bx0, y0, bz0];
		const b1: Point = [bx1, y0, bz0];
		const b2: Point = [bx1, y0, bz1];
		const b3: Point = [bx0, y0, bz1];
		const t0: Point = [tx0, y1, tz0];
		const t1: Point = [tx1, y1, tz0];
		const t2: Point = [tx1, y1, tz1];
		const t3: Point = [tx0, y1, tz1];

		this.addQuad(b0, b1, b2, b3, color); // bottom
		this.addQuad(t3, t2, t1, t0, color); // top
		this.addQuad(b2, t2, t3, b3, color); // +Z side
		this.addQuad(b0, t0, t1, b1, color); // -Z side
		this.addQuad(b1, t1, t2, b2, color); // +X side
		this.addQuad(b3, t3, t0, b0, color); // -X side
	}

	/**
	 * Cylinder centred on `center`, with its axis along X, Y or Z.
	 */
	public addCylinder(
		center: Point,
		radius: number,
		length: number,
		axis: 'x' | 'y' | 'z',
		segments: number,
		sideColor: Vec3,
		capColor: Vec3 = sideColor,
		capRadius: number = radius
	): void {
		const half = length / 2;
		const ring = (angle: number, offset: number, r: number): Point => {
			const c = Math.cos(angle) * r;
			const s = Math.sin(angle) * r;

			switch (axis) {
				case 'x': return [center[0] + offset, center[1] + c, center[2] + s];
				case 'y': return [center[0] + s, center[1] + offset, center[2] + c];
				default: return [center[0] + c, center[1] + s, center[2] + offset];
			}
		};
		const capCenter = (offset: number): Point => ring(0, offset, 0);

		for (let i = 0; i < segments; i++) {
			const a0 = (i / segments) * Math.PI * 2;
			const a1 = ((i + 1) / segments) * Math.PI * 2;

			const p00 = ring(a0, -half, radius);
			const p01 = ring(a1, -half, radius);
			const p10 = ring(a0, half, radius);
			const p11 = ring(a1, half, radius);

			this.addQuad(p00, p01, p11, p10, sideColor);

			// Caps (with an optional inset hub of a different radius/colour).
			this.addTriangle(capCenter(half), ring(a0, half, capRadius), ring(a1, half, capRadius), capColor);
			this.addTriangle(capCenter(-half), ring(a1, -half, capRadius), ring(a0, -half, capRadius), capColor);

			if (capRadius < radius) {
				this.addQuad(ring(a0, half, capRadius), ring(a0, half, radius), ring(a1, half, radius), ring(a1, half, capRadius), sideColor);
				this.addQuad(ring(a1, -half, capRadius), ring(a1, -half, radius), ring(a0, -half, radius), ring(a0, -half, capRadius), sideColor);
			}
		}
	}

	/**
	 * Low-poly UV sphere. `yFrom`/`yTo` (in -1..1) clip it vertically so that a cap or a
	 * flattened head can be produced from the same primitive.
	 */
	public addSphere(
		center: Point,
		radius: number,
		widthSegments: number,
		heightSegments: number,
		color: Vec3,
		yFrom: number = -1,
		yTo: number = 1
	): void {
		const phiFrom = Math.acos(Math.min(1, Math.max(-1, yTo)));
		const phiTo = Math.acos(Math.min(1, Math.max(-1, yFrom)));
		const point = (theta: number, phi: number): Point => [
			center[0] + radius * Math.sin(phi) * Math.cos(theta),
			center[1] + radius * Math.cos(phi),
			center[2] + radius * Math.sin(phi) * Math.sin(theta)
		];

		for (let j = 0; j < heightSegments; j++) {
			const phi0 = phiFrom + (phiTo - phiFrom) * (j / heightSegments);
			const phi1 = phiFrom + (phiTo - phiFrom) * ((j + 1) / heightSegments);

			for (let i = 0; i < widthSegments; i++) {
				const theta0 = (i / widthSegments) * Math.PI * 2;
				const theta1 = ((i + 1) / widthSegments) * Math.PI * 2;

				const p00 = point(theta0, phi0);
				const p01 = point(theta1, phi0);
				const p10 = point(theta0, phi1);
				const p11 = point(theta1, phi1);

				// Skip the zero-area triangles that touch a pole.
				if (j < heightSegments - 1 || phiTo < Math.PI) {
					this.addTriangle(p00, p11, p10, color);
				}

				if (j > 0 || phiFrom > 0) {
					this.addTriangle(p00, p01, p11, color);
				}
			}
		}

		// Close the clipped ends with flat discs so the shape stays watertight.
		if (yTo < 1) {
			const c = point(0, phiFrom);
			c[0] = center[0];
			c[2] = center[2];

			for (let i = 0; i < widthSegments; i++) {
				const theta0 = (i / widthSegments) * Math.PI * 2;
				const theta1 = ((i + 1) / widthSegments) * Math.PI * 2;

				this.addTriangle(c, point(theta1, phiFrom), point(theta0, phiFrom), color);
			}
		}

		if (yFrom > -1) {
			const c = point(0, phiTo);
			c[0] = center[0];
			c[2] = center[2];

			for (let i = 0; i < widthSegments; i++) {
				const theta0 = (i / widthSegments) * Math.PI * 2;
				const theta1 = ((i + 1) / widthSegments) * Math.PI * 2;

				this.addTriangle(c, point(theta0, phiTo), point(theta1, phiTo), color);
			}
		}
	}

	/**
	 * Torus-like ring (used for the steering wheel), axis along X.
	 */
	public addRing(center: Point, radius: number, tube: number, segments: number, tubeSegments: number, color: Vec3): void {
		const point = (u: number, v: number): Point => {
			const cu = Math.cos(u);
			const su = Math.sin(u);
			const cv = Math.cos(v);
			const sv = Math.sin(v);

			return [
				center[0] + tube * sv,
				center[1] + (radius + tube * cv) * cu,
				center[2] + (radius + tube * cv) * su
			];
		};

		for (let i = 0; i < segments; i++) {
			const u0 = (i / segments) * Math.PI * 2;
			const u1 = ((i + 1) / segments) * Math.PI * 2;

			for (let j = 0; j < tubeSegments; j++) {
				const v0 = (j / tubeSegments) * Math.PI * 2;
				const v1 = ((j + 1) / tubeSegments) * Math.PI * 2;

				this.addQuad(point(u0, v0), point(u1, v0), point(u1, v1), point(u0, v1), color);
			}
		}
	}
}
