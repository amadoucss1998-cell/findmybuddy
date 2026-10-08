import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, Button, Chip, Header, Icon, Price, Tap } from "../components/ui";
import { useApp, catById } from "../lib/store";
import { rateFor } from "../lib/data";

const sorts = [
  { id: "rec", label: "Recommended", icon: "Sparkles" },
  { id: "rating", label: "Top rated", icon: "Star" },
  { id: "price", label: "Lowest price", icon: "CircleDollarSign" },
  { id: "near", label: "Nearest", icon: "Navigation" },
  { id: "elite", label: "Elite only", icon: "Award" },
];

export default function TaskerList({ cat }) {
  const { push, draft, favorites, toggleFav, taskers } = useApp();
  const [sort, setSort] = useState("rec");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const category = cat ? catById(cat) : null;

  const list = useMemo(() => {
    let l = cat ? taskers.filter((t) => t.skills.includes(cat)) : [...taskers];
    if (onlineOnly) l = l.filter((t) => t.online);
    if (sort === "elite") l = l.filter((t) => t.elite);
    const by = {
      rec: (a, b) => b.rating * 100 + b.jobs / 10 - (a.rating * 100 + a.jobs / 10),
      rating: (a, b) => b.rating - a.rating,
      price: (a, b) => rateFor(a, cat) - rateFor(b, cat),
      near: (a, b) => a.distance - b.distance,
      elite: (a, b) => b.rating - a.rating,
    }[sort];
    return [...l].sort(by);
  }, [cat, sort, onlineOnly, taskers]);

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: "var(--top)" }}>
      <Header
        title={category ? `${category.name} Taskers` : "All Taskers"}
        subtitle={draft && cat ? `${draft.date} · ${draft.area}` : `${list.length} available`}
        right={
          <Tap
            onClick={() => setOnlineOnly(!onlineOnly)}
            className={`h-9 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 ${onlineOnly ? "bg-green-500 text-white" : "bg-white dark:bg-night-3"}`}
          >
            <span className={`w-2 h-2 rounded-full ${onlineOnly ? "bg-white" : "bg-green-500"}`} /> Online
          </Tap>
        }
      />
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-3">
        {sorts.map((s) => (
          <Chip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)} icon={s.icon}>
            {s.label}
          </Chip>
        ))}
      </div>
      <div className="flex-1 scroll-y px-5 pb-10">
        {draft && cat && (
          <div className="mb-3 p-3 rounded-2xl bg-brand/10 text-brand text-xs font-semibold flex items-center gap-2">
            <Icon name="Info" size={16} /> Choose a Tasker — you can chat and adjust details after booking.
          </div>
        )}
        <motion.div layout className="space-y-3">
          <AnimatePresence>
            {list.map((t, i) => (
              <motion.div
                layout
                key={t.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04 } }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="rounded-3xl bg-white dark:bg-night-2 p-4 shadow-[0_8px_30px_-16px_rgba(15,23,42,.25)]"
              >
                <div className="flex gap-3" onClick={() => push("tasker", { id: t.id, cat })}>
                  <Avatar person={t} size={64} online={t.online} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-extrabold text-[16px] flex items-center gap-1 truncate">
                          {t.name}
                          {t.verified && <Icon name="BadgeCheck" size={16} className="text-brand shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1 text-xs mt-0.5">
                          <Icon name="Star" size={12} className="fill-gold text-gold" />
                          <b>{t.rating}</b>
                          <span className="text-mute">· {t.jobs} tasks · {t.distance} km</span>
                        </div>
                      </div>
                      <Tap
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFav(t.id);
                        }}
                        scale={0.7}
                        className="w-9 h-9 -mr-1 -mt-1 grid place-items-center"
                        aria-label="Favourite"
                      >
                        <motion.div animate={{ scale: favorites.includes(t.id) ? [1, 1.4, 1] : 1 }}>
                          <Icon name="Heart" size={20} className={favorites.includes(t.id) ? "fill-flag text-flag" : "text-slate-300"} />
                        </motion.div>
                      </Tap>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {t.elite && <span className="text-[10px] font-extrabold text-gold bg-gold/10 px-2 py-0.5 rounded-full">ELITE</span>}
                      <span className="text-[10px] font-bold text-mute bg-slate-100 dark:bg-night-3 px-2 py-0.5 rounded-full">Replies in ~{t.responseMins}m</span>
                      {t.vehicle && <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">{t.vehicle}</span>}
                    </div>
                  </div>
                </div>
                <p className="text-[13px] text-mute mt-3 line-clamp-2">{t.bio}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-night-3">
                  <div>
                    <Price usd={rateFor(t, cat)} />
                    <span className="text-xs text-mute"> /hr</span>
                  </div>
                  <Button
                    className="!w-auto !h-11 px-5 text-sm"
                    onClick={() => (draft && cat ? push("checkout", { taskerId: t.id }) : push("tasker", { id: t.id, cat }))}
                  >
                    {draft && cat ? "Select & continue" : "View profile"}
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
