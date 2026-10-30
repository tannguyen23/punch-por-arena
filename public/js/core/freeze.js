import { state } from '../state.js';
import { duelOf, isFighter } from './duel.js';

// Đang đứng hình: phần mở đầu của sự kiện, cả phòng đứng yên đọc luật (server cũng chặn, xem server/game/restrictions.js).
export const isFrozen = () => state.event !== null && performance.now() < state.event.introEndsAt;
export const isStunned = () => state.alive && state.match.phase === 'playing' && performance.now() < state.stunnedUntil;

// Võ sĩ trong sự kiện solo ngoài hiệp đấu (đang cược, nghỉ giữa hiệp) đứng yên tại chỗ.
export const isHeld = () => {
  const duel = duelOf();
  return duel !== null && isFighter(duel) && duel.stage !== 'fight';
};

// Chơi cờ cũng giữ nguyên vị trí để không rời khỏi bàn khi đang bấm ô.
export const isImmobile = () => isStunned() || Boolean(state.tableGame) || isFrozen() || isHeld();

// Không đánh / ném / đổi ô / vứt / gọi radio được: chó, đứng hình, hoặc trong sự kiện solo mà không phải võ sĩ đang trong hiệp (người xem).
export const actionBlocked = () => {
  const duel = duelOf();
  return isStunned() || Boolean(state.tableGame) || state.dog || isFrozen() || (duel !== null && !(isFighter(duel) && duel.stage === 'fight'));
};
