// Pedestrians: sunny-city walkers who stroll the sidewalks, cross at the
// crosswalks, and scatter when a gun goes off or a car comes too close.
import { CITY } from './config.js';
import { collideCircle } from './city.js';

const SHIRTS = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95d5b2, 0xf4978e, 0x90be6d, 0xffffff, 0x577590];
const PANTS = [0x1f2937, 0x3b4a6b, 0x6b4a3b, 0x2f3e46];

export function makePersonMesh(shirt, pants, scale = 1) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: [0xf1c27d, 0xe0ac69, 0x8d5524, 0xffdbac][Math.floor(Math.random() * 4)] });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), new THREE.MeshLambertMaterial({ color: pants }));
  legL.position.set(-0.14, 0.4, 0);
  legL.name = 'legL';
  const legR = legL.clone();
  legR.position.x = 0.14;
  legR.name = 'legR';
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.34), new THREE.MeshLambertMaterial({ color: shirt }));
  torso.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.78;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.28, 0.1, 10), new THREE.MeshLambertMaterial({ color: shirt }));
  cap.position.y = 1.98;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), new THREE.MeshLambertMaterial({ color: shirt }));
  armL.position.set(-0.4, 1.15, 0);
  armL.name = 'armL';
  const armR = armL.clone();
  armR.position.x = 0.4;
  armR.name = 'armR';
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  g.add(legL, legR, torso, head, cap, armL, armR, shadow);
  g.scale.setScalar(scale);
  return g;
}

export function createPedestrians(scene, random, count = 22) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makePersonMesh(
      SHIRTS[Math.floor(random() * SHIRTS.length)],
      PANTS[Math.floor(random() * PANTS.length)],
      0.92 + random() * 0.18,
    );
    const ped = {
      mesh,
      x: -CITY.half + random() * CITY.half * 2,
      z: -CITY.half + random() * CITY.half * 2,
      heading: random() * Math.PI * 2,
      speed: 1.4 + random() * 1.2,
      walkPhase: random() * Math.PI * 2,
      panic: 0,
      retarget: 0,
    };
    scene.add(mesh);
    peds.push(ped);
  }
  return peds;
}

/** One step: wander the sidewalks, flee from danger, animate the walk. */
export function updatePedestrians(peds, dt, random, colliders, danger) {
  for (const p of peds) {
    p.retarget -= dt;
    if (p.panic > 0) p.panic -= dt;
    if (danger) {
      const d = Math.hypot(p.x - danger.x, p.z - danger.z);
      if (d < 14) {
        p.panic = 2.5;
        p.heading = Math.atan2(p.x - danger.x, p.z - danger.z);
      }
    }
    if (p.retarget <= 0) {
      // Drift toward a sidewalk: hug the edge of the nearest road.
      let best = null;
      let bestD = Infinity;
      for (const r of CITY.roads) {
        for (const off of [CITY.roadHalf + 2.5, -(CITY.roadHalf + 2.5)]) {
          const d = Math.min(Math.abs(p.x - (r + off)), Math.abs(p.z - (r + off)));
          if (d < bestD) {
            bestD = d;
            best = { axis: Math.abs(p.x - (r + off)) < Math.abs(p.z - (r + off)) ? 'x' : 'z', line: r + off };
          }
        }
      }
      if (best && bestD < 6) {
        p.heading = best.axis === 'x'
          ? (Math.sin(p.heading) >= 0 ? 0 : Math.PI) + (random() - 0.5) * 0.4
          : (Math.cos(p.heading) >= 0 ? Math.PI / 2 : -Math.PI / 2) + (random() - 0.5) * 0.4;
      } else if (best) {
        p.heading = Math.atan2(best.axis === 'x' ? best.line - p.x : 0, best.axis === 'z' ? best.line - p.z : 0);
      } else {
        p.heading = random() * Math.PI * 2;
      }
      p.retarget = 2 + random() * 4;
    }
    const speed = p.panic > 0 ? p.speed * 2.6 : p.speed;
    p.x += Math.sin(p.heading) * speed * dt;
    p.z += Math.cos(p.heading) * speed * dt;
    p.x = Math.max(-CITY.half + 2, Math.min(CITY.half - 2, p.x));
    p.z = Math.max(-CITY.half + 2, Math.min(CITY.half - 2, p.z));
    collideCircle(p, 0.6, colliders);
    p.walkPhase += dt * speed * 5;
    const swing = Math.sin(p.walkPhase) * 0.55;
    p.mesh.getObjectByName('legL').rotation.x = swing;
    p.mesh.getObjectByName('legR').rotation.x = -swing;
    p.mesh.getObjectByName('armL').rotation.x = -swing * 0.8;
    p.mesh.getObjectByName('armR').rotation.x = swing * 0.8;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
  }
}
