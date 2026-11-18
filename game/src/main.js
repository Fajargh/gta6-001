// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), the
// renderer paints what is there and the HUD reports it. The game moves
// between four screens: title, play, paused and wasted.
//
// ?shot=chase|city|drive|mission (with &seed=N) stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createAudio } from './audio.js';
import { createHud, drawMinimap, updateHud } from './hud.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { createWorld, EVENT_PAID, EVENT_WASTED, hudSnapshot, minimapView, readSave, stepWorld, writeSave } from './world.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1337;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const overlayTitle = document.getElementById('overlay-title');
const overlayPause = document.getElementById('overlay-pause');
const overlayWasted = document.getElementById('overlay-wasted');
const hudEl = document.getElementById('hud');
const audio = createAudio();
const renderer = createRenderer(canvas);
const hud = createHud();
const save = readSave();
const world = createWorld(renderer.scene, seed, save);
world.audio = audio;
world.camera = renderer.camera;
// Debug/test hook: the live world, for automated smoke tests (harmless in play).
window.__solmar = world;

function showOnly(overlay) {
  for (const o of [overlayTitle, overlayPause, overlayWasted]) o.classList.toggle('hidden', o !== overlay);
  hudEl.classList.toggle('hidden', overlay !== null);
}

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  showOnly(null);
  const frame = stageShot(name, world, renderer);
  let painted = 0;
  function paint() {
    renderer.setFixed(frame.eye[0], frame.eye[1], frame.eye[2], frame.look[0], frame.look[1], frame.look[2]);
    renderer.render();
    updateHud(hud, hudSnapshot(world, false));
    drawMinimap(hud, world.city.groundTex, minimapView(world));
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = 'title';
  let accumulator = 0;
  let last = performance.now();
  let muted = false;
  // One-shot presses survive a frame shorter than the fixed step: they wait
  // here until a step consumes them, instead of being dropped with the frame.
  let pendingActions = 0;

  function startGame() {
    writeSave(world);
    screen = 'play';
    showOnly(null);
    audio.unlock();
    announce('Playing. Follow the gold marker — Vera is waiting.');
  }

  function wasteGame() {
    screen = 'wasted';
    showOnly(overlayWasted);
    audio.stopEngine();
    writeSave(world);
    announce(`Wasted. The Solmar PD got you. Money $${world.player.money}. Press Space to try again.`);
  }

  function respawn() {
    world.player.health = 100;
    world.player.dead = false;
    world.wanted = 0;
    world.police.cars.splice(0).forEach((c) => world.scene.remove(c.mesh));
    if (world.player.inCar) {
      world.player.inCar.speed = 0;
    }
    world.player.x = 0;
    world.player.z = 18;
    world.player.mesh.position.set(0, 0, 18);
    startGame();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === 'title' && (actions & ACTION_CONFIRM)) startGame();
    else if (screen === 'wasted' && (actions & ACTION_CONFIRM)) respawn();
    else if (actions & ACTION_PAUSE && screen === 'play') {
      screen = 'paused';
      showOnly(overlayPause);
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === 'paused') {
      screen = 'play';
      showOnly(null);
      announce('Playing.');
    }
    return actions;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    pendingActions |= actions;
    if (screen === 'play') {
      while (accumulator >= STEP) {
        const out = stepWorld(world, input, pendingActions, STEP);
        pendingActions = 0;
        accumulator -= STEP;
        if (out.events & EVENT_WASTED) {
          wasteGame();
          break;
        }
        if (out.events & EVENT_PAID) announce(`Job paid. Money $${world.player.money}.`);
      }
      const drag = input.takeDrag();
      renderer.follow(world.player, Math.min(0.05, (now - last) / 1000 + 0.016), drag);
      renderer.render();
      updateHud(hud, hudSnapshot(world, false));
      drawMinimap(hud, world.city.groundTex, minimapView(world));
    } else if (screen === 'title') {
      // Slow orbit over the plaza behind the title card.
      const t = now / 1000;
      renderer.setFixed(30 + Math.sin(t * 0.08) * 26, 26, 30 + Math.cos(t * 0.08) * 26, 0, 4, 0);
      renderer.render();
    } else {
      renderer.render();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      showOnly(overlayPause);
      announce('Paused.');
    }
  });

  showOnly(overlayTitle);
  announce('Solmar Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
