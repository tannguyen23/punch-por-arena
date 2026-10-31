// Sét: server báo trước chỗ đánh (tin nhắn 'lightning') rồi tự trừ máu khi tới giờ. Không vẽ vòng / cột cảnh báo dưới đất
// (chỉ còn tiếng lách tách), tới giờ thì vẽ tia sét gấp khúc, trời loé sáng và tiếng sấm tới trễ theo khoảng cách.
import { scene } from '../core/scene.js';
import { state } from '../state.js';
import { LIGHTNING_FX } from '../config.js';
import { skyFlash } from './weather.js';
import * as Fx from './effects.js';
import * as Sfx from '../audio/sfx.js';

const { MeshBuilder, StandardMaterial, Color3, Vector3 } = BABYLON;

const BOLT_COLOR = new Color3(0.85, 0.9, 1);

const pending = new Map(); // id → { at: [x, y, z], left (giây) }

// Một material cho mọi tia, alpha cố định 1 (đổi alpha qua ngưỡng 1 làm shader biên dịch lại: quy tắc 12). Chập chờn và mờ dần bằng co giãn.
let boltMaterial = null;
function glow() {
  if (!boltMaterial) {
    boltMaterial = new StandardMaterial('lightning', scene);
    boltMaterial.emissiveColor = BOLT_COLOR;
    boltMaterial.disableLighting = true;
  }
  return boltMaterial;
}

// Tin nhắn 'lightning' { id, at, in }: sẽ đánh xuống `at` sau `in` mili giây (chỉ phát tiếng lách tách báo trước).
export function warnStrike({ id, at, in: inMs }) {
  pending.set(id, { at, left: inMs / 1000 });
  Sfx.at('crackle', at[0], at[2], state.me.x, state.me.z, state.yaw);
}

// Đường gấp khúc từ trên trời xuống, toạ độ so với chân tia (0, 0, 0), lệch ngang nhiều ở trên, ít dần khi gần mặt đất.
function boltPath() {
  const { boltSegments: n, boltHeight, boltJitter } = LIGHTNING_FX;
  const path = [];
  for (let i = 0; i <= n; i++) {
    const k = 1 - i / n; // 1 ở trên trời, 0 ở mặt đất
    const j = i === n ? 0 : boltJitter * k;
    path.push(new Vector3((Math.random() * 2 - 1) * j, boltHeight * k, (Math.random() * 2 - 1) * j));
  }
  return path;
}

// Vài hình tia khác nhau dựng sẵn (mỗi hình một mesh nguồn), mỗi tia là instance của một hình, xoay ngẫu nhiên quanh trục đứng cho khỏi lặp.
// Không dựng ống mới mỗi tia (quy tắc 16).
function createBolt() {
  const mesh = MeshBuilder.CreateTube('bolt', { path: boltPath(), radius: LIGHTNING_FX.boltRadius, tessellation: 5 }, scene);
  mesh.material = glow();
  return mesh;
}

function bolt([x, y, z]) {
  const mesh = Fx.instanceOf('bolt:' + Math.floor(Math.random() * LIGHTNING_FX.boltVariants), createBolt);
  mesh.position.set(x, y, z);
  mesh.rotation.y = Math.random() * Math.PI * 2;
  Fx.track({
    mesh,
    life: LIGHTNING_FX.boltLife,
    max: LIGHTNING_FX.boltLife,
    step(dt, k) {
      const width = Math.max(1 - k, 0.001) * (Math.random() < 0.3 ? 0.35 : 1); // chập chờn, mảnh dần
      mesh.scaling.set(width, 1, width);
    },
  });
  Fx.burst(x, y + 0.2, z, 18, 1.6);
  Fx.flash(x, y + 1, z, 3);
}

// Dùng thử một tia dưới đất rất xa lúc vào phòng (fx/warmup.js) để shader biên dịch trước tia đầu tiên của trận.
export function prepareLightning(y) {
  bolt([0, y, 0]);
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

// Trời tạnh / đổi pha / sự kiện solo: bỏ các tia đang chờ (server cũng bỏ các tia chưa đánh).
export function clearStrikes() {
  pending.clear();
}

export function updateLightning(dt) {
  for (const [id, s] of pending) {
    s.left -= dt;
    if (s.left <= 0) {
      pending.delete(id);
      strike(s.at);
    }
  }
}
