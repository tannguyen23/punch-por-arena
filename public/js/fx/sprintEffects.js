import { scene } from '../core/scene.js';
import { state, remotes } from '../state.js';
import { SPRINT_FX } from '../config.js';
import { updateSprintView } from './sprintViewEffects.js';

const { ParticleSystem, Vector3, Color4, RawTexture, Texture } = BABYLON;
const effects = new Map();
let texture = null;

// Chấm sáng tròn mờ dần ra mép, dùng chung cho các hạt (chạy nhanh, mưa).
export function glowTexture() {
  if (texture) return texture;
  const size = SPRINT_FX.textureSize;
  const pixels = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const radius = Math.hypot((col + 0.5) / size * 2 - 1, (row + 0.5) / size * 2 - 1);
      const offset = (row * size + col) * 4;
      pixels.set([255, 255, 255, Math.round(Math.max(0, 1 - radius) ** 2 * 255)], offset);
    }
  }
  texture = RawTexture.CreateRGBATexture(pixels, size, size, scene, false, false, Texture.BILINEAR_SAMPLINGMODE);
  return texture;
}

function particles(id, kind) {
  const spec = SPRINT_FX[kind];
  const system = new ParticleSystem(`sprint-${kind}-${id}`, spec.capacity, scene);
  system.particleTexture = glowTexture();
  system.emitter = new Vector3();
  system.color1 = new Color4(...spec.color, 1);
  system.color2 = new Color4(1, 1, 1, 1);
  system.colorDead = new Color4(...spec.color, 0);
  system.minLifeTime = spec.life;
  system.maxLifeTime = spec.life;
  system.minSize = spec.size;
  system.maxSize = spec.size;
  system.minEmitBox.set(-SPRINT_FX.width, 0, -spec.size);
  system.maxEmitBox.set(SPRINT_FX.width, SPRINT_FX.height, spec.size);
  system.blendMode = ParticleSystem.BLENDMODE_ADD;
  if (kind === 'trail') {
    system.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
    system.minScaleY = SPRINT_FX.stretch;
    system.maxScaleY = SPRINT_FX.stretch;
  }
  system.emitRate = 0;
  system.start();
  return system;
}

function updateEffect(id, position, yaw, running, dt) {
  let effect = effects.get(id);
  if (!effect && !running) return;
  if (!effect) {
    effect = { aura: particles(id, 'aura'), trail: particles(id, 'trail'), quiet: 0 };
    effects.set(id, effect);
  }
  effect.quiet = running ? 0 : effect.quiet + dt;
  const backward = new Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  for (const kind of ['aura', 'trail']) {
    const system = effect[kind];
    system.emitter.copyFrom(position);
    system.emitter.y += SPRINT_FX.baseHeight;
    system.emitter.addInPlace(backward.scale(SPRINT_FX.back));
    system.emitRate = running ? SPRINT_FX[kind].rate : 0;
    if (kind === 'trail') {
      system.direction1.copyFrom(backward.scale(SPRINT_FX.trailSpeed));
      system.direction2.copyFrom(system.direction1);
    } else {
      system.direction1.set(-1, 1, -1);
      system.direction2.set(1, 1, 1);
    }
  }
  if (effect.quiet > SPRINT_FX.fade) disposeEffect(id);
}

function disposeEffect(id) {
  const effect = effects.get(id);
  effect.aura.dispose(false);
  effect.trail.dispose(false);
  effects.delete(id);
}

export function updateSprintEffects(dt) {
  const localRunning = state.myId !== null && state.alive && state.sprinting;
  updateSprintView(localRunning, localRunning ? glowTexture() : texture, dt);
  if (state.myId !== null) updateEffect(state.myId, state.me, state.yaw, state.alive && state.sprinting, dt);
  for (const [id, remote] of remotes) {
    updateEffect(id, remote.root.position, remote.root.rotation.y, !remote.dead && !remote.tc && remote.sprinting, dt);
  }
  for (const id of effects.keys()) {
    if (id !== state.myId && !remotes.has(id)) disposeEffect(id);
  }
}