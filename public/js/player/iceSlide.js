import { state } from '../state.js';
import { iceAt } from '../core/ice.js';
import { groundAt } from '../core/terrain.js';
import { ICE } from '../config.js';

const { slide: SLIDE } = ICE;

const AIR_EPSILON = 0.05; // chân cao hơn đất ngần này (mét) là đang ở trên không

const isAirborne = () => state.me.y > groundAt(state.me.x, state.me.z, state.me.y) + AIR_EPSILON;

// Vận tốc di chuyển trên mặt phẳng (m/giây) khi người chơi muốn đi với vận tốc (wishX, wishZ).
// Đất thường: đi đúng như muốn. Trên băng: không đổi hướng ngay mà tăng tốc dần theo hướng bấm rồi trượt đi theo đà, bước lên
// băng lúc đang đi là bị tống đi nhanh theo hướng đó. Rời băng thì đà tan dần, đang nhảy trên không thì giữ nguyên đà.
export function slideVelocity(wishX, wishZ, dt) {
  const { me, slide } = state;
  const airborne = isAirborne();
  const onIce = !airborne && iceAt(me.x, me.z, me.y, SLIDE.heightTolerance);
  const wishSpeed = Math.hypot(wishX, wishZ);

  if (onIce && !slide.active) {
    slide.active = true;
    const entry = wishSpeed > 0 ? Math.max(SLIDE.entryMinSpeed, wishSpeed * SLIDE.entryBoost) / wishSpeed : 0;
    slide.x = wishX * entry;
    slide.z = wishZ * entry;
  }
  if (!slide.active) return { x: wishX, z: wishZ };

  if (onIce) {
    const friction = Math.exp(-SLIDE.friction * dt);
    slide.x = slide.x * friction + wishX * SLIDE.accel * dt;
    slide.z = slide.z * friction + wishZ * SLIDE.accel * dt;
    const speed = Math.hypot(slide.x, slide.z);
    if (speed > SLIDE.maxSpeed) {
      slide.x *= SLIDE.maxSpeed / speed;
      slide.z *= SLIDE.maxSpeed / speed;
    }
  } else if (!airborne) {
    const fade = 1 - Math.exp(-SLIDE.exitGrip * dt);
    slide.x += (wishX - slide.x) * fade;
    slide.z += (wishZ - slide.z) * fade;
    if (Math.hypot(slide.x - wishX, slide.z - wishZ) < SLIDE.settleSpeed) {
      slide.active = false;
      return { x: wishX, z: wishZ };
    }
  }
  return { x: slide.x, z: slide.z };
}

// Sau va chạm: đà trượt theo quãng đường thật đã đi được, nên trượt vào tường thì mất đà / lướt dọc tường thay vì cứ đẩy vào.
export function settleSlide(fromX, fromZ, dt) {
  const { me, slide } = state;
  if (!slide.active || dt <= 0) return;
  slide.x = (me.x - fromX) / dt;
  slide.z = (me.z - fromZ) / dt;
}

export function resetSlide() {
  state.slide.active = false;
  state.slide.x = 0;
  state.slide.z = 0;
}
