import { state } from '../state.js';
import { sideOf } from '../core/duel.js';

export const teamName = (side) => side === 0 ? 'ĐỘI XANH' : 'ĐỘI CAM';
export const teamMembers = (team) => team.members.map((p) => p.name).join(' · ');
export const teamAlive = (team) => team.members.filter((p) => p.alive).length;
export const duelTitle = (duel) => `VÕ ĐÀI ${duel.teams[0].members.length}v${duel.teams[1].members.length}`;

export function duelIntro({ duel }) {
  const side = sideOf(duel, state.myId);
  const rules = duel.audience.rules;
  if (side >= 0) {
    return {
      title: duelTitle(duel),
      mission: `${teamName(side)} — hạ hết đội đối phương!`,
      reward: `Mỗi người đội thắng +${duel.prize}đ, kể cả đã gục`,
      note: `Đồng đội: ${teamMembers(duel.teams[side])}. Nhặt dao tiếp tế để chém ${rules.knifeAmmo} lần. Đồ trong túi được cất tạm, xong trả lại. Không đánh đồng đội; gục nằm chờ.`,
    };
  }
  return {
    title: duelTitle(duel),
    mission: 'Cược đội thắng (1 / 2) · Rồi tiếp tế hoặc quậy phá',
    reward: `Cược đúng +${duel.stake}đ · Sai −${duel.stake}đ`,
    note: `G: ${rules.knives} dao tiếp tế · Chuột trái: ${rules.tomatoes} cà chua · Cách nhau ${rules.gapMs / 1000}s. Dao ai nhặt cũng được; cà chua không gây dame.`,
  };
}

export function duelResult(m, { duel }) {
  if (m.reason === 'left') return 'Một võ sĩ đã rời phòng: huỷ võ đài, không ai mất điểm cược';
  if (m.reason !== 'duel') return '';
  return m.winnerIds.includes(state.myId)
    ? `${teamName(m.winnerTeam)} THẮNG! Bạn +${m.prize} điểm!`
    : `${teamName(m.winnerTeam)} thắng! Mỗi thành viên +${duel.prize} điểm`;
}

export function duelInfo(duel) {
  const left = Math.max(0, Math.ceil((duel.stageEndsAt - performance.now()) / 1000));
  if (duel.stage === 'bet') return `Chờ cược: còn ${left}s · Đủ người chọn thì đánh ngay`;
  if (duel.stage === 'finish') return `${teamName(duel.roundWinner)} thắng trận!`;
  if (duel.stage === 'break') return `Hiệp sau bắt đầu sau ${left}s`;
  const side = sideOf(duel, state.myId);
  if (side >= 0) {
    const mine = duel.teams[side].members.find((p) => p.id === state.myId);
    return mine.alive
      ? `${teamName(side)} · Hạ hết đối phương · Không đánh đồng đội`
      : 'BẠN ĐÃ GỤC · Chờ đồng đội chiến đấu, vẫn nhận thưởng nếu đội thắng';
  }
  return 'Đội nào hết người đứng trước thì thua';
}
