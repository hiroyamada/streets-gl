import ColoredBox from "~/app/kart/ColoredBox";
import Vec3 from "~/lib/math/Vec3";
import MathUtils from "~/lib/math/MathUtils";

export interface StarDefinition {
	name: string;
	lat: number;
	lon: number;
}

// Collected in this order (a lap around Shibuya).
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

const ActiveColor = new Vec3(1.0, 0.85, 0.2);
const ActiveGlow = new Vec3(2.0, 1.6, 0.4);
const InactiveColor = new Vec3(0.55, 0.45, 0.2);
const InactiveGlow = new Vec3(0.15, 0.12, 0.03);
const BeamHeight = 60;
const BeamWidth = 0.5;

export default class Star {
	public readonly name: string;
	public readonly x: number;
	public readonly z: number;
	public readonly box: ColoredBox;
	public readonly beam: ColoredBox;
	public readonly phase: number;
	public collected: boolean = false;
	public baseHeight: number = 0;
	public popStart: number = null;

	public constructor(name: string, x: number, z: number, box: ColoredBox, beam: ColoredBox, phase: number) {
		this.name = name;
		this.x = x;
		this.z = z;
		this.box = box;
		this.beam = beam;
		this.phase = phase;
	}

	public static create(def: StarDefinition, worldScale: number, phase: number): Star {
		const position = MathUtils.degrees2meters(def.lat, def.lon);
		const size = 1.5 * worldScale;

		const box = new ColoredBox(size, size, size, Vec3.clone(ActiveColor), Vec3.clone(ActiveGlow));
		box.rotation.x = Math.PI / 4;
		box.rotation.z = Math.PI / 4;

		const beam = new ColoredBox(
			BeamWidth * worldScale, BeamHeight * worldScale, BeamWidth * worldScale,
			new Vec3(1.0, 0.9, 0.4), new Vec3(1.5, 1.2, 0.3)
		);
		beam.visible = false;

		return new Star(def.name, position.x, position.y, box, beam, phase);
	}

	// The active (next) star is bright and marked with a light beam; others are dimmed.
	public setActive(active: boolean): void {
		const color = active ? ActiveColor : InactiveColor;
		const glow = active ? ActiveGlow : InactiveGlow;

		this.box.color.set(color.x, color.y, color.z);
		this.box.glow.set(glow.x, glow.y, glow.z);
		this.beam.visible = active && !this.collected;
	}

	public reset(): void {
		this.collected = false;
		this.popStart = null;
		this.box.visible = true;
		this.box.scale.set(1, 1, 1);
	}
}
