import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, ChevronLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useSettings } from "../lib/SettingsContext";

type NewsItem = {
  tag: string;
  tagColor?: string;
  title: string;
  body: string;
};

const DEFAULT_NEWS: NewsItem[] = [
  {
    tag: "Latest Update",
    tagColor: "text-[#FFC914]",
    title: "New Reward Events Live",
    body: "New reward events are live. Open Rewards, complete tasks before the timer ends, and claim UUSD.",
  },
  {
    tag: "Security",
    tagColor: "text-emerald-400",
    title: "PIN protection for transfers",
    body: "All sends now require your 4-digit PIN. Set it from Profile → Passcode. Never share your PIN with anyone.",
  },
  {
    tag: "Tips",
    tagColor: "text-[#8792FF]",
    title: "How to earn faster",
    body: "Finish social tasks, invite friends with your referral link, and check Events daily for bonus pools.",
  },
];

export function WalletNewsPage() {
  const navigate = useNavigate();
  const { t } = useSettings();
  const [news, setNews] = useState<NewsItem[]>(DEFAULT_NEWS);

  useEffect(() => {
    getDoc(doc(db, "settings", "app_content"))
      .then((snap) => {
        if (snap.exists() && Array.isArray(snap.data()?.news) && snap.data()!.news.length) {
          setNews(snap.data()!.news);
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
          <Lightbulb className="w-5 h-5 text-[#FFC914]" />
          {t("Wallet News")}
        </h1>
      </header>

      <div className="flex flex-col gap-4">
        {news.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25 }}
            className="bg-white/5 rounded-2xl p-4 border border-white/10 relative overflow-hidden"
          >
            {i === 0 && (
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFC914]/10 blur-[30px] rounded-full pointer-events-none" />
            )}
            <span className={`text-[10px] uppercase font-bold tracking-wider mb-1.5 block ${item.tagColor || "text-[#FFC914]"}`}>
              {item.tag}
            </span>
            <h3 className="text-white font-bold text-base mb-2">{item.title}</h3>
            <p className="text-xs text-white/70 leading-relaxed">{item.body}</p>
          </motion.div>
        ))}

        <div className="bg-[#FFC914]/10 rounded-2xl p-4 border border-[#FFC914]/20 mt-1 flex flex-col items-center text-center">
          <h4 className="text-[#FFC914] text-sm font-bold mb-2">Stay Updated</h4>
          <p className="text-xs text-white/60 mb-3 leading-relaxed">
            Official announcements and roadmap updates are published on our website.
          </p>
          <motion.a
            whileTap={{ scale: 0.95 }}
            href="https://uusd.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-black bg-[#FFC914] px-6 py-2 rounded-xl text-sm font-bold w-full max-w-[200px]"
          >
            <ExternalLink className="w-4 h-4" />
            Official Website
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
}
