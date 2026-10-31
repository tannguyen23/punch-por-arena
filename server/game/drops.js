const { isPlaying } = require('./match');
const { takeActive } = require('./inventory');
const { cantAct } = require('./restrictions');
const { tossLoot } = require('./loot');

// Phím G: vứt vũ khí đang cầm, về tay không. Vũ khí văng ra trước mặt (loot.js) cho người khác nhặt;
// vũ khí hết đạn / gãy tự biến mất trong inventory.js nên không còn phải vứt chúng.
function handleDrop(room, p) {
  if (!isPlaying(room) || p.dead || cantAct(room, p)) return;
  const slot = takeActive(p);
  if (slot) tossLoot(room, p, slot);
}

module.exports = { handleDrop };
