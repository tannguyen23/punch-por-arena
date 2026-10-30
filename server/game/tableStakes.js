const { TABLE_GAME } = require('../config');

function settleTable(room, game) {
  if (game.stage !== 'finished' || game.deltas) return;
  game.deltas = game.players.map((_, side) => game.winner === null ? 0
    : side === game.winner ? TABLE_GAME.stake : -(game.reason === 'flip' ? TABLE_GAME.flipLoss : TABLE_GAME.stake));
  game.players.forEach((id, side) => {
    const p = room.players.get(id);
    if (p) p.score += game.deltas[side];
  });
}

module.exports = { settleTable };
