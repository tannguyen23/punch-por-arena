import { state } from '../state.js';
import { POOP } from '../config.js';

const el = document.getElementById('poop');
const label = el.querySelector('.poop-label');
const pipsEl = el.querySelector('.poop-pips');
const fill = el.querySelector('.poop-fill');

let pips = [];

// Số cục shit con chó còn thả được (các chấm nâu đầy / rỗng) và thanh hồi thêm một cục. Chỉ hiện với chính con chó. Gọi mỗi khung hình.
// `state.event.poop` ({ max, rechargeMs }) do server gửi cùng tin 'event'.
export function updatePoopHud() {
  const config = state.event?.poop;
  el.hidden = !(state.dog && state.alive && config);
  if (el.hidden) return;
  if (pips.length !== config.max) {
    pips = Array.from({ length: config.max }, () => Object.assign(document.createElement('span'), { className: 'poop-pip' }));
    pipsEl.replaceChildren(...pips);
    label.textContent = `[${POOP.keyLabel}] THẢ SHIT`;
  }
  pips.forEach((pip, i) => pip.classList.toggle('full', i < state.poopCharges));
  const left = state.poopNextAt ? Math.max(0, state.poopNextAt - performance.now()) : 0;
  fill.style.transform = `scaleX(${state.poopCharges >= config.max ? 1 : 1 - left / config.rechargeMs})`;
}
