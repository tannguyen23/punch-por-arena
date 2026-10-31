import { scene } from '../core/scene.js';
import { state, remotes } from '../state.js';
import { SHIELD_FX } from '../config.js';
import * as Fx from './effects.js';

const { MeshBuilder, StandardMaterial, Color3, TransformNode, Mesh } = BABYLON;

// Khiên xanh xoay quanh người uống thuốc giảm sát thương súng (server: `gunDamageMult` trong potions.js, hiện là khổng lồ). Mỗi người có khiên là một
// "rig" (TransformNode + vài tấm instance của một mesh nguồn chung, material alpha cố định) lấy từ pool, xong thì tắt chứ không huỷ (quy tắc 16, 17).
// Rig KHÔNG làm con của nhân vật: dispose(false, true) nhân vật sẽ huỷ luôn material dùng chung của các tấm; thay vào đó mỗi khung bám theo vị trí và cỡ người.
const active = new Map(); // id → { rig, frame, pulse }
const pool = [];
let frame = 0;
let time = 0;

function createPanel() {
  const { radius, height, arc, color, alpha } = SHIELD_FX;
  const panel = MeshBuilder.CreateCylinder('giantShield', { height, diameter: radius * 2, tessellation: 18, arc, enclose: false, cap: Mesh.NO_CAP, sideOrientation: Mesh.DOUBLESIDE }, scene);
  const mat = new StandardMaterial('giantShieldMat', scene);
  mat.emissiveColor = new Color3(...color);
  mat.disableLighting = true;
  mat.alpha = alpha; // cố định, không đổi theo thời gian (quy tắc 12, 16)
  mat.backFaceCulling = false;
  panel.material = mat;
  return panel;
}

function createRig() {
  const rig = new TransformNode('giantShieldRig', scene);
  for (let i = 0; i < SHIELD_FX.count; i++) {
    const panel = Fx.instanceOf('giantShield', createPanel);
    panel.parent = rig;
    panel.rotation.y = (i * Math.PI * 2) / SHIELD_FX.count;
    panel.isPickable = false;
  }
  return rig;
}

function acquire() {
  const rig = pool.pop() ?? createRig();
  rig.setEnabled(true);
  return rig;
}

function release(rig) {
  rig.setEnabled(false);
  pool.push(rig);
}

const hasShield = (r) => (state.potionTypes[r.potion]?.gunDamageMult ?? 1) < 1;

// Dùng thử một lần ở chỗ không ai thấy lúc vào phòng (fx/warmup.js) để shader biên dịch trước.
export function prepareGiantShield(y) {
  const rig = acquire();
  rig.position.set(0, y, 0);
  setTimeout(() => release(rig), 500);
}

// Súng bắn trúng người có khiên: khiên phình ra một nhịp.
export function pulseShield(id) {
  const entry = active.get(id);
  if (entry) entry.pulse = 1;
}

export function updateGiantShields(dt) {
  frame++;
  time += dt;
  for (const [id, r] of remotes) {
    if (r.dead || !hasShield(r)) continue;
    let entry = active.get(id);
    if (!entry) {
      entry = { rig: acquire(), frame, pulse: 0 };
      active.set(id, entry);
    }
    entry.frame = frame;
    entry.pulse = Math.max(0, entry.pulse - dt * 4);
    const size = (r.size ?? 1) * (1 + SHIELD_FX.pulse * entry.pulse);
    const { rig } = entry;
    rig.position.set(r.root.position.x, r.root.position.y + (SHIELD_FX.centerY + Math.sin(time * 2 + (Number(id) || 0)) * SHIELD_FX.bob) * (r.size ?? 1), r.root.position.z);
    rig.scaling.setAll(size);
    rig.rotation.y = time * SHIELD_FX.spin + (Number(id) || 0);
  }
  for (const [id, entry] of active) {
    if (entry.frame === frame) continue; // hết thuốc / chết / rời phòng: trả rig về pool
    release(entry.rig);
    active.delete(id);
  }
}
