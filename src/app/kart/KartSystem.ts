import System from "~/app/System";
import SceneSystem from "~/app/systems/SceneSystem";
import ControlsSystem from "~/app/systems/ControlsSystem";
import TerrainSystem from "~/app/systems/TerrainSystem";
import ColoredBox from "~/app/kart/ColoredBox";
import KartController from "~/app/kart/KartController";
import Star, {StarDefinitions} from "~/app/kart/Stars";
import HUD from "~/app/kart/HUD";
import Vec3 from "~/lib/math/Vec3";
import MathUtils from "~/lib/math/MathUtils";
import Config from "~/app/Config";

const PickupDistance = 3;
const StarHoverHeight = 1;
const StarBobAmplitude = 0.25;
const StarSpinSpeed = 1.5;
const Arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

export default class KartSystem extends System {
	public objects: ColoredBox[] = [];
	private stars: Star[] = [];
	private hud: HUD = null;
	private startTime: number = null;
	private collectedCount: number = 0;
	private finished: boolean = false;

	public postInit(): void {
		const {lat} = Config.StartPosition;
		const worldScale = MathUtils.getMercatorScaleFactor(lat);
		const wrapper = this.systemManager.getSystem(SceneSystem).objects.wrapper;

		const box = new ColoredBox(
			2 * worldScale,
			0.8 * worldScale,
			1.2 * worldScale,
			new Vec3(0.9, 0.15, 0.1),
			new Vec3(0, 0, 0)
		);

		this.objects.push(box);
		wrapper.add(box);

		this.stars = StarDefinitions.map((def, i) => {
			const star = Star.create(def, worldScale, i * (Math.PI / 4));

			star.box.position.x = star.x;
			star.box.position.z = star.z;
			star.box.updateMatrix();

			this.objects.push(star.box);
			wrapper.add(star.box);

			return star;
		});

		this.hud = new HUD();
		this.hud.setCount(0, this.stars.length);

		document.addEventListener('keydown', (e: KeyboardEvent) => this.keyDownEvent(e));
	}

	private keyDownEvent(e: KeyboardEvent): void {
		const active = document.activeElement;

		if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
			return;
		}

		if (e.code === 'KeyR' || (e.code === 'Space' && this.finished)) {
			this.restart();
		}
	}

	public restart(): void {
		for (const star of this.stars) {
			star.collected = false;
			star.box.visible = true;
		}

		this.collectedCount = 0;
		this.finished = false;
		this.startTime = null;
		this.hud.hideWin();

		const controller = this.systemManager.getSystem(ControlsSystem).kartController;

		if (controller) {
			controller.reset();
		}
	}

	private updateStars(controller: KartController, deltaTime: number): void {
		const terrainHeightProvider = this.systemManager.getSystem(TerrainSystem).terrainHeightProvider;
		const worldScale = controller.worldScale;
		const time = performance.now() / 1000;

		for (const star of this.stars) {
			if (star.collected) {
				continue;
			}

			const groundHeight = terrainHeightProvider.getHeightGlobalInterpolated(star.x, star.z, true);

			if (groundHeight !== null) {
				star.baseHeight = groundHeight;
			}

			const bob = StarBobAmplitude * worldScale * Math.sin(time * 2 + star.phase);

			star.box.position.y = star.baseHeight + StarHoverHeight * worldScale + bob;
			star.box.rotation.y += StarSpinSpeed * deltaTime;
			star.box.updateMatrix();
			star.box.updateMatrixWorld();

			const distance = Math.hypot(controller.position.x - star.x, controller.position.z - star.z);

			if (distance < PickupDistance * worldScale) {
				star.collected = true;
				star.box.visible = false;
				this.collectedCount++;

				if (this.startTime === null) {
					this.startTime = performance.now();
				}
			}
		}

		if (this.collectedCount >= this.stars.length && !this.finished) {
			this.finished = true;
			this.hud.showWin((performance.now() - (this.startTime ?? performance.now())) / 1000);
		}
	}

	private updateHUD(controller: KartController): void {
		this.hud.setCount(this.collectedCount, this.stars.length);

		let nearest: Star = null;
		let nearestDistance = Infinity;

		for (const star of this.stars) {
			if (star.collected) {
				continue;
			}

			const distance = Math.hypot(controller.position.x - star.x, controller.position.z - star.z);

			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearest = star;
			}
		}

		if (!nearest) {
			this.hud.setNearest(null, '', 0);
			return;
		}

		const forward = KartController.getForwardVector(controller.heading);
		const right = new Vec3(Math.sin(controller.heading), 0, Math.cos(controller.heading));
		const dx = nearest.x - controller.position.x;
		const dz = nearest.z - controller.position.z;
		const forwardness = dx * forward.x + dz * forward.z;
		const rightness = dx * right.x + dz * right.z;
		const angle = Math.atan2(rightness, forwardness);
		const sector = Math.round(MathUtils.mod(angle, Math.PI * 2) / (Math.PI / 4)) % 8;

		this.hud.setNearest(nearest.name, Arrows[sector], nearestDistance / controller.worldScale);
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
		// SceneSystem has already refreshed world matrices this frame, so refresh this one
		// explicitly; otherwise the kart renders one frame behind the camera and stutters.
		box.updateMatrix();
		box.updateMatrixWorld();

		if (this.startTime === null && controller.throttle !== 0) {
			this.startTime = performance.now();
		}

		this.updateStars(controller, deltaTime);
		this.updateHUD(controller);
	}
}
