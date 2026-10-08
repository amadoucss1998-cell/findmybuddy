import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, CatTile, Icon, Section, Sheet, Stars, Tap, itemV, listV, Price } from "../components/ui";
import { Hero3D } from "../components/three";
import { useApp, catById, taskerById } from "../lib/store";
import { categories, neighborhoods, popularIds, promos, rateFor } from "../lib/data";

const statusLabel = { confirmed: "Confirmed", on_the_way: "Tasker on the way", in_progress: "In progress" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function PromoCarousel() {
  const push = useApp((s) => s.push);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % promos.length), 4500);
    return () => clearInterval(t);
  }, []);
  const p = promos[i];
  return (
    <div className="px-5 mt-5">
      <motion.div
        className="relative h-[150px] rounded-[26px] overflow-hidden text-white"
        animate={{ background: `linear-gradient(120deg, ${p.colors[0]}, ${p.colors[1]})` }}
        transition={{ duration: 0.6 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -40) setI((x) => (x + 1) % promos.length);
          if (info.offset.x > 40) setI((x) => (x - 1 + promos.length) % promos.length);
        }}
      >
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute right-6 -bottom-16 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute right-0 top-0 w-[46%] h-full">
          <Hero3D variant={i === 1 ? "coins" : i === 2 ? "star" : "tools"} height={150} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            className="relative p-5 w-[62%] h-full flex flex-col"
          >
            <span className="text-[10px] font-extrabold tracking-widest bg-white/20 self-start px-2 py-1 rounded-full">LIMITED OFFER</span>
            <h3 className="font-extrabold text-xl mt-2 leading-tight">{p.title}</h3>
            <p className="text-xs text-white/80 mt-1">{p.sub}</p>
            <Tap onClick={() => push("category", { id: p.cat })} className="mt-auto self-start bg-white text-navy text-xs font-extrabold px-3 py-1.5 rounded-full">
              Book now →
            </Tap>
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <div className="flex justify-center gap-1.5 mt-3">
        {promos.map((_, k) => (
          <motion.span key={k} animate={{ width: k === i ? 20 : 6 }} className={`h-1.5 rounded-full ${k === i ? "bg-brand" : "bg-slate-300 dark:bg-night-3"}`} />
        ))}
      </div>
    </div>
  );
}

export function TaskerCard({ t, cat }) {
  const push = useApp((s) => s.push);
  return (
    <Tap
      as="div"
      scale={0.97}
      onClick={() => push("tasker", { id: t.id, cat })}
      className="w-[210px] shrink-0 rounded-3xl bg-white dark:bg-night-2 p-4 shadow-[0_8px_30px_-12px_rgba(15,23,42,.18)]"
    >
      <div className="flex items-center gap-3">
        <Avatar person={t} size={50} online={t.online} />
        <div className="min-w-0">
          <div className="font-extrabold truncate flex items-center gap-1">
            {t.first}
            {t.verified && <Icon name="BadgeCheck" size={15} className="text-brand shrink-0" />}
          </div>
          <div className="text-xs text-mute truncate">{catById(t.skills[0]).name}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-xs">
        <Icon name="Star" size={13} className="fill-gold text-gold" />
        <b>{t.rating}</b>
        <span className="text-mute">({t.jobs} tasks)</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <Price usd={rateFor(t, cat)} small />
        <span className="text-[11px] text-mute">/hr</span>
      </div>
      {t.elite && (
        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-gold bg-gold/10 px-2 py-0.5 rounded-full">
          <Icon name="Award" size={11} /> ELITE TASKER
        </div>
      )}
    </Tap>
  );
}

export default function Home() {
  const { user, push, notifs, bookings, saveProfile, taskers } = useApp();
  const [areaOpen, setAreaOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const unread = notifs.filter((n) => !n.read).length;
  const active = bookings.find((b) => !["completed", "cancelled"].includes(b.status));
  const cats = showAll ? categories : popularIds.map(catById);
  const near = [...taskers].filter((t) => t.area === user?.area || t.distance < 3).sort((a, b) => b.rating - a.rating).slice(0, 8);

  return (
    <div className="h-full scroll-y pb-32">
      {/* hero header */}
      <div className="relative bg-gradient-to-br from-navy-2 via-navy to-[#050b1f] text-white rounded-b-[36px] px-5 pb-7 overflow-hidden" style={{ paddingTop: "calc(var(--top) + 6px)" }}>
        <motion.div className="absolute -right-16 -top-10 w-60 h-60 rounded-full bg-brand/30 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 6 }} />
        <motion.div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-flag/20 blur-3xl" animate={{ scale: [1.2, 1, 1.2] }} transition={{ repeat: Infinity, duration: 7 }} />
        <div className="relative flex items-center justify-between">
          <Tap onClick={() => setAreaOpen(true)} className="flex items-center gap-2 text-left">
            <div className="w-9 h-9 rounded-full bg-white/10 grid place-items-center">
              <Icon name="MapPin" size={17} className="text-flag" />
            </div>
            <div>
              <div className="text-[11px] text-white/60 font-semibold">Your location</div>
              <div className="font-bold text-sm flex items-center gap-1">
                {user?.area}, Monrovia <Icon name="ChevronRight" size={14} className="rotate-90" />
              </div>
            </div>
          </Tap>
          <Tap onClick={() => push("notifications")} className="relative w-11 h-11 rounded-full bg-white/10 grid place-items-center">
            <motion.div animate={unread ? { rotate: [0, -15, 15, -10, 10, 0] } : {}} transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}>
              <Icon name="Bell" size={20} />
            </motion.div>
            {unread > 0 && <span className="absolute top-2.5 right-3 w-2.5 h-2.5 rounded-full bg-flag ring-2 ring-navy" />}
          </Tap>
        </div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mt-6 text-[28px] font-extrabold leading-tight">
          {greeting()}, {user?.name?.split(" ")[0]} 👋
          <br />
          <span className="text-white/60 text-[22px]">What do you need done?</span>
        </motion.h1>
        <Tap
          as="div"
          scale={0.98}
          onClick={() => push("search")}
          className="relative mt-5 h-14 rounded-2xl bg-white text-mute flex items-center gap-3 px-4 shadow-xl"
        >
          <Icon name="Search" size={20} className="text-brand" />
          <span className="text-sm font-medium flex-1">Search "generator repair"…</span>
          <div className="w-9 h-9 rounded-xl bg-brand text-white grid place-items-center">
            <Icon name="SlidersHorizontal" size={16} />
          </div>
        </Tap>
      </div>

      {/* active booking */}
      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-5 mt-5">
            <Tap
              as="div"
              scale={0.98}
              onClick={() => push("booking", { id: active.id })}
              className="rounded-3xl bg-white dark:bg-night-2 p-4 flex items-center gap-3 shadow-[0_8px_30px_-12px_rgba(15,23,42,.2)] border-l-4 border-brand"
            >
              <Avatar person={taskerById(active.taskerId)} size={46} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-extrabold text-brand flex items-center gap-1.5">
                  <motion.span className="w-2 h-2 rounded-full bg-brand" animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} />
                  {statusLabel[active.status].toUpperCase()}
                </div>
                <div className="font-bold truncate">{active.categoryName}</div>
                <div className="text-xs text-mute">{active.date} · {active.slot.split(" · ")[0]}</div>
              </div>
              <Icon name="ChevronRight" className="text-mute" />
            </Tap>
          </motion.div>
        )}
      </AnimatePresence>

      <PromoCarousel />

      <Section title={showAll ? "All services" : "Popular services"} action={showAll ? "Show less" : "See all"} onAction={() => setShowAll(!showAll)}>
        <motion.div layout variants={listV} initial="hidden" animate="show" className="px-5 grid grid-cols-4 gap-y-5 gap-x-3">
          {cats.map((c) => (
            <motion.div key={c.id} layout variants={itemV}>
              <Tap onClick={() => push("category", { id: c.id })} className="w-full flex flex-col items-center gap-2" scale={0.9}>
                <CatTile cat={c} size={60} />
                <span className="text-[11px] font-bold text-center leading-tight text-ink dark:text-slate-200">{c.name}</span>
              </Tap>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      <Section title="Top Taskers near you" action="View all" onAction={() => push("taskers", { cat: null })}>
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-4">
          {near.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <TaskerCard t={t} />
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="px-5 mt-4">
        <div className="rounded-3xl p-5 bg-gradient-to-br from-[#e8f0ff] to-white dark:from-night-2 dark:to-night-3 flex gap-4 items-center">
          <div className="w-14 h-14 rounded-2xl bg-brand text-white grid place-items-center shrink-0">
            <Icon name="ShieldCheck" size={28} />
          </div>
          <div>
            <h3 className="font-extrabold">LoneStar Happiness Pledge</h3>
            <p className="text-xs text-mute mt-1">Every Tasker is ID-verified with a police clearance. If something goes wrong, we'll make it right.</p>
          </div>
        </div>
      </div>

      <Section title="How it works">
        <div className="px-5 grid grid-cols-3 gap-3">
          {[
            ["ClipboardList", "Describe", "Tell us what you need"],
            ["Users", "Choose", "Pick a Tasker by price & reviews"],
            ["CheckCircle2", "Done", "Pay with MoMo when it's done"],
          ].map(([ic, t, s], i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-white dark:bg-night-2 p-3 text-center"
            >
              <div className="mx-auto w-10 h-10 rounded-full bg-brand/10 text-brand grid place-items-center">
                <Icon name={ic} size={18} />
              </div>
              <div className="font-extrabold text-sm mt-2">{t}</div>
              <div className="text-[10.5px] text-mute mt-0.5 leading-snug">{s}</div>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section title="Recently reviewed">
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-2">
          {taskers.slice(4, 10).map((t) => (
            <div key={t.id} className="w-[260px] shrink-0 rounded-3xl bg-white dark:bg-night-2 p-4">
              <Stars value={t.reviews[0].rating} />
              <p className="text-sm mt-2 line-clamp-2">"{t.reviews[0].text}"</p>
              <div className="flex items-center gap-2 mt-3">
                <Avatar person={t} size={26} />
                <span className="text-xs text-mute">
                  {t.reviews[0].name} on <b className="text-ink dark:text-white">{t.first}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Sheet open={areaOpen} onClose={() => setAreaOpen(false)} title="Choose your area">
        <div className="grid grid-cols-2 gap-2 mt-2">
          {neighborhoods.map((n) => (
            <Tap
              key={n}
              onClick={() => {
                saveProfile({ area: n });
                setAreaOpen(false);
              }}
              className={`h-12 rounded-2xl font-semibold text-sm flex items-center gap-2 px-3 ${user?.area === n ? "bg-brand text-white" : "bg-slate-100 dark:bg-night-3"}`}
            >
              <Icon name="MapPin" size={15} /> {n}
            </Tap>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
