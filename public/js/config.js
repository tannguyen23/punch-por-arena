export const PUNCH_TIME = 0.25;
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
export const POTION = {
  url: '/models/potion.glb',
  height: 0.55, // lọ thuốc nằm trên sân cao ngần này (mét)
  hover: 0.7, // lơ lửng cao ngần này trên mặt đất (tâm lọ)
  beam: { height: 30, diameter: 1 }, // cột sáng vàng trên lọ thuốc cho dễ thấy từ xa (lọ không có hòm / khói nên chỉ có cột này để tìm)
  kinds: { beveled_cuboid: 'liquid', tube: 'glass', cylinder: 'cork' },
  colors: { glass: '#d3edf5', cork: '#8a5a2b' },
  liquid: { grow: '#e8453c', shrink: '#3fa7ff' }, // màu nước thuốc, cũng là màu thanh đếm ngược trên HUD
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
export const HOTBAR_SLOTS = 3; // số ô vũ khí trong túi, khớp INVENTORY_SLOTS ở server/config.js
export const FIST_SLOT = HOTBAR_SLOTS; // ô tay không cố định nằm sau các ô vũ khí (phím 4), khớp FIST_SLOT ở server
export const PICKUP_RADIUS = 1.2; // khớp PICKUP_RADIUS ở server/config.js (chỉ dùng để nhắc "túi đầy")
export const RADIO_STREAK_KILLS = 3; // hạ gục liên tiếp (không chết) để gọi máy bay thả radio gọi bom, khớp server/config.js

// Ảnh mặt người chơi chọn: cắt giữa về đúng cỡ này rồi gửi lên server dạng điểm ảnh RGBA thô (base64). Khớp với FACE_IMAGE của server.
export const FACE_IMAGE = { width: 64, height: 48 };

export const MOUSE_SENSITIVITY = 0.0022;
export const SENSITIVITY_MIN = 0.0005; // radian/pixel, giới hạn thanh chỉnh độ nhạy chuột
export const SENSITIVITY_MAX = 0.006;
export const STATE_SEND_MS = 50;
export const PITCH_LIMIT = 1.4; // góc ngẩng/cúi tối đa (radian), khớp PITCH_LIMIT ở server/config.js

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
  flash: { holdMs: 1200, fadeMs: 5000 }, // màn hình trắng xoá: giữ kín rồi tan dần
  rumble: { power: 0.16, seconds: 3.5 }, // rung camera sau vụ nổ, giảm dần
  bomb: { length: 3.2, radius: 0.45 }, // quả bom rơi (mét)
  cloud: {
    life: 18, // giây từ lúc nổ tới khi tan hết
    fireballRadius: 38,
    fireballGrow: 1.0, // giây quả cầu lửa phình ra
    fireballFade: 5, // giây quả cầu lửa tắt hẳn
    rise: 10, // giây khối mây bốc lên tới đỉnh
    stemHeight: 88,
    stemBottom: 10, // bán kính chân / đỉnh cột khói
    stemTop: 15,
    capRadius: 44, // bán kính tán nấm khi nở hết
    capGrow: 7, // giây tán nấm nở ra
    puffs: 30, // số cụm mây tạo thành tán nấm
    fadeFrom: 12, // giây bắt đầu mờ dần
    shockRadius: 240, // sóng xung kích lan trên mặt đất
    shockTime: 3,
    domeRadius: 170, // vòm sóng xung kích
    domeTime: 2.2,
  },
};

// Máy bay và hòm tiếp tế (thời điểm, vị trí, tốc độ do server gửi; ở đây chỉ là phần hình).
export const AIRDROP = {
  planeVisible: 220, // máy bay đã bay qua điểm thả quá ngần này (mét) thì xoá
  crateHover: 1.6, // vũ khí trong hòm lơ lửng cao ngần này trên mặt đất sau khi hòm chạm đất
  dropHover: 0.6, // vũ khí người chơi vứt ra (không có hòm) lơ lửng thấp hơn
  dropBeam: { height: 4, diameter: 0.7 }, // cột sáng vàng của vũ khí vứt ra (hòm tiếp tế không có cột sáng, đã có khói đỏ)
  sway: 0.18, // hòm đung đưa dưới dù (radian)
  smokeLateMs: 1000, // vào trận sau lúc thả hòm quá ngần này thì cột khói dựng sẵn cả cột
  // Cột khói ở chỗ hòm rơi (entities/smoke.js): bốc từ lúc hòm rời máy bay tới khi có người nhặt, cao chừng speed × life × 0.65 mét.
  // Khói đỏ là mặc định (hòm tiếp tế định kỳ); `smokeColors` là các màu khác theo `smokeKind` server gửi (vd: hòm radio gọi bom = vàng).
  smokeColors: { yellow: [0.98, 0.85, 0.1] },
  smoke: {
    color: [0.92, 0.12, 0.1],
    rate: 24, // cụm khói mỗi giây. Giảm từ 40 cho đỡ nặng: mỗi cụm là một mảnh mờ rất to, nhiều cụm chồng nhau thì GPU phải vẽ đè (overdraw) rất nhiều lần
    capacity: 320, // ≥ rate × life
    speed: 8, // tốc độ bốc lên lúc đầu (m/giây), chậm dần còn 35%
    life: 13, // giây mỗi cụm khói tồn tại
    startSize: 1.6, // cụm khói nở từ cỡ này (mét)...
    endSize: 9, // ...tới cỡ này khi lên tới đỉnh (diện tích mỗi cụm tỉ lệ bình phương nên giảm từ 12 xuống 9 là bớt gần nửa)
    wind: [0.35, 0, 0.15], // gió đẩy khói lệch sang một bên (m/giây²)
    prewarmCycles: 90,
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
    mouth: 'mouth',
  },
  // Khối không có tên riêng (vd: 23 khối `cube` của tóc) được nhận theo tên nhóm cha.
  groupKinds: { hair: 'hair' },
  fixedColors: { shoe: '#1b1b22', eye: '#ffffff', pupil: '#14141a', mouth: '#8c2626' },
  // Ảnh mặt dán lên khối `mesh` (đầu hình elip), thành khung `width` × `height` (đơn vị model) quanh tâm (0, centerY) của khối, nhìn từ phía trước.
  // `lift` phóng lớp ảnh to hơn đầu một chút để không chìm vào da; `replaces` là các khối mặt mặc định bị ảnh thay thế (ẩn đi).
  face: {
    mesh: 'head',
    width: 0.3,
    height: 0.225,
    centerY: 0,
    lift: 1.01,
    replaces: ['left_eye', 'right_eye', 'left_pupil', 'right_pupil', 'mouth'],
  },
};

// Tay của mình ở góc nhìn thứ nhất: dùng chính nhân vật model (cùng hoạt ảnh đấm, thế thủ, cùng cách cầm vũ khí) nhưng chỉ hiện
// cẳng tay + bàn tay, gắn vào camera và vẽ đè lên mọi thứ (không xuyên tường). Model vẽ cho người nhìn từ ngoài: ở thế thủ hai bàn tay
// cách mắt ±0.7m và thấp 0.85m (ngoài tầm nhìn) nên phải co nhỏ rồi đẩy lên trước mặt. Đặt `enabled: false` để quay về hai nắm đấm hình cầu.
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

// Đấm trời giáng của người hoá to (player/bigPunch.js, fx/shockwave.js, ui/bigPunchHud.js). Thời gian tích lực, hồi chiêu, tầm và sức đánh văng
// do server quyết định (BIG_PUNCH ở server/config.js), client chỉ nhận thời gian tích lực và hồi chiêu qua `welcome.potions`.
export const BIG_PUNCH = {
  key: 'KeyQ', // giữ để tích lực, thả để đấm
  keyLabel: 'Q',
  lockoutSeconds: 1, // sau khi tung đòn, ngần này giây không đấm thường chen vào cho khỏi cắt hoạt ảnh
  shake: 0.5, // rung camera khi sóng xung kích nổ ngay cạnh, nhỏ dần theo khoảng cách
  shakeRange: 2, // còn rung trong khoảng ngần này lần bán kính sóng
  shockwave: { life: 0.6, color: [1, 0.85, 0.5], sparks: 40 },
};

// Bị đánh văng (player/knockback.js): đà tan dần theo hàm mũ với tốc độ này (1/giây); trên không tan chậm nên bay xa.
export const KNOCKBACK = { groundFriction: 2.2, airFriction: 0.5, stopSpeed: 0.3 };

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
    capacity: 4000,
    rate: 2600, // giọt mỗi giây khi mưa to nhất
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
  boltJitter: 2.2, // mỗi khúc lệch ngang tối đa ngần này (mét)
  boltRadius: 0.12,
  skyFlash: 1.6, // ánh sáng tăng thêm ngần này lúc sét đánh rồi tắt dần
  skyFlashLife: 0.35,
  speedOfSound: 343, // tiếng sấm tới trễ theo khoảng cách (m/giây)
  shakeRange: 12, // đứng gần hơn ngần này (mét) thì rung camera
  shake: 0.25,
};
