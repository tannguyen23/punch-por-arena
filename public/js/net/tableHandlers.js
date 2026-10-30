import { state } from '../state.js';
import { keys } from '../core/keys.js';
import { announce } from '../ui/matchHud.js';
import { TABLE_ERRORS, TABLE_CLOSED } from '../ui/tableText.js';
import { updateTableGame } from '../ui/tableGame.js';
import { syncTableModels } from '../world/tableModel.js';
import { TABLE_TEXT } from '../ui/tableText.js';
import { updateTableInvites } from '../ui/tableInvites.js';

export function applyTableGames(games) {
  state.tableGames = games.map(({ left, ...game }) => ({ ...game, endsAt: performance.now() + left }));
  const current = state.tableGames.find((game) => game.players.includes(state.myId)) ?? null;
  if (current && !state.tableGame) {
    keys.clear();
    state.attacking = false;
    state.sprinting = false;
    state.slide = { x: 0, z: 0, active: false };
    state.knock = { x: 0, z: 0 };
    state.vy = 0;
  }
  state.tableGame = current;
  state.tablePending = false;
  state.tableError = '';
  updateTableGame();
  syncTableModels();
  updateTableInvites();
}

export const tableHandlers = {
  tables: (m) => applyTableGames(m.games),
  tableError(m) {
    state.tablePending = false;
    state.tableError = TABLE_ERRORS[m.reason] ?? 'Không thể thực hiện thao tác tại bàn.';
    announce(state.tableError);
    updateTableGame();
  },
  tableClosed(m) {
    state.tableGame = null;
    state.tablePending = false;
    keys.clear();
    announce(TABLE_TEXT.closedResult(TABLE_CLOSED[m.reason] ?? 'Bàn cờ đã đóng.', m.delta ?? 0));
    updateTableGame();
  },
};
