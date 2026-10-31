import { scene } from '../core/scene.js';
import * as Fx from './effects.js';
import { explosion, flashBurst, tracer, muzzleFlash } from './gunEffects.js';
import { shockwave } from './shockwave.js';
import { prepareRain } from './rain.js';
import { prepareJetFx } from './jetFx.js';
import { prepareLightning } from './lightning.js';
import { prepareStunFx } from './stun.js';

const FAR_BELOW = -400; // dưới mặt đất rất xa: được vẽ (nên shader biên dịch ngay) nhưng bị đất che, không ai thấy

// Chạy một lần lúc vào phòng: dùng thử từng loại hiệu ứng hay gặp ở chỗ không ai thấy để shader biên dịch sẵn. Material mới / biến thể shader mới mà
// biên dịch lần đầu giữa trận làm khung hình đó giật vài chục tới vài trăm ms (xem mục Hiệu năng trong CLAUDE.md). Thêm hiệu ứng hay dùng thì thêm vào đây.
export function warmUpEffects() {
  prepareRain();
  const known = new Set(scene.meshes);
  Fx.burst(0, FAR_BELOW, 0, 2);
  Fx.flash(0, FAR_BELOW, 0);
  Fx.damageText(0, FAR_BELOW, 0, '-1');
  Fx.ring(0, FAR_BELOW, 0, 1, 0.1);
  Fx.dust(0, FAR_BELOW, 0, 1);
  explosion([0, FAR_BELOW, 0], 1);
  flashBurst([0, FAR_BELOW, 0]);
  shockwave(0, FAR_BELOW, 0, 1);
  tracer([0, FAR_BELOW, 0], [0, FAR_BELOW, 2]);
  muzzleFlash(0, FAR_BELOW, 0);
  prepareLightning(FAR_BELOW);
  prepareStunFx(FAR_BELOW);
  prepareJetFx(FAR_BELOW);
  for (const mesh of scene.meshes) if (!known.has(mesh)) mesh.alwaysSelectAsActiveMesh = true; // ngoài khung nhìn vẫn được vẽ (và biên dịch)
}
