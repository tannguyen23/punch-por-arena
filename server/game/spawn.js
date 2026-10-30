const { MAX_HP, SPAWN_CLEARANCE, PLAYER_RADIUS, MAP_MARGIN } = require('../config');
const { send } = require('../net/messaging');
const { distToRect } = require('../utils/geometry');
const { clearPotion } = require('./potions');

// Vị trí khô ráo, không đè lên vật phẩm, tường nào và không sát người chơi còn sống trong phòng.
function isFree(room, pos) {
  if (!room.terrain.isDry(pos.x, pos.z)) return false;
  const onProp = room.mapData.props.some((p) => p.r > 0 && Math.hypot(p.x - pos.x, p.z - pos.z) < p.r + PLAYER_RADIUS);
  if (onProp) return false;
  if (room.mapData.walls.some((w) => distToRect(pos.x, pos.z, w) < PLAYER_RADIUS + 0.3)) return false;
  return ![...room.players.values()].some((o) => !o.dead && Math.hypot(o.x - pos.x, o.z - pos.z) < SPAWN_CLEARANCE);
}

// Vị trí ngẫu nhiên trong sân, tránh vật phẩm, tường và người chơi. Dùng cho chỗ hồi sinh và chỗ vũ khí rơi.
function randomFreePosition(room) {
  const range = room.mapData.size - MAP_MARGIN;
  let pos;
  const attempts = room.terrain.islands.length ? 200 : 20;
  for (let i = 0; i < attempts; i++) {
    pos = { x: (Math.random() * 2 - 1) * range, z: (Math.random() * 2 - 1) * range };
    if (isFree(room, pos)) break;
  }
  return pos;
}

// Vị trí trống cách `center` chừng `distance` mét (hướng ngẫu nhiên). Không tìm được chỗ trống thì lấy chỗ ngẫu nhiên trong sân.
function freePositionNear(room, center, distance) {
  const range = room.mapData.size - MAP_MARGIN;
  const attempts = room.terrain.islands.length ? 200 : 20; // bản đồ đảo trời: phần lớn là hư không nên thử nhiều hơn
  for (let i = 0; i < attempts; i++) {
    const angle = Math.random() * Math.PI * 2;
    const d = distance * (0.6 + 0.4 * Math.random());
    const pos = {
      x: Math.max(-range, Math.min(range, center.x + Math.cos(angle) * d)),
      z: Math.max(-range, Math.min(range, center.z + Math.sin(angle) * d)),
    };
    if (isFree(room, pos)) return pos;
  }
  return randomFreePosition(room);
}

function respawn(room, p) {
  p.stunnedUntil = 0;
  clearPotion(p); // hồi sinh với thân hình và máu bình thường
  const pos = randomFreePosition(room);
  // Gửi kèm y: chân của người vừa rơi xuống hư không còn ở rất thấp, client mà tự tính mặt đất từ độ cao đó thì chỗ hồi sinh
  // trên cầu nổi (đảo trời) không nhận chân và rơi mãi.
  Object.assign(p, pos, { y: room.terrain.groundAt(pos.x, pos.z, Infinity), hp: MAX_HP, dead: false, fallStartedAt: 0 });
  send(p.ws, { t: 'setpos', x: p.x, z: p.z, y: p.y });
}

module.exports = { isFree, randomFreePosition, freePositionNear, respawn };
