const path = require('path');

const ROOT = path.join(__dirname, '..');

// Tuỳ chọn khi chạy: `node server/index.js --min-players=1 --match-seconds=40` (hoặc biến môi trường MIN_PLAYERS / MATCH_SECONDS).
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const flag = (name, env) => {
  const value = arg(name) ?? process.env[env];
  return value === '1' || value === 'true';
};

module.exports = {
  PORT: process.env.PORT || 3000,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  // Thư viện phía client lấy từ node_modules, phục vụ ở đường dẫn cố định.
  VENDOR_FILES: {
    '/babylon.js': path.join(ROOT, 'node_modules', 'babylonjs', 'babylon.js'),
    '/babylon.gltf-loader.js': path.join(ROOT, 'node_modules', 'babylonjs-loaders', 'babylon.glTF2FileLoader.min.js'),
  },

  MAX_HP: 100,
  TABLE_GAME: { size: 3, range: 3, vertical: 1.2, groundTolerance: 0.2, waitMs: 30000, turnMs: 20000, resultMs: 20000,
    stake: 75, flipLoss: 50 },
  PUNCH_RANGE: 2.2,
  PUNCH_COS: Math.cos((35 * Math.PI) / 180),
  PUNCH_COOLDOWN: 350,
  PUNCH_VERTICAL: 2.2, // chênh lệch độ cao tối đa để đòn đánh còn trúng (đứng trên cầu không đấm được người dưới sông)
  RESPAWN_MS: 2000,
  REGEN_DELAY_MS: 10000, // không bị trúng đòn ngần này thì bắt đầu hồi máu
  REGEN_PER_SEC: 3, // máu hồi mỗi giây (tới đầy)
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
  // Đảo trời: chân thấp hơn mặt đảo quá ngần này (đã rơi khỏi mép) thì coi như đang rơi dù đứng dưới đảo, không kéo ngược lên.
  // Khớp ISLAND_FALL_MARGIN ở public/js/config.js (groundAt hai bên phải giống nhau).
  ISLAND_FALL_MARGIN: 2,

  // Vũ khí trên sân
  PICKUP_RADIUS: 1.2, // đi vào trong bán kính này là nhặt
  PICKUP_MIN_GAP: 4, // khoảng cách tối thiểu giữa hai vũ khí
  INVENTORY_SLOTS: 3, // số ô vũ khí trong túi (chưa kể ô tay không cố định), khớp HOTBAR_SLOTS ở public/js/config.js
  // Vũ khí rơi ra sân (server/game/loot.js): bấm G thì vũ khí văng ra trước mặt ngần này (mét) cho nhìn thấy;
  // chết thì cả túi văng ra quanh xác trong vòng `deathSpread` mét. Nằm trên sân tới hết trận.
  LOOT: { tossDistance: 1.6, deathSpread: 1.8 },

  // Phòng và phòng chờ
  ROOM_MAX_PLAYERS: 8, // số người tối đa trong một phòng
  MIN_PLAYERS_TO_START: Number(arg('min-players') ?? process.env.MIN_PLAYERS) || 2, // số người tối thiểu (và ai cũng bấm F) mới đếm ngược
  READY_RATIO: 0.5, // phòng chờ: HƠN ngần này số người bấm F là đủ để đếm ngược (người AFK không giữ cả phòng lại; người chưa sẵn sàng vẫn bị kéo vào trận)
  COUNTDOWN_MS: 3000, // đếm ngược 3-2-1 trước khi vào trận

  // Công cụ debug (`npm run dev:debug`): bật thì server phục vụ trang /admin-test và /api/debug/* (chỉ từ máy chạy server, xem server/http/debugRoutes.js).
  // Tắt thì các đường dẫn đó là 404 như chưa từng có.
  DEBUG: flag('debug', 'GAME_DEBUG'),

  // Chế độ test sự kiện (scripts/test-events.js, hoặc trang /admin-test): map cố định, mọi tab vào chung một phòng, tự sẵn sàng.
  // `--test=1` bật thêm cách xếp sự kiện tuần tự ngay sau `--event-first-seconds` (xem events.js).
  TEST: {
    enabled: flag('test', 'TEST'),
    map: arg('map') ?? process.env.MAP ?? null,
    singleRoom: flag('single-room', 'SINGLE_ROOM'),
    autoReady: flag('auto-ready', 'AUTO_READY'),
  },

  // Trận đấu. Rút ngắn khi thử bằng --match-seconds=40.
  MATCH_DURATION_MS: (Number(arg('match-seconds') ?? process.env.MATCH_SECONDS) || 5 * 60) * 1000,
  MATCH_INTERMISSION_MS: 15000, // thời gian xem bảng xếp hạng giữa hai trận
  MATCH_TICK_MS: 250,

  // Hòm tiếp tế (thả dù từ máy bay, kiểu PUBG). Máy bay bay thẳng qua điểm thả, thả hòm khi ở ngay trên đó,
  // hòm rơi dù xuống chạm đất mới nhặt được. Đợt cuối chỉ thả nếu hòm kịp chạm đất trước khi hết trận.
  // Phòng đông thì máy bay tới dày hơn và mỗi đợt nhiều hòm hơn (match.js `runAirdrops`):
  //   khoảng cách = max(minIntervalMs, baseIntervalMs − perPlayerMs × (số người − 1)), số hòm = ceil(số người / playersPerCrate) (tối đa maxCrates).
  // Mỗi hòm có một vũ khí chính (súng lục / AK / tên lửa theo `dropWeight`) và `bonusChance` cơ hội kèm một lựu đạn trong `bonus`.
  AIRDROP: {
    firstMs: 10000,
    baseIntervalMs: 28000,
    perPlayerMs: 3000,
    minIntervalMs: 12000,
    playersPerCrate: 3,
    maxCrates: 3,
    bonusChance: 0.35,
    bonus: ['frag', 'flashbang', 'icegrenade'],
  },
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
    introMs: (Number(arg('event-intro-seconds') ?? process.env.EVENT_INTRO_SECONDS) || 6) * 1000,
    retryMs: 3000, // tới hẹn mà chưa bắt đầu được (đang có bom, thiếu người sống...) thì thử lại sau ngần này
    only: arg('event-kind') ?? process.env.EVENT_KIND ?? null, // chỉ chạy loại sự kiện này ('dog' | 'duel') để thử: --event-kind=duel
    // Danh sách loại sự kiện được phép, theo thứ tự khi chạy chế độ test: --events=dog,duel. Rỗng = tất cả.
    sequence: (arg('events') ?? process.env.EVENTS ?? '').split(',').map((kind) => kind.trim()).filter(Boolean),
    count: Number(arg('event-count') ?? process.env.EVENT_COUNT) || null, // số sự kiện mỗi trận (mặc định theo độ dài trận)
    testGapMs: (Number(arg('event-gap-seconds') ?? process.env.EVENT_GAP_SECONDS) || 1.5) * 1000, // nghỉ giữa hai sự kiện khi test
  },
  // Sự kiện "hoá chó" (server/game/dogEvent.js): một người ngẫu nhiên thành chó, mất hết vũ khí, chỉ chạy được.
  // Bị hạ: người hạ gục được `bounty` điểm (cộng thêm điểm hạ gục thường). Chạy thoát tới hết giờ: chính con chó được `bounty` điểm.
  DOG_EVENT: {
    durationMs: (Number(arg('dog-seconds') ?? process.env.DOG_SECONDS) || 45) * 1000, // thời gian chạy trốn, tính sau phần mở đầu
    bounty: 150,
    // Kỹ năng thả shit của chó (server/game/poop.js): tích trữ tối đa `max` cục, hồi một cục mỗi `rechargeMs`, hai lần thả cách nhau ít nhất `gapMs`.
    // Người săn bước vào trong `radius` mét (không nhảy cao hơn cục shit quá `jumpClear` mét) thì cục biến mất và họ bị chậm `slowMs`.
    // `radius` khớp POOP.patchRadius ở public/js/config.js (bãi shit vẽ rộng bằng vùng dính).
    poop: { max: 3, rechargeMs: 8000, gapMs: 700, radius: 1.5, jumpClear: 0.5, slowMs: 5000 },
  },

  // Sự kiện "solo võ đài" (server/game/duelEvent.js): hai người ngẫu nhiên bị nhốt trong võ đài đánh tay không BO3, những người còn lại
  // đứng xem quanh võ đài (không đánh được) và cược điểm xem ai thắng. Mỗi giai đoạn: `betMs` cược, mỗi hiệp đánh tới khi một người cạn máu (KHÔNG giới hạn giờ;
  // `stallMs` là lưới chống treo: không ai trúng đòn ngần đó thì hiệp kết thúc, ai còn nhiều máu hơn thắng), nghỉ `breakMs` giữa hai hiệp, `finishMs` xem người thắng sau hiệp cuối. Thắng `winsNeeded` hiệp là thắng trận
  // (2 = BO3). Cược: đặt `stake` điểm vào một võ sĩ, đúng +stake, sai −stake (điểm không xuống dưới 0). Võ sĩ thắng nhận `prize` điểm.
  // `roundEstimateMs` là thời gian DỰ TÍNH của một hiệp, chỉ để xếp lịch: tổng dự tính (intro + cược + 3 hiệp + 2 lần nghỉ + xem) phải vừa một "ô" sự kiện
  // (xem planEvents trong events.js). Hiệp thật có thể dài hơn; sự kiện kết thúc khi xong trận hoặc khi hết trận (khi đó không ai mất điểm cược).
  DUEL: {
    betMs: (Number(arg('duel-bet-seconds') ?? process.env.DUEL_BET_SECONDS) || 20) * 1000,
    roundEstimateMs: (Number(arg('duel-round-seconds') ?? process.env.DUEL_ROUND_SECONDS) || 25) * 1000, // dự tính, chỉ để xếp lịch (không phải giới hạn)
    stallMs: (Number(arg('duel-stall-seconds') ?? process.env.DUEL_STALL_SECONDS) || 20) * 1000, // không ai trúng đòn ngần này thì hiệp tự kết thúc
    breakMs: (Number(arg('duel-break-seconds') ?? process.env.DUEL_BREAK_SECONDS) || 4) * 1000,
    finishMs: (Number(arg('duel-finish-seconds') ?? process.env.DUEL_FINISH_SECONDS) || 3) * 1000,
    winsNeeded: 2,
    stake: 50,
    prize: 100,
    fighterOffset: 3.5, // đầu mỗi hiệp mỗi võ sĩ đứng cách tâm võ đài ngần này (hai bên đối diện nhau)
    fighterMargin: 1.2, // võ sĩ không ra sát dây hơn ngần này: cũng là cách bịt hai lối vào ở cạnh bắc / nam
    spectatorGap: 2, // lúc bắt đầu người xem được đưa tới cách dây ít nhất ngần này
    spectatorEdge: 0.9, // người xem không được đứng gần võ đài hơn ngần này tính từ dây
  },

  // Thuốc (server/game/potions.js, potionDrops.js): nằm sẵn trên sân (không máy bay, không hòm), nhặt là uống ngay.
  // Chỉ số từng loại (kích thước, máu, tốc độ) nằm trong bảng POTIONS của potions.js. Thử nhanh: --potion-first-seconds=3.
  POTION: {
    firstMs: (Number(arg('potion-first-seconds') ?? process.env.POTION_FIRST_SECONDS) || 15) * 1000, // thuốc đầu tiên xuất hiện sau ngần này từ đầu trận
    intervalMs: 20000, // cứ ngần này lại có thêm một lọ
    maxOnField: 3, // trên sân đang có đủ ngần này lọ chưa ai nhặt thì thôi không thêm
    durationMs: 30000, // thời gian hiệu lực
  },

  // Đấm trời giáng của người hoá to (server/game/bigPunch.js): giữ phím `chargeMs` rồi thả, `impactMs` sau (khớp khung hình tay duỗi hết cỡ của clip
  // big_right_punch trừ đi khung lấy đà `CHARACTER.bigWindup` ở client: 0.75s − 0.25s) sóng xung kích nổ ra cách người đấm `reach` mét theo hướng nhìn.
  // Mọi người trong `radius` mét quanh tâm sóng (không bị tường chặn, chênh độ cao không quá `vertical`) mất máu và bị đánh văng ra xa tâm;
  // ở mép chỉ còn `edgeDamageMult` / `edgeKnockMult` lần sát thương / lực ở tâm. `lift` là vận tốc hất lên (m/giây).
  BIG_PUNCH: {
    chargeMs: 800,
    slackMs: 150, // thả sớm hơn `chargeMs` ngần này vẫn tính là đủ (mạng giật)
    cooldownMs: 8000,
    impactMs: 500,
    reach: 3,
    radius: 8,
    vertical: 4,
    damage: 35,
    edgeDamageMult: 0.4,
    knockSpeed: 22,
    edgeKnockMult: 0.5,
    lift: 7,
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
  NUKE_FALL_MS: 3000, // bom rơi từ máy bay xuống đất (khớp độ dài falling bomb.mp3 ≈ 3s), hết thì nổ
  // Vùng nổ: bom rơi xuống chỗ người gọi đang ngắm (xa nhất `maxRange` mét). Trong `killRadius` mét chết ngay, từ đó tới `radius`
  // sát thương giảm dần về 0. Người gọi không được miễn. Trận đấu vẫn tiếp tục.
  NUKE_AREA: { radius: 25, killRadius: 15, maxRange: 120 },
  // Radio gọi bom: số lần hạ gục liên tiếp (không chết) để gọi máy bay thả hòm chứa radio, và hòm rơi cách người gọi chừng này (mét).
  RADIO_STREAK_KILLS: 5, // khớp RADIO_STREAK_KILLS ở public/js/config.js
  RADIO_DROP_DISTANCE: 8,
  // Hòm tiếp tế thường không còn radio. Để thử có thể cho mọi người bắt đầu với radio: [{ weapon: 'nuke', ammo: 1 }].
  START_WEAPONS: [],

  PATTERN_COUNT: 5,
  LOOK_DEFAULT: { shirt: '#e53935', pants: '#1a237e', glove: '#1e88e5', skin: '#f5c7a3', hair: '#1a120d' },
  FACE_IMAGE: { width: 64, height: 48 }, // cỡ ảnh mặt (điểm ảnh RGBA thô), khớp với FACE_IMAGE của client
  MAX_MESSAGE_BYTES: 64 * 1024, // tin nhắn WebSocket lớn nhất nhận từ client (tin `join` kèm ảnh mặt khoảng 17 KB)
};
