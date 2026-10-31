import { scene, solidMaterial } from './scene.js';
import { MESH_DETAIL } from '../config.js';

const { MeshBuilder } = BABYLON;

export function part(mesh, parent, x, y, z, material) {
  mesh.parent = parent;
  mesh.position.set(x, y, z);
  mesh.material = material;
  return mesh;
}

export const box = (w, h, d, targetScene = scene) =>
  MeshBuilder.CreateBox('box', { width: w, height: h, depth: d }, targetScene);
export const ball = (d, targetScene = scene, segments = MESH_DETAIL.ballSegments) =>
  MeshBuilder.CreateSphere('ball', { diameter: d, segments }, targetScene);
// diameterTop = 0 cho hình nón.
export const cylinder = (diameterTop, diameterBottom, height, targetScene = scene) =>
  MeshBuilder.CreateCylinder('cyl', { diameterTop, diameterBottom, height, tessellation: 10 }, targetScene);

// Material trơn theo màu, dùng chung cho mọi mesh cùng màu (sân có hàng trăm vật thể tĩnh).
const colorMaterials = new Map();
export function colorMaterial(hex) {
  if (!colorMaterials.has(hex)) colorMaterials.set(hex, solidMaterial(BABYLON.Color3.FromHexString(hex)));
  return colorMaterials.get(hex);
}
