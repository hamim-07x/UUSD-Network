import React, { useState } from "react";
import { ChevronLeft, Check, Copy, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useWallet } from "../hooks/useWallet";
import { useTelegramUser } from "../hooks/useTelegramUser";
import { QRCodeSVG } from 'qrcode.react';

export function Deposit() {
  const navigate = useNavigate();
  const telegramUser = useTelegramUser();
  const { address } = useWallet(telegramUser);
  const [copied, setCopied] = useState(false);

  const displayAddress = address || "0x0000000000000000000000000000000000000000";

  const handleCopy = () => {
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <h1 className="text-xl font-bold tracking-tight text-white/90">Receive</h1>
      </header>

      <div className="px-4 flex flex-col items-center pt-4">
        <div className="flex flex-col items-center bg-white/[0.04] backdrop-blur-2xl border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.2)] p-6 rounded-3xl w-full max-w-[280px]">
          <div className="bg-white p-3 rounded-2xl mb-5 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <QRCodeSVG value={displayAddress} size={180} level={"H"} fgColor="#13141a" />
          </div>
          
          <span className="text-[14px] font-medium text-white/70 mb-3">Your Receive Address</span>
          
          <div 
            onClick={handleCopy}
            className="flex flex-col items-center gap-2 cursor-pointer group w-full active:scale-[0.98] transition-transform"
          >
            <span className="text-[13px] font-medium text-center break-all text-[#8792FF] bg-[#8792FF]/10 border border-[#8792FF]/20 px-3 py-2.5 rounded-xl w-full transition-colors group-hover:bg-[#8792FF]/20">
              {displayAddress}
            </span>
            <div className="flex items-center gap-2 mt-1">
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
                  <span className="text-sm font-bold text-white/40 group-hover:text-white/70 transition-colors">Tap to copy</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-start gap-3 text-white/60 bg-white/[0.04] backdrop-blur-2xl p-5 rounded-3xl border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.2)] w-full max-w-[280px]">
          <Info className="w-5 h-5 flex-shrink-0 text-[#8792FF] mt-0.5" />
          <p className="text-[12px] leading-relaxed font-medium">
            Send only <strong className="text-white">UUSD Token</strong> on <strong className="text-white">Binance Smart Chain</strong> to this address.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
