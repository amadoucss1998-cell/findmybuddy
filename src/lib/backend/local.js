// Local demo backend: same interface and rules as the Supabase backend, but the
// "database" lives in this browser's localStorage. Used when no Supabase keys are set.
import { cannedReplies, categories, firstNames, lastNames, neighborhoods, taskers as seedTaskers } from "../data";
import * as S from "./shape";

const KEY = "lonestar-local-db-v1";
const PROMOS = { LIB5: 500, LONESTAR10: 1000 };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const now = () => new Date().toISOString();
const err = (m) => {
  throw new Error(m);
};

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d?.users) return d;
  } catch {
    /* fall through */
  }
  return { users: {}, session: null, bookings: [], payments: [], messages: [], notifications: [], favorites: [], redemptions: [], jobs: [], reviews: [] };
}
let db = load();
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage may be unavailable */
  }
};

let listener = null; // realtime-style callbacks for the signed-in user
const emit = (type, payload) => listener?.[type]?.(payload);

// Demo-only password hashing so plain passwords never sit in localStorage.
async function hashPassword(email, password) {
  const bytes = new TextEncoder().encode(`${email}:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const me = () => db.users[db.session] || err("Not signed in");
const taskerRow = (id) => seedTaskers.find((t) => t.id === id) || err("Tasker not found");

function notifyUser(userId, kind, body) {
  const n = { id: uuid(), user_id: userId, kind, body, read: false, created_at: now() };
  db.notifications.unshift(n);
  if (userId === db.session) emit("notification", S.notification(n));
}

function insertMessage(clientId, taskerId, sender, body, delayMs = 0) {
  const m = { id: uuid(), client_id: clientId, tasker_id: taskerId, sender, body, read_at: null, created_at: new Date(Date.now() + delayMs).toISOString() };
  db.messages.push(m);
  save();
  if (sender === "tasker" && clientId === db.session) emit("message", S.message(m)); // store shows it once its time arrives
  if (sender === "client") {
    // Demo Taskers reply after a moment.
    insertMessage(clientId, taskerId, "tasker", cannedReplies[Math.floor(Math.random() * cannedReplies.length)], 2000);
  }
  return m;
}

function quoteRaw(user, { taskerId, categoryId, size, promoCode, useWallet }) {
  const t = taskerRow(taskerId);
  if (!t.skills.includes(categoryId)) err("This Tasker does not offer that service");
  const cat = categories.find((c) => c.id === categoryId);
  const hours = S.sizeHours[size] || err("Invalid task size");
  const rate = S.cents(cat.from + t.premium);
  const sub = Math.round(rate * hours);
  const fee = Math.round(sub * S.FEE_RATE);
  let discount = 0;
  let promo = null;
  const code = promoCode?.trim().toUpperCase();
  if (code) {
    if (!PROMOS[code]) promo = { code, valid: false, reason: "Invalid promo code" };
    else if (db.redemptions.some((r) => r.code === code && r.user_id === user.id)) promo = { code, valid: false, reason: "You've already used this code" };
    else {
      discount = Math.min(PROMOS[code], sub + fee);
      promo = { code, valid: true };
    }
  }
  const credit = useWallet ? Math.min(user.wallet_cents, sub + fee - discount) : 0;
  return { rate_cents: rate, hours, subtotal_cents: sub, fee_cents: fee, discount_cents: discount, credit_cents: credit, total_cents: Math.max(0, sub + fee - discount - credit), promo };
}

const payStatus = (method, amount) => (method === "cash" ? "due" : amount === 0 ? "succeeded" : "succeeded");

function ownBooking(id) {
  return db.bookings.find((b) => b.id === id && b.client_id === db.session) || err("Booking not found");
}

function updateBooking(b, patch) {
  Object.assign(b, patch, { updated_at: now() });
  save();
  emit("booking", S.booking(b));
  return S.booking(b);
}

function seedJobs(userId, count = 4) {
  if (db.jobs.some((j) => j.tasker_user === userId && j.status === "open")) return;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  for (let i = 0; i < count; i++) {
    const c = pick(categories);
    db.jobs.unshift({
      id: uuid(), tasker_user: userId, client_name: `${pick(firstNames)} ${pick(lastNames)[0]}.`, category_id: c.id,
      area: pick(neighborhoods.slice(0, 10)), when_label: pick(["Today · 2pm", "Today · 5pm", "Tomorrow · 9am", "Sat · 8am"]),
      pay_cents: Math.round(c.from * 100 * (1.5 + Math.random() * 2.5)), distance_km: Math.round((0.5 + Math.random() * 7) * 10) / 10,
      status: "open", created_at: now(),
    });
  }
}

export const local = {
  live: false,

  async currentUser() {
    return db.session && db.users[db.session] ? S.profile(db.users[db.session]) : null;
  },

  async loadTaskers() {
    return seedTaskers.map((t) => ({
      ...t,
      reviews: [
        ...db.reviews.filter((r) => r.tasker_id === t.id).map((r) => ({ id: r.id, name: r.author_name, rating: r.rating, text: r.body, when: S.ago(r.created_at), category: S.catName(r.category_id) })),
        ...t.reviews,
      ],
    }));
  },

  async signUp(email, password) {
    if (Object.values(db.users).some((x) => x.email === email)) err("An account with this email already exists — sign in instead");
    const u = { id: uuid(), email, password_hash: await hashPassword(email, password), phone: null, name: "", area: "Sinkor", role: "client", wallet_cents: 2500, tasker_online: true, created_at: now() };
    db.users[u.id] = u;
    db.payments.unshift({ id: uuid(), user_id: u.id, kind: "bonus", method: "wallet", amount_cents: 2500, status: "succeeded", created_at: now() });
    db.notifications.unshift({ id: uuid(), user_id: u.id, kind: "promo", body: "Welcome to LoneStar Tasks 🇱🇷 Get $5 off your first task with code LIB5", read: false, created_at: now() });
    db.session = u.id;
    save();
    return S.profile(u);
  },

  async signIn(email, password) {
    const u = Object.values(db.users).find((x) => x.email === email);
    if (!u || u.password_hash !== (await hashPassword(email, password))) err("Wrong email or password");
    db.session = u.id;
    save();
    return S.profile(u);
  },

  async updateProfile(patch) {
    const u = me();
    if (patch.name !== undefined) u.name = patch.name;
    if (patch.area !== undefined) u.area = patch.area;
    if (patch.taskerOnline !== undefined) u.tasker_online = patch.taskerOnline;
    if (patch.role !== undefined) {
      if (patch.role === "tasker" && u.role !== "tasker") seedJobs(u.id);
      u.role = patch.role;
    }
    save();
    return S.profile(u);
  },

  async signOut() {
    db.session = null;
    save();
  },

  async loadUserData() {
    const id = me().id;
    return {
      bookings: db.bookings.filter((b) => b.client_id === id).map(S.booking),
      messages: db.messages.filter((m) => m.client_id === id).map(S.message),
      notifs: db.notifications.filter((n) => n.user_id === id).slice(0, 50).map(S.notification),
      favorites: db.favorites.filter((f) => f.user_id === id).map((f) => f.tasker_id),
    };
  },

  async quote(params) {
    return S.quote(quoteRaw(me(), params));
  },

  async createBooking(d) {
    const u = me();
    if ((d.address || "").trim().length < 3) err("Please add an address or landmark");
    if ((d.details || "").trim().length < 6) err("Please describe your task");
    const q = quoteRaw(u, d);
    if (q.promo && !q.promo.valid) err(q.promo.reason);
    const status = payStatus(d.paymentMethod, q.total_cents);
    u.wallet_cents -= q.credit_cents;
    const b = {
      id: uuid(), client_id: u.id, tasker_id: d.taskerId, category_id: d.categoryId, area: d.area, address: d.address.trim(),
      details: d.details.trim(), size: d.size, hours: q.hours, date_label: d.date, slot: d.slot, rate_cents: q.rate_cents,
      fee_cents: q.fee_cents, discount_cents: q.discount_cents, credit_cents: q.credit_cents, total_cents: q.total_cents,
      promo_code: q.promo?.valid ? q.promo.code : null, payment_method: d.paymentMethod, payment_status: status,
      status: "confirmed", rating: null, tip_cents: 0, created_at: now(),
    };
    db.bookings.unshift(b);
    if (b.credit_cents) db.payments.unshift({ id: uuid(), booking_id: b.id, user_id: u.id, kind: "booking", method: "wallet", amount_cents: b.credit_cents, status: "succeeded", created_at: now() });
    db.payments.unshift({ id: uuid(), booking_id: b.id, user_id: u.id, kind: "booking", method: d.paymentMethod, amount_cents: b.total_cents, status, created_at: now() });
    if (b.promo_code) db.redemptions.push({ code: b.promo_code, user_id: u.id, booking_id: b.id });
    const t = taskerRow(d.taskerId);
    notifyUser(u.id, "booking", `Booking confirmed with ${t.name}`);
    const m = insertMessage(u.id, t.id, "client", `Hi ${t.first}! I just booked you for ${S.catName(d.categoryId)}. ${b.details}`);
    emit("message", S.message(m));
    save();
    emit("profile", S.profile(u));
    return S.booking(b);
  },

  async cancelBooking(id) {
    const b = ownBooking(id);
    if (b.status !== "confirmed") err("Only bookings that haven't started can be cancelled");
    const u = me();
    u.wallet_cents += b.credit_cents;
    db.payments.forEach((p) => p.booking_id === id && p.status === "succeeded" && (p.status = "refunded"));
    db.redemptions = db.redemptions.filter((r) => r.booking_id !== id);
    notifyUser(u.id, "booking", `Booking for ${S.catName(b.category_id)} cancelled`);
    emit("profile", S.profile(u));
    return updateBooking(b, { status: "cancelled" });
  },

  async advanceBooking(id) {
    const b = ownBooking(id);
    const flow = ["confirmed", "on_the_way", "in_progress", "completed"];
    const i = flow.indexOf(b.status);
    if (i < 0 || i === 3) err("Booking can't be advanced");
    const next = flow[i + 1];
    const first = taskerRow(b.tasker_id).first;
    notifyUser(b.client_id, "booking", { on_the_way: `${first} is on the way 🛵`, in_progress: `${first} has started your task`, completed: `Task completed! Rate ${first} and leave a tip` }[next]);
    return updateBooking(b, { status: next });
  },

  async reviewBooking(id, rating, tip = 0) {
    const b = ownBooking(id);
    if (b.status !== "completed") err("You can rate a task once it's completed");
    if (b.rating) err("You've already rated this task");
    const u = me();
    const [first, last = ""] = (u.name || "Client").split(" ");
    const text = ["Not great.", "It was okay.", "Okay job.", "Great work!", "Excellent — highly recommend!"][rating - 1];
    db.reviews.unshift({ id: uuid(), tasker_id: b.tasker_id, booking_id: b.id, author_name: `${first}${last ? ` ${last[0]}.` : ""}`, rating, body: text, category_id: b.category_id, created_at: now() });
    if (tip > 0) db.payments.unshift({ id: uuid(), booking_id: b.id, user_id: u.id, kind: "tip", method: b.payment_method, amount_cents: S.cents(tip), status: payStatus(b.payment_method, 1), created_at: now() });
    return updateBooking(b, { rating, review: text, tip_cents: S.cents(tip) });
  },

  async sendMessage(taskerId, text) {
    taskerRow(taskerId);
    return S.message(insertMessage(me().id, taskerId, "client", text));
  },

  async markThreadRead(taskerId) {
    db.messages.forEach((m) => m.client_id === db.session && m.tasker_id === taskerId && m.sender === "tasker" && !m.read_at && (m.read_at = now()));
    save();
  },

  async readNotifs() {
    db.notifications.forEach((n) => n.user_id === db.session && (n.read = true));
    save();
  },

  async setFavorite(taskerId, on) {
    const id = me().id;
    db.favorites = db.favorites.filter((f) => !(f.user_id === id && f.tasker_id === taskerId));
    if (on) db.favorites.unshift({ user_id: id, tasker_id: taskerId });
    save();
  },

  async walletActivity() {
    return db.payments
      .filter((p) => p.user_id === db.session)
      .map((p) => S.payment({ ...p, booking_category: db.bookings.find((b) => b.id === p.booking_id)?.category_id }));
  },

  async topup(amount, method) {
    const c = S.cents(amount);
    if (c < 100 || c > 50000) err("Top ups must be between $1 and $500");
    const u = me();
    u.wallet_cents += c;
    db.payments.unshift({ id: uuid(), user_id: u.id, kind: "topup", method, amount_cents: c, status: "succeeded", created_at: now() });
    notifyUser(u.id, "promo", `$${amount} added to your wallet`);
    save();
    return S.usd(u.wallet_cents);
  },

  async taskerJobs() {
    if (me().role !== "tasker") err("Switch to Tasker mode first");
    return db.jobs.filter((j) => j.tasker_user === db.session && j.status !== "declined").map(S.job);
  },

  async respondJob(id, action) {
    const j = db.jobs.find((x) => x.id === id && x.tasker_user === db.session) || err("Job not found");
    if (action === "accept" && j.status === "open") Object.assign(j, { status: "accepted", accepted_at: now() });
    else if (action === "decline" && j.status === "open") {
      j.status = "declined";
      seedJobs(db.session, 2);
    } else if (action === "complete" && j.status === "accepted") {
      Object.assign(j, { status: "completed", completed_at: now() });
      notifyUser(db.session, "booking", `Job completed — $${S.usd(j.pay_cents)} added to your earnings`);
    } else err("That job can't be updated");
    save();
    return S.job(j);
  },

  async taskerDashboard() {
    const mine = db.jobs.filter((j) => j.tasker_user === db.session);
    const done = mine.filter((j) => j.status === "completed");
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toDateString();
      const c = done.filter((j) => new Date(j.completed_at).toDateString() === key).reduce((a, j) => a + j.pay_cents, 0);
      return { day: d.toLocaleDateString("en", { weekday: "short" }), amount: S.usd(c) };
    });
    const paid = db.payments.filter((p) => p.user_id === db.session && p.kind === "payout").reduce((a, p) => a + p.amount_cents, 0);
    const accepted = mine.filter((j) => ["accepted", "completed"].includes(j.status)).length;
    const declined = mine.filter((j) => j.status === "declined").length;
    return {
      week,
      available: S.usd(done.reduce((a, j) => a + j.pay_cents, 0) - paid),
      completed: done.length,
      acceptance: accepted + declined ? Math.round((100 * accepted) / (accepted + declined)) : null,
    };
  },

  async cashOut() {
    const { available } = await local.taskerDashboard();
    if (available <= 0) err("No earnings available to cash out");
    db.payments.unshift({ id: uuid(), user_id: db.session, kind: "payout", method: "orange", amount_cents: S.cents(available), status: "succeeded", created_at: now() });
    notifyUser(db.session, "promo", `Cash out of $${available} sent to Orange Money`);
    save();
    return available;
  },

  subscribe(_userId, on) {
    listener = on;
    return () => {
      listener = null;
    };
  },
};
