const config = require('../config'); // NUKE_* đọc lúc dùng: chỉnh được khi server đang chạy (test)
const { clamp } = require('../utils/math');
const { broadcast } = require('../net/messaging');
const { applyDamage } = require('./damage');
const { eyeOf, pointAt, aimDirection, obstacleDistance } = require('./raycast');
const { clearTableGames } = require('./tableGames');

// Radio gọi bom hạt nhân: không kết thúc trận nữa mà là một đòn không kích vào một vùng. Người gọi ngắm vào đâu thì bom rơi đó;
// cả phòng nghe radio, còi báo động (client vẽ vùng đỏ quanh điểm rơi), máy bay bay qua điểm rơi, thả bom, bom nổ:
// trong `killRadius` chết ngay, tới `radius` mất máu giảm dần, ngoài nữa không sao. Mỗi phòng chỉ có một quả bom đang tới cùng lúc.
// Mọi mốc thời gian gửi cho client là "còn bao lâu kể từ bây giờ" (mili giây), giống các tin nhắn đồng hồ khác.

// Điểm bom rơi: dò từ mắt người gọi theo hướng ngắm tới tường / đất đầu tiên trong `maxRange`. Ngắm lên trời (hoặc xuống hư không
// của đảo trời) thì lấy điểm ở cuối tầm rồi hạ xuống mặt đất ngay dưới nó. Kẹp trong sân để vùng nổ không nằm ngoài map.
function aimPoint(room, p, yaw, pitch) {
  const { maxRange } = config.NUKE_AREA;
  const origin = eyeOf(p);
  const dir = aimDirection(yaw, pitch);
  const reach = Math.min(maxRange, obstacleDistance(room, origin, dir, maxRange));
  const end = pointAt(origin, dir, reach);
  const limit = room.mapData.size;
  const x = clamp(end.x, -limit, limit);
  const z = clamp(end.z, -limit, limit);
  const ground = room.terrain.groundAt(x, z, Infinity); // mặt cầu nếu có, -Infinity nếu là hư không của đảo trời
  const y = Number.isFinite(ground) ? ground : p.y; // nổ giữa trời ngang chân người gọi: vẫn có chỗ vẽ vùng đỏ và mây nấm
  return [x, y, z].map((v) => +v.toFixed(2));
}

// Bắt đầu một quả bom nhắm theo hướng `yaw`, `pitch` của người gọi. Trả về false nếu phòng đang có bom khác tới (không trừ đạn).
function startNuke(room, p, yaw, pitch) {
  if (room.nuke) return false;
  const { NUKE_PLANE_IN_MS, NUKE_PLANE_APPROACH, NUKE_PLANE_SPEED, NUKE_FALL_MS, NUKE_AREA } = config;
  clearTableGames(room, 'nuke');
  const planeIn = NUKE_PLANE_IN_MS;
  const dropIn = planeIn + (NUKE_PLANE_APPROACH / NUKE_PLANE_SPEED) * 1000;
  const boomIn = dropIn + NUKE_FALL_MS;
  const id = room.nextNukeId++;
  const at = aimPoint(room, p, yaw, pitch); // chỗ bom rơi; client tính đường bay của máy bay quanh điểm này nên luôn bay qua nó
  const view = {
    t: 'nuke',
    id,
    by: p.id,
    at,
    radius: NUKE_AREA.radius,
    killRadius: NUKE_AREA.killRadius,
    heading: +(Math.random() * Math.PI * 2).toFixed(3), // hướng bay của máy bay (yaw, cùng quy ước với người chơi)
    altitude: config.NUKE_PLANE_ALTITUDE,
    speed: NUKE_PLANE_SPEED,
    approach: NUKE_PLANE_APPROACH,
    radioIn: 0,
    raidIn: config.NUKE_RADIO_MS,
    planeIn,
    dropIn,
    boomIn,
  };
  room.nuke = { id, ownerId: p.id, at, view, startedAt: Date.now(), timer: setTimeout(() => detonate(room), boomIn) };
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

// Sát thương theo khoảng cách NGANG tới điểm rơi (không tính chênh cao): khớp vùng đỏ client vẽ là tường hình trụ đứng, người đứng
// trên đồi / cầu ngay trong vùng đỏ vẫn biết mình dính. Trong `killRadius`: hết máu; tới `radius`: giảm dần theo máu tối đa; ngoài: 0.
function nukeDamage(o, at) {
  const { radius, killRadius } = config.NUKE_AREA;
  const d = Math.hypot(o.x - at[0], o.z - at[2]);
  if (d <= killRadius) return o.hp;
  if (d >= radius) return 0;
  return Math.max(1, Math.round(o.maxHp * (radius - d) / (radius - killRadius)));
}

// Bom nổ: trừ máu mọi người còn sống theo khoảng cách, kể cả người gọi (tự dính thì không ai được tính hạ gục, xem damage.js).
// Hạ gục người khác tính cho người gọi nếu họ còn trong phòng. Trận vẫn tiếp tục.
function detonate(room) {
  const nuke = room.nuke;
  room.nuke = null;
  if (!nuke) return;
  const owner = room.players.get(nuke.ownerId) ?? null; // người gọi có thể đã thoát
  broadcast(room, { t: 'nukeboom', id: nuke.id, at: nuke.at, radius: nuke.view.radius }); // `radius`: client giảm độ trắng / rung theo khoảng cách
  for (const o of [...room.players.values()]) {
    if (!o.dead) applyDamage(room, owner, o, nukeDamage(o, nuke.at), 'nuke');
  }
}

// Hết trận / trận mới: huỷ quả bom đang tới, không cho nổ nữa (client dọn theo các tin nhắn đổi pha).
function clearNuke(room) {
  if (room.nuke) clearTimeout(room.nuke.timer);
  room.nuke = null;
}

module.exports = { startNuke, clearNuke, nukeView };
