const { MIN_DIST, HARD_OVERLAP } = require('../config');
const { currentMap, terrain } = require('../maps');
const { clamp } = require('../utils/math');
const { send } = require('../net/messaging');
const { tryPickup } = require('./pickups');

// Lưới an toàn: nếu client báo vị trí chồng sâu vào người khác thì đẩy ra và bắt client cập nhật lại.
function separate(room, p) {
  for (const o of room.players.values()) {
    if (o === p || o.dead) continue;
    const dx = p.x - o.x;
    const dz = p.z - o.z;
    const dist = Math.hypot(dx, dz);
    if (dist >= HARD_OVERLAP) continue;
    const nx = dist > 1e-4 ? dx / dist : 1;
    const nz = dist > 1e-4 ? dz / dist : 0;
    p.x = clamp(o.x + nx * MIN_DIST, -currentMap.size, currentMap.size);
    p.z = clamp(o.z + nz * MIN_DIST, -currentMap.size, currentMap.size);
    send(p.ws, { t: 'setpos', x: p.x, z: p.z });
  }
}

// Áp trạng thái client báo lên (đã kiểm tra số hợp lệ và giới hạn trong sân).
function applyClientState(room, p, m) {
  if (p.dead) return;
  if (!Number.isFinite(m.x) || !Number.isFinite(m.z) || !Number.isFinite(m.yaw)) return;
  p.x = clamp(m.x, -currentMap.size, currentMap.size);
  p.z = clamp(m.z, -currentMap.size, currentMap.size);
  p.yaw = m.yaw;
  // Độ cao chân (tuyệt đối): chỉ nhận trong khoảng từ mặt đất xuống một chút đến độ cao một cú nhảy.
  const ground = terrain.groundAt(p.x, p.z, Number.isFinite(m.y) ? m.y : -Infinity);
  p.y = Number.isFinite(m.y) ? clamp(m.y, ground - 0.5, ground + 4) : ground;
  p.c = m.c ? 1 : 0;
  separate(room, p);
  tryPickup(room, p);
}

module.exports = { applyClientState };
