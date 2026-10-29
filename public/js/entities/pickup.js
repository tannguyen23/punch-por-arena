import { scene } from '../core/scene.js';
import { heightAt } from '../core/terrain.js';
import { AIRDROP } from '../config.js';
import { createWeaponModel } from './weapons/index.js';
import { createAirplane } from './airplane.js';
import { createCrate } from './crate.js';
import { createSmoke } from './smoke.js';

const { TransformNode, MeshBuilder, StandardMaterial, Color3 } = BABYLON;

// Vòng sáng và cột sáng đánh dấu chỗ hòm sẽ rơi, nhìn thấy từ xa. Dùng chung cho mọi hòm.
let glow = null;
function glowMaterials() {
  if (!glow) {
    const make = (alpha) => {
      const mat = new StandardMaterial('pickupGlow', scene);
      mat.emissiveColor = new Color3(1, 0.85, 0.3);
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      mat.alpha = alpha;
      return mat;
    };
    glow = { ring: make(0.55), beam: make(0.14) };
  }
  return glow;
}

function addMarker(root) {
  const { ring, beam } = glowMaterials();
  const disc = MeshBuilder.CreateDisc('pickupRing', { radius: 0.9, tessellation: 32 }, scene);
  disc.parent = root;
  disc.rotation.x = Math.PI / 2;
  disc.position.y = 0.03;
  disc.material = ring;
  const column = MeshBuilder.CreateCylinder('pickupBeam', { diameter: 0.7, height: 4, tessellation: 16 }, scene);
  column.parent = root;
  column.position.y = 2;
  column.material = beam;
}

// Hòm tiếp tế do server gửi: { id, weapon, ammo, x, z, y, heading, speed, releaseIn, landIn }. Máy bay bay theo `heading`, đi qua
// (x, y, z) đúng lúc thả (`releaseIn` ms nữa); hòm rơi dù thẳng xuống, chạm đất sau `landIn` ms. Số âm = đã qua, nên người vào
// giữa chừng thấy đúng chỗ máy bay / hòm đang ở. Vũ khí trong hòm chỉ hiện (xoay trên nóc hòm) sau khi chạm đất.
// `hooks.onLand(pickup)`: hòm vừa chạm đất; `hooks.onPlane(pickup, position | null)`: máy bay di chuyển / biến mất (để phát tiếng).
// `dropped`: vũ khí người chơi vứt ra, chỉ có vũ khí lơ lửng sát đất và vòng sáng (không máy bay, hòm, khói).
export function createPickup({ id, weapon, ammo, x, z, y, heading, speed, releaseIn, landIn, dropped = false }, hooks = {}) {
  const now = performance.now();
  const ground = heightAt(x, z);
  const root = new TransformNode('pickup' + id, scene);
  root.position.set(x, ground, z);
  addMarker(root);

  const crate = dropped ? null : createCrate();
  if (crate) crate.root.parent = root;
  const spin = new TransformNode('pickupSpin', scene);
  spin.parent = root;
  const hover = dropped ? AIRDROP.dropHover : AIRDROP.crateHover;
  spin.position.y = hover;

  const pickup = {
    id, weapon, ammo, root, crate, spin, hooks, speed, heading, dropped, hover,
    dropHeight: y - ground,
    releaseAt: now + releaseIn,
    landAt: now + landIn,
    landed: false,
    plane: null,
    smoke: null,
    lateJoin: releaseIn < -AIRDROP.smokeLateMs, // vào trận khi hòm đã rời máy bay một lúc
    t: Math.random() * Math.PI * 2,
    disposed: false,
  };
  if (landIn <= 0) land(pickup); // đã nằm sẵn trên sân, không có hiệu ứng chạm đất
  createWeaponModel(weapon).then((model) => {
    if (!model) return;
    if (pickup.disposed) model.dispose();
    else model.parent = spin;
  });
  updatePickup(pickup, 0);
  return pickup;
}

function land(pickup) {
  pickup.landed = true;
  if (!pickup.crate) return;
  pickup.crate.root.position.y = 0;
  pickup.crate.root.rotation.set(0, 0, 0);
  pickup.crate.chute.dispose();
}

function removePlane(pickup) {
  if (!pickup.plane) return;
  pickup.plane.root.dispose();
  pickup.plane = null;
  pickup.hooks.onPlane?.(pickup, null);
}

// Máy bay cách điểm thả `s` mét theo hướng bay (âm = chưa tới). Bay qua đủ xa thì xoá.
function updatePlane(pickup, now, dt) {
  if (pickup.dropped) return;
  const s = (pickup.speed * (now - pickup.releaseAt)) / 1000;
  if (s > AIRDROP.planeVisible) {
    removePlane(pickup);
    return;
  }
  if (!pickup.plane) {
    pickup.plane = createAirplane();
    pickup.plane.root.rotation.y = pickup.heading;
  }
  const { position } = pickup.plane.root;
  position.set(
    pickup.root.position.x + Math.sin(pickup.heading) * s,
    pickup.root.position.y + pickup.dropHeight,
    pickup.root.position.z + Math.cos(pickup.heading) * s,
  );
  pickup.plane.spin(dt);
  pickup.hooks.onPlane?.(pickup, position);
}

// Hòm nằm trong máy bay cho tới lúc thả, rồi rơi đều dưới dù và đung đưa.
function updateFalling(pickup, now) {
  const { crate } = pickup;
  crate.root.setEnabled(now >= pickup.releaseAt);
  pickup.spin.setEnabled(false);
  const k = Math.min(1, Math.max(0, (now - pickup.releaseAt) / (pickup.landAt - pickup.releaseAt)));
  crate.root.position.y = pickup.dropHeight * (1 - k);
  crate.root.rotation.z = AIRDROP.sway * Math.sin(now / 700 + pickup.id);
  crate.root.rotation.x = AIRDROP.sway * 0.6 * Math.cos(now / 900 + pickup.id);
  if (now < pickup.landAt) return;
  land(pickup);
  pickup.hooks.onLand?.(pickup);
}

// Cột khói đỏ bốc lên ở chỗ hòm sẽ rơi ngay khi hòm rời máy bay, cho cả sân thấy từ xa.
function updateSmoke(pickup, now) {
  if (pickup.dropped || pickup.smoke || now < pickup.releaseAt) return;
  pickup.smoke = createSmoke(pickup.root.position, { prewarm: pickup.lateJoin });
}

export function updatePickup(pickup, dt) {
  const now = performance.now();
  updatePlane(pickup, now, dt);
  updateSmoke(pickup, now);
  if (!pickup.landed) {
    updateFalling(pickup, now);
    return;
  }
  pickup.spin.setEnabled(true);
  pickup.t += dt;
  pickup.spin.rotation.y += dt * 1.5;
  pickup.spin.position.y = pickup.hover + 0.15 * Math.sin(pickup.t * 2);
}

// Material và mesh mẫu dùng chung nên không huỷ kèm.
export function disposePickup(pickup) {
  pickup.disposed = true;
  removePlane(pickup);
  pickup.smoke?.stop(); // khói tan dần chứ không biến mất ngay
  pickup.root.dispose();
}
