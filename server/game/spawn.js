const { MAX_HP, SPAWN_CLEARANCE, MAP_MARGIN } = require('../config');
const { currentMap, terrain } = require('../maps');
const { send } = require('../net/messaging');
const { distToRect } = require('../utils/geometry');

const PLAYER_RADIUS = 0.5;

// Vị trí khô ráo, không đè lên vật phẩm, tường nào và không sát người chơi còn sống trong phòng.
function isFree(room, pos) {
  if (!terrain.isDry(pos.x, pos.z)) return false;
  const onProp = currentMap.props.some((p) => p.r > 0 && Math.hypot(p.x - pos.x, p.z - pos.z) < p.r + PLAYER_RADIUS);
  if (onProp) return false;
  if (currentMap.walls.some((w) => distToRect(pos.x, pos.z, w) < PLAYER_RADIUS + 0.3)) return false;
  return ![...room.players.values()].some((o) => !o.dead && Math.hypot(o.x - pos.x, o.z - pos.z) < SPAWN_CLEARANCE);
}

// Vị trí ngẫu nhiên trong sân, tránh vật phẩm, tường và người chơi. Dùng cho chỗ hồi sinh và chỗ vũ khí rơi.
function randomFreePosition(room) {
  const range = currentMap.size - MAP_MARGIN;
  let pos;
  for (let i = 0; i < 20; i++) {
    pos = { x: (Math.random() * 2 - 1) * range, z: (Math.random() * 2 - 1) * range };
    if (isFree(room, pos)) break;
  }
  return pos;
}

// Vị trí trống cách `center` chừng `distance` mét (hướng ngẫu nhiên). Không tìm được chỗ trống thì lấy chỗ ngẫu nhiên trong sân.
function freePositionNear(room, center, distance) {
  const range = currentMap.size - MAP_MARGIN;
  for (let i = 0; i < 20; i++) {
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
  Object.assign(p, randomFreePosition(room), { hp: MAX_HP, dead: false });
  send(p.ws, { t: 'setpos', x: p.x, z: p.z });
}

module.exports = { randomFreePosition, freePositionNear, respawn };
