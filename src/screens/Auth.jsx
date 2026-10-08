import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Icon, Tap } from "../components/ui";
import { useApp } from "../lib/store";
import { neighborhoods } from "../lib/data";

export default function Auth() {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);
  const [name, setName] = useState("");
  const [area, setArea] = useState("Sinkor");
  const [role, setRole] = useState("client");
  const [sending, setSending] = useState(false);
  const refs = useRef([]);
  const login = useApp((s) => s.login);
  const update = useApp((s) => s.update);
  const notify = useApp((s) => s.notify);

  const validPhone = phone.replace(/\D/g, "").length >= 9;

  const sendCode = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setStep(1);
      notify("Code sent by SMS — use 1847");
    }, 900);
  };

  const setDigit = (k, v) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[k] = d;
    setCode(next);
    if (d && k < 3) refs.current[k + 1]?.focus();
    if (next.every(Boolean)) setTimeout(() => setStep(2), 350);
  };

  const finish = () => {
    login({ name: name.trim() || "Friend", phone: `+231 ${phone}`, area });
    update({ mode: role, tab: "home" });
    notify(role === "tasker" ? "Welcome, Tasker! Let's start earning 💪" : `Welcome to LoneStar, ${name.split(" ")[0] || "friend"}!`);
  };

  const panes = [
    <div key="0">
      <h1 className="text-[30px] font-extrabold leading-tight">What's your<br />phone number?</h1>
      <p className="text-mute mt-2">We'll text you a code to verify it's you.</p>
      <div className="mt-8 flex gap-3">
        <div className="h-16 px-4 rounded-2xl bg-white dark:bg-night-2 border-2 border-slate-200 dark:border-night-3 flex items-center gap-2 font-bold">
          <span className="text-xl">🇱🇷</span> +231
        </div>
        <input
          autoFocus
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, "").slice(0, 12))}
          placeholder="77 123 4567"
          className="flex-1 min-w-0 h-16 px-4 rounded-2xl bg-white dark:bg-night-2 border-2 border-slate-200 dark:border-night-3 focus:border-brand outline-none text-lg font-bold tracking-wide"
        />
      </div>
      <p className="text-xs text-mute mt-3">Works with Orange (077) and Lonestar MTN (088) numbers.</p>
      <Button className="mt-8" disabled={!validPhone || sending} onClick={sendCode}>
        {sending ? (
          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full" />
        ) : (
          "Send code"
        )}
      </Button>
    </div>,
    <div key="1">
      <h1 className="text-[30px] font-extrabold leading-tight">Enter the code</h1>
      <p className="text-mute mt-2">Sent to +231 {phone}. (Demo code: 1847 — any 4 digits work)</p>
      <div className="mt-8 flex gap-3 justify-between">
        {code.map((d, k) => (
          <motion.input
            key={k}
            ref={(el) => (refs.current[k] = el)}
            value={d}
            autoFocus={k === 0}
            inputMode="numeric"
            onChange={(e) => setDigit(k, e.target.value)}
            onKeyDown={(e) => e.key === "Backspace" && !d && k > 0 && refs.current[k - 1]?.focus()}
            animate={{ scale: d ? [1, 1.12, 1] : 1, borderColor: d ? "#1E4FD8" : "#e2e8f0" }}
            className="w-[68px] h-[76px] text-center text-3xl font-extrabold rounded-2xl bg-white dark:bg-night-2 border-2 outline-none"
          />
        ))}
      </div>
      <button className="mt-6 text-sm font-bold text-brand" onClick={() => notify("New code sent")}>
        Resend code
      </button>
    </div>,
    <div key="2">
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
      <Button className="mt-8" disabled={!name.trim()} onClick={finish}>
        Continue
      </Button>
    </div>,
  ];

  return (
    <motion.div className="absolute inset-0 flex flex-col bg-surface dark:bg-night" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="px-6 flex items-center gap-4" style={{ paddingTop: "calc(var(--top) + 4px)" }}>
        {step > 0 ? (
          <Tap onClick={() => setStep(step - 1)} className="w-10 h-10 rounded-full bg-white dark:bg-night-2 grid place-items-center shadow-sm">
            <Icon name="ChevronLeft" />
          </Tap>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-navy grid place-items-center">
            <Icon name="Star" className="fill-gold text-gold" size={20} />
          </div>
        )}
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-night-3 overflow-hidden">
          <motion.div className="h-full bg-brand rounded-full" animate={{ width: `${((step + 1) / 3) * 100}%` }} />
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
