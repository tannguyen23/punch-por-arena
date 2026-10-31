import { scene } from '../core/scene.js';
import { AIRDROP } from '../config.js';

const { ParticleSystem, DynamicTexture, Vector3, Color4 } = BABYLON;

// Một cụm khói tròn mờ dần ra mép, vẽ bằng canvas (không cần file ảnh). Mỗi cột khói một texture riêng
// vì hệ hạt tự huỷ texture của nó khi tắt hẳn.
function puffTexture() {
  const tex = new DynamicTexture('smokePuff', 64, scene, false);
  const ctx = tex.getContext();
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  tex.hasAlpha = true;
  tex.update();
  return tex;
}

// Cột khói đỏ ở chỗ hòm tiếp tế để cả sân nhìn thấy từ xa, nhưng thấp và thưa (đỡ overdraw). Khói bay lên chậm dần, nở to và trôi theo gió.
// Điểm nhả khói dời được (`follow`): hòm đang rơi thì khói nhả theo hòm, các cụm đã nhả ở yên trong thế giới nên để lại một vệt khói phía trên hòm.
// `settled`: hòm đã chạm đất (hoặc người vào giữa chừng thấy hòm nằm sẵn) thì dùng thông số khói mặt đất: ít hơn và bay thấp hơn.
// `prewarm`: dựng sẵn cả cột (người vào giữa chừng) thay vì để nó mọc dần từ đất.
export function createSmoke(position, { prewarm = false, color = AIRDROP.smoke.color, settled = false } = {}) {
  const { smoke } = AIRDROP;
  const ps = new ParticleSystem('airdropSmoke', smoke.capacity, scene);
  ps.particleTexture = puffTexture();
  const emitter = position.add(new Vector3(0, 0.3, 0));
  ps.emitter = emitter;
  ps.minEmitBox = new Vector3(-0.5, 0, -0.5);
  ps.maxEmitBox = new Vector3(0.5, 0.5, 0.5);
  ps.direction1 = new Vector3(-0.2, 1, -0.2);
  ps.direction2 = new Vector3(0.2, 1, 0.2);
  ps.minEmitPower = smoke.speed * 0.8;
  ps.maxEmitPower = smoke.speed * 1.2;
  ps.minLifeTime = smoke.life * 0.8;
  ps.maxLifeTime = smoke.life;
  ps.emitRate = smoke.rate;
  ps.gravity = Vector3.FromArray(smoke.wind);
  ps.addVelocityGradient(0, 1);
  ps.addVelocityGradient(1, 0.35);
  ps.addSizeGradient(0, smoke.startSize);
  ps.addSizeGradient(1, smoke.endSize);
  const [r, g, b] = color;
  ps.addColorGradient(0, new Color4(r, g, b, 0));
  ps.addColorGradient(0.04, new Color4(r, g, b, 0.9));
  ps.addColorGradient(0.7, new Color4(r * 0.85, g, b, 0.55));
  ps.addColorGradient(1, new Color4(r * 0.7, g, b, 0));
  ps.minInitialRotation = 0;
  ps.maxInitialRotation = Math.PI * 2;
  ps.minAngularSpeed = -0.4;
  ps.maxAngularSpeed = 0.4;
  ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  // Hòm đã chạm đất: bớt cụm và hạ tốc độ bốc / tuổi thọ để khói chỉ quẩn thấp quanh hòm.
  let ground = false;
  const settle = () => {
    if (ground) return;
    ground = true;
    ps.emitRate = smoke.groundRate;
    ps.minEmitPower = smoke.groundSpeed * 0.8;
    ps.maxEmitPower = smoke.groundSpeed * 1.2;
    ps.minLifeTime = smoke.groundLife * 0.8;
    ps.maxLifeTime = smoke.groundLife;
  };
  if (settled) settle();
  if (prewarm) {
    ps.preWarmCycles = smoke.prewarmCycles;
    ps.preWarmStepOffset = 10;
  }
  ps.start();
  return {
    // Dời điểm nhả khói tới `position` (hệ hạt đọc lại vector này mỗi khung hình).
    follow(position) {
      emitter.set(position.x, position.y + 0.3, position.z);
    },
    settle,
    // Ngừng nhả khói; phần khói đã có tan dần rồi tự huỷ.
    stop() {
      ps.disposeOnStop = true;
      ps.stop();
    },
  };
}
