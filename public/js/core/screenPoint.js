// Đưa một điểm trong thế giới lên màn hình (pixel) để chỉ báo bằng HTML. Hàm thuần, không phụ thuộc gì khác.
//   dir    - vector từ mắt tới điểm đó (thế giới)
//   axes   - { forward, right, up } của camera (player/aim.js `aimAxes`)
//   fov    - góc nhìn dọc (radian, như camera Babylon)
//   margin - điểm cách mép màn hình dưới ngần này pixel thì coi như ngoài màn hình
// Trả về { onScreen, x, y, angle }. Điểm nằm trong màn hình thì (x, y) là chỗ nó hiện lên. Ngoài màn hình hoặc sau lưng thì (x, y) là chỗ
// trên khung màn hình (cách mép `margin`) nằm đúng hướng cần quay tới điểm đó, `angle` là hướng đó (radian, 0 = sang phải, π/2 = xuống dưới).
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

export function placeOnScreen(dir, axes, fov, width, height, margin) {
  const cx = dot(dir, axes.right);
  const cy = dot(dir, axes.up);
  const cz = dot(dir, axes.forward);
  if (cz > 0.05) {
    const tanHalf = Math.tan(fov / 2);
    const x = (0.5 + (cx / cz / (tanHalf * (width / height))) * 0.5) * width;
    const y = (0.5 - (cy / cz / tanHalf) * 0.5) * height;
    if (x >= margin && x <= width - margin && y >= margin && y <= height - margin) return { onScreen: true, x, y, angle: 0 };
  }
  // Hướng trong mặt phẳng màn hình (y màn hình hướng xuống). Đứng ngay trên/dưới trục nhìn thì chỉ xuống cho có.
  let dx = cx;
  let dy = -cy;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) {
    dx = 0;
    dy = 1;
  } else {
    dx /= length;
    dy /= length;
  }
  const reach = Math.min((width / 2 - margin) / Math.max(Math.abs(dx), 1e-6), (height / 2 - margin) / Math.max(Math.abs(dy), 1e-6));
  return { onScreen: false, x: width / 2 + dx * reach, y: height / 2 + dy * reach, angle: Math.atan2(dy, dx) };
}
