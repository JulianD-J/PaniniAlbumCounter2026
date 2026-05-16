import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { auth, googleProvider, db } from './lib/firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  updatePassword,
  reauthenticateWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { albumService } from './lib/albumService';
import { 
  TEAMS, 
  SPECIALS, 
  COCA_COLA, 
  StickerStatus,
  TEAM_DETAILS
} from './constants';
import { 
  Users, 
  Settings, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  LogOut, 
  CheckCircle2, 
  Circle, 
  PlusCircle, 
  MinusCircle,
  BarChart3,
  Search,
  Album as AlbumIcon,
  Trophy,
  Filter,
  Star,
  Share2,
  Copy,
  Check,
  Medal,
  TrendingUp,
  X,
  PieChart as PieChartIcon,
  Activity,
  ArrowRight,
  Key,
  Lock,
  Wifi,
  WifiOff,
  CloudOff,
  Diamond,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';

const normalize = (text: string) => 
  text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:]/g, "")
    .replace(/\s/g, "");

// --- Components ---

const ProgressBar = ({ current, total, color = "bg-fifa-gold" }: { current: number, total: number, color?: string }) => {
  const percentage = Math.min(100, Math.round((current / total) * 100)) || 0;
  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        className={`h-full ${color}`}
      />
    </div>
  );
};

const PremiumModal = ({ isOpen, onClose, onUpgrade, loading }: { isOpen: boolean, onClose: () => void, onUpgrade: () => void, loading: boolean }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          className="relative w-full max-w-md bg-dark-card border border-fifa-gold/30 rounded-3xl overflow-hidden shadow-2xl shadow-fifa-gold/20"
        >
          {/* Header Image/Gradient */}
          <div className="h-32 bg-gradient-to-br from-fifa-gold to-fifa-gold-light p-6 flex flex-col justify-end">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors">
              <X size={20} className="text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black/20 rounded-xl backdrop-blur-md">
                <Diamond className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-display font-bold text-black">{t('album.premium_modal_title')}</h2>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              {[
                { icon: WifiOff, text: t('album.premium_modal_feature_offline'), color: "text-blue-400" },
                { icon: BarChart3, text: t('album.premium_modal_feature_stats'), color: "text-fifa-gold" },
                { icon: ShieldCheck, text: t('album.premium_modal_feature_backup'), color: "text-green-400" },
                { icon: Activity, text: t('album.premium_modal_feature_ads'), color: "text-purple-400" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${feature.color}`}>
                    <feature.icon size={20} />
                  </div>
                  <span className="text-sm font-bold text-gray-300">{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-white/5 text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">
                {t('album.premium_modal_disclaimer')}
              </p>
              <button 
                onClick={onUpgrade}
                disabled={loading}
                className="w-full bg-fifa-gold text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-fifa-gold/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    {t('album.premium_upgrade_button', { price: t('album.premium_price') })}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const PremiumGuard = ({ 
  isPremium, 
  children, 
  onUpgrade,
  titleKey = "album.premium_lock_title",
  descKey = "album.premium_lock_desc"
}: { 
  isPremium: boolean, 
  children: React.ReactNode, 
  onUpgrade: () => void,
  titleKey?: string,
  descKey?: string
}) => {
  const { t } = useTranslation();
  
  if (isPremium) return <>{children}</>;

  return (
    <div className="relative group">
      <div className="blur-md pointer-events-none select-none opacity-40">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fifa-card p-8 bg-black/80 backdrop-blur-xl border-fifa-gold/30 shadow-2xl shadow-fifa-gold/10 text-center max-w-sm"
        >
          <div className="w-16 h-16 bg-fifa-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-fifa-gold/30">
            <Diamond className="text-fifa-gold" size={32} />
          </div>
          <h3 className="text-xl font-display font-bold text-white mb-2">{t(titleKey)}</h3>
          <p className="text-sm text-gray-400 mb-6">
            {t(descKey, { price: t('album.premium_price') })}
          </p>
          <button 
            onClick={onUpgrade}
            className="w-full bg-fifa-gold text-black font-bold py-3 rounded-xl hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <ShieldCheck size={20} />
            {t('album.premium_upgrade_button', { price: t('album.premium_price') })}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

const PremiumBanner = ({ onUpgrade, type = 'stats' }: { onUpgrade: () => void, type?: 'stats' | 'offline' }) => {
  const { t } = useTranslation();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onUpgrade}
      className={`relative overflow-hidden p-4 rounded-2xl border cursor-pointer group transition-all mb-4
        ${type === 'stats' ? 'bg-gradient-to-r from-fifa-gold/20 to-transparent border-fifa-gold/30' : 'bg-gradient-to-r from-blue-500/20 to-transparent border-blue-500/30'}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${type === 'stats' ? 'bg-fifa-gold/20' : 'bg-blue-500/20'}`}>
            {type === 'stats' ? <BarChart3 className="text-fifa-gold" size={20} /> : <Wifi className="text-blue-500" size={20} />}
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {type === 'stats' ? t('album.premium_banner_stats') : t('album.premium_banner_offline')}
            </p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('album.premium_button')} {t('album.premium_price')}</p>
          </div>
        </div>
        <ArrowRight className="text-gray-500 group-hover:translate-x-1 transition-transform" size={20} />
      </div>
      
      {/* Animated Shine */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer pointer-events-none" style={{ animationDuration: '4s' }} />
    </motion.div>
  );
};

const StickerItem = ({ 
  code, 
  status, 
  count, 
  onUpdate 
}: { 
  code: string, 
  status?: StickerStatus, 
  count?: number,
  onUpdate: (code: string, status: StickerStatus, count: number) => void,
  key?: string | number
}) => {
  const currentStatus = status || 'missing';
  const currentCount = count || 0;
  const isSpecial = code.startsWith('FWC') || code.startsWith('CC');

  const cycleStatus = () => {
    let nextStatus: StickerStatus = 'missing';
    let nextCount = 0;
    
    if (currentStatus === 'missing') {
      nextStatus = 'obtained';
      nextCount = 1;
    } else if (currentStatus === 'obtained') {
      nextStatus = 'repeated';
      nextCount = 2;
    } else {
      nextStatus = 'missing';
      nextCount = 0;
    }
    onUpdate(code, nextStatus, nextCount);
  };

  const incrementCount = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(code, 'repeated', currentCount + 1);
  };

  const decrementCount = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentCount > 2) {
      onUpdate(code, 'repeated', currentCount - 1);
    } else if (currentCount === 2) {
      onUpdate(code, 'obtained', 1);
    }
  };

  return (
    <motion.div 
      layout
      onClick={cycleStatus}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        relative p-2 h-20 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all border-2
        ${currentStatus === 'obtained' ? (isSpecial ? 'sticker-gold border-white/20' : 'bg-fifa-gold border-fifa-gold text-black shadow-lg shadow-fifa-gold/20') : ''}
        ${currentStatus === 'repeated' ? 'sticker-red border-white/20 text-white shadow-lg shadow-fifa-red/20' : ''}
        ${currentStatus === 'missing' ? 'bg-white/5 border-white/5 hover:border-white/10 text-gray-500' : ''}
      `}
    >
      <span className={`text-[10px] font-mono font-bold mb-1 ${currentStatus === 'missing' ? 'opacity-40' : 'opacity-80'}`}>{code}</span>
      
      {currentStatus === 'obtained' && <CheckCircle2 className={`w-5 h-5 ${isSpecial ? 'text-black' : 'text-black/60'}`} />}
      {currentStatus === 'repeated' && (
        <div className="flex flex-col items-center">
          <span className="text-lg font-display font-bold leading-none">{currentCount}</span>
          <div className="flex gap-2 mt-1">
            <button onClick={decrementCount} className="p-0.5 hover:bg-black/10 rounded"><MinusCircle size={12}/></button>
            <button onClick={incrementCount} className="p-0.5 hover:bg-black/10 rounded"><PlusCircle size={12}/></button>
          </div>
        </div>
      )}
      {currentStatus === 'missing' && <Circle className="w-5 h-5 opacity-20" />}
      
      {/* Shine effect for stickers */}
      {currentStatus !== 'missing' && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" style={{ animationDuration: '3s' }} />
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};

const Section = ({ 
  title, 
  codes, 
  inventory, 
  onUpdate,
  searchQuery = ""
}: { 
  title: string, 
  codes: string[], 
  inventory: Record<string, any>,
  onUpdate: (code: string, status: StickerStatus, count: number) => void,
  searchQuery?: string,
  key?: string | number
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const query = normalize(searchQuery);
  
  // Filter codes within section if searching
  const displayCodes = useMemo(() => {
    const sectionTitleNormalized = normalize(title);
    const teamInfo = TEAM_DETAILS[title];
    const teamFullNameTranslated = teamInfo ? t(`teams.${teamInfo.code}`) : title;
    const teamFullNameNormalized = normalize(teamFullNameTranslated);

    if (query === "" || sectionTitleNormalized.includes(query) || teamFullNameNormalized.includes(query)) return codes;
    return codes.filter(c => normalize(c).includes(query));
  }, [codes, query, title, t]);

  // Automatically open if a specific code within this section is being searched
  useEffect(() => {
    const sectionTitleNormalized = normalize(title);
    const teamInfo = TEAM_DETAILS[title];
    const teamFullNameTranslated = teamInfo ? t(`teams.${teamInfo.code}`) : title;
    const teamFullNameNormalized = normalize(teamFullNameTranslated);

    if (query !== "" && codes.some(c => normalize(c).includes(query)) && !sectionTitleNormalized.includes(query) && !teamFullNameNormalized.includes(query)) {
      setIsOpen(true);
    }
  }, [query, codes, title, t]);
  
  const stats = useMemo(() => {
    let obtained = 0;
    let repeated = 0;
    codes.forEach(code => {
      if (inventory[code]?.status === 'obtained') obtained++;
      if (inventory[code]?.status === 'repeated') {
        obtained++;
        repeated += (inventory[code]?.count - 1);
      }
    });
    return { obtained, total: codes.length, repeated };
  }, [codes, inventory]);

  return (
    <div className="mb-4 fifa-card overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5"
      >
        <div className="flex-1 mr-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-lg">{TEAM_DETAILS[title] ? t(`teams.${TEAM_DETAILS[title].code}`) : (title === "FWC" ? t('teams.FWC') : (title === "CC" ? t('teams.CC') : title))}</h3>
            <span className="text-sm font-medium text-fifa-gold">
              {stats.obtained}/{stats.total} {stats.repeated > 0 && <span className="text-fifa-red ml-2">+{stats.repeated} {t('album.repeated_label')}</span>}
            </span>
          </div>
          <ProgressBar current={stats.obtained} total={stats.total} />
        </div>
        {isOpen ? <ChevronUp className="opacity-50" /> : <ChevronDown className="opacity-50" />}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 overflow-hidden"
          >
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.03
                  }
                }
              }}
              className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2"
            >
              {displayCodes.map(code => (
                <motion.div
                  key={code}
                  variants={{
                    hidden: { opacity: 0, scale: 0.8 },
                    visible: { opacity: 1, scale: 1 }
                  }}
                >
                  <StickerItem 
                    code={code} 
                    status={inventory[code]?.status}
                    count={inventory[code]?.count}
                    onUpdate={onUpdate}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatsTab = ({ inventory, isPremium, onUpgrade }: { inventory: Record<string, any>, isPremium: boolean, onUpgrade: () => void }) => {
  const { t } = useTranslation();
  const stats = useMemo(() => {
    const specialsTotal = SPECIALS.length;
    const teamsTotal = TEAMS.length * 20;
    const cocaColaTotal = COCA_COLA.length;
    const grandTotal = specialsTotal + teamsTotal + cocaColaTotal;

    let specialsObtained = 0;
    let teamsObtained = 0;
    let cocaColaObtained = 0;
    let repeatedTotal = 0;

    SPECIALS.forEach(c => {
      if (inventory[c]?.status === 'obtained' || inventory[c]?.status === 'repeated') specialsObtained++;
      if (inventory[c]?.status === 'repeated') repeatedTotal += (inventory[c].count - 1);
    });

    TEAMS.forEach(team => {
      for (let i = 1; i <= 20; i++) {
        const c = `${team}${i}`;
        if (inventory[c]?.status === 'obtained' || inventory[c]?.status === 'repeated') teamsObtained++;
        if (inventory[c]?.status === 'repeated') repeatedTotal += (inventory[c].count - 1);
      }
    });

    COCA_COLA.forEach(c => {
      if (inventory[c]?.status === 'obtained' || inventory[c]?.status === 'repeated') cocaColaObtained++;
      if (inventory[c]?.status === 'repeated') repeatedTotal += (inventory[c].count - 1);
    });

    const totalObtained = specialsObtained + teamsObtained + cocaColaObtained;
    const progressPercent = Math.round((totalObtained / grandTotal) * 100);

    const chartData = [
      { name: t('teams.FWC'), obtained: specialsObtained, total: specialsTotal, color: '#D4AF37' },
      { name: t('nav.ranking'), obtained: teamsObtained, total: teamsTotal, color: '#91022D' },
      { name: t('teams.CC'), obtained: cocaColaObtained, total: cocaColaTotal, color: '#E10600' },
    ];

    return {
      specials: { obtained: specialsObtained, total: specialsTotal },
      teams: { obtained: teamsObtained, total: teamsTotal },
      cocacola: { obtained: cocaColaObtained, total: cocaColaTotal },
      grandTotal,
      totalObtained,
      progressPercent,
      repeatedTotal,
      chartData
    };
  }, [inventory, t]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <PremiumGuard isPremium={isPremium} onUpgrade={onUpgrade} titleKey="album.premium_stats_exclusive">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 pb-12"
      >
        {/* Header Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Trophy, color: "text-fifa-gold", val: `${stats.progressPercent}%`, label: t('stats.total_progress'), bg: "bg-fifa-gold/10" },
          { icon: CheckCircle2, color: "text-green-500", val: stats.totalObtained, label: t('stats.unique'), bg: "bg-green-500/10" },
          { icon: PlusCircle, color: "text-fifa-red", val: stats.repeatedTotal, label: t('stats.repeated'), bg: "bg-fifa-red/10" },
          { icon: Activity, color: "text-blue-500", val: stats.grandTotal - stats.totalObtained, label: t('stats.missing'), bg: "bg-blue-500/10" },
        ].map((item, i) => (
          <motion.div 
            key={i}
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className={`fifa-card p-6 flex flex-col items-center relative group overflow-hidden`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${item.color.replace('text-', 'bg-')}`} />
            <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <item.icon className={item.color} size={24} />
            </div>
            <span className="text-3xl font-display font-bold">{item.val}</span>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 text-center opacity-80 group-hover:opacity-100 transition-opacity">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div variants={itemVariants} className="fifa-card p-8 bg-black/40 backdrop-blur-md">
          <h3 className="font-display font-bold text-xl mb-8 flex items-center gap-3">
            <div className="p-2 bg-fifa-gold/10 rounded-lg">
              <PieChartIcon className="text-fifa-gold" size={20} />
            </div>
            {t('stats.distribution')}
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={stats.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="obtained"
                  stroke="none"
                >
                  {stats.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#161618', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-4">
            {stats.chartData.map((item, i) => (
              <div key={i} className="flex items-center gap-2 group cursor-default">
                <div className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-dark-bg transition-all group-hover:scale-125" style={{ backgroundColor: item.color, borderColor: item.color }}></div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest transition-colors group-hover:text-white">{item.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="fifa-card p-8 bg-black/40 backdrop-blur-md">
          <h3 className="font-display font-bold text-xl mb-8 flex items-center gap-3">
            <div className="p-2 bg-fifa-gold/10 rounded-lg">
              <TrendingUp className="text-fifa-gold" size={20} />
            </div>
            {t('stats.progress')}
          </h3>
          <div className="space-y-8">
            {stats.chartData.map((item, index) => (
              <div key={index} className="space-y-3 group">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold uppercase tracking-[0.15em] text-gray-400 group-hover:text-white transition-colors">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono font-bold">{Math.round((item.obtained / item.total) * 100)}%</span>
                    <span className="text-gray-500 font-mono text-[10px]">({item.obtained}/{item.total})</span>
                  </div>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.obtained / item.total) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                    className="h-full rounded-full relative"
                    style={{ backgroundColor: item.color }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between group">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">{t('stats.final_status')}</p>
              <p className="text-lg font-display font-bold text-white mt-1 group-hover:text-fifa-gold transition-colors">
                {stats.totalObtained === stats.grandTotal ? t('stats.album_complete') : `${stats.grandTotal - stats.totalObtained} ${t('stats.remaining')}`}
              </p>
            </div>
            <div className="w-14 h-14 bg-fifa-gold/10 rounded-2xl flex items-center justify-center border border-fifa-gold/20 group-hover:rotate-12 transition-transform shadow-lg shadow-fifa-gold/5">
              <Trophy size={28} className="text-fifa-gold" />
            </div>
          </div>
        </motion.div>
      </div>
      </motion.div>
    </PremiumGuard>
  );
};

// --- Main App ---

const CommunityView = ({ 
  currentUser, 
  userInventory,
  activeAlbum
}: { 
  currentUser: User, 
  userInventory: Record<string, any>,
  activeAlbum: any
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendInventory, setFriendInventory] = useState<Record<string, any>>({});
  const [comparing, setComparing] = useState(false);
  
  const [selectedToGive, setSelectedToGive] = useState<string[]>([]);
  const [selectedToGet, setSelectedToGet] = useState<string[]>([]);
  const [copying, setCopying] = useState(false);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [confirmingMsgId, setConfirmingMsgId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [lastSwapped, setLastSwapped] = useState<{give: string[], get: string[]} | null>(null);

  useEffect(() => {
    loadFriends();
    const unsub = albumService.subscribeToMessages(currentUser.uid, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [currentUser.uid]);

  const loadFriends = async () => {
    const ids = await albumService.getFriends(currentUser.uid);
    if (ids) {
      setFriendIds(ids);
      if (ids.length > 0) {
        const friendData = await albumService.getUsersByIds(ids);
        setFriends(friendData || []);
      } else {
        setFriends([]);
      }
    }
  };

  const handleSearch = async () => {
    if (search.length < 3) return;
    const users = await albumService.searchUsers(search);
    setResults(users?.filter(u => u.id !== currentUser.uid) || []);
  };

  const toggleFavorite = async (e: React.MouseEvent, friendId: string) => {
    e.stopPropagation();
    if (friendIds.includes(friendId)) {
      await albumService.removeFriend(currentUser.uid, friendId);
    } else {
      await albumService.addFriend(currentUser.uid, friendId);
    }
    loadFriends();
  };

  const selectFriend = async (friend: any) => {
    setSelectedFriend(friend);
    setComparing(true);
    const albums = await albumService.getAlbums(friend.id);
    if (albums && albums.length > 0) {
      const inv = await albumService.getAlbumInventory(albums[0].id);
      setFriendInventory(inv || {});
    } else {
      setFriendInventory({});
    }
    setComparing(false);
    setSelectedToGive([]);
    setSelectedToGet([]);
  };

  const comparison = useMemo(() => {
    const give: string[] = [];
    const get: string[] = [];
    
    const allCodes = [...SPECIALS, ...TEAMS.flatMap(t => Array.from({ length: 20 }, (_, i) => `${t}${i + 1}`)), ...COCA_COLA];
    
    allCodes.forEach(code => {
      const me = userInventory[code];
      const them = friendInventory[code];
      
      // I give: I have repeated, they are missing
      if (me?.status === 'repeated' && (!them || them.status === 'missing')) {
        give.push(code);
      }
      
      // I get: They have repeated, I am missing
      if (them?.status === 'repeated' && (!me || me.status === 'missing')) {
        get.push(code);
      }
    });
    
    return { give, get };
  }, [userInventory, friendInventory]);

  const handleShare = async () => {
    if (!selectedFriend) return;
    
    const giveList = selectedToGive.length > 0 ? selectedToGive : comparison.give;
    const getList = selectedToGet.length > 0 ? selectedToGet : comparison.get;

    if (giveList.length === 0 && getList.length === 0) return;

    const message = t('bazar.share_message', {
      name: selectedFriend.displayName,
      give: giveList.length > 0 ? giveList.join(', ') : t('bazar.none_for_now'),
      get: getList.length > 0 ? getList.join(', ') : t('bazar.none_for_now')
    });

    // 1. Send as app message (if starred)
    if (friendIds.includes(selectedFriend.id)) {
      await albumService.sendMessage({
        from: currentUser.uid,
        to: selectedFriend.id,
        text: message,
        give: giveList,
        get: getList,
        type: 'swap_request'
      });
    }

    // 2. Copy/Share
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('bazar.share_title'),
          text: message
        });
      } catch (e) {
        copyToClipboard(message);
      }
    } else {
      copyToClipboard(message);
    }
  };

  const handleCompleteSwap = async (msg: any) => {
    if (msg.status === 'completed' || swapping) return;

    if (confirmingMsgId !== msg.id) {
      setConfirmingMsgId(msg.id);
      // Reset confirmation after 4 seconds
      setTimeout(() => setConfirmingMsgId((prev) => prev === msg.id ? null : prev), 4000);
      return;
    }

    setConfirmingMsgId(null);
    setSwapping(msg.id);
    try {
      await albumService.completeSwap(msg.id, msg.from, msg.to, msg.give, msg.get);
      setLastSwapped({ give: msg.give, get: msg.get });
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#91022D', '#FFFFFF']
      });

      // Clear highlights after 5 seconds
      setTimeout(() => setLastSwapped(null), 5000);
    } catch (e) {
      console.error("Swap failed", e);
    } finally {
      setSwapping(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const toggleSelectToGive = (code: string) => {
    setSelectedToGive(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const toggleSelectToGet = (code: string) => {
    setSelectedToGet(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const friendMessages = useMemo(() => {
    if (!selectedFriend) return [];
    return messages.filter(m => m.from === selectedFriend.id || m.to === selectedFriend.id);
  }, [messages, selectedFriend]);

  const pendingMessagesCount = useMemo(() => {
    return messages.filter(m => m.to === currentUser.uid && m.status === 'pending').length;
  }, [messages, currentUser.uid]);

  return (
    <div className="space-y-6">
      <div className="fifa-card p-6">
        <h2 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
          <Users className="text-fifa-gold" /> {t('bazar.title')}
        </h2>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder={t('bazar.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-fifa-gold"
          />
          <button 
            onClick={handleSearch}
            className="bg-fifa-gold text-black px-6 py-2 rounded-xl font-bold flex items-center gap-2"
          >
            <Search size={18} /> {t('bazar.search_button')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="md:col-span-1 space-y-4">
          {search === "" && friends.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">{t('bazar.my_friends')}</p>
              {friends.map(f => (
                <button 
                  key={f.id}
                  onClick={() => selectFriend(f)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedFriend?.id === f.id ? 'bg-fifa-gold/20 border-fifa-gold' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-fifa-gold/30 bg-white/5 flex items-center justify-center overflow-hidden">
                      {f.photoURL ? <img src={f.photoURL} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-bold text-fifa-gold">{f.displayName?.[0]}</span>}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">{f.displayName}</p>
                      <p className="text-[10px] text-gray-500">{f.email}</p>
                    </div>
                  </div>
                  <Star 
                    size={16} 
                    className="text-fifa-gold fill-fifa-gold cursor-pointer hover:scale-125 transition-transform" 
                    onClick={(e) => toggleFavorite(e, f.id)} 
                  />
                </button>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">{t('bazar.search_results')}</p>
              {results.map(f => (
                <button 
                  key={f.id}
                  onClick={() => selectFriend(f)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedFriend?.id === f.id ? 'bg-fifa-gold/20 border-fifa-gold' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
                      {f.photoURL ? <img src={f.photoURL} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-bold text-gray-400">{f.displayName?.[0]}</span>}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">{f.displayName}</p>
                      <p className="text-[10px] text-gray-500">{f.email}</p>
                    </div>
                  </div>
                  <Star 
                    size={16} 
                    className={`cursor-pointer hover:scale-125 transition-all ${friendIds.includes(f.id) ? 'text-fifa-gold fill-fifa-gold' : 'text-gray-600 hover:text-fifa-gold'}`} 
                    onClick={(e) => toggleFavorite(e, f.id)} 
                  />
                </button>
              ))}
            </div>
          )}
          
          {search && results.length === 0 && <p className="text-center text-gray-500 text-sm py-4">{t('bazar.no_users')}</p>}
          {search === "" && friends.length === 0 && (
            <div className="text-center py-8 px-4 bg-white/5 rounded-2xl border border-white/5">
              <Users size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs text-gray-500 italic">{t('bazar.search_tip')}</p>
            </div>
          )}
        </div>

        {/* Comparison View */}
        <div className="md:col-span-2">
          {selectedFriend ? (
            <div className="fifa-card p-6">
              {comparing ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-fifa-gold border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full border-2 border-fifa-gold overflow-hidden flex items-center justify-center bg-white/5">
                        {selectedFriend.photoURL ? <img src={selectedFriend.photoURL} className="w-full h-full object-cover" alt="" /> : <span className="text-xl font-bold text-fifa-gold">{selectedFriend.displayName?.[0]}</span>}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-2xl text-white">{t('bazar.match_title')}</h3>
                        <p className="text-gray-400">{t('bazar.matching_with')} {selectedFriend.displayName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {friendIds.includes(selectedFriend.id) && (
                        <button 
                          onClick={handleShare}
                          className="p-3 bg-fifa-gold text-black rounded-full hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-lg relative"
                          title={t('bazar.share_tooltip')}
                        >
                          {copying ? <Check size={24} /> : <Share2 size={24} />}
                          {copying && (
                            <motion.span 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: -40 }}
                              className="absolute bg-white text-black text-[10px] font-bold px-2 py-1 rounded"
                            >
                              {t('bazar.copied')}
                            </motion.span>
                          )}
                        </button>
                      )}
                      <button 
                        onClick={(e) => toggleFavorite(e, selectedFriend.id)}
                        className={`p-3 rounded-full transition-all ${friendIds.includes(selectedFriend.id) ? 'bg-fifa-gold/10 text-fifa-gold' : 'bg-white/5 text-gray-500 hover:text-fifa-gold'}`}
                      >
                        <Star size={24} className={friendIds.includes(selectedFriend.id) ? 'fill-fifa-gold' : ''} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-6 italic">
                    💡 Haz clic en las láminas para seleccionarlas y compartirlas por mensaje. Si no seleccionas ninguna, se enviará la lista completa.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <motion.div 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-fifa-gold flex items-center gap-2">
                          <CheckCircle2 size={18} /> {t('bazar.you_give')}
                        </h4>
                        <span className="bg-fifa-gold/20 text-fifa-gold px-2 py-0.5 rounded text-xs font-bold">{comparison.give.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar p-1">
                        {comparison.give.length > 0 ? comparison.give.map((c, i) => (
                          <motion.button 
                            key={c}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.01 }}
                            onClick={() => toggleSelectToGive(c)}
                            whileHover={{ scale: 1.1, rotate: 2 }}
                            whileTap={{ scale: 0.9 }}
                            className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold border-2 transition-all relative ${lastSwapped?.give.includes(c) ? 'bg-green-500/20 border-green-500 text-green-500 scale-110 z-10' : selectedToGive.includes(c) ? 'bg-fifa-gold text-black border-fifa-gold shadow-lg shadow-fifa-gold/20' : 'bg-white/5 text-white border-white/5 hover:border-fifa-gold/30'}`}
                          >
                            {c}
                            {selectedToGive.includes(c) && <Check size={10} className="inline ml-1" />}
                            {lastSwapped?.give.includes(c) && <motion.div layoutId={`gave-${c}`} className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
                            {/* Shine for special codes in comparison */}
                            {(c.startsWith('FWC') || c.startsWith('CC')) && (
                              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer opacity-40 pointer-events-none" />
                            )}
                          </motion.button>
                        )) : <p className="text-xs text-gray-500 italic pb-4">{t('bazar.no_repeated_to_give')}</p>}
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-fifa-red flex items-center gap-2">
                          <PlusCircle size={18} /> {t('bazar.they_give')}
                        </h4>
                        <span className="bg-fifa-red/20 text-fifa-red px-2 py-0.5 rounded text-xs font-bold">{comparison.get.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar p-1">
                        {comparison.get.length > 0 ? comparison.get.map((c, i) => (
                          <motion.button 
                            key={c}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.01 }}
                            onClick={() => toggleSelectToGet(c)}
                            whileHover={{ scale: 1.1, rotate: -2 }}
                            whileTap={{ scale: 0.9 }}
                            className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold border-2 transition-all relative ${lastSwapped?.get.includes(c) ? 'bg-blue-500/20 border-blue-500 text-blue-500 scale-110 z-10' : selectedToGet.includes(c) ? 'bg-fifa-red text-white border-fifa-red shadow-lg shadow-fifa-red/20' : 'bg-white/5 text-white border-white/5 hover:border-fifa-red/30'}`}
                          >
                            {c}
                            {selectedToGet.includes(c) && <Check size={10} className="inline ml-1" />}
                            {lastSwapped?.get.includes(c) && <motion.div layoutId={`got-${c}`} className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />}
                            {(c.startsWith('FWC') || c.startsWith('CC')) && (
                              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer opacity-40 pointer-events-none" />
                            )}
                          </motion.button>
                        )) : <p className="text-xs text-gray-500 italic pb-4">{t('bazar.no_repeated_to_get')}</p>}
                      </div>
                    </motion.div>
                  </div>

                  <div className="space-y-6">
                    {friendMessages.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">Historial de Intercambios</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {friendMessages.map(msg => (
                            <div 
                              key={msg.id}
                              className={`p-4 rounded-xl border ${msg.from === currentUser.uid ? 'bg-white/5 border-white/5 ml-8' : 'bg-fifa-gold/5 border-fifa-gold/20 mr-8'} ${msg.status === 'completed' ? 'opacity-50' : ''}`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-[10px] font-bold text-gray-500">{new Date(msg.createdAt?.seconds * 1000).toLocaleString()}</p>
                                {msg.status === 'completed' && <span className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-1"><Check size={10}/> {t('bazar.completed')}</span>}
                              </div>
                              <p className="text-sm whitespace-pre-wrap mb-4">{msg.text}</p>
                              
                              {msg.status === 'pending' && msg.to === currentUser.uid && (
                                <button 
                                  onClick={() => handleCompleteSwap(msg)}
                                  disabled={!!swapping}
                                  className={`w-full font-bold py-2 rounded-lg text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${confirmingMsgId === msg.id ? 'bg-fifa-red text-white animate-pulse' : 'bg-fifa-gold text-black'}`}
                                >
                                  {swapping === msg.id ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                      {t('bazar.processing')}
                                    </>
                                  ) : confirmingMsgId === msg.id ? (
                                    t('bazar.confirm_swap')
                                  ) : (
                                    t('bazar.swap_done')
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="fifa-card p-12 text-center flex flex-col items-center justify-center h-full text-gray-500">
              <Users size={48} className="mb-4 opacity-20" />
              <p>Selecciona un amigo para ver qué láminas pueden intercambiar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<any[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<any>(null);
  const [inventory, setInventory] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [quickTeam, setQuickTeam] = useState("");
  const [quickNumber, setQuickNumber] = useState("");
  const [view, setView] = useState<'collection' | 'community' | 'stats'>('collection');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showRanking, setShowRanking] = useState(false);
  const [ranking, setRanking] = useState<any[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [upgrading, setUpgrading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<any[]>([]);
  const quickInputTimeout = useRef<any>(null);
  
  const isPremium = useMemo(() => userProfile?.isPremium || false, [userProfile]);

  const handleUpgrade = async () => {
    if (!user || upgrading) return;
    setUpgrading(true);
    try {
      // 1. Android/iOS Bridge logic
      // When inside an Android TWA or WebView, we listen for a JS bridge
      console.log("Attempting Google Play Purchase...");
      
      let token = `mock_token_${Date.now()}`;
      
      // If we are in a real Android native environment with a bridge
      // @ts-ignore
      if (window.Android && window.Android.startPurchase) {
        // @ts-ignore
        token = await window.Android.startPurchase("premium_upgrade");
      } else {
        console.warn("No native bridge detected, using simulated token. This usually means the app is running in a browser instead of natively.");
      }
      
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const validate = httpsCallable(functions, 'validatePurchase');
      
      const result = await validate({
        purchaseToken: token,
        productId: "premium_upgrade",
        packageName: "com.colediverti.album2026"
      });

      if ((result.data as any).success) {
        confetti({
          particleCount: 200,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#D4AF37', '#FFFFFF']
        });
        setShowPremiumModal(false);
      } else {
        setError((result.data as any).message || "Verification failed");
        setTimeout(() => setError(""), 5000);
      }
    } catch (e: any) {
      console.error("Upgrade failed", e);
      setError(e.message || "An internal error occurred during payment");
      setTimeout(() => setError(""), 5000);
    } finally {
      setUpgrading(false);
    }
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Only save profile and setup real-time listeners if online
        if (navigator.onLine) {
          albumService.saveUserProfile(u.uid, {
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL
          });
        }
        
        // Listen to user profile for badges/stats
        const unsubUser = onSnapshot(doc(db, 'users', u.uid), (doc) => {
          if (doc.exists()) setUserProfile(doc.data());
        });
        
        // Listen to pending messages for notification badge
        const unsubMsgs = albumService.subscribeToMessages(u.uid, (msgs) => {
          setPendingMessages(msgs.filter(m => m.to === u.uid && m.status === 'pending'));
        });
        
        return () => {
          unsubUser();
          unsubMsgs();
        };
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadAlbums();
    }
  }, [user]);

  const loadAlbums = async () => {
    if (!user) return;
    const data = await albumService.getAlbums(user.uid);
    setAlbums(data || []);
    if (data && data.length > 0 && !activeAlbum) {
      setActiveAlbum(data[0]);
    }
  };

  useEffect(() => {
    if (activeAlbum) {
      const unsub = albumService.subscribeToInventory(activeAlbum.id, (inv) => {
        setInventory(inv);
      });
      return unsub;
    }
  }, [activeAlbum]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      
      // Save profile immediately to Firestore
      await albumService.saveUserProfile(userCredential.user.uid, {
        displayName,
        email: userCredential.user.email,
        photoURL: null
      });

      // Force reload user data
      setUser({ ...userCredential.user, displayName });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleCreateAlbum = async () => {
    if (!user || albums.length >= 2) return;
    if (!isOnline) {
      setError(t('album.create_error_offline'));
      return;
    }
    const name = albums.length === 0 
      ? `Álbum de ${user.displayName || user.email?.split('@')[0]}` 
      : `Álbum secundario de ${user.displayName || user.email?.split('@')[0]}`;
    await albumService.createAlbum(user.uid, name);
    loadAlbums();
  };

  const handleUpdateSticker = (code: string, status: StickerStatus, count: number) => {
    if (!activeAlbum) return;
    
    // Lock offline editing behind premium
    if (!isOnline && !isPremium) {
      setError(t('album.premium_offline_exclusive'));
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    albumService.updateSticker(activeAlbum.id, code, status, count);
  };

  const handleQuickAdd = (explicitNumber?: string, explicitTeam?: string) => {
    const teamToUse = explicitTeam || quickTeam;
    const numToUse = explicitNumber || quickNumber;
    if (!teamToUse || !numToUse || !activeAlbum) return;
    
    let code = "";
    if (teamToUse === "FWC") {
      code = numToUse === "0" ? "FWC" : `FWC${numToUse}`;
    } else if (teamToUse === "CC") {
      code = `CC${numToUse}`;
    } else {
      code = `${teamToUse}${numToUse}`;
    }

    const current = inventory[code];
    if (!current || current.status === 'missing') {
      handleUpdateSticker(code, 'obtained', 1);
    } else {
      handleUpdateSticker(code, 'repeated', (current.count || 1) + 1);
    }
    
    // Minimal feedback instead of full reset
    confetti({
      particleCount: 20,
      spread: 40,
      origin: { y: 0.8 },
      colors: ['#D4AF37', '#91022D']
    });
  };

  const handleQuickInput = (val: string) => {
    const rawVal = val.toUpperCase();
    const normalizedVal = normalize(val);
    
    // Check for full name matches first
    const foundTeamByFullName = Object.values(TEAM_DETAILS).find(t => normalize(t.name) === normalizedVal);
    if (foundTeamByFullName) {
      setQuickTeam(foundTeamByFullName.code);
      return;
    }

    const normalized = rawVal.replace(/\s/g, '');
    setQuickTeam(normalized);

    if (quickInputTimeout.current) {
      clearTimeout(quickInputTimeout.current);
    }

    // Auto-detect full code
    if (normalized === 'FWC') {
      handleQuickAdd('0', 'FWC');
      setQuickTeam(""); // Clear after auto-add
      return;
    }

    const matches = [
      { regex: /^FWC(\d{1,2})$/, team: 'FWC' },
      { regex: /^CC(\d{1,2})$/, team: 'CC' },
      { regex: /^([A-Z]{3})(\d{1,2})$/, team: null }, // Team is dynamic
    ];

    for (const match of matches) {
      const res = normalized.match(match.regex);
      if (res) {
        const team = match.team || res[1];
        const numStr = match.team ? res[1] : res[2];
        const num = parseInt(numStr);

        if (!match.team && !TEAMS.includes(team)) continue;
        
        // Ranges validation
        if (team === 'FWC' && num > 19) continue;
        if (team === 'CC' && (num < 1 || num > 14)) continue;
        if (team !== 'FWC' && team !== 'CC' && (num < 1 || num > 20)) continue;

        const trigger = () => {
          handleQuickAdd(numStr, team);
          setQuickTeam(""); // Clear input after auto-add
        };

        if (numStr.length >= 2) {
          trigger();
        } else {
          // If 1 digit, check if it could be 2 digits
          let canBeTwo = false;
          if (team === 'FWC' && num === 1) canBeTwo = true; // 10-19
          if (team === 'CC' && num === 1) canBeTwo = true; // 10-14
          if (team !== 'FWC' && team !== 'CC' && (num === 1 || num === 2)) canBeTwo = true; // 10-19 or 20

          if (canBeTwo) {
            quickInputTimeout.current = setTimeout(trigger, 500);
          } else {
            trigger();
          }
        }
        break;
      }
    }
  };

  const isGoogleUser = useMemo(() => {
    return user?.providerData.some(p => p.providerId === 'google.com');
  }, [user]);

  const handleUpdatePassword = async () => {
    if (!user || !newPassword) return;
    if (!isOnline) {
      setPasswordError(t('album.create_error_offline'));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t('auth.password_min_length'));
      return;
    }

    setUpdatingPassword(true);
    setPasswordError("");
    setPasswordSuccess(false);

    try {
      // Reauthenticate for security
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, provider);
      
      await updatePassword(user, newPassword);
      setPasswordSuccess(true);
      setNewPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        setPasswordError(t('auth.reauth_required_msg'));
      } else {
        setPasswordError(t('auth.reauth_msg'));
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  const totalStats = useMemo(() => {
    let totalObtained = 0;
    let totalRepeated = 0;
    const allExpected = [...SPECIALS, ...TEAMS.flatMap(t => Array.from({ length: 20 }, (_, i) => `${t}${i + 1}`)), ...COCA_COLA];
    
    allExpected.forEach(code => {
      if (inventory[code]?.status === 'obtained') totalObtained++;
      if (inventory[code]?.status === 'repeated') {
        totalObtained++;
        totalRepeated += (inventory[code]?.count - 1);
      }
    });
    
    return { obtained: totalObtained, total: allExpected.length, repeated: totalRepeated };
  }, [inventory]);

  // Sync stats to Firestore
  useEffect(() => {
    if (user && totalStats.total > 0) {
      const percentage = Math.round((totalStats.obtained / totalStats.total) * 100);
      // We also check existing profile to verify we don't spam updates unnecessarily
      // but the service handles merge/update logic.
      albumService.updateUserStats(user.uid, percentage);
    }
  }, [totalStats.obtained, user, totalStats.total]); // Added totalStats.total as dependency

  const loadRanking = async () => {
    setShowRanking(true);
    setLoadingRanking(true);
    try {
      const data = await albumService.getGlobalRanking();
      setRanking(data || []);
    } catch (e) {
      console.error(e);
      setRanking([]);
    } finally {
      setLoadingRanking(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg">
      <div className="w-12 h-12 border-4 border-fifa-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-fifa-gold/10 via-dark-bg to-dark-bg">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="w-20 h-20 bg-fifa-gold/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <Trophy className="w-10 h-10 text-fifa-gold" />
          <div className="absolute inset-0 bg-fifa-gold blur-2xl opacity-20" />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-display font-bold mb-2 tracking-tighter gradient-gold bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(212,175,55,0.1)]">
          PANINI 2026
        </h1>
        
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px w-8 bg-fifa-gold/30" />
          <p className="text-fifa-gold font-bold tracking-[0.4em] text-[10px] uppercase">{t('auth.official_collection')}</p>
          <div className="h-px w-8 bg-fifa-gold/30" />
        </div>

        <div className="fifa-card p-8 text-left bg-black/40 backdrop-blur-md">
          <h2 className="text-2xl font-bold mb-6 text-white">
            {authMode === 'login' ? t('auth.welcome') : t('auth.create_account')}
          </h2>

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('auth.name')}</label>
                <input 
                  required
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-fifa-gold/50 transition-all text-white"
                  placeholder={t('auth.name')}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('auth.email')}</label>
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-fifa-gold/50 transition-all text-white"
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('auth.password')}</label>
              <input 
                required
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-fifa-gold/50 transition-all text-white"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-fifa-red text-xs mt-2 bg-fifa-red/10 p-2 rounded border border-fifa-red/20">{error}</p>
            )}

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full bg-fifa-gold text-black font-bold py-3 rounded-xl hover:bg-fifa-gold/90 transition-all transform active:scale-95 disabled:opacity-50 mt-4"
            >
              {authLoading ? t('auth.processing') : (authMode === 'login' ? t('auth.login') : t('auth.register'))}
            </button>
          </form>

          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <span className="relative px-4 bg-transparent text-[10px] font-bold text-gray-600 uppercase">{t('auth.or_continue_with')}</span>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all transform active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Google
          </button>

          <p className="text-center mt-8 text-sm text-gray-500">
            {authMode === 'login' ? t('auth.no_account') : t('auth.have_account')} 
            <button 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setError("");
              }}
              className="text-fifa-gold font-bold ml-1 hover:underline"
            >
              {authMode === 'login' ? t('auth.register_now') : t('auth.login_now')}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-fifa-gold/20 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-fifa-gold" />
            </div>
            <h1 className="font-display font-bold text-xl hidden sm:block">Panini 2026</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-2 mr-4">
              <button 
                onClick={() => setView('collection')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${view === 'collection' ? 'text-fifa-gold' : 'text-gray-400 hover:text-white'}`}
              >
                <AlbumIcon size={18} /> {t('nav.album')}
              </button>
              <button 
                onClick={() => setView('community')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all relative ${view === 'community' ? 'text-fifa-gold' : 'text-gray-400 hover:text-white'}`}
              >
                <Users size={18} /> {t('nav.community')}
                {pendingMessages.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-fifa-red text-white text-[10px] flex items-center justify-center rounded-full border-2 border-dark-bg animate-bounce">
                    {pendingMessages.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setView('stats')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${view === 'stats' ? 'text-fifa-gold' : 'text-gray-400 hover:text-white'}`}
              >
                <BarChart3 size={18} /> {t('nav.stats')}
              </button>
              <button 
                onClick={loadRanking}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-gray-400 hover:text-white transition-all"
              >
                <TrendingUp size={18} /> {t('nav.ranking')}
              </button>
            </div>
            
            <div className="flex bg-white/5 rounded-full p-1 border border-white/5">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => setActiveAlbum(album)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeAlbum?.id === album.id ? 'bg-fifa-gold text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  {album.name}
                </button>
              ))}
              {albums.length < 2 && (
                <button 
                  onClick={handleCreateAlbum}
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-gray-500 hover:text-white transition-all flex items-center gap-1"
                >
                  <Plus size={14} /> {t('nav.new_album')}
                </button>
              )}
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-fifa-red"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Banner Offline */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-fifa-red text-white text-[10px] sm:text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-[120] shadow-lg uppercase tracking-wider"
          >
            <WifiOff size={14} className="animate-pulse" />
            <span>{t('album.offline_banner')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto px-4 mt-8">
        {/* Profile Card */}
        <div className="fifa-card p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BarChart3 size={120} />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div 
                  onClick={() => isGoogleUser && isOnline && setShowPasswordModal(true)}
                  className={`w-12 h-12 rounded-full border-2 border-fifa-gold overflow-hidden bg-white/10 flex items-center justify-center relative ${isGoogleUser && isOnline ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'}`}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} className="w-full h-full object-cover" alt={user.displayName || ''} />
                  ) : (
                    <span className="text-fifa-gold font-bold">{user.displayName?.[0] || user.email?.[0] || '?'}</span>
                  )}
                  {isGoogleUser && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Key size={16} className="text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg">{user.displayName}</h2>
                    {isPremium && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-fifa-gold text-black text-[10px] font-black rounded-full uppercase italic tracking-tighter">
                        <Diamond size={10} /> PRO
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{activeAlbum?.name || 'Selecciona un álbum'}</p>
                  
                  {isGoogleUser && (
                    <p className="text-[10px] text-fifa-gold/60 mt-0.5">{t('auth.password_hint')}</p>
                  )}

                  {userProfile?.badges && userProfile.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {userProfile.badges.map((badge: string) => (
                        <span key={badge} className="px-2 py-0.5 bg-fifa-gold/20 text-fifa-gold text-[10px] font-bold uppercase rounded-md border border-fifa-gold/30 flex items-center gap-1">
                          <Medal size={10} /> {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t('album.obtained')}</p>
                  <p className="text-2xl font-display font-bold text-fifa-gold">{totalStats.obtained}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t('stats.progress')}</p>
                  <p className="text-2xl font-display font-bold text-white">{Math.round((totalStats.obtained / totalStats.total) * 100)}%</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t('stats.repeated')}</p>
                  <p className="text-2xl font-display font-bold text-fifa-red">{totalStats.repeated}</p>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-64">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase">{t('album.completed')}</span>
                <span className="text-xs font-bold text-fifa-gold">{totalStats.obtained} / {totalStats.total}</span>
              </div>
              <ProgressBar current={totalStats.obtained} total={totalStats.total} />
            </div>
          </div>
        </div>

        {view === 'collection' && (
          <>
              {!isPremium && <PremiumBanner onUpgrade={() => setShowPremiumModal(true)} type="offline" />}
              
              <div className="flex flex-col gap-4 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input 
                      type="text" 
                      placeholder={t('album.search_placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-fifa-gold/50 transition-all font-display"
                    />
                  </div>

                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input 
                          type="text"
                          placeholder={t('album.quick_input_placeholder')}
                          value={quickTeam}
                          onChange={(e) => handleQuickInput(e.target.value)}
                          maxLength={20}
                          className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-3 text-sm font-bold text-white focus:border-fifa-gold transition-all text-center placeholder:text-gray-600 uppercase tracking-widest"
                        />
                        {quickTeam && ![...TEAMS, "FWC", "CC"].includes(quickTeam) && quickTeam.length <= 4 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-dark-bg border border-white/5 rounded-lg shadow-2xl z-50 p-2 text-[10px] text-gray-500 text-center">
                            {t('album.valid_codes_hint')}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setQuickTeam("")}
                        disabled={!quickTeam}
                        className="bg-white/5 hover:bg-fifa-red/20 px-3 py-3 rounded-lg border border-white/10 hover:border-fifa-red/30 transition-all disabled:opacity-0"
                        title="Borrar código"
                      >
                        <X size={20} className="text-gray-400 group-hover:text-fifa-red" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Number Grid Selector */}
                <AnimatePresence>
                  {quickTeam && [...TEAMS, "FWC", "CC"].includes(quickTeam) && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white/5 border border-fifa-gold/30 p-6 rounded-2xl shadow-xl space-y-4"
                    >
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-bold text-fifa-gold uppercase tracking-tighter flex items-center gap-2">
                          <Check size={14} /> {t('album.select_numbers_for', { team: quickTeam })}
                        </span>
                        <button onClick={() => setQuickTeam("")} className="text-gray-500 hover:text-white">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-3">
                        {(quickTeam === "FWC" ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] : 
                          quickTeam === "CC" ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] : 
                          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]).map((num) => {
                          
                          const code = quickTeam === "FWC" 
                            ? (num === 0 ? "FWC" : `FWC${num}`)
                            : `${quickTeam}${num}`;
                          
                          const item = inventory[code];
                          const status = item?.status || 'missing';

                          return (
                            <motion.button
                              key={num}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleQuickAdd(num.toString())}
                              className={`h-14 sm:h-12 rounded-xl font-display font-bold text-base transition-all border-2 flex items-center justify-center relative overflow-hidden ${
                                status === 'repeated' ? 'bg-fifa-red border-fifa-red text-white shadow-[0_0_15px_rgba(145,2,45,0.3)]' : 
                                status === 'obtained' ? 'bg-fifa-gold border-fifa-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 
                                'bg-white/5 text-white border-white/10 hover:border-fifa-gold/50'
                              }`}
                            >
                              {num === 0 && quickTeam === "FWC" ? "00" : num}
                              {status !== 'missing' && (
                                <div className="absolute top-1 right-1">
                                  <Check size={8} />
                                </div>
                              )}
                              {item?.count > 1 && (
                                <div className="absolute bottom-1 right-1 bg-black/30 rounded px-1 text-[8px]">
                                  x{item.count}
                                </div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-gray-500 italic text-center pt-2 border-t border-white/5">
                        {t('album.instructions')}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            {!activeAlbum ? (
              <div className="text-center py-20">
                <AlbumIcon className="mx-auto w-16 h-16 text-white/10 mb-4" />
                <h3 className="text-xl font-bold mb-2">{t('album.no_active_albums')}</h3>
                <p className="text-gray-500 mb-8">{t('album.create_first_tip')}</p>
                <button 
                  onClick={handleCreateAlbum}
                  className="px-8 py-3 bg-fifa-gold text-black font-bold rounded-xl hover:scale-105 transition-all"
                >
                  {t('album.create_button')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {(normalize(searchQuery) === "" || 
                  normalize(t('teams.FWC')).includes(normalize(searchQuery)) ||
                  SPECIALS.some(c => normalize(c).includes(normalize(searchQuery)))
                ) && (
                  <Section 
                    title="FWC" 
                    codes={SPECIALS} 
                    inventory={inventory} 
                    onUpdate={handleUpdateSticker}
                    searchQuery={searchQuery}
                  />
                )}
                
                {TEAMS.filter(team => {
                  const query = normalize(searchQuery);
                  const teamInfo = TEAM_DETAILS[team];
                  const fullName = teamInfo ? teamInfo.name : "";
                  const teamCodes = Array.from({ length: 20 }, (_, i) => `${team}${i + 1}`);
                  return query === "" || 
                    normalize(team).includes(query) ||
                    normalize(fullName).includes(query) ||
                    teamCodes.some(c => normalize(c).includes(query));
                }).map(team => (
                  <Section 
                    key={team}
                    title={team} 
                    codes={Array.from({ length: 20 }, (_, i) => `${team}${i + 1}`)} 
                    inventory={inventory} 
                    onUpdate={handleUpdateSticker}
                    searchQuery={searchQuery}
                  />
                ))}

                {(normalize(searchQuery) === "" || 
                  normalize(t('teams.CC')).includes(normalize(searchQuery)) ||
                  COCA_COLA.some(c => normalize(c).includes(normalize(searchQuery)))
                ) && (
                  <Section 
                    title="CC" 
                    codes={COCA_COLA} 
                    inventory={inventory} 
                    onUpdate={handleUpdateSticker}
                    searchQuery={searchQuery}
                  />
                )}
              </div>
            )}
          </>
        )}

        {view === 'stats' && <StatsTab inventory={inventory} isPremium={isPremium} onUpgrade={() => setShowPremiumModal(true)} />}

        {view === 'community' && (
          <CommunityView 
            currentUser={user} 
            userInventory={inventory} 
            activeAlbum={activeAlbum} 
          />
        )}
      </main>

      <PremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={handleUpgrade}
        loading={upgrading}
      />

      {/* Footer Nav for Mobile */}
      <nav className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-3xl border border-white/10 rounded-full px-6 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-8 text-gray-400 z-[100]">
        <button 
          onClick={() => setView('collection')}
          className={`flex flex-col items-center gap-1 ${view === 'collection' ? 'text-fifa-gold' : ''}`}
        >
          <AlbumIcon size={24} />
          <span className="text-[8px] font-bold uppercase">{t('nav.album')}</span>
        </button>
        <button 
          onClick={() => setView('stats')}
          className={`flex flex-col items-center gap-1 ${view === 'stats' ? 'text-fifa-gold' : ''}`}
        >
          <BarChart3 size={24} />
          <span className="text-[8px] font-bold uppercase">{t('nav.stats')}</span>
        </button>
        <button 
          onClick={() => isOnline && setView('community')}
          className={`relative flex flex-col items-center gap-1 ${view === 'community' ? 'text-fifa-gold' : ''} ${!isOnline ? 'opacity-30 grayscale' : ''}`}
        >
          <Users size={24} />
          {pendingMessages.length > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-fifa-red text-white text-[10px] flex items-center justify-center rounded-full border-2 border-dark-bg">
              {pendingMessages.length}
            </span>
          )}
          <span className="text-[8px] font-bold uppercase">{t('nav.bazar')}</span>
        </button>
        <button 
          onClick={loadRanking} 
          disabled={!isOnline}
          className={`flex flex-col items-center gap-1 ${!isOnline ? 'opacity-30 grayscale' : ''}`}
        >
          <TrendingUp size={24} />
          <span className="text-[8px] font-bold uppercase">{t('nav.ranking')}</span>
        </button>
      </nav>

      {/* Ranking Modal */}
      <AnimatePresence>
        {showRanking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-dark-bg border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-2xl font-display font-bold text-fifa-gold flex items-center gap-2">
                  <Trophy size={24} /> {t('ranking.title')}
                </h3>
                <button onClick={() => setShowRanking(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                  {loadingRanking ? (
                    <div className="py-12 text-center text-gray-500">
                      <div className="w-8 h-8 border-2 border-fifa-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p>{t('ranking.loading')}</p>
                    </div>
                  ) : ranking.length > 0 ? (
                    <>
                      {/* Podium View */}
                      <div className="flex items-end justify-center gap-2 mb-8 h-48 px-2 pt-4">
                        {/* 2nd Place */}
                        {ranking[1] && (
                          <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex-1 flex flex-col items-center"
                          >
                            <div className="relative mb-2">
                              <div className="w-14 h-14 rounded-full border-2 border-gray-400 p-0.5 overflow-hidden bg-white/5">
                                {ranking[1].photoURL ? (
                                  <img src={ranking[1].photoURL} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{ranking[1].displayName?.[0]}</div>
                                )}
                              </div>
                              <div className="absolute -top-2 -right-2 bg-gray-400 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-dark-bg">2</div>
                            </div>
                            <div className="w-full bg-white/10 h-16 rounded-t-xl flex flex-col items-center justify-start p-2 border-x border-t border-white/10">
                              <p className="text-[10px] font-bold text-white truncate w-full text-center">{ranking[1].displayName}</p>
                              <p className="text-[10px] font-bold text-fifa-gold">{ranking[1].stats?.completionPercentage}%</p>
                            </div>
                          </motion.div>
                        )}
                        
                        {/* 1st Place */}
                        {ranking[0] && (
                          <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="flex-1 flex flex-col items-center z-10"
                          >
                            <div className="relative mb-3 scale-125">
                              <div className="w-16 h-16 rounded-full border-2 border-fifa-gold p-0.5 overflow-hidden bg-fifa-gold/10">
                                {ranking[0].photoURL ? (
                                  <img src={ranking[0].photoURL} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-fifa-gold">{ranking[0].displayName?.[0]}</div>
                                )}
                              </div>
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <Trophy size={16} className="text-fifa-gold drop-shadow-lg" />
                              </div>
                              <div className="absolute -top-2 -right-2 bg-fifa-gold text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-dark-bg">1</div>
                            </div>
                            <div className="w-full bg-fifa-gold/20 h-24 rounded-t-xl flex flex-col items-center justify-start p-2 border-x border-t border-fifa-gold/30 shadow-[0_-10px_20px_rgba(212,175,55,0.1)]">
                              <p className="text-[10px] font-bold text-white truncate w-full text-center">{ranking[0].displayName}</p>
                              <p className="text-[10px] font-bold text-fifa-gold">{ranking[0].stats?.completionPercentage}%</p>
                            </div>
                          </motion.div>
                        )}

                        {/* 3rd Place */}
                        {ranking[2] && (
                          <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex-1 flex flex-col items-center"
                          >
                            <div className="relative mb-2">
                              <div className="w-14 h-14 rounded-full border-2 border-amber-700 p-0.5 overflow-hidden bg-white/5">
                                {ranking[2].photoURL ? (
                                  <img src={ranking[2].photoURL} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-amber-700">{ranking[2].displayName?.[0]}</div>
                                )}
                              </div>
                              <div className="absolute -top-2 -right-2 bg-amber-700 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-dark-bg">3</div>
                            </div>
                            <div className="w-full bg-white/5 h-12 rounded-t-xl flex flex-col items-center justify-start p-2 border-x border-t border-white/10">
                              <p className="text-[10px] font-bold text-white truncate w-full text-center">{ranking[2].displayName}</p>
                              <p className="text-[10px] font-bold text-fifa-gold">{ranking[2].stats?.completionPercentage}%</p>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Full List */}
                      <div className="space-y-3 pt-4 border-t border-white/5">
                        {ranking.map((entry, index) => (
                          <motion.div 
                            key={entry.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(index * 0.05, 1) }}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${entry.id === user?.uid ? 'bg-fifa-gold/10 border-fifa-gold shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                          >
                            <div className="flex items-center gap-4">
                              <span className={`w-8 text-center font-display font-bold text-xl ${index < 3 ? 'text-fifa-gold' : 'text-gray-500'}`}>#{index + 1}</span>
                              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                {entry.photoURL ? <img src={entry.photoURL} className="w-full h-full object-cover" alt="" /> : <span className="font-bold text-fifa-gold">{entry.displayName?.[0]}</span>}
                              </div>
                              <div>
                                <p className="font-bold text-sm flex items-center gap-2">
                                  {entry.displayName}
                                  {entry.badges?.includes('leyenda') && <Medal size={12} className="text-fifa-gold" title="Leyenda" />}
                                </p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{entry.stats?.completedSwaps || 0} {t('ranking.swaps_count')}</p>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end min-w-[80px]">
                              <p className="text-lg font-display font-bold text-white leading-none mb-1">{entry.stats?.completionPercentage || 0}%</p>
                              <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${entry.stats?.completionPercentage || 0}%` }}
                                  className={`h-full ${index < 3 ? 'bg-fifa-gold' : 'bg-white/20'}`} 
                                />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      <TrendingUp size={32} className="mx-auto mb-2 opacity-20" />
                      <p>{t('ranking.empty')}</p>
                      <button 
                        onClick={loadRanking}
                        className="mt-4 text-fifa-gold text-xs font-bold uppercase tracking-widest hover:underline"
                      >
                        {t('ranking.update')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-white/5 border-t border-white/5">
                <p className="text-[10px] text-gray-500 text-center uppercase tracking-[0.2em] font-bold italic">
                  {t('ranking.footer_tip')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Modal for Google Users */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-bg w-full max-w-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-fifa-gold/5">
                <h3 className="text-xl font-display font-bold flex items-center gap-2">
                  <Key className="text-fifa-gold" /> {t('auth.new_password')}
                </h3>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-400">
                  {t('auth.password_hint')}
                </p>

                {passwordError && (
                  <div className="bg-fifa-red/10 border border-fifa-red/30 p-4 rounded-xl flex items-start gap-3">
                    <X className="text-fifa-red shrink-0" size={18} />
                    <p className="text-xs text-fifa-red font-medium">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="text-green-500 shrink-0" size={18} />
                    <p className="text-xs text-green-500 font-medium">{t('auth.password_success')}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">{t('auth.new_password')}</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input 
                        type="password"
                        placeholder={t('auth.password_min_length')}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-fifa-gold transition-all text-sm text-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleUpdatePassword}
                  disabled={updatingPassword || !newPassword || passwordSuccess}
                  className="w-full bg-fifa-gold text-dark-bg font-black py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {updatingPassword ? (
                    <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>{t('auth.update_password')}</>
                  )}
                </button>

                <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest font-bold">
                  {t('auth.reauth_msg')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
