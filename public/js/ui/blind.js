import { FLASHBANG } from '../config.js';

const el = document.getElementById('blind');

let blindUntil = 0; // mốc performance.now() hết choáng; lần choáng nhẹ hơn không được rút ngắn lần đang choáng nặng

// Lựu đạn choáng: màn hình trắng xoá (độ đậm `peak`), giữ một lúc rồi mờ dần, tổng cộng `ms` mili giây.
export function blind(ms, peak) {
  const until = performance.now() + ms;
  if (until <= blindUntil) return;
  blindUntil = until;
  const hold = ms * FLASHBANG.holdFraction;
  el.style.transition = 'none';
  el.style.opacity = peak;
  void el.offsetWidth; // áp độ đậm ngay rồi mới bắt đầu mờ dần
  el.style.transition = `opacity ${ms - hold}ms ease-in ${hold}ms`;
  el.style.opacity = 0;
}
