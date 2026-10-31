import { scene, solidMaterial } from '../core/scene.js';
import { state } from '../state.js';
import { groundAt } from '../core/terrain.js';
import { JUMP_AIR_TIME, AIRBORNE_HEIGHT, POTION } from '../config.js';
import { createPlayerAvatar } from './avatar.js';
import { createNameTag } from './nameTag.js';
import { releaseWeapon } from './weapons/index.js';
import { updateDogForm } from './dogForm.js';
import { sizeOf } from '../core/bodySize.js';
import { tickMaterial } from './hpTicks.js';

const { Color3, MeshBuilder, TransformNode } = BABYLON;

// Thanh máu + tên, luôn quay về phía camera. Trả về phần thanh máu để co giãn theo hp.
function createOverheadBar(upper, name) {
  const bar = new TransformNode('bar', scene);
  bar.parent = upper;
  bar.position.y = 2.3;
  bar.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  const back = MeshBuilder.CreatePlane('barBack', { width: 1.1, height: 0.14 }, scene);
  back.parent = bar;
  back.material = solidMaterial(new Color3(0.12, 0.12, 0.12)); // xám đậm (không đen hẳn) để vạch chia vẫn thấy ở phần máu đã mất
  back.material.disableLighting = true;
  const fill = MeshBuilder.CreatePlane('barFill', { width: 1, height: 0.1 }, scene);
  fill.parent = bar;
  fill.position.z = -0.01;
  fill.material = solidMaterial(new Color3(0.2, 0.9, 0.2));
  fill.material.emissiveColor = new Color3(0.2, 0.9, 0.2);
  const ticks = MeshBuilder.CreatePlane('barTicks', { width: 1.1, height: 0.14 }, scene); // vạch chia, material gắn theo máu tối đa (updateRemote)
  ticks.parent = bar;
  ticks.position.z = -0.02;
  ticks.isPickable = false;
  createNameTag(name, bar);
  return { fill, ticks };
}

export function createRemote(id, { name, look }) {
  const avatar = createPlayerAvatar(scene, id, look);
  const { fill, ticks } = createOverheadBar(avatar.upper, name);

  return {
    ...avatar,
    fill,
    ticks,
    tickMax: 0,
    phase: 0, crouch: 0, tx: 0, ty: 0, tz: 0, tc: 0, tyaw: 0,
    hp: 100, maxHp: 100, potion: 0, size: 1, dead: false, initialised: false, weapon: 'fist', sprinting: false,
  };
}

export function disposeRemote(r) {
  releaseWeapon(r.fists.L);
  releaseWeapon(r.fists.R); // vũ khí dùng chung material nên không để dispose(…, true) của root đụng tới
  r.ticks.material = null; // material vạch chia dùng chung giữa mọi người (entities/hpTicks.js)
  r.root.dispose(false, true); // xoá luôn material và texture riêng của người này
}

// Thuốc hoá to / nhỏ: cả nhân vật co giãn quanh chân (kéo theo vũ khí cầm trên tay). Thanh máu + tên nằm trong nhân vật nên được co ngược lại
// để luôn cùng một cỡ trên màn hình, chỉ đổi độ cao theo đầu.
function updateSize(r, dt) {
  r.size += (sizeOf(r.potion) - r.size) * (1 - Math.exp(-POTION.sizeEase * dt));
  r.root.scaling.setAll(r.size);
  r.fill.parent.scaling.setAll(1 / r.size);
}

export function updateRemote(r, dt) {
  const f = 1 - Math.exp(-15 * dt);
  const ox = r.root.position.x;
  const oz = r.root.position.z;
  r.root.position.x += (r.tx - r.root.position.x) * f;
  r.root.position.z += (r.tz - r.root.position.z) * f;
  // Chân bước theo tốc độ di chuyển
  const speed = dt > 0 ? Math.hypot(r.root.position.x - ox, r.root.position.z - oz) / dt : 0;
  r.phase += speed * dt * 3;
  r.root.position.y += (r.ty - r.root.position.y) * f;
  // Ngồi: hạ thân trên xuống 0.35
  r.crouch += (r.tc - r.crouch) * f;
  r.upper.position.y = -0.35 * r.crouch;
  let dy = r.tyaw - r.root.rotation.y;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  r.root.rotation.y += dy * f;
  // Cao hơn mặt đất (hoặc mặt cầu) dưới chân thì đang nhảy / rơi → hoạt ảnh nhảy.
  r.setAirborne(!r.dead && r.ty > groundAt(r.tx, r.tz, r.ty) + AIRBORNE_HEIGHT, JUMP_AIR_TIME);
  r.setRunning(!r.dead && !r.tc && r.sprinting);
  r.update(performance.now() < (r.stopUntil ?? 0) ? 0 : dt); // hit stop: hoạt ảnh đứng hình một nhịp lúc có đòn trúng (net/combatHandlers.js)
  r.hitFlash?.update(dt);
  r.pose(r.crouch, r.dead ? 0 : Math.sin(r.phase) * 0.7 * Math.min(speed / 3, 1) * (1 - 0.7 * r.crouch));
  updateDogForm(r, speed, dt);
  updateSize(r, dt);
  if (r.tickMax !== r.maxHp) {
    r.tickMax = r.maxHp; // đổi máu tối đa (uống thuốc): vạch chia đổi theo
    r.ticks.material = tickMaterial(r.maxHp);
  }
  const pct = Math.max(0, r.hp) / r.maxHp;
  r.fill.scaling.x = Math.max(pct, 0.001);
  r.fill.position.x = -0.5 * (1 - pct);
  // Chết thì giữ nhân vật lại để thấy tư thế ngã; chỉ ẩn thanh máu/tên.
  r.upper.setEnabled(!r.dead);
}
