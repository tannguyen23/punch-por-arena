const { PUNCH_COS, PUNCH_VERTICAL, RESPAWN_MS } = require('../config');
const { broadcast } = require('../net/messaging');
const { respawn } = require('./spawn');
const { WEAPONS, DEFAULT_WEAPON } = require('./weapons');
const { isPlaying } = require('./match');
const { punchBlockers } = require('../maps');
const { segmentIntersectsRect } = require('../utils/geometry');

// Có bức tường nào nằm giữa hai người không (đòn đấm không xuyên tường).
const wallBetween = (a, b) => punchBlockers.some((w) => segmentIntersectsRect(a.x, a.z, b.x, b.z, w));

// Người gần nhất trong phòng nằm trong tầm `range` của vũ khí, trong góc 35° phía trước mặt người đấm,
// không chênh độ cao quá `PUNCH_VERTICAL` và không bị tường chắn.
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
    if (dist > range || dist < 1e-6) continue;
    if (Math.abs(o.y - p.y) > PUNCH_VERTICAL) continue;
    if ((dx * fx + dz * fz) / dist < PUNCH_COS) continue;
    if (dist < best && !wallBetween(p, o)) {
      best = dist;
      target = o;
    }
  }
  return target;
}

function handlePunch(room, p, hand) {
  const now = Date.now();
  const weapon = WEAPONS[p.weapon];
  if (!isPlaying(room) || p.dead || now - p.lastPunch < weapon.cooldown) return; // phòng chờ / hết giờ thì không đánh
  p.lastPunch = now;
  broadcast(room, { t: 'punch', id: p.id, hand });

  const target = findPunchTarget(room, p, weapon.range);
  if (!target) return;

  target.hp = Math.max(0, target.hp - weapon.damage);
  broadcast(room, { t: 'hit', id: target.id, by: p.id, hand, dmg: weapon.damage });
  if (target.hp === 0) {
    target.dead = true;
    target.weapon = DEFAULT_WEAPON; // chết thì mất vũ khí
    p.kills++;
    setTimeout(() => room.players.has(target.id) && respawn(room, target), RESPAWN_MS);
  }
}

module.exports = { handlePunch };
