// Định nghĩa một map: kích thước, địa hình (đồi, sông, cầu), tường { kind, x, z, w, d } và vật phẩm { type, x, z, rot?, color? }.
// Thêm map mới = thêm file cùng dạng này rồi đăng ký trong maps/index.js.
const { mulberry32, mirror4, diningSet, crateCluster, scatter } = require('./layout');
const { buildTerrain } = require('./terrain');
const { distToRect } = require('../utils/geometry');

const SIZE = 80; // nửa cạnh sân (sân vuông 160x160)
const RING = 6; // nửa cạnh võ đài ở giữa sân
const RED = '#c62828';
const BLUE = '#1e4db7';

// ---------- Địa hình ----------
// Quanh võ đài phẳng hẳn; càng ra xa càng nhấp nhô. Một con sông uốn quanh khu võ đài như hào nước,
// có 4 cây cầu ở 4 hướng đúng chỗ các đại lộ chạy ra.
const terrain = buildTerrain({
  size: SIZE,
  step: 2, // khoảng cách giữa hai điểm của lưới độ cao (mét)
  seed: 7,
  waterLevel: -0.35,
  plateau: { inner: 16, outer: 28 },
  hills: { inner: 0.45, outer: 1.0 }, // biên độ gợn sóng: trong khu võ đài / ngoài sông
  bumps: [
    { x: 66, z: 60, r: 18, h: 4.5 }, { x: -64, z: 62, r: 16, h: 3.5 },
    { x: 62, z: -66, r: 20, h: 5 }, { x: -70, z: -58, r: 16, h: 4 },
    { x: -30, z: -30, r: 12, h: 1.2 }, { x: 32, z: -34, r: 12, h: 1.0 },
  ],
  river: { radius: 56, wobble: [[3, 3, 1], [2, 5, 2]], halfWidth: 4.5, bank: 6, bedY: -1.4 },
  bridges: { angles: [0, 90, 180, 270], width: 4.5, deckY: 0.45, padY: 0.4 },
});

// ---------- Võ đài boxing ----------
// Dây chỉ là tường thấp: chặn đường nhưng không chặn đòn. Hai cạnh bắc/nam chừa lối vào rộng 3.
const rope = (x, z, w, d) => ({ kind: 'rope', x, z, w, d });
const ringWalls = [
  rope(-3.75, RING, 4.5, 0.3), rope(3.75, RING, 4.5, 0.3),
  rope(-3.75, -RING, 4.5, 0.3), rope(3.75, -RING, 4.5, 0.3),
  rope(RING, 0, 0.3, RING * 2), rope(-RING, 0, 0.3, RING * 2),
];
const ringProps = [
  { type: 'ringMat', x: 0, z: 0 },
  { type: 'post', x: -RING, z: -RING, color: RED },
  { type: 'post', x: -RING, z: RING, color: RED },
  { type: 'post', x: RING, z: -RING, color: BLUE },
  { type: 'post', x: RING, z: RING, color: BLUE },
];

// ---------- Tường chia đường ----------
// Khai báo một góc phần tư (x, z > 0) rồi nhân ra 4 góc; hai trục chính để trống làm đại lộ vào võ đài.
// Ba tường đầu nằm trong khu võ đài (trong vòng sông), hai tường sau là tàn tích ngoài sông.
const quadrantWalls = [
  [14, 14, 8, 1], // chắn chéo gần võ đài
  [26, 20, 16, 1], // tường ngang
  [20, 31, 1, 14], // tường dọc, chừa lối đi ở chỗ giao với tường ngang
  [70, 44, 1, 12],
  [46, 72, 12, 1],
].map(([x, z, w, d]) => ({ kind: 'wall', x, z, w, d }));
const walls = [...ringWalls, ...mirror4(quadrantWalls)];

// ---------- Vật phẩm ----------
const placed = [
  ...ringProps,
  ...diningSet(-18, 3, Math.PI / 2),
  ...diningSet(18, -3, Math.PI / 2),
  ...diningSet(0, 26),
  ...diningSet(0, -26),
  ...diningSet(-74, 20, Math.PI / 2),
  ...diningSet(74, -20, Math.PI / 2),
  ...crateCluster(30, 6),
  ...crateCluster(-30, -6),
  ...crateCluster(8, 40),
  ...crateCluster(-8, -40),
  ...crateCluster(60, 60),
  ...crateCluster(-60, 60),
  ...crateCluster(60, -60),
  ...crateCluster(-60, -60),
];

// Không rải cây/đá xuống nước, sát mép nước hay chặn đầu cầu.
const reject = (x, z) =>
  terrain.heightAt(x, z) < terrain.waterLevel + 0.7
  || terrain.bridges.some((b) => distToRect(x, z, terrain.padRect(b)) < 5);

const scatterBase = {
  rng: mulberry32(2024),
  bounds: SIZE - 3,
  taken: [...placed],
  walls,
  wallMargin: 2,
  keepClear: [{ x: 0, z: 0, r: RING + 10 }],
  reject,
};

module.exports = {
  id: 'default',
  name: 'Bãi cỏ bên sông',
  size: SIZE,
  // Bảng màu để client tô mặt đất theo độ cao và độ dốc.
  ground: { grass: '#4f7a43', grassDark: '#3d6336', sand: '#b8a878', rock: '#7d776c', bed: '#6a5a44' },
  terrain,
  walls,
  props: [
    ...placed,
    ...scatter({ ...scatterBase, type: 'tree', count: 190, gap: 3.5 }),
    ...scatter({ ...scatterBase, type: 'bush', count: 80, gap: 2 }),
    ...scatter({ ...scatterBase, type: 'rock', count: 50, gap: 3 }),
  ],
};
