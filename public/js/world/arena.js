import { scene, solidMaterial } from '../core/scene.js';
import { state } from '../state.js';
import { setTerrain } from '../core/terrain.js';
import { createGround } from './ground.js';
import { createWater } from './water.js';
import { createBridge } from './bridges.js';
import { createProp } from './props.js';
import { createWall } from './walls.js';

const { Color3, MeshBuilder } = BABYLON;

const BOUNDARY_HEIGHT = 18; // đủ cao để che cả những ngọn đồi sát mép sân
const BOUNDARY_BASE = -3;

function createBoundary(size) {
  const wallMat = solidMaterial(new Color3(0.6, 0.55, 0.5));
  [[0, size, size * 2, 0.5], [0, -size, size * 2, 0.5], [size, 0, 0.5, size * 2], [-size, 0, 0.5, size * 2]]
    .forEach(([x, z, w, d]) => {
      const wall = MeshBuilder.CreateBox('wall', { width: w, height: BOUNDARY_HEIGHT, depth: d }, scene);
      wall.position.set(x, BOUNDARY_BASE + BOUNDARY_HEIGHT / 2, z);
      wall.material = wallMat;
    });
}

let water = null;

// Gọi mỗi khung hình để nước trôi.
export function updateWater(dt) {
  water?.update(dt);
}

// map: { size, ground, terrain, walls, props } do server gửi trong 'welcome'.
export function buildArena(map) {
  state.arena = map.size;
  state.colliders = map.props.filter((p) => p.r > 0);
  state.walls = map.walls;
  setTerrain(map.terrain); // phải có trước khi đặt tường, vật phẩm lên mặt đất
  createGround(map.terrain, map.ground);
  water = createWater(map.terrain);
  createBoundary(map.size);
  map.terrain.bridges.forEach(createBridge);
  map.walls.forEach(createWall);
  map.props.forEach(createProp);
}
