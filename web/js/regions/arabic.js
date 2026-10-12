/* Garden of Days — Reading Arabic: the moon's week.
   Seven embroidered moons sweep across the upper-right sky, waxing from a thin
   hilal (Mon) to a full moon (Sun). Done days fill with stippled butter-gold light. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const NUMERALS = ['١', '٢', '٣', '٤', '٥', '٦', '٧'];
  const PHASE = [0.1, 0.24, 0.38, 0.52, 0.67, 0.83, 1.0];
  const RADII = [31, 32, 33, 33.5, 34, 35, 42];
  const MOON_SRC = 'assets/sprites/moon.png';
  try { new Image().src = MOON_SRC; } catch (e) { /* preload only */ }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function star4(cx, cy, s) {
    const k = s * 0.18;
    return `M${cx},${cy - s} Q${cx + k},${cy - k} ${cx + s},${cy} Q${cx + k},${cy + k} ${cx},${cy + s} Q${cx - k},${cy + k} ${cx - s},${cy} Q${cx - k},${cy - k} ${cx},${cy - s}Z`;
  }

  // Lit part of a waxing moon (light on the right), centred at 0,0.
  function phasePath(r, f) {
    if (f >= 0.999) return `M0,${-r} A${r},${r} 0 1 1 0,${r} A${r},${r} 0 1 1 0,${-r}Z`;
    const rx = Math.max(0.01, r * Math.abs(1 - 2 * f));
    return `M0,${-r} A${r},${r} 0 0 1 0,${r} A${rx.toFixed(2)},${r} 0 0 ${f < 0.5 ? 0 : 1} 0,${-r}Z`;
  }

  const CSS = `
.region-arabic svg.ar-root { position:absolute; left:0; top:0; overflow:visible; }
.region-arabic .ar-moon { cursor:pointer; }
.region-arabic .ar-moon.is-future { cursor:default; }
.region-arabic .ar-lift { transition: transform 280ms var(--ease-spring); }
.region-arabic .ar-moon.is-hover:not(.is-future) .ar-lift,
.region-arabic .ar-moon.is-focus:not(.is-future) .ar-lift { transform: translateY(-3px); }

.region-arabic .ar-halo { opacity:0; transform-box: fill-box; transform-origin: center;
  transition: opacity 500ms var(--ease-out); }
.region-arabic .ar-moon.is-hover:not(.is-future) .ar-halo { opacity:.32; }
.region-arabic .ar-moon.is-done .ar-halo { opacity:.62; transition: opacity 900ms var(--ease-out); }
.region-arabic .ar-moon.is-done.is-hover .ar-halo { opacity:.8; }
.region-arabic .ar-moon.ar-bloom .ar-halo { animation: ar-bloom 1100ms var(--ease-out); }
@keyframes ar-bloom { 0% { transform: scale(.35); opacity:0; } 45% { transform: scale(1.18); opacity:.95; } 100% { transform: scale(1); opacity:.62; } }
.region-arabic.ar-complete .ar-moon.is-done .ar-halo { opacity:.85; }

.region-arabic image { image-rendering:auto; }
.region-arabic .ar-earth { opacity:.13; filter: grayscale(.85) brightness(1.25) hue-rotate(-12deg); transition: opacity 500ms var(--ease-out); }
.region-arabic .ar-ghost-img { opacity:.42; filter: grayscale(.75) brightness(1.18) hue-rotate(-10deg); }
.region-arabic .ar-moon.is-hover .ar-ghost-img { opacity:.6; }
.region-arabic .ar-moon.is-done .ar-earth { opacity:.2; }
.region-arabic .ar-moon.is-future .ar-earth { opacity:.06; }
.region-arabic .ar-lit-img { filter: saturate(1.05) hue-rotate(6deg) brightness(1.05); }
.region-arabic .ar-disc { opacity:.72; transition: opacity 400ms var(--ease-out); }
.region-arabic .ar-ghost { opacity:.85; transition: opacity 400ms var(--ease-out); }
.region-arabic .ar-moon.is-hover .ar-ghost { opacity:1; }
.region-arabic .ar-moon.is-hover .ar-disc { opacity:.85; }
.region-arabic .ar-moon.is-done .ar-ghost { opacity:0; }
.region-arabic .ar-moon.is-done .ar-disc { opacity:.42; }
.region-arabic .ar-moon.is-future .ar-ghost { opacity:0; }
.region-arabic .ar-moon.is-future .ar-disc { opacity:.22; }

.region-arabic .ar-lit { opacity:0; transition: opacity 420ms var(--ease-soft); }
.region-arabic .ar-moon.is-done .ar-lit { opacity:1; transition: opacity 650ms var(--ease-out); }
.region-arabic .ar-near { opacity:0; transition: opacity 600ms var(--ease-out); }
.region-arabic .ar-moon.is-done .ar-near { opacity:1; }
.region-arabic .ar-near path { transform-box: fill-box; transform-origin:center; animation: ar-twinkle 5.5s var(--ease-breathe) infinite alternate; }

.region-arabic .ar-focus { opacity:0; transition: opacity 200ms var(--ease-out); }
.region-arabic .ar-moon.is-focus .ar-focus { opacity:1; }

.region-arabic .ar-today { display:none; }
.region-arabic .ar-moon.is-today .ar-today { display:inline; }
.region-arabic .ar-today-ring { transform-box: fill-box; transform-origin:center; animation: ar-breathe 4.6s var(--ease-breathe) infinite alternate; }
@keyframes ar-breathe { from { opacity:.35; transform: scale(.97); } to { opacity:.95; transform: scale(1.05); } }
.region-arabic .ar-today-star { transform-box: fill-box; transform-origin:center; animation: ar-twinkle 2.8s var(--ease-breathe) infinite alternate; }

.region-arabic .ar-num { font-family: var(--font-arabic); font-size:15px; fill:#2A2F66; opacity:.78;
  transition: fill 400ms, opacity 400ms; }
.region-arabic .ar-moon.is-done .ar-num { fill:#7A5C0E; opacity:.95; }
.region-arabic .ar-moon.is-today .ar-num { opacity:1; font-weight:700; }
.region-arabic .ar-moon.is-future .ar-num { opacity:.35; }

.region-arabic .ar-seg-gold { opacity:0; transition: opacity 700ms var(--ease-out); }
.region-arabic .ar-seg-gold.on { opacity:1; }
.region-arabic .ar-thread-base { opacity:.6; }

.region-arabic .ar-stars path { transform-box: fill-box; transform-origin:center; }
.region-arabic .ar-stars .tw { animation: ar-twinkle var(--d, 5s) var(--ease-breathe) infinite alternate; animation-delay: var(--dl, 0s); }
@keyframes ar-twinkle { from { opacity:.25; transform: scale(.7); } to { opacity:1; transform: scale(1.08); } }
.region-arabic .ar-night-stars { opacity:0; transition: opacity 1200ms; }

.region-arabic .ar-khatam { opacity:0; transform: scale(.6); transform-box: fill-box; transform-origin:center;
  transition: opacity 1200ms var(--ease-out), transform 1400ms var(--ease-spring); }
.region-arabic.ar-complete .ar-khatam { opacity:1; transform: scale(1); }
.region-arabic .ar-khatam-spin { transform-box: fill-box; transform-origin:center; animation: ar-spin 60s linear infinite; }
@keyframes ar-spin { to { transform: rotate(360deg); } }
.region-arabic .ar-flourish { opacity:.5; transition: opacity 900ms; }
.region-arabic.ar-complete .ar-flourish { opacity:.9; }

.region-arabic.ar-rm .ar-x, .region-arabic.ar-rm .ar-stars .tw, .region-arabic.ar-rm .ar-today-ring,
.region-arabic.ar-rm .ar-today-star, .region-arabic.ar-rm .ar-khatam-spin, .region-arabic.ar-rm .ar-near path { animation:none; }

html[data-phase="night"] .region-arabic .ar-num { fill:#FBF5EC; }
html[data-phase="night"] .region-arabic .ar-moon.is-done .ar-num { fill:#FBF0B8; }
html[data-phase="night"] .region-arabic .ar-moon.is-done .ar-halo { opacity:.85; }
html[data-phase="night"] .region-arabic.ar-complete .ar-moon.is-done .ar-halo { opacity:1; }
html[data-phase="night"] .region-arabic .ar-night-stars { opacity:1; }
html[data-phase="night"] .region-arabic .ar-stars { filter: brightness(1.15); }
html[data-phase="night"] .region-arabic .ar-thread-base { opacity:.8; }
`;

  Garden.registerRegion('arabic', function (ctx) {
    const H = ctx.habit;
    const GOLD = H.color, SOFT = H.soft, DEEP = H.deep, CREAM = '#FBF5EC';
    const W = ctx.bounds.w, HH = ctx.bounds.h;
    const rand = mulberry32(0xA7AB1C);

    if (!document.getElementById('ar-style')) {
      const st = document.createElement('style');
      st.id = 'ar-style'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    if (ctx.reducedMotion) ctx.el.classList.add('ar-rm');

    const svg = el('svg', { class: 'ar-root', width: W, height: HH, viewBox: `0 0 ${W} ${HH}`, 'aria-label': 'Reading Arabic: seven moons of the week' });
    ctx.el.appendChild(svg);
    const defs = el('defs', null, svg);

    const halo = el('radialGradient', { id: 'ar-halo-g' }, defs);
    el('stop', { offset: '0%', 'stop-color': SOFT, 'stop-opacity': '0' }, halo);
    el('stop', { offset: '36%', 'stop-color': SOFT, 'stop-opacity': '0.05' }, halo);
    el('stop', { offset: '43%', 'stop-color': SOFT, 'stop-opacity': '0.7' }, halo);
    el('stop', { offset: '62%', 'stop-color': GOLD, 'stop-opacity': '0.24' }, halo);
    el('stop', { offset: '100%', 'stop-color': SOFT, 'stop-opacity': '0' }, halo);

    const fe = el('filter', { id: 'ar-feather', x: '-10%', y: '-10%', width: '120%', height: '120%' }, defs);
    el('feGaussianBlur', { stdDeviation: 0.9 }, fe);

    // ---- Arc geometry --------------------------------------------------------
    // Centres spaced so the gaps between moon edges are equal across 640px.
    const GAP = (624 - 2 * RADII.reduce((a, b) => a + b, 0)) / 6;
    const xs = [8 + RADII[0]];
    for (let i = 1; i < 7; i++) xs.push(xs[i - 1] + RADII[i - 1] + GAP + RADII[i]);
    const X0 = xs[0], X1 = xs[6], YB = 176, RISE = 76;
    const arcAt = t => ({ x: X0 + (X1 - X0) * t, y: YB - RISE * Math.sin(Math.PI * t) });
    const tOf = i => (xs[i] - X0) / (X1 - X0);
    const moons = PHASE.map((f, i) => Object.assign(arcAt(tOf(i)), { r: RADII[i], f, i }));
    const KH = { x: moons[3].x, y: 30 };

    // ---- Sky stars (back) ----------------------------------------------------
    const starsG = el('g', { class: 'ar-stars' }, svg);
    const nightG = el('g', { class: 'ar-stars ar-night-stars' }, svg);
    const clearOf = (x, y) => moons.every(m => Math.hypot(m.x - x, m.y - y) > m.r + 18 && Math.hypot(m.x - x, m.y + m.r + 14 - y) > 16) &&
      !(y > 196 && x > 150 && x < 490) && !(Math.hypot(x - KH.x, y - KH.y) < 30);
    function scatter(group, n, sizeMin, sizeMax, twinkleEvery) {
      let made = 0, guard = 0;
      while (made < n && guard++ < 600) {
        const x = 8 + rand() * (W - 16), y = 10 + rand() * (HH - 30);
        if (!clearOf(x, y)) continue;
        const s = sizeMin + rand() * (sizeMax - sizeMin);
        const p = el('path', { d: star4(+x.toFixed(1), +y.toFixed(1), +s.toFixed(2)), fill: rand() < 0.6 ? CREAM : SOFT, opacity: (0.55 + rand() * 0.4).toFixed(2) }, group);
        if (made % twinkleEvery === 0) {
          p.classList.add('tw');
          p.style.setProperty('--d', (3.5 + rand() * 5).toFixed(2) + 's');
          p.style.setProperty('--dl', (-rand() * 8).toFixed(2) + 's');
        }
        made++;
      }
    }
    scatter(starsG, 12, 1.6, 3.6, 2);
    scatter(nightG, 14, 1.2, 2.8, 3);
    // a few tiny dots of stardust
    for (let k = 0; k < 26; k++) {
      const x = rand() * W, y = rand() * (HH - 20);
      if (!clearOf(x, y)) continue;
      el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (0.5 + rand() * 0.7).toFixed(2), fill: CREAM, opacity: (0.3 + rand() * 0.4).toFixed(2) }, k % 2 ? starsG : nightG);
    }

    // ---- Stitched thread between moons --------------------------------------
    const threadG = el('g', { class: 'ar-thread', fill: 'none', 'stroke-linecap': 'round' }, svg);
    const segGold = [];
    function segPath(i) {
      const a = moons[i], b = moons[i + 1];
      const pts = [];
      for (let s = 0; s <= 24; s++) {
        const t = tOf(i) + (tOf(i + 1) - tOf(i)) * s / 24, p = arcAt(t);
        if (Math.hypot(p.x - a.x, p.y - a.y) < a.r + 8 || Math.hypot(p.x - b.x, p.y - b.y) < b.r + 8) continue;
        pts.push(p);
      }
      return pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    }
    for (let i = 0; i < 6; i++) {
      const d = segPath(i);
      el('path', { d, class: 'ar-thread-base', stroke: CREAM, 'stroke-width': 1.5, 'stroke-dasharray': '0.1 5' }, threadG);
      el('path', { d, class: 'ar-seg-gold', stroke: SOFT, 'stroke-width': 3.4, 'stroke-opacity': 0.22 }, threadG);
      segGold.push([threadG.lastChild, el('path', { d, class: 'ar-seg-gold', stroke: GOLD, 'stroke-width': 1.3, 'stroke-dasharray': '3.6 2.6' }, threadG)]);
    }

    // ---- Calligraphic flourish under the arc ---------------------------------
    const flo = el('g', { class: 'ar-flourish', fill: 'none', stroke: CREAM, 'stroke-linecap': 'round' }, svg);
    {
      const pts = [];
      for (let s = 0; s <= 40; s++) {
        const t = 0.33 + 0.34 * s / 40, p = arcAt(t);
        const w = Math.sin(Math.PI * s / 40);
        pts.push({ x: p.x, y: p.y + 70 + 3 * Math.sin(s / 40 * Math.PI * 3) * w });
      }
      const fd = pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const blur = el('filter', { id: 'ar-soft', x: '-20%', y: '-200%', width: '140%', height: '500%' }, defs);
      el('feGaussianBlur', { stdDeviation: 3.2 }, blur);
      el('path', { d: fd, class: 'ar-flo-glow', stroke: CREAM, 'stroke-width': 10, 'stroke-opacity': 0.42, filter: 'url(#ar-soft)' }, flo);
      el('circle', { cx: pts[20].x, cy: pts[20].y + 9, r: 8, fill: CREAM, 'fill-opacity': 0.3, stroke: 'none', filter: 'url(#ar-soft)' }, flo);
      el('path', { d: pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '), 'stroke-width': 1.3, 'stroke-dasharray': '6 2.5 0.1 2.5' }, flo);
      const mid = pts[20];
      [[0, 7], [-4.5, 11.5], [4.5, 11.5]].forEach(([dx, dy]) => el('circle', { cx: mid.x + dx, cy: mid.y + dy, r: 1.3, fill: CREAM, stroke: 'none' }, flo));
      [pts[0], pts[40]].forEach(p => el('circle', { cx: p.x, cy: p.y, r: 1.6, fill: CREAM, stroke: 'none' }, flo));
    }

    // ---- Khatam (eight-pointed star) above the arc ---------------------------
    const khPos = el('g', { transform: `translate(${KH.x.toFixed(1)} ${KH.y})` }, svg);
    const kh = el('g', { class: 'ar-khatam' }, khPos);
    const khWrap = el('g', null, kh);
    el('circle', { cx: 0, cy: 0, r: 40, fill: 'url(#ar-halo-g)', opacity: 0.5 }, khWrap);
    const spin = el('g', { class: 'ar-khatam-spin', fill: 'none', stroke: GOLD, 'stroke-width': 1.1, 'stroke-linejoin': 'round' }, khWrap);
    el('rect', { x: -12, y: -12, width: 24, height: 24 }, spin);
    el('rect', { x: -12, y: -12, width: 24, height: 24, transform: 'rotate(45)' }, spin);
    el('rect', { x: -8.2, y: -8.2, width: 16.4, height: 16.4, stroke: SOFT, 'stroke-width': 0.7 }, spin);
    el('rect', { x: -8.2, y: -8.2, width: 16.4, height: 16.4, stroke: SOFT, 'stroke-width': 0.7, transform: 'rotate(45)' }, spin);
    el('circle', { cx: 0, cy: 0, r: 3.2, stroke: CREAM, 'stroke-width': 0.8 }, spin);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + Math.PI / 8;
      el('circle', { cx: (Math.cos(a) * 22).toFixed(2), cy: (Math.sin(a) * 22).toFixed(2), r: 0.9, fill: SOFT, stroke: 'none' }, spin);
    }

    // ---- Moons ---------------------------------------------------------------
    const moonsG = el('g', { class: 'ar-moons' }, svg);
    const views = moons.map(m => buildMoon(m));

    function buildMoon(m) {
      const { r, f, i } = m;
      const g = el('g', { class: 'ar-moon', transform: `translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})` }, moonsG);
      const lift = el('g', { class: 'ar-lift' }, g);
      const bob = el('g', { class: 'ar-bob' }, lift);

      el('circle', { class: 'ar-halo', cx: 0, cy: 0, r: (r * 2.4).toFixed(1), fill: 'url(#ar-halo-g)' }, bob);

      const pd = phasePath(r, f);
      const img = (attrs, parent) => {
        const n = el('image', Object.assign({ x: -r, y: -r, width: 2 * r, height: 2 * r, preserveAspectRatio: 'xMidYMid meet' }, attrs), parent);
        n.setAttribute('href', MOON_SRC);
        return n;
      };

      // soft-edged phase mask (terminator ellipse, slightly feathered like a real limb)
      const mk = el('mask', { id: `ar-phase-${i}`, maskContentUnits: 'userSpaceOnUse', x: -r - 4, y: -r - 4, width: 2 * r + 8, height: 2 * r + 8, maskUnits: 'userSpaceOnUse' }, defs);
      el('path', { d: pd, fill: '#fff', filter: 'url(#ar-feather)' }, mk);
      const cpSweep = el('clipPath', { id: `ar-sweep-${i}` }, defs);
      const sweepRect = el('rect', { x: -r - 3, y: -r - 3, width: 2 * r + 6, height: 2 * r + 6 }, cpSweep);

      // earthshine: the whole painted moon, cooled and faint
      img({ class: 'ar-earth' }, bob);
      // ghost (not done): cooled phase of the painted moon + dotted outlines
      const ghost = el('g', { class: 'ar-ghost' }, bob);
      img({ class: 'ar-ghost-img', mask: `url(#ar-phase-${i})` }, ghost);
      el('path', { d: pd, fill: 'none', stroke: CREAM, 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-dasharray': '0.1 2.8' }, ghost);
      el('circle', { class: 'ar-disc', cx: 0, cy: 0, r: r + 1, fill: 'none', stroke: CREAM, 'stroke-width': 1.3, 'stroke-linecap': 'round', 'stroke-dasharray': '0.1 3.2' }, bob);

      // lit phase (done)
      const lit = el('g', { class: 'ar-lit' }, bob);
      const inner = el('g', { 'clip-path': `url(#ar-sweep-${i})` }, lit);
      img({ class: 'ar-lit-img', mask: `url(#ar-phase-${i})` }, inner);
      const rr = mulberry32(1000 + i * 77);

      // tiny sparkles around a done moon
      const near = el('g', { class: 'ar-near' }, bob);
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI * (0.15 + 0.35 * k) + (rr() - 0.5) * 0.4;
        const d = r + 9 + rr() * 8;
        const p = el('path', { d: star4(+(Math.cos(a) * d).toFixed(1), +(Math.sin(a) * d).toFixed(1), 1.8 + rr() * 1.6), fill: k === 1 ? CREAM : SOFT }, near);
        p.style.animationDelay = (-rr() * 5).toFixed(2) + 's';
      }

      // today: breathing ring + twinkling star
      const today = el('g', { class: 'ar-today' }, bob);
      el('circle', { class: 'ar-today-ring', cx: 0, cy: 0, r: r + 7, fill: 'none', stroke: SOFT, 'stroke-width': 1.4, 'stroke-dasharray': '0.1 3.4', 'stroke-linecap': 'round' }, today);
      el('path', { class: 'ar-today-star', d: star4(r * 0.82 + 8, -r * 0.82 - 6, 4.2), fill: '#FFF6CC' }, today);

      // focus ring
      el('circle', { class: 'ar-focus', cx: 0, cy: 0, r: r + 4, fill: 'none', stroke: GOLD, 'stroke-width': 2.2, 'stroke-opacity': 0.9 }, bob);

      // numeral
      const num = el('text', { class: 'ar-num', x: 0, y: (r + 20).toFixed(1), 'text-anchor': 'middle' }, lift);
      num.textContent = NUMERALS[i];

      // generous hit circle
      el('circle', { cx: 0, cy: 6, r: r + 10, fill: 'transparent' }, g);

      const v = { g, m, sweepRect, anim: 0 };
      ctx.bindDay(g, i, {
        anchor: () => ({ x: m.x, y: m.y - r - 8 }),
        onToggle: value => onToggle(v, value),
      });
      return v;
    }

    // ---- Animations ---------------------------------------------------------
    const ease = x => 1 - Math.pow(1 - x, 3);
    function setSweep(v, k) { // k: 0 = dark, 1 = fully revealed (light grows from the right)
      const r = v.m.r;
      v.sweepRect.setAttribute('x', (r + 3 - (2 * r + 6) * k).toFixed(2));
    }
    function sweepIn(v) {
      cancelAnimationFrame(v.anim);
      if (ctx.reducedMotion) { setSweep(v, 1); return; }
      const t0 = performance.now(), dur = 950;
      const step = t => {
        const k = Math.min(1, (t - t0) / dur);
        setSweep(v, ease(k));
        if (k < 1) v.anim = requestAnimationFrame(step);
      };
      setSweep(v, 0);
      v.anim = requestAnimationFrame(step);
    }

    function onToggle(v, value) {
      const m = v.m;
      if (value) {
        sweepIn(v);
        v.g.classList.remove('ar-bloom'); void v.g.getBBox(); v.g.classList.add('ar-bloom');
        setTimeout(() => v.g.classList.remove('ar-bloom'), 1150);
        const p = ctx.stage(m.x, m.y);
        const fx = ctx.fx;
        if (fx) {
          fx.ripple(p.x, p.y, { color: 'rgba(251,240,184,0.85)', radius: m.r * 1.9, squash: 1, count: 2, width: 1.3, life: 1.2, r0: m.r });
          setTimeout(() => fx.sparkle(p.x, p.y - 4, { colors: [GOLD, SOFT, CREAM], count: 11, spread: 1.6 }), 260);
          setTimeout(() => fx.burst(p.x + m.r * 0.6, p.y - m.r * 0.6, { kind: 'line', colors: [CREAM, SOFT], count: 3, speed: 1.4, gravity: -15, size: 6, life: 0.9 }), 420);
        }
      } else {
        cancelAnimationFrame(v.anim);
        v.g.classList.remove('ar-bloom');
      }
      updateThread(true);
    }

    let wasComplete = false;
    function updateThread(animated) {
      const days = ctx.days();
      for (let i = 0; i < 6; i++) segGold[i].forEach(p => p.classList.toggle('on', days[i] && days[i + 1]));
      const complete = days.every(Boolean);
      ctx.el.classList.toggle('ar-complete', complete);
      if (complete && !wasComplete && animated && ctx.fx) {
        const p = ctx.stage(KH.x, KH.y);
        setTimeout(() => {
          ctx.fx.sparkle(p.x, p.y, { colors: [GOLD, SOFT, CREAM], count: 16, spread: 2 });
          ctx.fx.ripple(p.x, p.y, { color: 'rgba(242,212,92,0.8)', radius: 44, squash: 1, count: 3, width: 1.2 });
        }, 700);
      }
      wasComplete = complete;
    }

    // ---- Wind: moons drift a hair, stars brighten as gusts pass --------------
    const W8 = Garden.wind;
    if (W8 && !ctx.reducedMotion) {
      const springs = views.map(() => W8.spring({ k: 3, c: 2.6 }));
      const bobs = views.map(v => v.g.querySelector('.ar-bob'));
      const sp = views.map(v => ctx.stage(v.m.x, v.m.y));
      const mid = ctx.stage(W / 2, HH / 2);
      let lastGlow = -1;
      W8.onTick((t, dt) => {
        for (let i = 0; i < 7; i++) {
          const w = W8.at(sp[i].x, sp[i].y, t);
          const dx = Math.max(-1.5, Math.min(1.5, springs[i].step((w - 0.45) * 2.2, dt)));
          const dy = Math.sin(t * 0.45 + i * 1.3) * 1.1 + dx * 0.25;
          bobs[i].setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
        }
        const g = Math.min(1, W8.gust(mid.x, t));
        const glow = Math.round(g * 20) / 20;
        if (glow !== lastGlow) {
          lastGlow = glow;
          starsG.style.opacity = nightG.style.opacity = '';
          starsG.style.filter = glow ? `brightness(${(1 + glow * 0.6).toFixed(2)})` : '';
          starsG.style.transform = '';
          nightG.style.filter = starsG.style.filter;
        }
      });
    }

    function render() {
      views.forEach(v => { cancelAnimationFrame(v.anim); setSweep(v, 1); v.g.classList.remove('ar-bloom'); });
      updateThread(false);
    }

    ctx.onWeekChange(() => {
      if (!ctx.reducedMotion) {
        moonsG.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 420, easing: 'cubic-bezier(0.22,1,0.36,1)' });
      }
      render();
    });
    render();

    ctx.placeLabel(320, 228, { align: 'center' });
    return {};
  });
})();
