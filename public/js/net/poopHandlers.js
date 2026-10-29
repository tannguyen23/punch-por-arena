import { state, poops } from '../state.js';
import { createPoop, disposePoop } from '../entities/poop.js';
import { stinkBurst } from '../fx/poopFx.js';
import { playAt } from './positional.js';
import { POOP } from '../config.js';

// Kỹ năng thả shit của con chó (server/game/poop.js).
export function addPoop(poop) {
  if (!poops.has(poop.id)) poops.set(poop.id, createPoop(poop));
}

// Hết sự kiện / sang trận mới: dọn hết shit còn trên sân.
export function clearPoops() {
  for (const poop of poops.values()) disposePoop(poop);
  poops.clear();
}

export const poopHandlers = {
  poop(m) {
    addPoop(m.poop);
    playAt('poopDrop', m.poop);
  },

  // Có người dậm phải (kể cả mình): cục shit biến mất, bốc khói thối.
  poopgone(m) {
    const poop = poops.get(m.id);
    if (!poop) return;
    playAt('poopSplat', poop.root.position);
    stinkBurst(poop.root.position);
    disposePoop(poop);
    poops.delete(m.id);
  },

  // Mình dậm phải: chậm lại và bị che tầm nhìn trong `ms` (player/stink.js, ui/stinkOverlay.js).
  poophit(m) {
    const now = performance.now();
    state.stinkStartedAt = now;
    state.stinkUntil = now + m.ms;
    state.shake = Math.max(state.shake, POOP.hitShake);
  },
};
