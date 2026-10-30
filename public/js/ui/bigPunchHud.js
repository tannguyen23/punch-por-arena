import { state } from '../state.js';
import { BIG_PUNCH } from '../config.js';

const el = document.getElementById('bigpunch');
const label = el.querySelector('.bigpunch-label');
const fill = el.querySelector('.bigpunch-fill');

let drawnMode = null;
let drawnSecond = null;

// Thanh của cú "đấm trời giáng" (player/bigPunch.js), chỉ hiện khi đang uống thuốc có khả năng này: sẵn sàng (nhắc phím giữ),
// đang tích lực (thanh đầy dần, thả khi đầy) hoặc đang hồi chiêu (thanh đầy dần tới lúc dùng lại được). Gọi mỗi khung hình.
export function updateBigPunchHud() {
  const config = state.potionTypes[state.potion?.id]?.bigPunch;
  const big = state.bigPunch;
  el.hidden = !config || !state.alive || (state.event?.kind === 'tnt' && state.event.targetId === state.myId);
  if (el.hidden) {
    drawnMode = null;
    return;
  }
  const left = Math.max(0, big.readyAt - performance.now());
  const mode = big.charging ? (big.charge >= 1 ? 'full' : 'charging') : left > 0 ? 'cooldown' : 'ready';
  const second = Math.ceil(left / 1000);
  if (mode !== drawnMode || (mode === 'cooldown' && second !== drawnSecond)) {
    drawnMode = mode;
    drawnSecond = second;
    el.dataset.mode = mode;
    label.textContent = {
      ready: `GIỮ [${BIG_PUNCH.keyLabel}]: ĐẤM TRỜI GIÁNG`,
      charging: 'ĐANG TÍCH LỰC...',
      full: `THẢ [${BIG_PUNCH.keyLabel}] ĐỂ ĐẤM!`,
      cooldown: `HỒI CHIÊU ${second}s`,
    }[mode];
  }
  const amount = mode === 'cooldown' ? 1 - left / config.cooldownMs : mode === 'ready' ? 1 : big.charge;
  fill.style.transform = `scaleX(${amount})`;
}
