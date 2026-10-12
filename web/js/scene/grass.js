/* Garden of Days — grass, reeds and wildflowers that live in the wind.

   Each blade is a damped angular spring:   θ'' = k(θ* − θ) − cθ'
   with its target lean θ* = flex · w(x, t) + rest + pointer parting.
   Blades are drawn as tapered quadratic curves, batched by colour so a
   thousand of them cost a handful of fill calls per frame. */
(function () {
  'use strict';
  const G = window.Garden;

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rnd = mulberry32(20261002);
  const R = (a, b) => a + rnd() * (b - a);

  const DAY = {
    blades: ['#2F6B3A', '#3E7E47', '#4E8F55', '#6FAE6A', '#9ED89A', '#B9D9A8'],
    reed: '#557A4A', cattail: '#7A5240',
    flowers: ['#F4B3CC', '#F3E79A', '#E0262B', '#3B3FC7', '#FBF5EC', '#F08A2E'],
  };
  const NIGHT = {
    blades: ['#1F3F3A', '#29504A', '#33605A', '#4B7A72', '#6E9C92', '#86A79D'],
    reed: '#38554B', cattail: '#4A3A40',
    flowers: ['#B98BB0', '#C9C08A', '#9E3045', '#3A3E9C', '#C9C4D8', '#B57049'],
  };
  const DUSK = {
    blades: ['#3A5E3C', '#4A6F48', '#5E8256', '#80A06E', '#AFC994', '#C6CFA2'],
    reed: '#5E6C48', cattail: '#7A4E40',
    flowers: ['#F2A4BE', '#F2D98A', '#D8343A', '#4A47B8', '#F6E6DE', '#EE8336'],
  };
  let pal = DAY;

  const pond = G.LAYOUT.pond;
  function inPond(x, y, pad) {
    const dx = (x - pond.cx) / (pond.rx * pad), dy = (y - pond.cy) / (pond.ry * pad);
    return dx * dx + dy * dy < 1;
  }
  function blocked(x, y) {
    if (inPond(x, y, 1.1)) return true;
    if (y > 792 && x > 280 && x < 1160) return true; // analytics pebble
    if (x > 1110 && x < 1240 && y < 652) return true; // cairn stones
    if (x < 70 && y > 600 && y < 640) return true; // plum branch base
    return false;
  }

  // ---- Build the meadow -----------------------------------------------------
  function makeBlade(x, y, o) {
    return {
      x, y, L: o.L, w: o.w, color: o.color, rest: o.rest, flex: o.flex,
      k: o.k, c: o.c, th: o.rest, v: 0, kind: o.kind || 'blade', head: o.head, phase: R(0, 6.28),
    };
  }

  function tuft(list, cx, cy, n, scale) {
    for (let i = 0; i < n; i++) {
      const x = cx + R(-14, 14) * scale, y = cy + R(-3, 3);
      if (blocked(x, y)) continue;
      const tall = R(0.6, 1.25);
      list.push(makeBlade(x, y, {
        L: R(12, 30) * scale * tall, w: R(2.2, 4.2) * scale, color: Math.floor(R(0, 6)),
        rest: R(-0.35, 0.35) + (x - cx) * 0.012, flex: R(0.35, 0.7) / tall, k: R(14, 26), c: R(3, 5),
      }));
    }
  }

  function buildBack() {
    const list = [];
    // Tufts scattered across the ground band, denser toward the edges of the scene.
    for (let i = 0; i < 95; i++) {
      const x = R(0, 1440), y = R(600, 800);
      if (blocked(x, y)) continue;
      const depth = (y - 600) / 200; // 0 far → 1 near
      tuft(list, x, y, Math.round(R(5, 11)), 0.7 + depth * 0.5);
    }
    // Reeds hugging the far shore of the pond, a few with cattails.
    for (let i = 0; i < 46; i++) {
      const a = R(Math.PI * 1.05, Math.PI * 1.95); // back half of the pond
      const x = pond.cx + Math.cos(a) * pond.rx * R(1.0, 1.1), y = pond.cy + Math.sin(a) * pond.ry * R(1.0, 1.12);
      if (y < 596) continue;
      const L = R(30, 64);
      list.push(makeBlade(x, y, {
        L, w: R(1.6, 2.6), color: -1, kind: 'reed', head: rnd() < 0.35,
        rest: R(-0.12, 0.12), flex: R(0.25, 0.45), k: R(10, 16), c: R(2.2, 3.4),
      }));
    }
    // Wildflowers on fine stems.
    for (let i = 0; i < 64; i++) {
      const x = R(0, 1440), y = R(604, 800);
      if (blocked(x, y)) continue;
      list.push(makeBlade(x, y, {
        L: R(14, 34), w: 1.1, color: Math.floor(R(0, 6)), kind: 'flower',
        rest: R(-0.2, 0.2), flex: R(0.4, 0.7), k: R(12, 20), c: R(2.5, 4),
      }));
    }
    list.sort((a, b) => a.y - b.y);
    return list;
  }

  function buildFront() {
    const list = [];
    const corner = (x0, x1) => {
      for (let i = 0; i < 26; i++) {
        const x = R(x0, x1), y = R(872, 906);
        for (let j = 0; j < 7; j++) {
          list.push(makeBlade(x + R(-16, 16), y + R(-2, 2), {
            L: R(28, 66), w: R(3.5, 6), color: Math.floor(R(0, 4)),
            rest: R(-0.3, 0.3), flex: R(0.3, 0.55), k: R(9, 15), c: R(2.2, 3.4),
          }));
        }
      }
      for (let i = 0; i < 7; i++) {
        list.push(makeBlade(R(x0, x1), R(880, 900), { L: R(40, 70), w: 1.3, color: Math.floor(R(0, 6)), kind: 'flower', rest: R(-0.2, 0.2), flex: 0.5, k: 12, c: 3 }));
      }
    };
    corner(-20, 250);
    corner(1190, 1460);
    list.sort((a, b) => a.y - b.y);
    return list;
  }

  // ---- Canvas plumbing --------------------------------------------------------
  function makeCanvas(parent, box, cls) {
    const cv = document.createElement('canvas');
    cv.className = cls;
    Object.assign(cv.style, { position: 'absolute', left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px', pointerEvents: 'none' });
    parent.appendChild(cv);
    return { cv, c: cv.getContext('2d'), box, k: 1 };
  }
  function sizeCanvas(s) {
    const k = Math.min(2.5, (G.view.scale || 1) * (window.devicePixelRatio || 1));
    s.k = k;
    s.cv.width = Math.round(s.box.w * k); s.cv.height = Math.round(s.box.h * k);
  }

  function step(list, t, dt) {
    const p = G.pointer, near = p.inside;
    for (const b of list) {
      let target = b.rest + b.flex * G.wind.at(b.x, b.y, t);
      // Tiny independent flutter so neighbours never move in lockstep.
      target += 0.035 * Math.sin(t * 2.3 + b.phase);
      if (near) {
        const dx = b.x - p.x, dy = (b.y - b.L * 0.5) - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 4900) { const f = 1 - Math.sqrt(d2) / 70; target += Math.sign(dx || 1) * 0.9 * f * f; }
      }
      const a = b.k * (target - b.th) - b.c * b.v;
      b.v += a * dt; b.th += b.v * dt;
    }
  }

  function draw(s, list) {
    const { c, box, k } = s;
    c.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
    c.clearRect(box.x, box.y, box.w, box.h);
    // Blades, batched by colour.
    for (let ci = 0; ci < pal.blades.length; ci++) {
      c.beginPath();
      for (const b of list) {
        if (b.kind !== 'blade' || b.color !== ci) continue;
        const s1 = Math.sin(b.th), c1 = Math.cos(b.th), s2 = Math.sin(b.th * 0.5), c2 = Math.cos(b.th * 0.5);
        const tx = b.x + b.L * s1, ty = b.y - b.L * c1;
        const cx = b.x + b.L * 0.5 * s2, cy = b.y - b.L * 0.58 * c2;
        c.moveTo(b.x - b.w / 2, b.y);
        c.quadraticCurveTo(cx - b.w * 0.2, cy, tx, ty);
        c.quadraticCurveTo(cx + b.w * 0.2, cy, b.x + b.w / 2, b.y);
      }
      c.fillStyle = pal.blades[ci];
      c.fill();
    }
    // Reeds and flower stems as fine strokes.
    c.lineCap = 'round';
    c.beginPath();
    for (const b of list) {
      if (b.kind === 'blade') continue;
      const tx = b.x + b.L * Math.sin(b.th), ty = b.y - b.L * Math.cos(b.th);
      const cx = b.x + b.L * 0.5 * Math.sin(b.th * 0.4), cy = b.y - b.L * 0.6;
      c.moveTo(b.x, b.y); c.quadraticCurveTo(cx, cy, tx, ty);
    }
    c.strokeStyle = pal.reed; c.lineWidth = 1.3; c.stroke();
    // Cattail heads.
    c.fillStyle = pal.cattail;
    for (const b of list) {
      if (b.kind !== 'reed' || !b.head) continue;
      const hx = b.x + b.L * 0.86 * Math.sin(b.th), hy = b.y - b.L * 0.86 * Math.cos(b.th);
      c.save(); c.translate(hx, hy); c.rotate(b.th); c.beginPath(); c.ellipse(0, 0, 2.6, 7, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    // Flower heads: a little stippled rosette of dots.
    for (let ci = 0; ci < pal.flowers.length; ci++) {
      c.beginPath();
      for (const b of list) {
        if (b.kind !== 'flower' || b.color !== ci) continue;
        const hx = b.x + b.L * Math.sin(b.th), hy = b.y - b.L * Math.cos(b.th);
        for (let j = 0; j < 5; j++) {
          const a = j * 1.2566 + b.phase;
          c.moveTo(hx + Math.cos(a) * 2.4 + 1.5, hy + Math.sin(a) * 2.4);
          c.arc(hx + Math.cos(a) * 2.4, hy + Math.sin(a) * 2.4, 1.5, 0, Math.PI * 2);
        }
      }
      c.fillStyle = pal.flowers[ci]; c.fill();
    }
    c.fillStyle = '#F3E79A';
    c.beginPath();
    for (const b of list) {
      if (b.kind !== 'flower') continue;
      const hx = b.x + b.L * Math.sin(b.th), hy = b.y - b.L * Math.cos(b.th);
      c.moveTo(hx + 1, hy); c.arc(hx, hy, 1, 0, Math.PI * 2);
    }
    c.fill();
  }

  G.registerLayer('grass', function (ctx) {
    const back = makeCanvas(document.getElementById('layer-backdrop'), { x: 0, y: 540, w: 1440, h: 270 }, 'grass-back');
    const frontLayer = document.getElementById('layer-front');
    const fl = makeCanvas(frontLayer, { x: 0, y: 800, w: 280, h: 100 }, 'grass-front');
    const fr = makeCanvas(frontLayer, { x: 1160, y: 800, w: 280, h: 100 }, 'grass-front');
    const backList = buildBack();
    const front = buildFront();
    const leftList = front.filter(b => b.x < 720), rightList = front.filter(b => b.x >= 720);

    const resize = () => [back, fl, fr].forEach(sizeCanvas);
    resize();
    G.on('resize', resize);

    const setPhase = () => { const p = G.timeOfDay(); pal = p === 'night' ? NIGHT : (p === 'dusk' || p === 'dawn') ? DUSK : DAY; };
    setPhase();
    G.on('phase', setPhase);

    let acc = 0;
    G.wind.onTick((t, dt) => {
      // Physics every frame; with reduced motion, settle and redraw rarely.
      if (ctx.reducedMotion) { acc += dt; if (acc < 0.5) return; acc = 0; }
      step(backList, t, dt); step(leftList, t, dt); step(rightList, t, dt);
      draw(back, backList); draw(fl, leftList); draw(fr, rightList);
    });
    return {};
  });
})();
