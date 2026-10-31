import { perf, setPerfEnabled } from '../core/perf.js';

const el = document.getElementById('perf');
let drawn = -1;

const ms = (value) => value.toFixed(1);
const big = (value) => (value >= 1e6 ? `${(value / 1e6).toFixed(2)}M` : value >= 1e3 ? `${(value / 1e3).toFixed(0)}k` : `${Math.round(value)}`);

// Bảng đo hiệu năng (F3 bật / tắt, hoặc mở trang với ?perf). Ghi lại số liệu mỗi nửa giây từ core/perf.js.
export function togglePerf() {
  setPerfEnabled(!perf.enabled);
  el.hidden = !perf.enabled;
  drawn = -1;
}

export function initPerfHud(startOn) {
  if (startOn) togglePerf();
}

// Gọi mỗi khung hình; chỉ đụng DOM khi có số liệu mới.
export function updatePerfHud() {
  if (!perf.enabled || perf.sample === drawn) return;
  drawn = perf.sample;
  const lines = [
    `FPS ${perf.fps.toFixed(0)}  ·  khung ${ms(perf.frameAvg)}ms (tệ nhất ${ms(perf.frameMax)}ms)`,
    `JS cập nhật ${ms(perf.updateAvg)}ms (tệ nhất ${ms(perf.updateMax)}ms)`,
    `Babylon: chọn mesh ${ms(perf.activeMeshesTime)}ms · vẽ ${ms(perf.renderTime)}ms · GPU ${perf.gpuTime === null ? 'không đo được' : `${ms(perf.gpuTime)}ms`}`,
    `Draw call ${perf.drawCalls} · mesh ${perf.activeMeshes}/${perf.totalMeshes} · tam giác ${big(perf.triangles)} · hạt ${perf.particles}`,
    `Material ${perf.materials} · texture ${perf.textures} · bộ nhớ JS ${perf.heapMb === null ? 'n/a' : `${perf.heapMb.toFixed(0)}MB`} · GC ${perf.gcCount} lần`,
    '— hàm cập nhật nặng nhất (ms/khung) —',
    ...perf.sections.map((s) => `${s.name.padEnd(22)} ${ms(s.avg).padStart(5)}  (max ${ms(s.max)})`),
  ];
  el.textContent = lines.join('\n');
}
