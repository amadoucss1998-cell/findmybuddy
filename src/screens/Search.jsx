import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, CatTile, Icon, Tap } from "../components/ui";
import { useApp, catById } from "../lib/store";
import { categories } from "../lib/data";

const trending = ["Generator repair", "Deep cleaning", "Braiding", "Solar install", "Moving truck", "AC gas refill"];

export default function Search() {
  const { pop, push, taskers } = useApp();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const res = useMemo(() => {
    if (!query) return { cats: [], people: [] };
    const words = query.split(/\s+/);
    const match = (s) => words.every((w) => s.toLowerCase().includes(w));
    return {
      cats: categories.filter((c) => match(`${c.name} ${c.desc}`)),
      people: taskers.filter((t) => match(`${t.name} ${t.skills.map((s) => catById(s).name).join(" ")} ${t.area}`)).slice(0, 8),
    };
  }, [query, taskers]);

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: "var(--top)" }}>
      <div className="px-4 pt-2 pb-3 flex items-center gap-2">
        <motion.div layoutId="searchbar" className="flex-1 h-12 rounded-2xl bg-white dark:bg-night-2 flex items-center gap-2 px-4 shadow-sm">
          <Icon name="Search" size={18} className="text-brand" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What do you need help with?"
            className="flex-1 bg-transparent outline-none text-sm font-semibold"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear">
              <Icon name="X" size={16} className="text-mute" />
            </button>
          )}
        </motion.div>
        <button onClick={pop} className="font-bold text-sm text-brand px-2">
          Cancel
        </button>
      </div>
      <div className="flex-1 scroll-y px-5 pb-10">
        <AnimatePresence mode="wait">
          {!query ? (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-xs font-extrabold text-mute uppercase tracking-wider mt-2 mb-3">Trending in Monrovia</h3>
              <div className="flex flex-wrap gap-2">
                {trending.map((t, i) => (
                  <motion.div key={t} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                    <Tap onClick={() => setQ(t.split(" ")[0])} className="h-10 px-4 rounded-full bg-white dark:bg-night-2 text-sm font-semibold flex items-center gap-1.5">
                      <Icon name="TrendingUp" size={14} className="text-flag" /> {t}
                    </Tap>
                  </motion.div>
                ))}
              </div>
              <h3 className="text-xs font-extrabold text-mute uppercase tracking-wider mt-7 mb-3">All categories</h3>
              <div className="space-y-1">
                {categories.map((c) => (
                  <Tap as="div" key={c.id} scale={0.98} onClick={() => push("category", { id: c.id })} className="flex items-center gap-3 py-2">
                    <CatTile cat={c} size={42} />
                    <div className="flex-1">
                      <div className="font-bold text-sm">{c.name}</div>
                      <div className="text-xs text-mute">{c.desc}</div>
                    </div>
                    <Icon name="ChevronRight" size={16} className="text-mute" />
                  </Tap>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {res.cats.length === 0 && res.people.length === 0 && (
                <div className="text-center py-16 text-mute">
                  <Icon name="Search" size={40} className="mx-auto mb-3 opacity-40" />
                  No results for "{q}"
                </div>
              )}
              {res.cats.length > 0 && <h3 className="text-xs font-extrabold text-mute uppercase tracking-wider mt-2 mb-2">Services</h3>}
              {res.cats.map((c) => (
                <Tap as="div" key={c.id} scale={0.98} onClick={() => push("category", { id: c.id })} className="flex items-center gap-3 py-2">
                  <CatTile cat={c} size={42} />
                  <div className="flex-1 font-bold text-sm">{c.name}</div>
                  <span className="text-xs text-mute">from ${c.from}/hr</span>
                </Tap>
              ))}
              {res.people.length > 0 && <h3 className="text-xs font-extrabold text-mute uppercase tracking-wider mt-5 mb-2">Taskers</h3>}
              {res.people.map((t) => (
                <Tap as="div" key={t.id} scale={0.98} onClick={() => push("tasker", { id: t.id })} className="flex items-center gap-3 py-2">
                  <Avatar person={t} size={42} online={t.online} />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-xs text-mute">{t.skills.map((s) => catById(s).name).join(" · ")}</div>
                  </div>
                  <span className="text-xs font-bold flex items-center gap-0.5">
                    <Icon name="Star" size={12} className="fill-gold text-gold" /> {t.rating}
                  </span>
                </Tap>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
