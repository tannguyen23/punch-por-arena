// Tiếng uống thuốc (tổng hợp, không dùng file).
import { audio, filteredNoise, note } from './core.js';

// Ực ực ực: ba ngụm nước trầm, kèm một tiếng "bộp" nhẹ của nút chai. Trả về thời gian (giây) tới khi xong.
function gulps(gain) {
  note({ freq: 700, slideTo: 300, type: 'triangle', dur: 0.08, peak: 0.25, gain });
  for (let i = 0; i < 3; i++) {
    const delay = 0.1 + i * 0.15;
    filteredNoise({ type: 'lowpass', freq: 500 + i * 120, dur: 0.12, peak: 0.55, delay, gain });
    note({ freq: 190 - i * 25, slideTo: 90, type: 'sine', delay, dur: 0.13, peak: 0.4, gain });
  }
  return 0.6;
}

// Tiếng đổi cỡ. `bigger`: to ra thì tiếng rền dâng lên rồi dội một nhịp trầm; nhỏ lại thì tiếng the thé trượt lên rồi "píp".
function resize(bigger, delay, gain) {
  if (bigger) {
    note({ freq: 55, slideTo: 240, type: 'sawtooth', delay, dur: 0.9, peak: 0.28, attack: 0.3, gain });
    filteredNoise({ type: 'lowpass', freq: 400, dur: 0.9, peak: 0.5, delay, attack: 0.5, gain });
    note({ freq: 110, slideTo: 35, type: 'sine', delay: delay + 0.9, dur: 0.6, peak: 0.8, attack: 0.005, gain });
    filteredNoise({ type: 'lowpass', freq: 250, dur: 0.5, peak: 0.9, delay: delay + 0.9, gain });
  } else {
    note({ freq: 500, slideTo: 2600, type: 'triangle', delay, dur: 0.6, peak: 0.28, attack: 0.1, gain });
    note({ freq: 1000, slideTo: 3900, type: 'sine', delay: delay + 0.1, dur: 0.5, peak: 0.12, gain });
    note({ freq: 3000, slideTo: 1800, type: 'triangle', delay: delay + 0.62, dur: 0.2, peak: 0.35, attack: 0.003, gain });
  }
}

// `growing`: thuốc hoá to; `drinking`: vừa uống (false = vừa hết thuốc, cỡ người đảo ngược lại nên tiếng cũng ngược lại và nhỏ hơn).
export function potionChange(growing, drinking, gain = 1) {
  if (!audio.ctx) return;
  const delay = drinking ? gulps(gain) : 0;
  resize(growing === drinking, delay, gain * (drinking ? 1 : 0.6));
}
