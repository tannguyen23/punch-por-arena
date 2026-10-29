import { canvas, engine, scene } from './core/scene.js';
import { state, remotes, pickups } from './state.js';
import { updateRemote } from './entities/remotePlayer.js';
import { updatePickup } from './entities/pickup.js';
import { updateMatchHud } from './ui/matchHud.js';
import { updateLobbyHud } from './ui/lobbyHud.js';
import { updateStamina } from './ui/stamina.js';
import { updateWater } from './world/arena.js';
import { updateLocalPlayer } from './player/localPlayer.js';
import { setLocalLook } from './player/viewmodel.js';
import { updateAttack } from './player/attack.js';
import { updatePickupHint } from './player/pickupHint.js';
import { initInput } from './input.js';
import { initMenu } from './ui/menu.js';
import { connect } from './net/socket.js';
import { loadCharacter } from './entities/character.js';
import { loadSettings } from './settings.js';
import { initSettings } from './ui/settingsPanel.js';
import * as Fx from './fx/effects.js';
import { updateRockets } from './fx/rockets.js';
import { updateGrenades } from './fx/grenades.js';
import { updateWeather } from './fx/weather.js';
import { updateLightning } from './fx/lightning.js';
import { updateSprintEffects } from './fx/sprintEffects.js';
import * as Sfx from './audio/sfx.js';

loadSettings();
initSettings();
loadCharacter(scene);
initInput();

initMenu((name, look, intent) => {
  state.joined = true;
  setLocalLook(look);
  Sfx.init();
  connect(name, look, intent);
  canvas.requestPointerLock();
});

scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);
  updateLocalPlayer(dt);
  updateStamina();
  updateAttack();
  updatePickupHint();
  for (const r of remotes.values()) updateRemote(r, dt);
  updateSprintEffects(dt);
  for (const pickup of pickups.values()) updatePickup(pickup, dt);
  updateMatchHud();
  updateLobbyHud();
  updateWater(dt);
  updateRockets(dt);
  updateGrenades(dt);
  updateWeather(dt);
  updateLightning(dt);
  Fx.update(dt);
});

engine.runRenderLoop(() => scene.render());
addEventListener('resize', () => engine.resize());
