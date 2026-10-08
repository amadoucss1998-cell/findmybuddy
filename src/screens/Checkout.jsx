import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Avatar, Header, Icon, Tap, Price } from "../components/ui";
import { useApp, taskerById } from "../lib/store";
import { fmtLRD, fmtUSD, paymentMethods, rateFor, taskSizes } from "../lib/data";

function SlideToBook({ onDone, label }) {
  const track = useRef(null);
  const x = useMotionValue(0);
  const [done, setDone] = useState(false);
  const fill = useTransform(x, (v) => v + 56);
  const textOpacity = useTransform(x, [0, 140], [1, 0]);
  return (
    <div ref={track} className="relative h-16 rounded-2xl bg-navy dark:bg-night-3 overflow-hidden select-none">
      <motion.div className="absolute inset-y-0 left-0 bg-brand" style={{ width: fill }} />
      <motion.span style={{ opacity: textOpacity }} className="absolute inset-0 grid place-items-center text-white font-bold text-[15px]">
        <span className="shimmer bg-clip-text">{label}</span>
      </motion.span>
      <motion.div
        drag={done ? false : "x"}
        dragConstraints={track}
        dragElastic={0}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={() => {
          const max = track.current.offsetWidth - 64;
          if (x.get() > max * 0.8) {
            animate(x, max, { type: "spring", stiffness: 400, damping: 30 });
            setDone(true);
            setTimeout(onDone, 350);
          } else animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
        }}
        className="absolute top-1 left-1 w-14 h-14 rounded-xl bg-white text-brand grid place-items-center shadow-lg cursor-grab active:cursor-grabbing touch-none"
      >
        <Icon name={done ? "Check" : "ChevronRight"} size={26} />
      </motion.div>
    </div>
  );
}

export default function Checkout({ taskerId }) {
  const t = taskerById(taskerId);
  const { draft, createBooking, quote, replace, notify, user } = useApp();
  const wallet = user?.wallet || 0;
  const [pay, setPay] = useState("orange");
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState(null); // applied code
  const [useWallet, setUseWallet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Local estimate shown instantly; replaced by the server's quote as soon as it arrives.
  const rate = draft ? rateFor(t, draft.categoryId) : 0;
  const hours = taskSizes.find((s) => s.id === draft?.size)?.hours || 2;
  const estimate = { rate, hours, subtotal: rate * hours, fee: Math.round(rate * hours * 7) / 100, discount: 0, credit: 0 };
  estimate.total = estimate.subtotal + estimate.fee;
  const [q, setQ] = useState(null);
  const shown = q || estimate;
  const { subtotal, fee, discount, credit, total } = shown;

  useEffect(() => {
    if (!draft) return;
    let alive = true;
    quote({ taskerId, categoryId: draft.categoryId, size: draft.size, promoCode: promo, useWallet })
      .then((res) => {
        if (!alive) return;
        if (promo && res.promo && !res.promo.valid) {
          notify(res.promo.reason, "err");
          setPromo(null);
          return;
        }
        setQ(res);
      })
      .catch((e) => alive && notify(e.message, "err"));
    return () => {
      alive = false;
    };
  }, [taskerId, draft, promo, useWallet, quote, notify]);

  if (!draft) return null;

  const applyPromo = () => {
    if (!code.trim()) return;
    setPromo(code.trim());
  };

  const confirm = async () => {
    setBusy(true);
    const b = await createBooking({
      taskerId,
      categoryId: draft.categoryId,
      size: draft.size,
      area: draft.area,
      address: draft.address,
      details: draft.details,
      date: draft.date,
      slot: draft.slot,
      paymentMethod: pay,
      promoCode: promo,
      useWallet,
    });
    setBusy(false);
    if (b) replace("confirmed", { id: b.id });
    else setAttempt((n) => n + 1); // reset the slider so they can retry
  };

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: "var(--top)" }}>
      <Header title="Review & book" subtitle="You won't be charged until the task is done" />
      <div className="flex-1 scroll-y px-5 pb-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white dark:bg-night-2 p-4">
          <div className="flex items-center gap-3">
            <Avatar person={t} size={52} />
            <div className="flex-1">
              <div className="font-extrabold">{t.name}</div>
              <div className="text-xs text-mute flex items-center gap-1">
                <Icon name="Star" size={12} className="fill-gold text-gold" /> {t.rating} · {t.jobs} tasks
              </div>
            </div>
            <Price usd={shown.rate} small />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {[
              ["Briefcase", draft.categoryName],
              ["Calendar", `${draft.date} · ${draft.slot}`],
              ["MapPin", `${draft.address}, ${draft.area}`],
              ["Timer", `${taskSizes.find((s) => s.id === draft.size)?.label} task · est. ${hours} hrs`],
            ].map(([ic, txt]) => (
              <div key={ic} className="flex gap-3">
                <Icon name={ic} size={17} className="text-brand shrink-0 mt-0.5" />
                <span className="font-medium">{txt}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div>
          <h3 className="font-extrabold mb-2">Payment method</h3>
          <div className="space-y-2">
            {paymentMethods.map((p) => (
              <Tap
                key={p.id}
                onClick={() => setPay(p.id)}
                className={`relative w-full p-3 rounded-2xl flex items-center gap-3 text-left bg-white dark:bg-night-2 border-2 ${pay === p.id ? "border-brand" : "border-transparent"}`}
              >
                <div className="w-12 h-9 rounded-lg grid place-items-center text-[11px] font-black" style={{ background: p.color, color: p.id === "mtn" ? "#000" : "#fff" }}>
                  {p.short}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-xs text-mute">{p.sub}</div>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-slate-300 grid place-items-center">
                  {pay === p.id && <motion.div layoutId="pay-dot" className="w-3.5 h-3.5 rounded-full bg-brand" />}
                </div>
              </Tap>
            ))}
          </div>
        </div>

        <Tap onClick={() => setUseWallet(!useWallet)} className="w-full p-4 rounded-2xl bg-white dark:bg-night-2 flex items-center gap-3 text-left">
          <Icon name="Wallet" className="text-brand" />
          <div className="flex-1">
            <div className="font-bold text-sm">Use LoneStar credit</div>
            <div className="text-xs text-mute">Balance {fmtUSD(wallet)}</div>
          </div>
          <div className={`w-12 h-7 rounded-full p-1 flex ${useWallet ? "bg-brand justify-end" : "bg-slate-300 justify-start"}`}>
            <motion.div layout transition={{ type: "spring", stiffness: 600, damping: 32 }} className="w-5 h-5 rounded-full bg-white shadow" />
          </div>
        </Tap>

        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Promo code (try LIB5)"
            className="flex-1 h-12 px-4 rounded-2xl bg-white dark:bg-night-2 outline-none font-semibold text-sm border-2 border-transparent focus:border-brand"
          />
          <Tap
            onClick={applyPromo}
            className="h-12 px-5 rounded-2xl bg-navy text-white font-bold text-sm"
          >
            Apply
          </Tap>
        </div>

        <div className="rounded-3xl bg-white dark:bg-night-2 p-4 text-sm space-y-2">
          <Row label={`${fmtUSD(shown.rate)}/hr × ${shown.hours} hrs`} value={fmtUSD(subtotal)} />
          <Row label="Trust & Support fee" value={fmtUSD(fee)} />
          {discount > 0 && <Row label={`Promo ${q?.promo?.code || ""}`} value={`−${fmtUSD(discount)}`} accent />}
          {credit > 0 && <Row label="LoneStar credit" value={`−${fmtUSD(credit)}`} accent />}
          <div className="border-t border-dashed border-slate-200 dark:border-night-3 pt-2 flex justify-between items-end">
            <span className="font-extrabold">Estimated total</span>
            <div className="text-right">
              <motion.div key={total} initial={{ scale: 1.2, color: "#1E4FD8" }} animate={{ scale: 1, color: "inherit" }} className="font-extrabold text-xl">
                {fmtUSD(total)}
              </motion.div>
              <div className="text-xs text-mute">≈ {fmtLRD(total)}</div>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-mute text-center px-6">
          Final cost depends on actual hours worked. Free cancellation up to 24 hours before your task.
        </p>
      </div>
      <div className="px-5 pb-8 pt-3 glass">
        <SlideToBook key={attempt} onDone={confirm} label={busy ? "Booking…" : `Slide to book · ${fmtUSD(total)}`} />
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between">
      <span className="text-mute">{label}</span>
      <span className={`font-bold ${accent ? "text-green-600" : ""}`}>{value}</span>
    </div>
  );
}
