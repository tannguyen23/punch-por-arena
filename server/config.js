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
  KILL_SCORE: 50, // điểm cộng cho mỗi lần hạ gục
  TICK_MS: 50,
  MIN_DIST: 1.0, // khoảng cách tối thiểu giữa hai người chơi (bán kính 0.5 mỗi người)
  PLAYER_RADIUS: 0.5,
  HARD_OVERLAP: 0.6, // chồng lấn sâu hơn mức này thì server mới can thiệp
  SPAWN_CLEARANCE: 2,
  MAP_MARGIN: 3, // chỗ hồi sinh / sét đánh chỗ trống cách mép sân ít nhất ngần này
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
  PROJECTILE_TICK_MS: 30, // chu kỳ mô phỏng tên lửa / lựu đạn đang bay
  SELF_SPLASH_MULT: 0.5, // tự dính tên lửa / lựu đạn của mình chỉ mất một nửa sát thương

  // Lựu đạn (server/game/grenades.js). Tốc độ ném và thời gian ngòi nằm trong bảng WEAPONS.
  GRENADE: {
    gravity: 20, // m/giây², khớp GRAVITY ở public/js/config.js để client đoán đường bay giữa hai snapshot
    radius: 0.1, // quả lựu đạn nằm cao ngần này trên mặt đất
    lift: 0.3, // ném chếch lên trên hướng ngắm ngần này (radian) cho thành cung
    softMult: 0.45, // chuột phải: lăn / tung nhẹ, tốc độ bằng ngần này lần ném mạnh
    bounce: 0.35, // chạm đất: giữ lại ngần này vận tốc đứng (nảy lên)
    friction: 0.6, // chạm đất: giữ lại ngần này vận tốc ngang
    wallBounce: 0.5, // đập tường bật lại với ngần này vận tốc
    restSpeed: 0.8, // nảy yếu hơn ngần này (m/giây) thì nằm xuống lăn
    rollDrag: 2.5, // đang lăn trên đất thì chậm dần theo ngần này mỗi giây
    waterDrag: 4, // dưới nước bị cản mạnh, chìm từ từ
  },

  // Sự kiện ngẫu nhiên trong trận (server/game/events.js): cứ mỗi `perMatchMs` thời gian trận thì có một sự kiện, kẹp trong [1, max].
  // Mỗi sự kiện mở đầu bằng `introMs` đứng hình để mọi người đọc luật. Thử nhanh: --event-first-seconds=5 --dog-seconds=15.
  EVENTS: {
    perMatchMs: 120000,
    max: 3,
    firstMs: (Number(arg('event-first-seconds') ?? process.env.EVENT_FIRST_SECONDS) || 25) * 1000, // sự kiện đầu tiên không sớm hơn mốc này từ đầu trận
    tailMs: 20000, // sự kiện phải xong trước lúc hết trận ngần này
    introMs: 6000,
    retryMs: 3000, // tới hẹn mà chưa bắt đầu được (đang có bom, thiếu người sống...) thì thử lại sau ngần này
  },
  // Sự kiện "hoá chó" (server/game/dogEvent.js): một người ngẫu nhiên thành chó, mất hết vũ khí, chỉ chạy được.
  // Bị hạ: người hạ gục được `bounty` điểm (cộng thêm điểm hạ gục thường). Chạy thoát tới hết giờ: chính con chó được `bounty` điểm.
  DOG_EVENT: {
    durationMs: (Number(arg('dog-seconds') ?? process.env.DOG_SECONDS) || 45) * 1000, // thời gian chạy trốn, tính sau phần mở đầu
    bounty: 150,
  },

  // Bão (server/game/weather.js): chỉ có khi đang 'playing', mưa là hình ảnh, sét gây sát thương (server/game/lightning.js).
  STORM: {
    firstMs: 45000, // bắt đầu trận ngần này mới có thể có bão
    chance: 0.6, // tới hẹn thì có bão với xác suất này, không thì hẹn lại sau retryMs
    retryMs: 30000,
    durationMs: [60000, 90000], // bão kéo dài trong khoảng này
    gapMs: 45000, // tạnh rồi ít nhất ngần này mới có bão tiếp
    fadeMs: 4000, // mưa nặng hạt / tạnh dần trong ngần này (client)
  },
  // Sét: đông người thì nhiều sét hơn nhưng có trần, đứng tụm lại hoặc giữa sông / trên đồi dễ bị nhắm hơn.
  // Luôn báo trước warnMs (vòng sáng dưới đất) để chạy kịp; trúng tâm cũng không chết người đang đầy máu.
  LIGHTNING: {
    basePerMin: 2, // số sét mỗi phút khi bão...
    perPlayerPerMin: 0.5, // ...cộng thêm ngần này cho mỗi người còn sống...
    maxPerMin: 6, // ...nhưng không quá ngần này
    minGapMs: 4000, // hai tia sét cách nhau ít nhất ngần này
    warnMs: 1200, // báo trước khi đánh
    damage: 25, // sát thương ở tâm
    edgeMult: 0.3, // ở mép vùng sét chỉ mất ngần này lần sát thương ở tâm
    radius: 4, // mét
    crowdRadius: 8, // người đứng trong bán kính này tính là tụm lại
    crowdWeight: 1, // mỗi người đứng cạnh làm khả năng bị nhắm tăng thêm ngần này
    waterWeight: 1.5, // đứng dưới sông thì khả năng bị nhắm nhân ngần này
    highWeight: 1.3, // đứng trên cao (phần trên của dải độ cao sân) thì nhân ngần này
    highFraction: 0.6, // "trên cao" = cao hơn ngần này của khoảng từ thấp nhất tới cao nhất
    targetCooldownMs: 8000, // một người vừa bị nhắm thì ngần này sau mới bị nhắm lại
    missChance: 0.25, // tỉ lệ sét đánh xuống chỗ trống (cho có không khí)
    jitter: 2.5, // tâm sét lệch ngẫu nhiên tối đa ngần này (mét) so với người bị nhắm
  },

  // Lựu đạn băng (server/game/ice.js): bay và nảy như mọi lựu đạn (GRENADE ở trên); chỉ số riêng (bán kính, thời gian băng) nằm trong WEAPONS.
  // Radio gọi bom hạt nhân (server/game/nuke.js). Mốc thời gian tính từ lúc bấm dùng radio; client phát âm thanh theo các mốc này
  // nên độ dài file trong public/sound nên khớp: radio_chat.mp3 ≈ NUKE_RADIO_MS, falling bomb.mp3 ≈ NUKE_FALL_MS.
  NUKE_RADIO_MS: 5000, // radio nói chuyện xong thì còi báo động vang lên
  NUKE_PLANE_IN_MS: 8000, // máy bay lao vào sân (còi báo động đã kêu được 3 giây)
  NUKE_PLANE_SPEED: 110, // m/giây
  NUKE_PLANE_APPROACH: 250, // máy bay xuất hiện cách điểm thả ngần này (mét) rồi bay thẳng qua
  NUKE_PLANE_ALTITUDE: 70, // độ cao bay so với mặt đất ở điểm thả
  NUKE_FALL_MS: 3000, // bom rơi từ máy bay xuống đất (khớp độ dài falling bomb.mp3 ≈ 3s), hết thì nổ và mọi người chết
  NUKE_END_SCREEN_MS: 7000, // sau vụ nổ trận kết thúc ngay (người gọi bom thắng) nhưng bảng kết quả chỉ hiện sau ngần này để xem xong màn trắng xoá và mây nấm
  // Radio gọi bom: số lần hạ gục liên tiếp (không chết) để gọi máy bay thả hòm chứa radio, và hòm rơi cách người gọi chừng này (mét).
  RADIO_STREAK_KILLS: 3, // khớp RADIO_STREAK_KILLS ở public/js/config.js
  RADIO_DROP_DISTANCE: 8,
  // Hòm tiếp tế thường không còn radio. Để thử có thể cho mọi người bắt đầu với radio: [{ weapon: 'nuke', ammo: 1 }].
  START_WEAPONS: [],

  PATTERN_COUNT: 5,
  LOOK_DEFAULT: { shirt: '#e53935', pants: '#1a237e', glove: '#1e88e5', skin: '#f5c7a3', hair: '#1a120d' },
  FACE_IMAGE: { width: 64, height: 48 }, // cỡ ảnh mặt (điểm ảnh RGBA thô), khớp với FACE_IMAGE của client
  MAX_MESSAGE_BYTES: 64 * 1024, // tin nhắn WebSocket lớn nhất nhận từ client (tin `join` kèm ảnh mặt khoảng 17 KB)
};
