import { state } from '../state.js';
import { groundAt, heightAt, isSupported } from '../core/terrain.js';
import { DUEL_THROW_PREVIEW } from '../config.js';

// Kiểu chung của mọi đường xem trước (quả ném của khán giả, skill ném vũ khí, nhảy đấm trời giáng) để giao diện đồng nhất: xanh = hợp lệ,
// đỏ = không có chỗ rơi, vàng = đang hồi chiêu. `size` (tuỳ chọn) là đường kính vòng điểm rơi, mặc định cỡ vòng chuẩn; `offset` = false khi đường không xuất phát từ mắt (cú nhảy), khỏi lệch đoạn đầu. Vẽ ở fx/throwPreview.js.
// Thế giới để dự đoán đường bay (core/throwPath.js predictThrow): địa hình, tường chặn đòn (dây ring thì không), và võ đài nếu có.
export const throwWorld = (extra = {}) => ({
  groundAt, heightAt, isSupported, ring: null, walls: state.walls.filter((w) => w.kind !== 'rope'), ...extra,
});

export function makePreview(path, { valid = path.valid, waiting = false, size = DUEL_THROW_PREVIEW.diameter, offset = true } = {}) {
  return { path, size, offset, color: waiting ? DUEL_THROW_PREVIEW.wait : valid ? DUEL_THROW_PREVIEW.valid : DUEL_THROW_PREVIEW.invalid };
}
