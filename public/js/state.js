// Trạng thái dùng chung giữa các module. Gói vào object để module khác ghi được (import không gán lại được).
export const state = {
  joined: false,
  room: null, // { code, max, minPlayers, created } khi đã vào phòng
  ready: false, // mình đã bấm F
  readyIds: new Set(), // id những người đã sẵn sàng (từ snapshot)
  myId: null,
  alive: true,
  hp: 100,
  maxHp: 100,
  arena: 20,
  colliders: [], // vật phẩm chặn đường: { x, z, r }
  walls: [], // tường chặn đường: { x, z, w, d }

  me: { x: 0, y: 0, z: 0 }, // y là độ cao của chân (0 khi đứng trên sân)
  vy: 0,
  yaw: 0,
  pitch: 0,
  crouching: false,
  crouchAmount: 0, // 0 đứng → 1 ngồi hẳn, đổi mượt theo thời gian
  sprinting: false,
  inWater: false, // chân đang ngập dưới mặt nước
  match: {
    phase: 'lobby', // 'lobby' (phòng chờ) | 'countdown' (3-2-1) | 'playing' | 'ended' (xem bảng xếp hạng)
    endsAt: 0, // mốc performance.now() khi hết trận (hoặc hết giờ nghỉ)
    wave: null, // đợt vũ khí sắp rơi: { at: mốc performance.now(), count }
    ranking: [], // bảng xếp hạng khi hết trận: [{ id, name, kills }]
  },
  weapon: 'fist', // vũ khí mình đang cầm (id theo server)
  inventory: [], // id vũ khí ở từng ô của thanh vũ khí (null/thiếu = ô trống)
  activeSlot: 0, // ô đang cầm
  weaponTypes: {}, // id → { name, damage } do server gửi

  attacking: false, // đang giữ chuột đánh
  cooldown: 0,
  sprintFov: 0,
  fovKick: 0,
  shake: 0,
};

export const remotes = new Map(); // id → người chơi khác đang hiển thị trong sân
export const infos = new Map();
export const pickups = new Map(); // id → vũ khí đang nằm trên sân // id → { id, name, look } của mọi người chơi trong sân
