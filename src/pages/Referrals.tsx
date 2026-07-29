import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Users, Clock, CheckCircle2 } from "lucide-react";
import { useTelegramUser } from "../hooks/useTelegramUser";
import { motion } from "framer-motion";
import { getReferrals, getCompletedTasks } from "../lib/db";

export function Referrals() {
  const tUser = useTelegramUser();
  const navigate = useNavigate();
  const telegramId = tUser.telegramId || "123456789";
  
  const [myReferrals, setMyReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchReferrals = async () => {
      try {
        const refs = await getReferrals();
        const myRefs = refs.filter(r => r.referrerId === telegramId);
        
        // Fetch completed tasks for each referred user
        const enrichedRefs = await Promise.all(
          myRefs.map(async (ref) => {
            const completed = await getCompletedTasks(ref.referredId);
            const taskCount = Object.keys(completed || {}).length;
            return {
              ...ref,
              taskCount,
              isQualified: taskCount >= 3
            };
          })
        );
        
        if (active) {
          setMyReferrals(enrichedRefs);
          setIsLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (active) setIsLoading(false);
      }
    };
    fetchReferrals();
    return () => { active = false; };
  }, [telegramId]);

  const qualifiedCount = myReferrals.filter(r => r.isQualified).length;
  const pendingCount = myReferrals.filter(r => !r.isQualified).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-5 pb-24 px-4"
    >
      <header className="flex items-center gap-4 mb-2 mt-4">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-white/80 active:scale-95 transition-transform bg-white/5 rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white/90">My Referrals</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.1)] rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
          <CheckCircle2 className="w-12 h-12 text-emerald-500/20 absolute -right-2 -bottom-2" />
          <h2 className="text-2xl font-bold text-white relative z-10">{qualifiedCount}</h2>
          <p className="text-[11px] font-medium text-emerald-400 mt-1 relative z-10 uppercase tracking-wide">Qualified</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500/20 to-orange-400/10 border border-orange-500/30 shadow-[0_8px_32px_rgba(249,115,22,0.1)] rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
          <Clock className="w-12 h-12 text-orange-500/20 absolute -right-2 -bottom-2" />
          <h2 className="text-2xl font-bold text-white relative z-10">{pendingCount}</h2>
          <p className="text-[11px] font-medium text-orange-400 mt-1 relative z-10 uppercase tracking-wide">Pending</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white">Referral History</h3>
        <span className="text-xs text-white/50">Total: {myReferrals.length}</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#8792FF] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : myReferrals.length > 0 ? (
        <div className="flex flex-col gap-2">
          {myReferrals.map((ref: any, idx: number) => (
            <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex items-center justify-between relative overflow-hidden">
              <div className="flex flex-col gap-1 relative z-10">
                <span className="text-sm font-bold text-white">{ref.referredName || "Anonymous User"}</span>
                <span className="text-[11px] text-white/50">ID: {ref.referredId}</span>
              </div>
              <div className="flex flex-col items-end gap-1 relative z-10">
                {ref.isQualified ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> QUALIFIED
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> PENDING
                  </span>
                )}
                <span className="text-[10px] text-white/40">{ref.taskCount} / 3 Tasks</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-xl">
          <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/50 font-medium">No referrals yet</p>
          <p className="text-[11px] text-white/30 mt-1">Share your link to invite friends</p>
        </div>
      )}
    </motion.div>
  );
}
