import { state, infos } from '../state.js';
import * as Sfx from '../audio/sfx.js';
import { announce } from './matchHud.js';

const lobbyEl = document.getElementById('lobby');
const countdownEl = document.getElementById('countdown');
const badgeEl = document.getElementById('room-badge');

const COUNTDOWN_BEEP_BASE = 660; // Hz, mỗi giây sau cao hơn một bậc

export const roomLink = () => `${location.origin}/?room=${state.room.code}`;

function fallbackCopy(text) {
  try {
    const box = document.createElement('textarea');
    box.value = text;
    box.style.position = 'fixed';
    box.style.opacity = '0';
    document.body.append(box);
    box.select();
    const done = document.execCommand('copy');
    box.remove();
    return done;
  } catch {
    return false;
  }
}

// Sao chép link mời vào phòng. Không được thì hiện luôn link trên màn hình để người chơi tự chép.
export async function copyRoomLink() {
  if (!state.room) return false;
  const link = roomLink();
  let copied = false;
  try {
    await navigator.clipboard.writeText(link);
    copied = true;
  } catch {
    copied = fallbackCopy(link); // trang không phải https / trình duyệt chặn clipboard
  }
  announce(copied ? `Đã sao chép link phòng ${state.room.code}` : `Link phòng: ${link}`);
  return copied;
}

function row(text, className = '') {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text; // tên do người chơi tự nhập nên dùng textContent
  return el;
}

let lastLobby = null;

function drawLobby() {
  const players = [...infos.values()];
  const ready = players.filter((p) => state.readyIds.has(p.id)).length;
  const { minPlayers, readyRatio } = state.room;
  const needed = Math.floor(players.length * readyRatio) + 1; // hơn một nửa; khớp enoughReady ở server/game/match.js
  const signature = `${state.match.phase}|${state.room.code}|${state.room.mapName}|${players.map((p) => `${p.id}:${state.readyIds.has(p.id)}`).join(',')}`;
  if (signature === lastLobby) return;
  lastLobby = signature;

  const status = state.match.phase === 'countdown'
    ? 'Chuẩn bị vào trận...'
    : players.length < minPlayers
      ? `Cần ít nhất ${minPlayers} người để bắt đầu (${players.length}/${minPlayers})`
      : `${ready}/${players.length} người đã sẵn sàng · cần ${needed} để bắt đầu`;
  const own = state.ready ? 'Bạn đã sẵn sàng. Bấm F để huỷ' : 'Bấm F khi bạn sẵn sàng';

  lobbyEl.replaceChildren(
    row(`Phòng ${state.room.code}`, 'lobby-title'),
    row(`Map: ${state.room.mapName}`, 'lobby-hint'),
    row(roomLink(), 'lobby-link'),
    row('L: sao chép link để mời bạn bè', 'lobby-hint'),
    ...players.map((p) => row(`${state.readyIds.has(p.id) ? '✔' : '…'} ${p.name}${p.id === state.myId ? ' (bạn)' : ''}`, state.readyIds.has(p.id) ? 'lobby-player ready' : 'lobby-player')),
    row(status, 'lobby-status'),
    row(own, 'lobby-own'),
  );
}

let lastSecond = null;

// Số 3, 2, 1 to giữa màn hình, mỗi giây một tiếng bíp cao dần.
function updateCountdown(now) {
  if (state.match.phase !== 'countdown') {
    countdownEl.textContent = '';
    lastSecond = null;
    return;
  }
  const seconds = Math.max(1, Math.ceil((state.match.endsAt - now) / 1000));
  countdownEl.textContent = `${seconds}`;
  if (seconds !== lastSecond) {
    lastSecond = seconds;
    Sfx.beep(COUNTDOWN_BEEP_BASE + (3 - seconds) * 220, 0.9);
  }
}

// Gọi mỗi khung hình: nhãn phòng, bảng phòng chờ (khi chưa vào trận) và đếm ngược 3-2-1.
export function updateLobbyHud() {
  const inRoom = Boolean(state.room);
  badgeEl.textContent = inRoom ? `Phòng ${state.room.code} · L: sao chép link` : '';
  const waiting = inRoom && (state.match.phase === 'lobby' || state.match.phase === 'countdown');
  lobbyEl.style.display = waiting ? 'block' : 'none';
  if (waiting) drawLobby();
  else lastLobby = null;
  updateCountdown(performance.now());
}
