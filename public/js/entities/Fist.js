import { scene } from '../core/scene.js';
import { PUNCH_TIME } from '../config.js';

// Nắm đấm góc nhìn thứ nhất, gắn vào camera.
export class Fist {
  constructor(parent, rest, reach, material, size) {
    this.rest = rest;
    this.reach = reach;
    this.t = 0;
    this.mesh = BABYLON.MeshBuilder.CreateSphere('fist', { diameter: 1 }, scene);
    this.mesh.scaling.set(size, size, size * 1.3);
    this.mesh.material = material;
    this.mesh.parent = parent;
    this.mesh.position.copyFrom(rest);
  }
  // Cầm một vật có gốc ở tâm cán, nghiêng `tilt` rad so với phương thẳng đứng. Vật đi theo nắm đấm khi vung.
  hold(item, tilt) {
    this.drop();
    this.held = item;
    item.parent = this.mesh.parent;
    item.rotation.x = tilt;
    item.position.copyFrom(this.mesh.position);
  }
  drop() {
    this.held?.dispose();
    this.held = null;
  }
  setEnabled(enabled) {
    this.mesh.setEnabled(enabled);
    this.held?.setEnabled(enabled);
  }
  punch() {
    this.t = PUNCH_TIME;
  }
  update(dt) {
    if (this.t > 0) this.t = Math.max(0, this.t - dt);
    const k = Math.sin(Math.PI * (1 - this.t / PUNCH_TIME)) * (this.t > 0 ? 1 : 0);
    this.mesh.position.copyFrom(this.rest).addInPlace(this.reach.scale(k));
    this.held?.position.copyFrom(this.mesh.position);
  }
}
