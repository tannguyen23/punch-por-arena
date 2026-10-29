import { state } from '../state.js';
import { POOP } from '../config.js';

// Dậm phải shit của chó (net/poopHandlers.js đặt `state.stinkUntil`): chạy chậm lại cho tới hết giờ. Server không kiểm tốc độ nên client lo.
export const stinkSpeedMult = () => (performance.now() < state.stinkUntil ? POOP.slowMult : 1);
