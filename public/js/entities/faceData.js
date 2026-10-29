import { FACE_IMAGE } from '../config.js';

const BYTES = FACE_IMAGE.width * FACE_IMAGE.height * 4;

// Ảnh mặt đi qua mạng dưới dạng điểm ảnh RGBA thô (không phải PNG/JPEG) mã hoá base64: server chỉ cần kiểm tra độ dài
// và client khác không phải giải mã ảnh do người lạ gửi.
export function encodeFace(rgba) {
  let binary = '';
  for (let i = 0; i < rgba.length; i += 0x2000) binary += String.fromCharCode(...rgba.subarray(i, i + 0x2000));
  return btoa(binary);
}

// Trả về null nếu không phải ảnh mặt hợp lệ (sai độ dài hoặc không phải base64).
export function decodeFace(text) {
  try {
    const binary = atob(text);
    return binary.length === BYTES ? Uint8ClampedArray.from(binary, (c) => c.charCodeAt(0)) : null;
  } catch {
    return null;
  }
}
