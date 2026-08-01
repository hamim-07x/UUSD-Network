/**
 * #AI_ZONE: APP_SHELL
 * Wallet creation gate: blocks BottomNav + routes until wallet exists.
 * Keep main user UI theme (#13141a / #8792FF). Do not redesign casually.
 */

import React, { useEffect, useState, useRef } from "react";
import { Outlet, useLocation, useOutlet, Navigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import WebApp from "@twa-dev/sdk";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingScreen } from "./LoadingScreen";
import { useTelegramUser } from "../../hooks/useTelegramUser";
import { useWallet } from "../../hooks/useWallet";
import { SettingsProvider } from "../../lib/SettingsContext";
import { Wallet as WalletIcon } from "lucide-react";
import { db } from "../../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export function AppLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const telegramUser = useTelegramUser();
  const { isLoading: isWalletLoading, needsCreation, isCreating, createWallet, fullWallet } = useWallet(telegramUser);
  const [isInitializing, setIsInitializing] = useState(true);
  const [minTimeDone, setMinTimeDone] = useState(false);

  // Wallet creation progress (10-15 seconds)
  const [showCreationAnim, setShowCreationAnim] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);

  const [isMaintenanceMode, setIsMaintenanceMode] = useState(true);
  const [maintenanceTwitterLink, setMaintenanceTwitterLink] = useState("https://x.com/UUSDNetwork");

  useEffect(() => {
    if (WebApp.initDataUnsafe?.user || typeof window !== "undefined") {
      try {
        WebApp.expand();
        WebApp.ready();
        WebApp.setHeaderColor("#13141a");
        WebApp.setBackgroundColor("#13141a");
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const minTimer = setTimeout(() => {
      setMinTimeDone(true);
    }, 2000);
    return () => clearTimeout(minTimer);
  }, []);

  useEffect(() => {
    if (!isWalletLoading && minTimeDone) {
      setIsInitializing(false);
    }
  }, [isWalletLoading, minTimeDone]);

  // Listen for maintenance mode
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.maintenanceMode !== undefined) setIsMaintenanceMode(!!data.maintenanceMode);
        if (data.maintenanceTwitterLink) setMaintenanceTwitterLink(data.maintenanceTwitterLink);
      }
    }, (err) => {
      console.error("Maintenance mode check failed:", err);
      // If Firebase fails (e.g. quota), do not block the app
      setIsMaintenanceMode(false); 
    });
    return () => unsub();
  }, []);

  // Creation animation: ~12 seconds then create wallet
  useEffect(() => {
    if (!showCreationAnim) return;
    const duration = 500; // Fast for preview
    const tick = 50;
    const step = 100 / (duration / tick);
    const interval = setInterval(() => {
      setCreationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.min(100, prev + step);
      });
    }, tick);

    const timeout = setTimeout(() => {
      createWallet();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [showCreationAnim]);

  const handleStartCreation = () => {
    setShowCreationAnim(true);
    setCreationProgress(0);
  };

  return (
    <SettingsProvider telegramId={telegramUser.telegramId}>
      <>
        <AnimatePresence>
          {isInitializing && <LoadingScreen key="loading-screen" />}
        </AnimatePresence>

        {/* MAINTENANCE MODE GATE */}
        {!isInitializing && isMaintenanceMode ? (
          <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-6 bg-[#13141a] text-white">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center max-w-sm w-full">
              <div className="w-24 h-24 rounded-3xl bg-[#8792FF]/10 flex items-center justify-center mb-6 border border-[#8792FF]/20 shadow-[0_0_40px_rgba(135,146,255,0.15)] overflow-hidden">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Service Unavailable</h1>
              <p className="text-white/60 mb-8 text-sm leading-relaxed">
                The app has been suspended or temporarily paused due to technical issues. An update will be available on Twitter.
              </p>
              {maintenanceTwitterLink && (
                <a href={maintenanceTwitterLink} target="_blank" rel="noopener noreferrer" className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-bold py-3.5 px-6 rounded-2xl transition-all text-center shadow-[0_0_24px_rgba(29,161,242,0.35)]">Log in to Twitter for updates</a>
              )}
            </motion.div>
          </div>
        ) : 

        /* FORCE WALLET CREATION GATE — no other page until wallet exists */
        !isInitializing && needsCreation ? (
          <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-6 bg-[#13141a] text-white">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center max-w-sm w-full"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#8792FF]/30 to-[#6b76e3]/20 border border-[#8792FF]/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(135,146,255,0.2)]">
                <WalletIcon className="w-10 h-10 text-[#8792FF]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome to UUSD Network</h1>
              <p className="text-white/60 mb-8 text-sm leading-relaxed">
                Create your decentralized wallet to start earning, sending, and receiving tokens securely.
              </p>

              {showCreationAnim || isCreating ? (
                <div className="w-full flex flex-col items-center">
                  <span className="text-white/80 font-semibold mb-3 text-sm">
                    Creating Wallet... {Math.min(Math.floor(creationProgress), 100)}%
                  </span>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#8792FF] to-[#6b76e3] rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${creationProgress}%` }}
                      transition={{ ease: "linear", duration: 0.1 }}
                    />
                  </div>
                  <span className="text-xs text-white/40 mt-3">Please wait, setting up your wallet...</span>
                  <p className="text-[11px] text-white/30 mt-4">Do not close the app</p>
                </div>
              ) : (
                <button
                  onClick={handleStartCreation}
                  className="w-full bg-gradient-to-r from-[#8792FF] to-[#6b76e3] hover:opacity-95 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-[0_0_24px_rgba(135,146,255,0.35)] active:scale-[0.98]"
                >
                  Create Wallet
                </button>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="min-h-screen w-full flex flex-col pt-[env(safe-area-inset-top)] pb-[calc(6rem+env(safe-area-inset-bottom))] text-white font-sans selection:bg-blue-500/30">
            <main className="flex-1 w-full max-w-md mx-auto relative px-4 pt-4 z-0">
              <AnimatePresence mode="wait">
                {fullWallet?.blocked ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-[70vh] text-center"
                  >
                    <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mb-4 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    </div>
                    <h2 className="text-xl font-bold text-red-400 mb-2">Account Blocked</h2>
                    <p className="text-white/60 text-sm max-w-[250px] leading-relaxed">
                      Your account has been restricted by the administrator. Contact support if you believe this is a mistake.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="w-full h-full"
                  >
                    {outlet}
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
            {!fullWallet?.blocked && <BottomNav />}
          </div>
        )}
      </>
    </SettingsProvider>
  );
}
