import { state } from '../state.js';
import { groundAt, heightAt, isSupported } from '../core/terrain.js';
import { planLeap } from '../core/leapPath.js';
import { sampleFlight } from '../core/throwPath.js';
import { eyeHeight } from '../player/aim.js';
import { makePreview } from './previewStyle.js';
import { DUEL_THROW_PREVIEW } from '../config.js';

// Đường xem trước cú nhảy đấm trời giáng khi đang giữ phím gồng (xem previewStyle.js), hoặc null. Vòng điểm rơi to bằng vùng nổ.
export function leapPreview() {
  const rules = state.potionTypes[state.potion?.id]?.bigPunch;
  if (!state.bigPunch.charging || !rules) return null;
  const plan = planLeap(state.me, state.me.y + eyeHeight(), state.yaw, state.pitch, rules.leap, {
    heightAt, groundAt, isSupported, limit: state.arena - 0.5,
  });
  const points = sampleFlight(plan.flight, DUEL_THROW_PREVIEW.samples);
  return makePreview({ points, landing: plan.to, valid: plan.valid }, { waiting: performance.now() < state.bigPunch.readyAt, size: rules.radius * 2, offset: false });
}
