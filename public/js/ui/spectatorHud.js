// Bảng điều khiển chế độ khán giả: nhắc phím bay và nút bắt đầu / dừng quay. Chỉ hiện khi đã vào phòng.
// DOM nên không lọt vào video. Phần ghi hình nằm ở ui/recording.js.
import { state } from '../state.js';
import { isRecording, recordingMs, toggleRecording } from './recording.js';

const panel = document.getElementById('spectator');
const button = document.getElementById('spectator-record');
const status = document.getElementById('spectator-status');

let shown = false;
let lastText = '';

const clock = (ms) => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export function initSpectatorHud() {
  if (!state.spectator) return;
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleRecording();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); // trả phím cho game (WASD / Space)
  });
}

// Gọi mỗi khung hình: hiện bảng sau khi vào phòng, cập nhật trạng thái quay khi đổi.
export function updateSpectatorHud() {
  if (!state.spectator) return;
  if (shown !== state.joined) {
    shown = state.joined;
    panel.hidden = !shown;
  }
  if (!shown) return;
  const recording = isRecording();
  const text = recording ? `● ĐANG QUAY ${clock(recordingMs())}` : 'Chưa quay';
  if (text === lastText) return;
  lastText = text;
  status.textContent = text;
  status.classList.toggle('live', recording);
  button.classList.toggle('live', recording);
  button.textContent = recording ? 'Dừng & tải file (R)' : 'Bắt đầu quay (R)';
}
