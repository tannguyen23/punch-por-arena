// Công cụ dựng bố cục cho file map. Mọi thứ đều tất định (cùng seed → cùng map).
const { distToRect } = require('../utils/geometry');

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Nhân một phần tư sân ra cả 4 góc (đối xứng qua hai trục).
const mirror4 = (items) =>
  items.flatMap(({ x, z, ...rest }) =>
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => ({ x: x * sx, z: z * sz, ...rest })),
  );

// Bàn 4 ghế quanh hai cạnh dài; `rot` xoay cả bộ quanh tâm bàn (cùng chiều với rotation.y của Babylon).
function diningSet(cx, cz, rot = 0) {
  const place = (type, lx, lz, localRot) => ({
    type,
    x: cx + lx * Math.cos(rot) + lz * Math.sin(rot),
    z: cz - lx * Math.sin(rot) + lz * Math.cos(rot),
    rot: rot + localRot,
  });
  return [
    place('table', 0, 0, 0),
    place('chair', -0.4, -0.8, 0),
    place('chair', 0.4, -0.8, 0),
    place('chair', -0.4, 0.8, Math.PI),
    place('chair', 0.4, 0.8, Math.PI),
  ];
}

// Ba cái thùng xếp thành cụm.
const crateCluster = (cx, cz) => [
  { type: 'crate', x: cx, z: cz },
  { type: 'crate', x: cx + 1.3, z: cz - 0.2 },
  { type: 'crate', x: cx + 0.6, z: cz - 1.3 },
];

// Rải `count` vật phẩm ngẫu nhiên (theo `rng`) nhưng tránh tường, vùng cấm, chỗ `reject(x, z)` báo từ chối và các vật phẩm đã đặt.
// `taken` được thêm các vật phẩm mới vào để lần rải sau tránh lần rải trước.
function scatter({ rng, type, count, bounds, gap, taken, walls, wallMargin, keepClear, reject = () => false }) {
  const out = [];
  for (let tries = 0; out.length < count && tries < count * 50; tries++) {
    const x = (rng() * 2 - 1) * bounds;
    const z = (rng() * 2 - 1) * bounds;
    if (keepClear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    if (reject(x, z)) continue;
    if (walls.some((w) => distToRect(x, z, w) < wallMargin)) continue;
    if (taken.some((p) => Math.hypot(x - p.x, z - p.z) < gap)) continue;
    const prop = { type, x: +x.toFixed(1), z: +z.toFixed(1), rot: +(rng() * Math.PI * 2).toFixed(2) };
    out.push(prop);
    taken.push(prop);
  }
  return out;
}

module.exports = { mulberry32, mirror4, diningSet, crateCluster, scatter };
