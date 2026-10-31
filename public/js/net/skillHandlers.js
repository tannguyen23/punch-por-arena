import { state } from '../state.js';
import { launchWeaponThrow } from '../fx/skillThrow.js';
import { playAt } from './positional.js';

export const skillHandlers = {
  // Có người ném vũ khí (kể cả mình): vẽ vũ khí bay theo quỹ đạo server tính. Mình đã nghe tiếng vung ngay lúc thả phím.
  skillthrow(m) {
    launchWeaponThrow(m);
    if (m.id !== state.myId) playAt('whoosh', { x: m.from[0], z: m.from[2] });
  },
};
