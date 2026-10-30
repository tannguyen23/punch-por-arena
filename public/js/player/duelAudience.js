import { state } from '../state.js';
import { duelOf, isFighter } from '../core/duel.js';
import { send } from '../net/socket.js';

// Giữ quyền xử lý phím của khán giả cả ngoài hiệp để không vô tình vứt đồ trong túi thật.
export function throwAudienceItem(kind) {
  const duel = duelOf();
  if (!duel || isFighter(duel)) return false;
  if (duel.stage === 'fight') send({ t: 'duelthrow', kind, yaw: state.yaw, pitch: state.pitch });
  return true;
}
