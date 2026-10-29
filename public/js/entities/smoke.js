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

// Cột khói đỏ bốc cao ở chỗ hòm tiếp tế (kiểu PUBG) để cả sân nhìn thấy từ xa. Khói bay lên chậm dần, nở to và trôi theo gió.
// `prewarm`: dựng sẵn cả cột (người vào giữa chừng) thay vì để nó mọc dần từ đất.
export function createSmoke(position, { prewarm = false } = {}) {
  const { smoke } = AIRDROP;
  const ps = new ParticleSystem('airdropSmoke', smoke.capacity, scene);
  ps.particleTexture = puffTexture();
  ps.emitter = position.add(new Vector3(0, 0.3, 0));
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
  const [r, g, b] = smoke.color;
  ps.addColorGradient(0, new Color4(r, g, b, 0));
  ps.addColorGradient(0.04, new Color4(r, g, b, 0.9));
  ps.addColorGradient(0.7, new Color4(r * 0.85, g, b, 0.55));
  ps.addColorGradient(1, new Color4(r * 0.7, g, b, 0));
  ps.minInitialRotation = 0;
  ps.maxInitialRotation = Math.PI * 2;
  ps.minAngularSpeed = -0.4;
  ps.maxAngularSpeed = 0.4;
  ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  if (prewarm) {
    ps.preWarmCycles = smoke.prewarmCycles;
    ps.preWarmStepOffset = 10;
  }
  ps.start();
  return {
    // Ngừng nhả khói; phần khói đã có tan dần rồi tự huỷ.
    stop() {
      ps.disposeOnStop = true;
      ps.stop();
    },
  };
}
