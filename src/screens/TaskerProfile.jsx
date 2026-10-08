import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { Avatar, Button, CatTile, Icon, Stars, Tap, Price } from "../components/ui";
import { useApp, catById, taskerById } from "../lib/store";
import { rateFor } from "../lib/data";

function Counter({ to, decimals = 0 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, to, { duration: 1.2, ease: "easeOut", onUpdate: setV });
    return () => c.stop();
  }, [to]);
  return <>{v.toFixed(decimals)}</>;
}

export default function TaskerProfile({ id, cat }) {
  const t = taskerById(id);
  const { pop, push, draft, favorites, toggleFav, notify } = useApp();
  const ref = useRef(null);
  const { scrollY } = useScroll({ container: ref });
  const avatarScale = useTransform(scrollY, [0, 140], [1, 0.6]);
  const heroY = useTransform(scrollY, [0, 200], [0, -60]);
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setSolid(v > 150));
  const fav = favorites.includes(id);
  const bookCat = cat || t.skills[0];

  const book = () => {
    if (draft && draft.categoryId === bookCat) push("checkout", { taskerId: id });
    else push("category", { id: bookCat });
  };

  return (
    <div className="h-full relative">
      <motion.div
        className="absolute top-0 inset-x-0 z-30 flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: "calc(var(--top) + 4px)" }}
        animate={{ backgroundColor: solid ? "rgba(10,26,63,0.95)" : "rgba(10,26,63,0)" }}
      >
        <Tap onClick={pop} className="w-10 h-10 rounded-full bg-white/15 backdrop-blur text-white grid place-items-center">
          <Icon name="ChevronLeft" size={22} />
        </Tap>
        <motion.span animate={{ opacity: solid ? 1 : 0 }} className="flex-1 text-white font-extrabold truncate">
          {t.name}
        </motion.span>
        <Tap onClick={() => notify("Profile link copied")} className="w-10 h-10 rounded-full bg-white/15 backdrop-blur text-white grid place-items-center">
          <Icon name="Copy" size={18} />
        </Tap>
        <Tap onClick={() => toggleFav(id)} scale={0.8} className="w-10 h-10 rounded-full bg-white/15 backdrop-blur grid place-items-center">
          <motion.div animate={{ scale: fav ? [1, 1.5, 1] : 1 }}>
            <Icon name="Heart" size={19} className={fav ? "fill-flag text-flag" : "text-white"} />
          </motion.div>
        </Tap>
      </motion.div>

      <div ref={ref} className="h-full scroll-y pb-32">
        <motion.div style={{ y: heroY }} className="relative h-[290px] overflow-hidden" >
          <div className="absolute inset-0" style={{ background: `linear-gradient(140deg, ${t.gradient[0]}, ${t.gradient[1]} 55%, #0A1A3F)` }} />
          <motion.div className="absolute -right-10 top-10 w-52 h-52 rounded-full bg-white/10" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 5 }} />
          <motion.div className="absolute -left-16 bottom-0 w-52 h-52 rounded-full bg-white/10" animate={{ scale: [1.1, 1, 1.1] }} transition={{ repeat: Infinity, duration: 6 }} />
          <div className="absolute inset-x-0 bottom-12 flex flex-col items-center text-white">
            <motion.div style={{ scale: avatarScale }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Avatar person={t} size={104} ring online={t.online} />
            </motion.div>
            <h1 className="mt-3 text-2xl font-extrabold flex items-center gap-1.5">
              {t.name} {t.verified && <Icon name="BadgeCheck" size={22} />}
            </h1>
            <p className="text-white/80 text-sm flex items-center gap-1">
              <Icon name="MapPin" size={13} /> {t.area}, Monrovia · {t.distance} km away
            </p>
          </div>
        </motion.div>

        <div className="relative -mt-8 rounded-t-[32px] bg-surface dark:bg-night px-5 pt-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              [<><Counter to={t.rating} decimals={1} />★</>, "Rating"],
              [<Counter to={t.jobs} />, "Tasks done"],
              [<>{t.responseMins}m</>, "Response"],
            ].map(([v, l], i) => (
              <motion.div key={l} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="rounded-2xl bg-white dark:bg-night-2 py-3 text-center">
                <div className="font-extrabold text-lg">{v}</div>
                <div className="text-[11px] text-mute font-semibold">{l}</div>
              </motion.div>
            ))}
          </div>

          {t.elite && (
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-gold/20 to-flag/10 flex items-center gap-3">
              <Icon name="Award" className="text-gold" />
              <span className="text-[13px] font-semibold">Elite Tasker — top 10% for quality & reliability</span>
            </div>
          )}

          <h2 className="font-extrabold text-lg mt-6">About</h2>
          <p className="text-[14px] text-mute mt-1 leading-relaxed">{t.bio}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-white dark:bg-night-2 font-semibold flex items-center gap-1">
              <Icon name="Languages" size={13} /> {t.languages.join(", ")}
            </span>
            {t.vehicle && (
              <span className="px-3 py-1.5 rounded-full bg-white dark:bg-night-2 font-semibold flex items-center gap-1">
                <Icon name="Truck" size={13} /> {t.vehicle}
              </span>
            )}
            <span className="px-3 py-1.5 rounded-full bg-white dark:bg-night-2 font-semibold flex items-center gap-1">
              <Icon name="ShieldCheck" size={13} /> ID & police checked
            </span>
          </div>

          <h2 className="font-extrabold text-lg mt-6">Skills & rates</h2>
          <div className="mt-2 space-y-2">
            {t.skills.map((s, i) => {
              const c = catById(s);
              return (
                <Tap key={s} as="div" scale={0.98} onClick={() => push("category", { id: s })} className="rounded-2xl bg-white dark:bg-night-2 p-3 flex items-center gap-3">
                  <CatTile cat={c} size={44} />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{c.name}</div>
                    <div className="text-xs text-mute">{Math.floor(t.jobs / (i + 2))} tasks completed</div>
                  </div>
                  <Price usd={rateFor(t, s)} small />
                </Tap>
              );
            })}
          </div>

          <div className="flex items-end justify-between mt-6">
            <h2 className="font-extrabold text-lg">Reviews</h2>
            <div className="flex items-center gap-1.5 text-sm">
              <Stars value={t.rating} /> <b>{t.rating}</b>
            </div>
          </div>
          <div className="mt-2 rounded-2xl bg-white dark:bg-night-2 p-4">
            {[5, 4, 3, 2, 1].map((s, i) => {
              const pct = Math.round((t.reviews.filter((r) => r.rating === s).length / Math.max(1, t.reviews.length)) * 100);
              return (
                <div key={s} className="flex items-center gap-2 text-xs my-1">
                  <span className="w-3 font-bold">{s}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-night-3 overflow-hidden">
                    <motion.div className="h-full bg-gold rounded-full" initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.7 }} />
                  </div>
                  <span className="w-8 text-right text-mute">{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 space-y-3">
            {t.reviews.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="rounded-2xl bg-white dark:bg-night-2 p-4">
                <div className="flex items-center gap-3">
                  <Avatar person={{ name: r.name, gradient: ["#94a3b8", "#475569"] }} size={36} />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{r.name}</div>
                    <div className="text-[11px] text-mute">{r.category} · {r.when}</div>
                  </div>
                  <Stars value={r.rating} size={12} />
                </div>
                <p className="text-[13.5px] mt-2">{r.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 glass px-5 pt-3 pb-8 flex gap-3 border-t border-slate-200/60 dark:border-night-3">
        <Tap onClick={() => push("chat", { id })} className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-night-3 grid place-items-center">
          <Icon name="MessageCircle" />
        </Tap>
        <Button onClick={book} className="flex-1">
          {draft && draft.categoryId === bookCat ? `Book ${t.first} · $${rateFor(t, bookCat)}/hr` : `Book ${t.first}`}
        </Button>
      </div>
    </div>
  );
}
