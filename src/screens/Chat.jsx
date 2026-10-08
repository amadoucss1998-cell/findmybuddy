import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, Icon, Tap } from "../components/ui";
import { useApp, taskerById } from "../lib/store";

const quick = ["Are you on your way?", "Please call when you reach", "How much for materials?", "Thank you! 🙏"];

export default function Chat({ id }) {
  const t = taskerById(id);
  const { chats, sendMessage, pop, notify, typing: typingMap, markThreadRead } = useApp();
  const msgs = chats[id] || [];
  const typing = !!typingMap[id];
  const [text, setText] = useState("");
  const end = useRef(null);
  const unread = msgs.some((m) => m.from === "them" && !m.read);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length, typing]);

  useEffect(() => {
    if (unread) markThreadRead(id);
  }, [unread, id, markThreadRead]);

  const send = (v = text) => {
    if (!v.trim()) return;
    sendMessage(id, v.trim());
    setText("");
  };

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: "var(--top)" }}>
      <div className="glass px-4 pt-2 pb-3 flex items-center gap-3 border-b border-slate-200/60 dark:border-night-3">
        <Tap onClick={pop} className="w-10 h-10 rounded-full grid place-items-center bg-white dark:bg-night-3">
          <Icon name="ChevronLeft" size={22} />
        </Tap>
        <Avatar person={t} size={40} online={t.online} />
        <div className="flex-1 min-w-0">
          <div className="font-extrabold truncate">{t.name}</div>
          <div className="text-[11px] text-green-600 font-semibold">{typing ? "typing…" : t.online ? "Online" : `Replies in ~${t.responseMins} min`}</div>
        </div>
        <Tap onClick={() => notify(`Calling ${t.first}…`)} className="w-10 h-10 rounded-full grid place-items-center bg-brand/10 text-brand">
          <Icon name="Phone" size={18} />
        </Tap>
        <Tap onClick={() => notify("Video calls coming soon")} className="w-10 h-10 rounded-full grid place-items-center bg-brand/10 text-brand">
          <Icon name="Video" size={18} />
        </Tap>
      </div>
      <div className="flex-1 scroll-y px-4 py-4 space-y-2">
        <div className="mx-auto w-fit text-[11px] font-semibold text-mute bg-white dark:bg-night-2 px-3 py-1 rounded-full flex items-center gap-1.5">
          <Icon name="Lock" size={11} /> Keep payments in-app for LoneStar protection
        </div>
        {msgs.length === 0 && (
          <div className="text-center text-sm text-mute pt-10">
            Say hello to {t.first} 👋
            <br />
            Ask questions before or after booking.
          </div>
        )}
        <AnimatePresence initial={false}>
          {msgs.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
              style={{ transformOrigin: m.from === "me" ? "bottom right" : "bottom left" }}
            >
              <div
                className={`max-w-[78%] px-4 py-2.5 text-[14px] rounded-3xl ${
                  m.from === "me" ? "bg-brand text-white rounded-br-md" : "bg-white dark:bg-night-2 rounded-bl-md"
                }`}
              >
                {m.text}
                <div className={`text-[10px] mt-1 text-right ${m.from === "me" ? "text-white/60" : "text-mute"}`}>
                  {new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  {m.from === "me" && " ✓✓"}
                </div>
              </div>
            </motion.div>
          ))}
          {typing && (
            <motion.div key="typing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex">
              <div className="bg-white dark:bg-night-2 rounded-3xl rounded-bl-md px-4 py-3 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="w-2 h-2 rounded-full bg-slate-400" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={end} />
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2">
        {quick.map((q) => (
          <Tap key={q} onClick={() => send(q)} className="h-8 px-3 rounded-full bg-white dark:bg-night-2 text-xs font-semibold whitespace-nowrap border border-slate-200 dark:border-night-3">
            {q}
          </Tap>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="px-4 pb-8 pt-2 flex items-center gap-2"
      >
        <Tap className="w-11 h-11 rounded-full bg-white dark:bg-night-2 grid place-items-center text-mute" onClick={() => notify("Photo sharing coming soon")}>
          <Icon name="Plus" />
        </Tap>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="flex-1 h-11 px-4 rounded-full bg-white dark:bg-night-2 outline-none text-sm font-medium"
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.85 }}
          animate={{ scale: text ? 1 : 0.9, rotate: text ? 0 : -20 }}
          className={`w-11 h-11 rounded-full grid place-items-center ${text ? "bg-brand text-white" : "bg-slate-200 dark:bg-night-3 text-mute"}`}
          aria-label="Send"
        >
          {text ? <Icon name="Send" size={18} /> : <Icon name="Mic" size={18} />}
        </motion.button>
      </form>
    </div>
  );
}
