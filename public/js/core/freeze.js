import { state } from '../state.js';

// Đang đứng hình: phần mở đầu của sự kiện, cả phòng đứng yên đọc luật (server cũng chặn, xem server/game/restrictions.js).
export const isFrozen = () => state.event !== null && performance.now() < state.event.introEndsAt;
