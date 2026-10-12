/* Garden of Days — core: layout contract, state, storage, events, region mounting. */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Design constants (the contract every module builds against)
  // ---------------------------------------------------------------------------
  const STAGE = { w: 1440, h: 900 };

  const PALETTE = {
    sky: '#7489D8',
    skyDeep: '#5F74C9',
    skyLight: '#9AABE8',
    cream: '#FBF5EC',
    paper: '#F6EEE2',
    ink: '#16161F',
    inkSoft: '#2A2F66',
    muted: '#5A5470',
    pink: '#F4B3CC',
    blush: '#F6D9E4',
    butter: '#F3E79A',
    vermilion: '#E0262B',
    cobalt: '#3B3FC7',
    lavender: '#A9A4E8',
    mint: '#9ED89A',
    leaf: '#4E8F55',
    moss: '#2F6B3A',
    orange: '#F08A2E',
    water: '#9FB0E8',
    waterDeep: '#7F93DD',
  };

  const HABITS = [
    { id: 'interview', name: 'Interview prep', color: '#3B3FC7', soft: '#B9BEF5', deep: '#23277A' },
    { id: 'arabic', name: 'Reading Arabic', color: '#F2D45C', soft: '#FBF0B8', deep: '#7A5C0E' },
    { id: 'chinese', name: 'Chinese', color: '#EE8FB4', soft: '#F9D3E2', deep: '#8E2F57' },
    { id: 'weights', name: 'Weights', color: '#E0262B', soft: '#F6A9A6', deep: '#7A1015' },
    { id: 'cardio', name: 'Cardio', color: '#F08A2E', soft: '#F9CFA4', deep: '#8A4210' },
  ];

  // Region bounds in stage coordinates (1440 x 900).
  const REGIONS = {
    interview: { x: 40, y: 78, w: 680, h: 250 },
    arabic: { x: 760, y: 70, w: 640, h: 250 },
    chinese: { x: 0, y: 250, w: 660, h: 420 },
    weights: { x: 1020, y: 290, w: 380, h: 370 },
    cardio: { x: 380, y: 560, w: 700, h: 230 },
  };

  const LAYOUT = {
    stage: STAGE,
    regions: REGIONS,
    horizon: 560, // where the far garden meets the sky behind the willows
    groundTop: 600, // where the walkable ground band begins
    groundBottom: 800, // walkable band ends (analytics pebble sits below)
    pond: { cx: 730, cy: 680, rx: 290, ry: 80 }, // stage coords, owned visually by cardio
    header: { x: 0, y: 0, w: 1440, h: 70 },
    analytics: { x: 300, y: 806, w: 840, h: 76 },
  };

  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // In the Mac app, forward errors to a log file (Application Support/Garden of Days/log.txt).
  (function hookNativeLog() {
    const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.garden;
    if (!h) return;
    const send = msg => { try { h.postMessage({ type: 'log', data: String(msg).slice(0, 4000) }); } catch (e) { /* ignore */ } };
    const orig = console.error.bind(console);
    console.error = (...a) => { send(a.map(x => (x && x.stack) || x).join(' ')); orig(...a); };
    window.addEventListener('error', e => send(`${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
    window.addEventListener('unhandledrejection', e => send('unhandled: ' + ((e.reason && e.reason.stack) || e.reason)));
  })();

  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo');
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // Dates
  // ---------------------------------------------------------------------------
  function dateOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfWeek(d) {
    const x = dateOnly(d);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  function keyOf(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
  function fromKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
  function now() {
    const o = params.get('now'); // ?now=2026-10-02T21:00 for testing
    return o ? new Date(o) : new Date();
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  const listeners = {};
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return () => off(evt, fn); }
  function off(evt, fn) { const l = listeners[evt]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } }
  function emit(evt, payload) {
    (listeners[evt] || []).slice().forEach(fn => {
      try { fn(payload); } catch (e) { console.error('[garden] listener error', evt, e); }
    });
  }

  // ---------------------------------------------------------------------------
  // Storage: native bridge (Mac app) with localStorage fallback (browser)
  // ---------------------------------------------------------------------------
  const LS_KEY = 'garden-of-days:v1';
  const Store = {
    load() {
      if (window.__GARDEN_DATA__ && typeof window.__GARDEN_DATA__ === 'object') return window.__GARDEN_DATA__;
      try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch (e) { /* ignore */ }
      return null;
    },
    save(obj) {
      if (DEMO) return;
      const json = JSON.stringify(obj);
      try {
        const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.garden;
        if (h) h.postMessage({ type: 'save', data: json });
      } catch (e) { /* ignore */ }
      try { localStorage.setItem(LS_KEY, json); } catch (e) { /* ignore */ }
    },
  };

  let data = Store.load() || { version: 1, weeks: {}, settings: { sound: true, ambient: false } };
  data.weeks = data.weeks || {};
  data.settings = Object.assign({ sound: true, ambient: false }, data.settings || {});

  if (DEMO) seedDemo();

  // Custom habit names (only the display name changes; ids, colours and history stay).
  const DEFAULT_NAMES = Object.fromEntries(HABITS.map(h => [h.id, h.name]));
  function applyNames() {
    const custom = data.settings.names || {};
    HABITS.forEach(h => { h.name = (custom[h.id] || '').trim() || DEFAULT_NAMES[h.id]; });
  }
  applyNames();
  function renameHabits(names) {
    const clean = {};
    HABITS.forEach(h => {
      const v = String((names && names[h.id]) || '').trim().slice(0, 28);
      if (v && v !== DEFAULT_NAMES[h.id]) clean[h.id] = v;
    });
    data.settings.names = clean;
    applyNames();
    persist();
    emit('rename', {});
  }

  // Every change is written to disk immediately (the file is tiny), so quitting at any moment is safe.
  let saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    Store.save(data);
  }
  window.addEventListener('beforeunload', () => { clearTimeout(saveTimer); Store.save(data); });

  function seedDemo() {
    const today = dateOnly(now());
    const odds = { interview: 0.55, arabic: 0.6, chinese: 0.8, weights: 0.45, cardio: 0.5 };
    for (let w = 0; w < 8; w++) {
      const ws = addDays(startOfWeek(today), -7 * w);
      const wk = keyOf(ws);
      data.weeks[wk] = {};
      HABITS.forEach(h => {
        data.weeks[wk][h.id] = Array.from({ length: 7 }, (_, i) => addDays(ws, i) <= today && (h.id === 'chinese' && w === 0 ? true : Math.random() < odds[h.id]));
      });
    }
    // Make the current week's future days false.
    const cw = data.weeks[keyOf(startOfWeek(today))];
    HABITS.forEach(h => cw[h.id] = cw[h.id].map((v, i) => addDays(startOfWeek(today), i) <= today ? v : false));
  }

  // ---------------------------------------------------------------------------
  // Week view state
  // ---------------------------------------------------------------------------
  let viewStart = startOfWeek(now());

  function currentWeekStart() { return startOfWeek(now()); }
  function viewKey() { return keyOf(viewStart); }
  function isViewingCurrent() { return viewKey() === keyOf(currentWeekStart()); }

  function weekDays(habitId, wk) {
    const w = data.weeks[wk || viewKey()];
    const arr = w && w[habitId];
    return Array.from({ length: 7 }, (_, i) => !!(arr && arr[i]));
  }

  function setDay(habitId, i, value, wk) {
    wk = wk || viewKey();
    data.weeks[wk] = data.weeks[wk] || {};
    const arr = weekDays(habitId, wk);
    arr[i] = !!value;
    data.weeks[wk][habitId] = arr;
    persist();
  }

  function shiftWeek(delta) {
    const next = addDays(viewStart, 7 * delta);
    if (next > currentWeekStart()) return false;
    viewStart = next;
    emit('week', { weekKey: viewKey(), current: isViewingCurrent() });
    return true;
  }
  function goToCurrentWeek() {
    if (isViewingCurrent()) return;
    viewStart = currentWeekStart();
    emit('week', { weekKey: viewKey(), current: true });
  }

  // Day rollover / week rollover watcher.
  let lastDayKey = keyOf(dateOnly(now()));
  setInterval(() => {
    const dk = keyOf(dateOnly(now()));
    if (dk !== lastDayKey) {
      const wasCurrent = keyOf(viewStart) === keyOf(startOfWeek(fromKey(lastDayKey)));
      lastDayKey = dk;
      if (wasCurrent) viewStart = currentWeekStart();
      emit('week', { weekKey: viewKey(), current: isViewingCurrent() });
      updatePhase();
    }
  }, 30 * 1000);

  // ---------------------------------------------------------------------------
  // Time of day
  // ---------------------------------------------------------------------------
  function timeOfDay() {
    const forced = params.get('phase');
    if (forced) return forced;
    const h = now().getHours();
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 17) return 'day';
    if (h >= 17 && h < 20) return 'dusk';
    return 'night';
  }
  let phase = null;
  function updatePhase() {
    const p = timeOfDay();
    if (p !== phase) {
      phase = p;
      document.documentElement.dataset.phase = p;
      emit('phase', { phase: p });
    }
  }
  setInterval(updatePhase, 60 * 1000);

  // ---------------------------------------------------------------------------
  // Stage scaling + pointer tracking
  // ---------------------------------------------------------------------------
  const view = { scale: 1, ox: 0, oy: 0 };
  function fit() {
    const stage = document.getElementById('stage');
    if (!stage) return;
    const W = window.innerWidth, H = window.innerHeight;
    const s = Math.min(W / STAGE.w, H / STAGE.h);
    view.scale = s;
    view.ox = (W - STAGE.w * s) / 2;
    view.oy = (H - STAGE.h * s) / 2;
    stage.style.transform = `translate(${view.ox}px, ${view.oy}px) scale(${s})`;
    emit('resize', { scale: s });
  }
  function clientToStage(cx, cy) { return { x: (cx - view.ox) / view.scale, y: (cy - view.oy) / view.scale }; }

  const pointer = { x: -9999, y: -9999, inside: false, lastMove: 0 };
  let pointerRaf = 0;
  window.addEventListener('pointermove', e => {
    const p = clientToStage(e.clientX, e.clientY);
    pointer.x = p.x; pointer.y = p.y; pointer.inside = true; pointer.lastMove = performance.now();
    if (!pointerRaf) pointerRaf = requestAnimationFrame(() => { pointerRaf = 0; emit('pointer', pointer); });
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.inside = false; pointer.x = pointer.y = -9999; emit('pointer', pointer); });

  // ---------------------------------------------------------------------------
  // Perches: spots animals may visit (blossoms, lanterns, stones...)
  // ---------------------------------------------------------------------------
  const perches = new Map();
  function addPerch(id, x, y, kind) { perches.set(id, { id, x, y, kind: kind || 'any' }); }
  function removePerch(id) { perches.delete(id); }
  function getPerches(kind) { return [...perches.values()].filter(p => !kind || p.kind === kind || kind === 'any'); }

  // ---------------------------------------------------------------------------
  // Tooltip (shared)
  // ---------------------------------------------------------------------------
  let tipEl = null, tipTimer = 0;
  function tipShow(stageX, stageY, html, opts) {
    tipEl = tipEl || document.getElementById('tooltip');
    if (!tipEl) return;
    clearTimeout(tipTimer);
    tipEl.innerHTML = html;
    tipEl.style.left = stageX + 'px';
    tipEl.style.top = stageY + 'px';
    tipEl.dataset.side = (opts && opts.side) || 'top';
    tipEl.classList.add('is-on');
    tipEl.setAttribute('aria-hidden', 'false');
  }
  function tipHide() {
    if (!tipEl) return;
    tipTimer = setTimeout(() => { tipEl.classList.remove('is-on'); tipEl.setAttribute('aria-hidden', 'true'); }, 60);
  }

  // ---------------------------------------------------------------------------
  // Registration + mounting
  // ---------------------------------------------------------------------------
  const regionFactories = {};
  const layerFactories = {};
  const mounted = {};

  function registerRegion(id, factory) { regionFactories[id] = factory; }
  function registerLayer(id, factory) { layerFactories[id] = factory; }

  function habitById(id) { return HABITS.find(h => h.id === id); }

  function makeRegionContext(habit, el, b) {
    const changeFns = [], weekFns = [];
    const labels = [];

    const ctx = {
      habit, el, bounds: b, palette: PALETTE, layout: LAYOUT, reducedMotion,
      get sound() { return window.Garden.sound; },
      get fx() { return window.Garden.fx; },

      days: () => weekDays(habit.id),
      isDone: i => weekDays(habit.id)[i],
      count: () => weekDays(habit.id).filter(Boolean).length,
      todayIndex: () => isViewingCurrent() ? (now().getDay() + 6) % 7 : -1,
      isFuture: i => addDays(viewStart, i) > dateOnly(now()),
      isCurrentWeek: isViewingCurrent,
      dayDate: i => addDays(viewStart, i),
      dayName: i => DAY_NAMES[i],
      dayShort: i => DAY_SHORT[i],
      dateLabel: i => { const d = addDays(viewStart, i); return `${DAY_SHORT[i]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`; },
      streak: () => currentStreak(habit.id),

      // Convert region-local coordinates to stage coordinates (for fx, tooltips, perches).
      stage: (x, y) => ({ x: b.x + x, y: b.y + y }),

      toggle(i, opts) {
        opts = opts || {};
        if (ctx.isFuture(i)) return null;
        const before = weekDays(habit.id);
        const value = !before[i];
        setDay(habit.id, i, value);
        const after = weekDays(habit.id);
        const count = after.filter(Boolean).length;
        const complete = value && count === 7;
        if (!opts.silent && window.Garden.sound) window.Garden.sound.habit(habit.id, i, value, opts.soundDelay || 0);
        if (complete && window.Garden.sound) window.Garden.sound.flourish(habit.id, (opts.soundDelay || 0) + 0.45);
        const payload = { habitId: habit.id, day: i, value, count, complete, weekKey: viewKey() };
        changeFns.forEach(fn => fn(payload));
        emit('change', payload);
        if (complete) emit('complete', payload);
        return value;
      },

      onChange(fn) { changeFns.push(fn); },
      onWeekChange(fn) { weekFns.push(fn); },

      tooltip: {
        show(localX, localY, html, opts) { tipShow(b.x + localX, b.y + localY, html, opts); },
        hide: tipHide,
      },

      // Accessible, consistent interaction wiring for a single day element (HTML or SVG).
      bindDay(node, i, opts) {
        opts = opts || {};
        node.setAttribute('role', 'button');
        node.setAttribute('tabindex', '0');
        node.dataset.day = String(i);
        node.classList.add('day-hit');
        const anchor = () => (typeof opts.anchor === 'function' ? opts.anchor() : opts.anchor) || { x: 0, y: 0 };

        const refresh = () => {
          const done = ctx.isDone(i), future = ctx.isFuture(i), today = ctx.todayIndex() === i;
          node.classList.toggle('is-done', done);
          node.classList.toggle('is-future', future);
          node.classList.toggle('is-today', today);
          node.setAttribute('aria-pressed', done ? 'true' : 'false');
          node.setAttribute('aria-disabled', future ? 'true' : 'false');
          node.setAttribute('aria-label', `${habit.name}, ${ctx.dayName(i)} ${ctx.dateLabel(i).split(', ')[1]}, ${future ? 'not yet' : done ? 'done' : 'not done'}`);
          if (future) node.setAttribute('tabindex', '-1'); else node.setAttribute('tabindex', '0');
        };
        const tipHtml = () => {
          const future = ctx.isFuture(i), done = ctx.isDone(i);
          const state = future ? 'Not yet' : done ? 'Done' : (ctx.todayIndex() === i ? 'Today' : 'Resting');
          return `<span class="tip-date">${ctx.dateLabel(i)}</span><span class="tip-state" data-state="${state.toLowerCase()}">${state}</span>`;
        };
        const activate = (e) => {
          if (ctx.isFuture(i)) { if (opts.onBlocked) opts.onBlocked(); return; }
          const value = ctx.toggle(i, { silent: !!opts.silent, soundDelay: opts.soundDelay || 0 });
          refresh();
          if (opts.onToggle) opts.onToggle(value, e);
          const a = anchor();
          ctx.tooltip.show(a.x, a.y, tipHtml());
        };
        node.addEventListener('click', activate);
        node.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(e); }
        });
        node.addEventListener('pointerenter', () => {
          node.classList.add('is-hover');
          const a = anchor();
          ctx.tooltip.show(a.x, a.y, tipHtml());
          if (opts.onHover) opts.onHover(true);
        });
        node.addEventListener('pointerleave', () => {
          node.classList.remove('is-hover');
          ctx.tooltip.hide();
          if (opts.onHover) opts.onHover(false);
        });
        node.addEventListener('focus', () => { node.classList.add('is-focus'); const a = anchor(); ctx.tooltip.show(a.x, a.y, tipHtml()); });
        node.addEventListener('blur', () => { node.classList.remove('is-focus'); ctx.tooltip.hide(); });

        refresh();
        changeFns.push(refresh);
        weekFns.push(refresh);
        return { refresh };
      },

      // Shared label pill: name + count. Positioned in region-local coords.
      placeLabel(x, y, opts) {
        opts = opts || {};
        const lab = document.createElement('div');
        lab.className = 'habit-label';
        lab.dataset.align = opts.align || 'left';
        lab.style.left = x + 'px';
        lab.style.top = y + 'px';
        lab.style.setProperty('--habit', habit.color);
        lab.style.setProperty('--habit-deep', habit.deep);
        lab.innerHTML = `<span class="hl-dot"></span><span class="hl-name">${habit.name}</span><span class="hl-count"><b>0</b><i>/7</i></span><span class="hl-streak"></span>`;
        el.appendChild(lab);
        const upd = () => {
          const c = ctx.count();
          lab.querySelector('.hl-count b').textContent = c;
          const s = currentStreak(habit.id);
          const st = lab.querySelector('.hl-streak');
          st.textContent = s >= 2 && isViewingCurrent() ? `${s}-day streak` : '';
          st.style.display = st.textContent ? '' : 'none';
          lab.classList.toggle('is-complete', c === 7);
        };
        upd();
        on('rename', () => { lab.querySelector('.hl-name').textContent = habit.name; });
        labels.push(upd);
        changeFns.push(upd);
        weekFns.push(upd);
        return lab;
      },

      _fireWeek(p) { weekFns.forEach(fn => fn(p)); },
    };
    return ctx;
  }

  function mountAll() {
    const layerRegions = document.getElementById('layer-regions');
    // Background layer first.
    mountLayer('backdrop', document.getElementById('layer-backdrop'));
    mountLayer('grass', document.getElementById('layer-backdrop'));
    HABITS.forEach(h => {
      const f = regionFactories[h.id];
      const b = REGIONS[h.id];
      const el = document.createElement('div');
      el.className = `region region-${h.id}`;
      el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
      el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
      el.style.setProperty('--habit', h.color);
      el.style.setProperty('--habit-soft', h.soft);
      el.style.setProperty('--habit-deep', h.deep);
      layerRegions.appendChild(el);
      if (!f) { console.warn('[garden] region not registered:', h.id); return; }
      const ctx = makeRegionContext(h, el, b);
      try {
        const inst = f(ctx) || {};
        mounted[h.id] = { ctx, inst };
        on('week', p => { ctx._fireWeek(p); });
      } catch (e) {
        console.error('[garden] region failed to mount:', h.id, e);
      }
    });
    mountLayer('animals', document.getElementById('layer-animals'));
  }

  function mountLayer(id, el) {
    const f = layerFactories[id];
    if (!f) { console.warn('[garden] layer not registered:', id); return; }
    try {
      mounted[id] = { inst: f({ el, palette: PALETTE, layout: LAYOUT, habits: HABITS, reducedMotion }) || {} };
    } catch (e) { console.error('[garden] layer failed to mount:', id, e); }
  }

  // ---------------------------------------------------------------------------
  // Stats helpers (used by analytics + labels)
  // ---------------------------------------------------------------------------
  function isDoneOn(habitId, date) {
    const ws = startOfWeek(date);
    const arr = data.weeks[keyOf(ws)] && data.weeks[keyOf(ws)][habitId];
    return !!(arr && arr[(date.getDay() + 6) % 7]);
  }
  function currentStreak(habitId) {
    let d = dateOnly(now());
    if (!isDoneOn(habitId, d)) d = addDays(d, -1); // today not done yet doesn't break a streak
    let n = 0;
    while (isDoneOn(habitId, d) && n < 3650) { n++; d = addDays(d, -1); }
    return n;
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  function settings() { return data.settings; }
  function setSetting(k, v) { data.settings[k] = v; persist(); emit('settings', data.settings); }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  window.Garden = {
    STAGE, PALETTE, HABITS, REGIONS, LAYOUT, DAY_NAMES, DAY_SHORT, MONTHS, MONTHS_LONG,
    reducedMotion, demo: DEMO,
    on, off, emit,
    registerRegion, registerLayer, mountAll, mounted,
    habitById,
    // dates
    now, dateOnly, addDays, startOfWeek, keyOf, fromKey,
    // state
    data: () => data,
    weekDays, viewKey, viewStart: () => viewStart, isViewingCurrent, shiftWeek, goToCurrentWeek, currentWeekStart,
    isDoneOn, currentStreak,
    settings, setSetting, renameHabits, defaultNames: () => Object.assign({}, DEFAULT_NAMES),
    // environment
    timeOfDay, updatePhase, fit, view, clientToStage, pointer,
    // perches
    addPerch, removePerch, getPerches,
    tooltip: { show: tipShow, hide: tipHide },
    sound: null, fx: null,
  };
})();
