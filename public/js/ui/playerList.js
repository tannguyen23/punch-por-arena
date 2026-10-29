import { canvas } from '../core/scene.js';
import { state, infos } from '../state.js';

// Danh sách người chơi (phím Tab bật / tắt): tên, hạ gục, điểm và trạng thái của mọi người trong phòng. Chủ phòng (👑) còn có nút "Kick" bên mỗi người
// khác (bấm hai lần cho chắc). Chuột đang bị khoá để chơi nên chủ phòng mở danh sách thì tự thả chuột ra để bấm được, đóng thì khoá lại.
// Tên người chơi do họ tự nhập nên chỉ gán bằng textContent.

const panel = document.getElementById('player-list');
const listEl = panel.querySelector('.pl-rows');
const titleEl = panel.querySelector('.pl-sub');
const hintEl = panel.querySelector('.pl-hint');

const CONFIRM_MS = 3000; // bấm "Kick" lần đầu, phải bấm lần nữa trong ngần này mới kick thật

let kick = () => {};
let armed = null; // { id, until }: người đang chờ xác nhận kick
let drawn = null;
let wasHost = false;

const isHost = () => state.room?.hostId === state.myId;

// `onKick(id)`: gọi khi chủ phòng xác nhận kick (player/kickPlayer.js gửi lên server).
export function initPlayerList(onKick) {
  kick = onKick;
  panel.addEventListener('click', (e) => e.target === panel && togglePlayerList()); // bấm ra ngoài thẻ là đóng
  panel.querySelector('.pl-close').addEventListener('click', () => togglePlayerList());
}

export const isPlayerListOpen = () => !panel.hidden;

export function togglePlayerList(show = panel.hidden) {
  if (show === !panel.hidden || !state.joined) return;
  panel.hidden = !show;
  armed = null;
  drawn = null;
  if (show && isHost()) document.exitPointerLock(); // chủ phòng cần chuột để bấm Kick
  else if (!show && isHost() && document.pointerLockElement !== canvas) canvas.requestPointerLock();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function statusOf(p) {
  if (state.match.phase === 'lobby' || state.match.phase === 'countdown') return state.readyIds.has(p.id) ? '✔ Sẵn sàng' : '… Chưa sẵn sàng';
  return p.dead ? 'Đã gục' : '';
}

function renderRow(p, host) {
  const row = el('div', p.id === state.myId ? 'pl-row me' : 'pl-row');
  const name = `${p.id === state.room.hostId ? '👑 ' : ''}${infos.get(p.id)?.name ?? '...'}${p.id === state.myId ? ' (bạn)' : ''}`;
  row.append(el('div', 'pl-name', name), el('div', 'pl-num', String(p.kills)), el('div', 'pl-num', String(p.score)), el('div', 'pl-status', statusOf(p)));
  const action = el('div', 'pl-action');
  if (host && p.id !== state.myId) {
    const sure = armed?.id === p.id;
    const button = el('button', sure ? 'pl-kick sure' : 'pl-kick', sure ? 'Chắc chắn?' : 'Kick');
    button.type = 'button';
    button.addEventListener('click', () => {
      if (sure) {
        armed = null;
        kick(p.id);
      } else {
        armed = { id: p.id, until: performance.now() + CONFIRM_MS };
      }
      drawn = null; // vẽ lại ngay
    });
    action.append(button);
  }
  row.append(action);
  return row;
}

// Gọi mỗi khung hình.
export function updatePlayerList() {
  if (panel.hidden || !state.room) return;
  const now = performance.now();
  if (armed && now > armed.until) armed = null;
  const host = isHost();
  if (host && !wasHost) document.exitPointerLock(); // vừa được chuyển quyền chủ phòng lúc đang mở danh sách
  wasHost = host;

  const players = state.roster.slice().sort((a, b) => b.score - a.score);
  const signature = `${state.match.phase}|${state.room.hostId}|${armed?.id ?? ''}|${players.map((p) => `${p.id}:${p.kills}:${p.score}:${p.dead}:${state.readyIds.has(p.id)}:${infos.get(p.id)?.name}`).join(',')}`;
  if (signature === drawn) return;
  drawn = signature;

  titleEl.textContent = `Phòng #${state.room.code} · ${players.length}/${state.room.max} người`;
  hintEl.textContent = host ? 'Bạn là chủ phòng: bấm Kick để mời người ra khỏi phòng' : '';
  const header = el('div', 'pl-row head');
  header.append(el('div', 'pl-name', 'Người chơi'), el('div', 'pl-num', 'Hạ gục'), el('div', 'pl-num', 'Điểm'), el('div', 'pl-status', ''), el('div', 'pl-action', ''));
  listEl.replaceChildren(header, ...players.map((p) => renderRow(p, host)));
}
