import { beginEvent, finishEvent } from '../ui/eventHud.js';

// Người vào giữa lúc đang có sự kiện (`welcome.match.event`, null nếu không có): thấy luật và đồng hồ như mọi người.
export function applyEvent(event) {
  if (event) beginEvent(event);
}

export const eventHandlers = {
  // Sự kiện bắt đầu: cả phòng đứng hình `introLeft` ms để đọc luật (server cũng chặn mọi hành động trong lúc đó).
  event(m) {
    beginEvent(m);
  },

  // Sự kiện kết thúc (có kết quả, hoặc bị huỷ vì hết trận / người chơi thoát).
  eventEnd(m) {
    finishEvent(m);
  },
};
