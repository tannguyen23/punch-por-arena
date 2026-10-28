export const SHIRT = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#ec407a', '#eceff1'];
export const PANTS = ['#1a237e', '#212121', '#37474f', '#5d4037', '#b71c1c', '#1b5e20', '#f5f5f5'];
export const GLOVE = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#111111', '#fafafa', '#ff6f00'];
export const SKIN = ['#ffe0c2', '#f5c7a3', '#d9a066', '#a86b45', '#6b4226'];
export const HAIR = ['#1a120d', '#4a2f1b', '#d9a43b', '#b3261e', '#9e9e9e', '#3b82f6'];
export const PATTERNS = ['Trơn', 'Sọc ngang', 'Sọc dọc', 'Ca-rô', 'Chấm bi'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const randomLook = () => ({
  shirt: pick(SHIRT),
  pants: pick(PANTS),
  glove: pick(GLOVE),
  skin: pick(SKIN),
  hair: pick(HAIR),
  pattern: Math.floor(Math.random() * PATTERNS.length),
});
