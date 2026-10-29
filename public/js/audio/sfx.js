// Âm thanh tự tổng hợp bằng Web Audio API, không cần file asset.
import { audio, output, envelope, noise, note, levelsAt } from './core.js';
import * as Guns from './gunSfx.js';
import * as Grenades from './grenadeSfx.js';
import * as Weather from './weatherSfx.js';

export { init, toggleMute, levelsAt } from './core.js';
export { pistolShot, rifleShot, rocketLaunch, explosion, dryFire } from './gunSfx.js';
export { planeHum } from './planeHum.js';
export { stunned } from './grenadeSfx.js';
export { rainLoop, thunder } from './weatherSfx.js';

export function whoosh(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime;
  const src = noise(t, 0.2);
  const band = audio.ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 1.5;
  band.frequency.setValueAtTime(400, t);
  band.frequency.exponentialRampToValueAtTime(1500, t + 0.15);
  const env = audio.ctx.createGain();
  envelope(env, t, 0.8, 0.04, 0.18);
  src.connect(band);
  band.connect(env);
  env.connect(output(pan, gain));
}

export function impact(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime;
  const out = output(pan, gain);

  const osc = audio.ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  const oscEnv = audio.ctx.createGain();
  envelope(oscEnv, t, 1, 0.005, 0.22);
  osc.connect(oscEnv);
  oscEnv.connect(out);
  osc.start(t);
  osc.stop(t + 0.25);

  const click = noise(t, 0.05);
  const low = audio.ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 2000;
  const clickEnv = audio.ctx.createGain();
  envelope(clickEnv, t, 0.6, 0.002, 0.05);
  click.connect(low);
  low.connect(clickEnv);
  clickEnv.connect(out);
}

export function ko(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.4);
  const env = audio.ctx.createGain();
  envelope(env, t, 0.5, 0.01, 0.45);
  osc.connect(env);
  env.connect(output(pan, gain));
  osc.start(t);
  osc.stop(t + 0.5);
}

// Bíp ngắn của đồng hồ đếm ngược.
export function beep(freq = 880, gain = 1) {
  if (!audio.ctx) return;
  note({ freq, type: 'square', dur: 0.1, peak: 0.22, gain });
}

// Còi báo động hai tông khi máy bay tiếp tế xuất hiện.
export function warning() {
  if (!audio.ctx) return;
  for (let i = 0; i < 3; i++) {
    note({ freq: 740, type: 'square', delay: i * 0.4, dur: 0.18, peak: 0.25 });
    note({ freq: 554, type: 'square', delay: i * 0.4 + 0.2, dur: 0.18, peak: 0.25 });
  }
}

// Hòm tiếp tế đập xuống đất: bùm trầm, tiếng va và hai nốt lấp lánh.
export function thud(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime;
  note({ freq: 130, slideTo: 35, dur: 0.5, peak: 1, pan, gain });
  const click = noise(t, 0.12);
  const low = audio.ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 900;
  const env = audio.ctx.createGain();
  envelope(env, t, 0.6, 0.002, 0.12);
  click.connect(low);
  low.connect(env);
  env.connect(output(pan, gain));
  note({ freq: 1568, type: 'triangle', delay: 0.06, dur: 0.45, peak: 0.22, pan, gain });
  note({ freq: 2093, type: 'triangle', delay: 0.12, dur: 0.45, peak: 0.18, pan, gain });
}

// Nhặt được vũ khí: ba nốt đi lên.
export function pickup(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  [660, 880, 1320].forEach((freq, i) => note({ freq, type: 'triangle', delay: i * 0.07, dur: 0.2, peak: 0.35, pan, gain }));
}

// Còi mở đầu trận: hợp âm dâng lên.
export function horn() {
  if (!audio.ctx) return;
  [196, 294, 392].forEach((freq) => note({ freq, type: 'sawtooth', dur: 1.0, peak: 0.28, attack: 0.18 }));
}

// Kết thúc trận: bốn nốt đi lên rồi hợp âm kéo dài.
export function fanfare() {
  if (!audio.ctx) return;
  [523, 659, 784, 1047].forEach((freq, i) => note({ freq, type: 'triangle', delay: i * 0.18, dur: 0.3, peak: 0.4 }));
  [523, 659, 784].forEach((freq) => note({ freq, type: 'sawtooth', delay: 0.8, dur: 1.2, peak: 0.2, attack: 0.05 }));
}

// Tiếng điện giật ngắn cho găng sấm sét: tia chớp trượt tần số và tiếng rè.
export function zap(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime;
  note({ freq: 1500, slideTo: 260, type: 'sawtooth', dur: 0.09, peak: 0.2, attack: 0.003, pan, gain });
  const crackle = noise(t, 0.06);
  const high = audio.ctx.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = 3500;
  const env = audio.ctx.createGain();
  envelope(env, t, 0.35, 0.002, 0.06);
  crackle.connect(high);
  high.connect(env);
  env.connect(output(pan, gain));
}

// Bước xuống / lên khỏi nước: tiếng nước tạt và một tiếng ục trầm.
export function splash(pan = 0, gain = 1) {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime;
  const spray = noise(t, 0.35);
  const band = audio.ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.8;
  band.frequency.setValueAtTime(1800, t);
  band.frequency.exponentialRampToValueAtTime(500, t + 0.3);
  const env = audio.ctx.createGain();
  envelope(env, t, 0.7, 0.02, 0.33);
  spray.connect(band);
  band.connect(env);
  env.connect(output(pan, gain));
  note({ freq: 180, slideTo: 70, dur: 0.25, peak: 0.5, pan, gain });
}

const kinds = { whoosh, impact, ko, thud, pickup, zap, splash, ...Guns.kinds, ...Grenades.kinds, ...Weather.kinds };

// Phát âm tại (x, z) theo góc nhìn của người nghe (lx, lz, lyaw): lệch trái/phải và nhỏ dần theo khoảng cách.
export function at(kind, x, z, lx, lz, lyaw) {
  const { pan, gain } = levelsAt(x, z, lx, lz, lyaw);
  kinds[kind](pan, gain);
}
