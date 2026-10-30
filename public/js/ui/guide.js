import { GUIDE_SECTIONS } from './guideText.js';

const dialog = document.getElementById('guide');
const nav = document.getElementById('guide-nav');
const content = document.getElementById('guide-content');

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function buildCard({ icon, title, text, keys = [], badge }) {
  const card = element('article', 'guide-card');
  const heading = element('h3', '');
  const symbol = element('span', 'guide-icon', icon);
  symbol.setAttribute('aria-hidden', 'true');
  heading.append(symbol, document.createTextNode(title));
  card.append(heading);
  for (const [key, action] of keys) {
    const row = element('div', 'guide-key');
    row.append(element('kbd', '', key), element('span', '', action));
    card.append(row);
  }
  if (text) card.append(element('p', '', text));
  if (badge) card.append(element('div', 'guide-badge', badge));
  return card;
}

function selectSection(id) {
  for (const button of nav.children) button.setAttribute('aria-pressed', String(button.dataset.section === id));
  for (const section of content.children) section.hidden = section.id !== `guide-${id}`;
  content.scrollTop = 0;
}

export function initGuide() {
  for (const { id, icon, title, mission, cards, note } of GUIDE_SECTIONS) {
    const button = element('button', '', `${icon} ${title}`);
    button.type = 'button';
    button.dataset.section = id;
    button.setAttribute('aria-controls', `guide-${id}`);
    button.addEventListener('click', () => selectSection(id));
    nav.append(button);
    const section = element('section', 'guide-section');
    section.id = `guide-${id}`;
    const heading = element('h2', '', title);
    heading.id = `guide-heading-${id}`;
    section.setAttribute('aria-labelledby', heading.id);
    const grid = element('div', 'guide-grid');
    grid.append(...cards.map(buildCard));
    section.append(heading, element('p', 'guide-mission', mission), grid);
    if (note) section.append(element('p', 'guide-note', note));
    content.append(section);
  }
  selectSection(GUIDE_SECTIONS[0].id);
  document.getElementById('guide-open').addEventListener('click', () => dialog.showModal());
  document.getElementById('guide-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => event.stopPropagation());
  dialog.addEventListener('keyup', (event) => event.stopPropagation());
}
