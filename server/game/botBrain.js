const { BOT, BOT_LEVELS, DEFAULT_BOT_LEVEL } = require('../config');
const { WEAPONS } = require('./weapons');
const { applyClientState } = require('./movement');
const { handlePunch } = require('./combat');
const { handleFire } = require('./shooting');
const { handleThrow } = require('./grenades');
const { handleReload } = require('./magazines');
const { selectSlot, FIST_SLOT } = require('./inventory');
const { cantAct, sameDuelTeam } = require('./restrictions');
const { isPlaying } = require('./match');
const { scaleOf, radiusOf } = require('./potions');

// Bộ não bot (đơn giản, để thử game): mỗi nhịp chọn mục tiêu (người sống gần nhất, hoặc vật nhặt gần hơn một chút), đi tới đó, quay mặt về phía
// mục tiêu và đánh / bắn / ném bằng vũ khí đang cầm. Mọi hành động đi qua đúng các hàm xử lý tin nhắn của người chơi thật nên luật, hồi chiêu,
// sát thương, nhặt đồ đều giống hệt. Chưa biết: chạy nước rút, nhảy, né đạn, đi vòng xa quanh vật cản, chơi sự kiện / cờ / cược.

const walkable = (room, p, x, z) => {
  const radius = radiusOf(p);
  if (!room.terrain.isSupported(x, z)) return false; // không đi vào hư không giữa các đảo
  const inWall = room.mapData.walls.some((w) => Math.abs(x - w.x) < w.w / 2 + radius && Math.abs(z - w.z) < w.d / 2 + radius);
  return !inWall && !room.mapData.props.some((prop) => prop.r > 0 && Math.hypot(x - prop.x, z - prop.z) < prop.r + radius);
};

// Đi `step` mét theo hướng `heading`; bị vật cản chặn thì rẽ sang một bên, ưu tiên phía đã rẽ lần trước để trượt dọc vật cản chứ không lắc qua lại.
function walk(room, p, heading, step) {
  const side = p.botSide ?? 1;
  for (const angle of [0, ...BOT.sidestepAngles.map((a) => a * side), ...BOT.sidestepAngles.map((a) => -a * side)]) { // hết phía đã chọn mới thử phía kia
    const x = p.x + Math.sin(heading + angle) * step;
    const z = p.z + Math.cos(heading + angle) * step;
    if (!walkable(room, p, x, z)) continue;
    if (angle !== 0) p.botSide = Math.sign(angle);
    return { x, z };
  }
  return { x: p.x, z: p.z };
}

function nearestEnemy(room, p) {
  let best = null;
  for (const o of room.players.values()) {
    if (o === p || o.dead || o.tableId != null || sameDuelTeam(room, p, o)) continue;
    const dist = Math.hypot(o.x - p.x, o.z - p.z);
    if (dist < (best?.dist ?? Infinity)) best = { x: o.x, z: o.z, dist, player: o };
  }
  return best;
}

// Hòm / vũ khí / thuốc đã chạm đất trong tầm thấy; túi đầy thì chỉ thuốc, bỏ qua thứ chính mình vừa vứt (ignore).
// Tầm thấy và độ ưu tiên thuốc theo mức bot: mức thấp chỉ nhặt khi thật gần.
function nearestPickup(room, p, now, level) {
  const full = p.slots.every(Boolean);
  let best = null;
  for (const pickup of room.pickups.values()) {
    if (now < pickup.landsAt || pickup.ignore === p.id || pickup.ammo === 0 || (full && !pickup.potion)) continue;
    const dist = Math.hypot(pickup.x - p.x, pickup.z - p.z);
    if (dist > level.pickupRange || (pickup.potion && dist > level.potionRange)) continue;
    if (dist < (best?.dist ?? Infinity)) best = { x: pickup.x, z: pickup.z, dist };
  }
  return best;
}

// Dùng vũ khí đang cầm nếu mục tiêu trong tầm. Hồi chiêu, đạn, thay băng do các hàm xử lý tin nhắn tự kiểm tra.
// Trả về true nếu đã thực sự ra đòn (để thinkBot đặt thời gian nghỉ theo mức bot). `aimError` làm bắn / ném lệch.
function attack(room, p, enemy, yaw, level) {
  const weapon = WEAPONS[p.weapon];
  const { dist, player } = enemy;
  if (cantAct(room, p)) return false;
  const error = () => (Math.random() - 0.5) * 2 * level.aimError;
  if (weapon.kind === 'melee') {
    if (dist > weapon.range + BOT.meleeSlack) return false;
    p.botHand = p.botHand === 'L' ? 'R' : 'L';
    handlePunch(room, p, p.botHand);
    return true;
  }
  if (weapon.kind === 'gun' || weapon.kind === 'rocket') {
    const [near, far] = weapon.kind === 'rocket' ? BOT.rocketRange : [0, BOT.gunRange];
    if (dist < near || dist > far) return false;
    if (weapon.magazineSize && p.magazine === 0) {
      if (!p.reload) handleReload(room, p);
      return false;
    }
    const eye = 1.7 * scaleOf(p);
    const pitch = Math.atan2(eye - BOT.aimHeight * scaleOf(player), dist);
    handleFire(room, p, { yaw: yaw + error(), pitch: pitch + error() });
    return true;
  }
  if (weapon.kind === 'throwable') {
    const [near, far] = BOT.grenadeRange;
    if (dist < near || dist > far) return false;
    handleThrow(room, p, { yaw: yaw + error(), pitch: BOT.grenadePitch, soft: false });
    return true;
  }
  if (weapon.kind === 'nuke') selectSlot(p, FIST_SLOT); // bot không biết gọi bom: cất đi cho cầm vũ khí khác
  return false;
}

// Một nhịp suy nghĩ của một bot. Chỉ hoạt động khi đang trận (phòng chờ / hết trận đứng yên).
// Mức bot quyết định nhịp phản ứng, tốc độ, độ ham nhặt đồ, độ lệch khi ngắm và thời gian nghỉ giữa hai đòn.
function thinkBot(room, p, now = Date.now()) {
  if (!isPlaying(room) || p.dead) return;
  const level = BOT_LEVELS[p.botLevel] ?? BOT_LEVELS[DEFAULT_BOT_LEVEL];
  if (now < (p.botNextThinkAt ?? 0)) return; // mức thấp phản ứng chậm: bỏ qua nhịp này
  p.botNextThinkAt = now + level.thinkMs;
  const dt = Math.min(0.5, Math.max(BOT.tickMs, now - (p.botLastThinkAt ?? now - BOT.tickMs)) / 1000);
  p.botLastThinkAt = now;

  const enemy = nearestEnemy(room, p);
  const pickup = nearestPickup(room, p, now, level);
  const goal = pickup && (!enemy || pickup.dist < enemy.dist + level.pickupBias) ? pickup : enemy;
  if (!goal) return;
  const yaw = Math.atan2(goal.x - p.x, goal.z - p.z);
  const weapon = WEAPONS[p.weapon];
  const standOff = goal === enemy ? (weapon.kind === 'melee' ? Math.max(1.4, weapon.range - 0.7) : BOT.keepAway) : 0.3;
  const step = Math.min(goal.dist - standOff, BOT.speed * level.speedMult * dt);
  const next = goal.dist > standOff ? walk(room, p, yaw, step) : { x: p.x, z: p.z };
  const faceYaw = yaw + (Math.random() - 0.5) * 2 * level.turnError; // nhìn lệch: đòn cận chiến dễ trượt hơn
  applyClientState(room, p, { x: next.x, z: next.z, y: room.terrain.groundAt(next.x, next.z, p.y), yaw: faceYaw, c: 0, s: 0 });

  if (!enemy || now < (p.botAttackReadyAt ?? 0) || Math.random() < level.missChance) return;
  const dist = Math.hypot(enemy.x - p.x, enemy.z - p.z);
  if (attack(room, p, { ...enemy, dist }, yaw, level)) p.botAttackReadyAt = now + level.attackDelayMs;
}

module.exports = { thinkBot };
