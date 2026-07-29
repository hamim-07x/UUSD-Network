import React from "react";
import { ChevronLeft, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSettings } from "../lib/SettingsContext";
import { cn } from "../lib/utils";

export function Notifications() {
  const navigate = useNavigate();
  const { settings, updateSettings, t } = useSettings();

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full text-white pb-24 relative"
    >
      <header className="flex items-center gap-4 p-4 mb-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80 active:scale-95 transition-transform bg-white/[0.04] backdrop-blur-2xl border border-white/[0.05] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white/90">{t('Notifications')}</h1>
      </header>

      <div className="px-4 mt-2">
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-3xl p-5">
          <div className="flex items-center gap-4 mb-6 pb-5 border-b border-white/[0.05]">
            <div className="w-12 h-12 rounded-2xl bg-[#FF4B4B]/20 flex items-center justify-center border border-[#FF4B4B]/30 shadow-[0_0_20px_rgba(255,75,75,0.15)]">
              <Bell className="w-6 h-6 text-[#FF4B4B]" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white/90">Push Notifications</h2>
              <p className="text-[12px] text-white/50 leading-tight mt-1">Receive alerts about rewards and transfers</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-medium text-white/80">{t('Allow Notifications')}</span>
            <button 
              onClick={() => updateSettings({ notifications: !settings.notifications })}
              className={cn(
                "relative flex items-center h-7 w-12 rounded-full transition-colors duration-300 border",
                settings.notifications ? "bg-[#8792FF] border-[#8792FF]/50" : "bg-white/[0.04] backdrop-blur-md border-white/10"
              )}
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "absolute h-5 w-5 bg-white rounded-full shadow-md",
                  settings.notifications ? "left-[22px]" : "left-[3px]"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
