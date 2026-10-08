import { create } from "zustand";
import { persist } from "zustand/middleware";
import { taskers, cannedReplies, categories } from "./data";

const uid = () => Math.random().toString(36).slice(2, 10);

// A small mobile-style navigation stack lives alongside app state.
// `tab` is the root tab; `stack` holds pushed screens on top of it.
export const useApp = create(
  persist(
    (set, get) => ({
      // session
      onboarded: false,
      user: null, // { name, phone, area, role }
      mode: "client", // client | tasker
      dark: false,

      // navigation
      tab: "home",
      stack: [],
      dir: 1,
      setTab: (tab) => set({ tab, stack: [], dir: 0 }),
      push: (name, params = {}) =>
        set((s) => ({ stack: [...s.stack, { name, params, key: uid() }], dir: 1 })),
      pop: () => set((s) => ({ stack: s.stack.slice(0, -1), dir: -1 })),
      replace: (name, params = {}) =>
        set((s) => ({ stack: [...s.stack.slice(0, -1), { name, params, key: uid() }], dir: 1 })),
      resetTo: (tab) => set({ tab, stack: [], dir: -1 }),
      resetPush: (tab, name, params = {}) => set({ tab, stack: [{ name, params, key: uid() }], dir: 1 }),

      // toast
      toast: null,
      notify: (text, kind = "ok") => {
        const id = uid();
        set({ toast: { id, text, kind } });
        setTimeout(() => get().toast?.id === id && set({ toast: null }), 2600);
      },

      // data
      favorites: [],
      toggleFav: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
        })),

      draft: null, // task being built
      setDraft: (patch) => set((s) => ({ draft: { ...(s.draft || {}), ...patch } })),

      bookings: [],
      wallet: 25,
      addBooking: (b) => {
        const id = uid();
        const booking = { id, status: "confirmed", createdAt: Date.now(), ...b };
        set((s) => ({ bookings: [booking, ...s.bookings], draft: null }));
        const t = taskers.find((x) => x.id === b.taskerId);
        get().sendMessage(b.taskerId, `Hi ${t.first}! I just booked you for ${b.categoryName}. ${b.details || ""}`.trim(), true);
        get().addNotif(`Booking confirmed with ${t.name}`, "booking");
        return id;
      },
      advanceBooking: (id) =>
        set((s) => ({
          bookings: s.bookings.map((b) => {
            if (b.id !== id) return b;
            const order = ["confirmed", "on_the_way", "in_progress", "completed"];
            const i = order.indexOf(b.status);
            return { ...b, status: order[Math.min(i + 1, order.length - 1)] };
          }),
        })),
      cancelBooking: (id) =>
        set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)) })),
      rateBooking: (id, rating, tip) =>
        set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, rated: rating, tip } : b)) })),

      chats: {}, // taskerId -> [{id, from, text, at}]
      sendMessage: (taskerId, text, silent = false) => {
        const msg = { id: uid(), from: "me", text, at: Date.now() };
        set((s) => ({ chats: { ...s.chats, [taskerId]: [...(s.chats[taskerId] || []), msg] } }));
        setTimeout(() => {
          const reply = {
            id: uid(),
            from: "them",
            text: cannedReplies[Math.floor(Math.random() * cannedReplies.length)],
            at: Date.now(),
          };
          set((s) => ({ chats: { ...s.chats, [taskerId]: [...(s.chats[taskerId] || []), reply] } }));
          if (silent) get().addNotif(`New message from ${taskers.find((t) => t.id === taskerId)?.first}`, "chat");
        }, 1400 + Math.random() * 1400);
      },

      notifs: [
        { id: "n0", text: "Welcome to LoneStar Tasks 🇱🇷 Get $5 off your first task with code LIB5", kind: "promo", at: Date.now() - 3600e3, read: false },
      ],
      addNotif: (text, kind) =>
        set((s) => ({ notifs: [{ id: uid(), text, kind, at: Date.now(), read: false }, ...s.notifs] })),
      readNotifs: () => set((s) => ({ notifs: s.notifs.map((n) => ({ ...n, read: true })) })),

      // tasker side
      taskerOnline: true,
      jobRequests: [
        { id: "j1", client: "Bendu K.", cat: "cleaning", area: "Sinkor, 14th Street", when: "Today · 2pm", pay: 22, dist: 1.2 },
        { id: "j2", client: "Varney T.", cat: "generator", area: "Congo Town", when: "Tomorrow · 9am", pay: 35, dist: 3.4 },
        { id: "j3", client: "Massa D.", cat: "moving", area: "Paynesville Red Light", when: "Sat · 8am", pay: 60, dist: 6.8 },
      ],
      acceptedJobs: [],
      earnings: [42, 65, 38, 90, 72, 120, 84],
      acceptJob: (id) =>
        set((s) => {
          const job = s.jobRequests.find((j) => j.id === id);
          return {
            jobRequests: s.jobRequests.filter((j) => j.id !== id),
            acceptedJobs: [job, ...s.acceptedJobs],
          };
        }),
      declineJob: (id) => set((s) => ({ jobRequests: s.jobRequests.filter((j) => j.id !== id) })),

      login: (user) => set({ user, onboarded: true }),
      logout: () => set({ user: null, tab: "home", stack: [], mode: "client" }),
      update: (patch) => set(patch),
    }),
    {
      name: "lonestar-tasks-v1",
      partialize: (s) => {
        // eslint-disable-next-line no-unused-vars
        const { stack, toast, dir, ...rest } = s;
        return rest;
      },
    }
  )
);

export const catById = (id) => categories.find((c) => c.id === id);
export const taskerById = (id) => taskers.find((t) => t.id === id);
