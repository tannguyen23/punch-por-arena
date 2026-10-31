import { scene } from '../core/scene.js';
import { heightAt } from '../core/terrain.js';
import { AIRDROP, POTION } from '../config.js';
import { createWeaponModel } from './weapons/index.js';
import { createPotionModel } from './potionModel.js';
import { createAirplane } from './airplane.js';
import { createCrate } from './crate.js';
import { createSmoke } from './smoke.js';

const { TransformNode, MeshBuilder, StandardMaterial, Color3, Vector3 } = BABYLON;

// Vòng sáng và cột sáng vàng đánh dấu vật nhặt, nhìn thấy từ xa. Dùng chung cho mọi vật nhặt.
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
    glow = { ring: make(0.55), beam: make(0.2) };
  }
  return glow;
}

// Vòng sáng dưới đất cho mọi vật nhặt; cột sáng (`beam` = { height, diameter }) chỉ cho vật không nằm trong hòm (lọ thuốc, vũ khí vứt ra):
// hòm tiếp tế đã có khói đỏ đi theo nó nên không cần cột sáng.
function addMarker(root, beam = null) {
  const { ring, beam: beamMaterial } = glowMaterials();
  const disc = MeshBuilder.CreateDisc('pickupRing', { radius: 0.9, tessellation: 32 }, scene);
  disc.parent = root;
  disc.rotation.x = Math.PI / 2;
  disc.position.y = 0.03;
  disc.material = ring;
  if (!beam) return;
  const column = MeshBuilder.CreateCylinder('pickupBeam', { diameter: beam.diameter, height: beam.height, tessellation: 16 }, scene);
  column.parent = root;
  column.position.y = beam.height / 2;
  column.material = beamMaterial;
}

// Hòm tiếp tế do server gửi: { id, weapon, ammo, x, z, y, releaseIn, landIn, firstDrop, planePath }. Hòm rơi dù thẳng xuống,
// chạm đất sau `landIn` ms. Số âm = đã qua, nên người vào giữa chừng thấy đúng chỗ máy bay / hòm đang ở. Vũ khí trong hòm
// chỉ hiện (xoay trên nóc hòm) sau khi chạm đất.
// `planePath`: đường bay chung của cả chuyến { id, from, startIn, y, speed, drops: [{ x, z, in }] }; client vẽ MỘT máy bay
// đi lần lượt qua các điểm thả (không phụ thuộc hòm nào còn sống hay không). `firstDrop`: hòm đầu của chuyến.
// `hooks.onLand(pickup)`: hòm vừa chạm đất; `hooks.onPlane(pickup, position | null)`: máy bay di chuyển / biến mất (để phát tiếng).
// `dropped`: vũ khí người chơi vứt ra, chỉ có vũ khí lơ lửng sát đất và vòng sáng (không máy bay, hòm, khói).
// `potion` (thay cho `weapon`): lọ thuốc, dựng như vũ khí vứt ra nhưng là lọ thuốc, nhặt là uống ngay.
// `bonus`: lựu đạn thưởng trong hòm, xoay cùng vũ khí chính, lệch sang cạnh và nhỏ hơn (AIRDROP.bonusOffset).
export function createPickup({ id, weapon, potion = null, bonus = null, ammo, x, z, y, releaseIn, landIn, dropped = false, smokeKind = null, firstDrop = true, planePath = null }, hooks = {}) {
  const now = performance.now();
  const ground = heightAt(x, z);
  const root = new TransformNode('pickup' + id, scene);
  root.position.set(x, ground, z);
  addMarker(root, dropped ? (potion ? POTION.beam : AIRDROP.dropBeam) : null);

  const crate = dropped ? null : createCrate();
  if (crate) crate.root.parent = root;
  const spin = new TransformNode('pickupSpin', scene);
  spin.parent = root;
  const hover = potion ? POTION.hover : dropped ? AIRDROP.dropHover : AIRDROP.crateHover;
  spin.position.y = hover;

  const pickup = {
    id, weapon, potion, ammo, root, crate, spin, hooks, dropped, hover, smokeKind, firstDrop,
    dropHeight: y - ground,
    releaseAt: now + releaseIn,
    landAt: now + landIn,
    landed: false,
    smoke: null,
    lateJoin: releaseIn < -AIRDROP.smokeLateMs, // vào trận khi hòm đã rời máy bay một lúc
    t: Math.random() * Math.PI * 2,
    disposed: false,
  };
  if (planePath) addPlane(planePath, now, pickup, hooks);
  if (landIn <= 0) land(pickup); // đã nằm sẵn trên sân, không có hiệu ứng chạm đất
  attachModel(pickup, potion ? createPotionModel(potion) : createWeaponModel(weapon));
  if (bonus && !dropped) attachModel(pickup, createWeaponModel(bonus), AIRDROP.bonusOffset);
  updatePickup(pickup, 0);
  return pickup;
}

// Gắn model (nạp xong) vào phần xoay; `offset` = { x, y, scale } so với vũ khí chính. Vật nhặt đã bị huỷ trong lúc nạp thì bỏ model.
function attachModel(pickup, loading, offset = null) {
  loading.then((model) => {
    if (!model) return;
    if (pickup.disposed) return model.dispose();
    model.parent = pickup.spin;
    if (!offset) return;
    model.position.x += offset.x;
    model.position.y += offset.y;
    model.scaling.scaleInPlace(offset.scale);
  });
}

function land(pickup) {
  pickup.landed = true;
  if (!pickup.crate) return;
  pickup.crate.root.position.y = 0;
  pickup.crate.root.rotation.set(0, 0, 0);
  pickup.crate.chute.dispose();
}

// Máy bay dùng chung cho cả chuyến: tách khỏi hòm để hòm bị nhặt giữa chừng không làm máy bay biến mất sớm.
const planes = new Map(); // id chuyến → { from, startAt, y, speed, drops, mesh, pickup, hooks }
const planeAt = { x: 0, z: 0, heading: 0 }; // dùng lại mỗi khung hình, tránh cấp phát

function addPlane(path, now, pickup, hooks) {
  if (!path?.drops?.length || planes.has(path.id)) return;
  planes.set(path.id, {
    id: path.id,
    from: path.from,
    startAt: now + path.startIn,
    y: path.y,
    speed: path.speed,
    drops: path.drops.map((d) => ({ x: d.x, z: d.z, at: now + d.in })),
    mesh: null,
    pickup,
    hooks,
  });
}

function removePlane(plane) {
  plane.mesh?.root.dispose();
  plane.mesh = null;
  plane.hooks.onPlane?.(plane.pickup, null);
}

// Vị trí máy bay tại `now`: đoạn đầu từ ngoài sân vào điểm thả đầu, rồi lần lượt qua các điểm thả, sau điểm cuối
// thì bay tiếp theo hướng cũ tới khi xa quá `AIRDROP.planeVisible`. Null = đã bay hết, xoá máy bay.
function planePosition(plane, now) {
  const { from, drops, startAt, speed } = plane;
  const last = drops[drops.length - 1];
  let a;
  let b;
  let k;
  if (now <= drops[0].at) {
    a = from;
    b = drops[0];
    const span = b.at - startAt;
    k = span > 0 ? (now - startAt) / span : 1;
  } else if (now <= last.at) {
    let i = 1;
    while (i < drops.length - 1 && now > drops[i].at) i++;
    a = drops[i - 1];
    b = drops[i];
    k = b.at > a.at ? (now - a.at) / (b.at - a.at) : 1;
  } else {
    const prev = drops.length > 1 ? drops[drops.length - 2] : from;
    const dx = last.x - prev.x;
    const dz = last.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    const gone = ((now - last.at) / 1000) * speed;
    if (gone > AIRDROP.planeVisible) return null;
    planeAt.x = last.x + (dx / len) * gone;
    planeAt.z = last.z + (dz / len) * gone;
    planeAt.heading = Math.atan2(dx, dz);
    return planeAt;
  }
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  planeAt.x = a.x + dx * k;
  planeAt.z = a.z + dz * k;
  planeAt.heading = Math.atan2(dx, dz);
  return planeAt;
}

// Cập nhật mọi máy bay đang bay (gọi từ main.js sau khi cập nhật các hòm).
export function updatePlanes(dt) {
  if (planes.size === 0) return;
  const now = performance.now();
  for (const [id, plane] of planes) {
    if (now < plane.startAt) continue;
    const pos = planePosition(plane, now);
    if (!pos) {
      removePlane(plane);
      planes.delete(id);
      continue;
    }
    if (!plane.mesh) plane.mesh = createAirplane();
    plane.mesh.root.position.set(pos.x, plane.y, pos.z);
    plane.mesh.root.rotation.y = pos.heading;
    plane.mesh.spin(dt);
    plane.hooks.onPlane?.(plane.pickup, plane.mesh.root.position);
  }
}

// Dọn mọi máy bay (sang trận mới / về phòng chờ); khói và hòm do disposePickup lo.
export function clearPlanes() {
  for (const plane of planes.values()) removePlane(plane);
  planes.clear();
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

const anchor = new Vector3(); // vị trí hòm trong thế giới, dùng lại mỗi khung hình

// Khói đi theo hòm ngay từ lúc hòm rời máy bay (đỏ, hoặc màu khác theo `smokeKind`), cho cả sân thấy từ xa: hòm rơi tới đâu nhả khói tới đó nên để lại
// một vệt khói phía trên; chạm đất rồi thì khói hạ thấp và thưa dần ngay tại hòm tới khi có người nhặt. Người vào giữa chừng khi hòm đã nằm dưới đất
// thì dựng sẵn cột khói thấp; hòm còn đang rơi thì chỉ có vệt từ lúc mình vào.
function updateSmoke(pickup, now) {
  if (pickup.dropped || now < pickup.releaseAt) return;
  const { position } = pickup.root;
  anchor.set(position.x, position.y + pickup.crate.root.position.y, position.z); // crate.root.position.y = độ cao hòm so với đất (0 khi đã chạm đất)
  pickup.smoke ??= createSmoke(anchor, {
    prewarm: pickup.lateJoin && pickup.landed,
    color: AIRDROP.smokeColors[pickup.smokeKind],
    settled: pickup.landed,
  });
  if (pickup.landed) pickup.smoke.settle(); // hòm đã nằm dưới đất: khói bớt và bay thấp
  pickup.smoke.follow(anchor);
}

export function updatePickup(pickup, dt) {
  const now = performance.now();
  if (pickup.landed) {
    pickup.spin.setEnabled(true);
    pickup.t += dt;
    pickup.spin.rotation.y += dt * 1.5;
    pickup.spin.position.y = pickup.hover + 0.15 * Math.sin(pickup.t * 2);
  } else {
    updateFalling(pickup, now);
  }
  updateSmoke(pickup, now); // sau khi hòm đã được đặt ở vị trí của khung hình này
}

// Material và mesh mẫu dùng chung nên không huỷ kèm. Máy bay không huỷ ở đây: nó bay tiếp tới hết chuyến.
export function disposePickup(pickup) {
  pickup.disposed = true;
  pickup.smoke?.stop(); // khói tan dần chứ không biến mất ngay
  pickup.root.dispose();
}
