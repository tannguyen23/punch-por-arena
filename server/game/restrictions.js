// Điều kiện chặn hành động chung cho combat / shooting / grenades / drops / radioCall / pickups. Không require file nào khác của game
// để các file đó dùng được mà không tạo import vòng.

// Đang đứng hình (phần mở đầu của sự kiện, xem events.js): không ai di chuyển, đánh, nhặt hay nhận sát thương.
const isFrozen = (room, now = Date.now()) => now < room.frozenUntil;

// Không được đánh / bắn / ném / vứt / nhặt: đang đứng hình, hoặc đang hoá chó (chỉ được chạy).
const cantAct = (room, p) => p.dog || isFrozen(room);

module.exports = { isFrozen, cantAct };
