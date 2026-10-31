import { canvas, engine, scene } from './core/scene.js';
import { measure, frameTick, recordUpdate } from './core/perf.js';
import { timeScale } from './core/timeScale.js';
import { initPerfHud, updatePerfHud } from './ui/perfHud.js';
import { showLoading } from './ui/loadingScreen.js';
import { state, remotes, pickups } from './state.js';
import { updateRemote } from './entities/remotePlayer.js';
import { updatePickup, updatePlanes } from './entities/pickup.js';
import { setGameHudVisible } from './ui/hud.js';
import { updateMatchHud } from './ui/matchHud.js';
import { updateLobbyHud } from './ui/lobbyHud.js';
import { updateEventHud } from './ui/eventHud.js';
import { updateDogTracker } from './ui/dogTracker.js';
import { updateDuelHud } from './ui/duelHud.js';
import { initBetFrame, updateBetFrame } from './ui/betFrame.js';
import { updateRingGates } from './fx/ringGates.js';
import { updateRingZone } from './fx/ringZone.js';
import { updateDuelTeams } from './fx/duelTeams.js';
import { updateAudienceEffects } from './fx/duelAudience.js';
import { updateThrowPreview } from './fx/throwPreview.js';
import { updateTomatoSplat } from './ui/duelAudience.js';
import { betOn } from './player/duelBet.js';
import { initPlayerList, updatePlayerList } from './ui/playerList.js';
import { kickPlayer } from './player/kickPlayer.js';
import { updateStamina } from './ui/stamina.js';
import { updateAmmo } from './ui/ammo.js';
import { updateBigPunchHud } from './ui/bigPunchHud.js';
import { updateDash } from './player/dash.js';
import { updateDashHud } from './ui/dashHud.js';
import { updateJetFx } from './fx/jetFx.js';
import { updatePoopHud } from './ui/poopHud.js';
import { updateStinkOverlay } from './ui/stinkOverlay.js';
import { updatePoop } from './player/poop.js';
import { updatePoops } from './fx/poopFx.js';
import { updateWater } from './world/arena.js';
import { updateLocalPlayer } from './player/localPlayer.js';
import { setLocalLook } from './player/viewmodel.js';
import { updateAttack } from './player/attack.js';
import { updateBigPunch } from './player/bigPunch.js';
import { updateSkillThrow } from './player/skillThrow.js';
import { updateGrenadeAim } from './player/grenadeAim.js';
import { updateWeaponThrows } from './fx/skillThrow.js';
import { updatePickupHint } from './player/pickupHint.js';
import { initInput } from './input.js';
import { initMenu } from './ui/menu.js';
import { connect } from './net/socket.js';
import { loadCharacter } from './entities/character.js';
import { loadJetpack } from './entities/jetpack.js';
import { loadSettings } from './settings.js';
import { initSettings } from './ui/settingsPanel.js';
import * as Fx from './fx/effects.js';
import { updateRockets } from './fx/rockets.js';
import { updateGrenades } from './fx/grenades.js';
import { updateWeather } from './fx/weather.js';
import { updateLightning } from './fx/lightning.js';
import { updateGiantShields } from './fx/giantShield.js';
import { updateStunEffects } from './fx/stun.js';
import { updateStunHud } from './ui/stunHud.js';
import { updateIce } from './fx/icePatch.js';
import { updateNuke, preloadNukeSounds } from './fx/nuke.js';
import { updateCloud } from './fx/nukeCloud.js';
import { updateSprintEffects } from './fx/sprintEffects.js';
import * as Sfx from './audio/sfx.js';
import { initTableGame, updateTableGame } from './ui/tableGame.js';
import { tableAction } from './player/tableGame.js';
import { updateTableInvites } from './ui/tableInvites.js';
import { initSpectatorHud, updateSpectatorHud } from './ui/spectatorHud.js';

const params = new URLSearchParams(location.search);
state.spectator = params.get('mode') === 'spectator'; // ?mode=spectator: camera bay tự do + quay phim (player/spectatorCamera.js)

loadSettings();
initSettings();
loadCharacter(scene);
loadJetpack(scene);
initInput();
initSpectatorHud();
initPerfHud(params.has('perf')); // F3 bật / tắt bảng đo hiệu năng, hoặc mở trang với ?perf
initBetFrame(betOn);
initPlayerList(kickPlayer);
initTableGame(tableAction);

// ?autoplay: vào thẳng phòng test (scripts/test-events.js); ở mode này không có cú click nào để xin khoá chuột.
const autoplay = params.has('autoplay');

initMenu((name, look, intent) => {
  state.joined = true;
  setGameHudVisible(true);
  showLoading(); // phủ kín màn hình tới khi sân dựng xong và shader sẵn sàng (net/handlers.js welcome)
  setLocalLook(look);
  Sfx.init();
  preloadNukeSounds();
  connect(name, look, intent);
  if (!autoplay) canvas.requestPointerLock(); // ?autoplay không có cú click nào để xin khoá chuột; bấm vào sân để khoá
});

function updateRemotes(dt) {
  for (const r of remotes.values()) updateRemote(r, dt);
}

function updatePickups(dt) {
  for (const pickup of pickups.values()) updatePickup(pickup, dt);
  updatePlanes(dt);
}

// Mỗi khung hình: `measure` (core/perf.js) chỉ gọi hàm khi tắt bảng F3, bật thì ghi thêm thời gian từng hàm để biết hàm nào nặng.
scene.onBeforeRenderObservable.add(() => {
  const started = performance.now();
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.1) * timeScale(); // quay chậm lúc hạ gục (core/timeScale.js)
  frameTick(engine.getDeltaTime(), started);
  measure(updateLocalPlayer, dt);
  measure(updateStamina);
  measure(updateAmmo);
  measure(updateBigPunch);
  measure(updateDash, dt);
  measure(updateSkillThrow);
  measure(updateGrenadeAim);
  measure(updateBigPunchHud);
  measure(updateDashHud);
  measure(updateAttack);
  measure(updatePickupHint);
  measure(updateRemotes, dt);
  measure(updateSprintEffects, dt);
  measure(updateJetFx, dt);
  measure(updatePickups, dt);
  measure(updateMatchHud);
  measure(updateEventHud);
  measure(updateDuelHud);
  measure(updateBetFrame);
  measure(updateTableGame);
  measure(updateTableInvites);
  measure(updatePlayerList);
  measure(updateRingGates, dt);
  measure(updateRingZone, dt);
  measure(updateDuelTeams);
  measure(updateAudienceEffects);
  measure(updateThrowPreview);
  measure(updateTomatoSplat);
  measure(updateDogTracker);
  measure(updatePoop);
  measure(updatePoopHud);
  measure(updateStinkOverlay);
  measure(updatePoops, dt);
  measure(updateLobbyHud);
  measure(updateWater, dt);
  measure(updateRockets, dt);
  measure(updateGrenades, dt);
  measure(updateWeaponThrows, dt);
  measure(updateWeather, dt);
  measure(updateLightning, dt);
  measure(updateStunEffects, dt);
  measure(updateGiantShields, dt);
  measure(updateStunHud);
  measure(updateIce);
  measure(updateNuke, dt);
  measure(updateCloud, dt);
  measure(Fx.update, dt, 'Fx.update');
  measure(updatePerfHud);
  measure(updateSpectatorHud);
  recordUpdate(performance.now() - started);
});

engine.runRenderLoop(() => scene.render());
addEventListener('resize', () => engine.resize());
