import ControlsNavigator from "~/app/controls/ControlsNavigator";
import GroundControlsNavigator from "~/app/controls/GroundControlsNavigator";
import Vec3 from "~/lib/math/Vec3";
import MathUtils from "~/lib/math/MathUtils";
import {ControlsState} from "~/app/systems/ControlsSystem";
import PerspectiveCamera from "~/lib/core/PerspectiveCamera";
import TerrainHeightProvider from "~/app/terrain/TerrainHeightProvider";
import KartController from "~/app/kart/KartController";
import BuildingCollider from "~/app/kart/BuildingCollider";
import Easing from "~/lib/math/Easing";

export default class KartControlsNavigator extends ControlsNavigator {
	private readonly camera: PerspectiveCamera;
	private readonly terrainHeightProvider: TerrainHeightProvider;
	private readonly collider: BuildingCollider;
	public readonly controller: KartController = new KartController();
	private throttleForwardKeyPressed: boolean = false;
	private throttleBackwardKeyPressed: boolean = false;
	private steerLeftKeyPressed: boolean = false;
	private steerRightKeyPressed: boolean = false;
	private shouldSnapCamera: boolean = true;

	public constructor(
		element: HTMLElement,
		camera: PerspectiveCamera,
		terrainHeightProvider: TerrainHeightProvider,
		collider: BuildingCollider
	) {
		super(element);

		this.camera = camera;
		this.terrainHeightProvider = terrainHeightProvider;
		this.collider = collider;

		this.addEventListeners();
	}

	private addEventListeners(): void {
		document.addEventListener('keydown', (e: KeyboardEvent) => this.keyDownEvent(e));
		document.addEventListener('keyup', (e: KeyboardEvent) => this.keyUpEvent(e));
	}

	public lookAtNorth(): void {

	}

	private keyDownEvent(e: KeyboardEvent): void {
		if (!this.isEnabled || !this.isInFocus || e.ctrlKey || e.metaKey || e.altKey) {
			return;
		}

		switch (e.code) {
			case 'KeyW':
			case 'ArrowUp':
				this.throttleForwardKeyPressed = true;
				break;
			case 'KeyS':
			case 'ArrowDown':
				this.throttleBackwardKeyPressed = true;
				break;
			case 'KeyA':
			case 'ArrowLeft':
				this.steerLeftKeyPressed = true;
				break;
			case 'KeyD':
			case 'ArrowRight':
				this.steerRightKeyPressed = true;
				break;
			case 'KeyR':
				this.controller.reset();
				this.shouldSnapCamera = true;
				break;
			case 'Space':
				e.preventDefault();
				if (!e.repeat) {
					this.controller.hopRequested = true;
				}
				this.controller.drift = true;
				break;
		}
	}

	private keyUpEvent(e: KeyboardEvent): void {
		switch (e.code) {
			case 'KeyW':
			case 'ArrowUp':
				this.throttleForwardKeyPressed = false;
				break;
			case 'KeyS':
			case 'ArrowDown':
				this.throttleBackwardKeyPressed = false;
				break;
			case 'KeyA':
			case 'ArrowLeft':
				this.steerLeftKeyPressed = false;
				break;
			case 'KeyD':
			case 'ArrowRight':
				this.steerRightKeyPressed = false;
				break;
			case 'Space':
				this.controller.drift = false;
				break;
		}
	}

	private updateInputFromKeys(): void {
		this.controller.throttle =
			(this.throttleForwardKeyPressed ? 1 : 0) - (this.throttleBackwardKeyPressed ? 1 : 0);
		this.controller.steer =
			(this.steerRightKeyPressed ? 1 : 0) - (this.steerLeftKeyPressed ? 1 : 0);
	}

	public override enable(): void {
		super.enable();

		this.camera.near = 1;
		this.camera.far = 100000;
		this.camera.updateProjectionMatrix();

		this.shouldSnapCamera = true;
	}

	public override disable(): void {
		super.disable();

		this.throttleForwardKeyPressed = false;
		this.throttleBackwardKeyPressed = false;
		this.steerLeftKeyPressed = false;
		this.steerRightKeyPressed = false;
		this.controller.drift = false;
		this.controller.hopRequested = false;
	}

	public syncWithCamera(prevNavigator: ControlsNavigator): void {
		if (prevNavigator instanceof GroundControlsNavigator) {
			this.controller.position.x = prevNavigator.target.x;
			this.controller.position.z = prevNavigator.target.z;
		} else {
			this.controller.position.x = this.camera.position.x;
			this.controller.position.z = this.camera.position.z;
		}

		this.controller.speed = 0;
		this.shouldSnapCamera = true;
	}

	public syncWithState(state: ControlsState): void {
		this.controller.position.x = state.x;
		this.controller.position.z = state.z;
		this.controller.heading = state.yaw;
		this.controller.speed = 0;
	}

	public getCurrentState(): ControlsState {
		return {
			x: this.controller.position.x,
			z: this.controller.position.z,
			pitch: MathUtils.toRad(20),
			yaw: this.controller.heading,
			distance: 9
		};
	}

	public update(deltaTime: number): void {
		this.updateInputFromKeys();

		const groundHeight = this.terrainHeightProvider.getHeightGlobalInterpolated(
			this.controller.position.x,
			this.controller.position.z,
			true
		);

		this.controller.update(deltaTime, groundHeight, this.collider);

		const ws = this.controller.worldScale;
		// During the start countdown the camera swings around from in front of the kart
		// (Mario Kart's intro pan) to its usual chase position behind it.
		const intro = Easing.easeOutCubic(MathUtils.clamp(this.controller.introProgress, 0, 1));
		const orbitAngle = (1 - intro) * Math.PI;
		const forward = KartController.getForwardVector(this.controller.heading + orbitAngle);

		const desiredCameraPosition = new Vec3(
			this.controller.position.x - forward.x * 9 * ws,
			this.controller.position.y + (4 - 1.5 * (1 - intro)) * ws,
			this.controller.position.z - forward.z * 9 * ws
		);

		if (this.shouldSnapCamera) {
			this.camera.position.set(desiredCameraPosition.x, desiredCameraPosition.y, desiredCameraPosition.z);
			this.shouldSnapCamera = false;
		} else {
			const alpha = 1 - Math.exp(-(intro < 1 ? 10 : 6) * deltaTime);

			this.camera.position.set(
				MathUtils.lerp(this.camera.position.x, desiredCameraPosition.x, alpha),
				MathUtils.lerp(this.camera.position.y, desiredCameraPosition.y, alpha),
				MathUtils.lerp(this.camera.position.z, desiredCameraPosition.z, alpha)
			);
		}

		const lookAtTarget = new Vec3(
			this.controller.position.x,
			this.controller.position.y + 1.5 * ws,
			this.controller.position.z
		);

		this.camera.lookAt(lookAtTarget, false);

		this.camera.updateMatrixWorld();
		this.camera.updateMatrixWorldInverse();
	}
}
