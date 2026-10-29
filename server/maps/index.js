const PROP_TYPES = require('./propTypes');
const WALL_KINDS = require('./wallKinds');

const definitions = {
  default: require('./default'),
  desert: require('./desert'),
  skyIslands: require('./skyIslands'),
};

// Gắn bán kính va chạm vào vật phẩm; kết quả này vừa dùng trên server vừa gửi cho client.
function buildMap(def) {
  return {
    id: def.id,
    name: def.name,
    size: def.size,
    boundary: def.boundary,
    ring: def.ring ?? null, // võ đài cho sự kiện solo (duelEvent.js); map không khai báo thì không có sự kiện này
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
      hazard: PROP_TYPES[p.type].hazard ?? null,
    })),
  };
}

const maps = new Map(Object.values(definitions).map((def) => {
  const map = buildMap(def);
  return [map.id, {
    data: map,
    terrain: def.terrain,
    punchBlockers: map.walls.filter((w) => WALL_KINDS[w.kind].blocksPunch),
  }];
}));

const mapOptions = [...maps.values()].map(({ data }) => ({ id: data.id, name: data.name }));
const defaultMapIds = mapOptions.map(({ id }) => id);
const getMap = (id) => maps.get(id) ?? null;

module.exports = { mapOptions, defaultMapIds, getMap };
