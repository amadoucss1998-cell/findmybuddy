// Supabase backend: auth (phone OTP), Postgres tables guarded by RLS, RPCs for
// anything involving money, and Realtime for chat / bookings / notifications.
import { supabase } from "../supabase";
import * as S from "./shape";

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

const uid = async () => (await supabase.auth.getSession()).data.session?.user.id;

async function getProfile(id) {
  return S.profile(ok(await supabase.from("profiles").select("*").eq("id", id).single()));
}

export const remote = {
  live: true,

  async currentUser() {
    const id = await uid();
    return id ? getProfile(id) : null;
  },

  async loadTaskers() {
    const rows = ok(
      await supabase
        .from("taskers")
        .select("*, tasker_skills(category_id, position), reviews(id, author_name, rating, body, category_id, created_at)")
        .order("rating", { ascending: false })
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      first: r.first,
      gradient: r.gradient,
      skills: [...r.tasker_skills].sort((a, b) => a.position - b.position).map((s) => s.category_id),
      rating: Number(r.rating),
      jobs: r.jobs,
      premium: S.usd(r.premium_cents),
      area: r.area,
      distance: Number(r.distance_km),
      elite: r.elite,
      verified: r.verified,
      responseMins: r.response_mins,
      bio: r.bio,
      languages: r.languages,
      vehicle: r.vehicle,
      online: r.online,
      reviews: [...r.reviews]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((v) => ({ id: v.id, name: v.author_name, rating: v.rating, text: v.body, when: S.ago(v.created_at), category: S.catName(v.category_id) })),
    }));
  },

  async sendOtp(phone) {
    ok(await supabase.auth.signInWithOtp({ phone }));
    return {};
  },

  async verifyOtp(phone, code) {
    const data = ok(await supabase.auth.verifyOtp({ phone, token: code, type: "sms" }));
    return getProfile(data.user.id);
  },

  async updateProfile(patch) {
    const id = await uid();
    const row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.area !== undefined) row.area = patch.area;
    if (patch.role !== undefined) row.role = patch.role;
    if (patch.taskerOnline !== undefined) row.tasker_online = patch.taskerOnline;
    return S.profile(ok(await supabase.from("profiles").update(row).eq("id", id).select("*").single()));
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async loadUserData() {
    const [bookings, messages, notifs, favs] = await Promise.all([
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("messages").select("*").order("created_at").limit(1000),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("favorites").select("tasker_id").order("created_at", { ascending: false }),
    ]);
    return {
      bookings: ok(bookings).map(S.booking),
      messages: ok(messages).map(S.message),
      notifs: ok(notifs).map(S.notification),
      favorites: ok(favs).map((f) => f.tasker_id),
    };
  },

  async quote({ taskerId, categoryId, size, promoCode, useWallet }) {
    const q = ok(
      await supabase.rpc("quote_booking", {
        p_tasker: taskerId, p_category: categoryId, p_size: size, p_promo: promoCode || null, p_use_wallet: !!useWallet,
      })
    );
    return S.quote(q);
  },

  async createBooking(d) {
    const row = ok(
      await supabase.rpc("create_booking", {
        p_tasker: d.taskerId, p_category: d.categoryId, p_size: d.size, p_area: d.area, p_address: d.address,
        p_details: d.details, p_date: d.date, p_slot: d.slot, p_payment_method: d.paymentMethod,
        p_promo: d.promoCode || null, p_use_wallet: !!d.useWallet,
      })
    );
    return S.booking(row);
  },

  cancelBooking: async (id) => S.booking(ok(await supabase.rpc("cancel_booking", { p_id: id }))),
  advanceBooking: async (id) => S.booking(ok(await supabase.rpc("advance_booking", { p_id: id }))),
  reviewBooking: async (id, rating, tip) =>
    S.booking(ok(await supabase.rpc("review_booking", { p_id: id, p_rating: rating, p_tip_cents: S.cents(tip || 0) }))),

  async sendMessage(taskerId, text) {
    const id = await uid();
    const row = ok(await supabase.from("messages").insert({ client_id: id, tasker_id: taskerId, sender: "client", body: text }).select("*").single());
    return S.message(row);
  },

  async markThreadRead(taskerId) {
    ok(await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("tasker_id", taskerId).eq("sender", "tasker").is("read_at", null));
  },

  async readNotifs() {
    ok(await supabase.from("notifications").update({ read: true }).eq("read", false));
  },

  async setFavorite(taskerId, on) {
    const id = await uid();
    if (on) ok(await supabase.from("favorites").upsert({ user_id: id, tasker_id: taskerId }));
    else ok(await supabase.from("favorites").delete().eq("tasker_id", taskerId));
  },

  async walletActivity() {
    const rows = ok(await supabase.from("payments").select("*, bookings(category_id)").order("created_at", { ascending: false }).limit(100));
    return rows.map((p) => S.payment({ ...p, booking_category: p.bookings?.category_id }));
  },

  topup: async (amount, method) => S.usd(ok(await supabase.rpc("topup_wallet", { p_amount_cents: S.cents(amount), p_method: method }))),

  taskerJobs: async () => ok(await supabase.from("job_requests").select("*").neq("status", "declined").order("created_at", { ascending: false })).map(S.job),
  respondJob: async (id, action) => S.job(ok(await supabase.rpc("respond_to_job", { p_id: id, p_action: action }))),

  async taskerDashboard() {
    const d = ok(await supabase.rpc("tasker_dashboard"));
    return {
      week: d.week.map((w) => ({ day: w.day, amount: S.usd(w.cents) })),
      available: S.usd(d.available_cents),
      completed: d.completed,
      acceptance: d.acceptance,
    };
  },

  cashOut: async () => S.usd(ok(await supabase.rpc("cash_out"))),

  // Realtime: RLS ensures each user only receives their own rows.
  subscribe(userId, on) {
    const ch = supabase
      .channel(`user-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `client_id=eq.${userId}` }, (p) => on.message(S.message(p.new)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) =>
        on.notification(S.notification(p.new))
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `client_id=eq.${userId}` }, (p) => p.new?.id && on.booking(S.booking(p.new)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, (p) => on.profile(S.profile(p.new)))
      .on("postgres_changes", { event: "*", schema: "public", table: "job_requests", filter: `tasker_user=eq.${userId}` }, (p) => p.new?.id && on.job(S.job(p.new)))
      .subscribe();
    return () => supabase.removeChannel(ch);
  },
};
