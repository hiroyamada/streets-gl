import {OverpassEndpoint} from "~/app/systems/TileLoadingSystem";

export default interface UIActions {
	updateRenderGraph: () => void;
	goToState: (lat: number, lon: number, pitch: number, yaw: number, distance: number) => void;
	lookAtNorth: () => void;
	resetSettings: () => void;
	setOverpassEndpoints: (endpoints: OverpassEndpoint[]) => void;
	resetOverpassEndpoints: () => void;
	getControlsStateHash: () => string;
}