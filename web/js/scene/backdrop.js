/* Garden of Days — painted backdrop: sky, weeping willows, far garden, ground, stream.
 * Everything heavy is pre-rendered once to offscreen canvases (seeded, identical every launch);
 * only a handful of layer elements animate with CSS transforms. */
(function () {
  'use strict';

  const W = 1440, H = 900;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hex(c) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    const r = A.map((v, i) => Math.round(v + (B[i] - v) * t));
    return '#' + r.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Smooth closed blob path from an ellipse with sine wobble.
  function blobPoints(rng, cx, cy, rx, ry, wob, n) {
    n = n || 56; wob = wob == null ? 0.08 : wob;
    const harm = [];
    for (let k = 2; k <= 5; k++) harm.push([k, (rng() * 2 - 1) * wob / (k - 1) * 1.6, rng() * Math.PI * 2]);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      let r = 1;
      for (const [k, a, p] of harm) r += a * Math.sin(k * th + p);
      pts.push([cx + Math.cos(th) * rx * r, cy + Math.sin(th) * ry * r]);
    }
    return pts;
  }
  function pathSmooth(g, pts, scale, ox, oy) {
    scale = scale || 1; ox = ox || 0; oy = oy || 0;
    const P = pts.map(p => [ox + (p[0] - ox) * scale, oy + (p[1] - oy) * scale]);
    const n = P.length;
    g.beginPath();
    const m0 = [(P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2];
    g.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const p = P[i], q = P[(i + 1) % n];
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    g.closePath();
  }
  function bbox(pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1 };
  }

  // A stitched patch: fill + fine wavy contour lines (topographic embroidery).
  function patch(g, rng, o) {
    const pts = o.pts || blobPoints(rng, o.cx, o.cy, o.rx, o.ry, o.wob);
    const bb = bbox(pts);
    g.save();
    pathSmooth(g, pts);
    g.fillStyle = o.fill; g.globalAlpha = o.alpha == null ? 1 : o.alpha;
    g.fill();
    g.clip();
    g.globalAlpha = 1;
    g.strokeStyle = o.line || 'rgba(255,255,255,0.7)';
    g.lineWidth = o.lw || 0.7;
    const gap = o.gap || 3.4;
    if (o.mode === 'rings') {
      const cx = o.cx, cy = o.cy;
      for (let s = 1; s > 0.04; s -= gap / Math.max(o.rx, 1)) {
        pathSmooth(g, pts, s, cx, cy);
        g.stroke();
      }
    } else {
      const f1 = o.f1 || (0.012 + rng() * 0.02), f2 = 0.04 + rng() * 0.05;
      const A = o.amp == null ? 3 + rng() * 4 : o.amp;
      const p1 = rng() * 6, p2 = rng() * 6, tilt = o.tilt || 0;
      g.beginPath();
      for (let y = bb.y0 - 12; y < bb.y1 + 12; y += gap) {
        for (let x = bb.x0 - 4; x <= bb.x1 + 4; x += 6) {
          const yy = y + A * Math.sin(x * f1 + p1 + y * 0.045) + 1.2 * Math.sin(x * f2 + p2 + y * 0.11) + (x - bb.x0) * tilt;
          if (x <= bb.x0 - 4) g.moveTo(x, yy); else g.lineTo(x, yy);
        }
      }
      g.stroke();
    }
    g.restore();
  }

  // Stippled bush mound (dome) built from short horizontal stitches.
  function stippleMound(g, rng, o) {
    const { cx, cy, rx, ry } = o;
    g.save();
    g.globalAlpha = o.baseAlpha == null ? 0.55 : o.baseAlpha;
    g.fillStyle = o.base;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
    g.lineTo(cx + rx, cy + ry * 0.12);
    g.quadraticCurveTo(cx, cy + ry * 0.25, cx - rx, cy + ry * 0.12);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
    const n = o.count || Math.round(rx * ry * 0.35);
    for (let i = 0; i < n; i++) {
      const a = Math.PI + rng() * Math.PI;
      const rr = Math.sqrt(rng());
      const x = cx + Math.cos(a) * rx * rr;
      const y = cy + Math.sin(a) * ry * rr + rng() * ry * 0.12;
      g.fillStyle = o.colors[(rng() * o.colors.length) | 0];
      const w = o.dash ? 1.6 + rng() * 2.6 : 1.1 + rng() * 0.9;
      const h = o.dash ? 0.9 + rng() * 0.5 : w;
      g.fillRect(x - w / 2, y - h / 2, w, h);
    }
    g.restore();
  }

  function tuft(g, rng, x, y, o) {
    o = o || {};
    const n = o.n || (6 + (rng() * 8) | 0);
    const hgt = o.h || 14 + rng() * 16;
    const cols = o.colors || ['#4E8F55', '#2F6B3A', '#9ED89A', '#7BBF7A'];
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const bx = x + (rng() - 0.5) * (o.w || 14);
      const hh = hgt * (0.55 + rng() * 0.6);
      const lean = (rng() - 0.5) * hh * 0.8;
      g.strokeStyle = cols[(rng() * cols.length) | 0];
      g.lineWidth = 0.8 + rng() * 0.7;
      g.beginPath();
      g.moveTo(bx, y);
      g.quadraticCurveTo(bx + lean * 0.2, y - hh * 0.6, bx + lean, y - hh);
      g.stroke();
    }
    g.restore();
  }

  function wildflower(g, rng, x, y, color) {
    const h = 10 + rng() * 16, lean = (rng() - 0.5) * 8;
    g.strokeStyle = rgba('#4E8F55', 0.85); g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - h * 0.5, x + lean, y - h); g.stroke();
    g.fillStyle = color;
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2;
      g.beginPath(); g.arc(x + lean + Math.cos(a) * 1.6, y - h + Math.sin(a) * 1.6, 1.2, 0, 6.283); g.fill();
    }
    g.fillStyle = '#F08A2E';
    g.beginPath(); g.arc(x + lean, y - h, 0.9, 0, 6.283); g.fill();
  }

  // ---------------------------------------------------------------------------
  // Willows
  // ---------------------------------------------------------------------------
  const FAM = {
    pink: { body: '#F4B3CC', strands: ['#E99DBB', '#F4B3CC', '#F7C6D8', '#EFA6C3'], hi: '#FCE3EC', dot: '#D97FA5', rim: '#F9D3E2' },
    butter: { body: '#F3E79A', strands: ['#E8D777', '#F3E79A', '#F7EDB3', '#EDDC86'], hi: '#FFF8D8', dot: '#CDB955', rim: '#FAF2C6' },
    lav: { body: '#DCD6F4', strands: ['#C9C3EE', '#DCD6F4', '#EEEAFB', '#BDB6EA'], hi: '#F8F6FE', dot: '#9C95DE', rim: '#EFEBFC' },
  };
  function famFor(x) { return x < 560 ? 'pink' : x < 860 ? 'lav' : 'butter'; }
  function paleFam(f, t) {
    const sky = '#9AABE8', white = '#FBF5EC';
    const p = c => mix(mix(c, white, t * 0.45), sky, t * 0.4);
    return { body: p(f.body), strands: f.strands.map(p), hi: p(f.hi), dot: p(f.dot), rim: p(f.rim) };
  }

  // Draw one weeping willow into ctx (stage coords; ctx is pre-translated).
  function willow(g, rng, w) {
    const fam = w.pale ? paleFam(FAM[w.fam], w.pale) : FAM[w.fam];
    const { cx, top, r, bottom } = w;
    const domeH = r * (0.62 + rng() * 0.12);
    const yAt = x => { const d = clamp((x - cx) / r, -1, 1); return top + domeH * (1 - Math.sqrt(1 - d * d)); };
    const alpha = w.alpha == null ? 1 : w.alpha;
    g.save();
    g.globalAlpha = alpha;

    // soft body so the dome reads as a mass
    g.save();
    g.globalAlpha = alpha * 0.42;
    g.fillStyle = fam.body;
    g.beginPath();
    g.moveTo(cx - r, bottom);
    for (let x = cx - r; x <= cx + r; x += 4) g.lineTo(x, yAt(x) + 2);
    g.lineTo(cx + r, bottom);
    g.closePath();
    g.fill();
    g.restore();

    // hanging strands, batched per colour
    const spacing = w.spacing || 1.35;
    const nStr = Math.round((2 * r) / spacing);
    const batches = fam.strands.map(() => []);
    const dots = [];
    for (let i = 0; i < nStr; i++) {
      const x0 = cx - r + (i + rng()) * spacing;
      const d = (x0 - cx) / r;
      const y0 = yAt(x0) + rng() * 3;
      const edge = Math.abs(d);
      const len = (bottom - y0) * (0.72 + rng() * 0.3) * (1 - edge * edge * 0.25);
      const bow = d * (4 + rng() * 6) * (0.4 + edge);
      const ci = (rng() * batches.length) | 0;
      batches[ci].push([x0, y0, bow, len]);
      // stipple along the strand
      const step = 5 + rng() * 6;
      for (let t = rng() * step; t < len; t += step * (0.7 + rng() * 0.8)) {
        const u = t / len;
        const x = x0 + bow * u * u;
        dots.push([x, y0 + t, rng() < 0.55 ? fam.dot : fam.hi, u]);
      }
    }
    g.lineWidth = w.lw || 0.75;
    batches.forEach((list, ci) => {
      g.strokeStyle = fam.strands[ci];
      g.beginPath();
      for (const [x0, y0, bow, len] of list) {
        g.moveTo(x0, y0);
        g.quadraticCurveTo(x0 + bow * 0.25, y0 + len * 0.5, x0 + bow, y0 + len);
      }
      g.stroke();
    });
    for (const [x, y, c, u] of dots) {
      g.fillStyle = c;
      g.globalAlpha = alpha * (1 - u * 0.5);
      const s = 1.1 + (1 - u) * 0.4;
      g.fillRect(x - s / 2, y - s / 2, s, s);
    }
    g.globalAlpha = alpha;

    // crown: arching inner strands + a dense stippled rim
    g.lineWidth = 0.6;
    g.strokeStyle = fam.hi;
    g.beginPath();
    const arcs = 5 + ((rng() * 4) | 0);
    for (let k = 0; k < arcs; k++) {
      const rr = r * (0.35 + 0.6 * (k / arcs)) * (0.92 + rng() * 0.1);
      const dh = domeH * (rr / r);
      const yy = top + (domeH - dh) * 0.15 + 2;
      g.moveTo(cx - rr, yy + dh + 14 + rng() * 10);
      g.bezierCurveTo(cx - rr, yy, cx + rr, yy, cx + rr, yy + dh + 14 + rng() * 10);
    }
    g.globalAlpha = alpha * 0.8;
    g.stroke();
    g.globalAlpha = alpha;
    const rimN = Math.round(r * 5);
    for (let i = 0; i < rimN; i++) {
      const x = cx - r + rng() * 2 * r;
      const y = yAt(x) + Math.pow(rng(), 1.8) * 22;
      g.fillStyle = rng() < 0.6 ? fam.rim : fam.dot;
      const s = 1 + rng() * 0.9;
      g.fillRect(x - s / 2, y - s / 2, s, s);
    }
    g.restore();
  }

  // Willow layout (stage coords). Back paler and higher, front stronger and lower.
  // Pale procedural far row: fills the gaps behind the painted willow sprites.
  const WILLOW_LAYERS = [
    { id: 'back', y0: 150, y1: 600, fadeFrom: 470, fadeTo: 590, trees: [
      [40, 282, 92], [220, 262, 96], [410, 276, 100], [590, 252, 92], [745, 196, 84], [905, 262, 96],
      [1085, 248, 100], [1265, 268, 95], [1420, 250, 92],
    ].map(([cx, top, r]) => ({ cx, top, r, bottom: 560, pale: 0.66, alpha: 0.62, fam: famFor(cx), spacing: 1.8 })) },
  ];

  // Painted willow sprites (the heroes). cx/top in stage px, s = display scale of the PNG
  // (≤ 0.5 so they stay crisp), flip mirrors, depth 0 = back (hazed, small), 1 = front.
  const SPRITES = {
    'pink-a': { w: 781, h: 900 }, 'pink-b': { w: 814, h: 900 },
    'yellow-a': { w: 860, h: 900 }, 'yellow-b': { w: 845, h: 900 },
  };
  const TREES = [
    // back row
    { k: 'pink-b', cx: 150, top: 232, s: 0.33, flip: false, d: 0, op: 0.9 },
    { k: 'pink-a', cx: 395, top: 244, s: 0.32, flip: true, d: 0, op: 0.9 },
    { k: 'pink-b', cx: 610, top: 236, s: 0.31, flip: true, d: 0, op: 0.88 },
    { k: 'yellow-a', cx: 790, top: 214, s: 0.31, flip: false, d: 0, op: 0.85 },
    { k: 'yellow-b', cx: 1010, top: 240, s: 0.32, flip: true, d: 0, op: 0.85 },
    { k: 'yellow-a', cx: 1250, top: 236, s: 0.31, flip: true, d: 0, op: 0.7 },
    { k: 'yellow-b', cx: 1420, top: 246, s: 0.3, flip: false, d: 0, op: 0.7 },
    // front row
    { k: 'pink-a', cx: 70, top: 262, s: 0.46, flip: false, d: 1, op: 1 },
    { k: 'pink-b', cx: 300, top: 290, s: 0.44, flip: false, d: 1, op: 1 },
    { k: 'pink-a', cx: 520, top: 312, s: 0.4, flip: true, d: 1, op: 1 },
    { k: 'yellow-b', cx: 915, top: 300, s: 0.42, flip: false, d: 1, op: 1 },
    { k: 'yellow-a', cx: 1150, top: 296, s: 0.42, flip: false, d: 1, op: 0.62 },
    { k: 'yellow-b', cx: 1375, top: 300, s: 0.42, flip: true, d: 1, op: 0.62 },
  ];
  const TREE_FADE = [565, 600]; // stage y where sprite bottoms melt into the far garden

  // ---------------------------------------------------------------------------
  // Painters (each draws in stage coords into a canvas whose top is y0)
  // ---------------------------------------------------------------------------
  function paintSky(g) {
    const grd = g.createLinearGradient(0, 0, 0, 620);
    grd.addColorStop(0, '#6F85D6');
    grd.addColorStop(0.55, '#7489D8');
    grd.addColorStop(1, '#8598DE');
    g.fillStyle = grd; g.fillRect(0, 0, W, 620);
    // fine horizontal stitch texture
    const rng = mulberry32(11);
    for (let i = 0; i < 9000; i++) {
      const x = rng() * W, y = rng() * 620;
      const w = 3 + rng() * 6;
      g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(40,50,140,0.04)';
      g.fillRect(x, y, w, 0.8);
    }
  }

  function paintStars(g) {
    const rng = mulberry32(99);
    for (let i = 0; i < 170; i++) {
      const x = rng() * W, y = 70 + Math.pow(rng(), 1.3) * 470;
      const s = 0.6 + rng() * 1.1;
      g.fillStyle = rng() < 0.75 ? 'rgba(251,245,236,0.9)' : 'rgba(243,231,154,0.9)';
      g.beginPath(); g.arc(x, y, s, 0, 6.283); g.fill();
      if (rng() < 0.1) {
        g.strokeStyle = 'rgba(251,245,236,0.55)'; g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.moveTo(x, y - 4); g.lineTo(x, y + 4); g.stroke();
      }
    }
  }

  function paintWillows(L) {
    return function (g) {
      const rng = mulberry32(1000 + L.id.length * 31 + L.trees.length * 7 + L.trees[0].cx);
      L.trees.forEach(t => willow(g, rng, t));
      // fade the strands out into the far garden
      g.save();
      g.globalCompositeOperation = 'destination-in';
      const grd = g.createLinearGradient(0, L.fadeFrom, 0, L.fadeTo);
      grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, L.y0, W, L.y1 - L.y0);
      g.restore();
    };
  }

  const POND = { cx: 730, cy: 680, rx: 290, ry: 80 };

  function paintGround(g) {
    const rng = mulberry32(4242);
    const Y0 = 520;
    // base wash with soft top edge
    const grd = g.createLinearGradient(0, Y0, 0, H);
    grd.addColorStop(0, 'rgba(240,206,224,0)');
    grd.addColorStop(0.09, 'rgba(240,206,224,0.85)');
    grd.addColorStop(0.18, '#F3D5E3');
    grd.addColorStop(0.5, '#F8E6EC');
    grd.addColorStop(1, '#FBF0EE');
    g.fillStyle = grd; g.fillRect(0, Y0, W, H - Y0);
    // faint base contour lines across everything
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.6;
    g.beginPath();
    for (let y = 560; y < H + 10; y += 4.2) {
      for (let x = 0; x <= W; x += 8) {
        const yy = y + 3 * Math.sin(x * 0.011 + y * 0.03) + 1.5 * Math.sin(x * 0.047 + y * 0.09);
        if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
      }
    }
    g.stroke();
    g.restore();

    // far garden: hazy hedge band of stippled mounds where willows meet ground
    const hedge = [
      [30, 586, 70, 26, ['#EFA6C3', '#F7C6D8', '#FCE3EC', '#D97FA5'], '#F4B3CC'],
      [150, 578, 60, 20, ['#A9A4E8', '#C9C3EE', '#FBF5EC'], '#C9C3EE'],
      [270, 590, 80, 24, ['#F7C6D8', '#EFA6C3', '#FFF'], '#F4B3CC'],
      [420, 582, 64, 18, ['#9ED89A', '#C8EBC4', '#FBF5EC'], '#C8EBC4'],
      [520, 584, 56, 16, ['#F3E79A', '#F7EDB3', '#FFF8D8'], '#F3E79A'],
      [860, 578, 66, 18, ['#C9C3EE', '#A9A4E8', '#FBF5EC'], '#DCD6F4'],
      [960, 586, 72, 22, ['#F3E79A', '#E8D777', '#FFF8D8'], '#F3E79A'],
      [1080, 580, 60, 18, ['#9ED89A', '#7BBF7A', '#E3F4DF'], '#C8EBC4'],
      [1200, 590, 84, 24, ['#F7C6D8', '#F4B3CC', '#FFF'], '#F7C6D8'],
      [1340, 584, 74, 22, ['#F3E79A', '#EDDC86', '#FFF8D8'], '#F7EDB3'],
      [1430, 592, 50, 20, ['#A9A4E8', '#C9C3EE', '#FFF'], '#C9C3EE'],
    ];
    hedge.forEach(([cx, cy, rx, ry, colors, base]) => stippleMound(g, rng, { cx, cy, rx, ry, colors, base, baseAlpha: 0.45, count: Math.round(rx * ry * 0.5) }));

    // warm orange haze lower-left (behind the blue bushes)
    const glow = g.createRadialGradient(60, 640, 4, 60, 640, 190);
    glow.addColorStop(0, 'rgba(240,138,46,0.55)');
    glow.addColorStop(0.5, 'rgba(240,138,46,0.2)');
    glow.addColorStop(1, 'rgba(240,138,46,0)');
    g.fillStyle = glow; g.fillRect(0, 480, 300, 330);

    // stitched ground patches
    const patches = [
      { cx: 220, cy: 700, rx: 210, ry: 50, fill: '#FBF5EC', gap: 3.2 },
      { cx: 480, cy: 790, rx: 260, ry: 44, fill: '#CFEBC2', gap: 3.4 },
      { cx: 900, cy: 812, rx: 280, ry: 50, fill: '#FBF5EC', gap: 3.2 },
      { cx: 1220, cy: 760, rx: 230, ry: 58, fill: '#D3EDC6', gap: 3.2 },
      { cx: 1340, cy: 860, rx: 200, ry: 50, fill: '#F8E3A0', gap: 3.4 },
      { cx: 690, cy: 870, rx: 300, ry: 40, fill: '#F4CCDC', gap: 3.6 },
      { cx: 360, cy: 640, rx: 120, ry: 26, fill: '#CDCDF2', gap: 3, mode: 'rings', line: 'rgba(255,255,255,0.75)' },
      { cx: 1110, cy: 650, rx: 130, ry: 28, fill: '#FBF5EC', gap: 3, mode: 'rings' },
      { cx: 1010, cy: 720, rx: 90, ry: 22, fill: '#F6E09A', gap: 3 },
      { cx: 300, cy: 860, rx: 150, ry: 34, fill: '#D9D4F6', gap: 3.2 },
    ];
    patches.forEach(p => patch(g, rng, Object.assign({ wob: 0.12 }, p)));

    // embroidered stipple over the ground so it reads like the painted sprites
    {
      const sc = ['#F28FB0', '#F2C14E', '#9ED89A', '#A9A4E8', '#FFFFFF', '#F7A35C'];
      for (let i = 0; i < 9000; i++) {
        const x = rng() * W, y = 575 + Math.pow(rng(), 0.8) * 325;
        g.globalAlpha = 0.28 + rng() * 0.4;
        g.fillStyle = sc[(rng() * sc.length) | 0];
        const s = 0.9 + rng() * 1.1;
        g.fillRect(x, y, s * 1.6, s);
      }
      g.globalAlpha = 1;
    }

    // warm red/orange patch, lower left (like the reference)
    patch(g, rng, { cx: 70, cy: 885, rx: 190, ry: 60, fill: '#EE5A3C', line: 'rgba(250,180,110,0.75)', gap: 3.2, wob: 0.14 });
    patch(g, rng, { cx: 175, cy: 905, rx: 110, ry: 34, fill: '#F08A2E', line: 'rgba(255,230,160,0.8)', gap: 3, wob: 0.1, mode: 'rings' });

    // damp shoreline halo around the pond (pond itself is drawn by cardio)
    g.save();
    g.beginPath(); g.ellipse(POND.cx, POND.cy + 4, POND.rx + 46, POND.ry + 26, 0, 0, 6.283);
    g.fillStyle = rgba('#D9C3E4', 0.55); g.fill();
    g.beginPath(); g.ellipse(POND.cx, POND.cy + 2, POND.rx + 22, POND.ry + 12, 0, 0, 6.283);
    g.fillStyle = rgba('#C6B7E2', 0.55); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.7;
    for (let k = 0; k < 13; k++) {
      const ex = POND.rx + 8 + k * 3.6, ey = POND.ry + 4 + k * 2.1;
      const ph = rng() * 6;
      g.beginPath();
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const wv = 1 + 0.018 * Math.sin(a * 5 + ph) + 0.012 * Math.sin(a * 9 + ph * 2);
        const x = POND.cx + Math.cos(a) * ex * wv, y = POND.cy + 3 + Math.sin(a) * ey * wv;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore();

    // stream from the far garden down into the pond (fades in from the haze)
    {
      const res = g.getTransform().a;
      const sc = document.createElement('canvas');
      sc.width = Math.round(340 * res); sc.height = Math.round(140 * res);
      const sg = sc.getContext('2d');
      sg.setTransform(res, 0, 0, res, -500 * res, -520 * res);
      paintStream(sg, rng);
      sg.setTransform(res, 0, 0, res, -500 * res, -520 * res);
      sg.globalCompositeOperation = 'destination-in';
      const fg = sg.createLinearGradient(0, 528, 0, 556);
      fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)');
      sg.fillStyle = fg; sg.fillRect(500, 520, 340, 140);
      g.drawImage(sc, 500, 520, 340, 140);
    }

    // cobalt / lavender dotted bush mounds, far left
    stippleMound(g, rng, { cx: 70, cy: 700, rx: 120, ry: 70, colors: ['#3B3FC7', '#3B3FC7', '#6E6FD8', '#A9A4E8', '#FBF5EC'], base: '#A9A4E8', dash: true, count: 5200 });
    stippleMound(g, rng, { cx: 170, cy: 760, rx: 110, ry: 52, colors: ['#3B3FC7', '#5A5ED0', '#A9A4E8', '#C9C3EE', '#FFFFFF'], base: '#C9C3EE', dash: true, count: 4000 });
    stippleMound(g, rng, { cx: 20, cy: 812, rx: 90, ry: 56, colors: ['#3B3FC7', '#A9A4E8', '#FBF5EC', '#6E6FD8'], base: '#A9A4E8', dash: true, count: 3200 });
    // white lacy shrub, very lower-left edge
    stippleMound(g, rng, { cx: 250, cy: 812, rx: 54, ry: 34, colors: ['#FFFFFF', '#F7C6D8', '#FBF5EC', '#E99DBB'], base: '#F7E1EA', count: 1400 });

    // butter stippled bush, right (peeks below the maple)
    stippleMound(g, rng, { cx: 1245, cy: 712, rx: 78, ry: 52, colors: ['#F2D45C', '#F3E79A', '#E8C93A', '#FFF8D8', '#F08A2E'], base: '#F3E79A', count: 3600 });
    // dark mossy mound + mint mound, right edge
    stippleMound(g, rng, { cx: 1405, cy: 760, rx: 62, ry: 40, colors: ['#2F6B3A', '#16161F', '#4E8F55', '#2A2F66'], base: '#2F6B3A', baseAlpha: 0.75, count: 2200 });
    stippleMound(g, rng, { cx: 1340, cy: 790, rx: 52, ry: 30, colors: ['#9ED89A', '#C8EBC4', '#4E8F55', '#FFFFFF'], base: '#9ED89A', baseAlpha: 0.7, count: 1500 });
    stippleMound(g, rng, { cx: 395, cy: 700, rx: 44, ry: 26, colors: ['#9ED89A', '#C8EBC4', '#4E8F55', '#FFFFFF'], base: '#C8EBC4', count: 900 });
    stippleMound(g, rng, { cx: 1085, cy: 790, rx: 40, ry: 24, colors: ['#F4B3CC', '#FFFFFF', '#E99DBB', '#F7C6D8'], base: '#F7E1EA', count: 800 });

    // pots and pebbles
    pot(g, rng, 1180, 800, 20, 26, '#4FA36B');
    pot(g, rng, 120, 870, 22, 24, '#4FA36B');
    pebble(g, 1215, 806, 9, 11, '#F4B3CC');
    pebble(g, 1290, 836, 13, 8, '#9FB0E8');
    pebble(g, 275, 742, 10, 6, '#BDB6EA');
    pebble(g, 1060, 760, 8, 5, '#F7EDB3');

    // grass tufts
    const tufts = [[300, 700], [460, 730], [255, 655], [1000, 690], [1110, 740], [1160, 680], [1300, 700], [1420, 840],
      [40, 860], [560, 780], [940, 780], [1260, 880], [600, 640], [880, 638], [1390, 650], [215, 720], [1000, 625]];
    tufts.forEach(([x, y]) => tuft(g, rng, x, y));
    tuft(g, rng, 1180, 774, { h: 26, n: 14, colors: ['#4E8F55', '#2F6B3A', '#9ED89A'] });
    tuft(g, rng, 120, 846, { h: 30, n: 14, colors: ['#4E8F55', '#2F6B3A', '#9ED89A'] });
    // tall green reeds behind the blue bushes (reference)
    tuft(g, rng, 95, 640, { h: 70, n: 40, w: 90, colors: ['#2F6B3A', '#4E8F55', '#7BBF7A', '#9ED89A'] });

    // wildflowers (avoid pond + analytics pebble)
    const flowerCols = ['#F2D45C', '#F2D45C', '#E0262B', '#F08A2E', '#FBF5EC'];
    for (let i = 0; i < 70; i++) {
      const x = rng() * W, y = 620 + rng() * 270;
      const inPond = ((x - POND.cx) / (POND.rx + 50)) ** 2 + ((y - POND.cy) / (POND.ry + 30)) ** 2 < 1;
      const inPebble = x > 290 && x < 1150 && y > 798;
      const inStream = x > 540 && x < 760 && y < 625;
      if (inPond || inPebble || inStream) continue;
      wildflower(g, rng, x, y, flowerCols[(rng() * flowerCols.length) | 0]);
    }

    // fallen petals
    for (let i = 0; i < 60; i++) {
      const x = rng() * W, y = 640 + rng() * 250;
      if (((x - POND.cx) / (POND.rx + 20)) ** 2 + ((y - POND.cy) / (POND.ry + 10)) ** 2 < 1) continue;
      g.save();
      g.translate(x, y); g.rotate(rng() * Math.PI);
      g.fillStyle = rng() < 0.6 ? '#F4B3CC' : (rng() < 0.5 ? '#FBF5EC' : '#F3E79A');
      g.globalAlpha = 0.85;
      g.beginPath(); g.ellipse(0, 0, 2.6, 1.3, 0, 0, 6.283); g.fill();
      g.restore();
    }
  }

  function paintStream(g, rng) {
    // perspective stream: narrow far away, wide where it meets the pond's upper rim
    const ya = 530, yb = 618, n = 70;
    const cxAt = t => 610 + 26 * Math.sin(t * 7.2 + 0.4) * (1 - t * 0.35) + t * 110;
    const wAt = t => 3 + Math.pow(t, 1.6) * 72;
    const rows = [];
    for (let i = 0; i <= n; i++) { const t = i / n; rows.push([ya + (yb - ya) * t, cxAt(t), wAt(t), t]); }
    g.save();
    g.beginPath();
    rows.forEach(([y, c, w], i) => i ? g.lineTo(c - w, y) : g.moveTo(c - w, y));
    for (let i = rows.length - 1; i >= 0; i--) { const [y, c, w] = rows[i]; g.lineTo(c + w, y); }
    g.closePath();
    g.fillStyle = '#95A7E6'; g.fill();
    g.clip();
    for (let k = -7; k <= 7; k++) {
      const f = k / 7.5;
      g.strokeStyle = k % 2 ? 'rgba(251,245,236,0.85)' : 'rgba(95,116,201,0.6)';
      g.lineWidth = 0.7;
      g.beginPath();
      rows.forEach(([y, c, w, t], i) => {
        const x = c + w * f + Math.sin(t * 22 + k * 1.7) * (0.6 + t * 2.4);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.stroke();
    }
    g.restore();
    // pebbly banks
    rows.forEach(([y, c, w, t]) => {
      for (const sgn of [-1, 1]) {
        if (rng() < 0.45) continue;
        g.fillStyle = rng() < 0.5 ? 'rgba(251,245,236,0.95)' : 'rgba(169,164,232,0.95)';
        const s = 0.6 + t * 1.6;
        g.beginPath(); g.ellipse(c + sgn * (w + 1.5 + rng() * 2), y + rng(), (1.4 + rng() * 1.6) * s, (0.8 + rng() * 0.6) * s, 0, 0, 6.283); g.fill();
      }
    });
  }

  function pot(g, rng, x, y, w, h, color) {
    g.save();
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x - w * 0.42, y - h);
    g.bezierCurveTo(x - w * 0.75, y - h * 0.6, x - w * 0.6, y, x, y);
    g.bezierCurveTo(x + w * 0.6, y, x + w * 0.75, y - h * 0.6, x + w * 0.42, y - h);
    g.closePath(); g.fill();
    g.clip();
    for (let i = 0; i < 90; i++) {
      g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(22,60,40,0.3)';
      g.fillRect(x - w + rng() * 2 * w, y - h + rng() * h, 1.2, 1.2);
    }
    g.restore();
    g.fillStyle = mix(color, '#16161F', 0.25);
    g.beginPath(); g.ellipse(x, y - h, w * 0.44, 2.4, 0, 0, 6.283); g.fill();
  }
  function pebble(g, x, y, rx, ry, color) {
    g.save();
    g.fillStyle = color;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 0.6;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.ellipse(x, y, rx * (1 - k * 0.22), ry * (1 - k * 0.22), 0, 0, 6.283); g.stroke(); }
    g.restore();
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------
  const CSS = `
#layer-backdrop { overflow: hidden; }
#layer-backdrop .bd-c { position: absolute; left: 0; width: 1440px; display: block; opacity: 0; transition: opacity 900ms var(--ease-out); }
#layer-backdrop .bd-c.is-in { opacity: 1; }
#layer-backdrop .bd-sky-base { position: absolute; left: 0; top: 0; width: 1440px; height: 620px; background: linear-gradient(180deg, #6F85D6 0%, #7489D8 55%, #8598DE 100%); }
#layer-backdrop .bd-tint { position: absolute; left: 0; top: 0; width: 1440px; height: 620px; opacity: 0; transition: opacity 3s var(--ease-soft); }
#layer-backdrop .bd-tint-dawn { background: linear-gradient(180deg, rgba(170,150,220,0.22) 0%, rgba(228,176,206,0.42) 28%, rgba(252,196,182,0.58) 48%, rgba(255,214,180,0.72) 100%); }
#layer-backdrop .bd-tint-dusk { background: linear-gradient(180deg, rgba(126,98,188,0.26) 0%, rgba(196,128,190,0.42) 28%, rgba(236,148,176,0.58) 50%, rgba(246,170,170,0.72) 100%); }
#layer-backdrop .bd-tint-night { background: linear-gradient(180deg, #232A60 0%, #2E3570 50%, #3C4383 100%); opacity: 0; }
#layer-backdrop .bd-stars { opacity: 0; transition: opacity 3s var(--ease-soft); }
#layer-backdrop .bd-stars.is-in { opacity: 0; }
#layer-backdrop .bd-sway { position: absolute; left: 0; top: 0; width: 1440px; height: 900px; transform-origin: 50% 250px; will-change: transform; }
#layer-backdrop .bd-tree { position: absolute; will-change: transform; opacity: 0; transition: opacity 1200ms var(--ease-out); }
#layer-backdrop .bd-tree.is-in { opacity: var(--op, 1); }
#layer-backdrop .bd-tree img { display: block; width: 100%; height: 100%; image-rendering: auto; -webkit-user-drag: none;
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 var(--fa), transparent var(--fb)); mask-image: linear-gradient(180deg, #000 0%, #000 var(--fa), transparent var(--fb)); }
#layer-backdrop .bd-tree.is-flip img { transform: scaleX(-1); }
#layer-backdrop .bd-haze { position: absolute; left: 0; top: 150px; width: 1440px; height: 470px; pointer-events: none; transition: opacity 3s var(--ease-soft);
  background: linear-gradient(180deg, rgba(154,171,232,0) 0%, rgba(154,171,232,0.34) 22%, rgba(170,182,236,0.42) 70%, rgba(236,214,232,0.55) 100%); }
html[data-phase="night"] #layer-backdrop .bd-haze { opacity: 0.35; }
#layer-backdrop .bd-mist { position: absolute; left: 0; top: 505px; width: 1440px; height: 110px; pointer-events: none;
  background: linear-gradient(180deg, rgba(246,217,228,0) 0%, rgba(244,212,226,0.55) 55%, rgba(243,213,227,0.85) 100%); }
#layer-backdrop .bd-washes { position: absolute; inset: 0; pointer-events: none; }
#layer-backdrop .bd-wash { position: absolute; left: 0; top: 0; width: 1440px; height: 900px; opacity: 0; transition: opacity 3s var(--ease-soft); }
#layer-backdrop .bd-wash-dawn { background: linear-gradient(180deg, rgba(255,200,170,0) 30%, rgba(255,205,170,0.12) 100%); }
#layer-backdrop .bd-wash-dusk { background: linear-gradient(180deg, rgba(200,120,170,0.08) 20%, rgba(214,120,160,0.16) 100%); }
#layer-backdrop .bd-wash-night { top: 150px; height: 750px; background: linear-gradient(180deg, rgba(30,36,98,0) 0%, rgba(30,36,98,0.42) 22%, rgba(32,38,100,0.38) 60%, rgba(40,44,108,0.32) 100%); } /* plain translucent overlay: WebKit can't blend against composited layers */
html[data-phase="dawn"] #layer-backdrop .bd-tint-dawn,
html[data-phase="dawn"] #layer-backdrop .bd-wash-dawn,
html[data-phase="dusk"] #layer-backdrop .bd-tint-dusk,
html[data-phase="dusk"] #layer-backdrop .bd-wash-dusk,
html[data-phase="night"] #layer-backdrop .bd-tint-night,
html[data-phase="night"] #layer-backdrop .bd-wash-night { opacity: 1; }
html[data-phase="night"] #layer-backdrop .bd-stars.is-in { opacity: 1; }
#layer-backdrop .bd-twinkle { position: absolute; left: 0; top: 0; width: 1440px; height: 560px; }
#layer-backdrop .bd-twinkle.is-anim { animation: bd-twinkle 7s var(--ease-breathe) infinite alternate; }
@keyframes bd-twinkle { from { opacity: 1; } to { opacity: 0.35; } }
#layer-backdrop .bd-drift { position: absolute; width: 12px; height: 46px; opacity: 0; }
#layer-backdrop .bd-drift.is-anim { animation: bd-drift var(--bd-dur, 30s) var(--ease-soft) var(--bd-delay, 0s) infinite; }
#layer-backdrop .bd-drift svg { display: block; overflow: visible; }
@keyframes bd-drift {
  0% { opacity: 0; transform: translate(0, 0) rotate(0deg); }
  4% { opacity: 0.85; }
  14% { transform: translate(22px, 70px) rotate(14deg); }
  24% { transform: translate(-6px, 140px) rotate(-10deg); opacity: 0.7; }
  32% { opacity: 0; transform: translate(26px, 200px) rotate(18deg); }
  100% { opacity: 0; transform: translate(26px, 200px) rotate(18deg); }
}
`;

  // ---------------------------------------------------------------------------
  // Layer
  // ---------------------------------------------------------------------------
  Garden.registerLayer('backdrop', function (ctx) {
    const root = ctx.el;
    const G = window.Garden;
    const reduced = !!ctx.reducedMotion;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    function el(cls, parent) { const d = document.createElement('div'); d.className = cls; (parent || root).appendChild(d); return d; }

    // Build the DOM stack (bottom -> top).
    el('bd-sky-base');
    const skyHost = el('bd-host');
    el('bd-tint bd-tint-dawn');
    el('bd-tint bd-tint-dusk');
    el('bd-tint bd-tint-night');
    const starsWrap = el('bd-stars');
    const tw1 = el('bd-twinkle', starsWrap);
    const tw2 = el('bd-twinkle', starsWrap);
    if (!reduced) { tw1.classList.add('is-anim'); tw2.classList.add('is-anim'); tw2.style.animationDelay = '-3.5s'; tw2.style.animationDirection = 'alternate-reverse'; }

    const sways = WILLOW_LAYERS.map(() => el('bd-sway'));

    // Painted willow sprites: back row, periwinkle haze, front row.
    function makeTree(t) {
      const sp = SPRITES[t.k];
      const w = sp.w * t.s, h = sp.h * t.s;
      const d = document.createElement('div');
      d.className = 'bd-tree' + (t.flip ? ' is-flip' : '');
      d.style.cssText = `left:${(t.cx - w / 2).toFixed(1)}px;top:${t.top}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;` +
        `transform-origin:50% 4%;--op:${t.op};--fa:${(((TREE_FADE[0] - t.top) / h) * 100).toFixed(1)}%;--fb:${(((TREE_FADE[1] - t.top) / h) * 100).toFixed(1)}%`;
      const img = new Image();
      img.decoding = 'async'; img.alt = ''; img.draggable = false;
      img.onload = () => { void d.offsetWidth; d.classList.add('is-in'); };
      img.src = 'assets/sprites/willow-' + t.k + '.png';
      d.appendChild(img);
      root.appendChild(d);
      return { el: d, t, x: t.cx, y: t.top + h * 0.55, flex: t.d ? 2.3 : 1.05, spring: G.wind ? G.wind.spring({ k: t.d ? 9 : 7, c: 3.2 }) : null, last: 1e9 };
    }
    const trees = [];
    TREES.filter(t => t.d === 0).forEach(t => trees.push(makeTree(t)));
    el('bd-haze');
    TREES.filter(t => t.d === 1).forEach(t => trees.push(makeTree(t)));
    el('bd-mist');
    const groundHost = el('bd-host');

    // Wind-driven sway: each tree hangs from its crown, skewed by a spring on the shared air.
    if (!reduced && G.wind) {
      const back = { el: sways[0], x: 720, y: 380, flex: 0.5, spring: G.wind.spring({ k: 6, c: 3 }), last: 1e9 };
      const all = trees.concat([back]);
      G.wind.onTick((t, dt) => {
        for (const o of all) {
          const target = o.flex * (G.wind.at(o.x, o.y, t) - 0.38);
          const a = o.spring.step(target, dt);
          if (Math.abs(a - o.last) > 0.004) { o.last = a; o.el.style.transform = `skewX(${a.toFixed(3)}deg)`; }
        }
      });
    }

    // occasional drifting willow strand pieces
    if (!reduced) {
      const drifts = [
        { x: 180, y: 420, c: '#E99DBB', dur: 34, delay: -4 },
        { x: 1180, y: 430, c: '#E8D777', dur: 41, delay: -19 },
        { x: 470, y: 450, c: '#F4B3CC', dur: 47, delay: -31 },
        { x: 960, y: 440, c: '#EDDC86', dur: 38, delay: -11 },
      ];
      drifts.forEach(o => {
        const d = el('bd-drift is-anim');
        d.style.left = o.x + 'px'; d.style.top = o.y + 'px';
        d.style.setProperty('--bd-dur', o.dur + 's');
        d.style.setProperty('--bd-delay', o.delay + 's');
        d.innerHTML = `<svg width="12" height="46" viewBox="0 0 12 46"><path d="M6 0 Q 8 14 5 26 T 6 46" fill="none" stroke="${o.c}" stroke-width="0.9" stroke-linecap="round"/>` +
          [6, 14, 22, 30, 38].map((y, i) => `<circle cx="${i % 2 ? 7 : 5.5}" cy="${y}" r="0.9" fill="${i % 2 ? '#FBF5EC' : o.c}"/>`).join('') + '</svg>';
      });
    }
    // Phase washes sit above everything in the backdrop (including grass.js's canvas,
    // which is appended later) so the whole far scene takes the time-of-day light.
    const washBox = el('bd-washes');
    ['dawn', 'dusk', 'night'].forEach(p => el('bd-wash bd-wash-' + p, washBox));
    const keepWashOnTop = () => { if (root.lastElementChild !== washBox) root.appendChild(washBox); };
    new MutationObserver(keepWashOnTop).observe(root, { childList: true });

    // Pre-render jobs. Each job owns a host element and a stage-space rect.
    const jobs = [
      { host: skyHost, y0: 0, y1: 620, paint: paintSky },
      { host: tw1, y0: 0, y1: 560, paint: g => paintStarsSubset(g, 0) },
      { host: tw2, y0: 0, y1: 560, paint: g => paintStarsSubset(g, 1) },
    ];
    WILLOW_LAYERS.forEach((L, i) => jobs.push({ host: sways[i], y0: L.y0, y1: L.y1, paint: paintWillows(L) }));
    jobs.push({ host: groundHost, y0: 520, y1: 900, paint: paintGround });

    function paintStarsSubset(g, which) {
      // split one deterministic starfield into two twinkle groups
      g.save();
      g.beginPath();
      for (let x = 0; x < W; x += 60) {
        if (((x / 60) % 2) === which) g.rect(x, 0, 60, 560);
      }
      g.clip();
      paintStars(g);
      g.restore();
    }

    function currentRes() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const s = (G.view && G.view.scale) || Math.min(window.innerWidth / W, window.innerHeight / H) || 1;
      return clamp(Math.round(dpr * s * 4) / 4, 0.5, 2.5);
    }

    let renderedRes = 0, gen = 0;
    const timings = [];
    function renderAll(res) {
      const myGen = ++gen;
      renderedRes = res;
      let i = 0;
      const step = () => {
        if (myGen !== gen || i >= jobs.length) return;
        const j = jobs[i++];
        const h = j.y1 - j.y0;
        const c = document.createElement('canvas');
        c.className = 'bd-c';
        c.width = Math.round(W * res); c.height = Math.round(h * res);
        c.style.top = j.y0 + 'px'; c.style.height = h + 'px';
        const g = c.getContext('2d');
        g.setTransform(res, 0, 0, res, 0, -j.y0 * res);
        const tp = performance.now();
        try { j.paint(g); } catch (e) { console.error('[backdrop] paint failed', e); }
        timings[i - 1] = Math.round(performance.now() - tp);
        const old = j.host.querySelector('canvas.bd-c');
        j.host.appendChild(c);
        if (old) { c.classList.add('is-in'); c.style.transition = 'none'; old.remove(); }
        else { void c.offsetWidth; c.classList.add('is-in'); }
        setTimeout(step, 0);
      };
      step();
    }
    renderAll(currentRes());
    starsWrap.classList.add('is-in');

    let t = 0;
    G.on('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const r = currentRes();
        if (r > renderedRes * 1.2) renderAll(r);
      }, 450);
    });

    return { timings };
  });
})();
