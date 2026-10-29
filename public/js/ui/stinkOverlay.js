import { state } from '../state.js';
import { POOP } from '../config.js';

const overlay = document.getElementById('stink');
const text = document.getElementById('stink-text');

let shownFor = null; // `stinkStartedAt` của lần dậm phải đang hiện chữ (dậm phải lần nữa thì hiện chữ lại)

// Dậm phải shit của chó: sọc khói thối xanh xỉn / nâu bốc lên phủ màn hình (mờ dần vào lúc đầu và lúc cuối) kèm dòng chữ ở giữa vài giây đầu.
// Hết giờ, chết hoặc sang trận mới thì tắt. Gọi mỗi khung hình.
export function updateStinkOverlay() {
  const now = performance.now();
  const active = state.alive && now < state.stinkUntil;
  overlay.hidden = !active;
  if (!active) {
    text.hidden = true;
    shownFor = null;
    return;
  }
  const elapsed = now - state.stinkStartedAt;
  const left = state.stinkUntil - now;
  overlay.style.opacity = POOP.overlayOpacity * Math.min(1, elapsed / POOP.fadeInMs, left / POOP.fadeOutMs);
  if (shownFor !== state.stinkStartedAt) {
    shownFor = state.stinkStartedAt;
    text.hidden = true;
    void text.offsetWidth; // gỡ ra rồi hiện lại để hoạt ảnh chữ chạy lại từ đầu
    text.hidden = false;
  }
  if (elapsed > POOP.textMs) text.hidden = true;
}
