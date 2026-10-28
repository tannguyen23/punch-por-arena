import { PUNCH_TIME } from '../config.js';
import { part, box, ball } from '../core/meshes.js';

const HAND_Y = -0.47; // vị trí bàn tay (đầu găng) trong hệ toạ độ của khuỷu tay

// Tay: vai và khuỷu tay là hai khớp xoay. Thế thủ co khuỷu, khi đấm duỗi thẳng ra phía trước.
export class Arm {
  constructor(scene, parent, side, sleeveMat, skinMat, gloveMat) {
    this.side = side; // -1 tay trái, +1 tay phải
    this.t = 0;
    this.shoulder = new BABYLON.TransformNode('shoulder', scene);
    this.shoulder.parent = parent;
    this.shoulder.position.set(side * 0.47, 1.3, 0);
    part(box(0.24, 0.38, 0.24, scene), this.shoulder, 0, -0.19, 0, sleeveMat);

    this.elbow = new BABYLON.TransformNode('elbow', scene);
    this.elbow.parent = this.shoulder;
    this.elbow.position.y = -0.38;
    part(box(0.18, 0.38, 0.18, scene), this.elbow, 0, -0.19, 0, skinMat);
    part(ball(0.34, scene), this.elbow, 0, HAND_Y, 0, gloveMat);
    this.update(0);
  }
  // Cầm một vật (kiếm...) có gốc ở tâm cán, vật hướng +Y. Xoay ngược lại để nó kéo dài theo cẳng tay:
  // thế thủ thì chĩa chếch lên, lúc đấm thì đâm thẳng ra trước.
  hold(item) {
    this.drop();
    this.held = item;
    item.parent = this.elbow;
    item.position.set(0, HAND_Y, 0);
    item.rotation.x = Math.PI;
  }
  // Bỏ vật đang cầm. Phải gọi trước khi dispose nhân vật vì vật dùng chung material với các vật khác.
  drop() {
    this.held?.dispose();
    this.held = null;
  }
  punch() {
    this.t = PUNCH_TIME;
  }
  update(dt) {
    if (this.t > 0) this.t = Math.max(0, this.t - dt);
    const k = this.t > 0 ? Math.sin(Math.PI * (1 - this.t / PUNCH_TIME)) : 0;
    this.shoulder.rotation.x = -0.4 - 1.1 * k;
    this.shoulder.rotation.z = -this.side * (0.15 - 0.1 * k);
    this.shoulder.position.z = 0.15 * k;
    this.elbow.rotation.x = -1.9 + 1.85 * k;
  }
}
