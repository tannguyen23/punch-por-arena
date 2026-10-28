const { MAX_HP, SPAWN_CLEARANCE } = require('../config');
const { currentMap, terrain } = require('../maps');
const { send } = require('../net/messaging');
const { distToRect } = require('../utils/geometry');

const PLAYER_RADIUS = 0.5;
const SPAWN_MARGIN = 3; // cách tường tối thiểu

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
  const range = currentMap.size - SPAWN_MARGIN;
  let pos;
  for (let i = 0; i < 20; i++) {
    pos = { x: (Math.random() * 2 - 1) * range, z: (Math.random() * 2 - 1) * range };
    if (isFree(room, pos)) break;
  }
  return pos;
}

function respawn(room, p) {
  Object.assign(p, randomFreePosition(room), { hp: MAX_HP, dead: false });
  send(p.ws, { t: 'setpos', x: p.x, z: p.z });
}

module.exports = { randomFreePosition, respawn };
