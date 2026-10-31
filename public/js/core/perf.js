import { engine, scene } from './scene.js';

// Số đo hiệu năng cho bảng F3 (ui/perfHud.js). Không làm gì khi tắt (chỉ một phép kiểm tra cờ mỗi lần gọi `measure`), bật thì cứ SAMPLE_MS
// tổng hợp một lần vào `perf`: thời gian khung hình, thời gian JS cập nhật (tách theo từng hàm trong main.js), chi phí của Babylon
// (chọn mesh, vẽ, GPU nếu trình duyệt hỗ trợ), số draw call / mesh / tam giác / hạt, bộ nhớ JS và số lần dọn rác (GC).

const SAMPLE_MS = 500;
const TOP_SECTIONS = 7;
const GC_DROP_BYTES = 1024 * 1024; // bộ nhớ giảm quá ngần này giữa hai lần lấy mẫu = vừa có một lần dọn rác

export const perf = {
  enabled: false,
  sample: 0, // tăng mỗi lần có số liệu mới để giao diện biết mà vẽ lại
  fps: 0, frameAvg: 0, frameMax: 0,
  updateAvg: 0, updateMax: 0, sections: [],
  renderTime: 0, activeMeshesTime: 0, gpuTime: null,
  drawCalls: 0, activeMeshes: 0, totalMeshes: 0, triangles: 0, particles: 0,
  materials: 0, textures: 0, heapMb: null, gcCount: 0,
};

let instrumentation = null;
let afterRender = null;
const drawn = { drawCalls: 0, activeMeshes: 0, triangles: 0, particles: 0 }; // đọc sau khi vẽ: đầu khung hình Babylon vừa đặt lại các bộ đếm
let gpuInstrumentation = null;
let frames = [];
let sections = new Map(); // tên hàm → { total, max } (mili giây) trong cửa sổ đang tích luỹ
let updateTotal = 0;
let updateMax = 0;
let sampledAt = 0;
let lastHeap = 0;
let gcCount = 0;

const count = (value) => (typeof value === 'number' ? value : (value?.current ?? 0));

export function setPerfEnabled(on) {
  perf.enabled = on;
  if (on && !instrumentation) {
    instrumentation = new BABYLON.SceneInstrumentation(scene);
    instrumentation.captureRenderTime = true;
    instrumentation.captureActiveMeshesEvaluationTime = true;
    afterRender = scene.onAfterRenderObservable.add(() => {
      drawn.drawCalls = instrumentation.drawCallsCounter.current;
      drawn.activeMeshes = scene.getActiveMeshes().length;
      drawn.triangles = count(scene.getActiveIndices()) / 3;
      drawn.particles = count(scene.getActiveParticles());
    });
    if (engine.getCaps().timerQuery) {
      gpuInstrumentation = new BABYLON.EngineInstrumentation(engine);
      gpuInstrumentation.captureGPUFrameTime = true;
    }
  } else if (!on) {
    scene.onAfterRenderObservable.remove(afterRender);
    instrumentation?.dispose();
    gpuInstrumentation?.dispose();
    instrumentation = gpuInstrumentation = null;
  }
  frames = [];
  sections.clear();
  updateTotal = updateMax = 0;
}

// Chạy `fn(arg)` và ghi thời gian vào mục `label` (mặc định tên hàm) khi đang bật đo; tắt thì chỉ gọi hàm.
export function measure(fn, arg, label = fn.name) {
  if (!perf.enabled) return fn(arg);
  const started = performance.now();
  fn(arg);
  const took = performance.now() - started;
  const entry = sections.get(label) ?? { total: 0, max: 0 };
  entry.total += took;
  entry.max = Math.max(entry.max, took);
  sections.set(label, entry);
}

// Tổng thời gian JS của một khung hình (toàn bộ phần cập nhật trong main.js).
export function recordUpdate(ms) {
  updateTotal += ms;
  updateMax = Math.max(updateMax, ms);
}

// Gọi đầu mỗi khung hình với khoảng cách (mili giây) tới khung trước. Cứ SAMPLE_MS thì tổng hợp ra `perf`.
export function frameTick(deltaMs, now) {
  if (!perf.enabled) return;
  frames.push(deltaMs);
  if (now - sampledAt < SAMPLE_MS || frames.length < 2) return;
  sampledAt = now;
  const n = frames.length;
  perf.fps = engine.getFps();
  perf.frameAvg = frames.reduce((a, b) => a + b, 0) / n;
  perf.frameMax = Math.max(...frames);
  perf.updateAvg = updateTotal / n;
  perf.updateMax = updateMax;
  perf.sections = [...sections].map(([name, e]) => ({ name, avg: e.total / n, max: e.max }))
    .sort((a, b) => b.avg - a.avg).slice(0, TOP_SECTIONS);
  perf.renderTime = instrumentation.renderTimeCounter.lastSecAverage;
  perf.activeMeshesTime = instrumentation.activeMeshesEvaluationTimeCounter.lastSecAverage;
  perf.gpuTime = gpuInstrumentation ? gpuInstrumentation.gpuFrameTimeCounter.lastSecAverage / 1e6 : null; // nanô giây → mili giây
  Object.assign(perf, drawn);
  perf.totalMeshes = scene.meshes.length;
  perf.materials = scene.materials.length;
  perf.textures = scene.textures.length;
  const heap = performance.memory?.usedJSHeapSize ?? 0;
  if (heap && lastHeap - heap > GC_DROP_BYTES) gcCount++;
  lastHeap = heap;
  perf.heapMb = heap ? heap / 1048576 : null;
  perf.gcCount = gcCount;
  perf.sample++;
  frames = [];
  sections.clear();
  updateTotal = updateMax = 0;
}
