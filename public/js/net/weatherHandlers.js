import { setStorm } from '../fx/weather.js';
import { warnStrike, clearStrikes } from '../fx/lightning.js';
import { announce } from '../ui/matchHud.js';
import { state, remotes } from '../state.js';

export const weatherHandlers = {
  // Bão bắt đầu / tạnh (server quyết định; chỉ có trong trận). `fade`: mưa to / tạnh dần trong ngần này mili giây.
  weather(m) {
    setStorm(m.storm, m.fade);
    if (m.storm) announce('BÃO ĐẾN! ĐỪNG ĐỨNG TỤM LẠI');
    else clearStrikes();
  },

  // Sét sắp đánh: vòng sáng cảnh báo dưới đất; sát thương do server tính (đi qua 'hit').
  lightning(m) {
    warnStrike(m);
  },
  stun(m) {
    const until = performance.now() + m.ms;
    if (m.id === state.myId) {
      state.stunnedUntil = until;
      state.attacking = false;
    } else {
      const remote = remotes.get(m.id);
      if (remote) remote.stunnedUntil = until;
    }
  },
};
