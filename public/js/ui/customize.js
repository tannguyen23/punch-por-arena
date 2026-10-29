// Màn hình tuỳ chỉnh ngoại hình (không bắt buộc, mở từ nút "Tuỳ chỉnh nhân vật" ở màn hình đầu).
// Sửa thẳng vào object `look` mà menu.js giữ, nên lúc vào phòng menu.js luôn gửi lựa chọn mới nhất.
import { SHIRT, PANTS, GLOVE, SKIN, HAIR, PATTERNS, randomLook } from './lookOptions.js';
import { initPreview, setPreviewLook, stopPreview } from './preview.js';
import { initFaceUpload } from './faceUpload.js';
import { DEFAULT_LOOK } from '../config.js';

let look = null;
let showFace = () => {};
const buttons = [];
const faceError = document.getElementById('face-error');

function refresh() {
  for (const b of buttons) b.el.classList.toggle('on', look[b.key] === b.value);
  showFace(look.face);
  setPreviewLook(look);
}

function addOption(key, value, className, setup) {
  const el = document.createElement('button');
  el.className = className;
  setup(el);
  el.addEventListener('click', () => {
    look[key] = value;
    refresh();
  });
  document.getElementById('opt-' + key).append(el);
  buttons.push({ el, key, value });
}

// `onDone` được gọi khi bấm "Xong" (menu.js lưu lựa chọn và quay về màn hình đầu).
export function initCustomize(sharedLook, onDone) {
  look = sharedLook;
  const swatches = { shirt: SHIRT, pants: PANTS, glove: GLOVE, skin: SKIN, hair: HAIR };
  for (const [key, colors] of Object.entries(swatches)) {
    for (const color of colors) {
      addOption(key, color, 'sw', (el) => {
        el.style.background = color;
      });
    }
  }
  PATTERNS.forEach((label, index) => {
    addOption('pattern', index, 'pat', (el) => {
      el.textContent = label;
    });
  });
  showFace = initFaceUpload({
    onChange(face) {
      faceError.textContent = '';
      look.face = face;
      refresh();
    },
    onError: () => (faceError.textContent = 'Không đọc được ảnh này'),
  });
  document.getElementById('random').addEventListener('click', () => {
    Object.assign(look, randomLook()); // randomLook không có ảnh mặt: ảnh mặt là lựa chọn riêng, giữ nguyên
    refresh();
  });
  document.getElementById('look-default').addEventListener('click', () => {
    Object.assign(look, DEFAULT_LOOK);
    refresh();
  });
  document.getElementById('customize-done').addEventListener('click', () => {
    stopPreview(); // khung xem trước chỉ chạy khi đang tuỳ chỉnh, đỡ tốn GPU ở các màn hình khác
    onDone();
  });
}

// Gọi sau khi màn hình tuỳ chỉnh đã hiện (khung xem trước cần có kích thước thật mới dựng được).
export function openCustomize() {
  initPreview();
  refresh();
}
