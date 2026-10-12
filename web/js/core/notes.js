/* Garden of Days — the garden note: one quiet line under the title.
   It never scolds. It notices what you did, and it waits for you when you didn't. */
(function () {
  'use strict';
  const G = window.Garden;

  // Everyday lines, one per day, chosen by the date so the same day always says the same thing.
  const DAILY = [
    'Nothing here is in a hurry. Neither are you.',
    'Small things, done often, become the shape of a life.',
    'A garden is mostly waiting. The waiting counts too.',
    'You don’t have to do everything today. Just tend one thing well.',
    'Roots grow where no one can see them.',
    'The stones don’t care how fast you stack them. Only that you come back.',
    'Some days are for blooming. Some days are for resting. Both are growing.',
    'One more word in Arabic is one more door you can open.',
    '一 is a single stroke, and it is still a word. Start there.',
    'Interviews are just conversations you’ve practised for. Practise kindly.',
    'Strength is only kept promises, stacked one on top of another.',
    'Your heart is a muscle that learns patience when you run.',
    'Water doesn’t argue with the stone. It just keeps arriving.',
    'Breathe out. The willows have nowhere to be.',
    'A lantern only has to be lit once a day.',
    'The moon fills in slowly. It is never late.',
    'Be gentle with the version of you that showed up today.',
    'Progress is quiet. You will hear it later.',
    'Every blossom on the branch was once a closed bud. So was every skill.',
    'Consistency is a soft thing. It bends, and it stays.',
    'You are allowed to begin again on any day of the week.',
    'Reading slowly is still reading.',
    'If today is heavy, choose the smallest seed.',
    'The koi don’t swim to get somewhere. They swim because they’re alive.',
    'Look how much is already growing.',
    'Rest is not the opposite of growth. It’s the soil.',
    'You don’t need a perfect week. You need the next good day.',
    'The cairn is built one calm stone at a time.',
    'Learning a language is learning to be a beginner, gracefully.',
    'Someday you’ll read a sentence without thinking. This is how that day arrives.',
  ];

  const MORNING = [
    'Good morning. The garden is awake and so are you.',
    'Morning light is the softest place to begin.',
    'A new page. Nothing has to be earned yet.',
  ];
  const NIGHT = [
    'The lanterns can keep watch now. You can rest.',
    'Whatever today was, it’s allowed to be over.',
    'Night in the garden. Everything that grew today is still growing.',
  ];
  const EVENING_EMPTY = [
    'There’s still a little light left. One small thing is enough.',
    'Even five minutes counts as tending.',
  ];
  const AFTER_REST = [
    'Yesterday rested. The soil is still good.',
    'You came back. That’s the whole secret.',
  ];
  const ALL_DONE = [
    'All five tended today. Go and be proud, quietly.',
    'Everything has water today. The garden is full.',
    'A whole day, kept. Thank you for showing up for yourself.',
  ];
  const FIRST = [
    'The first seed of the day. The rest gets easier from here.',
    'One tended. The garden noticed.',
  ];
  const PAST_WEEK = 'A week you lived. Every bloom here was real.';

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pick(list, salt) { const k = G.keyOf(G.dateOnly(G.now())); return list[hash(k + salt) % list.length]; }

  function doneToday() {
    const d = G.dateOnly(G.now());
    return G.HABITS.filter(h => G.isDoneOn(h.id, d)).length;
  }
  function doneYesterday() {
    const d = G.addDays(G.dateOnly(G.now()), -1);
    return G.HABITS.filter(h => G.isDoneOn(h.id, d)).length;
  }
  function longestStreak() {
    let best = { n: 0, h: null };
    G.HABITS.forEach(h => { const n = G.currentStreak(h.id); if (n > best.n) best = { n, h }; });
    return best;
  }

  function current() {
    if (!G.isViewingCurrent()) return PAST_WEEK;
    const n = doneToday(), hour = G.now().getHours();
    if (n === G.HABITS.length) return pick(ALL_DONE, 'all');
    const s = longestStreak();
    if (s.n > 0 && s.n % 7 === 0 && G.isDoneOn(s.h.id, G.dateOnly(G.now()))) {
      return `${s.n} days of ${s.h.name.toLowerCase()} in a row. That’s a root now, not a habit.`;
    }
    if (n === 1) return pick(FIRST, 'first');
    if (n === 0 && hour >= 18 && hour < 22) return pick(EVENING_EMPTY, 'eve');
    if (hour >= 22 || hour < 5) return pick(NIGHT, 'night');
    if (n === 0 && doneYesterday() === 0 && hour < 12) return pick(AFTER_REST, 'rest');
    if (hour >= 5 && hour < 9 && n === 0) return pick(MORNING, 'morning');
    return pick(DAILY, 'daily');
  }

  G.notes = { current };
})();
