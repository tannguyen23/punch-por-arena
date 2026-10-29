const { RADIO_STREAK_KILLS, RADIO_DROP_DISTANCE } = require('../config');
const { isPlaying } = require('./match');
const { freePositionNear } = require('./spawn');
const { launchAirdrop } = require('./pickups');

// Tin nhắn 'radio': người chơi hạ gục liên tiếp đủ RADIO_STREAK_KILLS lần (không chết) gọi máy bay thả hòm chứa radio gọi bom hạt nhân
// xuống gần mình. Hòm có khói vàng (khói đỏ là của máy bay tiếp tế định kỳ) và ai nhặt được cũng dùng được. Gọi xong thì phải hạ gục lại từ đầu.
function handleRadioCall(room, p) {
  if (!isPlaying(room) || p.dead || p.streak < RADIO_STREAK_KILLS) return;
  p.streak = 0;
  launchAirdrop(room, { weapon: 'nuke', pos: freePositionNear(room, p, RADIO_DROP_DISTANCE), smokeKind: 'yellow', caller: p });
}

module.exports = { handleRadioCall };
