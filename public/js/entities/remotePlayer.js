import { scene, solidMaterial } from '../core/scene.js';
import { state } from '../state.js';
import { groundAt } from '../core/terrain.js';
import { JUMP_AIR_TIME, AIRBORNE_HEIGHT } from '../config.js';
import { createPlayerAvatar } from './avatar.js';
import { createNameTag } from './nameTag.js';
import { releaseWeapon } from './weapons/index.js';

const { Color3, MeshBuilder, TransformNode } = BABYLON;

// Thanh máu + tên, luôn quay về phía camera. Trả về phần thanh máu để co giãn theo hp.
function createOverheadBar(upper, name) {
  const bar = new TransformNode('bar', scene);
  bar.parent = upper;
  bar.position.y = 2.3;
  bar.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  const back = MeshBuilder.CreatePlane('barBack', { width: 1.1, height: 0.14 }, scene);
  back.parent = bar;
  back.material = solidMaterial(Color3.Black());
  back.material.disableLighting = true;
  const fill = MeshBuilder.CreatePlane('barFill', { width: 1, height: 0.1 }, scene);
  fill.parent = bar;
  fill.position.z = -0.01;
  fill.material = solidMaterial(new Color3(0.2, 0.9, 0.2));
  fill.material.emissiveColor = new Color3(0.2, 0.9, 0.2);
  createNameTag(name, bar);
  return fill;
}

export function createRemote(id, { name, look }) {
  const avatar = createPlayerAvatar(scene, id, look);
  const fill = createOverheadBar(avatar.upper, name);

  return {
    ...avatar,
    fill,
    phase: 0, crouch: 0, tx: 0, ty: 0, tz: 0, tc: 0, tyaw: 0,
    hp: 100, dead: false, initialised: false, weapon: 'fist',
  };
}

export function disposeRemote(r) {
  releaseWeapon(r.fists.L);
  releaseWeapon(r.fists.R); // vũ khí dùng chung material nên không để dispose(…, true) của root đụng tới
  r.root.dispose(false, true); // xoá luôn material và texture riêng của người này
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
  r.pose(r.crouch, Math.sin(r.phase) * 0.7 * Math.min(speed / 3, 1) * (1 - 0.7 * r.crouch));
  let dy = r.tyaw - r.root.rotation.y;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  r.root.rotation.y += dy * f;
  r.update(dt);
  // Cao hơn mặt đất (hoặc mặt cầu) dưới chân thì đang nhảy / rơi → hoạt ảnh nhảy.
  r.setAirborne(!r.dead && r.ty > groundAt(r.tx, r.tz, r.ty) + AIRBORNE_HEIGHT, JUMP_AIR_TIME);
  const pct = Math.max(0, r.hp) / state.maxHp;
  r.fill.scaling.x = Math.max(pct, 0.001);
  r.fill.position.x = -0.5 * (1 - pct);
  r.root.setEnabled(!r.dead);
}
