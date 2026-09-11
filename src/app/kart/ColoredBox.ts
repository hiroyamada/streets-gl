import Vec3 from "~/lib/math/Vec3";
import ColoredMesh from "~/app/kart/ColoredMesh";
import GeometryBuilder from "~/app/kart/GeometryBuilder";

/**
 * A single-colored box standing on y = 0, centred on the XZ origin.
 */
export default class ColoredBox extends ColoredMesh {
	public constructor(sizeX: number, sizeY: number, sizeZ: number, color: Vec3, glow: Vec3) {
		const builder = new GeometryBuilder();

		builder.addBox(
			[-sizeX / 2, 0, -sizeZ / 2],
			[sizeX / 2, sizeY, sizeZ / 2],
			new Vec3(1, 1, 1)
		);

		super(builder.build(), color, glow);
	}
}
