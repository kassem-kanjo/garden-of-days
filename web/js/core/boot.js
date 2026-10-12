/* Garden of Days — boot */
(function () {
  'use strict';
  const G = window.Garden;
  function start() {
    G.updatePhase();
    G.fit();
    window.addEventListener('resize', G.fit);
    G.mountAll();
    G.ui.buildHeader();
    G.ui.buildAnalytics();
    G.fx.resize();
    // Week-complete celebration: petals drift across the whole garden in that habit's colors.
    G.on('complete', p => {
      const h = G.habitById(p.habitId);
      G.fx.rain({ kind: p.habitId === 'weights' ? 'leaf' : 'petal', colors: [h.color, h.soft, '#FBF5EC'], count: 60 });
    });
    document.documentElement.classList.add('is-ready');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
