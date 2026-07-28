/**
 * #AI_ZONE: SEND_FLOW
 * Order: validate recipient → PIN setup/verify → transferFunds only on PIN success.
 * #AI_DO_NOT_BREAK: never call executeTransfer on wrong PIN.
 */

import React, { useState, useEffect } from "react";
import { ChevronLeft, QrCode, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet, UserRegistryEntry } from "../hooks/useWallet";
import { useTelegramUser } from "../hooks/useTelegramUser";
import { findUserByAddress, transferFunds } from "../lib/db";
import { hasPinSet } from "../lib/pin";
import { PinModal } from "../components/ui/PinModal";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useSettings } from "../lib/SettingsContext";

const UUSD_TOKEN = {
  symbol: "UUSD",
  name: "UUSD Token",
  imgUrl: "https://i.ibb.co/k27sBd6Q/0x61a10e8556bed032ea176330e7f17d6a12a10000.png",
};
const BSC_NETWORK = {
  id: "bsc",
  name: "Binance Smart Chain",
  icon: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
};

export function Withdraw() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const telegramUser = useTelegramUser();
  const { t } = useSettings();
  const { fullWallet, address: myAddress } = useWallet(telegramUser);
  const balances = fullWallet?.balances || {};

  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState(searchParams.get("address") || "");
  const [addressError, setAddressError] = useState("");
  const [recipientData, setRecipientData] = useState<UserRegistryEntry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // PIN flow
  const [pinOpen, setPinOpen] = useState(false);
  const [pinMode, setPinMode] = useState<"setup" | "verify">("verify");
  const [pendingSend, setPendingSend] = useState(false);
  const [minTransferAmount, setMinTransferAmount] = useState(0);

  const availableAmount = balances[UUSD_TOKEN.symbol] || 0;
  const parsedAmount = parseFloat(amount) || 0;
  const telegramId = fullWallet?.telegramId || telegramUser.telegramId || "";

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
          const m = snap.data().minTransferAmount;
          if (m !== undefined) setMinTransferAmount(Number(m));
        }
      } catch (e) {}
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    let active = true;
    const fetchRecipient = async () => {
      if (address.length > 20) {
        if (address === myAddress) {
          setAddressError("You cannot send to your own address.");
          setRecipientData(null);
          return;
        }

        setIsSearching(true);
        setAddressError("");
        setRecipientData(null);
        try {
          const found = await findUserByAddress(address);
          if (active) {
            if (found) {
              setRecipientData(found);
              setAddressError("");
            } else {
              setRecipientData(null);
              setAddressError("External address. You can only send to registered Network users.");
            }
          }
        } catch {
          if (active) setAddressError("Failed to verify address.");
        } finally {
          if (active) setIsSearching(false);
        }
      } else {
        setRecipientData(null);
        setAddressError("");
      }
    };

    const tmr = setTimeout(fetchRecipient, 400);
    return () => {
      active = false;
      clearTimeout(tmr);
    };
  }, [address, myAddress]);

  const handleMax = () => setAmount(String(availableAmount));

  const executeTransfer = async () => {
    if (!fullWallet || !recipientData) return;
    setIsProcessing(true);
    setSuccessMsg("");
    try {
      await transferFunds(
        fullWallet.telegramId,
        recipientData.telegramId,
        parsedAmount,
        UUSD_TOKEN.symbol,
        fullWallet.address,
        recipientData.address,
        telegramUser?.firstName || telegramUser?.username || "User",
        recipientData.firstName || recipientData.username || "User"
      );
      setSuccessMsg(`Sent ${parsedAmount} ${UUSD_TOKEN.symbol} successfully`);
      setTimeout(() => navigate("/"), 1400);
    } catch (err: any) {
      alert("Transaction failed: " + (err?.message || "Unknown error"));
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (parsedAmount <= 0 || parsedAmount > availableAmount || !address || !recipientData || !fullWallet) return;
    if (parsedAmount < minTransferAmount) {
      alert(`The minimum transfer amount is ${minTransferAmount} UUSD`);
      return;
    }
    if (!telegramId) return;

    // Require PIN set + verify before processing
    try {
      const hasPin = await hasPinSet(telegramId);
      if (!hasPin) {
        setPinMode("setup");
        setPendingSend(true);
        setPinOpen(true);
        return;
      }
      setPinMode("verify");
      setPendingSend(true);
      setPinOpen(true);
    } catch {
      alert("Could not check PIN status. Try again.");
    }
  };

  // Only called by PinModal AFTER successful verify/setup — never on wrong PIN
  const onPinSuccess = async () => {
    setPinOpen(false);
    if (!pendingSend) return;
    setPendingSend(false);
    // Extra guard: must have pin set after setup/verify success
    try {
      const ok = await hasPinSet(telegramId);
      if (!ok) {
        alert("PIN is not set. Please set a PIN first.");
        return;
      }
      await executeTransfer();
    } catch {
      alert("Could not confirm PIN status. Transfer cancelled.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex flex-col gap-5 pb-8"
    >
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white/80 active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">{t("Send") || "Send"} {UUSD_TOKEN.symbol}</h1>
      </header>

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl px-4 py-3 text-sm"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4">
        {/* Address */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium text-white/70">Recipient address</label>
          <div className="flex items-center gap-2 p-3 rounded-[16px] bg-[#1a1b23] border border-white/5 focus-within:border-[#8792FF]/50 transition-colors">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
              placeholder="0x..."
              className="w-full bg-transparent border-none outline-none text-[14px] font-mono placeholder:text-white/20"
            />
            <button
              onClick={() => navigate("/scan")}
              className="p-2 rounded-lg bg-white/5 text-[#8792FF] hover:bg-white/10"
            >
              <QrCode className="w-5 h-5" />
            </button>
          </div>
          {isSearching && <p className="text-xs text-white/40">Looking up user...</p>}
          {addressError && (
            <div className="flex items-start gap-2 text-amber-400/90 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {addressError}
            </div>
          )}
          {recipientData && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-[#8792FF]/10 border border-[#8792FF]/20"
            >
              <div className="w-9 h-9 rounded-full bg-[#8792FF]/30 flex items-center justify-center text-sm font-bold overflow-hidden">
                {recipientData.photoUrl ? (
                  <img src={recipientData.photoUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  (recipientData.firstName || "U")[0]
                )}
              </div>
              <div>
                <div className="text-sm font-semibold">{recipientData.firstName || "User"}</div>
                <div className="text-[11px] text-white/40">ID: {recipientData.telegramId}</div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Network */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium text-white/70">Network</label>
          <div className="flex items-center p-3 rounded-[16px] bg-[#1a1b23] border border-white/5 opacity-80 gap-3">
            <img src={BSC_NETWORK.icon} alt="" className="w-6 h-6 rounded-full" />
            <span className="text-[15px] font-medium">{BSC_NETWORK.name}</span>
          </div>
        </div>

        {/* Asset */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium text-white/70">Asset</label>
          <div className="flex items-center p-3 rounded-[16px] bg-[#1a1b23] border border-white/5 opacity-80">
            <div className="flex items-center gap-3">
              <img src={UUSD_TOKEN.imgUrl} alt={UUSD_TOKEN.name} className="w-6 h-6 rounded-full" />
              <div className="flex flex-col">
                <span className="text-[15px] font-medium">{UUSD_TOKEN.symbol}</span>
                <span className="text-[12px] text-white/50">{UUSD_TOKEN.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <label className="text-[14px] font-medium text-white/70">Amount</label>
            <span className="text-[12px] text-white/50">
              Available: {availableAmount} {UUSD_TOKEN.symbol}
            </span>
          </div>
          <div className="flex items-center p-3 rounded-[16px] bg-[#1a1b23] border border-white/5 focus-within:border-[#8792FF]/50 transition-colors">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent border-none outline-none text-[20px] font-semibold placeholder:text-white/20"
            />
            <div className="flex items-center gap-2">
              {minTransferAmount > 0 && <span className="text-[10px] text-white/40">Min: {minTransferAmount}</span>}
              <button
                onClick={handleMax}
                className="text-[#8792FF] text-[13px] font-bold px-3 py-1.5 rounded-lg bg-[#8792FF]/10 hover:bg-[#8792FF]/20 transition-colors"
              >
                MAX
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={
            !address ||
            parsedAmount <= 0 ||
            parsedAmount > availableAmount ||
            !recipientData ||
            isProcessing
          }
          className="w-full py-4 mt-2 rounded-[16px] bg-gradient-to-r from-[#8792FF] to-[#6b76e3] text-white font-bold text-[16px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#8792FF]/20 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Processing...
            </>
          ) : (
            `${t("Send") || "Send"} ${UUSD_TOKEN.symbol}`
          )}
        </button>

        <p className="text-center text-[11px] text-white/30">
          Transfers require your 4-digit PIN for security
        </p>
      </div>

      <PinModal
        open={pinOpen}
        mode={pinMode}
        telegramId={telegramId}
        title={pinMode === "setup" ? "Create PIN first" : "Confirm with PIN"}
        subtitle={
          pinMode === "setup"
            ? "You must set a PIN before sending tokens"
            : `Confirm sending ${parsedAmount} ${UUSD_TOKEN.symbol}`
        }
        onSuccess={onPinSuccess}
        onClose={() => {
          setPinOpen(false);
          setPendingSend(false);
        }}
      />
    </motion.div>
  );
}
