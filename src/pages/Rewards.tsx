/**
 * #AI_ZONE: REWARDS_TASKS
 * Flow: start → open link → 5s → verify → claim.
 * Tasks/events from Firestore; completed_tasks per user.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, ScanLine, Clock, ArrowRight, CheckCircle, Send, Globe, Users, Bell } from "lucide-react";
import { FaTwitter, FaInstagram, FaFacebook, FaYoutube, FaTelegramPlane } from 'react-icons/fa';
import { useWallet } from "../hooks/useWallet";
import { useTelegramUser } from "../hooks/useTelegramUser";
import { useNavigate } from "react-router-dom";
import { TOKENS } from "../lib/tokens";
import { getEvents, getTasks, getCompletedTasks, saveCompletedTasks } from "../lib/db";
import { verifyTaskCompletion, getReferralCount } from "../lib/verifyTask";
import { useSettings } from "../lib/SettingsContext";

export function Rewards() {
  const telegramUser = useTelegramUser();
  const { settings, t } = useSettings();
  const { telegramId, firstName, photoUrl } = telegramUser;
  const navigate = useNavigate();
  const { addActivity } = useWallet(telegramUser);
  const [taskStates, setTaskStates] = useState<Record<string, 'start' | 'verify' | 'claim' | 'done'>>({});
  const [taskCountdowns, setTaskCountdowns] = useState<Record<string, number>>({});
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeEventCategory, setActiveEventCategory] = useState<string>("All");
  const [events, setEvents] = useState<any[]>([]);
  const [timeLefts, setTimeLefts] = useState<Record<string, { days: number, hours: number, mins: number, secs: number }>>({});
  const [notificationState, setNotificationState] = useState<{show: boolean, message: string, amount?: number, isError?: boolean} | null>(null);
  
  const setNotification = (notif: any) => {
    if (notif === null) {
      setNotificationState(null);
      return;
    }
    // Only show if notifications are enabled
    if (settings.notifications) {
      setNotificationState(notif);
    }
  };
  
  const notification = notificationState;

  const rewardToken = TOKENS.find(t => t.symbol === "UUSD");
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      let dbEvents: any[] | null = null;
      let dbTasks: any[] | null = null;
      
      try {
        dbEvents = await getEvents();
        dbTasks = await getTasks();
      } catch (err) {
        console.log("Firebase fetch failed, falling back to local storage:", err);
      }

      if (!active) return;

      // Firebase is the only source of truth for events/tasks
      const loadedEvents = (dbEvents && dbEvents.length > 0)
        ? dbEvents
        : [{ id: "default", title: "Main Event", rewardText: "10,000 UUSD\nReward Pool", posterUrl: "", durationDays: 15, category: "General" }];
      setEvents(loadedEvents);

      const loadedTasks = (dbTasks && dbTasks.length > 0) ? dbTasks : [];
      setTasks(loadedTasks);

      // Completed tasks from Firebase only
      let completed: any = {};
      try {
        completed = await getCompletedTasks(telegramId);
      } catch (err) {
        console.error("Failed to load completed tasks", err);
        completed = {};
      }

      const states: any = {};
      
      Object.keys(completed).forEach(k => {
        if (completed[k]) states[k] = 'done';
      });
        
        // Auto-check referral thresholds from Firebase
        try {
          const currentRefs = await getReferralCount(telegramId);
          loadedTasks.forEach((task: any) => {
            if ((task.category === "Referral" || task.iconType === "referral") && !states[task.id]) {
              if (currentRefs >= (task.requiredReferrals || 1)) {
                states[task.id] = "claim";
              }
            }
          });
        } catch (_) {}

        setTaskStates(states);

        // Load timer
        let startTime = localStorage.getItem('mock_event_start_time');
        if (!startTime) {
          startTime = Date.now().toString();
          localStorage.setItem('mock_event_start_time', startTime);
        }
        
        const updateTimers = () => {
          const now = Date.now();
          const newTimeLefts: any = {};
          loadedEvents.forEach((ev: any) => {
            const durationDays = ev.durationDays || 15;
            const endTime = parseInt(startTime!) + durationDays * 24 * 60 * 60 * 1000;
            const diff = endTime - now;
            if (diff <= 0) {
              newTimeLefts[ev.id] = { days: 0, hours: 0, mins: 0, secs: 0 };
            } else {
              newTimeLefts[ev.id] = {
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                mins: Math.floor((diff / 1000 / 60) % 60),
                secs: Math.floor((diff / 1000) % 60)
              };
            }
          });
          setTimeLefts(newTimeLefts);
        };

        updateTimers();
        const intervalId = setInterval(updateTimers, 1000);
        return intervalId;
    };

    let timerInterval: any;
    fetchData().then(intervalId => {
      timerInterval = intervalId;
    });

    return () => {
      active = false;
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [telegramId]);

  // Task flow: Start → open link → 5s countdown → Verify → (API/referral check) → Claim
  const [verifyingTasks, setVerifyingTasks] = useState<Record<string, boolean>>({});

  const handleTaskAction = async (task: any) => {
    const taskId = task.id;
    const currentState = taskStates[taskId] || "start";
    const icon = (task.iconType || "").toLowerCase();
    const isTelegram = icon === "telegram";
    const isTwitter = icon === "twitter";
    const isReferral = (task.category || "").toLowerCase() === "referral" || icon === "referral";

    if (currentState === "start") {
      // Open task link when present
      if (task.link && !isReferral) {
        window.open(task.link, "_blank", "noopener,noreferrer");
      }

      // Always 5 second countdown before Verify appears
      setTaskCountdowns((prev) => ({ ...prev, [taskId]: 5 }));
      let timeLeft = 5;
      const interval = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          clearInterval(interval);
          setTaskStates((prev) => ({ ...prev, [taskId]: "verify" }));
          setTaskCountdowns((prev) => {
            const n = { ...prev };
            delete n[taskId];
            return n;
          });
        } else {
          setTaskCountdowns((prev) => ({ ...prev, [taskId]: timeLeft }));
        }
      }, 1000);
      return;
    }

    if (currentState === "verify") {
      setVerifyingTasks((prev) => ({ ...prev, [taskId]: true }));
      try {
        // Strict checks for referral + API-required telegram/twitter
        const result = await verifyTaskCompletion(
          {
            id: task.id,
            category: task.category,
            iconType: task.iconType,
            link: task.link,
            requireVerification: task.requireVerification || isTelegram || isTwitter,
            requiredReferrals: task.requiredReferrals || 1,
          },
          telegramId
        );

        if (!result.ok) {
          setNotification({
            show: true,
            message: result.message || "Verification failed. Complete the action and try again.",
            isError: true,
          });
          setTimeout(() => setNotification(null), 4000);
          return;
        }

        setTaskStates((prev) => ({ ...prev, [taskId]: "claim" }));
      } catch (e: any) {
        setNotification({
          show: true,
          message: e?.message || "Verification error. Try again.",
          isError: true,
        });
        setTimeout(() => setNotification(null), 4000);
      } finally {
        setVerifyingTasks((prev) => ({ ...prev, [taskId]: false }));
      }
      return;
    }

    if (currentState === "claim") {
      setTaskStates((prev) => ({ ...prev, [taskId]: "done" }));

      // Save completion to Firebase only (no localStorage source of truth)
      try {
        const completed = await getCompletedTasks(telegramId);
        const newCompleted = { ...completed, [taskId]: true };
        await saveCompletedTasks(telegramId, newCompleted);
      } catch (err) {
        console.error("Failed to save completed task", err);
        setNotification({ show: true, message: "Could not save progress. Check connection.", isError: true });
        setTimeout(() => setNotification(null), 3000);
        setTaskStates((prev) => ({ ...prev, [taskId]: "claim" }));
        return;
      }

      let finalReward = Number(task.reward) || 0;
      if (isReferral) {
        finalReward = finalReward * (task.requiredReferrals || 1);
      }

      await addActivity("earn", finalReward, "UUSD", { toName: task.title });

      setNotification({
        show: true,
        message: "You successfully claimed",
        amount: finalReward,
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const completedCount = Object.values(taskStates).filter(s => s === 'done').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const eventCategories = ['All', ...new Set(events.map(e => e.category || 'General'))];
  const filteredEvents = events.filter(e => activeEventCategory === 'All' || (e.category || 'General') === activeEventCategory);
  
  const eventTitles = events.map(e => e.title);
  const existingTaskCategories = tasks.map(t => t.category || 'Other');
  const taskCategories = ['All', ...new Set([...eventTitles, ...existingTaskCategories])];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col relative pb-6 pt-4"
    >
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
          >
            <div className={`backdrop-blur-md text-white px-5 py-3 rounded-2xl flex items-center gap-3 border ${notification.isError ? 'bg-red-500/90 border-red-400/50 shadow-[0_8px_32px_rgba(239,68,68,0.4)]' : 'bg-gradient-to-r from-[#00C087]/90 to-[#00a876]/90 border-white/20 shadow-[0_8px_32px_rgba(0,192,135,0.4)]'}`}>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                {notification.isError ? (
                  <span className="text-white font-bold text-lg">!</span>
                ) : (
                  <CheckCircle className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-tight">{notification.message}</span>
                {!notification.isError && notification.amount !== undefined && (
                  <span className="text-lg font-black leading-tight">+{notification.amount.toFixed(2)} UUSD</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header matching Wallet */}
      <header className="flex items-center justify-between mb-6 px-2">
        <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full overflow-hidden active:scale-95 transition-transform bg-white/[0.04] backdrop-blur-md border border-white/[0.05] flex items-center justify-center">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-white/80">
              {firstName ? firstName.charAt(0) : "U"}
            </span>
          )}
        </button>
        
        {/* Project Name (Center) */}
        <div className="bg-gradient-to-r from-[#8792FF]/20 to-white/5 backdrop-blur-md border border-[#8792FF]/20 px-5 py-2 rounded-full shadow-lg flex items-center gap-2">
          <img src="https://i.ibb.co/k27sBd6Q/0x61a10e8556bed032ea176330e7f17d6a12a10000.png" alt="Logo" className="w-5 h-5 rounded-full filter drop-shadow-[0_0_8px_rgba(135,146,255,0.5)]" />
          <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-wide">Reward</span>
        </div>

        <div className="w-10 h-10"></div>
      </header>

      <div className="flex items-center justify-between mt-2 px-3 mb-2">
        <h2 className="text-[18px] font-bold text-white">Event</h2>
      </div>

      <AnimatePresence mode="wait">
        {!selectedEventId ? (
          <motion.div 
            key="events-list"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-4 px-2 pb-24"
          >
            {events.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-edges-right mb-2">
                {eventCategories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setActiveEventCategory(cat as string)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${activeEventCategory === cat ? 'bg-[#8792FF] text-white shadow-[0_2px_8px_rgba(135,146,255,0.4)]' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                  >
                    {cat as string}
                  </button>
                ))}
              </div>
            )}
            
            {filteredEvents.map(ev => {
              const tLeft = timeLefts[ev.id] || { days: 0, hours: 0, mins: 0, secs: 0 };
              return (
                <div key={ev.id} className="w-full aspect-[16/9] rounded-[24px] overflow-hidden relative shadow-lg border border-white/5 bg-[#13141a]">
                  <img 
                    src={ev.posterUrl || undefined}
                    alt={ev.title}
                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/1a1b23/8792FF.png?text=Invalid+Image+URL'; e.currentTarget.onerror = null; }}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/80 via-transparent to-transparent"></div>
                  
                  {/* Subtle Top Left: Event Title */}
                  <div className="absolute top-3 left-3 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <span className="text-white/90 text-[10px] font-medium">{ev.title}</span>
                    <div className="w-1 h-1 rounded-full bg-white/30"></div>
                    <span className="text-[#8792FF] text-[9px] font-bold">{tasks.filter(t => t.eventId === ev.id).length} Tasks</span>
                  </div>
                  
                  {/* Subtle Top Right: Timer */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-md">
                    <Clock className="w-2.5 h-2.5 text-[#8792FF]/80" />
                    <div className="flex items-center text-white/80 font-mono text-[9px] font-medium tracking-wide">
                      <span>{String(tLeft.days).padStart(2, '0')}</span><span className="text-white/40 mx-[1px]">d</span>
                      <span>{String(tLeft.hours).padStart(2, '0')}</span><span className="text-white/40 mx-[1px]">h</span>
                      <span>{String(tLeft.mins).padStart(2, '0')}</span><span className="text-white/40 mx-[1px]">m</span>
                      <span>{String(tLeft.secs).padStart(2, '0')}</span><span className="text-white/40 ml-[1px]">s</span>
                    </div>
                  </div>

                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                    <div className="flex flex-col">
                      <span className="text-white text-xl font-black drop-shadow-lg leading-tight whitespace-pre-wrap">{ev.rewardText}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedEventId(ev.id);
                        const firstCat = 'All';
                        setActiveCategory(firstCat);
                      }}
                      className="bg-[#8792FF] hover:bg-[#727dee] text-white font-bold py-1.5 px-4 rounded-full active:scale-95 transition-transform shadow-[0_2px_8px_rgba(135,146,255,0.4)] flex items-center gap-1.5 text-[13px] shrink-0 ml-4"
                    >
                      Start <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            key="tasks"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col px-2 mt-2 pb-24"
          >
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setSelectedEventId(null)}
                className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-[13px] font-semibold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back
              </button>
              
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-edges-right pb-2">
                {['All', ...new Set(tasks.filter(t => t.eventId === selectedEventId).map(t => t.category || 'Other'))].map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat as string)}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all shrink-0 border ${activeCategory === cat ? 'bg-[#8792FF]/20 text-[#8792FF] border-[#8792FF]/50 shadow-[0_4px_12px_rgba(135,146,255,0.15)]' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white'}`}
                  >
                    {cat as string}
                  </button>
                ))}
              </div>
            </div>

            {tasks.filter(t => t.eventId === selectedEventId && (activeCategory === 'All' || t.category === activeCategory)).length === 0 && (
              <div className="text-center text-white/40 text-sm mt-8 py-8 border border-white/5 rounded-2xl bg-white/[0.02]">
                No tasks available in this category.
              </div>
            )}

            {tasks.filter(t => t.eventId === selectedEventId && (activeCategory === 'All' || t.category === activeCategory)).map((task) => {
              const state = taskStates[task.id] || 'start';
              const isVerifying = verifyingTasks[task.id];
              const currentCountdown = taskCountdowns[task.id];
              const isOpening = currentCountdown !== undefined;
              
              const getIcon = () => {
                if (task.iconUrl) {
                  return <img src={task.iconUrl} onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/1a1b23/8792FF.png?text=Icon'; e.currentTarget.onerror = null; }}  alt="icon" className="w-8 h-8 object-cover rounded-full"  />;
                }
                switch(task.iconType) {
                  case 'twitter': return <span className="text-blue-400 flex items-center justify-center"><FaTwitter size={20} /></span>;
                  case 'instagram': return <span className="text-pink-500 flex items-center justify-center"><FaInstagram size={20} /></span>;
                  case 'facebook': return <span className="text-blue-500 flex items-center justify-center"><FaFacebook size={20} /></span>;
                  case 'youtube': return <span className="text-red-500 flex items-center justify-center"><FaYoutube size={20} /></span>;
                  case 'telegram': return <span className="text-blue-400 flex items-center justify-center"><FaTelegramPlane size={20} /></span>;
                  case 'website': 
                  case 'web': return <Globe className="w-5 h-5 text-purple-400" />;
                  case 'referral': return <Users className="w-5 h-5 text-[#8792FF]" />;
                  default: return <span className="text-xl">{task.icon || '✨'}</span>;
                }
              };

              return (
                <div key={task.id} className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.15)] rounded-[16px] p-3 flex items-center justify-between mb-2 relative overflow-hidden group hover:border-white/[0.15] hover:bg-white/[0.08] transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 border border-white/20 shrink-0 overflow-hidden">
                      {getIcon()}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-bold text-white leading-tight">{task.title}</span>
                      <span className="text-[12px] text-white/50">{task.description}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/70">
                          {task.category || 'General'}
                        </div>
                        <div className="flex items-center gap-1">
                          <img src={rewardToken?.imgUrl || undefined} alt="Reward" className="w-3.5 h-3.5 rounded-full object-cover shadow-sm" />
                          <span className="text-[12px] font-extrabold text-[#8792FF]">{(task.category === 'Referral' ? (task.reward * (task.requiredReferrals || 1)) : task.reward).toFixed(2)} $UUSD</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {state === 'done' ? (
                      <div className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center shadow-inner text-white/40 font-bold text-[12px] gap-1.5">
                         <CheckCircle className="w-3.5 h-3.5 text-[#00C087]" /> Done
                      </div>
                    ) : (
                      <button 
                        onClick={() => !isVerifying && !isOpening && handleTaskAction(task)}
                        disabled={isVerifying || isOpening}
                        className={`text-[12px] font-bold px-4 py-1.5 rounded-full transition-all flex items-center justify-center min-w-[70px] shadow-sm relative overflow-hidden ${
                          isVerifying || isOpening
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 opacity-70 cursor-not-allowed'
                            : state === 'verify' 
                            ? 'bg-[#8792FF]/15 text-[#8792FF] border border-[#8792FF]/30 hover:bg-[#8792FF]/25' 
                            : state === 'claim'
                            ? 'bg-gradient-to-r from-[#8792FF] to-[#6b76e3] text-white hover:from-[#96a0ff] hover:to-[#7a84e6] shadow-[0_2px_8px_rgba(135,146,255,0.4)] border border-[#8792FF]/50'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                        }`}
                      >
                        {isOpening ? `Wait ${currentCountdown}s` : isVerifying ? 'Checking...' : state === 'verify' ? 'Verify' : state === 'claim' ? 'Claim' : 'Start'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

