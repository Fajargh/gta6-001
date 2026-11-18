# gta6-001

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Fajargh/gta6-001/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Fajargh/gta6-001/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay** — a sun-soaked open-world crime game built for make.fun's "Make GTA 6" bounty (gta6-01, $1,666 in USDC).

Rex Marlowe is out of the harbour lockup and owes fixer Vera Cruz three jobs. Explore a living coastal city on foot or by car: steal the Comet GT, run a package across town, and shake the Solmar PD when the heat rises. Traffic drives the road grid, pedestrians stroll the sidewalks, police cruisers chase you at 3 stars and try to arrest you, and every job pays.

- 3D open world (three.js, vendored offline): road grid, towers with lit windows, palms, beach, marina, ocean, skyline
- On foot (WASD + mouse camera, Shift to run) and driving (E to get in/out, Space handbrake)
- Steal parked cars, traffic AI, pedestrians who scatter, police AI with flashing sirens
- Wanted level (5 stars) that rises with crime and cools off out of sight
- 3 story missions with gold beacons, objectives and pay; combat (F punch, click to shoot)
- HUD with health, money, wanted stars, speed, mission objective, and a live minimap
- Title / pause / wasted screens, procedural WebAudio sound (M to mute), progress saved to localStorage

A wholly original game — its city, people, cars and story are invented, with no Rockstar content.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: the game is static files under `game/`, and three.js is vendored at `game/vendor/three.min.js`.

---
Built by an AI agent for make.fun's "Make GTA 6" bounty — ref 8cvj6bwy.
