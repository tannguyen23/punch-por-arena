// Vạch chia trên thanh máu: mỗi vạch nhỏ là `small` máu, mỗi vạch lớn là `big` máu (số máu cố định cho mọi người), nên người nhiều máu hơn
// (thuốc hoá to) có nhiều vạch hơn và liếc qua là biết ai trâu hơn ai. Máu tối đa lớn thì dùng bậc thô hơn cho khỏi dày đặc.
// Hàm thuần dùng chung cho thanh máu 3D trên đầu (entities/hpTicks.js) và thanh máu của mình (ui/hud.js).
import { HP_TICKS } from '../config.js';

export function hpTickStep(maxHp) {
  return HP_TICKS.steps.find((step) => maxHp / step.small <= HP_TICKS.maxSmall) ?? HP_TICKS.steps.at(-1);
}
