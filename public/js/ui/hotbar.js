import { state } from '../state.js';
import { HOTBAR_SLOTS } from '../config.js';
import { weaponIcon } from './weaponIcon.js';

const bar = document.getElementById('hotbar');

// Dựng sẵn các ô. Số trên mỗi ô là phím sẽ dùng để chọn ô đó.
const slots = Array.from({ length: HOTBAR_SLOTS }, (_, index) => {
  const el = document.createElement('div');
  el.className = 'slot';
  const key = document.createElement('span');
  key.className = 'slot-key';
  key.textContent = `${index + 1}`;
  const icon = document.createElement('span');
  icon.className = 'slot-icon';
  const ammo = document.createElement('span');
  ammo.className = 'slot-ammo';
  el.append(key, icon, ammo);
  bar.append(el);
  return { el, icon, ammo };
});

let drawn = null;

// Gọi mỗi lần nhận snapshot; chỉ cập nhật DOM khi nội dung các ô hoặc ô đang chọn đổi.
// state.inventory[i] là id vũ khí ở ô i (null = trống), state.activeSlot là ô đang cầm, state.ammo là đạn của vũ khí đang cầm.
export function updateHotbar() {
  const signature = `${state.activeSlot}|${state.ammo}|${slots.map((_, i) => state.inventory[i] ?? '').join(',')}`;
  if (signature === drawn) return;
  drawn = signature;

  slots.forEach(({ el, icon, ammo }, index) => {
    const weaponId = state.inventory[index] ?? null;
    const info = weaponId && state.weaponTypes[weaponId];
    icon.replaceChildren(...(weaponId ? [weaponIcon(weaponId)] : []));
    el.title = info ? `${info.name} · ${info.damage} sát thương` : '';
    el.classList.toggle('empty', !weaponId);
    el.classList.toggle('active', index === state.activeSlot);
    ammo.textContent = weaponId && index === state.activeSlot && state.ammo !== null ? `${state.ammo}` : '';
  });
}
