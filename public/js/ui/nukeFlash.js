import { NUKE } from '../config.js';

const el = document.getElementById('nuke-flash');

let fadeTimer = null;

// Vụ nổ hạt nhân: màn hình trắng xoá ngay lập tức, giữ kín một lúc rồi tan dần để lộ khối mây nấm phía sau.
export function whiteout() {
  clearTimeout(fadeTimer);
  el.style.transition = 'none';
  el.style.opacity = 1;
  fadeTimer = setTimeout(() => {
    el.style.transition = `opacity ${NUKE.flash.fadeMs}ms ease-out`;
    el.style.opacity = 0;
  }, NUKE.flash.holdMs);
}

// Sang trận mới / về phòng chờ: bỏ màn hình trắng đang dở.
export function clearWhiteout() {
  clearTimeout(fadeTimer);
  el.style.transition = 'none';
  el.style.opacity = 0;
}
