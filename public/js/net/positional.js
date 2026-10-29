import { state, remotes } from '../state.js';
import * as Sfx from '../audio/sfx.js';

// Vị trí để phát âm thanh/hiệu ứng: của mình hoặc của người chơi khác (nếu đã có trong sân).
export const positionOf = (id) => (id === state.myId ? state.me : remotes.get(id)?.root.position);

export const playAt = (kind, pos) => pos && Sfx.at(kind, pos.x, pos.z, state.me.x, state.me.z, state.yaw);
