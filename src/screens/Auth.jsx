import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Icon, Tap } from "../components/ui";
import { useApp } from "../lib/store";
import { neighborhoods } from "../lib/data";

export default function Auth() {
  // A signed-in user without a profile name resumes at the profile step.
  const [step, setStep] = useState(() => (useApp.getState().user ? 1 : 0));
  const [mode, setMode] = useState("signup"); // signup | signin
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("Sinkor");
  const [role, setRole] = useState("client");
  const [busy, setBusy] = useState(false);
  const { signUp, signIn, saveProfile, notify, live } = useApp();

  const cleanEmail = email.trim().toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) && password.length >= 6;

  const submit = async (e) => {
    e?.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const user = mode === "signup" ? await signUp(cleanEmail, password) : await signIn(cleanEmail, password);
    setBusy(false);
    if (!user) return;
    if (user.name) {
      notify(`Welcome back, ${user.name.split(" ")[0]}!`);
      useApp.getState().update({ tab: "home" });
    } else setStep(1);
  };

  const finish = async () => {
    setBusy(true);
    const user = await saveProfile({ name: name.trim(), area, role });
    setBusy(false);
    if (!user) return;
    useApp.getState().update({ tab: "home" });
    notify(role === "tasker" ? "Welcome, Tasker! Let's start earning 💪" : `Welcome to LoneStar, ${name.split(" ")[0]}!`);
  };

  const field =
    "w-full h-14 px-4 rounded-2xl bg-white dark:bg-night-2 border-2 border-slate-200 dark:border-night-3 focus:border-brand outline-none font-semibold";

  const panes = [
    <form key="0" onSubmit={submit}>
      <h1 className="text-[30px] font-extrabold leading-tight">
        {mode === "signup" ? (
          <>Create your<br />account</>
        ) : (
          <>Welcome<br />back</>
        )}
      </h1>
      <p className="text-mute mt-2">{mode === "signup" ? "Book trusted Taskers across Liberia in minutes." : "Sign in to see your tasks and messages."}</p>
      <div className="mt-6 p-1 rounded-2xl bg-slate-200/70 dark:bg-night-2 flex">
        {[["signup", "Sign up"], ["signin", "Sign in"]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setMode(id)} className="relative flex-1 h-10 text-sm font-bold">
            {mode === id && <motion.div layoutId="auth-seg" className="absolute inset-0 rounded-xl bg-white dark:bg-night-3 shadow" />}
            <span className={`relative ${mode === id ? "" : "text-mute"}`}>{label}</span>
          </button>
        ))}
      </div>
      <label className="block mt-6 text-xs font-bold text-mute uppercase tracking-wider">Email</label>
      <div className="relative mt-2">
        <Icon name="Mail" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
        <input
          autoFocus
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`${field} pl-11`}
        />
      </div>
      <label className="block mt-4 text-xs font-bold text-mute uppercase tracking-wider">Password</label>
      <div className="relative mt-2">
        <Icon name="Lock" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
        <input
          type={showPw ? "text" : "password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
          className={`${field} pl-11 pr-16`}
        />
        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-brand">
          {showPw ? "Hide" : "Show"}
        </button>
      </div>
      {!live && <p className="text-xs text-mute mt-3">Running in local demo mode — accounts are stored on this device only.</p>}
      <Button className="mt-8" disabled={!valid || busy} type="submit">
        {busy ? (
          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full" />
        ) : mode === "signup" ? (
          "Create account"
        ) : (
          "Sign in"
        )}
      </Button>
      <p className="text-center text-sm text-mute mt-5">
        {mode === "signup" ? "Already have an account? " : "New to LoneStar? "}
        <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="font-bold text-brand">
          {mode === "signup" ? "Sign in" : "Create one"}
        </button>
      </p>
    </form>,
    <div key="1">
      <h1 className="text-[30px] font-extrabold leading-tight">Almost done!</h1>
      <p className="text-mute mt-2">Tell us a bit about you.</p>
      <label className="block mt-6 text-xs font-bold text-mute uppercase tracking-wider">Full name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Musu Kamara"
        className="mt-2 w-full h-14 px-4 rounded-2xl bg-white dark:bg-night-2 border-2 border-slate-200 dark:border-night-3 focus:border-brand outline-none font-semibold"
      />
      <label className="block mt-5 text-xs font-bold text-mute uppercase tracking-wider">Your community</label>
      <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6">
        {neighborhoods.slice(0, 10).map((n) => (
          <Tap
            key={n}
            onClick={() => setArea(n)}
            className={`h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap border-2 ${area === n ? "bg-navy text-white border-navy" : "border-slate-200 dark:border-night-3"}`}
          >
            {n}
          </Tap>
        ))}
      </div>
      <label className="block mt-5 text-xs font-bold text-mute uppercase tracking-wider">I want to…</label>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {[
          ["client", "Get help", "Book Taskers", "Users"],
          ["tasker", "Earn money", "Become a Tasker", "Briefcase"],
        ].map(([id, t, s, ic]) => (
          <Tap
            key={id}
            onClick={() => setRole(id)}
            className={`relative text-left p-4 rounded-2xl border-2 ${role === id ? "border-brand bg-brand/5" : "border-slate-200 dark:border-night-3"}`}
          >
            <div className={`w-10 h-10 rounded-xl grid place-items-center ${role === id ? "bg-brand text-white" : "bg-slate-100 dark:bg-night-3"}`}>
              <Icon name={ic} size={20} />
            </div>
            <div className="font-extrabold mt-3">{t}</div>
            <div className="text-xs text-mute">{s}</div>
            {role === id && (
              <motion.div layoutId="role-check" className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand text-white grid place-items-center">
                <Icon name="Check" size={14} />
              </motion.div>
            )}
          </Tap>
        ))}
      </div>
      <Button className="mt-8" disabled={!name.trim() || busy} onClick={finish}>
        Continue
      </Button>
    </div>,
  ];

  return (
    <motion.div className="absolute inset-0 flex flex-col bg-surface dark:bg-night" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="px-6 flex items-center gap-4" style={{ paddingTop: "calc(var(--top) + 4px)" }}>
        {step > 0 ? (
          <Tap onClick={async () => { await useApp.getState().logout(); setStep(0); }} className="w-10 h-10 rounded-full bg-white dark:bg-night-2 grid place-items-center shadow-sm">
            <Icon name="ChevronLeft" />
          </Tap>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-navy grid place-items-center">
            <Icon name="Star" className="fill-gold text-gold" size={20} />
          </div>
        )}
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-night-3 overflow-hidden">
          <motion.div className="h-full bg-brand rounded-full" animate={{ width: `${((step + 1) / 2) * 100}%` }} />
        </div>
      </div>
      <div className="flex-1 px-6 pt-8 scroll-y">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            {panes[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
