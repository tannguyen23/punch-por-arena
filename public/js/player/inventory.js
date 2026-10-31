import { state } from '../state.js';
import { send } from '../net/socket.js';
import { FIST_SLOT } from '../config.js';
import { actionBlocked } from '../core/freeze.js';

// Phím 1–4: đổi ô; ô trống (hoặc X) là về tay không. Bấm lại phím của ô đang cầm thì không làm gì.
// Cầm vũ khí mới ngay trên máy mình (hoạt ảnh đưa lên chạy luôn), server xác nhận qua snapshot.
export function selectSlot(index) {
  if (state.event?.kind === 'tnt' && state.event.targetId === state.myId) return;
  if (!state.alive || actionBlocked()) return;
  const slot = state.inventory[index] ?? null;
  const target = slot || index === FIST_SLOT ? index : FIST_SLOT; // ô trống = tay không
  if (target === state.activeSlot) return;
  state.activeSlot = target;
  state.weapon = slot ? slot.weapon : 'fist';
  state.ammo = slot ? slot.ammo : null;
  state.magazine = slot?.magazine ?? null;
  state.reloading = false;
  state.reloadEndsAt = 0;
  state.slotChangedAt = performance.now();
  send({ t: 'slot', slot: target });
}

// Vũ khí vừa hết đạn / gãy: ô trống ngay trên máy mình và về tay không (server làm y hệt trong useAmmo).
export function breakHeldWeapon() {
  if (state.activeSlot === FIST_SLOT) return;
  state.inventory[state.activeSlot] = null;
  state.activeSlot = FIST_SLOT;
  state.weapon = 'fist';
  state.ammo = null;
  state.magazine = null;
  state.reloading = false;
  state.reloadEndsAt = 0;
  state.slotChangedAt = performance.now();
}

// Phím G: vứt vũ khí đang cầm. Đợi server (vũ khí còn đạn phải hiện dưới đất cho mọi người) nên không đổi gì ở đây.
export function dropWeapon() {
  if (state.alive && !actionBlocked() && state.match.phase === 'playing' && state.inventory[state.activeSlot]) send({ t: 'drop' });
}
