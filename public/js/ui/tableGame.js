import { state, infos } from '../state.js';
import { canvas } from '../core/scene.js';
import { nearestTable } from '../core/tableGame.js';
import { setPauseVisible } from './hud.js';
import { TABLE_TEXT as text } from './tableText.js';

const frame = document.getElementById('table-game');
const hint = document.getElementById('table-hint');
const board = frame.querySelector('.table-board');
const status = frame.querySelector('.table-status');
const seats = [...frame.querySelectorAll('.table-player')];
const replay = frame.querySelector('.table-replay');
const timer = frame.querySelector('.table-time');
const bar = frame.querySelector('.table-fill');
const flip = frame.querySelector('.table-flip');
const marks = ['X', 'O'];
let drawn = '';
let choose = () => {};

const setText = (node, value) => {
  if (node.textContent !== value) node.textContent = value;
};

export function initTableGame(action) {
  choose = action;
  frame.querySelector('.table-title').textContent = text.title;
  frame.querySelector('.table-mission').textContent = text.mission;
  frame.querySelector('.table-note').textContent = text.note;
  const leave = frame.querySelector('.table-leave');
  leave.textContent = text.leave;
  leave.addEventListener('click', () => action('leave'));
  replay.addEventListener('click', () => action('replay'));
  flip.addEventListener('click', () => action('flip'));
  frame.addEventListener('keydown', (event) => {
    if (event.code !== 'Tab') return;
    const buttons = [...frame.querySelectorAll('button:not(:disabled)')].filter((button) => !button.hidden);
    const next = (buttons.indexOf(document.activeElement) + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    if (buttons.length) buttons[next].focus();
    event.preventDefault();
  });
}

function createCells(count) {
  board.replaceChildren();
  for (let i = 0; i < count; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'table-cell';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 7 7');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    svg.append(path);
    button.append(svg);
    button.addEventListener('click', () => choose('move', i));
    board.append(button);
  }
}

function renderBoard(game, side) {
  const signature = JSON.stringify([game.board, game.turn, game.stage, game.line, state.tablePending, side]);
  if (signature === drawn) return;
  drawn = signature;
  if (board.children.length !== game.board.length) createCells(game.board.length);
  [...board.children].forEach((button, cell) => {
    const mark = marks[game.board[cell]] ?? '';
    button.dataset.mark = mark;
    button.classList.toggle('winning', game.line.includes(cell));
    button.disabled = state.tablePending || game.stage !== 'playing' || game.turn !== side || mark !== '';
    button.setAttribute('aria-label', text.cell(cell, mark));
    button.querySelector('path').setAttribute('d', mark === 'X'
      ? 'M0 0h1v1h1v1h1v1h1V2h1V1h1V0h1v1H6v1H5v1H4v1h1v1h1v1h1v1H6V6H5V5H4V4H3v1H2v1H1v1H0V6h1V5h1V4h1V3H2V2H1V1H0Z'
      : mark === 'O' ? 'M1 0h5v1h1v5H6v1H1V6H0V1h1Zm1 1v1H1v3h1v1h3V5h1V2H5V1Z' : '');
  });
}

function renderStakes(game, side) {
  const finished = game.stage === 'finished';
  const canFlip = game.flipSide === side && game.stage === 'playing';
  setText(frame.querySelector('.table-reward'), finished ? text.result(game.deltas?.[side] ?? 0, game.reason)
    : text.reward(state.tableRules.stake, state.tableRules.flipLoss));
  setText(frame.querySelector('.table-flip-hint'), canFlip ? text.flipHint(state.tableRules.stake) : '');
  frame.classList.toggle('table-flipped', finished && game.reason === 'flip');
  flip.hidden = !canFlip;
  flip.disabled = state.tablePending;
  setText(flip, text.flip(state.tableRules.flipLoss));
  setText(frame.querySelector('.table-note'), game.stage === 'playing' ? text.leaveNote(state.tableRules.stake) : text.note);
}

function render(game) {
  const side = game.players.indexOf(state.myId);
  const left = Math.max(0, game.endsAt - performance.now());
  const limit = game.stage === 'waiting' ? state.tableRules.waitMs : game.stage === 'playing' ? state.tableRules.turnMs : state.tableRules.resultMs;
  const message = game.stage === 'waiting' ? text.waiting : game.stage === 'finished'
    ? game.winner === null ? text.draw : game.winner === side ? text.win : text.lose
    : game.turn === side ? text.yourTurn : text.otherTurn;
  setText(status, message);
  renderStakes(game, side);
  setText(frame.querySelector('.table-error'), state.tableError);
  setText(timer, `${text.timer(Math.ceil(left / 1000))}${game.reason === 'timeout' && game.stage === 'finished' ? ` · ${text.timeout}` : ''}`);
  bar.style.width = `${Math.min(100, left / limit * 100)}%`;
  seats.forEach((seat, index) => {
    setText(seat.querySelector('.table-name'), infos.get(game.players[index])?.name ?? text.emptySeat);
    seat.classList.toggle('active', game.stage === 'playing' && game.turn === index);
    seat.classList.toggle('me', index === side);
  });
  setText(frame.querySelector('.table-symbol'), `${text.symbol(marks[side])} · ${text.turnLimit(state.tableRules.turnMs / 1000)}`);
  replay.hidden = game.stage !== 'finished';
  replay.disabled = state.tablePending || game.replay.includes(state.myId);
  setText(replay, game.replay.includes(state.myId) ? text.replayWaiting : text.replay);
  const leave = frame.querySelector('.table-leave');
  leave.disabled = state.tablePending;
  setText(leave, game.stage === 'playing' ? text.leavePlaying(state.tableRules.stake) : text.leave);
  renderBoard(game, side);
}

export function updateTableGame() {
  const game = state.tableGame;
  const nearby = nearestTable();
  const count = nearby ? state.tableGames.find((g) => g.id === nearby.id)?.players.length ?? 0 : 0;
  hint.hidden = !nearby || !state.joined;
  if (nearby) setText(hint, text.hint(count));
  if (game) render(game);
  if (Boolean(game) === !frame.hidden) return;
  frame.hidden = !game;
  if (game) {
    drawn = '';
    setPauseVisible(false);
    document.exitPointerLock();
    frame.querySelector('.table-leave').focus({ preventScroll: true });
  } else {
    setPauseVisible(true);
  }
}
