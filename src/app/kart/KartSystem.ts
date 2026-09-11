import System from "~/app/System";
import SceneSystem from "~/app/systems/SceneSystem";
import ControlsSystem from "~/app/systems/ControlsSystem";
import ColoredBox from "~/app/kart/ColoredBox";
import Vec3 from "~/lib/math/Vec3";
import MathUtils from "~/lib/math/MathUtils";
import Config from "~/app/Config";

export default class KartSystem extends System {
	public objects: ColoredBox[] = [];

	public postInit(): void {
		const {lat} = Config.StartPosition;
		const worldScale = MathUtils.getMercatorScaleFactor(lat);

		const box = new ColoredBox(
			2 * worldScale,
			0.8 * worldScale,
			1.2 * worldScale,
			new Vec3(0.9, 0.15, 0.1),
			new Vec3(0, 0, 0)
		);

		this.objects.push(box);

		this.systemManager.getSystem(SceneSystem).objects.wrapper.add(box);
	}

	public update(deltaTime: number): void {
		const controller = this.systemManager.getSystem(ControlsSystem).kartController;

		if (!controller) {
			return;
		}

		const box = this.objects[0];

		box.position.x = controller.position.x;
		box.position.y = controller.position.y;
		box.position.z = controller.position.z;
		box.rotation.y = controller.heading;
		box.updateMatrix();
	}
}
