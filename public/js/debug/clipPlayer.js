// Phát/tua một animation group gốc của model (chế độ "Clip gốc" trong trang debug).
// Không dùng bộ phát của Babylon: ta tự giữ thời gian để có thể dừng, đổi tốc độ và kéo thanh thời gian.
export function createClipPlayer(groups) {
  const names = groups.map((g) => g.name);
  let group = null;
  let time = 0;
  let duration = 0;
  let fps = 60;
  let playing = false;
  let loop = true;

  function apply() {
    group?.goToFrame(time * fps); // group phải đang ở trạng thái playing/paused
  }

  function select(name) {
    group?.stop();
    group = groups.find((g) => g.name === name) ?? groups[0] ?? null;
    if (!group) return;
    group.stop();
    group.start(false, 1);
    group.pause();
    fps = group.targetedAnimations[0]?.animation.framePerSecond ?? 60;
    duration = Math.max(group.getLength(), 1 / fps);
    time = 0;
    playing = true;
    apply();
  }

  function seek(t) {
    time = Math.max(0, Math.min(duration, t));
    apply();
    return time;
  }

  function update(dt) {
    if (!group || !playing) return;
    time += dt;
    if (time >= duration) {
      if (loop) {
        time %= duration;
      } else {
        time = duration;
        playing = false;
      }
    }
    apply();
  }

  return {
    names,
    select,
    seek,
    update,
    get group() {
      return group;
    },
    get time() {
      return time;
    },
    get duration() {
      return duration;
    },
    get fps() {
      return fps;
    },
    get playing() {
      return playing;
    },
    get loop() {
      return loop;
    },
    setPlaying(value) {
      if (value && duration > 0 && time >= duration) time = 0; // hết clip mà bấm phát lại thì chạy từ đầu
      playing = Boolean(value) && Boolean(group);
      group?.pause(); // goToFrame chỉ có tác dụng khi group đang playing hoặc paused
    },
    setLoop(value) {
      loop = Boolean(value);
    },
  };
}
