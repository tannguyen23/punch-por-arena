// Màn hình chọn tên và ngoại hình trước khi vào sân.
const Menu = (() => {
  const SHIRT = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#ec407a', '#eceff1'];
  const PANTS = ['#1a237e', '#212121', '#37474f', '#5d4037', '#b71c1c', '#1b5e20', '#f5f5f5'];
  const GLOVE = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#111111', '#fafafa', '#ff6f00'];
  const SKIN = ['#ffe0c2', '#f5c7a3', '#d9a066', '#a86b45', '#6b4226'];
  const HAIR = ['#1a120d', '#4a2f1b', '#d9a43b', '#b3261e', '#9e9e9e', '#3b82f6'];
  const PATTERNS = ['Trơn', 'Sọc ngang', 'Sọc dọc', 'Ca-rô', 'Chấm bi'];
  const STORAGE_KEY = 'punch-game-profile';

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const randomLook = () => ({
    shirt: pick(SHIRT),
    pants: pick(PANTS),
    glove: pick(GLOVE),
    skin: pick(SKIN),
    hair: pick(HAIR),
    pattern: Math.floor(Math.random() * PATTERNS.length),
  });

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === 'object') return saved;
    } catch {}
    return null;
  }

  function save(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {}
  }

  // onPlay(name, look) được gọi khi bấm "Vào chơi".
  function init(onPlay) {
    const saved = load();
    const state = { look: { ...randomLook(), ...saved?.look } };
    const nameInput = document.getElementById('name');
    nameInput.value = typeof saved?.name === 'string' ? saved.name : '';

    const buttons = [];
    const refresh = () => {
      for (const b of buttons) b.el.classList.toggle('on', state.look[b.key] === b.value);
    };
    const addOption = (key, value, className, setup) => {
      const el = document.createElement('button');
      el.className = className;
      setup(el);
      el.addEventListener('click', () => {
        state.look[key] = value;
        refresh();
      });
      document.getElementById('opt-' + key).append(el);
      buttons.push({ el, key, value });
    };

    const swatches = { shirt: SHIRT, pants: PANTS, glove: GLOVE, skin: SKIN, hair: HAIR };
    for (const [key, colors] of Object.entries(swatches)) {
      for (const color of colors) {
        addOption(key, color, 'sw', (el) => {
          el.style.background = color;
        });
      }
    }
    PATTERNS.forEach((label, index) => {
      addOption('pattern', index, 'pat', (el) => {
        el.textContent = label;
      });
    });
    refresh();

    document.getElementById('random').addEventListener('click', () => {
      state.look = randomLook();
      refresh();
    });

    const play = () => {
      const name = nameInput.value.trim();
      save({ name, look: state.look });
      document.getElementById('menu').style.display = 'none';
      onPlay(name, { ...state.look });
    };
    document.getElementById('play').addEventListener('click', play);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') play();
    });
  }

  return { init };
})();
