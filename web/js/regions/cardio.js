/* Garden of Days — Cardio region: the koi pond with seven lily pads (Mon→Sun). Done days bloom an orange lotus. */
(function () {
  'use strict';

  Garden.registerRegion('cardio', function (ctx) {
    const NS = 'http://www.w3.org/2000/svg';
    const P = ctx.palette;
    const H = ctx.habit; // color #F08A2E, soft #F9CFA4, deep #8A4210
    const RM = ctx.reducedMotion;
    const W = ctx.bounds.w, HT = ctx.bounds.h;
    const POND = { cx: 350, cy: 120, rx: 290, ry: 80 };
    const INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    // ---------- seeded randomness ----------
    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rand = mulberry32(0xC4A7D10);
    const R = (a, b) => a + rand() * (b - a);
    const pick = arr => arr[Math.floor(rand() * arr.length)];
    const f1 = n => Math.round(n * 10) / 10;

    function el(tag, attrs, parent) {
      const n = document.createElementNS(NS, tag);
      if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    }
    // Many tiny circles as one path (cheap stipple).
    function dotsD(dots) {
      let d = '';
      for (const [x, y, r] of dots) d += `M${f1(x - r)} ${f1(y)}a${r} ${r} 0 1 0 ${f1(2 * r)} 0a${r} ${r} 0 1 0 ${f1(-2 * r)} 0`;
      return d;
    }
    // Smooth closed path through points (Catmull-Rom → cubic Bezier).
    function smoothClosed(pts) {
      const n = pts.length;
      let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
      }
      return d + 'Z';
    }
    function smoothOpen(pts) {
      const n = pts.length;
      let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
      for (let i = 0; i < n - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
        d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
      }
      return d;
    }

    // Organic shoreline: radius factor wobbles with a few seeded harmonics.
    const harm = [2, 3, 5, 7, 11].map(k => ({ k, ph: R(0, Math.PI * 2), a: 0.04 / Math.sqrt(k) }));
    const shoreF = th => 1 + harm.reduce((s, h) => s + h.a * Math.sin(h.k * th + h.ph), 0);
    function shorePt(th, scale) {
      const f = shoreF(th) * (scale || 1);
      return [POND.cx + POND.rx * f * Math.cos(th), POND.cy + POND.ry * f * Math.sin(th)];
    }
    function shorePath(scale) {
      const pts = [];
      for (let i = 0; i < 72; i++) pts.push(shorePt((i / 72) * Math.PI * 2, scale));
      return smoothClosed(pts);
    }
    // Is a point inside the (wobbly) pond?
    function inPond(x, y, margin) {
      const dx = (x - POND.cx) / POND.rx, dy = (y - POND.cy) / POND.ry;
      const th = Math.atan2(dy, dx);
      return Math.hypot(dx, dy) < shoreF(th) * (margin || 1);
    }

    // ---------- scoped CSS ----------
    if (!document.getElementById('cardio-style')) {
      const st = document.createElement('style');
      st.id = 'cardio-style';
      st.textContent = `
.region-cardio .cd-svg { position:absolute; left:0; top:0; overflow:visible; }
.region-cardio .cd-svg * { pointer-events:none; }
.region-cardio .cd-svg .cd-hit { pointer-events:all; }
.region-cardio .cd-day.is-future .cd-hit { cursor:default; }
.region-cardio .cd-hov { transition: transform 420ms var(--ease-spring); }
.region-cardio .cd-day.is-hover:not(.is-future) .cd-hov { transform: translateY(-2.5px) rotate(-3deg) scale(1.05); }
.region-cardio .cd-day:active:not(.is-future) .cd-hov { transform: translateY(0.5px) scale(0.97); transition-duration:120ms; }

/* pad states (painted sprite) */
.region-cardio .cd-padimg { filter: saturate(.7) brightness(1.1); transition: filter 600ms var(--ease-out), opacity 600ms var(--ease-out); }
.region-cardio .cd-day.is-done .cd-padimg { filter: none; }
.region-cardio .cd-padwrap { transition: transform 600ms var(--ease-out); }
.region-cardio .cd-day.is-future .cd-padwrap { transform: scale(.88) translateY(1px); }
.region-cardio .cd-day.is-future .cd-padimg { opacity:.3; filter: grayscale(.6) sepia(.3) hue-rotate(170deg) saturate(1.3) brightness(1.15); }
.region-cardio .cd-day.is-future .cd-tag { opacity:.45; }
.region-cardio .cd-svg image { image-rendering:auto; }

/* lotus: rise, then open from a bud */
.region-cardio .cd-lotus { transform: translateY(10px) scale(.4,.2); opacity:0;
  transition: transform 420ms var(--ease-soft), opacity 380ms var(--ease-out) 40ms; }
.region-cardio .cd-day.is-done .cd-lotus { transform:none; opacity:1;
  transition: transform 620ms var(--ease-spring), opacity 260ms var(--ease-out); }
.region-cardio .cd-open { transform: scale(.42,.82); transition: transform 320ms var(--ease-soft); }
.region-cardio .cd-day.is-done .cd-open { transform: none; transition: transform 720ms var(--ease-spring) 260ms; }
.region-cardio .cd-glow { opacity:0; transition: opacity 800ms var(--ease-out); }

/* today */
.region-cardio .cd-today { opacity:0; }
.region-cardio .cd-day.is-today .cd-today { animation: cd-ring 3.6s var(--ease-out) infinite; }
.region-cardio .cd-day.is-today .cd-today.r2 { animation-delay: 1.8s; }
@keyframes cd-ring { 0% { transform: scale(.85); opacity:0; } 15% { opacity:.85; } 100% { transform: scale(1.75); opacity:0; } }
.region-cardio .cd-spark { opacity:0; }
.region-cardio .cd-day.is-today .cd-spark { opacity:1; animation: cd-fly 7s var(--ease-breathe) infinite alternate; }
.region-cardio .cd-day.is-today .cd-spark circle.core { animation: cd-twinkle 1.7s var(--ease-breathe) infinite alternate; }
@keyframes cd-fly { 0% { transform: translate(0,0); } 33% { transform: translate(6px,-5px); } 66% { transform: translate(-3px,-9px); } 100% { transform: translate(4px,-2px); } }
@keyframes cd-twinkle { from { opacity:.45; } to { opacity:1; } }
.region-cardio .cd-day.is-today .cd-tag ellipse { fill:#FFF6C8; }

/* focus */
.region-cardio .cd-focus { opacity:0; transition: opacity 200ms var(--ease-out); }
.region-cardio .cd-day.is-focus .cd-focus { opacity:1; }

/* week complete */
.region-cardio .cd-glimmer, .region-cardio .cd-floaters { opacity:0; transition: opacity 1400ms var(--ease-out); }
.region-cardio .cd-svg.is-complete .cd-glimmer, .region-cardio .cd-svg.is-complete .cd-floaters { opacity:1; }
.region-cardio .cd-svg.is-complete .cd-tw { animation: cd-twinkle 2.2s var(--ease-breathe) var(--del,0s) infinite alternate; }
.region-cardio .cd-svg.is-complete .cd-float { animation: cd-floatp 9s var(--ease-breathe) var(--del,0s) infinite alternate; }
@keyframes cd-floatp { from { transform: translate(-3px,0) rotate(-6deg); } to { transform: translate(4px,1px) rotate(8deg); } }

/* night */
.region-cardio .cd-night, .region-cardio .cd-moon { opacity:0; transition: opacity 1600ms var(--ease-out); }
html[data-phase="night"] .region-cardio .cd-night { opacity:.78; }
html[data-phase="night"] .region-cardio .cd-moon { opacity:1; }
html[data-phase="dusk"] .region-cardio .cd-night { opacity:.3; }
html[data-phase="night"] .region-cardio .cd-day.is-done .cd-glow { opacity:1; }
html[data-phase="night"] .region-cardio .cd-svg .cd-lines path { stroke-opacity:.38; }
html[data-phase="night"] .region-cardio .cd-day.is-done .cd-glow { animation: cd-twinkle 4s var(--ease-breathe) infinite alternate; }

.region-cardio .cd-svg.cd-instant *, .region-cardio .cd-svg.cd-instant { transition:none !important; }
.region-cardio .cd-pads { transition: opacity 260ms var(--ease-out); }
.region-cardio .cd-pads.is-fading { opacity:.35; }
@media (prefers-reduced-motion: reduce) {
  .region-cardio .cd-float { animation:none !important; }
}
`;
      document.head.appendChild(st);
    }

    // ---------- SVG scaffold ----------
    const svg = el('svg', { class: 'cd-svg', width: W, height: HT, viewBox: `0 0 ${W} ${HT}` });
    ctx.el.appendChild(svg);
    const defs = el('defs', null, svg);
    const shoreD = shorePath(1);
    const clip = el('clipPath', { id: 'cd-clip' }, defs);
    el('path', { d: shoreD }, clip);

    const petalGrad = el('linearGradient', { id: 'cd-petal', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    el('stop', { offset: '0', 'stop-color': H.color }, petalGrad);
    el('stop', { offset: '0.55', 'stop-color': '#F4A55E' }, petalGrad);
    el('stop', { offset: '1', 'stop-color': H.soft }, petalGrad);
    const petalGradBack = el('linearGradient', { id: 'cd-petal-b', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    el('stop', { offset: '0', 'stop-color': '#F49A4A' }, petalGradBack);
    el('stop', { offset: '1', 'stop-color': '#FCE3C8' }, petalGradBack);
    const glowGrad = el('radialGradient', { id: 'cd-glowg' }, defs);
    el('stop', { offset: '0', 'stop-color': '#FFE6A8', 'stop-opacity': '0.95' }, glowGrad);
    el('stop', { offset: '0.45', 'stop-color': '#F9CFA4', 'stop-opacity': '0.45' }, glowGrad);
    el('stop', { offset: '1', 'stop-color': '#F9CFA4', 'stop-opacity': '0' }, glowGrad);
    const sparkGrad = el('radialGradient', { id: 'cd-sparkg' }, defs);
    el('stop', { offset: '0', 'stop-color': '#FFF8D0', 'stop-opacity': '1' }, sparkGrad);
    el('stop', { offset: '1', 'stop-color': '#F3E79A', 'stop-opacity': '0' }, sparkGrad);
    const blur = el('filter', { id: 'cd-blur', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: '6' }, blur);
    const soft = el('filter', { id: 'cd-soft', x: '-20%', y: '-40%', width: '140%', height: '180%' }, defs);
    el('feGaussianBlur', { stdDeviation: '12 7' }, soft);

    // ---------- bank (behind water): moss halo + pebbles ----------
    const bank = el('g', { class: 'cd-bank' }, svg);
    el('path', { d: shorePath(1.055), fill: '#E9EFD9', opacity: 0.55 }, bank);
    // stippled damp bank ring
    {
      const dots = [];
      for (let i = 0; i < 520; i++) {
        const th = R(0, Math.PI * 2);
        const [x, y] = shorePt(th, R(1.0, 1.07));
        dots.push([x, y, R(0.45, 0.9)]);
      }
      el('path', { d: dotsD(dots), fill: '#A9C59E', opacity: 0.55 }, bank);
    }

    // ---------- water ----------
    const water = el('g', { class: 'cd-water', 'clip-path': 'url(#cd-clip)' }, svg);
    el('path', { d: shoreD, fill: P.water }, water);
    // stepped depth (flat tones, deeper toward centre / far edge)
    const depth = el('g', { filter: 'url(#cd-soft)' }, water);
    [[0.86, 0.3], [0.68, 0.32], [0.5, 0.34], [0.32, 0.3]].forEach(([s, o], k) => {
      el('ellipse', { cx: POND.cx + 6, cy: POND.cy - 10 - k * 3, rx: POND.rx * s, ry: POND.ry * s * 0.92, fill: P.waterDeep, opacity: o }, depth);
    });
    // far-edge shadow band (back of the pond is deeper)
    el('path', { d: shorePath(1), fill: 'none', stroke: P.waterDeep, 'stroke-width': 18, opacity: 0.35, transform: 'translate(0,10)' }, water);
    const night = el('path', { class: 'cd-night', d: shoreD, fill: '#6E7FCC' }, water);
    night.setAttribute('fill-opacity', '1');

    // fine wavy cream contour lines, two drifting families
    function buildLines(cls, y0, step, opacity, seedShift) {
      const g = el('g', { class: cls }, water);
      let y = y0;
      let paths = '';
      while (y < POND.cy + POND.ry + 12) {
        const pts = [];
        const amp = R(0.8, 2.4), freq = R(0.018, 0.035), ph = R(0, 6.28), amp2 = R(0.3, 1.1), freq2 = R(0.06, 0.11);
        for (let x = POND.cx - POND.rx - 30; x <= POND.cx + POND.rx + 30; x += 14) {
          pts.push([x, y + amp * Math.sin(x * freq + ph + seedShift) + amp2 * Math.sin(x * freq2 + ph * 2)]);
        }
        paths += smoothOpen(pts);
        y += step * R(0.75, 1.35);
      }
      el('path', { d: paths, fill: 'none', stroke: P.cream, 'stroke-width': 0.7, 'stroke-opacity': opacity, 'stroke-linecap': 'round' }, g);
      return g;
    }
    buildLines('cd-lines', POND.cy - POND.ry - 6, 4.6, 0.62, 0);
    buildLines('cd-lines2', POND.cy - POND.ry - 4, 9.5, 0.3, 2.1);

    // stippled reflections (sky light on water)
    {
      const dots = [];
      const clusters = [[200, 80], [470, 150], [330, 175], [560, 90], [130, 140], [410, 70]];
      clusters.forEach(([cx, cy]) => {
        const n = Math.floor(R(30, 55));
        for (let i = 0; i < n; i++) {
          const x = cx + R(-30, 30) * R(0.3, 1), y = cy + R(-6, 6) * R(0.3, 1);
          if (inPond(x, y, 0.96)) dots.push([x, y, R(0.4, 0.95)]);
        }
      });
      el('path', { d: dotsD(dots), fill: P.cream, opacity: 0.7 }, water);
      const dots2 = [];
      for (let i = 0; i < 160; i++) {
        const x = R(70, 630), y = R(45, 200);
        if (inPond(x, y, 0.94)) dots2.push([x, y, R(0.35, 0.7)]);
      }
      el('path', { d: dotsD(dots2), fill: '#E4E9FB', opacity: 0.6 }, water);
    }

    // moon reflection (night) — a soft butter smear broken into ripples, toward the right
    const moon = el('g', { class: 'cd-moon' }, water);
    el('ellipse', { cx: 535, cy: 168, rx: 30, ry: 16, fill: P.butter, opacity: 0.35, filter: 'url(#cd-blur)' }, moon);
    {
      let d = '';
      for (let k = 0; k < 11; k++) {
        const y = 152 + k * 3.4, half = (22 - Math.abs(k - 4) * 3.4) * R(0.8, 1.15);
        if (half < 3) continue;
        const x0 = 535 + R(-4, 4);
        d += `M${f1(x0 - half)} ${f1(y)}q${f1(half / 2)} -1 ${f1(half)} 0t${f1(half)} 0`;
      }
      el('path', { d, fill: 'none', stroke: '#FFF4BE', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.85 }, moon);
    }

    // shoreline rims: fine cream stitch lines (like embroidered edge)
    const rim = el('g', { class: 'cd-rim', fill: 'none', 'stroke-linecap': 'round' }, svg);
    el('path', { d: shoreD, stroke: P.cream, 'stroke-width': 1.3, opacity: 0.9 }, rim);
    el('path', { d: shorePath(0.975), stroke: P.cream, 'stroke-width': 0.6, opacity: 0.6, 'stroke-dasharray': '3 2.5' }, rim);
    el('path', { d: shorePath(1.025), stroke: '#8FB28A', 'stroke-width': 0.6, opacity: 0.55, 'stroke-dasharray': '1 2.2' }, rim);

    // pebbles + moss tufts on parts of the bank (leaving upper-left open for the stream)
    const deco = el('g', { class: 'cd-deco' }, svg);
    const pebCols = ['#E6E1F2', '#F6D9E4', '#D9DCEB', '#EDE6D6', '#C9CCE6', '#F3E2C9'];
    function pebble(x, y, s) {
      const g = el('g', { transform: `translate(${f1(x)},${f1(y)}) rotate(${f1(R(-20, 20))})` }, deco);
      const rx = s * R(0.9, 1.3), ry = s * R(0.55, 0.75);
      el('ellipse', { cx: 0, cy: 0, rx: f1(rx), ry: f1(ry), fill: pick(pebCols), stroke: P.inkSoft, 'stroke-width': 0.45, 'stroke-opacity': 0.35 }, g);
      const dots = [];
      for (let i = 0; i < Math.round(s * 3); i++) { const a = R(0, 6.28), r = Math.sqrt(rand()); dots.push([Math.cos(a) * rx * r * 0.8, Math.sin(a) * ry * r * 0.8, 0.35]); }
      el('path', { d: dotsD(dots), fill: P.inkSoft, opacity: 0.3 }, g);
      el('path', { d: `M${f1(-rx * 0.5)} ${f1(-ry * 0.35)}q${f1(rx * 0.4)} ${f1(-ry * 0.35)} ${f1(rx * 0.8)} 0`, fill: 'none', stroke: '#fff', 'stroke-width': 0.6, opacity: 0.6 }, g);
    }
    function tuft(x, y, s, cols) {
      let d = '';
      const n = Math.round(R(6, 11));
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + R(-0.9, 0.9), L = s * R(0.6, 1.2);
        const bx = x + R(-s * 0.35, s * 0.35);
        const ex = bx + Math.cos(a) * L, ey = y + Math.sin(a) * L;
        d += `M${f1(bx)} ${f1(y)}Q${f1(bx + Math.cos(a) * L * 0.2)} ${f1(y - L * 0.55)} ${f1(ex)} ${f1(ey)}`;
      }
      el('path', { d, fill: 'none', stroke: pick(cols), 'stroke-width': 0.9, 'stroke-linecap': 'round' }, deco);
      const dots = [];
      for (let i = 0; i < 10; i++) dots.push([x + R(-s * 0.6, s * 0.6), y + R(-1.5, 1.2), R(0.4, 0.8)]);
      el('path', { d: dotsD(dots), fill: '#7FAE78', opacity: 0.8 }, deco);
    }
    const mossCols = ['#4E8F55', '#7FBF7A', '#2F6B3A', '#9ED89A'];
    // near-left shore pebbles (front-left, between 115°–165°)
    for (let i = 0; i < 9; i++) { const th = (R(118, 168) * Math.PI) / 180; const [x, y] = shorePt(th, R(1.03, 1.08)); pebble(x, y, R(3, 5.6)); }
    // near-right pebbles (20°–55°)
    for (let i = 0; i < 8; i++) { const th = (R(18, 56) * Math.PI) / 180; const [x, y] = shorePt(th, R(1.03, 1.08)); pebble(x, y, R(2.8, 5.2)); }
    // moss tufts: far right back (300°–345°), right end (0°–12°), left end (170°–190°), front few
    [[305, 345, 5], [-8, 10, 3], [168, 188, 3], [70, 80, 1], [96, 104, 1]].forEach(([a0, a1, n]) => {
      for (let i = 0; i < n; i++) {
        const th = (R(a0, a1) * Math.PI) / 180; const [x, y] = shorePt(th, R(1.01, 1.05));
        if (y > 206) continue;
        tuft(x, y + 1, R(6, 11), mossCols);
      }
    });

    // ---------- week-complete glimmer + floating petals (above water, below pads) ----------
    const glimmer = el('g', { class: 'cd-glimmer' }, svg);
    const floaters = el('g', { class: 'cd-floaters' }, svg);

    // ---------- pads (painted sprites) ----------
    const SPR = 'assets/sprites/';
    const PAD_SPR = [{ src: SPR + 'lilypad.png', ar: 112 / 240 }, { src: SPR + 'lilypad-b.png', ar: 124 / 240 }];
    const LOTUS_SPR = [{ src: SPR + 'lotus.png', ar: 186 / 220, bx: 0.6 }, { src: SPR + 'lotus-b.png', ar: 202 / 220, bx: 0.7 }];
    [...PAD_SPR, ...LOTUS_SPR].forEach(s => { const im = new Image(); im.src = s.src; });

    const padsG = el('g', { class: 'cd-pads' }, svg);
    const pads = [];
    const PAD_X0 = 121, PAD_STEP = 76.5;
    for (let i = 0; i < 7; i++) {
      const x = PAD_X0 + i * PAD_STEP + R(-3, 3);
      const y = POND.cy + (i % 2 ? -15 : 10) + R(-2, 2);
      const spr = PAD_SPR[i % 2];
      const w = R(66, 72), h = w * spr.ar;
      pads.push({ i, x, y, w, h, spr, rx: w * 0.47, ry: h * 0.44, rot: R(-6, 6), flip: i === 2 || i === 5, ph: R(0, 6.28), ph2: R(0, 6.28) });
    }

    const dayNodes = [];
    pads.forEach(p => {
      const outer = el('g', { class: 'cd-day', transform: `translate(${f1(p.x)},${f1(p.y)})` }, padsG);
      // today ripple rings (on water, around pad)
      el('ellipse', { class: 'cd-today', cx: 0, cy: 1, rx: p.rx + 4, ry: p.ry + 3, fill: 'none', stroke: '#F7D96A', 'stroke-width': 1.4 }, outer);
      el('ellipse', { class: 'cd-today r2', cx: 0, cy: 1, rx: p.rx + 4, ry: p.ry + 3, fill: 'none', stroke: '#FFF0B0', 'stroke-width': 1 }, outer);
      // focus ring
      el('ellipse', { class: 'cd-focus', cx: 0, cy: -4, rx: p.rx + 8, ry: p.ry + 12, fill: 'none', stroke: H.color, 'stroke-width': 1.8, 'stroke-opacity': 0.85 }, outer);
      el('ellipse', { class: 'cd-focus', cx: 0, cy: -4, rx: p.rx + 11, ry: p.ry + 15, fill: 'none', stroke: H.soft, 'stroke-width': 3, 'stroke-opacity': 0.45 }, outer);

      const bob = el('g', { class: 'cd-bob' }, outer); // wind-driven transform (attribute)
      const hov = el('g', { class: 'cd-hov' }, bob);
      // soft water shadow under the pad (flat tone)
      el('ellipse', { cx: 1.5, cy: 2.5, rx: p.rx * 0.98, ry: p.ry * 0.9, fill: P.waterDeep, opacity: 0.35 }, hov);
      const padWrap = el('g', { class: 'cd-padwrap' }, hov);
      el('image', {
        class: 'cd-padimg', href: p.spr.src, x: f1(-p.w / 2), y: f1(-p.h / 2), width: f1(p.w), height: f1(p.h),
        transform: `rotate(${f1(p.rot)})${p.flip ? ' scale(-1,1)' : ''}`, preserveAspectRatio: 'xMidYMid meet',
      }, padWrap);

      // lotus: sway (wind, attribute) → rise (CSS) → open (CSS) → painted sprite
      const ls = LOTUS_SPR[(p.i + 1) % 2];
      const lw = R(51, 57), lh = lw * ls.ar;
      const sway = el('g', { transform: 'translate(0,-2)' }, hov);
      el('ellipse', { class: 'cd-glow', cx: 0, cy: -lh * 0.45, rx: lw * 0.75, ry: lh * 0.62, fill: 'url(#cd-glowg)' }, sway);
      const lotus = el('g', { class: 'cd-lotus' }, sway);
      const open = el('g', { class: 'cd-open' }, lotus);
      const lflip = p.i % 3 === 1;
      el('image', {
        href: ls.src, x: f1(-ls.bx * lw), y: f1(-lh * 0.94), width: f1(lw), height: f1(lh),
        transform: lflip ? 'scale(-1,1)' : '', preserveAspectRatio: 'xMidYMid meet',
      }, open);
      p.sway = sway; p.bob = bob; p.lotusTop = { x: 0, y: -lh * 0.8 };

      // firefly spark (today)
      const spark = el('g', { class: 'cd-spark', transform: `translate(${f1(p.rx * 0.75)},${f1(-p.ry - 26)})` }, outer);
      const sparkIn = el('g', null, spark);
      el('circle', { cx: 0, cy: 0, r: 5, fill: 'url(#cd-sparkg)' }, sparkIn);
      el('circle', { class: 'core', cx: 0, cy: 0, r: 1.3, fill: '#FFFBE3' }, sparkIn);

      // day tag: tiny cream floating petal with an italic initial
      const tx = -p.rx * 0.82, ty = p.ry + 5;
      const tag = el('g', { class: 'cd-tag', transform: `translate(${f1(tx)},${f1(ty)}) rotate(${f1(R(-10, 6))})` }, outer);
      el('ellipse', { cx: 0, cy: 0, rx: 7.4, ry: 5.8, fill: P.cream, opacity: 0.95, stroke: '#C9B9A2', 'stroke-width': 0.4 }, tag);
      el('path', { d: 'M5.8 -2.4q2.6 1.4 2.4 3.2', fill: 'none', stroke: '#C9B9A2', 'stroke-width': 0.5 }, tag);
      const t = el('text', { x: 0, y: 3, 'text-anchor': 'middle', 'font-size': 8.8, 'font-style': 'italic', fill: P.inkSoft, opacity: 0.9 }, tag);
      t.style.fontFamily = 'var(--font-display)';
      t.textContent = INITIALS[p.i];

      // invisible hit area (covers pad + standing lotus)
      el('ellipse', { class: 'cd-hit', cx: 0, cy: -12, rx: p.rx + 5, ry: p.ry + 26, fill: 'transparent' }, outer);

      p.node = outer;
      dayNodes.push(outer);

      ctx.bindDay(outer, p.i, {
        anchor: { x: p.x, y: p.y - 46 },
        onHover: on => {
          if (!on || ctx.isFuture(p.i)) return;
          const s = ctx.stage(p.x, p.y + 1);
          ctx.fx.ripple(s.x, s.y, { radius: p.rx + 12, squash: 0.4, count: 1, width: 1.1, life: 1.1, alpha: 0.7, r0: p.rx * 0.8 });
          if (ctx.sound && ctx.sound.ui) ctx.sound.ui('hover');
        },
        onToggle: value => onToggle(p, value),
      });
    });

    // ---------- wind: pads drift + tilt on a spring, lotus heads sway, water lines follow the breeze ----------
    const WIND = Garden.wind;
    if (WIND && !RM) {
      const linesA = svg.querySelector('.cd-lines'), linesB = svg.querySelector('.cd-lines2');
      pads.forEach(p => {
        const s = ctx.stage(p.x, p.y);
        p.sx = s.x; p.sy = s.y;
        p.spX = WIND.spring({ k: 9, c: 3 });
        p.spR = WIND.spring({ k: 7, c: 2.4 });
        p.spL = WIND.spring({ k: 13, c: 2.6 });
      });
      WIND.onTick((t, dt) => {
        for (const p of pads) {
          const dw = WIND.at(p.sx, p.sy, t) - 0.4;
          const x = p.spX.step(dw * 6, dt);
          const r = p.spR.step(dw * 4, dt) + 0.9 * Math.sin(t * 0.8 + p.ph2);
          const y = 1.5 * Math.sin(t * 1.05 + p.ph);
          p.bob.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)}) rotate(${r.toFixed(2)})`);
          const a = p.spL.step(dw * 8 + 1.6 * Math.sin(t * 1.6 + p.ph), dt);
          p.sway.setAttribute('transform', `translate(0,-2) rotate(${a.toFixed(2)})`);
        }
        const b = (WIND.breeze(t) - 0.34) * 12;
        if (linesA) linesA.setAttribute('transform', `translate(${(5 * Math.sin(t * 0.42) + b).toFixed(2)},0)`);
        if (linesB) linesB.setAttribute('transform', `translate(${(-4 * Math.sin(t * 0.35 + 1) + b * 0.6).toFixed(2)},${(0.6 * Math.sin(t * 0.35)).toFixed(2)})`);
      });
    }

    // ---------- glimmer path + floaters (built once from pad positions) ----------
    {
      const pts = pads.map(p => [p.x, p.y + 2]);
      const ext = [[pads[0].x - 40, pads[0].y + 6], ...pts, [pads[6].x + 40, pads[6].y - 4]];
      const d = smoothOpen(ext);
      el('path', { d, fill: 'none', stroke: '#FFE7A0', 'stroke-width': 16, 'stroke-linecap': 'round', opacity: 0.22 }, glimmer);
      el('path', { d, fill: 'none', stroke: '#FFF3C4', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.35 }, glimmer);
      // broken shimmer dashes + twinkle dots along the band
      for (let g = 0; g < 4; g++) {
        const tw = el('g', { class: 'cd-tw' }, glimmer);
        tw.style.setProperty('--del', `${f1(-g * 0.6)}s`);
        const dots = [];
        let dash = '';
        for (let k = 0; k < ext.length - 1; k++) {
          for (let m = 0; m < 6; m++) {
            const t = rand();
            const x = ext[k][0] + (ext[k + 1][0] - ext[k][0]) * t + R(-4, 4);
            const y = ext[k][1] + (ext[k + 1][1] - ext[k][1]) * t + R(-5, 5);
            if (m % 3 === 0) dash += `M${f1(x - 3)} ${f1(y)}h${f1(R(3, 8))}`;
            else dots.push([x, y, R(0.5, 1.1)]);
          }
        }
        el('path', { d: dotsD(dots), fill: '#FFF6CF' }, tw);
        el('path', { d: dash, stroke: '#FFE58A', 'stroke-width': 1, 'stroke-linecap': 'round', fill: 'none' }, tw);
      }
      // floating petals on the water
      for (let k = 0; k < 9; k++) {
        let x, y, tries = 0;
        do { x = R(90, 610); y = R(60, 190); tries++; } while ((!inPond(x, y, 0.85) || pads.some(p => Math.abs(p.x - x) < 30 && Math.abs(p.y - y) < 18)) && tries < 40);
        const fo = el('g', { transform: `translate(${f1(x)},${f1(y)}) rotate(${f1(R(0, 360))})` }, floaters);
        const fi = el('g', { class: 'cd-float' }, fo);
        fi.style.setProperty('--del', `${f1(-R(0, 9))}s`);
        el('path', { d: 'M0 -3.4C2.8 -2.4 2.4 2 0 3.4C-2.4 2 -2.8 -2.4 0 -3.4Z', fill: pick([H.color, H.soft, '#F6B57A']), transform: 'scale(1,0.55)', opacity: 0.95 }, fi);
      }
    }

    // ---------- state rendering ----------
    function updatePerches() {
      pads.forEach(p => {
        const fut = ctx.isFuture(p.i);
        const s = ctx.stage(p.x, p.y);
        if (!fut) Garden.addPerch(`cardio-pad-${p.i}`, s.x + p.rx * 0.35, s.y - 1, 'pad');
        else Garden.removePerch(`cardio-pad-${p.i}`);
        if (ctx.isDone(p.i)) {
          const t = ctx.stage(p.x + p.lotusTop.x, p.y + p.lotusTop.y);
          Garden.addPerch(`cardio-lotus-${p.i}`, t.x, t.y, 'flower');
        } else Garden.removePerch(`cardio-lotus-${p.i}`);
      });
    }
    function updateComplete() { svg.classList.toggle('is-complete', ctx.count() === 7); }

    function renderInstant(fade) {
      svg.classList.add('cd-instant');
      updateComplete();
      updatePerches();
      if (fade && !RM) {
        padsG.classList.add('is-fading');
        setTimeout(() => padsG.classList.remove('is-fading'), 30);
      }
      requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove('cd-instant')));
    }

    function onToggle(p, value) {
      const s = ctx.stage(p.x, p.y);
      if (value) {
        ctx.fx.ripple(s.x, s.y + 1, { radius: 70, squash: 0.4, count: 3, gap: 180, color: 'rgba(251,245,236,0.95)', width: 1.6, life: 1.5, r0: p.rx * 0.7 });
        setTimeout(() => {
          ctx.fx.burst(s.x, s.y - 4, { kind: 'dot', colors: [P.cream, '#E4E9FB', P.water], count: 16, speed: 0.75, spread: 0.9, size: 2 });
          ctx.fx.burst(s.x, s.y - 12, { kind: 'petal', colors: [H.color, H.soft, '#F6B57A'], count: 6, speed: 0.55, size: 4.2, life: 2.2 });
        }, 140);
        setTimeout(() => ctx.fx.sparkle(s.x, s.y - 18, { colors: [P.butter, '#FFF6CF'], count: 5 }), 520);
        Garden.emit('pond:splash', { x: s.x, y: s.y, day: p.i });
        if (ctx.count() === 7) {
          setTimeout(() => {
            pads.forEach((q, k) => setTimeout(() => {
              const t = ctx.stage(q.x, q.y - 10);
              ctx.fx.sparkle(t.x, t.y, { colors: [P.butter, '#FFF6CF', H.soft], count: 4 });
            }, k * 90));
          }, 700);
        }
      } else {
        ctx.fx.ripple(s.x, s.y + 1, { radius: 36, squash: 0.4, count: 1, width: 1.2, life: 1, r0: p.rx * 0.5, alpha: 0.8 });
      }
      updateComplete();
      updatePerches();
    }

    ctx.onWeekChange(() => renderInstant(true));
    renderInstant(false);
    Garden.on('resize', updatePerches);

    // ---------- idle life: occasional koi-touch ripples ----------
    if (!RM) {
      const live = () => {
        const delay = 3000 + Math.random() * 4000;
        setTimeout(() => {
          if (!document.hidden) {
            let x, y, tries = 0;
            do { x = 90 + Math.random() * 520; y = 55 + Math.random() * 130; tries++; }
            while ((!inPond(x, y, 0.85) || pads.some(p => Math.hypot((p.x - x) / 1.6, p.y - y) < 22)) && tries < 20);
            const s = ctx.stage(x, y);
            ctx.fx.ripple(s.x, s.y, { radius: 14 + Math.random() * 10, squash: 0.4, count: 2, gap: 260, width: 1, life: 1.6, alpha: 0.45, r0: 2 });
          }
          live();
        }, delay);
      };
      live();
    }

    // label: above the near-left shore
    ctx.placeLabel(18, 22, { align: 'left' });

    return { pads };
  });
})();
