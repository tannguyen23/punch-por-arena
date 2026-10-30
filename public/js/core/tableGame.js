import { state } from '../state.js';
import { groundAt, heightAt } from './terrain.js';

export function canJoinTable() {
  return state.myId !== null && state.alive && !state.tableGame && !state.event && !state.dog
    && !state.tableNuke && !state.bigPunch.charging && ['lobby', 'playing'].includes(state.match.phase);
}

export function nearestTable() {
  if (!state.tableRules || !canJoinTable()) return null;
  const { range, vertical, groundTolerance } = state.tableRules;
  if (Math.abs(state.me.y - groundAt(state.me.x, state.me.z, state.me.y)) > groundTolerance) return null;
  let nearest = null;
  let distance = range;
  for (const table of state.tables) {
    const d = Math.hypot(table.x - state.me.x, table.z - state.me.z);
    if (d > distance || Math.abs(state.me.y - heightAt(table.x, table.z)) > vertical) continue;
    nearest = table;
    distance = d;
  }
  return nearest;
}
