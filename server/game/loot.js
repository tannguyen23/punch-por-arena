const config = require('../config'); // LOOT đọc lúc dùng
const { broadcast } = require('../net/messaging');
const { clamp } = require('../utils/math');
const { pickupView } = require('./pickupView');

// Vũ khí rơi ra sân (bấm G, chết, lựu đạn thưởng không vừa túi): nằm dưới đất như vật nhặt `dropped` tới hết trận.
// Không require match.js / pickups.js: file này được damage.js nạp, mà rất nhiều module nạp damage.js.

// Chỗ (x, z) có đất đỡ cho người có chân ở độ cao `feetY` không. Đảo trời: hư không, hoặc chân đã rơi xuống dưới đảo
// (groundAt trả -Infinity) thì không.
function groundFor(room, x, z, feetY) {
  if (!room.terrain.isSupported(x, z)) return -Infinity;
  return room.terrain.groundAt(x, z, feetY);
}

// Thử đặt ở `spot` trước; không có đất đỡ thì đặt dưới chân `from` ({ x, z, y }); vẫn không có thì null (rơi xuống hư không, mất luôn).
function lootSpot(room, spot, from) {
  const size = room.mapData.size;
  for (const c of [spot, from]) {
    const x = clamp(c.x, -size, size);
    const z = clamp(c.z, -size, size);
    const y = groundFor(room, x, z, from.y);
    if (Number.isFinite(y)) return { x, z, y };
  }
  return null;
}

// Đặt `item` ({ weapon, ammo }) xuống sân và báo cả phòng. `ignore`: người không được tự nhặt lại ngay (xem blockedFor ở pickups.js).
function dropLoot(room, item, spot, from, { by = null, ignore = null } = {}) {
  const pos = lootSpot(room, spot, from);
  if (!pos) return null;
  const now = Date.now();
  const pickup = {
    id: room.nextPickupId++,
    weapon: item.weapon,
    ammo: item.ammo,
    magazine: item.magazine,
    x: +pos.x.toFixed(2),
    z: +pos.z.toFixed(2),
    y: +pos.y.toFixed(2),
    heading: 0,
    releaseAt: now,
    landsAt: now,
    dropped: true,
    ignore,
    duelLoot: room.event?.kind === 'duel' && room.event.fighters.includes(by),
  };
  room.pickups.set(pickup.id, pickup);
  broadcast(room, { t: 'drop', by, pickup: pickupView(pickup, now) });
  return pickup;
}

// Điểm cách (x, z) `distance` mét theo góc `angle` (cùng quy ước với yaw: hướng (sin, cos), xem aimDirection ở raycast.js).
const offset = (o, angle, distance) => ({ x: o.x + Math.sin(angle) * distance, z: o.z + Math.cos(angle) * distance });

// Phím G: văng vũ khí ra trước mặt cho người vứt nhìn thấy nó (để dưới chân thì bị thân che).
function tossLoot(room, p, item) {
  return dropLoot(room, item, offset(p, p.yaw, config.LOOT.tossDistance), p, { by: p.id, ignore: p.id });
}

// Chết: cả túi văng ra quanh xác, chia đều các hướng để không chồng lên nhau.
function spillInventory(room, p) {
  const items = p.slots.filter(Boolean);
  items.forEach((item, i) => {
    const angle = p.yaw + (i / items.length) * Math.PI * 2;
    dropLoot(room, item, offset(p, angle, config.LOOT.deathSpread), p);
  });
}

module.exports = { dropLoot, tossLoot, spillInventory, offset };
