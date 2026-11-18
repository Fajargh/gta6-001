// Vera's three jobs: the story, the objectives, the markers and the pay.
// Missions run in order; finishing one starts the next and pays Rex.
import { MISSIONS } from './config.js';

function makeBeacon(scene, color = 0xffd166) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 20;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.25, 8, 24),
    new THREE.MeshBasicMaterial({ color }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1),
    new THREE.MeshBasicMaterial({ color }),
  );
  diamond.position.y = 6;
  diamond.name = 'diamond';
  g.add(beam, ring, diamond);
  g.visible = false;
  scene.add(g);
  return g;
}

export function createMissions(scene, save) {
  const completed = save?.missionsCompleted ?? 0;
  const state = {
    index: Math.min(completed, MISSIONS.length - 1),
    stage: 'go', // 'go' | 'pickup' | 'deliver' | 'evade' | 'done' | 'allDone'
    beacon: makeBeacon(scene),
    crate: null,
    crateMesh: null,
    evadeTimer: 0,
    message: '',
    messageTimer: 0,
  };
  if (completed >= MISSIONS.length) state.stage = 'allDone';
  // Resuming mid-way into job 2: the crate must already be waiting at the market.
  if (state.index === 1 && state.stage === 'go') {
    state.crateMesh = spawnCrate(scene, MISSIONS[1].pickup);
  }
  return state;
}

export function currentMission(state) {
  return MISSIONS[state.index];
}

export function missionTarget(state) {
  const m = currentMission(state);
  if (!m || state.stage === 'allDone') return null;
  if (state.index === 1 && state.stage === 'go') return m.pickup;
  if (state.index === 2) return null; // evade: no fixed target
  return m.target;
}

export function missionObjectiveText(state) {
  const m = currentMission(state);
  if (!m) return '';
  if (state.stage === 'allDone') return 'All jobs done — Solmar Bay is yours. Free roam!';
  if (state.index === 1 && state.stage === 'go') return `Collect the crate at ${m.pickupName}.`;
  if (state.index === 1) return `Deliver the crate to ${m.targetName}.`;
  if (state.index === 2) return 'Lose the police — stay out of sight!';
  if (state.index === 0) return m.objective;
  return m.objective;
}

/** Put the crate prop at the market for job 2. */
function spawnCrate(scene, at) {
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.4, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x8a5a2b }),
  );
  crate.position.set(at.x, 0.7, at.z);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.3, 1.45), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
  tape.position.set(at.x, 0.9, at.z);
  scene.add(crate, tape);
  return { crate, tape };
}

function showMessage(state, text) {
  state.message = text;
  state.messageTimer = 4;
}

/** Advance the mission state. Returns events: { paid, completed, failed }. */
export function updateMissions(state, scene, player, world, dt) {
  const out = { paid: 0, completed: null, failed: false };
  const m = currentMission(state);
  if (!m || state.stage === 'allDone') {
    state.beacon.visible = false;
    return out;
  }
  if (state.messageTimer > 0) state.messageTimer -= dt;

  const target = missionTarget(state);
  if (target) {
    state.beacon.visible = true;
    state.beacon.position.set(target.x, 0, target.z);
    const d = state.beacon.getObjectByName('diamond');
    if (d) {
      d.rotation.y += dt * 2;
      d.position.y = 6 + Math.sin(performance.now() / 400) * 0.6;
    }
  } else {
    state.beacon.visible = false;
  }

  const dist = target ? Math.hypot(player.x - target.x, player.z - target.z) : Infinity;

  if (state.index === 0) {
    // Job 1: reach the marina — in the Comet GT or on foot, either counts.
    if (dist < 5) {
      out.paid = m.pay;
      out.completed = m;
      player.money += m.pay;
      showMessage(state, `Job complete! Vera paid you $${m.pay}.`);
      state.index = 1;
      state.stage = 'go';
      state.crateMesh = spawnCrate(scene, m2Pickup());
      world.onMissionAdvanced?.();
    }
  } else if (state.index === 1) {
    if (state.stage === 'go') {
      if (dist < 4) {
        state.stage = 'deliver';
        if (state.crateMesh) {
          scene.remove(state.crateMesh.crate, state.crateMesh.tape);
          state.crateMesh = null;
        }
        showMessage(state, 'Crate collected. Deliver it downtown — no trouble!');
      }
    } else if (dist < 5) {
      out.paid = m.pay;
      out.completed = m;
      player.money += m.pay;
      showMessage(state, `Delivered! Vera paid you $${m.pay}. One job left…`);
      state.index = 2;
      state.stage = 'evade';
      state.evadeTimer = 0;
      world.onMissionAdvanced?.();
    }
  } else if (state.index === 2) {
    // Job 3: wanted must hit zero while the cops are hunting.
    if (world.wanted === 0) {
      state.evadeTimer += dt;
      if (state.evadeTimer > 3) {
        out.paid = m.pay;
        out.completed = m;
        player.money += m.pay;
        showMessage(state, `You shook them. Vera paid you $${m.pay}. Solmar Bay is yours.`);
        state.stage = 'allDone';
        world.onMissionAdvanced?.();
      }
    } else {
      state.evadeTimer = 0;
    }
  }
  return out;
}

function m2Pickup() {
  return MISSIONS[1].pickup;
}

/** Put the crate at the market if it is not already there (job 2 / screenshots). */
export function ensureCrate(state, scene) {
  if (!state.crateMesh) state.crateMesh = spawnCrate(scene, MISSIONS[1].pickup);
}

/** The job-1 car spot and the crate spawn, for the world to place props. */
export function missionSpots() {
  return {
    cometSpot: MISSIONS[0].carSpot,
    crateSpot: MISSIONS[1].pickup,
  };
}
