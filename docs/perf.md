# Hiệu năng

Tài liệu này ghi lại những gì đã làm game chậm / giật, cách đã sửa, ngưỡng cần giữ và cách đo. Các **quy tắc bắt buộc** nằm ở mục "Hiệu năng" trong `CLAUDE.md`; file này là phần giải thích và số liệu phía sau chúng.

## Cách đo

**Bảng F3 trong game.** Bấm F3 (hoặc mở trang với `?perf`): FPS, thời gian khung hình, thời gian JS cập nhật mỗi khung, thời gian chọn mesh / vẽ / GPU, số draw call, mesh, tam giác, hạt, material, texture, bộ nhớ JS, số lần dọn rác và danh sách các hàm cập nhật nặng nhất. Hàm cập nhật mới trong `main.js` phải gọi qua `measure(fn, dt)` để hiện trong bảng.

**Script đo nhiều người** `scripts/perf-multi.js`: chạy server thật, thêm N bot (WebSocket), mở một trình duyệt quan sát bằng Playwright và in bảng so sánh "1 người" với "nhiều người", profile CPU của luồng chính (kèm chuỗi gọi hàm của `getProgramParameter` / `_markAllSubMeshesAsDirty`), số mesh / material tăng trong 15 giây, và thí nghiệm tắt từng nhóm mesh.

```
npm install --no-save playwright-core        # không ghi vào package.json
node scripts/perf-multi.js 5 default 3120 anh.png
```

- Tham số: số bot, map (`default`, `desert`, `sky-islands`), cổng, đường dẫn ảnh chụp.
- Trình duyệt: biến môi trường `BROWSER_PATH` (mặc định Brave ở `%LOCALAPPDATA%`). Script chạy headless bằng GPU **phần mềm** (SwiftShader).
- **Giới hạn:** số ms tuyệt đối cao hơn máy thật rất nhiều vì GPU là phần mềm. Chỉ dùng để **so sánh trước / sau trên cùng một máy** và đếm thứ không phụ thuộc GPU (draw call, tam giác, thời gian JS, số lần biên dịch shader). Luồng chính của trình duyệt phần lớn rảnh (~80–85%) nên mọi thời gian khung hình dài đều là khâu vẽ.
- Bot trong script: đuổi nhau, nhặt hòm, đánh / bắn / ném. Chưa chạy nước rút, uống thuốc hay chơi sự kiện, nên chưa đo được các phần đó.

## Ngưỡng cần giữ (map default, 6 người, đo bằng script trên)

| Chỉ số | Ngưỡng | Lần đo gần nhất |
|---|---|---|
| Draw call | ≲ 300 | 265 (1 người: 106) |
| Tam giác đang vẽ | ≲ 200 nghìn | 168 nghìn |
| JS cập nhật mỗi khung | ≲ 2ms (tệ nhất ≲ 5ms) | 1.4ms (tệ nhất 2.8ms) |
| Chọn mesh để vẽ (CPU) | ≲ 5ms | 1.7–4.0ms |
| Thời gian biên dịch shader giữa trận (`getProgramParameter`) | giảm về gần 0, chỉ còn lúc vào phòng | ~200ms / 47s (trước: ~680–990ms) |
| Số material / texture | không tăng đều theo thời gian | không tăng |

Ba map có lượng vật trang trí khác nhau (default nhiều nhất: 379 vật, desert 123, sky-islands 49); map mới phải đo lại, đừng giả định.

## Những vấn đề đã gặp và cách đã sửa

| # | Vấn đề | Bằng chứng | Đã sửa bằng | Quy tắc để không lặp lại |
|---|---|---|---|---|
| 1 | Hình cầu mặc định của Babylon (32 đoạn) có **4.624 tam giác**; bụi cây và đá dùng 210 quả ≈ 970 nghìn tam giác | Tắt các quả cầu: thời gian khung 265ms → 91ms | `ball()` nhận số đoạn, mặc định `MESH_DETAIL.ballSegments` (10 = 576 tam giác); đá 8 đoạn + bóng phẳng (`config.js`) | Không gọi `CreateSphere` trực tiếp; dùng `ball()` |
| 2 | Mỗi cây / bụi / đá / ghế / thùng là vài mesh riêng: hơn **1.000 mesh, ~900 draw call** | Tắt hết vật trang trí: draw call 904 → 241 | Dùng **instance**, rồi chuyển sang **thin instance** (`world/props.js`: `INSTANCED`, `resetProps`, `finishProps`): mỗi khối của mỗi loại là một mesh, mọi bản là ma trận trong buffer; 190 cây = 3 draw call | Vật trang trí lặp lại thì thêm vào `INSTANCED`, không dựng mesh riêng |
| 3 | Instance thường vẫn tốn CPU ở bước chọn mesh (mỗi bản một lần kiểm tra khung nhìn) | Chọn mesh 4ms → 16ms sau khi dùng instance thường; về 1.7–4ms với thin instance | Thin instance (xem trên). Đổi lại **không còn cắt theo khung nhìn**: mọi bản luôn được vẽ | Khối của thin instance phải ít tam giác (cả sân ≲ 200 nghìn) |
| 4 | **Đổi `scene.fogMode`** khi bão bắt đầu / kết thúc làm MỌI material biên dịch lại shader | Profile: `set fogMode > markAllMaterialsAsDirty` | Sương mù luôn bật từ đầu (`core/scene.js`, mật độ 0 lúc quang); `fx/weather.js` chỉ đổi mật độ, màu và chỉ khi giá trị đổi (không tạo `Color4` mới mỗi khung) | Không đổi `fogMode`, số đèn hay cờ của material lúc chạy |
| 5 | Tạo **geometry / material / texture mới cho mỗi hiệu ứng** (tia lửa, số sát thương...) | Profile: `damageText > textMaterial > set > _markAllSubMeshesAsDirty`, `_createVertexBuffer`, GC tăng gấp đôi | `fx/effects.js`: mesh nguồn + `createInstance` cho tia lửa và tấm billboard; texture và material của từng số sát thương dựng một lần rồi dùng lại; số sát thương thu nhỏ biến mất thay vì mờ dần | Hiệu ứng nở ra liên tục không được tạo geometry / material / texture mới mỗi lần |
| 6 | **Shader biên dịch giữa trận** làm khung hình đó giật (khung tệ nhất 400–600ms) | Profile: `getProgramParameter` ~680–990ms / 47s, chuỗi `_finalizePipelineContext` | `fx/warmup.js` dùng thử từng hiệu ứng hay gặp ở chỗ không ai thấy lúc vào phòng; hệ hạt mưa tạo sẵn (`prepareRain`) | Hiệu ứng mới hay xuất hiện phải thêm vào `warmup.js` |
| 7 | `updateIce` ghi cỡ và độ trong suốt từng vũng băng mỗi khung hình | Bảng F3: 4ms trung bình, đỉnh 20ms | Chỉ ghi cỡ lúc đang loang, độ mờ theo 20 bậc (`fx/icePatch.js`) | Chỉ ghi thuộc tính khi giá trị đổi |
| 8 | Code JS mỗi khung (`updateWeather`, `updateLightning`, `Fx.update`) cộng lại 3–4ms | Bảng F3 lúc bão | Mục 4 và 5 ở trên (JS mỗi khung 4.6ms → 1.4ms) | Hàm cập nhật mới gọi qua `measure`, xem bảng F3 sau khi thêm |
| 9 | Kiểm kê tam giác (tính bằng NullEngine từ đúng hàm dựng của `world/props.js`): ở map default **bụi cây là 92 nghìn / 138 nghìn tam giác của vật trang trí** (80 bụi × 2 quả cầu × 576), đá 20–23 nghìn mỗi map, cây 23 nghìn; mặt đất 12,8 nghìn, mọi model .glb < 1,2 nghìn | Tính trên giấy, **chưa đo lại bằng F3** | Bụi dựng bằng `MESH_DETAIL.bushSegments` (6 + 5 đoạn, bóng phẳng): 1152 → 452 tam giác mỗi bụi; đá 8 → 7 đoạn. Vật trang trí default ≈ 78 nghìn (trước 138 nghìn), desert ≈ 29 nghìn, sky-islands ≈ 9 nghìn | Thêm vật trang trí lặp lại thì tính số tam giác mỗi bản × số bản trước khi đưa vào map |
| 10 | Động cơ phản lực: 14 mesh thật mỗi người (`doNotInstantiate`) = +14 draw call × số người, dù màu giống nhau với mọi người | Ước tính từ code: 6 người ≈ +84 draw call so với số đo 265 lúc chưa có động cơ | `entities/jetpack.js`: mesh mẫu + 5 material dựng một lần mỗi scene, mỗi người là `InstancedMesh` (quạt vẫn quay riêng nhờ nhân bản animation group), dispose của material dùng chung bị vô hiệu | Thứ giống nhau với mọi người thì dùng instance + material chung; nhân vật (28 mesh, màu riêng mỗi người) vẫn chưa gộp được |
| 11 | Vệt đạn và lửa đầu nòng dựng `CreateBox` / `CreatePlane` **mới mỗi phát bắn**: AK 110ms ≈ 9 phát/giây mỗi người, 7 người ≈ 60+ mesh tạo và huỷ mỗi giây (rác + upload buffer), hai loại này cũng chưa nằm trong `warmup.js` | Chỉ đọc code (chưa đo bằng F3) | `fx/gunEffects.js`: `Fx.instanceOf` (mesh nguồn 1×1×1 / tấm 1×1, bản vẽ đè có nguồn riêng vì Babylon lấy `renderingGroupId` của nguồn), vector tạm dùng chung; thêm vào `warmup.js`. Thử trong NullEngine: 300 phát = 3 mesh thật + 0 material mới | Quy tắc 16 |
| 12 | Sét tạo `StandardMaterial` + `CreateTube` mới mỗi tia, đổi `alpha` qua lại ngưỡng 1 mỗi khung, không có trong warmup; đợt 10 tia / 5 giây | Chỉ đọc code | `fx/lightning.js`: 4 hình tia dựng sẵn (`LIGHTNING_FX.boltVariants`), mỗi tia là instance xoay ngẫu nhiên, một material alpha cố định, chập chờn / tan bằng `scaling`; `prepareLightning` trong warmup; **số tia mỗi đợt 10 → 5** (`LIGHTNING.waveCount`). 40 tia = 4 mesh nguồn + 1 material | Quy tắc 12, 16 |
| 13 | Điện giật dựng lại `LineSystem` (8 đường × 6 điểm = 48 `Vector3` + mảng) mỗi 0,08 giây cho từng người choáng, `new Set()` mỗi khung, huỷ / tạo mesh mỗi lần choáng | Chỉ đọc code | `fx/stun.js`: pool mesh, ghi thẳng vào `Float32Array` + `updateVerticesData`, đánh dấu bằng số khung, làm mới mỗi 0,12 giây (`STUN_FX.refreshSeconds`); `prepareStunFx` trong warmup | Quy tắc 14, 17 |
| 14 | Mưa: 4000 hạt CPU, 2600 hạt/giây × 0,6 giây ≈ 1560 hạt đang sống, mỗi hạt kéo dài trong suốt (JS + fill-rate), đúng lúc có sét | Chỉ đọc code | `WEATHER.rain`: `rate` 1300, `capacity` 1600 (≈ 780 hạt sống). Nếu thấy mưa thưa quá thì tăng `rate` dần, đừng tăng `capacity` | Quy tắc 18 |
| 15 | Phản hồi trúng đòn (vòng sóng, bụi, tia lửa, số): mỗi cú trúng nở ≈ 6–19 instance (đòn nhẹ ít hơn, bụi và vòng nhỏ hơn). 7 người cầm AK ≈ 63 cú/giây ≈ 400–600 instance sống cùng lúc | Chỉ đọc code (ước tính) | Mọi thứ dùng `Fx.instanceOf`/`sourceFor` + material dùng chung, thu nhỏ để tan; chớp model chỉ đổi `emissiveColor` của material riêng, không tạo material. Hit stop chỉ cho cận chiến. Cần đo lại bằng `perf-multi.js` khi nhiều người cầm súng liên thanh: nếu nặng, giảm `HIT_FX.sparks` / `dust` cho đòn nhẹ | Quy tắc 16, 18 |

## Không phải nguyên nhân (đã đo)

- **Server và mạng:** dựng snapshot cho 8 người mất 34µs; xử lý một lần nhận vị trí 2–5µs; server dùng ~3% một lõi CPU khi có 6 người và bot; mỗi người nhận ~27 KB/s.
- **Số người chơi:** 5 người thêm chỉ tốn ~0.3ms mỗi khung (`updateRemotes`) và ~135 draw call.
- **Bộ nhớ và GC:** dọn rác chiếm ~0.6–1.4% thời gian luồng chính; số material tăng khi vào phòng là do mỗi người chơi có khoảng 20 material riêng (không phải rò rỉ).
- **Dò chạm bằng chuột:** Babylon chỉ dò khi có action đăng ký hoặc bật `constantlyUpdateMeshUnderPointer`, game không làm vậy.

## Việc chưa làm / cần theo dõi

- Chưa đo trên GPU thật. Nếu máy yếu vẫn giật, kiểm tra theo thứ tự: tam giác (≲ 200 nghìn), draw call, độ phân giải (engine đang bật antialias, chưa có tuỳ chọn giảm độ phân giải).
- Thin instance không cắt theo khung nhìn; nếu số vật trang trí của một map tăng nhiều, cần chia nhóm theo vùng để cắt được.
- **Còn vi phạm quy tắc 16 (nợ kỹ thuật, chưa sửa):** `explosion`, `flashBurst` (`fx/gunEffects.js`), `shockwave`, `iceBurst` / `icePatch`, `nukeCloud` / `nukeZone`, `rockets` / `grenades` vẫn tạo cầu / torus / material mới mỗi lần. Tạm chấp nhận vì xuất hiện thưa (vài lần mỗi phút), nhưng khi cả phòng ném lựu đạn thì cộng dồn; sửa theo mẫu `Fx.instanceOf` + scale thay alpha. Mây nấm hạt nhân còn tốn fill-rate (nhiều cầu trong suốt rất lớn phủ màn hình).
- Chưa kiểm: hiệu ứng tia điện của găng sấm sét (cooldown 100ms, nhanh nhất game), `fx/ringZone.js`, các hàm cập nhật DOM mỗi khung ở `ui/` (`playerList`, `dogTracker`, `matchHud`).
- Nếu mưa vẫn nặng trên máy yếu: thử `GPUParticleSystem` (cần kiểm tra hỗ trợ và `warmup`).
