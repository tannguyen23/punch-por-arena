import { scene } from '../core/scene.js';
import { colorMaterial } from '../core/meshes.js';

const ROCK = '#665b61';

export function createFloatingIslands(islands, parent) {
  for (const island of islands) {
    const upper = BABYLON.MeshBuilder.CreateCylinder('island-rock', {
      diameterTop: island.radius * 1.94,
      diameterBottom: island.radius * 1.48,
      height: 3.2,
      tessellation: 24,
    }, scene);
    upper.parent = parent;
    upper.position.set(island.x, island.y - 1.75, island.z);
    upper.material = colorMaterial(ROCK);

    const lower = BABYLON.MeshBuilder.CreateCylinder('island-rock-point', {
      diameterTop: island.radius * 1.48,
      diameterBottom: island.radius * 0.12,
      height: 3.4,
      tessellation: 24,
    }, scene);
    lower.parent = parent;
    lower.position.set(island.x, island.y - 5.05, island.z);
    lower.material = upper.material;
  }
}
