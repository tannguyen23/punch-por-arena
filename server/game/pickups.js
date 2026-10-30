const { PICKUP_RADIUS, PICKUP_MIN_GAP, PLANE_SPEED, PLANE_APPROACH, PLANE_ALTITUDE, PARACHUTE_MS } = require('../config');
const config = require('../config'); // AIRDROP, LOOT đọc lúc dùng
const { randomFreePosition } = require('./spawn');
const { randomDropWeapon, rollAmmo } = require('./weapons');
const { addToInventory, selectSlot } = require('./inventory');
const { broadcast } = require('../net/messaging');
const { cantAct } = require('./restrictions');
const { drinkPotion } = require('./potions');
const { pickupView } = require('./pickupView');
const { dropLoot, offset } = require('./loot');

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

// Hòm tiếp tế định kỳ có `AIRDROP.bonusChance` cơ hội kèm thêm một lựu đạn (chọn đều trong `AIRDROP.bonus`).
function rollBonus() {
  const { bonus, bonusChance } = config.AIRDROP;
  if (!bonus.length || Math.random() >= bonusChance) return null;
  const weapon = bonus[Math.floor(Math.random() * bonus.length)];
  return { weapon, ammo: rollAmmo(weapon) };
}

// Máy bay xuất hiện ngay bây giờ, bay thẳng tới `pos` và thả hòm chứa `weapon` với ít đạn. Không truyền `weapon`: máy bay tiếp tế định kỳ
// (vũ khí ngẫu nhiên, có thể kèm lựu đạn thưởng, khói đỏ); hòm có `weapon` truyền vào (radio) thì không có thưởng.
// `smokeKind` là màu khói ('red' | 'yellow', xem AIRDROP.smokeColors ở client); `caller` là người gọi máy bay (radio gọi bom), để client báo tên.
// `quiet`: hòm thứ hai trở đi của cùng một đợt, client không báo động lại.
function launchAirdrop(room, { weapon = null, pos = findPickupPosition(room), smokeKind = 'red', caller = null, quiet = false } = {}) {
  const main = weapon ?? randomDropWeapon();
  if (!main) return;
  const now = Date.now();
  const releaseAt = now + (PLANE_APPROACH / PLANE_SPEED) * 1000;
  const pickup = {
    id: room.nextPickupId++,
    weapon: main,
    ammo: rollAmmo(main),
    bonus: weapon ? null : rollBonus(),
    x: +pos.x.toFixed(2),
    z: +pos.z.toFixed(2),
    y: +(room.terrain.heightAt(pos.x, pos.z) + PLANE_ALTITUDE).toFixed(2),
    heading: +(Math.random() * Math.PI * 2).toFixed(3),
    smokeKind,
    releaseAt,
    landsAt: releaseAt + PARACHUTE_MS,
  };
  room.pickups.set(pickup.id, pickup);
  broadcast(room, { t: 'airdrop', pickup: pickupView(pickup, now), by: caller?.id ?? null, ...(quiet ? { quiet: true } : {}) });
}

// Lựu đạn thưởng trong hòm: vừa túi thì vào túi (vẫn cầm vũ khí chính), không vừa thì văng ra cạnh hòm
// (phía bên kia so với người nhặt) để vứt bớt bằng G rồi nhặt sau. Trả về id lựu đạn nếu đã vào túi.
function takeBonus(room, p, crate) {
  const held = p.activeSlot;
  if (addToInventory(p, crate.bonus.weapon, crate.bonus.ammo)) {
    selectSlot(p, held);
    return crate.bonus.weapon;
  }
  const away = Math.atan2(crate.x - p.x, crate.z - p.z);
  dropLoot(room, crate.bonus, offset(crate, away, config.LOOT.tossDistance), { x: crate.x, z: crate.z, y: p.y }, { by: p.id });
  return undefined;
}

// Người vừa vứt vũ khí đang đứng ngay trên nó: phải bước ra khỏi bán kính nhặt rồi mới nhặt lại được.
function blockedFor(pickup, p, near) {
  if (pickup.ignore !== p.id) return false;
  if (!near) pickup.ignore = null;
  return near;
}

// Đi tới gần hòm đã chạm đất thì nhặt luôn vào túi đồ và cầm lên (cùng loại thì cộng dồn đạn). Túi đầy thì hòm nằm lại. Lọ thuốc thì uống luôn.
// Hòm có lựu đạn thưởng: chỉ cần vũ khí chính vừa túi là nhặt được hòm (xem takeBonus).
function tryPickup(room, p) {
  if (p.dead || cantAct(room, p)) return; // chó không cầm được gì
  const now = Date.now();
  for (const pickup of room.pickups.values()) {
    const near = Math.hypot(pickup.x - p.x, pickup.z - p.z) < PICKUP_RADIUS;
    if (blockedFor(pickup, p, near) || !near || now < pickup.landsAt) continue;
    if (pickup.potion) drinkPotion(p, pickup.potion, now); // thuốc không vào túi: uống ngay
    else if (!addToInventory(p, pickup.weapon, pickup.ammo)) continue;
    room.pickups.delete(pickup.id);
    const bonus = pickup.bonus ? takeBonus(room, p, pickup) : undefined;
    broadcast(room, { t: 'pickup', id: pickup.id, by: p.id, weapon: pickup.weapon, potion: pickup.potion, bonus });
    return;
  }
}

// Dọn sân khi sang trận mới / về phòng chờ (client dọn theo message 'start' / 'lobby').
const clearPickups = (room) => room.pickups.clear();

module.exports = { AIRDROP_LEAD_MS, findPickupPosition, pickupView, launchAirdrop, tryPickup, clearPickups };
