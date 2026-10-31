// Mưa: các giọt kéo thành vệt rơi trong một hình hộp đi theo camera (mưa ở đâu cũng thấy mà không phải phủ cả sân).
import { scene } from '../core/scene.js';
import { state } from '../state.js';
import { WEATHER } from '../config.js';
import { glowTexture } from './sprintEffects.js';

const { ParticleSystem, Vector3, Color4 } = BABYLON;

let system = null;

function createRain() {
  const spec = WEATHER.rain;
  const rain = new ParticleSystem('rain', spec.capacity, scene);
  rain.particleTexture = glowTexture();
  rain.emitter = new Vector3();
  const half = spec.area / 2;
  rain.minEmitBox.set(-half, 0, -half);
  rain.maxEmitBox.set(half, 0, half);
  rain.direction1.set(0.04, -1, 0.02); // gió đẩy nghiêng một chút
  rain.direction2.set(0.08, -1, 0.05);
  rain.minEmitPower = spec.speed;
  rain.maxEmitPower = spec.speed * 1.1;
  rain.minLifeTime = spec.life;
  rain.maxLifeTime = spec.life;
  [rain.minSize, rain.maxSize] = spec.size;
  rain.color1 = new Color4(...spec.color);
  rain.color2 = new Color4(...spec.color);
  rain.colorDead = new Color4(spec.color[0], spec.color[1], spec.color[2], 0);
  rain.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
  rain.minScaleY = spec.stretch;
  rain.maxScaleY = spec.stretch;
  rain.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  rain.emitRate = 0;
  rain.start();
  return rain;
}

// Dựng hệ hạt mưa (đang tạnh nên chưa rơi giọt nào) ngay lúc vào phòng để shader biên dịch trước, không giật lúc bão bắt đầu.
export function prepareRain() {
  system ??= createRain();
}

// `level` 0 (tạnh) → 1 (mưa to nhất). Gọi mỗi khung hình.
export function updateRain(level) {
  if (state.spectator) level = 0; // mưa bám theo camera: từ trên cao nó thành một mảng lơ lửng giữa trời, không phủ sân
  if (!system && level <= 0) return;
  system ??= createRain();
  if (level <= 0 && system.emitRate === 0) return; // đang tạnh: không có gì để cập nhật
  const eye = scene.activeCamera.position;
  system.emitter.set(eye.x, eye.y + WEATHER.rain.height, eye.z);
  system.emitRate = WEATHER.rain.rate * level;
}
