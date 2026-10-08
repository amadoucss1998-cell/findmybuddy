import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Hero3D } from "../components/three";
import { Button } from "../components/ui";
import { useApp } from "../lib/store";

const slides = [
  { variant: "tools", title: "Any task, done right", text: "From generator repairs to deep cleaning — find skilled, background-checked Taskers across Liberia.", bg: ["#12285e", "#0a1a3f"] },
  { variant: "pin", title: "Taskers near you", text: "Sinkor to Paynesville, Kakata to Buchanan. See who's close by and when they're free.", bg: ["#5a1430", "#1b0a1f"] },
  { variant: "coins", title: "Pay your way", text: "Orange Money, MTN MoMo, card or cash. Prices shown in USD and LRD — no surprises.", bg: ["#5b3a05", "#1a1205"] },
];

export default function Onboarding() {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const update = useApp((s) => s.update);
  const go = (n) => {
    setDir(n > i ? 1 : -1);
    setI(n);
  };
  const s = slides[i];
  return (
    <motion.div
      className="absolute inset-0 flex flex-col text-white overflow-hidden"
      animate={{ background: `linear-gradient(180deg, ${s.bg[0]}, ${s.bg[1]})` }}
      transition={{ duration: 0.6 }}
      exit={{ opacity: 0, x: -40 }}
    >
      <div className="flex justify-end px-6" style={{ paddingTop: "var(--top)" }}>
        <button onClick={() => update({ onboarded: true })} className="text-sm font-bold text-white/70 py-2">
          Skip
        </button>
      </div>
      <motion.div
        className="flex-1 flex flex-col"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60 && i < slides.length - 1) go(i + 1);
          if (info.offset.x > 60 && i > 0) go(i - 1);
        }}
      >
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={i}
            custom={dir}
            initial={{ opacity: 0, x: dir * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -80 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="flex-1 flex flex-col"
          >
            <Hero3D variant={s.variant} height={360} className="w-full mt-4" />
            <div className="px-8 mt-2">
              <h2 className="text-[32px] font-extrabold leading-tight">{s.title}</h2>
              <p className="text-white/70 mt-3 text-[15px] leading-relaxed">{s.text}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <div className="px-8 pb-12">
        <div className="flex gap-2 mb-8">
          {slides.map((_, k) => (
            <motion.button
              key={k}
              onClick={() => go(k)}
              animate={{ width: k === i ? 32 : 8, opacity: k === i ? 1 : 0.4 }}
              className="h-2 rounded-full bg-white"
              aria-label={`Slide ${k + 1}`}
            />
          ))}
        </div>
        <Button onClick={() => (i < slides.length - 1 ? go(i + 1) : update({ onboarded: true }))} icon={i === slides.length - 1 ? "ArrowRight" : undefined}>
          {i < slides.length - 1 ? "Next" : "Get started"}
        </Button>
      </div>
    </motion.div>
  );
}
