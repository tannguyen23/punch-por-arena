import { state } from '../state.js';
import * as Sfx from '../audio/sfx.js';

const timerEl = document.getElementById('match-timer');
const bannerEl = document.getElementById('banner');
const endEl = document.getElementById('match-end');

const MESSAGE_MS = 2500; // thời gian hiện thông báo ngắn ("Hòm tiếp tế đã rơi!")
const LOW_TIME_S = 30; // đồng hồ chuyển vàng
const URGENT_TIME_S = 10; // đồng hồ đỏ nhấp nháy và bíp mỗi giây
const WAVE_BEEP_S = 5; // bíp mỗi giây khi hòm tiếp tế chỉ còn ngần này giây nữa là chạm đất

let message = null; // { text, until }
let lastTimeBeep = null;
let lastWaveBeep = null;
let lastEndSignature = null;

// Thông báo ngắn giữa màn hình.
export function announce(text) {
  message = { text, until: performance.now() + MESSAGE_MS };
}

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function updateTimer(now) {
  const left = Math.max(0, state.match.endsAt - now);
  const playing = state.match.phase === 'playing';
  timerEl.textContent = playing ? formatTime(left) : '';
  timerEl.className = !playing ? '' : left <= URGENT_TIME_S * 1000 ? 'urgent' : left <= LOW_TIME_S * 1000 ? 'low' : '';

  // Những giây cuối của trận: bíp mỗi giây, cao dần ở 3 giây chót.
  const seconds = Math.ceil(left / 1000);
  if (playing && left > 0 && seconds <= URGENT_TIME_S) {
    if (seconds !== lastTimeBeep) {
      lastTimeBeep = seconds;
      Sfx.beep(seconds <= 3 ? 1200 : 880, 0.7);
    }
  } else {
    lastTimeBeep = null;
  }
}

function updateBanner(now) {
  const { wave, phase } = state.match;
  let text = '';
  let mode = '';
  if (message && now < message.until) {
    text = message.text;
  } else if (phase === 'playing' && wave) {
    const seconds = Math.ceil((wave.at - now) / 1000);
    text = seconds > 0 ? `HÒM TIẾP TẾ CHẠM ĐẤT SAU ${seconds}s` : 'HÒM TIẾP TẾ ĐANG RƠI...';
    mode = seconds <= WAVE_BEEP_S ? 'wave urgent' : 'wave';
    if (seconds > 0 && seconds <= WAVE_BEEP_S && seconds !== lastWaveBeep) {
      lastWaveBeep = seconds;
      Sfx.beep(660 + (WAVE_BEEP_S - seconds) * 110, 0.8); // cao dần theo từng giây
    }
  }
  if (!wave) lastWaveBeep = null;
  bannerEl.textContent = text;
  bannerEl.className = mode;
}

function row(className, name, kills) {
  const el = document.createElement('div');
  el.className = className;
  const nameEl = document.createElement('span');
  nameEl.textContent = name; // tên do người chơi tự nhập nên dùng textContent
  const killsEl = document.createElement('span');
  killsEl.textContent = `${kills}`;
  el.append(nameEl, killsEl);
  return el;
}

// Người thắng là người nhiều kill nhất; hoà thì liệt kê hết. Trận kết thúc bằng bom hạt nhân thì người gọi bom thắng.
function winnerText(ranking, result) {
  if (result?.reason === 'nuke') return `Người thắng: ${result.winnerName} (gọi bom hạt nhân)`;
  const top = ranking[0]?.kills ?? 0;
  if (top === 0) return 'Không ai hạ gục ai';
  const names = ranking.filter((p) => p.kills === top).map((p) => p.name);
  return `${names.length > 1 ? 'Hoà: ' : 'Người thắng: '}${names.join(', ')}`;
}

function updateEndScreen(now) {
  const ended = state.match.phase === 'ended' && now >= state.match.showEndAt;
  endEl.style.display = ended ? 'flex' : 'none';
  if (!ended) {
    lastEndSignature = null;
    return;
  }
  const seconds = Math.max(0, Math.ceil((state.match.endsAt - now) / 1000));
  const signature = `${state.match.ranking.map((p) => `${p.id}:${p.kills}`).join(',')}|${seconds}`;
  if (signature === lastEndSignature) return;
  lastEndSignature = signature;

  const { result, ranking } = state.match;
  const title = document.createElement('h1');
  title.textContent = result?.reason === 'nuke' ? 'BOM HẠT NHÂN! KẾT THÚC TRẬN' : 'HẾT GIỜ!';
  const winner = document.createElement('div');
  winner.className = 'winner';
  winner.textContent = winnerText(ranking, result);
  const rows = ranking.map((p, i) => row(p.id === state.myId ? 'rank me' : 'rank', `${i + 1}. ${p.name}`, p.kills));
  const next = document.createElement('div');
  next.className = 'next';
  next.textContent = `Trận mới sau ${seconds}s`;
  endEl.replaceChildren(title, winner, ...rows, next);
}

// Gọi mỗi khung hình: đồng hồ, đếm ngược hòm tiếp tế, thông báo, bảng xếp hạng cuối trận.
export function updateMatchHud() {
  const now = performance.now();
  updateTimer(now);
  updateBanner(now);
  updateEndScreen(now);
}
