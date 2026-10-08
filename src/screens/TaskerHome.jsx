import { motion } from "framer-motion";
import { Hero3D } from "../components/three";
import { CatTile, Icon, Tap } from "../components/ui";
import { useApp, catById } from "../lib/store";
import { fmtLRD, fmtUSD } from "../lib/data";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TaskerHome() {
  const { user, taskerOnline, update, earnings, jobRequests, acceptedJobs, setTab, notify } = useApp();
  const week = earnings.reduce((a, b) => a + b, 0);
  const max = Math.max(...earnings);

  return (
    <div className="h-full scroll-y pb-32">
      <div className="relative bg-gradient-to-br from-[#0d3b2e] via-navy to-[#050b1f] text-white rounded-b-[36px] px-5 pb-6 overflow-hidden" style={{ paddingTop: "calc(var(--top) + 6px)" }}>
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="text-xs text-white/60 font-semibold">Tasker dashboard</div>
            <div className="font-extrabold text-xl">Hi, {user?.name?.split(" ")[0]} 💪</div>
          </div>
          <Tap
            onClick={() => {
              update({ taskerOnline: !taskerOnline });
              notify(taskerOnline ? "You're offline — no new requests" : "You're online — requests incoming!");
            }}
            className={`h-10 pl-2 pr-4 rounded-full flex items-center gap-2 font-bold text-sm ${taskerOnline ? "bg-green-500" : "bg-white/15"}`}
          >
            <motion.span
              className="w-6 h-6 rounded-full bg-white grid place-items-center"
              animate={{ scale: taskerOnline ? [1, 1.15, 1] : 1 }}
              transition={{ repeat: taskerOnline ? Infinity : 0, duration: 1.5 }}
            >
              <Icon name="Power" size={13} className={taskerOnline ? "text-green-600" : "text-slate-500"} />
            </motion.span>
            {taskerOnline ? "Online" : "Offline"}
          </Tap>
        </div>
        <div className="relative flex items-center mt-2">
          <div className="flex-1 z-10">
            <div className="text-xs text-white/60 font-semibold">Earned this week</div>
            <motion.div key={week} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-[40px] font-extrabold leading-none mt-1">
              {fmtUSD(week)}
            </motion.div>
            <div className="text-sm text-white/60 mt-1">≈ {fmtLRD(week)}</div>
            <Tap onClick={() => notify("Cash-out sent to Orange Money 077•••4821")} className="mt-4 h-10 px-4 rounded-full bg-white text-navy font-extrabold text-sm inline-flex items-center gap-2">
              <Icon name="Banknote" size={16} /> Cash out
            </Tap>
          </div>
          <div className="absolute -right-6 -top-4 w-44">
            <Hero3D variant="coins" height={170} sparkle="#FFD66B" />
          </div>
        </div>
      </div>

      <div className="mx-5 mt-5 rounded-3xl bg-white dark:bg-night-2 p-5">
        <div className="flex justify-between items-center">
          <h2 className="font-extrabold">Weekly earnings</h2>
          <span className="text-xs font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded-full">▲ 18% vs last week</span>
        </div>
        <div className="flex items-end gap-2.5 h-36 mt-4">
          {earnings.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] font-bold text-mute">${v}</span>
              <motion.div
                className={`w-full rounded-xl ${i === 5 ? "bg-gradient-to-t from-brand to-brand-2" : "bg-brand/20"}`}
                initial={{ height: 0 }}
                animate={{ height: `${(v / max) * 100}%` }}
                transition={{ delay: 0.2 + i * 0.06, type: "spring", stiffness: 120, damping: 14 }}
              />
              <span className="text-[10px] font-bold text-mute">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-5 mt-4 grid grid-cols-3 gap-3">
        {[
          ["Star", "4.9", "Rating", "#FFB020"],
          ["CheckCircle2", "96%", "Acceptance", "#22C55E"],
          ["Flame", "12", "Day streak", "#FF4D5E"],
        ].map(([ic, v, l, c], i) => (
          <motion.div key={l} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.08 }} className="rounded-2xl bg-white dark:bg-night-2 p-3 text-center">
            <Icon name={ic} size={20} style={{ color: c }} className="mx-auto" />
            <div className="font-extrabold text-lg mt-1">{v}</div>
            <div className="text-[11px] text-mute font-semibold">{l}</div>
          </motion.div>
        ))}
      </div>

      <div className="mx-5 mt-5 flex justify-between items-end">
        <h2 className="font-extrabold text-lg">New requests</h2>
        <button onClick={() => setTab("tasks")} className="text-sm font-bold text-brand">
          See all ({jobRequests.length})
        </button>
      </div>
      <div className="mx-5 mt-3 space-y-3">
        {jobRequests.slice(0, 2).map((j, i) => (
          <motion.div key={j.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}>
            <Tap as="div" scale={0.98} onClick={() => setTab("tasks")} className="rounded-3xl bg-white dark:bg-night-2 p-4 flex items-center gap-3">
              <CatTile cat={catById(j.cat)} size={46} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{catById(j.cat).name}</div>
                <div className="text-xs text-mute truncate">{j.area} · {j.when}</div>
              </div>
              <div className="font-extrabold text-green-600">{fmtUSD(j.pay)}</div>
            </Tap>
          </motion.div>
        ))}
        {jobRequests.length === 0 && <p className="text-sm text-mute">No pending requests. Stay online to get more!</p>}
      </div>

      <div className="mx-5 mt-5 rounded-3xl p-5 bg-gradient-to-br from-brand/10 to-transparent">
        <h3 className="font-extrabold">Upcoming: {acceptedJobs.length} scheduled job{acceptedJobs.length === 1 ? "" : "s"}</h3>
        <p className="text-xs text-mute mt-1">Tip: Taskers who reply within 10 minutes get 3× more bookings.</p>
      </div>
    </div>
  );
}
