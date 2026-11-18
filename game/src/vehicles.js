// Cars: the factory that builds every vehicle mesh, the traffic that drives
// the road grid, and the Solmar PD cruisers that chase the player.
import { CAR, CITY, POLICE } from './config.js';
import { collideCircle, onRoad } from './city.js';

const CAR_COLORS = [0xd64545, 0x2e86ab, 0xf2c94c, 0x7fb069, 0xe8e8e8, 0x5b5f97, 0xff8c42, 0x9b5de5];
const CAR_NAMES = ['Comet GT', 'Sunray Coupe', 'Harbour Van', 'Palm Sedan', 'Dune Buggy', 'Marina Taxi'];

/** Build a low-poly car: body, cabin, wheels, headlights and taillights. */
export function makeCarMesh(color, police = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: police ? 0xf5f5f5 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 2.2),
    new THREE.MeshLambertMaterial({ color: police ? 0x111827 : 0x22384a }),
  );
  cabin.position.set(0, 1.35, -0.25);
  g.add(cabin);
  if (police) {
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.2, 1.2), new THREE.MeshLambertMaterial({ color: 0x111827 }));
    hood.position.set(0, 0.95, 1.5);
    g.add(hood);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    bar.position.set(0, 1.8, -0.25);
    g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.52), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.35, 1.95, -0.25);
    red.name = 'sirenRed';
    g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.52), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    blue.position.set(0.35, 1.95, -0.25);
    blue.name = 'sirenBlue';
    g.add(blue);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
    wheels.push(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  for (const sx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
    h.position.set(sx, 0.7, 2.22);
    g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    t.position.set(sx, 0.7, -2.22);
    g.add(t);
  }
  // Fake blob shadow so cars sit on the ground.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1, 1.9, 1);
  shadow.position.y = 0.02;
  g.add(shadow);
  g.userData.wheels = wheels;
  return g;
}

function nearestRoadAxis(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const r of CITY.roads) {
    const d = Math.min(Math.abs(x - r), Math.abs(z - r));
    if (d < bestD) {
      bestD = d;
      best = Math.abs(x - r) < Math.abs(z - r) ? { axis: 'x', road: r } : { axis: 'z', road: r };
    }
  }
  return best;
}

/** Traffic cars that loop the grid: pick a road, drive it, turn at the edge. */
export function createTraffic(scene, random, count = 12) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const road = CITY.roads[Math.floor(random() * CITY.roads.length)];
    const along = -CITY.half + random() * CITY.half * 2;
    const vertical = random() > 0.5;
    const color = CAR_COLORS[Math.floor(random() * CAR_COLORS.length)];
    const mesh = makeCarMesh(color);
    const car = {
      mesh,
      name: CAR_NAMES[Math.floor(random() * CAR_NAMES.length)],
      x: vertical ? road + (random() > 0.5 ? 3.2 : -3.2) : along,
      z: vertical ? along : road + (random() > 0.5 ? 3.2 : -3.2),
      heading: vertical ? (random() > 0.5 ? 0 : Math.PI) : (random() > 0.5 ? Math.PI / 2 : -Math.PI / 2),
      speed: 7 + random() * 5,
      parked: false,
    };
    scene.add(mesh);
    cars.push(car);
  }
  return cars;
}

/** Parked, stealable cars placed near the mission spots and around town. */
export function createParkedCars(scene, random, spots) {
  const cars = [];
  spots.forEach((s, i) => {
    const color = CAR_COLORS[(i * 3 + 1) % CAR_COLORS.length];
    const mesh = makeCarMesh(color);
    const car = {
      mesh,
      name: i === 0 ? 'Comet GT' : CAR_NAMES[(i + 2) % CAR_NAMES.length],
      x: s.x,
      z: s.z,
      heading: s.heading ?? (random() * Math.PI * 2),
      speed: 0,
      parked: true,
      missionCar: i === 0,
    };
    scene.add(mesh);
    cars.push(car);
  });
  return cars;
}

function stepCarPhysics(car, dt, throttle, steer) {
  car.speed += throttle * dt;
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  if (throttle === 0) car.speed *= Math.max(0, 1 - 1.2 * dt);
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += steer * CAR.steer * dt * dir * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  car.x = Math.max(-CITY.half + 4, Math.min(CITY.half - 4, car.x));
  car.z = Math.max(-CITY.half + 4, Math.min(CITY.half - 4, car.z));
}

/** Move one traffic car along the roads, turning at intersections sometimes. */
export function updateTraffic(cars, dt, random, colliders) {
  for (const car of cars) {
    if (car.parked) continue;
    // Gentle steering toward the nearest road centreline.
    const near = nearestRoadAxis(car.x, car.z);
    let steer = 0;
    if (near) {
      const off = near.axis === 'x' ? car.x - near.road : car.z - near.road;
      const wantHeading = near.axis === 'x'
        ? (Math.sin(car.heading) > 0 ? 0 : Math.PI)
        : (Math.cos(car.heading) > 0 ? Math.PI / 2 : -Math.PI / 2);
      let diff = wantHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      steer = Math.max(-1, Math.min(1, diff * 1.2 - off * 0.08));
      // Occasionally turn onto the cross road at an intersection.
      if (onRoad(car.x, car.z) && random() < dt * 0.06) {
        car.heading += (random() > 0.5 ? 1 : -1) * Math.PI / 2;
      }
    }
    stepCarPhysics(car, dt, 8, steer * 0.7);
    collideCircle(car, 2.2, colliders);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    car.mesh.userData.wheels.forEach((w) => { w.rotation.x += car.speed * dt * 2; });
  }
}

/** Police cruisers: spawn, chase the player, flash sirens, try to arrest. */
export function createPolice(scene) {
  return { cars: [], scene, timer: 0 };
}

export function spawnPoliceCruiser(police, x, z, random) {
  const mesh = makeCarMesh(0, true);
  const car = { mesh, x, z, heading: random() * Math.PI * 2, speed: 0, parked: false, police: true };
  police.scene.add(mesh);
  police.cars.push(car);
  return car;
}

export function updatePolice(police, dt, target, wanted, random, colliders) {
  // Keep cruiser count in step with the wanted level (0 stars: none).
  const wantCount = wanted === 0 ? 0 : Math.min(4, 1 + Math.floor(wanted / 2));
  police.timer -= dt;
  if (police.cars.length < wantCount && police.timer <= 0) {
    const ang = random() * Math.PI * 2;
    spawnPoliceCruiser(
      police,
      target.x + Math.cos(ang) * POLICE.spawnDistance,
      target.z + Math.sin(ang) * POLICE.spawnDistance,
      random,
    );
    police.timer = 2.5;
  }
  while (police.cars.length > wantCount) {
    const gone = police.cars.pop();
    police.scene.remove(gone.mesh);
  }
  const flash = Math.floor(performance.now() / 180) % 2 === 0;
  for (const car of police.cars) {
    const dx = target.x - car.x;
    const dz = target.z - car.z;
    const dist = Math.hypot(dx, dz) || 1;
    const wantHeading = Math.atan2(dx, dz);
    let diff = wantHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.6));
    const throttle = dist > 4 ? POLICE.accel * 0.8 : -POLICE.accel;
    car.speed = Math.max(-8, Math.min(POLICE.maxSpeed, car.speed + throttle * dt));
    car.heading += steer * 1.7 * dt * (car.speed >= 0 ? 1 : -1);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    collideCircle(car, 2.2, colliders);
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    const red = car.mesh.getObjectByName('sirenRed');
    const blue = car.mesh.getObjectByName('sirenBlue');
    if (red && blue) {
      red.material.color.setHex(flash ? 0xff2222 : 0x550000);
      blue.material.color.setHex(flash ? 0x113366 : 0x2266ff);
    }
  }
}
