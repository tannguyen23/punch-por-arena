import { state } from '../state.js';
import { FIST_SLOT } from '../config.js';
import { blastFeedback } from './combatHandlers.js';
import { announce } from '../ui/matchHud.js';

export function syncTntCarrier() {
  if (state.event?.kind !== 'tnt' || state.event.targetId !== state.myId) return;
  state.weapon = 'fist';
  state.ammo = null;
  state.activeSlot = FIST_SLOT;
  state.slotChangedAt = 0;
}

export const tntHandlers = {
  tnt(m) {
    if (state.event?.kind !== 'tnt') return;
    state.event.targetId = m.targetId;
    state.event.targetName = m.targetName;
    syncTntCarrier();
    announce(m.targetId === state.myId ? 'BẠN ĐANG CẦM TNT! Đấm trúng người khác để chuyền!' : `${m.targetName} đang cầm TNT!`);
  },
  tntboom(m) {
    blastFeedback(m.at, m.r);
  },
};
