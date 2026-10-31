import { state } from '../state.js';
import { DASH } from '../config.js';

const el = document.getElementById('dash');
const key = el.querySelector('.dash-key');
const fill = el.querySelector('.dash-fill');
key.textContent = DASH.keyLabel;

let drawnMode = null;
let drawnAmount = -1;

// Thanh hồi chiêu của dash (player/dash.js): xanh sáng = dùng được, xám đầy dần = đang hồi. Chỉ hiện khi đang chơi và còn sống. Gọi mỗi khung hình.
export function updateDashHud() {
  el.hidden = !state.alive || state.spectator || state.match.phase !== 'playing';
  if (el.hidden) return;
  const { readyAt, cooldownMs } = state.dash;
  const left = Math.max(0, readyAt - performance.now());
  const mode = left > 0 ? 'cooldown' : 'ready';
  if (mode !== drawnMode) {
    drawnMode = mode;
    el.dataset.mode = mode;
  }
  const amount = mode === 'ready' || cooldownMs <= 0 ? 1 : Math.round((1 - left / cooldownMs) * 50) / 50; // làm tròn: thanh chỉ ghi lại khi nhích ≥ 2%
  if (amount !== drawnAmount) {
    drawnAmount = amount;
    fill.style.transform = `scaleX(${amount})`;
  }
}
