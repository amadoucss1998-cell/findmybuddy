import { useEffect } from "react";
import { motion } from "framer-motion";
import { Empty, Header, Icon, itemV, listV } from "../components/ui";
import { useApp } from "../lib/store";

const kinds = {
  booking: ["CheckCircle2", "#1E4FD8"],
  chat: ["MessageCircle", "#22C55E"],
  promo: ["Gift", "#FF4D5E"],
};

export default function Notifications() {
  const { notifs, readNotifs } = useApp();
  useEffect(() => {
    const t = setTimeout(readNotifs, 1200);
    return () => clearTimeout(t);
  }, [readNotifs]);
  return (
    <div className="h-full flex flex-col" style={{ paddingTop: "var(--top)" }}>
      <Header title="Notifications" />
      <div className="flex-1 scroll-y px-5 pb-10">
        {notifs.length === 0 ? (
          <Empty icon="Bell" title="Nothing yet" sub="Updates about your tasks will show here." />
        ) : (
          <motion.div variants={listV} initial="hidden" animate="show" className="space-y-2">
            {notifs.map((n) => {
              const [ic, c] = kinds[n.kind] || kinds.promo;
              return (
                <motion.div key={n.id} variants={itemV} className={`rounded-2xl p-4 flex gap-3 ${n.read ? "bg-white dark:bg-night-2" : "bg-brand/5 border border-brand/20"}`}>
                  <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: `${c}18`, color: c }}>
                    <Icon name={ic} size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{n.text}</p>
                    <p className="text-[11px] text-mute mt-0.5">{new Date(n.at).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                  {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-brand mt-1.5" />}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
