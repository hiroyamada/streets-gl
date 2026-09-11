import ColoredBox from "~/app/kart/ColoredBox";
import Vec3 from "~/lib/math/Vec3";
import MathUtils from "~/lib/math/MathUtils";

export interface StarDefinition {
	name: string;
	lat: number;
	lon: number;
}

export const StarDefinitions: StarDefinition[] = [
	{name: 'Scramble Crossing', lat: 35.6595, lon: 139.7005},
	{name: 'Hachiko', lat: 35.6590, lon: 139.7006},
	{name: 'Shibuya 109', lat: 35.6597, lon: 139.6987},
	{name: 'Miyashita Park', lat: 35.6620, lon: 139.7020},
	{name: 'Shibuya Stream', lat: 35.6570, lon: 139.7025},
	{name: 'Dogenzaka', lat: 35.6580, lon: 139.6970},
	{name: 'Center-gai', lat: 35.6610, lon: 139.6990},
	{name: 'Yoyogi Park entrance', lat: 35.6670, lon: 139.6980}
];

export default class Star {
	public readonly name: string;
	public readonly x: number;
	public readonly z: number;
	public readonly box: ColoredBox;
	public readonly phase: number;
	public collected: boolean = false;
	public baseHeight: number = 0;

	public constructor(name: string, x: number, z: number, box: ColoredBox, phase: number) {
		this.name = name;
		this.x = x;
		this.z = z;
		this.box = box;
		this.phase = phase;
	}

	public static create(def: StarDefinition, worldScale: number, phase: number): Star {
		const position = MathUtils.degrees2meters(def.lat, def.lon);
		const size = 1.5 * worldScale;

		const box = new ColoredBox(
			size, size, size,
			new Vec3(1.0, 0.85, 0.2),
			new Vec3(2.0, 1.6, 0.4)
		);

		box.rotation.x = Math.PI / 4;
		box.rotation.z = Math.PI / 4;

		return new Star(def.name, position.x, position.y, box, phase);
	}
}
