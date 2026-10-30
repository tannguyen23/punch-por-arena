import { state } from '../state.js';
import { announce } from '../ui/matchHud.js';

const ERRORS = {
  unavailable: 'Không thể thay băng lúc này.',
  full: 'Băng đạn đã đầy.',
  empty: 'Hết đạn dự trữ.',
};

export const reloadHandlers = {
  reloading(m) {
    if (state.weapon !== m.weapon) return;
    state.reloading = true;
    state.reloadEndsAt = performance.now() + m.ms;
    state.lastFireAt = 0;
  },
  reloaderror(m) {
    announce(ERRORS[m.reason] ?? 'Không thể thay băng.');
  },
};
