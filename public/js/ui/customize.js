// Tuỳ chỉnh cạnh menu; cập nhật preview và lưu ngay khi chọn.
// Sửa thẳng vào object `look` mà menu.js giữ, nên lúc vào phòng menu.js luôn gửi lựa chọn mới nhất.
import { SHIRT, PANTS, GLOVE, SKIN, HAIR, PATTERNS, randomLook } from './lookOptions.js';
import { initPreview, setPreviewLook } from './preview.js';
import { initFaceUpload } from './faceUpload.js';
import { DEFAULT_LOOK } from '../config.js';

let look = null;
let showFace = () => {};
let onChange = () => {};
const buttons = [];
const faceError = document.getElementById('face-error');

function refresh() {
  for (const b of buttons) {
    const selected = look[b.key] === b.value;
    b.el.classList.toggle('on', selected);
    b.el.setAttribute('aria-pressed', String(selected));
  }
  showFace(look.face);
  setPreviewLook(look);
  onChange();
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

export function initCustomize(sharedLook, save) {
  look = sharedLook;
  onChange = save;
  const swatches = { shirt: SHIRT, pants: PANTS, glove: GLOVE, skin: SKIN, hair: HAIR };
  for (const [key, colors] of Object.entries(swatches)) {
    for (const color of colors) {
      addOption(key, color, 'sw', (el) => {
        el.style.background = color;
        el.setAttribute('aria-label', `${document.getElementById('opt-' + key).previousElementSibling.textContent}: ${color}`);
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
}

// Gọi sau khi màn hình tuỳ chỉnh đã hiện (khung xem trước cần có kích thước thật mới dựng được).
export function openCustomize() {
  initPreview();
  refresh();
}
