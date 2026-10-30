import { state } from '../state.js';

export function rarityBadge(weaponId) {
  const badge = document.createElement('span');
  badge.className = 'weapon-rarity';
  const rarity = state.weaponTypes[weaponId]?.rarity;
  badge.textContent = rarity?.name ?? '';
  badge.hidden = !rarity;
  return badge;
}

export function applyWeaponRarity(el, weaponId) {
  const rarity = state.weaponTypes[weaponId]?.rarity;
  if (rarity) {
    el.dataset.rarity = rarity.id;
    el.style.setProperty('--rarity-color', rarity.color);
  } else {
    delete el.dataset.rarity;
    el.style.removeProperty('--rarity-color');
  }
}
