import { spawnIce } from '../fx/icePatch.js';
import { iceBurst } from '../fx/iceBurst.js';
import { playAt } from './positional.js';

// Lựu đạn băng hết ngòi (tin 'detonate' có `ice`, xem grenadeHandlers.js): băng vỡ, tiếng rắc, rồi vũng băng nếu quả nằm trên đất.
// `ice.frozen` false (rơi xuống nước / nằm trên cầu): chỉ có mảnh băng văng ra, không có vũng.
export function iceDetonated(m) {
  iceBurst(m.at, m.ice.frozen ? m.r : 0);
  playAt('iceFreeze', { x: m.at[0], y: m.at[1], z: m.at[2] });
  if (m.ice.frozen) spawnIce({ id: m.id, at: m.at, r: m.r, life: m.ice.life });
}
