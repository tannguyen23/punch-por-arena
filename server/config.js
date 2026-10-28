const path = require('path');

const ROOT = path.join(__dirname, '..');

// Tuỳ chọn khi chạy: `node server/index.js --min-players=1 --match-seconds=40` (hoặc biến môi trường MIN_PLAYERS / MATCH_SECONDS).
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

module.exports = {
  PORT: process.env.PORT || 3000,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  // Thư viện phía client lấy từ node_modules, phục vụ ở đường dẫn cố định.
  VENDOR_FILES: {
    '/babylon.js': path.join(ROOT, 'node_modules', 'babylonjs', 'babylon.js'),
    '/babylon.gltf-loader.js': path.join(ROOT, 'node_modules', 'babylonjs-loaders', 'babylon.glTF2FileLoader.min.js'),
  },

  MAX_HP: 100,
  PUNCH_RANGE: 2.2,
  PUNCH_COS: Math.cos((35 * Math.PI) / 180),
  PUNCH_COOLDOWN: 350,
  PUNCH_VERTICAL: 2.2, // chênh lệch độ cao tối đa để đòn đánh còn trúng (đứng trên cầu không đấm được người dưới sông)
  RESPAWN_MS: 2000,
  TICK_MS: 50,
  MIN_DIST: 1.0, // khoảng cách tối thiểu giữa hai người chơi (bán kính 0.5 mỗi người)
  HARD_OVERLAP: 0.6, // chồng lấn sâu hơn mức này thì server mới can thiệp
  SPAWN_CLEARANCE: 2,

  // Vũ khí trên sân
  PICKUP_RADIUS: 1.2, // đi vào trong bán kính này là nhặt
  PICKUP_MIN_GAP: 4, // khoảng cách tối thiểu giữa hai vũ khí

  // Phòng và phòng chờ
  ROOM_MAX_PLAYERS: 8, // số người tối đa trong một phòng
  MIN_PLAYERS_TO_START: Number(arg('min-players') ?? process.env.MIN_PLAYERS) || 2, // số người tối thiểu (và ai cũng bấm F) mới đếm ngược
  COUNTDOWN_MS: 3000, // đếm ngược 3-2-1 trước khi vào trận

  // Trận đấu. Rút ngắn khi thử bằng --match-seconds=40.
  MATCH_DURATION_MS: (Number(arg('match-seconds') ?? process.env.MATCH_SECONDS) || 5 * 60) * 1000,
  MATCH_INTERMISSION_MS: 15000, // thời gian xem bảng xếp hạng giữa hai trận
  MATCH_TICK_MS: 250,
  WAVE_WARNING_MS: 10000, // báo đếm ngược trước khi vũ khí rơi
  // Các đợt vũ khí rơi: `at` là vị trí trong trận (0 = đầu, 1 = cuối), `count` là số vũ khí.
  WAVES: [
    { at: 0.15, count: 2 },
    { at: 0.4, count: 3 },
    { at: 0.65, count: 3 },
    { at: 0.85, count: 4 },
  ],

  PATTERN_COUNT: 5,
  LOOK_DEFAULT: { shirt: '#e53935', pants: '#1a237e', glove: '#1e88e5', skin: '#f5c7a3', hair: '#1a120d' },
};
