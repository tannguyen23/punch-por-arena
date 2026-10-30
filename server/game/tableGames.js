const { TABLE_GAME } = require('../config');
const { broadcast, send } = require('../net/messaging');
const { cantAct } = require('./restrictions');
const { newBoard, finishBoard, playCell, canFlip } = require('./ticTacToe');
const { settleTable } = require('./tableStakes');

const reject = (p, reason) => send(p.ws, { t: 'tableError', reason });
const views = (room) => [...room.tableGames.values()].map(({ endsAt, ...game }) => ({
  ...game,
  flipSide: canFlip(game, game.turn) ? game.turn : null,
  left: Math.max(0, endsAt - Date.now()),
}));
const sync = (room) => broadcast(room, { t: 'tables', games: views(room) });

function closeTable(room, id, reason, leavingId = null) {
  const game = room.tableGames.get(id);
  if (!game) return;
  const forfeited = game.stage === 'playing' && game.players.includes(leavingId);
  if (forfeited) {
    const expired = Date.now() >= game.endsAt;
    finishBoard(game, 1 - (expired ? game.turn : game.players.indexOf(leavingId)), expired ? 'timeout' : 'left');
    settleTable(room, game);
  }
  room.tableGames.delete(id);
  for (const [side, playerId] of game.players.entries()) {
    const p = room.players.get(playerId);
    if (!p) continue;
    p.tableId = null;
    send(p.ws, { t: 'tableClosed', reason, delta: forfeited ? game.deltas[side] : 0 });
  }
  sync(room);
}

function clearTableGames(room, reason) {
  for (const id of room.tableGames.keys()) closeTable(room, id, reason);
}

function tickTableGames(room, now) {
  for (const game of room.tableGames.values()) {
    if (now < game.endsAt) continue;
    if (game.stage === 'playing') {
      finishBoard(game, 1 - game.turn, 'timeout');
      settleTable(room, game);
      sync(room);
    } else closeTable(room, game.id, 'timeout');
  }
}

function joinTable(room, p, id) {
  if (p.tableId !== null) return reject(p, 'already_seated');
  if (!['lobby', 'playing'].includes(room.phase) || room.event || room.nuke || p.dead || cantAct(room, p) || p.bigChargeAt) {
    return reject(p, 'unavailable');
  }
  const prop = Number.isInteger(id) ? room.mapData.props[id] : null;
  if (prop?.type !== 'table') return reject(p, 'bad_table');
  const ground = room.terrain.groundAt(p.x, p.z, p.y);
  if (!room.terrain.isSupported(p.x, p.z) || Math.hypot(p.x - prop.x, p.z - prop.z) > TABLE_GAME.range
    || Math.abs(p.y - ground) > TABLE_GAME.groundTolerance
    || Math.abs(p.y - room.terrain.heightAt(prop.x, prop.z)) > TABLE_GAME.vertical) return reject(p, 'too_far');
  let game = room.tableGames.get(id);
  if (game && game.players.length >= 2) return reject(p, 'full');
  if (!game) {
    game = { id, players: [], board: Array(TABLE_GAME.size ** 2).fill(null), stage: 'waiting',
      turn: 0, starter: 0, winner: null, line: [], replay: [], endsAt: Date.now() + TABLE_GAME.waitMs };
    room.tableGames.set(id, game);
  }
  game.players.push(p.id);
  p.tableId = id;
  p.sprinting = false;
  send(p.ws, { t: 'setpos', x: p.x, z: p.z });
  if (game.players.length === 2) newBoard(game);
  sync(room);
}

function handleTable(room, p, m) {
  if (m.action === 'join') return joinTable(room, p, m.id);
  const game = room.tableGames.get(p.tableId);
  if (!game || !game.players.includes(p.id)) return reject(p, 'not_seated');
  if (m.action === 'leave') return closeTable(room, game.id, 'left', p.id);
  if (Date.now() >= game.endsAt) {
    tickTableGames(room, Date.now());
    return reject(p, 'expired');
  }
  const side = game.players.indexOf(p.id);
  if (m.action === 'move') {
    if (game.stage !== 'playing' || game.turn !== side) return reject(p, 'not_turn');
    if (!Number.isInteger(m.cell) || m.cell < 0 || m.cell >= game.board.length || game.board[m.cell] !== null) return reject(p, 'bad_cell');
    playCell(game, side, m.cell);
  } else if (m.action === 'flip') {
    if (!canFlip(game, side)) return reject(p, 'cannot_flip');
    finishBoard(game, 1 - side, 'flip');
  } else if (m.action === 'replay') {
    if (game.stage !== 'finished') return reject(p, 'not_finished');
    if (!game.replay.includes(p.id)) game.replay.push(p.id);
    if (game.replay.length === 2) {
      game.starter = 1 - game.starter;
      newBoard(game);
    }
  } else return reject(p, 'bad_action');
  settleTable(room, game);
  sync(room);
}

module.exports = { handleTable, closeTable, clearTableGames, tickTableGames, tableViews: views };
