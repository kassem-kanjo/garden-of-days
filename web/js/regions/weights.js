/* Garden of Days — Weights: a balanced stone cairn beneath a red Japanese maple. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const C = {
    body: '#E0262B', soft: '#F6A9A6', deep: '#7A1015',
    ghost: '#EDE6DA', ghostLine: '#CDBFAD', ghostDeep: '#B7A893',
    cream: '#FBF5EC', ink: '#16161F', gold: '#F3C94A', orange: '#F08A2E',
  };
  const GROUND = 347;          // local y where the cairn rests
  const CAIRN_X = 150;
  const INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function svg(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Smooth closed (or open) curve through points (Catmull-Rom -> cubic Bezier).
  function curve(pts, closed) {
    const n = pts.length;
    const P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    const end = closed ? n : n - 1;
    for (let i = 0; i < end; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    return closed ? d + 'Z' : d;
  }

  // A soft, irregular river pebble. Returns a sampler so offset/inset copies share the same wobble.
  function pebble(w, h, rnd) {
    const harm = [2, 3, 5].map(k => ({ k, a: (0.018 + rnd() * 0.03) / (k * 0.5), p: rnd() * Math.PI * 2 }));
    const skew = (rnd() - 0.5) * 0.16;
    const N = 40;
    function at(t, grow, sx, sy, ox, oy) {
      let n = 1; harm.forEach(hh => { n += hh.a * Math.sin(hh.k * t + hh.p); });
      const s = Math.sin(t), c = Math.cos(t);
      const a = w / 2 * sx + grow, b = h / 2 * sy + grow;
      // flatter bottom so it sits, domed top
      const flat = s > 0 ? 0.78 + 0.22 * (1 - s) : 1;
      let x = a * c * n, y = b * s * n * flat;
      x += skew * y;
      return [x + ox, y + oy];
    }
    function pts(grow, sx, sy, ox, oy, t0, t1) {
      grow = grow || 0; sx = sx == null ? 1 : sx; sy = sy == null ? 1 : sy; ox = ox || 0; oy = oy || 0;
      const out = [];
      if (t0 == null) { for (let j = 0; j < N; j++) out.push(at(j / N * Math.PI * 2, grow, sx, sy, ox, oy)); }
      else { const m = 16; for (let j = 0; j <= m; j++) out.push(at(t0 + (t1 - t0) * j / m, grow, sx, sy, ox, oy)); }
      return out;
    }
    const base = pts();
    let minY = Infinity, maxY = -Infinity;
    base.forEach(p => { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    return {
      pts, minY, maxY,
      path: (grow, sx, sy, ox, oy) => curve(pts(grow, sx, sy, ox, oy), true),
      arc: (t0, t1, grow, sx, sy, ox, oy) => curve(pts(grow, sx, sy, ox, oy, t0, t1), false),
    };
  }

  // ---------------------------------------------------------------------------
  // Painted maple sprite geometry (900x702 sprite shown 420px wide)
  // ---------------------------------------------------------------------------
  const TW = 420, TH = Math.round(420 * 702 / 900);
  const TREE_BASE = { x: 260, y: 345 };           // trunk base on the ground (local)
  const TREE_X = TREE_BASE.x - 400 * TW / 900, TREE_Y = TREE_BASE.y - 690 * TW / 900;
  const SPRITE = 'assets/sprites/';
  const ell = (rx, ry) => `M${-rx},0a${rx},${ry} 0 1,0 ${2 * rx},0a${rx},${ry} 0 1,0 ${-2 * rx},0Z`;

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  const CSS = `
.region-weights svg.wt-tree { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.region-weights .wt-tree image { transition: filter 1.2s var(--ease-out); }
html[data-phase="night"] .region-weights .wt-tree image { filter: brightness(0.56) saturate(1.15); }
html[data-phase="dusk"] .region-weights .wt-tree image { filter: brightness(0.9) saturate(1.05); }


.region-weights svg.wt-svg { position: absolute; left: 0; top: 0; overflow: visible; }
.region-weights .wt-vis { pointer-events: none; }
.region-weights .wt-hit { pointer-events: all; fill: transparent; stroke: none; }
.region-weights .is-future .wt-hit { pointer-events: none; }
.region-weights .wt-cairn { transform-box: view-box; transform-origin: ${CAIRN_X}px ${GROUND}px; }
.region-weights .wt-lift { transform-box: fill-box; transform-origin: 50% 100%; transition: transform 320ms var(--ease-spring); }
.region-weights .wt-wob { transform-box: fill-box; transform-origin: 50% 100%; }
.region-weights .wt-stone.is-hover:not(.is-future) .wt-lift { transform: translateY(-4px); }
.region-weights .wt-stone.is-hover:not(.is-future) .wt-wob { animation: wt-wobble 620ms var(--ease-out); }
@keyframes wt-wobble { 0% { transform: rotate(0); } 25% { transform: rotate(-2.2deg); } 55% { transform: rotate(1.4deg); } 80% { transform: rotate(-0.5deg); } 100% { transform: rotate(0); } }
.region-weights .wt-done { transform-box: fill-box; transform-origin: 50% 100%; opacity: 0; }
.region-weights .wt-stone.is-done .wt-done { opacity: 1; }
.region-weights .wt-ghost { opacity: 1; transition: opacity 320ms var(--ease-out) 110ms; }
.region-weights .wt-stone.is-done .wt-ghost, .region-weights .wt-stone.is-future .wt-ghost { opacity: 0; }
.region-weights .wt-stone.is-done .wt-ghost { transition: opacity 260ms var(--ease-out) 300ms; }
.region-weights .wt-future { opacity: 0; transition: opacity 300ms var(--ease-out); }
.region-weights .wt-stone.is-future .wt-future { opacity: 1; }
.region-weights .wt-ini { font-family: var(--font-display); font-style: italic; font-size: 11px; text-anchor: middle; dominant-baseline: central; fill: #9C907F; transition: fill 300ms var(--ease-out), opacity 300ms; letter-spacing: 0.02em; }
.region-weights .wt-stone.is-done .wt-ini { fill: ${C.cream}; }
.region-weights .wt-stone.is-future .wt-ini { fill: ${C.cream}; opacity: 0.45; }
.region-weights .wt-ring { fill: none; stroke: ${C.body}; stroke-width: 1.6; opacity: 0; transition: opacity 200ms var(--ease-out); }
.region-weights .wt-stone.is-focus .wt-ring { opacity: 0.7; }
.region-weights .wt-ring2 { fill: none; stroke: ${C.soft}; stroke-width: 4; opacity: 0; transition: opacity 200ms var(--ease-out); }
.region-weights .wt-stone.is-focus .wt-ring2 { opacity: 0.45; }
.region-weights .wt-glow, .region-weights .wt-spark { opacity: 0; transition: opacity 500ms var(--ease-out); }
.region-weights .wt-stone.is-today .wt-glow { opacity: 1; }
.region-weights .wt-stone.is-today .wt-glow ellipse { animation: wt-breathe 4.2s var(--ease-breathe) infinite alternate; }
.region-weights .wt-stone.is-today .wt-spark { opacity: 1; }
.region-weights .wt-spark path { transform-box: fill-box; transform-origin: 50% 50%; }
.region-weights .wt-stone.is-today .wt-spark path { animation: wt-twinkle 3.2s var(--ease-breathe) infinite alternate; }
@keyframes wt-breathe { from { opacity: 0.45; } to { opacity: 0.95; } }
@keyframes wt-twinkle { from { transform: scale(0.82) rotate(0deg); opacity: 0.8; } to { transform: scale(1.08) rotate(12deg); opacity: 1; } }
.region-weights .wt-rim { fill: none; stroke: #F9CFA4; stroke-width: 5; opacity: 0; transition: opacity 1.4s var(--ease-out); }
.region-weights.wt-complete .wt-stone.is-done .wt-rim { opacity: 0.42; }
.region-weights .wt-night { fill: none; stroke: ${C.cream}; stroke-width: 0.8; stroke-linecap: round; opacity: 0; }
html[data-phase="night"] .region-weights .wt-night { opacity: 0.7; }
html[data-phase="night"] .region-weights .wt-ghost { opacity: 0.75; }
html[data-phase="night"] .region-weights .wt-stone.is-done .wt-ghost,
html[data-phase="night"] .region-weights .wt-stone.is-future .wt-ghost { opacity: 0; }
.region-weights .wt-leaf { opacity: 0; transform-box: fill-box; transform-origin: 50% 100%; transform: translateY(-18px) rotate(-30deg); transition: opacity 600ms var(--ease-out), transform 1400ms var(--ease-spring); }
.region-weights.wt-complete .wt-leaf { opacity: 1; transform: translateY(0) rotate(0deg); }
.region-weights.wt-instant *, .region-weights.wt-instant { transition: none !important; }
`;

  // ---------------------------------------------------------------------------
  Garden.registerRegion('weights', function (ctx) {
    const G = window.Garden;
    const el = ctx.el;
    const rm = ctx.reducedMotion;

    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    // ---------- tree (painted sprite, wind-driven sway) ----------
    const tsvg = svg('svg', { class: 'wt-tree', width: ctx.bounds.w, height: ctx.bounds.h });
    el.appendChild(tsvg);
    const treeG = svg('g', null, tsvg);
    svg('image', { href: SPRITE + 'maple.png', x: TREE_X, y: TREE_Y, width: TW, height: TH }, treeG);
    if (!rm && G.wind) {
      const sp = G.wind.spring({ k: 6, c: 2.5 });
      const sp0 = ctx.stage(TREE_BASE.x, TREE_BASE.y);
      G.wind.onTick((t, dt) => {
        const a = sp.step(0.9 * G.wind.at(sp0.x, sp0.y, t), dt);
        treeG.setAttribute('transform', `rotate(${a.toFixed(3)} ${TREE_BASE.x} ${TREE_BASE.y})`);
      });
    }

    // ---------- cairn (svg) ----------
    const W = ctx.bounds.w, H = ctx.bounds.h;
    const root = svg('svg', { class: 'wt-svg', width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    el.appendChild(root);
    const defs = svg('defs', null, root);
    // Ghost stone filter as a real SVG filter (WebKit ignores CSS filters on SVG <image>).
    const gf = svg('filter', { id: 'wt-ghost', 'color-interpolation-filters': 'sRGB' }, defs);
    svg('feColorMatrix', { type: 'matrix', values: '0.32 1.07 0.11 0 0.06  0.31 1.04 0.10 0 0.05  0.29 0.97 0.10 0 0.04  0 0 0 1 0' }, gf);
    const grad = svg('radialGradient', { id: 'wt-glow-grad' }, defs);
    svg('stop', { offset: '0%', 'stop-color': '#FFC86A', 'stop-opacity': '0.95' }, grad);
    svg('stop', { offset: '50%', 'stop-color': '#FFD9A0', 'stop-opacity': '0.5' }, grad);
    svg('stop', { offset: '100%', 'stop-color': '#F9CFA4', 'stop-opacity': '0' }, grad);

    const rnd = mulberry32(4242);

    // moss patch, tufts and tiny pebbles at the base
    const base = svg('g', { class: 'wt-vis wt-base' }, root);
    (function drawBase() {
      // soft moss bed of stipple
      let d = '';
      for (let i = 0; i < 260; i++) {
        const t = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
        const x = CAIRN_X + 6 + Math.cos(t) * r * 86, y = GROUND + 2 + Math.sin(t) * r * 7;
        d += `M${x.toFixed(1)},${y.toFixed(1)}h0.01`;
      }
      svg('path', { d, stroke: '#4E8F55', 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.55 }, base);
      d = '';
      for (let i = 0; i < 140; i++) {
        const t = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
        const x = CAIRN_X + 6 + Math.cos(t) * r * 80, y = GROUND + 1 + Math.sin(t) * r * 6;
        d += `M${x.toFixed(1)},${y.toFixed(1)}h0.01`;
      }
      svg('path', { d, stroke: '#9ED89A', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.8 }, base);
      // grass tufts: fans of fine strokes
      const tufts = [[72, 0.9], [92, 1.1], [214, 1.0], [230, 0.8], [118, 0.6], [196, 0.7], [64, 0.6], [242, 0.6]];
      tufts.forEach(([tx, s], k) => {
        let dd = '';
        const n = 7 + Math.floor(rnd() * 5);
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.6 + (rnd() - 0.5) * 0.2;
          const len = (8 + rnd() * 9) * s;
          const bx = tx + (rnd() - 0.5) * 4, by = GROUND + 3;
          const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
          dd += `M${bx.toFixed(1)},${by}Q${(bx + Math.cos(a) * len * 0.5 + a * 0.6).toFixed(1)},${(by + Math.sin(a) * len * 0.55).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
        }
        svg('path', { d: dd, fill: 'none', stroke: k % 2 ? '#2F6B3A' : '#4E8F55', 'stroke-width': 0.9, 'stroke-linecap': 'round' }, base);
        svg('path', { d: dd, fill: 'none', stroke: '#9ED89A', 'stroke-width': 0.5, 'stroke-linecap': 'round', opacity: 0.9, transform: 'translate(0.8,0.4)' }, base);
      });
      // tiny pebbles
      [[58, 349, 7, 4, '#EDE6DA'], [248, 350, 9, 4.5, '#F6D9E4'], [262, 352, 5, 3, '#EDE6DA'], [84, 354, 5, 2.6, '#F6A9A6'], [228, 355, 4, 2.4, '#EDE6DA']]
        .forEach(([x, y, w, h, col]) => {
          const p = pebble(w * 2, h * 2, rnd);
          const g = svg('g', { transform: `translate(${x},${y})` }, base);
          svg('path', { d: p.path(), fill: col }, g);
          svg('path', { d: p.path(-1.2, 0.8, 0.7, -0.5, -0.6), fill: 'none', stroke: '#FFFFFF', 'stroke-width': 0.5, opacity: 0.7 }, g);
        });
    })();

    const cairn = svg('g', { class: 'wt-cairn' }, root);

    const WIDTHS = [118, 104, 90, 76, 64, 52, 42];
    const DX = [0, 5, -3, 4, -2, 3, -1];
    const TILT = [-1.5, 2.5, -2.2, 2, -2.8, 2.2, -1.4];
    const stones = [];
    let prevTop = GROUND + 1;
    const stoneSrc = i => SPRITE + (i % 2 ? 'stone-b.png' : 'stone-a.png');
    const stoneH = (w, i) => w * (i % 2 ? 136 : 138) / 300;

    WIDTHS.forEach((w, i) => {
      const h = stoneH(w, i);
      const shape = { minY: -h / 2, maxY: h / 2, path: (g) => ell(w / 2 + (g || 0), h / 2 + (g || 0)) };
      const cx = CAIRN_X + DX[i];
      const cy = prevTop - h / 2 + (i === 0 ? 0 : 4);
      prevTop = cy - h / 2;
      const flip = i % 3 === 1 ? -1 : 1;
      const imgAttrs = { href: stoneSrc(i), x: -w / 2, y: -h / 2, width: w, height: h };

      const g = svg('g', { class: 'wt-stone', transform: `translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${TILT[i]})` }, cairn);
      const lift = svg('g', { class: 'wt-lift wt-vis' }, g);
      const wob = svg('g', { class: 'wt-wob' }, lift);

      const glow = svg('g', { class: 'wt-glow' }, wob);
      svg('ellipse', { cx: 0, cy: 2, rx: w * 0.78 + 10, ry: h * 0.85 + 8, fill: 'url(#wt-glow-grad)' }, glow);
      svg('path', { class: 'wt-rim', d: shape.path(1.5) }, wob);

      // ghost: pale stone with cream rim
      const ghost = svg('g', { class: 'wt-ghost' }, wob);
      svg('ellipse', { cx: 0, cy: 0, rx: w / 2 + 3, ry: h / 2 + 3, fill: C.cream, opacity: 0.6 }, ghost);
      svg('image', Object.assign({ class: 'wt-ghost-img', opacity: 0.85, filter: 'url(#wt-ghost)' }, imgAttrs), ghost);

      // done: sprite as-is
      const done = svg('g', { class: 'wt-done' }, wob);
      svg('image', imgAttrs, done);

      // future: very faint
      const fut = svg('g', { class: 'wt-future' }, wob);
      svg('image', Object.assign({ opacity: 0.18 }, imgAttrs), fut);

      svg('path', { class: 'wt-ring2', d: shape.path(4.5) }, wob);
      svg('path', { class: 'wt-ring', d: shape.path(4.5) }, wob);

      const tx = svg('text', { class: 'wt-ini', x: 0, y: 1.5 }, wob);
      tx.textContent = INITIALS[i];

      const spark = svg('g', { class: 'wt-spark', transform: `translate(${(w * 0.08).toFixed(1)},${(shape.minY - 7).toFixed(1)})` }, wob);
      svg('path', { d: 'M0,-8Q1,-1 8,0Q1,1 0,8Q-1,1 -8,0Q-1,-1 0,-8Z', fill: C.gold, stroke: '#C98A12', 'stroke-width': 0.4 }, spark);
      svg('circle', { cx: 0, cy: 0, r: 1.6, fill: '#FFF6D6' }, spark);

      svg('path', { class: 'wt-hit', d: shape.path(3) }, g);

      const s = { i, g, done, ghost, shape, w, h, cx, cy, top: cy + shape.minY, bottom: cy + shape.maxY };
      stones.push(s);

      ctx.bindDay(g, i, {
        anchor: () => ({ x: cx, y: s.top - 10 }),
        soundDelay: 0.32,
        onHover: on => { if (on && !ctx.isFuture(i) && G.sound && G.sound.ui) G.sound.ui('hover'); },
        onToggle: (value) => { if (value) dropIn(s); else liftAway(s); },
      });
    });


    // ---------- complete flourish: maple leaf resting on top ----------
    const top = stones[6];
    const leafG = svg('g', { class: 'wt-vis', transform: `translate(${top.cx - 8},${top.top + 1.5}) rotate(${TILT[6] - 16}) scale(1.4)` }, cairn);
    const leaf = svg('g', { class: 'wt-leaf' }, leafG);
    (function drawLeaf() {
      const pts = [];
      const lobes = [[-90, 11], [-55, 5], [-35, 9], [0, 4], [20, 8], [55, 3], [90, 1.5], [125, 3], [160, 8], [180, 4], [215, 9], [235, 5]];
      lobes.forEach(([a, r]) => { const t = a * Math.PI / 180; pts.push([Math.cos(t) * r, Math.sin(t) * r * 0.55 - 3]); });
      svg('path', { d: curve(pts, true), fill: C.body, transform: 'scale(1.05)' }, leaf);
      svg('path', { d: 'M0,-1L0,-9M0,-2L-7,-6M0,-2L7,-6', fill: 'none', stroke: C.soft, 'stroke-width': 0.6, 'stroke-linecap': 'round' }, leaf);
      svg('path', { d: 'M0,0L1,3', fill: 'none', stroke: C.deep, 'stroke-width': 0.9, 'stroke-linecap': 'round' }, leaf);
    })();

    ctx.placeLabel(CAIRN_X + 6, 372, { align: 'center' });

    // ---------- perches ----------
    G.addPerch('weights-cairn-top', ctx.stage(top.cx, top.top - 1).x, ctx.stage(top.cx, top.top - 1).y, 'stone');
    G.addPerch('weights-cairn-mid', ctx.stage(stones[3].cx + 20, stones[3].top + 2).x, ctx.stage(stones[3].cx + 20, stones[3].top + 2).y, 'stone');
    [[143, 112], [306, 66], [430, 160], [213, 50]].forEach(([x, y], k) => {
      const p = ctx.stage(x, y); G.addPerch('weights-maple-' + k, p.x, p.y, 'any');
    });

    // ---------- animations ----------
    function dropIn(s) {
      if (rm) { burstDust(s); return; }
      cairn.appendChild(s.g); // render above stones stacked higher while dropping
      clearTimeout(s.zt);
      s.zt = setTimeout(() => {
        const nxt = stones[s.i + 1] ? stones[s.i + 1].g : leafG;
        cairn.insertBefore(s.g, nxt);
      }, 950);
      const d = 900;
      s.done.animate([
        { transform: 'translate(0px,-42px) rotate(7deg) scale(1,1)', opacity: 0, offset: 0, easing: 'cubic-bezier(.5,0,.9,.5)' },
        { transform: 'translate(0px,-30px) rotate(6deg) scale(1,1)', opacity: 1, offset: 0.12, easing: 'cubic-bezier(.55,0,1,.6)' },
        { transform: 'translate(0px,0px) rotate(1.5deg) scale(1,1)', opacity: 1, offset: 0.36, easing: 'cubic-bezier(.2,.8,.4,1)' },
        { transform: 'translate(0px,1px) rotate(0.6deg) scale(1.07,0.9)', opacity: 1, offset: 0.43, easing: 'cubic-bezier(.3,.7,.4,1)' },
        { transform: 'translate(0px,-4px) rotate(-1.3deg) scale(0.98,1.03)', opacity: 1, offset: 0.58, easing: 'cubic-bezier(.5,0,.6,1)' },
        { transform: 'translate(0px,0px) rotate(0.7deg) scale(1.02,0.98)', opacity: 1, offset: 0.74, easing: 'cubic-bezier(.3,.6,.4,1)' },
        { transform: 'translate(0px,0px) rotate(0deg) scale(1,1)', opacity: 1, offset: 1 },
      ], { duration: d, fill: 'none' });
      setTimeout(() => {
        burstDust(s);
        cairn.animate([
          { transform: 'rotate(0deg)' }, { transform: 'rotate(0.7deg)' }, { transform: 'rotate(-0.45deg)' },
          { transform: 'rotate(0.18deg)' }, { transform: 'rotate(0deg)' },
        ], { duration: 640, easing: 'cubic-bezier(.3,.6,.4,1)' });
        if (G.sound && G.sound.voice) G.sound.voice('wood', s.i, { delay: 0.12, vel: 0.35 });
        shakeLeaves(3);
      }, 320);
    }

    function liftAway(s) {
      if (rm) return;
      s.done.animate([
        { transform: 'translate(0px,0px) rotate(0deg)', opacity: 1 },
        { transform: 'translate(0px,-16px) rotate(-3deg)', opacity: 0 },
      ], { duration: 400, easing: 'cubic-bezier(.22,1,.36,1)' });
    }

    function burstDust(s) {
      const p = ctx.stage(s.cx, s.bottom);
      ctx.fx.stipple(p.x, p.y - 2, { colors: [C.cream, '#F6D9E4', C.soft, '#EDE6DA'], count: 16, speed: 0.55, spread: 1.6 });
    }

    const LEAF_SPOTS = [[120, 186], [166, 163], [213, 200], [260, 190], [330, 219], [376, 186], [446, 233], [300, 150]];
    function shakeLeaves(n) {
      for (let k = 0; k < n; k++) {
        const [x, y] = LEAF_SPOTS[Math.floor(Math.random() * LEAF_SPOTS.length)];
        const p = ctx.stage(x + (Math.random() - 0.5) * 20, y);
        setTimeout(() => ctx.fx.burst(p.x, p.y, {
          kind: 'leaf', colors: [C.body, C.orange, '#C81D25', C.body], count: 1, up: false,
          speed: 0.3, gravity: 38, size: 5, life: 3.2, wind: 6,
        }), k * 140);
      }
    }

    // idle: a single maple leaf drifts down every 10–20s
    if (!rm) {
      const idle = () => {
        if (!document.hidden) shakeLeaves(1);
        setTimeout(idle, 10000 + Math.random() * 10000);
      };
      setTimeout(idle, 4000 + Math.random() * 6000);
    }

    // ---------- complete state + week change ----------
    function setComplete(on) { el.classList.toggle('wt-complete', !!on); }
    setComplete(ctx.count() === 7);

    ctx.onChange(p => {
      setComplete(p.count === 7);
      if (p.complete && !rm) setTimeout(() => {
        const t = ctx.stage(top.cx, top.top - 6);
        ctx.fx.sparkle(t.x, t.y, { colors: [C.gold, C.cream, C.soft], count: 10 });
        shakeLeaves(4);
      }, 700);
    });

    ctx.onWeekChange(() => {
      el.classList.add('wt-instant');
      setComplete(ctx.count() === 7);
      stones.forEach(s => s.done.getAnimations && s.done.getAnimations().forEach(a => a.cancel()));
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('wt-instant')));
      if (!rm) cairn.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' });
    });

    return {};
  });
})();
