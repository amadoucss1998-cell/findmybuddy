import { motion } from "framer-motion";
import { Avatar, Empty, Icon, Tap, itemV, listV } from "../components/ui";
import { useApp, taskerById } from "../lib/store";

function ago(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

export default function Messages() {
  const { chats, push, setTab, favorites } = useApp();
  const threads = Object.entries(chats)
    .filter(([id, m]) => m.length && taskerById(id))
    .sort((a, b) => b[1].at(-1).at - a[1].at(-1).at);
  const favs = favorites.map(taskerById).filter(Boolean);

  return (
    <div className="h-full scroll-y pb-32" style={{ paddingTop: "calc(var(--top) + 8px)" }}>
      <h1 className="px-5 text-[28px] font-extrabold">Inbox</h1>
      <div className="mx-5 mt-4 h-12 rounded-2xl bg-white dark:bg-night-2 flex items-center gap-2 px-4 text-mute">
        <Icon name="Search" size={18} />
        <span className="text-sm">Search messages</span>
      </div>

      {favs.length > 0 && (
        <div className="mt-5">
          <h2 className="px-5 text-xs font-extrabold text-mute uppercase tracking-wider mb-2">Favourite Taskers</h2>
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-5">
            {favs.map((t) => (
              <Tap key={t.id} onClick={() => push("chat", { id: t.id })} className="flex flex-col items-center gap-1 w-16">
                <Avatar person={t} size={56} online={t.online} />
                <span className="text-[11px] font-semibold truncate w-full text-center">{t.first}</span>
              </Tap>
            ))}
          </div>
        </div>
      )}

      {threads.length === 0 ? (
        <Empty icon="MessageCircle" title="No messages yet" sub="Chat with Taskers about your task before or after booking." action="Find a Tasker" onAction={() => setTab("home")} />
      ) : (
        <motion.div variants={listV} initial="hidden" animate="show" className="mt-5 px-3">
          {threads.map(([id, msgs]) => {
            const t = taskerById(id);
            const last = msgs.at(-1);
            const unread = msgs.some((m) => m.from === "them" && !m.read);
            return (
              <motion.div key={id} variants={itemV}>
                <Tap as="div" scale={0.98} onClick={() => push("chat", { id })} className="flex items-center gap-3 p-3 rounded-2xl active:bg-white dark:active:bg-night-2">
                  <Avatar person={t} size={54} online={t.online} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="font-extrabold">{t.name}</span>
                      <span className={`text-xs ${unread ? "text-brand font-bold" : "text-mute"}`}>{ago(last.at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate flex-1 ${unread ? "font-semibold" : "text-mute"}`}>
                        {last.from === "me" && "You: "}
                        {last.text}
                      </p>
                      {unread && <span className="w-2.5 h-2.5 rounded-full bg-brand shrink-0" />}
                    </div>
                  </div>
                </Tap>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
