// Âm thanh tự tổng hợp bằng Web Audio API, không cần file asset.
const Sfx = (() => {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let muted = false;

  function init() {
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

  function toggleMute() {
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

  function whoosh(pan = 0, gain = 1) {
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

  function impact(pan = 0, gain = 1) {
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

  function ko(pan = 0, gain = 1) {
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

  const kinds = { whoosh, impact, ko };

  // Phát âm tại (x, z) theo góc nhìn của người nghe (lx, lz, lyaw): lệch trái/phải và nhỏ dần theo khoảng cách.
  function at(kind, x, z, lx, lz, lyaw) {
    const dx = x - lx;
    const dz = z - lz;
    const dist = Math.hypot(dx, dz);
    const pan = dist < 0.01 ? 0 : (dx * Math.cos(lyaw) - dz * Math.sin(lyaw)) / dist;
    kinds[kind](pan, 1 / (1 + 0.3 * dist));
  }

  return { init, toggleMute, whoosh, impact, ko, at };
})();
