import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Delete, ShieldCheck, X } from "lucide-react";
import { setUserPin, verifyUserPin, changeUserPin } from "../../lib/pin";

export type PinMode = "setup" | "confirm-setup" | "verify" | "reset";

interface PinModalProps {
  open: boolean;
  mode: PinMode;
  telegramId: string;
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onClose: () => void;
  /** For reset: after old pin verified we switch to setup internally */
}

export function PinModal({
  open,
  mode: initialMode,
  telegramId,
  title,
  subtitle,
  onSuccess,
  onClose,
}: PinModalProps) {
  const [mode, setMode] = useState<PinMode>(initialMode);
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setPin("");
      setFirstPin("");
      setError("");
      setBusy(false);
      setAttempts(0);
    }
  }, [open, initialMode]);

  const titles: Record<PinMode, string> = {
    setup: title || "Create PIN",
    "confirm-setup": "Confirm PIN",
    verify: title || "Enter PIN",
    reset: "Enter current PIN",
  };

  const subs: Record<PinMode, string> = {
    setup: subtitle || "Set a 4-digit PIN to secure withdrawals",
    "confirm-setup": "Enter the same PIN again",
    verify: subtitle || "Enter your 4-digit PIN to confirm",
    reset: "Verify your current PIN to change it",
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const submitPin = useCallback(
    async (fullPin: string) => {
      if (busy || !telegramId) return;
      setBusy(true);
      setError("");
      try {
        if (mode === "setup") {
          setFirstPin(fullPin);
          setPin("");
          setMode("confirm-setup");
          setBusy(false);
          return;
        }
        if (mode === "confirm-setup") {
          if (fullPin !== firstPin) {
            setError("PINs do not match. Try again.");
            setPin("");
            setFirstPin("");
            setMode("setup");
            triggerShake();
            setBusy(false);
            return;
          }
          await setUserPin(telegramId, fullPin);
          onSuccess();
          return;
        }
        if (mode === "verify") {
          const ok = await verifyUserPin(telegramId, fullPin);
          if (!ok) {
            const next = attempts + 1;
            setAttempts(next);
            setError(next >= 5 ? "Too many wrong attempts. Try again later." : "Incorrect PIN. Transfer will not proceed.");
            setPin("");
            triggerShake();
            setBusy(false);
            // CRITICAL: do NOT call onSuccess — form/transfer stays blocked
            if (next >= 5) {
              setTimeout(() => onClose(), 1200);
            }
            return;
          }
          setAttempts(0);
          onSuccess(); // only after correct PIN
          return;
        }
        if (mode === "reset") {
          const ok = await verifyUserPin(telegramId, fullPin);
          if (!ok) {
            setError("Incorrect PIN");
            setPin("");
            triggerShake();
            setBusy(false);
            return;
          }
          setPin("");
          setFirstPin("");
          setMode("setup");
          setBusy(false);
          return;
        }
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
        setPin("");
        triggerShake();
      } finally {
        setBusy(false);
      }
    },
    [busy, telegramId, mode, firstPin, onSuccess, onClose, attempts]
  );

  const onDigit = (d: string) => {
    if (busy || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) {
      setTimeout(() => submitPin(next), 120);
    }
  };

  const onDelete = () => {
    if (busy) return;
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) onClose();
        }}
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="w-full max-w-sm bg-[#16171f] border border-white/10 rounded-3xl p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8792FF]/30 to-[#6b76e3]/20 border border-[#8792FF]/30 flex items-center justify-center">
                {mode === "verify" ? (
                  <Lock className="w-5 h-5 text-[#8792FF]" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[#8792FF]" />
                )}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{titles[mode]}</h3>
                <p className="text-white/45 text-xs mt-0.5">{subs[mode]}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={busy}
              className="p-2 rounded-xl text-white/40 hover:bg-white/5 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dots */}
          <motion.div
            animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center gap-4 my-6"
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  i < pin.length
                    ? "bg-[#8792FF] shadow-[0_0_12px_rgba(135,146,255,0.6)] scale-110"
                    : "bg-white/15"
                }`}
              />
            ))}
          </motion.div>

          {error && (
            <p className="text-center text-red-400 text-xs mb-3 font-medium">{error}</p>
          )}
          {busy && (
            <p className="text-center text-white/40 text-xs mb-3">Please wait...</p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => {
              if (key === "") return <div key="empty" />;
              if (key === "del") {
                return (
                  <button
                    key="del"
                    type="button"
                    onClick={onDelete}
                    className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-white/70"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onDigit(key)}
                  className="h-14 rounded-2xl bg-white/[0.06] hover:bg-white/10 active:scale-95 transition-all text-xl font-semibold text-white"
                >
                  {key}
                </button>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-white/25 mt-5">
            PIN is stored encrypted. Never share it with anyone.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
