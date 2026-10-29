const { RESPAWN_MS, KILL_SCORE } = require('../config');
const { broadcast } = require('../net/messaging');
const { respawn } = require('./spawn');
const { clearInventory } = require('./inventory');
const { isFrozen, shieldedFromDamage } = require('./restrictions');
const { onPlayerDown, absorbLethal } = require('./events');

// Trừ máu `target` (đấm, đạn, tên lửa đều qua đây). `attacker` có thể là null (người bắn đã thoát) hoặc chính `target`
// (tự dính tên lửa của mình): khi đó hạ gục không được tính điểm cho ai.
function applyDamage(room, attacker, target, amount, source = null) {
  const dmg = Math.round(amount);
  if (target.dead || dmg <= 0 || isFrozen(room) || shieldedFromDamage(room, attacker, target)) return; // đứng hình (mở đầu sự kiện) / võ sĩ solo ngoài đòn của đối thủ: không bị thương
  target.hp = Math.max(0, target.hp - dmg);
  target.lastHurtAt = Date.now(); // trúng đòn thì phải đợi lại từ đầu mới hồi máu
  broadcast(room, { t: 'hit', id: target.id, by: attacker?.id ?? null, dmg, ...(source ? { source } : {}) });
  if (target.hp > 0 || absorbLethal(room, target, attacker)) return; // trận solo: gục chỉ là thua hiệp, không mất gì
  target.dead = true;
  target.streak = 0; // chết thì mất chuỗi hạ gục
  clearInventory(target); // chết thì mất hết vũ khí
  if (attacker && attacker !== target) {
    attacker.kills++;
    attacker.streak++;
    attacker.score += KILL_SCORE;
  }
  onPlayerDown(room, target, attacker);
  setTimeout(() => room.players.has(target.id) && respawn(room, target), RESPAWN_MS);
}

module.exports = { applyDamage };
