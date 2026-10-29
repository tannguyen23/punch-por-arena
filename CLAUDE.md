# Punch Por Arena

Game đấm nhau FPP nhiều người: Node (http + `ws`) làm server, Babylon.js làm client. Không có bundler.

Chạy: `npm start` rồi mở `http://localhost:3000` (đổi cổng bằng biến `PORT`).

## Cấu trúc (bắt buộc giữ khi thêm code)

```
server/                 CommonJS
  index.js              entry, chỉ ghép các phần lại, không chứa logic
  config.js             MỌI hằng số của server
  http/                 phục vụ file tĩnh
  net/                  WebSocket: connection.js (dispatch message), messaging.js (send/broadcast)
  game/                 luật chơi: players, spawn, movement, Room, rooms, combat (cận chiến), shooting (súng), rockets (tên lửa bay + nổ), raycast (dò đường đạn 3D), damage (trừ máu, hạ gục), weapons, pickups (hòm tiếp tế), match, sanitize, snapshot
  maps/                 dữ liệu map (1 file/map), terrain.js (sinh địa hình/sông/cầu), propTypes.js, wallKinds.js, layout.js (công cụ dựng bố cục)
  utils/                hàm thuần dùng chung (math, geometry)
public/
  index.html            chỉ markup
  char-anim.html        trang debug hoạt ảnh, mở tại /char-anim
  css/style.css         mọi CSS
  css/charAnim.css      CSS riêng của trang debug hoạt ảnh
  models/               model 3D .glb (kiếm sword_1, nhân vật char, mỗi vũ khí một file), phục vụ tại /models/
  js/                   ES modules, entry là main.js
    config.js           MỌI hằng số của client
    state.js            trạng thái dùng chung (state, remotes, infos)
    core/               scene/engine, keys, meshes (helper dựng mesh, material dùng chung), terrain (độ cao đất, cầu, nước)
    world/              sân đấu: arena.js, ground.js (mặt đất), water.js, bridges.js, props.js (cây/bàn ghế/võ đài...), walls.js (tường, dây ring)
    entities/           nhân vật, vũ khí, vật nhặt (Fist, Arm, avatar, character, remotePlayer, pickup, weapons/)
    player/             người chơi cục bộ: localPlayer.js (di chuyển, cập nhật camera), camera.js, viewmodel.js (tay + vũ khí góc nhìn thứ nhất), gunView.js (súng góc nhìn thứ nhất), attack.js (đấm / bắn), aim.js (hướng ngắm, đầu nòng), collision.js (va chạm)
    net/                socket.js (kết nối), handlers.js (xử lý message, ghép các file *Handlers), pickupHandlers (hòm tiếp tế), combatHandlers (đấm, bắn, nổ), snapshot.js
    ui/                 DOM: hud, weaponPanel (thanh chỉ số vũ khí), hotbar (các ô vũ khí), matchHud (đồng hồ, đếm ngược, bảng xếp hạng), lobbyHud (phòng chờ, 3-2-1, nhãn phòng), menu (tạo/vào phòng), lựa chọn ngoại hình
    debug/              công cụ debug: charAnim.js (trang /char-anim), charScene.js, clipPlayer.js
    fx/                 hiệu ứng hình ảnh: effects.js (tia lửa, ngôi sao, số sát thương), gunEffects.js (vệt đạn, lửa đầu nòng, vụ nổ), rockets.js (tên lửa đang bay)
    audio/              âm thanh: core.js (nền Web Audio dùng chung), sfx.js (cổng chung, các tiếng cũ), gunSfx.js, planeHum.js
```

## Quy tắc

1. **Mỗi file một trách nhiệm.** Thêm tính năng thì thêm file vào đúng thư mục, không nhét thêm vào file đang có việc khác. File vượt ~150 dòng hoặc hàm vượt ~40 dòng thì tách.
2. **Không dùng global** ngoài `BABYLON` (nạp bằng thẻ `<script>`). Dùng `import/export`, không dùng IIFE.
3. **Hằng số** đặt trong `config.js` của đúng bên (server hoặc client), không rải số "ma thuật" trong code.
4. **Trạng thái client dùng chung** nằm trong `state.js`. Module khác ghi qua `state.x = ...` (import không gán lại được).
5. **Thêm message mạng:**
   - Server: thêm handler vào `gameHandlers` trong `server/net/connection.js`. Logic đặt ở `server/game/`, không viết trong file connection.
   - Client: thêm hàm vào `messageHandlers` trong `public/js/net/handlers.js`.
6. **DOM chỉ được chạm trong `ui/`** (hoặc `input.js`). Các module khác gọi hàm của `ui/hud.js`.
7. **Không import vòng.** Chiều phụ thuộc: `main` → `player`/`net`/`ui`/`fx` → `entities`/`world` → `core`/`state`/`config`. `entities` và `world` không import nhau; code dùng chung đặt ở `core`. `core` và `state` không import module nào khác của game.

## Map và vật phẩm

- Map là **dữ liệu**, server là nguồn duy nhất: `server/maps/<tên>.js` khai báo `size`, `ground` (bảng màu đất), `terrain`, `walls`, `props`. Server gửi cả map cho client trong `welcome`, client không có bản sao riêng.
- **Thêm map:** tạo file trong `server/maps/`, đăng ký trong `maps/index.js`, chọn bằng biến môi trường `MAP`. Không sửa code game.
- **Thêm loại vật phẩm:** (1) khai báo bán kính trong `server/maps/propTypes.js` (0 = trang trí, đi xuyên qua được); (2) thêm hàm dựng mesh cùng tên trong `public/js/world/props.js`. Vật phẩm có `r > 0` tự chặn người chơi (client đẩy ra) và tự tránh khi hồi sinh (server).
- **Thêm loại tường:** khai báo trong `server/maps/wallKinds.js` (`blocksPunch` = chặn đòn hay không) và thêm hàm dựng mesh cùng tên trong `public/js/world/walls.js`. Tường là hình chữ nhật `{ x, z, w, d }` (tâm + kích thước), không xoay; muốn tường dọc thì đổi w và d.
- Vật phẩm là hình tròn, tường là hình chữ nhật, cả hai chỉ trên mặt sân (2D). Chỉ tường có `blocksPunch` mới chặn đòn đấm (server kiểm tra trong `combat.js`).
- Bố cục trong file map dùng `layout.js`: `mirror4` (nhân một góc phần tư ra 4 góc), `diningSet`, `crateCluster`, `scatter` (rải ngẫu nhiên theo seed, tránh tường và vùng cấm). Cùng seed thì cùng map.
- Va chạm với vật phẩm và tường hiện chỉ client xử lý (server chỉ tránh chúng khi hồi sinh và khi tính đòn đấm).

## Model 3D (.glb)

- File đặt trong `public/models/`, nạp bằng `BABYLON.SceneLoader` (loader glTF2 lấy từ `babylonjs-loaders`, cùng phiên bản với `babylonjs`). Cần nạp bằng `LoadAssetContainerAsync` một lần rồi `instantiateModelsToScene` cho từng chỗ dùng, đừng nạp lại mỗi lần.
- Đơn vị là mét. Khi vẽ: gốc ở tâm cán/điểm cầm, lưỡi hướng +Y, apply scale. Kích thước thật được đo lúc nạp và co giãn về độ dài đặt trong `config.js` (`SWORD.length`).
- Material của model được tô lại trong code nếu file không có màu. Các instance dùng chung material nên **phải** gọi `Arm.drop()` trước khi `dispose(false, true)` nhân vật, nếu không material dùng chung bị huỷ theo.
- **Nhân vật từ model:** `character.js` nạp `char.glb` cho từng scene (game, menu preview), co về `CHARACTER.height`, hạ chân chạm đất, rồi tô màu theo lựa chọn của người chơi. Tên khối → bộ phận nằm trong `CHARACTER.kinds` (config.js); khối không có tên riêng thì nhận theo **tên nhóm cha** trong `CHARACTER.groupKinds` (vd: mọi khối trong nhóm `hair` là tóc, tô theo `look.hair`); màu cố định (giày, mắt, con ngươi, miệng) nằm ở `CHARACTER.fixedColors`; khối đặt tên tiền tố `shirt_/pants_/glove_/skin_/hair_` thì tự nhận. Mọi chỗ tạo nhân vật dùng `createPlayerAvatar` (có model thì dùng, chưa nạp xong thì dùng nhân vật dựng bằng code). Nhân vật nào cũng phải có `root, upper, legs, fists, pose`. Hoạ tiết áo: UV trong file không dùng được (chỉ chiếm góc ảnh) nên `character.js` tự tính lại UV cho các khối trong `CHARACTER.patternMeshes`. Chân chỉ đưa qua lại khi đi (chưa có animation đi bộ), ngồi chưa có hiệu ứng.
- **Hoạt ảnh của nhân vật model** (`entities/characterAnimator.js`): lấy từ các animation trong `char.glb` — "Left punch", "Right punch", "Jump", "idle", "knock_out" và "Right Slide". Tên animation quyết định vai trò: chứa "knock"/"die" là ngã khi bị hạ, "idle" là đứng yên, "jump" là nhảy, "slide" là cú chém của tay cầm vũ khí, "right"/"left" là đấm tay nào. **Phải kiểm tra "slide" trước "right"/"left"** vì "Right Slide" cũng chứa "right". Mỗi animation xoay/dịch chuyển các nhóm `player` (gốc cả cơ thể), `upper`, `head`, `left_arm`, `right_arm`, hai `*_foream`, `left_L`, `right_L` (cả kênh xoay lẫn dịch chuyển). **Tư thế đứng yên là khung đầu của idle**; nút idle không điều khiển (vd: cẳng tay) giữ tư thế gốc của model. Model không có idle thì như trước: lấy khung đầu của hai cú đấm (thế thủ), nút chỉ có trong Jump lấy khung đầu Jump. Khung đầu của các animation đấm phải trùng nhau ở mọi nút chung, và khung đầu mỗi kênh dịch chuyển phải bằng vị trí gốc của nút (nếu không nhân vật sẽ bị lệch ngay khi đứng yên). **Tên nhóm trong file đặt theo phía người nhìn** (`left_arm` là tay phải của nhân vật) nên đấm trái là cú duỗi nhóm `right_arm`.
- **Đứng yên và ngã:** `idle` lặp liên tục với tốc độ `CHARACTER.idleSpeed` (1 = đúng như file); clip không khép kín nên đoạn cuối được hoà dần về khung đầu (`IDLE_FADE`) cho khỏi giật. `knock_out` chạy một lần khi máu về 0 (`knockOut()`), giữ nguyên tư thế cuối cho tới lúc hồi sinh (`reset()` trả mọi nút về tư thế đứng yên). Người chơi khác chết vẫn hiện nhân vật nằm dưới đất, chỉ ẩn thanh máu/tên; hồi sinh thì đặt thẳng tới chỗ mới. **Tư thế nằm cuối clip phải nằm trên mặt đất ngay trong file** (dời nhóm `player` lên); game không bù độ cao. Tay góc nhìn thứ nhất cũng chạy idle nhưng không cần ngã (bị ẩn khi chết).
- **Đấm:** chạy một lần từ khung đầu tới khung cuối rồi trộn mượt về tư thế đứng yên (khung cuối không cần trùng khung đầu); tốc độ tự tăng nếu cooldown của vũ khí ngắn hơn animation. Thiếu một bên thì tự soi gương bên kia (đổi nút trái↔phải; quaternion (x,y,z,w) → (x,-y,-z,w); vị trí (x,y,z) → (-x,y,z)). **Vũ khí có `attack: 'slide'`** (kiếm, rìu, dao găm, giáo, dao chiến đấu) dùng clip "Right Slide" khi tấn công; tay trái dùng bản soi gương `SL`. Cú chém bắt đầu với tay giơ cao nên trộn vào lâu hơn (`SLIDE_BLEND_IN` 0.1s) để không giật.
- **Nhảy:** người chơi khác bắt đầu hoạt ảnh nhảy khi `y` server báo cao hơn mặt đất (`groundAt`, tính cả mặt cầu) quá `AIRBORNE_HEIGHT` (`remotePlayer.js` gọi `setAirborne`). Tốc độ căn theo thời gian bay `JUMP_AIR_TIME` (0.65s; animation hiện ~0.667s nên chạy gần 1×, clip ngắn hơn sẽ bị kéo chậm cho vừa), **giữ tư thế cuối nếu còn trên không** (rơi dài), trả về tư thế đứng yên khi chạm đất. Đấm giữa không trung thì sau cú đấm quay lại tư thế nhảy. Khung đầu của Jump trùng tư thế đứng yên (idle) nên bắt đầu nhảy không bị giật tay; với model không có idle thì đó là tư thế tay rủ khác thế thủ nên tay hạ nhanh rồi mới giơ lên (do trộn 0.04s).
- Ta tự nội suy khoá (không dùng bộ phát của Babylon); các animation group được dọn ngay sau khi lấy khoá. Thêm animation khác (đi bộ, ngồi...) thì mở rộng `CharacterAnimator` hoặc viết bộ điều khiển riêng, tránh hai bên cùng ghi một nhóm.
- **Chân khi di chuyển:** phần xoay của chân do `pose()` ghi (animator chỉ giữ giá trị trong `rotationOf`, không ghi lên nút `driven`) = bước chân/chân nhảy của animation × đung đưa khi đi; đang bay thì tắt đung đưa. Kênh dịch chuyển thì animator ghi thẳng.
- **Tay của mình ở góc nhìn thứ nhất** (`ensureViewmodel` trong `player/viewmodel.js`): dùng chính nhân vật model (`createModelAvatar(..., { viewmodel: true })`) nên cùng hoạt ảnh đấm, đứng yên và cách cầm vũ khí với người chơi khác. Chỉ hiện các khối trong `VIEWMODEL.meshes` (hai bàn tay; cẳng tay cũng ẩn vì ở thế thủ mắt nhìn dọc cẳng tay từ phía khuỷu nên cẳng tay che mất vũ khí đang cầm), còn lại ẩn bằng `isVisible = false`. **Đừng dùng `setEnabled(false)`**: tắt một khối là tắt luôn mọi khối con, mà `__root__` của file .glb là mesh rỗng chứa cả nhân vật nên hai tay cũng biến mất (lỗi thật từng gặp; test headless không bắt được vì `isEnabled(false)` bỏ qua tổ tiên, hãy dùng `isEnabled()` + `isVisible`). Model vẽ cho người nhìn từ ngoài: ở thế thủ hai bàn tay cách mắt ±0.7m và thấp 0.85m (ngoài tầm nhìn) nên phải co nhỏ (`VIEWMODEL.scale`) và đẩy ra trước (`VIEWMODEL.offset` = vị trí của mắt model trong hệ camera sau khi co); chỉnh hai thông số này để tay lên cao/xuống thấp, gần/xa. Tay được gắn vào camera và vẽ ở nhóm `VIEWMODEL.renderingGroup` (bộ đệm độ sâu xoá trước khi vẽ) để không xuyên tường; vũ khí cầm trên tay cũng vẽ ở nhóm đó. Hướng vũ khí do `firstPersonTilt` của từng vũ khí quyết định (chĩa theo (0, cos t, sin t) của camera) nhưng vẫn gắn chặt vào bàn tay nên đi theo khi vung. Lúc model chưa nạp xong dùng hai nắm đấm hình cầu (`Fist`) rồi tự chuyển sang tay model và cầm lại vũ khí đang có. `VIEWMODEL.enabled = false` để quay về nắm đấm hình cầu. Lưu ý: tay có thể ra ngoài màn hình nếu người chơi đặt FOV rất thấp (Cài đặt cho phép 40°–86°).
- **Vũ khí cầm trên nhân vật model** gắn thẳng vào khối bàn tay (`createHandAnchor` trong `character.js`) nên đi theo tay khi vung; neo được tính một lần ở tư thế đứng yên bằng ma trận nghịch đảo để vũ khí đúng cỡ, không lật gương (cây model mang phép lật z) và kéo dài theo cẳng tay. Khi test chuyển động bằng NullEngine phải gọi `scene.incrementRenderId()` mỗi bước, nếu không Babylon dùng ma trận cũ của nút không bị đánh dấu bẩn (như neo vũ khí) và kết quả sai.

## Debug hoạt ảnh

- Mở `/char-anim` (hoặc `/char-anim.html`): xem nhân vật thật với vũ khí, chạy idle/đấm/nhảy/ngã/chém, chỉnh tốc độ, tạm dừng, đổi camera. Tab "Clip gốc" phát và tua từng animation trong `char.glb` (model được tô màu theo `CHARACTER.kinds`).
- Trang dùng lại `core/scene.js`, `entities/character.js`, `entities/weapons/` nên không ảnh hưởng game. Thêm hành động/animation mới thì sửa `js/debug/charAnim.js` hoặc `charScene.js`.

## Vũ khí

- **Server quyết định tất cả.** Bảng `WEAPONS` trong `server/game/weapons.js` giữ tên, loại (`kind`: `melee` / `gun` / `rocket`), các chỉ số (`damage` sát thương, `range` tầm đánh, `cooldown` ms giữa hai đòn), số đạn khi nhặt (`ammo: [min, max]`, không có = dùng mãi) và độ hiếm khi rơi (`dropWeight`, 0 = không rơi). Client nhận tên, loại và các chỉ số trong `welcome` để hiển thị và tính thời gian hồi, không có bản sao riêng. Hiện chỉ dao, súng lục, AK-47 và súng phóng tên lửa rơi (25% mỗi món); các vũ khí cận chiến cũ vẫn còn trong bảng với `dropWeight: 0`.
- **Nhặt:** vũ khí nằm trong hòm tiếp tế (xem mục Trận đấu). Hòm đã chạm đất thì đi vào bán kính `PICKUP_RADIUS` là tự nhặt, thay vũ khí đang cầm (cùng loại thì cộng dồn đạn). Chết thì về tay không (`fist`). Đổi vũ khí của người chơi luôn qua `equip(p, id, ammo)` để số đạn đi kèm.
- **Đạn:** `p.ammo` (null = dùng mãi). Mỗi phát bắn / mỗi lần chém dao trừ một (`useAmmo`), về 0 thì server tự đổi về tay không. Client trừ ngay khi bắn (`player/attack.js`) và chỉ nhận số từ snapshot khi đã ngừng bắn `AMMO_SYNC_GRACE_MS`, để con số không nhảy lên xuống.
- **Đồng bộ:** message `airdrop` (một hòm, kèm đường bay của máy bay) và `pickup` (bị nhặt); vũ khí và số đạn mỗi người nằm trong snapshot (`w`, `a`). Client dựa vào `w` để cầm đúng model cho mọi người.
- **Thêm vũ khí mới:**
  1. Thêm một dòng vào `WEAPONS` (`server/game/weapons.js`): tên, `kind`, `damage`, `range`, `cooldown`, `ammo`, `dropWeight` (súng thêm `spread`, tên lửa thêm `splash`, `speed`).
  2. Tạo `public/js/entities/weapons/<tên>.js` rồi đăng ký trong `weapons/index.js` (id phải trùng với server). Định nghĩa có `icon`, `firstPersonTilt` và một trong hai cách có hình:
     - `build(side)`: dựng tạm bằng hình khối trong code (xem `dagger.js`, `gauntlet.js`). Gốc ở chỗ cầm, đầu vũ khí hướng +Y. Dùng `colorMaterial` (dùng chung) hoặc vật liệu dùng chung riêng, không tạo vật liệu mới cho mỗi bản.
     - `url`: model `.glb` (xem `sword.js`: `length`, `gripKind`, `colors`, `kindOf`).
     Tuỳ chọn: `dual` (vũ khí hai tay: cầm cả tay trái với `side` = -1, `build` đặt chi tiết đối xứng theo `side`), `autoFire` (giữ chuột là tự đánh / tự bắn theo `cooldown` của vũ khí), `swingSound` (tên âm thanh vung, có trong `kinds` của `audio/sfx.js`, mặc định `whoosh`), `attack: 'slide'` (vũ khí cận chiến dùng animation chém `Right Slide` thay vì đấm). Súng: `shotSound` (có trong `kinds` của `audio/gunSfx.js`), `recoil` (camera hếch lên mỗi phát, radian), `firstPersonTilt: Math.PI / 2` để nòng chĩa thẳng ra trước; dựng súng với nòng hướng +Y, thân súng nằm phía -Z so với tay cầm (ở góc nhìn thứ nhất -Z là phía trên).
  3. Có `.glb` thật thay cho bản dựng tạm: đổi định nghĩa từ `build` sang `url` và xoá `build`, nơi khác không phải sửa. Gốc model đặt ở chỗ cầm, đầu vũ khí hướng +Y.
  Chưa làm bước 2 thì vũ khí vẫn rơi và gây sát thương đúng, chỉ là chưa có hình (vòng sáng vẫn hiện, tay không cầm gì).

- Server dùng `damage`, `range`, `cooldown` của vũ khí đang cầm trong `combat.js`. Thanh chỉ số (`ui/weaponPanel.js`) đọc đúng các trường này; thanh dài theo tỉ lệ so với vũ khí mạnh nhất về chỉ số đó nên vũ khí mới tự vừa. Thêm chỉ số mới: thêm trường vào `WEAPONS` + `weaponInfo()`, thêm một dòng vào `STATS` trong `weaponPanel.js`, và đọc nó trong `combat.js`.
- **Thanh các ô vũ khí** (`ui/hotbar.js`, `HOTBAR_SLOTS` ô): đọc `state.inventory[i]` (id vũ khí hoặc null) và `state.activeSlot`. Hiện server mới cho cầm một vũ khí nên `net/handlers.js` tạm đặt nó vào ô 1; khi làm túi đồ nhiều ô (nhặt vào ô trống, phím 1–3 đổi ô, phím vứt) thì server giữ danh sách ô, gửi trong snapshot/welcome, và client chỉ việc điền `state.inventory`/`state.activeSlot` từ đó. Chuột bị khoá khi chơi nên thao tác dùng phím, không phải click.
- Dùng `equipLoadout(hands, id, tilt)` để cầm vũ khí cho cả hai tay của một người (tự xử lý vũ khí hai tay) và `releaseWeapon(hand)` để bỏ. Các bản vũ khí dùng chung material nên phải `releaseWeapon` cả hai tay trước khi `dispose(false, true)` nhân vật. Hiệu ứng động của vũ khí (vd: tia điện của găng sấm sét) phải tự gỡ khi bị huỷ (`root.onDisposeObservable`); Babylon gỡ observer trễ một nhịp nên đừng kiểm tra ngay sau `dispose()`.

## Súng và tên lửa

- **Bắn:** client gửi `{ t: 'fire', yaw, pitch }` (`player/attack.js`; chuột trái/phải đều bắn, `autoFire` giữ chuột là bắn liên tục). Server (`shooting.js`) kiểm tra pha, hồi chiêu (dư `FIRE_SLACK_MS` cho mạng giật), số đạn, rồi tự tính điểm bắn từ mắt người bắn (`EYE_HEIGHT` / `CROUCH_EYE_HEIGHT`, phải khớp client) — không tin vị trí client gửi kèm.
- **Đường đạn** (`raycast.js`) là 3D: thân người là hình trụ đứng (`BODY_RADIUS`, `BODY_HEIGHT`, thấp hơn khi ngồi), tường `blocksPunch` cao `WALL_HEIGHT` trên mặt đất (khớp `world/walls.js`), đồi chặn đạn (dò từng `TERRAIN_RAY_STEP`). Mặt cầu, cây cối, vật phẩm không chặn đạn. Không bù trễ mạng: server dùng vị trí mới nhất người bị bắn tự báo, nên `BODY_RADIUS` rộng hơn thân thật một chút.
- **Súng:** trúng ngay, server gửi `shot { id, w, from, to, hit, impact }` để mọi người vẽ vệt đạn; sát thương đi qua `applyDamage` (`damage.js`, chung cho đấm / đạn / nổ, gửi `hit`). **Tên lửa:** server mô phỏng đường bay (`rockets.js`, vòng lặp riêng `ROCKET_TICK_MS`), gửi `rocket` lúc bắn và `boom` lúc nổ; client chỉ vẽ theo (`fx/rockets.js`). Sức nổ giảm dần theo khoảng cách tới thân người, không xuyên tường; tự dính thì mất `SELF_SPLASH_MULT` và không ai được tính điểm. Tên lửa còn bay bị bỏ khi đổi pha.
- **Phản hồi trên máy mình** (tiếng súng, lửa đầu nòng, giật tay `state.recoil`, nòng hếch `recoil`) chạy ngay lúc bóp cò; vệt đạn và sát thương chờ server. Lửa đầu nòng của mình vẽ ở nhóm `VIEWMODEL.renderingGroup`, vị trí theo `MUZZLE_OFFSET`.
- **Súng ở góc nhìn thứ nhất** (`player/gunView.js`): súng có `viewHold` không cầm trên tay nhân vật model (tay model bị ẩn) mà đặt cố định trong hệ camera: `position`/`rotation` của chỗ cầm (x phải, y lên, z ra trước), `scale`, `hands` (chỗ găng tay cầm báng và tay đỡ, trong hệ của súng) và `muzzle` (đầu nòng, trong hệ của súng; lửa đầu nòng và vệt đạn của mình bắt đầu từ đây qua `state.muzzle`). Găng, cẳng tay, tay áo dựng bằng hình khối theo màu người chơi chọn (`GUN_VIEW` trong config). Có `.glb` thật thì chỉnh lại `viewHold` cho khớp. Đổi vũ khí thì vũ khí mới đưa từ dưới lên (`EQUIP_RAISE_TIME`), súng giật lùi và hếch nòng theo `state.recoil`.
- **Người khác cầm súng** (`thirdPersonTilt` trong `weapons/index.js`): súng chĩa thẳng ra trước theo hướng thân (vũ khí cận chiến vẫn theo cẳng tay). Chưa có hoạt ảnh bắn, chỉ có lửa đầu nòng và vệt đạn.
- **Giao diện:** tâm ngắm đổi theo loại vũ khí (chấm / dấu cộng / vòng tròn, `updateCrosshair` trong `ui/hud.js`); ô vũ khí và thanh chỉ số dùng hình vẽ `iconSvg` nếu có (`ui/weaponIcon.js`), thanh chỉ số thu gọn còn tên sau `STATS_VISIBLE_MS`; nhặt được thì báo tên và số đạn.

## Model vẽ bằng Blockbench

- Xuất **File → Export → Export glTF Model**, chọn **binary (.glb)**, đặt vào `public/models/`. Gốc (pivot của nhóm ngoài cùng) ở chỗ cầm, đầu vũ khí / nòng súng hướng **+Y**. Kích thước không quan trọng: code đo lúc nạp và co về `length` trong định nghĩa vũ khí.
- Định nghĩa vũ khí chỉ cần `icon`, `firstPersonTilt`, `url`, `length` (+ `shotSound`, `recoil`... nếu là súng). Model có texture thì **không** khai báo `kindOf` / `colors`: material của file được giữ nguyên. Model không có màu thì đặt tên khối theo bộ phận (vd. `barrel`, `grip`, `stock`) và khai báo `kindOf` / `colors` / `gripKind` như `sword.js`.

## Trận đấu

- **Mỗi phòng là một trận riêng** (`server/game/Room.js`): có người chơi, vũ khí trên sân và đồng hồ của riêng nó. Mọi hàm game nhận `room` làm tham số đầu (`handlePunch(room, p, hand)`, `randomFreePosition(room)`, `launchAirdrop(room)`...); `broadcast(room, msg)` chỉ gửi cho người trong phòng đó. **Không dùng biến toàn cục chứa người chơi/vũ khí/đồng hồ.** Server là nguồn duy nhất của đồng hồ (`server/game/match.js`, `tickRoom`).
- **Vòng đời một phòng:** `lobby` (phòng chờ: đi lại được, chưa đánh được) → `countdown` (3-2-1, `COUNTDOWN_MS`) → `playing` (`MATCH_DURATION_MS`, có các đợt vũ khí rơi) → `ended` (`MATCH_INTERMISSION_MS`, xem xếp hạng, không đánh được) → quay về `lobby` (phải bấm F lại, không tự mở trận mới). Từ `lobby` sang `countdown` khi phòng có ít nhất `MIN_PLAYERS_TO_START` người **và** ai cũng sẵn sàng; đang đếm ngược mà có người bỏ sẵn sàng / người mới vào / có người thoát làm thiếu người thì huỷ về `lobby`.
- **Hòm tiếp tế (kiểu PUBG):** `AIRDROP_FIRST_MS` sau khi bắt đầu trận rồi cứ `AIRDROP_INTERVAL_MS` lại có một máy bay (`runAirdrops` trong `match.js`, `launchAirdrop` trong `pickups.js`). Máy bay xuất hiện cách điểm thả `PLANE_APPROACH` mét, bay thẳng theo `heading` với `PLANE_SPEED`, thả hòm khi ở ngay trên điểm thả (độ cao `PLANE_ALTITUDE`), hòm rơi dù `PARACHUTE_MS` rồi mới nhặt được (`landsAt`, kiểm tra trong `tryPickup`). Hòm không kịp chạm đất trước khi hết trận thì không thả. Server gửi hòm qua `pickupView` dạng "còn bao lâu" (`releaseIn`, `landIn`, âm = đã qua) nên người vào giữa chừng thấy đúng máy bay/hòm đang ở đâu; client (`entities/pickup.js`, `airplane.js`, `crate.js`) tự dựng lại cả đường bay từ các số này. Đồng hồ trên màn hình đếm tới lúc hòm chạm đất (`state.match.wave`). Từ lúc hòm rời máy bay tới khi có người nhặt, chỗ hòm rơi bốc cột khói đỏ cao chừng 60m (`entities/smoke.js`, thông số ở `AIRDROP.smoke`) để cả sân thấy; nhặt rồi thì khói tan dần, người vào giữa chừng thấy sẵn cả cột.
- **Hồi máu** (`server/game/regen.js`, chạy trong `tickRoom` khi đang `playing`): không bị trúng đòn `REGEN_DELAY_MS` thì máu tự hồi `REGEN_PER_SEC` mỗi giây tới đầy; mọi sát thương đi qua `applyDamage` nên đều đặt lại `lastHurtAt`. Client chỉ thấy qua `hp` trong snapshot (thanh máu sáng xanh khi máu tăng).
- **Message:** `airdrop`, `pickup`, `start`, `end`; snapshot có `mt` (mili giây còn lại) để client hiệu chỉnh đồng hồ; `welcome.match` cho người vào giữa chừng. Server gửi "còn bao lâu" chứ không gửi mốc giờ tuyệt đối, client tự đổi sang `performance.now()` (`state.match.endsAt`) nên không phụ thuộc đồng hồ máy.
- **Client:** `ui/matchHud.js` chạy mỗi khung hình (đồng hồ, banner đếm ngược, bảng xếp hạng cuối trận, bíp theo giây); `net/handlers.js` xử lý message và phát âm thanh sự kiện. Vũ khí rơi có hoạt ảnh lao xuống từ `FALL_HEIGHT` (`entities/pickup.js`), chạm đất thì gọi `onLand` (tiếng đập + tia lửa).
- **Âm thanh** (`audio/`) đều tổng hợp bằng Web Audio, không dùng file. Thêm âm mới: viết hàm (trong file mới nếu `sfx.js` đã dài) dùng `note({ freq, slideTo, type, delay, dur, peak, ... })` / `filteredNoise(...)` của `audio/core.js`; muốn nghe theo vị trí thì thêm vào bảng `kinds` để dùng với `Sfx.at`. Âm kêu liên tục (tiếng máy bay) trả về handle `{ set(pan, gain), stop() }` (xem `planeHum.js`).

## Địa hình, sông, cầu

- **Lưới độ cao là nguồn duy nhất:** `server/maps/terrain.js` (`buildTerrain(spec)`) sinh lưới độ cao (cm, số nguyên, mỗi `step` mét) từ mô tả trong file map: đồi nhiễu + gò (`bumps`), mặt bằng phẳng quanh võ đài (`plateau`), một con sông uốn lượn quanh tâm sân (`river`) và các cầu (`bridges`). Server gửi nguyên lưới cho client; cả hai nội suy bằng **cùng một hàm** (`interpolate` trong `server/maps/terrain.js` và `public/js/core/terrain.js`, phải khớp từng chữ, mỗi ô chia hai tam giác theo đường chéo (i+1,j)–(i,j+1), đúng như mặt đất được vẽ). Sửa một bên là phải sửa bên kia.
- **Độ cao chân `y` là tuyệt đối** (không phải "cao hơn mặt đất"). Mặt đất tại chỗ đứng: `groundAt(x, z, feetY)` (client: `core/terrain.js`, server: `terrain.groundAt`): mặt cầu nếu chân đã đủ cao để bước lên (`deckY − 0.5`), ngược lại là đất. Đi dưới gầm cầu thì ở đáy sông.
- **Đặt vật thể:** mọi thứ đứng trên đất phải lấy `heightAt(x, z)` làm độ cao gốc (`world/props.js`, `entities/pickup.js`); tường dùng `footprintHeights` để chân chôn xuống và đỉnh vượt đất dốc. Sinh vật phẩm/hồi sinh phải tránh nước: `terrain.isDry(x, z)`; rải ngẫu nhiên thì truyền `reject` cho `scatter`.
- **Sông:** lội được nhưng chậm (`WATER_SPEED_MULT`), có tiếng lõm bõm khi vào/ra; cầu là mặt phẳng nhẹ nhàng đi qua. Mặt nước là một mesh chỉ phủ các ô có chỗ thấp hơn mực nước, độ đục theo độ sâu (alpha từng đỉnh); hoạ tiết gợn sóng trôi bằng `updateWater(dt)` mỗi khung hình.
- **Va chạm vẫn 2D** (tường, vật cản, người chơi). Chỉ đòn đấm có thêm giới hạn chênh độ cao `PUNCH_VERTICAL` (server). Server kẹp `y` client báo vào khoảng [đất − 0.5, đất + 4].
- **Thêm cầu/đồi/đoạn sông:** sửa spec `terrain` trong file map (`bridges.angles`, `bumps`, `river`); client tự dựng hình, không cần sửa code. Cầu nằm dọc trục x hoặc z (trùng đại lộ); đổi hình dạng sông thì kiểm tra lại tường và vật cản không chạm nước.

## Phòng, mã phòng, link mời

- **Mã phòng 3 chữ số (100–999)** do server cấp ngẫu nhiên, không trùng phòng đang có (`server/game/rooms.js`: `createRoom`, `getRoom`, `removeIfEmpty`). Phòng trống thì xoá và mã được dùng lại. Tối đa `ROOM_MAX_PLAYERS` người mỗi phòng.
- **Vào phòng:** client gửi `join` kèm `{ create: true }` (tạo mới) hoặc `{ room: '427' }`. Sai thì server trả `{ t: 'error', reason }` (`bad_code`, `room_not_found`, `room_full`, `server_full`) và **giữ kết nối** để thử lại; đúng thì trả `welcome` kèm `room: { code, max, minPlayers, created }`. Thêm lý do lỗi mới: thêm vào `ERRORS` trong `ui/menu.js`.
- **Link mời** là `/?room=<mã>`: menu đọc tham số này để điền sẵn mã; sau khi vào, client đổi thanh địa chỉ thành link đó. Phím **L** (`copyRoomLink` trong `ui/lobbyHud.js`) sao chép link; người tạo phòng được sao chép tự động.
- **Sẵn sàng:** phím **F** gửi `{ t: 'ready', ready }` (chỉ có tác dụng ở `lobby`/`countdown`); cờ `r` của từng người nằm trong snapshot, pha phòng ở `ph`, thời gian còn lại của pha ở `mt`. Client dựng bảng phòng chờ từ `infos` (danh sách người) + `state.readyIds`.
- **Message theo phòng:** `lobby` (về phòng chờ, `cancelled: true` nếu chỉ là huỷ đếm ngược), `countdown`, `start`, `end`, `airdrop`, `pickup`, `shot`, `rocket`, `boom`, `hit`, `join`, `leave`.
- **Chạy thử:** `npm run dev:solo` hạ ngưỡng xuống 1 người để thử một mình. Tham số: `--min-players=N`, `--match-seconds=S` (hoặc biến môi trường `MIN_PLAYERS`, `MATCH_SECONDS`).

## Bảo mật và đồng bộ

- Mọi dữ liệu từ client là không tin cậy: kiểm tra trong `server/game/sanitize.js` hoặc `movement.js` trước khi dùng.
- Hiển thị tên người chơi bằng `textContent`, không bao giờ `innerHTML`.
- `MIN_DIST` có ở cả `server/config.js` và `public/js/config.js`, hai giá trị phải khớp nhau. Đổi một bên thì đổi bên kia.
- Static server chỉ phục vụ trong `public/` (cộng các file trong `VENDOR_FILES` của `server/config.js`: Babylon và loader glTF). Giữ kiểm tra path traversal.

## Quy ước

- Comment và chuỗi giao diện bằng tiếng Việt, comment giải thích "vì sao", không lặp lại code.
- Không có test tự động. Sau khi sửa phải chạy `npm start` và thử bằng 2 tab trình duyệt.
