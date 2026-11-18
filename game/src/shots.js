// The screenshot scenes behind ?shot=chase|city|drive|mission. Each one sets
// the real world to a staged state (same seed, same setup every time), runs
// it forward a fixed number of steps, frames the camera, paints twice and
// sets window.__shotReady — so the frame is what the game really looks like.
import { STEP } from './config.js';
import { enterCar, exitCar } from './player.js';
import { ensureCrate } from './missions.js';
import { spawnPoliceCruiser } from './vehicles.js';
import { stepWorld } from './world.js';

function fakeInput(held = []) {
  const keys = new Set(held);
  return {
    keys,
    takeDrag() { return { x: 0, y: 0 }; },
    takeActions() { return 0; },
  };
}

function runSteps(world, seconds, held) {
  const input = fakeInput(held);
  for (let i = 0; i < seconds / STEP; i += 1) stepWorld(world, input, 0, STEP);
}

/**
 * Stage the named scene on a fresh world. Returns the camera framing
 * { eye: [x,y,z], look: [x,y,z] } for the shot.
 */
export function stageShot(name, world, renderer) {
  const p = world.player;
  if (name === 'chase') {
    // Cover: Rex in the Comet GT, 3 wanted stars, two cruisers closing in.
    const car = world.parked[0];
    p.x = car.x;
    p.z = car.z;
    enterCar(p, car);
    car.speed = 26;
    car.heading = 0; // north up the central boulevard, clear sightlines
    car.x = 0;
    car.z = -60;
    p.x = 0;
    p.z = -60;
    world.wanted = 3;
    spawnPoliceCruiser(world.police, -10, -90, world.random);
    spawnPoliceCruiser(world.police, 12, -84, world.random);
    runSteps(world, 2.5, ['KeyW']);
    // Three-quarter rear view: the Comet GT in frame with a cruiser behind it.
    let cop = null;
    let copD = Infinity;
    for (const c of world.police.cars) {
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d < copD) {
        copD = d;
        cop = c;
      }
    }
    const lookX = cop ? (p.x + cop.x) / 2 : p.x + 6;
    const lookZ = cop ? (p.z + cop.z) / 2 : p.z + 10;
    return { eye: [p.x - 13, 6, p.z - 16], look: [lookX, 1.5, lookZ] };
  }
  if (name === 'drive') {
    // Rex cruising a boulevard in the Comet GT, traffic around him.
    const car = world.parked[0];
    enterCar(p, car);
    car.speed = 24;
    car.heading = 0;
    car.x = -60;
    car.z = 0;
    p.x = -60;
    p.z = 0;
    runSteps(world, 2, ['KeyW']);
    return { eye: [p.x - 12, 5.5, p.z - 13], look: [p.x + 8, 1.5, p.z + 12] };
  }
  if (name === 'mission') {
    // On foot on the north road, walking toward the crate and its gold beacon.
    p.x = -60;
    p.z = -120;
    p.camYaw = Math.PI / 2; // facing east, down the road toward the market
    world.missions.index = 1;
    world.missions.stage = 'go';
    ensureCrate(world.missions, world.scene);
    runSteps(world, 1.5, ['KeyW']);
    return { eye: [-76, 6.5, -120], look: [-28, 2, -115] };
  }
  // 'city' (default): Rex on foot on the central boulevard, looking down a
  // street of towers, traffic and palms — no walking, so the frame stays put.
  p.x = 0;
  p.z = -42;
  p.heading = 0;
  p.camYaw = Math.PI;
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = 0;
  runSteps(world, 0.4, []);
  return { eye: [-13, 8, -66], look: [10, 2, 30] };
}

export { exitCar };
