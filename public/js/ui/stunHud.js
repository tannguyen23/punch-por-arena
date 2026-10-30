import { state } from '../state.js';
import { isStunned } from '../core/freeze.js';

const overlay = document.getElementById('stun-overlay');
const label = overlay.querySelector('.stun-label');

export function updateStunHud() {
  overlay.hidden = !isStunned();
  if (overlay.hidden) return;
  label.textContent = `⚡ BỊ ĐIỆN GIẬT · ${Math.max(1, Math.ceil((state.stunnedUntil - performance.now()) / 1000))}s`;
}
