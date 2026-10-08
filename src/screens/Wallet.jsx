import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Button, Header, Icon, Sheet, Tap } from "../components/ui";
import { useApp } from "../lib/store";
import { fmtLRD, fmtUSD, paymentMethods } from "../lib/data";

// 3D tilt card that follows the pointer / finger.
function TiltCard({ wallet }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [14, -14]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-18, 18]), { stiffness: 200, damping: 18 });
  const glareX = useTransform(mx, [-0.5, 0.5], ["0%", "100%"]);
  return (
    <div style={{ perspective: 900 }} className="px-5">
      <motion.div
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onPointerLeave={() => {
          mx.set(0);
          my.set(0);
        }}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        initial={{ rotateY: -90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        className="relative h-52 rounded-[28px] p-6 text-white overflow-hidden bg-gradient-to-br from-brand via-navy-2 to-navy shadow-[0_30px_60px_-20px_rgba(30,79,216,.6)]"
      >
        <motion.div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at var(--x) 30%, white, transparent 45%)", "--x": glareX }} />
        <div className="absolute -right-10 -bottom-16 w-56 h-56 rounded-full border-[28px] border-white/5" />
        <div className="flex justify-between items-start" style={{ transform: "translateZ(30px)" }}>
          <div>
            <div className="text-xs text-white/60 font-semibold">LoneStar balance</div>
            <div className="text-4xl font-extrabold mt-1">{fmtUSD(wallet)}</div>
            <div className="text-sm text-white/60">≈ {fmtLRD(wallet)}</div>
          </div>
          <Icon name="Star" size={32} className="fill-gold text-gold" />
        </div>
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end" style={{ transform: "translateZ(20px)" }}>
          <div className="font-mono tracking-[0.2em] text-sm text-white/80">•••• •••• 2310</div>
          <div className="text-xs font-bold text-white/70">LIBERIA 🇱🇷</div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Wallet() {
  const { user, topup, notify, walletActivity } = useApp();
  const wallet = user?.wallet || 0;
  const [activity, setActivity] = useState(null);
  const loadActivity = () => walletActivity().then((a) => a && setActivity(a));
  useEffect(() => {
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [topUp, setTopUp] = useState(false);
  const [amt, setAmt] = useState(10);
  const [method, setMethod] = useState("orange");

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: "var(--top)" }}>
      <Header title="Wallet" />
      <div className="flex-1 scroll-y pb-10">
        <TiltCard wallet={wallet} />
        <div className="px-5 mt-5 grid grid-cols-2 gap-3">
          <Button icon="Plus" onClick={() => setTopUp(true)}>Top up</Button>
          <Button variant="ghost" icon="Send" onClick={() => notify("Send money coming soon")}>Send</Button>
        </div>
        <h3 className="px-5 font-extrabold mt-6 mb-2">Linked accounts</h3>
        <div className="mx-5 rounded-3xl bg-white dark:bg-night-2 divide-y divide-slate-100 dark:divide-night-3">
          {paymentMethods.slice(0, 3).map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <div className="w-12 h-9 rounded-lg grid place-items-center text-[11px] font-black" style={{ background: p.color, color: p.id === "mtn" ? "#000" : "#fff" }}>
                {p.short}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{p.name}</div>
                <div className="text-xs text-mute">{p.sub}</div>
              </div>
              <Icon name="CheckCircle2" size={18} className="text-green-500" />
            </div>
          ))}
        </div>
        <h3 className="px-5 font-extrabold mt-6 mb-2">Activity</h3>
        <div className="mx-5 rounded-3xl bg-white dark:bg-night-2 divide-y divide-slate-100 dark:divide-night-3">
          {activity === null && <div className="p-4 text-sm text-mute">Loading…</div>}
          {activity?.length === 0 && <div className="p-4 text-sm text-mute">No activity yet</div>}
          {(activity || []).map((x) => ({ k: x.id, t: x.title, s: x.sub, v: x.amount })).map((r) => (
            <div key={r.k} className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl grid place-items-center ${r.v > 0 ? "bg-green-500/10 text-green-600" : "bg-slate-100 dark:bg-night-3"}`}>
                <Icon name={r.v > 0 ? "Gift" : "Receipt"} size={18} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{r.t}</div>
                <div className="text-xs text-mute">{r.s}</div>
              </div>
              <div className={`font-extrabold text-sm ${r.v > 0 ? "text-green-600" : ""}`}>
                {r.v > 0 ? "+" : "−"}
                {fmtUSD(Math.abs(r.v))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Sheet open={topUp} onClose={() => setTopUp(false)} title="Top up wallet">
        <div className="text-center my-4">
          <motion.div key={amt} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-5xl font-extrabold">
            {fmtUSD(amt)}
          </motion.div>
          <div className="text-sm text-mute">≈ {fmtLRD(amt)}</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[5, 10, 25, 50].map((v) => (
            <Tap key={v} onClick={() => setAmt(v)} className={`h-12 rounded-2xl font-bold ${amt === v ? "bg-brand text-white" : "bg-slate-100 dark:bg-night-3"}`}>
              ${v}
            </Tap>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {paymentMethods.slice(0, 2).map((p) => (
            <Tap key={p.id} onClick={() => setMethod(p.id)} className={`h-14 rounded-2xl font-bold text-sm border-2 ${method === p.id ? "border-brand" : "border-transparent bg-slate-100 dark:bg-night-3"}`}>
              {p.name}
            </Tap>
          ))}
        </div>
        <Button
          className="mt-6"
          onClick={async () => {
            if ((await topup(amt, method)) === undefined) return;
            setTopUp(false);
            loadActivity();
            notify(`${fmtUSD(amt)} added via ${paymentMethods.find((p) => p.id === method).name}`);
          }}
        >
          Confirm top up
        </Button>
      </Sheet>
    </div>
  );
}
