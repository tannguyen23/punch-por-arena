const { MIN_DIST, HARD_OVERLAP, VOID_FALL_DEATH_MS } = require('../config');
const { clamp } = require('../utils/math');
const { send } = require('../net/messaging');
const { tryPickup } = require('./pickups');
const { checkHazardContact } = require('./hazards');
const { applyDamage } = require('./damage');
const { isFrozen, isHeld } = require('./restrictions');
const { checkPoopContact } = require('./poop');
const { confinedSpot } = require('./duelRing');
const { randomFreePosition } = require('./spawn');
const { leapBounds } = require('./bigLeap');
const { endGlideOnLanding } = require('./dash');

// TNT chặn sát thương rơi: đưa lại sân thay vì để người chơi kẹt mãi dưới đảo.
function recoverTntFall(room, p) {
  const pos = randomFreePosition(room);
  Object.assign(p, pos, { y: room.terrain.groundAt(pos.x, pos.z, Infinity), fallStartedAt: 0 });
  send(p.ws, { t: 'setpos', x: p.x, y: p.y, z: p.z });
}

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
    p.x = clamp(o.x + nx * MIN_DIST, -room.mapData.size, room.mapData.size);
    p.z = clamp(o.z + nz * MIN_DIST, -room.mapData.size, room.mapData.size);
    send(p.ws, { t: 'setpos', x: p.x, z: p.z });
  }
}

// Áp trạng thái client báo lên (đã kiểm tra số hợp lệ và giới hạn trong sân).
function applyClientState(room, p, m) {
  if (p.dead || isFrozen(room) || isHeld(room, p)) return; // đứng hình / võ sĩ giữa các hiệp: bỏ qua vị trí client báo (client cũng đã đứng yên)
  if (!Number.isFinite(m.x) || !Number.isFinite(m.z) || !Number.isFinite(m.yaw)) return;
  p.x = clamp(m.x, -room.mapData.size, room.mapData.size);
  p.z = clamp(m.z, -room.mapData.size, room.mapData.size);
  p.yaw = m.yaw;
  // Có chỗ đứng hay không xét theo cả độ cao chân (không chỉ mặt sân 2D): rơi dưới gầm cầu nổi / dưới đảo vẫn là đang rơi,
  // nếu không đồng hồ rơi bị đặt lại mãi và người đó rơi không bao giờ chết để hồi sinh.
  const ground = room.terrain.groundAt(p.x, p.z, Number.isFinite(m.y) ? m.y : p.y);
  endGlideOnLanding(p, ground, m.y);
  const air = leapBounds(p); // đang nhảy đấm trời giáng: bay cao hơn mức nhảy thường và có thể vắt qua hư không
  if (air) {
    p.fallStartedAt = 0;
    p.y = Number.isFinite(m.y) ? clamp(m.y, air.min, air.max) : p.y;
  } else if (Number.isFinite(ground)) {
    p.fallStartedAt = 0;
    p.y = Number.isFinite(m.y) ? clamp(m.y, ground - 0.5, ground + 4) : ground;
  } else {
    const now = Date.now();
    p.fallStartedAt ||= now;
    p.y = Number.isFinite(m.y) ? clamp(m.y, p.y - 2, p.y + 2) : p.y;
    if (now - p.fallStartedAt >= VOID_FALL_DEATH_MS) {
      if (room.event?.kind === 'tnt') recoverTntFall(room, p);
      else applyDamage(room, null, p, p.hp, 'fall');
      return;
    }
  }
  p.c = m.c ? 1 : 0;
  p.sprinting = m.s === 1 && !p.c;
  separate(room, p);
  const spot = confinedSpot(room, p); // sự kiện solo: võ sĩ bị nhốt trong võ đài, người xem không vào được và không đi xa
  if (spot) {
    Object.assign(p, spot);
    send(p.ws, { t: 'setpos', ...spot });
  }
  checkHazardContact(room, p);
  tryPickup(room, p);
  checkPoopContact(room, p);
}

module.exports = { applyClientState };
