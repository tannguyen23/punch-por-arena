const { LOOK_DEFAULT, PATTERN_COUNT } = require('../config');

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// Dữ liệu ngoại hình do client gửi lên nên phải kiểm tra lại, chỉ nhận mã màu hex và số hoạ tiết hợp lệ.
function sanitizeLook(look) {
  const out = {};
  for (const key of Object.keys(LOOK_DEFAULT)) {
    out[key] = HEX_COLOR.test(look?.[key]) ? look[key].toLowerCase() : LOOK_DEFAULT[key];
  }
  const pattern = look?.pattern;
  out.pattern = Number.isInteger(pattern) && pattern >= 0 && pattern < PATTERN_COUNT ? pattern : 0;
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
