import { useMemo } from "react";
import { motion } from "framer-motion";
import { Hero3D } from "../components/three";
import { Avatar, Button } from "../components/ui";
import { useApp, taskerById } from "../lib/store";
import { fmtUSD } from "../lib/data";

const colors = ["#FF4D5E", "#1E4FD8", "#FFB020", "#22C55E", "#A855F7", "#ffffff"];

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        x: (Math.random() - 0.5) * 380,
        y: 300 + Math.random() * 400,
        r: Math.random() * 720 - 360,
        d: Math.random() * 0.4,
        c: colors[i % colors.length],
        w: 6 + Math.random() * 6,
        round: Math.random() > 0.6,
      })),
    []
  );
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-[30%]"
          style={{ width: b.w, height: b.round ? b.w : b.w * 1.8, background: b.c, borderRadius: b.round ? 99 : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{ x: b.x, y: [0, -220 - Math.random() * 120, b.y], opacity: [1, 1, 0], rotate: b.r, scale: 1 }}
          transition={{ duration: 2.4, delay: b.d, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export default function Confirmed({ id }) {
  const { bookings, resetTo, resetPush } = useApp();
  const b = bookings.find((x) => x.id === id);
  if (!b) return null;
  const t = taskerById(b.taskerId);
  return (
    <div className="h-full relative flex flex-col bg-gradient-to-b from-navy-2 via-navy to-[#050b1f] text-white overflow-hidden" style={{ paddingTop: "var(--top)" }}>
      <Confetti />
      <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 12 }}>
        <Hero3D variant="check" height={280} sparkle="#a7f3d0" />
      </motion.div>
      <div className="px-6 text-center -mt-2">
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-3xl font-extrabold">
          You're all set!
        </motion.h1>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-white/70 mt-2">
          {t.first} has been notified and will confirm shortly.
        </motion.p>
      </div>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55, type: "spring" }}
        className="mx-5 mt-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 p-4"
      >
        <div className="flex items-center gap-3">
          <Avatar person={t} size={48} />
          <div className="flex-1">
            <div className="font-extrabold">{b.categoryName}</div>
            <div className="text-xs text-white/70">with {t.name}</div>
          </div>
          <div className="text-right">
            <div className="font-extrabold">{fmtUSD(b.total)}</div>
            <div className="text-[10px] text-white/60">{b.payment}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 text-sm text-white/80">
          📅 {b.date} · {b.slot}
          <br />📍 {b.address}, {b.area}
        </div>
      </motion.div>
      <div className="mt-auto px-5 pb-10 space-y-3">
        <Button onClick={() => resetPush("tasks", "booking", { id })} icon="Navigation">
          Track my task
        </Button>
        <Button variant="ghost" className="!bg-white/10 !text-white" onClick={() => resetTo("home")}>
          Back to home
        </Button>
      </div>
    </div>
  );
}
