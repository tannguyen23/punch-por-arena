import {
  BASE_FOV, MOUSE_SENSITIVITY, FOV_MIN, FOV_MAX, SENSITIVITY_MIN, SENSITIVITY_MAX,
} from './config.js';

const STORAGE_KEY = 'punch-game-settings';
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Cài đặt dùng chung: fov tính bằng radian, sensitivity tính bằng radian/pixel (khớp camera Babylon).
export const settings = { fov: BASE_FOV, sensitivity: MOUSE_SENSITIVITY };

export function setFov(value) {
  if (Number.isFinite(value)) settings.fov = clamp(value, FOV_MIN, FOV_MAX);
}

export function setSensitivity(value) {
  if (Number.isFinite(value)) settings.sensitivity = clamp(value, SENSITIVITY_MIN, SENSITIVITY_MAX);
}

export function resetSettings() {
  settings.fov = BASE_FOV;
  settings.sensitivity = MOUSE_SENSITIVITY;
  saveSettings();
}

export function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function loadSettings() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {}
  if (!saved || typeof saved !== 'object') return;
  setFov(saved.fov);
  setSensitivity(saved.sensitivity);
}
