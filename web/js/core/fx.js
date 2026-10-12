/* Garden of Days — fx: one canvas for petals, leaves, sparkles, stipple bursts and ripples. */
(function () {
  'use strict';
  const G = window.Garden;
  const cv = document.getElementById('layer-fx');
  const c = cv.getContext('2d');
  const W = G.STAGE.w, H = G.STAGE.h;
  let parts = [], raf = 0, last = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const s = G.view.scale || 1;
    const k = Math.min(3, s * dpr);
    cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    c.setTransform(k, 0, 0, k, 0, 0);
  }
  G.on('resize', resize);

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function add(p) { parts.push(p); if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }

  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    c.clearRect(0, 0, W, H);
    parts = parts.filter(p => (p.age += dt) < p.life);
    for (const p of parts) step(p, dt);
    raf = parts.length ? requestAnimationFrame(loop) : 0;
    if (!raf) c.clearRect(0, 0, W, H);
  }

  function step(p, dt) {
    const k = p.age / p.life;
    const fadeIn = Math.min(1, p.age / (p.fadeIn || 0.12));
    const alpha = fadeIn * (k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1) * (p.alpha == null ? 1 : p.alpha);
    c.globalAlpha = Math.max(0, alpha);
    switch (p.kind) {
      case 'ring': {
        const r = p.r0 + (p.r1 - p.r0) * easeOut(k);
        c.strokeStyle = p.color; c.lineWidth = p.width * (1 - k * 0.6);
        c.beginPath(); c.ellipse(p.x, p.y, r, r * p.squash, 0, 0, Math.PI * 2); c.stroke();
        break;
      }
      default: {
        const air = G.wind ? G.wind.at(p.x, p.y) * 34 : 0;
        p.vx += ((p.wind || 0) + air) * dt + Math.sin((p.age + p.seed) * p.wobble) * p.flutter * dt;
        p.vy += p.g * dt;
        p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt;
        draw(p, k);
      }
    }
    c.globalAlpha = 1;
  }

  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

  function draw(p, k) {
    c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
    c.fillStyle = p.color;
    const s = p.size;
    switch (p.kind) {
      case 'petal': {
        const flip = Math.abs(Math.cos((p.age + p.seed) * 5));
        c.scale(1, 0.35 + 0.65 * flip);
        c.beginPath();
        c.moveTo(0, -s);
        c.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.7, 0, s);
        c.bezierCurveTo(-s * 0.7, s * 0.7, -s * 0.9, -s * 0.6, 0, -s);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.beginPath(); c.ellipse(-s * 0.15, -s * 0.2, s * 0.18, s * 0.45, 0.2, 0, Math.PI * 2); c.fill();
        break;
      }
      case 'leaf': { // little maple-ish star leaf
        const flip = Math.abs(Math.cos((p.age + p.seed) * 4));
        c.scale(1, 0.45 + 0.55 * flip);
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 ? s * 0.45 : s;
          c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        c.closePath(); c.fill();
        break;
      }
      case 'sparkle': {
        const tw = 0.6 + 0.4 * Math.sin((p.age + p.seed) * 14);
        const r = s * tw;
        c.beginPath();
        c.moveTo(0, -r); c.quadraticCurveTo(0, 0, r, 0); c.quadraticCurveTo(0, 0, 0, r);
        c.quadraticCurveTo(0, 0, -r, 0); c.quadraticCurveTo(0, 0, 0, -r);
        c.fill();
        break;
      }
      case 'line': { // falling willow strand fragment / ink fleck
        c.strokeStyle = p.color; c.lineWidth = 1.2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(0, -s); c.lineTo(0, s); c.stroke();
        break;
      }
      default: { // 'dot' stipple
        c.beginPath(); c.arc(0, 0, s * (1 - k * 0.5), 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  }

  function colorsOf(o) { return o.colors || [o.color || '#FBF5EC']; }

  // Burst of particles from a point. kind: petal | leaf | sparkle | dot | line
  function burst(x, y, o) {
    o = o || {};
    if (G.reducedMotion) o.count = Math.min(4, o.count || 4);
    const n = o.count == null ? 12 : o.count, cols = colorsOf(o), kind = o.kind || 'petal';
    const up = o.up == null ? true : o.up, spread = o.spread == null ? 1 : o.spread, speed = o.speed == null ? 1 : o.speed;
    for (let i = 0; i < n; i++) {
      const a = up ? rnd(-Math.PI * 0.95, -Math.PI * 0.05) : rnd(0, Math.PI * 2);
      const v = rnd(40, 150) * speed;
      add({
        kind, x: x + rnd(-4, 4) * spread, y: y + rnd(-4, 4) * spread,
        vx: Math.cos(a) * v * spread, vy: Math.sin(a) * v,
        g: o.gravity == null ? (kind === 'sparkle' ? -20 : kind === 'dot' ? 60 : 70) : o.gravity,
        drag: kind === 'dot' ? 3.2 : 1.6,
        wind: o.wind == null ? 10 : o.wind, flutter: kind === 'petal' || kind === 'leaf' ? 70 : 0, wobble: rnd(2, 4),
        rot: rnd(0, Math.PI * 2), vr: rnd(-3, 3),
        size: (o.size || (kind === 'dot' ? 2.2 : kind === 'sparkle' ? 5 : 6)) * rnd(0.7, 1.25),
        color: pick(cols), age: 0, life: (o.life || (kind === 'dot' ? 0.9 : kind === 'sparkle' ? 1.1 : 2.6)) * rnd(0.8, 1.2),
        seed: rnd(0, 10), alpha: o.alpha,
      });
    }
  }

  // Concentric ripples (water, glow pulses). squash < 1 makes ellipses (perspective water).
  function ripple(x, y, o) {
    o = o || {};
    const n = o.count || 3;
    for (let i = 0; i < n; i++) {
      setTimeout(() => add({
        kind: 'ring', x, y, r0: o.r0 || 4, r1: (o.radius || 46) * (1 + i * 0.18), squash: o.squash == null ? 0.32 : o.squash,
        width: o.width || 1.6, color: o.color || 'rgba(251,245,236,0.9)', age: 0, life: o.life || 1.4, alpha: o.alpha, fadeIn: 0.02,
      }), i * (o.gap || 170));
    }
  }

  function sparkle(x, y, o) { burst(x, y, Object.assign({ kind: 'sparkle', count: 8, speed: 0.5, gravity: -25 }, o || {})); }
  function stipple(x, y, o) { burst(x, y, Object.assign({ kind: 'dot', count: 26, up: false, speed: 0.9 }, o || {})); }

  // Screen-wide drift (week complete celebration).
  function rain(o) {
    o = o || {};
    const cols = colorsOf(o), kind = o.kind || 'petal', count = G.reducedMotion ? 10 : (o.count || 70), dur = o.duration || 4200;
    for (let i = 0; i < count; i++) {
      setTimeout(() => add({
        kind, x: rnd(-80, W * 0.85), y: rnd(-40, -10), vx: rnd(30, 90), vy: rnd(30, 70), g: 18, drag: 0.4,
        wind: 12, flutter: 80, wobble: rnd(1.5, 3), rot: rnd(0, 6.28), vr: rnd(-2, 2),
        size: (o.size || 7) * rnd(0.7, 1.3), color: pick(cols), age: 0, life: rnd(6, 9), seed: rnd(0, 10),
      }), rnd(0, dur));
    }
  }

  G.fx = { burst, ripple, sparkle, stipple, rain, resize };
})();
