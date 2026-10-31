import { state, remotes } from '../state.js';
import { flightOf } from '../core/throwPath.js';
import { startDash } from '../player/dash.js';
import { startJetFx } from '../fx/jetFx.js';
import { playAt } from './positional.js';

// Tin 'dash' của server (server/game/dash.js). Người dash là mình thì tự bay theo kế hoạch (người khác thấy qua vị trí snapshot);
// người khác thì động cơ của họ phun lửa / khí và quạt quay. Hướng phun = ngược hướng bay.
function backOf([vx, vy, vz]) {
  const length = Math.hypot(vx, vy, vz) || 1;
  return { x: -vx / length, y: -vy / length, z: -vz / length };
}

export const dashHandlers = {
  dash(m) {
    const back = backOf(m.velocity);
    if (m.id === state.myId) {
      if (!state.alive) return;
      const [x, y, z] = m.to;
      startDash(flightOf(m), { x, y, z }, back, m.cooldownMs, { ms: m.glideMs, fall: m.glideFall, easeMs: m.glideEaseMs });
      return;
    }
    const r = remotes.get(m.id);
    if (!r || r.dead) return;
    startJetFx(r.jet, r.root, back, m.duration, m.glideMs);
    playAt('dash', r.root.position);
  },
};
