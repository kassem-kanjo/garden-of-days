/* Garden of Days — Interview prep: seven painted paper lanterns on a sagging silk string,
   swinging as pendulums in the shared garden wind. */
(function () {
  'use strict';

  Garden.registerRegion('interview', function (ctx) {
    const P = ctx.palette;
    const H_ = ctx.habit; // color #3B3FC7, soft #B9BEF5, deep #23277A
    const NS = 'http://www.w3.org/2000/svg';
    const RM = ctx.reducedMotion;
    const SPR_LIT = 'assets/sprites/lantern-lit.png';     // 165x220, body y 5..178, centre y≈95
    const SPR_UNLIT = 'assets/sprites/lantern-unlit.png'; // 115x220, body y 0..128, centre y≈62
    [SPR_LIT, SPR_UNLIT].forEach(src => { const im = new Image(); im.src = src; });

    // ---------- seeded randomness ----------
    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rand = mulberry32(0x1A7E5EED);
    const R = (a, b) => a + rand() * (b - a);
    const f1 = v => Math.round(v * 10) / 10;

    // ---------- the string (quadratic bezier, region-local coords) ----------
    // Left anchor kept below the two-line header (header reaches stage y≈92 → local 14).
    const S0 = { x: -26, y: 30 }, S2 = { x: 664, y: 20 };
    const S1_BASE = { x: 318, y: 90 };
    const S1 = { x: S1_BASE.x, y: S1_BASE.y };
    function qb(t, a, b, c) {
      const u = 1 - t;
      return { x: u * u * a.x + 2 * u * t * b.x + t * t * c.x, y: u * u * a.y + 2 * u * t * b.y + t * t * c.y };
    }
    const sAt = t => qb(t, S0, S1, S2);
    function tForX(x) {
      let lo = 0, hi = 1;
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (sAt(m).x < x) lo = m; else hi = m; }
      return (lo + hi) / 2;
    }

    // ---------- lantern geometry (sprite scale) ----------
    const SL = 0.38, SU = 0.41;                 // lit / unlit display scale (≤ half pixel size)
    const LW = 165 * SL, LH = 220 * SL;          // lit  ≈ 63 x 84
    const UW = 115 * SU, UH = 220 * SU;          // unlit ≈ 47 x 90
    const UC = 62 * SU;                          // unlit body centre below top
    const LIT_Y = UC - 95 * SL;                  // lit image y so body centres align
    const lanterns = [];
    for (let i = 0; i < 7; i++) {
      const x = 70 + i * 90;
      lanterns.push({ i, t: tForX(x), x });
    }
    const maxSY = Math.max(...lanterns.map(L => sAt(L.t).y));
    lanterns.forEach(L => {
      const p = sAt(L.t);
      L.hx = p.x; L.hy = p.y;
      L.cord = f1(6 + 0.3 * (maxSY - p.y) + R(0, 4));
      L.top = L.cord;                 // top of unlit sprite
      L.cy = L.top + UC;              // body centre
      L.tagY = f1(L.top + UH + 1);    // tag top
      L.tagRot = f1(R(-7, 7));
      L.flex = R(13, 17);             // degrees per unit wind
      L.flickA = f1(R(2.2, 3.6));
      L.flickB = f1(R(3.1, 4.7));
    });

    // ---------- styles ----------
    const css = `
.region-interview svg.iv { position:absolute; left:0; top:0; overflow:visible; }
.region-interview .iv * { pointer-events:none; }
.region-interview .iv .lan { pointer-events:auto; }
.region-interview .iv .lan .hit { pointer-events:all; }
.region-interview .iv image { image-rendering:auto; }
.region-interview .iv .lift { transition: transform 420ms var(--ease-spring); }
.region-interview .iv .lan.is-hover:not(.is-future) .lift { transform: translateY(-3px); }
.region-interview .iv .wave.is-waving { animation: iv-wave 1100ms var(--ease-soft); }
@keyframes iv-wave { 0%{transform:translateY(0) scale(1)} 35%{transform:translateY(-5px) scale(1.06)} 100%{transform:translateY(0) scale(1)} }

.region-interview .iv .cord { stroke:${P.inkSoft}; stroke-opacity:.7; stroke-width:.8; }
.region-interview .iv .thread { stroke:${P.inkSoft}; stroke-opacity:.45; stroke-width:.6; }
.region-interview .iv .tag path { fill:${P.cream}; fill-opacity:.94; stroke:${P.inkSoft}; stroke-opacity:.28; stroke-width:.6; }
.region-interview .iv .tag text { font-family: var(--font-display); font-style: italic; font-size: 11.5px; fill:${P.inkSoft}; text-anchor: middle; }
.region-interview .iv .tag .hole { fill:${P.inkSoft}; opacity:.5; }

/* sprites: crossfade */
.region-interview .iv .spr-unlit { transition: opacity 650ms var(--ease-out); }
.region-interview .iv .lit, .region-interview .iv .halo-wrap, .region-interview .iv .core-wrap {
  opacity:0; transition: opacity 650ms var(--ease-out), transform 750ms var(--ease-out); }
.region-interview .iv .core-wrap { transform: scale(.35); }
.region-interview .iv .halo-wrap { transform: scale(.6); }
.region-interview .iv .lan.is-done .lit { opacity:1; }
.region-interview .iv .lan.is-done .spr-unlit { opacity:0; transition-delay: 120ms; }
.region-interview .iv .lan.is-done .core-wrap { opacity:.7; transform: scale(1); }
.region-interview .iv .lan.is-done .halo-wrap { opacity:.9; transform: scale(1); }
.region-interview .iv .lan.is-done.is-hover .halo-wrap { opacity:1; transform: scale(1.12); }
.region-interview .iv .lan.is-done.is-pending .lit,
.region-interview .iv .lan.is-done.is-pending .core-wrap,
.region-interview .iv .lan.is-done.is-pending .halo-wrap { opacity:0; transition-duration: 0ms; }
.region-interview .iv .lan.is-done.is-pending .spr-unlit { opacity:1; transition-duration: 0ms; }
.region-interview .iv .lan.is-snuffing .core-wrap { transition: opacity 380ms var(--ease-out), transform 380ms var(--ease-out); }
.region-interview .iv .lan.is-snuffing .lit { transition: opacity 520ms 80ms var(--ease-out); }
.region-interview .iv .flick-a { animation: iv-flick-a 3s var(--ease-breathe) infinite alternate; }
.region-interview .iv .flick-b { animation: iv-flick-b 4s var(--ease-breathe) infinite alternate; }
@keyframes iv-flick-a { 0%{opacity:1} 30%{opacity:.82} 55%{opacity:.97} 80%{opacity:.86} 100%{opacity:1} }
@keyframes iv-flick-b { 0%{opacity:.9} 40%{opacity:1} 70%{opacity:.85} 100%{opacity:.96} }
.region-interview .iv .ignite { transition: opacity 600ms var(--ease-out); }
.region-interview .iv .ignite.is-igniting { animation: iv-ignite 820ms var(--ease-out); }
@keyframes iv-ignite { 0%{transform:scale(1)} 22%{transform:scale(.92)} 58%{transform:scale(1.045)} 80%{transform:scale(.99)} 100%{transform:scale(1)} }

/* unlit hover ember */
.region-interview .iv .ember { opacity:0; transition: opacity 300ms var(--ease-out); }
.region-interview .iv .lan.is-hover:not(.is-done):not(.is-future) .ember { opacity:1; animation: iv-ember 1.3s var(--ease-breathe) infinite alternate; }
@keyframes iv-ember { 0%{opacity:.55} 45%{opacity:1} 70%{opacity:.7} 100%{opacity:.95} }

/* future: small, faint, desaturated paper */
.region-interview .iv .lbody, .region-interview .iv .tail { transition: transform 600ms var(--ease-spring), opacity 500ms var(--ease-out); }
.region-interview .iv .lan.is-future .lbody { transform: scale(.72); }
.region-interview .iv .lan.is-future .tail { transform: translateY(var(--fold)); opacity:.7; }
.region-interview .iv .lan.is-future .ignite { opacity:.38; }
.region-interview .iv .lan.is-future .spr-unlit { filter: grayscale(.75) brightness(1.08); }

/* today: firefly */
.region-interview .iv .firefly { display:none; }
.region-interview .iv .lan.is-today .firefly { display:inline; }
.region-interview .iv .ff-orbit { animation: iv-orbit 7s linear infinite; }
@keyframes iv-orbit { to { transform: rotate(360deg); } }
.region-interview .iv .ff-dot { animation: iv-ffpulse 1.9s var(--ease-breathe) infinite alternate; }
@keyframes iv-ffpulse { from{opacity:.45} to{opacity:1} }

/* focus ring (keyboard) */
.region-interview .iv .focus-ring { fill:none; stroke:${H_.soft}; opacity:0; transition: opacity 220ms var(--ease-out); }
.region-interview .iv .lan.is-focus:focus-visible .focus-ring { opacity:.95; }

/* week complete beads */
.region-interview .iv .beads { opacity:0; transition: opacity 900ms var(--ease-out); }
.region-interview .iv.is-complete .beads { opacity:1; }
.region-interview .iv .bead { animation: iv-flick-b 3.4s var(--ease-breathe) infinite alternate; }
.region-interview .iv .spark { opacity:0; }

/* fallback if sprites fail to load */
.region-interview .iv .fallback { display:none; }
.region-interview .iv.nosprite .fallback { display:inline; }
.region-interview .iv.nosprite image { display:none; }

/* night: lit lanterns glow strongly */
html[data-phase="night"] .region-interview .iv .lan.is-done .halo-wrap { opacity:1; transform: scale(1.75); }
html[data-phase="night"] .region-interview .iv .lan.is-done.is-hover .halo-wrap { transform: scale(1.9); }
html[data-phase="night"] .region-interview .iv .lan.is-done .core-wrap { opacity:1; }
html[data-phase="night"] .region-interview .iv .lan.is-done .spr-lit { filter: brightness(1.12) saturate(1.1); }
html[data-phase="night"] .region-interview .iv .lan:not(.is-done):not(.is-future) .ignite { opacity:.8; }
html[data-phase="night"] .region-interview .iv .cord,
html[data-phase="night"] .region-interview .iv .silk { stroke:${P.cream}; stroke-opacity:.5; }
.region-interview .iv.rm *, .region-interview .iv.rm { animation:none !important; }
`;
    const style = document.createElement('style');
    style.textContent = css;
    ctx.el.appendChild(style);

    // ---------- build svg ----------
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'iv' + (RM ? ' rm' : ''));
    svg.setAttribute('width', ctx.bounds.w);
    svg.setAttribute('height', ctx.bounds.h);
    svg.setAttribute('viewBox', `0 0 ${ctx.bounds.w} ${ctx.bounds.h}`);

    const defs = `
<defs>
  <radialGradient id="ivHalo" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#FFF4C8" stop-opacity=".7"/>
    <stop offset=".35" stop-color="${H_.soft}" stop-opacity=".45"/>
    <stop offset=".7" stop-color="${H_.soft}" stop-opacity=".14"/>
    <stop offset="1" stop-color="${H_.soft}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ivCore" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#FFE7A8" stop-opacity=".75"/>
    <stop offset=".5" stop-color="#F7C978" stop-opacity=".28"/>
    <stop offset="1" stop-color="#F7C978" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ivEmber" cx="50%" cy="58%" r="50%">
    <stop offset="0" stop-color="#F7D58A" stop-opacity=".55"/>
    <stop offset=".6" stop-color="#F6D9E4" stop-opacity=".2"/>
    <stop offset="1" stop-color="#F6D9E4" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ivSpark" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#FFF8D8" stop-opacity="1"/>
    <stop offset=".4" stop-color="#F3E79A" stop-opacity=".6"/>
    <stop offset="1" stop-color="#F3E79A" stop-opacity="0"/>
  </radialGradient>
</defs>`;

    // Willow branch tips holding the string at both ends (fine hanging strands).
    function willowTip(ax, ay, dir, cols) {
      let s = `<path d="M${ax + dir * 46},${ay - 34} Q${ax + dir * 22},${ay - 30} ${ax},${ay}" fill="none" stroke="${P.ink}" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>`;
      s += `<path d="M${ax + dir * 30},${ay - 31} Q${ax + dir * 40},${ay - 14} ${ax + dir * 52},${ay - 6}" fill="none" stroke="${P.ink}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`;
      for (let k = 0; k < 34; k++) {
        const bx = ax + dir * R(-6, 50), by = ay - 30 + R(0, 22) + (dir * (bx - ax)) * -0.15;
        const len = R(26, 70);
        const c = cols[k % cols.length];
        s += `<path d="M${f1(bx)},${f1(by)} q${f1(R(-2, 2))},${f1(len * 0.5)} ${f1(R(-3, 3))},${f1(len)}" fill="none" stroke="${c}" stroke-width="${f1(R(0.6, 1.1))}" stroke-opacity="${f1(R(0.55, 0.9))}" stroke-linecap="round"/>`;
        const nd = 3 + Math.floor(rand() * 4);
        for (let d = 0; d < nd; d++) {
          s += `<circle cx="${f1(bx + R(-1.5, 1.5))}" cy="${f1(by + R(0, len))}" r="${f1(R(0.6, 1.2))}" fill="${c}" opacity="${f1(R(0.5, 0.9))}"/>`;
        }
      }
      return s;
    }

    // Things that ride the string at a parameter t (moved every tick as the sag breathes).
    const riders = []; // { t, cls, html }
    const ribCols = [P.pink, P.butter, P.pink, P.cream];
    [0.5 * (lanterns[1].t + lanterns[2].t), 0.5 * (lanterns[3].t + lanterns[4].t), 0.5 * (lanterns[5].t + lanterns[6].t), lanterns[0].t * 0.45]
      .forEach((t, k) => {
        const c = ribCols[k];
        riders.push({ t, html: `<path d="M0,0 q-2.5,6 -1,12" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>` +
          `<path d="M0,0 q3,5 2.4,10" fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity=".85"/>` +
          `<circle r="1.9" fill="${c}"/><circle r=".8" fill="${P.inkSoft}" opacity=".4"/>` });
      });
    for (let k = 0; k < 9; k++) {
      riders.push({ t: R(0.04, 0.96), html: `<path class="silk" d="M0,0 l${f1(R(-3, 3))},${f1(R(2, 5))}" stroke="${P.inkSoft}" stroke-opacity=".35" stroke-width=".5" stroke-linecap="round"/>` });
    }
    const beadTs = [];
    for (let i = 0; i < 6; i++) beadTs.push((lanterns[i].t * 2 + lanterns[i + 1].t) / 3, (lanterns[i].t + lanterns[i + 1].t * 2) / 3);
    beadTs.push(lanterns[0].t * 0.5, lanterns[6].t + (1 - lanterns[6].t) * 0.5);
    const beadRiders = beadTs.map((t, k) => ({ t, bead: true, html:
      `<g class="bead" style="animation-delay:${f1(-k * 0.37)}s"><circle r="6" fill="url(#ivHalo)"/><circle r="2.1" fill="${k % 2 ? P.butter : H_.soft}"/></g>` }));

    function riderMarkup(r) { const p = sAt(r.t); return `<g class="rider" transform="translate(${f1(p.x)},${f1(p.y)})">${r.html}</g>`; }

    function lanternMarkup(L) {
      const cy = L.cy;
      const tagH = 15, tagW = 13;
      const tag = `<g class="tag" transform="translate(0,${L.tagY + 3}) rotate(${L.tagRot})">` +
        `<path d="M${-tagW / 2 + 2.4},0 L${tagW / 2 - 2.4},0 L${tagW / 2},2.6 L${tagW / 2 - 0.3},${tagH} L${-tagW / 2 + 0.3},${tagH} L${-tagW / 2},2.6 Z"/>` +
        `<circle class="hole" cx="0" cy="2.4" r=".9"/>` +
        `<text x="0" y="${tagH - 3}">${ctx.dayShort(L.i)[0]}</text></g>`;
      const fold = f1(-(1 - 0.72) * UH);
      const fb = `<g class="fallback"><ellipse cx="0" cy="${f1(cy)}" rx="${f1(UW / 2)}" ry="${f1(UC)}" fill="${P.cream}" fill-opacity=".9" stroke="${P.inkSoft}" stroke-opacity=".3"/>` +
        `<ellipse class="lit" cx="0" cy="${f1(cy)}" rx="${f1(LW / 2)}" ry="${f1(UC * 1.2)}" fill="${H_.color}"/></g>`;
      return `
<g class="lan" style="--fold:${fold}px">
  <rect class="hit" x="${f1(-LW / 2 - 4)}" y="4" width="${f1(LW + 8)}" height="${f1(L.tagY + tagH + 6 - 4)}" rx="16" fill="transparent"/>
  <g class="lift"><g class="wave" style="transform-origin:0px ${f1(cy)}px"><g class="swing">
    <line class="cord" x1="0" y1="0" x2="0" y2="${f1(L.top + 2)}"/>
    <g class="halo-wrap" style="transform-origin:0px ${f1(cy)}px"><circle class="flick-b" cx="0" cy="${f1(cy)}" r="${f1(LW * 0.95)}" fill="url(#ivHalo)" style="animation-duration:${L.flickB}s"/></g>
    <ellipse class="focus-ring" cx="0" cy="${f1(cy)}" rx="${f1(LW / 2 + 8)}" ry="${f1(UC + 22)}" stroke-width="5" stroke-opacity=".35"/>
    <ellipse class="focus-ring" cx="0" cy="${f1(cy)}" rx="${f1(LW / 2 + 8)}" ry="${f1(UC + 22)}" stroke-width="1.5"/>
    <g class="ignite" style="transform-origin:0px ${f1(L.top)}px">
      <g class="tail"><line class="thread" x1="0" y1="${f1(cy)}" x2="0" y2="${f1(L.tagY + 4)}"/>${tag}</g>
      <g class="lbody" style="transform-origin:0px ${f1(L.top)}px">
        <ellipse class="ember" cx="0" cy="${f1(cy)}" rx="${f1(UW * 0.75)}" ry="${f1(UC * 1.6)}" fill="url(#ivEmber)"/>
        ${fb}
        <image class="spr-unlit" href="${SPR_UNLIT}" x="${f1(-UW / 2)}" y="${f1(L.top)}" width="${f1(UW)}" height="${f1(UH)}"/>
        <image class="spr-lit lit" href="${SPR_LIT}" x="${f1(-LW / 2)}" y="${f1(L.top + LIT_Y)}" width="${f1(LW)}" height="${f1(LH)}"/>
        <g class="core-wrap" style="transform-origin:0px ${f1(cy + 6)}px"><ellipse class="flick-a" cx="0" cy="${f1(cy + 6)}" rx="${f1(LW * 0.3)}" ry="${f1(LH * 0.22)}" fill="url(#ivCore)" style="animation-duration:${L.flickA}s"/></g>
      </g>
    </g>
    <g class="firefly" transform="translate(0,${f1(cy)}) scale(1,.55)">
      <g class="ff-orbit" style="animation-delay:${f1(-L.i * 0.9)}s">
        <g class="ff-dot"><circle cx="${f1(LW / 2 + 9)}" cy="0" r="8" fill="url(#ivSpark)"/><circle cx="${f1(LW / 2 + 9)}" cy="0" r="2.1" fill="#FFF6C8"/></g>
      </g>
    </g>
  </g></g></g>
</g>`;
    }

    const silkPath = () => `M${S0.x},${S0.y} Q${f1(S1.x)},${f1(S1.y)} ${S2.x},${S2.y}`;
    const silk2Path = () => `M${S0.x},${S0.y + 0.6} Q${f1(S1.x + 6)},${f1(S1.y + 2.6)} ${S2.x},${S2.y + 0.6}`;

    svg.innerHTML = defs +
      `<g class="branches">${willowTip(S0.x, S0.y, -1, [P.pink, P.blush, P.pink, '#E99BBB'])}${willowTip(S2.x, S2.y, 1, [P.butter, '#F7EFB8', P.butter, P.cream])}</g>` +
      `<g class="strand">` +
      `<path class="silk s1" d="${silkPath()}" fill="none" stroke="${P.inkSoft}" stroke-opacity=".78" stroke-width="1"/>` +
      `<path class="silk s2" d="${silk2Path()}" fill="none" stroke="${P.inkSoft}" stroke-opacity=".35" stroke-width=".6"/>` +
      riders.map(riderMarkup).join('') +
      `<g class="beads">${beadRiders.map(riderMarkup).join('')}</g>` +
      lanterns.map(lanternMarkup).join('') +
      `<g class="spark"><circle r="7" fill="url(#ivSpark)"/><circle r="1.9" fill="#FFF8DA"/></g>` +
      `<g class="spark"><circle r="1.3" fill="#FFF3B8"/></g><g class="spark"><circle r="0.9" fill="#FFF3B8"/></g></g>`;
    ctx.el.appendChild(svg);

    // Sprite failure → procedural fallback.
    svg.querySelector('.spr-unlit').addEventListener('error', () => svg.classList.add('nosprite'));

    const nodes = [...svg.querySelectorAll('.lan')];
    const swings = nodes.map(n => n.querySelector('.swing'));
    const sparks = [...svg.querySelectorAll('.spark')];
    const silk1 = svg.querySelector('.silk.s1'), silk2 = svg.querySelector('.silk.s2');
    const riderEls = [...svg.querySelectorAll('.rider')];
    const allRiders = riders.concat(beadRiders);
    const timers = [[], [], [], [], [], [], []];

    // ---------- wind: breathing sag + pendulums ----------
    const wind = Garden.wind;
    const sagSpring = wind ? wind.spring({ k: 6, c: 2.6 }) : null;
    const springs = lanterns.map(() => (wind ? wind.spring({ k: 9 + rand() * 3, c: 1.6 + rand() * 0.6 }) : null));

    function layout() {
      silk1.setAttribute('d', silkPath());
      silk2.setAttribute('d', silk2Path());
      riderEls.forEach((el, k) => { const p = sAt(allRiders[k].t); el.setAttribute('transform', `translate(${f1(p.x)},${f1(p.y)})`); });
      lanterns.forEach((L, i) => {
        const p = sAt(L.t);
        L.hx = p.x; L.hy = p.y;
        nodes[i].setAttribute('transform', `translate(${f1(p.x)},${f1(p.y)})`);
      });
    }
    function setAngle(i, a) { swings[i].setAttribute('transform', `rotate(${(Math.round(a * 100) / 100)})`); }

    layout();
    if (wind && !RM) {
      wind.onTick((t, dt) => {
        if (!dt) return;
        const mid = ctx.stage(S1_BASE.x, 60);
        // Wind lifts the string a touch and lets it bounce back (breathing sag).
        const w = wind.at(mid.x, mid.y, t);
        S1.y = S1_BASE.y + sagSpring.step(-9 * (w - 0.35), dt);
        S1.x = S1_BASE.x + 10 * (w - 0.35);
        layout();
        lanterns.forEach((L, i) => {
          const s = ctx.stage(L.hx, L.hy + L.cy);
          const wl = wind.at(s.x, s.y, t);
          // positive wind pushes the bottom right → counter-clockwise in SVG
          setAngle(i, springs[i].step(-L.flex * (wl - 0.18), dt));
        });
      });
    } else {
      lanterns.forEach((L, i) => setAngle(i, 0));
    }

    function lanternStage(i) { const L = lanterns[i]; return ctx.stage(L.hx, L.hy + L.cy); }

    // ---------- perches ----------
    [0, 2, 3, 5].forEach((g, k) => {
      const p = sAt(0.5 * (lanterns[g].t + lanterns[g + 1].t));
      const s = ctx.stage(p.x, p.y);
      Garden.addPerch('string-' + k, s.x, s.y, 'string');
    });
    function syncPerches() {
      lanterns.forEach((L, i) => {
        const id = 'lantern-' + i;
        if (ctx.isDone(i)) { const s = ctx.stage(L.hx, L.hy + L.top + LIT_Y + 2); Garden.addPerch(id, s.x, s.y, 'any'); }
        else Garden.removePerch(id);
      });
    }

    // ---------- animation helpers ----------
    function restartClass(el, cls, ms) {
      el.classList.remove(cls);
      el.getBoundingClientRect();
      el.classList.add(cls);
      if (ms) setTimeout(() => el.classList.remove(cls), ms);
    }

    const easeInOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    function travelSpark(t0, t1, dur) {
      if (RM) return;
      const start = performance.now();
      const lagT = [0, 0.09, 0.17];
      function frame(now) {
        const k = Math.min(1, (now - start) / dur);
        sparks.forEach((s, j) => {
          const kk = Math.max(0, k - lagT[j] * (1 - k * 0.3));
          const p = sAt(t0 + (t1 - t0) * easeInOut(kk));
          s.setAttribute('transform', `translate(${f1(p.x)},${f1(p.y)})`);
          const fade = k < 0.12 ? k / 0.12 : k > 0.9 ? (1 - k) / 0.1 : 1;
          s.style.opacity = String(fade * (j ? 0.7 - j * 0.2 : 1));
        });
        if (k < 1) requestAnimationFrame(frame);
        else sparks.forEach(s => { s.style.opacity = '0'; });
      }
      requestAnimationFrame(frame);
    }

    const TRAVEL = 340; // ms, spark run along the string
    function clearTimers(i) { timers[i].forEach(clearTimeout); timers[i] = []; }

    function ignite(i) {
      const n = nodes[i];
      clearTimers(i);
      n.classList.remove('is-snuffing');
      n.classList.add('is-pending');
      const fromT = i === 0 ? 0.015 : lanterns[i - 1].t;
      travelSpark(fromT, lanterns[i].t, TRAVEL);
      timers[i].push(setTimeout(() => {
        n.classList.remove('is-pending');
        restartClass(n.querySelector('.ignite'), 'is-igniting', 900);
        if (springs[i]) springs[i].kick(-14);
        const s = lanternStage(i);
        ctx.fx.sparkle(s.x, s.y - 4, { colors: [H_.color, P.butter, P.cream, H_.soft], count: 9 });
        ctx.fx.burst(s.x, s.y - 26, { kind: 'sparkle', colors: [H_.color, P.butter, P.cream], count: 5, speed: 0.35, gravity: -40, size: 3.2, spread: 0.6, life: 1.5 });
        ctx.fx.ripple(s.x, s.y, { color: 'rgba(243,231,154,0.55)', radius: 46, squash: 1, count: 1, width: 1.2, life: 0.9 });
        syncPerches();
      }, RM ? 0 : TRAVEL));
    }

    function snuff(i) {
      const n = nodes[i], L = lanterns[i];
      clearTimers(i);
      n.classList.remove('is-pending');
      n.classList.add('is-snuffing');
      timers[i].push(setTimeout(() => n.classList.remove('is-snuffing'), 700));
      const s = ctx.stage(L.hx, L.hy + L.top);
      ctx.fx.burst(s.x, s.y - 2, { kind: 'line', colors: ['rgba(251,245,236,0.75)'], count: 1, speed: 0.12, gravity: -28, spread: 0.2, size: 5, life: 1.6, wind: 6 });
      ctx.fx.burst(s.x, s.y - 2, { kind: 'dot', colors: ['rgba(251,245,236,0.6)', 'rgba(185,190,245,0.6)'], count: 4, speed: 0.15, gravity: -22, spread: 0.3, size: 1.4, life: 1.4 });
      syncPerches();
    }

    function celebrate() {
      nodes.forEach((n, i) => {
        const w = n.querySelector('.wave');
        timers[i].push(setTimeout(() => {
          restartClass(w, 'is-waving', 1200);
          if (springs[i]) springs[i].kick(-10);
        }, (RM ? 0 : TRAVEL + 250) + i * 130));
      });
      if (RM) return;
      [0.18, 0.4, 0.62, 0.84].forEach((tt, k) => {
        setTimeout(() => {
          const p = sAt(tt), s = ctx.stage(p.x, p.y);
          ctx.fx.sparkle(s.x, s.y, { colors: [H_.color, P.butter, H_.soft], count: 5 });
        }, TRAVEL + 400 + k * 180);
      });
    }

    function syncComplete() { svg.classList.toggle('is-complete', ctx.count() === 7); }

    // ---------- bind days ----------
    lanterns.forEach((L, i) => {
      const n = nodes[i];
      ctx.bindDay(n, i, {
        anchor: () => ({ x: L.hx, y: L.hy - 6 }),
        soundDelay: RM ? 0 : TRAVEL / 1000,
        onToggle(value) {
          if (value) ignite(i); else snuff(i);
          syncComplete();
          if (value && ctx.count() === 7) celebrate();
        },
        onHover(on) {
          if (on && !ctx.isFuture(i)) {
            if (springs[i] && !RM) springs[i].kick(rand() < 0.5 ? 22 : -22);
            if (ctx.sound && ctx.sound.ui) ctx.sound.ui('hover');
          }
        },
        onBlocked() { if (springs[i] && !RM) springs[i].kick(12); },
      });
    });

    // Label: clear of the plum branch (stage x300–660, y250–420) and the tags —
    // tucked under the string's right end, past the Sunday lantern.
    ctx.placeLabel(676, 150, { align: 'right' });

    ctx.onWeekChange(() => {
      nodes.forEach((n, i) => { clearTimers(i); n.classList.remove('is-pending', 'is-snuffing'); });
      syncComplete();
      syncPerches();
    });

    syncComplete();
    syncPerches();
    return {};
  });
})();
