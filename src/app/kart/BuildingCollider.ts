import Tile from "~/app/objects/Tile";
import TileSystem from "~/app/systems/TileSystem";
import MathUtils from "~/lib/math/MathUtils";
import Config from "~/app/Config";

const TileZoom = 16;
const GridSize = 32;
const MinTriangleArea = 0.01;

type TileGrid = number[][];

// Answers "is there a building at (x, z)?" using the extruded (building) meshes that
// every loaded tile already keeps on the CPU. Triangles are projected onto the ground
// plane and bucketed into a per-tile grid the first time a tile is queried.
export default class BuildingCollider {
	private readonly tileSystem: TileSystem;
	private readonly grids: WeakMap<Tile, TileGrid> = new WeakMap();

	public constructor(tileSystem: TileSystem) {
		this.tileSystem = tileSystem;
	}

	private static buildGrid(positions: Float32Array): TileGrid {
		const grid: TileGrid = new Array(GridSize * GridSize);
		const cellSize = Config.TileSize / GridSize;

		for (let t = 0; t < positions.length; t += 9) {
			const x0 = positions[t];
			const z0 = positions[t + 2];
			const x1 = positions[t + 3];
			const z1 = positions[t + 5];
			const x2 = positions[t + 6];
			const z2 = positions[t + 8];
			const area = (x1 - x0) * (z2 - z0) - (x2 - x0) * (z1 - z0);

			if (Math.abs(area) < MinTriangleArea) {
				continue;
			}

			const minCellX = MathUtils.clamp(Math.floor(Math.min(x0, x1, x2) / cellSize), 0, GridSize - 1);
			const maxCellX = MathUtils.clamp(Math.floor(Math.max(x0, x1, x2) / cellSize), 0, GridSize - 1);
			const minCellZ = MathUtils.clamp(Math.floor(Math.min(z0, z1, z2) / cellSize), 0, GridSize - 1);
			const maxCellZ = MathUtils.clamp(Math.floor(Math.max(z0, z1, z2) / cellSize), 0, GridSize - 1);

			for (let cz = minCellZ; cz <= maxCellZ; cz++) {
				for (let cx = minCellX; cx <= maxCellX; cx++) {
					const index = cz * GridSize + cx;

					if (!grid[index]) {
						grid[index] = [];
					}

					grid[index].push(t);
				}
			}
		}

		return grid;
	}

	private getGrid(tile: Tile): TileGrid {
		let grid = this.grids.get(tile);

		if (!grid) {
			grid = BuildingCollider.buildGrid(tile.extrudedMesh.positionBuffer);
			this.grids.set(tile, grid);
		}

		return grid;
	}

	private static isPointInTriangle(
		px: number, pz: number,
		x0: number, z0: number,
		x1: number, z1: number,
		x2: number, z2: number
	): boolean {
		const d0 = (x1 - x0) * (pz - z0) - (z1 - z0) * (px - x0);
		const d1 = (x2 - x1) * (pz - z1) - (z2 - z1) * (px - x1);
		const d2 = (x0 - x2) * (pz - z2) - (z0 - z2) * (px - x2);
		const hasNegative = d0 < 0 || d1 < 0 || d2 < 0;
		const hasPositive = d0 > 0 || d1 > 0 || d2 > 0;

		return !(hasNegative && hasPositive);
	}

	public isBlocked(x: number, z: number): boolean {
		const tilePosition = MathUtils.meters2tile(x, z, TileZoom);
		const tile = this.tileSystem.getTile(Math.floor(tilePosition.x), Math.floor(tilePosition.y));

		if (!tile || !tile.extrudedMesh) {
			return false;
		}

		const localX = x - tile.position.x;
		const localZ = z - tile.position.z;
		const cellSize = Config.TileSize / GridSize;
		const cellX = Math.floor(localX / cellSize);
		const cellZ = Math.floor(localZ / cellSize);

		if (cellX < 0 || cellZ < 0 || cellX >= GridSize || cellZ >= GridSize) {
			return false;
		}

		const cell = this.getGrid(tile)[cellZ * GridSize + cellX];

		if (!cell) {
			return false;
		}

		const positions = tile.extrudedMesh.positionBuffer;

		for (const t of cell) {
			if (BuildingCollider.isPointInTriangle(
				localX, localZ,
				positions[t], positions[t + 2],
				positions[t + 3], positions[t + 5],
				positions[t + 6], positions[t + 8]
			)) {
				return true;
			}
		}

		return false;
	}
}
