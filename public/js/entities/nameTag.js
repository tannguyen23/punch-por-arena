import { scene } from '../core/scene.js';

const { MeshBuilder, StandardMaterial } = BABYLON;

// Bảng tên luôn quay về phía camera, đặt trong node `parent` (cùng node với thanh máu).
export function createNameTag(name, parent) {
  const tex = new BABYLON.DynamicTexture('nameTex', { width: 512, height: 96 }, scene, true);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.strokeText(name, 256, 48, 500);
  ctx.fillStyle = '#fff';
  ctx.fillText(name, 256, 48, 500);
  tex.update();

  const mat = new StandardMaterial('nameMat', scene);
  mat.emissiveTexture = tex;
  mat.opacityTexture = tex;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  const plane = MeshBuilder.CreatePlane('nameTag', { width: 1.6, height: 0.3 }, scene);
  plane.parent = parent;
  plane.position.set(0, 0.22, -0.01);
  plane.material = mat;
}
