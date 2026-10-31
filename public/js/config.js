export const PUNCH_TIME = 0.25;
// Skill ném vũ khí (player/skillThrow.js): giữ chuột phải để ngắm, chuột trái để ném. Số liệu bay nằm ở WEAPON_THROW của server (gửi qua weaponInfo).
// `pose`: lúc giữ chuột phải ngắm, tay (góc nhìn thứ nhất) giơ lên `up`, thu về phía mình `back` và lệch `side` (mét, hệ camera), `ease` = độ nhanh vào / ra tư thế (1/giây).
// Nếu chỉnh `up` thì chỉnh luôn WEAPON_THROW.hand.up ở server/config.js để đường ném vẫn bắt đầu đúng chỗ bàn tay.
export const SKILL_THROW = { spin: 22, lockoutSeconds: 0.5, pose: { up: 0.18, back: 0.12, side: 0.04, ease: 14 } };
export const DUEL_THROW_PREVIEW = {
  samples: 64, diameter: 1, thickness: 0.05, lift: 0.08, radius: 0.04, // radius: độ dày đường bay (mét)
  valid: '#69ff91', invalid: '#ff5964', wait: '#ffc857',
  // Đường bay xuất phát ngay trước mắt nên nhìn từ camera chỉ thấy một đường thẳng. Đoạn đầu được vẽ lệch sang phải và xuống dưới (mét, theo hệ camera)
  // rồi khép dần về đường thật trong `fade` (tỉ lệ chiều dài) đầu của đường, để thấy cung cong; điểm rơi vẫn đúng chỗ.
  startOffset: { right: 0.6, down: 1.3, fade: 0.65 },
};
export const DUEL_TEAM_FX = {
  colors: ['#63baff', '#ffad63'],
  diameter: 1.1, thickness: 0.055, lift: 0.06, headHeight: 2.5, markerSize: 0.22,
};
// Màu thanh máu trên đầu trong võ đài: địch đỏ; đồng đội / người xem nhìn thấy màu hai đội ở `DUEL_TEAM_FX.colors`;
// người không thuộc trận (hoặc ngoài sự kiện) giữ xanh mặc định.
export const DUEL_TEAM_BAR = { enemy: '#ff3b3b', neutral: '#33e633' };
export const TNT_MODEL = {
  url: '/models/tnt.glb',
  length: 0.45,
  colors: { explosive: '#ce3029', strap: '#40352f', fuse: '#d8b576' },
};
export const TABLE_GAME = { key: 'KeyF', keyLabel: 'F', tagHeight: 3.2, tagMargin: 110, inviteRange: 45 };
export const TABLE_MODEL = {
  url: '/models/table.glb', height: 0.79, flipClip: 'flip',
  colors: { table_top: '#8a5a33', table_leg: '#6b4423' },
};
export const TABLE_BOARD = {
  surface: 'table_top', inset: 0.1, lift: 0.004,
  thickness: 0.008, gridWidth: 0.014, markWidth: 0.035, markSize: 0.6, ringSegments: 24,
  colors: { background: '#f4e5bf', grid: '#594329', x: '#c52e32', o: '#186cc4', win: '#edaa12' },
};
export const PUNCH_COOLDOWN = 0.35;
export const MOVE_SPEED = 6;
export const EYE_HEIGHT = 1.7;
export const CROUCH_EYE_HEIGHT = 1.15;
export const SPRINT_MULT = 1.6;
// Sự kiện hoá chó (entities/dogForm.js, ui/eventHud.js, player/localPlayer.js). Điểm thưởng và thời gian do server quyết định.
export const DOG = {
  speedMult: 1.2, // người hoá chó chạy nhanh hơn ngần này lần (server không kiểm tốc độ). Chó cũng chạy nước rút được: 1.2 × 1.6 = 11.5 m/s so với 9.6 của người rượt, và nước rút có thể lực nên không thoát mãi được
  eyeHeight: 0.85, // mắt chó thấp sát đất
  barHeight: 1.45, // thanh máu + tên của chó treo ở độ cao này (người là 2.3)
  markerHeight: 2.2, // mũi tên đỏ trên đầu chó để cả sân thấy
  tagHeight: 2.7, // bảng "tiền thưởng" trên màn hình bám ở độ cao này so với chân chó (ui/dogTracker.js)
  trackerMargin: 56, // bảng cách mép màn hình ngần này pixel thì coi như ngoài tầm nhìn, chuyển sang mũi tên ở mép
  trackerInset: 58, // ngoài tầm nhìn: bảng lùi vào trong ngần này pixel so với mũi tên ở mép
  fur: [0.66, 0.44, 0.24],
  furDark: [0.42, 0.27, 0.14],
  nose: [0.08, 0.08, 0.08],
  marker: [1, 0.15, 0.1],
};
// Kỹ năng thả shit của con chó (player/poop.js, entities/poop.js, ui/stinkOverlay.js). Số cục tối đa, hồi chiêu, bán kính dính và thời gian chậm do
// server quyết định (DOG_EVENT.poop ở server/config.js); ở đây là phím, mức chậm (server không kiểm tốc độ) và phần hình.
export const POOP = {
  key: 'KeyQ',
  keyLabel: 'Q',
  slowMult: 0.7, // dậm phải thì chạy chậm còn ngần này lần trong thời gian server báo
  patchRadius: 1.5, // bán kính bãi shit vẽ ra (mét), khớp vùng dính DOG_EVENT.poop.radius ở server/config.js
  hitShake: 0.15,
  colors: { body: '#6b3f1d', dark: '#4a2a12' },
  puff: { color: [0.55, 0.65, 0.12], every: 0.7, life: 1.6, rise: 0.9, burst: 8, visibleRange: 40 }, // khói thối bốc từ cục shit (fx/poopFx.js)
  overlayOpacity: 0.9, // độ đậm tối đa của sọc thối che màn hình
  fadeInMs: 300,
  fadeOutMs: 1000,
  textMs: 2800, // dòng chữ "Thúi quá..." hiện ngần này mili giây từ lúc dậm phải
};

// Thuốc hoá to / nhỏ (entities/potionModel.js, ui/potionHud.js). Chỉ số từng loại (kích thước, máu, tốc độ, va chạm) do server gửi trong `welcome`;
// ở đây chỉ là phần hình. Model potion.glb không có màu nên tô theo tên khối (`kinds`), nước thuốc đổi màu theo loại thuốc.
// Mọi loại thuốc (to ×2/×3/×4, nhỏ) CÙNG MỘT MÀU để người chơi không đoán được trước khi uống. Muốn tách màu từng loại thì sửa `liquid` bên dưới.
const POTION_COLOR = '#b04bff';

export const POTION = {
  url: '/models/potion.glb',
  height: 0.55, // lọ thuốc nằm trên sân cao ngần này (mét)
  hover: 0.7, // lơ lửng cao ngần này trên mặt đất (tâm lọ)
  beam: { height: 30, diameter: 1 }, // cột sáng vàng trên lọ thuốc cho dễ thấy từ xa (lọ không có hòm / khói nên chỉ có cột này để tìm)
  kinds: { beveled_cuboid: 'liquid', tube: 'glass', cylinder: 'cork' },
  colors: { glass: '#d3edf5', cork: '#8a5a2b' },
  liquid: { grow2: POTION_COLOR, grow3: POTION_COLOR, grow4: POTION_COLOR, shrink: POTION_COLOR }, // màu nước thuốc, cũng là màu thanh đếm ngược trên HUD
  sizeEase: 3.5, // to ra / nhỏ lại mượt theo tốc độ này (càng lớn càng nhanh; 3.5 ≈ gần xong sau 0.8 giây), cả mình lẫn người khác
  // Hiệu ứng lúc uống / hết thuốc trên máy mình (fx/potionFx.js, ui/potionFlash.js); hết thuốc thì nhẹ bằng `endStrength` lần.
  fx: {
    fov: 0.3, // góc nhìn giãn ra (to) hoặc thu lại (nhỏ) ngần này radian rồi trả dần
    fovEase: 2.5, // tốc độ trả góc nhìn về bình thường
    shake: 0.3, // rung camera khi hoá to (hoá nhỏ rung bằng `shrinkShakeMult` lần)
    shrinkShakeMult: 0.4,
    endStrength: 0.5,
  },
};

// Thân dưới của mình ở góc nhìn thứ nhất (player/bodyView.js): nhân vật model đầy đủ nhưng chỉ hiện quần và giày (tên khối trong char.glb),
// đặt đúng chỗ đứng, co giãn theo thuốc nên nhìn xuống thấy đôi chân to / nhỏ. Đặt `enabled: false` để quay về chỉ thấy tay.
export const BODY_VIEW = {
  enabled: true,
  meshes: ['cylinder', 'beveled_cuboid'], // quần và giày (khối của mỗi chân)
  feetEdge: 0.85, // cúi xuống tối đa (PITCH_LIMIT) thì bàn chân nằm ở ngần này của quãng từ tâm tới mép dưới màn hình (0 = giữa màn hình, 1 = sát mép, >1 = ra ngoài)
  stepRate: 3, // chân đung đưa nhanh cỡ này theo tốc độ đi (khớp remotePlayer.js); người to bước chậm, người nhỏ bước dồn (chia cho căn bậc hai kích thước)
};
export const EVENT_RESULT_MS = 6000; // thông báo kết quả sự kiện hiện ngần này
// Cổng khoá võ đài trong sự kiện solo (fx/ringGates.js): song sắt cao `height` mét, rộng đúng `ring.gate` của map, hạ từ độ cao `lift` xuống trong
// `closeSeconds` (kéo lên trong `openSeconds` khi sự kiện kết thúc). `depth` cũng là độ dày va chạm khi cổng đã đóng.
export const RING_GATE = {
  height: 2.6,
  depth: 0.3,
  barGap: 0.25,
  railHeight: 0.14,
  lift: 4,
  closeSeconds: 0.45,
  openSeconds: 1,
  colors: { frame: '#2c2f36', bar: '#5d636e', lock: '#d4a017' },
};
// Vòng bo của sự kiện solo (fx/ringZone.js): tường năng lượng cao `height` mét ở bán kính `ring.leash` của map, vạch dọc `repeat` lần quanh vòng chạy ngang
// với tốc độ `scroll`, lấp lánh `pulse` (0–1), hiện / tan trong `fadeSeconds` và lúc hiện thu dần từ `shrinkFrom` lần bán kính vào.
export const DUEL_ZONE = {
  height: 40,
  tessellation: 96,
  color: '#3b8bff',
  edgeColor: '#9fd8ff',
  edgeThickness: 0.35,
  repeat: 28,
  scroll: 0.03,
  pulse: 0.25,
  fadeSeconds: 1.4,
  shrinkFrom: 1.6,
};
export const KICKED_NOTICE_KEY = 'kickedFromRoom'; // khoá sessionStorage: vừa bị chủ phòng kick, menu báo lý do một lần
export const ROOM_CLOSED_NOTICE_KEY = 'roomClosed'; // khoá sessionStorage: khán giả ở lại phòng đã hết người chơi, menu báo lý do một lần
export const REMOTE_SNAP_DIST = 12; // người khác nhảy xa hơn ngần này giữa hai snapshot (bị dịch chuyển, vd. đưa vào võ đài) thì đặt thẳng tới chỗ mới thay vì trượt qua
export const SPRINT = { duration: 5, recovery: 4, delay: 1, restart: 0.2 };
export const SPRINT_CAMERA = { fovBoost: 0.2, easeIn: 10, easeOut: 5 };
export const SPRINT_FX = {
  textureSize: 32,
  aura: { capacity: 100, rate: 65, life: 0.35, size: 0.24, color: [0.2, 1, 0.8] },
  trail: { capacity: 120, rate: 85, life: 0.45, size: 0.12, color: [1, 0.88, 0.3] },
  width: 0.55,
  height: 1.4,
  baseHeight: 0.2,
  back: 0.45,
  trailSpeed: 2,
  stretch: 7,
  fade: 0.7,
  firstPerson: {
    depth: 1.5,
    edge: 0.78,
    height: 0.85,
    width: 0.035,
    life: 0.26,
    speed: 0.85,
    trailSize: 0.012,
    stretch: 12,
    color: [0.72, 0.9, 1],
    alpha: 0.36,
    rate: 18,
    capacity: 12,
    fadeIn: 12,
    fadeOut: 8,
  },
};
export const CROUCH_MULT = 0.5;
export const JUMP_SPEED = 6.5;
export const GRAVITY = 20;
export const JUMP_AIR_TIME = (2 * JUMP_SPEED) / GRAVITY; // thời gian bay của một cú nhảy trên đất bằng (giây)
export const AIRBORNE_HEIGHT = 0.3; // cao hơn mặt đất ngần này (mét) thì người chơi khác được coi là đang nhảy
export const BASE_FOV = 1.1;
export const FOV_MIN = 0.7; // giới hạn thanh chỉnh FOV trong Cài đặt (radian)
export const FOV_MAX = 1.5;
export const MIN_DIST = 1.0; // khoảng cách tối thiểu giữa hai người chơi, khớp với server
export const PLAYER_RADIUS = 0.5;
export const WATER_SPEED_MULT = 0.55; // lội nước chậm hơn đi cạn
export const GROUND_STICK = 0.25; // đi xuống dốc, cách đất dưới ngần này thì vẫn bám đất (không rơi)
// Độ mịn hình cầu (số đoạn của CreateSphere; mặc định của Babylon là 32 = 4.600 tam giác mỗi quả, quá nặng vì sân có hàng trăm bụi cây / đá).
// 10 = 576 tam giác, 8 = 400, 12 = 784, 16 = 1.296: nhìn vẫn tròn ở cỡ vật nhỏ; đá dùng 8 + bóng phẳng cho ra kiểu low-poly.
// Vật trang trí dùng thin instance không bị cắt theo khung nhìn nên mọi quả cầu trên sân đều được vẽ mỗi khung hình: giữ số này thấp.
// bushSegments: [quả to, quả nhỏ] của bụi cây (80 bụi ở map default = phần lớn tam giác của sân, xem docs/perf.md); bụi và đá đều bóng phẳng kiểu low-poly.
export const MESH_DETAIL = { ballSegments: 10, rockSegments: 7, bushSegments: [6, 5] };
export const ROOM_MAX_PLAYERS = 8; // số người tối đa mỗi phòng, khớp ROOM_MAX_PLAYERS ở server/config.js (giới hạn số bot trong màn tạo phòng)
export const HOTBAR_SLOTS = 4; // số ô vũ khí trong túi, khớp INVENTORY_SLOTS ở server/config.js
export const FIST_SLOT = HOTBAR_SLOTS; // giá trị activeSlot khi không cầm gì (tay không, không hiện trên thanh đồ; phím X), khớp FIST_SLOT ở server
export const PICKUP_RADIUS = 1.2; // khớp PICKUP_RADIUS ở server/config.js (chỉ dùng để nhắc "túi đầy")
export const RADIO_STREAK_KILLS = 5; // hạ gục liên tiếp (không chết) để gọi máy bay thả radio gọi bom, khớp server/config.js
export const ISLAND_FALL_MARGIN = 2; // đảo trời: chân thấp hơn mặt đảo quá ngần này là đã rơi, không kéo lên lại; khớp server/config.js

// Ảnh mặt người chơi chọn: cắt giữa về đúng cỡ này rồi gửi lên server dạng điểm ảnh RGBA thô (base64). Khớp với FACE_IMAGE của server.
export const FACE_IMAGE = { width: 64, height: 48 };

export const MOUSE_SENSITIVITY = 0.0022;
export const SENSITIVITY_MIN = 0.0005; // radian/pixel, giới hạn thanh chỉnh độ nhạy chuột
export const SENSITIVITY_MAX = 0.006;
export const STATE_SEND_MS = 50;
export const PITCH_LIMIT = 1.4; // góc ngẩng/cúi tối đa (radian), khớp PITCH_LIMIT ở server/config.js

// Chế độ khán giả (?mode=spectator): camera bay tự do để quay phim trận đấu (player/spectatorCamera.js, ui/recording.js).
// HUD là DOM nên không lọt vào video; tay / chân / súng trong scene thì bị ẩn.
export const SPECTATOR = {
  fov: BASE_FOV, // góc nhìn dọc cố định (radian), không theo thanh chỉnh FOV của người chơi
  overviewMargin: 1.15, // lúc mới vào phòng: cao bằng ngần này lần "vừa đủ thấy nửa cạnh sân" để mép sân không sát khung hình
  pitchLimit: 1.55, // ngẩng / cúi tối đa khi bay (radian); gần thẳng xuống để nhìn toàn sân
  speed: 22, // tốc độ bay (m/giây), Space lên / Shift xuống
  accel: 9, // bay nhanh dần / dừng lại mượt (1/giây)
  minHeight: 1.5, // không bay xuống dưới mặt sân
  maxHeight: 400,
  margin: 1.3, // bay ra ngoài mép sân tối đa ngần này lần nửa cạnh
  key: 'KeyR', // bắt đầu / dừng quay
  record: {
    fps: 30, // số khung hình ghi mỗi giây
    videoBitsPerSecond: 6_000_000, // 6 Mbps: đủ nét cho 1080p
    audioBitsPerSecond: 128_000,
    minMs: 3000, // bấm nhầm rồi dừng ngay (ngắn hơn ngần này) thì bỏ, không tải về
  },
};

// Súng: số đạn hiện trên màn hình trừ ngay khi bắn; snapshot của server chỉ ghi đè khi đã ngừng bắn ngần này mili giây
// (nếu không con số sẽ nhảy lên xuống vì snapshot tới chậm hơn phát bắn).
export const AMMO_SYNC_GRACE_MS = 400;
// Đổi ô vũ khí hiện ngay trên máy mình; snapshot tới trong khoảng này có thể vẫn là ô cũ nên chưa ghi đè.
export const SLOT_SYNC_GRACE_MS = 400;
export const RECOIL_RECOVER = 12; // tốc độ tay/súng trở về chỗ cũ sau khi giật (càng lớn càng nhanh)
// Lửa đầu nòng của mình: lệch khỏi mắt theo hệ camera (phải, xuống, ra trước), khớp chỗ đầu nòng của súng cầm ở tay phải.
export const MUZZLE_OFFSET = { right: 0.2, down: 0.2, forward: 1.0 };
export const GUN_FX = {
  tracerWidth: 0.035,
  tracerLife: 0.08, // giây
  muzzleLife: 0.06,
  explosionLife: 0.5,
  smokeEvery: 0.03, // tên lửa nhả khói mỗi chừng này giây
  rocketMaxAge: 5, // phòng khi mất tin nhắn 'boom'
  flashBurstLife: 0.25, // lựu đạn choáng loé sáng trong ngần này giây
  flashBurstSize: 3, // quả cầu sáng phình tới đường kính này (mét)
};

// Lựu đạn băng (server quyết định bay và nổ ở đâu; ở đây là phần hình và cách trượt).
export const ICE = {
  // Trượt (player/iceSlide.js): trên băng người chơi không đổi hướng ngay mà tăng tốc dần theo hướng bấm rồi trượt đi theo đà.
  slide: {
    entryBoost: 1.5, // vừa bước lên băng thì tốc độ đang đi nhân ngần này...
    entryMinSpeed: 8, // ...nhưng không dưới ngần này (m/giây) nếu đang bấm đi, để bước lên là bị tống đi nhanh
    accel: 1.2, // tăng tốc theo hướng bấm = tốc độ đi bình thường × hệ số này (m/giây²): chạy nhanh/ngồi thì trượt nhanh/chậm tương ứng
    friction: 0.6, // đà giảm theo hàm mũ với tốc độ này (1/giây): càng nhỏ càng trượt xa
    maxSpeed: 13, // tốc độ trượt tối đa (m/giây)
    exitGrip: 3, // rời khỏi băng thì đà tan dần về tốc độ đi bình thường với tốc độ này (1/giây)
    settleSpeed: 0.3, // đà lệch tốc độ đi bình thường ít hơn ngần này (m/giây) thì coi như hết trượt
    heightTolerance: 0.5, // chân cao hơn mặt đất dưới vũng băng quá ngần này (đứng trên cầu) thì không phải đang đứng trên băng
  },
  // Vũng băng (fx/ice.js): đĩa phủ lên đất theo địa hình.
  patch: {
    rings: 5, // số vòng đồng tâm của đĩa
    segments: 28, // số đỉnh mỗi vòng
    lift: 0.04, // nâng đĩa lên khỏi mặt đất (mét), kèm zOffset để không nhấp nháy với đất
    growTime: 0.25, // giây vũng băng loang ra khi mới tạo
    fadeTime: 1.2, // giây mờ dần trước khi tan
    edgeAlpha: 0.0, // độ đặc ở mép đĩa (giữa đĩa là centerAlpha)
    centerAlpha: 0.82,
    textureSize: 256,
    textureScale: 1.15, // vết nứt trên mặt băng: một ô hoạ tiết ứng với từng này lần bán kính
  },
  // Quả lựu đạn đang bay (fx/grenades.js).
  grenade: { spin: 9, maxAge: 6, trailEvery: 0.04 }, // quay (rad/giây); phòng khi mất tin 'freeze'; nhả hạt băng mỗi chừng này giây
  burst: { life: 0.55, shards: 22, shardSpeed: 5 }, // hiệu ứng băng vỡ lúc nổ
};

// Radio gọi bom hạt nhân (fx/nuke.js, fx/nukeCloud.js, ui/nukeFlash.js). Các mốc thời gian do server gửi trong 'nuke'; ở đây là âm thanh và phần hình.
export const NUKE = {
  // File trong public/sound (không kèm đuôi .mp3); `gain` là âm lượng. Phát theo thứ tự: radio → còi báo động → bom rít → nổ.
  sounds: {
    radio: { file: 'radio_chat', gain: 1 },
    raid: { file: 'air_raid', gain: 0.8 },
    fall: { file: 'falling bomb', gain: 1 },
    boom: { file: 'explosion', gain: 1 },
  },
  raidFadeMs: 1200, // còi báo động nhỏ dần ngần này khi bom bắt đầu rơi
  planeLeaveMargin: 40, // máy bay bay quá điểm thả ngần này (mét) so với lúc vào thì xoá
  flash: { holdMs: 1200, fadeMs: 5000, farRange: 3 }, // màn hình trắng xoá: giữ kín rồi tan dần; ở xa hơn `farRange` lần bán kính vùng nổ thì chỉ còn `minStrength`
  minStrength: 0.2,
  rumble: { power: 0.16, seconds: 3.5 }, // rung camera sau vụ nổ, giảm dần (nhẹ đi theo khoảng cách như màn trắng)
  bomb: { length: 3.2, radius: 0.45 }, // quả bom rơi (mét)
  // Vòng cảnh báo đỏ (fx/nukeZone.js) từ lúc còi kêu tới lúc nổ: tường mờ ở mép vùng nổ và vành chết ngay bên trong.
  zone: { height: 30, alpha: 0.22, killAlpha: 0.35, pulse: 4, color: [1, 0.12, 0.08] },
  cloud: {
    life: 18, // giây từ lúc nổ tới khi tan hết
    fireballRadius: 18,
    fireballGrow: 1.0, // giây quả cầu lửa phình ra
    fireballFade: 5, // giây quả cầu lửa tắt hẳn
    rise: 10, // giây khối mây bốc lên tới đỉnh
    stemHeight: 55,
    stemBottom: 5, // bán kính chân / đỉnh cột khói
    stemTop: 8,
    capRadius: 24, // bán kính tán nấm khi nở hết
    capGrow: 7, // giây tán nấm nở ra
    puffs: 18, // số cụm mây tạo thành tán nấm (một đợt oanh kích có nhiều mây nên giảm từ 30 cho đỡ draw call)
    fadeFrom: 12, // giây bắt đầu mờ dần
    shockRadius: 70, // sóng xung kích lan trên mặt đất (rộng hơn vùng nổ cho đẹp, không gây sát thương)
    shockTime: 3,
    domeRadius: 40, // vòm sóng xung kích
    domeTime: 2.2,
  },
};

// Máy bay và hòm tiếp tế (thời điểm, vị trí, tốc độ do server gửi; ở đây chỉ là phần hình).
export const AIRDROP = {
  planeVisible: 220, // máy bay đã bay qua điểm thả quá ngần này (mét) thì xoá
  crateHover: 1.6, // vũ khí trong hòm lơ lửng cao ngần này trên mặt đất sau khi hòm chạm đất
  dropHover: 0.6, // vũ khí người chơi vứt ra (không có hòm) lơ lửng thấp hơn
  dropBeam: { height: 4, diameter: 0.7 }, // cột sáng vàng của vũ khí vứt ra (hòm tiếp tế không có cột sáng, đã có khói đỏ)
  bonusOffset: { x: 0.55, y: -0.35, scale: 0.8 }, // lựu đạn thưởng trong hòm: lệch sang cạnh vũ khí chính, nhỏ hơn chút
  sway: 0.18, // hòm đung đưa dưới dù (radian)
  smokeLateMs: 1000, // vào trận sau lúc thả hòm quá ngần này thì dựng sẵn khói thay vì để nó mọc dần từ đất
  // Cột khói ở chỗ hòm rơi (entities/smoke.js): bốc từ lúc hòm rời máy bay tới khi có người nhặt. Đang rơi thì cao chừng
  // speed × life × 0.65 mét; chạm đất rồi dùng bộ `ground*` (ít cụm, bốc thấp) để khói chỉ quẩn quanh hòm.
  // Khói đỏ là mặc định (hòm tiếp tế định kỳ); `smokeColors` là các màu khác theo `smokeKind` server gửi (vd: hòm radio gọi bom = vàng).
  smokeColors: { yellow: [0.98, 0.85, 0.1] },
  smoke: {
    color: [0.92, 0.12, 0.1],
    rate: 10, // cụm khói mỗi giây. Mỗi cụm là một mảnh mờ rất to, nhiều cụm chồng nhau thì GPU phải vẽ đè (overdraw) rất nhiều lần
    capacity: 120, // ≥ rate × life
    speed: 2, // tốc độ bốc lên lúc đầu (m/giây), chậm dần còn 35%
    life: 6, // giây mỗi cụm khói tồn tại
    startSize: 1.2, // cụm khói nở từ cỡ này (mét)...
    endSize: 5, // ...tới cỡ này khi lên tới đỉnh
    wind: [0.25, 0, 0.12], // gió đẩy khói lệch sang một bên (m/giây²)
    prewarmCycles: 40,
    groundRate: 5, // hòm đã chạm đất: ít khói hơn...
    groundSpeed: 1, // ...và bay thấp hơn...
    groundLife: 4, // ...mỗi cụm cũng tan nhanh hơn
  },
};

// Nhân vật dựng từ model .glb. "kinds" gán tên khối trong file → bộ phận để tô màu theo lựa chọn của người chơi
// (khối đặt tên theo tiền tố shirt_/pants_/glove_/skin_/hair_ thì khỏi cần ghi vào đây). Khối không có trong bảng giữ màu trắng.
export const CHARACTER = {
  url: '/models/char.glb',
  height: 2.0, // co giãn model về chiều cao này (mét), chân chạm đất
  facing: 0, // xoay model quanh trục Y (rad) cho mặt hướng +Z như nhân vật dựng bằng code
  idleSpeed: 1, // tốc độ vòng lặp idle (1 = đúng như file; giảm số này để chậm hơn)
  bigWindup: 0.25, // giây trong clip big_right_punch lúc tay lấy đà xong: tích lực dừng ở đây, thả thì chạy tiếp (khung 0.75 là lúc đấm trúng)
  patternMeshes: ['body'], // khối áo mang hoạ tiết (tay áo chỉ có màu trơn)
  offHandMesh: 'right_hand', // khối găng tay trái (tên trái/phải trong file đang đặt ngược, như bên dưới)
  eyeMeshes: ['left_eye', 'right_eye'], // điểm giữa hai mắt = chỗ đặt camera khi dựng tay góc nhìn thứ nhất
  handMesh: 'left_hand', // khối găng nơi cầm kiếm. Trong file này tên trái/phải đang đặt ngược, 'left_hand' mới là tay phải của nhân vật
  kinds: {
    body: 'shirt', left_shoulder: 'shirt', right_shoulder: 'shirt', left_bicepts: 'shirt', right_bicepts: 'shirt',
    belt: 'glove', left_hand: 'glove', right_hand: 'glove',
    head: 'skin', neck: 'skin', left_elbow: 'skin', right_elbow: 'skin', left_foream: 'skin', right_foream: 'skin',
    cylinder: 'pants',
    beveled_cuboid: 'shoe', left_eye: 'eye', right_eye: 'eye', left_pupil: 'pupil', right_pupil: 'pupil',
    mouth: 'mouth', nose: 'nose',
  },
  // Khối không có tên riêng (vd: 4 khối `cube` của tóc) được nhận theo tên nhóm cha.
  groupKinds: { hair: 'hair' },
  fixedColors: { shoe: '#1b1b22', eye: '#ffffff', pupil: '#14141a', mouth: '#8c2626' },
  // Bộ phận không có màu cố định mà lấy màu của bộ phận khác nhân `mult` (mũi = da sẫm hơn một chút cho có chiều sâu).
  shadedColors: { nose: { of: 'skin', mult: 0.86 } },
  // Mắt, mũi, miệng là hộp mỏng mặt trước gần như trùng mặt phẳng với mặt trước của đầu (mắt chỉ nhô 0.0006, mũi nhô 0) nên bị nhấp nháy
  // (z-fighting) với da; các bộ phận này được vẽ đè lên đầu bằng zOffset. Con ngươi cũng chỉ nhô khỏi mắt ~0.001 nên phải âm hơn mắt.
  featureZOffset: { eye: -1, nose: -1, mouth: -1, pupil: -2 },
  // Ảnh mặt dán lên mặt trước của khối `mesh` (đầu hình hộp), thành khung `width` × `height` (đơn vị model) quanh tâm (centerX, centerY)
  // của khối, nhìn từ phía trước. Gốc toạ độ của khối đầu không nằm giữa hộp (hộp trải từ -0.1875 tới 0.3125 ở cả ba trục) nên tâm phải khai báo.
  // `lift` phóng lớp ảnh to hơn đầu một chút để không chìm vào da; `replaces` là các khối mặt mặc định bị ảnh thay thế (ẩn đi).
  face: {
    mesh: 'head',
    width: 0.44,
    height: 0.33,
    centerX: 0.0625,
    centerY: 0.025, // trung tâm của vùng mắt → miệng (mặt trước đầu cao 0.5, từ y -0.1875 tới 0.3125)
    lift: 1.01,
    replaces: ['left_eye', 'right_eye', 'left_pupil', 'right_pupil', 'mouth', 'nose'],
  },
};

// Tay của mình ở góc nhìn thứ nhất: dùng chính nhân vật model (cùng hoạt ảnh đấm, thế thủ, cùng cách cầm vũ khí) nhưng chỉ hiện
// cẳng tay + bàn tay, gắn vào camera và vẽ đè lên mọi thứ (không xuyên tường). Model vẽ cho người nhìn từ ngoài: ở thế thủ hai bàn tay
// cách mắt ±0.7m và thấp 0.85m (ngoài tầm nhìn) nên phải co nhỏ rồi đẩy lên trước mặt. Đặt `enabled: false` để không hiện tay góc nhìn thứ nhất.
export const VIEWMODEL = {
  enabled: true,
  scale: 0.65, // co tay lại cho vừa tầm nhìn
  offset: { x: 0, y: 0.25, z: 0.6 }, // vị trí của MẮT model trong hệ camera (sau khi co); tăng y để tay lên cao, tăng z để tay ra xa
  renderingGroup: 1, // nhóm vẽ đè sau cùng (xoá bộ đệm độ sâu trước khi vẽ)
  // Chỉ hai bàn tay hiện, còn lại (cẳng tay, vai, thân, đầu, tóc...) ẩn. Không hiện cẳng tay vì ở thế thủ mắt nhìn dọc cẳng tay từ phía khuỷu,
  // cẳng tay che mất bàn tay và vũ khí đang cầm (dao, kiếm chỉ lòi ra đầu mũi).
  meshes: ['left_hand', 'right_hand'],
  raiseDrop: 0.35, // vừa đổi vũ khí thì tay hạ xuống ngần này (mét) rồi đưa lên
  sizeExponent: 0.5, // tay co giãn theo kích thước^số này. Không thể là 1: co giãn đều cả tay lẫn vị trí quanh camera thì trên màn hình không đổi gì
};

// Dash của động cơ phản lực sau lưng (player/dash.js, net/dashHandlers.js, ui/dashHud.js). Quãng đường, tốc độ và hồi chiêu do server quyết định
// (DASH ở server/config.js; hồi chiêu đến qua tin 'dash'), client chỉ có phím và độ mạnh của hiệu ứng trên máy mình.
export const DASH = {
  key: 'KeyE',
  keyLabel: 'E',
  pendingMs: 300, // vừa gửi tin 'dash' thì chờ server trả lời ngần này ms mới cho bấm lại (server từ chối thì không tốn hồi chiêu)
  fovKick: 0.16, // góc nhìn giãn ra lúc lao đi (radian), tan dần
  shake: 0.14, // rung camera lúc lao đi
};

// Động cơ phản lực jet_engine.glb đeo sau lưng nhân vật model (entities/jetpack.js) và lửa / khí phun ra khi dash (fx/jetFx.js).
// Model là hộp Blockbench không có màu: tô theo tên khối (`kinds`) hoặc tên nhóm cha (`groups`), màu trong `colors`, `glow` là màu tự phát sáng.
export const JETPACK = {
  url: '/models/jet_engine.glb',
  mount: 'body', // khối của char.glb mà động cơ gắn vào (thân áo)
  width: 0.78, // bề rộng động cơ khi đeo (mét); cao và dày co theo cùng tỉ lệ
  yaw: 0, // xoay quanh trục đứng (radian) nếu mặt trước của model không hướng ra sau lưng
  roll: 0, // xoay quanh trục trước-sau (radian)
  pitch: 0, // chúi về trước / ngửa ra sau (radian) quanh trục ngang; π lật ngược động cơ nếu cửa phun đang hướng lên
  up: 0.04, // dời lên so với tâm thân (mét)
  gap: 0.02, // khe hở giữa lưng và động cơ (mét)
  kinds: { right_fan: 'fan', left_fan: 'fan', right_sub_fan: 'fan', left_sub_fan: 'fan', shield: 'shield', core: 'core' },
  groups: { right_engine: 'engine', left_engine: 'engine', right_sub_engine: 'engine', left_sub_engine: 'engine', connector: 'frame' },
  colors: { engine: '#4b505e', frame: '#2d313c', fan: '#c4ccd8', shield: '#d8a31c', core: '#2fe3ff' },
  glow: { core: '#2fe3ff' },
  spin: { speed: 2.4, ease: 9 }, // tốc độ clip `run` lúc dash (1 = đúng như file) và độ nhanh lên vòng / chậm dần
  fanMeshes: /fan$/, // khối cánh quạt: nơi lửa và khí phun ra
  flame: { length: 1.1, width: 0.2, flicker: 0.3, outer: '#ff7a1a', inner: '#fff2a8', tail: 0.2, glide: 0.45 }, // tail: giây ngọn lửa còn cháy sau khi hạ cánh; glide: cỡ ngọn lửa lúc liệng sau dash (1 = như lúc dash)
  puff: { pool: 30, interval: 0.03, life: 0.5, size: 0.26, speed: 3.2, color: '#cfe7ff' }, // khí: các quả cầu nhỏ trôi ra sau rồi co lại
};

// Đấm trời giáng của người hoá to (player/bigPunch.js, fx/shockwave.js, ui/bigPunchHud.js). Thời gian tích lực, hồi chiêu, tầm và sức đánh văng
// do server quyết định (BIG_PUNCH ở server/config.js), client chỉ nhận thời gian tích lực và hồi chiêu qua `welcome.potions`.
export const BIG_PUNCH = {
  key: 'KeyQ', // giữ để gồng (hiện đường nhảy), thả để nhảy đấm
  keyLabel: 'Q',
  lockoutSeconds: 1, // sau khi tung đòn, ngần này giây không đấm thường chen vào cho khỏi cắt hoạt ảnh
  shake: 0.5, // rung camera khi sóng xung kích nổ ngay cạnh, nhỏ dần theo khoảng cách
  shakeRange: 2, // còn rung trong khoảng ngần này lần bán kính sóng
  shockwave: { life: 0.6, color: [1, 0.85, 0.5], sparks: 40 },
};

// Bị đánh văng (player/knockback.js): đà tan dần theo hàm mũ với tốc độ này (1/giây); trên không tan chậm nên bay xa.
export const KNOCKBACK = { groundFriction: 2.2, airFriction: 0.5, stopSpeed: 0.3 };

// Khiên xanh xoay quanh người đang uống thuốc có `gunDamageMult` < 1 (khổng lồ giảm sát thương súng, fx/giantShield.js). Kích thước theo đơn vị thân người
// bình thường (rig co giãn theo cỡ người nên khổng lồ ×3 tự to ra). `arc`: mỗi tấm chiếm ngần này vòng tròn; `pulse`: phình ra một nhịp khi bị súng bắn trúng.
export const SHIELD_FX = { count: 4, arc: 0.16, radius: 0.85, height: 1.5, centerY: 0.95, spin: 1.8, bob: 0.04, pulse: 0.15, color: [0.25, 0.65, 1], alpha: 0.4 };

// Vạch chia thanh máu (core/hpTicks.js): bậc đầu tiên mà (máu tối đa / small) <= maxSmall được dùng. 100 máu: vạch nhỏ mỗi 10, lớn mỗi 50;
// 400 máu (hoá to): nhỏ mỗi 25, lớn mỗi 100. `smallHeight` = chiều cao vạch nhỏ so với thanh (vạch lớn cao hết cỡ).
export const HP_TICKS = {
  steps: [{ small: 10, big: 50 }, { small: 25, big: 100 }],
  maxSmall: 24,
  smallHeight: 0.6,
  smallPx: 2, // bề rộng vạch trên texture thanh máu 3D (rộng 512 điểm) và trên thanh HUD (px)
  bigPx: 4,
  color: 'rgba(0, 0, 0, 0.8)',
};

// Cảm giác lúc trúng đòn (net/combatHandlers.js, fx/hitEffects.js, ui/hitDirection.js). `power` = sát thương / `fullDamage` (tối đa 1): đòn nặng thì
// mọi thứ mạnh hơn. Hiệu ứng nổ ra mỗi lần trúng nên nhớ quy tắc 16, 18: vài chục lần mỗi giây khi cả phòng cầm AK.
export const HIT_FX = {
  fullDamage: 60,
  stopMs: [35, 90], // hit stop: hoạt ảnh tay người đánh và người bị đánh đứng hình ngần này ms (nhỏ nhất, lớn nhất)
  shakeGiven: [0.02, 0.09], // rung camera của người đánh
  shakeTaken: [0.07, 0.28], // rung camera của người bị đánh
  fovPunch: -0.05, // người đánh: góc nhìn khép lại một nhịp (radian, nhân power), tan dần như state.fovKick
  nodGiven: 0.02, // người đánh: camera gật xuống (radian × power)
  kickTaken: { pitch: 0.06, yaw: 0.05, roll: 0.07 }, // người bị đánh: camera giật theo hướng đòn (radian × power), tan dần
  kickDecay: 11, // 1/giây
  flashMs: 110, // model người bị đánh chớp sáng
  flashColor: [0.7, 0.7, 0.7], // cộng vào emissive ở đỉnh chớp (nhân power)
  tiers: [ // màu / cỡ số sát thương theo mức sát thương (lấy dòng cuối có min <= dmg)
    { min: 0, color: '#e53935', scale: 1 },
    { min: 25, color: '#ff9800', scale: 1.25 },
    { min: 50, color: '#ffd600', scale: 1.55 },
  ],
  koTier: { color: '#ff1744', scale: 1.9 },
  sparks: [6, 14], // số tia lửa (nhỏ nhất, lớn nhất)
  dust: [0, 5], // số cục bụi (đòn nhẹ không có)
  dustMinPower: 0.3,
  ring: { size: [0.55, 1.5], life: 0.22 }, // vòng sóng va chạm (mét)
  ko: { shake: 0.45, shakeRange: 22, slowScale: 0.3, slowMs: 260, fov: -0.09, extraSparks: 14, extraDust: 6 },
  indicator: { ms: 750, minPower: 0.15 }, // chỉ báo hướng đòn trên viền màn hình
  tinnitus: { minPower: 0.55, strength: 0.7 }, // đòn nặng vào mình thì tai ù một nhịp (audio/hitSfx.js)
};

export const EQUIP_RAISE_TIME = 0.3; // giây để vũ khí mới đưa từ dưới màn hình lên

// Súng ở góc nhìn thứ nhất (player/gunView.js); chỗ đặt từng súng nằm ở `viewHold` trong định nghĩa súng.
export const GUN_VIEW = {
  glove: [0.07, 0.085, 0.08], // kích thước găng (mét)
  forearm: 0.07, // đường kính cẳng tay
  forearmLength: 0.3,
  sleeve: 0.1, // đường kính tay áo
  sleeveLength: 0.5,
  arms: [[0.35, -1, 0.9], [-0.8, -1, 0.8]], // hướng cẳng tay từ găng về phía người: tay cầm báng (phải), tay đỡ (trái)
  recoilBack: 0.08, // súng lùi lại khi giật (mét)
  recoilLift: 0.12, // nòng hếch lên khi giật (radian)
  raiseDrop: 0.3, // vừa đổi súng thì súng hạ xuống ngần này rồi đưa lên
  raiseTilt: 0.5, // và chúc nòng xuống ngần này (radian)
  reloadDrop: 0.18,
  reloadTilt: 0.3,
};

// Khung xem trước nhân vật trong menu.
export const PREVIEW = {
  cameraAlpha: Math.PI / 2 - 0.45, // nhìn chếch 3/4 mặt trước
  cameraBeta: 1.32,
  cameraRadius: 3,
  targetY: 1,
  fov: 0.8,
  rotateSpeed: 0.6,
};

// Ngoại hình mặc định khi người chơi chưa tuỳ chỉnh (khớp LOOK_DEFAULT ở server/config.js; hoạ tiết 0 = trơn).
export const DEFAULT_LOOK = { shirt: '#e53935', pants: '#1a237e', glove: '#1e88e5', skin: '#f5c7a3', hair: '#1a120d', pattern: 0 };

// Lựu đạn đang bay / nằm chờ nổ (fx/grenades.js). Vị trí thật do snapshot gửi; giữa hai snapshot client tự đoán bằng trọng lực.
export const GRENADE_FX = {
  gravity: 20, // khớp GRENADE.gravity ở server/config.js
  radius: 0.1, // khớp GRENADE.radius
  spin: 9, // quả lựu đạn xoay khi bay (radian/giây)
  correct: 12, // kéo vị trí đang vẽ về vị trí snapshot nhanh cỡ này (càng lớn càng sát)
  maxAge: 6, // giây; phòng khi mất tin nhắn 'detonate'
};

// Lựu đạn choáng: server báo mức độ theo khoảng cách (đã trừ người bị che), client nhân thêm theo hướng nhìn.
export const FLASHBANG = {
  maxMs: 3000, // choáng lâu nhất (đứng sát, nhìn thẳng vào)
  holdFraction: 0.35, // trắng xoá trong phần đầu này rồi mới mờ dần
  facingFull: 0.5, // cos góc giữa hướng nhìn và quả nổ: lớn hơn ngần này là nhìn thẳng, choáng đủ
  behind: 0.3, // quay lưng lại vẫn choáng ngần này phần (ánh sáng phản chiếu, tiếng nổ)
  minStrength: 0.08, // yếu hơn ngần này thì bỏ qua
  muffleFreq: 500, // âm thanh nghẹt lại (lọc thấp tới tần số này) trong lúc choáng
};

// Bão (fx/weather.js, fx/rain.js, fx/lightning.js). Thời điểm và chỗ sét đánh do server quyết định.
export const WEATHER = {
  skyStorm: [0.3, 0.34, 0.4], // màu trời khi bão (màu trời quang lấy từ core/scene.js)
  lightMult: 0.55, // ánh sáng còn ngần này lần khi bão
  fogDensity: 0.012, // sương mù khi mưa to
  rain: {
    capacity: 1600, // hạt CPU: chi phí JS và fill-rate tỉ lệ với số hạt đang rơi (≈ rate × life), nên rate/capacity đã giảm hơn một nửa (docs/perf.md)
    rate: 1300, // giọt mỗi giây khi mưa to nhất
    area: 30, // mưa rơi trong hình vuông cạnh ngần này (mét) quanh camera
    height: 14, // giọt bắt đầu rơi cao hơn camera ngần này
    speed: 28, // m/giây
    life: 0.6,
    size: [0.03, 0.05],
    stretch: 10, // giọt kéo dài thành vệt
    color: [0.75, 0.8, 0.9, 0.45],
  },
  rainVolume: 0.5,
};
export const LIGHTNING_FX = {
  boltLife: 0.25, // giây tia sét còn hiện
  boltHeight: 60, // tia sét bắt đầu từ độ cao này trên mặt đất
  boltSegments: 14, // số khúc gấp của tia sét
  boltVariants: 4, // số hình tia dựng sẵn, mỗi tia là instance của một hình rồi xoay ngẫu nhiên (không dựng ống mới mỗi tia)
  boltJitter: 2.2, // mỗi khúc lệch ngang tối đa ngần này (mét)
  boltRadius: 0.12,
  skyFlash: 1.6, // ánh sáng tăng thêm ngần này lúc sét đánh rồi tắt dần
  skyFlashLife: 0.35,
  speedOfSound: 343, // tiếng sấm tới trễ theo khoảng cách (m/giây)
  shakeRange: 12, // đứng gần hơn ngần này (mét) thì rung camera
  shake: 0.25,
};
export const STUN_FX = {
  color: [1, 0.85, 0.12],
  arcs: 8, segments: 6, refreshSeconds: 0.12, // đổi hình hồ quang mỗi chừng này giây (ghi lại buffer toạ độ của từng người choáng)
  radius: 0.65, height: 1.9, dogHeight: 0.85, jitter: 0.16,
  shake: 0.08,
};
export const DUEL_AUDIENCE_FX = {
  red: '#e73c32', markerColor: '#ffe56b', diameter: 0.22, spin: 12,
  markerDiameter: 1.5, markerThickness: 0.07, markerLift: 0.08,
  splashDiameter: 0.7, splashMs: 300,
};
