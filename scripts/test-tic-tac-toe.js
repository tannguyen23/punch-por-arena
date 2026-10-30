const { test } = require('node:test');
const assert = require('node:assert/strict');
const { newBoard, playCell, canFlip } = require('../server/game/ticTacToe');

const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

test('Nhận đủ tám đường thắng cho cả X và O', () => {
  for (const side of [0, 1]) {
    for (const line of lines) {
      const game = { starter: side };
      newBoard(game);
      line.forEach((cell) => playCell(game, side, cell));
      assert.equal(game.stage, 'finished');
      assert.equal(game.winner, side);
      assert.deepEqual(game.line, line);
    }
  }
});

test('Đầy chín ô không có đường thắng thì hoà', () => {
  const game = { starter: 0 };
  newBoard(game);
  [0, 1, 2, 4, 3, 5, 7, 6, 8].forEach((cell, turn) => playCell(game, turn % 2, cell));
  assert.equal(game.stage, 'finished');
  assert.equal(game.reason, 'draw');
  assert.equal(game.winner, null);
});

test('Bàn mới xoá quân và phiếu chơi lại, giữ bên được đi trước', () => {
  const game = { starter: 1, board: [0], replay: [1, 2], winner: 0, line: [0] };
  newBoard(game, 1000);
  assert.deepEqual(game.board, Array(9).fill(null));
  assert.equal(game.turn, 1);
  assert.equal(game.stage, 'playing');
  assert.deepEqual(game.replay, []);
  assert.deepEqual(game.line, []);
});

test('Phát hiện đủ tám nguy cơ thắng lượt tới, không nhầm hàng đã bị chặn', () => {
  for (const side of [0, 1]) {
    for (const line of lines) {
      for (const empty of line) {
        const game = { starter: side };
        newBoard(game);
        line.filter((cell) => cell !== empty).forEach((cell) => (game.board[cell] = 1 - side));
        assert.ok(canFlip(game, side));
        assert.equal(canFlip(game, 1 - side), false);
        game.board[empty] = side;
        assert.equal(canFlip(game, side), false);
        game.board[empty] = null;
        game.stage = 'finished';
        assert.equal(canFlip(game, side), false);
      }
    }
  }
});
