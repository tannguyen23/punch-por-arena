import { state } from '../state.js';
import { HOTBAR_SLOTS, FIST_SLOT } from '../config.js';
import { weaponIcon } from './weaponIcon.js';

const bar = document.getElementById('hotbar');
const FIST_ICON = '👊';

// Dựng sẵn các ô vũ khí cộng ô tay không ở cuối. Số trên mỗi ô là phím chọn ô đó.
const slots = Array.from({ length: HOTBAR_SLOTS + 1 }, (_, index) => {
  const el = document.createElement('div');
  el.className = index === FIST_SLOT ? 'slot fist' : 'slot';
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
slots[FIST_SLOT].icon.textContent = FIST_ICON;
slots[FIST_SLOT].el.title = 'Tay không';

// Ô đang cầm lấy đạn từ state.ammo (trừ ngay khi bắn), các ô khác lấy từ túi đồ server gửi.
const ammoOf = (index) => (index === state.activeSlot ? state.ammo : (state.inventory[index]?.ammo ?? null));

let drawn = null;

// Gọi mỗi lần nhận snapshot; chỉ cập nhật DOM khi nội dung các ô hoặc ô đang chọn đổi.
// state.inventory[i] là { weapon, ammo } ở ô i (null = trống), state.activeSlot là ô đang cầm.
export function updateHotbar() {
  const weapons = Array.from({ length: HOTBAR_SLOTS }, (_, i) => state.inventory[i]?.weapon ?? null);
  const signature = `${state.activeSlot}|${weapons.map((w, i) => `${w}:${ammoOf(i)}`).join(',')}`;
  if (signature === drawn) return;
  drawn = signature;

  slots.forEach(({ el }, index) => el.classList.toggle('active', index === state.activeSlot));
  weapons.forEach((weaponId, index) => {
    const { el, icon, ammo } = slots[index];
    const info = weaponId && state.weaponTypes[weaponId];
    const count = weaponId ? ammoOf(index) : null;
    icon.replaceChildren(...(weaponId ? [weaponIcon(weaponId)] : []));
    el.title = info ? `${info.name} · ${info.damage} sát thương` : '';
    el.classList.toggle('empty', !weaponId);
    el.classList.toggle('dry', count === 0); // hết đạn / gãy, chờ người chơi bấm G vứt
    ammo.textContent = count === null ? '' : `${count}`;
  });
}
