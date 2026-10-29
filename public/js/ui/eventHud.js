import { state } from '../state.js';
import { isFrozen } from '../core/freeze.js';
import { EVENT_RESULT_MS } from '../config.js';
import * as Sfx from '../audio/sfx.js';

// Giao diện sự kiện: bảng luật lúc đứng hình (có đếm ngược), dòng trạng thái trong lúc sự kiện chạy và thông báo kết quả.
// Tên người chơi do họ tự nhập nên chỉ gán bằng textContent.

const introEl = document.getElementById('event-intro');
const statusEl = document.getElementById('event-status');
const resultEl = document.getElementById('event-result');

let countEl = null;
let result = null; // { text, until }
let lastBeep = null;
let wasFrozen = false;

function line(className, text) {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  return el;
}

// Luật của sự kiện "hoá chó", khác nhau giữa con chó và những người săn nó.
function dogRules(ev, seconds) {
  if (ev.targetId === state.myId) {
    return [
      'BẠN bị biến thành CHÓ!',
      'Bạn mất hết vũ khí, không đánh được, chỉ chạy được (nhanh hơn người một chút). Mọi người luôn thấy bạn ở đâu, kể cả sau tường.',
      'Bấm Q để thả shit sau lưng (tích trữ tối đa vài cục, hồi dần): ai dậm phải sẽ chậm lại và bị che tầm nhìn.',
      `Sống sót ${seconds}s để nhận ${ev.bounty} điểm.`,
      `Nếu bị hạ gục, người hạ gục bạn nhận ${ev.bounty} điểm.`,
    ];
  }
  return [
    `${ev.targetName} bị biến thành CHÓ!`,
    'Con chó mất hết vũ khí, không đánh được, chỉ chạy được (nhanh hơn người một chút). Chỉ báo trên màn hình luôn cho biết nó ở đâu, kể cả sau tường.',
    'Coi chừng shit chó thả lại sau lưng: dậm phải sẽ chậm lại và bị che tầm nhìn một lúc (nhảy qua để tránh).',
    `Hạ gục chó trong ${seconds}s: bạn nhận ${ev.bounty} điểm (cộng thêm điểm hạ gục thường).`,
    `Nếu chó chạy thoát tới hết giờ, chó nhận ${ev.bounty} điểm.`,
  ];
}

function buildIntro(ev) {
  const seconds = Math.round((ev.endsAt - ev.introEndsAt) / 1000);
  const [headline, ...rules] = dogRules(ev, seconds);
  const title = line('event-title', 'SỰ KIỆN: HOÁ CHÓ!');
  const head = line('event-headline', headline);
  countEl = line('event-count', '');
  introEl.replaceChildren(title, head, ...rules.map((text) => line('event-rule', text)), line('event-note', 'Mọi người đứng yên để đọc luật'), countEl);
}

// Tin nhắn 'event' (và `welcome.match.event` cho người vào giữa chừng): `introLeft` / `left` là mili giây còn lại.
export function beginEvent({ kind, targetId, targetName, bounty, poop = null, introLeft, left }) {
  const now = performance.now();
  state.event = { kind, targetId, targetName, bounty, poop, introEndsAt: now + introLeft, endsAt: now + left };
  buildIntro(state.event);
  lastBeep = null;
  wasFrozen = introLeft > 0;
  if (introLeft > 0) Sfx.warning();
}

function resultText(m, ev) {
  const mine = m.winnerId === state.myId;
  const dogName = ev?.targetName ?? '';
  switch (m.reason) {
    case 'caught': return mine ? `BẠN đã hạ gục con chó và nhận +${m.bounty} điểm!` : `${m.winnerName} đã hạ gục con chó ${dogName} và nhận +${m.bounty} điểm!`;
    case 'escaped': return mine ? `BẠN đã chạy thoát và nhận +${m.bounty} điểm!` : `Chó ${m.winnerName} đã chạy thoát và nhận +${m.bounty} điểm!`;
    case 'died': return `Chó ${dogName} chết vì tai nạn: không ai nhận thưởng`;
    case 'left': return 'Con chó đã rời phòng: sự kiện bị huỷ';
    default: return '';
  }
}

// Tin nhắn 'eventEnd' { reason: 'caught' | 'escaped' | 'died' | 'left' | 'cancelled', winnerId, winnerName, bounty }.
export function finishEvent(m) {
  const text = resultText(m, state.event);
  state.event = null;
  if (!text) return;
  result = { text, until: performance.now() + EVENT_RESULT_MS };
  if (m.reason === 'caught' || m.reason === 'escaped') Sfx.fanfare();
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
    if (seconds !== lastBeep) {
      lastBeep = seconds;
      if (seconds <= 3) Sfx.beep(660, 0.7);
    }
  } else if (wasFrozen) {
    Sfx.horn(); // hết đứng hình: bắt đầu săn
  }
  wasFrozen = frozen;

  if (ev && !frozen) {
    statusEl.textContent = `CHÓ: ${ev.targetName} · còn ${Math.max(0, Math.ceil((ev.endsAt - now) / 1000))}s · thưởng ${ev.bounty} điểm`;
    statusEl.className = ev.targetId === state.myId ? 'me' : '';
  } else {
    statusEl.textContent = '';
  }

  const showResult = result && now < result.until;
  resultEl.textContent = showResult ? result.text : '';
}
