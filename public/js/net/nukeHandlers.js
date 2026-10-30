import { startNuke, detonateNuke } from '../fx/nuke.js';
import { announce } from '../ui/matchHud.js';

// Radio gọi bom hạt nhân: server báo lúc gọi ('nuke', kèm điểm rơi, vùng nổ và các mốc thời gian) và lúc bom nổ
// ('nukeboom', người trong vùng mất máu). Bom chỉ đánh một vùng nên lời báo giục mọi người chạy khỏi vùng đỏ.
export const nukeHandlers = {
  nuke(m) {
    startNuke(m);
    announce('BOM HẠT NHÂN ĐANG TỚI! CHẠY KHỎI VÙNG ĐỎ!');
  },

  nukeboom(m) {
    detonateNuke(m);
  },
};
