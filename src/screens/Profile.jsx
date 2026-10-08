import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar, Button, Icon, Sheet, Tap } from "../components/ui";
import { useApp } from "../lib/store";
import { fmtUSD } from "../lib/data";

function Toggle({ on }) {
  return (
    <div className={`w-12 h-7 rounded-full p-1 flex ${on ? "bg-brand justify-end" : "bg-slate-300 dark:bg-night-3 justify-start"}`}>
      <motion.div layout transition={{ type: "spring", stiffness: 600, damping: 32 }} className="w-5 h-5 rounded-full bg-white shadow" />
    </div>
  );
}

function Row({ icon, label, sub, onClick, right, color = "#1E4FD8" }) {
  return (
    <Tap as="div" scale={0.98} onClick={onClick} className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: `${color}18`, color }}>
        <Icon name={icon} size={19} />
      </div>
      <div className="flex-1">
        <div className="font-bold text-[14.5px]">{label}</div>
        {sub && <div className="text-xs text-mute">{sub}</div>}
      </div>
      {right ?? <Icon name="ChevronRight" size={18} className="text-mute" />}
    </Tap>
  );
}

export default function Profile() {
  const { user, mode, dark, update, logout, push, wallet, bookings, notify, setTab } = useApp();
  const [confirmOut, setConfirmOut] = useState(false);
  const done = bookings.filter((b) => b.status === "completed").length;

  const switchMode = () => {
    const next = mode === "tasker" ? "client" : "tasker";
    update({ mode: next, tab: "home", stack: [] });
    notify(next === "tasker" ? "Switched to Tasker mode" : "Switched to Client mode");
  };

  return (
    <div className="h-full scroll-y pb-32" style={{ paddingTop: "calc(var(--top) + 8px)" }}>
      <h1 className="px-5 text-[28px] font-extrabold">Account</h1>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-5 mt-4 rounded-3xl p-5 text-white relative overflow-hidden bg-gradient-to-br from-brand to-navy">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <Avatar person={{ name: user?.name, gradient: ["#FFB020", "#FF4D5E"] }} size={64} ring />
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-xl truncate">{user?.name}</div>
            <div className="text-sm text-white/70">{user?.phone}</div>
            <div className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
              <Icon name="MapPin" size={12} /> {user?.area}
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-3 mt-5 text-center">
          {[[bookings.length, "Bookings"], [done, "Completed"], [fmtUSD(wallet), "Credit"]].map(([v, l]) => (
            <div key={l}>
              <div className="font-extrabold text-lg">{v}</div>
              <div className="text-[11px] text-white/70">{l}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <Tap as="div" scale={0.98} onClick={switchMode} className="mx-5 mt-4 rounded-3xl p-4 bg-gradient-to-r from-gold/20 to-flag/10 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gold text-white grid place-items-center">
          <Icon name={mode === "tasker" ? "Users" : "Briefcase"} />
        </div>
        <div className="flex-1">
          <div className="font-extrabold">{mode === "tasker" ? "Switch to booking help" : "Become a Tasker"}</div>
          <div className="text-xs text-mute">{mode === "tasker" ? "Hire Taskers for your own to-dos" : "Earn on your schedule — up to $600/month"}</div>
        </div>
        <Icon name="ArrowRight" className="text-gold" />
      </Tap>

      <div className="mx-5 mt-4 rounded-3xl bg-white dark:bg-night-2 divide-y divide-slate-100 dark:divide-night-3 overflow-hidden">
        <Row icon="Wallet" label="Wallet & payments" sub="Orange Money, MoMo, cards" onClick={() => push("wallet")} />
        <Row icon="Heart" label="Favourite Taskers" color="#FF4D5E" onClick={() => setTab("messages")} />
        <Row icon="Gift" label="Invite friends, get $10" sub="Share code LONESTAR-10" color="#22C55E" onClick={() => notify("Invite link copied!")} />
        <Row icon="Bell" label="Notifications" color="#F59E0B" onClick={() => push("notifications")} />
      </div>

      <div className="mx-5 mt-4 rounded-3xl bg-white dark:bg-night-2 divide-y divide-slate-100 dark:divide-night-3 overflow-hidden">
        <Row icon={dark ? "Moon" : "Sun"} label="Dark mode" color="#6366F1" onClick={() => update({ dark: !dark })} right={<Toggle on={dark} />} />
        <Row icon="Globe" label="Language" sub="English (Liberia)" color="#06B6D4" onClick={() => notify("More languages coming soon")} />
        <Row icon="Shield" label="Safety centre" sub="Emergency: call 911 · LNP hotline" color="#EF4444" onClick={() => notify("Safety centre opened")} />
        <Row icon="HelpCircle" label="Help & support" sub="WhatsApp us 24/7" color="#64748B" onClick={() => notify("Support will reach you shortly")} />
      </div>

      <div className="mx-5 mt-4">
        <Button variant="danger" icon="LogOut" onClick={() => setConfirmOut(true)}>
          Log out
        </Button>
        <p className="text-center text-[11px] text-mute mt-4">LoneStar Tasks v1.0 · Made with ❤️ in Monrovia 🇱🇷</p>
      </div>

      <Sheet open={confirmOut} onClose={() => setConfirmOut(false)} title="Log out?">
        <p className="text-center text-sm text-mute">You'll need your phone number to sign back in.</p>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button variant="ghost" onClick={() => setConfirmOut(false)}>
            Cancel
          </Button>
          <Button variant="primary" className="!bg-flag" onClick={logout}>
            Log out
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
