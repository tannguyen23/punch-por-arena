import { FACE_IMAGE } from '../config.js';
import { encodeFace, decodeFace } from '../entities/faceData.js';

// Cắt giữa ảnh cho vừa tỉ lệ khung mặt (phủ kín khung, không bị méo) rồi thu nhỏ về đúng cỡ FACE_IMAGE.
async function readFace(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const { width, height } = FACE_IMAGE;
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    return encodeFace(ctx.getImageData(0, 0, width, height).data);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Nút chọn / bỏ ảnh mặt trong menu. onChange(face) nhận chuỗi mã hoá hoặc null (bỏ ảnh); onError() khi không đọc được ảnh.
// Trả về hàm hiện ảnh mặt hiện tại ra ô xem trước.
export function initFaceUpload({ onChange, onError }) {
  const { width, height } = FACE_IMAGE;
  const thumb = document.getElementById('face-thumb');
  const input = document.getElementById('face-file');
  const clear = document.getElementById('face-clear');
  thumb.width = width;
  thumb.height = height;
  const ctx = thumb.getContext('2d');

  document.getElementById('face-pick').addEventListener('click', () => input.click());
  clear.addEventListener('click', () => onChange(null));
  input.addEventListener('change', async () => {
    const [file] = input.files;
    input.value = ''; // để chọn lại đúng tệp đó vẫn kích hoạt sự kiện
    if (!file) return;
    try {
      onChange(await readFace(file));
    } catch {
      onError();
    }
  });

  return (face) => {
    const rgba = decodeFace(face);
    ctx.clearRect(0, 0, width, height);
    if (rgba) ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
    clear.disabled = !rgba;
  };
}
