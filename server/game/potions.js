const { MAX_HP, PLAYER_RADIUS, POTION, BIG_PUNCH } = require('../config');

// Thuốc: nhặt là uống ngay, đổi cơ thể người uống trong POTION.durationMs rồi trở lại bình thường.
//   scale     - kích thước (1 = bình thường); đạn trúng, độ cao mắt và tầm đánh tính theo đây (raycast.js, combat.js)
//   hpMult    - nhân máu tối đa; máu hiện tại giữ nguyên tỉ lệ khi uống và khi hết thuốc
//   speedMult - nhân tốc độ chạy (client lo, server không kiểm tốc độ)
//   collision - nhân bán kính va chạm (client lo): nhỏ hơn nhiều so với kích thước thật để người to không kẹt giữa cây, tường
//   bigPunch  - có thể dùng "đấm trời giáng" (bigPunch.js) trong lúc đang uống thuốc này
//   dropWeight - độ hiếm khi một lọ mới xuất hiện trên sân
// Client nhận bảng này trong 'welcome' (potionInfo) để dựng hình, HUD và va chạm, không có bản sao riêng.
// Thêm thuốc mới: thêm một dòng vào đây, màu nước thuốc trong POTION ở public/js/config.js.
const POTIONS = {
  grow: { name: 'Thuốc hoá to', scale: 3, hpMult: 4, speedMult: 0.8, collision: 1.5, bigPunch: true, dropWeight: 50 },
  shrink: { name: 'Thuốc hoá nhỏ', scale: 0.5, hpMult: 0.5, speedMult: 1.4, collision: 0.7, dropWeight: 50 }, // 2 × 0.7 × PLAYER_RADIUS phải > HARD_OVERLAP
};

function randomPotion() {
  const entries = Object.entries(POTIONS);
  let roll = Math.random() * entries.reduce((sum, [, t]) => sum + t.dropWeight, 0);
  for (const [id, t] of entries) {
    roll -= t.dropWeight;
    if (roll < 0) return id;
  }
  return entries.at(-1)[0];
}

const potionInfo = () =>
  Object.fromEntries(
    Object.entries(POTIONS).map(([id, { name, scale, hpMult, speedMult, collision, bigPunch }]) => [
      id,
      {
        name, scale, hpMult, speedMult, collision, durationMs: POTION.durationMs,
        bigPunch: bigPunch ? { chargeMs: BIG_PUNCH.chargeMs, cooldownMs: BIG_PUNCH.cooldownMs } : null,
      },
    ]),
  );

const typeOf = (p) => (p.potion ? POTIONS[p.potion.id] : null);
const scaleOf = (p) => typeOf(p)?.scale ?? 1;
const radiusOf = (p) => PLAYER_RADIUS * (typeOf(p)?.collision ?? 1);

// Đổi máu tối đa mà giữ nguyên tỉ lệ máu (uống lúc sắp chết không thành hồi máu miễn phí). Người đã chết giữ nguyên 0 máu.
function setMaxHp(p, maxHp) {
  const ratio = p.maxHp > 0 ? p.hp / p.maxHp : 1;
  p.maxHp = maxHp;
  if (!p.dead) p.hp = Math.max(1, Math.round(ratio * maxHp));
}

// Uống thuốc `id`; đang có thuốc khác thì thay hẳn (tính lại từ máu gốc, thời gian bắt đầu lại).
function drinkPotion(p, id, now = Date.now()) {
  clearPotion(p);
  p.potion = { id, endsAt: now + POTION.durationMs };
  setMaxHp(p, Math.round(MAX_HP * POTIONS[id].hpMult));
}

// Hết thuốc / chết / hồi sinh / hoá chó: về thân hình bình thường. Khả năng đi kèm (đấm trời giáng) mất theo, cả lần tích lực dở và hồi chiêu.
function clearPotion(p) {
  p.bigChargeAt = 0;
  p.bigPunchReadyAt = 0;
  if (!p.potion) return;
  p.potion = null;
  setMaxHp(p, MAX_HP);
}

// Mỗi nhịp của vòng lặp trận: ai hết thời gian thuốc thì trở lại bình thường.
function tickPotions(room, now) {
  for (const p of room.players.values()) {
    if (p.potion && now >= p.potion.endsAt) clearPotion(p);
  }
}

module.exports = { POTIONS, randomPotion, potionInfo, scaleOf, radiusOf, drinkPotion, clearPotion, tickPotions };
