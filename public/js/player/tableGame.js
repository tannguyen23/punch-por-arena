import { state } from '../state.js';
import { nearestTable } from '../core/tableGame.js';
import { send } from '../net/socket.js';

export function joinNearbyTable() {
  const table = nearestTable();
  if (table) send({ t: 'table', action: 'join', id: table.id });
}

export function tableAction(action, cell) {
  if (!state.tableGame || state.tablePending) return;
  state.tablePending = true;
  send({ t: 'table', action, cell });
}
