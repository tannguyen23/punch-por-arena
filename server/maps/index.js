const PROP_TYPES = require('./propTypes');
const WALL_KINDS = require('./wallKinds');

const definitions = {
  default: require('./default'),
};

// Gắn bán kính va chạm vào vật phẩm; kết quả này vừa dùng trên server vừa gửi cho client.
function buildMap(def) {
  return {
    id: def.id,
    name: def.name,
    size: def.size,
    ground: def.ground,
    terrain: def.terrain.data,
    walls: def.walls,
    props: def.props.map((p) => ({
      type: p.type,
      x: p.x,
      z: p.z,
      rot: p.rot ?? 0,
      color: p.color,
      r: PROP_TYPES[p.type].radius,
    })),
  };
}

const currentDef = definitions[process.env.MAP] ?? definitions.default;
const currentMap = buildMap(currentDef);

// Chỉ server cần biết tường nào chặn đòn đấm.
const punchBlockers = currentMap.walls.filter((w) => WALL_KINDS[w.kind].blocksPunch);

// Công cụ địa hình cho logic game phía server (độ cao, chỗ khô ráo, cầu...).
const terrain = currentDef.terrain;

module.exports = { currentMap, punchBlockers, terrain };
