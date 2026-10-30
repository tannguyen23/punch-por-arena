import { send } from '../net/socket.js';
import { duelOf, isFighter } from '../core/duel.js';

// Phím 1 / 2 cược cho đội xanh / cam; đủ người chọn thì server bắt đầu đánh ngay.
// Trả về true nếu phím đã dùng vào việc cược, để input.js không coi nó là phím đổi ô vũ khí.
export function betOn(side) {
  const duel = duelOf();
  if ((side !== 0 && side !== 1) || !duel || duel.stage !== 'bet' || isFighter(duel)) return false;
  duel.myBet = side;
  send({ t: 'bet', side });
  return true;
}
