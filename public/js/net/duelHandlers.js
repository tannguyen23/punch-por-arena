import { state } from '../state.js';
import { toDuelState } from '../core/duel.js';
import { onDuelChange, showDuelBanner } from '../ui/duelHud.js';

export const duelHandlers = {
  // Sự kiện solo đổi giai đoạn / hiệp / số người cược (kèm trạng thái đầy đủ nên mất tin này cũng không sao).
  duel(m) {
    const ev = state.event;
    if (ev?.kind !== 'duel') return;
    const previous = ev.duel;
    ev.duel = toDuelState(m.duel, previous);
    onDuelChange(previous, ev.duel);
  },

  // Kết quả cược của riêng mình khi trận solo xong.
  betresult(m) {
    showDuelBanner(m.won ? `Cược đúng! +${m.delta} điểm` : `Cược sai! ${m.delta} điểm`, 4500);
  },
};
