import { state } from '../state.js';
import { beginEvent, finishEvent } from '../ui/eventHud.js';
import { clearStrikes } from '../fx/lightning.js';
import { addPoop, clearPoops } from './poopHandlers.js';
import { syncTntCarrier } from './tntHandlers.js';

// Sự kiện solo ngưng sét: bỏ các tia đã hẹn trên máy mình để chúng không đánh xuống võ đài.
function clearDuelStrikes(kind) {
  if (kind === 'duel') clearStrikes();
}

// Người vào giữa lúc đang có sự kiện (`welcome.match.event`, null nếu không có): thấy luật và đồng hồ như mọi người.
export function applyEvent(event) {
  if (!event) return;
  clearDuelStrikes(event.kind);
  beginEvent(event);
  syncTntCarrier();
  event.poops?.forEach(addPoop); // shit chó đã thả trước khi mình vào
}

export const eventHandlers = {
  // Cảnh báo sắp có sự kiện: { kind, in } (ms) — client tự đếm ngược trên banner.
  eventWarn(m) {
    state.eventWarn = { kind: m.kind, at: performance.now() + m.in };
  },

  // Sự kiện bắt đầu: cả phòng đứng hình `introLeft` ms để đọc luật (server cũng chặn mọi hành động trong lúc đó).
  event(m) {
    state.eventWarn = null;
    clearDuelStrikes(m.kind);
    beginEvent(m);
    syncTntCarrier();
  },

  // Sự kiện kết thúc (có kết quả, hoặc bị huỷ vì hết trận / người chơi thoát).
  eventEnd(m) {
    finishEvent(m);
    clearPoops();
  },
};
