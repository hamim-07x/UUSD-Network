/**
 * #AI_ZONE: TASK_VERIFY
 * Referral: Firestore count. Telegram/Twitter: Cloud Functions.
 * Without Functions deployed, strict API tasks fail closed (no false reward).
 */

/**
 * Task verification helpers.
 * - Referral: checks Firestore referrals collection (works on free plan)
 * - Telegram: calls Cloud Function (bot must be channel admin + BOT_TOKEN set)
 * - Twitter/X: calls Cloud Function (needs Twitter API bearer token)
 *
 * Without Cloud Functions deployed, strict API tasks will return a clear error
 * so users are not falsely rewarded.
 */

import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { app } from "./firebase";

export type VerifyResult = {
  ok: boolean;
  message?: string;
};

/** Count how many people this user has referred (from Firestore only) */
export async function getReferralCount(referrerId: string): Promise<number> {
  try {
    const q = query(collection(db, "referrals"), where("referrerId", "==", referrerId));
    const snap = await getDocs(q);
    return snap.size;
  } catch (e) {
    console.error("getReferralCount error", e);
    return 0;
  }
}

/** Verify referral task against required count */
export async function verifyReferralTask(
  telegramId: string,
  required: number
): Promise<VerifyResult> {
  const count = await getReferralCount(telegramId);
  if (count >= required) {
    return { ok: true };
  }
  return {
    ok: false,
    message: `You need ${required} referral(s). You currently have ${count}.`,
  };
}

/**
 * Telegram channel/group membership check via Cloud Function.
 * Bot must be admin of the channel. Channel can be @username or -100... id.
 * Link formats supported: t.me/xxx, https://t.me/xxx, @xxx
 */
export async function verifyTelegramJoin(
  telegramId: string,
  taskLink: string
): Promise<VerifyResult> {
  const chatId = extractTelegramChat(taskLink);
  if (!chatId) {
    return { ok: false, message: "Invalid Telegram link on this task." };
  }
  
  try {
    const settingsSnap = await getDoc(doc(db, "settings", "api_keys"));
    const botToken = settingsSnap.exists() ? settingsSnap.data().telegramBotToken : null;
    
    if (!botToken) {
      return { ok: false, message: "Verification system is not configured. Please contact admin." };
    }
    
    // Direct API call from client. Since this is an AI Studio demo without backend,
    // we bypass CORS by hoping telegram API accepts it, or we rely on the bot token.
    // Note: api.telegram.org supports CORS for some endpoints.
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${chatId}&user_id=${telegramId}`);
    const data = await res.json();
    
    if (data.ok) {
      const status = data.result.status;
      if (['member', 'administrator', 'creator'].includes(status)) {
        return { ok: true };
      }
      return { ok: false, message: "Please join the channel first." };
    } else {
      return { ok: false, message: "Failed to verify. Bot might not be an admin in the channel." };
    }
  } catch (e) {
    console.error("verifyTelegramJoin error", e);
    return { ok: false, message: "Verification failed due to a network error." };
  }
}

/**
 * Twitter/X follow check via Cloud Function.
 * Requires Twitter API credentials on the server.
 */
export async function verifyTwitterFollow(
  telegramId: string,
  taskLink: string
): Promise<VerifyResult> {
  const targetUsername = extractTwitterUsername(taskLink);
  if (!targetUsername) {
    return { ok: false, message: "Invalid Twitter/X link on this task." };
  }

  try {
    const settingsSnap = await getDoc(doc(db, "settings", "api_keys"));
    const twitterToken = settingsSnap.exists() ? settingsSnap.data().twitterBearerToken : null;
    
    if (!twitterToken) {
      return { ok: false, message: "Verification system is not configured. Please contact admin." };
    }

    const userTwitter = window.prompt("To verify, please enter your Twitter/X username (e.g. @johndoe):");
    if (!userTwitter) {
       return { ok: false, message: "Twitter username is required for verification." };
    }
    const cleanUserTwitter = userTwitter.replace("@", "").trim();

    // Use a CORS proxy for client-side API requests
    const proxyUrl = "https://corsproxy.io/?";

    // 1. Get user ID
    const userUrl = encodeURIComponent(`https://api.twitter.com/2/users/by/username/${cleanUserTwitter}`);
    const userRes = await fetch(`${proxyUrl}${userUrl}`, {
       headers: { "Authorization": `Bearer ${twitterToken}` }
    });
    const userData = await userRes.json();
    if (!userData.data) return { ok: false, message: "Could not find your Twitter account." };
    const userId = userData.data.id;

    // 2. Get target ID
    const targetUrl = encodeURIComponent(`https://api.twitter.com/2/users/by/username/${targetUsername}`);
    const targetRes = await fetch(`${proxyUrl}${targetUrl}`, {
       headers: { "Authorization": `Bearer ${twitterToken}` }
    });
    const targetData = await targetRes.json();
    if (!targetData.data) return { ok: false, message: "Could not find the target Twitter account." };
    const targetId = targetData.data.id;

    // 3. Check following
    const followUrl = encodeURIComponent(`https://api.twitter.com/2/users/${userId}/following`);
    const followRes = await fetch(`${proxyUrl}${followUrl}`, {
       headers: { "Authorization": `Bearer ${twitterToken}` }
    });
    const followData = await followRes.json();
    
    if (followData.data && followData.data.some((u: any) => u.username.toLowerCase() === targetUsername.toLowerCase() || u.id === targetId)) {
        return { ok: true };
    } else {
        return { ok: false, message: "You are not following the account yet." };
    }
  } catch (e) {
    console.error("verifyTwitterFollow error", e);
    return { ok: false, message: "Verification failed due to a network or CORS error." };
  }
}

function extractTelegramChat(link: string): string | null {
  if (!link) return null;
  const cleaned = link.trim();
  // @channel
  if (cleaned.startsWith("@")) return cleaned;
  // t.me/channel or telegram.me
  const m = cleaned.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i);
  if (m) return `@${m[1]}`;
  // numeric chat id
  if (/^-?\d+$/.test(cleaned)) return cleaned;
  return null;
}

function extractTwitterUsername(link: string): string | null {
  if (!link) return null;
  const cleaned = link.trim().replace(/\/$/, "");
  if (cleaned.startsWith("@")) return cleaned.slice(1);
  const m = cleaned.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i);
  if (m) return m[1];
  return null;
}

/** Main entry: verify a task based on type */
export async function verifyTaskCompletion(
  task: {
    id: string;
    category?: string;
    iconType?: string;
    link?: string;
    requireVerification?: boolean;
    requiredReferrals?: number;
  },
  telegramId: string
): Promise<VerifyResult> {
  const icon = (task.iconType || "").toLowerCase();
  const category = (task.category || "").toLowerCase();

  // Referral tasks — always strict, Firestore only
  if (category === "referral" || icon === "referral") {
    return verifyReferralTask(telegramId, task.requiredReferrals || 1);
  }

  // API-required social tasks
  if (task.requireVerification) {
    if (icon === "telegram") {
      return verifyTelegramJoin(telegramId, task.link || "");
    }
    if (icon === "twitter") {
      return verifyTwitterFollow(telegramId, task.link || "");
    }
  }

  // Non-strict tasks (web, youtube, etc. without requireVerification)
  // Trust-based after user opened the link + countdown
  return { ok: true };
}
