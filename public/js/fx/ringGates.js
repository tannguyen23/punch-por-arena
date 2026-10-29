import { scene } from '../core/scene.js';
import { heightAt } from '../core/terrain.js';
import { duelOf } from '../core/duel.js';
import { part, box, colorMaterial as mat } from '../core/meshes.js';
import { state } from '../state.js';
import { RING_GATE } from '../config.js';
import * as Sfx from '../audio/sfx.js';

// Cổng khoá võ đài trong sự kiện solo (server/game/duelEvent.js): hai lối vào ở cạnh bắc / nam (`ring.gate` mét) được chặn bằng
// cổng song sắt hạ từ trên xuống ngay khi hết phần đọc luật, và kéo lên khi sự kiện kết thúc. Cổng đóng hẳn thì chặn đường như tường
// (vị trí do client quyết định, xem player/collision.js); server vẫn tự nhốt võ sĩ phòng khi client gian lận.

let root = null;
let gates = []; // [{ node, x, z, wall }]
let builtFor = null; // `state.ring` đã dựng cổng; map đổi thì dựng lại
let amount = 0; // 0 = mở (kéo lên khuất), 1 = đã hạ xuống đóng kín
let solid = false; // các cổng đang nằm trong `state.walls`

function buildGate(parent, width) {
  const { height, depth, barGap, railHeight, colors } = RING_GATE;
  const node = new BABYLON.TransformNode('ringGate', scene);
  node.parent = parent;
  for (const y of [railHeight / 2, height / 2, height - railHeight / 2]) part(box(width, railHeight, depth), node, 0, y, 0, mat(colors.frame));
  const bars = Math.round(width / barGap);
  for (let i = 0; i < bars; i++) part(box(0.06, height, 0.06), node, -width / 2 + ((i + 0.5) * width) / bars, height / 2, 0, mat(colors.bar));
  // ổ khoá ở giữa cổng: thân + quai
  part(box(0.34, 0.3, 0.14), node, 0, height / 2, depth / 2 + 0.05, mat(colors.lock));
  part(box(0.2, 0.18, 0.06), node, 0, height / 2 + 0.22, depth / 2 + 0.05, mat(colors.lock));
  return node;
}

function rebuild(ring) {
  root?.dispose(); // không huỷ material: cả sân dùng chung (core/meshes.js)
  root = new BABYLON.TransformNode('ringGates', scene);
  gates = [ring.z - ring.half, ring.z + ring.half].map((z) => ({
    node: buildGate(root, ring.gate),
    x: ring.x,
    z,
    wall: { x: ring.x, z, w: ring.gate, d: RING_GATE.depth },
  }));
  builtFor = ring;
  amount = 0;
  solid = false;
}

function setSolid(on) {
  if (on === solid) return;
  solid = on;
  const walls = gates.map((g) => g.wall);
  state.walls = on ? [...state.walls, ...walls] : state.walls.filter((w) => !walls.includes(w));
}

// Gọi mỗi khung hình.
export function updateRingGates(dt) {
  const ring = state.ring;
  if (!ring) return;
  if (builtFor !== ring) rebuild(ring);

  const duel = duelOf();
  const wanted = duel !== null && duel.stage !== 'intro';
  const before = amount;
  amount = Math.max(0, Math.min(1, amount + dt / (wanted ? RING_GATE.closeSeconds : -RING_GATE.openSeconds)));
  if (before < 1 && amount === 1) Sfx.thud(0, 1.4); // cổng sập xuống
  setSolid(amount === 1);

  root.setEnabled(amount > 0);
  const lift = (1 - amount * amount) * RING_GATE.lift; // hạ nhanh dần như rơi, kéo lên đều
  for (const g of gates) g.node.position.set(g.x, heightAt(g.x, g.z) + lift, g.z);
}
