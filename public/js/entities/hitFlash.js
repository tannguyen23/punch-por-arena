import { HIT_FX } from '../config.js';

// Model người bị đánh chớp sáng một nhịp: cộng màu vào `emissiveColor` của các material RIÊNG của người đó (không đụng material dùng chung với
// người khác hay với vũ khí, không tạo material mới; emissiveColor chỉ là uniform nên shader không biên dịch lại, quy tắc 12). Độ sáng tắt dần tuyến tính.
// `materials`: các material của nhân vật (tint trong character.js).
export function createHitFlash(materials) {
  const originals = materials.map((mat) => mat.emissiveColor.clone());
  let level = 0; // 0–1, đỉnh chớp = power của cú đánh
  let lit = false;
  return {
    trigger(power) {
      level = Math.max(level, Math.min(1, 0.4 + 0.6 * power));
    },
    update(dt) {
      if (level <= 0 && !lit) return;
      level = Math.max(0, level - dt / (HIT_FX.flashMs / 1000));
      const [r, g, b] = HIT_FX.flashColor;
      materials.forEach((mat, i) => {
        const base = originals[i];
        mat.emissiveColor.set(base.r + r * level, base.g + g * level, base.b + b * level);
      });
      lit = level > 0;
    },
  };
}
