// Dựng các phần của form /admin-test từ mô tả `meta` (server/debug/options.js `describe`). Chỉ gán chữ bằng textContent.

export const $ = (id) => document.getElementById(id);

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, onClick, className = '') {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function numberField(label, { min, max }, value, onInput) {
  const input = el('input');
  input.type = 'number';
  input.min = min;
  input.max = max;
  input.value = value;
  input.addEventListener('input', () => onInput(Number(input.value)));
  const field = el('label', 'field');
  field.append(el('span', '', label), input);
  return field;
}

// Danh sách mọi sự kiện: mỗi dòng có "Chỉ cái này" và "+ Thêm"; kèm nút chung cho cả danh sách.
export function renderCatalog(meta, { only, add, all, clear }) {
  $('catalog').replaceChildren(...meta.events.map((info) => {
    const row = el('div', 'catalog-row');
    row.append(el('span', 'catalog-name', info.name), button('Chỉ cái này', () => only(info.id)), button('+ Thêm', () => add(info.id)));
    return row;
  }));
  $('bulk').replaceChildren(button('Tất cả, theo thứ tự', all), button('Xoá hết', clear));
}

// Thứ tự các sự kiện sẽ xuất hiện; bấm một chip để bỏ nó.
export function renderChips(meta, ids, remove) {
  const nameOf = (id) => meta.events.find((e) => e.id === id).name;
  $('chips').replaceChildren(...ids.map((id, i) => button(`${i + 1}. ${nameOf(id)}  ✕`, () => remove(i), 'chip')));
  if (ids.length === 0) $('chips').append(el('span', 'hint', 'Chưa chọn sự kiện nào'));
}

// Ô chung cho mọi sự kiện (bắt đầu sau, đứng hình...).
export function renderGeneral(meta, options, onChange) {
  $('general').replaceChildren(...Object.entries(meta.general)
    .filter(([, field]) => field.label)
    .map(([key, field]) => numberField(field.label, field, options[key], (value) => onChange(key, value))));
}

// Mỗi sự kiện đang chọn (không trùng) một nhóm ô thông số của riêng nó.
export function renderSettings(meta, options, onChange) {
  const chosen = meta.events.filter((info) => options.events.includes(info.id) && info.options.length > 0);
  $('settings').replaceChildren(...chosen.map((info) => {
    const group = el('div', 'group');
    group.append(el('h3', '', info.name));
    const grid = el('div', 'grid');
    grid.append(...info.options.map((option) => numberField(option.label, option, options.settings[info.id][option.key], (value) => onChange(info.id, option.key, value))));
    group.append(grid);
    return group;
  }));
}
