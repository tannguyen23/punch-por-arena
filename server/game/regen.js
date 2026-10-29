const { REGEN_DELAY_MS, REGEN_PER_SEC, MATCH_TICK_MS } = require('../config');
const { isDuelFighter } = require('./restrictions');

// Hồi máu: không bị trúng đòn (đấm, đạn, sức nổ) trong REGEN_DELAY_MS thì máu tự hồi REGEN_PER_SEC mỗi giây tới đầy (`maxHp` của từng người,
// đổi theo thuốc, xem potions.js). Gọi mỗi nhịp của vòng lặp trận. Máu là số nguyên nên phần lẻ dồn lại (`regenCarry`) cho nhịp sau.
function regenerate(room, now) {
  for (const p of room.players.values()) {
    if (p.dead || p.hp >= p.maxHp || now - p.lastHurtAt < REGEN_DELAY_MS || isDuelFighter(room, p)) { // võ sĩ solo không tự hồi máu giữa hiệp
      p.regenCarry = 0;
      continue;
    }
    p.regenCarry += (REGEN_PER_SEC * MATCH_TICK_MS) / 1000;
    const gain = Math.floor(p.regenCarry);
    p.regenCarry -= gain;
    p.hp = Math.min(p.maxHp, p.hp + gain);
  }
}

module.exports = { regenerate };
