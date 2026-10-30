import { state } from '../state.js';
import { send } from '../net/socket.js';
import { RADIO_STREAK_KILLS } from '../config.js';
import { actionBlocked } from '../core/freeze.js';

// Phím T: gọi máy bay thả hòm chứa radio gọi bom hạt nhân xuống gần mình. Chỉ được khi đã hạ gục liên tiếp đủ RADIO_STREAK_KILLS lần
// mà chưa chết; server kiểm tra lại và đặt chuỗi về 0 (hòm rơi báo về qua tin 'airdrop').
export function callRadio() {
  if (state.event?.kind === 'tnt') return;
  if (state.alive && !actionBlocked() && state.match.phase === 'playing' && state.streak >= RADIO_STREAK_KILLS) send({ t: 'radio' });
}
