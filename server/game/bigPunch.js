const { BIG_PUNCH } = require('../config');
const { broadcast, send } = require('../net/messaging');
const { POTIONS } = require('./potions');
const { DEFAULT_WEAPON } = require('./weapons');
const { cantAct, isFrozen } = require('./restrictions');
const { applyDamage } = require('./damage');
const { wallBetween } = require('./raycast');

// "Đấm trời giáng" của người đang hoá to (thuốc có `bigPunch`, xem potions.js): giữ phím để tích lực BIG_PUNCH.chargeMs, thả ra thì tung
// một cú đấm thẳng; tới lúc tay duỗi hết cỡ (impactMs sau, khớp khung hình của clip big_right_punch) sóng xung kích nổ ra ngay trước
// nắm đấm, đánh văng và gây sát thương mọi người trong bán kính, càng xa tâm càng nhẹ. Chỉ dùng được khi tay không, có hồi chiêu.
// Vị trí người chơi do client quyết định nên đánh văng = gửi vận tốc cho máy của nạn nhân (tin 'knockback'), nó tự đẩy mình đi.

const canUse = (room, p) =>
  room.phase === 'playing' && !p.dead && !cantAct(room, p) && Boolean(POTIONS[p.potion?.id]?.bigPunch) && p.weapon === DEFAULT_WEAPON;

// Tin 'bigcharge': bắt đầu giữ phím. Mọi người trong phòng thấy tư thế lấy đà.
function startCharge(room, p) {
  if (p.bigChargeAt || Date.now() < p.bigPunchReadyAt || !canUse(room, p)) return;
  p.bigChargeAt = Date.now();
  broadcast(room, { t: 'bigcharge', id: p.id });
}

// Tin 'bigrelease': thả phím. Giữ chưa đủ lâu (hoặc không còn dùng được) thì huỷ, không tốn hồi chiêu; đủ thì tung đòn.
function releaseCharge(room, p) {
  const now = Date.now();
  const heldMs = p.bigChargeAt ? now - p.bigChargeAt : 0;
  p.bigChargeAt = 0;
  if (heldMs < BIG_PUNCH.chargeMs - BIG_PUNCH.slackMs || !canUse(room, p)) {
    broadcast(room, { t: 'bigcancel', id: p.id }); // cũng gửi khi chẳng có lần tích lực nào: người khác đang kẹt ở tư thế lấy đà thì được gỡ
    return;
  }
  p.bigPunchReadyAt = now + BIG_PUNCH.cooldownMs;
  broadcast(room, { t: 'bigpunch', id: p.id, impactIn: BIG_PUNCH.impactMs });
  setTimeout(() => impact(room, p), BIG_PUNCH.impactMs);
}

// Sóng xung kích: tâm cách người đấm `reach` mét theo hướng nhìn. Người trong bán kính (không bị tường chặn, không chênh độ cao quá `vertical`)
// mất máu và bị đẩy ra xa tâm; đứng đúng tâm thì bị đẩy theo hướng đấm.
function impact(room, p) {
  if (room.phase !== 'playing' || room.players.get(p.id) !== p || p.dead || isFrozen(room) || p.tableId != null) return;
  const { reach, radius, vertical, damage, edgeDamageMult, knockSpeed, edgeKnockMult, lift } = BIG_PUNCH;
  const forward = { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
  const x = p.x + forward.x * reach;
  const z = p.z + forward.z * reach;
  broadcast(room, { t: 'bigimpact', id: p.id, at: [x, room.terrain.heightAt(x, z), z].map((v) => +v.toFixed(2)), r: radius });
  for (const o of [...room.players.values()]) {
    if (o === p || o.dead || o.tableId != null) continue;
    const dx = o.x - x;
    const dz = o.z - z;
    const dist = Math.hypot(dx, dz);
    if (dist > radius || Math.abs(o.y - p.y) > vertical || wallBetween(room, p, o)) continue;
    const far = dist / radius; // 0 ở tâm, 1 ở mép
    applyDamage(room, p, o, damage * (1 - (1 - edgeDamageMult) * far));
    if (o.dead) continue;
    const dir = dist > 0.3 ? { x: dx / dist, z: dz / dist } : forward;
    const speed = knockSpeed * (1 - (1 - edgeKnockMult) * far);
    send(o.ws, { t: 'knockback', vx: +(dir.x * speed).toFixed(2), vz: +(dir.z * speed).toFixed(2), vy: lift });
  }
}

module.exports = { startCharge, releaseCharge };
