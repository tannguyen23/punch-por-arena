const { isPlaying } = require('./match');
const { takeActive } = require('./inventory');
const { cantAct } = require('./restrictions');
const { tossLoot } = require('./loot');

// Phím G: vứt vũ khí đang cầm, về tay không. Vũ khí văng ra trước mặt (loot.js) cho người khác nhặt; kể cả vũ khí đã hết đạn
// cũng nằm lại trên sân (cùng loại thì nhặt vào chỉ để gộp ô, không thì chiếm một ô rỗng), không biến mất.
function handleDrop(room, p) {
  if (!isPlaying(room) || p.dead || cantAct(room, p)) return;
  const slot = takeActive(p);
  if (slot) tossLoot(room, p, slot);
}

module.exports = { handleDrop };
