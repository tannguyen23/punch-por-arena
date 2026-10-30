import { state } from '../state.js';

// `teams` chứa hai đội với members [{ id, name, alive }]; fighters là danh sách phẳng để kiểm tra vai trò.
export const duelOf = () => (state.event?.kind === 'duel' ? state.event.duel : null);

export const isFighter = (duel) => duel.fighters.some((f) => f.id === state.myId);
export const sideOf = (duel, id) => duel.teams.findIndex((team) => team.members.some((p) => p.id === id));

// Server gửi "còn bao lâu"; đổi sang đồng hồ máy mình. Cược của mình chỉ có ở máy mình nên giữ lại qua các lần cập nhật.
export function toDuelState(view, previous = null) {
  return { ...view, audience: toAudienceState(view.audience), stageEndsAt: performance.now() + view.stageLeft, myBet: previous?.myBet ?? null };
}

export function toAudienceState(view) {
  if (!view) return null;
  const now = performance.now();
  return {
    ...view,
    kits: view.kits.map((kit) => ({ ...kit, readyAt: now + kit.wait })),
    flights: view.flights.map((flight) => ({ ...flight, startedAt: now - flight.age })),
  };
}
