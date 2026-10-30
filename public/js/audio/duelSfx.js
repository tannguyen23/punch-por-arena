import { audio, filteredNoise, note } from './core.js';

export function tomatoSplat() {
  if (!audio.ctx) return;
  filteredNoise({ type: 'lowpass', freq: 700, dur: 0.14, peak: 0.45 });
  note({ freq: 180, slideTo: 65, dur: 0.1, peak: 0.25 });
}
