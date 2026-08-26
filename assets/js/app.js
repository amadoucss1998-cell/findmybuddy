/* ============================================================
   Find My Buddy — App (router + views)
   ============================================================ */
(function () {
  const S = window.Store;
  const D = window.FMB_DATA;
  const app = document.getElementById("app");

  /* ---------------- Helpers ---------------- */
  const h = (html) => html; // tag for readability
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function initials(name) {
    const parts = String(name).trim().split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
  }
  function avatar(person, size = 40, square = false) {
    return `<div class="avatar av-${size} ${square ? "sq" : ""}" style="background:${person.avatarColor || "#4f46e5"}">${esc(initials(person.name))}</div>`;
  }
  function money(lrd) { return lrd === 0 ? "Free" : "L$" + Number(lrd).toLocaleString(); }
  function interestPill(id, opts = {}) {
    const it = S.interestById(id); if (!it) return "";
    return `<span class="chip tiny ${opts.on ? "on" : ""}">${it.emoji} ${esc(it.label)}</span>`;
  }
  function fmtWhen(ts) {
    const d = new Date(ts);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dd = new Date(ts); dd.setHours(0, 0, 0, 0);
    const diff = Math.round((dd - today) / 86400000);
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    let day;
    if (diff === 0) day = "Today";
    else if (diff === 1) day = "Tomorrow";
    else if (diff > 1 && diff < 7) day = d.toLocaleDateString([], { weekday: "long" });
    else day = d.toLocaleDateString([], { month: "short", day: "numeric" });
    return `${day} · ${time}`;
  }
  function relTime(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    return Math.floor(s / 86400) + "d";
  }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  const modalRoot = document.getElementById("modal-root");
  function openSheet(innerHTML) {
    modalRoot.innerHTML = `<div class="overlay" id="ov"><div class="sheet" role="dialog" aria-modal="true"><div class="grabber"></div>${innerHTML}</div></div>`;
    const ov = document.getElementById("ov");
    ov.addEventListener("click", (e) => { if (e.target === ov) closeSheet(); });
    return modalRoot.querySelector(".sheet");
  }
  function closeSheet() { modalRoot.innerHTML = ""; }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modalRoot.innerHTML) closeSheet(); });

  /* ---------------- Router ---------------- */
  const routes = {};
  function route(name, fn) { routes[name] = fn; }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  window.FMB = { go, toast }; // for inline handlers

  function currentRoute() {
    const raw = (location.hash || "#/discover").slice(1);
    const [path, arg] = raw.split("/").filter(Boolean).length ? [raw.replace(/^\//, ""), null] : ["discover", null];
    const parts = raw.replace(/^\//, "").split("/");
    return { name: parts[0] || "discover", arg: parts[1] || null };
  }

  /* ---------------- Shell ---------------- */
  const TABS = [
    { name: "discover",   ic: "🧭", label: "Discover" },
    { name: "activities", ic: "📅", label: "Activities" },
    { name: "create",     ic: "＋", label: "Create", fab: true },
    { name: "messages",   ic: "💬", label: "Chats" },
    { name: "profile",    ic: "👤", label: "Profile" },
  ];
  function tabbar(active) {
    return `<nav class="tabbar">${TABS.map((t) => `
      <button class="tab ${t.name === active ? "active" : ""}" onclick="FMB.go('#/${t.name}')" aria-label="${t.label}">
        ${t.fab ? `<span class="fab-plus">＋</span>` : `<span class="ic">${t.ic}</span><span>${t.label}</span>`}
      </button>`).join("")}</nav>`;
  }
  function header(title, subtitle) {
    return `<header class="app-header">
      <div>
        <h1><span class="logo-dot"></span> ${esc(title)}</h1>
        ${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ""}
      </div>
      <div class="header-actions">
        <button class="icon-btn" onclick="FMB.toggleTheme()" aria-label="Toggle theme">${S.get().theme === "dark" ? "☀️" : "🌙"}</button>
      </div>
    </header>`;
  }
  function subheader(title, back = "#/discover") {
    return `<div class="subheader"><button class="icon-btn" onclick="FMB.go('${back}')" aria-label="Back">‹</button><h2>${esc(title)}</h2></div>`;
  }

  FMB.toggleTheme = () => { S.setTheme(S.get().theme === "dark" ? "light" : "dark"); render(); };

  /* ================= ONBOARDING ================= */
  const onboard = { step: 0, name: "", county: "Montserrado", interests: [], bio: "" };
  function renderOnboarding() {
    const steps = [stepWelcome, stepProfile, stepInterests, stepBio];
    app.innerHTML = `<div class="onboard">${steps[onboard.step]()}</div>`;
    wireOnboarding();
  }
  function dots() {
    return `<div class="progress-dots">${[0, 1, 2, 3].map((i) => `<i class="${i <= onboard.step ? "on" : ""}"></i>`).join("")}</div>`;
  }
  function stepWelcome() {
    return `
      <div class="onboard-hero" style="margin-top:8vh">
        <div class="onboard-logo">🤝</div>
        <h1>Find My Buddy</h1>
        <p class="lead">Meet people across Liberia who love what you love — and find or create activities to do together.</p>
      </div>
      <div class="mt-24">
        ${[["🧭", "Discover buddies", "Get matched by shared interests & county"],
           ["📅", "Join real activities", "Football, meetups, dinners, dance & more"],
           ["🚀", "Create your own", "Host an event and grow your community"]].map(([e, t, d]) => `
          <div class="card row" style="align-items:flex-start">
            <div class="avatar av-48 sq" style="background:var(--brand-soft);color:var(--brand);font-size:22px">${e}</div>
            <div class="grow"><div class="bold">${t}</div><div class="muted small">${d}</div></div>
          </div>`).join("")}
      </div>
      <div class="grow"></div>
      ${dots()}
      <button class="btn btn-primary btn-block" id="ob-next">Get started</button>`;
  }
  function stepProfile() {
    return `
      <div style="margin-top:2vh">
        <h1 style="font-size:24px">What's your name?</h1>
        <p class="lead">This is how buddies will find you.</p>
      </div>
      <div class="mt-24">
        <div class="field">
          <label>Full name</label>
          <input class="input" id="ob-name" placeholder="e.g. Amadou Kollie" value="${esc(onboard.name)}" autocomplete="name" />
        </div>
        <div class="field">
          <label>Your county</label>
          <select class="input" id="ob-county">
            ${D.COUNTIES.map((c) => `<option ${c === onboard.county ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="grow"></div>
      ${dots()}
      <div class="row">
        <button class="btn btn-ghost" id="ob-back">Back</button>
        <button class="btn btn-primary grow" id="ob-next">Continue</button>
      </div>`;
  }
  function stepInterests() {
    return `
      <div style="margin-top:2vh">
        <h1 style="font-size:24px">Pick your interests</h1>
        <p class="lead">Choose at least 3. We'll match you with buddies and activities.</p>
      </div>
      <div class="chips mt-24" id="ob-interests">
        ${D.INTERESTS.map((it) => `<button type="button" class="chip selectable ${onboard.interests.includes(it.id) ? "on" : ""}" data-id="${it.id}">${it.emoji} ${it.label}</button>`).join("")}
      </div>
      <div class="grow"></div>
      ${dots()}
      <div class="row">
        <button class="btn btn-ghost" id="ob-back">Back</button>
        <button class="btn btn-primary grow" id="ob-next">Continue (<span id="ob-count">${onboard.interests.length}</span>)</button>
      </div>`;
  }
  function stepBio() {
    return `
      <div style="margin-top:2vh">
        <h1 style="font-size:24px">Add a short bio</h1>
        <p class="lead">Tell buddies a little about you. You can change this later.</p>
      </div>
      <div class="mt-24">
        <div class="field">
          <textarea class="input" id="ob-bio" placeholder="e.g. Love football and coding. New to Monrovia, looking to meet people!">${esc(onboard.bio)}</textarea>
        </div>
      </div>
      <div class="grow"></div>
      ${dots()}
      <div class="row">
        <button class="btn btn-ghost" id="ob-back">Back</button>
        <button class="btn btn-primary grow" id="ob-finish">Join Find My Buddy 🎉</button>
      </div>`;
  }
  function wireOnboarding() {
    const next = document.getElementById("ob-next");
    const back = document.getElementById("ob-back");
    const finish = document.getElementById("ob-finish");
    if (back) back.onclick = () => { onboard.step--; renderOnboarding(); };
    if (next) next.onclick = () => {
      if (onboard.step === 1) {
        const name = document.getElementById("ob-name").value.trim();
        onboard.name = name;
        onboard.county = document.getElementById("ob-county").value;
        if (!name) { toast("Please enter your name"); return; }
      }
      if (onboard.step === 2 && onboard.interests.length < 3) { toast("Pick at least 3 interests"); return; }
      onboard.step++; renderOnboarding();
    };
    if (finish) finish.onclick = () => {
      onboard.bio = document.getElementById("ob-bio").value;
      S.completeOnboarding({ name: onboard.name, county: onboard.county, interests: onboard.interests, bio: onboard.bio });
      toast("Welcome to Find My Buddy! 🎉");
      go("#/discover");
    };
    const wrap = document.getElementById("ob-interests");
    if (wrap) wrap.querySelectorAll(".chip").forEach((c) => {
      c.onclick = () => {
        const id = c.dataset.id;
        const i = onboard.interests.indexOf(id);
        if (i >= 0) onboard.interests.splice(i, 1); else onboard.interests.push(id);
        c.classList.toggle("on");
        const cnt = document.getElementById("ob-count"); if (cnt) cnt.textContent = onboard.interests.length;
      };
    });
  }

  /* ================= DISCOVER (People) ================= */
  const discoverState = { q: "", filter: "all" };
  route("discover", () => {
    const meP = S.me();
    let people = S.suggestedPeople().filter((p) => !S.isConnected(p.id) || discoverState.filter !== "new");
    if (discoverState.filter === "connections") people = S.suggestedPeople().filter((p) => S.isConnected(p.id));
    if (discoverState.filter === "nearby") people = people.filter((p) => p.county === meP.county);
    if (discoverState.q) {
      const q = discoverState.q.toLowerCase();
      people = people.filter((p) => p.name.toLowerCase().includes(q) || p.bio.toLowerCase().includes(q) ||
        p.interests.some((i) => S.interestById(i)?.label.toLowerCase().includes(q)));
    }

    const body = `
      ${header("Discover", `Buddies who share your vibe, ${meP.name.split(" ")[0]}`)}
      <div class="screen">
        ${!meP.plus ? plusBanner() : ""}
        <div class="searchbar">
          <span class="ic">🔍</span>
          <input id="disc-q" placeholder="Search people or interests…" value="${esc(discoverState.q)}" />
        </div>
        <div class="segment">
          ${[["all", "For you"], ["nearby", "Nearby"], ["connections", "Connected"]].map(([k, l]) =>
            `<button class="${discoverState.filter === k ? "on" : ""}" data-f="${k}">${l}</button>`).join("")}
        </div>
        ${people.length ? people.map(personCard).join("") : emptyState("🔍", "No buddies found", "Try a different search or filter.")}
      </div>
      ${tabbar("discover")}`;
    app.innerHTML = body;

    const q = document.getElementById("disc-q");
    q.oninput = () => { discoverState.q = q.value; debounceRender(); };
    document.querySelectorAll(".segment button").forEach((b) => b.onclick = () => { discoverState.filter = b.dataset.f; render(); });
  });

  function personCard(p) {
    const shared = S.sharedInterests(p);
    const connected = S.isConnected(p.id);
    return `
      <div class="card">
        <div class="row" style="align-items:flex-start">
          <div onclick="FMB.go('#/person/${p.id}')">${avatar(p, 56)}</div>
          <div class="grow" onclick="FMB.go('#/person/${p.id}')">
            <div class="row gap-6"><span class="bold">${esc(p.name)}</span>${p.verified ? '<span class="badge-verified">✔︎</span>' : ""}</div>
            <div class="muted small">📍 ${esc(p.county)}</div>
          </div>
          <div class="center">
            <div class="bold" style="color:var(--green);font-size:18px">${p._score}%</div>
            <div class="tiny dim">match</div>
          </div>
        </div>
        <div class="meter mt-8" style="margin-top:10px"><i style="width:${p._score}%"></i></div>
        <p class="small muted" style="margin:10px 0">${esc(p.bio)}</p>
        <div class="tag-row mb-8">
          ${p.interests.slice(0, 4).map((i) => interestPill(i, { on: shared.includes(i) })).join("")}
        </div>
        <div class="row">
          <button class="btn ${connected ? "btn-ghost" : "btn-primary"} grow btn-sm" onclick="FMB.connect('${p.id}', this)">
            ${connected ? "✓ Connected" : "＋ Connect"}
          </button>
          <button class="btn btn-ghost btn-sm" onclick="FMB.go('#/chat/${p.id}')">💬 Message</button>
        </div>
      </div>`;
  }

  FMB.connect = (id, btn) => {
    const nowConnected = S.toggleConnection(id);
    toast(nowConnected ? "Connected! Say hi 👋" : "Removed connection");
    if (btn) {
      btn.className = `btn ${nowConnected ? "btn-ghost" : "btn-primary"} grow btn-sm`;
      btn.textContent = nowConnected ? "✓ Connected" : "＋ Connect";
    }
  };

  /* ================= PERSON DETAIL ================= */
  route("person", (id) => {
    const p = S.personById(id);
    const shared = S.sharedInterests(p);
    const score = S.matchScore(p);
    const connected = S.isConnected(id);
    app.innerHTML = `
      ${subheader("Profile", "#/discover")}
      <div class="screen">
        <div class="center" style="padding:12px 0 4px">
          ${avatar(p, 88)}
          <h2 style="margin-top:12px;font-size:22px">${esc(p.name)} ${p.verified ? '<span class="badge-verified">✔︎</span>' : ""}</h2>
          <div class="muted">📍 ${esc(p.county)}</div>
          <div class="row" style="justify-content:center;margin-top:6px">
            <span class="chip match">🔥 ${score}% match</span>
            ${shared.length ? `<span class="chip tiny">${shared.length} shared interest${shared.length > 1 ? "s" : ""}</span>` : ""}
          </div>
        </div>
        <div class="card"><p class="muted">${esc(p.bio)}</p></div>
        <div class="section-title" style="margin-top:8px">Interests</div>
        <div class="chips">${p.interests.map((i) => interestPill(i, { on: shared.includes(i) })).join("")}</div>
        <div class="row mt-24" style="position:sticky;bottom:16px">
          <button class="btn ${connected ? "btn-ghost" : "btn-primary"} grow" onclick="FMB.connect('${id}', this)">${connected ? "✓ Connected" : "＋ Connect"}</button>
          <button class="btn btn-accent grow" onclick="FMB.go('#/chat/${id}')">💬 Message</button>
        </div>
      </div>`;
  });

  /* ================= ACTIVITIES ================= */
  const actState = { q: "", cat: "all", scope: "discover" };
  route("activities", () => {
    let acts = S.upcomingActivities();
    if (actState.cat !== "all") acts = acts.filter((a) => a.interest === actState.cat);
    if (actState.q) {
      const q = actState.q.toLowerCase();
      acts = acts.filter((a) => a.title.toLowerCase().includes(q) || a.location.toLowerCase().includes(q) || a.county.toLowerCase().includes(q));
    }
    const cats = [["all", "🌍 All"]].concat(D.INTERESTS.filter((i) => S.get().activities.some((a) => a.interest === i.id)).map((i) => [i.id, `${i.emoji} ${i.label}`]));

    app.innerHTML = `
      ${header("Activities", "Things to do with your buddies")}
      <div class="screen">
        <div class="searchbar"><span class="ic">🔍</span><input id="act-q" placeholder="Search activities, places…" value="${esc(actState.q)}" /></div>
        <div class="scroll-x">
          ${cats.map(([k, l]) => `<button class="chip selectable ${actState.cat === k ? "on" : ""}" data-c="${k}">${l}</button>`).join("")}
        </div>
        ${acts.length ? acts.map(activityCard).join("") : emptyState("📅", "No activities yet", "Be the first — create one and invite your buddies!")}
        <button class="btn btn-primary btn-block mt-16" onclick="FMB.go('#/create')">＋ Create an activity</button>
      </div>
      ${tabbar("activities")}`;
    const q = document.getElementById("act-q");
    q.oninput = () => { actState.q = q.value; debounceRender(); };
    document.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => { actState.cat = b.dataset.c; render(); });
  });

  function activityCover(interest) {
    const it = S.interestById(interest) || { c: ["#4f46e5", "#312e81"], emoji: "📌" };
    return `background:linear-gradient(135deg, ${it.c[0]}, ${it.c[1]});`;
  }
  function activityCard(a) {
    const it = S.interestById(a.interest) || { emoji: "📌", label: "" };
    const host = S.personById(a.hostId);
    const joined = S.isJoined(a.id);
    const spots = a.capacity - a.attendees.length;
    return `
      <div class="card card-tap" onclick="FMB.go('#/activity/${a.id}')">
        <div class="activity-cover" style="${activityCover(a.interest)}">
          <span class="emoji">${it.emoji}</span>
          <span class="price-pill">${money(a.priceLRD)}</span>
          ${a.promoted ? '<span class="price-pill" style="left:12px;top:auto;bottom:12px;right:auto;background:linear-gradient(135deg,#f59e0b,#d97706)">★ Promoted</span>' : ""}
        </div>
        <div class="between">
          <div class="grow">
            <div class="bold" style="font-size:16px">${esc(a.title)}</div>
            <div class="meta-row">
              <span>🗓 ${fmtWhen(a.when)}</span>
              <span>📍 ${esc(a.county)}</span>
            </div>
          </div>
        </div>
        <div class="muted small truncate">${esc(a.location)}</div>
        <div class="between mt-8" style="margin-top:12px">
          <div class="attendees">
            ${a.attendees.slice(0, 4).map((id) => avatar(S.personById(id), 40)).join("")}
            <span class="muted small" style="margin-left:8px">${a.attendees.length} going · ${spots > 0 ? spots + " spots" : "full"}</span>
          </div>
          <button class="btn ${joined ? "btn-ghost" : "btn-primary"} btn-sm" onclick="event.stopPropagation(); FMB.join('${a.id}', this)">${joined ? "✓ Going" : "Join"}</button>
        </div>
      </div>`;
  }

  FMB.join = (id, btn) => {
    const a = S.activityById(id);
    if (!S.isJoined(id) && a.attendees.length >= a.capacity) { toast("Sorry, this activity is full"); return; }
    const joined = S.toggleJoin(id);
    toast(joined ? "You're going! 🎉" : "You left this activity");
    if (btn) { btn.className = `btn ${joined ? "btn-ghost" : "btn-primary"} btn-sm`; btn.textContent = joined ? "✓ Going" : "Join"; }
    else render();
  };

  /* ================= ACTIVITY DETAIL ================= */
  route("activity", (id) => {
    const a = S.activityById(id);
    if (!a) { go("#/activities"); return; }
    const it = S.interestById(a.interest);
    const host = S.personById(a.hostId);
    const joined = S.isJoined(id);
    const spots = a.capacity - a.attendees.length;
    app.innerHTML = `
      ${subheader("Activity", "#/activities")}
      <div class="screen" style="padding-top:0">
        <div class="activity-cover" style="${activityCover(a.interest)};height:150px;border-radius:0 0 var(--r-lg) var(--r-lg);margin:0 -16px 16px">
          <span class="emoji" style="font-size:56px">${it.emoji}</span>
          <span class="price-pill">${money(a.priceLRD)}</span>
        </div>
        <h2 style="font-size:22px">${esc(a.title)}</h2>
        <div class="chips mt-8" style="margin-top:10px">${interestPill(a.interest, { on: true })}${a.promoted ? '<span class="chip tiny" style="background:var(--gold-soft);color:var(--gold)">★ Promoted</span>' : ""}</div>

        <div class="card mt-16">
          <div class="row" style="margin-bottom:12px"><div class="av-40 avatar sq" style="background:var(--brand-soft);color:var(--brand)">🗓</div><div><div class="bold">${fmtWhen(a.when)}</div><div class="muted small">${new Date(a.when).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div></div></div>
          <div class="row" style="margin-bottom:12px"><div class="av-40 avatar sq" style="background:var(--brand-soft);color:var(--brand)">📍</div><div><div class="bold">${esc(a.location)}</div><div class="muted small">${esc(a.county)} County</div></div></div>
          <div class="row"><div class="av-40 avatar sq" style="background:var(--brand-soft);color:var(--brand)">👥</div><div><div class="bold">${a.attendees.length} going</div><div class="muted small">${spots > 0 ? spots + " spots left of " + a.capacity : "Fully booked"}</div></div></div>
        </div>

        <div class="section-title">About</div>
        <p class="muted">${esc(a.desc)}</p>

        <div class="section-title">Hosted by</div>
        <div class="card card-tap row" onclick="FMB.go('#/person/${host.id}')">
          ${avatar(host, 48)}
          <div class="grow"><div class="bold">${esc(host.name)}${host.isMe ? " (You)" : ""}</div><div class="muted small">📍 ${esc(host.county)}</div></div>
          ${!host.isMe ? '<span class="chip tiny">View →</span>' : ""}
        </div>

        <div class="section-title">Who's going</div>
        <div class="chips">${a.attendees.map((pid) => { const p = S.personById(pid); return `<div class="row gap-6" style="background:var(--surface-2);padding:6px 12px 6px 6px;border-radius:999px">${avatar(p, 40)}<span class="small bold">${esc(p.name.split(" ")[0])}${p.isMe ? " (You)" : ""}</span></div>`; }).join("")}</div>

        <div class="row mt-24" style="position:sticky;bottom:16px;z-index:5">
          <button class="btn ${joined ? "btn-ghost" : "btn-primary"} grow" onclick="FMB.join('${id}', this)">${joined ? "✓ You're going" : (a.priceLRD > 0 ? "Join · " + money(a.priceLRD) : "Join this activity")}</button>
          <button class="btn btn-accent" onclick="FMB.share('${id}')">↗</button>
        </div>
      </div>`;
  });

  FMB.share = (id) => {
    const a = S.activityById(id);
    const text = `Join me at "${a.title}" (${fmtWhen(a.when)}) on Find My Buddy!`;
    if (navigator.share) navigator.share({ title: a.title, text }).catch(() => {});
    else { try { navigator.clipboard.writeText(text); } catch (e) {} toast("Invite copied to clipboard 📋"); }
  };

  /* ================= CREATE ================= */
  const draft = { title: "", interest: "", county: "", location: "", date: "", time: "17:00", capacity: "20", priceLRD: "0", desc: "", promoted: false };
  route("create", () => {
    if (!draft.county) draft.county = S.me().county;
    if (!draft.interest) draft.interest = S.me().interests[0] || "football";
    if (!draft.date) { const d = new Date(); d.setDate(d.getDate() + 3); draft.date = d.toISOString().slice(0, 10); }
    app.innerHTML = `
      ${header("Create Activity", "Bring buddies together")}
      <div class="screen">
        <div class="field"><label>Activity title</label><input class="input" id="c-title" placeholder="e.g. Saturday Beach Volleyball" value="${esc(draft.title)}" /></div>
        <div class="field"><label>Category</label>
          <div class="chips" id="c-interest">${D.INTERESTS.map((it) => `<button type="button" class="chip selectable ${draft.interest === it.id ? "on" : ""}" data-id="${it.id}">${it.emoji} ${it.label}</button>`).join("")}</div>
        </div>
        <div class="row">
          <div class="field grow"><label>County</label><select class="input" id="c-county">${D.COUNTIES.map((c) => `<option ${c === draft.county ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        </div>
        <div class="field"><label>Location / venue</label><input class="input" id="c-loc" placeholder="e.g. ATS Field, Sinkor" value="${esc(draft.location)}" /></div>
        <div class="row">
          <div class="field grow"><label>Date</label><input class="input" type="date" id="c-date" value="${draft.date}" /></div>
          <div class="field grow"><label>Time</label><input class="input" type="time" id="c-time" value="${draft.time}" /></div>
        </div>
        <div class="row">
          <div class="field grow"><label>Capacity</label><input class="input" type="number" min="2" id="c-cap" value="${esc(draft.capacity)}" /></div>
          <div class="field grow"><label>Price (LRD)</label><input class="input" type="number" min="0" step="50" id="c-price" value="${esc(draft.priceLRD)}" /></div>
        </div>
        <div class="hint" style="margin-top:-8px;margin-bottom:14px">Set 0 for a free activity. Paid tickets are collected via Mobile Money at check-in.</div>
        <div class="field"><label>Description</label><textarea class="input" id="c-desc" placeholder="What should buddies expect? What to bring?">${esc(draft.desc)}</textarea></div>

        <label class="card row" style="cursor:pointer;align-items:flex-start">
          <input type="checkbox" id="c-promote" ${draft.promoted ? "checked" : ""} style="width:20px;height:20px;margin-top:2px" />
          <div class="grow"><div class="bold">★ Promote this activity <span class="badge-plus">L$250</span></div><div class="muted small">Boost to the top of Discover & Activities for 3× more sign-ups.</div></div>
        </label>

        <button class="btn btn-primary btn-block mt-16" id="c-submit">Publish activity 🚀</button>
      </div>
      ${tabbar("create")}`;

    document.querySelectorAll("#c-interest .chip").forEach((c) => c.onclick = () => {
      draft.interest = c.dataset.id;
      document.querySelectorAll("#c-interest .chip").forEach((x) => x.classList.toggle("on", x.dataset.id === draft.interest));
    });
    document.getElementById("c-submit").onclick = submitActivity;
  });

  function submitActivity() {
    const g = (id) => document.getElementById(id);
    const title = g("c-title").value.trim();
    const location = g("c-loc").value.trim();
    const dateVal = g("c-date").value;
    const timeVal = g("c-time").value || "17:00";
    if (!title) { toast("Give your activity a title"); return; }
    if (!location) { toast("Add a location"); return; }
    if (!dateVal) { toast("Pick a date"); return; }
    const when = new Date(dateVal + "T" + timeVal).getTime();
    if (when < Date.now()) { toast("Pick a future date & time"); return; }
    const a = S.createActivity({
      title, interest: draft.interest, county: g("c-county").value, location,
      when, capacity: g("c-cap").value, priceLRD: g("c-price").value,
      desc: g("c-desc").value, promoted: g("c-promote").checked,
    });
    // reset draft
    Object.assign(draft, { title: "", location: "", desc: "", promoted: false });
    toast("Activity published! 🎉");
    go("#/activity/" + a.id);
  }

  /* ================= MESSAGES ================= */
  route("messages", () => {
    const convos = S.conversations();
    const suggestions = S.suggestedPeople().filter((p) => S.isConnected(p.id) && !S.thread(p.id).length).slice(0, 8);
    app.innerHTML = `
      ${header("Chats", "Talk to your buddies")}
      <div class="screen">
        ${S.get().connections.length === 0 ? emptyState("💬", "No connections yet", "Connect with buddies in Discover to start chatting.") : ""}
        ${suggestions.length ? `<div class="section-title" style="margin-top:6px">Say hi 👋</div><div class="scroll-x">${suggestions.map((p) => `
          <button class="center" style="width:76px" onclick="FMB.go('#/chat/${p.id}')">
            ${avatar(p, 56)}<div class="tiny bold truncate mt-8" style="width:72px">${esc(p.name.split(" ")[0])}</div>
          </button>`).join("")}</div>` : ""}
        ${convos.length ? `<div class="section-title">Messages</div>${convos.map(convoRow).join("")}` : ""}
      </div>
      ${tabbar("messages")}`;
  });

  function convoRow(c) {
    const p = S.personById(c.personId);
    const last = c.last;
    return `
      <div class="card card-tap row" onclick="FMB.go('#/chat/${c.personId}')">
        ${avatar(p, 48)}
        <div class="grow" style="min-width:0">
          <div class="between"><span class="bold">${esc(p.name)}</span><span class="tiny dim">${last ? relTime(last.at) : ""}</span></div>
          <div class="muted small truncate">${last ? (last.from === "me" ? "You: " : "") + esc(last.text) : "Say hello!"}</div>
        </div>
      </div>`;
  }

  /* ================= CHAT ================= */
  route("chat", (id) => {
    const p = S.personById(id);
    renderChat(p);
    // subscribe for auto-replies while on this screen
    const unsub = S.subscribe(() => { if (currentRoute().name === "chat" && currentRoute().arg === id) renderChat(p, true); });
    chatUnsub && chatUnsub(); chatUnsub = unsub;
  });
  let chatUnsub = null;

  function renderChat(p, keepInput) {
    const msgs = S.thread(p.id);
    const prevVal = keepInput ? (document.getElementById("chat-input")?.value || "") : "";
    app.innerHTML = `
      <div class="subheader">
        <button class="icon-btn" onclick="FMB.go('#/messages')" aria-label="Back">‹</button>
        <div class="row grow" onclick="FMB.go('#/person/${p.id}')" style="cursor:pointer">
          ${avatar(p, 40)}<div><div class="bold" style="font-size:15px">${esc(p.name)}</div><div class="tiny dim">📍 ${esc(p.county)}</div></div>
        </div>
      </div>
      <div class="screen" style="padding-top:8px;padding-bottom:0">
        ${!S.isConnected(p.id) ? `<div class="card center small muted">You're not connected with ${esc(p.name.split(" ")[0])} yet. <a href="#" onclick="FMB.connect('${p.id}');FMB.go('#/chat/${p.id}');return false">Connect</a></div>` : ""}
        <div class="thread" id="thread">
          ${msgs.length ? msgs.map((m, i) => `
            <div class="bubble ${m.from}">${esc(m.text)}</div>
            ${(i === msgs.length - 1 || msgs[i + 1].from !== m.from) ? `<div class="msg-time" style="align-self:${m.from === "me" ? "flex-end" : "flex-start"}">${relTime(m.at)}</div>` : ""}
          `).join("") : `<div class="empty" style="padding:32px"><div class="em">👋</div><div class="muted">Start the conversation with ${esc(p.name.split(" ")[0])}</div></div>`}
        </div>
      </div>
      <div class="composer">
        <input id="chat-input" placeholder="Message ${esc(p.name.split(" ")[0])}…" value="${esc(prevVal)}" />
        <button class="send" id="chat-send" aria-label="Send">➤</button>
      </div>`;
    const input = document.getElementById("chat-input");
    const send = () => { const v = input.value; if (!v.trim()) return; S.sendMessage(p.id, v); input.value = ""; };
    document.getElementById("chat-send").onclick = send;
    input.onkeydown = (e) => { if (e.key === "Enter") send(); };
    const thread = document.getElementById("thread");
    thread.scrollIntoView(false);
    window.scrollTo(0, document.body.scrollHeight);
    if (!keepInput) input.focus();
  }

  /* ================= PROFILE ================= */
  route("profile", () => {
    const me = S.me();
    const hosted = S.myHostedActivities();
    const joinedActs = S.myJoinedActivities();
    app.innerHTML = `
      ${header("Profile", "")}
      <div class="screen">
        <div class="center" style="padding:8px 0">
          <div class="avatar av-88" style="background:${me.avatarColor}">${esc(initials(me.name))}</div>
          <h2 style="margin-top:12px;font-size:22px">${esc(me.name)} ${me.plus ? '<span class="badge-plus">PLUS</span>' : ""}</h2>
          <div class="muted">📍 ${esc(me.county)}</div>
        </div>
        <div class="stats mt-16">
          <div class="stat"><b>${S.get().connections.length}</b><span>Connections</span></div>
          <div class="stat"><b>${joinedActs.length}</b><span>Activities</span></div>
          <div class="stat"><b>${hosted.length}</b><span>Hosting</span></div>
        </div>

        ${me.bio ? `<div class="card mt-16"><p class="muted">${esc(me.bio)}</p></div>` : ""}

        <div class="between" style="margin-top:18px"><div class="section-title" style="margin:0">Interests</div><button class="btn btn-ghost btn-sm" onclick="FMB.editProfile()">Edit</button></div>
        <div class="chips mt-8" style="margin-top:10px">${me.interests.map((i) => interestPill(i, { on: true })).join("")}</div>

        ${!me.plus ? plusBanner(true) : `<div class="card row mt-16" style="background:var(--gold-soft)"><div style="font-size:28px">👑</div><div class="grow"><div class="bold">Buddy Plus active</div><div class="muted small">Enjoy unlimited connects & boosted visibility.</div></div></div>`}

        <div class="section-title">Hosting</div>
        ${hosted.length ? hosted.map(activityCard).join("") : `<div class="card muted small center">You're not hosting anything yet. <a href="#" onclick="FMB.go('#/create');return false">Create an activity →</a></div>`}

        <div class="section-title">Going to</div>
        ${joinedActs.length ? joinedActs.map(activityCard).join("") : `<div class="card muted small center">No activities joined yet.</div>`}

        <div class="divider"></div>
        <button class="btn btn-ghost btn-block" onclick="FMB.editProfile()">✏️ Edit profile</button>
        <button class="btn btn-ghost btn-block mt-8" onclick="FMB.confirmReset()" style="color:var(--accent);margin-top:10px">↺ Reset app data</button>
        <p class="center tiny dim mt-16">Find My Buddy · Made for Liberia 🇱🇷</p>
      </div>
      ${tabbar("profile")}`;
  });

  FMB.editProfile = () => {
    const me = S.me();
    const tmp = { interests: [...me.interests] };
    openSheet(`
      <h2 style="font-size:20px;margin-bottom:4px">Edit profile</h2>
      <p class="muted small mb-16">Update your details anytime.</p>
      <div class="field"><label>Full name</label><input class="input" id="e-name" value="${esc(me.name)}" /></div>
      <div class="field"><label>County</label><select class="input" id="e-county">${D.COUNTIES.map((c) => `<option ${c === me.county ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="field"><label>Bio</label><textarea class="input" id="e-bio">${esc(me.bio)}</textarea></div>
      <div class="field"><label>Interests</label><div class="chips" id="e-interests">${D.INTERESTS.map((it) => `<button type="button" class="chip selectable ${tmp.interests.includes(it.id) ? "on" : ""}" data-id="${it.id}">${it.emoji} ${it.label}</button>`).join("")}</div></div>
      <button class="btn btn-primary btn-block" id="e-save">Save changes</button>
    `);
    modalRoot.querySelectorAll("#e-interests .chip").forEach((c) => c.onclick = () => {
      const id = c.dataset.id; const i = tmp.interests.indexOf(id);
      if (i >= 0) tmp.interests.splice(i, 1); else tmp.interests.push(id);
      c.classList.toggle("on");
    });
    document.getElementById("e-save").onclick = () => {
      const name = document.getElementById("e-name").value.trim();
      if (!name) { toast("Name can't be empty"); return; }
      if (tmp.interests.length < 1) { toast("Pick at least one interest"); return; }
      S.updateProfile({ name, county: document.getElementById("e-county").value, bio: document.getElementById("e-bio").value.trim(), interests: tmp.interests });
      closeSheet(); toast("Profile updated ✓"); render();
    };
  };

  FMB.confirmReset = () => {
    openSheet(`
      <h2 style="font-size:20px">Reset app data?</h2>
      <p class="muted mb-16" style="margin:8px 0 18px">This clears your profile, connections and activities on this device. This cannot be undone.</p>
      <button class="btn btn-accent btn-block" id="r-yes">Yes, reset everything</button>
      <button class="btn btn-ghost btn-block mt-8" style="margin-top:10px" onclick="FMB.closeSheet()">Cancel</button>
    `);
    document.getElementById("r-yes").onclick = () => { S.resetAll(); closeSheet(); onboard.step = 0; onboard.interests = []; onboard.name = ""; onboard.bio = ""; go("#/discover"); };
  };
  FMB.closeSheet = closeSheet;

  /* ================= PREMIUM ================= */
  function plusBanner(compact) {
    return `
      <div class="premium-banner" onclick="FMB.openPlus()">
        <h3>👑 Buddy Plus</h3>
        <p>Unlimited connects, see who viewed you, and get boosted in Discover.</p>
        <button class="btn btn-gold btn-sm">Upgrade — L$500/mo</button>
      </div>`;
  }
  FMB.openPlus = () => {
    const me = S.me();
    openSheet(`
      <div class="center" style="padding:6px 0 4px"><div style="font-size:46px">👑</div><h2 style="font-size:24px">Buddy Plus</h2><p class="muted">Get the most out of Find My Buddy</p></div>
      <div class="mt-16">
        ${[["♾️", "Unlimited connections", "Reach out to as many buddies as you like"],
           ["👀", "See who viewed you", "Know who's checking your profile"],
           ["🚀", "Profile boost", "Appear higher in Discover across your county"],
           ["★", "2 free activity promotions", "Fill your events faster every month"],
           ["✔︎", "Verified badge", "Build trust with a verified profile"]].map(([e, t, d]) => `
          <div class="row" style="margin-bottom:14px;align-items:flex-start"><div style="font-size:22px;width:30px">${e}</div><div class="grow"><div class="bold">${t}</div><div class="muted small">${d}</div></div></div>`).join("")}
      </div>
      <div class="card between" style="background:var(--brand-soft);border:none">
        <div><div class="bold" style="font-size:18px">L$500 <span class="muted small">/ month</span></div><div class="tiny muted">Pay with MTN MoMo or Orange Money</div></div>
        <div class="badge-plus">BEST VALUE</div>
      </div>
      <button class="btn btn-gold btn-block mt-8" id="plus-buy" style="margin-top:12px">${me.plus ? "You're a Plus member ✓" : "Start Buddy Plus"}</button>
      <p class="center tiny dim mt-8" style="margin-top:12px">Cancel anytime · Secure Mobile Money checkout</p>
    `);
    const buy = document.getElementById("plus-buy");
    if (me.plus) buy.disabled = true;
    else buy.onclick = () => { S.upgradeToPlus(); closeSheet(); toast("Welcome to Buddy Plus! 👑"); render(); };
  };

  /* ================= Shared bits ================= */
  function emptyState(em, title, sub) {
    return `<div class="empty"><div class="em">${em}</div><h3>${esc(title)}</h3><p>${esc(sub)}</p></div>`;
  }

  /* ---------------- Render loop ---------------- */
  let debounceTimer;
  function debounceRender() { /* live search updates list without full re-render churn */
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 220);
  }

  function render() {
    if (!S.get().onboarded || !S.me()) { renderOnboarding(); return; }
    const { name, arg } = currentRoute();
    // cleanup chat subscription when leaving chat
    if (name !== "chat" && chatUnsub) { chatUnsub(); chatUnsub = null; }
    const fn = routes[name] || routes["discover"];
    try { fn(arg); } catch (e) { console.error(e); routes["discover"](); }
    if (name !== "chat") window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", render);
  render();
})();
