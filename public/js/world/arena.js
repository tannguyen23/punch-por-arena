import { scene, solidMaterial } from '../core/scene.js';
import { state } from '../state.js';
import { setTerrain } from '../core/terrain.js';
import { createGround } from './ground.js';
import { createWater } from './water.js';
import { createBridge } from './bridges.js';
import { createFloatingBridges } from './floatingBridges.js';
import { createFloatingIslands } from './floatingIslands.js';
import { createProp } from './props.js';
import { createWall } from './walls.js';

const { Color3, MeshBuilder, TransformNode } = BABYLON;

const BOUNDARY_HEIGHT = 18; // đủ cao để che cả những ngọn đồi sát mép sân
const BOUNDARY_BASE = -3;

function createBoundary(size, parent) {
  const wallMat = solidMaterial(new Color3(0.6, 0.55, 0.5));
  boundaryMaterial = wallMat;
  [[0, size, size * 2, 0.5], [0, -size, size * 2, 0.5], [size, 0, 0.5, size * 2], [-size, 0, 0.5, size * 2]]
    .forEach(([x, z, w, d]) => {
      const wall = MeshBuilder.CreateBox('wall', { width: w, height: BOUNDARY_HEIGHT, depth: d }, scene);
      wall.parent = parent;
      wall.position.set(x, BOUNDARY_BASE + BOUNDARY_HEIGHT / 2, z);
      wall.material = wallMat;
    });
}

let water = null;
let arenaRoot = null;
let ground = null;
let boundaryMaterial = null;

// Gọi mỗi khung hình để nước trôi.
export function updateWater(dt) {
  water?.update(dt);
}

// map: { size, ground, terrain, walls, props } do server gửi trong 'welcome'.
export function buildArena(map) {
  water?.dispose();
  ground?.material?.dispose(false, true);
  boundaryMaterial?.dispose(false, true);
  arenaRoot?.dispose(false, false);
  arenaRoot = new TransformNode('arena', scene);
  state.arena = map.size;
  state.colliders = map.props.filter((p) => p.r > 0);
  state.walls = map.walls;
  state.ring = map.ring;
  setTerrain(map.terrain); // phải có trước khi đặt tường, vật phẩm lên mặt đất
  ground = createGround(map.terrain, map.ground, arenaRoot);
  water = map.terrain.floating ? null : createWater(map.terrain, arenaRoot);
  if (map.boundary !== false) createBoundary(map.size, arenaRoot);
  else {
    createFloatingIslands(map.terrain.islands, arenaRoot);
    createFloatingBridges(map.terrain.bridges.filter((bridge) => bridge.floating), arenaRoot);
  }
  map.terrain.bridges.filter((bridge) => !bridge.floating).forEach((bridge) => createBridge(bridge, arenaRoot));
  map.walls.forEach((wall) => createWall(wall, arenaRoot));
  map.props.forEach((prop) => createProp(prop, arenaRoot));
}
