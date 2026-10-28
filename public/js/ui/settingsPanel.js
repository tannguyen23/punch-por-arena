import { FOV_MIN, FOV_MAX, SENSITIVITY_MIN, SENSITIVITY_MAX, MOUSE_SENSITIVITY } from '../config.js';
import { settings, setFov, setSensitivity, saveSettings, resetSettings } from '../settings.js';

const overlay = document.getElementById('settings');
const fovInput = document.getElementById('set-fov');
const fovValue = document.getElementById('set-fov-value');
const sensInput = document.getElementById('set-sens');
const sensValue = document.getElementById('set-sens-value');

const fovText = () => `${Math.round((settings.fov * 180) / Math.PI)}°`;
const sensText = () => `${Math.round((settings.sensitivity / MOUSE_SENSITIVITY) * 100)}%`;

function syncControls() {
  fovInput.value = settings.fov;
  sensInput.value = settings.sensitivity;
  fovValue.textContent = fovText();
  sensValue.textContent = sensText();
}

function openSettings() {
  syncControls();
  overlay.style.display = 'flex';
}

function closeSettings() {
  // Nhả focus khỏi thanh trượt để WASD dùng được ngay sau khi đóng.
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  overlay.style.display = 'none';
}

export function initSettings() {
  // Giới hạn lấy từ config để không lặp lại con số trong HTML.
  fovInput.min = FOV_MIN;
  fovInput.max = FOV_MAX;
  fovInput.step = 0.01;
  sensInput.min = SENSITIVITY_MIN;
  sensInput.max = SENSITIVITY_MAX;
  sensInput.step = 0.0001;

  fovInput.addEventListener('input', () => {
    setFov(parseFloat(fovInput.value));
    fovValue.textContent = fovText();
  });
  sensInput.addEventListener('input', () => {
    setSensitivity(parseFloat(sensInput.value));
    sensValue.textContent = sensText();
  });
  fovInput.addEventListener('change', saveSettings);
  sensInput.addEventListener('change', saveSettings);

  document.getElementById('settings-reset').addEventListener('click', () => {
    resetSettings();
    syncControls();
  });
  document.getElementById('settings-close').addEventListener('click', closeSettings);

  // Nút mở có ở menu và màn tạm dừng; ở màn tạm dừng phải chặn click để không khoá chuột trở lại.
  for (const button of document.querySelectorAll('.settings-open')) {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettings();
    });
  }

  syncControls();
}
