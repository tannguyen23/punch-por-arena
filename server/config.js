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
  REGEN_DELAY_MS: 5000, // không bị trúng đòn ngần này thì bắt đầu hồi máu
  REGEN_PER_SEC: 8, // máu hồi mỗi giây (tới đầy)
  TICK_MS: 50,
  MIN_DIST: 1.0, // khoảng cách tối thiểu giữa hai người chơi (bán kính 0.5 mỗi người)
  PLAYER_RADIUS: 0.5,
  HARD_OVERLAP: 0.6, // chồng lấn sâu hơn mức này thì server mới can thiệp
  SPAWN_CLEARANCE: 2,
  CACTUS_DAMAGE: 2,
  CACTUS_DAMAGE_COOLDOWN_MS: 1200,
  CACTUS_CONTACT_TOLERANCE: 0.1,
  VOID_FALL_DEATH_MS: 2200,

  // Vũ khí trên sân
  PICKUP_RADIUS: 1.2, // đi vào trong bán kính này là nhặt
  PICKUP_MIN_GAP: 4, // khoảng cách tối thiểu giữa hai vũ khí
  INVENTORY_SLOTS: 3, // số ô vũ khí trong túi (chưa kể ô tay không cố định), khớp HOTBAR_SLOTS ở public/js/config.js

  // Phòng và phòng chờ
  ROOM_MAX_PLAYERS: 8, // số người tối đa trong một phòng
  MIN_PLAYERS_TO_START: Number(arg('min-players') ?? process.env.MIN_PLAYERS) || 2, // số người tối thiểu (và ai cũng bấm F) mới đếm ngược
  COUNTDOWN_MS: 3000, // đếm ngược 3-2-1 trước khi vào trận

  // Trận đấu. Rút ngắn khi thử bằng --match-seconds=40.
  MATCH_DURATION_MS: (Number(arg('match-seconds') ?? process.env.MATCH_SECONDS) || 5 * 60) * 1000,
  MATCH_INTERMISSION_MS: 15000, // thời gian xem bảng xếp hạng giữa hai trận
  MATCH_TICK_MS: 250,

  // Hòm tiếp tế (thả dù từ máy bay, kiểu PUBG). Máy bay bay thẳng qua điểm thả, thả hòm khi ở ngay trên đó,
  // hòm rơi dù xuống chạm đất mới nhặt được. Đợt cuối chỉ thả nếu hòm kịp chạm đất trước khi hết trận.
  AIRDROP_FIRST_MS: 20000, // máy bay đầu tiên xuất hiện sau ngần này từ lúc bắt đầu trận
  AIRDROP_INTERVAL_MS: 30000, // mỗi ngần này lại có một máy bay
  PLANE_SPEED: 40, // m/giây
  PLANE_APPROACH: 160, // máy bay xuất hiện cách điểm thả ngần này (mét) rồi bay tới
  PLANE_ALTITUDE: 45, // độ cao bay so với mặt đất ở điểm thả (mét)
  PARACHUTE_MS: 9000, // thời gian hòm rơi dù từ máy bay xuống đất

  // Súng và tên lửa. Độ cao mắt phải khớp EYE_HEIGHT / CROUCH_EYE_HEIGHT ở public/js/config.js.
  EYE_HEIGHT: 1.7,
  CROUCH_EYE_HEIGHT: 1.15,
  BODY_RADIUS: 0.55, // bán kính thân người khi tính đạn trúng (rộng hơn thân thật một chút vì vị trí người khác trễ vài chục ms)
  BODY_HEIGHT: 1.95,
  CROUCH_BODY_HEIGHT: 1.4,
  PITCH_LIMIT: 1.4, // góc ngẩng/cúi tối đa (radian), khớp giới hạn ở player/localPlayer.js
  FIRE_SLACK_MS: 30, // cho phép phát bắn tới sớm hơn hồi chiêu ngần này (mạng giật làm hai tin nhắn sát nhau hơn)
  WALL_HEIGHT: 3, // tường cao ngần này trên mặt đất (khớp WALL_HEIGHT ở public/js/world/walls.js); đạn bay cao hơn thì qua được
  TERRAIN_RAY_STEP: 0.5, // bước dò mặt đất dọc đường đạn (mét)
  ROCKET_TICK_MS: 30, // chu kỳ mô phỏng tên lửa đang bay
  SELF_SPLASH_MULT: 0.5, // tự dính tên lửa của mình chỉ mất một nửa sát thương

  PATTERN_COUNT: 5,
  LOOK_DEFAULT: { shirt: '#e53935', pants: '#1a237e', glove: '#1e88e5', skin: '#f5c7a3', hair: '#1a120d' },
};
