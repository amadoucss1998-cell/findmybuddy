import { useEffect } from "react";
import { motion } from "framer-motion";
import { Hero3D } from "../components/three";

export default function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-navy-2 via-navy to-[#050b1f] text-white overflow-hidden"
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-72 h-72 rounded-full border border-white/10"
          initial={{ scale: 0.3, opacity: 0.8 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.85, ease: "easeOut" }}
        />
      ))}
      <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 140, damping: 14 }}>
        <Hero3D variant="star" height={240} className="w-72" sparkle="#FFD66B" />
      </motion.div>
      <motion.h1
        className="text-4xl font-extrabold tracking-tight -mt-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        LoneStar<span className="text-flag">.</span>
      </motion.h1>
      <motion.p className="text-slate-300 mt-2 font-medium" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        Trusted help, right in your community
      </motion.p>
      <motion.div className="absolute bottom-16 w-32 h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-brand-2 to-flag" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.4, ease: "easeInOut" }} />
      </motion.div>
    </motion.div>
  );
}
