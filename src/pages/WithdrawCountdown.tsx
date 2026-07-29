import React, { useState, useEffect } from "react";
import { ChevronLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSettings } from "../lib/SettingsContext";

export function WithdrawCountdown() {
  const navigate = useNavigate();
  const { t } = useSettings();
  
  const targetDate = new Date("2026-08-05T12:00:00Z").getTime();
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    mins: 0,
    secs: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          mins: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          secs: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full text-white pb-24 relative overflow-y-auto"
    >
      <header className="flex items-center gap-4 p-4 mb-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80 active:scale-95 transition-transform bg-white/[0.04] backdrop-blur-2xl border border-white/[0.05] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white/90">Withdraw</h1>
      </header>

      <div className="px-4 flex flex-col items-center pt-8">
        <div className="w-20 h-20 bg-white/[0.04] backdrop-blur-md rounded-full border border-white/[0.05] flex items-center justify-center mb-6 shadow-xl">
          <Lock className="w-8 h-8 text-[#8792FF]" />
        </div>
        
        <h2 className="text-2xl font-black mb-2 text-center text-white/90">Withdraw Available Soon</h2>
        <p className="text-white/50 text-sm text-center mb-10 max-w-[240px]">
          Withdrawals will be enabled on<br/>
          <strong className="text-white/80">August 5, 2026, 12:00 UTC</strong>
        </p>

        <div className="grid grid-cols-4 gap-3 w-full max-w-[320px]">
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-4 flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <span className="text-2xl font-mono font-bold text-[#8792FF]">{String(timeLeft.days).padStart(2, '0')}</span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Days</span>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-4 flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <span className="text-2xl font-mono font-bold text-white/90">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Hours</span>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-4 flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <span className="text-2xl font-mono font-bold text-white/90">{String(timeLeft.mins).padStart(2, '0')}</span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Mins</span>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-4 flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <span className="text-2xl font-mono font-bold text-white/90">{String(timeLeft.secs).padStart(2, '0')}</span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Secs</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
