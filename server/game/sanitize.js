const { LOOK_DEFAULT, PATTERN_COUNT, FACE_IMAGE, ROOM_MAX_PLAYERS, DEFAULT_BOT_LEVEL } = require('../config');
const { WEAPONS } = require('./weapons');
const { eventChoices } = require('./events');

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const FACE_BASE64_LENGTH = Math.ceil((FACE_IMAGE.width * FACE_IMAGE.height * 4) / 3) * 4;

// Ảnh mặt là điểm ảnh RGBA thô (không phải PNG/JPEG), nên chỉ cần đúng độ dài và bảng mã base64: không có định dạng ảnh nào để client khác phải giải mã.
function sanitizeFace(face) {
  return typeof face === 'string' && face.length === FACE_BASE64_LENGTH && BASE64.test(face) ? face : null;
}

// Dữ liệu ngoại hình do client gửi lên nên phải kiểm tra lại, chỉ nhận mã màu hex, số hoạ tiết và ảnh mặt hợp lệ.
function sanitizeLook(look) {
  const out = {};
  for (const key of Object.keys(LOOK_DEFAULT)) {
    out[key] = HEX_COLOR.test(look?.[key]) ? look[key].toLowerCase() : LOOK_DEFAULT[key];
  }
  const pattern = look?.pattern;
  out.pattern = Number.isInteger(pattern) && pattern >= 0 && pattern < PATTERN_COUNT ? pattern : 0;
  const face = sanitizeFace(look?.face);
  if (face) out.face = face;
  return out;
}

function sanitizeName(name, id) {
  const clean = String(name ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .trim()
    .slice(0, 16);
  return clean || `Người chơi ${id}`;
}

// Số bot màn tạo phòng gửi lên: số nguyên 0 … số chỗ còn lại sau khi người tạo vào, còn lại coi như 0.
function sanitizeBotCount(count) {
  return Number.isInteger(count) ? Math.max(0, Math.min(count, ROOM_MAX_PLAYERS - 1)) : 0;
}

// Mức bot màn tạo phòng gửi lên: 1 dễ, 2 trung bình, 3 khó; sai thì dùng mặc định.
function sanitizeBotLevel(level) {
  return Number.isInteger(level) && level >= 1 && level <= 3 ? level : DEFAULT_BOT_LEVEL;
}

// Tỷ lệ rơi vũ khí riêng của phòng (màn tạo phòng gửi): chỉ nhận vũ khí thật sự rơi được, trọng số nguyên 0–100.
// Toàn 0 hoặc không có mục hợp lệ thì trả null để dùng mặc định.
function sanitizeWeaponWeights(weights) {
  if (!weights || typeof weights !== 'object' || Array.isArray(weights)) return null;
  const out = {};
  for (const [id, value] of Object.entries(weights)) {
    if (!Object.hasOwn(WEAPONS, id) || WEAPONS[id].dropWeight <= 0) continue;
    if (!Number.isFinite(value)) continue;
    out[id] = Math.max(0, Math.min(100, Math.round(value)));
  }
  return Object.values(out).some((value) => value > 0) ? out : null;
}

// Loại sự kiện màn tạo phòng cho phép: không gửi (không phải mảng) = null = tất cả; mảng = chỉ các id hợp lệ
// (mảng rỗng = phòng không có sự kiện), bỏ id lạ và trùng.
function sanitizeEventKinds(kinds) {
  if (!Array.isArray(kinds)) return null;
  const valid = new Set(eventChoices().map((event) => event.id));
  return [...new Set(kinds)].filter((id) => typeof id === 'string' && valid.has(id));
}

module.exports = { sanitizeLook, sanitizeName, sanitizeBotCount, sanitizeBotLevel, sanitizeWeaponWeights, sanitizeEventKinds };
