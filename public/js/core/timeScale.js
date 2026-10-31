// Quay chậm cục bộ (chỉ máy mình, không đụng tới server): main.js nhân dt của mọi hàm cập nhật với `timeScale()`.
// Dùng ở khoảnh khắc hạ gục. Hết `ms` thì tự về 1; gọi lại khi đang quay chậm thì lấy mức chậm hơn / lâu hơn.
let scale = 1;
let until = 0;

export function slowMotion(newScale, ms) {
  const now = performance.now();
  scale = now < until ? Math.min(scale, newScale) : newScale;
  until = Math.max(until, now + ms);
}

export function timeScale() {
  if (scale !== 1 && performance.now() >= until) scale = 1;
  return scale;
}
