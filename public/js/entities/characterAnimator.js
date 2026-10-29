// Hoạt ảnh của nhân vật dựng từ model .glb: đấm trái, đấm phải, nhảy, đứng yên (idle) và ngã khi bị hạ (knock_out).
//
// Model chứa các animation "Left punch", "Right punch", "Jump", "idle" và "knock_out" (xoay/dịch chuyển các nhóm upper,
// head, hai tay, hai cẳng tay, chân và player). Tư thế đứng yên lấy từ khung đầu của idle; model chưa có idle thì lấy
// khung đầu của hai cú đấm (thế thủ) như trước. Mỗi hoạt ảnh được trộn mượt từ tư thế hiện tại vào, và trộn mượt về tư
// thế đứng yên khi hết.
// - Đấm: chạy một lần, tốc độ tăng nếu cooldown của vũ khí ngắn hơn animation. Thiếu một bên thì soi gương bên kia
//   (đổi nút trái ↔ phải, quaternion (x,y,z,w) → (x,-y,-z,w), vị trí (x,y,z) → (-x,y,z)).
// - Nhảy: bắt đầu khi người chơi rời đất (setAirborne), căn tốc độ để vừa thời gian bay dự kiến, GIỮ tư thế cuối nếu còn
//   trên không, và trả về tư thế đứng yên khi chạm đất. Đấm giữa không trung thì sau cú đấm quay lại tư thế nhảy.
// - Đứng yên: lặp clip idle; clip không khép kín (khoá cuối khác khung đầu) nên đoạn cuối được hoà dần về khung đầu.
// - Ngã: chạy knock_out một lần rồi GIỮ tư thế cuối (nằm dưới đất) cho tới khi hồi sinh (reset).
// - Đấm lớn (big_right_punch, của người hoá to): tích lực = chạy tới khung lấy đà (`bigWindup`) rồi GIỮ ở đó tới khi thả (chargeBig),
//   thả thì chạy nốt phần còn lại (releaseBig), huỷ thì trả về tư thế đứng yên (cancelBig). Clip này còn co giãn (scaling) tay phải.
// Tự nội suy khoá thay vì dùng bộ phát của Babylon để trộn được giữa các hoạt ảnh liên tiếp và đổi tốc độ theo ý.
const { Quaternion, Vector3 } = BABYLON;

const BLEND_IN = 0.04; // giây: trộn từ tư thế hiện tại vào đầu hoạt ảnh (tránh giật khi đấm liên tiếp / đổi hoạt ảnh)
const SLIDE_BLEND_IN = 0.1; // giây: cú chém bắt đầu với tay giơ cao nên cần trộn lâu hơn để không giật
const RETURN = 0.14; // giây: trộn về tư thế đứng yên (cuối hoạt ảnh, hoặc với các nút hoạt ảnh hiện tại không điều khiển)
const IDLE_FADE = 0.08; // giây: hoà khung cuối của idle về khung đầu để vòng lặp không bị giật
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
  scaling: {
    create: () => new Vector3(1, 1, 1),
    blend: (a, b, t, out) => Vector3.LerpToRef(a, b, t, out),
    mirror: (v) => v.clone(),
    write: (node, v) => node.scaling.copyFrom(v),
  },
};
const PATH_OF = { rotationQuaternion: 'rotation', position: 'position', scaling: 'scaling' };

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
  // sets: { L, R, J?, I?, K?, B? } — bộ đường của đấm trái, đấm phải, nhảy, đứng yên, ngã và đấm lớn (mỗi bộ chỉ chứa những nút nó điều khiển).
  // driven: các nút mà phần XOAY do nơi khác ghi (chân đi bộ): ta chỉ giữ giá trị trong `rotationOf`, không tự ghi lên nút.
  constructor(sets, { driven = [], idleSpeed = 1, bigWindup = 0 } = {}) {
    this.sets = sets;
    this.bigWindup = bigWindup; // giây trong clip đấm lớn: lấy đà xong, giữ ở đây tới khi thả
    this.driven = new Set(driven);
    this.idleSpeed = idleSpeed;
    for (const set of Object.values(sets)) {
      set.keys = new Set(set.map(keyOf));
      set.duration = Math.max(...set.map((t) => t.times.at(-1)));
      if (set === sets.S || set === sets.SL || set === sets.B) set.blendIn = SLIDE_BLEND_IN;
    }

    // Nút đích của mọi đường, và tư thế gốc của model (trước khi ta ghi gì) để làm nền cho nút không có trong idle.
    this.entries = new Map(); // key → { target, path }
    const rest = new Map();
    for (const set of Object.values(sets)) {
      for (const t of set) {
        const key = keyOf(t);
        if (this.entries.has(key)) continue;
        this.entries.set(key, { target: t.target, path: t.path });
        rest.set(key, t.path === 'rotation' ? (t.target.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(t.target.rotation)) : t.path === 'scaling' ? t.target.scaling.clone() : t.target.position.clone());
      }
    }

    // Tư thế đứng yên của mỗi nút = khung đầu của idle; không có idle thì khung đầu của hai cú đấm rồi Jump như trước.
    // Nút không có trong idle giữ tư thế gốc của model (vd: cẳng tay chỉ được các cú đấm điều khiển).
    this.base = new Map();
    const standing = sets.I ?? [...(sets.L ?? []), ...(sets.R ?? []), ...(sets.J ?? [])];
    for (const t of standing) {
      const key = keyOf(t);
      if (!this.base.has(key)) this.base.set(key, t.values[0].clone());
    }
    for (const [key, value] of rest) if (!this.base.has(key)) this.base.set(key, value);

    this.current = new Map([...this.base].map(([k, v]) => [k, v.clone()]));
    this.from = new Map();
    this.stage = 'idle'; // 'idle' | 'punch' | 'jump' | 'return' | 'ko'
    this.t = 0; // thời gian trong hoạt ảnh đấm / lúc trả về / lúc ngã
    this.idleT = 0; // thời gian trong vòng lặp idle
    this.blendT = 0; // thời gian từ lúc bắt đầu hoạt ảnh hiện tại (để trộn)
    this.airborne = false;
    this.airT = 0; // thời gian đã ở trên không
    this.jumpSpeed = 1;
    this.running = false;
    this.runT = 0;
    this.hold = null; // khác null: cú đấm đang chạy dừng lại ở thời điểm này cho tới khi thả (tích lực của đấm lớn)
    for (const [key, v] of this.base) this.apply(key, v);
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

  // Bắt đầu một cú đấm / chém. `cooldown` (giây) là khoảng giữa hai đòn của vũ khí: đòn nhanh thì animation được tua nhanh cho kịp.
  play(hand, cooldown = Infinity) {
    this.active = this.sets[hand];
    if (!this.active) return;
    this.t = 0;
    this.speed = Math.max(1, this.active.duration / cooldown);
    this.hold = null;
    this.begin('punch');
  }

  // Bắt đầu tích lực đấm lớn: lấy đà rồi giữ nguyên tư thế tới khi releaseBig / cancelBig.
  chargeBig() {
    if (!this.sets.B) return;
    this.active = this.sets.B;
    this.t = 0;
    this.speed = 1;
    this.hold = this.bigWindup;
    this.begin('punch');
  }

  // Thả: chạy tiếp từ tư thế lấy đà tới hết clip. Chưa thấy tích lực (vào phòng giữa chừng, mất tin) thì trộn thẳng vào tư thế lấy đà.
  releaseBig() {
    if (!this.sets.B) return;
    if (this.stage === 'punch' && this.active === this.sets.B && this.hold !== null) {
      this.hold = null;
      return;
    }
    this.active = this.sets.B;
    this.t = this.bigWindup;
    this.speed = 1;
    this.hold = null;
    this.begin('punch');
  }

  // Huỷ tích lực (thả sớm, hết thuốc, bị hạ): về tư thế đứng yên.
  cancelBig() {
    if (this.stage !== 'punch' || this.hold === null) return;
    this.hold = null;
    this.t = 0;
    this.begin('return');
  }

  // Người chơi rời đất / chạm đất. `airTime` (giây) là thời gian bay dự kiến để căn tốc độ hoạt ảnh nhảy cho vừa.
  setAirborne(airborne, airTime = 0.65) {
    if (airborne === this.airborne) return;
    this.airborne = airborne;
    if (airborne) {
      if (!this.sets.J) return;
      this.airT = 0;
      this.jumpSpeed = this.sets.J.duration / airTime;
      if (this.stage !== 'punch' && this.stage !== 'ko') this.begin('jump'); // đang đấm thì để cú đấm xong rồi mới vào tư thế nhảy
    } else if (this.stage === 'jump') {
      this.t = 0;
      this.begin('return');
    }
  }

  setRunning(running) {
    if (this.running === running) return;
    this.running = running;
    this.runT = 0;
    if (this.stage === 'idle') this.begin('idle');
  }

  // Bị hạ: ngã một lần rồi giữ tư thế nằm dưới đất. `reset()` khi hồi sinh để đứng dậy.
  knockOut() {
    if (!this.sets.K || this.stage === 'ko') return;
    this.hold = null;
    this.t = 0;
    this.begin('ko');
  }

  // Hồi sinh: trả mọi nút về tư thế đứng yên và chạy lại vòng lặp idle.
  reset() {
    this.airborne = false;
    this.running = false;
    this.runT = 0;
    this.t = 0;
    this.idleT = 0;
    this.blendT = 0;
    this.hold = null;
    this.stage = 'idle';
    this.from.clear();
    for (const [key, v] of this.base) this.apply(key, v);
  }

  blendTo(key, target, weight) {
    const { path } = this.entries.get(key);
    this.apply(key, KINDS[path].blend(this.from.get(key), target, weight, KINDS[path].create()));
  }

  updateIdle(dt) {
    const running = this.running && this.sets.Run;
    const clip = running ? this.sets.Run : this.sets.I;
    if (!clip) return;
    this.blendT += dt;
    const blend = smooth(clamp01(this.blendT / RETURN));
    if (running) this.runT = (this.runT + dt) % clip.duration;
    else this.idleT = (this.idleT + dt * this.idleSpeed) % clip.duration;
    const time = running ? this.runT : this.idleT;
    const fade = Math.min(IDLE_FADE, clip.duration * 0.5);
    const end = clip.duration - fade;
    const w = time < end ? 0 : smooth((time - end) / fade);
    for (const track of clip) {
      const { path } = track;
      const value = sample(track, time, KINDS[path].create());
      if (w > 0) KINDS[path].blend(value, sample(track, 0, KINDS[path].create()), w, value);
      if (this.from.size) this.blendTo(keyOf(track), value, blend);
      else this.apply(keyOf(track), value);
    }
    for (const [key, base] of this.base) {
      if (!clip.keys.has(key)) {
        if (this.from.size) this.blendTo(key, base, blend);
        else this.apply(key, base);
      }
    }
  }

  updateKo(dt) {
    const clip = this.sets.K;
    this.t += dt;
    this.blendT += dt;
    const time = Math.min(this.t, clip.duration);
    const blendIn = smooth(clamp01(this.blendT / BLEND_IN));
    const blendOut = smooth(clamp01(this.blendT / RETURN));
    for (const track of clip) this.blendTo(keyOf(track), sample(track, time, KINDS[track.path].create()), blendIn);
    // Nút không thuộc knock_out thì trả dần về tư thế đứng yên rồi giữ nguyên.
    for (const [key, base] of this.base) if (!clip.keys.has(key)) this.blendTo(key, base, blendOut);
  }

  update(dt) {
    if (this.stage === 'idle') return this.updateIdle(dt);
    if (this.stage === 'ko') return this.updateKo(dt);
    if (this.airborne) this.airT += dt;

    if (this.stage === 'return') {
      this.t += dt;
      const blend = smooth(clamp01(this.t / RETURN));
      for (const [key, base] of this.base) this.blendTo(key, base, blend);
      if (blend >= 1) {
        this.begin('idle');
        this.idleT = 0; // vào vòng lặp idle từ khung đầu
      }
      return;
    }

    // 'punch' chạy một lần; 'jump' đi theo thời gian bay và giữ tư thế cuối nếu còn trên không.
    const clip = this.stage === 'jump' ? this.sets.J : this.active;
    if (this.stage === 'punch') this.t = Math.min(this.t + dt * this.speed, this.hold ?? Infinity);
    const time = this.stage === 'jump' ? this.airT * this.jumpSpeed : this.t;
    this.blendT += dt;
    const blendTime = this.stage === 'punch' ? (this.active.blendIn ?? BLEND_IN) : BLEND_IN;
    const blendIn = smooth(clamp01(this.blendT / blendTime));
    const blendOut = smooth(clamp01(this.blendT / RETURN));
    for (const track of clip) {
      this.blendTo(keyOf(track), sample(track, Math.min(time, clip.duration), KINDS[track.path].create()), blendIn);
    }
    // Nút không thuộc hoạt ảnh này (vd: chân đang bước dở từ cú đấm trước) thì trả dần về tư thế đứng yên.
    for (const [key, base] of this.base) if (!clip.keys.has(key)) this.blendTo(key, base, blendOut);

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

// Vai trò của một animation theo tên, xét lần lượt từ trên xuống. Thứ tự quan trọng: "Right Slide" và "big_right_punch" cũng chứa "right",
// nên phải được nhận trước khi tới "right" / "left" (nếu không sẽ ghi đè cú đấm thường).
const ROLES = [[/knock|death|die/i, 'K'], [/idle/i, 'I'], [/run|sprint/i, 'Run'], [/jump/i, 'J'], [/slide/i, 'S'], [/big/i, 'B'], [/right/i, 'R'], [/left/i, 'L']];
const roleOf = (name) => ROLES.find(([pattern]) => pattern.test(name))?.[1] ?? null;

// Dựng bộ điều khiển hoạt ảnh từ các animation group của một bản sao nhân vật (`body` là nút gốc của bản sao).
// Null nếu model không có animation đấm. Các animation group được dọn ngay vì ta tự phát.
export function createCharacterAnimator(body, groups, options) {
  const groupNodes = body.getChildTransformNodes(false).filter((n) => !(n instanceof BABYLON.AbstractMesh));
  const partnerOf = (node) => (node instanceof BABYLON.AbstractMesh ? node : groupNodes.find((g) => g.name === swapSide(node.name)) ?? node);

  const sets = {};
  for (const group of groups) {
    const side = roleOf(group.name);
    if (side) sets[side] = extractTracks(group);
    group.dispose();
  }
  if (!sets.L && !sets.R) return null;
  if (!sets.L) sets.L = mirrorTracks(sets.R, partnerOf);
  if (!sets.R) sets.R = mirrorTracks(sets.L, partnerOf);
  if (sets.S) sets.SL = mirrorTracks(sets.S, partnerOf); // tay trái của vũ khí hai tay dùng bản soi gương
  return new CharacterAnimator(sets, options);
}
