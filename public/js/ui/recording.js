// Ghi hình thủ công ở chế độ khán giả (?mode=spectator): bấm phím R hoặc nút trong ui/spectatorHud.js để bắt đầu / dừng.
// File ghi xong tự tải về folder tải xuống của trình duyệt (`punch-<mã phòng>-<ngày giờ>.webm`). HUD là DOM nên không lọt vào video
// (canvas.captureStream chỉ lấy khung hình 3D); tay / chân / súng trong scene bị ẩn. Bản ghi nằm trong RAM tới lúc dừng.
import { canvas } from '../core/scene.js';
import { captureAudioStream } from '../audio/core.js';
import { state } from '../state.js';
import { SPECTATOR } from '../config.js';

const TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];

let media = null; // MediaRecorder đang chạy
let video = null; // stream lấy từ canvas; phải dừng track khi xong
let chunks = [];
let mime = '';
let startedAt = 0;
let roomCode = '';

export const isRecording = () => media !== null;
export const recordingMs = () => (media ? performance.now() - startedAt : 0);

function supported(type) {
  return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(type);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Tải Blob về folder tải xuống (trình duyệt không cho chọn chỗ lưu khi chưa xin quyền).
function save(blob) {
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `punch-${roomCode || 'arena'}-${stamp()}.${ext}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000); // thu hồi sau khi trình duyệt kịp tải
}

function start() {
  if (media || typeof MediaRecorder === 'undefined' || !canvas.captureStream) return;
  video = canvas.captureStream(SPECTATOR.record.fps);
  let sound = null;
  try { sound = captureAudioStream(); } catch { /* trình duyệt không cho tách âm thanh: ghi hình không tiếng */ }
  const stream = new MediaStream([...video.getVideoTracks(), ...(sound?.getAudioTracks() ?? [])]);
  mime = TYPES.find(supported) ?? '';
  const options = {
    videoBitsPerSecond: SPECTATOR.record.videoBitsPerSecond,
    audioBitsPerSecond: SPECTATOR.record.audioBitsPerSecond,
  };
  if (mime) options.mimeType = mime;
  chunks = [];
  try {
    media = new MediaRecorder(stream, options);
  } catch {
    video.getVideoTracks().forEach((track) => track.stop());
    video = null;
    return;
  }
  media.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  media.onstop = () => {
    const blob = new Blob(chunks, { type: mime || 'video/webm' });
    const longEnough = blob.size > 0 && performance.now() - startedAt >= SPECTATOR.record.minMs;
    chunks = [];
    video?.getVideoTracks().forEach((track) => track.stop());
    video = null;
    media = null;
    if (longEnough) save(blob); // bấm nhầm rồi dừng ngay thì bỏ
  };
  media.start(1000); // gom dữ liệu mỗi giây để không phải giữ cả trận trong một khối
  startedAt = performance.now();
  roomCode = state.room?.code ?? '';
}

function stop() {
  if (media && media.state !== 'inactive') media.stop();
}

export function toggleRecording() {
  if (media) stop(); else start();
}
