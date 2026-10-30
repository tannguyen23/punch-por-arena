import { state } from '../state.js';
import { RADIO_STREAK_KILLS } from '../config.js';

const el = document.getElementById('streak');

let drawn = null;

// Chuỗi hạ gục liên tiếp (chưa chết) dẫn tới radio gọi bom: "HẠ GỤC LIÊN TIẾP 2/3", đủ thì nhắc bấm T. Ẩn ngoài lúc đang đánh hoặc khi chưa hạ ai.
export function updateStreak() {
  const visible = state.alive && state.match.phase === 'playing' && state.streak > 0;
  const paused = state.event?.kind === 'tnt';
  const ready = state.streak >= RADIO_STREAK_KILLS && !paused;
  const signature = `${visible}|${state.streak}|${paused}`;
  if (signature === drawn) return;
  drawn = signature;
  el.hidden = !visible;
  el.classList.toggle('ready', ready);
  el.textContent = paused ? 'TNT: TẠM NGƯNG GỌI HÒM RADIO'
    : ready ? 'BẤM T: GỌI MÁY BAY THẢ RADIO' : `HẠ GỤC LIÊN TIẾP ${state.streak}/${RADIO_STREAK_KILLS}`;
}
