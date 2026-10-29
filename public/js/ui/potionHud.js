import { state } from '../state.js';
import { POTION } from '../config.js';
import { setPotionTint } from './potionFlash.js';

const el = document.getElementById('potion');
const nameEl = el.querySelector('.potion-name');
const fill = el.querySelector('.potion-fill');

let drawnId = null;
let drawnSecond = null;

// Thuốc mình đang uống: tên + thanh thời gian còn lại ở giữa phía trên màn hình. Ẩn khi không có thuốc hoặc đã bị hạ.
// Gọi mỗi snapshot; `endsAt` đã đổi sang đồng hồ máy mình nên thanh co đều giữa hai snapshot không cần nội suy.
export function updatePotion() {
  const { potion } = state;
  const type = potion && state.potionTypes[potion.id];
  const left = type && state.alive ? Math.max(0, potion.endsAt - performance.now()) : 0;
  el.hidden = left === 0;
  setPotionTint(left === 0 ? null : (POTION.liquid[potion.id] ?? '#fff'));
  if (left === 0) {
    drawnId = null;
    return;
  }
  if (potion.id !== drawnId) {
    drawnId = potion.id;
    el.style.setProperty('--potion-color', POTION.liquid[potion.id] ?? '#fff');
    nameEl.textContent = type.name;
  }
  const second = Math.ceil(left / 1000);
  if (second !== drawnSecond) {
    drawnSecond = second;
    nameEl.textContent = `${type.name} · ${second}s`;
  }
  fill.style.transform = `scaleX(${Math.min(1, left / type.durationMs)})`;
}
