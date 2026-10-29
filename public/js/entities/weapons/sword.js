// Định nghĩa kiếm. Model .glb hiện không có màu/texture nên tô theo bộ phận (kindOf → colors).
const GUARD_GROUP = 'Than kiem'; // tên node cha chứa các phần của chắn tay trong sword_1.glb
const POMMEL_TOP = 0.35; // các mốc độ cao (đơn vị gốc của model) tách đuôi / cán / lưỡi
const GRIP_TOP = 0.7;

export const sword = {
  icon: '🗡️', // hiện trong ô vũ khí
  url: '/models/sword_1.glb',
  length: 1.1, // co giãn model về độ dài này (mét)
  attack: 'slide', // chém bằng animation Right Slide khi tấn công
  firstPersonTilt: 1.0, // rad, 0 = lưỡi chĩa thẳng lên, π/2 = chĩa thẳng ra trước
  gripKind: 'grip', // bộ phận có tâm là điểm cầm (đặt vào lòng bàn tay)
  colors: { blade: '#c9d1d9', guard: '#d4af37', grip: '#5a3a22', pommel: '#d4af37' },
  kindOf(mesh, topY) {
    if (mesh.parent?.name === GUARD_GROUP) return 'guard';
    if (topY <= POMMEL_TOP) return 'pommel';
    if (topY <= GRIP_TOP) return 'grip';
    return 'blade';
  },
};
