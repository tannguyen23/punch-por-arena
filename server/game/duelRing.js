const { DUEL } = require('../config');
const { clamp } = require('../utils/math');
const { send } = require('../net/messaging');
const { isFree } = require('./spawn');

// Hình học của sự kiện solo: chỗ đứng của hai võ sĩ, chỗ đứng của người xem và giữ mọi người đúng khu vực của mình.
// Võ đài là dữ liệu của map (`mapData.ring`: tâm, nửa cạnh, `leash` = người xem chỉ đi được trong ngần này mét quanh tâm).

// Đặt `p` vào (x, z) quay mặt về phía (lookX, lookZ); báo cho client để máy họ dịch theo (vị trí do client quyết định).
function moveTo(room, p, { x, z }, lookX, lookZ) {
  p.x = x;
  p.z = z;
  p.y = room.terrain.heightAt(x, z);
  p.yaw = Math.atan2(lookX - x, lookZ - z);
  p.fallStartedAt = 0;
  send(p.ws, { t: 'setpos', x, z, yaw: p.yaw });
}

// Mỗi hiệp: hai võ sĩ đứng hai bên tâm, đối mặt nhau, máu đầy, còn sống.
function placeFighters(room, fighters) {
  const { x, z } = room.mapData.ring;
  const spots = [{ x: x - DUEL.fighterOffset, z }, { x: x + DUEL.fighterOffset, z }];
  fighters.forEach((p, i) => {
    p.dead = false;
    p.hp = p.maxHp;
    p.lastHurtAt = 0;
    moveTo(room, p, spots[i], spots[1 - i].x, z);
  });
}

// Vòng quanh võ đài, ngoài dây ít nhất `spectatorGap`, trong phạm vi `leash`, chỗ trống không đè lên vật cản. Hết cách thì đứng sát dây phía đông.
function spectatorSpot(room) {
  const { x, z, half, leash } = room.mapData.ring;
  const inner = half + DUEL.spectatorGap;
  const outer = leash - 1;
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = inner + Math.random() * (outer - inner);
    const pos = { x: x + Math.cos(angle) * r, z: z + Math.sin(angle) * r };
    const outside = Math.max(Math.abs(pos.x - x), Math.abs(pos.z - z)) >= inner; // góc ô vuông gần tâm hơn cạnh
    if (outside && isFree(room, pos)) return pos;
  }
  return { x: x + inner, z };
}

// Đưa mọi người ngoài hai võ sĩ ra quanh võ đài, mặt hướng vào tâm.
function placeSpectators(room, fighterIds) {
  const { x, z } = room.mapData.ring;
  for (const p of room.players.values()) {
    if (p.dead || fighterIds.includes(p.id)) continue;
    moveTo(room, p, spectatorSpot(room), x, z);
  }
}

const SPOT_TOLERANCE = 0.01; // mét: lệch dưới ngần này coi như đang đứng đúng chỗ

// Vị trí hợp lệ gần nhất cho `p` trong lúc sự kiện solo, hoặc null nếu chỗ đang đứng đã hợp lệ: võ sĩ ở trong võ đài (cách dây `fighterMargin`),
// người xem ở ngoài dây và trong vòng `leash`. Dùng cho vị trí client báo (movement.js).
function confinedSpot(room, p) {
  const ev = room.event;
  const ring = room.mapData.ring;
  if (ev?.kind !== 'duel' || !ring) return null;
  const dx = p.x - ring.x;
  const dz = p.z - ring.z;
  let nx = dx;
  let nz = dz;
  if (ev.fighters.includes(p.id)) {
    const limit = ring.half - DUEL.fighterMargin;
    nx = clamp(dx, -limit, limit);
    nz = clamp(dz, -limit, limit);
  } else {
    const edge = ring.half + DUEL.spectatorEdge;
    if (Math.max(Math.abs(dx), Math.abs(dz)) < edge) { // lọt vào trong: đẩy ra theo trục lệch nhiều hơn
      if (Math.abs(dx) >= Math.abs(dz)) nx = (dx < 0 ? -1 : 1) * edge;
      else nz = (dz < 0 ? -1 : 1) * edge;
    }
    const far = Math.hypot(nx, nz);
    if (far > ring.leash) {
      nx *= ring.leash / far;
      nz *= ring.leash / far;
    }
  }
  if (Math.hypot(nx - dx, nz - dz) < SPOT_TOLERANCE) return null; // client tự chặn cùng công thức nên chỉ lệch do làm tròn: đừng gửi lệnh kéo lại vô nghĩa
  return { x: ring.x + nx, z: ring.z + nz };
}

module.exports = { placeFighters, placeSpectators, confinedSpot };
