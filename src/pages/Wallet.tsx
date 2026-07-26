import React, { useState, useEffect } from "react";
import { Copy, Check, Send, Plus, ArrowUp, ArrowDown, ScanLine, Wallet as WalletIcon, Settings, ArrowDownLeft, ArrowUpRight, Gift, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTelegramUser } from "../hooks/useTelegramUser";
import { useWallet } from "../hooks/useWallet";
import { useSettings } from "../lib/SettingsContext";
import { Skeleton } from "../components/ui/Skeleton";
import { useNavigate } from "react-router-dom";
import { TOKENS } from "../lib/tokens";

export function Wallet() {
  const telegramUser = useTelegramUser();
  const { t, formatCurrency } = useSettings();
  const { telegramId, firstName, photoUrl } = telegramUser;
  const { address, fullWallet, isLoading, activities, needsCreation, isCreating, createWallet } = useWallet(telegramUser);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'crypto' | 'activity'>('crypto');
  const [activityFilter, setActivityFilter] = useState<'all' | 'received' | 'sent' | 'rewards'>('all');
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const navigate = useNavigate();
  
  const [livePrices, setLivePrices] = useState<Record<string, { price: number, change24h: number }>>({});
  
  React.useEffect(() => {
    const fetchPrices = async () => {
      try {
        const symbols = '["BNBUSDT","ETHUSDT","BTCUSDT","SOLUSDT","XRPUSDT","DOGEUSDT"]';
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`);
        const data = await res.json();
        
        const newPrices: Record<string, { price: number, change24h: number }> = {};
        data.forEach((item: any) => {
          const symbol = item.symbol.replace('USDT', '');
          newPrices[symbol] = {
            price: parseFloat(item.lastPrice),
            change24h: parseFloat(item.priceChangePercent)
          };
        });
        setLivePrices(newPrices);
      } catch (e: any) {
        console.log("Using fallback prices. Fetch failed:", e.message);
      }
    };
    
    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  // Wallet creation is handled by AppLayout gate.
  // If we somehow land here without a wallet, show a minimal wait state.
  if (needsCreation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <WalletIcon className="w-12 h-12 text-[#8792FF] mb-4 animate-pulse" />
        <p className="text-white/60 text-sm">Preparing your wallet...</p>
      </div>
    );
  }

  const balances = fullWallet?.balances || {};
  let totalBalance = 0;
  
  const displayTokens = [...TOKENS].map(token => {
    const liveData = livePrices[token.symbol];
    const currentPrice = liveData ? liveData.price : token.price;
    const currentChange = liveData ? liveData.change24h : 0;
    
    const amountNum = balances[token.symbol] || 0;
    const value = amountNum * currentPrice;
    totalBalance += value;
    return {
      ...token,
      currentPrice,
      change24h: currentChange,
      amountNum,
      amount: amountNum.toFixed(4).replace(/\.?0+$/, ''),
      value: value.toFixed(2)
    };
  }).sort((a, b) => b.amountNum - a.amountNum);

  const getActivityDetails = (activity: any) => {
    let title = "";
    let isPositive = false;
    
    switch(activity.type) {
      case 'deposit': title = "Deposit"; isPositive = true; break;
      case 'withdraw': title = "Withdraw"; isPositive = false; break;
      case 'transfer_out': title = `To ${activity.toAddress ? (activity.toAddress.substring(0,6) + '...' + activity.toAddress.substring(activity.toAddress.length - 4)) : (activity.toName || "Address")}`; isPositive = false; break;
      case 'transfer_in': title = `From ${activity.fromAddress ? (activity.fromAddress.substring(0,6) + '...' + activity.fromAddress.substring(activity.fromAddress.length - 4)) : (activity.fromName || "Address")}`; isPositive = true; break;
      case 'earn': title = 'Reward'; isPositive = true; break;
      default: title = activity.type;
    }

    let ActionIcon = Plus;
    let iconColor = "text-emerald-400";
    let iconBg = "bg-emerald-400/10";
    
    if (activity.type === 'deposit' || activity.type === 'transfer_in') {
      ActionIcon = ArrowDownLeft;
      iconColor = "text-emerald-400";
      iconBg = "bg-emerald-400/10";
    } else if (activity.type === 'withdraw' || activity.type === 'transfer_out') {
      ActionIcon = ArrowUpRight;
      iconColor = "text-rose-400";
      iconBg = "bg-rose-400/10";
    } else if (activity.type === 'earn') {
      ActionIcon = Gift;
      iconColor = "text-[#8792FF]";
      iconBg = "bg-[#8792FF]/10";
    }
    
    return { title, isPositive, ActionIcon, iconColor, iconBg };
  };

  const filteredActivities = React.useMemo(() => {
    if (!activities) return [];
    return activities.filter(act => {
      if (activityFilter === 'all') return true;
      if (activityFilter === 'sent') return act.type === 'withdraw' || act.type === 'transfer_out';
      if (activityFilter === 'received') return act.type === 'deposit' || act.type === 'transfer_in';
      if (activityFilter === 'rewards') return act.type === 'earn';
      return true;
    });
  }, [activities, activityFilter]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const ActionButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button 
        onClick={onClick}
        whileTap={{ scale: 0.95 }}
        className="w-[48px] h-[48px] rounded-full bg-[#1e1f29]/80 backdrop-blur-3xl border border-white/[0.05] flex items-center justify-center transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.3)] overflow-hidden"
      >
        <Icon className="w-5 h-5 text-white" strokeWidth={2} />
      </motion.button>
      <span className="text-[11px] font-medium text-white/80">{label}</span>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col relative pb-6"
    >
      {/* Header */}
      <header className="flex items-center justify-between mb-6 px-2">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full overflow-hidden transition-transform bg-white/[0.04] backdrop-blur-md border border-white/[0.05] flex items-center justify-center">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-white/80">
              {firstName ? firstName.charAt(0) : "U"}
            </span>
          )}
        </motion.button>
        
        {/* Project Name (Center) */}
        <div className="bg-gradient-to-r from-[#8792FF]/20 to-white/5 backdrop-blur-md border border-[#8792FF]/20 px-5 py-2 rounded-full shadow-lg flex items-center gap-2">
          <img src="https://i.ibb.co/k27sBd6Q/0x61a10e8556bed032ea176330e7f17d6a12a10000.png" alt="Logo" className="w-5 h-5 rounded-full filter drop-shadow-[0_0_8px_rgba(135,146,255,0.5)]" />
          <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-wide">Network</span>
        </div>

        <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/scan")} className="w-10 h-10 bg-white/[0.04] backdrop-blur-md border border-white/[0.05] rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-all shadow-sm">
          <ScanLine className="w-5 h-5" />
        </motion.button>
      </header>

      {/* Main Balance Section */}
      <div className="flex flex-col items-center justify-center mb-8 mt-2">
        {/* Address */}
        <div className="flex items-center gap-2 mb-3">
          {isLoading ? (
            <Skeleton className="h-5 w-24 rounded" />
          ) : (
            <div 
              onClick={handleCopy}
              className="flex items-center gap-1.5 cursor-pointer text-white/60 hover:text-white/80 transition-colors"
            >
              <span className="text-[15px] font-medium tracking-wide">
                {formatAddress(address || "")}
              </span>
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </div>
          )}
        </div>

        {/* Balance */}
        <div className="flex items-baseline gap-1">
          {isLoading ? (
            <Skeleton className="h-16 w-48 rounded-xl" />
          ) : (
            <>
              <h2 className="text-[54px] font-bold text-white tracking-tight leading-none flex items-baseline">
                <span className="text-[40px] font-bold text-white/50 mr-1">{formatCurrency(0, '').replace(/[\d.,]/g, '')}</span>
                {formatCurrency(totalBalance, '').replace(/^[^\d]+/, '').split('.')[0]}
                <span className="text-[40px]">.{formatCurrency(totalBalance, '').split('.')[1] || '00'}</span>
              </h2>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-6 mb-8 px-2">
        <ActionButton icon={Send} label={t("Send")} onClick={() => navigate("/withdraw")} />
        <ActionButton icon={ArrowDown} label={t("Receive")} onClick={() => navigate("/deposit")} />
        <ActionButton icon={ArrowUp} label={t("Withdraw")} onClick={() => alert("Withdrawal coming soon")} />
      </div>

      {/* Tabs */}
      <div className="flex flex-col">
        <div className="flex border-b border-white/5 mb-2 px-2 relative">
          <button 
            onClick={() => setActiveTab('crypto')}
            className={`pb-3 px-4 text-[15px] font-semibold transition-colors ${activeTab === 'crypto' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            Crypto
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-6 text-[15px] font-semibold transition-colors ${activeTab === 'activity' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            Activity
          </button>
          {/* Animated Tab Indicator */}
          <div 
            className="absolute bottom-0 h-0.5 bg-[#8792FF] transition-all duration-300 ease-out rounded-t-full"
            style={{ 
              width: activeTab === 'crypto' ? '60px' : '70px',
              left: activeTab === 'crypto' ? '12px' : '88px' 
            }}
          />
        </div>

        <div className="flex flex-col px-2 mt-2">
          {activeTab === 'crypto' ? (
            displayTokens.map((coin, index) => (
              <div 
                key={coin.symbol}
                className="flex items-center justify-between py-3.5 hover:bg-white/[0.02] rounded-2xl px-2 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden bg-white/[0.04] p-0.5 shadow-sm">
                    <img src={coin.imgUrl || undefined} alt={coin.name} className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[16px] font-bold text-white">{coin.symbol}</span>
                    <span className="text-[13px] font-medium text-white/50">
                      ${coin.currentPrice < 1 ? coin.currentPrice.toFixed(4) : coin.currentPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      <span className={`ml-1.5 ${coin.change24h >= 0 ? "text-[#00C087]" : "text-[#FF3B30]"}`}>
                        {coin.change24h > 0 ? "+" : ""}{coin.change24h.toFixed(2)}%
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[16px] font-bold text-white">{coin.amount === "0" ? "0.00" : coin.amount}</span>
                  <span className="text-[13px] font-medium text-white/50">${coin.value.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col gap-4">
              {/* Activity Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {(['all', 'received', 'sent', 'rewards'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActivityFilter(filter)}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${
                      activityFilter === filter 
                        ? 'bg-white/10 text-white' 
                        : 'bg-transparent text-white/40 hover:bg-white/5'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="popLayout">
                {filteredActivities.length > 0 ? (
                  <motion.div key="activity-list" className="flex flex-col w-full">
                    {filteredActivities.map((activity, index) => {
                  const token = TOKENS.find(t => t.symbol === activity.symbol);
                  const dollarValue = (activity.amount * (token?.price || 0)).toFixed(2);
                  const { title, isPositive, ActionIcon, iconColor, iconBg } = getActivityDetails(activity);

                  return (
                    <div 
                      key={activity.id}
                      onClick={() => setSelectedActivity(activity)}
                      className="flex items-center justify-between py-3 hover:bg-white/[0.02] rounded-2xl px-2 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${iconBg} shadow-sm shrink-0`}>
                          <ActionIcon className={`w-5 h-5 ${iconColor}`} />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-white truncate">{title}</span>
                            {activity.status === 'completed' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-400/10 text-emerald-400 uppercase tracking-wider shrink-0">Done</span>}
                            {activity.status === 'pending' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400/10 text-amber-400 uppercase tracking-wider shrink-0">Pending</span>}
                            {activity.status === 'failed' && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-400/10 text-rose-400 uppercase tracking-wider shrink-0">Failed</span>}
                          </div>
                          <span className="text-[12px] font-medium text-white/40 truncate">
                            {new Date(activity.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[15px] font-bold ${isPositive ? 'text-emerald-400' : 'text-white'} whitespace-nowrap`}>
                            {isPositive ? '+' : '-'}{Number(activity.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                          <span className="text-[13px] font-bold text-white">{activity.symbol}</span>
                        </div>
                        <span className="text-[12px] font-medium text-white/50 whitespace-nowrap">${Number(dollarValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
              ) : (
                <motion.div 
                  key="activity-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 px-4"
                >
                  <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mb-4">
                    <ScanLine className="w-8 h-8 text-white/20" />
                  </div>
                  <span className="text-[15px] font-medium text-white/50">{t("No activity yet")}</span>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      
      {/* Activity Details Modal */}
      <AnimatePresence>
        {selectedActivity ? (() => {
          const { title, isPositive, ActionIcon, iconColor, iconBg } = getActivityDetails(selectedActivity);
          return (
            <div key="activity-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedActivity(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-sm bg-[#1e1f29] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}>
                  <ActionIcon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <div className="text-center">
                  <div className="text-sm text-white/50 mb-1">{title}</div>
                  <div className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-white'}`}>
                    {isPositive ? '+' : '-'}{Number(selectedActivity.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {selectedActivity.symbol}
                  </div>
                </div>
                
                <div className="w-full bg-white/[0.02] rounded-xl p-4 flex flex-col gap-3 mt-2 border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-sm text-white/40">Status</span>
                    <span className="text-sm text-white capitalize font-medium">{selectedActivity.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/40">Date</span>
                    <span className="text-sm text-white font-medium">{new Date(selectedActivity.timestamp).toLocaleString()}</span>
                  </div>
                  {selectedActivity.toAddress && (
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-white/40">To</span>
                      <span className="text-sm text-white font-medium break-all text-right">{selectedActivity.toAddress}</span>
                    </div>
                  )}
                  {selectedActivity.fromAddress && (
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-white/40">From</span>
                      <span className="text-sm text-white font-medium break-all text-right">{selectedActivity.fromAddress}</span>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setSelectedActivity(null)}
                  className="w-full mt-2 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl transition-colors"
                >
                  Close
                </button>
              </motion.div>
            </div>
          );
        })() : null}
      </AnimatePresence>
    </motion.div>
  );
}

