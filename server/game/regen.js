const { MAX_HP, REGEN_DELAY_MS, REGEN_PER_SEC, MATCH_TICK_MS } = require('../config');

// Hồi máu: không bị trúng đòn (đấm, đạn, sức nổ) trong REGEN_DELAY_MS thì máu tự hồi REGEN_PER_SEC mỗi giây tới đầy.
// Gọi mỗi nhịp của vòng lặp trận. Máu là số nguyên nên phần lẻ dồn lại (`regenCarry`) cho nhịp sau.
function regenerate(room, now) {
  for (const p of room.players.values()) {
    if (p.dead || p.hp >= MAX_HP || now - p.lastHurtAt < REGEN_DELAY_MS) {
      p.regenCarry = 0;
      continue;
    }
    p.regenCarry += (REGEN_PER_SEC * MATCH_TICK_MS) / 1000;
    const gain = Math.floor(p.regenCarry);
    p.regenCarry -= gain;
    p.hp = Math.min(MAX_HP, p.hp + gain);
  }
}

module.exports = { regenerate };
