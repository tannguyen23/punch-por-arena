const { TABLE_GAME } = require('../config');

function newBoard(game, now = Date.now()) {
  game.board = Array(TABLE_GAME.size ** 2).fill(null);
  game.turn = game.starter;
  game.winner = null;
  game.reason = null;
  game.deltas = null;
  game.line = [];
  game.replay = [];
  game.stage = 'playing';
  game.endsAt = now + TABLE_GAME.turnMs;
}

function boardLines() {
  const n = TABLE_GAME.size;
  const lines = [];
  for (let i = 0; i < n; i++) {
    lines.push(Array.from({ length: n }, (_, j) => i * n + j));
    lines.push(Array.from({ length: n }, (_, j) => j * n + i));
  }
  lines.push(Array.from({ length: n }, (_, i) => i * n + i));
  lines.push(Array.from({ length: n }, (_, i) => (i + 1) * (n - 1)));
  return lines;
}

const winningLine = (board, mark) => boardLines().find((line) => line.every((cell) => board[cell] === mark)) ?? [];

function canFlip(game, side) {
  if (game.stage !== 'playing' || game.turn !== side) return false;
  return boardLines().some((line) => line.filter((cell) => game.board[cell] === 1 - side).length === TABLE_GAME.size - 1
    && line.some((cell) => game.board[cell] === null));
}

function finishBoard(game, winner, reason) {
  game.stage = 'finished';
  game.winner = winner;
  game.reason = reason;
  game.endsAt = Date.now() + TABLE_GAME.resultMs;
}

function playCell(game, side, cell) {
  game.board[cell] = side;
  game.line = winningLine(game.board, side);
  if (game.line.length) finishBoard(game, side, 'line');
  else if (game.board.every((mark) => mark !== null)) finishBoard(game, null, 'draw');
  else {
    game.turn = 1 - side;
    game.endsAt = Date.now() + TABLE_GAME.turnMs;
  }
}

module.exports = { newBoard, finishBoard, playCell, canFlip };
