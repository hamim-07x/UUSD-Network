import React from "react";
import { ChevronLeft, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSettings } from "../lib/SettingsContext";

export function Notifications() {
  const navigate = useNavigate();
  const { settings, updateSettings, t } = useSettings();

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full bg-[#13141a] text-white pb-24 relative"
    >
      <header className="flex items-center gap-4 p-4 mb-2">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-white/80 active:scale-95 transition-transform bg-white/[0.04] rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">{t('Notifications')}</h1>
      </header>

      <div className="px-4 mt-2">
        <div className="bg-[#16171f] border border-white/5 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-full bg-[#FF4B4B]/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#FF4B4B]" />
            </div>
            <div>
              <h2 className="text-base font-bold">Push Notifications</h2>
              <p className="text-[11px] text-white/50 leading-tight">Receive alerts about rewards and transfers</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('Allow Notifications')}</span>
            <button 
              onClick={() => updateSettings({ notifications: !settings.notifications })}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.notifications ? "bg-[#8792FF]" : "bg-white/10"}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.notifications ? "left-7" : "left-1"}`}></div>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
