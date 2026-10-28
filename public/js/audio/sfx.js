// Âm thanh tự tổng hợp bằng Web Audio API, không cần file asset.
let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;

export function init() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 1;
  return muted;
}

// Tạo đầu ra có chỉnh âm lượng và trái/phải; trả về node để nối nguồn âm vào.
function output(pan, gain) {
  const g = ctx.createGain();
  g.gain.value = gain;
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  g.connect(p);
  p.connect(master);
  return g;
}

// Envelope: lên nhanh tới peak rồi giảm theo hàm mũ.
function envelope(node, t, peak, attack, dur) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.linearRampToValueAtTime(peak, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function noise(t, dur) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.start(t);
  src.stop(t + dur);
  return src;
}

export function whoosh(pan = 0, gain = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = noise(t, 0.2);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 1.5;
  band.frequency.setValueAtTime(400, t);
  band.frequency.exponentialRampToValueAtTime(1500, t + 0.15);
  const env = ctx.createGain();
  envelope(env, t, 0.8, 0.04, 0.18);
  src.connect(band);
  band.connect(env);
  env.connect(output(pan, gain));
}

export function impact(pan = 0, gain = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = output(pan, gain);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  const oscEnv = ctx.createGain();
  envelope(oscEnv, t, 1, 0.005, 0.22);
  osc.connect(oscEnv);
  oscEnv.connect(out);
  osc.start(t);
  osc.stop(t + 0.25);

  const click = noise(t, 0.05);
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 2000;
  const clickEnv = ctx.createGain();
  envelope(clickEnv, t, 0.6, 0.002, 0.05);
  click.connect(low);
  low.connect(clickEnv);
  clickEnv.connect(out);
}

export function ko(pan = 0, gain = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.4);
  const env = ctx.createGain();
  envelope(env, t, 0.5, 0.01, 0.45);
  osc.connect(env);
  env.connect(output(pan, gain));
  osc.start(t);
  osc.stop(t + 0.5);
}

// Một nốt: dao động `type` kêu `dur` giây, tuỳ chọn trượt tần số tới `slideTo`, bắt đầu sau `delay` giây.
function note({ freq, slideTo, type = 'sine', delay = 0, dur = 0.2, peak = 0.5, attack = 0.01, pan = 0, gain = 1 }) {
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const env = ctx.createGain();
  envelope(env, t, peak, attack, dur);
  osc.connect(env);
  env.connect(output(pan, gain));
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// Bíp ngắn của đồng hồ đếm ngược.
export function beep(freq = 880, gain = 1) {
  if (!ctx) return;
  note({ freq, type: 'square', dur: 0.1, peak: 0.22, gain });
}

// Còi báo động hai tông khi báo sắp có vũ khí rơi.
export function warning() {
  if (!ctx) return;
  for (let i = 0; i < 3; i++) {
    note({ freq: 740, type: 'square', delay: i * 0.4, dur: 0.18, peak: 0.25 });
    note({ freq: 554, type: 'square', delay: i * 0.4 + 0.2, dur: 0.18, peak: 0.25 });
  }
}

// Tiếng rít khi vũ khí lao xuống từ trên cao, kèm tiếng ầm trầm.
export function drop() {
  if (!ctx) return;
  const t = ctx.currentTime;
  note({ freq: 1800, slideTo: 240, dur: 0.9, peak: 0.4, attack: 0.05 });
  const rumble = noise(t, 0.9);
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 220;
  const env = ctx.createGain();
  envelope(env, t, 0.5, 0.6, 0.9);
  rumble.connect(low);
  low.connect(env);
  env.connect(output(0, 1));
}

// Vũ khí đập xuống đất: bùm trầm, tiếng va và hai nốt lấp lánh.
export function thud(pan = 0, gain = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  note({ freq: 130, slideTo: 35, dur: 0.5, peak: 1, pan, gain });
  const click = noise(t, 0.12);
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 900;
  const env = ctx.createGain();
  envelope(env, t, 0.6, 0.002, 0.12);
  click.connect(low);
  low.connect(env);
  env.connect(output(pan, gain));
  note({ freq: 1568, type: 'triangle', delay: 0.06, dur: 0.45, peak: 0.22, pan, gain });
  note({ freq: 2093, type: 'triangle', delay: 0.12, dur: 0.45, peak: 0.18, pan, gain });
}

// Nhặt được vũ khí: ba nốt đi lên.
export function pickup(pan = 0, gain = 1) {
  if (!ctx) return;
  [660, 880, 1320].forEach((freq, i) => note({ freq, type: 'triangle', delay: i * 0.07, dur: 0.2, peak: 0.35, pan, gain }));
}

// Còi mở đầu trận: hợp âm dâng lên.
export function horn() {
  if (!ctx) return;
  [196, 294, 392].forEach((freq) => note({ freq, type: 'sawtooth', dur: 1.0, peak: 0.28, attack: 0.18 }));
}

// Kết thúc trận: bốn nốt đi lên rồi hợp âm kéo dài.
export function fanfare() {
  if (!ctx) return;
  [523, 659, 784, 1047].forEach((freq, i) => note({ freq, type: 'triangle', delay: i * 0.18, dur: 0.3, peak: 0.4 }));
  [523, 659, 784].forEach((freq) => note({ freq, type: 'sawtooth', delay: 0.8, dur: 1.2, peak: 0.2, attack: 0.05 }));
}

// Tiếng điện giật ngắn cho găng sấm sét: tia chớp trượt tần số và tiếng rè.
export function zap(pan = 0, gain = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  note({ freq: 1500, slideTo: 260, type: 'sawtooth', dur: 0.09, peak: 0.2, attack: 0.003, pan, gain });
  const crackle = noise(t, 0.06);
  const high = ctx.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = 3500;
  const env = ctx.createGain();
  envelope(env, t, 0.35, 0.002, 0.06);
  crackle.connect(high);
  high.connect(env);
  env.connect(output(pan, gain));
}

// Bước xuống / lên khỏi nước: tiếng nước tạt và một tiếng ục trầm.
export function splash(pan = 0, gain = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const spray = noise(t, 0.35);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.8;
  band.frequency.setValueAtTime(1800, t);
  band.frequency.exponentialRampToValueAtTime(500, t + 0.3);
  const env = ctx.createGain();
  envelope(env, t, 0.7, 0.02, 0.33);
  spray.connect(band);
  band.connect(env);
  env.connect(output(pan, gain));
  note({ freq: 180, slideTo: 70, dur: 0.25, peak: 0.5, pan, gain });
}

const kinds = { whoosh, impact, ko, thud, pickup, zap, splash };

// Phát âm tại (x, z) theo góc nhìn của người nghe (lx, lz, lyaw): lệch trái/phải và nhỏ dần theo khoảng cách.
export function at(kind, x, z, lx, lz, lyaw) {
  const dx = x - lx;
  const dz = z - lz;
  const dist = Math.hypot(dx, dz);
  const pan = dist < 0.01 ? 0 : (dx * Math.cos(lyaw) - dz * Math.sin(lyaw)) / dist;
  kinds[kind](pan, 1 / (1 + 0.3 * dist));
}
