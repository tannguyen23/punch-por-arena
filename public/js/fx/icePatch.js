// Vũng băng trên sân: đĩa phủ lên đất theo địa hình, loang ra lúc mới tạo và mờ dần trước khi tan. Chỗ nào có băng thì
// core/ice.js cho biết (player/iceSlide.js dùng để làm người chơi trượt); ở đây chỉ lo phần hình và thời gian tồn tại.
import { scene } from '../core/scene.js';
import { heightAt } from '../core/terrain.js';
import { addIcePatch, removeIcePatch, clearIcePatches } from '../core/ice.js';
import { ICE } from '../config.js';

const { Mesh, VertexData, StandardMaterial, DynamicTexture, Color3 } = BABYLON;
const { patch: PATCH } = ICE;

const live = new Map(); // id → { mesh, bornAt, endsAt }

// Mặt băng: nền xanh nhạt với các vết nứt trắng toả ra và vài điểm lấp lánh. Vẽ một lần, dùng chung mọi vũng.
function createIceTexture() {
  const size = PATCH.textureSize;
  const tex = new DynamicTexture('iceTex', size, scene);
  const ctx = tex.getContext();
  const sky = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  sky.addColorStop(0, '#e8f8ff');
  sky.addColorStop(1, '#a9dcf5');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  for (let n = 0; n < 28; n++) {
    let x = size / 2 + (Math.random() - 0.5) * size * 0.3;
    let y = size / 2 + (Math.random() - 0.5) * size * 0.3;
    let angle = Math.random() * Math.PI * 2;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + Math.random() * 0.4})`;
    ctx.lineWidth = 1 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let step = 0; step < 6; step++) {
      angle += (Math.random() - 0.5) * 1.1;
      x += Math.cos(angle) * size * 0.07;
      y += Math.sin(angle) * size * 0.07;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  for (let n = 0; n < 40; n++) ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  tex.update();
  return tex;
}

let material = null;
function iceMaterial() {
  if (material) return material;
  material = new StandardMaterial('ice', scene);
  material.diffuseTexture = createIceTexture();
  material.diffuseColor = Color3.White();
  material.emissiveColor = new Color3(0.22, 0.38, 0.5); // vẫn sáng ở chỗ khuất nắng
  material.specularColor = new Color3(0.9, 0.95, 1);
  material.specularPower = 64;
  material.backFaceCulling = false;
  material.zOffset = -2; // nằm đè lên đất, không nhấp nháy (z-fighting)
  return material;
}

// Đĩa gồm một đỉnh ở tâm và `rings` vòng đỉnh quanh nó. Đỉnh x, z tính từ tâm (mesh đặt ở tâm), y là độ cao tuyệt đối của đất tại đó;
// alpha giữ đặc tới gần mép rồi mờ dần.
function buildDisc(name, cx, cz, radius) {
  const { rings, segments } = PATCH;
  const count = 1 + rings * segments;
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const colors = new Float32Array(count * 4);
  const normals = new Float32Array(count * 3);
  const span = radius * 2 * PATCH.textureScale;
  const setVertex = (n, dx, dz, t) => {
    const smooth = Math.max(0, (t - 0.6) / 0.4);
    const alpha = PATCH.centerAlpha + (PATCH.edgeAlpha - PATCH.centerAlpha) * smooth * smooth * (3 - 2 * smooth);
    positions.set([dx, heightAt(cx + dx, cz + dz) + PATCH.lift, dz], n * 3);
    uvs.set([dx / span + 0.5, dz / span + 0.5], n * 2);
    colors.set([1, 1, 1, alpha], n * 4);
    normals.set([0, 1, 0], n * 3);
  };
  setVertex(0, 0, 0, 0);
  for (let ring = 1; ring <= rings; ring++) {
    const t = ring / rings;
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      setVertex(1 + (ring - 1) * segments + s, Math.cos(angle) * radius * t, Math.sin(angle) * radius * t, t);
    }
  }

  const indices = [];
  const at = (ring, s) => 1 + (ring - 1) * segments + (s % segments);
  for (let s = 0; s < segments; s++) indices.push(0, at(1, s), at(1, s + 1));
  for (let ring = 1; ring < rings; ring++) {
    for (let s = 0; s < segments; s++) {
      indices.push(at(ring, s), at(ring + 1, s), at(ring, s + 1), at(ring, s + 1), at(ring + 1, s), at(ring + 1, s + 1));
    }
  }

  const data = new VertexData();
  Object.assign(data, { positions, indices, normals, uvs, colors });
  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh);
  mesh.hasVertexAlpha = true;
  mesh.material = iceMaterial();
  mesh.isPickable = false;
  mesh.position.set(cx, 0, cz);
  return mesh;
}

// Vũng băng mới do server báo: { id, at: [x, y, z], r, life (ms) }.
export function spawnIce({ id, at, r, life }) {
  const [x, , z] = at;
  const now = performance.now();
  const endsAt = now + life;
  addIcePatch({ id, x, z, r, endsAt });
  live.set(id, { mesh: buildDisc(`ice${id}`, x, z, r), bornAt: now, endsAt });
}

function remove(id) {
  live.get(id)?.mesh.dispose();
  live.delete(id);
  removeIcePatch(id);
}

export function clearIce() {
  for (const id of [...live.keys()]) remove(id);
  clearIcePatches();
}

// Loang ra lúc mới tạo, mờ dần khi sắp tan, huỷ khi hết giờ.
export function updateIce() {
  const now = performance.now();
  for (const [id, patch] of live) {
    const remaining = patch.endsAt - now;
    if (remaining <= 0) {
      remove(id);
      continue;
    }
    const grow = Math.min(1, (now - patch.bornAt) / 1000 / PATCH.growTime);
    const size = 0.35 + 0.65 * (1 - (1 - grow) * (1 - grow));
    patch.mesh.scaling.set(size, 1, size);
    patch.mesh.visibility = Math.min(1, remaining / 1000 / PATCH.fadeTime);
  }
}
