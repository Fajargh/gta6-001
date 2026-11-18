// The HUD: health bar, money, wanted stars, speed, mission objective, the
// message toast, and the top-down minimap drawn on a small 2D canvas.
// The minimap reuses the city's ground texture as its base map.
import { CITY, FONT } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  return {
    healthFill: el('health-fill'),
    healthText: el('health-text'),
    money: el('money'),
    stars: el('stars'),
    speed: el('speed'),
    objective: el('objective'),
    missionTitle: el('mission-title'),
    toast: el('toast'),
    prompt: el('prompt'),
    minimap: el('minimap'),
    mapCtx: el('minimap').getContext('2d'),
    wantedFlash: 0,
  };
}

const STAR_FULL = '★';
const STAR_EMPTY = '☆';

/** Refresh the DOM readouts once per frame (cheap text writes only when changed). */
export function updateHud(hud, s) {
  const hp = Math.max(0, Math.round(s.health));
  hud.healthFill.style.width = `${hp}%`;
  hud.healthFill.style.background = hp > 50 ? '#22c55e' : hp > 25 ? '#f59e0b' : '#ef4444';
  hud.healthText.textContent = `${hp}`;
  const moneyText = `$${s.money.toLocaleString('en-US')}`;
  if (hud.money.textContent !== moneyText) hud.money.textContent = moneyText;
  const starsText = STAR_FULL.repeat(s.wanted) + STAR_EMPTY.repeat(5 - s.wanted);
  if (hud.stars.textContent !== starsText) hud.stars.textContent = starsText;
  hud.stars.style.color = s.wanted > 0 ? '#ffd166' : '#94a3b8';
  hud.speed.textContent = s.inCar ? `${Math.round(Math.abs(s.speed) * 2.4)} km/h` : s.moving ? 'on foot' : '';
  if (hud.objective.textContent !== s.objective) hud.objective.textContent = s.objective;
  if (hud.missionTitle.textContent !== s.missionTitle) hud.missionTitle.textContent = s.missionTitle;
  if (s.toast) {
    hud.toast.textContent = s.toast;
    hud.toast.style.opacity = '1';
  } else {
    hud.toast.style.opacity = '0';
  }
  hud.prompt.textContent = s.prompt || '';
  hud.prompt.style.opacity = s.prompt ? '1' : '0';
}

/** Draw the minimap: ground texture, roads, player, cars, police, mission marker. */
export function drawMinimap(hud, groundTex, view) {
  const ctx = hud.mapCtx;
  const W = 168;
  const H = 168;
  const scale = W / (CITY.half * 2 + 60);
  const toMap = (x, z) => [((x + CITY.half + 30) * scale), ((z + CITY.half + 30) * scale)];
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2);
  ctx.clip();
  if (groundTex?.image) ctx.drawImage(groundTex.image, 0, 0, W, H);
  else {
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(0, 0, W, H);
  }
  const dot = (x, z, color, r) => {
    const [mx, mz] = toMap(x, z);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx, mz, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // Mission marker: pulsing gold diamond.
  if (view.target) {
    const [mx, mz] = toMap(view.target.x, view.target.z);
    const pulse = 5 + Math.sin(performance.now() / 250) * 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(mx, mz - pulse);
    ctx.lineTo(mx + pulse, mz);
    ctx.lineTo(mx, mz + pulse);
    ctx.lineTo(mx - pulse, mz);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (const c of view.traffic) dot(c.x, c.z, '#fde68a', 2.5);
  for (const c of view.police) dot(c.x, c.z, '#ef4444', 3.5);
  // Player: green arrow pointing along the heading.
  const [px, pz] = toMap(view.player.x, view.player.z);
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(Math.atan2(Math.sin(view.player.heading), Math.cos(view.player.heading)));
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  // North tick.
  ctx.fillStyle = '#e5e7eb';
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('N', W / 2, 12);
}
