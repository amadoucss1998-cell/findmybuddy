import { create } from "zustand";
import { persist } from "zustand/middleware";
import { categories } from "./data";
import { backend } from "./backend";

const uid = () => Math.random().toString(36).slice(2, 10);
let unsubscribe = null;

// Network failures surface as "Failed to fetch"; show something people understand.
const friendly = (e) =>
  /failed to fetch|networkerror|load failed/i.test(e?.message || "")
    ? "No connection — check your internet and try again"
    : e?.message || "Something went wrong";

const upsert = (list, item, front = true) => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return front ? [item, ...list] : [...list, item];
  const next = [...list];
  next[i] = { ...next[i], ...item };
  return next;
};

// App state + a small mobile-style navigation stack. All data goes through
// `backend` (Supabase when configured, otherwise the local in-browser demo).
export const useApp = create(
  persist(
    (set, get) => {
      // Runs a backend call, surfacing errors as a toast. Returns undefined on failure.
      const run = async (fn) => {
        try {
          return await fn();
        } catch (e) {
          get().notify(friendly(e), "err");
          return undefined;
        }
      };

      async function afterLogin(user) {
        set({ user, mode: user.role });
        const data = await backend.loadUserData();
        const chats = {};
        const now = Date.now();
        for (const m of data.messages) if (m.at <= now) (chats[m.taskerId] ||= []).push(m);
        set({ bookings: data.bookings, chats, notifs: data.notifs, favorites: data.favorites });
        data.messages.filter((m) => m.at > now).forEach((m) => get().receiveMessage(m));
        unsubscribe?.();
        unsubscribe = backend.subscribe(user.id, {
          message: (m) => get().receiveMessage(m),
          notification: (n) => set((s) => ({ notifs: upsert(s.notifs, n) })),
          booking: (b) => set((s) => ({ bookings: upsert(s.bookings, b) })),
          profile: (u) => set((s) => ({ user: { ...s.user, ...u } })),
          job: (j) => get().upsertJob(j),
        });
        if (user.role === "tasker") get().loadTasker();
      }

      return {
        live: backend.live,
        ready: false,
        taskers: [],

        // session
        onboarded: false,
        user: null,
        mode: "client",
        dark: false,

        // navigation
        tab: "home",
        stack: [],
        dir: 1,
        setTab: (tab) => set({ tab, stack: [], dir: 0 }),
        push: (name, params = {}) => set((s) => ({ stack: [...s.stack, { name, params, key: uid() }], dir: 1 })),
        pop: () => set((s) => ({ stack: s.stack.slice(0, -1), dir: -1 })),
        replace: (name, params = {}) => set((s) => ({ stack: [...s.stack.slice(0, -1), { name, params, key: uid() }], dir: 1 })),
        resetTo: (tab) => set({ tab, stack: [], dir: -1 }),
        resetPush: (tab, name, params = {}) => set({ tab, stack: [{ name, params, key: uid() }], dir: 1 }),

        toast: null,
        notify: (text, kind = "ok") => {
          const id = uid();
          set({ toast: { id, text, kind } });
          setTimeout(() => get().toast?.id === id && set({ toast: null }), 2800);
        },

        update: (patch) => set(patch),

        boot: async () => {
          try {
            const taskers = await backend.loadTaskers();
            set({ taskers });
            const user = await backend.currentUser();
            if (user) await afterLogin(user);
            else set({ user: null });
          } catch (e) {
            get().notify(friendly(e), "err");
          }
          set({ ready: true });
        },

        // auth
        sendOtp: (phone) => run(() => backend.sendOtp(phone)),
        verifyOtp: (phone, code) =>
          run(async () => {
            const user = await backend.verifyOtp(phone, code);
            await afterLogin(user);
            return user;
          }),
        saveProfile: (patch) =>
          run(async () => {
            const user = await backend.updateProfile(patch);
            set({ user, mode: user.role });
            if (patch.role === "tasker") await get().loadTasker();
            return user;
          }),
        refreshUser: async () => {
          const user = await backend.currentUser();
          if (user) set({ user });
        },
        logout: async () => {
          unsubscribe?.();
          unsubscribe = null;
          await backend.signOut();
          set({ user: null, tab: "home", stack: [], mode: "client", bookings: [], chats: {}, notifs: [], favorites: [], jobs: [], taskerDash: null });
        },

        // favorites
        favorites: [],
        toggleFav: (id) => {
          const on = !get().favorites.includes(id);
          set((s) => ({ favorites: on ? [id, ...s.favorites] : s.favorites.filter((f) => f !== id) }));
          run(() => backend.setFavorite(id, on));
        },

        // booking flow
        draft: null,
        setDraft: (patch) => set((s) => ({ draft: { ...(s.draft || {}), ...patch } })),
        bookings: [],
        quote: (params) => backend.quote(params),
        createBooking: (d) =>
          run(async () => {
            const b = await backend.createBooking(d);
            set((s) => ({ bookings: upsert(s.bookings, b), draft: null }));
            get().refreshUser();
            return b;
          }),
        cancelBooking: (id) =>
          run(async () => {
            const b = await backend.cancelBooking(id);
            set((s) => ({ bookings: upsert(s.bookings, b) }));
            get().refreshUser();
            return b;
          }),
        advanceBooking: (id) =>
          run(async () => {
            const b = await backend.advanceBooking(id);
            set((s) => ({ bookings: upsert(s.bookings, b) }));
            return b;
          }),
        rateBooking: (id, rating, tip) =>
          run(async () => {
            const b = await backend.reviewBooking(id, rating, tip);
            set((s) => ({ bookings: upsert(s.bookings, b) }));
            set({ taskers: await backend.loadTaskers() });
            return b;
          }),

        // chat
        chats: {}, // taskerId -> messages
        typing: {}, // taskerId -> bool
        receiveMessage: (m) => {
          const delay = m.at - Date.now();
          if (delay > 50) {
            // Replies can be stamped slightly in the future; show "typing…" until then.
            set((s) => ({ typing: { ...s.typing, [m.taskerId]: true } }));
            setTimeout(() => get().receiveMessage({ ...m, at: Math.min(m.at, Date.now()) }), delay);
            return;
          }
          set((s) => {
            const list = s.chats[m.taskerId] || [];
            if (list.some((x) => x.id === m.id)) return {};
            return {
              chats: { ...s.chats, [m.taskerId]: [...list, m] },
              typing: m.from === "them" ? { ...s.typing, [m.taskerId]: false } : s.typing,
            };
          });
        },
        sendMessage: (taskerId, text) =>
          run(async () => {
            const m = await backend.sendMessage(taskerId, text);
            get().receiveMessage(m);
          }),
        markThreadRead: (taskerId) => {
          set((s) => ({ chats: { ...s.chats, [taskerId]: (s.chats[taskerId] || []).map((m) => ({ ...m, read: true })) } }));
          run(() => backend.markThreadRead(taskerId));
        },

        // notifications
        notifs: [],
        readNotifs: () => {
          set((s) => ({ notifs: s.notifs.map((n) => ({ ...n, read: true })) }));
          run(() => backend.readNotifs());
        },

        // wallet
        walletActivity: () => run(() => backend.walletActivity()),
        topup: (amount, method) =>
          run(async () => {
            const wallet = await backend.topup(amount, method);
            set((s) => ({ user: { ...s.user, wallet } }));
            return wallet;
          }),

        // tasker mode
        jobs: [],
        taskerDash: null,
        upsertJob: (j) => set((s) => ({ jobs: j.status === "declined" ? s.jobs.filter((x) => x.id !== j.id) : upsert(s.jobs, j) })),
        loadTasker: () =>
          run(async () => {
            const [jobs, taskerDash] = await Promise.all([backend.taskerJobs(), backend.taskerDashboard()]);
            set({ jobs, taskerDash });
          }),
        respondJob: (id, action) =>
          run(async () => {
            const j = await backend.respondJob(id, action);
            get().upsertJob(j);
            await get().loadTasker();
            return j;
          }),
        cashOut: () =>
          run(async () => {
            const amount = await backend.cashOut();
            await get().loadTasker();
            return amount;
          }),
      };
    },
    {
      name: "lonestar-tasks-ui-v2",
      // Only UI preferences live in localStorage; data comes from the backend.
      partialize: (s) => ({ onboarded: s.onboarded, dark: s.dark, tab: s.tab }),
    }
  )
);

export const catById = (id) => categories.find((c) => c.id === id);
export const taskerById = (id) => useApp.getState().taskers.find((t) => t.id === id);
export const taskersFor = (catId) => useApp.getState().taskers.filter((t) => t.skills.includes(catId));
