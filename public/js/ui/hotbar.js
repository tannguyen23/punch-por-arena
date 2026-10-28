import { state } from '../state.js';
import { HOTBAR_SLOTS } from '../config.js';
import { WEAPON_MODELS } from '../entities/weapons/index.js';

const bar = document.getElementById('hotbar');

const UNKNOWN_ICON = '❔';

// Dựng sẵn các ô. Số trên mỗi ô là phím sẽ dùng để chọn ô đó.
const slots = Array.from({ length: HOTBAR_SLOTS }, (_, index) => {
  const el = document.createElement('div');
  el.className = 'slot';
  const key = document.createElement('span');
  key.className = 'slot-key';
  key.textContent = `${index + 1}`;
  const icon = document.createElement('span');
  icon.className = 'slot-icon';
  el.append(key, icon);
  bar.append(el);
  return { el, icon };
});

let drawn = null;

// Gọi mỗi lần nhận snapshot; chỉ cập nhật DOM khi nội dung các ô hoặc ô đang chọn đổi.
// state.inventory[i] là id vũ khí ở ô i (null = trống), state.activeSlot là ô đang cầm.
export function updateHotbar() {
  const signature = `${state.activeSlot}|${slots.map((_, i) => state.inventory[i] ?? '').join(',')}`;
  if (signature === drawn) return;
  drawn = signature;

  slots.forEach(({ el, icon }, index) => {
    const weaponId = state.inventory[index] ?? null;
    const info = weaponId && state.weaponTypes[weaponId];
    icon.textContent = weaponId ? (WEAPON_MODELS[weaponId]?.icon ?? UNKNOWN_ICON) : '';
    el.title = info ? `${info.name} · ${info.damage} sát thương` : '';
    el.classList.toggle('empty', !weaponId);
    el.classList.toggle('active', index === state.activeSlot);
  });
}
