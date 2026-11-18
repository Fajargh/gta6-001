// Rex Marlowe, the player: on-foot movement with a third-person camera,
// getting in and out of cars, arcade driving, punching and shooting.
import { CAR, CITY, PALETTE, PLAYER } from './config.js';
import { collideCircle } from './city.js';
import { makePersonMesh } from './pedestrians.js';

export function createPlayer(scene) {
  const mesh = makePersonMesh(PALETTE.playerJacket, PALETTE.playerPants, 1.05);
  scene.add(mesh);
  return {
    mesh,
    x: 0,
    z: 18,
    heading: 0,
    camYaw: 0,
    speed: 0,
    health: PLAYER.maxHealth,
    money: 0,
    inCar: null, // the car object Rex is driving, or null
    walkPhase: 0,
    punchTimer: 0,
    shootTimer: 0,
    hurtTimer: 0,
    dead: false,
  };
}

/** Move on foot. Returns true when Rex moved this step. */
export function stepOnFoot(player, input, dt, colliders) {
  const fwd = (input.keys.has('KeyW') || input.keys.has('ArrowUp') ? 1 : 0)
    - (input.keys.has('KeyS') || input.keys.has('ArrowDown') ? 1 : 0);
  const strafe = (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? 1 : 0)
    - (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? 1 : 0);
  const run = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
  const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(fwd, strafe) || 1;
  const mx = (Math.sin(player.camYaw) * fwd + Math.cos(player.camYaw) * strafe) / len;
  const mz = (Math.cos(player.camYaw) * fwd - Math.sin(player.camYaw) * strafe) / len;
  const moving = fwd !== 0 || strafe !== 0;
  if (moving) {
    player.x += mx * speed * dt;
    player.z += mz * speed * dt;
    player.heading = Math.atan2(mx, mz);
    player.walkPhase += dt * speed * 1.6;
  }
  player.x = Math.max(-CITY.half + 2, Math.min(CITY.half - 2, player.x));
  player.z = Math.max(-CITY.half + 2, Math.min(CITY.half - 2, player.z));
  collideCircle(player, PLAYER.radius, colliders);
  const swing = moving ? Math.sin(player.walkPhase) * 0.6 : 0;
  player.mesh.getObjectByName('legL').rotation.x = swing;
  player.mesh.getObjectByName('legR').rotation.x = -swing;
  player.mesh.getObjectByName('armL').rotation.x = -swing * 0.7;
  player.mesh.getObjectByName('armR').rotation.x = swing * 0.7;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  return moving;
}

/** Arcade driving: throttle, brake/reverse, steering that scales with speed. */
export function stepDriving(player, input, dt, colliders) {
  const car = player.inCar;
  const throttle = input.keys.has('KeyW') || input.keys.has('ArrowUp')
    ? CAR.accel
    : input.keys.has('KeyS') || input.keys.has('ArrowDown')
      ? (car.speed > 0.5 ? -CAR.brake : -CAR.reverseAccel)
      : 0;
  const steerInput = (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? 1 : 0)
    - (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? 1 : 0);
  const handbrake = input.keys.has('Space');
  car.speed += throttle * dt;
  if (throttle === 0) car.speed *= Math.max(0, 1 - 0.9 * dt);
  if (handbrake) car.speed *= Math.max(0, 1 - 4 * dt);
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += steerInput * CAR.steer * dt * dir * Math.min(1, Math.abs(car.speed) / 9 + 0.2);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  car.x = Math.max(-CITY.half + 4, Math.min(CITY.half - 4, car.x));
  car.z = Math.max(-CITY.half + 4, Math.min(CITY.half - 4, car.z));
  collideCircle(car, 2.2, colliders);
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  car.mesh.userData.wheels.forEach((w, i) => {
    w.rotation.x += car.speed * dt * 2;
    if (i < 2) w.rotation.y = steerInput * 0.35;
  });
  player.x = car.x;
  player.z = car.z;
  player.heading = car.heading;
  player.camYaw = car.heading + Math.PI; // camera sits behind the car
}

/** Find the nearest car Rex can enter (parked or traffic, within reach). */
export function nearestEnterableCar(player, cars, maxDist = 4.5) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = Math.hypot(car.x - player.x, car.z - player.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function enterCar(player, car) {
  car.parked = false;
  player.inCar = car;
  player.mesh.visible = false;
}

export function exitCar(player) {
  const car = player.inCar;
  if (!car) return;
  player.inCar = null;
  player.mesh.visible = true;
  player.x = car.x - Math.sin(car.heading + Math.PI / 2) * 3;
  player.z = car.z - Math.cos(car.heading + Math.PI / 2) * 3;
  player.mesh.position.set(player.x, 0, player.z);
}

/** A punch: short range, knocks the target back, raises the heat. */
export function punch(player, peds, policeCars) {
  if (player.punchTimer > 0 || player.inCar) return null;
  player.punchTimer = 0.45;
  const reach = 2.4;
  const fx = Math.sin(player.heading);
  const fz = Math.cos(player.heading);
  for (const p of peds) {
    const dx = p.x - player.x;
    const dz = p.z - player.z;
    if (Math.hypot(dx, dz) < reach && dx * fx + dz * fz > 0) {
      p.panic = 3;
      p.heading = Math.atan2(dx, dz);
      p.x += dx * 0.8;
      p.z += dz * 0.8;
      return { kind: 'ped', target: p };
    }
  }
  for (const c of policeCars) {
    const dx = c.x - player.x;
    const dz = c.z - player.z;
    if (Math.hypot(dx, dz) < reach + 1) return { kind: 'police', target: c };
  }
  return { kind: 'air' };
}

/** A shot: hitscan toward the camera aim, returns the hit point for the tracer. */
export function shoot(player, scene, peds, policeCars, camera) {
  if (player.shootTimer > 0 || player.inCar) return null;
  player.shootTimer = 0.3;
  const origin = new THREE.Vector3(player.x, 1.5, player.z);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();
  let best = null;
  let bestD = 60;
  for (const p of [...peds]) {
    const dx = p.x - origin.x;
    const dz = p.z - origin.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < 0 || along > bestD) continue;
    const perp = Math.abs(dx * dir.z - dz * dir.x);
    if (perp < 1.2) {
      bestD = along;
      best = { kind: 'ped', target: p, point: new THREE.Vector3(p.x, 1.2, p.z) };
    }
  }
  for (const c of policeCars) {
    const dx = c.x - origin.x;
    const dz = c.z - origin.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < 0 || along > bestD) continue;
    const perp = Math.abs(dx * dir.z - dz * dir.x);
    if (perp < 2.4) {
      bestD = along;
      best = { kind: 'police', target: c, point: new THREE.Vector3(c.x, 1, c.z) };
    }
  }
  const end = best
    ? best.point
    : origin.clone().add(dir.clone().multiplyScalar(55));
  if (best && best.kind === 'ped') {
    best.target.panic = 4;
    best.target.heading = Math.atan2(best.target.x - origin.x, best.target.z - origin.z);
  }
  // Muzzle flash + tracer, both removed after a blink.
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe066 }),
  );
  flash.position.copy(origin).add(dir.clone().multiplyScalar(1.2));
  scene.add(flash);
  const tracerGeo = new THREE.BufferGeometry().setFromPoints([origin, end]);
  const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 }));
  scene.add(tracer);
  setTimeout(() => {
    scene.remove(flash);
    scene.remove(tracer);
  }, 70);
  return { hit: best, end };
}
