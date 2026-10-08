import { icons as Icons } from "./icons";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useApp } from "../lib/store";
import { fmtLRD, fmtUSD } from "../lib/data";

export const spring = { type: "spring", stiffness: 420, damping: 34 };
export const softSpring = { type: "spring", stiffness: 260, damping: 26 };

export function Icon({ name, size = 20, ...props }) {
  const C = Icons[name] || Icons.Circle;
  return <C size={size} strokeWidth={2.2} {...props} />;
}

export function Tap({ as = "button", className = "", children, scale = 0.95, ...props }) {
  const C = motion[as];
  return (
    <C
      whileTap={{ scale }}
      transition={spring}
      className={`select-none cursor-pointer ${className}`}
      {...(as === "button" ? { type: "button" } : {})}
      {...props}
    >
      {children}
    </C>
  );
}

export function Button({ children, variant = "primary", className = "", icon, ...props }) {
  const styles = {
    primary: "bg-brand text-white shadow-[0_10px_30px_-10px_rgba(30,79,216,.8)]",
    dark: "bg-navy text-white dark:bg-white dark:text-navy",
    ghost: "bg-slate-100 text-ink dark:bg-night-3 dark:text-white",
    danger: "bg-flag/10 text-flag",
    outline: "border-2 border-slate-200 text-ink dark:border-night-3 dark:text-white",
  };
  return (
    <Tap
      className={`relative overflow-hidden h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 w-full disabled:opacity-40 disabled:pointer-events-none ${styles[variant]} ${className}`}
      {...props}
    >
      {variant === "primary" && <span className="absolute inset-0 shimmer pointer-events-none" />}
      {icon && <Icon name={icon} size={18} />}
      <span className="relative">{children}</span>
    </Tap>
  );
}

export function Avatar({ person, size = 48, ring = false, online }) {
  const [a, b] = person?.gradient || ["#4F8CFF", "#7B5CFF"];
  const initials = (person?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`w-full h-full rounded-full grid place-items-center font-extrabold text-white ${ring ? "ring-4 ring-white dark:ring-night" : ""}`}
        style={{ background: `linear-gradient(135deg, ${a}, ${b})`, fontSize: size * 0.36 }}
      >
        {initials}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-[28%] h-[28%] rounded-full bg-green-500 ring-2 ring-white dark:ring-night" />
      )}
    </div>
  );
}

export function Stars({ value = 5, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icons.Star key={i} size={size} className={i <= Math.round(value) ? "fill-gold text-gold" : "text-slate-300"} />
      ))}
    </div>
  );
}

export function Price({ usd, className = "", small = false }) {
  return (
    <span className={className}>
      <span className="font-extrabold">{fmtUSD(usd)}</span>
      <span className={`ml-1 text-mute font-medium ${small ? "text-[10px]" : "text-xs"}`}>≈ {fmtLRD(usd)}</span>
    </span>
  );
}

export function Header({ title, subtitle, right, transparent = false, onBack }) {
  const pop = useApp((s) => s.pop);
  return (
    <div className={`sticky top-0 z-20 px-4 pt-2 pb-3 flex items-center gap-3 ${transparent ? "" : "glass"}`}>
      <Tap
        onClick={onBack || pop}
        className="w-10 h-10 rounded-full grid place-items-center bg-white/90 dark:bg-night-3 shadow-sm text-ink dark:text-white"
        aria-label="Back"
      >
        <Icon name="ChevronLeft" size={22} />
      </Tap>
      <div className="flex-1 min-w-0">
        {title && <h1 className="font-extrabold text-[17px] truncate text-ink dark:text-white">{title}</h1>}
        {subtitle && <p className="text-xs text-mute truncate">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Chip({ active, children, onClick, icon }) {
  return (
    <Tap
      onClick={onClick}
      className={`relative h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap flex items-center gap-1.5 ${
        active ? "text-white" : "bg-white dark:bg-night-2 text-ink dark:text-slate-200 border border-slate-200 dark:border-night-3"
      }`}
    >
      {active && <motion.span layoutId={undefined} className="absolute inset-0 rounded-full bg-navy dark:bg-brand" />}
      {icon && <Icon name={icon} size={14} className="relative" />}
      <span className="relative">{children}</span>
    </Tap>
  );
}

export function CatTile({ cat, size = 56 }) {
  return (
    <div
      className="rounded-2xl grid place-items-center shrink-0"
      style={{ width: size, height: size, background: `${cat.color}1f`, color: cat.color }}
    >
      <Icon name={cat.icon} size={size * 0.45} />
    </div>
  );
}

export function Section({ title, action, onAction, children, className = "" }) {
  return (
    <section className={`mt-6 ${className}`}>
      <div className="px-5 mb-3 flex items-end justify-between">
        <h2 className="font-extrabold text-[17px] text-ink dark:text-white">{title}</h2>
        {action && (
          <button onClick={onAction} className="text-[13px] font-bold text-brand">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

// Draggable bottom sheet — drag down to dismiss.
export function Sheet({ open, onClose, children, title }) {
  const controls = useDragControls();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-40 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute left-0 right-0 bottom-0 z-50 rounded-t-[28px] bg-white dark:bg-night-2 max-h-[85%] flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={softSpring}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 100 || i.velocity.y > 500) && onClose()}
          >
            <div className="pt-3 pb-2 touch-none cursor-grab" onPointerDown={(e) => controls.start(e)}>
              <div className="mx-auto w-10 h-1.5 rounded-full bg-slate-300 dark:bg-night-3" />
              {title && <h3 className="text-center font-extrabold mt-3 text-ink dark:text-white">{title}</h3>}
            </div>
            <div className="scroll-y px-5 pb-8">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Toast() {
  const toast = useApp((s) => s.toast);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className="absolute top-14 left-4 right-4 z-[60] rounded-2xl bg-navy text-white px-4 py-3 flex items-center gap-3 shadow-2xl"
          initial={{ y: -80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -80, opacity: 0, scale: 0.9 }}
          transition={spring}
        >
          <div className={`w-8 h-8 rounded-full grid place-items-center ${toast.kind === "err" ? "bg-flag" : "bg-green-500"}`}>
            <Icon name={toast.kind === "err" ? "X" : "Check"} size={16} />
          </div>
          <p className="text-sm font-semibold">{toast.text}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Staggered list container helpers
export const listV = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
export const itemV = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: softSpring },
};

export function Empty({ icon, title, sub, action, onAction }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center px-10 py-16">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="w-20 h-20 rounded-3xl bg-brand/10 text-brand grid place-items-center mb-5"
      >
        <Icon name={icon} size={36} />
      </motion.div>
      <h3 className="font-extrabold text-lg text-ink dark:text-white">{title}</h3>
      <p className="text-sm text-mute mt-1">{sub}</p>
      {action && (
        <Button className="mt-6 !w-auto px-6 h-12" onClick={onAction}>
          {action}
        </Button>
      )}
    </motion.div>
  );
}
