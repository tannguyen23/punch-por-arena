const { BIG_PUNCH, PITCH_LIMIT } = require('../config');
const { clamp } = require('../utils/math');
const { eyeOf, aimDirection, groundDistance } = require('./raycast');
const { arcTo } = require('./trajectory');

// Cú nhảy của "đấm trời giáng" (xem BIG_PUNCH.leap): một đường bay như quả ném (trajectory.js) nhưng vận tốc được suy ra để rơi đúng điểm đã chọn.
// Cách chọn điểm rơi phải khớp planLeap ở public/js/core/throwPath.js (client dùng cho đường xem trước; chỗ rơi thật do server quyết định rồi
// gửi cho client trong tin 'bigpunch').
const { leap } = BIG_PUNCH;

// Chỗ rơi cách người nhảy `dist` mét theo hướng nhìn ngang, hoặc null nếu không có đất đỡ.
function landingAt(room, p, yaw, dist, limit) {
  const x = clamp(p.x + Math.sin(yaw) * dist, -limit, limit);
  const z = clamp(p.z + Math.cos(yaw) * dist, -limit, limit);
  const y = room.terrain.groundAt(x, z, Infinity);
  return room.terrain.isSupported(x, z) && Number.isFinite(y) ? { x, y, z } : null;
}

// Kế hoạch nhảy { flight, to, apex } từ chỗ p đang đứng tới chỗ tia ngắm chạm đất (nhìn ngang / lên trời: xa tối đa), hoặc null nếu không có chỗ rơi nào.
function planLeap(room, p, yaw, pitch) {
  const limit = room.mapData.size - 0.5;
  const dir = aimDirection(yaw, clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT));
  let dist = clamp(groundDistance(room, eyeOf(p), dir, leap.maxRange, leap.rayStep), leap.minRange, leap.maxRange);
  let to = landingAt(room, p, yaw, dist, limit);
  while (!to && dist > leap.minRange) { // hư không: lùi dần về phía người nhảy
    dist = Math.max(leap.minRange, dist - leap.backoffStep);
    to = landingAt(room, p, yaw, dist, limit);
  }
  if (!to) return null;
  const length = Math.hypot(to.x - p.x, to.z - p.z);
  const apex = Math.min(leap.maxApex, leap.minApex + leap.apexPerMeter * length);
  const flightMs = Math.round(leap.baseMs + leap.perMeterMs * length);
  return { flight: arcTo({ x: p.x, y: p.y, z: p.z }, to, flightMs, apex), to, apex };
}

// Khoảng độ cao chân được phép trong lúc đang bay (movement.js dùng thay cho giới hạn sát mặt đất), hoặc null nếu không đang nhảy.
function leapBounds(p, now = Date.now()) {
  const flight = p.leap;
  if (!flight || now > flight.endsAt + leap.graceMs) return null;
  return { min: Math.min(flight.from.y, flight.to.y) - 1, max: Math.max(flight.from.y, flight.to.y) + flight.apex + 1 };
}

module.exports = { planLeap, leapBounds };
