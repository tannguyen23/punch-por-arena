// Tiếng súng, tên lửa và vụ nổ (tổng hợp, không dùng file). Hàm nào cũng nhận (pan, gain) để dùng được với Sfx.at.
import { audio, filteredNoise, note } from './core.js';

// Súng lục: tiếng nổ đanh, ngắn và một tiếng "bụp" trầm.
export function pistolShot(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'bandpass', freq: 2200, q: 0.7, dur: 0.12, peak: 1, pan, gain });
  filteredNoise({ type: 'lowpass', freq: 600, dur: 0.18, peak: 0.8, pan, gain });
  note({ freq: 180, slideTo: 60, dur: 0.12, peak: 0.6, attack: 0.002, pan, gain });
}

// AK: dày và gắt hơn súng lục, đuôi ngắn để bắn liên tục không bị nhoè.
export function rifleShot(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'bandpass', freq: 1400, q: 0.6, dur: 0.09, peak: 1, pan, gain });
  filteredNoise({ type: 'lowpass', freq: 420, dur: 0.14, peak: 0.9, pan, gain });
  note({ freq: 140, slideTo: 50, type: 'triangle', dur: 0.1, peak: 0.7, attack: 0.002, pan, gain });
}

// Phóng tên lửa: tiếng "phụt" và tiếng xì của động cơ.
export function rocketLaunch(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'lowpass', freq: 300, dur: 0.3, peak: 1, pan, gain });
  filteredNoise({ type: 'highpass', freq: 3000, delay: 0.03, dur: 0.6, peak: 0.35, attack: 0.05, pan, gain });
  note({ freq: 90, slideTo: 40, dur: 0.3, peak: 0.8, attack: 0.003, pan, gain });
}

// Vụ nổ: tiếng ầm trầm kéo dài và tiếng vỡ.
export function explosion(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'lowpass', freq: 180, dur: 1.4, peak: 1.4, attack: 0.005, pan, gain });
  filteredNoise({ type: 'lowpass', freq: 1200, dur: 0.35, peak: 0.9, pan, gain });
  note({ freq: 70, slideTo: 28, dur: 0.9, peak: 1, attack: 0.004, pan, gain });
}

// Bóp cò khi hết đạn: tiếng "cạch".
export function dryFire(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  filteredNoise({ type: 'highpass', freq: 2500, dur: 0.03, peak: 0.5, pan, gain });
}

export const kinds = { pistolShot, rifleShot, rocketLaunch, explosion };
