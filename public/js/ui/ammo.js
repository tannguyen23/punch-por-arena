import { state } from '../state.js';

const el = document.getElementById('ammo');

const LOW_AMMO = 3; // còn ngần này viên thì số chuyển đỏ nhấp nháy

let drawn = null;

// Số đạn (súng) hoặc độ bền (dao) của vũ khí đang cầm, góc dưới bên phải. Ẩn khi vũ khí dùng mãi (tay không...).
export function updateAmmo() {
  const signature = `${state.weapon}|${state.ammo}`;
  if (signature === drawn) return;
  drawn = signature;
  if (state.ammo === null) {
    el.replaceChildren();
    return;
  }
  const count = document.createElement('div');
  count.className = 'ammo-count';
  count.textContent = `${state.ammo}`;
  const label = document.createElement('div');
  label.className = 'ammo-label';
  label.textContent = state.weaponTypes[state.weapon]?.kind === 'melee' ? 'ĐỘ BỀN' : 'ĐẠN';
  el.replaceChildren(count, label);
  el.classList.toggle('low', state.ammo <= LOW_AMMO);
}
