// Phát file âm thanh trong public/sound (mp3) qua cùng đầu ra với các tiếng tổng hợp, nên tắt tiếng (M) cũng tắt các file này.
import { audio, output } from './core.js';

const buffers = new Map(); // tên file → Promise<AudioBuffer>

const urlOf = (file) => `/sound/${encodeURIComponent(file)}.mp3`;

// Tải và giải mã trước để lúc cần phát không bị trễ. Gọi lại với cùng tên thì dùng bản đã tải. Lỗi tải chỉ làm clip đó im lặng.
export function loadClip(file) {
  if (!audio.ctx) return Promise.resolve(null);
  if (!buffers.has(file)) {
    buffers.set(
      file,
      fetch(urlOf(file))
        .then((res) => res.arrayBuffer())
        .then((data) => audio.ctx.decodeAudioData(data))
        .catch((err) => {
          console.error(`Không nạp được âm thanh ${file}:`, err);
          return null;
        }),
    );
  }
  return buffers.get(file);
}

// Hẹn phát clip `file` sau `delay` giây (âm = đáng lẽ đã bắt đầu rồi: phát từ đoạn giữa, bỏ qua nếu clip đã hết) với âm lượng `gain`.
// Hẹn giờ trên đồng hồ của Web Audio chứ không theo khung hình, nên tab đang ở nền (trình duyệt dừng vẽ) vẫn nghe đúng lúc.
// `fadeAt` (giây kể từ đầu clip): tới đó thì nhỏ dần trong `fade` giây rồi tắt.
// Trả về { stop(fadeSeconds) } để dừng / nhỏ dần giữa chừng (dùng được cả khi clip chưa tải xong hoặc chưa tới giờ phát).
export function playClip(file, gain = 1, { delay = 0, fadeAt = null, fade = 1 } = {}) {
  const requestedAt = performance.now();
  let source = null;
  let gainNode = null;
  let stopped = false;
  loadClip(file).then((buffer) => {
    if (!buffer || stopped) return;
    const wait = delay - (performance.now() - requestedAt) / 1000; // thời gian tải đã trôi qua tính vào độ trễ
    const offset = Math.max(0, -wait);
    if (offset >= buffer.duration) return;
    const startAt = audio.ctx.currentTime + Math.max(0, wait);
    source = audio.ctx.createBufferSource();
    source.buffer = buffer;
    gainNode = output(0, gain);
    source.connect(gainNode);
    source.start(startAt, offset);
    if (fadeAt === null) return;
    const fadeStart = startAt + Math.max(0, fadeAt - offset);
    gainNode.gain.setValueAtTime(gain, fadeStart);
    gainNode.gain.linearRampToValueAtTime(0.0001, fadeStart + fade);
    source.stop(fadeStart + fade + 0.05);
  });
  return {
    stop(fadeSeconds = 0) {
      if (stopped) return;
      stopped = true;
      if (!source) return;
      const t = audio.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(t);
      gainNode.gain.setValueAtTime(gain, t);
      gainNode.gain.linearRampToValueAtTime(0.0001, t + fadeSeconds);
      source.stop(t + fadeSeconds + 0.05);
    },
  };
}
