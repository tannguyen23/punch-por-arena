// Hoạt ảnh của nhân vật dựng từ model .glb: đấm trái, đấm phải và nhảy.
//
// Model chứa các animation "Left punch", "Right punch" và "Jump" (xoay/dịch chuyển các nhóm upper, head, hai tay, hai cẳng tay,
// chân và player). Khung đầu của hai cú đấm là tư thế thế thủ nên dùng làm tư thế đứng yên chung (các nút chỉ có trong Jump
// thì lấy khung đầu của Jump). Mỗi hoạt ảnh được trộn mượt từ tư thế hiện tại vào, và trộn mượt về tư thế đứng yên khi hết.
// - Đấm: chạy một lần, tốc độ tăng nếu cooldown của vũ khí ngắn hơn animation. Thiếu một bên thì soi gương bên kia
//   (đổi nút trái ↔ phải, quaternion (x,y,z,w) → (x,-y,-z,w), vị trí (x,y,z) → (-x,y,z)).
// - Nhảy: bắt đầu khi người chơi rời đất (setAirborne), căn tốc độ để vừa thời gian bay dự kiến, GIỮ tư thế cuối nếu còn
//   trên không, và trả về tư thế đứng yên khi chạm đất. Đấm giữa không trung thì sau cú đấm quay lại tư thế nhảy.
// Tự nội suy khoá thay vì dùng bộ phát của Babylon để trộn được giữa các hoạt ảnh liên tiếp và đổi tốc độ theo ý.
const { Quaternion, Vector3 } = BABYLON;

const BLEND_IN = 0.04; // giây: trộn từ tư thế hiện tại vào đầu hoạt ảnh (tránh giật khi đấm liên tiếp / đổi hoạt ảnh)
const RETURN = 0.14; // giây: trộn về tư thế đứng yên (cuối hoạt ảnh, hoặc với các nút hoạt ảnh hiện tại không điều khiển)
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Mỗi kiểu giá trị: cách tạo, nội suy, soi gương và ghi lên nút.
const KINDS = {
  rotation: {
    create: () => new Quaternion(),
    blend: (a, b, t, out) => Quaternion.SlerpToRef(a, b, t, out),
    mirror: (q) => new Quaternion(q.x, -q.y, -q.z, q.w),
    write: (node, v) => (node.rotationQuaternion ??= new Quaternion()).copyFrom(v),
  },
  position: {
    create: () => new Vector3(),
    blend: (a, b, t, out) => Vector3.LerpToRef(a, b, t, out),
    mirror: (v) => new Vector3(-v.x, v.y, v.z),
    write: (node, v) => node.position.copyFrom(v),
  },
};
const PATH_OF = { rotationQuaternion: 'rotation', position: 'position' };

const swapSide = (name) => (/^left_/.test(name) ? name.replace('left_', 'right_') : /^right_/.test(name) ? name.replace('right_', 'left_') : name);
const keyOf = (track) => `${track.target.uniqueId}:${track.path}`;

// Lấy các đường chuyển động (nút đích + khoá theo giây) từ một animation group đã gắn vào bản sao nhân vật.
function extractTracks(group) {
  return group.targetedAnimations
    .filter(({ animation }) => animation.targetProperty in PATH_OF)
    .map(({ animation, target }) => {
      const keys = animation.getKeys();
      return {
        target,
        path: PATH_OF[animation.targetProperty],
        times: keys.map((k) => k.frame / animation.framePerSecond),
        values: keys.map((k) => k.value.clone()),
      };
    });
}

// Soi gương một bộ đường: mỗi đường chuyển sang nút đối xứng và đổi giá trị theo mặt phẳng x = 0.
function mirrorTracks(tracks, partnerOf) {
  return tracks.map((t) => ({ target: partnerOf(t.target), path: t.path, times: t.times, values: t.values.map(KINDS[t.path].mirror) }));
}

// Giá trị của một đường tại thời điểm t (nội suy giữa hai khoá kề, giữ nguyên giá trị khoá cuối sau khi hết khoá).
function sample(track, t, out) {
  const { times, values } = track;
  const last = times.length - 1;
  const { blend } = KINDS[track.path];
  if (t <= times[0]) return blend(values[0], values[0], 0, out);
  if (t >= times[last]) return blend(values[last], values[last], 0, out);
  let i = 0;
  while (times[i + 1] < t) i++;
  return blend(values[i], values[i + 1], (t - times[i]) / (times[i + 1] - times[i]), out);
}

export class CharacterAnimator {
  // sets: { L, R, J? } — bộ đường của đấm trái, đấm phải và nhảy (mỗi bộ chỉ chứa những nút nó điều khiển).
  // driven: các nút mà phần XOAY do nơi khác ghi (chân đi bộ): ta chỉ giữ giá trị trong `rotationOf`, không tự ghi lên nút.
  constructor(sets, { driven = [] } = {}) {
    this.sets = sets;
    this.driven = new Set(driven);
    for (const set of Object.values(sets)) {
      set.keys = new Set(set.map(keyOf));
      set.duration = Math.max(...set.map((t) => t.times.at(-1)));
    }

    // Tư thế đứng yên của mỗi nút = khung đầu (hai cú đấm trước, rồi Jump cho những nút chúng không có).
    this.entries = new Map(); // key → { target, path }
    this.idle = new Map();
    for (const t of [...sets.L, ...sets.R, ...(sets.J ?? [])]) {
      const key = keyOf(t);
      if (this.idle.has(key)) continue;
      this.entries.set(key, { target: t.target, path: t.path });
      this.idle.set(key, t.values[0].clone());
    }
    this.current = new Map([...this.idle].map(([k, v]) => [k, v.clone()]));
    this.from = new Map();
    this.stage = 'idle'; // 'idle' | 'punch' | 'jump' | 'return'
    this.t = 0; // thời gian trong hoạt ảnh đấm / lúc trả về
    this.blendT = 0; // thời gian từ lúc bắt đầu hoạt ảnh hiện tại (để trộn)
    this.airborne = false;
    this.airT = 0; // thời gian đã ở trên không
    this.jumpSpeed = 1;
    for (const [key, v] of this.idle) this.apply(key, v);
  }

  apply(key, value) {
    const { target, path } = this.entries.get(key);
    this.current.get(key).copyFrom(value);
    if (path === 'rotation' && this.driven.has(target)) return;
    KINDS[path].write(target, value);
  }

  // Phần xoay hiện tại do hoạt ảnh gán cho một nút (để nơi khác cộng thêm chuyển động riêng, vd: đung đưa chân khi đi).
  rotationOf(node) {
    return this.current.get(`${node.uniqueId}:rotation`) ?? null;
  }

  snapshot() {
    return new Map([...this.current].map(([k, v]) => [k, v.clone()]));
  }

  begin(stage) {
    this.stage = stage;
    this.blendT = 0;
    this.from = this.snapshot();
  }

  // Bắt đầu một cú đấm. `cooldown` (giây) là khoảng giữa hai đòn của vũ khí: đòn nhanh thì animation được tua nhanh cho kịp.
  play(hand, cooldown = Infinity) {
    this.active = this.sets[hand];
    this.t = 0;
    this.speed = Math.max(1, this.active.duration / cooldown);
    this.begin('punch');
  }

  // Người chơi rời đất / chạm đất. `airTime` (giây) là thời gian bay dự kiến để căn tốc độ hoạt ảnh nhảy cho vừa.
  setAirborne(airborne, airTime = 0.65) {
    if (airborne === this.airborne) return;
    this.airborne = airborne;
    if (airborne) {
      if (!this.sets.J) return;
      this.airT = 0;
      this.jumpSpeed = this.sets.J.duration / airTime;
      if (this.stage !== 'punch') this.begin('jump'); // đang đấm thì để cú đấm xong rồi mới vào tư thế nhảy
    } else if (this.stage === 'jump') {
      this.t = 0;
      this.begin('return');
    }
  }

  blendTo(key, target, weight) {
    const { path } = this.entries.get(key);
    this.apply(key, KINDS[path].blend(this.from.get(key), target, weight, KINDS[path].create()));
  }

  update(dt) {
    if (this.stage === 'idle') return;
    if (this.airborne) this.airT += dt;

    if (this.stage === 'return') {
      this.t += dt;
      const blend = smooth(clamp01(this.t / RETURN));
      for (const [key, idle] of this.idle) this.blendTo(key, idle, blend);
      if (blend >= 1) this.stage = 'idle';
      return;
    }

    // 'punch' chạy một lần; 'jump' đi theo thời gian bay và giữ tư thế cuối nếu còn trên không.
    const clip = this.stage === 'jump' ? this.sets.J : this.active;
    if (this.stage === 'punch') this.t += dt * this.speed;
    const time = this.stage === 'jump' ? this.airT * this.jumpSpeed : this.t;
    this.blendT += dt;
    const blendIn = smooth(clamp01(this.blendT / BLEND_IN));
    const blendOut = smooth(clamp01(this.blendT / RETURN));
    for (const track of clip) {
      this.blendTo(keyOf(track), sample(track, Math.min(time, clip.duration), KINDS[track.path].create()), blendIn);
    }
    // Nút không thuộc hoạt ảnh này (vd: chân đang bước dở từ cú đấm trước) thì trả dần về tư thế đứng yên.
    for (const [key, idle] of this.idle) if (!clip.keys.has(key)) this.blendTo(key, idle, blendOut);

    if (this.stage === 'punch' && time >= clip.duration) {
      if (this.airborne && this.sets.J) {
        this.begin('jump');
      } else {
        this.t = 0;
        this.begin('return');
      }
    }
  }
}

// Dựng bộ điều khiển hoạt ảnh từ các animation group của một bản sao nhân vật (`body` là nút gốc của bản sao).
// Null nếu model không có animation đấm. Các animation group được dọn ngay vì ta tự phát.
export function createCharacterAnimator(body, groups, options) {
  const groupNodes = body.getChildTransformNodes(false).filter((n) => !(n instanceof BABYLON.AbstractMesh));
  const partnerOf = (node) => (node instanceof BABYLON.AbstractMesh ? node : groupNodes.find((g) => g.name === swapSide(node.name)) ?? node);

  const sets = {};
  for (const group of groups) {
    const side = /jump/i.test(group.name) ? 'J' : /right/i.test(group.name) ? 'R' : /left/i.test(group.name) ? 'L' : null;
    if (side) sets[side] = extractTracks(group);
    group.dispose();
  }
  if (!sets.L && !sets.R) return null;
  if (!sets.L) sets.L = mirrorTracks(sets.R, partnerOf);
  if (!sets.R) sets.R = mirrorTracks(sets.L, partnerOf);
  return new CharacterAnimator(sets, options);
}
