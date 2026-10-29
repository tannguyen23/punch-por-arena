// Tiếng máy bay chở hòm tiếp tế: kêu liên tục, người gọi chỉnh lệch trái/phải và độ lớn mỗi khung hình theo vị trí máy bay.
import { audio } from './core.js';

const SMOOTH_S = 0.1; // đổi âm lượng/pan mượt để không nghe tiếng lách cách

// Trả về { set(pan, gain), stop() }. Chưa có âm thanh (chưa bấm vào trang) thì trả về bản câm.
export function planeHum() {
  if (!audio.ctx) return { set() {}, stop() {} };
  const { ctx } = audio;
  const out = ctx.createGain();
  out.gain.value = 0;
  const panner = ctx.createStereoPanner();
  out.connect(panner);
  panner.connect(audio.master);

  // Hai dao động răng cưa lệch nhau một chút (tiếng động cơ cánh quạt "u u"), qua bộ lọc thấp cho đỡ chói.
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 380;
  low.connect(out);
  const oscillators = [62, 64.5, 125].map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.connect(low);
    osc.start();
    return osc;
  });

  return {
    set(pan, gain) {
      const t = ctx.currentTime;
      panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, SMOOTH_S);
      out.gain.setTargetAtTime(gain * 0.35, t, SMOOTH_S);
    },
    stop() {
      out.gain.setTargetAtTime(0, ctx.currentTime, SMOOTH_S);
      oscillators.forEach((osc) => osc.stop(ctx.currentTime + 0.5));
    },
  };
}
