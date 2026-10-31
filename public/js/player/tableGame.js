import { state } from '../state.js';
import { nearestTable } from '../core/tableGame.js';
import { send } from '../net/socket.js';

// Gửi yêu cầu ngồi vào bàn gần nhất; trả về false nếu không có bàn nào gần (phím F cũng là "sẵn sàng" nên input.js cần biết).
export function joinNearbyTable() {
  const table = nearestTable();
  if (table) send({ t: 'table', action: 'join', id: table.id });
  return Boolean(table);
}

export function tableAction(action, cell) {
  if (!state.tableGame || state.tablePending) return;
  state.tablePending = true;
  send({ t: 'table', action, cell });
}
