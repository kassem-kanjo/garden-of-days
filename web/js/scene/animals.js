/* Garden of Days — animals layer: koi, crane, rabbit, butterflies, songbirds, dragonfly, fireflies.
   One SVG, one rAF loop, transforms + a few path strings per frame. Stitched pastel style. */
(function () {
  'use strict';
  // Gold koi tint as an SVG filter (WebKit ignores CSS filters on SVG <image>).
  function ensureGoldFilter() {
    if (document.getElementById('an-gold')) return;
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('width', 0); s.setAttribute('height', 0); s.style.position = 'absolute';
    s.innerHTML = '<filter id="an-gold" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.75 0.45 0.05 0 0.08  0.55 0.62 0.05 0 0.06  0.15 0.25 0.35 0 0  0 0 0 1 0"/></filter>';
    document.body.appendChild(s);
  }
  const G = window.Garden;
  if (!G) return;

  const NS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const srnd = mulberry32(90210);
  const sr = (a, b) => a + (b - a) * srnd();
  const R = (a, b) => a + (b - a) * Math.random();
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const f1 = n => Math.round(n * 10) / 10;
  const deg = r => r * 180 / Math.PI;
  const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  const easeInOut = x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
  function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const SPR = n => { const u = 'assets/sprites/' + n + '.png'; if (!SPR.c[u]) { SPR.c[u] = new Image(); SPR.c[u].src = u; } return u; };
  SPR.c = {};
  // Smooth closed outline through midpoints (soft, organic).
  function closedPath(pts) {
    const n = pts.length; const z = pts[n - 1], a = pts[0];
    let s = 'M' + f1((z[0] + a[0]) / 2) + ' ' + f1((z[1] + a[1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      s += 'Q' + f1(p[0]) + ' ' + f1(p[1]) + ' ' + f1((p[0] + q[0]) / 2) + ' ' + f1((p[1] + q[1]) / 2);
    }
    return s + 'Z';
  }
  // A blob with hand-made wobble, centred on cx,cy.
  function blob(cx, cy, rx, ry, wob, n, rot) {
    const pts = []; n = n || 10; rot = rot || 0;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, k = 1 + sr(-wob, wob);
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return closedPath(pts);
  }
  // Path made of dots (round caps on zero-length segments).
  function dotsIn(cx, cy, rx, ry, n, rot) {
    let s = ''; rot = rot || 0;
    for (let i = 0; i < n; i++) {
      const a = sr(0, TAU), r = Math.sqrt(srnd()) * 0.92;
      const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
      s += 'M' + f1(cx + x * Math.cos(rot) - y * Math.sin(rot)) + ' ' + f1(cy + x * Math.sin(rot) + y * Math.cos(rot)) + 'h0.01';
    }
    return s;
  }

  // ---------------------------------------------------------------------------
  G.registerLayer('animals', function (ctx) {
    const P = ctx.palette;
    const L = ctx.layout;
    const RM = !!ctx.reducedMotion;
    const pond = L.pond;
    const pointer = G.pointer;

    const style = document.createElement('style');
    style.textContent = [
      '#layer-animals svg.animals{position:absolute;left:0;top:0;width:1440px;height:900px;overflow:visible;pointer-events:none}',
      '#layer-animals .a-dot{fill:none;stroke-linecap:round}',
      '#layer-animals .a-line{fill:none;stroke-linecap:round;stroke-linejoin:round}',
      '#layer-animals .a-land{transition:opacity 1.6s cubic-bezier(0.45,0,0.55,1)}',
      'html[data-phase="night"] #layer-animals .a-land{opacity:.82}',
      'html[data-phase="dusk"] #layer-animals .a-land{opacity:.93}',
    ].join('\n');
    ctx.el.appendChild(style);

    const svg = mk('svg', { class: 'animals', viewBox: '0 0 1440 900', width: 1440, height: 900, 'aria-hidden': 'true' }, ctx.el);
    const gKoi = mk('g', { class: 'a-koi' }, svg);
    const gDragon = mk('g', { class: 'a-dragon' }, svg);
    const gLand = mk('g', { class: 'a-land' }, svg);
    const gBirds = mk('g', { class: 'a-birds' }, svg);
    const gFlies = mk('g', { class: 'a-butterflies' }, svg);
    const gFire = mk('g', { class: 'a-fireflies', opacity: 0 }, svg);

    const INK = P.ink, INKS = P.inkSoft;

    function phaseNow() { return document.documentElement.dataset.phase || G.timeOfDay(); }
    let phase = phaseNow();
    G.on('phase', p => { phase = (p && p.phase) || phaseNow(); });
    const isNight = () => phase === 'night';

    function pointerActive() { return pointer && pointer.inside && pointer.x > -1000; }
    function pointerIdle(ms) { return pointerActive() && performance.now() - pointer.lastMove > ms; }

    function inPond(x, y, k) {
      const dx = (x - pond.cx) / (pond.rx * k), dy = (y - pond.cy) / (pond.ry * k);
      return dx * dx + dy * dy < 1;
    }

    // =========================================================================
    // KOI
    // =========================================================================
    const SQ = 0.6; // perspective squash of the pond surface
    const KU = pond.rx * 0.8, KV = (pond.ry / SQ) * 0.8; // inset ellipse in unsquashed space
    const NSEG = 7;

    const KOI_SPECS = [
      { len: 48, img: SPR('koi-a'), w: 48, h: 30.8, flip: true },
      { len: 48, img: SPR('koi-b'), w: 48, h: 39.4, flip: false },
      { len: 48, img: SPR('koi-a'), w: 48, h: 30.8, flip: true, gold: true },
    ];

    function makeKoi(spec, i) {
      const g = mk('g', {}, gKoi);
      const corr = mk('g', { transform: spec.flip ? 'scale(-1 1)' : '' }, g);
      const sk = mk('g', {}, corr);
      const im = mk('image', { href: spec.img, x: -spec.w / 2, y: -spec.h / 2, width: spec.w, height: spec.h }, sk);
      if (spec.gold) { ensureGoldFilter(); im.setAttribute('filter', 'url(#an-gold)'); }
      const a0 = sr(0, TAU), r0 = Math.sqrt(sr(0.1, 0.7));
      return {
        spec, g, sk,
        u: Math.cos(a0) * KU * r0, v: Math.sin(a0) * KV * r0,
        ang: sr(0, TAU), speed: 14, wander: 0, ph: sr(0, TAU), omega: 0,
        depthSeed: sr(0, TAU), depthRate: sr(0.07, 0.13), nextRipple: R(3, 8), seed: i,
      };
    }
    const kois = KOI_SPECS.map(makeKoi);
    const KOI_W = [0.12, 0.17, 0.19, 0.175, 0.14, 0.095, 0.05];

    let splash = null;
    G.on('pond:splash', p => { if (p && isFinite(p.x)) splash = { x: p.x, y: p.y, t: 6 }; });


    const pads = () => G.getPerches('pad');

    function koiUpdate(k, dt, T) {
      // world position
      const wx = pond.cx + k.u, wy = pond.cy + k.v * SQ;
      let fx = Math.cos(k.ang), fy = Math.sin(k.ang);
      // wander
      k.wander = clamp(k.wander + R(-1, 1) * dt * 2.2, -0.9, 0.9);
      let dx = fx + Math.cos(k.ang + k.wander * 1.6) * 0.8, dy = fy + Math.sin(k.ang + k.wander * 1.6) * 0.8;
      let want = 13 + Math.sin(T * 0.21 + k.seed * 2) * 4;
      let turnRate = 1.1;
      // boundary (look ahead)
      const lu = k.u + fx * 40, lv = k.v + fy * 40;
      const e = (lu / KU) * (lu / KU) + (lv / KV) * (lv / KV);
      if (e > 0.72) { const w = (e - 0.72) * 5; dx += -k.u / KU * w; dy += -k.v / KV * w * 1.6; }
      // keep apart from other koi
      for (const o of kois) {
        if (o === k) continue;
        const du = k.u - o.u, dv = k.v - o.v, d = Math.hypot(du, dv);
        if (d < 46 && d > 0.01) { dx += du / d * (46 - d) / 30; dy += dv / d * (46 - d) / 30; }
      }
      // lily pads: glide around them
      const pp = pads();
      for (let i = 0; i < pp.length; i++) {
        const du = k.u - (pp[i].x - pond.cx), dv = k.v - (pp[i].y - pond.cy) / SQ, d = Math.hypot(du, dv);
        if (d < 40 && d > 0.01) { dx += du / d * (40 - d) / 26; dy += dv / d * (40 - d) / 26; }
      }
      // curiosity: splash
      if (splash) {
        const su = splash.x - pond.cx, sv = (splash.y - pond.cy) / SQ, d = Math.hypot(su - k.u, sv - k.v);
        if (d > 14) { dx += (su - k.u) / d * 2.4; dy += (sv - k.v) / d * 2.4; want = 30; turnRate = 2.4; }
        else want = 6;
      }
      // flee the pointer
      if (pointerActive() && inPond(pointer.x, pointer.y, 1.1)) {
        const d = dist(pointer.x, pointer.y, wx, wy);
        if (d < 75) {
          const pu = pointer.x - pond.cx, pv = (pointer.y - pond.cy) / SQ;
          const du = k.u - pu, dv = k.v - pv, m = Math.hypot(du, dv) || 1;
          const w = (75 - d) / 75 * 5;
          dx += du / m * w; dy += dv / m * w; want = 60; turnRate = 4.5;
        }
      }
      const desired = Math.atan2(dy, dx);
      const turn = clamp(angDiff(k.ang, desired), -turnRate * dt, turnRate * dt);
      k.ang += turn;
      k.omega = approach(k.omega, turn / Math.max(dt, 1e-3), 6, dt);
      k.speed = approach(k.speed, RM ? want * 0.35 : want, want > 30 ? 4 : 1.2, dt);
      k.u += Math.cos(k.ang) * k.speed * dt;
      k.v += Math.sin(k.ang) * k.speed * dt;
      // hard clamp inside inset ellipse
      const ee = (k.u / KU) * (k.u / KU) + (k.v / KV) * (k.v / KV);
      if (ee > 1) { const s = 1 / Math.sqrt(ee); k.u *= s; k.v *= s; }
      k.ph += dt * (2.2 + k.speed * 0.32);
      // depth: rising and sinking
      const depth = 0.5 + 0.5 * Math.sin(T * k.depthRate + k.depthSeed);
      const op = 0.42 + 0.53 * depth;
      const sc = 0.9 + 0.12 * depth;
      const x = pond.cx + k.u, y = pond.cy + k.v * SQ;
      const vis = Math.atan2(Math.sin(k.ang), Math.cos(k.ang));
      k.g.setAttribute('transform', 'translate(' + f1(x) + ' ' + f1(y) + ') scale(' + f1(sc * 100) / 100 + ' ' + f1(sc * SQ * 100) / 100 + ') rotate(' + f1(deg(vis)) + ')');
      k.g.setAttribute('opacity', f1(op * 100) / 100);
      k.sk.setAttribute('transform', 'skewY(' + f1(Math.sin(k.ph) * (RM ? 1.5 : 6)) + ')');
      // surface ripple when near the top
      k.nextRipple -= dt;
      if (k.nextRipple <= 0) {
        k.nextRipple = R(4, 9);
        if (depth > 0.7 && !RM && G.fx) {
          const nx = x + Math.cos(k.ang) * k.spec.len * 0.4, ny = y + Math.sin(k.ang) * SQ * k.spec.len * 0.4;
          G.fx.ripple(nx, ny, { radius: 14, squash: 0.35, alpha: 0.5, count: 1 });
        }
      }
    }

    // =========================================================================
    // RED-CROWNED CRANE
    // =========================================================================
    const crane = (function () {
      const g = mk('g', {}, gLand);
      const flip = mk('g', {}, g);
      const upper = mk('g', {}, flip);
      mk('image', { href: SPR('crane'), x: -19.75, y: -80, width: 39.5, height: 80 }, upper);
      const legs = [mk('g', {}), mk('g', {})], wing = mk('g', {}), neck = mk('g', {});
      return {
        g, flip, legs, upper, wing, neck,
        x: 1260, y: 770, face: -1, faceV: -1, state: 'stand', timer: R(2, 4), path: [], speed: 16,
        neckA: 0, neckT: 0, lift: 0, liftT: 0, tilt: 0, tiltT: 0, legPh: 0, walkAmt: 0,
        wingT: 0, lastStretch: performance.now() - 120000, cool: 0, dipPh: 0, wading: null, glance: 0,
      };
    })();

    const CR_ZONES = [{ x0: 70, x1: 340, y0: 695, y1: 788 }, { x0: 1110, x1: 1390, y0: 700, y1: 788 }];
    const WADE = [{ x: 488, y: 716 }, { x: 972, y: 716 }];
    function zoneSpot(z) { return { x: R(z.x0, z.x1), y: R(z.y0, z.y1) }; }
    function segHitsPond(a, b, skipEnd) {
      for (let i = 1; i < 12; i++) {
        const t = i / 12; if (skipEnd && t > 0.8) break;
        if (inPond(lerp(a.x, b.x, t), lerp(a.y, b.y, t), 1.08)) return true;
      }
      return false;
    }
    function planRoute(from, to, wade) {
      if (!segHitsPond(from, to, wade)) return [to];
      const left = { x: 430, y: 787 }, right = { x: 1030, y: 787 };
      const a = from.x < pond.cx ? left : right, b = to.x < pond.cx ? left : right;
      return a === b ? [a, to] : [a, b, to];
    }
    function craneWalkTo(to, wade, speed) {
      crane.path = planRoute(crane, to, wade);
      crane.wading = wade ? to : null;
      crane.state = 'walk';
      crane.speed = speed || R(14, 19);
    }
    function craneNext() {
      const c = crane, r = Math.random();
      const side = c.x < pond.cx ? 0 : 1;
      if (r < 0.22) craneWalkTo(WADE[side], true);
      else if (r < 0.32) craneWalkTo(zoneSpot(CR_ZONES[1 - side]), false);
      else craneWalkTo(zoneSpot(CR_ZONES[side]), false);
    }
    function craneIdle() {
      const c = crane, r = Math.random();
      c.neckT = 0; c.tiltT = 0; c.liftT = 0;
      if (performance.now() - c.lastStretch > 150000 && r < 0.35) { c.state = 'stretch'; c.timer = 3.2; c.wingT = 0; c.lastStretch = performance.now(); return; }
      if (r < 0.4) { c.state = 'preen'; c.timer = R(3, 5.5); return; }
      c.state = 'stand'; c.timer = R(2.5, 6);
    }

    function craneUpdate(dt, T) {
      const c = crane;
      c.cool -= dt;
      // alert when the pointer approaches
      if (pointerActive() && c.cool <= 0 && c.state !== 'alert') {
        const d = dist(pointer.x, pointer.y, c.x, c.y - 35);
        if (d < 90) {
          c.state = 'alert'; c.timer = 1.1; c.neckT = -10; c.tiltT = -6; c.liftT = 3; c.wingT = 0; c.cool = 4;
          c.face = pointer.x > c.x ? 1 : -1;
        }
      }
      switch (c.state) {
        case 'walk': {
          const tgt = c.path[0];
          if (!tgt) { c.state = 'stand'; c.timer = 1; break; }
          const dx = tgt.x - c.x, dy = tgt.y - c.y, d = Math.hypot(dx, dy);
          if (Math.abs(dx) > 2) c.face = dx > 0 ? 1 : -1;
          const sp = c.speed * clamp(d / 14, 0.35, 1) * (RM ? 0.4 : 1);
          if (d < 1.2) {
            c.path.shift();
            if (!c.path.length) {
              if (c.wading) { c.state = 'wade'; c.timer = R(7, 12); c.dipPh = 0; c.face = c.wading.x < pond.cx ? 1 : -1; }
              else craneIdle();
            }
          } else {
            const step = Math.min(d, sp * dt);
            c.x += dx / d * step; c.y += dy / d * step;
            c.legPh += step / 15 * Math.PI;
          }
          c.neckT = 4 * Math.sin(c.legPh * 2); c.tiltT = 3; c.liftT = 0;
          break;
        }
        case 'stand':
          c.timer -= dt; c.glance -= dt;
          if (c.glance <= 0) { c.glance = R(1.2, 3); c.neckT = R(-8, 10); if (Math.random() < 0.2) c.face = -c.face; }
          if (c.timer <= 0) craneNext();
          break;
        case 'preen':
          c.timer -= dt; c.neckT = -132 + Math.sin(T * 5) * 6; c.tiltT = -4; c.liftT = -2;
          if (c.timer <= 0) { c.state = 'stand'; c.timer = R(1, 2.5); c.neckT = 0; c.tiltT = 0; c.liftT = 0; }
          break;
        case 'wade': {
          c.timer -= dt; c.dipPh += dt / 2.8;
          const ph = c.dipPh % 1;
          const dip = ph > 0.45 && ph < 0.8 ? Math.sin((ph - 0.45) / 0.35 * Math.PI) : 0;
          c.neckT = 100 * dip; c.tiltT = 26 * dip; c.liftT = 5 * dip;
          if (dip > 0.97 && !c.rippled && G.fx && !RM) {
            c.rippled = true;
            G.fx.ripple(c.x + c.face * 30, c.y - 8, { radius: 16, squash: 0.35, alpha: 0.55, count: 2, gap: 260 });
          }
          if (dip < 0.2) c.rippled = false;
          if (c.timer <= 0 && dip === 0) { c.wading = null; craneNext(); }
          break;
        }
        case 'alert':
          c.timer -= dt;
          if (c.timer <= 0) {
            c.neckT = 0; c.tiltT = 0; c.liftT = 0;
            // walk calmly away from the pointer
            const cands = [zoneSpot(CR_ZONES[0]), zoneSpot(CR_ZONES[0]), zoneSpot(CR_ZONES[1]), zoneSpot(CR_ZONES[1])];
            let best = cands[0], bd = -1;
            for (const s of cands) {
              const d = dist(s.x, s.y, pointerActive() ? pointer.x : c.x, pointerActive() ? pointer.y : c.y) - Math.abs(s.x - c.x) * 0.5;
              if (d > bd) { bd = d; best = s; }
            }
            craneWalkTo(best, false, 24);
          }
          break;
        case 'stretch': {
          c.timer -= dt;
          const p = 1 - c.timer / 3.2;
          c.wingT = Math.sin(clamp(p, 0, 1) * Math.PI);
          c.neckT = -14 * c.wingT; c.liftT = 3 * c.wingT;
          if (c.timer <= 0) { c.wingT = 0; c.state = 'stand'; c.timer = R(2, 4); }
          break;
        }
      }
      // smoothing
      c.neckA = approach(c.neckA, c.neckT, c.state === 'alert' ? 9 : 3.2, dt);
      c.tilt = approach(c.tilt, c.tiltT, 3, dt);
      c.lift = approach(c.lift, c.liftT, 4, dt);
      c.faceV = approach(c.faceV, c.face, 7, dt);
      c.walkAmt = approach(c.walkAmt, c.state === 'walk' ? 1 : 0, 5, dt);
      const bob = -Math.abs(Math.sin(c.legPh)) * 2 * c.walkAmt;
      const rotA = c.tilt * 0.7 + c.neckA * 0.1 + 2 * c.walkAmt * Math.sin(c.legPh);
      c.upper.setAttribute('transform', 'translate(0 ' + f1(bob - c.lift) + ') rotate(' + f1(rotA) + ')');
      const fv = Math.abs(c.faceV) < 0.08 ? (c.faceV < 0 ? -0.08 : 0.08) : c.faceV;
      c.flip.setAttribute('transform', 'scale(' + f1(fv * 100) / 100 + ' 1)');
      c.g.setAttribute('transform', 'translate(' + f1(c.x) + ' ' + f1(c.y) + ')');
    }

    // =========================================================================
    // WHITE RABBIT
    // =========================================================================
    const rabbit = (function () {
      const g = mk('g', {}, gLand);
      const flip = mk('g', {}, g);
      const body = mk('g', {}, flip);
      mk('image', { href: SPR('rabbit'), x: -12.4, y: -30, width: 24.8, height: 30 }, body);
      const head = mk('g', {}), ears = mk('g', {});
      return {
        g, flip, body, head, ears, x: 200, y: 768, face: 1, faceV: 1, zone: 0, state: 'sit', timer: R(2, 4),
        hops: 0, hopT: 0, hx0: 0, hy0: 0, hx1: 0, hy1: 0, target: null, twitch: 0, earA: 0, earT: 0, nib: 0, fleeing: false,
      };
    })();
    const RB_ZONES = [{ x0: 50, x1: 350, y0: 650, y1: 788 }, { x0: 1160, x1: 1410, y0: 668, y1: 788 }];
    function rabbitPlan(away) {
      const r = rabbit, z = RB_ZONES[r.zone];
      let t = { x: R(z.x0, z.x1), y: R(z.y0, z.y1) };
      if (away && pointerActive()) {
        let best = t, bd = -1;
        for (let i = 0; i < 6; i++) {
          const s = { x: R(z.x0, z.x1), y: R(z.y0, z.y1) }, d = dist(s.x, s.y, pointer.x, pointer.y);
          if (d > bd) { bd = d; best = s; }
        }
        t = best;
      }
      // avoid the crane's feet
      if (dist(t.x, t.y, crane.x, crane.y) < 40) t.x += t.x < crane.x ? -40 : 40;
      t.x = clamp(t.x, z.x0, z.x1);
      r.target = t; r.state = 'hop'; r.hopT = -0.1; r.fleeing = !!away;
    }
    function rabbitUpdate(dt, T) {
      const r = rabbit;
      const near = pointerActive() && dist(pointer.x, pointer.y, r.x, r.y - 10) < 100;
      if (near && (r.state === 'sit' || r.state === 'hop') && !r.fleeing && !RM) { r.state = 'freeze'; r.timer = 1.6; }
      let hopY = 0, sx = 1, sy = 1;
      switch (r.state) {
        case 'sit':
          r.timer -= dt; r.twitch -= dt;
          if (r.twitch <= 0) { r.twitch = R(0.6, 2.2); r.earT = R(-14, 8); }
          r.nib = Math.max(0, Math.sin(T * 9)) * (Math.sin(T * 0.7) > 0.2 ? 1 : 0);
          if (r.timer <= 0) rabbitPlan(false);
          break;
        case 'freeze':
          r.timer -= dt; r.earT = -2; r.nib = 0;
          if (!near && r.timer < 0.9) { r.state = 'sit'; r.timer = R(1.5, 3); }
          else if (r.timer <= 0) rabbitPlan(true);
          break;
        case 'hop': {
          r.nib = 0; r.earT = 12;
          const t = r.target, dx = t.x - r.x, dy = t.y - r.y, d = Math.hypot(dx, dy);
          if (r.hopT < 0) {
            r.hopT += dt;
            if (r.hopT >= 0) {
              if (d < 3) { r.state = 'sit'; r.fleeing = false; r.timer = R(3, 8); break; }
              const len = Math.min(d, r.fleeing ? 34 : R(20, 30));
              r.hx0 = r.x; r.hy0 = r.y; r.hx1 = r.x + dx / d * len; r.hy1 = r.y + dy / d * len;
              if (Math.abs(dx) > 2) r.face = dx > 0 ? 1 : -1;
            }
          } else {
            const dur = r.fleeing ? 0.34 : 0.44;
            r.hopT += dt / (RM ? dur * 3 : dur);
            const p = clamp(r.hopT, 0, 1), e = easeInOut(p);
            r.x = lerp(r.hx0, r.hx1, e); r.y = lerp(r.hy0, r.hy1, e);
            hopY = -Math.sin(p * Math.PI) * (r.fleeing ? 10 : 8);
            sx = 1 + Math.sin(p * Math.PI) * 0.12; sy = 1 - Math.sin(p * Math.PI) * 0.06;
            if (p >= 1) r.hopT = -(r.fleeing ? 0.08 : R(0.12, 0.35));
          }
          break;
        }
      }
      r.earA = approach(r.earA, r.earT, 10, dt);
      r.faceV = approach(r.faceV, r.face, 12, dt);
      r.ears.setAttribute('transform', 'rotate(' + f1(r.earA) + ' 5.5 -14)');
      r.head.setAttribute('transform', 'rotate(' + f1(r.nib * 7) + ' 4 -10)');
      r.body.setAttribute('transform', 'scale(' + f1(sx * 100) / 100 + ' ' + f1(sy * 100) / 100 + ')');
      const fv = Math.abs(r.faceV) < 0.1 ? (r.faceV < 0 ? -0.1 : 0.1) : r.faceV;
      r.flip.setAttribute('transform', 'translate(0 ' + f1(hopY) + ') scale(' + f1(fv * 100) / 100 + ' 1)');
      r.g.setAttribute('transform', 'translate(' + f1(r.x) + ' ' + f1(r.y) + ')');
    }

    // =========================================================================
    // BUTTERFLIES
    // =========================================================================
    const BF_IMGS = ['a', 'b', 'c', 'd'].map(k => SPR('butterfly-' + k));
    function makeButterfly(src, i) {
      const g = mk('g', {}, gFlies);
      const rot = mk('g', {}, g);
      const wg = mk('g', {}, rot);
      mk('image', { href: src, x: -10, y: -6.7, width: 20, height: 13.3 }, wg);
      const wings = [wg];
      return {
        g, rot, wings, x: R(200, 1240), y: R(380, 720), vx: R(-20, 20), vy: R(-10, 10), heading: R(0, TAU),
        state: 'fly', target: null, timer: 0, seed: R(0, 100), perch: null, alpha: 1, flapPh: R(0, TAU), wobble: R(0.8, 1.4),
      };
    }
    const butterflies = BF_IMGS.map(makeButterfly);
    const occupied = new Set();
    function bfPickTarget(b) {
      const all = G.getPerches('any').filter(p => (p.kind === 'flower' || p.kind === 'any') && !occupied.has(p.id) && p.y > 70);
      if (all.length && Math.random() < 0.8) {
        // prefer nearby perches a bit
        all.sort((a, c) => dist(a.x, a.y, b.x, b.y) - dist(c.x, c.y, b.x, b.y));
        const p = all[Math.floor(Math.pow(Math.random(), 1.6) * all.length)];
        occupied.add(p.id); b.perch = p.id;
        b.target = { x: p.x, y: p.y, perch: true };
      } else {
        b.perch = null;
        b.target = { x: R(120, 1320), y: R(330, 740), perch: false };
      }
      b.state = 'fly';
    }
    butterflies.forEach(bfPickTarget);

    function bfUpdate(b, i, dt, T, night) {
      b.alpha = approach(b.alpha, night ? 0 : 1, 1.2, dt);
      if (b.alpha < 0.02 && night) { b.g.setAttribute('opacity', 0); return; }
      let flap;
      if (b.state === 'rest') {
        b.timer -= dt;
        flap = 0.2 + 0.8 * (0.5 + 0.5 * Math.cos(T * 1.5 + b.seed));
        const nearPtr = pointerActive() && !pointerIdle(2500) && dist(pointer.x, pointer.y, b.x, b.y) < 40;
        if (b.timer <= 0 || nearPtr || (b.perch && !G.getPerches('any').some(p => p.id === b.perch))) {
          if (b.perch) occupied.delete(b.perch);
          b.perch = null; b.vy = -30; b.vx = R(-20, 20);
          bfPickTarget(b);
        }
      } else {
        // pointer charm: two butterflies drift to an idle pointer and circle it
        let tx = b.target.x, ty = b.target.y, charm = false;
        if (i < 2 && pointerIdle(3500) && pointer.y > 90 && pointer.y < 800) {
          const a = T * 0.7 + i * Math.PI;
          tx = pointer.x + Math.cos(a) * 46; ty = pointer.y - 26 + Math.sin(a) * 26; charm = true;
        }
        const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
        const sp = (charm ? 38 : 58) * clamp(d / 60, 0.25, 1) * (RM ? 0.4 : 1);
        // perpendicular wobble for curvy, fluttery paths
        const w = Math.sin(T * 2.3 * b.wobble + b.seed) * 0.9 + Math.sin(T * 5.1 + b.seed * 2) * 0.35;
        const fade = clamp(d / 50, 0, 1);
        const desx = dx / d * sp + (-dy / d) * w * 30 * fade, desy = dy / d * sp + (dx / d) * w * 30 * fade - Math.sin(T * 7 + b.seed) * 10 * fade;
        b.vx = approach(b.vx, desx, 2.6, dt); b.vy = approach(b.vy, desy, 2.6, dt);
        b.x += (b.vx + (G.wind && G.wind.at ? G.wind.at(b.x, b.y, T) * 12 : 0)) * dt; b.y += b.vy * dt;
        flap = RM ? 0.75 : 0.2 + 0.8 * Math.abs(Math.cos(T * 31 + b.seed));
        if (!charm && b.target.perch && d < 4) {
          b.state = 'rest'; b.timer = R(3, 8); b.x = tx; b.y = ty; b.vx = b.vy = 0;
        } else if (!charm && !b.target.perch && d < 10) bfPickTarget(b);
      }
      if (b.state !== 'rest') {
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 4) b.heading = b.heading + clamp(angDiff(b.heading, Math.atan2(b.vy, b.vx)), -4 * dt, 4 * dt);
      }
      b.rot.setAttribute('transform', 'rotate(' + f1(deg(b.heading) + 90) + ')');
      const s = f1(Math.max(0.2, flap) * 100) / 100;
      b.wings[0].setAttribute('transform', 'scale(' + s + ' 1)');
      b.g.setAttribute('transform', 'translate(' + f1(b.x) + ' ' + f1(b.y) + ')');
      b.g.setAttribute('opacity', f1(b.alpha * 100) / 100);
    }

    // =========================================================================
    // SONGBIRDS
    // =========================================================================
    const BIRD_SPECS = [{ img: SPR('bird-a'), w: 24, h: 20.3, dir: -1 }, { img: SPR('bird-b'), w: 24, h: 17.7, dir: 1 }];
    function makeBird(c, i) {
      const g = mk('g', { opacity: 0 }, gBirds);
      const flip = mk('g', {}, g);
      mk('image', { href: c.img, x: -c.w / 2, y: -c.h, width: c.w, height: c.h }, flip);
      const legs = mk('g', {}), head = mk('g', {}), wing = mk('g', {});
      return {
        g, flip, head, wing, legs, dir: c.dir, state: 'away', timer: R(8, 22) + i * 12, x: -40, y: 200, face: 1,
        fx0: 0, fy0: 0, fx1: 0, fy1: 0, ft: 0, fdur: 1, perch: null, tilt: 0, tiltT: 0, act: 0, hopY: 0, hopT: 1, leaving: false, alpha: 0,
      };
    }
    const birds = BIRD_SPECS.map(makeBird);
    const birdTaken = new Set();
    function birdFly(bd, tx, ty, leaving) {
      bd.fx0 = bd.x; bd.fy0 = bd.y; bd.fx1 = tx; bd.fy1 = ty; bd.ft = 0;
      bd.fdur = clamp(dist(bd.x, bd.y, tx, ty) / 150, 0.6, 7);
      bd.face = tx >= bd.x ? 1 : -1; bd.state = 'fly'; bd.leaving = leaving;
    }
    function birdArrive(bd) {
      let ps = G.getPerches('string');
      if (!ps.length) ps = G.getPerches('any').filter(p => p.kind === 'stone' || p.kind === 'any');
      ps = ps.filter(p => !birdTaken.has(p.id) && p.y > 75);
      const fromLeft = Math.random() < 0.5;
      bd.x = fromLeft ? -30 : 1470; bd.y = R(110, 260);
      bd.alpha = 1;
      if (!ps.length) { birdFly(bd, fromLeft ? 1480 : -40, R(120, 300), true); return; }
      const p = pick(ps); birdTaken.add(p.id); bd.perch = p;
      birdFly(bd, p.x, p.y, false);
    }
    function birdUpdate(bd, dt, T, night) {
      if (bd.state === 'away') {
        bd.timer -= dt;
        if (bd.timer <= 0) {
          if (night || RM) { bd.timer = R(30, 60); return; }
          birdArrive(bd);
        } else { if (bd.alpha) { bd.alpha = 0; bd.g.setAttribute('opacity', 0); } return; }
      }
      let wingRot = 0, wingSy = 1;
      if (bd.state === 'fly') {
        bd.ft += dt / bd.fdur;
        const p = clamp(bd.ft, 0, 1), e = bd.leaving ? p * p * (1.5 - 0.5 * p) : 1 - Math.pow(1 - p, 2.2);
        const D = dist(bd.fx0, bd.fy0, bd.fx1, bd.fy1);
        const traveled = e * D;
        const bound = Math.sin(traveled / 46 * Math.PI);
        const arc = -Math.sin(p * Math.PI) * Math.min(bd.leaving ? 30 : 60, D * 0.15);
        bd.x = lerp(bd.fx0, bd.fx1, e);
        bd.y = lerp(bd.fy0, bd.fy1, e) + arc - Math.abs(bound) * 7 * (1 - Math.pow(p, 6));
        const flapping = Math.cos(traveled / 46 * Math.PI) * bound > 0 || p > 0.85;
        wingRot = flapping ? Math.sin(T * 38) * 50 : -10;
        wingSy = flapping ? 0.6 + 0.4 * Math.abs(Math.cos(T * 38)) : 0.7;
        bd.legs.setAttribute('opacity', p > 0.9 ? 1 : 0);
        if (p >= 1) {
          if (bd.leaving) { bd.state = 'away'; bd.timer = R(30, 90); bd.alpha = 0; bd.g.setAttribute('opacity', 0); return; }
          bd.state = 'perch'; bd.timer = R(10, 30); bd.act = R(0.8, 2);
          bd.legs.setAttribute('opacity', 1);
        }
      } else if (bd.state === 'perch') {
        bd.timer -= dt; bd.act -= dt;
        const perchGone = bd.perch && !G.getPerches('any').some(p => p.id === bd.perch.id);
        const scared = pointerActive() && dist(pointer.x, pointer.y, bd.x, bd.y - 6) < 40;
        if (bd.act <= 0) {
          bd.act = R(0.9, 2.4);
          const r = Math.random();
          if (r < 0.45) bd.tiltT = R(-28, 22);
          else if (r < 0.7) { bd.hopT = 0; if (Math.random() < 0.5) bd.face = -bd.face; }
          else if (r < 0.82) {
            // hop to a neighbouring free perch on the string
            const ns = G.getPerches('string').filter(p => !birdTaken.has(p.id) && dist(p.x, p.y, bd.x, bd.y) < 110 && dist(p.x, p.y, bd.x, bd.y) > 8);
            if (ns.length) {
              const p = pick(ns); birdTaken.delete(bd.perch && bd.perch.id); birdTaken.add(p.id); bd.perch = p;
              birdFly(bd, p.x, p.y, false); bd.fdur = 0.7;
            }
          } else if (r < 0.9) {
            const s = G.sound;
            if (s && typeof s.chirp === 'function' && s.isAmbient && s.isAmbient()) { try { s.chirp(); } catch (e) { /* ignore */ } }
            bd.tiltT = -12;
          } else bd.tiltT = 0;
        }
        if (bd.state === 'perch' && (bd.timer <= 0 || perchGone || scared)) {
          if (bd.perch) birdTaken.delete(bd.perch.id);
          bd.perch = null;
          const right = bd.x > 720 ? Math.random() < 0.8 : Math.random() < 0.2;
          birdFly(bd, right ? 1490 : -50, R(90, 220), true);
        }
        if (bd.hopT < 1) { bd.hopT += dt / 0.28; bd.hopY = -Math.sin(clamp(bd.hopT, 0, 1) * Math.PI) * 4; } else bd.hopY = 0;
        wingRot = 0; wingSy = 1;
      }
      bd.tilt = approach(bd.tilt, bd.state === 'perch' ? bd.tiltT : 0, 9, dt);
      bd.flip.setAttribute('transform', 'translate(0 ' + f1(bd.hopY + (bd.state === 'fly' ? 0 : -Math.max(0, bd.tilt) * 0.05)) + ') scale(' + bd.face * bd.dir + ' 1)');
      bd.g.setAttribute('transform', 'translate(' + f1(bd.x) + ' ' + f1(bd.y) + ')');
      bd.g.setAttribute('opacity', 1);
    }

    // =========================================================================
    // DRAGONFLY
    // =========================================================================
    const dragon = (function () {
      const g = mk('g', {}, gDragon);
      const rot = mk('g', {}, g);
      const wings = mk('g', {}, rot);
      for (const s of [1, -1]) {
        mk('ellipse', { cx: s * 7.5, cy: -2.2, rx: 7.5, ry: 1.7, transform: 'rotate(' + (s * -8) + ' ' + s * 7.5 + ' -2.2)', fill: P.skyLight, 'fill-opacity': 0.45, stroke: P.cream, 'stroke-opacity': 0.8, 'stroke-width': 0.35 }, wings);
        mk('ellipse', { cx: s * 6.8, cy: 1.4, rx: 6.8, ry: 1.6, transform: 'rotate(' + (s * 10) + ' ' + s * 6.8 + ' 1.4)', fill: P.skyLight, 'fill-opacity': 0.45, stroke: P.cream, 'stroke-opacity': 0.8, 'stroke-width': 0.35 }, wings);
      }
      mk('path', { class: 'a-line', d: 'M0 1 L0 17', stroke: P.cobalt, 'stroke-width': 1.5 }, rot);
      mk('path', { class: 'a-line', d: 'M-0.9 4h1.8M-0.9 7h1.8M-0.9 10h1.8M-0.9 13h1.8', stroke: P.mint, 'stroke-width': 0.4 }, rot);
      mk('ellipse', { cx: 0, cy: -0.4, rx: 1.4, ry: 2.4, fill: '#2E8C8A' }, rot);
      mk('circle', { cx: -0.9, cy: -3.2, r: 1, fill: P.mint }, rot);
      mk('circle', { cx: 0.9, cy: -3.2, r: 1, fill: P.mint }, rot);
      return { g, rot, wings, x: 560, y: 640, tx: 560, ty: 640, hx: 560, hy: 640, timer: 2, heading: 0, alpha: 1, rest: 0 };
    })();
    function dragonPick() {
      const d = dragon, pp = pads();
      if (pp.length && Math.random() < 0.4) { const p = pick(pp); d.hx = p.x; d.hy = p.y - 4; d.rest = 1; }
      else {
        const a = R(0, TAU), k = R(0.85, 1.12);
        d.hx = pond.cx + Math.cos(a) * pond.rx * k; d.hy = pond.cy + Math.sin(a) * pond.ry * k - R(6, 30); d.rest = 0;
      }
      d.timer = R(2.5, 6);
    }
    function dragonUpdate(dt, T, night) {
      const d = dragon;
      d.alpha = approach(d.alpha, night ? 0 : 1, 1.2, dt);
      if (night && d.alpha < 0.02) { d.g.setAttribute('opacity', 0); return; }
      d.timer -= dt;
      if (d.timer <= 0) dragonPick();
      // pointer: dart away
      if (pointerActive() && dist(pointer.x, pointer.y, d.x, d.y) < 60 && d.timer > 0.4) { d.timer = 0.01; }
      const px = d.x, py = d.y;
      const hover = d.rest ? 0 : 1;
      const tx = d.hx + Math.sin(T * 1.7) * 3 * hover, ty = d.hy + Math.sin(T * 2.3 + 1) * 2 * hover;
      d.x = approach(d.x, tx, RM ? 1 : 6, dt); d.y = approach(d.y, ty, RM ? 1 : 6, dt);
      const vx = (d.x - px) / Math.max(dt, 1e-3), vy = (d.y - py) / Math.max(dt, 1e-3);
      if (Math.hypot(vx, vy) > 25) d.heading = d.heading + clamp(angDiff(d.heading, Math.atan2(vy, vx) + Math.PI / 2), -8 * dt, 8 * dt);
      const shimmer = RM ? 1 : (d.rest && Math.hypot(vx, vy) < 5 ? 1 : 0.82 + 0.18 * Math.sin(T * 70));
      d.wings.setAttribute('transform', 'scale(1 ' + f1(shimmer * 100) / 100 + ')');
      d.rot.setAttribute('transform', 'rotate(' + f1(deg(d.heading)) + ') scale(0.85)');
      d.g.setAttribute('transform', 'translate(' + f1(d.x) + ' ' + f1(d.y) + ')');
      d.g.setAttribute('opacity', f1(d.alpha * 90) / 100);
    }

    // =========================================================================
    // FIREFLIES
    // =========================================================================
    const fireflies = [];
    for (let i = 0; i < 18; i++) {
      const g = mk('g', {}, gFire);
      mk('circle', { r: 10, fill: P.butter, 'fill-opacity': 0.12 }, g);
      mk('circle', { r: 5, fill: P.butter, 'fill-opacity': 0.3 }, g);
      mk('circle', { r: 2.4, fill: '#FFF3A6', 'fill-opacity': 0.85 }, g);
      mk('circle', { r: 1.2, fill: '#FFFDE8' }, g);
      fireflies.push({
        g, bx: sr(60, 1380), by: sr(300, 790), ax: sr(30, 80), ay: sr(15, 40), fx: sr(0.03, 0.08), fy: sr(0.04, 0.1),
        p1: sr(0, TAU), p2: sr(0, TAU), blink: sr(2.5, 5.5), bp: sr(0, 1),
      });
    }
    let fireA = 0;
    function fireUpdate(dt, T, night) {
      fireA = approach(fireA, night ? 1 : 0, 0.8, dt);
      if (fireA < 0.01 && !night) { if (fireA !== 0) { fireA = 0; gFire.setAttribute('opacity', 0); } return; }
      gFire.setAttribute('opacity', f1(fireA * 100) / 100);
      const sp = RM ? 0.3 : 1;
      for (const f of fireflies) {
        const x = f.bx + Math.sin(T * f.fx * TAU * sp + f.p1) * f.ax + Math.sin(T * 0.13 * sp + f.p2) * 20;
        const y = f.by + Math.sin(T * f.fy * TAU * sp + f.p2) * f.ay;
        const ph = ((T / f.blink) + f.bp) % 1;
        const glow = ph < 0.5 ? Math.sin(ph / 0.5 * Math.PI) : 0;
        const o = 0.22 + 0.78 * glow;
        f.g.setAttribute('transform', 'translate(' + f1(x) + ' ' + f1(y) + ') scale(' + f1((0.7 + 0.4 * glow) * 100) / 100 + ')');
        f.g.setAttribute('opacity', f1(o * 100) / 100);
      }
    }

    // loop (shared ticker)
    let paused = false, T = R(0, 100);
    function step(dt) {
      T += dt;
      const night = isNight();
      if (splash) { splash.t -= dt; if (splash.t <= 0) splash = null; }
      try {
        for (let i = 0; i < kois.length; i++) koiUpdate(kois[i], dt, T);
        craneUpdate(dt, T);
        rabbitUpdate(dt, T);
        for (let i = 0; i < butterflies.length; i++) bfUpdate(butterflies[i], i, dt, T, night);
        for (let i = 0; i < birds.length; i++) birdUpdate(birds[i], dt, T, night);
        dragonUpdate(dt, T, night);
        fireUpdate(dt, T, night);
      } catch (e) {
        console.error('[animals]', e);
      }
    }
    step(0.016); // initial pose
    if (G.wind && G.wind.onTick) G.wind.onTick((t, dt) => { if (!paused) step(clamp(dt > 0 ? dt : 0.016, 0.001, 0.05)); });

    return {
      pause() { paused = true; },
      resume() { paused = false; },
      _step: step, // debug hook (perf checks)
    };
  });
})();
