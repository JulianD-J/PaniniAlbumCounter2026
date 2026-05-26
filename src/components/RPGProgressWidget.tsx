import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, Sparkles, Medal, Lock, Shield, Award, Zap, 
  Star, Activity, TrendingUp, PlusCircle, Repeat, Globe, 
  Diamond, ShieldCheck, CheckCircle2 
} from "lucide-react";

// Map achievement IDs to their corresponding Lucide Icons to prevent runtime reference issues
const iconMap: Record<string, React.ComponentType<any>> = {
  kickoff: Star,
  collector: Activity,
  halfway: TrendingUp,
  teamplayer: Medal,
  doubletrouble: PlusCircle,
  trademaster: Repeat,
  specialist: Trophy,
  cokeaddict: Star,
  continental: Globe,
  firstclass: Diamond,
  legend: ShieldCheck,
  perfectionist: CheckCircle2,
};

interface RPGProgressWidgetProps {
  obtained: number;
  total: number;
  repeated: number;
  isEs: boolean;
  achievements: Array<{
    id: string;
    title: string;
    desc: string;
    unlocked: boolean;
    progress: string;
    color: string;
  }>;
  onScrollToMilestones?: () => void;
}

export const RPGProgressWidget: React.FC<RPGProgressWidgetProps> = ({
  obtained,
  total,
  repeated,
  isEs,
  achievements,
  onScrollToMilestones
}) => {
  const missing = Math.max(0, total - obtained);
  const percentage = Math.min(100, Math.round((obtained / total) * 100)) || 0;
  const unlockedCount = useMemo(() => achievements.filter(a => a.unlocked).length, [achievements]);

  // Daily XP states
  const [dailyXp, setDailyXp] = useState(0);
  const [bonusLevels, setBonusLevels] = useState(0);
  const [notification, setNotification] = useState<{ text: string; bg: string } | null>(null);

  useEffect(() => {
    const storageKeyXp = "colecollect_daily_xp_v1";
    const storageKeyDate = "colecollect_last_login_date_v1";
    const storageKeyBonus = "colecollect_bonus_levels_v1";

    const savedXp = parseInt(localStorage.getItem(storageKeyXp) || "0", 10);
    const savedBonus = parseInt(localStorage.getItem(storageKeyBonus) || "0", 10);
    const savedDate = localStorage.getItem(storageKeyDate) || "";

    setDailyXp(savedXp);
    setBonusLevels(savedBonus);

    // Track login on subsequent days
    const todayDate = new Date().toLocaleDateString();

    if (savedDate !== todayDate) {
      const xpReward = 20;
      const nextXpTotal = savedXp + xpReward;
      let levelUp = false;
      let newBonus = savedBonus;
      let finalXp = nextXpTotal;

      if (nextXpTotal >= 100) {
        levelUp = true;
        newBonus = savedBonus + 1;
        finalXp = nextXpTotal % 100;
      }

      localStorage.setItem(storageKeyXp, finalXp.toString());
      localStorage.setItem(storageKeyBonus, newBonus.toString());
      localStorage.setItem(storageKeyDate, todayDate);

      setDailyXp(finalXp);
      setBonusLevels(newBonus);

      // Show beautiful daily check-in celebration toast
      setTimeout(() => {
        if (levelUp) {
          setNotification({
            text: isEs 
              ? `¡SUBIDA DE NIVEL! +${xpReward} XP Recompensa Diaria (Nivel Extra +1)` 
              : `LEVEL UP! +${xpReward} XP Daily Bonus (Extra Level +1)`,
            bg: "from-amber-600 via-yellow-500 to-amber-500 text-black border-yellow-300/40"
          });
        } else {
          setNotification({
            text: isEs 
              ? `¡Recompensa Diaria! +${xpReward} XP por abrir la app hoy (${finalXp}/100 XP)` 
              : `Daily Login Bonus! +${xpReward} XP claimed successfully (${finalXp}/100 XP)`,
            bg: "from-fifa-gold/20 via-[#1e1402] to-black text-fifa-gold border-fifa-gold/30"
          });
        }

        // Auto-dismiss in 6 seconds
        setTimeout(() => {
          setNotification(null);
        }, 6000);
      }, 800);
    }
  }, [isEs]);

  // RPG Rank Calculation
  const rankInfo = useMemo(() => {
    const baseLevel = (() => {
      if (percentage === 100) return 99;
      if (percentage >= 90) return 80;
      if (percentage >= 70) return 65;
      if (percentage >= 45) return 42;
      if (percentage >= 20) return 18;
      return 1;
    })();

    const finalLevel = baseLevel + bonusLevels;

    if (percentage === 100) {
      return {
        title: isEs ? "Héroe Legendario" : "Legendary Hero",
        level: finalLevel,
        color: "from-yellow-400 via-amber-500 to-red-500 text-yellow-400",
        bgGlow: "shadow-yellow-500/20 border-yellow-500/40",
        motto: isEs ? "¡Has alcanzado la gloria eterna del coleccionista!" : "You have attained physical sticker immortality!"
      };
    }
    if (percentage >= 90) {
      return {
        title: isEs ? "Mítico del Álbum" : "Album Mythical",
        level: finalLevel,
        color: "from-purple-400 via-pink-500 to-amber-500 text-purple-300",
        bgGlow: "shadow-purple-500/20 border-purple-500/30",
        motto: isEs ? "La meta brilla en el horizonte celestial" : "The finish line shines on the celestial horizon"
      };
    }
    if (percentage >= 70) {
      return {
        title: isEs ? "Coleccionista Campeón" : "Champion Collector",
        level: finalLevel,
        color: "from-emerald-400 to-teal-500 text-emerald-300",
        bgGlow: "shadow-emerald-500/10 border-emerald-500/30",
        motto: isEs ? "Tus rivales tiemblan ante tu impecable vitrina" : "Your rivals tremble in front of your showcase"
      };
    }
    if (percentage >= 45) {
      return {
        title: isEs ? "Veterano del Intercambio" : "Swap Veteran",
        level: finalLevel,
        color: "from-blue-400 to-indigo-500 text-blue-300",
        bgGlow: "shadow-blue-500/10 border-blue-500/20",
        motto: isEs ? "Las repetidas son tu mejor arma de negociación" : "Repeats are your ultimate currency in negotiations"
      };
    }
    if (percentage >= 20) {
      return {
        title: isEs ? "Cazador de Estampas" : "Sticker Huntsman",
        level: finalLevel,
        color: "from-cyan-400 to-blue-500 text-cyan-300",
        bgGlow: "shadow-cyan-500/10 border-cyan-500/20",
        motto: isEs ? "Expandiendo tus fronteras sobre por sobre" : "Expanding your borders envelope by envelope"
      };
    }
    return {
      title: isEs ? "Recluta del Álbum" : "Album Recruit",
      level: finalLevel,
      color: "from-gray-400 to-slate-500 text-gray-300",
      bgGlow: "shadow-gray-500/5 border-white/5",
      motto: isEs ? "Comienza tu épico camino hacia la copa" : "Begin your epic journey towards the golden cup"
    };
  }, [percentage, isEs, bonusLevels]);

  // Split standard RPG bar into chunks/segments to look high tech and gamer-like
  const segments = Array.from({ length: 10 });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden bg-gradient-to-br from-[#121216] via-[#16161c] to-[#0d0d10] border rounded-[2.5rem] p-6 lg:p-8 shadow-2xl transition-all ${rankInfo.bgGlow}`}
    >
      {/* Dynamic gamer grid back-glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(212,175,55,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] select-none pointer-events-none">
        <Trophy size={180} />
      </div>

      {/* Floating alert for daily check-in */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`absolute top-4 left-6 right-6 z-50 p-3.5 rounded-2xl border bg-gradient-to-br ${notification.bg} shadow-2xl flex items-center justify-between gap-3`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="text-fifa-gold animate-bounce shrink-0" size={16} />
              <p className="text-xs font-bold leading-tight font-sans">
                {notification.text}
              </p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-white text-xs font-black px-2 py-1 rounded-lg hover:bg-white/5 font-mono"
            >
              OK
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Layout */}
      <div className="flex flex-col gap-6 relative z-10">
        
        {/* Header Section: Level & Rank Label */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Highly Polished RPG Level Shield & Micro Progress Bar */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                  className="absolute inset-[-4px] bg-gradient-to-r from-fifa-gold via-yellow-500/20 to-fifa-gold rounded-full opacity-60 blur-xs"
                />
                <div className="relative w-14 h-14 bg-[#1b1b22] border-2 border-fifa-gold/60 rounded-full flex flex-col items-center justify-center shadow-lg">
                  <Shield className="absolute text-fifa-gold/10 w-11 h-11" />
                  <span className="text-[10px] uppercase font-mono font-black text-fifa-gold tracking-widest leading-none mt-1">LVL</span>
                  <span className="text-xl font-display font-black text-white leading-none mt-0.5">{rankInfo.level}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-fifa-gold to-yellow-500 text-black rounded-full p-1 shadow-md">
                  <Zap size={10} className="fill-current animate-pulse" />
                </div>
              </div>

              {/* Small XP bar underneath the level counter shield */}
              <div 
                className="w-14 mt-2 flex flex-col items-center gap-0.5 group/xp cursor-pointer relative"
                title={isEs ? `XP por inicio de sesión hoy: ${dailyXp}/100` : `Daily Login XP: ${dailyXp}/100`}
              >
                <div className="h-1 w-full bg-black/60 border border-white/5 rounded-full overflow-hidden p-[0.5px]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${dailyXp}%` }}
                    className="bg-gradient-to-r from-fifa-gold to-yellow-400 h-full rounded-full shrink-0"
                  />
                </div>
                <span className="text-[8px] font-mono font-black text-fifa-gold tracking-wider leading-none">
                  {dailyXp} XP
                </span>
              </div>
            </div>

            {/* Title & Slogan */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-black text-fifa-gold uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
                {isEs ? "RANGO DE COLECCIONISTA" : "COLLECTOR STATUS"}
              </span>
              <h3 className={`text-xl lg:text-2xl font-display font-extrabold tracking-tight bg-gradient-to-r ${rankInfo.color} bg-clip-text text-transparent`}>
                {rankInfo.title}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium italic">
                "{rankInfo.motto}"
              </p>
            </div>
          </div>

          {/* Quick Stats Bento block */}
          <div className="flex flex-wrap items-center gap-2 sm:self-center">
            <div className="px-3.5 py-2 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-fifa-gold animate-ping" />
              <span className="text-xs font-mono font-black text-white">{percentage}% XP</span>
            </div>
            
            <div className="px-3.5 py-2 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center gap-2">
              <span className="text-xs text-rose-400 font-bold font-mono">+{repeated}</span>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{isEs ? "REPETIDAS" : "DUPES"}</span>
            </div>

            <button 
              onClick={onScrollToMilestones}
              className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-2xl flex items-center gap-2 transition-all active:scale-95 group"
            >
              <span className="text-xs text-emerald-400 font-bold font-mono">{unlockedCount} / {achievements.length}</span>
              <Award size={12} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* The Gamified RPG Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              {isEs ? "Barra de Experiencia" : "Experience Meter"}
            </span>
            <span className="text-xs font-mono font-black text-gray-400">
              <span className="text-fifa-gold">{obtained}</span> / {total} {isEs ? "láminas" : "stickers"}
            </span>
          </div>

          {/* Epic Segmented RPG Progress Bar Container */}
          <div className="relative p-1 bg-black/60 border border-white/5 rounded-2xl overflow-hidden shadow-2xl h-8 flex gap-1 items-center">
            
            {/* Liquid Background Stream Flow */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute left-1 top-1 bottom-1 bg-gradient-to-r from-amber-600 via-fifa-gold to-yellow-400 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              {/* Internal scrolling futuristic shimmer stripe */}
              <div 
                className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[size:20px_20px] animate-shimmer" 
                style={{ animationDuration: '1.5s', width: '200%' }}
              />
            </motion.div>

            {/* Custom gaming grid separators to create segmented look */}
            {segments.map((_, idx) => (
              <div
                key={idx}
                className="flex-1 h-full border-r border-black/40 relative z-20 pointer-events-none last:border-r-0"
              />
            ))}
          </div>

          {/* Reverse counter display: THE MAGIC EPIC GLORY COUNTER */}
          <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <motion.span 
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="text-sm font-display font-black text-white uppercase tracking-wider flex items-center gap-1.5"
              >
                {missing > 0 ? (
                  <>
                    {isEs ? "Faltan" : ""}{" "}
                    <span className="text-fifa-gold font-mono text-base font-black px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/5 inline-block">
                      {missing}
                    </span>{" "}
                    {isEs ? "láminas para la gloria" : "stickers left for glory!"}
                  </>
                ) : (
                  <span className="text-green-400 flex items-center gap-1 bg-green-500/10 px-3 py-1 rounded-xl border border-green-500/20">
                    🏆 {isEs ? "¡Has alcanzado la gloria eterna!" : "Eternal Glory Achieved!"}
                  </span>
                )}
              </motion.span>
            </div>
            
            <div className="text-[10px] text-gray-500 uppercase font-mono font-bold tracking-widest leading-none">
              {percentage === 100 
                ? (isEs ? "ÁLBUM COMPLETADO" : "ALBUM COMPLETED")
                : `${Math.round((missing / total) * 100)}% ${isEs ? "PENDIENTE" : "REMAINING"}`}
            </div>
          </div>
        </div>

        {/* Expanded: RUNES / BADGES TREASURY (Trophy Room) - "Mejora el sistema de logros y medallas" */}
        <div className="pt-2 border-t border-white/5">
          <span className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest block mb-3">
            {isEs ? "CÁMARA DE LOGROS Y MEDALLAS" : "ACHIEVEMENTS RUNE CHAMBER"}
          </span>

          <div className="flex flex-wrap items-center gap-2.5">
            {achievements.map((ach) => {
              const IconComponent = iconMap[ach.id] || Medal;
              return (
                <div
                  key={ach.id}
                  className="group/rune relative"
                >
                  {/* Glowing aura if unlocked */}
                  {ach.unlocked && (
                    <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-fifa-gold to-yellow-500 opacity-0 group-hover/rune:opacity-70 blur-xs transition-opacity duration-300 pointer-events-none" />
                  )}

                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                    ach.unlocked 
                      ? "bg-white/[0.05] border-fifa-gold/30 text-fifa-gold shadow-[0_0_15px_rgba(212,175,55,0.05)] hover:bg-[#1a1a24] hover:border-fifa-gold hover:text-white"
                      : "bg-white/[0.01] border-white/5 text-gray-700 hover:border-gray-600 hover:text-gray-400"
                  }`}>
                    {ach.unlocked ? (
                      <IconComponent size={15} className="transition-transform duration-300 group-hover/rune:scale-110" />
                    ) : (
                      <Lock size={13} className="opacity-40" />
                    )}

                    {/* Check indicator if unlocked */}
                    {ach.unlocked && (
                      <div className="absolute top-0 right-0 w-2 h-2 rounded-bl bg-emerald-500" />
                    )}
                  </div>

                  {/* RPG Hover Tooltip Card */}
                  <div className="absolute bottom-11 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover/rune:opacity-100 transition-all duration-300 scale-95 group-hover/rune:scale-100 z-50 w-48 bg-[#0a0a0d] border border-white/10 rounded-2xl p-3 shadow-2xl">
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#0a0a0d]" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold leading-tight ${ach.unlocked ? "text-fifa-gold" : "text-gray-400"}`}>
                          {ach.title}
                        </span>
                        <span className="text-[8px] font-mono font-bold bg-white/5 px-1 py-0.5 rounded text-gray-500">
                          {ach.progress}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-normal">
                        {ach.desc}
                      </p>
                      <div className="pt-1 flex justify-between items-center text-[8px] font-mono font-bold">
                        <span className={ach.unlocked ? "text-emerald-400 uppercase" : "text-gray-650 uppercase"}>
                          {ach.unlocked ? (isEs ? "✓ Completado" : "✓ Unlocked") : (isEs ? "🔒 Bloqueado" : "🔒 Locked")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </motion.div>
  );
};
