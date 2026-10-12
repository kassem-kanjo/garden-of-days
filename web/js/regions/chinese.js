/* Garden of Days — Chinese: an ink plum-blossom branch (梅花). Seven buds, Mon→Sun from base to tip. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const INK = '#16161F';
  const PINK = '#EE8FB4', SOFT = '#F9D3E2', DEEP = '#8E2F57', RIM = '#D86E9A';
  const BUTTER = '#F3E79A', CREAM = '#FBF5EC', VERMILION = '#E0262B';
  const NUMERALS = ['一', '二', '三', '四', '五', '六', '日'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const f1 = v => Math.round(v * 10) / 10;

  // ---------------------------------------------------------------------------
  // Geometry (region-local, 660 x 420)
  // ---------------------------------------------------------------------------
  const BASE = { x: 22, y: 428 };
  const MAIN = [
    [20, 430, 27], [36, 396, 23], [62, 356, 21], [74, 322, 19], [60, 290, 18], [70, 262, 16],
    [112, 236, 13.5], [166, 216, 12], [212, 196, 10.5], [256, 176, 9], [304, 164, 8], [352, 148, 7],
    [404, 132, 6], [452, 118, 5], [500, 106, 4], [548, 98, 3], [592, 88, 2], [632, 76, 0.9],
  ];
  const TWIGS = [
    [[66, 268, 8], [46, 228, 5.5], [42, 196, 3.6], [30, 166, 2.2], [24, 146, 0.9]],
    [[212, 198, 5.5], [226, 162, 4], [222, 132, 2.6], [234, 104, 1.5], [240, 88, 0.7]],
    [[304, 166, 5], [350, 188, 4], [398, 198, 2.9], [440, 212, 1.7], [472, 222, 0.7]],
    [[452, 118, 3.2], [470, 90, 2.1], [466, 66, 1.3], [474, 50, 0.6]],
    [[20, 428, 10], [6, 436, 5], [-10, 440, 1]],
    [[30, 428, 8], [52, 436, 4], [74, 440, 1]],
  ];
  // Each day: spur base on the branch -> bud centre, numeral offset, hover bend.
  const DAYS = [
    { s: [72, 326], b: [114, 308], n: [26, -14], bend: -3 },
    { s: [140, 226], b: [146, 184], n: [-26, -8], bend: 3 },
    { s: [234, 188], b: [244, 230], n: [26, 14], bend: -3 },
    { s: [330, 158], b: [328, 114], n: [-26, -6], bend: 3 },
    { s: [398, 198], b: [410, 240], n: [26, 12], bend: -3 },
    { s: [502, 106], b: [520, 146], n: [26, 10], bend: -3 },
    { s: [588, 90], b: [612, 60], n: [-26, -14], bend: 3 },
  ];

  // Catmull-Rom resample of [x,y,w] control points.
  function resample(pts, step) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const n = Math.max(2, Math.round(len / step));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const cr = j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        out.push({ x: cr(0), y: cr(1), w: p1[2] + (p2[2] - p1[2]) * t });
      }
    }
    const l = pts[pts.length - 1];
    out.push({ x: l[0], y: l[1], w: l[2] });
    for (let i = 0; i < out.length; i++) {
      const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      out[i].tx = dx / d; out[i].ty = dy / d;
      out[i].nx = -dy / d; out[i].ny = dx / d;
    }
    return out;
  }

  // Filled ink stroke with slightly ragged edges.
  function inkPath(s, rng, rough) {
    const L = [], R = [];
    for (const p of s) {
      const j = (rng() - 0.5) * rough * Math.min(p.w, 7) * 0.22;
      const k = (rng() - 0.5) * rough * Math.min(p.w, 7) * 0.22;
      const h = p.w / 2;
      L.push([p.x + p.nx * (h + j), p.y + p.ny * (h + j)]);
      R.push([p.x - p.nx * (h + k), p.y - p.ny * (h + k)]);
    }
    const all = L.concat(R.reverse());
    return 'M' + all.map(q => f1(q[0]) + ',' + f1(q[1])).join('L') + 'Z';
  }

  function polyOffset(s, f, from, to) {
    const pts = [];
    for (let i = from; i < to; i++) {
      const p = s[i];
      pts.push(f1(p.x + p.nx * p.w * f) + ',' + f1(p.y + p.ny * p.w * f));
    }
    return pts.length > 1 ? 'M' + pts.join('L') : '';
  }

  function dashes(rng, n) {
    const a = [];
    for (let i = 0; i < n; i++) a.push(f1(4 + rng() * 26), f1(2 + rng() * 9));
    return a.join(' ');
  }

  // ---------------------------------------------------------------------------
  // Scoped styles
  // ---------------------------------------------------------------------------
  const CSS = `
.region-chinese .cb-svg { position:absolute; left:0; top:0; width:660px; height:420px; overflow:visible;
  }
.region-chinese .cb-svg.cb-fade { animation: cb-fade 420ms var(--ease-out); }
@keyframes cb-fade { from { opacity: 0.55; } to { opacity: 1; } }
.region-chinese .cb-day * { pointer-events: none; }
.region-chinese .cb-day .cb-hit { pointer-events: all; fill: transparent; }
.region-chinese .cb-twig { transition: transform 560ms var(--ease-spring); }
.region-chinese .cb-day.is-hover .cb-twig { transform: rotate(var(--bend)); }
.region-chinese .cb-bloom { transition: transform 480ms var(--ease-spring); }
.region-chinese .cb-day.is-hover .cb-bloom { transform: scale(1.06) rotate(6deg); }
.region-chinese .cb-day.is-future .cb-twig, .region-chinese .cb-day.is-future .cb-bloom { transform: none; }
.region-chinese .cb-day.is-done .cb-flutter { animation: cb-flutter var(--fd) var(--ease-breathe) infinite alternate; }
@keyframes cb-flutter { from { transform: rotate(-3deg) scale(0.99); } to { transform: rotate(3deg) scale(1.02); } }

.region-chinese .cb-bud { transition: transform 420ms var(--ease-spring) 200ms, opacity 260ms var(--ease-out) 200ms; }
.region-chinese .cb-day.is-done .cb-bud { opacity: 0; transform: scale(0.4); transition: transform 300ms var(--ease-out) 300ms, opacity 200ms var(--ease-out) 320ms; }
.region-chinese .cb-day.is-blooming .cb-bud { animation: cb-bud-open 560ms var(--ease-out) forwards; }
@keyframes cb-bud-open { 0% { transform: scale(1); opacity: 1; } 55% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1.38); opacity: 0; } }
.region-chinese .cb-bud-l, .region-chinese .cb-bud-r { transform-origin: 0px 4px; }
.region-chinese .cb-day.is-blooming .cb-bud-l { animation: cb-split-l 560ms var(--ease-out) forwards; }
.region-chinese .cb-day.is-blooming .cb-bud-r { animation: cb-split-r 560ms var(--ease-out) forwards; }
@keyframes cb-split-l { 0%, 50% { transform: none; } 100% { transform: rotate(-32deg); } }
@keyframes cb-split-r { 0%, 50% { transform: none; } 100% { transform: rotate(32deg); } }
.region-chinese .cb-day.is-future .cb-bud { transform: scale(0.55); opacity: 0.5; filter: saturate(0.15); }
.region-chinese .cb-day.is-future .cb-spur { opacity: 0.55; }

.region-chinese .cb-sprite { opacity: 0; transform: rotate(-38deg) scale(0.2);
  transition: transform 300ms var(--ease-out), opacity 240ms var(--ease-out); }
.region-chinese .cb-day.is-done .cb-sprite { opacity: 1; transform: none;
  animation: cb-open 760ms var(--ease-spring) 320ms backwards;
  transition: opacity 260ms var(--ease-out) 320ms; }
@keyframes cb-open { 0% { opacity: 0; transform: rotate(-38deg) scale(0.2); } 60% { opacity: 1; transform: rotate(4deg) scale(1.08); } 100% { opacity: 1; transform: none; } }
.region-chinese .cb-petal { opacity: 0; transform: rotate(-46deg) scale(0.12);
  transition: transform 420ms var(--ease-soft) calc((4 - var(--i)) * 30ms), opacity 300ms var(--ease-out) calc(120ms + (4 - var(--i)) * 30ms); }
.region-chinese .cb-day.is-done .cb-petal { opacity: 1; transform: none;
  transition: transform 640ms var(--ease-spring) calc(320ms + var(--i) * 85ms), opacity 260ms var(--ease-out) calc(320ms + var(--i) * 85ms); }
.region-chinese .cb-stamens { opacity: 0; transform: scale(0.1); transition: transform 220ms var(--ease-out), opacity 160ms var(--ease-out); }
.region-chinese .cb-day.is-done .cb-stamens { opacity: 1; transform: none; transition: transform 520ms var(--ease-spring) 760ms, opacity 200ms var(--ease-out) 760ms; }
.region-chinese .cb-nglow { opacity: 0; transition: opacity 800ms var(--ease-out); }
html[data-phase="night"] .region-chinese .cb-day.is-done .cb-nglow { opacity: 0.6; }

.region-chinese .cb-glow { opacity: 0; transition: opacity 600ms var(--ease-out); }
.region-chinese .cb-day.is-today .cb-glow { animation: cb-pulse 3.4s var(--ease-breathe) infinite alternate; }
@keyframes cb-pulse { from { opacity: 0.4; transform: scale(0.88); } to { opacity: 0.85; transform: scale(1.12); } }
.region-chinese .cb-spark { display: none; }
.region-chinese .cb-day.is-today .cb-spark { display: inline; animation: cb-orbit 7s linear infinite; }
.region-chinese .cb-spark-star { animation: cb-twinkle 1.6s var(--ease-breathe) infinite alternate; transform-origin: 0px -21px; }
@keyframes cb-orbit { to { transform: rotate(360deg); } }
@keyframes cb-twinkle { from { opacity: 0.35; transform: scale(0.7); } to { opacity: 1; transform: scale(1.15); } }
.region-chinese .cb-invite { opacity: 0.85; transition: opacity 400ms var(--ease-out); }
.region-chinese .cb-day.is-done .cb-invite, .region-chinese .cb-day.is-future .cb-invite { opacity: 0; }
.region-chinese .cb-ring { opacity: 0; transition: opacity 220ms var(--ease-out); }
.region-chinese .cb-day.is-focus .cb-ring { opacity: 0.95; }

.region-chinese .cb-num { font-family: var(--font-han); font-size: 17px; fill: ${INK}; opacity: 0.88; transition: fill 500ms, opacity 500ms; }
.region-chinese .cb-day.is-done .cb-num { fill: ${DEEP}; opacity: 1; }
.region-chinese .cb-day.is-today .cb-num { fill: ${VERMILION}; opacity: 1; }
.region-chinese .cb-day.is-future .cb-num { opacity: 0.32; }
html[data-phase="night"] .region-chinese .cb-num { fill: ${CREAM}; }
html[data-phase="night"] .region-chinese .cb-day.is-done .cb-num { fill: ${SOFT}; }
html[data-phase="night"] .region-chinese .cb-day.is-today .cb-num { fill: #FFB3A8; }

.region-chinese .cb-hl { opacity: 0; transition: opacity 1.2s var(--ease-out); }
html[data-phase="night"] .region-chinese .cb-hl { opacity: 0.75; }
.region-chinese .cb-mini { opacity: 0; transform: scale(0); transition: transform 300ms var(--ease-out), opacity 300ms var(--ease-out); }
.region-chinese .cb-svg.cb-complete .cb-mini { opacity: 1; transform: none; transition: transform 700ms var(--ease-spring) calc(var(--i) * 70ms), opacity 300ms var(--ease-out) calc(var(--i) * 70ms); }
.region-chinese .cb-haze { opacity: 0; transition: opacity 1.4s var(--ease-out); }
.region-chinese .cb-svg.cb-complete .cb-haze { opacity: 1; }
.region-chinese.cb-instant .cb-sprite { transition: none !important; animation: none !important; }
.region-chinese.cb-instant .cb-petal, .region-chinese.cb-instant .cb-bud, .region-chinese.cb-instant .cb-stamens,
.region-chinese.cb-instant .cb-mini, .region-chinese.cb-instant .cb-haze { transition: none !important; }
`;

  Garden.registerRegion('chinese', function (ctx) {
    const rng = mulberry32(0x6D2E);
    const root = ctx.el;

    if (!document.getElementById('cb-style')) {
      const st = document.createElement('style');
      st.id = 'cb-style'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    root.classList.add('cb-instant');

    const svg = el('svg', { class: 'cb-svg', viewBox: '0 0 660 420', width: 660, height: 420, 'aria-label': 'Plum blossom branch: Chinese practice this week' });
    root.appendChild(svg);
    const defs = el('defs', null, svg);
    const rg = (id, col, a) => {
      const g = el('radialGradient', { id }, defs);
      el('stop', { offset: '0%', 'stop-color': col, 'stop-opacity': a }, g);
      el('stop', { offset: '55%', 'stop-color': col, 'stop-opacity': a * 0.45 }, g);
      el('stop', { offset: '100%', 'stop-color': col, 'stop-opacity': 0 }, g);
    };
    rg('cb-g-glow', PINK, 0.9);
    rg('cb-g-haze', '#F7B9D0', 0.55);
    rg('cb-g-night', '#FFD9E8', 0.9);

    // ---- Week-complete haze (behind everything) ----
    const haze = el('g', { class: 'cb-haze' }, svg);
    [[90, 300, 90, 70], [200, 210, 110, 60], [340, 160, 120, 55], [470, 130, 110, 50], [580, 90, 80, 40]]
      .forEach(h => el('ellipse', { cx: h[0], cy: h[1], rx: h[2], ry: h[3], fill: 'url(#cb-g-haze)' }, haze));

    // ---- The ink branch ----
    const sway = el('g', { class: 'cb-sway' }, svg);
    const branch = el('g', { class: 'cb-branch' }, sway);
    const strokes = [MAIN].concat(TWIGS).map(p => resample(p, 5));
    const ink = el('g', { fill: INK }, branch);
    const brush = el('g', { fill: 'none', 'stroke-linecap': 'round' }, branch);
    strokes.forEach((s, si) => {
      el('path', { d: inkPath(s, rng, si === 0 ? 1 : 0.7) }, ink);
      // ragged edge hairs on both sides
      [0.56, -0.56].forEach(f => {
        el('path', { d: polyOffset(s, f, 0, s.length - 2), stroke: INK, 'stroke-width': 0.8, 'stroke-dasharray': dashes(rng, 14), opacity: 0.85 }, brush);
      });
    });
    // Dry-brush "flying white" streaks inside the thick strokes.
    const main = strokes[0];
    for (let k = 0; k < 7; k++) {
      const f = -0.34 + (k / 6) * 0.68 + (rng() - 0.5) * 0.06;
      const from = Math.floor(rng() * 6), to = Math.floor(main.length * (0.45 + rng() * 0.35));
      el('path', { d: polyOffset(main, f, from, to), stroke: '#F6EEE2', 'stroke-width': f1(0.5 + rng() * 0.7), 'stroke-dasharray': dashes(rng, 18), opacity: f1(0.12 + rng() * 0.16) }, brush);
    }
    [1, 2, 3].forEach(ti => {
      const s = strokes[ti];
      el('path', { d: polyOffset(s, 0.12, 0, Math.floor(s.length * 0.6)), stroke: '#F6EEE2', 'stroke-width': 0.6, 'stroke-dasharray': dashes(rng, 8), opacity: 0.16 }, brush);
    });
    // Knots: little ink swellings with a pale ring.
    [[64, 352, 6], [62, 292, 5.5], [168, 216, 4.4], [306, 164, 3.6]].forEach(k => {
      el('ellipse', { cx: k[0], cy: k[1], rx: k[2] * 1.5, ry: k[2], fill: INK, transform: `rotate(${f1(rng() * 60 - 30)} ${k[0]} ${k[1]})` }, branch);
      el('path', { d: `M${f1(k[0] - k[2])},${f1(k[1] + 1)} q${f1(k[2] * 0.6)},${f1(-k[2] * 0.5)} ${f1(k[2] * 1.3)},${f1(-k[2] * 0.2)}`, fill: 'none', stroke: '#F6EEE2', 'stroke-width': 0.5, opacity: 0.22 }, branch);
    });
    // Fine twiglets with tiny ink tips.
    const twiglets = el('g', { stroke: INK, 'stroke-linecap': 'round', fill: 'none' }, branch);
    const tipDots = el('g', { fill: INK }, branch);
    strokes.slice(0, 4).forEach((s, si) => {
      const n = si === 0 ? 9 : 3;
      for (let k = 0; k < n; k++) {
        const p = s[Math.floor(s.length * (0.25 + rng() * 0.7))];
        if (DAYS.some(d => Math.hypot(d.b[0] - p.x, d.b[1] - p.y) < 34)) continue;
        const side = rng() < 0.6 ? -1 : 1; // mostly upward
        const len = 10 + rng() * 18;
        const a = Math.atan2(p.ty, p.tx) + side * (0.5 + rng() * 0.6);
        const ex = p.x + Math.cos(a) * len, ey = p.y + Math.sin(a) * len - 3;
        el('path', { d: `M${f1(p.x)},${f1(p.y)}Q${f1((p.x + ex) / 2 + side * 2)},${f1((p.y + ey) / 2 - 2)} ${f1(ex)},${f1(ey)}`, 'stroke-width': 1 }, twiglets);
        el('circle', { cx: f1(ex), cy: f1(ey), r: 1.1 }, tipDots);
      }
    });
    // Moss dots (苔点) along the branch.
    const moss = el('g', { fill: INK }, branch);
    for (let k = 0; k < 9; k++) {
      const p = main[Math.floor(main.length * (0.05 + rng() * 0.7))];
      const side = rng() < 0.7 ? 1 : -1;
      const sgn = (p.ny * side) < 0 ? side : -side; // upper side
      for (let d = 0; d < 3 + Math.floor(rng() * 3); d++) {
        const off = p.w / 2 + 1.5 + rng() * 4;
        const along = (rng() - 0.5) * 12;
        el('ellipse', { cx: f1(p.x + p.nx * off * sgn + p.tx * along), cy: f1(p.y + p.ny * off * sgn + p.ty * along), rx: f1(0.8 + rng() * 1.2), ry: f1(0.6 + rng() * 0.8) }, moss);
      }
    }
    // Night hairline highlight along the upper edge.
    const hl = el('g', { class: 'cb-hl', fill: 'none', stroke: CREAM, 'stroke-linecap': 'round' }, branch);
    strokes.slice(0, 4).forEach((s, si) => {
      const pts = [];
      for (let i = 0; i < s.length - 2; i++) {
        const p = s[i];
        const sg = (p.nx * 0.3 + p.ny) < 0 ? 1 : -1;
        const off = Math.max(0.3, p.w / 2 - 0.9) * sg;
        pts.push(f1(p.x + p.nx * off) + ',' + f1(p.y + p.ny * off));
      }
      el('path', { d: 'M' + pts.join('L'), 'stroke-width': si === 0 ? 0.9 : 0.6, 'stroke-dasharray': dashes(rng, 20) }, hl);
    });

    // ---- Seal stamp near the base ----
    const seal = el('g', { transform: 'translate(96 372) rotate(-3)', 'aria-hidden': 'true' }, svg);
    el('path', { d: 'M-11,-10.5 L10.6,-11 L11,10.4 L-10.6,11 Z', fill: VERMILION }, seal);
    const ch = el('text', { x: 0, y: 6, 'text-anchor': 'middle', fill: CREAM, style: 'font-family: var(--font-han); font-size: 16px;' }, seal);
    ch.textContent = '习';
    el('rect', { x: -8.6, y: -8.6, width: 17.2, height: 17.2, fill: 'none', stroke: CREAM, 'stroke-width': 0.7, opacity: 0.55 }, seal);
    for (let k = 0; k < 9; k++) el('circle', { cx: f1(-10 + rng() * 20), cy: f1(-10 + rng() * 20), r: f1(0.3 + rng() * 0.5), fill: VERMILION, opacity: 0.9 }, seal);
    for (let k = 0; k < 7; k++) el('circle', { cx: f1(-10 + rng() * 20), cy: f1(-10 + rng() * 20), r: f1(0.25 + rng() * 0.35), fill: CREAM, opacity: 0.5 }, seal);

    // ---- Week-complete mini blossom clusters ----
    // Blossom sprite setup — must exist before the week-complete clusters below use sprite().
    const SPR = ['assets/sprites/blossom-a.png', 'assets/sprites/blossom-b.png'];
    const SPR_H = [176 / 180, 141 / 180];
    SPR.forEach(u => { const im = new Image(); im.src = u; });
    const srng = mulberry32(0x51A7);
    const minis = el('g', null, sway);
    const avoid = DAYS.map(d => d.b);
    let mi = 0;
    for (let k = 0; k < 40 && mi < 14; k++) {
      const s = k % 3 === 0 ? strokes[1 + (k % 3)] : main;
      const p = s[Math.floor(s.length * (0.08 + rng() * 0.88))];
      const sg = rng() < 0.65 ? ((p.ny < 0) ? 1 : -1) : ((p.ny < 0) ? -1 : 1);
      const off = p.w / 2 + 4 + rng() * 3;
      const x = p.x + p.nx * off * sg, y = p.y + p.ny * off * sg;
      if (avoid.some(b => Math.hypot(b[0] - x, b[1] - y) < 30)) continue;
      avoid.push([x, y]);
      const sc = 1;
      const wrap = el('g', { transform: `translate(${f1(x)} ${f1(y)}) scale(${sc})` }, minis);
      const g = el('g', { class: 'cb-mini', style: `--i:${mi}` }, wrap);
      sprite(g, mi, 14 + rng() * 8, rng() * 360);
      // a companion tiny bud
      if (rng() < 0.5) el('ellipse', { cx: 8, cy: -6, rx: 2, ry: 2.6, fill: DEEP, transform: 'rotate(35 8 -6)' }, g);
      mi++;
    }

    // ---- Days ----
    const dayRefs = [];
    let weekPrepared = false;
    ctx.onWeekChange(() => { root.classList.add('cb-instant'); weekPrepared = true; });

    function sprite(parent, idx, w, rot) {
      const k = idx % 2, h = w * SPR_H[k], fl = srng() < 0.4 ? -1 : 1;
      const o = el('g', { transform: `rotate(${f1(rot)}) scale(${fl} 1)` }, parent);
      el('image', { href: SPR[k], x: f1(-w / 2), y: f1(-h / 2), width: f1(w), height: f1(h) }, o);
    }

    function buildPetal(parent, k, rot) {
      const outer = el('g', { transform: `rotate(${f1(rot + k * 72)})` }, parent);
      const p = el('g', { class: 'cb-petal', style: `--i:${k}` }, outer);
      const PD = 'M0,-1.5 C-6.2,-3 -9.4,-10.5 -5.6,-15 C-3.6,-17.6 -1.4,-16.6 0,-15.4 C1.4,-16.6 3.6,-17.6 5.6,-15 C9.4,-10.5 6.2,-3 0,-1.5Z';
      el('path', { d: PD, fill: CREAM, stroke: CREAM, 'stroke-width': 2.6, 'stroke-linejoin': 'round', opacity: 0.9 }, p);
      el('path', { d: PD, fill: PINK, stroke: '#B4487A', 'stroke-width': 0.8, 'stroke-opacity': 0.85 }, p);
      el('path', { d: 'M0,-4 C-3.6,-5.2 -5.4,-10 -3.4,-12.6 C-1.8,-14 0,-13 0,-12 C0,-13 1.8,-14 3.4,-12.6 C5.4,-10 3.6,-5.2 0,-4Z', fill: SOFT, opacity: 0.85 }, p);
      // stippled rim and veins of dots
      const dots = el('g', { fill: RIM }, p);
      for (let q = 0; q < 12; q++) {
        const t = q / 11;
        const a = Math.PI * (0.15 + 0.7 * t);
        const rx = 7.2, ry = 6.6;
        el('circle', { cx: f1(-Math.cos(a) * rx * 0.98), cy: f1(-8.8 - Math.sin(a) * ry), r: f1(0.4 + rng() * 0.3) }, dots);
      }
      for (let q = 0; q < 4; q++) el('circle', { cx: f1((rng() - 0.5) * 7), cy: f1(-5 - rng() * 8), r: 0.45, fill: '#FFF4F8', opacity: 0.9 }, p);
    }

    function buildDay(i) {
      const d = DAYS[i];
      const dx = d.b[0] - d.s[0], dy = d.b[1] - d.s[1];
      const ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      const g = el('g', { class: 'cb-day', transform: `translate(${d.s[0]} ${d.s[1]})`, style: `--bend:${d.bend}deg` }, sway);

      // numeral (static)
      const nx = dx + d.n[0], ny = dy + d.n[1] + 6;
      const num = el('text', { class: 'cb-num', x: f1(nx), y: f1(ny), 'text-anchor': 'middle', 'aria-hidden': 'true' }, g);
      num.textContent = NUMERALS[i];

      const twig = el('g', { class: 'cb-twig' }, g);
      // spur: a short tapered ink twig, with a tiny side-hair
      const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, px = -uy, py = ux;
      const bow = d.bend > 0 ? 3 : -3;
      const mx = dx * 0.5 + px * bow, my = dy * 0.5 + py * bow;
      const ex = dx - ux * 6, ey = dy - uy * 6;
      el('path', {
        class: 'cb-spur', fill: INK,
        d: `M${f1(px * 2.4)},${f1(py * 2.4)} Q${f1(mx + px * 1.4)},${f1(my + py * 1.4)} ${f1(ex + px * 0.7)},${f1(ey + py * 0.7)} L${f1(ex - px * 0.7)},${f1(ey - py * 0.7)} Q${f1(mx - px * 1.4)},${f1(my - py * 1.4)} ${f1(-px * 2.4)},${f1(-py * 2.4)}Z`,
      }, twig);

      const at = el('g', { transform: `translate(${dx} ${dy})` }, twig);
      el('circle', { class: 'cb-glow', r: 26, fill: 'url(#cb-g-glow)' }, at);
      el('circle', { class: 'cb-nglow', r: 24, fill: 'url(#cb-g-night)' }, at);
      el('circle', { class: 'cb-ring', r: 22, fill: 'none', stroke: PINK, 'stroke-width': 2.4 }, at);
      el('circle', { class: 'cb-ring', r: 25, fill: 'none', stroke: SOFT, 'stroke-width': 1, opacity: 0.8 }, at);

      const bloom = el('g', { class: 'cb-bloom' }, at);
      const flutter = el('g', { class: 'cb-flutter', style: `--fd:${f1(3.6 + rng() * 2.6)}s` }, bloom);
      const orient = el('g', { transform: `rotate(${f1(ang)}) scale(1.08)` }, flutter);

      // closed bud (two halves so it can split)
      el('circle', { class: 'cb-invite', r: 15.5, fill: 'none', stroke: SOFT, 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-dasharray': '0.1 3.6' }, at);
      const bud = el('g', { class: 'cb-bud' }, el('g', { transform: 'scale(1.46)' }, orient));
      el('path', { class: 'cb-bud-l', d: 'M0,4.5 C-6.4,3.5 -7,-5 0,-12.5 L0,4.5Z', fill: '#7A2448' }, bud);
      el('path', { class: 'cb-bud-r', d: 'M0,4.5 C6.4,3.5 7,-5 0,-12.5 L0,4.5Z', fill: DEEP }, bud);
      el('path', { d: 'M-2.6,-6 C-2.8,-8 -1.6,-9.6 -0.6,-10.4', fill: 'none', stroke: '#C76A92', 'stroke-width': 0.8, 'stroke-linecap': 'round', opacity: 0.8 }, bud);
      for (let q = 0; q < 6; q++) el('circle', { cx: f1((rng() - 0.5) * 7), cy: f1(-8 + rng() * 10), r: 0.45, fill: '#C76A92', opacity: 0.8 }, bud);
      el('path', { d: 'M0,5 C-4.5,5.5 -6.5,2.5 -6,0.5 C-4,2.4 -2,3.2 0,3.2 C2,3.2 4,2.4 6,0.5 C6.5,2.5 4.5,5.5 0,5Z', fill: '#4E8F55' }, bud);
      el('path', { d: 'M0,5.5 L0,7.8', stroke: '#2F6B3A', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, bud);

      // painted blossom sprite (done state)
      const spr = el('g', { class: 'cb-sprite' }, flutter);
      sprite(spr, i, 40 + rng() * 6, rng() * 70 - 35);

      // today's drifting petal-light
      const spark = el('g', { class: 'cb-spark' }, at);
      const star = el('g', { class: 'cb-spark-star' }, spark);
      el('circle', { cx: 0, cy: -21, r: 3.2, fill: '#FFE9F1', opacity: 0.45 }, star);
      el('path', { d: 'M0,-24 Q0,-21 2.4,-21 Q0,-21 0,-18 Q0,-21 -2.4,-21 Q0,-21 0,-24Z', fill: '#FFF8E6' }, star);

      el('circle', { class: 'cb-hit', cx: dx, cy: dy, r: 22 }, g);

      const center = () => ctx.stage(d.b[0], d.b[1]);
      const ref = { g, i };
      ctx.bindDay(g, i, {
        anchor: { x: d.b[0], y: d.b[1] - 24 },
        soundDelay: 0.12,
        onHover: on => { if (on && !ctx.isFuture(i) && ctx.sound) ctx.sound.ui('hover'); },
        onToggle: value => {
          clearTimeout(ref.t1); clearTimeout(ref.t2);
          const c = center();
          if (value) {
            g.classList.add('is-blooming');
            ref.t1 = setTimeout(() => g.classList.remove('is-blooming'), 1100);
            ref.t2 = setTimeout(() => {
              ctx.fx.burst(c.x, c.y, { kind: 'petal', colors: [PINK, SOFT, '#F4B3CC', CREAM], count: 9, speed: 0.7, size: 5 });
              ctx.fx.stipple(c.x, c.y, { colors: [PINK, SOFT, BUTTER], count: 18, speed: 0.6 });
            }, 780);
          } else {
            g.classList.remove('is-blooming');
            ref.t2 = setTimeout(() => ctx.fx.burst(c.x, c.y, { kind: 'petal', colors: [PINK, SOFT], count: 2, up: false, speed: 0.35, gravity: 40, size: 5 }), 160);
          }
        },
      });
      dayRefs.push(ref);
    }
    for (let i = 0; i < 7; i++) buildDay(i);

    // ---- Label ----
    ctx.placeLabel(126, 404, { align: 'left' });

    // ---- State sync: perches + week-complete ----
    function sync() {
      const days = ctx.days();
      days.forEach((done, i) => {
        const id = 'chinese-' + i;
        if (done) { const c = ctx.stage(DAYS[i].b[0], DAYS[i].b[1]); Garden.addPerch(id, c.x, c.y, 'flower'); }
        else Garden.removePerch(id);
      });
      svg.classList.toggle('cb-complete', days.every(Boolean));
    }
    sync();
    ctx.onChange(sync);
    ctx.onWeekChange(() => {
      sync();
      if (weekPrepared) {
        svg.classList.remove('cb-fade'); void svg.getBoundingClientRect(); svg.classList.add('cb-fade');
        requestAnimationFrame(() => requestAnimationFrame(() => { root.classList.remove('cb-instant'); weekPrepared = false; }));
      }
    });
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('cb-instant')));

    // ---- Idle: an occasional petal lets go ----
    if (!ctx.reducedMotion) {
      const drift = () => {
        setTimeout(() => {
          const open = ctx.days().map((v, i) => v ? i : -1).filter(i => i >= 0);
          if (open.length && !document.hidden) {
            const i = open[Math.floor(Math.random() * open.length)];
            const c = ctx.stage(DAYS[i].b[0], DAYS[i].b[1]);
            ctx.fx.burst(c.x + 4, c.y + 4, { kind: 'petal', colors: [PINK, SOFT, '#F4B3CC'], count: 1, up: false, speed: 0.22, gravity: 22, size: 4.5, life: 4.2, wind: 14 });
          }
          drift();
        }, 8000 + Math.random() * 7000);
      };
      drift();
    }

    // ---- Wind ----
    if (!ctx.reducedMotion && Garden.wind) {
      const spring = Garden.wind.spring({ k: 8, c: 3 });
      const mid = ctx.stage(330, 200);
      Garden.wind.onTick((t, dt) => {
        const a = spring.step(0.6 * Garden.wind.at(mid.x, mid.y, t), dt);
        sway.setAttribute('transform', `rotate(${a.toFixed(3)} 20 420)`);
      });
      Garden.on('gust', () => {
        ctx.days().forEach((done, i) => {
          if (!done || Math.random() > 0.25) return;
          const c = ctx.stage(DAYS[i].b[0], DAYS[i].b[1]);
          Garden.fx.burst(c.x, c.y, { kind: 'petal', colors: ['#EE8FB4', '#F9D3E2'], count: 1, up: false });
        });
      });
    }

    return {};
  });
})();
