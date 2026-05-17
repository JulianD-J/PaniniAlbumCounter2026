import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Users, 
  BarChart3, 
  Album, 
  X,
  Sparkles
} from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 'welcome',
    title: 'welcome.title',
    desc: 'welcome.desc',
    icon: Sparkles,
    color: 'bg-fifa-gold'
  },
  {
    id: 'stickers',
    title: 'stickers.title',
    desc: 'stickers.desc',
    icon: Album,
    color: 'bg-blue-500'
  },
  {
    id: 'bazar',
    title: 'bazar.title',
    desc: 'bazar.desc',
    icon: Users,
    color: 'bg-fifa-red'
  },
  {
    id: 'stats',
    title: 'stats.title',
    desc: 'stats.desc',
    icon: BarChart3,
    color: 'bg-green-500'
  }
];

export default function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const hapticFeedback = async (style = ImpactStyle.Light) => {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(10);
      }
    }
  };

  const next = () => {
    hapticFeedback();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prev = () => {
    hapticFeedback();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-dark-card border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
             <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-fifa-gold' : 'w-2 bg-white/10'}`} 
                />
              ))}
            </div>
            <button 
              onClick={onComplete}
              className="text-gray-500 hover:text-white transition-colors p-2"
            >
              <X size={20} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <div className={`w-20 h-20 mx-auto rounded-[24px] ${steps[currentStep].color} flex items-center justify-center shadow-lg shadow-black/20`}>
                <StepIcon size={40} className="text-white" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-bold text-white">
                  {t(`onboarding.${steps[currentStep].id}.title`)}
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t(`onboarding.${steps[currentStep].id}.desc`)}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 flex gap-4">
            {currentStep > 0 && (
              <button 
                onClick={prev}
                className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-gray-400 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft size={20} /> {t('common.back')}
              </button>
            )}
            <button 
              onClick={next}
              className="flex-[2] px-6 py-4 rounded-2xl bg-fifa-gold text-black font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-fifa-gold/20"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle2 size={20} /> {t('common.finish')}
                </>
              ) : (
                <>
                  {t('common.next')} <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
