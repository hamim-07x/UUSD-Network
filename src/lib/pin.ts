/**
 * #AI_ZONE: PIN_SECURITY
 * 4-digit PIN hashed (SHA-256 + salt) in user_security/{telegramId}.
 * Never store plain PIN. Wrong PIN must not unlock withdraw.
 */

import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/** SHA-256 hex hash via Web Crypto (never store plain PIN) */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hasPinSet(telegramId: string): Promise<boolean> {
  if (!telegramId) return false;
  try {
    const snap = await getDoc(doc(db, "user_security", telegramId));
    return !!(snap.exists() && snap.data()?.pinHash && snap.data()?.pinSalt);
  } catch {
    return false;
  }
}

export async function setUserPin(telegramId: string, pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be 4 digits");
  const salt = makeSalt();
  const pinHash = await hashPin(pin, salt);
  await setDoc(
    doc(db, "user_security", telegramId),
    {
      pinHash,
      pinSalt: salt,
      pinSetAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function verifyUserPin(telegramId: string, pin: string): Promise<boolean> {
  if (!/^\d{4}$/.test(pin)) return false;
  const snap = await getDoc(doc(db, "user_security", telegramId));
  if (!snap.exists()) return false;
  const { pinHash, pinSalt } = snap.data() as { pinHash?: string; pinSalt?: string };
  if (!pinHash || !pinSalt) return false;
  const attempt = await hashPin(pin, pinSalt);
  return attempt === pinHash;
}

export async function changeUserPin(
  telegramId: string,
  oldPin: string,
  newPin: string
): Promise<void> {
  const ok = await verifyUserPin(telegramId, oldPin);
  if (!ok) throw new Error("Current PIN is incorrect");
  await setUserPin(telegramId, newPin);
}
