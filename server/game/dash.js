const { DASH, PITCH_LIMIT } = require('../config');
const { broadcast } = require('../net/messaging');
const { clamp } = require('../utils/math');
const { cantAct } = require('./restrictions');
const { scaleOf } = require('./potions');
const { aimDirection, wallDistance, pointAt } = require('./raycast');

const { glide } = DASH;

// Dash của động cơ phản lực sau lưng: lao thẳng DASH.distance mét theo hướng nhìn (cả lên / xuống) trong chưa đầy một giây, không sát thương,
// rồi nếu còn lơ lửng thì liệng xuống chậm (DASH.glide, client lo phần rơi chậm) tới khi chạm đất.
// Vị trí do client quyết định nên server chỉ tính kế hoạch (cùng dạng đường bay với quả ném, gravity = 0, xem trajectory.js) rồi phát cho cả phòng;
// client của người dash tự bay theo (player/leapFlight.js). `p.leap` giữ khoảng độ cao chân được phép trong lúc bay (leapBounds trong bigLeap.js).

const canDash = (room, p, now) =>
  room.phase === 'playing' && !p.dead && !cantAct(room, p) && !p.bigChargeAt && now >= p.dashReadyAt && !(p.leap && now < (p.leap.flightEndsAt ?? p.leap.endsAt)); // đang liệng thì dash tiếp được

// Kế hoạch { from, to, velocity, duration } hoặc null nếu bị chặn ngay trước mặt. Chỉ tường chặn đòn làm ngắn đường dash; đồi thì cưỡi lên:
// điểm cuối không bao giờ thấp hơn mặt đất (kể cả mặt cầu nếu chân đang đủ cao), chỗ không có đất đỡ thì cứ bay tiếp rồi rơi.
function planDash(room, p, yaw, pitch) {
  const dir = aimDirection(yaw, clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT));
  const from = { x: p.x, y: p.y, z: p.z };
  const chest = { x: p.x, y: p.y + DASH.chestHeight * scaleOf(p), z: p.z };
  const length = Math.min(DASH.distance, wallDistance(room, chest, dir, DASH.distance + DASH.margin) - DASH.margin);
  if (length < DASH.minDistance) return null;
  const limit = room.mapData.size - 0.5;
  const to = pointAt(from, dir, length);
  to.x = clamp(to.x, -limit, limit);
  to.z = clamp(to.z, -limit, limit);
  const ground = room.terrain.groundAt(to.x, to.z, from.y);
  if (Number.isFinite(ground)) to.y = Math.max(to.y, ground);
  const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  if (distance < DASH.minDistance) return null;
  const duration = Math.round((distance / DASH.speed) * 1000);
  const height = to.y - ground; // chỗ không có đất đỡ (ground không hữu hạn): liệng tối đa maxMs rồi rơi
  const glideMs = !Number.isFinite(height) ? glide.maxMs : height > glide.landTolerance ? Math.min(glide.maxMs, Math.ceil((height / glide.fallSpeed) * 1000) + glide.slackMs) : 0;
  const seconds = duration / 1000;
  const velocity = { x: (to.x - from.x) / seconds, y: (to.y - from.y) / seconds, z: (to.z - from.z) / seconds };
  return { from, to, velocity, duration, glideMs };
}

// Tin 'dash' { yaw, pitch }. Không dash được (đang bị chặn, hồi chiêu, tường sát mặt) thì bỏ qua, không tốn hồi chiêu.
function handleDash(room, p, m) {
  const now = Date.now();
  if (!Number.isFinite(m?.yaw) || !Number.isFinite(m?.pitch) || !canDash(room, p, now)) return;
  const plan = planDash(room, p, m.yaw, m.pitch);
  if (!plan) return;
  p.yaw = m.yaw;
  p.dashReadyAt = now + DASH.cooldownMs;
  p.leap = { from: plan.from, to: plan.to, apex: 0, flightEndsAt: now + plan.duration, endsAt: now + plan.duration + plan.glideMs, glide: plan.glideMs > 0 };
  const pack = (v) => [v.x, v.y, v.z].map((n) => +n.toFixed(3));
  broadcast(room, { // cùng dạng với tin 'bigpunch': from / velocity / gravity / duration, cộng chỗ đến và thời gian hồi chiêu
    t: 'dash', id: p.id, from: pack(plan.from), velocity: pack(plan.velocity), gravity: 0, duration: plan.duration,
    to: pack(plan.to), cooldownMs: DASH.cooldownMs, glideMs: plan.glideMs, glideFall: glide.fallSpeed, glideEaseMs: glide.easeMs,
  });
}

// Đang liệng mà chân đã chạm đất (client báo y sát mặt đất) thì trả giới hạn độ cao về bình thường, khỏi chờ hết thời gian liệng ước tính.
function endGlideOnLanding(p, ground, y, now = Date.now()) {
  const flight = p.leap;
  if (flight?.glide && now > flight.flightEndsAt && Number.isFinite(ground) && Number.isFinite(y) && y <= ground + glide.landTolerance) p.leap = null;
}

module.exports = { handleDash, endGlideOnLanding };
