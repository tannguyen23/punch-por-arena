const { DUEL } = require('../config');
const { send } = require('../net/messaging');

// Cược của sự kiện solo: `ev.bets` là Map người xem → võ sĩ mình chọn (0 hoặc 1, theo thứ tự `ev.fighters`).
// Mỗi người một cược `DUEL.stake` điểm, đổi ý được tới hết giai đoạn cược. Kết thúc: đúng +stake, sai −stake (không xuống dưới 0).

function countBets(ev) {
  const counts = [0, 0];
  for (const side of ev.bets.values()) counts[side]++;
  return counts;
}

// Thắng trận (`winnerIdx`) thì trả điểm cho từng người cược và báo riêng cho họ. Người đã thoát phòng thì bỏ qua.
function settleBets(room, ev, winnerIdx) {
  for (const [id, side] of ev.bets) {
    const p = room.players.get(id);
    if (!p) continue;
    const won = side === winnerIdx;
    const delta = won ? DUEL.stake : -Math.min(DUEL.stake, Math.max(0, p.score));
    p.score += delta;
    send(p.ws, { t: 'betresult', won, delta });
  }
}

module.exports = { countBets, settleBets };
