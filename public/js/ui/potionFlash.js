const el = document.getElementById('potion-vignette');

// Hoạt ảnh loé xong thì gỡ lớp, lần sau mới thêm lại được.
el.addEventListener('animationend', (e) => e.target === el && el.classList.remove('burst'));

// Màn hình loé màu nước thuốc: viền sáng mạnh + một lớp màu phủ toàn màn hình, tan dần trong khoảng một giây rưỡi.
// `strength` 0–1 (lúc hết thuốc nhẹ hơn lúc uống).
export function flashPotion(color, strength = 1) {
  el.style.setProperty('--potion-color', color);
  el.style.setProperty('--strength', strength);
  el.classList.remove('burst');
  void el.offsetWidth; // cho trình duyệt thấy lớp đã gỡ để hoạt ảnh chạy lại từ đầu
  el.classList.add('burst');
}

// Viền màu nhạt giữ nguyên suốt thời gian đang có thuốc; null = tắt.
export function setPotionTint(color) {
  el.classList.toggle('on', color !== null);
  if (color !== null) el.style.setProperty('--potion-color', color);
}
