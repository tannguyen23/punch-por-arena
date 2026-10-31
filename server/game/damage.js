const { RESPAWN_MS, KILL_SCORE, BOT_LEVELS, DEFAULT_BOT_LEVEL } = require('../config');
const { broadcast } = require('../net/messaging');
const { respawn } = require('./spawn');
const { clearInventory } = require('./inventory');
const { isFrozen, shieldedFromDamage, isDuelFighter } = require('./restrictions');
const { onPlayerDown, absorbLethal } = require('./events');
const { spillInventory } = require('./loot');

// Trừ máu `target` (đấm, đạn, tên lửa đều qua đây). `attacker` có thể là null (người bắn đã thoát) hoặc chính `target`
// (tự dính tên lửa của mình): khi đó hạ gục không được tính điểm cho ai.
function applyDamage(room, attacker, target, amount, source = null) {
  // Bot ở mức thấp gây ít sát thương hơn (mọi nguồn: đấm, súng, nổ...); người chơi luôn đánh bình thường.
  const botLevel = attacker?.bot ? (BOT_LEVELS[attacker.botLevel] ?? BOT_LEVELS[DEFAULT_BOT_LEVEL]) : null;
  const dmg = Math.round(amount * (botLevel?.damageMult ?? 1));
  if (target.dead || dmg <= 0 || isFrozen(room) || shieldedFromDamage(room, attacker, target, source)) return;
  target.hp = Math.max(0, target.hp - dmg);
  target.lastHurtAt = Date.now(); // trúng đòn thì phải đợi lại từ đầu mới hồi máu
  // `ko`: đòn này đưa máu về 0 (client làm khoảnh khắc hạ gục: rung mạnh, quay chậm). Trận solo có thể nuốt cú hạ gục nhưng vẫn là cú quyết định hiệp.
  broadcast(room, { t: 'hit', id: target.id, by: attacker?.id ?? null, dmg, ...(source ? { source } : {}), ...(target.hp <= 0 ? { ko: true } : {}) });
  if (target.hp > 0 || absorbLethal(room, target, attacker)) return; // trận solo: gục chỉ là thua hiệp, không mất gì
  target.dead = true;
  target.stunnedUntil = 0;
  target.streak = 0; // chết thì mất chuỗi hạ gục
  // Cả túi văng ra quanh xác cho người khác nhặt (chết trong hư không thì mất luôn). Chỉ khi đang đánh: ngã khỏi đảo ở phòng chờ
  // mà cũng văng thì món khởi đầu (START_WEAPONS) bị nhân bản nằm đầy sân. Đọc thẳng room.phase vì không require được match.js (vòng).
  if (room.phase === 'playing') spillInventory(room, target);
  clearInventory(target); // chết thì mất hết vũ khí
  if (attacker && attacker !== target) {
    attacker.kills++;
    attacker.streak++;
    attacker.score += KILL_SCORE;
  }
  onPlayerDown(room, target, attacker);
  setTimeout(() => room.players.has(target.id) && !isDuelFighter(room, target) && respawn(room, target), RESPAWN_MS);
}

module.exports = { applyDamage };
