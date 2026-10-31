import { state } from '../state.js';
import { HOTBAR_SLOTS } from '../config.js';
import { weaponIcon } from './weaponIcon.js';
import { rarityBadge, applyWeaponRarity } from './weaponRarity.js';

const bar = document.getElementById('hotbar');

// Dựng sẵn các ô vũ khí. Số trên mỗi ô là phím chọn ô đó. Tay không không phải một ô: không cầm gì thì không ô nào sáng.
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
  const rarity = rarityBadge(null);
  el.append(key, icon, ammo, rarity);
  bar.append(el);
  return { el, icon, ammo, rarity };
});

// Ô đang cầm lấy đạn từ state.ammo (trừ ngay khi bắn), các ô khác lấy từ túi đồ server gửi.
const ammoOf = (index) => (index === state.activeSlot ? state.ammo : (state.inventory[index]?.ammo ?? null));

let drawn = null;

// Gọi mỗi lần nhận snapshot; chỉ cập nhật DOM khi nội dung các ô hoặc ô đang chọn đổi.
// state.inventory[i] là { weapon, ammo } ở ô i (null = trống), state.activeSlot là ô đang cầm.
export function updateHotbar() {
  const weapons = Array.from({ length: HOTBAR_SLOTS }, (_, i) => state.inventory[i]?.weapon ?? null);
  const loadedOf = (i) => i === state.activeSlot ? state.magazine : state.inventory[i]?.magazine;
  const signature = `${state.activeSlot}|${weapons.map((w, i) => `${w}:${ammoOf(i)}:${loadedOf(i)}`).join(',')}`;
  if (signature === drawn) return;
  drawn = signature;

  slots.forEach(({ el }, index) => el.classList.toggle('active', index === state.activeSlot));
  weapons.forEach((weaponId, index) => {
    const { el, icon, ammo, rarity } = slots[index];
    const info = weaponId && state.weaponTypes[weaponId];
    const count = weaponId ? ammoOf(index) : null;
    icon.replaceChildren(...(weaponId ? [weaponIcon(weaponId)] : []));
    el.title = info ? `${info.name}${info.rarity ? ` · ${info.rarity.name}` : ''} · ${info.damage} sát thương` : '';
    applyWeaponRarity(el, weaponId);
    rarity.textContent = info?.rarity?.name ?? '';
    rarity.hidden = !info?.rarity;
    el.classList.toggle('empty', !weaponId);
    el.classList.toggle('dry', count === 0 || (info?.magazineSize && loadedOf(index) === 0));
    ammo.textContent = count === null ? '' : info?.magazineSize ? `${loadedOf(index)}/${Math.max(0, count - loadedOf(index))}` : `${count}`;
  });
}
