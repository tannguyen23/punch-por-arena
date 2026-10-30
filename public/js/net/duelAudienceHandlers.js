import { state, pickups } from '../state.js';
import { toAudienceState } from '../core/duel.js';
import { disposePickup } from '../entities/pickup.js';
import { tomatoImpact, clearAudienceEffects } from '../fx/duelAudience.js';
import { showTomatoSplat, audienceError } from '../ui/duelAudience.js';
import { showDuelBanner } from '../ui/duelHud.js';
import { tomatoSplat } from '../audio/duelSfx.js';
import { clearThrowPreview } from '../fx/throwPreview.js';

export const duelAudienceHandlers = {
  duelaudience(m) {
    if (state.event?.kind === 'duel') state.event.duel.audience = toAudienceState(m.audience);
  },
  duelaudienceerror(m) {
    showDuelBanner(audienceError(m.reason));
  },
  dueltomatohit(m) {
    if (state.event?.kind !== 'duel') return;
    tomatoImpact(m.at);
    tomatoSplat();
    if (m.id === state.myId) showTomatoSplat(m.ms);
  },
  duelaudienceclear(m) {
    clearThrowPreview();
    clearAudienceEffects();
    state.tomatoUntil = 0;
    for (const id of m.ids) {
      const pickup = pickups.get(id);
      if (pickup) disposePickup(pickup);
      pickups.delete(id);
    }
  },
};
