import { state } from '../state.js';
import { warnNameFor } from './eventText.js';
import * as Sfx from '../audio/sfx.js';

const timerEl = document.getElementById('match-timer');
const bannerEl = document.getElementById('banner');
const eventCountEl = document.getElementById('event-countdown');
const endEl = document.getElementById('match-end');

const MESSAGE_MS = 2500; // thời gian hiện thông báo ngắn ("Hòm tiếp tế đã rơi!")
const LOW_TIME_S = 30; // đồng hồ chuyển vàng
const URGENT_TIME_S = 10; // đồng hồ đỏ nhấp nháy và bíp mỗi giây
const WAVE_BEEP_S = 5; // bíp mỗi giây khi hòm tiếp tế chỉ còn ngần này giây nữa là chạm đất

let message = null; // { text, until }
let lastTimeBeep = null;
let lastWaveBeep = null;
let lastWarnBeep = null;
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
  const warn = state.eventWarn;
  let text = '';
  let mode = '';
  let count = ''; // số đếm ngược to giữa màn hình khi báo trước sự kiện
  if (warn && phase === 'playing' && now < warn.at) {
    // Cảnh báo trước sự kiện quan trọng hơn thông báo ngắn / đếm ngược hòm: người chơi kịp giữ vũ khí xịn.
    const seconds = Math.max(1, Math.ceil((warn.at - now) / 1000));
    text = `SẮP CÓ SỰ KIỆN: ${warnNameFor(warn.kind)}`;
    mode = 'event';
    count = `${seconds}`;
    if (seconds !== lastWarnBeep) {
      lastWarnBeep = seconds;
      eventCountEl.classList.remove('tick');
      void eventCountEl.offsetWidth; // chạy lại hoạt ảnh mỗi giây
      eventCountEl.classList.add('tick');
      Sfx.beep(500 + (5 - seconds) * 100, 0.75);
    }
  } else {
    if (warn) state.eventWarn = null;
    lastWarnBeep = null;
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
  }
  if (!wave) lastWaveBeep = null;
  bannerEl.textContent = text;
  bannerEl.className = mode;
  if (eventCountEl.textContent !== count) eventCountEl.textContent = count;
  eventCountEl.classList.toggle('urgent', Boolean(count) && Number(count) <= 3);
}

function row(className, name, score) {
  const el = document.createElement('div');
  el.className = className;
  const nameEl = document.createElement('span');
  nameEl.textContent = name; // tên do người chơi tự nhập nên dùng textContent
  const scoreEl = document.createElement('span');
  scoreEl.textContent = `${score}`;
  el.append(nameEl, scoreEl);
  return el;
}

// Người thắng là người nhiều điểm nhất; hoà thì liệt kê hết.
function winnerText(ranking) {
  const top = ranking[0]?.score ?? 0;
  if (top === 0) return 'Không ai hạ gục ai';
  const names = ranking.filter((p) => p.score === top).map((p) => p.name);
  return `${names.length > 1 ? 'Hoà: ' : 'Người thắng: '}${names.join(', ')}`;
}

function updateEndScreen(now) {
  const ended = state.match.phase === 'ended';
  endEl.style.display = ended ? 'flex' : 'none';
  if (!ended) {
    lastEndSignature = null;
    return;
  }
  const seconds = Math.max(0, Math.ceil((state.match.endsAt - now) / 1000));
  const signature = `${state.match.ranking.map((p) => `${p.id}:${p.score}`).join(',')}|${seconds}`;
  if (signature === lastEndSignature) return;
  lastEndSignature = signature;

  const { ranking } = state.match;
  const title = document.createElement('h1');
  title.textContent = 'HẾT GIỜ!';
  const winner = document.createElement('div');
  winner.className = 'winner';
  winner.textContent = winnerText(ranking);
  const rows = ranking.map((p, i) => row(p.id === state.myId ? 'rank me' : 'rank', `${i + 1}. ${p.name}`, p.score));
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
