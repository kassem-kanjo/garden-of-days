/* Garden of Days — header (title, week navigation, sound) and the analytics pebble. */
(function () {
  'use strict';
  const G = window.Garden;

  const ICONS = {
    prev: '<svg viewBox="0 0 24 24"><path d="M14.5 6 8.5 12l6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9.5 6l6 6-6 6"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 10v4h3.5L12 18V6L7.5 10z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path d="M18 6.8a7.4 7.4 0 0 1 0 10.4"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24"><path d="M4 10v4h3.5L12 18V6L7.5 10z"/><path d="M16 10l4 4M20 10l-4 4"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M14.5 5.5l4 4"/><path d="M5 19l1-4L16.5 4.5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L9 18z"/></svg>',
    ambient: '<svg viewBox="0 0 24 24"><path d="M3 9.5c2.2-1.6 4.3-1.6 6.5 0s4.3 1.6 6.5 0 3.6-1.3 5 0"/><path d="M3 14.5c2.2-1.6 4.3-1.6 6.5 0s4.3 1.6 6.5 0 3.6-1.3 5 0"/></svg>',
  };

  function fmtRange(start) {
    const end = G.addDays(start, 6), M = G.MONTHS;
    return start.getMonth() === end.getMonth()
      ? `${M[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`
      : `${M[start.getMonth()]} ${start.getDate()} – ${M[end.getMonth()]} ${end.getDate()}`;
  }

  // ---------------- Header ----------------
  function buildHeader() {
    const h = document.getElementById('header');
    const d = G.now();
    h.innerHTML = `
      <div class="brand">
        <div class="brand-row">
          <h1>Garden of days</h1>
          <span class="today-line">${G.DAY_NAMES[(d.getDay() + 6) % 7]}, ${G.MONTHS_LONG[d.getMonth()]} ${d.getDate()}</span>
        </div>
        <p class="garden-note" aria-live="polite"><span></span></p>
      </div>
      <div class="controls">
        <div class="pill"><div class="pill-inner">
          <button class="icon-btn" id="wk-prev" aria-label="Previous week">${ICONS.prev}</button>
          <div class="week-label" id="wk-label" title="Back to this week"></div>
          <button class="icon-btn" id="wk-next" aria-label="Next week">${ICONS.next}</button>
        </div></div>
        <div class="pill"><div class="pill-inner">
          <button class="icon-btn" id="snd" aria-label="Sound"></button>
          <button class="icon-btn" id="amb" aria-label="Ambient garden sounds">${ICONS.ambient}</button>
          <button class="icon-btn" id="edit-names" aria-label="Rename habits" title="Rename habits">${ICONS.edit}</button>
        </div></div>
      </div>`;

    const prev = h.querySelector('#wk-prev'), next = h.querySelector('#wk-next'), label = h.querySelector('#wk-label');
    const snd = h.querySelector('#snd'), amb = h.querySelector('#amb');

    const refreshWeek = () => {
      label.innerHTML = fmtRange(G.viewStart()) + (G.isViewingCurrent() ? '' : '<span class="back-today">Back to this week</span>');
      next.disabled = G.isViewingCurrent();
      const t = G.now();
      h.querySelector('.today-line').textContent = `${G.DAY_NAMES[(t.getDay() + 6) % 7]}, ${G.MONTHS_LONG[t.getMonth()]} ${t.getDate()}`;
    };
    const refreshSound = () => {
      const on = G.sound.isEnabled();
      snd.innerHTML = on ? ICONS.sound : ICONS.soundOff;
      snd.setAttribute('aria-pressed', String(on));
      amb.setAttribute('aria-pressed', String(G.sound.isAmbient()));
      amb.title = G.sound.isAmbient() ? 'Ambient sounds on' : 'Ambient sounds off';
    };

    prev.addEventListener('click', () => { if (G.shiftWeek(-1)) G.sound.ui('nav'); });
    next.addEventListener('click', () => { if (G.shiftWeek(1)) G.sound.ui('nav'); });
    label.addEventListener('click', () => { if (!G.isViewingCurrent()) { G.goToCurrentWeek(); G.sound.ui('nav'); } });
    snd.addEventListener('click', () => { G.sound.setEnabled(!G.sound.isEnabled()); refreshSound(); if (G.sound.isEnabled()) G.sound.ui('toggle-on'); });
    amb.addEventListener('click', () => { G.sound.setAmbient(!G.sound.isAmbient()); refreshSound(); });

    window.addEventListener('keydown', e => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft' && (e.metaKey || e.altKey)) { if (G.shiftWeek(-1)) G.sound.ui('nav'); }
      if (e.key === 'ArrowRight' && (e.metaKey || e.altKey)) { if (G.shiftWeek(1)) G.sound.ui('nav'); }
    });

    // The garden note crossfades when what it wants to say changes.
    const note = h.querySelector('.garden-note span');
    let noteTimer = 0;
    const refreshNote = (instant) => {
      if (!G.notes) return;
      const text = G.notes.current();
      if (note.textContent === text) return;
      clearTimeout(noteTimer);
      if (instant === true) { note.textContent = text; note.classList.add('is-on'); return; }
      note.classList.remove('is-on');
      noteTimer = setTimeout(() => { note.textContent = text; note.classList.add('is-on'); }, 650);
    };
    G.on('change', () => setTimeout(refreshNote, 900));
    G.on('week', refreshNote);
    setInterval(refreshNote, 5 * 60 * 1000);

    G.on('week', refreshWeek);
    refreshWeek(); refreshSound(); refreshNote(true);

    h.querySelector('#edit-names').addEventListener('click', openRename);
  }

  // ---------------- Rename habits ----------------
  let sheet = null;
  function buildRename() {
    sheet = document.createElement('div');
    sheet.id = 'rename';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'rename-title');
    const defaults = G.defaultNames();
    sheet.innerHTML = `
      <div class="sheet-card">
        <h2 id="rename-title">Your habits</h2>
        <p>Rename them anytime. Your history stays the same.</p>
        <form>
          ${G.HABITS.map(h => `
            <label class="sheet-row" style="--habit:${h.color}">
              <span class="sheet-dot"></span>
              <input type="text" maxlength="28" spellcheck="false" autocomplete="off" data-id="${h.id}" placeholder="${defaults[h.id]}">
            </label>`).join('')}
          <div class="sheet-actions">
            <button type="button" class="sheet-btn ghost" data-act="cancel">Cancel</button>
            <button type="submit" class="sheet-btn primary">Save</button>
          </div>
        </form>
      </div>`;
    document.getElementById('layer-ui').appendChild(sheet);
    const form = sheet.querySelector('form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const names = {};
      sheet.querySelectorAll('input').forEach(i => { names[i.dataset.id] = i.value; });
      G.renameHabits(names);
      G.sound.ui('toggle-on');
      closeRename();
    });
    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeRename);
    sheet.addEventListener('pointerdown', e => { if (e.target === sheet) closeRename(); });
    sheet.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeRename(); } e.stopPropagation(); });
  }
  function openRename() {
    if (!sheet) buildRename();
    sheet.querySelectorAll('input').forEach(i => { i.value = G.habitById(i.dataset.id).name; });
    sheet.classList.add('is-open');
    setTimeout(() => { const f = sheet.querySelector('input'); f.focus(); f.select(); }, 60);
  }
  function closeRename() {
    if (!sheet) return;
    sheet.classList.remove('is-open');
    const btn = document.getElementById('edit-names');
    if (btn) btn.focus();
  }

  // ---------------- Analytics ----------------
  function computeStats() {
    const data = G.data();
    const ws = G.viewStart(), wk = G.viewKey(), current = G.isViewingCurrent();
    const today = G.dateOnly(G.now());
    const todayIdx = (today.getDay() + 6) % 7;
    const daysElapsed = current ? todayIdx + 1 : 7;

    let done = 0;
    G.HABITS.forEach(h => { done += G.weekDays(h.id, wk).slice(0, daysElapsed).filter(Boolean).length; });
    const possible = G.HABITS.length * daysElapsed;

    // Per-habit share of the week's checks, for the segmented ring.
    const perHabit = G.HABITS.map(h => ({ h, n: G.weekDays(h.id, wk).slice(0, daysElapsed).filter(Boolean).length }));

    // Best current streak.
    let best = { n: 0, h: null };
    G.HABITS.forEach(h => { const s = G.currentStreak(h.id); if (s > best.n) best = { n: s, h }; });

    // Daily rhythm: completion rate by weekday over the last 8 weeks (only days that have happened).
    const rates = Array.from({ length: 7 }, () => ({ hit: 0, total: 0 }));
    for (let w = 0; w < 8; w++) {
      const s = G.addDays(G.currentWeekStart(), -7 * w), k = G.keyOf(s);
      const hasAny = data.weeks[k];
      if (!hasAny && w > 0) continue;
      for (let i = 0; i < 7; i++) {
        if (G.addDays(s, i) > today) continue;
        G.HABITS.forEach(h => { rates[i].total++; if (G.weekDays(h.id, k)[i]) rates[i].hit++; });
      }
    }
    const rate = rates.map(r => (r.total ? r.hit / r.total : 0));
    const bestDay = rate.reduce((bi, v, i) => (v > rate[bi] ? i : bi), 0);

    // Versus the previous week, same number of days.
    const prevKey = G.keyOf(G.addDays(ws, -7));
    let prevDone = 0;
    G.HABITS.forEach(h => { prevDone += G.weekDays(h.id, prevKey).slice(0, daysElapsed).filter(Boolean).length; });

    return { done, possible, perHabit, best, rate, bestDay, delta: done - prevDone, todayIdx: current ? todayIdx : -1, current };
  }

  function buildAnalytics() {
    const el = document.getElementById('analytics');
    const R = 21, C = 2 * Math.PI * R;
    el.innerHTML = `
      <div class="core">
        <div class="stat">
          <svg class="ring" viewBox="0 0 52 52" aria-hidden="true">
            <circle class="track" cx="26" cy="26" r="${R}"/>
            <g transform="rotate(-90 26 26)" id="ring-segs"></g>
            <text x="26" y="31" text-anchor="middle" id="ring-pct">0</text>
          </svg>
          <div class="col"><span class="k">This week</span><span class="v" id="st-week">0 <small>of 0</small></span></div>
        </div>
        <div class="stat">
          <div class="col"><span class="k">Best streak</span><span class="v" id="st-streak">–</span></div>
        </div>
        <div class="stat">
          <div class="col"><span class="k" id="st-rhythm-k">Strongest day</span><span class="v" id="st-rhythm-v" style="font-size:17px">–</span></div>
          <div class="rhythm" id="st-rhythm" aria-hidden="true">${'<div class="bar"></div>'.repeat(7)}</div>
        </div>
        <div class="stat">
          <div class="col"><span class="k">vs last week</span><span class="v" id="st-delta">–</span></div>
        </div>
      </div>`;

    const segs = el.querySelector('#ring-segs');
    G.HABITS.forEach(h => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', 'seg'); c.setAttribute('cx', 26); c.setAttribute('cy', 26); c.setAttribute('r', R);
      c.setAttribute('stroke', h.color);
      c.style.strokeDasharray = `0 ${C}`;
      c.dataset.habit = h.id;
      segs.appendChild(c);
    });

    const counters = {};
    function countTo(node, to, fmt) {
      const id = node.id, from = counters[id] == null ? 0 : counters[id];
      counters[id] = to;
      const t0 = performance.now(), dur = 700;
      const tick = t => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        node.innerHTML = fmt(Math.round(from + (to - from) * e));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    function render() {
      const s = computeStats();
      const pct = s.possible ? Math.round((s.done / s.possible) * 100) : 0;

      // Segmented ring: each habit's share of the possible checks, in its own color.
      let offset = 0;
      segs.querySelectorAll('.seg').forEach((c, i) => {
        const n = s.perHabit[i].n, len = s.possible ? (n / s.possible) * C : 0;
        const gap = len > 3 ? 2.2 : 0;
        c.style.strokeDasharray = `${Math.max(0, len - gap)} ${C}`;
        c.style.strokeDashoffset = String(-offset);
        c.style.transition = 'stroke-dasharray 1000ms var(--ease-soft), stroke-dashoffset 1000ms var(--ease-soft)';
        offset += len;
      });
      countTo(el.querySelector('#ring-pct'), pct, v => `${v}%`);
      countTo(el.querySelector('#st-week'), s.done, v => `${v} <small>of ${s.possible}</small>`);

      const st = el.querySelector('#st-streak');
      if (s.best.n > 0 && s.best.h) {
        st.innerHTML = `${s.best.n} ${s.best.n === 1 ? 'day' : 'days'} <small style="color:${s.best.h.deep}">${s.best.h.name}</small>`;
      } else {
        st.innerHTML = `<small style="margin:0">Plant a first seed</small>`;
      }

      const bars = el.querySelectorAll('#st-rhythm .bar');
      const max = Math.max(0.0001, ...s.rate);
      bars.forEach((b, i) => {
        b.style.height = `${Math.max(3, Math.round((s.rate[i] / max) * 30))}px`;
        b.classList.toggle('best', i === s.bestDay && s.rate[i] > 0);
        b.classList.toggle('today', i === s.todayIdx);
        b.title = `${G.DAY_NAMES[i]}: ${Math.round(s.rate[i] * 100)}%`;
      });
      const anyRate = s.rate.some(v => v > 0);
      el.querySelector('#st-rhythm-v').textContent = anyRate ? G.DAY_NAMES[s.bestDay] + 's' : '–';

      const d = el.querySelector('#st-delta');
      d.className = 'v ' + (s.delta > 0 ? 'delta-up' : s.delta < 0 ? 'delta-down' : '');
      d.textContent = s.delta > 0 ? `+${s.delta}` : s.delta < 0 ? `−${Math.abs(s.delta)}` : 'Even';
    }

    G.on('change', render);
    G.on('week', render);
    G.on('rename', render);
    render();
  }

  G.ui = { buildHeader, buildAnalytics };
})();
