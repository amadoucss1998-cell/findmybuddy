import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, CatTile, Header, Icon, Tap } from "../components/ui";
import { useApp, catById, taskersFor } from "../lib/store";
import { neighborhoods, taskSizes, timeSlots } from "../lib/data";

const steps = ["Location", "Task size", "Details", "Date & time"];

function nextDays(n = 10) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push({
      key: x.toDateString(),
      dow: i === 0 ? "Today" : i === 1 ? "Tmrw" : x.toLocaleDateString([], { weekday: "short" }),
      day: x.getDate(),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : x.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
    });
  }
  return out;
}

export default function TaskBuilder({ id }) {
  const cat = catById(id);
  const { user, push, setDraft } = useApp();
  const [step, setStep] = useState(0);
  const [area, setArea] = useState(user?.area || "Sinkor");
  const [address, setAddress] = useState("");
  const [size, setSize] = useState("medium");
  const [details, setDetails] = useState("");
  const [vehicle, setVehicle] = useState(false);
  const days = useMemo(() => nextDays(), []);
  const [day, setDay] = useState(days[0].key);
  const [slot, setSlot] = useState(timeSlots[0]);
  const available = taskersFor(id).length;

  const canNext = [address.trim().length > 2, !!size, details.trim().length > 5, !!slot][step];

  const next = () => {
    if (step < steps.length - 1) return setStep(step + 1);
    setDraft({
      categoryId: id,
      categoryName: cat.name,
      area,
      address,
      size,
      details,
      vehicle,
      date: days.find((d) => d.key === day).label,
      slot,
    });
    push("taskers", { cat: id });
  };

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: "var(--top)" }}>
      <Header title={cat.name} subtitle={`${available} Taskers available · from $${cat.from}/hr`} onBack={step ? () => setStep(step - 1) : undefined} />
      <div className="px-5">
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-night-3 overflow-hidden">
              <motion.div className="h-full bg-brand" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
            </div>
          ))}
        </div>
        <p className="text-xs font-bold text-mute mt-2">
          Step {step + 1} of {steps.length} · {steps[step]}
        </p>
      </div>

      <div className="flex-1 scroll-y px-5 pt-4 pb-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}>
            {step === 0 && (
              <>
                <div className="flex items-center gap-3 p-4 rounded-3xl bg-white dark:bg-night-2">
                  <CatTile cat={cat} />
                  <div>
                    <div className="font-extrabold">{cat.name}</div>
                    <div className="text-xs text-mute">{cat.desc}</div>
                  </div>
                </div>
                <h2 className="font-extrabold text-xl mt-6">Where is your task?</h2>
                <div className="relative mt-3">
                  <Icon name="MapPin" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-flag" />
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, landmark or junction"
                    className="w-full h-14 pl-11 pr-4 rounded-2xl bg-white dark:bg-night-2 border-2 border-transparent focus:border-brand outline-none font-semibold"
                  />
                </div>
                <p className="text-xs text-mute mt-2">E.g. "Behind ELWA Hospital, yellow gate" — landmarks help Taskers find you.</p>
                <h3 className="font-bold text-sm mt-5 mb-2">Community</h3>
                <div className="flex flex-wrap gap-2">
                  {neighborhoods.map((n) => (
                    <Tap
                      key={n}
                      onClick={() => setArea(n)}
                      className={`h-9 px-3.5 rounded-full text-[13px] font-semibold ${area === n ? "bg-navy text-white dark:bg-brand" : "bg-white dark:bg-night-2"}`}
                    >
                      {n}
                    </Tap>
                  ))}
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <h2 className="font-extrabold text-xl">How big is your task?</h2>
                <p className="text-sm text-mute mt-1">This helps us match Taskers with the right availability.</p>
                <div className="mt-5 space-y-3">
                  {taskSizes.map((s) => (
                    <Tap
                      key={s.id}
                      onClick={() => setSize(s.id)}
                      className={`w-full text-left p-5 rounded-3xl flex items-center gap-4 border-2 ${size === s.id ? "border-brand bg-brand/5" : "border-transparent bg-white dark:bg-night-2"}`}
                    >
                      <div className="flex gap-1 items-end h-8">
                        {[1, 2, 3].map((b) => (
                          <motion.div
                            key={b}
                            className={`w-2.5 rounded-sm ${b <= taskSizes.indexOf(s) + 1 ? "bg-brand" : "bg-slate-200 dark:bg-night-3"}`}
                            animate={{ height: b * 10 }}
                          />
                        ))}
                      </div>
                      <div className="flex-1">
                        <div className="font-extrabold">{s.label}</div>
                        <div className="text-xs text-mute">{s.hint}</div>
                      </div>
                      <motion.div
                        animate={{ scale: size === s.id ? 1 : 0.6, opacity: size === s.id ? 1 : 0.3 }}
                        className={`w-7 h-7 rounded-full grid place-items-center ${size === s.id ? "bg-brand text-white" : "border-2 border-slate-300"}`}
                      >
                        {size === s.id && <Icon name="Check" size={16} />}
                      </motion.div>
                    </Tap>
                  ))}
                </div>
                {["moving", "delivery"].includes(id) && (
                  <Tap
                    onClick={() => setVehicle(!vehicle)}
                    className="mt-5 w-full p-4 rounded-3xl bg-white dark:bg-night-2 flex items-center gap-3 text-left"
                  >
                    <Icon name="Truck" className="text-brand" />
                    <div className="flex-1">
                      <div className="font-bold">Vehicle required</div>
                      <div className="text-xs text-mute">Pickup truck, keke or motorbike</div>
                    </div>
                    <div className={`w-12 h-7 rounded-full p-1 flex ${vehicle ? "bg-brand justify-end" : "bg-slate-300 justify-start"}`}>
                      <motion.div layout transition={{ type: "spring", stiffness: 600, damping: 32 }} className="w-5 h-5 rounded-full bg-white shadow" />
                    </div>
                  </Tap>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="font-extrabold text-xl">Tell us the details</h2>
                <p className="text-sm text-mute mt-1">Start the conversation — what should your Tasker know?</p>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value.slice(0, 400))}
                  rows={6}
                  placeholder={`e.g. "${id === "generator" ? "My 5KVA Firman won't start after rain. Fuel is full." : "3-bedroom house, need kitchen and bathrooms deep cleaned."}"`}
                  className="mt-4 w-full p-4 rounded-3xl bg-white dark:bg-night-2 border-2 border-transparent focus:border-brand outline-none resize-none font-medium"
                />
                <div className="text-right text-xs text-mute">{details.length}/400</div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {["Bring your own tools", "Pets at home", "Gate code needed", "Urgent"].map((s) => (
                    <Tap key={s} onClick={() => setDetails((d) => (d ? `${d}. ${s}` : s))} className="h-8 px-3 rounded-full bg-brand/10 text-brand text-xs font-bold">
                      + {s}
                    </Tap>
                  ))}
                </div>
                <Tap className="mt-5 w-full h-24 rounded-3xl border-2 border-dashed border-slate-300 dark:border-night-3 flex flex-col items-center justify-center text-mute">
                  <Icon name="Camera" />
                  <span className="text-xs font-semibold mt-1">Add photos (optional)</span>
                </Tap>
              </>
            )}
            {step === 3 && (
              <>
                <h2 className="font-extrabold text-xl">When do you need it?</h2>
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 mt-4 pb-1">
                  {days.map((d) => (
                    <Tap
                      key={d.key}
                      onClick={() => setDay(d.key)}
                      className={`relative w-16 h-20 shrink-0 rounded-2xl flex flex-col items-center justify-center ${day === d.key ? "text-white" : "bg-white dark:bg-night-2"}`}
                    >
                      {day === d.key && <motion.div layoutId="day-pill" className="absolute inset-0 rounded-2xl bg-brand" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                      <span className={`relative text-[11px] font-bold ${day === d.key ? "text-white/80" : "text-mute"}`}>{d.dow}</span>
                      <span className="relative text-xl font-extrabold">{d.day}</span>
                    </Tap>
                  ))}
                </div>
                <h3 className="font-bold text-sm mt-6 mb-2">Preferred time</h3>
                <div className="space-y-2">
                  {timeSlots.map((s) => (
                    <Tap
                      key={s}
                      onClick={() => setSlot(s)}
                      className={`w-full h-14 rounded-2xl px-4 flex items-center gap-3 text-left font-semibold border-2 ${slot === s ? "border-brand bg-brand/5" : "border-transparent bg-white dark:bg-night-2"}`}
                    >
                      <Icon name="Clock" size={18} className={slot === s ? "text-brand" : "text-mute"} />
                      <span className="flex-1">{s}</span>
                      {slot === s && <Icon name="CheckCircle2" className="text-brand" />}
                    </Tap>
                  ))}
                </div>
                <div className="mt-5 p-4 rounded-2xl bg-gold/10 text-[13px] flex gap-3">
                  <Icon name="Info" size={18} className="text-gold shrink-0" />
                  <span>Rainy season tip: allow a little extra time for Taskers travelling across town.</span>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="px-5 pb-8 pt-3 glass">
        <Button disabled={!canNext} onClick={next} icon={step === 3 ? "Users" : undefined}>
          {step === 3 ? "See Taskers & prices" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
