import { WEAPON_MODELS } from '../entities/weapons/index.js';

const SVG = 'http://www.w3.org/2000/svg';
const UNKNOWN_ICON = '❔';

// Biểu tượng của vũ khí: hình vẽ `iconSvg` nếu có (giống nhau trên mọi máy), không thì emoji `icon`.
export function weaponIcon(id) {
  if (id === 'fist') return document.createTextNode(''); // tay không: không có hình, không phải vũ khí lạ
  const def = WEAPON_MODELS[id];
  if (!def?.iconSvg) return document.createTextNode(def?.icon ?? UNKNOWN_ICON);
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', def.iconSvg.viewBox);
  svg.setAttribute('class', 'weapon-icon');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', def.iconSvg.path);
  svg.append(path);
  return svg;
}
