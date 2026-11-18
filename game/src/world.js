// The world: everything that lives in Solmar Bay, advanced one fixed step
// at a time — Rex, the traffic, the pedestrians, the police, the wanted
// level, the missions, and the save. No drawing here; the renderer paints
// what this builds, and main.js owns the screens.
import { CITY, MISSIONS, PLAYER, SAVE_KEY, STEP, WANTED } from './config.js';
import { buildCity } from './city.js';
import { createMissions, currentMission, missionObjectiveText, missionSpots, missionTarget, updateMissions } from './missions.js';
import { createPedestrians, updatePedestrians } from './pedestrians.js';
import { createPlayer, enterCar, exitCar, nearestEnterableCar, punch, shoot, stepDriving, stepOnFoot } from './player.js';
import { createPolice, createParkedCars, createTraffic, updatePolice, updateTraffic } from './vehicles.js';
import { createRandom } from './random.js';
import { ACTION_ENTER, ACTION_PUNCH, ACTION_SHOOT } from './input.js';

export const EVENT_PAID = 1;
export const EVENT_WASTED = 2;
export const EVENT_MISSION_DONE = 4;

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || !s) return null;
    return s;
  } catch {
    return null;
  }
}

export function writeSave(world) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: world.player.money,
      missionsCompleted: world.missions.index >= MISSIONS.length || world.missions.stage === 'allDone'
        ? MISSIONS.length
        : world.missions.index,
      x: world.player.x,
      z: world.player.z,
      health: world.player.health,
    }));
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}

export function createWorld(scene, seed, save) {
  const random = createRandom(seed);
  const city = buildCity(random);
  scene.add(city.group);

  const player = createPlayer(scene);
  if (save) {
    player.money = save.money || 0;
    player.health = save.health ?? PLAYER.maxHealth;
    if (typeof save.x === 'number' && typeof save.z === 'number') {
      player.x = save.x;
      player.z = save.z;
      player.mesh.position.set(save.x, 0, save.z);
    }
  }

  const spots = missionSpots();
  const parked = createParkedCars(scene, random, [
    { x: spots.cometSpot.x, z: spots.cometSpot.z, heading: Math.PI / 2 },
    { x: -54, z: 66, heading: 0 },
    { x: 66, z: -54, heading: Math.PI },
    { x: -66, z: -6, heading: Math.PI / 2 },
    { x: 6, z: 114, heading: 0 },
  ]);
  const traffic = createTraffic(scene, random, 12);
  const peds = createPedestrians(scene, random, 22);
  const police = createPolice(scene);
  const missions = createMissions(scene, save);

  const world = {
    scene,
    random,
    city,
    player,
    parked,
    traffic,
    peds,
    police,
    missions,
    wanted: 0,
    wantedTimer: 0,
    unseenTimer: 0,
    danger: null,
    elapsed: 0,
    onMissionAdvanced: null,
    audio: null,
  };
  return world;
}

function raiseWanted(world, stars) {
  world.wanted = Math.min(WANTED.maxStars, world.wanted + stars);
  world.unseenTimer = 0;
}

/** Are any police close enough to see Rex right now? */
function policeCanSee(world) {
  const p = world.player;
  for (const c of world.police.cars) {
    if (Math.hypot(c.x - p.x, c.z - p.z) < 55) return true;
  }
  return false;
}

/**
 * One fixed step. `input` is the live input object; `actions` are the
 * one-shot flags taken this frame. Returns event flags for the caller.
 */
export function stepWorld(world, input, actions, dt) {
  let events = 0;
  const player = world.player;
  world.elapsed += dt;
  if (player.punchTimer > 0) player.punchTimer -= dt;
  if (player.shootTimer > 0) player.shootTimer -= dt;
  if (player.hurtTimer > 0) player.hurtTimer -= dt;

  // Camera yaw follows the mouse drag.
  const drag = input.takeDrag();
  player.camYaw += drag.x * 0.005;

  if (actions & ACTION_ENTER) { // E: get in / out of a car
    if (player.inCar) {
      exitCar(player);
      world.audio?.stopEngine();
    } else {
      const car = nearestEnterableCar(player, [...world.parked, ...world.traffic]);
      if (car) {
        const wasParked = car.parked;
        enterCar(player, car);
        world.audio?.startEngine();
        if (wasParked) raiseWanted(world, 1); // stealing a parked car draws the heat
        if (car.missionCar && world.missions.index === 0) world.missions.message = 'Comet GT taken. Get to the marina!';
      }
    }
  }
  if (actions & ACTION_PUNCH) { // F: punch
    const hit = punch(player, world.peds, world.police.cars);
    if (hit) {
      world.audio?.punch();
      if (hit.kind === 'ped') raiseWanted(world, 1);
      if (hit.kind === 'police') raiseWanted(world, 2);
    }
  }
  if (actions & ACTION_SHOOT) { // click: shoot
    const shot = shoot(player, world.scene, world.peds, world.police.cars, world.camera);
    if (shot) {
      world.audio?.shoot();
      world.danger = { x: player.x, z: player.z };
      raiseWanted(world, 2);
    }
  }

  let moving = false;
  if (player.inCar) {
    stepDriving(player, input, dt, world.city.colliders);
    world.audio?.setEngine(Math.abs(player.inCar.speed) / 38);
  } else {
    moving = stepOnFoot(player, input, dt, world.city.colliders);
  }

  // Traffic and pedestrians keep the city alive.
  updateTraffic(world.traffic, dt, world.random, world.city.colliders);
  updatePedestrians(world.peds, dt, world.random, world.city.colliders, world.danger);
  if (world.danger) world.danger = null;

  // Police chase Rex while he is wanted; getting arrested costs health.
  updatePolice(world.police, dt, player, world.wanted, world.random, world.city.colliders);
  for (const c of world.police.cars) {
    if (Math.hypot(c.x - player.x, c.z - player.z) < 3.4 && player.hurtTimer <= 0) {
      player.health -= 12;
      player.hurtTimer = 1;
      if (player.inCar) {
        // A cruiser ramming the car slows it hard.
        player.inCar.speed *= 0.4;
      }
      if (player.health <= 0) {
        player.health = 0;
        player.dead = true;
        events |= EVENT_WASTED;
      }
    }
  }
  // Bumping a pedestrian while driving draws the heat, too.
  if (player.inCar && Math.abs(player.inCar.speed) > 6) {
    for (const p of world.peds) {
      if (Math.hypot(p.x - player.x, p.z - player.z) < 2.4) {
        p.panic = 3;
        p.x += (p.x - player.x) * 1.5;
        p.z += (p.z - player.z) * 1.5;
        raiseWanted(world, 1);
      }
    }
  }

  // Wanted decay: out of sight for a while, one star drops at a time.
  if (world.wanted > 0) {
    if (policeCanSee(world)) world.unseenTimer = 0;
    else {
      world.unseenTimer += dt;
      if (world.unseenTimer > WANTED.decaySeconds) {
        world.wanted -= 1;
        world.unseenTimer = 0;
      }
    }
  }

  // Missions.
  const mOut = updateMissions(world.missions, world.scene, player, world, dt);
  if (mOut.paid > 0) {
    events |= EVENT_PAID | EVENT_MISSION_DONE;
    world.audio?.paid();
    writeSave(world);
  }

  // Autosave every 10 seconds of play.
  if (Math.floor(world.elapsed) % 10 === 0 && Math.floor(world.elapsed - dt) % 10 !== 0) writeSave(world);

  return { events, moving };
}

/** The prompt line under the HUD ("Press E to steal the Comet GT", ...). */
export function promptFor(world) {
  const player = world.player;
  if (player.inCar) return 'E — get out   ·   W/S drive   ·   A/D steer   ·   Space handbrake';
  const car = nearestEnterableCar(player, [...world.parked, ...world.traffic]);
  if (car) return `E — ${car.parked ? 'steal' : 'take'} the ${car.name}`;
  return 'WASD move   ·   Shift run   ·   F punch   ·   click to shoot   ·   drag mouse to look';
}

/** Everything the HUD and minimap need, in one snapshot. */
export function hudSnapshot(world, moving) {
  const m = currentMission(world.missions);
  return {
    health: world.player.health,
    money: world.player.money,
    wanted: world.wanted,
    speed: world.player.inCar ? world.player.inCar.speed : 0,
    inCar: !!world.player.inCar,
    moving,
    objective: missionObjectiveText(world.missions),
    missionTitle: world.missions.stage === 'allDone' ? 'Solmar Bay — Free Roam' : (m ? m.title : ''),
    toast: world.missions.messageTimer > 0 ? world.missions.message : '',
    prompt: promptFor(world),
  };
}

export function minimapView(world) {
  return {
    player: world.player,
    traffic: [...world.traffic, ...world.parked],
    police: world.police.cars,
    target: missionTarget(world.missions),
  };
}

export { STEP };
