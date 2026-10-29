const { FIRE_SLACK_MS, PITCH_LIMIT } = require('../config');
const { clamp } = require('../utils/math');
const { broadcast } = require('../net/messaging');
const { WEAPONS, useAmmo } = require('./weapons');
const { isPlaying } = require('./match');
const { applyDamage } = require('./damage');
const { eyeOf, pointAt, aimDirection, obstacleDistance, firstBodyHit } = require('./raycast');
const { launchRocket } = require('./rockets');

const pack = (p) => [p.x, p.y, p.z].map((v) => +v.toFixed(2));
const wobble = (angle, spread) => angle + (Math.random() * 2 - 1) * spread;

// Súng: đạn bay tức thì từ mắt người bắn theo hướng ngắm (lệch ngẫu nhiên theo `spread`), dừng ở người, tường hoặc đất
// đầu tiên. Mọi người nhận súng `w`, điểm đầu/cuối để vẽ vệt đạn; `impact` = đạn găm vào tường/đất (có tia lửa).
function fireBullet(room, p, weapon, yaw, pitch) {
  const origin = eyeOf(p);
  const dir = aimDirection(wobble(yaw, weapon.spread), wobble(pitch, weapon.spread));
  const reach = Math.min(weapon.range, obstacleDistance(origin, dir, weapon.range));
  const hit = firstBodyHit(room, origin, dir, reach, p);
  const dist = hit ? hit.dist : reach;
  const impact = !hit && reach < weapon.range;
  broadcast(room, { t: 'shot', id: p.id, w: p.weapon, from: pack(origin), to: pack(pointAt(origin, dir, dist)), hit: hit?.target.id ?? null, impact });
  if (hit) applyDamage(room, p, hit.target, weapon.damage);
}

// Tin nhắn 'fire' { yaw, pitch }: bắn súng hoặc tên lửa đang cầm. Server kiểm tra pha, hồi chiêu và số đạn.
function handleFire(room, p, m) {
  if (!Number.isFinite(m.yaw) || !Number.isFinite(m.pitch)) return;
  const weapon = WEAPONS[p.weapon];
  const now = Date.now();
  if (weapon.kind === 'melee' || !isPlaying(room) || p.dead || !(p.ammo > 0)) return;
  if (now - p.lastAttack < weapon.cooldown - FIRE_SLACK_MS) return;
  p.lastAttack = now;
  p.yaw = m.yaw; // hướng lúc bóp cò mới hơn hướng trong tin nhắn 'state' gần nhất
  const pitch = clamp(m.pitch, -PITCH_LIMIT, PITCH_LIMIT);
  if (weapon.kind === 'rocket') launchRocket(room, p, weapon, aimDirection(m.yaw, pitch));
  else fireBullet(room, p, weapon, m.yaw, pitch);
  useAmmo(p);
}

module.exports = { handleFire };
