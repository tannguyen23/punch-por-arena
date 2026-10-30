import { state } from '../state.js';
import { isFrozen } from '../core/freeze.js';
import { toDuelState } from '../core/duel.js';
import { EVENT_RESULT_MS } from '../config.js';
import { introFor, resultFor, tntStatus } from './eventText.js';
import * as Sfx from '../audio/sfx.js';

// Giao diện sự kiện: bảng luật lúc đứng hình (có đếm ngược), dòng trạng thái trong lúc sự kiện chạy và thông báo kết quả.
// Chữ nằm ở eventText.js; riêng sự kiện solo còn có bảng riêng (duelHud.js). Tên người chơi do họ tự nhập nên chỉ gán bằng textContent.

const introEl = document.getElementById('event-intro');
const statusEl = document.getElementById('event-status');
const resultEl = document.getElementById('event-result');

let countEl = null;
let barEl = null; // thanh đếm ngược của bảng luật
let introTotal = 1; // thời gian đứng hình lúc bắt đầu (ms), để tính độ dài thanh
let result = null; // { text, until }
let lastBeep = null;
let wasFrozen = false;

function line(className, text) {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  return el;
}

function buildIntro(ev) {
  const { title, mission, reward, rules = [], note } = introFor(ev);
  countEl = line('event-count', '');
  const bar = document.createElement('div');
  bar.className = 'event-bar';
  barEl = document.createElement('div');
  bar.append(barEl);
  introEl.replaceChildren(
    line('event-title', title),
    line('event-mission', mission),
    ...(reward ? [line('event-reward', reward)] : []),
    ...rules.map((text) => line('event-rule', text)),
    ...(note ? [line('event-note', note)] : []),
    bar,
    countEl,
    line('event-wait', 'Mọi người đứng yên để đọc luật'),
  );
}

// Tin nhắn 'event' (và `welcome.match.event` cho người vào giữa chừng): `introLeft` / `left` là mili giây còn lại.
export function beginEvent({ kind, targetId, targetName, bounty, poop = null, duel = null, tnt = null, introLeft, left }) {
  const now = performance.now();
  state.event = { kind, targetId, targetName, bounty, poop, tnt, duel: duel && toDuelState(duel), introEndsAt: now + introLeft, endsAt: now + left };
  introTotal = Math.max(1, introLeft);
  buildIntro(state.event);
  lastBeep = null;
  wasFrozen = introLeft > 0;
  if (introLeft > 0) Sfx.warning();
}

// Tin nhắn 'eventEnd' { reason: 'caught' | 'escaped' | 'duel' | 'died' | 'left' | 'cancelled', winnerId, winnerName, bounty }.
export function finishEvent(m) {
  const text = resultFor(m, state.event);
  state.event = null;
  if (!text) return;
  result = { text, until: performance.now() + EVENT_RESULT_MS };
  if (m.reason === 'caught' || m.reason === 'escaped' || m.reason === 'duel') Sfx.fanfare();
}

// Gọi mỗi khung hình.
export function updateEventHud() {
  const now = performance.now();
  const ev = state.event;
  const frozen = isFrozen();
  introEl.style.display = frozen ? 'flex' : 'none';
  if (frozen) {
    const seconds = Math.ceil((ev.introEndsAt - now) / 1000);
    countEl.textContent = `Bắt đầu sau ${seconds}s`;
    barEl.style.width = `${Math.max(0, Math.min(100, ((ev.introEndsAt - now) / introTotal) * 100))}%`;
    if (seconds !== lastBeep) {
      lastBeep = seconds;
      if (seconds <= 3) Sfx.beep(660, 0.7);
    }
  } else if (wasFrozen) {
    Sfx.horn(); // hết đứng hình: bắt đầu
  }
  wasFrozen = frozen;

  if (ev?.kind === 'dog' && !frozen) { // sự kiện solo có bảng riêng (duelHud.js)
    statusEl.textContent = `CHÓ: ${ev.targetName} · còn ${Math.max(0, Math.ceil((ev.endsAt - now) / 1000))}s · thưởng ${ev.bounty} điểm`;
    statusEl.className = ev.targetId === state.myId ? 'me' : '';
  } else if (ev?.kind === 'tnt' && !frozen) {
    statusEl.textContent = tntStatus(ev);
    statusEl.className = ev.targetId === state.myId ? 'tnt me' : 'tnt';
  } else {
    statusEl.textContent = '';
  }

  const showResult = result && now < result.until;
  resultEl.textContent = showResult ? result.text : '';
}
