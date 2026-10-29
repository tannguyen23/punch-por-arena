// Tiếng shit của con chó (tổng hợp, không dùng file). Hàm nào cũng nhận (pan, gain) để dùng được với Sfx.at.
import { audio, filteredNoise, note } from './core.js';

// Thả ra: tiếng "bịch" ướt trầm.
export function poopDrop(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'lowpass', freq: 400, dur: 0.1, peak: 0.5, pan, gain });
  note({ freq: 220, slideTo: 90, type: 'sine', dur: 0.14, peak: 0.5, pan, gain });
  note({ freq: 140, slideTo: 60, type: 'triangle', delay: 0.07, dur: 0.12, peak: 0.3, pan, gain });
}

// Bị dậm bẹp: tiếng "chẹp" nhão kèm hơi xì.
export function poopSplat(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'bandpass', freq: 700, q: 2, dur: 0.22, peak: 0.8, pan, gain });
  filteredNoise({ type: 'lowpass', freq: 300, delay: 0.05, dur: 0.3, peak: 0.6, pan, gain });
  note({ freq: 160, slideTo: 40, type: 'sawtooth', dur: 0.25, peak: 0.35, pan, gain });
  note({ freq: 90, slideTo: 150, type: 'square', delay: 0.1, dur: 0.12, peak: 0.15, pan, gain });
}

export const kinds = { poopDrop, poopSplat };
