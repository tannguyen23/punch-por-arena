import { scene } from '../core/scene.js';
import { heightAt } from '../core/terrain.js';
import { duelOf } from '../core/duel.js';
import { state } from '../state.js';
import { DUEL_ZONE } from '../config.js';

const { Color3, DynamicTexture, Mesh, MeshBuilder, StandardMaterial } = BABYLON;

// Vòng bo kiểu PUBG của sự kiện solo: bức tường năng lượng xanh trong suốt cao `height` mét bao quanh võ đài ở đúng bán kính `ring.leash`
// (ranh giới người xem không đi qua được, server kiểm tra ở duelRing.js, máy mình chặn ở player/duelZone.js), kèm vòng sáng trên mặt đất.
// Hiện ra thu dần từ ngoài vào khi sự kiện bắt đầu, lấp lánh nhẹ, tan đi khi sự kiện kết thúc.

let root = null;
let wall = null;
let edge = null;
let tex = null;
let builtFor = null; // `state.ring` đã dựng vòng bo; map đổi thì dựng lại
let amount = 0; // 0 = ẩn, 1 = hiện đủ
let clock = 0;

const rgb = (hex) => Color3.FromHexString(hex);

// Tường: trong suốt dần lên đỉnh, đậm ở chân, có vạch dọc chạy ngang để thấy chuyển động.
function wallTexture() {
  const texture = new DynamicTexture('zoneWall', { width: 256, height: 256 }, scene, true);
  texture.hasAlpha = true;
  const c = rgb(DUEL_ZONE.color);
  const [r, g, b] = [c.r, c.g, c.b].map((v) => Math.round(v * 255));
  const ctx = texture.getContext();
  const fade = ctx.createLinearGradient(0, 0, 0, 256);
  fade.addColorStop(0, `rgba(${r},${g},${b},0)`);
  fade.addColorStop(0.65, `rgba(${r},${g},${b},0.3)`);
  fade.addColorStop(1, `rgba(${r},${g},${b},0.75)`);
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
  for (let x = 0; x < 256; x += 64) ctx.fillRect(x, 0, 3, 256);
  texture.update();
  texture.uScale = DUEL_ZONE.repeat;
  return texture;
}

function rebuild(ring) {
  root?.dispose(false, true); // vật liệu và texture của vòng bo là của riêng nó nên huỷ theo
  tex?.dispose();
  const { height, tessellation, edgeThickness } = DUEL_ZONE;
  const base = heightAt(ring.x, ring.z);
  root = new BABYLON.TransformNode('ringZone', scene);
  root.position.set(ring.x, base, ring.z);

  tex = wallTexture();
  const wallMaterial = new StandardMaterial('zoneWall', scene);
  wallMaterial.emissiveTexture = tex;
  wallMaterial.opacityTexture = tex;
  wallMaterial.disableLighting = true;
  wallMaterial.backFaceCulling = false;
  wall = MeshBuilder.CreateCylinder('zoneWall', { diameter: ring.leash * 2, height, tessellation, cap: Mesh.NO_CAP, sideOrientation: Mesh.DOUBLESIDE }, scene);
  wall.material = wallMaterial;
  wall.parent = root;
  wall.position.y = height / 2 - 2; // chân tường chôn xuống đất cho khỏi hở khi đất lồi lõm
  wall.isPickable = false;

  const edgeMaterial = new StandardMaterial('zoneEdge', scene);
  edgeMaterial.emissiveColor = rgb(DUEL_ZONE.edgeColor);
  edgeMaterial.disableLighting = true;
  edge = MeshBuilder.CreateTorus('zoneEdge', { diameter: ring.leash * 2, thickness: edgeThickness, tessellation }, scene);
  edge.material = edgeMaterial;
  edge.parent = root;
  edge.position.y = 0.12;
  edge.isPickable = false;

  builtFor = ring;
  amount = 0;
}

// Gọi mỗi khung hình.
export function updateRingZone(dt) {
  const ring = state.ring;
  if (!ring) return;
  if (builtFor !== ring) rebuild(ring);

  const wanted = duelOf() !== null;
  amount = Math.max(0, Math.min(1, amount + dt / (wanted ? DUEL_ZONE.fadeSeconds : -DUEL_ZONE.fadeSeconds)));
  root.setEnabled(amount > 0);
  if (amount === 0) return;

  clock += dt;
  tex.uOffset += dt * DUEL_ZONE.scroll;
  const pulse = 1 - DUEL_ZONE.pulse * (0.5 + 0.5 * Math.sin(clock * 2.2));
  wall.visibility = amount * pulse;
  edge.visibility = amount;
  const shrink = 1 + (1 - amount) * (DUEL_ZONE.shrinkFrom - 1); // vòng bo thu dần từ ngoài vào
  root.scaling.set(shrink, 1, shrink);
}
