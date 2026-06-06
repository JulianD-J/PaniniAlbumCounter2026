import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BillingPlugin } from 'capacitor-billing';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
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
import { InvertedModeModal } from './components/InvertedModeModal';
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
  Repeat,
  AlertTriangle,
  Download,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Trash2,
  Edit3,
  Sun,
  Moon,
  Globe
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
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
import { RPGProgressWidget } from './components/RPGProgressWidget';

export const hapticFeedback = async (style = ImpactStyle.Light) => {
  try {
    await Haptics.impact({ style });
  } catch (e) {
    // Fallback for web if it was being used, but Capacitor is preferred
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  }
};

const TEAM_FLAGS: Record<string, string> = {
  USA: "us", MEX: "mx", CAN: "ca", ARG: "ar", BRA: "br", ENG: "gb-eng", FRA: "fr", GER: "de", 
  ITA: "it", ESP: "es", POR: "pt", NED: "nl", BEL: "be", CRO: "hr", URU: "uy", COL: "co",
  MAR: "ma", SEN: "sn", JPN: "jp", KOR: "kr", AUS: "au", KSA: "sa", EGY: "eg", NGA: "ng",
  CMR: "cm", GHA: "gh", TUN: "tn", ECU: "ec", PER: "pe", CHI: "cl", PAR: "py", CRC: "cr",
  PAN: "pa", JAM: "jm", SRB: "rs", SUI: "ch", DEN: "dk", POL: "pl", SWE: "se", NOR: "no",
  CZE: "cz", TUR: "tr", GRE: "gr", UKR: "ua", AUT: "at", SCO: "gb-sct", WAL: "gb-wls", RSA: "za",
  BIH: "ba", QAT: "qa", HAI: "ht", CUW: "cw", CIV: "ci", IRN: "ir", NZL: "nz", CPV: "cv",
  IRQ: "iq", ALG: "dz", JOR: "jo", COD: "cd", UZB: "uz"
};

const REGIONS: Record<string, string[]> = {
  "Americas": ["MEX", "CAN", "USA", "BRA", "ARG", "COL", "URU", "ECU", "PAR", "PAN", "HAI", "CUW"],
  "Europe": ["ENG", "GER", "ESP", "FRA", "ITA", "POR", "NED", "CRO", "BEL", "SUI", "DEN", "POL", "SWE", "NOR", "CZE", "TUR", "GRE", "UKR", "AUT", "SCO", "WAL", "BIH", "SRB"],
  "Africa": ["MAR", "SEN", "EGY", "NGA", "CMR", "GHA", "TUN", "RSA", "CIV", "CPV", "ALG", "COD"],
  "Asia / Oceania": ["JPN", "KOR", "AUS", "KSA", "QAT", "IRN", "IRQ", "JOR", "UZB", "NZL"]
};

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;
    
    const duration = 1000;
    const startTime = performance.now();
    
    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (outQuart)
      const ease = 1 - Math.pow(1 - progress, 4);
      
      const current = Math.floor(start + (end - start) * ease);
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayValue(end);
      }
    };
    
    requestAnimationFrame(update);
  }, [value]);
  
  return <>{displayValue}</>;
}

function isTrialActive(profile: any) {
  if (!profile?.trialStartDate) return false;
  const start = new Date(profile.trialStartDate).getTime();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return (now - start) < sevenDays;
}

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
    <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        className={`h-full relative transition-all duration-1000 ${color === 'bg-fifa-gold' && percentage === 100 ? 'bg-green-500' : color}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" style={{ animationDuration: '2s' }} />
      </motion.div>
    </div>
  );
};

const OfflinePremiumAlert = ({ isOpen, onClose, onUpgrade }: { isOpen: boolean, onClose: () => void, onUpgrade: () => void }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 20 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-lg"
    >
      <div className="bg-dark-card border border-blue-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
          <WifiOff className="text-blue-400" size={24} />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-bold text-sm">{t('album.premium_offline_exclusive_title')}</h4>
          <p className="text-gray-400 text-xs">{t('album.premium_offline_exclusive_desc')}</p>
        </div>
        <div className="flex flex-col gap-2">
          <button 
            onClick={onUpgrade}
            className="px-3 py-1.5 bg-blue-500 text-white text-[10px] font-black rounded-lg uppercase tracking-tighter"
          >
            {t('album.premium_button')}
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const PremiumModal = ({ 
  isOpen, 
  onClose, 
  onUpgrade, 
  onRestore,
  loading,
  profile,
  user,
  onLink,
  onClaim
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onUpgrade: () => void, 
  onRestore: () => void,
  loading: boolean,
  profile: any,
  user: User | null,
  onLink: () => Promise<void>,
  onClaim: () => Promise<void>
}) => {
  const { t } = useTranslation();
  const [linking, setLinking] = useState(false);
  const [claiming, setClaiming] = useState(false);

  if (!isOpen) return null;

  const trialActive = isTrialActive(profile);
  const trialUsed = profile?.trialUsed;
  
  // Check if current user is logged in with Google or has linked Google
  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com');

  const handleLink = async () => {
    setLinking(true);
    await onLink();
    setLinking(false);
  };

  const handleClaim = async () => {
    setClaiming(true);
    await onClaim();
    setClaiming(false);
  };

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
          className="relative w-full max-w-md bg-dark-card border border-fifa-gold/30 rounded-3xl overflow-hidden shadow-2xl shadow-fifa-gold/20 flex flex-col max-h-[95vh]"
        >
          {/* Header Image/Gradient */}
          <div className="h-28 shrink-0 bg-gradient-to-br from-fifa-gold to-fifa-gold-light p-6 flex flex-col justify-end">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10">
              <X size={20} className="text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black/20 rounded-xl backdrop-blur-md">
                <Diamond className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-display font-bold text-black leading-tight">
                {t('album.premium_modal_title')}
              </h2>
            </div>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.1 } }
              }}
              className="space-y-4"
            >
              {[
                { icon: WifiOff, text: t('album.premium_modal_feature_offline'), color: "text-blue-400" },
                { icon: BarChart3, text: t('album.premium_modal_feature_stats'), color: "text-fifa-gold" },
                { icon: Download, text: t('album.premium_modal_feature_export'), color: "text-orange-400" },
                { icon: Repeat, text: t('album.premium_modal_feature_transfer'), color: "text-purple-400" },
                { icon: Star, text: t('album.premium_modal_feature_creator'), color: "text-red-400" },
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  variants={{
                    hidden: { x: -20, opacity: 0 },
                    visible: { x: 0, opacity: 1 }
                  }}
                  className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all hover:translate-x-1"
                >
                  <div className={`w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center ${feature.color}`}>
                    <feature.icon size={20} />
                  </div>
                  <span className="text-sm font-bold text-gray-300">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Trial Section */}
            {!profile?.isPremium && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-white/5 to-transparent rounded-[2.5rem] p-6 border border-fifa-gold/20 space-y-4 relative overflow-hidden group shadow-2xl shadow-black/40"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-fifa-gold/10 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-fifa-gold/20 transition-all duration-700" />
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-display font-black text-fifa-gold uppercase tracking-[0.2em]">{t('album.trial_title')}</h3>
                  {trialActive && (
                    <div className="flex items-center gap-1.5 bg-green-500/20 text-green-500 px-3 py-1 rounded-full border border-green-500/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-black tracking-widest">ACTIVE</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-medium">{t('album.trial_desc')}</p>
                
                {!trialUsed ? (
                  <div className="flex flex-col gap-3">
                    {!isGoogleUser ? (
                      <button 
                        onClick={handleLink}
                        disabled={linking}
                        className="w-full bg-white text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/20"
                      >
                        {linking ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />}
                        {t('album.trial_link_button')}
                      </button>
                    ) : (
                      <button 
                        onClick={handleClaim}
                        disabled={claiming}
                        className="w-full bg-fifa-gold text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-fifa-gold/30"
                      >
                        {claiming ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <ShieldCheck size={18} />}
                        {t('album.trial_claim_button')}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="py-4 bg-black/20 rounded-2xl border border-white/5 text-center">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{t('album.trial_used_msg')}</p>
                  </div>
                )}
              </motion.div>
            )}

            <div className="pt-2 border-t border-white/5 text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">
                {t('album.premium_modal_disclaimer')}
              </p>
              <button 
                onClick={onUpgrade}
                disabled={loading}
                className="w-full group relative bg-fifa-gold text-black font-black py-5 rounded-[2rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_15px_35px_rgba(212,175,55,0.2)] flex items-center justify-center gap-3 disabled:opacity-50 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {loading ? (
                  <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Diamond size={24} className="group-hover:rotate-12 transition-transform" />
                    <span className="text-lg uppercase tracking-tight">
                      {t('album.premium_upgrade_button', { price: t('album.premium_price') })}
                    </span>
                  </>
                )}
              </button>

              <button 
                onClick={onRestore}
                disabled={loading}
                className="w-full mt-4 text-[10px] font-bold text-gray-500 hover:text-fifa-gold transition-colors uppercase tracking-[0.2em]"
              >
                {t('album.premium_restore_button')}
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
            className="w-full relative group bg-fifa-gold text-black font-black py-4 rounded-xl hover:scale-[1.05] active:scale-[0.98] transition-all shadow-[0_10px_25px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <ShieldCheck size={20} className="group-hover:scale-110 transition-transform" />
            <span className="uppercase tracking-tight">
              {t('album.premium_upgrade_button', { price: t('album.premium_price') })}
            </span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

const TransferModal = ({ 
  isOpen, 
  onClose, 
  albums, 
  activeAlbumId, 
  code, 
  onTransfer,
  loading
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  albums: any[], 
  activeAlbumId: string, 
  code: string | null, 
  onTransfer: (targetAlbumId: string) => void,
  loading: boolean
}) => {
  const { t } = useTranslation();
  if (!isOpen || !code) return null;

  const otherAlbums = albums.filter(a => a.id !== activeAlbumId);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ scale: 0.9, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 40, opacity: 0 }}
        className="relative w-full max-w-sm bg-dark-card border border-purple-500/30 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/30">
              <Repeat className="text-purple-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white tracking-tight">{t('album.transfer_title')}</h2>
              <p className="text-[10px] text-purple-400 font-mono tracking-widest uppercase opacity-60">Sticker {code}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full"><X size={20}/></button>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-gray-400 px-2">{t('album.transfer_select')}</p>
          {otherAlbums.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">{t('album.no_other_albums') || 'No other albums found'}</p>
          ) : (
            otherAlbums.map(album => (
              <button
                key={album.id}
                onClick={() => onTransfer(album.id)}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 rounded-2xl transition-all group active:scale-95 disabled:opacity-50"
              >
                <span className="font-bold text-white group-hover:text-purple-400 transition-colors">{album.name}</span>
                <ArrowRight size={18} className="text-gray-600 group-hover:translate-x-1 transition-all" />
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

const TEAM_EMOJIS: Record<string, string> = {
  USA: "🇺🇸", MEX: "🇲🇽", CAN: "🇨🇦", ARG: "🇦🇷", BRA: "🇧🇷", ENG: "🏴", FRA: "🇫🇷", GER: "🇩🇪", 
  ITA: "🇮🇹", ESP: "🇪🇸", PORT: "🇵🇹", POR: "🇵🇹", NED: "🇳🇱", BEL: "🇧🇪", CRO: "🇭🇷", URU: "🇺🇾", COL: "🇨🇴",
  MAR: "🇲🇦", SEN: "🇸🇳", JPN: "🇯🇵", KOR: "🇰🇷", AUS: "🇦🇺", KSA: "🇸🇦", EGY: "🇪🇬", NGA: "🇳🇬",
  CMR: "🇨🇲", GHA: "🇬🇭", TUN: "🇹🇳", ECU: "🇪🇨", PER: "🇵🇪", CHI: "🇨🇱", PAR: "🇵🇾", CRC: "🇨🇷",
  PAN: "🇵🇦", JAM: "🇯🇲", SRB: "🇷🇸", SUI: "🇨🇭", DEN: "🇩🇰", POL: "🇵🇱", SWE: "🇸🇪", NOR: "🇳🇴",
  CZE: "🇨🇿", TUR: "🇹🇷", GRE: "🇬🇷", UKR: "🇺🇦", AUT: "🇦🇹", SCO: "🏴", WAL: "🏴", RSA: "🇿🇦",
  BIH: "🇧🇦", QAT: "🇶🇦", HAI: "🇭🇹", CUW: "🇨🇼", CIV: "🇨🇮", IRN: "🇮🇷", NZL: "🇳🇿", CPV: "🇨🇻",
  IRQ: "🇮🇶", ALG: "🇩🇿", JOR: "🇯🇴", COD: "🇨🇩", UZB: "🇺🇿", CC: "🥤"
};

const ExportActions = ({ 
  inventory, 
  isPremium, 
  onUpgradeRequest, 
  userName, 
  totalStats,
  profile,
  onExportPerformed,
  activeAlbum
}: { 
  inventory: any, 
  isPremium: boolean, 
  onUpgradeRequest: () => void, 
  userName: string, 
  totalStats: any,
  profile: any,
  onExportPerformed: (type: string) => Promise<boolean>,
  activeAlbum?: any
}) => {
  const { t, i18n } = useTranslation();
  const [exporting, setExporting] = useState<string | null>(null);

  const removeAccents = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[ñÑ]/g, c => c === 'ñ' ? 'n' : 'N');
  };

  const printRef = useRef<HTMLDivElement>(null);

  const trialActive = isTrialActive(profile);
  const trialExportCount = profile?.trialExportCount || 0;
  const isTrialLimitReached = trialActive && trialExportCount >= 10;

  const albumCC = useMemo(() => {
    const count = activeAlbum?.cocaColaCount !== undefined ? activeAlbum.cocaColaCount : 14;
    if (!count || count === 0) return [];
    return Array.from({ length: count }, (_, i) => `CC${i + 1}`);
  }, [activeAlbum]);

  const getFWCCat = (code: string) => {
    const num = parseInt(code.replace('FWC', '')) || 0;
    if (num <= 5) return { cat: '🏆', val: num === 0 ? '00' : num };
    if (num <= 8) return { cat: '🌎', val: num };
    return { cat: '📜', val: num };
  };

  const getMissingData = () => {
    const missing: { name: string, codes: number[] }[] = [];
    
    // Group specials
    const missingSpecials = SPECIALS.filter(c => !inventory[c] || inventory[c].status === 'missing')
      .map(c => parseInt(c.replace('FWC', '')) || 0);
    if (missingSpecials.length > 0) {
      missing.push({ name: t('teams.FWC'), codes: missingSpecials.sort((a, b) => a - b) });
    }

    // Group teams
    TEAMS.forEach(team => {
      const teamMissing: number[] = [];
      for (let i = 1; i <= 20; i++) {
        const c = `${team}${i}`;
        if (!inventory[c] || inventory[c].status === 'missing') {
          teamMissing.push(i);
        }
      }
      if (teamMissing.length > 0) {
        const teamName = TEAM_DETAILS[team] ? t(`teams.${TEAM_DETAILS[team].code}`) : team;
        missing.push({ name: teamName, codes: teamMissing.sort((a, b) => a - b) });
      }
    });

    // Group Coca-Cola
    const missingCC = albumCC.filter(c => !inventory[c] || inventory[c].status === 'missing')
      .map(c => parseInt(c.replace('CC', '')) || 0);
    if (missingCC.length > 0) {
      missing.push({ name: t('teams.CC'), codes: missingCC.sort((a, b) => a - b) });
    }

    return missing;
  };

  const handleExportCSV = async () => {
    const isSpanish = i18n.language.startsWith('es');
    const missingData = getMissingData();
    
    const fields = isSpanish 
      ? ["Pais / Seleccion", "Barajitas Faltantes"] 
      : ["Country/Team", "Missing Stickers"];

    const rows = missingData.map(item => {
      let name = item.name;
      let missingText = isSpanish
        ? `${item.codes.join(' ')} (faltantes)`
        : `${item.codes.join(' ')} (missing)`;
      
      if (isSpanish) {
        name = removeAccents(name);
        missingText = removeAccents(missingText);
      }
      return [name, missingText];
    });

    const csv = Papa.unparse({
      fields: fields,
      data: rows
    });
    
    if (Capacitor.isNativePlatform()) {
      const filename = `Album2026_Missing_${userName?.replace(/\s+/g, '_') || 'collector'}.csv`;
      try {
        await Filesystem.writeFile({
          path: filename,
          data: csv,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        alert(isSpanish 
          ? `Archivo CSV guardado exitosamente en tus Documentos como: ${filename}` 
          : `CSV file successfully saved in your Documents folder as: ${filename}`
        );
      } catch (error: any) {
        console.error("Error saving CSV to Documents", error);
        alert(isSpanish
          ? `Error al guardar archivo: ${error.message || error}`
          : `Error saving file: ${error.message || error}`
        );
      }
    } else {
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Album2026_Missing_${userName?.replace(/\s+/g, '_') || 'collector'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportPDF = async () => {
    const isSpanish = i18n.language.startsWith('es');
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`ColeCollect - ${userName}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`${t('stats.progress')}: ${Math.round((totalStats.obtained / totalStats.total) * 100)}% (${totalStats.obtained}/${totalStats.total})`, 14, 30);
    
    const missingData = getMissingData();
    const rows = missingData.map(item => [item.name, `${item.codes.join(' ')} (faltantes)`]);

    autoTable(doc, {
      head: [['Country / Team', 'Missing Stickers']],
      body: rows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      }
    });

    if (Capacitor.isNativePlatform()) {
      const filename = `Album2026_Missing_${userName?.replace(/\s+/g, '_') || 'collector'}.pdf`;
      try {
        const pdfOutput = doc.output('datauristring');
        const base64Data = pdfOutput.split(';base64,')[1];
        
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        });
        
        await Share.share({
          title: isSpanish ? 'Compartir PDF de Faltantes' : 'Share Missing Stickers PDF',
          text: isSpanish ? 'Aquí tienes mi lista de estampas faltantes de ColeCollect.' : 'Here is my list of missing stickers from ColeCollect.',
          url: result.uri,
          dialogTitle: isSpanish ? 'Compartir con...' : 'Share with...'
        });
      } catch (error: any) {
        console.error("Error sharing PDF natively", error);
        alert(isSpanish
          ? `Error al compartir PDF: ${error.message || error}`
          : `Error sharing PDF: ${error.message || error}`
        );
      }
    } else {
      doc.save(`Album2026_Missing_${userName?.replace(/\s+/g, '_') || 'collector'}.pdf`);
    }
  };

  const handleExportText = async () => {
    let text = `ColeCollect- Lista\n`;
    text += `${activeAlbum?.name || 'Álbum Mundial 2026'}\n\n`;

    // --- Me Faltan ---
    text += `Me faltan\n`;

    // FWC Specials
    const fwcMissingMap: Record<string, number[]> = {
      '🏆': [],
      '🌎': [],
      '📜': []
    };

    SPECIALS.forEach(c => {
      const isMissing = !inventory[c] || inventory[c].status === 'missing';
      if (isMissing) {
        const { cat, val } = getFWCCat(c);
        fwcMissingMap[cat].push(typeof val === 'string' ? 0 : val);
      }
    });

    ['🏆', '🌎', '📜'].forEach(emoji => {
      const arr = fwcMissingMap[emoji];
      if (arr.length > 0) {
        arr.sort((a, b) => a - b);
        const strValues = arr.map(v => v === 0 ? '00' : String(v)).join(', ');
        text += `FWC ${emoji}: ${strValues}\n`;
      }
    });

    // TEAMS
    TEAMS.forEach(team => {
      const missingNums: number[] = [];
      for (let i = 1; i <= 20; i++) {
        const c = `${team}${i}`;
        if (!inventory[c] || inventory[c].status === 'missing') {
          missingNums.push(i);
        }
      }
      if (missingNums.length > 0) {
        const flag = TEAM_EMOJIS[team] || '';
        text += `${team} ${flag}: ${missingNums.sort((a, b) => a - b).join(', ')}\n`;
      }
    });

    // COCA COLA
    const ccMissing: number[] = [];
    albumCC.forEach(c => {
      if (!inventory[c] || inventory[c].status === 'missing') {
        const num = parseInt(c.replace('CC', '')) || 0;
        ccMissing.push(num);
      }
    });
    if (ccMissing.length > 0) {
      text += `CC 🥤: ${ccMissing.sort((a, b) => a - b).join(', ')}\n`;
    }

    text += `\n`;

    // --- Repetidas ---
    text += `Repetidas\n`;

    // FWC Specials repeated
    const fwcRepeatedMap: Record<string, string[]> = {
      '🏆': [],
      '🌎': [],
      '📜': []
    };

    SPECIALS.forEach(c => {
      const isRepeated = inventory[c]?.status === 'repeated';
      if (isRepeated) {
        const { cat, val } = getFWCCat(c);
        const count = inventory[c].count || 2;
        const repeats = Math.max(1, count - 1);
        for (let r = 0; r < repeats; r++) {
          fwcRepeatedMap[cat].push(String(val));
        }
      }
    });

    ['🏆', '🌎', '📜'].forEach(emoji => {
      const arr = fwcRepeatedMap[emoji];
      if (arr.length > 0) {
        arr.sort((a, b) => {
          const valA = a === '00' ? 0 : parseInt(a);
          const valB = b === '00' ? 0 : parseInt(b);
          return valA - valB;
        });
        text += `FWC ${emoji}: ${arr.join(', ')}\n`;
      }
    });

    // TEAMS repeated
    TEAMS.forEach(team => {
      const repeatedNums: number[] = [];
      for (let i = 1; i <= 20; i++) {
        const c = `${team}${i}`;
        if (inventory[c]?.status === 'repeated') {
          const count = inventory[c].count || 2;
          const repeats = Math.max(1, count - 1);
          for (let r = 0; r < repeats; r++) {
            repeatedNums.push(i);
          }
        }
      }
      if (repeatedNums.length > 0) {
        repeatedNums.sort((a, b) => a - b);
        const flag = TEAM_EMOJIS[team] || '';
        text += `${team} ${flag}: ${repeatedNums.join(', ')}\n`;
      }
    });

    // COCA COLA repeated
    const ccRepeated: number[] = [];
    albumCC.forEach(c => {
      if (inventory[c]?.status === 'repeated') {
        const num = parseInt(c.replace('CC', '')) || 0;
        const count = inventory[c].count || 2;
        const repeats = Math.max(1, count - 1);
        for (let r = 0; r < repeats; r++) {
          ccRepeated.push(num);
        }
      }
    });
    if (ccRepeated.length > 0) {
      text += `CC 🥤: ${ccRepeated.sort((a, b) => a - b).join(', ')}\n`;
    }

    text += `\nDescarga la app\nhttps://play.google.com/store/apps/details?id=com.colediverti.album2026\n`;

    const isSpanish = i18n.language.startsWith('es');
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: isSpanish ? 'Lista de Estampas de ColeCollect' : 'ColeCollect Sticker List',
          text: text,
          dialogTitle: isSpanish ? 'Compartir lista por...' : 'Share list via...'
        });
      } catch (error: any) {
        console.error("Error sharing text natively", error);
        navigator.clipboard.writeText(text).then(() => {
          alert(isSpanish ? '¡Copiado al portapapeles correctamente!' : 'Copied to clipboard successfully!');
        });
      }
    } else {
      navigator.clipboard.writeText(text).then(() => {
        alert(isSpanish ? '¡Copiado al portapapeles correctamente!' : 'Copied to clipboard successfully!');
      }).catch(err => {
        console.error('Failed to copy', err);
      });
    }
  };

  const handleExportImage = async () => {
    if (!printRef.current) return;
    setExporting('image');
    const isSpanish = i18n.language.startsWith('es');
    try {
      const canvas = await html2canvas(printRef.current, {
        backgroundColor: '#0a0a0b',
        scale: 2,
        logging: false,
        useCORS: true,
        onclone: (doc) => {
          // Safety net
        }
      });
      const image = canvas.toDataURL("image/png");
      if (Capacitor.isNativePlatform()) {
        const base64Data = image.split(';base64,')[1];
        const filename = `Album2026_${userName?.replace(/\s+/g, '_') || 'collector'}.png`;
        
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        });
        
        await Share.share({
          title: isSpanish ? 'Compartir Imagen de Álbum' : 'Share Album Image',
          text: isSpanish ? '¡Mira el progreso de mi álbum en ColeCollect!' : 'Look at my album progress on ColeCollect!',
          url: result.uri,
          dialogTitle: isSpanish ? 'Compartir con...' : 'Share with...'
        });
      } else {
        const link = document.createElement("a");
        link.href = image;
        link.download = `Album2026_${userName?.replace(/\s+/g, '_') || 'collector'}.png`;
        link.click();
      }
    } catch (e: any) {
      console.error(e);
      alert(isSpanish 
        ? `Error al exportar imagen: ${e.message || e}` 
        : `Error exporting image: ${e.message || e}`
      );
    } finally {
      setExporting(null);
    }
  };

  const wrapHandler = async (handler: () => void | Promise<void>, type: string) => {
    if (!isPremium && !trialActive) {
      onUpgradeRequest();
      return;
    }

    if (trialActive && !profile?.isPremium) {
      if (trialExportCount >= 10) {
        alert(t('album.trial_limit_reached'));
        onUpgradeRequest();
        return;
      }
      
      const success = await onExportPerformed(type);
      if (!success) return;
    }

    await handler();
  };

  const missingGroups = getMissingData();

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={() => wrapHandler(handleExportCSV, 'csv')}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-gray-300 hover:text-white transition-all group"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <FileSpreadsheet size={16} className="text-fifa-gold" />
          {t('album.export_csv')}
          {(!isPremium && !trialActive) && <Lock size={10} className="text-gray-600 ml-1" />}
        </button>
        <button 
          onClick={() => wrapHandler(handleExportPDF, 'pdf')}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-gray-300 hover:text-white transition-all group"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <FileText size={16} className="text-fifa-gold" />
          {t('album.export_pdf')}
          {(!isPremium && !trialActive) && <Lock size={10} className="text-gray-600 ml-1" />}
        </button>
        <button 
          onClick={() => wrapHandler(handleExportImage, 'image')}
          disabled={exporting === 'image'}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-gray-300 hover:text-white transition-all group disabled:opacity-50"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          {exporting === 'image' ? (
            <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          ) : (
            <ImageIcon size={16} style={{ color: '#D4AF37' }} />
          )}
          {t('album.export_image')}
          {(!isPremium && !trialActive) && <Lock size={10} className="text-gray-600 ml-1" />}
        </button>
        <button 
          onClick={() => wrapHandler(handleExportText, 'text')}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-gray-300 hover:text-white transition-all group"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <Copy size={16} className="text-fifa-gold" />
          {t('album.export_text')}
          {(!isPremium && !trialActive) && <Lock size={10} className="text-gray-600 ml-1" />}
        </button>
      </div>

      {trialActive && !profile?.isPremium && (
        <div className="w-full mt-[-8px] mb-4 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
            {t('album.trial_active', { days: 7 - Math.floor((Date.now() - new Date(profile.trialStartDate).getTime()) / (24 * 60 * 60 * 1000)) })}
          </span>
          <span className="text-[10px] font-bold text-gray-400">
            {t('album.trial_export_remaining', { count: trialExportCount })}
          </span>
        </div>
      )}

      {/* Hidden Export Template for Image - Using Hex Colors exclusively to avoid oklch issues */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
        <div ref={printRef} style={{ width: '600px', padding: '40px', backgroundColor: '#111111', color: '#ffffff', borderTop: '8px solid #D4AF37' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: 'bold', letterSpacing: '-1px', color: '#D4AF37', margin: 0 }}>ALBUM 2026</h1>
              <p style={{ color: '#999999', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', margin: '4px 0 0 0' }}>{userName}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>{Math.round((totalStats.obtained / totalStats.total) * 100)}%</p>
              <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>{t('stats.progress')}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#666666', textTransform: 'uppercase', marginBottom: '4px', margin: 0 }}>{t('album.obtained')}</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>{totalStats.obtained} / {totalStats.total}</p>
            </div>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#666666', textTransform: 'uppercase', marginBottom: '4px', margin: 0 }}>{t('stats.repeated')}</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#E10600', margin: 0 }}>{totalStats.repeated}</p>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '8px', marginBottom: '16px' }}>
              Missing Stickers by Team
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {missingGroups.map((group, idx) => (
                <div key={idx} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff', width: '140px', flexShrink: 0 }}>{group.name}:</span>
                  <span style={{ fontSize: '12px', color: '#aaaaaa', lineHeight: '1.4' }}>{group.codes.join(' ')}</span>
                </div>
              ))}
              {missingGroups.length === 0 && (
                <p style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: '#4ADE80', margin: '20px 0' }}>ALBUM COMPLETE! ⚽️🏆</p>
              )}
            </div>
          </div>
          
          <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: '#444444', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>GENERATED WITH ALBUM 2026 PRO COUNTER</p>
          </div>
        </div>
      </div>
    </>
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
  onUpdate,
  isPremium,
  onTransfer
}: { 
  code: string, 
  status?: StickerStatus, 
  count?: number,
  onUpdate: (code: string, status: StickerStatus, count: number) => void,
  isPremium?: boolean,
  onTransfer?: (code: string) => void,
  key?: string | number
}) => {
  const { t } = useTranslation();
  const currentStatus = status || 'missing';
  const currentCount = count || 0;
  const isSpecial = code.startsWith('FWC') || code.startsWith('CC');

  const cycleStatus = () => {
    hapticFeedback(ImpactStyle.Medium);
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
    hapticFeedback(ImpactStyle.Light);
    onUpdate(code, 'repeated', currentCount + 1);
  };

  const decrementCount = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback(ImpactStyle.Light);
    if (currentCount > 2) {
      onUpdate(code, 'repeated', currentCount - 1);
    } else if (currentCount === 2) {
      onUpdate(code, 'obtained', 1);
    }
  };

  const auraColor = currentStatus === 'obtained' 
    ? 'rgba(212, 175, 55, 0.4)' 
    : currentStatus === 'repeated' 
      ? 'rgba(225, 6, 0, 0.4)' 
      : 'transparent';

  return (
    <motion.div 
      layout
      onClick={cycleStatus}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        boxShadow: currentStatus !== 'missing' ? `0 0 20px -5px ${auraColor}` : 'none'
      }}
      className={`
        relative p-2 h-20 flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all border-2
        ${currentStatus === 'obtained' ? (isSpecial ? 'sticker-gold border-white/30 scale-105' : 'bg-fifa-gold border-fifa-gold text-black shadow-lg shadow-fifa-gold/20') : ''}
        ${currentStatus === 'repeated' && currentCount === 2 ? 'sticker-purple border-white/30 text-white shadow-lg shadow-purple-500/20' : ''}
        ${currentStatus === 'repeated' && currentCount > 2 ? 'sticker-blue border-white/30 text-white shadow-lg shadow-blue-500/20' : ''}
        ${currentStatus === 'missing' ? 'bg-white/5 border-white/5 hover:border-white/10 text-gray-500 shadow-inner' : ''}
      `}
    >
      <span className={`text-[10px] font-mono leading-none font-black tracking-tighter mb-1.5 ${currentStatus === 'missing' ? 'opacity-30' : 'opacity-90'}`}>{code}</span>
      
      {currentStatus === 'obtained' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle2 className={`w-5 h-5 ${isSpecial ? 'text-black' : 'text-black/70'}`} /></motion.div>}
      {currentStatus === 'repeated' && (
        <div className="flex flex-col items-center">
          <span className="text-lg font-display font-bold leading-none">{currentCount}</span>
          <div className="flex gap-2 mt-1">
            <button onClick={decrementCount} className="p-0.5 hover:bg-black/10 rounded"><MinusCircle size={12}/></button>
            {isPremium && onTransfer && (
              <button 
                onClick={(e) => { e.stopPropagation(); onTransfer(code); }} 
                className="p-0.5 hover:bg-black/10 rounded text-purple-400"
                title={t('album.transfer_title')}
              >
                <Repeat size={12}/>
              </button>
            )}
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
  searchQuery = "",
  filter = "all",
  isPremium,
  onTransfer
}: { 
    title: string, 
    codes: string[], 
    inventory: Record<string, any>,
    onUpdate: (code: string, status: StickerStatus, count: number) => void,
    searchQuery?: string,
    filter?: 'all' | 'repeated' | 'missing',
    isPremium?: boolean,
    onTransfer?: (code: string) => void,
    key?: string | number
  }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    
    const query = normalize(searchQuery);
    
    // Filter codes within section if searching or filtering
    const displayCodes = useMemo(() => {
      let filtered = codes;
      
      // Apply status filter
      if (filter === 'repeated') {
        filtered = filtered.filter(c => inventory[c]?.status === 'repeated');
      } else if (filter === 'missing') {
        filtered = filtered.filter(c => !inventory[c] || inventory[c].status === 'missing');
      }

      const sectionTitleNormalized = normalize(title);
      const teamInfo = TEAM_DETAILS[title];
      const teamFullNameTranslated = teamInfo ? t(`teams.${teamInfo.code}`) : title;
      const teamFullNameNormalized = normalize(teamFullNameTranslated);

      if (query === "" || sectionTitleNormalized.includes(query) || teamFullNameNormalized.includes(query)) return filtered;
      return filtered.filter(c => normalize(c).includes(query));
    }, [codes, query, title, t, filter, inventory]);

    // Automatically open if searching or filtering and has results
    useEffect(() => {
      if (query !== "" || filter !== 'all') {
        if (displayCodes.length > 0 && displayCodes.length < codes.length) {
          setIsOpen(true);
        }
      }
    }, [query, filter, displayCodes.length, codes.length]);
    
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
        onClick={() => {
          hapticFeedback(ImpactStyle.Light);
          setIsOpen(!isOpen);
        }}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5"
      >
        <div className="flex-1 mr-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {TEAM_FLAGS[title] && (
                <img 
                  src={`https://flagcdn.com/w40/${TEAM_FLAGS[title]}.png`} 
                  className="w-5 h-3.5 object-cover rounded shadow-sm opacity-80" 
                  alt="" 
                />
              )}
              <h3 className="font-display font-bold text-lg">
                {TEAM_DETAILS[title] ? t(`teams.${TEAM_DETAILS[title].code}`) : (title === "FWC" ? t('teams.FWC') : (title === "CC" ? t('teams.CC') : title))}
              </h3>
              {TEAM_DETAILS[title] && (
                <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-black rounded-md uppercase tracking-tighter">
                  {TEAM_DETAILS[title].code}
                </span>
              )}
            </div>
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
              className="grid grid-cols-3 min-[390px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2"
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
                    isPremium={isPremium}
                    onTransfer={onTransfer}
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

const StatsTab = ({ inventory, isPremium, onUpgrade, activeAlbum, includeCocaColaInStats = true }: { inventory: Record<string, any>, isPremium: boolean, onUpgrade: () => void, activeAlbum?: any, includeCocaColaInStats?: boolean }) => {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language.startsWith('es');

  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [teamSortBy, setTeamSortBy] = useState<"name" | "progress-desc" | "progress-asc" | "repeated-desc">("progress-desc");

  const [globalAppStats, setGlobalAppStats] = useState<{
    totalUsers: number;
    totalSwaps: number;
    averageCompletionPercent: number;
    topCollector: { name: string, percentage: number } | null;
  } | null>(null);
  const [loadingGlobalStats, setLoadingGlobalStats] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchGlobal = async () => {
      setLoadingGlobalStats(true);
      try {
        const res = await albumService.getGlobalAllAppStats();
        if (active && res) {
          setGlobalAppStats(res as any);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingGlobalStats(false);
      }
    };
    fetchGlobal();
    return () => {
      active = false;
    };
  }, []);

  const albumCC = useMemo(() => {
    const count = activeAlbum?.cocaColaCount !== undefined ? activeAlbum.cocaColaCount : 14;
    if (!count || count === 0) return [];
    return Array.from({ length: count }, (_, i) => `CC${i + 1}`);
  }, [activeAlbum]);

  const stats = useMemo(() => {
    const specialsTotal = SPECIALS.length;
    const teamsTotal = TEAMS.length * 20;
    const cocaColaTotal = includeCocaColaInStats ? albumCC.length : 0;
    const grandTotal = specialsTotal + teamsTotal + cocaColaTotal;

    let specialsObtained = 0;
    let teamsObtained = 0;
    let cocaColaObtained = 0;
    let repeatedTotal = 0;
    let uniqueObtained = 0;

    SPECIALS.forEach(c => {
      const isOk = inventory[c]?.status === 'obtained' || inventory[c]?.status === 'repeated';
      if (isOk) {
        specialsObtained++;
        uniqueObtained++;
      }
      if (inventory[c]?.status === 'repeated') {
        repeatedTotal += (inventory[c].count - 1);
      }
    });

    let completedTeamsCount = 0;
    const teamProgress = TEAMS.map(team => {
      let obtained = 0;
      let repeated = 0;
      for (let i = 1; i <= 20; i++) {
        const c = `${team}${i}`;
        const item = inventory[c];
        const isOk = item?.status === 'obtained' || item?.status === 'repeated';
        if (isOk) {
          obtained++;
          teamsObtained++;
          uniqueObtained++;
        }
        if (item?.status === 'repeated') {
          repeated += (item.count - 1);
          repeatedTotal += (item.count - 1);
        }
      }
      if (obtained === 20) {
        completedTeamsCount++;
      }
      const teamName = TEAM_DETAILS[team] ? t(`teams.${TEAM_DETAILS[team].code}`) : team;
      return { 
        team, 
        name: teamName, 
        obtained, 
        total: 20, 
        missing: 20 - obtained, 
        repeated, 
        percentage: Math.round((obtained / 20) * 100) 
      };
    });

    if (includeCocaColaInStats) {
      albumCC.forEach(c => {
        const isOk = inventory[c]?.status === 'obtained' || inventory[c]?.status === 'repeated';
        if (isOk) {
          cocaColaObtained++;
          uniqueObtained++;
        }
        if (inventory[c]?.status === 'repeated') {
          repeatedTotal += (inventory[c].count - 1);
        }
      });
    }

    const finalObtained = specialsObtained + teamsObtained + cocaColaObtained;
    const progressPercent = Math.round((finalObtained / grandTotal) * 100);

    const regionStats = Object.entries(REGIONS).map(([region, teams]) => {
      let obtained = 0;
      let total = teams.length * 20;
      teams.forEach(team => {
        for (let i = 1; i <= 20; i++) {
          const c = `${team}${i}`;
          if (inventory[c]?.status === 'obtained' || inventory[c]?.status === 'repeated') obtained++;
        }
      });
      return { name: region, obtained, total, percentage: Math.round((obtained / total) * 100) };
    });

    // Filtering out the nearest & top missing
    const topMissing = [...teamProgress].sort((a, b) => b.missing - a.missing).slice(0, 5);
    const nearestCompletion = [...teamProgress].filter(tp => tp.missing > 0).sort((a, b) => a.missing - b.missing).slice(0, 5);

    const groupData = [
      { name: t('teams.FWC'), obtained: specialsObtained, total: specialsTotal, color: '#D4AF37' },
      { name: t('nav.album'), obtained: teamsObtained, total: teamsTotal, color: '#91022D' },
    ];
    if (includeCocaColaInStats && cocaColaTotal > 0) {
      groupData.push({ name: t('teams.CC'), obtained: cocaColaObtained, total: cocaColaTotal, color: '#E10600' });
    }

    // Dynamic advice and smart statistics helpers
    const missingTotal = grandTotal - finalObtained;
    const idealPacks = Math.ceil(missingTotal / 5);
    
    // Statistical expectations using high-fidelity log estimator
    let randomPacks = 0;
    if (missingTotal > 0) {
      const harmonicSum = Math.log(grandTotal / missingTotal);
      randomPacks = Math.ceil((grandTotal * harmonicSum) / 5);
      if (randomPacks < idealPacks) {
        randomPacks = idealPacks;
      }
    }

    // Dynamic advice
    let adviceText = "";
    if (progressPercent < 25) {
      adviceText = isEs 
        ? "¡Excelente comienzo! Aún tienes un largo camino por recorrer. Enfócate en abrir sobres nuevos para expandir tu base de estampas sin repetir tanto."
        : "Great start! You still have quite a way to go. Focus on opening new booster packs to expand your sticker base without many duplicates.";
    } else if (progressPercent < 60) {
      adviceText = isEs
        ? "¡Vas a la mitad! Tus estampas repetidas están creciendo. Es el momento perfecto para empezar intercambios casuales con amigos y en la pestaña Comunidad."
        : "Halfway there! Your repeats are growing. It's the perfect moment to start casual trades with friends and inside the Community tab.";
    } else if (progressPercent < 85) {
      adviceText = isEs
        ? "¡Falta poco! Conseguir estampas únicas nuevas abriendo sobres es cada vez más difícil. Intercambia agresivamente tus repetidas para acelerar tu avance."
        : "Getting closer! Buying packs will yield mostly duplicates now. Trade aggressively to swap your repeats and accelerate your completion progress.";
    } else {
      adviceText = isEs
        ? "¡Fase final de Leyenda! Prácticamente ya no te conviene comprar sobres. Tu mejor opción es enfocar tus esfuerzos al 100% en intercambios en Comunidad."
        : "Legend final stretch! Buying packs is statistically highly inefficient now. Focus 100% of your energy on trading/swapping within the Community tab.";
    }

    // Milestones definition
    const achievements = [
      {
        id: 'kickoff',
        title: isEs ? 'Saque Inicial' : 'Kickoff',
        desc: isEs ? 'Obtén tu primera estampa' : 'Obtain your first sticker',
        unlocked: finalObtained >= 1,
        progress: `${finalObtained}/1`,
        icon: Star,
        color: 'text-amber-400 bg-amber-400/10 border-amber-500/20'
      },
      {
        id: 'collector',
        title: isEs ? 'Coleccionista Constante' : 'Steady Collector',
        desc: isEs ? 'Colecciona 100+ estampas únicas' : 'Collect 100+ unique stickers',
        unlocked: finalObtained >= 100,
        progress: `${finalObtained}/100`,
        icon: Activity,
        color: 'text-indigo-400 bg-indigo-400/10 border-indigo-500/20'
      },
      {
        id: 'halfway',
        title: isEs ? 'A Mitad de Camino' : 'Halfway there',
        desc: isEs ? 'Colecciona el 50% del álbum' : 'Collect 50% of the entire album',
        unlocked: progressPercent >= 50,
        progress: `${progressPercent}%/50%`,
        icon: TrendingUp,
        color: 'text-cyan-400 bg-cyan-400/10 border-cyan-500/20'
      },
      {
        id: 'teamplayer',
        title: isEs ? 'Trabajo en Equipo' : 'Team Player',
        desc: isEs ? 'Completa tu primer equipo' : 'Complete your first squad section (20/20)',
        unlocked: completedTeamsCount >= 1,
        progress: `${completedTeamsCount} squads`,
        icon: Medal,
        color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20'
      },
      {
        id: 'doubletrouble',
        title: isEs ? 'Súper Repetido' : 'Double Trouble',
        desc: isEs ? 'Acumula más de 20 repetidas' : 'Accumulate 20+ repeated stickers',
        unlocked: repeatedTotal >= 20,
        progress: `${repeatedTotal}/20`,
        icon: PlusCircle,
        color: 'text-rose-400 bg-rose-400/10 border-rose-500/20'
      },
      {
        id: 'trademaster',
        title: isEs ? 'Rey del Intercambio' : 'Trade Master',
        desc: isEs ? 'Acumula más de 50 estampas repetidas' : 'Accumulate 50+ repeated stickers',
        unlocked: repeatedTotal >= 50,
        progress: `${repeatedTotal}/50`,
        icon: Repeat,
        color: 'text-orange-400 bg-orange-400/10 border-orange-500/20'
      },
      {
        id: 'specialist',
        title: isEs ? 'Especialista FWC' : 'FWC Specialist',
        desc: isEs ? 'Obtén 15+ especiales FWC' : 'Obtain 15+ special FWC stickers',
        unlocked: specialsObtained >= 15,
        progress: `${specialsObtained}/15`,
        icon: Trophy,
        color: 'text-fifa-gold bg-fifa-gold/10 border-fifa-gold/20'
      },
      {
        id: 'cokeaddict',
        title: isEs ? 'Fanático de la Roja' : 'Coca-Cola Fanatic',
        desc: isEs ? 'Consigue 6+ estampas de Coca-Cola' : 'Collect 6+ Coca-Cola stickers',
        unlocked: cocaColaObtained >= 6,
        progress: `${cocaColaObtained}/6`,
        icon: Star,
        color: 'text-red-400 bg-red-400/10 border-red-500/20'
      },
      {
        id: 'continental',
        title: isEs ? 'Campeón Continental' : 'Continental Champion',
        desc: isEs ? 'Completa 5 secciones de equipos' : 'Complete 5 squad sections (20/20)',
        unlocked: completedTeamsCount >= 5,
        progress: `${completedTeamsCount}/5`,
        icon: Globe,
        color: 'text-teal-400 bg-teal-400/10 border-teal-500/20'
      },
      {
        id: 'firstclass',
        title: isEs ? 'Miembro Premium' : 'Premium Member',
        desc: isEs ? 'Desbloquea las funciones Premium de la app' : 'Unlock Premium features on the app',
        unlocked: isPremium,
        progress: isPremium ? (isEs ? '¡Desbloqueado!' : 'Unlocked!') : (isEs ? 'Pendiente' : 'Pending'),
        icon: Diamond,
        color: 'text-pink-400 bg-pink-400/10 border-pink-500/20'
      },
      {
        id: 'legend',
        title: isEs ? 'Leyenda del Álbum' : 'Album Legend',
        desc: isEs ? 'Alcanza el 90% del álbum' : 'Reach 90% overall progress',
        unlocked: progressPercent >= 90,
        progress: `${progressPercent}%/90%`,
        icon: ShieldCheck,
        color: 'text-purple-400 bg-purple-400/10 border-purple-500/20'
      },
      {
        id: 'perfectionist',
        title: isEs ? 'Colección Perfecta' : 'Perfect Collection',
        desc: isEs ? 'Alcanza el 100% de la colección' : 'Reach 100% overall unique progress',
        unlocked: progressPercent >= 100,
        progress: `${progressPercent}%/100%`,
        icon: CheckCircle2,
        color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20'
      }
    ];

    return {
      totalObtained: finalObtained,
      grandTotal,
      progressPercent,
      repeatedTotal,
      groupData,
      regionStats,
      topMissing,
      nearestCompletion,
      completedTeamsCount,
      missingTotal,
      idealPacks,
      randomPacks,
      adviceText,
      achievements,
      teamProgress
    };
  }, [inventory, t, albumCC, isEs, includeCocaColaInStats]);

  const teamOfTheDay = useMemo(() => {
    if (!stats.teamProgress || stats.teamProgress.length === 0) return null;
    
    // Find the teams with any missing stickers (missing > 0)
    const teamsWithMissing = stats.teamProgress.filter(t => t.missing > 0);
    
    // If all teams are 100% complete (no teams with missing > 0)
    if (teamsWithMissing.length === 0) {
      return { isComplete: true };
    }
    
    // Find the maximum number of missing stickers among teams with missing > 0
    const maxMissing = Math.max(...teamsWithMissing.map(t => t.missing));
    
    // Candidates with that exact maximum missing count (which makes it highest number of missing stickers)
    const candidates = teamsWithMissing.filter(t => t.missing === maxMissing);
    
    // Stable day of the month index selection
    const daySeed = new Date().getDate();
    const selected = candidates[daySeed % candidates.length];
    
    // Exact missing codes for this team
    const missingCodes: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const code = `${selected.team}${i}`;
      if (!inventory[code] || inventory[code].status === 'missing') {
        missingCodes.push(code);
      }
    }
    
    return {
      ...selected,
      missingCodes,
      isComplete: false
    };
  }, [stats.teamProgress, inventory]);

  const sortedAndFilteredTeams = useMemo(() => {
    return stats.teamProgress
      .filter(t => t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) || t.team.toLowerCase().includes(teamSearchQuery.toLowerCase()))
      .sort((a, b) => {
        if (teamSortBy === "name") {
          return a.name.localeCompare(b.name);
        } else if (teamSortBy === "progress-desc") {
          return b.obtained - a.obtained;
        } else if (teamSortBy === "progress-asc") {
          return a.obtained - b.obtained;
        } else if (teamSortBy === "repeated-desc") {
          return b.repeated - a.repeated;
        }
        return 0;
      });
  }, [stats.teamProgress, teamSearchQuery, teamSortBy]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
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
        className="space-y-8 pb-32"
      >
        {/* Core numbers Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Trophy, color: "text-fifa-gold", val: <><AnimatedNumber value={stats.progressPercent}/>%</>, label: t('stats.total_progress'), bg: "bg-fifa-gold/10" },
            { icon: CheckCircle2, color: "text-green-500", val: <AnimatedNumber value={stats.totalObtained}/>, label: t('stats.unique'), bg: "bg-green-500/10" },
            { icon: PlusCircle, color: "text-fifa-red", val: <AnimatedNumber value={stats.repeatedTotal}/>, label: t('stats.repeated'), bg: "bg-fifa-red/10" },
            { icon: Activity, color: "text-blue-500", val: <AnimatedNumber value={stats.grandTotal - stats.totalObtained}/>, label: t('stats.missing'), bg: "bg-blue-500/10" },
          ].map((item, i) => (
            <motion.div 
              key={i}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className="fifa-card p-6 flex flex-col items-center relative group overflow-hidden border-white/5 bg-white/[0.02]"
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${item.color.replace('text-', 'bg-')}`} />
              <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform`}>
                <item.icon className={item.color} size={24} />
              </div>
              <span className="text-3xl font-display font-bold">{item.val}</span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">{item.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Global App Stats Section */}
        <motion.div 
          variants={itemVariants}
          className="fifa-card p-6 bg-gradient-to-r from-blue-900/10 via-slate-900/40 to-transparent border border-blue-500/15 rounded-3xl relative overflow-hidden"
        >
          <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
              >
                <Globe size={20} />
              </motion.div>
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-white">
                {isEs ? 'Estadísticas Globales de la Comunidad' : 'Global Community Statistics'}
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">
                {isEs ? 'Métricas en tiempo real sincronizadas de todos los coleccionistas' : 'Real-time metrics aggregated across all active collectors'}
              </p>
            </div>
          </div>

          {loadingGlobalStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/[0.04] transition-colors duration-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  {isEs ? 'Coleccionistas' : 'Collectors'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-display font-bold text-white">
                    {globalAppStats?.totalUsers || 1}
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {isEs ? 'activos' : 'active'}
                  </span>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/[0.04] transition-colors duration-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  {isEs ? 'Intercambios' : 'Swaps Completed'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-display font-bold text-emerald-400">
                    {globalAppStats?.totalSwaps || 0}
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {isEs ? 'exitosos' : 'success'}
                  </span>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/[0.04] transition-colors duration-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  {isEs ? 'Progreso Promedio' : 'Average Progress'}
                </span>
                <div className="space-y-1">
                  <span className="text-2xl font-display font-bold text-fifa-gold">
                    {globalAppStats?.averageCompletionPercent || 0}%
                  </span>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-fifa-gold to-yellow-500"
                      style={{ width: `${globalAppStats?.averageCompletionPercent || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/[0.04] transition-colors duration-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  {isEs ? 'Líder del Álbum' : 'Top Collector'}
                </span>
                {globalAppStats?.topCollector ? (
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {globalAppStats.topCollector.name}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono font-medium flex items-center gap-1 mt-0.5">
                      <Star size={10} className="text-fifa-gold fill-fifa-gold shrink-0" />
                      {globalAppStats.topCollector.percentage}% {isEs ? 'completo' : 'complete'}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">
                    {isEs ? 'No disponible' : 'Not available'}
                  </span>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Team of the Day Highlight Feature */}
        {teamOfTheDay && (
          <motion.div 
            variants={itemVariants}
            className="fifa-card p-6 bg-gradient-to-r from-fifa-gold/15 via-amber-500/5 to-transparent border border-fifa-gold/30 rounded-3xl relative overflow-hidden group shadow-xl shadow-fifa-gold/5"
          >
            {/* Ambient gold glow effect */}
            <div className="absolute -right-24 -top-24 w-48 h-48 bg-fifa-gold/10 rounded-full blur-3xl pointer-events-none group-hover:bg-fifa-gold/20 transition-all duration-500" />
            
            <div className="relative flex flex-col lg:flex-row gap-6 justify-between items-stretch">
              {/* Left Column: Title, Squad Name, Flag, Code & Progress Bar */}
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 items-center px-2 py-0.5 rounded-full bg-fifa-gold/20 border border-fifa-gold/30 text-fifa-gold text-[9px] font-black uppercase tracking-widest animate-pulse">
                      {isEs ? 'RECOMENDACIÓN DE INTERCAMBIO' : 'TRADING RECOMMENDATION'}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                      <Star size={11} className="text-fifa-gold fill-fifa-gold" />
                      {isEs ? 'Equipo del Día' : 'Team of the Day'}
                    </span>
                  </div>
                  
                  {!teamOfTheDay.isComplete ? (
                    <div className="flex items-center gap-3 pt-1">
                      {TEAM_FLAGS[teamOfTheDay.team] && (
                        <img 
                          src={`https://flagcdn.com/w40/${TEAM_FLAGS[teamOfTheDay.team]}.png`} 
                          className="w-8 h-5.5 object-cover rounded shadow-md border border-white/10" 
                          alt="" 
                        />
                      )}
                      <div>
                        <h4 className="text-2xl font-display font-extrabold text-white flex items-center gap-2">
                          {teamOfTheDay.name}
                          <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-gray-300 text-xs font-black rounded-lg uppercase tracking-tight">
                            {TEAM_DETAILS[teamOfTheDay.team]?.code || teamOfTheDay.team}
                          </span>
                        </h4>
                      </div>
                    </div>
                  ) : (
                    <h4 className="text-xl font-display font-extrabold text-white">
                      {isEs ? '🏆 ¡Todos los equipos completados!' : '🏆 All squad sections completed!'}
                    </h4>
                  )}
                </div>

                {!teamOfTheDay.isComplete && (
                  <div className="space-y-1 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">
                        {isEs ? 'Progreso de sección' : 'Squad progress'}
                      </span>
                      <span className="font-mono text-white font-bold">
                        {teamOfTheDay.obtained} / 20 ({teamOfTheDay.percentage}%)
                      </span>
                    </div>
                    {/* Visual Progress Bar matching FIFA style */}
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mt-1.5 flex">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${teamOfTheDay.percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-fifa-gold to-amber-500 rounded-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Explanatory copy and wrap flex missing sticker badges */}
              <div className="flex-1 flex flex-col justify-center space-y-4 lg:border-l lg:border-white/5 lg:pl-6">
                {!teamOfTheDay.isComplete ? (
                  <>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {isEs 
                        ? `Esta sección de tu álbum es la que más estampas tiene pendientes con un total de `
                        : `This section currently has the highest count of pending stickers, overall requiring `}
                      <span className="font-bold text-fifa-gold">{teamOfTheDay.missing} {isEs ? 'faltantes' : 'missing'}</span>. 
                      {isEs 
                        ? ` Intercambia con otros participantes en la pestaña Comunidad para completarlo rápidamente.`
                        : ` Try prioritizing trades inside the Community tab to quickly finish this team.`}
                    </p>
                    
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        {isEs ? 'ESTAMPAS FALTANTES QUE DEBES BUSCAR:' : 'MISSING CODES TO SEARCH FOR:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {teamOfTheDay.missingCodes?.map((code) => (
                          <span 
                            key={code}
                            className="px-2.5 py-1 text-xs font-mono font-bold bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-fifa-gold/30 rounded-lg text-gray-300 select-all cursor-pointer transition-colors duration-200 shadow-sm"
                            title={isEs ? 'Copiar código' : 'Copy code'}
                            onClick={() => {
                              navigator.clipboard.writeText(code);
                              hapticFeedback(ImpactStyle.Light);
                            }}
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {isEs 
                      ? '¡Felicidades! Has completado todas las barajitas de cada selección nacional en el álbum. Sigue así y completa el resto de secciones especiales.'
                      : 'Excellent! You have successfully completed every list of team stickers. Focus on finishing your remaining FWC and promotional specials.'}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Smart Collector Estimations & Milestones Achievements columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Smart Predictions Card */}
          <motion.div variants={itemVariants} className="fifa-card p-8 bg-black/40 backdrop-blur-xl border-white/5 flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                  <Activity className="text-purple-400" size={20} />
                </div>
                <span>{isEs ? 'Estimador Inteligente' : 'Smart Forecaster'}</span>
              </h3>

              <div className="space-y-6">
                
                {/* Progress Detail */}
                <div className="flex items-center justify-between p-4 bg-white/[5%] border border-white/5 rounded-2xl">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                      {isEs ? 'Progreso General' : 'Overall Progress'}
                    </span>
                    <p className="text-2xl font-bold font-display text-white">
                      {stats.totalObtained} <span className="text-sm font-normal text-gray-400">/ {stats.grandTotal}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                      {isEs ? 'Equipos Completos' : 'Completed Squads'}
                    </span>
                    <p className="text-2xl font-bold text-green-400 font-display">
                      {stats.completedTeamsCount} <span className="text-sm font-normal text-gray-400">/ 32</span>
                    </p>
                  </div>
                </div>

                {/* Pack estimation numbers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/[2%] border border-white/5 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                      {isEs ? 'Sobres Mínimos' : 'Ideal Min Packs'}
                    </span>
                    <span className="text-2xl font-mono text-cyan-400 font-bold block">
                      {stats.idealPacks}
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase font-medium mt-1 block">
                      {isEs ? 'Fórmula sin repetidas' : 'Strict zero-duplicate math'}
                    </span>
                  </div>

                  <div className="p-4 bg-white/[2%] border border-white/5 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                      {isEs ? 'Sobres Estimados' : 'Packs Expected'}
                    </span>
                    <span className="text-2xl font-mono text-purple-400 font-bold block">
                      {stats.randomPacks}
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase font-medium mt-1 block">
                      {isEs ? 'Por estadística aleatoria' : 'Stochastic probability math'}
                    </span>
                  </div>
                </div>

                {/* Analysis / Advice box */}
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                  <div className="flex gap-2 items-start">
                    <div className="p-1 bg-indigo-500/15 rounded-lg mt-0.5">
                      <Star className="text-indigo-400 shrink-0" size={14} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                        {isEs ? 'Consejo del Coleccionista' : 'Collector Strategy Tip'}
                      </span>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {stats.adviceText}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-6 border-t border-white/5 pt-4 flex justify-between items-center text-[10px] text-gray-500">
              <span>{isEs ? 'Basado en algoritmo de Monte Carlo y coleccionista de cupones' : 'Based on Coupon Collector probability mathematics'}</span>
              <span className="font-mono">v3.1</span>
            </div>
          </motion.div>

          {/* Gamified Achievements/Milestones columns */}
          <motion.div id="album-milestones-section" variants={itemVariants} className="fifa-card p-8 bg-black/40 backdrop-blur-xl border-white/5">
            <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Medal className="text-emerald-400" size={20} />
              </div>
              <span>{isEs ? 'Logros de Álbum' : 'Album Milestones'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stats.achievements.map((ach) => {
                const Icon = ach.icon;
                return (
                  <motion.div 
                    key={ach.id} 
                    whileHover={ach.unlocked ? { y: -2, scale: 1.01 } : {}}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex items-start gap-4 ${
                      ach.unlocked 
                        ? 'bg-gradient-to-br from-white/[0.04] to-transparent border-white/10 shadow-lg shadow-emerald-500/[0.02] hover:border-fifa-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.05)]' 
                        : 'bg-white/[0.01] border-white/5 opacity-50'
                    }`}
                  >
                    <div className={`p-3 rounded-xl shrink-0 ${ach.unlocked ? ach.color : 'bg-white/5 text-gray-600'}`}>
                      {ach.unlocked ? (
                        <Icon size={18} className="animate-pulse" />
                      ) : (
                        <Lock size={18} />
                      )}
                    </div>
                    <div className="space-y-1 overflow-hidden flex-1">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-sm font-bold truncate ${ach.unlocked ? 'text-white' : 'text-gray-500'}`}>
                            {ach.title}
                          </span>
                          {ach.unlocked && (
                            <span className="p-0.5 rounded-full bg-emerald-500 text-[8px] font-bold text-white uppercase tracking-wider shrink-0">
                              ✓
                            </span>
                          )}
                        </div>
                        
                        {/* EXP rewarding tag */}
                        <span className={`text-[8px] font-mono font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${ach.unlocked ? 'bg-amber-400/10 text-fifa-gold border border-amber-400/20' : 'bg-white/5 text-gray-500'}`}>
                          +100 EXP
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-tight">
                        {ach.desc}
                      </p>
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-gray-500 uppercase bg-white/5 px-2 py-0.5 rounded-md">
                          {ach.progress}
                        </span>
                        {ach.unlocked ? (
                          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                            {isEs ? "Desbloqueado" : "UNLOCKED"}
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">
                            {isEs ? "Bloqueado" : "LOCKED"}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Section categories distribution & Continents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div variants={itemVariants} className="lg:col-span-2 fifa-card p-8 bg-black/40 backdrop-blur-xl border-white/5">
            <h3 className="font-display font-bold text-xl mb-8 flex items-center gap-3">
              <div className="p-2 bg-fifa-gold/10 rounded-xl">
                <PieChartIcon className="text-fifa-gold" size={20} />
              </div>
              {t('stats.distribution')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.groupData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={105}
                      paddingAngle={8}
                      dataKey="obtained"
                      stroke="none"
                      isAnimationActive={true}
                      animationBegin={100}
                      animationDuration={1400}
                      animationEasing="ease-out"
                    >
                      {stats.groupData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-6">
                {stats.groupData.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-gray-300 uppercase tracking-widest">{item.name}</span>
                      </div>
                      <span className="font-mono text-white font-bold">{item.obtained}/{item.total}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.obtained / item.total) * 100}%` }}
                        className="h-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Region Progress Chart */}
          <motion.div variants={itemVariants} className="fifa-card p-8 bg-black/40 backdrop-blur-xl border-white/5">
             <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <BarChart3 className="text-blue-400" size={20} />
              </div>
              {t('stats.region_progress')}
            </h3>
            
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.regionStats.map(r => ({ ...r, displayName: (() => {
                    if (isEs) {
                      if (r.name === "Americas") return "Américas";
                      if (r.name === "Europe") return "Europa";
                      if (r.name === "Africa") return "África";
                      if (r.name === "Asia / Oceania") return "Asia/Oceanía";
                    }
                    return r.name;
                  })() }))}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis 
                    dataKey="displayName" 
                    stroke="rgba(255, 255, 255, 0.3)" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="rgba(255, 255, 255, 0.3)" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    formatter={(value: any) => [`${value}%`, isEs ? 'Progreso' : 'Progress']}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Bar 
                    dataKey="percentage" 
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationBegin={200}
                    animationDuration={1400}
                    animationEasing="ease-out"
                  >
                    {stats.regionStats.map((entry, index) => {
                      const colors = [
                        '#3b82f6', // Americas: Blue
                        '#8b5cf6', // Europe: Purple
                        '#10b981', // Africa: Emerald
                        '#f59e0b', // Asia/Oceania: Amber
                      ];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Region Stats Quick Grid Info */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              {stats.regionStats.map((region, i) => {
                const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
                const displayName = (() => {
                  if (isEs) {
                    if (region.name === "Americas") return "Américas";
                    if (region.name === "Europe") return "Europa";
                    if (region.name === "Africa") return "África";
                    if (region.name === "Asia / Oceania") return "Asia/Oceanía";
                  }
                  return region.name;
                })();
                return (
                  <div key={i} className="flex justify-between items-center text-[11px] bg-white/[0.02] border border-white/5 p-2 rounded-xl">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-gray-400 font-medium truncate">{displayName}</span>
                    </div>
                    <span className="text-white font-mono font-bold shrink-0">{region.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Dynamic Interactive Team-by-Team Analyzer explorer */}
        <motion.div variants={itemVariants} className="fifa-card p-8 bg-black/40 backdrop-blur-xl border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="font-display font-bold text-xl flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-xl">
                  <Globe className="text-cyan-400" size={20} />
                </div>
                <span>{isEs ? 'Analizador Detallado por Equipos' : 'Team-by-Team Detailed Analyzer'}</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {isEs ? 'Monitorea el progreso, estampas faltantes y repetidas de cada selección nacional' : 'Inspect precise counts, missing lists, and repeat stocks for every national squad'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3 w-full md:w-auto shrink-0">
              
              {/* Search */}
              <div className="relative flex-1 min-w-[180px] md:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input 
                  type="text" 
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  placeholder={isEs ? 'Buscar selección...' : 'Search squad...'}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all font-medium"
                />
                {teamSearchQuery && (
                  <button 
                    onClick={() => setTeamSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <div className="relative flex-1 min-w-[150px] md:w-44">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 shrink-0" size={12} />
                <select 
                  value={teamSortBy} 
                  onChange={(e: any) => setTeamSortBy(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none font-medium text-left"
                >
                  <option value="progress-desc" className="bg-dark-bg">{isEs ? 'Mayor Progreso' : 'Highest Progress'}</option>
                  <option value="progress-asc" className="bg-dark-bg">{isEs ? 'Menor Progreso' : 'Lowest Progress'}</option>
                  <option value="repeated-desc" className="bg-dark-bg">{isEs ? 'Más Repetidos' : 'Most Repeated'}</option>
                  <option value="name" className="bg-dark-bg">{isEs ? 'Nombre (A-Z)' : 'Name (A-Z)'}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 custom-scroller">
            {sortedAndFilteredTeams.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs uppercase tracking-widest font-bold">
                {isEs ? 'No se encontraron selecciones' : 'No squads found match your filter'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedAndFilteredTeams.map((item) => {
                  return (
                    <div 
                      key={item.team} 
                      className={`p-4 rounded-xl border flex items-center justify-between transition-all group ${
                        item.obtained === 20 
                          ? 'bg-emerald-500/[0.02] border-emerald-500/10 shadow shadow-emerald-500/5' 
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {TEAM_FLAGS[item.team] ? (
                          <img 
                            src={`https://flagcdn.com/w40/${TEAM_FLAGS[item.team]}.png`} 
                            className="w-7 h-5 object-cover rounded shadow ring-1 ring-white/10" 
                            alt="" 
                          />
                        ) : (
                          <div className="w-7 h-5 bg-white/10 rounded" />
                        )}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                              {item.name}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500 font-semibold bg-white/5 px-1.5 py-0.2 rounded uppercase">
                              {item.team}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                            <span>{isEs ? 'Obtenidas' : 'Has'}: <b className="text-white font-bold">{item.obtained}/20</b></span>
                            <span>•</span>
                            <span>{isEs ? 'Faltan' : 'Need'}: <b className="text-gray-300 font-bold">{item.missing}</b></span>
                            {item.repeated > 0 && (
                              <>
                                <span className="text-gray-650">•</span>
                                <span className="text-fifa-red font-bold">+{item.repeated} {isEs ? 'rep' : 'rep'}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side progress bar & percentage */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className={`text-xs font-mono font-bold ${item.obtained === 20 ? 'text-green-400' : 'text-gray-350'}`}>
                            {item.percentage}%
                          </span>
                        </div>
                        <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              item.obtained === 20 
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                                : 'bg-gradient-to-r from-cyan-600 to-blue-400'
                            }`}
                            style={{ width: `${item.percentage}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Existing Nearest & Top missing teams breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div variants={itemVariants} className="fifa-card p-8 bg-black/40 border-white/5">
            <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-3 text-green-400">
              <div className="p-2 bg-green-500/10 rounded-xl">
                <Trophy size={20} />
              </div>
              {t('stats.nearest_completion')}
            </h3>
            <div className="space-y-3">
              {stats.nearestCompletion.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    {TEAM_FLAGS[item.team] && (
                      <img src={`https://flagcdn.com/w40/${TEAM_FLAGS[item.team]}.png`} className="w-5 h-3.5 object-cover rounded shadow-sm" alt="" />
                    )}
                    <span className="text-sm font-bold text-gray-200">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-green-400 font-bold">-{item.missing}</span>
                    <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="fifa-card p-8 bg-black/40 border-white/5">
            <h3 className="font-display font-bold text-xl mb-6 flex items-center gap-3 text-fifa-red">
              <div className="p-2 bg-fifa-red/10 rounded-xl">
                <Activity size={20} />
              </div>
              {t('stats.top_missing')}
            </h3>
            <div className="space-y-3">
              {stats.topMissing.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3 text-gray-400 font-bold">
                    {TEAM_FLAGS[item.team] && (
                      <img src={`https://flagcdn.com/w40/${TEAM_FLAGS[item.team]}.png`} className="w-5 h-3.5 object-cover rounded shadow-sm grayscale" alt="" />
                    )}
                    <span className="text-sm font-bold">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-gray-500 font-bold">{item.obtained}/{item.total}</span>
                    <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white/20" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                </div>
              ))}
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
    
    const cocaColaCount = activeAlbum?.cocaColaCount !== undefined ? activeAlbum.cocaColaCount : 14;
    const albumCC = Array.from({ length: cocaColaCount }, (_, i) => `CC${i + 1}`);
    const allCodes = [...SPECIALS, ...TEAMS.flatMap(t => Array.from({ length: 20 }, (_, i) => `${t}${i + 1}`)), ...albumCC];
    
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
  const { t, i18n } = useTranslation();
  const isEs = i18n.language.startsWith('es');

  // Update html lang attribute
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Native Initialization
  useEffect(() => {
    const setupNative = async () => {
      try {
        // Set Status Bar to match dark theme
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0A0A0B' }); // match --color-dark-bg
      } catch (e) {
        console.warn('Native APIs not available in this environment');
      }
    };
    setupNative();

    // Handle Android Back Button
    const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapApp.exitApp();
      } else {
        window.history.back();
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [albums, setAlbums] = useState<any[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<any>(null);
  const [rawInventory, setRawInventory] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<'all' | 'repeated' | 'missing'>('all');
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
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<any[]>([]);
  const [adminPremiumOverride, setAdminPremiumOverride] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({ 
    googleLoginEnabled: true, 
    passwordChangeEnabled: true,
    announcementEnabled: false,
    announcementText: "",
    maintenanceModeEnabled: false
  });
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminAnnouncementMessage, setAdminAnnouncementMessage] = useState("");
  const [saveAnnounceLoading, setSaveAnnounceLoading] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementHasBeenShown, setAnnouncementHasBeenShown] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState<'settings' | 'users' | 'stats'>('settings');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    totalAlbums: 0,
    totalPremium: 0
  });
  const [adminSearch, setAdminSearch] = useState("");
  const [adminMetricsLoading, setAdminMetricsLoading] = useState(false);
  const albumCC = useMemo(() => {
    const count = activeAlbum?.cocaColaCount !== undefined ? activeAlbum.cocaColaCount : 14;
    if (!count || count === 0) return [];
    return Array.from({ length: count }, (_, i) => `CC${i + 1}`);
  }, [activeAlbum]);
  const allowedQuickTeams = useMemo(() => {
    return [...TEAMS, "FWC", ...(albumCC.length > 0 ? ["CC"] : [])];
  }, [albumCC]);
  const [transferStickerCode, setTransferStickerCode] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInvertedModal, setShowInvertedModal] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [editingAlbumName, setEditingAlbumName] = useState("");
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });
  const [includeCocaColaInStats, setIncludeCocaColaInStats] = useState<boolean>(() => {
    return localStorage.getItem('includeCocaColaInStats') !== 'false';
  });
  const [hideRPGWidget, setHideRPGWidget] = useState<boolean>(() => {
    return localStorage.getItem('hideRPGWidget') === 'true';
  });
  const [universalRepeats, setUniversalRepeats] = useState<boolean>(() => {
    return localStorage.getItem('universalRepeats') === 'true';
  });

  const inventory = useMemo(() => {
    if (!universalRepeats) return rawInventory;
    
    const repeatsMap = userProfile?.universal_repeats || {};
    const merged: Record<string, any> = {};
    
    // Copy and adapt counts based on universal repeat map
    Object.keys(rawInventory).forEach(code => {
      const item = rawInventory[code];
      const isConseguida = item?.isConseguida || false;
      const repeats = typeof repeatsMap[code] === 'number' ? repeatsMap[code] : 0;
      const count = (isConseguida ? 1 : 0) + repeats;
      
      merged[code] = {
        ...item,
        isConseguida,
        count,
        quantity: count,
        status: isConseguida ? (count > 1 ? 'repeated' : 'obtained') : 'missing'
      };
    });
    
    return merged;
  }, [rawInventory, universalRepeats, userProfile?.universal_repeats]);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  const quickInputTimeout = useRef<any>(null);
  
  const isAdmin = useMemo(() => user?.email === 'juliand.colediverti@gmail.com', [user]);

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await albumService.getGlobalSettings();
      setGlobalSettings(settings as any);
      if (settings?.announcementText) {
        setAdminAnnouncementMessage(settings.announcementText);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (showAdminDashboard && isAdmin) {
      loadAdminData();
    }
  }, [showAdminDashboard, isAdmin]);

  const loadAdminData = async () => {
    setAdminMetricsLoading(true);
    try {
      const usersList = await albumService.getAllUsers();
      const totalAlbums = await albumService.getTotalAlbumsCount();
      const totalPremiumCount = usersList.filter((u: any) => u.isPremium).length;
      
      setAdminStats({
        totalUsers: usersList.length,
        totalAlbums: totalAlbums,
        totalPremium: totalPremiumCount
      });
      setAdminUsers(usersList);
    } catch (e) {
      console.error("Error loading admin stats", e);
    } finally {
      setAdminMetricsLoading(false);
    }
  };

  const handleToggleUserPremium = async (targetUserId: string, currentPremiumValue: boolean) => {
    const nextPremium = !currentPremiumValue;
    const success = await albumService.toggleUserPremium(targetUserId, nextPremium);
    if (success) {
      setAdminUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, isPremium: nextPremium } : u));
      setAdminStats(prev => ({
        ...prev,
        totalPremium: prev.totalPremium + (nextPremium ? 1 : -1)
      }));
    } else {
      alert(isEs ? "Error al actualizar el estado premium" : "Error updating premium status");
    }
  };

  useEffect(() => {
    if (globalSettings.announcementEnabled && globalSettings.announcementText && !announcementHasBeenShown) {
      setShowAnnouncementModal(true);
      setAnnouncementHasBeenShown(true);
    }
  }, [globalSettings, announcementHasBeenShown]);

  const isPremium = useMemo(() => {
    if (adminPremiumOverride) return true;
    if (userProfile?.isPremium) return true;
    return isTrialActive(userProfile);
  }, [userProfile, adminPremiumOverride]);

  const handleUpgrade = async () => {
    if (!user || upgrading) return;
    setUpgrading(true);
    const premiumSKU = "premium_upgrade_permanent";
    try {
      // 1. Native Capacitor Billing Plugin
      console.log("Attempting Google Play Purchase via Capacitor: " + premiumSKU);
      
      if (!Capacitor.isNativePlatform()) {
        throw new Error("El sistema de pagos solo está disponible en la aplicación Android.");
      }

      let token = "";
      
      try {
        const { value } = await BillingPlugin.launchBillingFlow({
          product: premiumSKU,
          type: "inapp"
        });
        
        if (!value) {
          throw new Error("No se recibió un token de compra válido.");
        }
        
        token = value;
        console.log("Native purchase success, token acquired.");
      } catch (nativeError: any) {
        console.error("Native billing failed", nativeError);
        throw new Error(nativeError.message || "La compra fue cancelada o falló.");
      }
      
      // 2. Mark as premium in Firestore
      await albumService.saveUserProfile(user.uid, { 
        isPremium: true, 
        purchaseToken: token,
        purchaseDate: new Date().toISOString(),
        sku: premiumSKU
      });
      
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#D4AF37', '#FFFFFF']
      });
      setShowPremiumModal(false);
    } catch (e: any) {
      console.error("Upgrade failed", e);
      setError(e.message || "Ocurrió un error interno durante el pago");
      setTimeout(() => setError(""), 5000);
    } finally {
      setUpgrading(false);
    }
  };

  const handleRestore = async () => {
    if (!user) return;
    setUpgrading(true);
    try {
      const success = await albumService.restorePurchases(user.uid);
      if (success) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setShowPremiumModal(false);
      } else {
        setError(t('album.premium_restore_not_found') || "No previous purchases found for this account.");
        setTimeout(() => setError(""), 4000);
      }
    } catch (e: any) {
      setError(e.message || "Failed to restore purchases");
      setTimeout(() => setError(""), 4000);
    } finally {
      setUpgrading(false);
    }
  };

  const handleLinkGoogle = async () => {
    if (!user) return;
    hapticFeedback(ImpactStyle.Medium);
    try {
      await albumService.linkGoogleAccount();
      // "Think" a few seconds as requested
      await new Promise(r => setTimeout(r, 2000));
      // Link success happens via auth state change or manual update search
      // To be safe, we mark it in profile
      const googleUid = user.providerData.find(p => p.providerId === 'google.com')?.uid || user.uid;
      await albumService.saveUserProfile(user.uid, { googleLinked: true, googleUid });
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (e: any) {
      console.error(e);
      setError("Linking failed. Please try again.");
    }
  };

  const handleClaimTrial = async () => {
    if (!user || userProfile?.trialUsed) return;
    
    // Check if already linked with Google
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    if (!isGoogleUser) {
      alert("You must link your Google account first!");
      return;
    }

    hapticFeedback(ImpactStyle.Heavy);
    await albumService.saveUserProfile(user.uid, { 
      trialUsed: true, 
      trialStartDate: new Date().toISOString(),
      trialExportCount: 0 
    });
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.5 }, colors: ['#D4AF37', '#91022D'] });
  };

  const handleExportPerformed = async () => {
    if (!user || !userProfile) return false;
    const currentCount = userProfile.trialExportCount || 0;
    await albumService.saveUserProfile(user.uid, { trialExportCount: currentCount + 1 });
    return true;
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
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadAlbums = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await albumService.getAlbums(user.uid);
      setAlbums(data || []);
      if (data && data.length > 0 && !activeAlbum) {
        setActiveAlbum(data[0]);
      }
    } catch (e) {
      console.error("Error loading albums", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeAlbum) {
      const unsub = albumService.subscribeToInventory(activeAlbum.id, (inv) => {
        setRawInventory(inv);
      });
      return unsub;
    }
  }, [activeAlbum]);

  // Completion Celebrate Effect
  useEffect(() => {
    if (!Object.keys(inventory).length) return;
    
    const specialsTotal = SPECIALS.length;
    const teamsTotal = TEAMS.length * 20;
    const cocaColaTotal = albumCC.length;
    const grandTotal = specialsTotal + teamsTotal + cocaColaTotal;
    
    let obtained = 0;
    Object.values(inventory).forEach((s: any) => {
      if (s.status === 'obtained' || s.status === 'repeated') obtained++;
    });
    
    if (obtained === grandTotal && grandTotal > 0) {
      // Big celebration
      const end = Date.now() + (3 * 1000);
      const colors = ['#D4AF37', '#91022D', '#FFFFFF'];

      (function frame() {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }, [inventory, albumCC]);

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
    if (!globalSettings.googleLoginEnabled) {
      setError(t('auth.google_login_disabled'));
      return;
    }
    setError("");
    try {
      if (Capacitor.isNativePlatform()) {
        await FirebaseAuthentication.signInWithGoogle();
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLogout = () => signOut(auth);

  const navigateView = (v: 'collection' | 'community' | 'stats') => {
    hapticFeedback(ImpactStyle.Light);
    setView(v);
  };

  const handleCreateAlbum = async () => {
    if (!user) return;
    const albumLimit = isPremium ? 3 : 1;
    if (albums.length >= albumLimit) {
      setError(t('album.album_limit_reached'));
      return;
    }
    if (!isOnline) {
      setError(t('album.create_error_offline'));
      return;
    }

    const defaultName = i18n.language.startsWith('es') 
      ? (albums.length === 0 ? `Colección Principal` : `Colección Secundaria ${albums.length}`)
      : (albums.length === 0 ? `Main Album` : `Secondary Album ${albums.length}`);
      
    const namePrompt = prompt(
      i18n.language.startsWith('es') ? "Introduce el nombre del nuevo álbum:" : "Enter the name of the new album:",
      defaultName
    );
    
    if (namePrompt === null) return; // Cancelled
    const name = namePrompt.trim() || defaultName;

    const isInverse = false;

    let cocaColaCount = 14;
    const ccPromptMsg = i18n.language.startsWith('es')
      ? "¿De cuántas estampas es tu sección de Coca-Cola?\n\nEscribe:\n- 14 (si tiene 14 estampas)\n- 12 (si tiene 12 estampas)\n- 0 (si NO tienes sección de Coca-Cola)"
      : "How many stickers does your Coca-Cola section have?\n\nEnter:\n- 14 (if it has 14 stickers)\n- 12 (if it has 12 stickers)\n- 0 (if you do NOT have a Coca-Cola section)";

    const ccInput = prompt(ccPromptMsg, "14");
    if (ccInput !== null) {
      const parsed = parseInt(ccInput.trim());
      if (parsed === 12) {
        cocaColaCount = 12;
      } else if (parsed === 14) {
        cocaColaCount = 14;
      } else if (parsed === 0) {
        cocaColaCount = 0;
      } else {
        cocaColaCount = 14;
      }
    }

    await albumService.createAlbum(user.uid, name, isInverse, cocaColaCount);
    await loadAlbums();
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!user) return;
    
    const confirmMsg = i18n.language.startsWith('es')
      ? "¿Estás seguro de que quieres borrar este álbum? Se perderá todo su inventario."
      : "Are you sure you want to delete this album? All its inventory will be lost.";
      
    if (!confirm(confirmMsg)) return;

    try {
      await albumService.deleteAlbum(albumId);
      
      const remainingArr = albums.filter(a => a.id !== albumId);
      if (activeAlbum?.id === albumId) {
        if (remainingArr.length > 0) {
          setActiveAlbum(remainingArr[0]);
        } else {
          setActiveAlbum(null);
          setRawInventory({});
        }
      }
      
      await loadAlbums();
    } catch (err) {
      console.error("Failed to delete album", err);
    }
  };

  const handleRenameAlbum = async (albumId: string, newName: string) => {
    if (!user || !newName.trim()) return;
    try {
      await albumService.updateAlbumName(albumId, newName.trim());
      
      if (activeAlbum?.id === albumId) {
        setActiveAlbum((prev: any) => prev ? { ...prev, name: newName.trim() } : null);
      }
      
      await loadAlbums();
    } catch (err) {
      console.error("Failed to rename album", err);
    }
  };

  const handleToggleUniversalRepeats = async (enabled: boolean) => {
    setUniversalRepeats(enabled);
    localStorage.setItem('universalRepeats', enabled ? 'true' : 'false');
    hapticFeedback(ImpactStyle.Medium);
    
    if (enabled && user && albums.length > 0) {
      try {
        await albumService.initializeUniversalRepeats(user.uid, albums);
      } catch (err) {
        console.error("Failed to initialize universal repeats:", err);
      }
    }
  };

  const handleUpdateSticker = (code: string, status: StickerStatus, count: number) => {
    if (!activeAlbum) return;
    
    // Lock offline editing behind premium
    if (!isOnline && !isPremium) {
      setShowOfflineAlert(true);
      return;
    }
    
    albumService.updateSticker(
      activeAlbum.id, 
      code, 
      status, 
      count, 
      user?.uid || undefined, 
      universalRepeats
    );
  };

  const handleTransferSticker = async (targetAlbumId: string) => {
    if (!transferStickerCode || !activeAlbum || !targetAlbumId) return;
    setTransferLoading(true);
    try {
      await albumService.transferSticker(activeAlbum.id, targetAlbumId, transferStickerCode);
      const current = inventory[transferStickerCode];
      if (current) {
        setRawInventory(prev => ({
          ...prev,
          [transferStickerCode]: { 
            ...current, 
            count: current.count - 1,
            status: current.count === 2 ? 'obtained' : 'repeated'
          }
        }));
      }
      setTransferStickerCode(null);
      setShowTransferModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setTransferLoading(false);
    }
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
        const ccLimit = albumCC.length;
        if (team === 'CC' && (num < 1 || num > ccLimit)) continue;
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
          if (team === 'CC' && num === 1 && ccLimit >= 10) canBeTwo = true; // 10-14 or 10-12
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
    if (!globalSettings.passwordChangeEnabled && !isAdmin) {
      setPasswordError(t('auth.password_change_disabled'));
      return;
    }
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
    const allExpected = [...SPECIALS, ...TEAMS.flatMap(t => Array.from({ length: 20 }, (_, i) => `${t}${i + 1}`)), ...(includeCocaColaInStats ? albumCC : [])];
    
    allExpected.forEach(code => {
      if (inventory[code]?.status === 'obtained') totalObtained++;
      if (inventory[code]?.status === 'repeated') {
        totalObtained++;
        totalRepeated += (inventory[code]?.count - 1);
      }
    });
    
    return { obtained: totalObtained, total: allExpected.length, repeated: totalRepeated };
  }, [inventory, albumCC, includeCocaColaInStats]);

  const appAchievements = useMemo(() => {
    const finalObtained = totalStats.obtained;
    const grandTotal = totalStats.total;
    const progressPercent = grandTotal > 0 ? Math.round((finalObtained / grandTotal) * 100) : 0;
    const repeatedTotal = totalStats.repeated;

    let specialsObtained = 0;
    SPECIALS.forEach(c => {
      if (inventory[c]?.status === 'obtained' || inventory[c]?.status === 'repeated') {
        specialsObtained++;
      }
    });

    let completedTeamsCount = 0;
    TEAMS.forEach(team => {
      let obtained = 0;
      for (let i = 1; i <= 20; i++) {
        const c = `${team}${i}`;
        const item = inventory[c];
        if (item?.status === 'obtained' || item?.status === 'repeated') {
          obtained++;
        }
      }
      if (obtained === 20) {
        completedTeamsCount++;
      }
    });

    let cocaColaObtained = 0;
    albumCC.forEach(c => {
      if (inventory[c]?.status === 'obtained' || inventory[c]?.status === 'repeated') {
        cocaColaObtained++;
      }
    });

    return [
      {
        id: 'kickoff',
        title: isEs ? 'Saque Inicial' : 'Kickoff',
        desc: isEs ? 'Obtén tu primera estampa' : 'Obtain your first sticker',
        unlocked: finalObtained >= 1,
        progress: `${finalObtained}/1`,
        color: 'text-amber-400 bg-amber-400/10 border-amber-500/20'
      },
      {
        id: 'collector',
        title: isEs ? 'Coleccionista Constante' : 'Steady Collector',
        desc: isEs ? 'Colecciona 100+ estampas únicas' : 'Collect 100+ unique stickers',
        unlocked: finalObtained >= 100,
        progress: `${finalObtained}/100`,
        color: 'text-indigo-400 bg-indigo-400/10 border-indigo-500/20'
      },
      {
        id: 'halfway',
        title: isEs ? 'A Mitad de Camino' : 'Halfway there',
        desc: isEs ? 'Colecciona el 50% del álbum' : 'Collect 50% of the entire album',
        unlocked: progressPercent >= 50,
        progress: `${progressPercent}%/50%`,
        color: 'text-cyan-400 bg-cyan-400/10 border-cyan-500/20'
      },
      {
        id: 'teamplayer',
        title: isEs ? 'Trabajo en Equipo' : 'Team Player',
        desc: isEs ? 'Completa tu primer equipo' : 'Complete your first squad section (20/20)',
        unlocked: completedTeamsCount >= 1,
        progress: `${completedTeamsCount} squads`,
        color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20'
      },
      {
        id: 'doubletrouble',
        title: isEs ? 'Súper Repetido' : 'Double Trouble',
        desc: isEs ? 'Acumula más de 20 repetidas' : 'Accumulate 20+ repeated stickers',
        unlocked: repeatedTotal >= 20,
        progress: `${repeatedTotal}/20`,
        color: 'text-rose-400 bg-rose-400/10 border-rose-500/20'
      },
      {
        id: 'trademaster',
        title: isEs ? 'Rey del Intercambio' : 'Trade Master',
        desc: isEs ? 'Acumula más de 50 estampas repetidas' : 'Accumulate 50+ repeated stickers',
        unlocked: repeatedTotal >= 50,
        progress: `${repeatedTotal}/50`,
        color: 'text-orange-400 bg-orange-400/10 border-orange-500/20'
      },
      {
        id: 'specialist',
        title: isEs ? 'Especialista FWC' : 'FWC Specialist',
        desc: isEs ? 'Obtén 15+ especiales FWC' : 'Obtain 15+ special FWC stickers',
        unlocked: specialsObtained >= 15,
        progress: `${specialsObtained}/15`,
        color: 'text-fifa-gold bg-fifa-gold/10 border-fifa-gold/20'
      },
      {
        id: 'cokeaddict',
        title: isEs ? 'Fanático de la Roja' : 'Coca-Cola Fanatic',
        desc: isEs ? 'Consigue 6+ estampas de Coca-Cola' : 'Collect 6+ Coca-Cola stickers',
        unlocked: cocaColaObtained >= 6,
        progress: `${cocaColaObtained}/6`,
        color: 'text-red-400 bg-red-400/10 border-red-500/20'
      },
      {
        id: 'continental',
        title: isEs ? 'Campeón Continental' : 'Continental Champion',
        desc: isEs ? 'Completa 5 secciones de equipos' : 'Complete 5 squad sections (20/20)',
        unlocked: completedTeamsCount >= 5,
        progress: `${completedTeamsCount}/5`,
        color: 'text-teal-400 bg-teal-400/10 border-teal-500/20'
      },
      {
        id: 'firstclass',
        title: isEs ? 'Miembro Premium' : 'Premium Member',
        desc: isEs ? 'Desbloquea las funciones Premium de la app' : 'Unlock Premium features on the app',
        unlocked: isPremium,
        progress: isPremium ? (isEs ? '¡Desbloqueado!' : 'Unlocked!') : (isEs ? 'Pendiente' : 'Pending'),
        color: 'text-pink-400 bg-pink-400/10 border-pink-500/20'
      },
      {
        id: 'legend',
        title: isEs ? 'Leyenda del Álbum' : 'Album Legend',
        desc: isEs ? 'Alcanza el 90% del álbum' : 'Reach 90% overall progress',
        unlocked: progressPercent >= 90,
        progress: `${progressPercent}%/90%`,
        color: 'text-purple-400 bg-purple-400/10 border-purple-500/20'
      },
      {
        id: 'perfectionist',
        title: isEs ? 'Colección Perfecta' : 'Perfect Collection',
        desc: isEs ? 'Alcanza el 100% de la colección' : 'Reach 100% overall unique progress',
        unlocked: progressPercent >= 100,
        progress: `${progressPercent}%/100%`,
        color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20'
      }
    ];
  }, [inventory, albumCC, isEs, includeCocaColaInStats, totalStats, isPremium]);

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
        <div className="w-24 h-24 mx-auto mb-6 relative">
          <img 
            src="https://i.postimg.cc/gkYK9kXr/Logo-Album-2026.png" 
            className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]" 
            alt="ColeCollect Logo" 
          />
          <div className="absolute inset-0 bg-fifa-gold blur-3xl opacity-10 -z-10" />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-display font-bold mb-2 tracking-tighter gradient-gold bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(212,175,55,0.1)]">
          COLECOLLECT
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
            disabled={!globalSettings.googleLoginEnabled}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all transform active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Google
          </button>
          {!globalSettings.googleLoginEnabled && (
            <p className="text-[10px] text-fifa-red text-center mt-2 font-bold uppercase tracking-widest">{t('auth.google_login_disabled')}</p>
          )}

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

  if (isLoading) return (
    <div className="min-h-screen bg-[#0A0A0B] text-white pb-20 selection:bg-fifa-gold selection:text-black w-full overflow-x-hidden">
      {/* Skeleton Header / Navbar */}
      <header className="sticky top-0 z-50 bg-[#0A0A0B]/90 backdrop-blur-xl border-b border-white/5 pt-8 sm:pt-4 pb-2 sm:pb-3">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 flex-wrap animate-pulse">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-lg border border-white/10 shrink-0" />
              <div className="h-6 w-32 bg-white/10 rounded-lg" />
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="hidden md:flex gap-3">
              <div className="h-8 w-20 bg-white/5 rounded-xl border border-white/5" />
              <div className="h-8 w-24 bg-white/5 rounded-xl border border-white/5" />
              <div className="h-8 w-20 bg-white/5 rounded-xl border border-white/5" />
              <div className="h-8 w-20 bg-white/5 rounded-xl border border-white/5" />
            </div>
            
            <div className="flex bg-white/5 rounded-full p-1 border border-white/5 w-full sm:w-auto justify-start sm:justify-end">
              <div className="h-7 w-28 bg-white/10 rounded-full" />
              <div className="h-7 w-12 bg-white/5 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Skeleton Main Container */}
      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8 animate-pulse">
        {/* Skeleton Profile Card */}
        <div className="fifa-card h-auto p-5 sm:p-8 relative overflow-hidden bg-white/[0.01] border border-white/5 rounded-[2rem]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-white/10 border-2 border-white/5 shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="h-5 w-48 bg-white/20 rounded-lg" />
                  <div className="h-4 w-36 bg-white/10 rounded-md" />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <div className="h-5 w-20 bg-white/5 border border-white/10 rounded-md" />
                    <div className="h-5 w-24 bg-white/5 border border-white/10 rounded-md" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 sm:gap-6 md:gap-8">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-white/10 rounded" />
                  <div className="h-8 w-14 bg-fifa-gold/20 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-white/10 rounded" />
                  <div className="h-8 w-16 bg-white/20 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-white/10 rounded" />
                  <div className="h-8 w-14 bg-fifa-red/20 rounded-lg" />
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-64 space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-3 w-14 bg-white/10 rounded" />
                <div className="h-3 w-20 bg-white/10 rounded" />
              </div>
              <div className="h-3 bg-white/10 rounded-full w-full" />
            </div>
          </div>
        </div>

        {/* Action button / Search Skeletons */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="h-14 bg-white/[0.01] border border-white/5 rounded-xl flex-1" />
          <div className="h-14 bg-white/[0.01] border border-white/5 rounded-xl w-full md:w-72" />
        </div>

        {/* Stickers Grid Header Skeleton */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="h-6 w-32 bg-white/15 rounded-lg" />
            <div className="h-4 w-16 bg-white/10 rounded" />
          </div>
          
          {/* Stickers Grid Skeleton */}
          <div className="grid grid-cols-3 min-[390px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {Array.from({ length: 16 }).map((_, idx) => (
              <div 
                key={idx} 
                className="aspect-[3/4] rounded-2xl bg-white/[0.01] border border-white/5 p-3 flex flex-col justify-between"
              >
                <div className="h-3 w-8 bg-white/10 rounded" />
                <div className="h-12 w-12 bg-white/10 rounded-xl mx-auto my-2" />
                <div className="h-3 w-16 bg-white/5 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );

  if (globalSettings.maintenanceModeEnabled && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#070708] text-white flex flex-col items-center justify-center p-6 selection:bg-fifa-gold selection:text-black">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-fifa-gold/10 blur-[100px] rounded-full" />
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-[#0E0E10] border border-white/5 shadow-2xl rounded-[2rem] p-8 text-center relative overflow-hidden"
        >
          <div className="w-16 h-16 bg-fifa-gold/10 rounded-2xl flex items-center justify-center border border-fifa-gold/30 mx-auto mb-6">
            <AlertTriangle size={32} className="text-fifa-gold animate-pulse shrink-0" />
          </div>
          <h1 className="text-2xl font-display font-black text-white tracking-tight mb-3">
            {isEs ? 'Mantenimiento en Progreso' : 'Maintenance in Progress'}
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            {isEs 
              ? 'Estamos optimizando los servidores y cargando nuevas láminas para el mundial. Volveremos muy pronto. ¡Gracias por tu paciencia!' 
              : 'Our technical team is optimizing systems and preparing new collectible content. We will be back online shortly.'}
          </p>
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-left">
            <span className="text-[10px] font-mono uppercase tracking-widest text-fifa-gold block mb-1">
              {isEs ? 'Estado del Sistema' : 'System Status'}
            </span>
            <span className="text-xs text-gray-300 font-medium font-sans">
              {isEs ? 'Sincronización de base de datos activa...' : 'Database synchronization live...'}
            </span>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-fifa-gold animate-ping" />
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.15em] font-mono">ColeCollect Hub</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 selection:bg-fifa-gold selection:text-black w-full overflow-x-hidden">
      <AnimatePresence>
        {/* User announcement modal shown when opening */}
        {showAnnouncementModal && globalSettings.announcementEnabled && globalSettings.announcementText && (
          <div className="fixed inset-0 z-[190] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md" 
              onClick={() => setShowAnnouncementModal(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-[#111113] border border-fifa-gold/30 rounded-[2.5rem] p-8 shadow-[0_0_80px_rgba(212,175,55,0.08)] overflow-hidden z-10"
            >
              {/* Top ambient highlight */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-2 bg-gradient-to-r from-transparent via-fifa-gold/40 to-transparent rounded-full" />
              
              <div className="flex flex-col items-center text-center mt-3">
                <div className="w-14 h-14 bg-fifa-gold/10 rounded-2xl flex items-center justify-center border border-fifa-gold/20 mb-5">
                  <span className="text-2xl">📢</span>
                </div>
                
                <h3 className="text-xl font-display font-black text-white tracking-tight mb-3">
                  {isEs ? 'Anuncio Importante' : 'Important Announcement'}
                </h3>
                
                <div className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-5 mb-6 text-sm text-gray-300 leading-relaxed text-left max-h-[250px] overflow-y-auto font-sans whitespace-pre-wrap">
                  {globalSettings.announcementText}
                </div>

                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  className="w-full py-3.5 bg-gradient-to-r from-fifa-gold to-yellow-500 hover:from-yellow-400 hover:to-yellow-500 text-black font-display font-black text-xs uppercase tracking-widest rounded-2xl transition-all border border-yellow-500/20 active:scale-[0.98] shadow-lg shadow-fifa-gold/15"
                >
                  {isEs ? 'Entendido' : 'Understood'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAdmin && showAdminDashboard && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-2xl" 
              onClick={() => setShowAdminDashboard(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-[#0E0E10] border border-fifa-gold/20 rounded-[2.5rem] p-6 md:p-8 shadow-[0_0_120px_rgba(212,175,55,0.12)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Background Glow Accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-fifa-gold/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
              
              {/* Console Header */}
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-fifa-gold/10 rounded-2xl flex items-center justify-center border border-fifa-gold/30">
                    <Settings className="text-fifa-gold" size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-black text-white tracking-tight">Console Admin</h2>
                    <p className="text-[10px] text-fifa-gold font-mono tracking-[0.2em] uppercase opacity-75">Control Panel v3.5 • ColeCollect</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAdminDashboard(false)} 
                  className="p-2.5 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 active:scale-95"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Sub-Tab Navigation Bar */}
              <div className="flex gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/5 mb-6 shrink-0">
                <button
                  onClick={() => setAdminActiveTab('settings')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${adminActiveTab === 'settings' ? 'bg-fifa-gold text-black shadow-lg shadow-fifa-gold/15' : 'text-gray-400 hover:text-white'}`}
                >
                  <Settings size={14} />
                  <span>{isEs ? 'Ajustes' : 'Settings'}</span>
                </button>
                <button
                  onClick={() => setAdminActiveTab('users')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${adminActiveTab === 'users' ? 'bg-fifa-gold text-black shadow-lg shadow-fifa-gold/15' : 'text-gray-400 hover:text-white'}`}
                >
                  <Users size={14} />
                  <span>{isEs ? 'Coleccionistas' : 'Collectors'}</span>
                </button>
                <button
                  onClick={() => setAdminActiveTab('stats')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${adminActiveTab === 'stats' ? 'bg-fifa-gold text-black shadow-lg shadow-fifa-gold/15' : 'text-gray-400 hover:text-white'}`}
                >
                  <Activity size={14} />
                  <span>{isEs ? 'Analíticas' : 'Stats'}</span>
                </button>
              </div>

              {/* Console Scrollable Body Container */}
              <div className="flex-1 overflow-y-auto space-y-5 pr-1 font-sans">
                {/* 1. SETTINGS TAB */}
                {adminActiveTab === 'settings' && (
                  <div className="space-y-4">
                    {/* Google Login Override Toggle */}
                    <div className="group p-5 bg-white/[0.02] rounded-[1.8rem] border border-white/5 hover:border-fifa-gold/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-bold text-white group-hover:text-fifa-gold transition-colors text-sm">Google Infrastructure</h3>
                          <p className="text-xs text-gray-500 leading-relaxed max-w-[320px]">
                            {isEs ? 'Permite el login seguro con credenciales de Google.' : 'Allow user authorization over official Google federated sign-in.'}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            const next = !globalSettings.googleLoginEnabled;
                            setGlobalSettings(s => ({ ...s, googleLoginEnabled: next }));
                            albumService.updateGlobalSettings({ googleLoginEnabled: next });
                          }}
                          className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner ${globalSettings.googleLoginEnabled ? 'bg-fifa-gold' : 'bg-gray-800'}`}
                        >
                          <motion.div 
                            animate={{ x: globalSettings.googleLoginEnabled ? 26 : 4 }}
                            className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg" 
                          />
                        </button>
                      </div>
                    </div>

                    {/* Password Authentication Toggle */}
                    <div className="group p-5 bg-white/[0.02] rounded-[1.8rem] border border-white/5 hover:border-fifa-gold/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-bold text-white group-hover:text-fifa-gold transition-colors text-sm">{isEs ? 'Cambio de Contraseñas' : 'Password Recovery'}</h3>
                          <p className="text-xs text-gray-500 leading-relaxed max-w-[320px]">
                            {isEs ? 'Activa el flujo de cambio y recuperación autónomo de contraseñas.' : 'Enable independent passwords changes and recovery flows.'}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            const next = !globalSettings.passwordChangeEnabled;
                            setGlobalSettings(s => ({ ...s, passwordChangeEnabled: next }));
                            albumService.updateGlobalSettings({ passwordChangeEnabled: next });
                          }}
                          className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner ${globalSettings.passwordChangeEnabled ? 'bg-fifa-gold' : 'bg-gray-800'}`}
                        >
                          <motion.div 
                            animate={{ x: globalSettings.passwordChangeEnabled ? 26 : 4 }}
                            className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg" 
                          />
                        </button>
                      </div>
                    </div>

                    {/* SERVER MAINTENANCE DEPLOYMENT MODE SWITCH */}
                    <div className="group p-5 bg-white/[0.02]/80 rounded-[1.8rem] border border-white/5 hover:border-fifa-red/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white group-hover:text-fifa-red transition-colors text-sm">
                              {isEs ? 'Modo Mantenimiento Global' : 'Global Maintenance Mode'}
                            </h3>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-black ${globalSettings.maintenanceModeEnabled ? 'bg-fifa-red/10 border border-fifa-red/30 text-fifa-red' : 'bg-white/5 text-gray-600'}`}>
                              {globalSettings.maintenanceModeEnabled ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed max-w-[320px]">
                            {isEs ? 'Bloquea el acceso para los usuarios comunes mientras optimizas bases de datos.' : 'Restricts active read/write query operations for regular collectors.'}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            const next = !globalSettings.maintenanceModeEnabled;
                            setGlobalSettings(s => ({ ...s, maintenanceModeEnabled: next }));
                            albumService.updateGlobalSettings({ maintenanceModeEnabled: next });
                          }}
                          className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner ${globalSettings.maintenanceModeEnabled ? 'bg-fifa-red' : 'bg-gray-800'}`}
                        >
                          <motion.div 
                            animate={{ x: globalSettings.maintenanceModeEnabled ? 26 : 4 }}
                            className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg" 
                          />
                        </button>
                      </div>
                    </div>

                    {/* Top Opening Announcement Edit Section */}
                    <div className="p-5 bg-white/[0.02] rounded-[1.8rem] border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-bold text-white text-sm">
                            {isEs ? 'Anuncio Emergente General' : 'Startup Pop-up Broadcast'}
                          </h3>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {isEs ? 'Configura el texto que verán tus usuarios al abrir la app.' : 'Draft custom message shown to collectors on startup.'}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            const next = !globalSettings.announcementEnabled;
                            setGlobalSettings(s => ({ ...s, announcementEnabled: next }));
                            albumService.updateGlobalSettings({ announcementEnabled: next });
                          }}
                          className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner shrink-0 ${globalSettings.announcementEnabled ? 'bg-fifa-gold' : 'bg-gray-800'}`}
                        >
                          <motion.div 
                            animate={{ x: globalSettings.announcementEnabled ? 26 : 4 }}
                            className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg" 
                          />
                        </button>
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-white/5">
                        <textarea
                          value={adminAnnouncementMessage}
                          onChange={(e) => setAdminAnnouncementMessage(e.target.value)}
                          placeholder={isEs ? 'Escribe tu anuncio público aquí...' : 'Write the public notification context here...'}
                          className="w-full h-24 bg-black/60 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-fifa-gold/40 transition-colors resize-none placeholder-gray-600 font-sans leading-relaxed"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={async () => {
                              try {
                                setSaveAnnounceLoading(true);
                                await albumService.updateGlobalSettings({ announcementText: adminAnnouncementMessage });
                                setGlobalSettings(s => ({ ...s, announcementText: adminAnnouncementMessage }));
                                alert(isEs ? '¡Mensaje guardado correctamente!' : 'Message saved successfully!');
                              } catch (err) {
                                console.error(err);
                              } finally {
                                setSaveAnnounceLoading(false);
                              }
                            }}
                            disabled={saveAnnounceLoading}
                            className="px-5 py-2.5 bg-fifa-gold text-black text-xs font-black uppercase tracking-wider rounded-xl hover:bg-yellow-400 hover:scale-[1.02] transition-all active:scale-[0.98] disabled:opacity-50"
                          >
                            {saveAnnounceLoading ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Guardar Cambios' : 'Save Text')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. USER MANAGER TAB */}
                {adminActiveTab === 'users' && (
                  <div className="space-y-4">
                    {/* Search Field */}
                    <div className="relative">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        placeholder={isEs ? "Filtrar por correo o nickname..." : "Search registered collector email or name..."}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-fifa-gold/40 transition-all"
                      />
                    </div>

                    {/* Collectors Container */}
                    <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-2 max-h-[350px] overflow-y-auto space-y-2 divide-y divide-white/5">
                      {adminMetricsLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                          <Activity className="animate-spin text-fifa-gold" size={24} />
                          <span className="text-xs font-mono tracking-widest uppercase">{isEs ? 'Accediendo a base de datos...' : 'Streaming from Firestore...'}</span>
                        </div>
                      ) : adminUsers.length === 0 ? (
                        <div className="py-12 text-center text-xs text-gray-500 font-sans">
                          {isEs ? 'Aún no hay coleccionistas registrados.' : 'No collectors registered yet.'}
                        </div>
                      ) : (
                        adminUsers
                          .filter(u => {
                            const queryStr = adminSearch.toLowerCase().trim();
                            if (!queryStr) return true;
                            const email = (u.email || "").toLowerCase();
                            const name = (u.displayName || "").toLowerCase();
                            return email.includes(queryStr) || name.includes(queryStr);
                          })
                          .map((colUser: any) => (
                            <div key={colUser.id} className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] rounded-xl transition-all">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-fifa-gold/20 to-[#1e1402] border border-fifa-gold/30 flex items-center justify-center text-xs font-bold text-fifa-gold uppercase shrink-0">
                                  {(colUser.displayName || colUser.email || '?')[0]}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white font-bold text-xs truncate max-w-[150px] sm:max-w-[200px]">
                                      {colUser.displayName || 'No Name'}
                                    </span>
                                    {colUser.isPremium && (
                                      <Diamond fill="currentColor" className="text-fifa-gold animate-pulse shrink-0" size={12} />
                                    )}
                                  </div>
                                  <span className="text-[10px] text-gray-500 block truncate max-w-[180px] sm:max-w-[240px] font-mono leading-tight">
                                    {colUser.email || colUser.id}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleUserPremium(colUser.id, !!colUser.isPremium)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${colUser.isPremium ? 'bg-fifa-gold text-black border-fifa-gold' : 'bg-transparent text-gray-400 border-white/10 hover:border-fifa-gold/30 hover:text-white'}`}
                                >
                                  {colUser.isPremium ? 'Premium (PRO)' : 'Grant PRO'}
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* 3. ANALYTICS & STATS TAB */}
                {adminActiveTab === 'stats' && (
                  <div className="space-y-4">
                    {/* Metrics Bento Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Metric 1 */}
                      <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl text-center space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block">
                          {isEs ? 'Coleccionistas Activos' : 'Total Collectors'}
                        </span>
                        {adminMetricsLoading ? (
                          <div className="h-6 w-16 bg-white/5 rounded animate-pulse mx-auto" />
                        ) : (
                          <span className="text-2xl font-display font-black text-white">{adminStats.totalUsers}</span>
                        )}
                        <span className="text-[9px] text-gray-600 block">{isEs ? 'Usuarios en base de datos' : 'Registered in database'}</span>
                      </div>

                      {/* Metric 2 */}
                      <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl text-center space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block">
                          {isEs ? 'Álbumes Creados' : 'Active Albums'}
                        </span>
                        {adminMetricsLoading ? (
                          <div className="h-6 w-16 bg-white/5 rounded animate-pulse mx-auto" />
                        ) : (
                          <span className="text-2xl font-display font-black text-white">{adminStats.totalAlbums}</span>
                        )}
                        <span className="text-[9px] text-gray-600 block">{isEs ? 'Colecciones activas' : 'Unique collections'}</span>
                      </div>

                      {/* Metric 3 */}
                      <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl text-center col-span-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
                            {isEs ? 'Proporción de Suscripciones VIP' : 'Premium Subscriber Rate'}
                          </span>
                          <span className="text-xs text-fifa-gold font-bold">
                            {adminStats.totalUsers > 0 ? Math.round((adminStats.totalPremium / adminStats.totalUsers) * 100) : 0}%
                          </span>
                        </div>
                        
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: adminStats.totalUsers > 0 ? `${(adminStats.totalPremium / adminStats.totalUsers) * 100}%` : '0%' }}
                            className="bg-fifa-gold h-full rounded-full"
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                          <span>{adminStats.totalPremium} {isEs ? 'Usuarios Premium' : 'Subscribers'}</span>
                          <span>{adminStats.totalUsers - adminStats.totalPremium} {isEs ? 'Básicos' : 'Free tier'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational System Telemetry Details */}
                    <div className="p-5 bg-black/40 border border-white/5 rounded-2xl font-mono text-[10px] text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 uppercase font-black">{isEs ? 'SISTEMA OPERATIVO' : 'SYSTEM PROTOCOL'}</span>
                        <span className="text-green-500 font-bold">ONLINE</span>
                      </div>
                      <div className="w-full h-px bg-white/5 my-2" />
                      <div className="grid grid-cols-2 gap-y-1.5 text-gray-400">
                        <div>Server Ingress:</div><div className="text-white text-right">0.0.0.0:3000</div>
                        <div>Target Engine:</div><div className="text-white text-right">Google Cloud Run</div>
                        <div>Database Sync:</div><div className="text-white text-right">Cloud Firestore</div>
                        <div>Active Key:</div><div className="text-fifa-gold text-right truncate">HIDDEN (API ENV)</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Console Sync Bar */}
              <div className="mt-6 pt-5 border-t border-white/5 shrink-0 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.18em] font-mono">
                    {isEs ? 'CONEXIÓN EN TIEMPO REAL ACTIVA' : 'REAL-TIME CONNECTION STABLE'}
                  </span>
                </div>
                <span className="text-[10px] text-gray-700 font-bold font-mono">CC-v3.5</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-bg/90 backdrop-blur-xl border-b border-white/5 pt-8 sm:pt-4 pb-2 sm:pb-3">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                <img src="https://i.postimg.cc/gkYK9kXr/Logo-Album-2026.png" className="w-8 h-8 object-contain" alt="" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-bold text-xl block">ColeCollect</h1>
                  {user.email === 'juliand.colediverti@gmail.com' && (
                    <button 
                      onClick={() => setAdminPremiumOverride(!adminPremiumOverride)}
                      className={`p-1 rounded-md border transition-colors ${isPremium ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-gray-500'}`}
                      title="Toggle Admin PRO"
                    >
                      <ShieldCheck size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setShowAdminDashboard(true)}
                className="p-2.5 bg-fifa-gold/10 hover:bg-fifa-gold/20 text-fifa-gold border border-fifa-gold/30 rounded-xl transition-all sm:hidden animate-pulse"
                title="Admin Dashboard"
              >
                <Settings size={18} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
            {isAdmin && (
              <button 
                onClick={() => setShowAdminDashboard(true)}
                className="p-2.5 bg-fifa-gold/10 hover:bg-fifa-gold/20 text-fifa-gold border border-fifa-gold/30 rounded-xl transition-all hidden sm:block"
                title="Admin Dashboard"
              >
                <Settings size={20} />
              </button>
            )}
            <div className="hidden md:flex gap-2 mr-2">
              <button 
                onClick={() => navigateView('collection')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all ${view === 'collection' ? 'text-fifa-gold' : 'text-gray-400 hover:text-white'}`}
              >
                <AlbumIcon size={16} /> {t('nav.album')}
              </button>
              <button 
                onClick={() => navigateView('community')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all relative ${view === 'community' ? 'text-fifa-gold' : 'text-gray-450 hover:text-white'}`}
              >
                <Users size={16} /> {t('nav.community')}
                {pendingMessages.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-fifa-red text-white text-[10px] flex items-center justify-center rounded-full border-2 border-dark-bg animate-bounce">
                    {pendingMessages.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => navigateView('stats')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition-all ${view === 'stats' ? 'text-fifa-gold' : 'text-gray-400 hover:text-white'}`}
              >
                <BarChart3 size={16} /> {t('nav.stats')}
              </button>
              <button 
                onClick={loadRanking}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-gray-400 hover:text-white transition-all"
              >
                <TrendingUp size={16} /> {t('nav.ranking')}
              </button>
            </div>
            
            <div className="flex bg-white/5 rounded-full p-1 border border-white/5 overflow-x-auto max-w-full sm:max-w-none scrollbar-none shrink-0 w-full sm:w-auto justify-start sm:justify-end">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => setActiveAlbum(album)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 whitespace-nowrap ${activeAlbum?.id === album.id ? 'bg-fifa-gold text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  {album.name}
                </button>
              ))}
              {albums.length < (isPremium ? 3 : 1) && (
                <button 
                  onClick={handleCreateAlbum}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold text-gray-500 hover:text-white transition-all flex items-center gap-1 shrink-0 whitespace-nowrap"
                >
                  <Plus size={14} /> {t('nav.new_album')}
                </button>
              )}
            </div>
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
        <div className="fifa-card h-auto p-5 sm:p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BarChart3 size={120} />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
                <div 
                  onClick={() => {
                    if (!globalSettings.passwordChangeEnabled && !isAdmin) {
                      alert(t('auth.password_change_disabled_alert'));
                      return;
                    }
                    if (isGoogleUser && isOnline) setShowPasswordModal(true);
                  }}
                  className={`w-12 h-12 rounded-full border-2 border-fifa-gold shrink-0 overflow-hidden bg-white/10 flex items-center justify-center relative ${isGoogleUser && isOnline ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'}`}
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg text-white truncate max-w-full">{user.displayName}</h2>
                    {isPremium && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-fifa-gold text-black text-[10px] font-black rounded-full uppercase italic tracking-tighter shrink-0">
                        <Diamond size={10} /> PRO
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">{activeAlbum?.name || 'Selecciona un álbum'}</p>
                  
                  {isGoogleUser && (
                    <p className="text-[11px] sm:text-[10px] text-fifa-gold/75 mt-1.5 whitespace-normal break-words leading-normal max-w-full sm:max-w-md">
                      {t('auth.password_hint')}
                    </p>
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
              
              <div className="grid grid-cols-3 gap-2 sm:gap-6 md:gap-8">
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

        <AnimatePresence mode="wait">
          {view === 'collection' && (
            <motion.div
              key="collection"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {!isPremium && <PremiumBanner onUpgrade={() => setShowPremiumModal(true)} type="offline" />}
              
              {!hideRPGWidget && (
                <div className="mb-6">
                  <RPGProgressWidget 
                    obtained={totalStats.obtained}
                    total={totalStats.total}
                    repeated={totalStats.repeated}
                    isEs={isEs}
                    achievements={appAchievements}
                    onScrollToMilestones={() => {
                      setView('stats');
                      setTimeout(() => {
                        const section = document.getElementById('album-milestones-section');
                        if (section) {
                          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 150);
                    }}
                  />
                </div>
              )}

              <ExportActions 
                inventory={inventory} 
                isPremium={isPremium} 
                onUpgradeRequest={() => setShowPremiumModal(true)} 
                userName={user.displayName || user.email || 'Collector'} 
                totalStats={totalStats}
                profile={userProfile}
                onExportPerformed={handleExportPerformed}
                activeAlbum={activeAlbum}
              />

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

                  <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5 md:w-auto">
                    {[
                      { id: 'all', label: t('album.filter_all') },
                      { id: 'repeated', label: t('album.filter_repeated'), color: 'text-purple-400' },
                      { id: 'missing', label: t('album.filter_missing'), color: 'text-gray-400' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={`flex-1 md:px-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${filter === f.id ? 'bg-fifa-gold text-black shadow-lg shadow-fifa-gold/20' : 'text-gray-500 hover:text-white'}`}
                      >
                        {f.label}
                      </button>
                    ))}
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
                        {quickTeam && !allowedQuickTeams.includes(quickTeam) && quickTeam.length <= 4 && (
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
                  {quickTeam && allowedQuickTeams.includes(quickTeam) && (
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
                      <div className="grid grid-cols-3 min-[390px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-3">
                        {(quickTeam === "FWC" ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] : 
                          quickTeam === "CC" ? Array.from({ length: albumCC.length }, (_, i) => i + 1) : 
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

            {!isLoading && !activeAlbum ? (
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
                ) && (filter === 'all' || 
                  (filter === 'repeated' && SPECIALS.some(c => inventory[c]?.status === 'repeated')) ||
                  (filter === 'missing' && SPECIALS.some(c => !inventory[c] || inventory[c].status === 'missing'))
                ) && (
                    <Section 
                      title="FWC" 
                      codes={SPECIALS} 
                      inventory={inventory} 
                      onUpdate={handleUpdateSticker}
                      searchQuery={searchQuery}
                      filter={filter}
                      isPremium={isPremium}
                      onTransfer={(code) => {
                        setTransferStickerCode(code);
                        setShowTransferModal(true);
                      }}
                    />
                  )}
                  
                  {TEAMS.filter(team => {
                    const query = normalize(searchQuery);
                    const teamInfo = TEAM_DETAILS[team];
                    const fullName = teamInfo ? teamInfo.name : "";
                    const teamCodes = Array.from({ length: 20 }, (_, i) => `${team}${i + 1}`);

                    // Filter teams based on status filter
                    if (filter === 'repeated') {
                      if (!teamCodes.some(c => inventory[c]?.status === 'repeated')) return false;
                    } else if (filter === 'missing') {
                      if (!teamCodes.some(c => !inventory[c] || inventory[c].status === 'missing')) return false;
                    }

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
                      filter={filter}
                      isPremium={isPremium}
                      onTransfer={(code) => {
                        setTransferStickerCode(code);
                        setShowTransferModal(true);
                      }}
                    />
                  ))}

                  {albumCC.length > 0 && (normalize(searchQuery) === "" || 
                    normalize(t('teams.CC')).includes(normalize(searchQuery)) ||
                    albumCC.some(c => normalize(c).includes(normalize(searchQuery)))
                  ) && (filter === 'all' || 
                    (filter === 'repeated' && albumCC.some(c => inventory[c]?.status === 'repeated')) ||
                    (filter === 'missing' && albumCC.some(c => !inventory[c] || inventory[c].status === 'missing'))
                  ) && (
                    <Section 
                      title="CC" 
                      codes={albumCC} 
                      inventory={inventory} 
                      onUpdate={handleUpdateSticker}
                      searchQuery={searchQuery}
                      filter={filter}
                      isPremium={isPremium}
                      onTransfer={(code) => {
                        setTransferStickerCode(code);
                        setShowTransferModal(true);
                      }}
                    />
                  )}
              </div>
            )}
            </motion.div>
          )}

          {view === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <StatsTab 
                inventory={inventory} 
                isPremium={isPremium} 
                onUpgrade={() => setShowPremiumModal(true)} 
                activeAlbum={activeAlbum} 
                includeCocaColaInStats={includeCocaColaInStats} 
              />
            </motion.div>
          )}

          {view === 'community' && (
            <motion.div
              key="community"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <CommunityView 
                currentUser={user} 
                userInventory={inventory} 
                activeAlbum={activeAlbum} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll-to-bottom Settings Trigger Button */}
        <div className="flex flex-col items-center justify-center mt-12 mb-20 pb-16 border-t border-white/5 pt-8">
          <button 
            onClick={() => {
              hapticFeedback(ImpactStyle.Light);
              setShowSettingsModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-fifa-gold transition-all font-bold text-sm rounded-2xl border border-white/10 hover:border-fifa-gold/30 shadow-lg group relative overflow-hidden"
          >
            <Settings size={18} className="group-hover:rotate-45 transition-transform duration-300" />
            <span>{t('nav.settings')}</span>
          </button>
          <p className="text-[9px] text-gray-500 mt-2 tracking-widest uppercase font-mono">ColeCollect — v1.0.0</p>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
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
              className="bg-dark-card w-full max-w-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-fifa-gold/5 shrink-0">
                <h3 className="text-xl font-display font-bold flex items-center gap-2">
                  <Settings className="text-fifa-gold" size={22} /> {t('nav.settings')}
                </h3>
                <button 
                  onClick={() => {
                    hapticFeedback(ImpactStyle.Light);
                    setShowSettingsModal(false);
                  }} 
                  className="p-2 hover:bg-white/5 bg-transparent rounded-full transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 select-text">
                
                {/* Theme Mode Toggle (Dark / Light) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                    {i18n.language.startsWith('es') ? 'Apariencia' : 'Appearance'}
                  </label>
                  <div className="grid grid-cols-2 gap-3 bg-white/5 p-1 rounded-2xl border border-white/5">
                    <button
                      onClick={() => {
                        setTheme('dark');
                        hapticFeedback(ImpactStyle.Light);
                      }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${
                        theme === 'dark' 
                          ? 'bg-fifa-gold text-black shadow-md font-black' 
                          : 'text-gray-400 hover:text-white bg-transparent'
                      }`}
                    >
                      <Moon size={14} />
                      <span>{i18n.language.startsWith('es') ? 'Oscuro' : 'Dark Mode'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setTheme('light');
                        hapticFeedback(ImpactStyle.Light);
                      }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${
                        theme === 'light' 
                          ? 'bg-fifa-gold text-black shadow-md font-black' 
                          : 'text-gray-400 hover:text-white bg-transparent'
                      }`}
                    >
                      <Sun size={14} />
                      <span>{i18n.language.startsWith('es') ? 'Claro' : 'Light Mode'}</span>
                    </button>
                  </div>
                </div>

                {/* Language Switcher */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                    {i18n.language.startsWith('es') ? 'Idioma' : 'Language'}
                  </label>
                  <div className="grid grid-cols-2 gap-3 bg-white/5 p-1 rounded-2xl border border-white/5">
                    <button
                      onClick={() => {
                        i18n.changeLanguage('es');
                        hapticFeedback(ImpactStyle.Light);
                      }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${
                        i18n.language.startsWith('es') 
                          ? 'bg-fifa-gold text-black shadow-md font-black' 
                          : 'text-gray-400 hover:text-white bg-transparent'
                      }`}
                    >
                      <Globe size={14} />
                      <span>Español</span>
                    </button>
                    <button
                      onClick={() => {
                        i18n.changeLanguage('en');
                        hapticFeedback(ImpactStyle.Light);
                      }}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${
                        !i18n.language.startsWith('es') 
                          ? 'bg-fifa-gold text-black shadow-md font-black' 
                          : 'text-gray-400 hover:text-white bg-transparent'
                      }`}
                    >
                      <Globe size={14} />
                      <span>English</span>
                    </button>
                  </div>
                </div>

                {/* Coca-Cola statistics toggle */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex flex-col pr-4">
                      <label className="text-xs font-bold text-white">
                        {i18n.language.startsWith('es') ? 'Estadísticas de Coca-Cola' : 'Coca-Cola Statistics'}
                      </label>
                      <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                        {i18n.language.startsWith('es') 
                          ? 'Incluir barajitas de Coca-Cola en el progreso y estadísticas.' 
                          : 'Include Coca-Cola stickers in completion progress and statistics.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = !includeCocaColaInStats;
                        setIncludeCocaColaInStats(next);
                        localStorage.setItem('includeCocaColaInStats', next ? 'true' : 'false');
                        hapticFeedback(ImpactStyle.Light);
                      }}
                      className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner flex items-center shrink-0 ${includeCocaColaInStats ? 'bg-fifa-gold' : 'bg-gray-800'}`}
                    >
                      <motion.div 
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        animate={{ x: includeCocaColaInStats ? 26 : 4 }}
                        className="w-6 h-6 rounded-full bg-white shadow-md"
                      />
                    </button>
                  </div>
                </div>

                {/* Hide RPG Progress Widget Toggle */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex flex-col pr-4">
                      <label className="text-xs font-bold text-white">
                        {i18n.language.startsWith('es') ? 'Ocultar progreso RPG' : 'Hide RPG Progress'}
                      </label>
                      <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                        {i18n.language.startsWith('es') 
                          ? 'Ocultar el panel de nivel RPG, rango, racha y medallas.' 
                          : 'Hide the RPG progress dashboard, rank, streaks, and medals.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = !hideRPGWidget;
                        setHideRPGWidget(next);
                        localStorage.setItem('hideRPGWidget', next ? 'true' : 'false');
                        hapticFeedback(ImpactStyle.Light);
                      }}
                      className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner flex items-center shrink-0 ${hideRPGWidget ? 'bg-fifa-gold' : 'bg-gray-800'}`}
                      id="hide-rpg-toggle-btn"
                    >
                      <motion.div 
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        animate={{ x: hideRPGWidget ? 26 : 4 }}
                        className="w-6 h-6 rounded-full bg-white shadow-md"
                      />
                    </button>
                  </div>
                </div>

                {/* Universal Repeats Toggle */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex flex-col pr-4">
                      <label className="text-xs font-bold text-white">
                        {i18n.language.startsWith('es') ? 'Repetidas Universales' : 'Universal Repeats'}
                      </label>
                      <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                        {i18n.language.startsWith('es') 
                          ? 'Sincronizar y compartir las barajitas repetidas automáticamente entre todos los álbumes de tu cuenta.' 
                          : 'Sincronizadamente keep and share your duplicate stickers automatically across all albums in your account.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = !universalRepeats;
                        handleToggleUniversalRepeats(next);
                      }}
                      className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner flex items-center shrink-0 ${universalRepeats ? 'bg-fifa-gold' : 'bg-gray-800'}`}
                      id="universal-repeats-toggle-btn"
                    >
                      <motion.div 
                        layout
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        animate={{ x: universalRepeats ? 26 : 4 }}
                        className="w-6 h-6 rounded-full bg-white shadow-md"
                      />
                    </button>
                  </div>
                </div>

                {/* Inverted Mode Button */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-white mb-1">
                      {i18n.language.startsWith('es') ? 'Modo Inverso / Rellenar' : 'Inverted Mode / Auto-Fill'}
                    </label>
                    <p className="text-[10px] text-gray-400 leading-normal mb-3">
                      {i18n.language.startsWith('es') 
                        ? 'Configura tu álbum marcando todo como completado excepto un máximo de 30 barajitas faltantes.' 
                        : 'Configure your album by marking everything collected except up to 30 missing ones.'}
                    </p>
                    <button
                      onClick={() => {
                        hapticFeedback(ImpactStyle.Medium);
                        setShowSettingsModal(false);
                        setShowInvertedModal(true);
                      }}
                      className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm"
                      id="inverted-mode-btn"
                    >
                      <Star className="animate-pulse text-amber-400" size={13} />
                      <span>{i18n.language.startsWith('es') ? 'Configurar Modo Inverso' : 'Configure Inverted Mode'}</span>
                    </button>
                  </div>
                </div>

                {/* Album Management */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {i18n.language.startsWith('es') ? 'Mis Álbumes' : 'My Albums'}
                    </label>
                    <span className="text-[10px] text-gray-500 font-bold">
                      {albums.length} / {isPremium ? 3 : 1}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {albums.map((album) => {
                      const isEditing = editingAlbumId === album.id;
                      return (
                        <div 
                          key={album.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            activeAlbum?.id === album.id 
                              ? 'bg-fifa-gold/10 border-fifa-gold/30' 
                              : 'bg-white/5 border-white/5'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 w-full">
                              <input
                                type="text"
                                value={editingAlbumName}
                                onChange={(e) => setEditingAlbumName(e.target.value)}
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-fifa-gold"
                                autoFocus
                              />
                              <button
                                onClick={async () => {
                                  await handleRenameAlbum(album.id, editingAlbumName);
                                  setEditingAlbumId(null);
                                  hapticFeedback(ImpactStyle.Light);
                                }}
                                className="p-1 px-2.5 bg-green-500 hover:bg-green-600 text-black rounded-lg font-bold text-[10px]"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingAlbumId(null)}
                                className="p-1 px-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-[10px]"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-bold text-xs truncate text-white">{album.name}</span>
                                {activeAlbum?.id === album.id && (
                                  <span className="text-[8px] text-fifa-gold font-bold uppercase tracking-wider mt-0.5">
                                    {i18n.language.startsWith('es') ? 'Álbum Activo' : 'Active Album'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-4">
                                <button
                                  onClick={() => {
                                    setEditingAlbumId(album.id);
                                    setEditingAlbumName(album.name);
                                    hapticFeedback(ImpactStyle.Light);
                                  }}
                                  className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors"
                                  title={i18n.language.startsWith('es') ? 'Cambiar Nombre' : 'Rename'}
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteAlbum(album.id);
                                    hapticFeedback(ImpactStyle.Medium);
                                  }}
                                  className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-fifa-red rounded-lg transition-colors"
                                  title={i18n.language.startsWith('es') ? 'Eliminar' : 'Delete'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Licensing & Restore purchases */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">
                        {isPremium 
                          ? (i18n.language.startsWith('es') ? 'Licencia Premium Activa 🌟' : 'Premium License Active 🌟')
                          : (i18n.language.startsWith('es') ? 'Licencia Gratuita (Free)' : 'Free License')}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                        {isPremium 
                          ? (i18n.language.startsWith('es') ? 'Dispones de acceso total permanente.' : 'You have permanent lifetime access.')
                          : (i18n.language.startsWith('es') ? 'Mejora para habilitar modo offline y álbumes ilimitados.' : 'Upgrade to enable offline mode & 3 albums.')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handleRestore();
                      hapticFeedback(ImpactStyle.Medium);
                    }}
                    disabled={upgrading}
                    className="w-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-fifa-gold border border-white/10 transition-all font-bold text-xs py-3 rounded-xl uppercase tracking-[0.15em] flex items-center justify-center gap-2"
                  >
                    {upgrading ? (
                      <div className="w-4 h-4 border-2 border-fifa-gold border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Diamond size={14} />
                        <span>{t('album.premium_restore_button')}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      hapticFeedback(ImpactStyle.Medium);
                      setShowSettingsModal(false);
                      handleLogout();
                    }}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-fifa-red border border-red-500/20 transition-all font-bold text-xs py-3 rounded-xl uppercase tracking-[0.15em] flex items-center justify-center gap-2 mt-4"
                  >
                    <LogOut size={14} />
                    <span>{i18n.language.startsWith('es') ? 'Cerrar Sesión' : 'Log Out'}</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inverted Mode Modal */}
      <InvertedModeModal 
        isOpen={showInvertedModal}
        onClose={() => setShowInvertedModal(false)}
        albums={albums}
        activeAlbum={activeAlbum}
        setActiveAlbum={setActiveAlbum}
        albumService={albumService}
        isEs={i18n.language.startsWith('es')}
        onSuccess={(albumName) => {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#D4AF37', '#ffffff', '#FFD700']
          });
        }}
      />

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <TransferModal 
            isOpen={showTransferModal}
            onClose={() => setShowTransferModal(false)}
            albums={albums}
            activeAlbumId={activeAlbum?.id || ''}
            code={transferStickerCode}
            onTransfer={handleTransferSticker}
            loading={transferLoading}
          />
        )}
      </AnimatePresence>

      <PremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={handleUpgrade}
        onRestore={handleRestore}
        loading={upgrading}
        profile={userProfile}
        user={user}
        onLink={handleLinkGoogle}
        onClaim={handleClaimTrial}
      />

      <AnimatePresence>
        {showOfflineAlert && (
          <OfflinePremiumAlert 
            isOpen={showOfflineAlert} 
            onClose={() => setShowOfflineAlert(false)}
            onUpgrade={() => {
              setShowOfflineAlert(false);
              setShowPremiumModal(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Footer Nav for Mobile */}
      {!showPremiumModal && !showRanking && !showAdminDashboard && (
        <nav className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-3xl border border-white/10 rounded-full px-6 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-8 text-gray-400 z-[100]">
        <button 
          onClick={() => navigateView('collection')}
          className={`flex flex-col items-center gap-1 ${view === 'collection' ? 'text-fifa-gold' : ''}`}
        >
          <AlbumIcon size={24} />
          <span className="text-[8px] font-bold uppercase">{t('nav.album')}</span>
        </button>
        <button 
          onClick={() => navigateView('stats')}
          className={`flex flex-col items-center gap-1 ${view === 'stats' ? 'text-fifa-gold' : ''}`}
        >
          <BarChart3 size={24} />
          <span className="text-[8px] font-bold uppercase">{t('nav.stats')}</span>
        </button>
        <button 
          onClick={() => isOnline && navigateView('community')}
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
          onClick={() => {
            hapticFeedback(ImpactStyle.Light);
            loadRanking();
          }} 
          disabled={!isOnline}
          className={`flex flex-col items-center gap-1 ${!isOnline ? 'opacity-30 grayscale' : ''}`}
        >
          <TrendingUp size={24} />
          <span className="text-[8px] font-bold uppercase">{t('nav.ranking')}</span>
        </button>
      </nav>
    )}

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
