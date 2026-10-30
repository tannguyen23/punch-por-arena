// Trạng thái dùng chung giữa các module. Gói vào object để module khác ghi được (import không gán lại được).
export const state = {
  joined: false,
  room: null, // { code, max, minPlayers, readyRatio, hostId, created } khi đã vào phòng (hostId = chủ phòng, được kick người khác)
  kicked: false, // vừa bị chủ phòng kick: đang về menu, đừng báo "mất kết nối"
  roster: [], // người trong snapshot gần nhất: { id, kills, score, dead, ... } (danh sách người chơi bấm Tab)
  ready: false, // mình đã bấm F
  readyIds: new Set(), // id những người đã sẵn sàng (từ snapshot)
  myId: null,
  alive: true,
  hp: 100,
  maxHp: 100,
  arena: 20,
  colliders: [], // vật phẩm chặn đường: { x, z, r }
  walls: [], // tường chặn đường: { x, z, w, d }
  ring: null, // võ đài của map: { x, z, half, leash, gate } (null nếu map không có), xem fx/ringGates.js
  tables: [],
  tableRules: null,
  tableGames: [],
  tableModels: new Map(),
  tableGame: null,
  tablePending: false,
  tableError: '',
  tableNuke: false,

  me: { x: 0, y: 0, z: 0 }, // y là độ cao của chân (0 khi đứng trên sân)
  vy: 0,
  yaw: 0,
  pitch: 0,
  crouching: false,
  size: 1, // kích thước của mình đã làm mượt theo thuốc (1 = bình thường), dùng cho độ cao mắt, tay, chân; xem player/localPlayer.js
  potionFov: 0, // góc nhìn giãn / thu thêm lúc uống thuốc, trả dần về 0 (fx/potionFx.js)
  crouchAmount: 0, // 0 đứng → 1 ngồi hẳn, đổi mượt theo thời gian
  sprinting: false,
  stamina: 1,
  sprintExhausted: false,
  sprintRecovery: 0,
  inWater: false, // chân đang ngập dưới mặt nước
  slide: { x: 0, z: 0, active: false }, // đà trượt trên băng (m/giây theo x, z); active = đang trượt (xem player/iceSlide.js)
  match: {
    phase: 'lobby', // 'lobby' (phòng chờ) | 'countdown' (3-2-1) | 'playing' | 'ended' (xem bảng xếp hạng)
    endsAt: 0, // mốc performance.now() khi hết trận (hoặc hết giờ nghỉ)
    wave: null, // hòm tiếp tế sắp chạm đất: { at: mốc performance.now() }
    ranking: [], // bảng xếp hạng khi hết trận: [{ id, name, kills, score }]
  },
  potion: null, // thuốc mình đang uống: { id, endsAt } (mốc performance.now()), null = không; chỉ số từng loại ở potionTypes
  potionTypes: {}, // id → { name, scale, hpMult, speedMult, collision, durationMs } do server gửi (server/game/potions.js)
  dog: false, // mình đang hoá chó (từ snapshot): chạy nhanh, không đánh / cầm vũ khí được
  event: null, // sự kiện đang chạy: { kind, targetId, targetName, bounty, duel?, introEndsAt, endsAt } (mốc performance.now()), xem net/eventHandlers.js; `duel` của sự kiện solo xem core/duel.js
  weapon: 'fist', // vũ khí mình đang cầm (id theo server)
  ammo: null, // số đạn còn lại (dao: số lần chém), null = dùng mãi
  lastFireAt: 0, // mốc performance.now() lần bắn gần nhất (xem AMMO_SYNC_GRACE_MS)
  inventory: [], // túi đồ do server gửi: { weapon, ammo } hoặc null (trống) từng ô vũ khí
  activeSlot: null, // ô đang cầm (ô tay không là FIST_SLOT trong config.js); null khi chưa có snapshot
  slotChangedAt: 0, // mốc performance.now() lần mình bấm đổi ô (xem SLOT_SYNC_GRACE_MS)
  weaponTypes: {}, // id → { kind, name, damage, range, cooldown, splash } do server gửi
  streak: 0, // số lần mình hạ gục liên tiếp không chết (từ snapshot); đủ RADIO_STREAK_KILLS thì bấm R gọi máy bay thả radio

  knock: { x: 0, z: 0 }, // vận tốc bị đánh văng (m/giây), tan dần, xem player/knockback.js
  bigPunch: { charging: false, charge: 0, startedAt: 0, readyAt: 0, wasDown: false }, // đấm trời giáng của người hoá to: charge 0–1, readyAt = mốc performance.now() dùng lại được (player/bigPunch.js)
  stinkStartedAt: 0, // dậm phải shit của chó: mốc performance.now() bắt đầu / hết bị chậm + che tầm nhìn (player/stink.js, ui/stinkOverlay.js)
  stinkUntil: 0,
  poopCharges: 0, // (khi mình là chó) số cục shit còn thả được, và mốc performance.now() hồi thêm một cục (0 = đã đầy); từ snapshot
  poopNextAt: 0,
  poopWasDown: false,
  attacking: false, // đang giữ chuột đánh
  cooldown: 0,
  sprintFov: 0,
  fovKick: 0,
  recoil: 0, // độ giật của súng, giảm dần về 0 (súng lùi lại và hếch lên)
  muzzle: null, // { x, y, z } đầu nòng súng của mình trong thế giới (player/gunView.js), null khi không cầm súng
  shake: 0,
};

export const remotes = new Map(); // id → người chơi khác đang hiển thị trong sân
export const infos = new Map(); // id → { id, name, look } của mọi người chơi trong sân
export const poops = new Map(); // id → cục shit con chó thả đang nằm trên sân (entities/poop.js)
export const pickups = new Map(); // id → hòm tiếp tế (đang rơi hoặc đã nằm trên sân)
