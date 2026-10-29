import { scene } from '../core/scene.js';
import { SPRINT_FX, VIEWMODEL } from '../config.js';

const { ParticleSystem, TransformNode, Vector3, Color4 } = BABYLON;
let view = null;

function createSide(side, texture) {
  const spec = SPRINT_FX.firstPerson;
  const emitter = new TransformNode(`sprint-view-emitter-${side}`, scene);
  const system = new ParticleSystem(`sprint-view-${side}-trail`, spec.capacity, scene);
  system.particleTexture = texture;
  system.emitter = emitter;
  system.isLocal = true;
  system.renderingGroupId = VIEWMODEL.renderingGroup;
  system.blendMode = ParticleSystem.BLENDMODE_ADD;
  system.color1 = new Color4(...spec.color, spec.alpha);
  system.color2 = system.color1.clone();
  system.colorDead = new Color4(...spec.color, 0);
  system.addColorGradient(0, new Color4(...spec.color, 0));
  system.addColorGradient(0.2, system.color1);
  system.addColorGradient(1, system.colorDead);
  system.minLifeTime = spec.life;
  system.maxLifeTime = spec.life;
  system.direction1 = new Vector3();
  system.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;
  system.minScaleY = spec.stretch;
  system.maxScaleY = spec.stretch;
  system.emitRate = 0;
  system.start();
  return { side, emitter, system };
}

export function updateSprintView(running, texture, dt) {
  const camera = scene.activeCamera;
  if (!camera) return;
  if (!view && !running) return;
  if (!view) {
    view = {
      quiet: 0,
      strength: 0,
      sides: [-1, 1].map((side) => createSide(side, texture)),
    };
  }
  view.quiet = running ? 0 : view.quiet + dt;
  const spec = SPRINT_FX.firstPerson;
  const ease = running ? spec.fadeIn : spec.fadeOut;
  view.strength += ((running ? 1 : 0) - view.strength) * (1 - Math.exp(-ease * dt));
  const halfHeight = Math.tan(camera.fov / 2) * spec.depth;
  const halfWidth = halfHeight * scene.getEngine().getAspectRatio(camera);
  for (const { side, emitter, system } of view.sides) {
    emitter.parent = camera;
    emitter.position.set(side * halfWidth * spec.edge, 0, spec.depth);
    system.minEmitBox.set(-halfWidth * spec.width, -halfHeight * spec.height, 0);
    system.maxEmitBox.set(halfWidth * spec.width, halfHeight * spec.height, 0);
    system.minSize = halfHeight * spec.trailSize;
    system.maxSize = system.minSize;
    system.direction1.set(side * halfWidth * spec.speed, 0, 0);
    system.direction2.copyFrom(system.direction1);
    system.emitRate = running ? spec.rate * view.strength : 0;
    const alpha = spec.alpha * view.strength;
    system.getColorGradients()[1].color1.a = alpha;
  }
  if (view.quiet > SPRINT_FX.fade) {
    for (const { emitter, system } of view.sides) {
      system.dispose(false);
      emitter.dispose();
    }
    view = null;
  }
}