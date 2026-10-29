// Sét: server báo trước chỗ đánh (tin nhắn 'lightning') rồi tự trừ máu khi tới giờ. Ở đây vẽ vòng cảnh báo + cột sáng mờ
// trong thời gian báo trước, rồi tia sét gấp khúc, trời loé sáng và tiếng sấm tới trễ theo khoảng cách.
import { scene } from '../core/scene.js';
import { state } from '../state.js';
import { LIGHTNING_FX } from '../config.js';
import { skyFlash } from './weather.js';
import * as Fx from './effects.js';
import * as Sfx from '../audio/sfx.js';

const { MeshBuilder, StandardMaterial, Color3, Vector3 } = BABYLON;

const WARN_COLOR = new Color3(1, 0.9, 0.35);
const BOLT_COLOR = new Color3(0.85, 0.9, 1);
const BEAM_HEIGHT = 8; // cột sáng cảnh báo cao ngần này, thấy được cả trên dốc

const pending = new Map(); // id → { at: [x, y, z], left (giây), total, parts: [mesh], mat }

function glow(color, alpha) {
  const mat = new StandardMaterial('lightning', scene);
  mat.emissiveColor = color;
  mat.disableLighting = true;
  mat.alpha = alpha;
  return mat;
}

function warningMarks([x, y, z], r, mat) {
  const ring = MeshBuilder.CreateTorus('strikeRing', { diameter: r * 2, thickness: 0.12, tessellation: 40 }, scene);
  ring.position.set(x, y + 0.15, z);
  const beam = MeshBuilder.CreateCylinder('strikeBeam', { diameter: r * 2, height: BEAM_HEIGHT, tessellation: 24 }, scene);
  beam.position.set(x, y + BEAM_HEIGHT / 2, z);
  beam.material = mat;
  ring.material = mat;
  return [ring, beam];
}

// Tin nhắn 'lightning' { id, at, in, r }: sẽ đánh xuống `at` sau `in` mili giây.
export function warnStrike({ id, at, in: inMs, r }) {
  const mat = glow(WARN_COLOR, 0.2);
  pending.set(id, { at, left: inMs / 1000, total: inMs / 1000, parts: warningMarks(at, r, mat), mat });
  Sfx.at('crackle', at[0], at[2], state.me.x, state.me.z, state.yaw);
}

function removePending(id) {
  const s = pending.get(id);
  s.parts.forEach((mesh) => mesh.dispose());
  s.mat.dispose();
  pending.delete(id);
}

// Đường gấp khúc từ trên trời xuống, lệch ngang nhiều ở trên, ít dần khi gần mặt đất.
function boltPath([x, y, z]) {
  const { boltSegments: n, boltHeight, boltJitter } = LIGHTNING_FX;
  const path = [];
  for (let i = 0; i <= n; i++) {
    const k = 1 - i / n; // 1 ở trên trời, 0 ở mặt đất
    const j = i === n ? 0 : boltJitter * k;
    path.push(new Vector3(x + (Math.random() * 2 - 1) * j, y + boltHeight * k, z + (Math.random() * 2 - 1) * j));
  }
  return path;
}

function bolt(at) {
  const mat = glow(BOLT_COLOR, 1);
  const mesh = MeshBuilder.CreateTube('bolt', { path: boltPath(at), radius: LIGHTNING_FX.boltRadius, tessellation: 5 }, scene);
  mesh.material = mat;
  Fx.track({
    mesh,
    ownMaterial: true,
    life: LIGHTNING_FX.boltLife,
    max: LIGHTNING_FX.boltLife,
    step(dt, k) {
      mat.alpha = Math.random() < 0.3 ? 0.3 : 1 - k; // chập chờn
    },
  });
  Fx.burst(at[0], at[1] + 0.2, at[2], 18, 1.6);
  Fx.flash(at[0], at[1] + 1, at[2], 3);
}

function strike(at) {
  bolt(at);
  skyFlash();
  const [x, y, z] = at;
  const dist = Math.hypot(x - state.me.x, y - state.me.y, z - state.me.z);
  const { pan } = Sfx.levelsAt(x, z, state.me.x, state.me.z, state.yaw, dist);
  Sfx.thunder(pan, 1 / (1 + 0.02 * dist), dist / LIGHTNING_FX.speedOfSound); // sấm vang xa hơn tiếng thường
  if (dist < LIGHTNING_FX.shakeRange) state.shake = Math.max(state.shake, LIGHTNING_FX.shake * (1 - dist / LIGHTNING_FX.shakeRange));
}

// Trời tạnh / đổi pha: bỏ các vòng cảnh báo (server cũng bỏ các tia chưa đánh).
export function clearStrikes() {
  for (const id of [...pending.keys()]) removePending(id);
}

export function updateLightning(dt) {
  for (const [id, s] of pending) {
    s.left -= dt;
    if (s.left <= 0) {
      removePending(id);
      strike(s.at);
      continue;
    }
    const k = 1 - s.left / s.total;
    s.mat.alpha = 0.12 + 0.25 * k * (0.6 + 0.4 * Math.sin(k * 40)); // nhấp nháy nhanh dần
  }
}
