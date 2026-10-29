const { LOOK_DEFAULT, PATTERN_COUNT, FACE_IMAGE } = require('../config');

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

module.exports = { sanitizeLook, sanitizeName };
