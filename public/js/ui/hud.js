import { state, infos } from '../state.js';
import { updateWeaponPanel } from './weaponPanel.js';
import { updateHotbar } from './hotbar.js';
import { updateAmmo } from './ammo.js';

const pauseEl = document.getElementById('pause');
const hpFill = document.getElementById('hpfill');
const flash = document.getElementById('flash');
const deadText = document.getElementById('dead');
const board = document.getElementById('board');
const crosshair = document.getElementById('crosshair');
const hpBar = document.getElementById('hpbar');

const HEAL_GLOW_MS = 600; // thanh máu sáng xanh ngần này sau mỗi lần máu tăng (đang tự hồi)

let lastHp = null;
let healTimer = null;

export function showPause(title, text) {
  document.getElementById('pause-title').textContent = title;
  document.getElementById('pause-text').textContent = text;
  pauseEl.style.display = 'flex';
  document.exitPointerLock();
}

export function setPauseVisible(visible) {
  pauseEl.style.display = visible ? 'flex' : 'none';
}

export function onPauseClick(handler) {
  pauseEl.addEventListener('click', handler);
}

// Màn hình loé đỏ khi mình bị đấm trúng.
export function flashDamage() {
  flash.style.transition = 'none';
  flash.style.opacity = 0.35;
  requestAnimationFrame(() => {
    flash.style.transition = 'opacity .25s';
    flash.style.opacity = 0;
  });
}

// Tâm ngắm phình ra đỏ khi mình đấm trúng người khác.
export function flashCrosshairHit() {
  crosshair.classList.add('hit');
  setTimeout(() => crosshair.classList.remove('hit'), 150);
}

// Tâm ngắm theo loại vũ khí: chấm (cận chiến), dấu cộng (súng), vòng tròn (tên lửa, nổ lan), vòng đứt (lựu đạn).
function updateCrosshair() {
  const kind = state.weaponTypes[state.weapon]?.kind ?? 'melee';
  crosshair.classList.toggle('gun', kind === 'gun');
  crosshair.classList.toggle('rocket', kind === 'rocket');
  crosshair.classList.toggle('throw', kind === 'throwable');
}

// Máu tăng mà vẫn đang sống (không phải vừa hồi sinh) là đang tự hồi máu: thanh máu sáng lên.
function showHealing() {
  const healing = state.alive && lastHp !== null && lastHp > 0 && state.hp > lastHp;
  lastHp = state.alive ? state.hp : 0;
  if (!healing) return;
  hpBar.classList.add('healing');
  clearTimeout(healTimer);
  healTimer = setTimeout(() => hpBar.classList.remove('healing'), HEAL_GLOW_MS);
}

export function updateHud(snapshotPlayers) {
  hpFill.style.width = `${(Math.max(0, state.hp) / state.maxHp) * 100}%`;
  showHealing();
  deadText.style.display = state.alive ? 'none' : 'block';
  updateWeaponPanel();
  updateCrosshair();
  updateHotbar();
  updateAmmo();
  updateScoreboard(snapshotPlayers);
}

function updateScoreboard(list) {
  // Tên do người chơi tự nhập nên dùng textContent, không dùng innerHTML.
  const title = document.createElement('b');
  title.textContent = 'Điểm hạ gục';
  const rows = list
    .slice()
    .sort((a, b) => b.kills - a.kills)
    .map((p) => {
      const row = document.createElement('div');
      row.textContent = `${p.id === state.myId ? '▶ ' : ''}${infos.get(p.id)?.name ?? '...'}: ${p.kills}`;
      return row;
    });
  board.replaceChildren(title, ...rows);
}
