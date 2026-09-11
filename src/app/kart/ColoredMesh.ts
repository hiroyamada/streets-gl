import RenderableObject3D from "~/app/objects/RenderableObject3D";
import AbstractMesh from "~/lib/renderer/abstract-renderer/AbstractMesh";
import AbstractRenderer from "~/lib/renderer/abstract-renderer/AbstractRenderer";
import {RendererTypes} from "~/lib/renderer/RendererTypes";
import Vec3 from "~/lib/math/Vec3";
import Mat4 from "~/lib/math/Mat4";
import {GeometryData} from "~/app/kart/GeometryBuilder";

/**
 * A flat-shaded mesh with baked per-vertex colors, rendered by the kart material.
 * `color` tints the whole mesh (multiplied with the vertex colors) and `glow` adds emission.
 */
export default class ColoredMesh extends RenderableObject3D {
	public mesh: AbstractMesh = null;
	public visible: boolean = true;
	public matrixWorldPrev: Mat4 = null;
	public readonly color: Vec3;
	public readonly glow: Vec3;
	private readonly geometry: GeometryData;

	public constructor(geometry: GeometryData, color: Vec3 = new Vec3(1, 1, 1), glow: Vec3 = new Vec3(0, 0, 0)) {
		super();

		this.geometry = geometry;
		this.color = color;
		this.glow = glow;
	}

	public isMeshReady(): boolean {
		return this.mesh !== null;
	}

	public updateMesh(renderer: AbstractRenderer): void {
		const {position, normal, color} = this.geometry;
		const createAttribute = (name: string, data: Float32Array): ReturnType<AbstractRenderer['createAttribute']> => {
			return renderer.createAttribute({
				name,
				type: RendererTypes.AttributeType.Float32,
				format: RendererTypes.AttributeFormat.Float,
				size: 3,
				normalized: false,
				buffer: renderer.createAttributeBuffer({data})
			});
		};

		this.mesh = renderer.createMesh({
			attributes: [
				createAttribute('position', position),
				createAttribute('normal', normal),
				createAttribute('color', color)
			]
		});
	}
}
