import { state } from '../state.js';

const el = document.getElementById('ammo');

const LOW_AMMO = 3; // còn ngần này viên thì số chuyển đỏ nhấp nháy
const LABELS = { melee: 'ĐỘ BỀN', throwable: 'QUẢ' };

let drawn = null;

// Số đạn (súng) hoặc độ bền (dao) của vũ khí đang cầm, góc dưới bên phải. Ẩn khi vũ khí dùng mãi (tay không...).
export function updateAmmo() {
  const weapon = state.weaponTypes[state.weapon];
  const remaining = state.reloading ? Math.max(0, Math.ceil((state.reloadEndsAt - performance.now()) / 100) / 10) : 0;
  const signature = `${state.weapon}|${state.ammo}|${state.magazine}|${state.reloading}|${remaining}`;
  if (signature === drawn) return;
  drawn = signature;
  if (state.ammo === null) {
    el.replaceChildren();
    return;
  }
  const count = document.createElement('div');
  count.className = 'ammo-count';
  count.textContent = weapon?.magazineSize ? `${state.magazine} / ${Math.max(0, state.ammo - state.magazine)}` : `${state.ammo}`;
  const label = document.createElement('div');
  label.className = 'ammo-label';
  label.textContent = state.reloading ? `ĐANG THAY BĂNG · ${remaining.toFixed(1)}s`
    : weapon?.magazineSize ? 'TRONG BĂNG / DỰ TRỮ · R: THAY BĂNG' : LABELS[weapon?.kind] ?? 'ĐẠN';
  el.replaceChildren(count, label);
  if (state.reloading) {
    const progress = document.createElement('progress');
    progress.className = 'reload-progress';
    progress.max = weapon.reloadMs;
    progress.value = Math.max(0, weapon.reloadMs - (state.reloadEndsAt - performance.now()));
    progress.setAttribute('aria-label', 'Tiến trình thay băng');
    el.append(progress);
  }
  el.classList.toggle('low', !state.reloading && (weapon?.magazineSize ? state.magazine : state.ammo) <= LOW_AMMO && weapon?.kind !== 'throwable');
}
