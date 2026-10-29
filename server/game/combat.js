const { PUNCH_COS, PUNCH_VERTICAL, PLAYER_RADIUS } = require('../config');
const { broadcast } = require('../net/messaging');
const { WEAPONS } = require('./weapons');
const { useAmmo, hasAmmo } = require('./inventory');
const { isPlaying } = require('./match');
const { cantAct } = require('./restrictions');
const { applyDamage } = require('./damage');
const { wallBetween } = require('./raycast');
const { radiusOf } = require('./potions');

// Người gần nhất trong phòng nằm trong tầm `range` của vũ khí, trong góc 35° phía trước mặt người đấm,
// không chênh độ cao quá `PUNCH_VERTICAL` và không bị tường chắn. Tầm tính từ tâm nên cộng thêm phần bán kính va chạm lớn hơn bình thường
// của hai bên (người to hơn thì không thể đứng sát), và bớt đi nếu nhỏ hơn.
function findPunchTarget(room, p, range) {
  const fx = Math.sin(p.yaw);
  const fz = Math.cos(p.yaw);
  let target = null;
  let best = Infinity;
  for (const o of room.players.values()) {
    if (o === p || o.dead) continue;
    const dx = o.x - p.x;
    const dz = o.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist > range + radiusOf(p) + radiusOf(o) - 2 * PLAYER_RADIUS || dist < 1e-6) continue;
    if (Math.abs(o.y - p.y) > PUNCH_VERTICAL) continue;
    if ((dx * fx + dz * fz) / dist < PUNCH_COS) continue;
    if (dist < best && !wallBetween(room, p, o)) {
      best = dist;
      target = o;
    }
  }
  return target;
}

// Đòn cận chiến (tay không, dao...). Súng và tên lửa đi đường 'fire' (shooting.js). Dao mỗi lần chém mất một độ bền, gãy rồi thì không chém được.
function handlePunch(room, p, hand) {
  const now = Date.now();
  const weapon = WEAPONS[p.weapon];
  if (weapon.kind !== 'melee' || !hasAmmo(p)) return;
  if (!isPlaying(room) || p.dead || cantAct(room, p) || now - p.lastAttack < weapon.cooldown) return; // phòng chờ / hết giờ / hoá chó / đứng hình thì không đánh
  p.lastAttack = now;
  broadcast(room, { t: 'punch', id: p.id, hand });
  const target = findPunchTarget(room, p, weapon.range);
  useAmmo(p);
  if (target) applyDamage(room, p, target, weapon.damage);
}

module.exports = { handlePunch };
