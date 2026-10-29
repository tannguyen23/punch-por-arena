const { RESPAWN_MS } = require('../config');
const { broadcast } = require('../net/messaging');
const { respawn } = require('./spawn');
const { clearInventory } = require('./inventory');

// Trừ máu `target` (đấm, đạn, tên lửa đều qua đây). `attacker` có thể là null (người bắn đã thoát) hoặc chính `target`
// (tự dính tên lửa của mình): khi đó hạ gục không được tính điểm cho ai.
function applyDamage(room, attacker, target, amount, source = null) {
  const dmg = Math.round(amount);
  if (target.dead || dmg <= 0) return;
  target.hp = Math.max(0, target.hp - dmg);
  target.lastHurtAt = Date.now(); // trúng đòn thì phải đợi lại từ đầu mới hồi máu
  broadcast(room, { t: 'hit', id: target.id, by: attacker?.id ?? null, dmg, ...(source ? { source } : {}) });
  if (target.hp > 0) return;
  target.dead = true;
  target.streak = 0; // chết thì mất chuỗi hạ gục
  clearInventory(target); // chết thì mất hết vũ khí
  if (attacker && attacker !== target) {
    attacker.kills++;
    attacker.streak++;
  }
  setTimeout(() => room.players.has(target.id) && respawn(room, target), RESPAWN_MS);
}

module.exports = { applyDamage };
