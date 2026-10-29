import { state } from '../state.js';

const bar = document.getElementById('stamina');
const fill = document.getElementById('stamina-fill');

export function updateStamina() {
  bar.hidden = state.myId === null;
  fill.style.transform = `scaleX(${state.stamina})`;
  bar.classList.toggle('exhausted', state.sprintExhausted);
  bar.classList.toggle('sprinting', state.sprinting);
  bar.setAttribute('aria-valuenow', Math.round(state.stamina * 100));
}