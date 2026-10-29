const { PICKUP_RADIUS, PICKUP_MIN_GAP, PLANE_SPEED, PLANE_APPROACH, PLANE_ALTITUDE, PARACHUTE_MS } = require('../config');
const { terrain } = require('../maps');
const { randomFreePosition } = require('./spawn');
const { randomDropWeapon, rollAmmo } = require('./weapons');
const { addToInventory } = require('./inventory');
const { broadcast } = require('../net/messaging');

// Từ lúc máy bay xuất hiện tới lúc hòm chạm đất (mili giây).
const AIRDROP_LEAD_MS = (PLANE_APPROACH / PLANE_SPEED) * 1000 + PARACHUTE_MS;

// Vị trí trống và không quá gần hòm đang có trên sân của phòng.
function findPickupPosition(room) {
  let pos;
  for (let i = 0; i < 10; i++) {
    pos = randomFreePosition(room);
    if (![...room.pickups.values()].some((o) => Math.hypot(o.x - pos.x, o.z - pos.z) < PICKUP_MIN_GAP)) break;
  }
  return pos;
}

// Hòm gửi cho client: thời điểm đổi sang "còn bao lâu" (âm = đã qua) để client tự tính theo đồng hồ của mình.
// Máy bay đi qua (x, z) ở độ cao `y` theo hướng `heading` (cùng quy ước với yaw) đúng lúc thả, hòm rơi dù thẳng xuống.
// `dropped`: vũ khí người chơi vứt ra (nằm sẵn dưới đất, không có máy bay / hòm / khói).
function pickupView(pickup, now = Date.now()) {
  const { id, weapon, ammo, x, z, y, heading, dropped, smokeKind } = pickup;
  return { id, weapon, ammo, x, z, y, heading, dropped, smokeKind, speed: PLANE_SPEED, releaseIn: pickup.releaseAt - now, landIn: pickup.landsAt - now };
}

// Máy bay xuất hiện ngay bây giờ, bay thẳng tới `pos` và thả hòm chứa `weapon` với ít đạn. Không truyền gì: máy bay tiếp tế định kỳ
// (vũ khí ngẫu nhiên, điểm thả ngẫu nhiên, khói đỏ). `smokeKind` là màu khói ('red' | 'yellow', xem AIRDROP.smokeColors ở client);
// `caller` là người gọi máy bay (radio gọi bom), để client báo tên.
function launchAirdrop(room, { weapon = randomDropWeapon(), pos = findPickupPosition(room), smokeKind = 'red', caller = null } = {}) {
  if (!weapon) return;
  const now = Date.now();
  const releaseAt = now + (PLANE_APPROACH / PLANE_SPEED) * 1000;
  const pickup = {
    id: room.nextPickupId++,
    weapon,
    ammo: rollAmmo(weapon),
    x: +pos.x.toFixed(2),
    z: +pos.z.toFixed(2),
    y: +(terrain.heightAt(pos.x, pos.z) + PLANE_ALTITUDE).toFixed(2),
    heading: +(Math.random() * Math.PI * 2).toFixed(3),
    smokeKind,
    releaseAt,
    landsAt: releaseAt + PARACHUTE_MS,
  };
  room.pickups.set(pickup.id, pickup);
  broadcast(room, { t: 'airdrop', pickup: pickupView(pickup, now), by: caller?.id ?? null });
}

// Người vừa vứt vũ khí đang đứng ngay trên nó: phải bước ra khỏi bán kính nhặt rồi mới nhặt lại được.
function blockedFor(pickup, p, near) {
  if (pickup.ignore !== p.id) return false;
  if (!near) pickup.ignore = null;
  return near;
}

// Đi tới gần hòm đã chạm đất thì nhặt luôn vào túi đồ và cầm lên (cùng loại thì cộng dồn đạn). Túi đầy thì hòm nằm lại.
function tryPickup(room, p) {
  if (p.dead) return;
  const now = Date.now();
  for (const pickup of room.pickups.values()) {
    const near = Math.hypot(pickup.x - p.x, pickup.z - p.z) < PICKUP_RADIUS;
    if (blockedFor(pickup, p, near) || !near || now < pickup.landsAt) continue;
    if (!addToInventory(p, pickup.weapon, pickup.ammo)) continue;
    room.pickups.delete(pickup.id);
    broadcast(room, { t: 'pickup', id: pickup.id, by: p.id, weapon: pickup.weapon });
    return;
  }
}

// Dọn sân khi sang trận mới / về phòng chờ (client dọn theo message 'start' / 'lobby').
const clearPickups = (room) => room.pickups.clear();

module.exports = { AIRDROP_LEAD_MS, pickupView, launchAirdrop, tryPickup, clearPickups };
