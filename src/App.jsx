import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "./lib/store";
import { Icon, Toast, Tap, spring } from "./components/ui";
import Splash from "./screens/Splash";
import Onboarding from "./screens/Onboarding";
import Auth from "./screens/Auth";
import Home from "./screens/Home";
import Tasks from "./screens/Tasks";
import Messages from "./screens/Messages";
import Profile from "./screens/Profile";
import TaskerHome from "./screens/TaskerHome";
import TaskBuilder from "./screens/TaskBuilder";
import TaskerList from "./screens/TaskerList";
import TaskerProfile from "./screens/TaskerProfile";
import Checkout from "./screens/Checkout";
import Confirmed from "./screens/Confirmed";
import BookingDetail from "./screens/BookingDetail";
import Chat from "./screens/Chat";
import Search from "./screens/Search";
import Notifications from "./screens/Notifications";
import Wallet from "./screens/Wallet";

import { Backdrop } from "./components/three";

const stackScreens = {
  category: TaskBuilder,
  taskers: TaskerList,
  tasker: TaskerProfile,
  checkout: Checkout,
  confirmed: Confirmed,
  booking: BookingDetail,
  chat: Chat,
  search: Search,
  notifications: Notifications,
  wallet: Wallet,
};

const clientTabs = [
  { id: "home", label: "Home", icon: "Home" },
  { id: "tasks", label: "My Tasks", icon: "ClipboardList" },
  { id: "messages", label: "Inbox", icon: "MessageCircle" },
  { id: "profile", label: "Account", icon: "User" },
];
const taskerTabs = [
  { id: "home", label: "Dashboard", icon: "TrendingUp" },
  { id: "tasks", label: "Jobs", icon: "Briefcase" },
  { id: "messages", label: "Inbox", icon: "MessageCircle" },
  { id: "profile", label: "Account", icon: "User" },
];

function useIsDesktop() {
  const q = "(min-width: 640px)";
  const [d, setD] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const h = () => setD(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return d;
}

function StatusBar() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute top-0 inset-x-0 h-11 z-[70] px-7 flex items-center justify-between text-[14px] font-bold pointer-events-none text-white mix-blend-difference">
      <span>{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "")}</span>
      <div className="flex items-center gap-1.5">
        <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="6" rx="1"/><rect x="10" y="2.5" width="3" height="8.5" rx="1"/><rect x="15" y="0" width="3" height="11" rx="1"/></svg>
        <Icon name="Wifi" size={15} />
        <div className="w-6 h-3 rounded-[4px] border-2 border-current relative">
          <div className="absolute inset-[1px] right-[30%] bg-current rounded-[1px]" />
        </div>
      </div>
    </div>
  );
}

function TabBar() {
  const { tab, setTab, mode, chats, bookings } = useApp();
  const tabs = mode === "tasker" ? taskerTabs : clientTabs;
  const unread = Object.values(chats).filter((c) => c.at(-1)?.from === "them").length;
  const active = bookings.filter((b) => !["completed", "cancelled"].includes(b.status)).length;
  return (
    <div className="absolute bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-night/95 backdrop-blur-xl border-t border-slate-200/60 dark:border-night-3 pb-6 pt-2 px-3">
      <div className="flex">
        {tabs.map((t) => {
          const on = tab === t.id;
          const badge = t.id === "messages" ? unread : t.id === "tasks" && mode === "client" ? active : 0;
          return (
            <Tap key={t.id} onClick={() => setTab(t.id)} className="relative flex-1 flex flex-col items-center gap-1 py-1" scale={0.85}>
              {on && (
                <motion.div layoutId="tab-pill" className="absolute -top-2 w-10 h-1 rounded-full bg-brand" transition={spring} />
              )}
              <motion.div animate={{ y: on ? -2 : 0, scale: on ? 1.12 : 1 }} transition={spring} className={on ? "text-brand" : "text-slate-400"}>
                <Icon name={t.icon} size={23} />
              </motion.div>
              <span className={`text-[10.5px] font-bold ${on ? "text-brand" : "text-slate-400"}`}>{t.label}</span>
              <AnimatePresence>
                {badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-0 right-[26%] min-w-[18px] h-[18px] px-1 rounded-full bg-flag text-white text-[10px] font-extrabold grid place-items-center"
                  >
                    {badge}
                  </motion.span>
                )}
              </AnimatePresence>
            </Tap>
          );
        })}
      </div>
    </div>
  );
}

const slide = {
  initial: (dir) => ({ x: dir >= 0 ? "100%" : "-30%", opacity: dir >= 0 ? 1 : 0.6 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir >= 0 ? "-30%" : "100%", opacity: dir >= 0 ? 0.6 : 1, zIndex: dir >= 0 ? 0 : 10 }),
};

function Main() {
  const { tab, stack, dir, mode } = useApp();
  const top = stack.at(-1);
  const Root = { home: mode === "tasker" ? TaskerHome : Home, tasks: Tasks, messages: Messages, profile: Profile }[tab];
  const hideTabs = !!top;
  return (
    <>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`root-${tab}-${mode}`}
          className="absolute inset-0 bg-surface dark:bg-night"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <Root />
        </motion.div>
      </AnimatePresence>
      <AnimatePresence custom={dir} initial={false}>
        {top && (
          <motion.div
            key={top.key}
            custom={dir}
            variants={slide}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="absolute inset-0 z-20 bg-surface dark:bg-night shadow-[-20px_0_40px_-20px_rgba(0,0,0,.35)]"
          >
            {(() => {
              const S = stackScreens[top.name];
              return S ? <S {...top.params} /> : null;
            })()}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!hideTabs && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={spring}>
            <TabBar />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Device({ children, desktop, dark }) {
  if (!desktop) {
    return <div className={`fixed inset-0 overflow-hidden ${dark ? "dark" : ""}`}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ y: 40, opacity: 0, rotateX: 12 }}
      animate={{ y: 0, opacity: 1, rotateX: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.1 }}
      className="relative"
      style={{ perspective: 1200 }}
    >
      <div className="relative w-[390px] h-[844px] max-h-[calc(100vh-48px)] rounded-[56px] p-[12px] bg-gradient-to-b from-[#2a3350] to-[#0d1225] shadow-[0_50px_120px_-20px_rgba(0,0,0,.8),inset_0_0_0_2px_rgba(255,255,255,.08)]">
        <div className={`relative w-full h-full rounded-[44px] overflow-hidden ${dark ? "dark" : ""}`}>
          {children}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[118px] h-[34px] rounded-full bg-black z-[80]" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 rounded-full bg-ink/80 dark:bg-white/70 z-[80]" />
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const desktop = useIsDesktop();
  const { onboarded, user, dark } = useApp();
  const [splash, setSplash] = useState(true);

  let content;
  if (splash) content = <Splash key="splash" onDone={() => setSplash(false)} />;
  else if (!onboarded) content = <Onboarding key="onb" />;
  else if (!user) content = <Auth key="auth" />;
  else content = <Main key="main" />;

  return (
    <div className="min-h-full w-full flex items-center justify-center relative overflow-hidden bg-[radial-gradient(1200px_700px_at_20%_10%,#16307a_0%,transparent_60%),radial-gradient(900px_600px_at_90%_90%,#5a1430_0%,transparent_55%),#050b1f]">
      {desktop && (
        <>
          <div className="absolute inset-0">
            <Backdrop />
          </div>
          <div className="absolute left-12 top-1/2 -translate-y-1/2 max-w-sm text-white hidden xl:block pointer-events-none [text-shadow:0_2px_24px_rgba(5,11,31,.9)]">
            <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="text-gold font-bold tracking-widest text-xs mb-3">
              🇱🇷 MADE FOR LIBERIA
            </motion.p>
            <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="text-5xl font-extrabold leading-tight">
              Get it done.<br />
              <span className="bg-gradient-to-r from-brand-2 to-flag bg-clip-text text-transparent">Lone Star style.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="mt-4 text-slate-300">
              Book trusted local Taskers for cleaning, generator repair, moving, braiding, deliveries & more — pay with Orange Money or MTN MoMo.
            </motion.p>
          </div>
          <div className="absolute right-10 top-1/2 -translate-y-1/2 text-white hidden xl:flex flex-col gap-4 pointer-events-none">
            {[["36+", "Vetted Taskers"], ["22", "Service categories"], ["4.9★", "Average rating"]].map(([n, l], i) => (
              <motion.div
                key={l}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md px-5 py-4"
              >
                <div className="text-2xl font-extrabold">{n}</div>
                <div className="text-xs text-slate-300">{l}</div>
              </motion.div>
            ))}
          </div>
        </>
      )}
      <Device desktop={desktop} dark={dark}>
        <div
          className="absolute inset-0 bg-surface dark:bg-night text-ink dark:text-white"
          style={{ "--top": desktop ? "48px" : "max(env(safe-area-inset-top), 14px)" }}
        >
          {desktop && <StatusBar />}
          <AnimatePresence mode="wait">{content}</AnimatePresence>
          <Toast />
        </div>
      </Device>
    </div>
  );
}
