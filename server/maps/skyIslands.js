// Bốn đảo bay nối bằng cầu ván hẹp; rơi khỏi mặt đảo sẽ bị hạ sau một quãng rơi.
const { mulberry32, scatter, crateCluster } = require('./layout');
const { buildTerrain } = require('./terrain');

const SIZE = 80;
const ISLAND_RADIUS = 13;
const ISLAND_OFFSET = 18;
const DECK_Y = 14;
const RING = 6;
const islandCenters = [
  { x: -ISLAND_OFFSET, z: -ISLAND_OFFSET },
  { x: ISLAND_OFFSET, z: -ISLAND_OFFSET },
  { x: ISLAND_OFFSET, z: ISLAND_OFFSET },
  { x: -ISLAND_OFFSET, z: ISLAND_OFFSET },
];
const islands = islandCenters.map(({ x, z }, index) => ({
  id: index,
  x,
  z,
  radius: ISLAND_RADIUS,
  y: DECK_Y,
}));
const floatingBridges = [
  { axis: 'x', x: 0, z: -ISLAND_OFFSET, length: 10, width: 2.2, deckY: DECK_Y },
  { axis: 'z', x: ISLAND_OFFSET, z: 0, length: 10, width: 2.2, deckY: DECK_Y },
  { axis: 'x', x: 0, z: ISLAND_OFFSET, length: 10, width: 2.2, deckY: DECK_Y },
  { axis: 'z', x: -ISLAND_OFFSET, z: 0, length: 10, width: 2.2, deckY: DECK_Y },
];

const terrain = buildTerrain({
  size: SIZE,
  step: 1,
  seed: 33,
  waterLevel: -100,
  plateau: { inner: 0, outer: 1 },
  hills: { inner: 0, outer: 0 },
  bumps: [],
  islands,
  floatingBridges,
});

const ringCenter = islandCenters[0];
const rope = (x, z, w, d) => ({ kind: 'rope', x, z, w, d });
const ringWalls = [
  rope(ringCenter.x - 3.75, ringCenter.z + RING, 4.5, 0.3),
  rope(ringCenter.x + 3.75, ringCenter.z + RING, 4.5, 0.3),
  rope(ringCenter.x - 3.75, ringCenter.z - RING, 4.5, 0.3),
  rope(ringCenter.x + 3.75, ringCenter.z - RING, 4.5, 0.3),
  rope(ringCenter.x + RING, ringCenter.z, 0.3, RING * 2),
  rope(ringCenter.x - RING, ringCenter.z, 0.3, RING * 2),
];

const placed = [
  { type: 'ringMat', x: ringCenter.x, z: ringCenter.z, color: '#765d9c' },
  { type: 'post', x: ringCenter.x - RING, z: ringCenter.z - RING, color: '#aa394b' },
  { type: 'post', x: ringCenter.x - RING, z: ringCenter.z + RING, color: '#aa394b' },
  { type: 'post', x: ringCenter.x + RING, z: ringCenter.z - RING, color: '#edb647' },
  { type: 'post', x: ringCenter.x + RING, z: ringCenter.z + RING, color: '#edb647' },
  ...crateCluster(ISLAND_OFFSET, -ISLAND_OFFSET),
  ...crateCluster(ISLAND_OFFSET, ISLAND_OFFSET),
  ...crateCluster(-ISLAND_OFFSET, ISLAND_OFFSET),
];

const scatterBase = {
  rng: mulberry32(3307),
  bounds: SIZE - 4,
  taken: [...placed],
  walls: ringWalls,
  wallMargin: 2,
  keepClear: [{ x: ringCenter.x, z: ringCenter.z, r: RING + 5 }],
  reject: (x, z) => !terrain.islands.some((island) =>
    Math.hypot(x - island.x, z - island.z) <= island.radius - 2.5),
};

module.exports = {
  id: 'sky-islands',
  name: 'Đảo Bay',
  size: SIZE,
  boundary: false,
  ground: {
    grass: '#6f9c67',
    grassDark: '#54794d',
    sand: '#a2a083',
    rock: '#675c61',
    bed: '#675c61',
  },
  ring: { x: ringCenter.x, z: ringCenter.z, half: RING, leash: 11.5, gate: 3 }, // đảo bán kính 13: người xem không được đi ra sát mép
  terrain,
  walls: ringWalls,
  props: [
    ...placed,
    ...scatter({ ...scatterBase, type: 'rock', count: 22, gap: 3.2 }),
    ...scatter({ ...scatterBase, type: 'tree', count: 12, gap: 5 }),
    ...scatter({ ...scatterBase, type: 'crate', count: 10, gap: 3 }),
  ],
};
