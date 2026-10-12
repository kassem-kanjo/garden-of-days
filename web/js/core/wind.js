/* Garden of Days — wind: one shared air field so every living thing moves together.

   w(x, t) = breeze(t) + turbulence(x, t) + Σ gusts(x, t)

   breeze      slow sum of incommensurate sines (never repeats exactly)
   turbulence  short waves travelling across the stage
   gusts       Gaussian pulses that roll left → right at ~260 px/s, so you can
               watch a gust move through the grass, then the willows, then the lanterns.

   Positive w leans things to the right. Typical range: 0 … 1.4.
   Also provides one shared animation ticker so layers don't each run their own loop. */
(function () {
  'use strict';
  const G = window.Garden;
  const W = G.STAGE.w;

  const gusts = [];
  let nextGust = 4;

  function breeze(t) {
    return 0.34 + 0.16 * Math.sin(0.17 * t) + 0.09 * Math.sin(0.41 * t + 1.7) + 0.05 * Math.sin(0.93 * t + 0.4);
  }
  function turbulence(x, t) {
    return 0.09 * Math.sin(0.011 * x - 1.3 * t) + 0.06 * Math.sin(0.027 * x - 2.1 * t + 0.8) + 0.035 * Math.sin(0.061 * x - 3.7 * t + 2.1);
  }
  function gust(x, t) {
    let s = 0;
    for (const g of gusts) {
      const front = g.x0 + g.speed * (t - g.t0);
      const d = (x - front) / g.width;
      // Asymmetric pulse: sharp leading edge, long soft tail — how real gusts feel.
      s += g.amp * (d > 0 ? Math.exp(-d * d * 2.2) : Math.exp(-d * d * 0.45));
    }
    return s;
  }

  function at(x, y, t) {
    t = t == null ? now() : t;
    // Higher in the sky the air moves a touch more.
    const lift = 1 + 0.18 * (1 - Math.min(1, Math.max(0, (y == null ? 450 : y) / 900)));
    return (breeze(t) + turbulence(x, t) + gust(x, t)) * lift * strength;
  }

  let strength = G.reducedMotion ? 0.25 : 1;
  const t0 = performance.now();
  function now() { return (performance.now() - t0) / 1000; }

  // Shared ticker -----------------------------------------------------------
  const subs = new Set();
  let raf = 0, last = 0;
  function frame(ms) {
    const t = (ms - t0) / 1000;
    const dt = Math.min(0.05, last ? t - last : 0.016);
    last = t;
    // Spawn / retire gusts.
    if (t > nextGust) {
      gusts.push({ x0: -500, t0: t, speed: 220 + Math.random() * 110, width: 170 + Math.random() * 120, amp: 0.45 + Math.random() * 0.6 });
      nextGust = t + 7 + Math.random() * 10;
      G.emit('gust', gusts[gusts.length - 1]);
    }
    for (let i = gusts.length - 1; i >= 0; i--) {
      const g = gusts[i];
      if (g.x0 + g.speed * (t - g.t0) - g.width * 4 > W + 200) gusts.splice(i, 1);
    }
    subs.forEach(fn => { try { fn(t, dt); } catch (e) { console.error('[wind] tick error', e); subs.delete(fn); } });
    raf = requestAnimationFrame(frame);
  }
  function onTick(fn) { subs.add(fn); if (!raf) raf = requestAnimationFrame(frame); return () => subs.delete(fn); }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (subs.size && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  });

  // Simple damped spring helper for anything that should "feel" the wind:
  //   const s = Garden.wind.spring({k: 12, c: 3.5});  s.step(target, dt) → value
  function spring(o) {
    o = o || {};
    const k = o.k == null ? 14 : o.k, c = o.c == null ? 4 : o.c;
    let x = o.x || 0, v = 0;
    return {
      step(target, dt) { const a = k * (target - x) - c * v; v += a * dt; x += v * dt; return x; },
      get value() { return x; },
      kick(dv) { v += dv; },
    };
  }

  G.wind = { at, breeze, turbulence, gust, time: now, onTick, spring, gusts, setStrength: s => { strength = s; } };
})();
