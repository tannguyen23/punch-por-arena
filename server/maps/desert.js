// Map sa mạc: giữ sân đấu trung tâm, địa hình cồn cát riêng và các ốc đảo đá/xương rồng.
const { mulberry32, mirror4, crateCluster, scatter } = require('./layout');
const { buildTerrain } = require('./terrain');

const SIZE = 80;
const RING = 6;

const terrain = buildTerrain({
  size: SIZE,
  step: 2,
  seed: 19,
  waterLevel: -8,
  plateau: { inner: 16, outer: 29 },
  hills: { inner: 0.15, outer: 0.1 },
  bumps: [
    { x: 64, z: 58, r: 15, h: 1.6 }, { x: -67, z: 61, r: 16, h: 1.8 },
    { x: 62, z: -64, r: 17, h: 1.7 }, { x: -65, z: -59, r: 15, h: 1.5 },
  ],
  dunes: {
    angle: 0.58,
    spacing: 30,
    height: 4.2,
    inner: 12,
    outer: 25,
    drift: 9,
  },
});

const rope = (x, z, w, d) => ({ kind: 'rope', x, z, w, d });
const ringWalls = [
  rope(-3.75, RING, 4.5, 0.3), rope(3.75, RING, 4.5, 0.3),
  rope(-3.75, -RING, 4.5, 0.3), rope(3.75, -RING, 4.5, 0.3),
  rope(RING, 0, 0.3, RING * 2), rope(-RING, 0, 0.3, RING * 2),
];

const ruins = [
  [15, 16, 9, 1], [27, 21, 14, 1], [21, 31, 1, 13],
  [69, 43, 1, 12], [45, 70, 13, 1],
].map(([x, z, w, d]) => ({ kind: 'wall', x, z, w, d }));
const walls = [...ringWalls, ...mirror4(ruins)];

const placed = [
  { type: 'ringMat', x: 0, z: 0, color: '#b98a53' },
  { type: 'post', x: -RING, z: -RING, color: '#b7472a' },
  { type: 'post', x: -RING, z: RING, color: '#b7472a' },
  { type: 'post', x: RING, z: -RING, color: '#d59b43' },
  { type: 'post', x: RING, z: RING, color: '#d59b43' },
  ...crateCluster(31, 7),
  ...crateCluster(-31, -7),
  ...crateCluster(7, 42),
  ...crateCluster(-7, -42),
];

const scatterBase = {
  rng: mulberry32(1907),
  bounds: SIZE - 3,
  taken: [...placed],
  walls,
  wallMargin: 2,
  keepClear: [{ x: 0, z: 0, r: RING + 10 }],
};

module.exports = {
  id: 'desert',
  name: 'Khe Cạn Sa Mạc',
  size: SIZE,
  ground: {
    grass: '#c9a96e',
    grassDark: '#a98550',
    sand: '#d7bd86',
    rock: '#74604a',
    bed: '#806044',
  },
  ring: { x: 0, z: 0, half: RING, leash: 16, gate: 3 },
  terrain,
  walls,
  props: [
    ...placed,
    ...scatter({ ...scatterBase, type: 'cactus', count: 48, gap: 5 }),
    ...scatter({ ...scatterBase, type: 'rock', count: 58, gap: 3.5 }),
  ],
};
