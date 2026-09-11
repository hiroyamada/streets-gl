import RenderableObject3D from "~/app/objects/RenderableObject3D";
import AbstractMesh from "~/lib/renderer/abstract-renderer/AbstractMesh";
import AbstractRenderer from "~/lib/renderer/abstract-renderer/AbstractRenderer";
import {RendererTypes} from "~/lib/renderer/RendererTypes";
import Vec3 from "~/lib/math/Vec3";

interface BoxFace {
	corners: [number, number, number][];
	normal: [number, number, number];
}

function buildBoxAttributes(sizeX: number, sizeY: number, sizeZ: number): {position: Float32Array; normal: Float32Array} {
	const x0 = -sizeX / 2;
	const x1 = sizeX / 2;
	const y0 = 0;
	const y1 = sizeY;
	const z0 = -sizeZ / 2;
	const z1 = sizeZ / 2;

	const faces: BoxFace[] = [
		{corners: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], normal: [0, 0, 1]},
		{corners: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], normal: [0, 0, -1]},
		{corners: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], normal: [1, 0, 0]},
		{corners: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], normal: [-1, 0, 0]},
		{corners: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], normal: [0, 1, 0]},
		{corners: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], normal: [0, -1, 0]}
	];

	const position: number[] = [];
	const normal: number[] = [];

	for (const face of faces) {
		const [a, b, c, d] = face.corners;
		const triangles: [number, number, number][][] = [[a, b, c], [a, c, d]];

		for (const triangle of triangles) {
			for (const vertex of triangle) {
				position.push(vertex[0], vertex[1], vertex[2]);
				normal.push(face.normal[0], face.normal[1], face.normal[2]);
			}
		}
	}

	return {
		position: new Float32Array(position),
		normal: new Float32Array(normal)
	};
}

export default class ColoredBox extends RenderableObject3D {
	public mesh: AbstractMesh = null;
	public visible: boolean = true;
	public readonly color: Vec3;
	public readonly glow: Vec3;
	private readonly sizeX: number;
	private readonly sizeY: number;
	private readonly sizeZ: number;

	public constructor(sizeX: number, sizeY: number, sizeZ: number, color: Vec3, glow: Vec3) {
		super();

		this.sizeX = sizeX;
		this.sizeY = sizeY;
		this.sizeZ = sizeZ;
		this.color = color;
		this.glow = glow;
	}

	public isMeshReady(): boolean {
		return this.mesh !== null;
	}

	public updateMesh(renderer: AbstractRenderer): void {
		const {position, normal} = buildBoxAttributes(this.sizeX, this.sizeY, this.sizeZ);

		this.mesh = renderer.createMesh({
			attributes: [
				renderer.createAttribute({
					name: 'position',
					type: RendererTypes.AttributeType.Float32,
					format: RendererTypes.AttributeFormat.Float,
					size: 3,
					normalized: false,
					buffer: renderer.createAttributeBuffer({
						data: position
					})
				}),
				renderer.createAttribute({
					name: 'normal',
					type: RendererTypes.AttributeType.Float32,
					format: RendererTypes.AttributeFormat.Float,
					size: 3,
					normalized: false,
					buffer: renderer.createAttributeBuffer({
						data: normal
					})
				})
			]
		});
	}
}
