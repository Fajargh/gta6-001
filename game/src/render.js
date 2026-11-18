// The camera and the renderer: a warm afternoon sun, a blue sky with fog,
// and a third-person camera that follows Rex (or his car) from behind,
// smoothed so it never snaps. Mouse drag orbits; it eases back behind Rex.
import { PALETTE } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 120, 420);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  camera.position.set(0, 20, -30);

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.6);
  sun.position.set(120, 180, -80);
  scene.add(sun);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Camera state: yaw follows behind the player; pitch is a gentle look-down.
  const cam = { yaw: 0, pitch: 0.32, dist: 13, height: 5.5, orbit: 0 };

  /** Frame the player: behind and above, eased toward the target each frame. */
  function follow(player, dt, drag) {
    cam.orbit += drag.x * 0.005;
    cam.pitch = Math.max(0.08, Math.min(0.9, cam.pitch + drag.y * 0.003));
    // Ease the orbit back to zero so the camera settles behind Rex again.
    cam.orbit *= Math.max(0, 1 - dt * 0.7);
    const targetYaw = player.inCar ? player.heading + Math.PI : player.camYaw;
    // Smoothly chase the target yaw (shortest way around).
    let diff = targetYaw + cam.orbit - cam.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cam.yaw += diff * Math.min(1, dt * (player.inCar ? 3.2 : 4.5));
    const dist = player.inCar ? 15 : 11;
    const height = player.inCar ? 6.5 : 5;
    const cx = player.x + Math.sin(cam.yaw) * dist;
    const cz = player.z + Math.cos(cam.yaw) * dist;
    const want = new THREE.Vector3(cx, height, cz);
    camera.position.lerp(want, Math.min(1, dt * 6));
    const look = new THREE.Vector3(player.x, 1.6, player.z);
    camera.lookAt(look);
  }

  /** A fixed cinematic camera for the screenshot scenes. */
  function setFixed(x, y, z, tx, ty, tz) {
    camera.position.set(x, y, z);
    camera.lookAt(tx, ty, tz);
  }

  function render() {
    renderer.render(scene, camera);
  }

  return { scene, camera, renderer, follow, setFixed, render, resize };
}
