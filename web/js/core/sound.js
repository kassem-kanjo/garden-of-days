/* Garden of Days — sound: everything is synthesized with Web Audio, tuned to D major pentatonic. */
(function () {
  'use strict';
  const G = window.Garden;

  const BASE = 293.66; // D4
  const PENTA = [0, 2, 4, 7, 9];
  function step(n) {
    const oct = Math.floor(n / 5), deg = ((n % 5) + 5) % 5;
    return BASE * Math.pow(2, (PENTA[deg] + 12 * oct) / 12);
  }

  // Each habit has its own instrument and a starting scale step; day i plays root + i.
  const VOICES = {
    interview: { voice: 'chime', root: 5 },
    arabic: { voice: 'bell', root: 3 },
    chinese: { voice: 'pluck', root: 2 },
    weights: { voice: 'wood', root: 0 },
    cardio: { voice: 'drop', root: 4 },
  };

  let ac = null, master, dry, send, comp;
  let enabled = G.settings().sound !== false;
  let ambientWanted = !!G.settings().ambient;
  let ambient = null;

  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
    comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = 0.75; master.connect(comp);
    dry = ac.createGain(); dry.gain.value = 1; dry.connect(master);
    const conv = ac.createConvolver(); conv.buffer = impulse(3.4, 2.6);
    const wet = ac.createGain(); wet.gain.value = 0.42;
    const tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5200;
    conv.connect(tone); tone.connect(wet); wet.connect(master);
    send = conv;
    return ac;
  }

  function impulse(sec, decay) {
    const rate = ac.sampleRate, len = Math.floor(rate * sec), buf = ac.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function out(node, wetAmt, pan) {
    let n = node;
    if (ac.createStereoPanner && pan) { const p = ac.createStereoPanner(); p.pan.value = pan; node.connect(p); n = p; }
    n.connect(dry);
    const s = ac.createGain(); s.gain.value = wetAmt; n.connect(s); s.connect(send);
  }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    const len = ac.sampleRate * 2; noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  const rnd = (a, b) => a + Math.random() * (b - a);

  // --- Instruments -----------------------------------------------------------
  const INSTR = {
    // Glassy wind chime with inharmonic partials.
    chime(f, t, vel) {
      const g = ac.createGain(); out(g, 0.6, rnd(-0.35, 0.35)); env(g, t, 0.004, 0.16 * vel, 3.0);
      [[1, 1], [2.76, 0.32], [5.4, 0.12], [8.93, 0.05]].forEach(([r, a]) => {
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * r * (1 + rnd(-0.002, 0.002));
        const og = ac.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + 3.3);
      });
    },
    // Soft FM temple bell.
    bell(f, t, vel) {
      const g = ac.createGain(); out(g, 0.65, rnd(-0.2, 0.2)); env(g, t, 0.008, 0.15 * vel, 4.2);
      const car = ac.createOscillator(); car.type = 'sine'; car.frequency.value = f;
      const mod = ac.createOscillator(); mod.type = 'sine'; mod.frequency.value = f * 1.4;
      const mg = ac.createGain(); mg.gain.setValueAtTime(f * 1.8, t); mg.gain.exponentialRampToValueAtTime(f * 0.04, t + 1.4);
      mod.connect(mg); mg.connect(car.frequency); car.connect(g);
      const sub = ac.createOscillator(); sub.type = 'sine'; sub.frequency.value = f / 2;
      const sg = ac.createGain(); sg.gain.value = 0.25; sub.connect(sg); sg.connect(g);
      [car, mod, sub].forEach(o => { o.start(t); o.stop(t + 4.4); });
    },
    // Plucked string (Karplus-Strong), with a little guzheng-style bend.
    pluck(f, t, vel) {
      const buf = ksBuffer(f);
      const src = ac.createBufferSource(); src.buffer = buf;
      src.playbackRate.setValueAtTime(1, t);
      src.playbackRate.setValueAtTime(1, t + 0.08);
      src.playbackRate.linearRampToValueAtTime(1.014, t + 0.35);
      src.playbackRate.linearRampToValueAtTime(1.0, t + 0.85);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
      const g = ac.createGain(); g.gain.value = 0.42 * vel;
      src.connect(lp); lp.connect(g); out(g, 0.38, rnd(-0.3, 0.3));
      src.start(t);
    },
    // Hollow wooden knock (stones settling).
    wood(f, t, vel) {
      const body = ac.createOscillator(); body.type = 'sine';
      body.frequency.setValueAtTime(f * 0.75, t); body.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.06);
      const bg = ac.createGain(); env(bg, t, 0.002, 0.32 * vel, 0.24);
      body.connect(bg); out(bg, 0.22);
      body.start(t); body.stop(t + 0.35);
      const n = ac.createBufferSource(); n.buffer = noise();
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 3; bp.Q.value = 7;
      const ng = ac.createGain(); env(ng, t, 0.001, 0.22 * vel, 0.07);
      n.connect(bp); bp.connect(ng); out(ng, 0.18);
      n.start(t, rnd(0, 1)); n.stop(t + 0.12);
    },
    // Water droplet.
    drop(f, t, vel) {
      const one = (tt, v, mul) => {
        const o = ac.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(f * 0.7 * mul, tt); o.frequency.exponentialRampToValueAtTime(f * 1.55 * mul, tt + 0.09);
        const g = ac.createGain(); env(g, tt, 0.002, 0.2 * v, 0.32);
        o.connect(g); out(g, 0.6, rnd(-0.3, 0.3)); o.start(tt); o.stop(tt + 0.45);
      };
      one(t, vel, 1);
      one(t + 0.17, vel * 0.32, 1.19);
    },
  };

  const ksCache = new Map();
  function ksBuffer(f) {
    const key = Math.round(f);
    if (ksCache.has(key)) return ksCache.get(key);
    const rate = ac.sampleRate, dur = 2.8, len = Math.floor(rate * dur);
    const N = Math.max(2, Math.round(rate / f));
    const buf = ac.createBuffer(1, len, rate), d = buf.getChannelData(0);
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    for (let i = 1; i < N; i++) ring[i] = 0.5 * (ring[i] + ring[i - 1]); // soften the attack
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx], nxt = ring[(idx + 1) % N];
      d[i] = cur;
      ring[idx] = 0.4985 * (cur + nxt);
      idx = (idx + 1) % N;
    }
    ksCache.set(key, buf);
    return buf;
  }

  // Gentle "un-check": a muted cloth tap.
  function offTap(t) {
    const n = ac.createBufferSource(); n.buffer = noise();
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ac.createGain(); env(g, t, 0.002, 0.09, 0.06);
    n.connect(lp); lp.connect(g); out(g, 0.15); n.start(t, rnd(0, 1)); n.stop(t + 0.1);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.12);
    const og = ac.createGain(); env(og, t, 0.004, 0.06, 0.14); o.connect(og); out(og, 0.2); o.start(t); o.stop(t + 0.2);
  }

  // --- Public ----------------------------------------------------------------
  function habit(id, day, on, delay) {
    if (!enabled || !ensure()) return;
    const t = ac.currentTime + 0.01 + (delay || 0);
    if (!on) { offTap(t); return; }
    const v = VOICES[id] || VOICES.interview;
    INSTR[v.voice](step(v.root + day), t, 1);
  }

  function flourish(id, delay) {
    if (!enabled || !ensure()) return;
    const v = VOICES[id] || VOICES.interview;
    const t0 = ac.currentTime + 0.02 + (delay || 0);
    [0, 1, 2, 3, 4, 5].forEach((k, i) => INSTR[v.voice](step(v.root + k), t0 + i * 0.11, 0.75));
    INSTR.chime(step(v.root + 5), t0 + 0.75, 0.6);
    INSTR.chime(step(v.root + 7), t0 + 0.78, 0.5);
    INSTR.chime(step(v.root + 9), t0 + 0.81, 0.4);
  }

  // Play any instrument directly: voice('pluck', 4) or voice('chime', 523.25, {hz:true})
  function voice(name, n, opts) {
    opts = opts || {};
    if (!enabled || !ensure() || !INSTR[name]) return;
    const f = opts.hz ? n : step(n);
    INSTR[name](f, ac.currentTime + 0.01 + (opts.delay || 0), opts.vel == null ? 1 : opts.vel);
  }

  let lastHover = 0;
  function ui(kind) {
    if (!enabled || !ensure()) return;
    const t = ac.currentTime + 0.01;
    if (kind === 'hover') {
      const nowMs = performance.now();
      if (nowMs - lastHover < 90) return; lastHover = nowMs;
      INSTR.chime(step(12 + Math.floor(Math.random() * 3)), t, 0.12);
    } else if (kind === 'nav') {
      INSTR.chime(step(8), t, 0.35); INSTR.chime(step(10), t + 0.07, 0.25);
    } else if (kind === 'toggle-on') {
      INSTR.bell(step(7), t, 0.5);
    } else if (kind === 'toggle-off') {
      offTap(t);
    } else if (kind === 'blocked') {
      INSTR.wood(step(-3), t, 0.25);
    }
  }

  // --- Ambient garden bed -----------------------------------------------------
  function startAmbient() {
    if (ambient || !ensure()) return;
    const len = ac.sampleRate * 6, buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    }
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.11, ac.currentTime + 4);
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.06; const lfoG = ac.createGain(); lfoG.gain.value = 260;
    lfo.connect(lfoG); lfoG.connect(lp.frequency);
    const lfo2 = ac.createOscillator(); lfo2.frequency.value = 0.037; const lfo2G = ac.createGain(); lfo2G.gain.value = 0.04;
    lfo2.connect(lfo2G); lfo2G.connect(g.gain);
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(); lfo.start(); lfo2.start();

    const timers = [];
    const dropLoop = () => {
      if (!ambient) return;
      if (enabled) INSTR.drop(step(6 + Math.floor(Math.random() * 6)), ac.currentTime + 0.01, rnd(0.08, 0.18));
      timers.push(setTimeout(dropLoop, rnd(3500, 9000)));
    };
    const birdLoop = () => {
      if (!ambient) return;
      if (enabled) chirp();
      timers.push(setTimeout(birdLoop, rnd(11000, 26000)));
    };
    const chimeLoop = () => {
      if (!ambient) return;
      if (enabled) INSTR.chime(step(5 + Math.floor(Math.random() * 7)), ac.currentTime + 0.01, rnd(0.08, 0.16));
      timers.push(setTimeout(chimeLoop, rnd(7000, 16000)));
    };
    ambient = { src, lfo, lfo2, g, timers };
    timers.push(setTimeout(dropLoop, 2500), setTimeout(birdLoop, 6000), setTimeout(chimeLoop, 4000));
  }

  function chirp() {
    const t0 = ac.currentTime + 0.01, n = 2 + Math.floor(Math.random() * 3), base = rnd(2600, 3400);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * rnd(0.09, 0.14);
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * rnd(1.15, 1.35), t + 0.05);
      o.frequency.exponentialRampToValueAtTime(base * 0.95, t + 0.08);
      const g = ac.createGain(); env(g, t, 0.006, 0.025, 0.07);
      o.connect(g); out(g, 0.5, rnd(-0.6, 0.6)); o.start(t); o.stop(t + 0.12);
    }
  }

  function stopAmbient() {
    if (!ambient) return;
    const a = ambient; ambient = null;
    a.timers.forEach(clearTimeout);
    const t = ac.currentTime;
    a.g.gain.cancelScheduledValues(t); a.g.gain.setValueAtTime(a.g.gain.value, t); a.g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    setTimeout(() => { try { a.src.stop(); a.lfo.stop(); a.lfo2.stop(); } catch (e) { /* ignore */ } }, 1700);
  }

  function setEnabled(b) {
    enabled = !!b; G.setSetting('sound', enabled);
    if (ac) {
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(enabled ? 0.75 : 0.0001, t + 0.3);
    }
  }
  function setAmbient(b) {
    ambientWanted = !!b; G.setSetting('ambient', ambientWanted);
    if (ambientWanted) startAmbient(); else stopAmbient();
  }

  // Browsers need a gesture before audio can start.
  const unlock = () => { ensure(); if (ambientWanted) startAmbient(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // Soft bird chirp for the animals layer (quiet, only when sound is on).
  function birdChirp() { if (enabled && ensure()) chirp(); }

  G.sound = {
    habit, flourish, voice, ui, step, VOICES, chirp: birdChirp,
    setEnabled, isEnabled: () => enabled,
    setAmbient, isAmbient: () => ambientWanted,
    context: () => ac,
  };
})();
