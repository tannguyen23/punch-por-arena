// Tiếng băng (tổng hợp, không dùng file). Hàm nào cũng nhận (pan, gain) để dùng được với Sfx.at.
import { audio, filteredNoise, note } from './core.js';

// Lựu đạn nổ thành băng: tiếng "rắc" vỡ giòn, chuông thuỷ tinh cao và hơi lạnh xì ra.
export function iceFreeze(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'highpass', freq: 3500, dur: 0.18, peak: 0.9, pan, gain });
  filteredNoise({ type: 'bandpass', freq: 5200, q: 4, delay: 0.04, dur: 0.25, peak: 0.5, pan, gain });
  filteredNoise({ type: 'lowpass', freq: 500, dur: 0.3, peak: 0.7, pan, gain });
  for (const [freq, delay] of [[2400, 0], [3100, 0.05], [3900, 0.1]]) {
    note({ freq, slideTo: freq * 0.7, type: 'triangle', delay, dur: 0.3, peak: 0.25, attack: 0.002, pan, gain });
  }
}

export const kinds = { iceFreeze };
