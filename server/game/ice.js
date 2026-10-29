const { GRENADE } = require('../config');
const { broadcast } = require('../net/messaging');

// Lựu đạn băng (effect 'ice' trong grenades.js): hết ngòi thì mặt đất chỗ quả đang nằm biến thành vũng băng trong `duration` ms.
// Server chỉ giữ danh sách vũng băng để báo cho người mới vào phòng; việc trượt do client tính (player/iceSlide.js) vì di chuyển do client quyết định.

const ON_TERRAIN_TOLERANCE = 0.6; // quả cao hơn mặt đất ngần này (nằm trên cầu) thì không đóng băng được

const pack = (v) => [v.x, v.y, v.z].map((n) => +n.toFixed(2));

// Nổ thành băng. Đóng băng được khi quả nằm trên đất khô; rơi xuống nước hoặc nằm trên cầu thì chỉ vỡ vụn, không có vũng băng.
// Gửi 'detonate' như mọi lựu đạn, kèm `ice` = { frozen, life } cho client dựng vũng băng.
function freezeGround(room, grenade, weapon) {
  const { x, z } = grenade.pos;
  const ground = room.terrain.heightAt(x, z);
  const frozen = room.terrain.isDry(x, z) && Math.abs(grenade.pos.y - GRENADE.radius - ground) < ON_TERRAIN_TOLERANCE;
  if (frozen) room.icePatches.push({ id: grenade.id, x, z, r: weapon.splash, endsAt: Date.now() + weapon.duration });
  broadcast(room, {
    t: 'detonate',
    id: grenade.id,
    w: grenade.weapon,
    at: pack({ x, y: ground, z }),
    r: weapon.splash,
    ice: { frozen, life: weapon.duration },
  });
}

// Các vũng băng còn tồn tại, cho người mới vào phòng: { id, at, r, left } (left = mili giây còn lại).
function iceView(room) {
  const now = Date.now();
  room.icePatches = room.icePatches.filter((patch) => patch.endsAt > now);
  return room.icePatches.map((patch) => ({
    id: patch.id,
    at: pack({ x: patch.x, y: room.terrain.heightAt(patch.x, patch.z), z: patch.z }),
    r: patch.r,
    left: patch.endsAt - now,
  }));
}

// Hết trận / trận mới: bỏ mọi vũng băng (client dọn theo các tin nhắn đổi pha).
function clearIce(room) {
  room.icePatches = [];
}

module.exports = { freezeGround, iceView, clearIce };
