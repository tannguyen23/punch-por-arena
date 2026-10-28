const { PICKUP_RADIUS, PICKUP_MIN_GAP } = require('../config');
const { randomFreePosition } = require('./spawn');
const { randomDropWeapon } = require('./weapons');
const { broadcast } = require('../net/messaging');

// Vị trí trống và không quá gần vũ khí đang nằm trên sân của phòng.
function findPickupPosition(room) {
  let pos;
  for (let i = 0; i < 10; i++) {
    pos = randomFreePosition(room);
    if (![...room.pickups.values()].some((o) => Math.hypot(o.x - pos.x, o.z - pos.z) < PICKUP_MIN_GAP)) break;
  }
  return pos;
}

function createPickup(room) {
  const weapon = randomDropWeapon();
  if (!weapon) return null;
  const pos = findPickupPosition(room);
  const pickup = { id: room.nextPickupId++, weapon, x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) };
  room.pickups.set(pickup.id, pickup);
  return pickup;
}

// Thả một đợt `count` vũ khí cùng lúc và báo cho mọi người trong phòng bằng một message.
function dropWave(room, count) {
  const dropped = Array.from({ length: count }, () => createPickup(room)).filter(Boolean);
  if (dropped.length > 0) broadcast(room, { t: 'drop', pickups: dropped });
}

// Đi tới gần vũ khí nào thì nhặt luôn, thay vũ khí đang cầm.
function tryPickup(room, p) {
  if (p.dead) return;
  for (const pickup of room.pickups.values()) {
    if (Math.hypot(pickup.x - p.x, pickup.z - p.z) >= PICKUP_RADIUS) continue;
    p.weapon = pickup.weapon;
    room.pickups.delete(pickup.id);
    broadcast(room, { t: 'pickup', id: pickup.id, by: p.id, weapon: pickup.weapon });
    return;
  }
}

// Dọn sân khi sang trận mới / về phòng chờ (client dọn theo message 'start' / 'lobby').
const clearPickups = (room) => room.pickups.clear();

module.exports = { dropWave, tryPickup, clearPickups };
