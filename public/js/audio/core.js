// Nền tảng Web Audio dùng chung cho mọi file âm thanh: context, đầu ra có pan, envelope, tiếng ồn và một nốt.
// `audio.ctx` là null cho tới khi người chơi bấm vào trang (trình duyệt chỉ cho phát tiếng sau thao tác của người dùng).
// Mọi tiếng đi qua `master` rồi bộ lọc `muffle` (bình thường để lọt hết; bị choáng thì nghẹt lại, xem muffle()).
// `ears` là tiếng ù trong tai: không bị nghẹt nên nối thẳng ra loa, tắt tiếng cũng tắt theo.
export const audio = { ctx: null, master: null, muffle: null, ears: null, capture: null, noiseBuf: null, muted: false };

const OPEN_FREQ = 20000; // bộ lọc `muffle` mở hết cỡ

export function init() {
  if (!audio.ctx) {
    const ctx = new AudioContext();
    audio.ctx = ctx;
    audio.master = ctx.createGain();
    audio.muffle = ctx.createBiquadFilter();
    audio.muffle.type = 'lowpass';
    audio.muffle.frequency.value = OPEN_FREQ;
    audio.master.connect(audio.muffle);
    audio.muffle.connect(ctx.destination);
    audio.ears = ctx.createGain();
    audio.ears.connect(ctx.destination);
    audio.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = audio.noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
}

// Đầu ra phụ cho chế độ ghi hình (?record=1): chép đúng tiếng đã qua `master` (bấm M tắt tiếng thì bản ghi cũng câm) ra một
// MediaStream. Chỉ có sau khi âm thanh đã mở (một cú bấm vào trang), chưa có thì trả null và bản ghi không tiếng.
export function captureAudioStream() {
  if (!audio.ctx || !audio.master) return null;
  if (!audio.capture) {
    audio.capture = audio.ctx.createMediaStreamDestination();
    audio.muffle.connect(audio.capture);
    audio.ears.connect(audio.capture);
  }
  return audio.capture.stream;
}

export function toggleMute() {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 1;
  if (audio.ears) audio.ears.gain.value = audio.muted ? 0 : 1;
  return audio.muted;
}

// Mọi tiếng nghẹt lại (lọc thấp tới `freq`) rồi trong `seconds` giây trở lại bình thường.
export function muffle(seconds, freq) {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime;
  const f = audio.muffle.frequency;
  f.cancelScheduledValues(t);
  f.setValueAtTime(freq, t);
  f.setValueAtTime(freq, t + seconds * 0.4);
  f.exponentialRampToValueAtTime(OPEN_FREQ, t + seconds);
}

// Tạo đầu ra có chỉnh âm lượng và trái/phải; trả về node để nối nguồn âm vào.
export function output(pan, gain) {
  const g = audio.ctx.createGain();
  g.gain.value = gain;
  const p = audio.ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  g.connect(p);
  p.connect(audio.master);
  return g;
}

// Envelope: lên nhanh tới peak rồi giảm theo hàm mũ.
export function envelope(node, t, peak, attack, dur) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.linearRampToValueAtTime(peak, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

// Tiếng ồn trắng (nguồn chưa nối); `loop` để kêu dài hơn bộ đệm 0.5 giây.
export function noise(t, dur, loop = false) {
  const src = audio.ctx.createBufferSource();
  src.buffer = audio.noiseBuf;
  src.loop = loop;
  src.start(t);
  if (dur !== undefined) src.stop(t + dur);
  return src;
}

// Tiếng ồn qua bộ lọc `type` ở tần số `freq` với envelope, nối thẳng ra đầu ra. Gốc của tiếng súng, tiếng nổ, tiếng va.
export function filteredNoise({ type = 'lowpass', freq, q = 1, delay = 0, dur, peak, attack = 0.002, pan = 0, gain = 1 }) {
  const t = audio.ctx.currentTime + delay;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = audio.ctx.createGain();
  envelope(env, t, peak, attack, dur);
  noise(t, dur, dur > 0.5).connect(filter);
  filter.connect(env);
  env.connect(output(pan, gain));
}

// Một nốt: dao động `type` kêu `dur` giây, tuỳ chọn trượt tần số tới `slideTo`, bắt đầu sau `delay` giây.
export function note({ freq, slideTo, type = 'sine', delay = 0, dur = 0.2, peak = 0.5, attack = 0.01, pan = 0, gain = 1 }) {
  const t = audio.ctx.currentTime + delay;
  const osc = audio.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const env = audio.ctx.createGain();
  envelope(env, t, peak, attack, dur);
  osc.connect(env);
  env.connect(output(pan, gain));
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// Lệch trái/phải và độ lớn của nguồn âm ở (x, z) cách người nghe `dist` mét (tính cả độ cao nếu cần), theo hướng nhìn `lyaw`.
export function levelsAt(x, z, lx, lz, lyaw, dist = Math.hypot(x - lx, z - lz)) {
  const dx = x - lx;
  const dz = z - lz;
  const flat = Math.hypot(dx, dz);
  const pan = flat < 0.01 ? 0 : (dx * Math.cos(lyaw) - dz * Math.sin(lyaw)) / Math.max(flat, dist);
  return { pan, gain: 1 / (1 + 0.3 * dist) };
}
