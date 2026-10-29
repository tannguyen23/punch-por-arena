import { state } from '../state.js';

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

// Luật sự kiện "solo võ đài": võ sĩ và người xem có luật khác nhau.
function duelIntro({ duel }) {
  const [a, b] = duel.fighters;
  const common = `Đánh tay không, ai thắng ${duel.winsNeeded} hiệp trước thì thắng trận. Mỗi hiệp đánh tới khi một người hết máu, không giới hạn thời gian.`;
  const mine = duel.fighters.find((f) => f.id === state.myId);
  if (mine) {
    const other = mine === a ? b : a;
    return {
      title: 'SOLO VÕ ĐÀI',
      mission: `BẠN bị nhốt vào võ đài để solo với ${other.name}!`,
      reward: `Thắng trận được +${duel.prize}đ`,
      rules: [
        common,
        'Bạn mất hết vũ khí và không ra khỏi võ đài được. Trong lúc mọi người cược, bạn đứng yên chuẩn bị.',
      ],
    };
  }
  return {
    title: 'SOLO VÕ ĐÀI',
    mission: `${a.name} và ${b.name} bị nhốt vào võ đài để solo!`,
    rules: [
      common,
      'Bạn được đưa ra quanh võ đài: chỉ đi lại và xem, không đánh được cho tới hết trận solo.',
      `Trong ${Math.round(duel.betMs / 1000)}s đầu, màn hình đặt cược hiện ra buộc chọn một trong hai: bấm 1 (${a.name}) hoặc 2 (${b.name}) để cược ${duel.stake} điểm vào người thắng — đúng +${duel.stake}, sai −${duel.stake}.`,
    ],
  };
}

export const introFor = (ev) => (ev.kind === 'duel' ? duelIntro(ev) : dogIntro(ev));

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

function duelResult(m, { duel }) {
  if (m.reason === 'left') return 'Một võ sĩ đã rời phòng: trận solo bị huỷ, không ai mất điểm cược';
  if (m.reason !== 'duel') return '';
  const [high, low] = [...duel.wins].sort((x, y) => y - x);
  const score = `${high}-${low}`;
  return m.winnerId === state.myId
    ? `BẠN thắng solo ${score} và nhận +${duel.prize} điểm!`
    : `${m.winnerName} thắng solo ${score} và nhận +${duel.prize} điểm!`;
}

// Tin 'eventEnd' { reason, winnerId, winnerName, bounty } → dòng thông báo ('' = không hiện gì).
export const resultFor = (m, ev) => (ev?.kind === 'duel' ? duelResult(m, ev) : dogResult(m, ev));
