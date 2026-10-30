import { TNT_MODEL } from '../../config.js';

// Model chỉ dùng để hiển thị sự kiện, không phải vũ khí trong túi đồ.
export const tnt = {
  ...TNT_MODEL,
  icon: '🧨',
  kindOf: (mesh) => mesh.name.startsWith('tnt_fuse') ? 'fuse' : mesh.name.startsWith('tube') ? 'strap' : 'explosive',
};
