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
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#8792FF]/30 to-[#6b76e3]/20 border border-[#8792FF]/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(135,146,255,0.2)]">
                <WalletIcon className="w-10 h-10 text-[#8792FF]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">App Officially Closed</h1>
              <p className="text-white/60 mb-8 text-sm leading-relaxed">
                The app has been temporarily shut down due to technical issues. Updates will be provided via Twitter. Please stay tuned for further information.
              </p>
              {maintenanceTwitterLink && (
                <a href={maintenanceTwitterLink} target="_blank" rel="noopener noreferrer" className="w-full bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-bold py-3.5 px-6 rounded-2xl transition-all text-center shadow-[0_0_24px_rgba(29,161,242,0.35)] flex items-center justify-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23.953 4.57009C23.0545 4.96563 22.1026 5.22673 21.128 5.34493C22.1524 4.73031 22.926 3.76634 23.2913 2.62243C22.34 3.18956 21.2961 3.58514 20.2039 3.80009C19.507 3.05608 18.5771 2.56455 17.5516 2.41584C16.5262 2.26713 15.4627 2.4704 14.5262 2.99427C13.5898 3.51813 12.8315 4.33534 12.3667 5.32356C11.9018 6.31178 11.7547 7.41908 11.9463 8.48009C10.02 8.38318 8.13624 7.88602 6.42533 6.92484C4.71442 5.96366 3.21626 4.56041 2.03033 2.81009C1.61118 3.53582 1.39054 4.35921 1.39054 5.19709C1.39054 7.03709 2.32759 8.66009 3.7543 9.61009C2.96913 9.58525 2.20336 9.37326 1.51733 8.99009V9.05009C1.51732 10.2014 1.91695 11.3197 2.64654 12.2078C3.37613 13.0959 4.3891 13.6966 5.5063 13.9031C4.77353 14.1017 4.00416 14.1306 3.2593 13.9871C3.57723 14.9781 4.19515 15.8368 5.02598 16.4428C5.8568 17.0488 6.85822 17.3718 7.8893 17.3911C6.01254 18.8687 3.71426 19.6644 1.3263 19.6611C0.932822 19.6611 0.539345 19.638 0.145869 19.5919C2.5694 21.1565 5.37894 22.0007 8.2723 22.0001C18.0263 22.0001 23.3643 13.9211 23.3643 6.91809C23.3643 6.68809 23.3593 6.45809 23.3483 6.22809C24.3879 5.47466 25.2678 4.54011 25.9383 3.47309L23.953 4.57009Z" />
                  </svg>
                  Follow our Twitter for updates
                </a>
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
