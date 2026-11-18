// Solmar Bay — every tuning number, name and story beat in one place.
// The city is a 5x5 road grid on a sunny coast. Nothing here names anything
// from Rockstar: the city, people, cars and jobs are all invented for this game.
export const STEP = 1 / 60;

export const CITY = {
  half: 150, // world runs -150..150 on x and z; the ocean sits west of -150
  roadHalf: 7, // half the width of a road
  roadGap: 60, // distance between neighbouring road centrelines
  roads: [-120, -60, 0, 60, 120],
  blockHalf: 22, // half the size of a buildable block between roads
};

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 15,
  radius: 0.9,
  maxHealth: 100,
};

export const CAR = {
  accel: 26,
  brake: 42,
  reverseAccel: 14,
  maxSpeed: 38,
  maxReverse: 12,
  steer: 1.9,
  grip: 6,
};

export const POLICE = {
  maxSpeed: 34,
  accel: 24,
  arrestRange: 3.2,
  sightRange: 70,
  spawnDistance: 55,
};

export const WANTED = {
  decaySeconds: 14, // seconds unseen before one star drops
  maxStars: 5,
};

export const SAVE_KEY = 'solmar-bay.save.v1';

// The story: Rex Marlowe, a courier who just got out of the harbour lockup,
// owes fixer Vera Cruz one last favour. Three jobs, in order.
export const MISSIONS = [
  {
    id: 'wheels',
    title: 'Job 1 — First Wheels',
    giver: 'Vera Cruz',
    briefing: 'Vera needs wheels, fast. Take the parked Comet GT by the plaza — nobody will miss it. Drive it to the gold marker at the marina.',
    objective: 'Steal the Comet GT, then drive to the marina marker.',
    pay: 500,
    start: { x: 0, z: 18 },
    carSpot: { x: 30, z: 4 },
    target: { x: -114, z: 96 },
    targetName: 'Marina',
  },
  {
    id: 'package',
    title: 'Job 2 — The Package Run',
    giver: 'Vera Cruz',
    briefing: 'A crate is waiting at the north market. Grab it on foot, then deliver it to the rooftop garage downtown. The harbour patrol is jumpy — keep it clean.',
    objective: 'Collect the crate at the market, then deliver it downtown.',
    pay: 1200,
    start: { x: -114, z: 96 },
    pickup: { x: -30, z: -114 },
    pickupName: 'North Market',
    target: { x: 30, z: -60 },
    targetName: 'Downtown Garage',
  },
  {
    id: 'heat',
    title: 'Job 3 — Lose the Heat',
    giver: 'Vera Cruz',
    briefing: 'The delivery tipped off the Solmar PD. They are all over you. Break line of sight, shake the cruisers, and stay hidden until the heat dies.',
    objective: 'Lose the police. Stay out of sight until your wanted level clears.',
    pay: 2000,
    start: { x: 30, z: -60 },
    target: null,
    targetName: null,
  },
];

export const PALETTE = {
  sky: 0x87c5e8,
  fog: 0xa8d4ea,
  sun: 0xfff2d0,
  sand: 0xe8d29a,
  grass: 0x7fb069,
  asphalt: 0x3a3f47,
  sidewalk: 0xcfc8b8,
  building: [0xf2e3c6, 0xe8a87c, 0x7fb5a3, 0xd96c5f, 0x9db8d2, 0xf2c94c, 0xc9a0c9, 0x8ecae6],
  glass: 0x2e4a5e,
  playerJacket: 0x14b8a6,
  playerPants: 0x1f2937,
  policeWhite: 0xf5f5f5,
  policeBlack: 0x111827,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
