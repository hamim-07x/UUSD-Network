import React, { useState, useEffect } from "react";
import { ChevronLeft, HelpCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useSettings } from "../lib/SettingsContext";

const DEFAULT_FAQ = [
  {
    q: "What is UUSD Token?",
    a: "UUSD is the utility and reward token of this network. Earn it by completing tasks, joining events, and inviting friends. Rewards credit to your wallet instantly.",
  },
  {
    q: "How do I earn rewards?",
    a: "Open Rewards, pick an event or task, complete the action (follow, join, refer), wait for the countdown, Verify, then Claim your UUSD.",
  },
  {
    q: "How does Send work?",
    a: "You can send UUSD only to other registered network users. Enter their wallet address, amount, confirm with your 4-digit PIN, then the transfer processes securely.",
  },
  {
    q: "Why do I need a PIN?",
    a: "Your 4-digit PIN protects withdrawals and transfers. Set it once in Profile → Passcode. Every send asks for the PIN so only you can move funds.",
  },
  {
    q: "Is my wallet secure?",
    a: "Balances and activity live on Firebase with encrypted PIN storage. Never share your PIN or seed with anyone. Contact support if something looks wrong.",
  },
];

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number; key?: React.Key }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left active:bg-white/[0.03]"
      >
        <span className="text-[#8792FF] font-semibold text-sm pr-3">{question}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-[#8792FF] shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <p className="px-4 pb-4 text-xs text-white/70 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function DeFiAccountFAQ() {
  const navigate = useNavigate();
  const { t } = useSettings();
  const [items, setItems] = useState(DEFAULT_FAQ);

  useEffect(() => {
    getDoc(doc(db, "settings", "app_content"))
      .then((snap) => {
        if (snap.exists() && Array.isArray(snap.data()?.faq) && snap.data()!.faq.length) {
          setItems(snap.data()!.faq);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex flex-col gap-4 pb-24"
    >
      <header className="flex items-center gap-3 mb-1">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white/80 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#38B6FF]" />
          {t("DeFi Account FAQ")}
        </h1>
      </header>

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <FAQItem key={i} index={i} question={item.q} answer={item.a} />
        ))}
      </div>
    </motion.div>
  );
}
