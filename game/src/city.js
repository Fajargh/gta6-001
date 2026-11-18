// Solmar Bay itself: the ground texture (roads, sidewalks, beach, plazas),
// the buildings with lit windows, palms, lamps, the ocean and the skyline.
// Everything is procedural — no image or model is loaded from anywhere.
import { CITY, PALETTE } from './config.js';

const WORLD = CITY.half * 2 + 60; // ground plane size, ocean strip included

/** Paint the whole ground in one canvas: sand, grass blocks, asphalt roads with dashes, sidewalks. */
function paintGroundTexture(random) {
  const S = 2048;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d');
  const toPx = (v) => ((v + CITY.half + 30) / WORLD) * S;

  g.fillStyle = '#8ecae6';
  g.fillRect(0, 0, S, S); // ocean base
  // Sand beach on the west edge.
  g.fillStyle = '#e8d29a';
  g.fillRect(toPx(-CITY.half - 30), 0, toPx(-CITY.half + 6) - toPx(-CITY.half - 30), S);
  // City grass base.
  g.fillStyle = '#79a95e';
  g.fillRect(toPx(-CITY.half + 6), 0, S - toPx(-CITY.half + 6), S);

  // City blocks: alternating lawn / plaza paving.
  for (let i = 0; i < CITY.roads.length - 1; i += 1) {
    for (let j = 0; j < CITY.roads.length - 1; j += 1) {
      const x0 = CITY.roads[i] + CITY.roadHalf + 2;
      const x1 = CITY.roads[i + 1] - CITY.roadHalf - 2;
      const z0 = CITY.roads[j] + CITY.roadHalf + 2;
      const z1 = CITY.roads[j + 1] - CITY.roadHalf - 2;
      g.fillStyle = (i + j) % 3 === 0 ? '#b7a98c' : '#86b364';
      g.fillRect(toPx(x0), toPx(z0), toPx(x1) - toPx(x0), toPx(z1) - toPx(z0));
      // Sidewalk border around each block.
      g.strokeStyle = '#cfc8b8';
      g.lineWidth = 10;
      g.strokeRect(toPx(x0), toPx(z0), toPx(x1) - toPx(x0), toPx(z1) - toPx(z0));
    }
  }
  // Roads: asphalt with centre dashes.
  g.fillStyle = '#3a3f47';
  for (const r of CITY.roads) {
    g.fillRect(toPx(r - CITY.roadHalf), 0, toPx(r + CITY.roadHalf) - toPx(r - CITY.roadHalf), S);
    g.fillRect(0, toPx(r - CITY.roadHalf), S, toPx(r + CITY.roadHalf) - toPx(r - CITY.roadHalf));
  }
  g.fillStyle = '#f5d76e';
  for (const r of CITY.roads) {
    for (let v = -CITY.half; v < CITY.half; v += 12) {
      g.fillRect(toPx(r) - 2, toPx(v), 4, 18);
      g.fillRect(toPx(v), toPx(r) - 2, 18, 4);
    }
  }
  // Crosswalks at every intersection.
  g.fillStyle = '#e8e8e8';
  for (const rx of CITY.roads) {
    for (const rz of CITY.roads) {
      for (let k = -2; k <= 2; k += 1) {
        g.fillRect(toPx(rx + k * 2.4) - 3, toPx(rz - CITY.roadHalf) + 4, 6, 10);
        g.fillRect(toPx(rx + k * 2.4) - 3, toPx(rz + CITY.roadHalf) - 14, 6, 10);
      }
    }
  }
  // A few lawn speckles so the grass is not flat.
  for (let n = 0; n < 900; n += 1) {
    g.fillStyle = random() > 0.5 ? '#6f9e52' : '#8fbf6f';
    const x = toPx(-CITY.half + random() * CITY.half * 2);
    const y = toPx(-CITY.half + random() * CITY.half * 2);
    g.fillRect(x, y, 5, 5);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** One shared window texture per tint: a facade of lit and dark windows. */
function facadeTexture(base, lit, random) {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  for (let y = 12; y < 244; y += 22) {
    for (let x = 10; x < 118; x += 20) {
      const r = random();
      g.fillStyle = r > 0.72 ? lit : r > 0.45 ? '#2e4a5e' : '#22384a';
      g.fillRect(x, y, 13, 14);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function box(w, h, d, color, x, y, z, opts = {}) {
  const mat = opts.material || new THREE.MeshLambertMaterial({ color });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  return m;
}

/**
 * Build the city. Returns the group, the building colliders (axis-aligned boxes
 * the player and cars slide around), the road centrelines, and the ground texture
 * (the minimap reuses it).
 */
export function buildCity(random) {
  const group = new THREE.Group();
  const colliders = [];

  // Ground.
  const groundTex = paintGroundTexture(random);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD, WORLD),
    new THREE.MeshLambertMaterial({ map: groundTex }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-15, 0, 0);
  group.add(ground);

  // Ocean: a slightly lower, animated-looking blue plane west of the beach.
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(60, WORLD),
    new THREE.MeshLambertMaterial({ color: 0x2e86ab, transparent: true, opacity: 0.95 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-CITY.half - 30, -0.4, 0);
  group.add(ocean);

  // Buildings, one to four per block, taller toward the centre.
  const facades = PALETTE.building.map((c) => {
    const hex = `#${c.toString(16).padStart(6, '0')}`;
    return facadeTexture(hex, '#ffd166', random);
  });
  for (let i = 0; i < CITY.roads.length - 1; i += 1) {
    for (let j = 0; j < CITY.roads.length - 1; j += 1) {
      const cx = (CITY.roads[i] + CITY.roads[i + 1]) / 2;
      const cz = (CITY.roads[j] + CITY.roads[j + 1]) / 2;
      const central = Math.abs(cx) + Math.abs(cz) < 90;
      const count = 1 + Math.floor(random() * (central ? 3 : 2));
      for (let k = 0; k < count; k += 1) {
        const w = 12 + random() * 14;
        const d = 12 + random() * 14;
        const h = central ? 14 + random() * 30 : 8 + random() * 14;
        const ox = (random() - 0.5) * (CITY.blockHalf * 2 - w - 4);
        const oz = (random() - 0.5) * (CITY.blockHalf * 2 - d - 4);
        const x = cx + ox;
        const z = cz + oz;
        const fi = Math.floor(random() * facades.length);
        const mat = new THREE.MeshLambertMaterial({ map: facades[fi] });
        const b = box(w, h, d, 0xffffff, x, h / 2, z, { material: mat });
        group.add(b);
        // Rooftop box.
        group.add(box(w * 0.4, 1.6, d * 0.4, 0x5a5f6a, x, h + 0.8, z));
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // Palm trees along the beach and the marina plaza.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2b });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3e9b4f });
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.y = 3.5;
    trunk.rotation.z = 0.08;
    g.add(trunk);
    for (let a = 0; a < 6; a += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 4), leafMat);
      const ang = (a / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(ang) * 1.6, 7.2, Math.sin(ang) * 1.6);
      leaf.rotation.z = Math.cos(ang) * 1.1;
      leaf.rotation.x = -Math.sin(ang) * 1.1;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    group.add(g);
    colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 });
  }
  for (let z = -140; z <= 140; z += 18) palm(-CITY.half + 3, z + (random() - 0.5) * 6);
  for (let x = -110; x <= -70; x += 20) palm(x, 108 + (random() - 0.5) * 6);

  // Street lamps at intersections.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2f3542 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const rx of CITY.roads) {
    for (const rz of CITY.roads) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), poleMat);
      pole.position.set(rx + CITY.roadHalf + 1, 3, rz + CITY.roadHalf + 1);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
      lamp.position.set(rx + CITY.roadHalf + 1, 6.2, rz + CITY.roadHalf + 1);
      group.add(lamp);
    }
  }

  // Marina: a small pier and moored boats at the south-west corner.
  const pier = box(6, 0.8, 30, 0x9c6644, -138, 0.4, 110);
  group.add(pier);
  for (let k = 0; k < 3; k += 1) {
    const boat = new THREE.Group();
    const hull = box(4, 1.2, 10, [0xffffff, 0xff5d8f, 0x2ec4b6][k], 0, 0.4, 0);
    const cabin = box(2.4, 1.4, 4, 0xe8e8e8, 0, 1.6, -1);
    boat.add(hull, cabin);
    boat.position.set(-158 - k * 7, -0.2, 96 + k * 14);
    boat.rotation.y = 0.3;
    group.add(boat);
  }

  // Distant skyline silhouettes so the horizon is never empty.
  const farMat = new THREE.MeshLambertMaterial({ color: 0x8fa8bf });
  for (let k = 0; k < 14; k += 1) {
    const h = 30 + random() * 45;
    const b = new THREE.Mesh(new THREE.BoxGeometry(16, h, 16), farMat);
    const ang = (k / 14) * Math.PI * 2;
    b.position.set(Math.cos(ang) * 260, h / 2 - 2, Math.sin(ang) * 260);
    group.add(b);
  }

  // Sun + clouds.
  const sun = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
  sun.position.set(180, 150, -220);
  group.add(sun);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  for (let k = 0; k < 8; k += 1) {
    const c = new THREE.Group();
    for (let p = 0; p < 3; p += 1) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(6 + random() * 5, 8, 6), cloudMat);
      s.position.set(p * 8 - 8, random() * 2, random() * 4);
      s.scale.y = 0.45;
      c.add(s);
    }
    c.position.set(-200 + random() * 400, 70 + random() * 25, -200 + random() * 400);
    group.add(c);
  }

  return { group, colliders, groundTex };
}

/** Circle-vs-box collision: push a circle of radius r out of the colliders. */
export function collideCircle(pos, r, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx;
    const dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      pos.x = nx + (dx / d) * r;
      pos.z = nz + (dz / d) * r;
    } else if (d2 <= 0.0001) {
      // Centre inside the box: push out along the smallest penetration axis.
      const pl = Math.min(pos.x - c.minX, c.maxX - pos.x, pos.z - c.minZ, c.maxZ - pos.z);
      if (pl === pos.x - c.minX) pos.x = c.minX - r;
      else if (pl === c.maxX - pos.x) pos.x = c.maxX + r;
      else if (pl === pos.z - c.minZ) pos.z = c.minZ - r;
      else pos.z = c.maxZ + r;
    }
  }
}

/** True when (x, z) is on a road (within the asphalt plus a small margin). */
export function onRoad(x, z) {
  for (const r of CITY.roads) {
    if (Math.abs(x - r) <= CITY.roadHalf + 1 || Math.abs(z - r) <= CITY.roadHalf + 1) return true;
  }
  return false;
}
