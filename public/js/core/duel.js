import { state } from '../state.js';

// Sự kiện solo võ đài (server/game/duelEvent.js): `state.event.duel` = { stage, round, rounds, winsNeeded, wins, roundWinner,
// fighters: [{ id, name }, ...], counts (số người cược mỗi võ sĩ), stake, prize, betMs, fighterMargin, spectatorEdge, stageEndsAt (mốc performance.now()),
// myBet (0 | 1 | null) }. stage: 'intro' (đứng hình đọc luật) → 'bet' (cược) → 'fight' ⇄ 'break' (nghỉ giữa hiệp) → 'finish'.
export const duelOf = () => (state.event?.kind === 'duel' ? state.event.duel : null);

export const isFighter = (duel) => duel.fighters.some((f) => f.id === state.myId);

// Server gửi "còn bao lâu"; đổi sang đồng hồ máy mình. Cược của mình chỉ có ở máy mình nên giữ lại qua các lần cập nhật.
export function toDuelState(view, previous = null) {
  return { ...view, stageEndsAt: performance.now() + view.stageLeft, myBet: previous?.myBet ?? null };
}
