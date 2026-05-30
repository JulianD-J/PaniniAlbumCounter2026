import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Trophy, Star, ShieldAlert, Sparkles, X, ChevronUp } from "lucide-react";

interface LevelUpCelebrationProps {
  isOpen: boolean;
  newLevel: number;
  onClose: () => void;
  isEs: boolean;
}

export const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({
  isOpen,
  newLevel,
  onClose,
  isEs,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Trigger native physical feedback
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});

      // Fire a cinematic multi-burst confetti storm!
      const duration = 2.5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Confetti from multiple angles
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          {/* Subtle surrounding light glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.15),transparent_60%)] pointer-events-none" />

          {/* Epic Celebration Modal Container */}
          <motion.div
            initial={{ scale: 0.9, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="w-full max-w-md bg-[#0F0F12] border-2 border-fifa-gold/40 shadow-[0_0_80px_rgba(212,175,55,0.22)] rounded-[2.5rem] p-8 text-center relative overflow-hidden flex flex-col items-center"
          >
            {/* Absolute Rotating Gold Sunburst Accent */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
              className="absolute -top-12 -left-12 w-48 h-48 bg-gradient-to-tr from-fifa-gold/10 to-transparent blur-[40px] rounded-full pointer-events-none"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
              className="absolute -bottom-12 -right-12 w-48 h-48 bg-gradient-to-tr from-fifa-gold/10 to-transparent blur-[40px] rounded-full pointer-events-none"
            />

            {/* Corner Decorative Dots */}
            <div className="absolute top-4 left-4 flex gap-1 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-fifa-gold/60" />
              <div className="w-1 h-1 rounded-full bg-fifa-gold/35" />
            </div>
            
            {/* Top Close Button */}
            <button
              onClick={() => {
                Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                onClose();
              }}
              className="absolute top-5 right-5 p-2 hover:bg-white/5 active:scale-95 bg-white/[0.02] border border-white/5 rounded-full text-gray-500 hover:text-white transition-all duration-200"
              id="lvl-up-close-btn"
            >
              <X size={16} />
            </button>

            {/* Big Award Trophy Shield Design */}
            <div className="relative mt-4 mb-6">
              {/* Pulsing ring */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute inset-[-12px] bg-fifa-gold/10 border border-fifa-gold/25 rounded-full blur-xs"
              />
              <div className="relative w-24 h-24 bg-gradient-to-br from-[#1d1b15] via-[#2d2206] to-[#0a0a0c] border-[3px] border-fifa-gold rounded-full flex items-center justify-center shadow-xl shadow-black/80">
                <Trophy className="text-fifa-gold w-12 h-12" />
                <motion.div
                  animate={{ y: [-4, 4, -4], rotate: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute top-1 right-2"
                >
                  <Sparkles size={18} className="text-yellow-400 fill-current animate-pulse" />
                </motion.div>
                <div className="absolute -bottom-2 bg-[#2d2206] border border-fifa-gold/80 px-2 py-0.5 rounded-md text-[8px] font-mono font-black text-fifa-gold tracking-widest text-center truncate max-w-[80px]">
                  STREAK UP
                </div>
              </div>
            </div>

            {/* Title text */}
            <span className="text-[10px] font-mono font-black text-fifa-gold uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
              <ChevronUp size={12} className="animate-bounce" />
              {isEs ? "¡AUMENTO DE NIVEL!" : "LEVEL ACHIEVED!"}
            </span>

            <h2 className="text-3xl font-display font-black text-white tracking-tight leading-none mb-3">
              {isEs ? "Nivel" : "Level"}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-fifa-gold to-yellow-500 font-extrabold pr-1">
                {newLevel}
              </span>
            </h2>

            <p className="text-sm text-gray-400 leading-relaxed max-w-[320px] mb-8">
              {isEs 
                ? "Tu racha diaria te impulsa a nuevas alturas. ¡Sigue abriendo la aplicación todos los días para multiplicar tus recompensas de XP!" 
                : "Your daily check-in streak pushes you to new heights. Keep active daily to maintain your XP multipliers!"}
            </p>

            {/* Multiplier / Stats banner */}
            <div className="w-full bg-[#141419] border border-white/5 rounded-2xl p-4 mb-8 flex items-center justify-around">
              <div className="text-center">
                <span className="text-[9px] uppercase font-mono font-bold text-gray-500 block mb-1">
                  {isEs ? "RECOMINZA HOY" : "CHECK-IN XP"}
                </span>
                <span className="text-sm font-display font-black text-fifa-gold">
                  +100% BOOST
                </span>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="text-center">
                <span className="text-[9px] uppercase font-mono font-bold text-gray-500 block mb-1">
                  {isEs ? "MEDALLA RANGER" : "RUNE BADGE"}
                </span>
                <span className="text-sm font-display font-black text-white flex items-center justify-center gap-1">
                  <Star fill="currentColor" size={12} className="text-fifa-gold shrink-0" />
                  PRO ACTIVE
                </span>
              </div>
            </div>

            {/* Giant Gold Button to close */}
            <button
              onClick={() => {
                Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                onClose();
              }}
              className="w-full py-4 bg-gradient-to-r from-fifa-gold to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 text-black font-black uppercase tracking-wider rounded-2xl shadow-[0_4px_25px_rgba(212,175,55,0.25)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 text-xs"
              id="lvl-up-celebrate-btn"
            >
              {isEs ? "¡A reclamar más láminas!" : "Claim More Stickers!"}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
