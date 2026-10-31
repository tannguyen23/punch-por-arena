import { state, infos } from '../state.js';
import { updateWeaponPanel } from './weaponPanel.js';
import { updateHotbar } from './hotbar.js';
import { updateAmmo } from './ammo.js';
import { updateStreak } from './streak.js';
import { updatePotion } from './potionHud.js';
import { duelOf, isFighter } from '../core/duel.js';
import { hpTickStep } from '../core/hpTicks.js';
import { HP_TICKS } from '../config.js';

const pauseEl = document.getElementById('pause');
const resumeButton = document.getElementById('pause-resume');
const hpFill = document.getElementById('hpfill');
const flash = document.getElementById('flash');
const deadText = document.getElementById('dead');
const board = document.getElementById('board');
const crosshair = document.getElementById('crosshair');
const hpBar = document.getElementById('hpbar');
const hpTicks = document.getElementById('hpticks');
const damageNotice = document.getElementById('damage-notice');

const HEAL_GLOW_MS = 600; // thanh máu sáng xanh ngần này sau mỗi lần máu tăng (đang tự hồi)
const DAMAGE_REASONS = { cactus: 'Gai xương rồng', fall: 'Rơi khỏi đảo', lightning: 'Sét đánh', nuke: 'Bom hạt nhân', tnt: 'TNT nổ' }; // `source` của message hit

let lastHp = null;
let healTimer = null;
let damageNoticeTimer = null;
let inGame = false;

// Ẩn toàn bộ HUD của ván đấu khi còn ở menu: nếu không, thanh máu / hotbar / tâm ngắm và tay cũ
// vẫn hiện phía sau màn hình menu. `body.in-game` bật khi đã bấm vào phòng, tắt khi server từ chối.
export function setGameHudVisible(visible) {
  if (visible === inGame) return;
  inGame = visible;
  document.body.classList.toggle('in-game', visible);
}

export function showPause(title, text) {
  document.getElementById('pause-title').textContent = title;
  document.getElementById('pause-text').textContent = text;
  resumeButton.hidden = true; // mất kết nối: không có gì để chơi tiếp
  pauseEl.style.display = 'flex';
  document.exitPointerLock();
}

export function setPauseVisible(visible) {
  pauseEl.style.display = visible ? 'flex' : 'none';
  if (visible) resumeButton.hidden = false;
}

// Click ở bất kỳ đâu trên màn hình để tiếp tục, không chỉ khi trúng đúng khung #pause.
// Bắt ở pha capture để không bị HUD/canvas nằm trên chặn mất; bỏ qua nút trong màn pause và bảng Cài đặt.
export function onPauseClick(handler) {
  document.addEventListener('click', (e) => {
    if (pauseEl.style.display !== 'flex') return;
    if (e.target.closest?.('button, #settings')) return;
    e.preventDefault();
    e.stopPropagation();
    handler();
  }, true);
  resumeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    handler();
  });
}

// Thoát về menu: tải lại trang sạch (bỏ ?room=), kết nối đóng nên server tự cho người chơi rời phòng.
document.getElementById('pause-leave').addEventListener('click', (e) => {
  e.stopPropagation(); // không để click xuyên xuống màn tạm dừng làm khoá chuột lại
  document.exitPointerLock();
  location.replace(location.pathname);
});

// Màn hình loé đỏ khi mình bị đấm trúng.
// `power` 0–1: đòn nặng thì loé đậm hơn.
export function flashDamage(power = 0.5) {
  flash.style.transition = 'none';
  flash.style.opacity = 0.18 + 0.3 * power;
  requestAnimationFrame(() => {
    flash.style.transition = 'opacity .25s';
    flash.style.opacity = 0;
  });
}

export function showDamageNotice(damage, source) {
  const reason = DAMAGE_REASONS[source] ?? '';
  damageNotice.textContent = reason ? `${reason} -${damage} HP` : `-${damage} HP`;
  damageNotice.classList.remove('show');
  void damageNotice.offsetWidth;
  damageNotice.classList.add('show');
  clearTimeout(damageNoticeTimer);
  damageNoticeTimer = setTimeout(() => damageNotice.classList.remove('show'), 750);
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

// Vạch chia thanh máu của mình (CSS #hpticks, mỗi vạch là một lượng máu cố định như thanh máu 3D trên đầu người khác). Chỉ ghi lại khi máu tối đa đổi.
let ticksFor = 0;
function updateHpTicks() {
  if (ticksFor === state.maxHp) return;
  ticksFor = state.maxHp;
  const { small, big } = hpTickStep(ticksFor);
  const style = hpTicks.style;
  style.setProperty('--small', `${(small / ticksFor) * 100}%`);
  style.setProperty('--big', `${(big / ticksFor) * 100}%`);
  style.setProperty('--small-px', `${HP_TICKS.smallPx}px`);
  style.setProperty('--big-px', `${HP_TICKS.bigPx}px`);
  style.setProperty('--small-h', `${HP_TICKS.smallHeight * 100}%`);
  style.setProperty('--tick', HP_TICKS.color);
}

export function updateHud(snapshotPlayers) {
  updateHpTicks();
  hpFill.style.width = `${(Math.max(0, state.hp) / state.maxHp) * 100}%`;
  showHealing();
  deadText.style.display = state.alive ? 'none' : 'block';
  const duel = duelOf();
  if (!state.alive && duel && isFighter(duel)) deadText.style.display = 'none';
  updateWeaponPanel();
  updateCrosshair();
  updateHotbar();
  updateAmmo();
  updateStreak();
  updatePotion();
  updateScoreboard(snapshotPlayers);
}

function updateScoreboard(list) {
  // Tên do người chơi tự nhập nên dùng textContent, không dùng innerHTML.
  const title = document.createElement('b');
  title.textContent = 'Điểm';
  const rows = list
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((p) => {
      const row = document.createElement('div');
      row.textContent = `${p.id === state.myId ? '▶ ' : ''}${infos.get(p.id)?.name ?? '...'}: ${p.score}`;
      return row;
    });
  board.replaceChildren(title, ...rows);
}
