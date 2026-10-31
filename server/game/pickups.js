const { PICKUP_RADIUS, PICKUP_MIN_GAP, PLANE_SPEED, PLANE_APPROACH, PLANE_ALTITUDE, PARACHUTE_MS } = require('../config');
const config = require('../config'); // AIRDROP, LOOT đọc lúc dùng
const { randomFreePosition, isFree } = require('./spawn');
const { randomDropWeapon, rollAmmo } = require('./weapons');
const { addToInventory, selectSlot } = require('./inventory');
const { broadcast } = require('../net/messaging');
const { cantAct, isTntCarrier } = require('./restrictions');
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

// `count` vị trí có đất, rải xa nhau (ưu tiên cách nhau ít nhất AIRDROP.crateGap mét) để một chuyến máy bay thả nhiều hòm khắp map.
// Bản đồ đảo bay: randomFreePosition/isFree đã loại hư không nên hòm chỉ rơi trên đảo / cầu có đất.
function farFreePositions(room, count) {
  const positions = [];
  const gap = config.AIRDROP.crateGap;
  for (let i = 0; i < count; i++) {
    let best = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const pos = randomFreePosition(room);
      if (!isFree(room, pos)) continue;
      if ([...room.pickups.values()].some((o) => Math.hypot(o.x - pos.x, o.z - pos.z) < PICKUP_MIN_GAP)) continue;
      const nearest = positions.length ? Math.min(...positions.map((p) => Math.hypot(p.x - pos.x, p.z - pos.z))) : Infinity;
      if (nearest >= gap) { best = pos; break; }
      if (!best || nearest > best.gap) best = { x: pos.x, z: pos.z, gap: nearest };
    }
    if (!best) break; // không tìm được chỗ có đất: thả ít hòm hơn
    positions.push({ x: best.x, z: best.z });
  }
  return positions;
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
// `planePath` là đường bay chung của cả chuyến (launchAirdropWave); không truyền thì tự tạo đường bay một điểm.
// `planeY` là độ cao bay chung (dùng cho cả chuyến; mỗi hòm rơi từ đúng độ cao đó).
// `smokeKind` là màu khói ('red' | 'yellow', xem AIRDROP.smokeColors ở client); `caller` là người gọi máy bay (radio gọi bom),
// để client báo tên. `quiet`: hòm thứ hai trở đi của cùng một đợt, client không báo động lại.
// `firstDrop`: hòm đầu của chuyến (client chỉ kêu "hòm đã rơi" một lần cho cả chuyến).
function launchAirdrop(room, {
  weapon = null,
  pos = findPickupPosition(room),
  heading = null,
  releaseAt = Date.now() + (PLANE_APPROACH / PLANE_SPEED) * 1000,
  planeY = null,
  planePath = null,
  firstDrop = true,
  smokeKind = 'red',
  caller = null,
  quiet = false,
} = {}) {
  const main = weapon ?? randomDropWeapon(room.weaponWeights);
  if (!main) return;
  const dir = heading ?? Math.random() * Math.PI * 2;
  const now = Date.now();
  const y = planeY ?? room.terrain.heightAt(pos.x, pos.z) + PLANE_ALTITUDE;
  const path = planePath ?? {
    id: room.nextPickupId++, // id riêng của chuyến, không trùng id hòm
    from: { x: pos.x - Math.sin(dir) * PLANE_APPROACH, z: pos.z - Math.cos(dir) * PLANE_APPROACH },
    startAt: now,
    y,
    speed: PLANE_SPEED,
    drops: [{ x: pos.x, z: pos.z, at: releaseAt }],
  };
  const pickup = {
    id: room.nextPickupId++,
    weapon: main,
    ammo: rollAmmo(main),
    bonus: weapon ? null : rollBonus(),
    x: +pos.x.toFixed(2),
    z: +pos.z.toFixed(2),
    y: +y.toFixed(2),
    heading: +dir.toFixed(3),
    planePath: path,
    firstDrop,
    smokeKind,
    releaseAt,
    landsAt: releaseAt + PARACHUTE_MS,
  };
  room.pickups.set(pickup.id, pickup);
  broadcast(room, { t: 'airdrop', pickup: pickupView(pickup, now), by: caller?.id ?? null, ...(quiet ? { quiet: true } : {}) });
}

// Một máy bay bay theo đường gấp khúc qua `count` điểm có đất rải xa nhau, thả một hòm ở mỗi điểm (lần lượt).
// Cả chuyến chỉ có MỘT máy bay (client vẽ từ `planePath`), nên phòng đông chỉ tăng số hòm chứ không tăng máy bay.
function launchAirdropWave(room, count) {
  const drops = farFreePositions(room, count);
  if (!drops.length) return;
  const now = Date.now();
  const first = drops[0];
  const second = drops[1] ?? null;
  const heading = second
    ? Math.atan2(second.x - first.x, second.z - first.z)
    : Math.random() * Math.PI * 2;
  // Bay vào điểm đầu từ ngoài sân theo đúng hướng của đoạn đầu, để máy bay không đổi hướng ngay lúc thả.
  const from = { x: first.x - Math.sin(heading) * PLANE_APPROACH, z: first.z - Math.cos(heading) * PLANE_APPROACH };
  let releaseAt = now + (PLANE_APPROACH / PLANE_SPEED) * 1000;
  const pathDrops = drops.map((pos, i) => {
    if (i > 0) {
      const prev = drops[i - 1];
      releaseAt += (Math.hypot(pos.x - prev.x, pos.z - prev.z) / PLANE_SPEED) * 1000;
    }
    return { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), at: releaseAt };
  });
  // Cả chuyến phải chạm đất trước khi hết trận (hòm cuối là hòm lâu nhất).
  if (room.endsAt && pathDrops.at(-1).at + PARACHUTE_MS >= room.endsAt) return;
  const planeY = Math.max(...drops.map((p) => room.terrain.heightAt(p.x, p.z))) + PLANE_ALTITUDE;
  const planePath = {
    id: room.nextPickupId++,
    from,
    startAt: now,
    y: +planeY.toFixed(2),
    speed: PLANE_SPEED,
    drops: pathDrops,
  };
  drops.forEach((pos, i) => {
    launchAirdrop(room, {
      pos,
      releaseAt: pathDrops[i].at,
      planeY,
      planePath,
      firstDrop: i === 0,
      quiet: i > 0,
    });
  });
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

// Đi tới gần hòm đã chạm đất thì nhặt luôn vào túi đồ (cùng loại thì cộng dồn đạn); chỉ cầm lên nếu đang tay không,
// đang cầm vũ khí khác thì giữ nguyên. Túi đầy thì hòm nằm lại. Lọ thuốc thì uống luôn.
// Hòm có lựu đạn thưởng: chỉ cần vũ khí chính vừa túi là nhặt được hòm (xem takeBonus).
function tryPickup(room, p) {
  if (p.dead || cantAct(room, p)) return;
  const now = Date.now();
  for (const pickup of room.pickups.values()) {
    if (room.event?.kind === 'duel' && !pickup.duelLoot) continue;
    if (isTntCarrier(room, p) && !pickup.potion) continue;
    const near = Math.hypot(pickup.x - p.x, pickup.z - p.z) < PICKUP_RADIUS;
    if (blockedFor(pickup, p, near) || !near || now < pickup.landsAt) continue;
    if (pickup.potion) drinkPotion(p, pickup.potion, now); // thuốc không vào túi: uống ngay
    else if (!addToInventory(p, pickup.weapon, pickup.ammo, pickup.magazine)) continue;
    room.pickups.delete(pickup.id);
    const bonus = pickup.bonus ? takeBonus(room, p, pickup) : undefined;
    broadcast(room, { t: 'pickup', id: pickup.id, by: p.id, weapon: pickup.weapon, potion: pickup.potion, bonus });
    return;
  }
}

// Dọn sân khi sang trận mới / về phòng chờ (client dọn theo message 'start' / 'lobby').
const clearPickups = (room) => room.pickups.clear();

module.exports = { AIRDROP_LEAD_MS, findPickupPosition, pickupView, launchAirdrop, launchAirdropWave, tryPickup, clearPickups };
