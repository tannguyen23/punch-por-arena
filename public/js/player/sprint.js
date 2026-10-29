import { state } from '../state.js';
import { SPRINT } from '../config.js';

export function updateSprint(wantsSprint, dt) {
  if (!state.alive || state.myId === null) {
    state.stamina = 1;
    state.sprintExhausted = false;
    state.sprintRecovery = 0;
    state.sprinting = false;
    return;
  }
  if (state.stamina >= SPRINT.restart) state.sprintExhausted = false;
  state.sprinting = wantsSprint && !state.sprintExhausted && state.stamina > 0;
  if (state.sprinting) {
    state.stamina = Math.max(0, state.stamina - dt / SPRINT.duration);
    state.sprintRecovery = SPRINT.delay;
    if (state.stamina === 0) {
      state.sprintExhausted = true;
      state.sprinting = false;
    }
  } else {
    const recoveryDt = Math.max(0, dt - state.sprintRecovery);
    state.sprintRecovery = Math.max(0, state.sprintRecovery - dt);
    state.stamina = Math.min(1, state.stamina + recoveryDt / SPRINT.recovery);
  }
}