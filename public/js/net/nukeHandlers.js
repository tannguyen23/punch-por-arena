import { startNuke, detonateNuke } from '../fx/nuke.js';
import { announce } from '../ui/matchHud.js';

// Radio gọi bom hạt nhân: server báo lúc gọi ('nuke', kèm các mốc thời gian) và lúc bom nổ ('nukeboom', mọi người cùng mất máu).
export const nukeHandlers = {
  nuke(m) {
    startNuke(m);
    announce('BOM HẠT NHÂN ĐANG TỚI!');
  },

  nukeboom(m) {
    detonateNuke(m);
  },
};
