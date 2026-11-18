// Procedural sound: every effect is synthesized with WebAudio — no audio
// files, no network. Engine hum, siren wail, punch thud, gunshot, pickup
// chime and the mission-complete jingle.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null) {
    const ac = ensure();
    if (!ac || muted) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  }

  function noise(dur, vol = 0.2, low = 400) {
    const ac = ensure();
    if (!ac || muted) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = low;
    const g = ac.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(ac.destination);
    src.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopEngine();
      return muted;
    },
    get muted() { return muted; },
    punch() { noise(0.12, 0.3, 300); tone(90, 0.12, 'sine', 0.25, 50); },
    shoot() { noise(0.14, 0.4, 2400); tone(220, 0.1, 'square', 0.12, 60); },
    pickup() { tone(660, 0.12, 'sine', 0.18); setTimeout(() => tone(880, 0.18, 'sine', 0.18), 90); },
    paid() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.2), i * 110));
    },
    siren(on) {
      // The wail is driven from the loop; this is a placeholder hook kept for clarity.
      void on;
    },
    startEngine() {
      const ac = ensure();
      if (!ac || muted || engineOsc) return;
      engineOsc = ac.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ac.createGain();
      engineGain.gain.value = 0.03;
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 420;
      engineOsc.connect(f).connect(engineGain).connect(ac.destination);
      engineOsc.start();
    },
    setEngine(speed01) {
      if (engineOsc && engineGain) {
        engineOsc.frequency.value = 50 + speed01 * 110;
        engineGain.gain.value = 0.02 + speed01 * 0.05;
      }
    },
    stopEngine() {
      if (engineOsc) {
        try { engineOsc.stop(); } catch { /* already stopped */ }
        engineOsc = null;
        engineGain = null;
      }
    },
  };
}
