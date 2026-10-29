import { state } from '../state.js';
import { PLAYER_RADIUS } from '../config.js';

// Thân hình theo thuốc đang uống (id thuốc, falsy = bình thường). Chỉ số từng loại do server gửi (state.potionTypes); server nhân kích thước
// vào mắt, thân khi tính đạn (server/game/raycast.js) nên `sizeOf` ở đây phải cho cùng kết quả.
const typeOf = (id) => (id ? (state.potionTypes[id] ?? null) : null);

export const sizeOf = (id) => typeOf(id)?.scale ?? 1;
export const speedOf = (id) => typeOf(id)?.speedMult ?? 1;
// Bán kính va chạm (tường, vật cản, người khác) không theo kích thước thật: người to vẫn lách được giữa cây, tường.
export const radiusOf = (id) => PLAYER_RADIUS * (typeOf(id)?.collision ?? 1);
