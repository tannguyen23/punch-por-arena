const {
  NUKE_RADIO_MS, NUKE_PLANE_IN_MS, NUKE_PLANE_SPEED, NUKE_PLANE_APPROACH, NUKE_PLANE_ALTITUDE, NUKE_FALL_MS, NUKE_END_SCREEN_MS,
} = require('../config');
const { broadcast } = require('../net/messaging');
const { applyDamage } = require('./damage');

// Radio gọi bom hạt nhân: người dùng gọi radio, cả phòng nghe (client phát âm thanh theo các mốc bên dưới), máy bay bay qua tâm sân,
// thả bom, bom nổ và mọi người chơi còn sống trong phòng mất hết máu. Mỗi phòng chỉ có một quả bom đang tới cùng lúc.
// Mọi mốc thời gian gửi cho client là "còn bao lâu kể từ bây giờ" (mili giây), giống các tin nhắn đồng hồ khác.

const DROP_POINT = { x: 0, z: 0 }; // tâm sân

// Bắt đầu một quả bom. Trả về false nếu phòng đang có bom khác tới (không trừ đạn của người dùng).
function startNuke(room, p) {
  if (room.nuke) return false;
  const planeIn = NUKE_PLANE_IN_MS;
  const dropIn = planeIn + (NUKE_PLANE_APPROACH / NUKE_PLANE_SPEED) * 1000;
  const boomIn = dropIn + NUKE_FALL_MS;
  const id = room.nextNukeId++;
  const ground = room.terrain.heightAt(DROP_POINT.x, DROP_POINT.z);
  const at = [DROP_POINT.x, +ground.toFixed(2), DROP_POINT.z]; // chỗ bom rơi, trên mặt đất
  const view = {
    t: 'nuke',
    id,
    by: p.id,
    at,
    heading: +(Math.random() * Math.PI * 2).toFixed(3), // hướng bay của máy bay (yaw, cùng quy ước với người chơi)
    altitude: NUKE_PLANE_ALTITUDE,
    speed: NUKE_PLANE_SPEED,
    approach: NUKE_PLANE_APPROACH,
    radioIn: 0,
    raidIn: NUKE_RADIO_MS,
    planeIn,
    dropIn,
    boomIn,
  };
  room.nuke = { id, ownerId: p.id, ownerName: p.name, at, view, startedAt: Date.now(), timer: setTimeout(() => detonate(room), boomIn) };
  broadcast(room, view);
  return true;
}

// Quả bom đang tới (nếu có) cho người vừa vào phòng: cùng tin 'nuke' nhưng các mốc đã trừ đi thời gian trôi qua (âm = đã qua),
// để họ cũng nghe đúng phần còn lại của radio, còi báo động, bom rít và thấy máy bay / bom đúng chỗ.
function nukeView(room) {
  if (!room.nuke) return null;
  const { view, startedAt } = room.nuke;
  const elapsed = Date.now() - startedAt;
  const shifted = Object.fromEntries(['radioIn', 'raidIn', 'planeIn', 'dropIn', 'boomIn'].map((key) => [key, view[key] - elapsed]));
  return { ...view, ...shifted };
}

// Bom nổ: mọi người còn sống trong phòng mất hết máu. Hạ gục tính cho người gọi bom (trừ chính họ). Rồi trận kết thúc ngay và
// người gọi bom thắng (kể cả khi họ đã thoát: tên lưu từ lúc gọi). Bảng kết quả hiện sau NUKE_END_SCREEN_MS cho cả phòng xem xong vụ nổ.
function detonate(room) {
  const nuke = room.nuke;
  room.nuke = null;
  if (!nuke) return;
  const owner = room.players.get(nuke.ownerId) ?? null; // người gọi có thể đã thoát
  broadcast(room, { t: 'nukeboom', id: nuke.id, at: nuke.at });
  for (const o of [...room.players.values()]) {
    if (!o.dead) applyDamage(room, owner, o, o.hp);
  }
  const { endMatch } = require('./match'); // require muộn: match.js cũng require file này
  endMatch(room, { winner: { id: nuke.ownerId, name: nuke.ownerName }, showIn: NUKE_END_SCREEN_MS });
}

// Hết trận / trận mới: huỷ quả bom đang tới, không cho nổ nữa (client dọn theo các tin nhắn đổi pha).
function clearNuke(room) {
  if (room.nuke) clearTimeout(room.nuke.timer);
  room.nuke = null;
}

module.exports = { startNuke, clearNuke, nukeView };
