import { useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Avatar, CatTile, Empty, Icon, Tap } from "../components/ui";
import { useApp, catById, taskerById } from "../lib/store";
import { fmtLRD, fmtUSD } from "../lib/data";

const badge = {
  confirmed: ["Confirmed", "bg-brand/10 text-brand"],
  on_the_way: ["On the way", "bg-gold/15 text-amber-600"],
  in_progress: ["In progress", "bg-purple-500/10 text-purple-600"],
  completed: ["Completed", "bg-green-500/10 text-green-600"],
  cancelled: ["Cancelled", "bg-flag/10 text-flag"],
};

function Segmented({ value, onChange, options }) {
  return (
    <div className="mx-5 p-1 rounded-2xl bg-slate-200/70 dark:bg-night-2 flex">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className="relative flex-1 h-10 text-sm font-bold">
          {value === o && <motion.div layoutId="seg" className="absolute inset-0 rounded-xl bg-white dark:bg-night-3 shadow" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
          <span className={`relative ${value === o ? "" : "text-mute"}`}>{o}</span>
        </button>
      ))}
    </div>
  );
}

function ClientTasks() {
  const { bookings, push, setTab } = useApp();
  const [seg, setSeg] = useState("Active");
  const list = bookings.filter((b) => (seg === "Active" ? !["completed", "cancelled"].includes(b.status) : ["completed", "cancelled"].includes(b.status)));
  return (
    <>
      <Segmented value={seg} onChange={setSeg} options={["Active", "Past"]} />
      <div className="px-5 mt-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {list.length === 0 ? (
            <Empty
              key="empty"
              icon="ClipboardList"
              title={seg === "Active" ? "No active tasks" : "No past tasks yet"}
              sub="Book a trusted Tasker in minutes — they'll show up here."
              action="Book a task"
              onAction={() => setTab("home")}
            />
          ) : (
            list.map((b, i) => {
              const t = taskerById(b.taskerId);
              const [label, cls] = badge[b.status];
              return (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Tap as="div" scale={0.98} onClick={() => push("booking", { id: b.id })} className="rounded-3xl bg-white dark:bg-night-2 p-4">
                    <div className="flex items-center gap-3">
                      <CatTile cat={catById(b.categoryId)} size={46} />
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold truncate">{b.categoryName}</div>
                        <div className="text-xs text-mute">{b.date} · {b.slot.split(" · ")[0]}</div>
                      </div>
                      <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-night-3 flex items-center gap-2">
                      <Avatar person={t} size={26} />
                      <span className="text-sm font-semibold flex-1">{t.name}</span>
                      <span className="font-extrabold text-sm">{fmtUSD(b.total)}</span>
                    </div>
                  </Tap>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function JobCard({ job, onAccept, onDecline }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const acceptO = useTransform(x, [20, 120], [0, 1]);
  const declineO = useTransform(x, [-120, -20], [1, 0]);
  const cat = catById(job.cat);
  return (
    <motion.div
      layout
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={(_, i) => {
        if (i.offset.x > 120) onAccept();
        else if (i.offset.x < -120) onDecline();
      }}
      exit={{ x: x.get() >= 0 ? 400 : -400, opacity: 0, transition: { duration: 0.3 } }}
      className="relative rounded-3xl bg-white dark:bg-night-2 p-4 cursor-grab active:cursor-grabbing touch-pan-y shadow-[0_8px_30px_-16px_rgba(15,23,42,.3)]"
    >
      <motion.div style={{ opacity: acceptO }} className="absolute top-4 right-4 px-3 py-1 rounded-lg border-2 border-green-500 text-green-500 font-black text-sm rotate-12">ACCEPT</motion.div>
      <motion.div style={{ opacity: declineO }} className="absolute top-4 right-4 px-3 py-1 rounded-lg border-2 border-flag text-flag font-black text-sm -rotate-12">PASS</motion.div>
      <div className="flex items-center gap-3">
        <CatTile cat={cat} size={48} />
        <div>
          <div className="font-extrabold">{cat.name}</div>
          <div className="text-xs text-mute">{job.client} · {job.dist} km away</div>
        </div>
      </div>
      <div className="mt-3 text-sm space-y-1.5">
        <p className="flex gap-2"><Icon name="MapPin" size={16} className="text-brand" /> {job.area}</p>
        <p className="flex gap-2"><Icon name="Clock" size={16} className="text-brand" /> {job.when}</p>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div>
          <div className="text-xl font-extrabold text-green-600">{fmtUSD(job.pay)}</div>
          <div className="text-[11px] text-mute">≈ {fmtLRD(job.pay)} est. earnings</div>
        </div>
        <div className="flex gap-2">
          <Tap onClick={onDecline} className="w-12 h-12 rounded-full bg-flag/10 text-flag grid place-items-center"><Icon name="X" /></Tap>
          <Tap onClick={onAccept} className="w-12 h-12 rounded-full bg-green-500 text-white grid place-items-center"><Icon name="Check" /></Tap>
        </div>
      </div>
    </motion.div>
  );
}

function TaskerJobs() {
  const { jobs, respondJob, notify } = useApp();
  const jobRequests = jobs.filter((j) => j.status === "open");
  const acceptedJobs = jobs.filter((j) => ["accepted", "completed"].includes(j.status));
  const [seg, setSeg] = useState("Requests");
  return (
    <>
      <Segmented value={seg} onChange={setSeg} options={["Requests", "Scheduled"]} />
      <div className="px-5 mt-4 space-y-3">
        {seg === "Requests" && jobRequests.length > 0 && <p className="text-xs text-mute text-center">Swipe right to accept, left to pass</p>}
        <AnimatePresence mode="popLayout">
          {seg === "Requests" ? (
            jobRequests.length === 0 ? (
              <Empty key="e" icon="Briefcase" title="You're all caught up" sub="New job requests near you will appear here." />
            ) : (
              jobRequests.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  onAccept={async () => (await respondJob(j.id, "accept")) && notify(`Job accepted — ${fmtUSD(j.pay)} added to schedule`)}
                  onDecline={() => respondJob(j.id, "decline")}
                />
              ))
            )
          ) : acceptedJobs.length === 0 ? (
            <Empty key="e2" icon="Calendar" title="No scheduled jobs" sub="Accept requests to fill your schedule." />
          ) : (
            acceptedJobs.map((j) => (
              <motion.div key={j.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white dark:bg-night-2 p-4 flex items-center gap-3">
                <CatTile cat={catById(j.cat)} size={44} />
                <div className="flex-1">
                  <div className="font-bold">{catById(j.cat).name}</div>
                  <div className="text-xs text-mute">{j.when} · {j.area}</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-green-600">{fmtUSD(j.pay)}</div>
                  {j.status === "accepted" ? (
                    <Tap onClick={() => respondJob(j.id, "complete")} className="mt-1 text-[11px] font-bold text-white bg-brand rounded-full px-2.5 py-1">
                      Mark done
                    </Tap>
                  ) : (
                    <span className="text-[11px] font-bold text-green-600">Completed</span>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default function Tasks() {
  const mode = useApp((s) => s.mode);
  return (
    <div className="h-full scroll-y pb-32" style={{ paddingTop: "calc(var(--top) + 8px)" }}>
      <h1 className="px-5 text-[28px] font-extrabold mb-4">{mode === "tasker" ? "Jobs" : "My Tasks"}</h1>
      {mode === "tasker" ? <TaskerJobs /> : <ClientTasks />}
    </div>
  );
}
