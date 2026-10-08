import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar, Button, Header, Icon, Sheet, Tap } from "../components/ui";
import { useApp, taskerById } from "../lib/store";
import { fmtLRD, fmtUSD } from "../lib/data";

const steps = [
  { id: "confirmed", label: "Booking confirmed", icon: "CheckCircle2" },
  { id: "on_the_way", label: "Tasker on the way", icon: "Bike" },
  { id: "in_progress", label: "Task in progress", icon: "Hammer" },
  { id: "completed", label: "Completed", icon: "PartyPopper" },
];

// Stylised Monrovia map with an animated route.
function LiveMap({ status }) {
  const progress = { confirmed: 0.05, on_the_way: 0.55, in_progress: 1, completed: 1 }[status] ?? 0;
  const path = "M40 190 C 90 170, 100 110, 160 110 S 240 60, 300 50";
  return (
    <div className="relative h-56 rounded-3xl overflow-hidden bg-[#e9f0fb] dark:bg-night-2 map-grid">
      <svg viewBox="0 0 340 230" className="absolute inset-0 w-full h-full">
        <path d="M0 210 Q 120 180 200 200 T 340 190 L340 230 L0 230Z" fill="#9cc3ff" opacity=".55" />
        <text x="250" y="222" fontSize="9" fill="#3b82f6" fontWeight="700">Atlantic Ocean</text>
        <path d="M-10 80 L350 120" stroke="#fff" strokeWidth="10" className="dark:opacity-20" />
        <path d="M120 -10 L180 240" stroke="#fff" strokeWidth="8" className="dark:opacity-20" />
        <path d="M-10 150 L350 30" stroke="#fff" strokeWidth="6" className="dark:opacity-20" />
        <rect x="200" y="140" width="60" height="34" rx="8" fill="#bbf7d0" opacity=".7" />
        <text x="18" y="215" fontSize="9" fill="#64748b" fontWeight="700">Sinkor</text>
        <text x="270" y="40" fontSize="9" fill="#64748b" fontWeight="700">Paynesville</text>
        <text x="130" y="128" fontSize="9" fill="#64748b" fontWeight="700">Congo Town</text>
        <path d={path} stroke="#1E4FD8" strokeOpacity=".2" strokeWidth="6" fill="none" strokeLinecap="round" />
        <motion.path
          d={path}
          stroke="#1E4FD8"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </svg>
      {/* destination */}
      <div className="absolute" style={{ left: "88%", top: "21%", transform: "translate(-50%,-100%)" }}>
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
          <Icon name="MapPin" size={30} className="text-flag fill-flag/30" />
        </motion.div>
      </div>
      {/* tasker dot */}
      <motion.div
        className="absolute w-5 h-5 -ml-2.5 -mt-2.5"
        initial={false}
        animate={{
          left: `${(40 + (300 - 40) * progress) / 3.4}%`,
          top: `${(190 - (190 - 50) * progress) / 2.3}%`,
        }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      >
        <motion.span className="absolute inset-0 rounded-full bg-brand/40" animate={{ scale: [1, 2.4], opacity: [0.7, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />
        <span className="absolute inset-0 rounded-full bg-brand ring-4 ring-white" />
      </motion.div>
      <div className="absolute top-3 left-3 glass rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1.5">
        <motion.span className="w-2 h-2 rounded-full bg-green-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
        {status === "on_the_way" ? "ETA 12 min" : status === "confirmed" ? "Waiting to start" : "Tasker arrived"}
      </div>
    </div>
  );
}

export default function BookingDetail({ id }) {
  const { bookings, advanceBooking, cancelBooking, rateBooking, push, notify } = useApp();
  const b = bookings.find((x) => x.id === id);
  const [rateOpen, setRateOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [tip, setTip] = useState(2);
  if (!b) return null;
  const t = taskerById(b.taskerId);
  const idx = steps.findIndex((s) => s.id === b.status);
  const cancelled = b.status === "cancelled";

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: "var(--top)" }}>
      <Header title={b.categoryName} subtitle={`Booking #${b.id.toUpperCase()}`} />
      <div className="flex-1 scroll-y px-5 pb-10 space-y-4">
        {!cancelled && <LiveMap status={b.status} />}

        <div className="rounded-3xl bg-white dark:bg-night-2 p-4 flex items-center gap-3">
          <Avatar person={t} size={52} online={t.online} />
          <div className="flex-1">
            <div className="font-extrabold">{t.name}</div>
            <div className="text-xs text-mute flex items-center gap-1">
              <Icon name="Star" size={12} className="fill-gold text-gold" /> {t.rating} · {t.vehicle || "On foot / keke"}
            </div>
          </div>
          <Tap onClick={() => push("chat", { id: t.id })} className="w-11 h-11 rounded-full bg-brand/10 text-brand grid place-items-center">
            <Icon name="MessageCircle" size={19} />
          </Tap>
          <Tap onClick={() => notify(`Calling ${t.first}…`)} className="w-11 h-11 rounded-full bg-green-500/10 text-green-600 grid place-items-center">
            <Icon name="Phone" size={19} />
          </Tap>
        </div>

        <div className="rounded-3xl bg-white dark:bg-night-2 p-5">
          <h3 className="font-extrabold mb-4">Task status</h3>
          {cancelled ? (
            <div className="text-flag font-bold flex items-center gap-2">
              <Icon name="X" /> This booking was cancelled
            </div>
          ) : (
            <div className="relative">
              {steps.map((s, i) => {
                const done = i <= idx;
                return (
                  <div key={s.id} className="flex gap-4 relative pb-6 last:pb-0">
                    {i < steps.length - 1 && (
                      <div className="absolute left-[17px] top-9 bottom-0 w-0.5 bg-slate-200 dark:bg-night-3">
                        <motion.div className="w-full bg-brand" initial={false} animate={{ height: i < idx ? "100%" : "0%" }} transition={{ duration: 0.5 }} />
                      </div>
                    )}
                    <motion.div
                      initial={false}
                      animate={{ scale: i === idx ? [1, 1.15, 1] : 1, backgroundColor: done ? "#1E4FD8" : "#e2e8f0" }}
                      transition={{ duration: 0.5 }}
                      className={`relative z-10 w-9 h-9 rounded-full grid place-items-center ${done ? "text-white" : "text-slate-400"}`}
                    >
                      <Icon name={s.icon} size={17} />
                    </motion.div>
                    <div className="pt-1.5">
                      <div className={`font-bold text-sm ${done ? "" : "text-mute"}`}>{s.label}</div>
                      {i === idx && <div className="text-xs text-brand font-semibold">Now</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white dark:bg-night-2 p-5 text-sm space-y-3">
          <h3 className="font-extrabold">Details</h3>
          <p className="flex gap-3"><Icon name="Calendar" size={17} className="text-brand shrink-0" /> {b.date} · {b.slot}</p>
          <p className="flex gap-3"><Icon name="MapPin" size={17} className="text-brand shrink-0" /> {b.address}, {b.area}</p>
          <p className="flex gap-3"><Icon name="ClipboardList" size={17} className="text-brand shrink-0" /> {b.details}</p>
          <p className="flex gap-3"><Icon name="Receipt" size={17} className="text-brand shrink-0" /> {fmtUSD(b.total)} ≈ {fmtLRD(b.total)} · {b.payment}</p>
        </div>

        {!cancelled && b.status !== "completed" && (
          <div className="space-y-3">
            <Button variant="dark" icon="ArrowRight" onClick={() => advanceBooking(b.id)}>
              Simulate next status (demo)
            </Button>
            {b.status === "confirmed" && (
              <Button
                variant="danger"
                onClick={async () => (await cancelBooking(b.id)) && notify("Booking cancelled")}
              >
                Cancel booking
              </Button>
            )}
          </div>
        )}
        {b.status === "completed" &&
          (b.rated ? (
            <div className="rounded-3xl bg-green-500/10 text-green-700 dark:text-green-400 p-4 font-semibold text-sm flex items-center gap-2">
              <Icon name="Smile" /> You rated {t.first} {b.rated}★{b.tip ? ` and tipped ${fmtUSD(b.tip)}` : ""}. Thank you!
            </div>
          ) : (
            <Button icon="Star" onClick={() => setRateOpen(true)}>
              Rate & tip {t.first}
            </Button>
          ))}
      </div>

      <Sheet open={rateOpen} onClose={() => setRateOpen(false)} title={`How did ${t.first} do?`}>
        <div className="flex justify-center gap-2 my-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <Tap key={s} onClick={() => setStars(s)} scale={0.7}>
              <motion.div animate={{ scale: s <= stars ? 1.1 : 1, rotate: s <= stars ? [0, 15, 0] : 0 }}>
                <Icon name="Star" size={40} className={s <= stars ? "fill-gold text-gold" : "text-slate-300"} />
              </motion.div>
            </Tap>
          ))}
        </div>
        <h4 className="font-bold text-sm mt-2 mb-2">Add a tip (100% goes to {t.first})</h4>
        <div className="grid grid-cols-4 gap-2">
          {[0, 2, 5, 10].map((v) => (
            <Tap key={v} onClick={() => setTip(v)} className={`h-12 rounded-2xl font-bold ${tip === v ? "bg-brand text-white" : "bg-slate-100 dark:bg-night-3"}`}>
              {v ? fmtUSD(v) : "None"}
            </Tap>
          ))}
        </div>
        <Button
          className="mt-6"
          onClick={async () => {
            if (await rateBooking(b.id, stars, tip)) {
              setRateOpen(false);
              notify("Thanks for your feedback!");
            }
          }}
        >
          Submit
        </Button>
      </Sheet>
    </div>
  );
}
