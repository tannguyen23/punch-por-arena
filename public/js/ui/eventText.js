import { state } from '../state.js';
import { duelIntro, duelResult } from './duelText.js';

// Chữ của từng sự kiện: bảng luật lúc đứng hình (khác nhau giữa người trong cuộc và người ngoài) và thông báo kết quả.
// Bảng luật là một màn hình đọc nên chữ phải ngắn: { title, mission (nhiệm vụ), reward (phần thưởng, tuỳ chọn), rules (dòng phụ, tuỳ chọn),
// note (ghi chú nhỏ, tuỳ chọn) }, xem quy tắc 8 trong CLAUDE.md.
// Tên người chơi do họ tự nhập nên chỉ đưa vào textContent (eventHud.js).

// Luật sự kiện "hoá chó": con chó chỉ cần biết chạy, người săn chỉ cần biết đuổi.
function dogIntro(ev) {
  if (ev.targetId === state.myId) {
    return { title: 'BỊ HOÁ CHÓ', mission: 'Nhiệm vụ: Chạy, chạy, và chạy', reward: `Sống để được +${ev.bounty}đ`, note: 'Bấm Q để thả shit' };
  }
  return { title: `${ev.targetName} BỊ HOÁ CHÓ`, mission: 'Nhiệm vụ: dí đánh con chó', reward: `${ev.bounty}đ di động đó` };
}

function tntIntro(ev) {
  const mine = ev.targetId === state.myId;
  const boost = Math.round((ev.tnt.speedMult - 1) * 100);
  return {
    title: mine ? 'BẠN CẦM TNT!' : 'CHUYỀN TNT',
    mission: mine ? `Chạy nhanh hơn ${boost}% — đấm trúng để chuyền TNT!` : `Tránh ${ev.targetName} — người cầm TNT chạy nhanh hơn ${boost}%!`,
    reward: `Không cầm lúc nổ: +${ev.bounty}đ · Cầm cuối: bị hạ gục, −${ev.tnt.penalty}đ`,
    note: `Nổ sau ${ev.tnt.minSeconds}–${ev.tnt.maxSeconds}s, chuyền không đặt lại giờ. Chỉ TNT gây sát thương. Có potion, không thả hòm. Điểm có thể âm.`,
  };
}

const intros = { dog: dogIntro, duel: duelIntro, tnt: tntIntro };
export const introFor = (ev) => intros[ev.kind](ev);

export const tntStatus = (ev) => ev.targetId === state.myId
  ? `BẠN CẦM TNT! · Tốc độ +${Math.round((ev.tnt.speedMult - 1) * 100)}% · Đấm để chuyền!`
  : `TNT: ${ev.targetName} · Tránh người cầm TNT!`;

function dogResult(m, ev) {
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

// Tin 'eventEnd' { reason, winnerId, winnerName, bounty } → dòng thông báo ('' = không hiện gì).
function tntResult(m) {
  if (m.reason === 'insufficient') return 'Không còn đủ người sống: huỷ TNT, không ai cộng / trừ điểm';
  if (m.reason !== 'exploded') return '';
  return m.loserId === state.myId
    ? `TNT NỔ! BẠN bị hạ gục, −${m.penalty}đ!`
    : `TNT NỔ! ${m.loserName} bị hạ gục, −${m.penalty}đ · Bạn +${m.bounty}đ!`;
}

const results = { dog: dogResult, duel: duelResult, tnt: tntResult };
export const resultFor = (m, ev) => results[m.kind ?? ev?.kind]?.(m, ev) ?? '';
