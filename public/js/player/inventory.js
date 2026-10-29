import { state } from '../state.js';
import { send } from '../net/socket.js';
import { FIST_SLOT } from '../config.js';
import { isFrozen } from '../core/freeze.js';

// Phím 1–4: đổi ô. Cầm vũ khí mới ngay trên máy mình (hoạt ảnh đưa lên chạy luôn), server xác nhận qua snapshot.
// Ô vũ khí trống thì bỏ qua, giống server.
export function selectSlot(index) {
  if (!state.alive || state.dog || isFrozen() || index === state.activeSlot) return;
  const slot = state.inventory[index] ?? null;
  if (index !== FIST_SLOT && !slot) return;
  state.activeSlot = index;
  state.weapon = slot ? slot.weapon : 'fist';
  state.ammo = slot ? slot.ammo : null;
  state.slotChangedAt = performance.now();
  send({ t: 'slot', slot: index });
}

// Phím G: vứt vũ khí đang cầm. Đợi server (vũ khí còn đạn phải hiện dưới đất cho mọi người) nên không đổi gì ở đây.
export function dropWeapon() {
  if (state.alive && !state.dog && !isFrozen() && state.match.phase === 'playing' && state.inventory[state.activeSlot]) send({ t: 'drop' });
}
