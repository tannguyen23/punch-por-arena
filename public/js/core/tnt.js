import { state } from '../state.js';

export const tntSpeedMult = () => state.event?.kind === 'tnt' && state.event.targetId === state.myId
  ? state.event.tnt.speedMult : 1;
