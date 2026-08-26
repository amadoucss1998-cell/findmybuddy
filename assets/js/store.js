/* ============================================================
   Find My Buddy — Store (state + persistence + logic)
   Exposed on window.Store
   ============================================================ */
(function () {
  const KEY = "fmb_state_v1";
  const D = window.FMB_DATA;

  function uid(prefix) { return prefix + "_" + Math.random().toString(36).slice(2, 9); }
  function now() { return Date.now(); }

  function futureDate(inDays, hour) {
    const d = new Date();
    d.setDate(d.getDate() + inDays);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  }

  function buildSeedActivities() {
    return D.ACTIVITY_SEED.map((a) => ({
      id: uid("act"),
      title: a.title,
      interest: a.interest,
      hostId: a.host,
      county: a.county,
      location: a.location,
      when: futureDate(a.inDays, a.hour),
      capacity: a.cap,
      priceLRD: a.priceLRD,
      desc: a.desc,
      attendees: seedAttendees(a.host, a.interest),
      promoted: a.priceLRD > 800, // pretend paid boosts
      createdAt: now(),
    }));
  }

  // give each seed activity a few plausible attendees
  function seedAttendees(hostId, interest) {
    const pool = D.PEOPLE.filter((p) => p.id !== hostId && p.interests.includes(interest)).map((p) => p.id);
    const others = D.PEOPLE.filter((p) => p.id !== hostId && !p.interests.includes(interest)).map((p) => p.id);
    const picks = [hostId, ...pool.slice(0, 3), ...others.slice(0, 1)];
    return [...new Set(picks)];
  }

  const DEFAULT_STATE = () => ({
    onboarded: false,
    theme: "light",
    me: null, // {id,name,county,bio,interests[],plus:false}
    people: D.PEOPLE.map((p) => ({ ...p, avatarColor: pickColor(p.id) })),
    activities: buildSeedActivities(),
    connections: [],   // person ids I've connected with
    joined: [],        // activity ids I've joined
    threads: {},       // personId -> [{from:'me'|'them', text, at}]
    seenPlus: false,
  });

  function pickColor(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return D.AV_COLORS[h % D.AV_COLORS.length];
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULT_STATE();
      const parsed = JSON.parse(raw);
      // shallow migration safety
      return Object.assign(DEFAULT_STATE(), parsed);
    } catch (e) {
      return DEFAULT_STATE();
    }
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  const listeners = new Set();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit() { persist(); listeners.forEach((fn) => fn(state)); }

  /* ---------- Selectors ---------- */
  function get() { return state; }
  function me() { return state.me; }
  function personById(id) {
    if (state.me && id === state.me.id) return { ...state.me, avatarColor: pickColor(state.me.id), isMe: true };
    return state.people.find((p) => p.id === id) || { id, name: "Unknown", county: "", interests: [], avatarColor: "#999" };
  }
  function interestById(id) { return D.INTERESTS.find((i) => i.id === id); }
  function activityById(id) { return state.activities.find((a) => a.id === id); }

  // Match score 0..100 between me and a person = shared interests weighted + same county bonus
  function matchScore(person) {
    if (!state.me) return 0;
    const mine = new Set(state.me.interests);
    const shared = person.interests.filter((i) => mine.has(i));
    const denom = Math.max(1, Math.min(mine.size, person.interests.length));
    let score = Math.round((shared.length / denom) * 92);
    if (person.county === state.me.county) score += 8;
    return Math.max(6, Math.min(100, score));
  }
  function sharedInterests(person) {
    if (!state.me) return [];
    const mine = new Set(state.me.interests);
    return person.interests.filter((i) => mine.has(i));
  }

  function suggestedPeople() {
    return state.people
      .map((p) => ({ ...p, _score: matchScore(p), _shared: sharedInterests(p).length }))
      .sort((a, b) => b._score - a._score);
  }

  function activityRelevance(a) {
    if (!state.me) return a.promoted ? 1 : 0;
    const mine = new Set(state.me.interests);
    let s = mine.has(a.interest) ? 60 : 0;
    if (a.county === state.me.county) s += 20;
    if (a.promoted) s += 10;
    // soonness bonus
    const days = (a.when - now()) / 86400000;
    if (days > 0 && days < 4) s += 8;
    return s;
  }

  function upcomingActivities() {
    return state.activities
      .filter((a) => a.when > now() - 3600000)
      .map((a) => ({ ...a, _rel: activityRelevance(a) }))
      .sort((a, b) => b._rel - a._rel || a.when - b.when);
  }

  /* ---------- Mutations ---------- */
  function completeOnboarding(profile) {
    state.me = {
      id: uid("me"),
      name: profile.name.trim(),
      county: profile.county,
      bio: profile.bio.trim(),
      interests: profile.interests,
      plus: false,
      avatarColor: "#4f46e5",
      joinedAt: now(),
    };
    state.onboarded = true;
    emit();
  }

  function updateProfile(patch) {
    if (!state.me) return;
    Object.assign(state.me, patch);
    emit();
  }

  function toggleConnection(personId) {
    const i = state.connections.indexOf(personId);
    if (i >= 0) state.connections.splice(i, 1);
    else state.connections.push(personId);
    emit();
    return state.connections.includes(personId);
  }
  function isConnected(personId) { return state.connections.includes(personId); }

  function toggleJoin(activityId) {
    const a = activityById(activityId);
    if (!a || !state.me) return false;
    const meId = state.me.id;
    const i = state.joined.indexOf(activityId);
    if (i >= 0) {
      state.joined.splice(i, 1);
      a.attendees = a.attendees.filter((x) => x !== meId);
    } else {
      state.joined.push(activityId);
      if (!a.attendees.includes(meId)) a.attendees.push(meId);
    }
    emit();
    return state.joined.includes(activityId);
  }
  function isJoined(activityId) { return state.joined.includes(activityId); }

  function createActivity(data) {
    const a = {
      id: uid("act"),
      title: data.title.trim(),
      interest: data.interest,
      hostId: state.me.id,
      county: data.county,
      location: data.location.trim(),
      when: data.when,
      capacity: Number(data.capacity) || 20,
      priceLRD: Number(data.priceLRD) || 0,
      desc: data.desc.trim(),
      attendees: [state.me.id],
      promoted: !!data.promoted,
      createdAt: now(),
    };
    state.activities.unshift(a);
    state.joined.push(a.id);
    emit();
    return a;
  }

  function myHostedActivities() {
    if (!state.me) return [];
    return state.activities.filter((a) => a.hostId === state.me.id).sort((a, b) => a.when - b.when);
  }
  function myJoinedActivities() {
    return state.joined.map(activityById).filter(Boolean).sort((a, b) => a.when - b.when);
  }

  /* ---------- Messaging ---------- */
  const AUTO_REPLIES = [
    "Hey! Great to connect 🙌", "That sounds good, count me in!",
    "Yes o! When and where?", "Nice, let's link up this week.",
    "For real? I've been wanting to try that.", "Cool cool, I'll bring a friend too.",
    "Bless! See you there.", "Ha, love the energy 😄 let's do it.",
  ];
  function thread(personId) { return state.threads[personId] || []; }
  function sendMessage(personId, text) {
    if (!text.trim()) return;
    if (!state.threads[personId]) state.threads[personId] = [];
    state.threads[personId].push({ from: "me", text: text.trim(), at: now() });
    emit();
    // simulate a reply after a short delay
    setTimeout(() => {
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      state.threads[personId].push({ from: "them", text: reply, at: now() });
      emit();
    }, 1100 + Math.random() * 900);
  }
  function conversations() {
    return Object.keys(state.threads)
      .map((pid) => {
        const t = state.threads[pid];
        const last = t[t.length - 1];
        return { personId: pid, last, count: t.length };
      })
      .sort((a, b) => (b.last ? b.last.at : 0) - (a.last ? a.last.at : 0));
  }

  function upgradeToPlus() {
    if (state.me) { state.me.plus = true; emit(); }
  }

  function setTheme(t) { state.theme = t; document.documentElement.setAttribute("data-theme", t); emit(); }

  function resetAll() {
    localStorage.removeItem(KEY);
    state = DEFAULT_STATE();
    emit();
  }

  // apply theme immediately
  document.documentElement.setAttribute("data-theme", state.theme || "light");

  window.Store = {
    subscribe, get, me, personById, interestById, activityById,
    matchScore, sharedInterests, suggestedPeople, upcomingActivities, activityRelevance,
    completeOnboarding, updateProfile, toggleConnection, isConnected,
    toggleJoin, isJoined, createActivity, myHostedActivities, myJoinedActivities,
    thread, sendMessage, conversations, upgradeToPlus, setTheme, resetAll,
    uid, pickColor,
  };
})();
