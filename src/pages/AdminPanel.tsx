/**
 * #AI_ZONE: ADMIN_PANEL
 * Demo auth: sessionStorage. Tabs: dashboard, users, tasks, events, logs, content, settings.
 * Content → FAQ/News. Settings → bot usernames + API tokens (settings/api_keys).
 * #AI_DO_NOT_BREAK admin login gate or tab structure without need.
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, LayoutDashboard, Users, ListTodo, Calendar, ScrollText, Settings,
  Search, Plus, X, Edit2, Check, ChevronLeft, LogOut, Trash2, Wallet, TrendingUp, FileText
} from "lucide-react";
import { FaTwitter, FaInstagram, FaFacebook, FaYoutube, FaTelegramPlane } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { UserRegistryEntry } from "../hooks/useWallet";
import { getTasks, getEvents, saveTask, saveEvent, deleteTaskDoc, deleteEventDoc, getUsers, getWallets, getAllActivities } from "../lib/db";
import { syncToFirebase } from "../lib/sync";
import { db } from "../lib/firebase";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { Globe } from "lucide-react";

interface AdminUser extends UserRegistryEntry {
  balance: number;
  blocked?: boolean;
}

type Tab = "dashboard" | "users" | "tasks" | "events" | "logs" | "content" | "settings";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "uusdadmin2026";

export function AdminPanel() {
  const navigate = useNavigate();

  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem("uusd_admin_auth") === "true");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Tabs & data
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalBalance, setTotalBalance] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [usersJoinedToday, setUsersJoinedToday] = useState(0);

  // Settings
  const [botUsername, setBotUsername] = useState(localStorage.getItem("mock_bot_username") || "our_bot");
  const [supportUsername, setSupportUsername] = useState(localStorage.getItem("mock_support_username") || "support");
  const [minTransferAmount, setMinTransferAmount] = useState(localStorage.getItem("mock_min_transfer") || "10");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceTwitterLink, setMaintenanceTwitterLink] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [twitterBearerToken, setTwitterBearerToken] = useState("");
  const [apiSaveMsg, setApiSaveMsg] = useState("");
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([
    { q: "What is UUSD Token?", a: "UUSD is the utility and reward token of this network." },
  ]);
  const [newsItems, setNewsItems] = useState<{ tag: string; title: string; body: string; tagColor?: string }[]>([
    { tag: "Latest Update", title: "New Reward Events Live", body: "Check Rewards and complete tasks to earn UUSD.", tagColor: "text-[#FFC914]" },
  ]);
  const [contentMsg, setContentMsg] = useState("");

  // Task form
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskFilter, setTaskFilter] = useState("all");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", reward: 1, link: "", iconType: "twitter",
    category: "Social", eventId: "default", requiredReferrals: 1, iconUrl: "", requireVerification: false
  });

  // Event form
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "New Event", rewardText: "10,000 UUSD\nReward Pool", posterUrl: "",
    durationDays: 15, category: "General"
  });

  // User balance edit
  const [editBalanceUserId, setEditBalanceUserId] = useState<string | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    setTimeout(() => {
      if (loginUser === ADMIN_USERNAME && loginPass === ADMIN_PASSWORD) {
        sessionStorage.setItem("uusd_admin_auth", "true");
        setIsAuthenticated(true);
      } else {
        setLoginError("Invalid username or password");
      }
      setLoginLoading(false);
    }, 400);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("uusd_admin_auth");
    setIsAuthenticated(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [registry, dbWallets, activities, dbTasks, dbEvents] = await Promise.all([
        getUsers(), getWallets(), getAllActivities(), getTasks(), getEvents()
      ]);

      const userMap = new Map<string, UserRegistryEntry>();
      registry.forEach((u: any) => userMap.set(u.telegramId, u));

      let total = 0;
      const adminUsers: AdminUser[] = [];
      const todayStr = new Date().toISOString().split("T")[0];
      let joinedToday = 0;

      dbWallets.forEach((wallet: any) => {
        const entry = userMap.get(wallet.telegramId) || {
          telegramId: wallet.telegramId, address: wallet.address || "",
          firstName: "Unknown", username: null, photoUrl: null, joinedAt: undefined
        };
        const balance = wallet.balances?.["UUSD"] || 0;
        total += balance;
        if (entry.joinedAt && entry.joinedAt.startsWith(todayStr)) joinedToday++;
        adminUsers.push({ ...entry, balance, blocked: wallet.blocked || false });
      });

      setUsers(adminUsers.sort((a, b) => b.balance - a.balance));
      setTotalBalance(total);
      setUsersJoinedToday(joinedToday);
      setTasksCompleted(activities.filter((a: any) => a.type === "earn").length);
      setAllLogs(activities.slice(0, 100).map((a: any) => ({
        ...a,
        user: userMap.get(a.telegramId || a.userTelegramId)
      })));
      setTasks(dbTasks.length ? dbTasks : []);
      setEvents(dbEvents.length ? dbEvents : [{ id: "default", title: "Default", category: "General", rewardText: "Rewards", posterUrl: "", durationDays: 30 }]);

      // Load global + API settings from Firebase
      try {
        const globalSnap = await getDoc(doc(db, "settings", "global"));
        if (globalSnap.exists()) {
          const g = globalSnap.data();
          if (g.botUsername) setBotUsername(g.botUsername);
          if (g.supportUsername) setSupportUsername(g.supportUsername);
          if (g.minTransferAmount !== undefined) setMinTransferAmount(String(g.minTransferAmount));
          if (g.maintenanceMode !== undefined) setMaintenanceMode(g.maintenanceMode);
          if (g.maintenanceTwitterLink !== undefined) setMaintenanceTwitterLink(g.maintenanceTwitterLink);
        }
        const apiSnap = await getDoc(doc(db, "settings", "api_keys"));
        if (apiSnap.exists()) {
          const a = apiSnap.data();
          if (a.telegramBotToken) setTelegramBotToken(a.telegramBotToken);
          if (a.twitterBearerToken) setTwitterBearerToken(a.twitterBearerToken);
        }
        const contentSnap = await getDoc(doc(db, "settings", "app_content"));
        if (contentSnap.exists()) {
          const c = contentSnap.data()!;
          if (Array.isArray(c.faq)) setFaqItems(c.faq);
          if (Array.isArray(c.news)) setNewsItems(c.news);
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      (u.firstName || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      u.telegramId.includes(q) ||
      (u.address || "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // --- Actions ---
  const handleSaveBalance = async (userId: string) => {
    const val = parseFloat(editBalanceValue);
    if (isNaN(val) || val < 0) return;
    try {
      const wallet = users.find(u => u.telegramId === userId);
      await setDoc(doc(db, "wallets", userId), {
        telegramId: userId,
        address: wallet?.address || "",
        balances: { UUSD: val },
        availableBalance: val,
        lockedBalance: 0,
        depositEnabled: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setUsers(prev => prev.map(u => u.telegramId === userId ? { ...u, balance: val } : u));
      setEditBalanceUserId(null);
      setTotalBalance(users.reduce((s, u) => s + (u.telegramId === userId ? val : u.balance), 0));
    } catch (e) {
      alert("Failed to update balance");
    }
  };

  const handleToggleBlock = async (userId: string, currentlyBlocked: boolean) => {
    try {
      await setDoc(doc(db, "wallets", userId), { blocked: !currentlyBlocked }, { merge: true });
      setUsers(prev => prev.map(u => u.telegramId === userId ? { ...u, blocked: !currentlyBlocked } : u));
    } catch (e) {
      alert("Failed to update user");
    }
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) return;
    const id = editingTaskId || `task_${Date.now()}`;
    const task = { ...taskForm, id, reward: Number(taskForm.reward) || 0, requiredReferrals: Number(taskForm.requiredReferrals) || 1 };
    try {
      await saveTask(task);
      if (editingTaskId) {
        setTasks(prev => prev.map(t => t.id === id ? task : t));
      } else {
        setTasks(prev => [...prev, task]);
      }
      setIsAddingTask(false);
      setEditingTaskId(null);
      setTaskForm({ title: "", description: "", reward: 1, link: "", iconType: "twitter", category: "Social", eventId: "default", requiredReferrals: 1, iconUrl: "", requireVerification: false });
    } catch (e) {
      alert("Failed to save task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTaskDoc(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) return;
    const id = editingEventId || `event_${Date.now()}`;
    const event = { ...eventForm, id, durationDays: Number(eventForm.durationDays) || 15 };
    try {
      await saveEvent(event);
      if (editingEventId) {
        setEvents(prev => prev.map(e => e.id === id ? event : e));
      } else {
        setEvents(prev => [...prev, event]);
      }
      setIsAddingEvent(false);
      setEditingEventId(null);
      setEventForm({ title: "New Event", rewardText: "10,000 UUSD\nReward Pool", posterUrl: "", durationDays: 15, category: "General" });
    } catch (e) {
      alert("Failed to save event");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (id === "default") return alert("Cannot delete default event");
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEventDoc(id);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const ratio = Math.max(1280 / img.width, 720 / img.height);
          const w = img.width * ratio;
          const h = img.height * ratio;
          ctx.drawImage(img, (1280 - w) / 2, (720 - h) / 2, w, h);
          setter(canvas.toDataURL("image/jpeg", 0.8));
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    setApiSaveMsg("");
    try {
      await setDoc(doc(db, "settings", "global"), {
        botUsername: botUsername.trim(),
        supportUsername: supportUsername.trim(),
        minTransferAmount: Number(minTransferAmount) || 0,
        maintenanceMode,
        maintenanceTwitterLink: maintenanceTwitterLink.trim(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      await setDoc(doc(db, "settings", "api_keys"), {
        telegramBotToken: telegramBotToken.trim(),
        twitterBearerToken: twitterBearerToken.trim(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // keep lightweight cache for referral UI only (not secrets)
      try {
        localStorage.setItem("mock_bot_username", botUsername.trim());
        localStorage.setItem("mock_support_username", supportUsername.trim());
        localStorage.setItem("mock_min_transfer", String(Number(minTransferAmount) || 0));
      } catch (_) {}

      setApiSaveMsg("Settings saved to Firebase. API tokens will be used by Cloud Functions for verification.");
    } catch (e: any) {
      setApiSaveMsg(e?.message || "Failed to save settings");
    }
  };

  const iconPreview = (type: string, url?: string) => {
    if (url) return <img src={url} alt="" className="w-5 h-5 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
    // @ts-ignore
    if (type === "twitter") return <FaTwitter className="w-4 h-4 text-blue-400" />;
    // @ts-ignore
    if (type === "instagram") return <FaInstagram className="w-4 h-4 text-pink-500" />;
    // @ts-ignore
    if (type === "facebook") return <FaFacebook className="w-4 h-4 text-blue-500" />;
    // @ts-ignore
    if (type === "telegram") return <FaTelegramPlane className="w-4 h-4 text-blue-400" />;
    // @ts-ignore
    if (type === "youtube") return <FaYoutube className="w-4 h-4 text-red-500" />;
    if (type === "web") return <Globe className="w-4 h-4 text-purple-400" />;
    if (type === "referral") return <Users className="w-4 h-4 text-[#8792FF]" />;
    return <span>✨</span>;
  };

  // ========== LOGIN SCREEN ==========
  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#0c0d12]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-[#16171f] border border-white/10 rounded-3xl p-7 shadow-2xl">
          <div className="flex flex-col items-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8792FF] to-[#5b65d4] flex items-center justify-center mb-4 shadow-lg shadow-[#8792FF]/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-white/40 text-sm mt-1">UUSD Network Control</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Username</label>
              <input type="text" value={loginUser} onChange={e => setLoginUser(e.target.value)}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#8792FF] outline-none"
                placeholder="admin" required autoComplete="username" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Password</label>
              <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)}
                className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#8792FF] outline-none"
                placeholder="••••••••" required autoComplete="current-password" />
            </div>
            {loginError && <p className="text-red-400 text-xs text-center">{loginError}</p>}
            <button type="submit" disabled={loginLoading}
              className="w-full bg-gradient-to-r from-[#8792FF] to-[#6b76e3] text-white font-bold py-3 rounded-xl disabled:opacity-50">
              {loginLoading ? "Checking..." : "Login"}
            </button>
          </form>
          <button onClick={() => navigate("/")} className="w-full mt-4 text-white/30 text-sm hover:text-white/60">← Back to App</button>
        </motion.div>
      </div>
    );
  }

  // ========== MAIN ADMIN UI ==========
  const navItems: { id: Tab; icon: any; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "users", icon: Users, label: "Users" },
    { id: "tasks", icon: ListTodo, label: "Tasks" },
    { id: "events", icon: Calendar, label: "Events" },
    { id: "logs", icon: ScrollText, label: "Logs" },
    { id: "content", icon: FileText, label: "Content" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#0c0d12] text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#12131a] border-b md:border-b-0 md:border-r border-white/5 flex flex-row md:flex-col shrink-0 z-20">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8792FF] to-[#5b65d4] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="hidden md:block">
            <div className="font-bold text-sm">UUSD Admin</div>
            <div className="text-[10px] text-[#8792FF] uppercase tracking-wider">Control Panel</div>
          </div>
        </div>

        <nav className="flex-1 flex flex-row md:flex-col gap-1 p-2 md:p-3 overflow-x-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === item.id
                  ? "bg-[#8792FF]/15 text-[#8792FF]"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              }`}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 flex flex-col gap-1">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/80 hover:bg-red-500/10">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:bg-white/5 hover:text-white">
            <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to App</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-white/40">Loading...</div>
        ) : (
          <AnimatePresence mode="wait">
            {/* DASHBOARD */}
            {activeTab === "dashboard" && (
              <motion.div key="dash" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Dashboard</h2>
                  <p className="text-white/40 text-sm mt-1">Overview of your network</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Users", value: users.length, icon: Users, color: "from-blue-500/20 to-blue-600/5" },
                    { label: "Total UUSD", value: totalBalance.toLocaleString(), icon: Wallet, color: "from-[#8792FF]/20 to-[#8792FF]/5" },
                    { label: "Joined Today", value: usersJoinedToday, icon: TrendingUp, color: "from-emerald-500/20 to-emerald-600/5" },
                    { label: "Tasks Done", value: tasksCompleted, icon: ListTodo, color: "from-amber-500/20 to-amber-600/5" },
                  ].map((s, i) => (
                    <div key={i} className={`bg-gradient-to-br ${s.color} border border-white/5 rounded-2xl p-5`}>
                      <s.icon className="w-5 h-5 text-white/50 mb-3" />
                      <div className="text-2xl font-bold">{s.value}</div>
                      <div className="text-xs text-white/40 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#16171f] border border-white/5 rounded-2xl p-5">
                  <h3 className="font-semibold mb-4">Quick Stats</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="flex justify-between"><span className="text-white/40">Active Tasks</span><span className="font-medium">{tasks.length}</span></div>
                    <div className="flex justify-between"><span className="text-white/40">Events</span><span className="font-medium">{events.length}</span></div>
                    <div className="flex justify-between"><span className="text-white/40">Recent Logs</span><span className="font-medium">{allLogs.length}</span></div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* USERS */}
            {activeTab === "users" && (
              <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">Users</h2>
                    <p className="text-white/40 text-sm">{users.length} registered users</p>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search name, ID, address..."
                      className="bg-[#16171f] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm w-full sm:w-64 focus:border-[#8792FF] outline-none" />
                  </div>
                </div>
                <div className="bg-[#16171f] border border-white/5 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5 text-white/40 text-left">
                          <th className="px-4 py-3 font-medium">User</th>
                          <th className="px-4 py-3 font-medium">Balance</th>
                          <th className="px-4 py-3 font-medium hidden md:table-cell">Address</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.telegramId} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#8792FF]/20 flex items-center justify-center text-xs font-bold overflow-hidden">
                                  {u.photoUrl ? <img src={u.photoUrl} className="w-full h-full object-cover" /> : (u.firstName || "U")[0]}
                                </div>
                                <div>
                                  <div className="font-medium">{u.firstName || "Unknown"} {u.blocked && <span className="text-red-400 text-[10px]">BLOCKED</span>}</div>
                                  <div className="text-[11px] text-white/30">ID: {u.telegramId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {editBalanceUserId === u.telegramId ? (
                                <div className="flex items-center gap-1">
                                  <input type="number" value={editBalanceValue} onChange={e => setEditBalanceValue(e.target.value)}
                                    className="w-24 bg-[#0c0d12] border border-white/20 rounded-lg px-2 py-1 text-xs" autoFocus />
                                  <button onClick={() => handleSaveBalance(u.telegramId)} className="p-1 text-emerald-400"><Check className="w-4 h-4" /></button>
                                  <button onClick={() => setEditBalanceUserId(null)} className="p-1 text-white/40"><X className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <span className="font-semibold text-[#8792FF]">{u.balance.toLocaleString()} UUSD</span>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-white/30 text-xs font-mono">
                              {u.address ? `${u.address.slice(0, 6)}...${u.address.slice(-4)}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => { setEditBalanceUserId(u.telegramId); setEditBalanceValue(String(u.balance)); }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white" title="Edit balance">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleToggleBlock(u.telegramId, !!u.blocked)}
                                  className={`p-1.5 rounded-lg text-xs font-medium px-2 ${u.blocked ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                  {u.blocked ? "Unblock" : "Block"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-10 text-center text-white/30">No users found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TASKS */}
            {activeTab === "tasks" && (
              <motion.div key="tasks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Tasks</h2>
                    <p className="text-white/40 text-sm">Manage reward tasks</p>
                  </div>
                  <button onClick={() => { setIsAddingTask(!isAddingTask); setEditingTaskId(null); }}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#8792FF] to-[#6b76e3] text-white text-sm font-bold px-4 py-2.5 rounded-xl">
                    {isAddingTask ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isAddingTask ? "Cancel" : "Add Task"}
                  </button>
                </div>

                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
                  <button onClick={() => setTaskFilter("all")} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${taskFilter === "all" ? "bg-[#8792FF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                    All Tasks ({tasks.length})
                  </button>
                  {events.map(ev => {
                    const count = tasks.filter(t => t.eventId === ev.id).length;
                    return (
                      <button key={ev.id} onClick={() => setTaskFilter(ev.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${taskFilter === ev.id ? "bg-[#8792FF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                        {ev.title} ({count})
                      </button>
                    )
                  })}
                </div>

                {isAddingTask && (
                  <div className="bg-[#16171f] border border-white/10 rounded-2xl p-5 space-y-3">
                    <h3 className="font-semibold text-sm">{editingTaskId ? "Edit Task" : "New Task"}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input placeholder="Title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                        className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none" />
                      <input type="number" step="any" placeholder="Reward (UUSD)" value={taskForm.reward} onChange={e => setTaskForm({ ...taskForm, reward: e.target.value })}
                        className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none" />
                      <input placeholder="Description" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                        className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none sm:col-span-2" />
                      <select value={taskForm.category} onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}
                        className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none">
                        <option value="Social">Social</option>
                        <option value="Web">Web</option>
                        <option value="Referral">Referral</option>
                      </select>
                      <select value={taskForm.iconType} onChange={e => setTaskForm({ ...taskForm, iconType: e.target.value })}
                        className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none">
                        <option value="twitter">Twitter</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="telegram">Telegram</option>
                        <option value="youtube">YouTube</option>
                        <option value="web">Web</option>
                        <option value="referral">Referral</option>
                        <option value="custom">Custom Icon</option>
                      </select>
                      {taskForm.iconType === "custom" && (
                        <input placeholder="Icon URL (direct link)" value={taskForm.iconUrl} onChange={e => setTaskForm({ ...taskForm, iconUrl: e.target.value })}
                          className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none sm:col-span-2" />
                      )}
                      {taskForm.category !== "Referral" && (
                        <input placeholder="Task Link" value={taskForm.link} onChange={e => setTaskForm({ ...taskForm, link: e.target.value })}
                          className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none sm:col-span-2" />
                      )}
                      <select value={taskForm.eventId} onChange={e => setTaskForm({ ...taskForm, eventId: e.target.value })}
                        className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none">
                        <option value="default">Default (No Event)</option>
                        {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                      </select>
                      {(taskForm.category === "Referral" || taskForm.iconType === "referral") && (
                        <input type="number" placeholder="Required Referrals" value={taskForm.requiredReferrals}
                          onChange={e => setTaskForm({ ...taskForm, requiredReferrals: Number(e.target.value) })}
                          className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none" />
                      )}
                    </div>
                    {(taskForm.iconType === "telegram" || taskForm.iconType === "twitter") && (
                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 sm:col-span-2">
                        <div>
                          <span className="text-xs font-medium text-white/80">Require API Verification</span>
                          <p className="text-[10px] text-white/40 mt-0.5">User must follow/join before Verify succeeds</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={taskForm.requireVerification}
                            onChange={e => setTaskForm({ ...taskForm, requireVerification: e.target.checked })} />
                          <div className="w-9 h-5 bg-white/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8792FF]"></div>
                        </label>
                      </div>
                    )}
                    <button onClick={handleSaveTask} className="bg-gradient-to-r from-[#8792FF] to-[#6b76e3] text-white text-sm font-bold px-5 py-2 rounded-xl">
                      Save Task
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {tasks.filter(t => taskFilter === "all" || t.eventId === taskFilter).map(task => (
                    <div key={task.id} className="bg-[#16171f] border border-white/5 rounded-2xl p-5 relative group">
                      <div className="absolute top-3 right-3 flex gap-1 opacity-70 group-hover:opacity-100">
                        <button onClick={() => {
                          setEditingTaskId(task.id);
                          setTaskForm({
                            title: task.title || "", description: task.description || "", reward: task.reward || 1,
                            link: task.link || "", iconType: task.iconType || "twitter", category: task.category || "Social",
                            eventId: task.eventId || "default", requiredReferrals: task.requiredReferrals || 1,
                            iconUrl: task.iconUrl || "", requireVerification: task.requireVerification || false
                          });
                          setIsAddingTask(true);
                        }} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                          {iconPreview(task.iconType, task.iconUrl)}
                        </div>
                        <div className="px-2.5 py-1 bg-[#8792FF]/15 rounded-full text-[#8792FF] text-xs font-bold">+{task.reward} UUSD</div>
                      </div>
                      <h4 className="font-bold mb-1 pr-12">{task.title}</h4>
                      <p className="text-xs text-white/40 mb-2">{task.description}</p>
                      <div className="flex gap-2 flex-wrap mt-2">
                        <span className="text-[10px] uppercase bg-white/5 px-2 py-0.5 rounded text-white/40">{task.category || "General"}</span>
                        {task.eventId && task.eventId !== "default" && (
                          <span className="text-[10px] uppercase bg-[#8792FF]/10 px-2 py-0.5 rounded text-[#8792FF]">
                            Event: {events.find(e => e.id === task.eventId)?.title || "Unknown"}
                          </span>
                        )}
                        {task.link && <span className="text-[10px] text-blue-400 truncate max-w-[140px]">{task.link}</span>}
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && <div className="col-span-full text-center py-12 text-white/30">No tasks yet. Add one!</div>}
                </div>
              </motion.div>
            )}

            {/* EVENTS */}
            {activeTab === "events" && (
              <motion.div key="events" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Events</h2>
                    <p className="text-white/40 text-sm">Manage campaign events & posters</p>
                  </div>
                  <button onClick={() => { setIsAddingEvent(!isAddingEvent); setEditingEventId(null); }}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#8792FF] to-[#6b76e3] text-white text-sm font-bold px-4 py-2.5 rounded-xl">
                    {isAddingEvent ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isAddingEvent ? "Cancel" : "Add Event"}
                  </button>
                </div>

                {isAddingEvent && (
                  <div className="bg-[#16171f] border border-white/10 rounded-2xl p-5 space-y-3">
                    <h3 className="font-semibold text-sm">{editingEventId ? "Edit Event" : "New Event"}</h3>
                    <input placeholder="Event Title" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none" />
                    <input placeholder="Category" value={eventForm.category} onChange={e => setEventForm({ ...eventForm, category: e.target.value })}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none" />
                    <textarea placeholder="Reward Text" rows={2} value={eventForm.rewardText} onChange={e => setEventForm({ ...eventForm, rewardText: e.target.value })}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none resize-none" />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input placeholder="Poster URL or upload below" value={eventForm.posterUrl} onChange={e => setEventForm({ ...eventForm, posterUrl: e.target.value })}
                        className="flex-1 bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none" />
                      <label className="bg-[#8792FF]/15 text-[#8792FF] px-4 py-2 rounded-xl text-sm font-bold cursor-pointer hover:bg-[#8792FF]/25 flex items-center justify-center">
                        Upload Image
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, url => setEventForm({ ...eventForm, posterUrl: url }))} />
                      </label>
                    </div>
                    <input type="number" placeholder="Duration (days)" value={eventForm.durationDays}
                      onChange={e => setEventForm({ ...eventForm, durationDays: Number(e.target.value) })}
                      className="w-full sm:w-40 bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none" />
                    <button onClick={handleSaveEvent} className="bg-gradient-to-r from-[#8792FF] to-[#6b76e3] text-white text-sm font-bold px-5 py-2 rounded-xl">
                      Save Event
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {events.map(ev => (
                    <div key={ev.id} className="bg-[#16171f] border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 relative">
                      <div className="absolute top-3 right-3 flex gap-1">
                        <button onClick={() => {
                          setEditingEventId(ev.id);
                          setEventForm({
                            title: ev.title || "", rewardText: ev.rewardText || "", posterUrl: ev.posterUrl || "",
                            durationDays: ev.durationDays || 15, category: ev.category || "General"
                          });
                          setIsAddingEvent(true);
                        }} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10"><Edit2 className="w-3.5 h-3.5" /></button>
                        {ev.id !== "default" && (
                          <button onClick={() => handleDeleteEvent(ev.id)} className="p-1.5 bg-red-500/10 rounded-lg text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                      <div className="w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                        {ev.posterUrl ? (
                          <img src={ev.posterUrl || undefined} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/600x340/1a1b23/8792FF?text=No+Image"; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">No Poster</div>
                        )}
                      </div>
                      <div className="flex-1 pr-10">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-lg font-bold">{ev.title}</h3>
                          <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">End</span>
                            <div className="relative">
                              <input type="checkbox" className="sr-only peer" checked={ev.isEnded || false}
                                onChange={async (e) => {
                                  const updated = { ...ev, isEnded: e.target.checked };
                                  if (e.target.checked) updated.durationDays = 0;
                                  await saveEvent(updated);
                                  setEvents(prev => prev.map(evt => evt.id === ev.id ? updated : evt));
                                }} />
                              <div className="w-7 h-4 bg-white/20 rounded-full peer peer-checked:bg-red-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                            </div>
                          </label>
                        </div>
                        <p className="text-xs text-white/40 mb-3">Category: {ev.category || "General"} · {ev.durationDays || 0} days · {tasks.filter(t => t.eventId === ev.id).length} tasks</p>
                        <div className="bg-white/5 rounded-xl p-3 text-sm whitespace-pre-wrap">{ev.rewardText}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* LOGS */}
            {activeTab === "logs" && (
              <motion.div key="logs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Activity Logs</h2>
                  <p className="text-white/40 text-sm">Recent transactions & rewards</p>
                </div>
                <div className="bg-[#16171f] border border-white/5 rounded-2xl divide-y divide-white/5">
                  {allLogs.map((log, i) => {
                    let title = log.type;
                    if (log.type === "deposit") title = "Deposited";
                    if (log.type === "withdraw") title = "Withdrew";
                    if (log.type === "transfer_out") title = `Sent to ${log.toName || "User"}`;
                    if (log.type === "transfer_in") title = `Received from ${log.fromName || "User"}`;
                    if (log.type === "earn") title = `Task: ${log.toName || "Reward"}`;
                    return (
                      <div key={i} className="flex items-center gap-4 p-4 hover:bg-white/[0.02]">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8792FF] to-[#5b65d4] flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                          {log.user?.photoUrl ? <img src={log.user.photoUrl} className="w-full h-full object-cover" /> : (log.user?.firstName || "U")[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{log.user?.firstName || "Unknown"} <span className="text-white/30 text-xs">#{log.user?.telegramId || "—"}</span></div>
                          <div className={`text-sm ${log.type === "earn" ? "text-emerald-400" : "text-white/60"}`}>
                            {title} <span className="font-bold">({log.amount} {log.symbol})</span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-white/30 shrink-0">
                          <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                          <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    );
                  })}
                  {allLogs.length === 0 && <div className="py-12 text-center text-white/30">No activity yet</div>}
                </div>
              </motion.div>
            )}

            {/* CONTENT */}
            {activeTab === "content" && (
              <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 max-w-2xl">
                <div>
                  <h2 className="text-2xl font-bold">App Content</h2>
                  <p className="text-white/40 text-sm">FAQ & Wallet News — live updates in the app</p>
                </div>

                {/* FAQ */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-white/80">FAQ</h3>
                    <button
                      onClick={() => setFaqItems(prev => [...prev, { q: "New question", a: "Answer..." }])}
                      className="flex items-center gap-2 bg-white/10 text-white text-xs font-bold px-3 py-2 rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add FAQ
                    </button>
                  </div>
                  {faqItems.map((item, idx) => (
                    <div key={idx} className="bg-[#16171f] border border-white/5 rounded-2xl p-4 space-y-2 relative">
                      <button onClick={() => setFaqItems(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/10 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <input value={item.q} onChange={e => { const next = [...faqItems]; next[idx] = { ...next[idx], q: e.target.value }; setFaqItems(next); }}
                        placeholder="Question" className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm pr-10 focus:border-[#8792FF] outline-none" />
                      <textarea value={item.a} onChange={e => { const next = [...faqItems]; next[idx] = { ...next[idx], a: e.target.value }; setFaqItems(next); }}
                        placeholder="Answer" rows={3} className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none resize-none" />
                    </div>
                  ))}
                </div>

                {/* NEWS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-white/80">Wallet News</h3>
                    <button
                      onClick={() => setNewsItems(prev => [...prev, { tag: "Update", title: "News title", body: "News body...", tagColor: "text-[#FFC914]" }])}
                      className="flex items-center gap-2 bg-white/10 text-white text-xs font-bold px-3 py-2 rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add News
                    </button>
                  </div>
                  {newsItems.map((item, idx) => (
                    <div key={idx} className="bg-[#16171f] border border-white/5 rounded-2xl p-4 space-y-2 relative">
                      <button onClick={() => setNewsItems(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/10 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="grid grid-cols-2 gap-2 pr-8">
                        <input value={item.tag} onChange={e => { const next = [...newsItems]; next[idx] = { ...next[idx], tag: e.target.value }; setNewsItems(next); }}
                          placeholder="Tag (e.g. Latest)" className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none" />
                        <input value={item.title} onChange={e => { const next = [...newsItems]; next[idx] = { ...next[idx], title: e.target.value }; setNewsItems(next); }}
                          placeholder="Title" className="bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none" />
                      </div>
                      <textarea value={item.body} onChange={e => { const next = [...newsItems]; next[idx] = { ...next[idx], body: e.target.value }; setNewsItems(next); }}
                        placeholder="Body" rows={3} className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-[#8792FF] outline-none resize-none" />
                    </div>
                  ))}
                </div>

                <button
                  onClick={async () => {
                    setContentMsg("");
                    try {
                      await setDoc(doc(db, "settings", "app_content"), {
                        faq: faqItems,
                        news: newsItems,
                        updatedAt: new Date().toISOString(),
                      }, { merge: true });
                      setContentMsg("FAQ & News saved — app will show updates.");
                    } catch (e: any) {
                      setContentMsg(e?.message || "Save failed");
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Save All Content
                </button>
                {contentMsg && <p className={`text-sm ${contentMsg.includes("failed") || contentMsg.includes("Failed") ? "text-red-400" : "text-emerald-400"}`}>{contentMsg}</p>}
              </motion.div>
            )}

            {/* SETTINGS */}
            {activeTab === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5 max-w-xl">
                <div>
                  <h2 className="text-2xl font-bold">Settings</h2>
                  <p className="text-white/40 text-sm">Bot, support & API verification tokens</p>
                </div>

                <div className="bg-[#16171f] border border-white/5 rounded-2xl p-6 space-y-5">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Public bot settings</h3>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Bot Username (referral links)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30">@</span>
                      <input value={botUsername} onChange={e => setBotUsername(e.target.value.replace("@", ""))}
                        className="flex-1 bg-[#0c0d12] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#8792FF] outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Min Transfer/Withdraw Amount</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" value={minTransferAmount} onChange={e => setMinTransferAmount(e.target.value)}
                        className="flex-1 bg-[#0c0d12] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#8792FF] outline-none" />
                      <span className="text-white/30 text-xs">UUSD</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Support Username</label>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30">@</span>
                      <input value={supportUsername} onChange={e => setSupportUsername(e.target.value.replace("@", ""))}
                        className="flex-1 bg-[#0c0d12] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#8792FF] outline-none" />
                    </div>
                    <p className="text-[11px] text-white/30 mt-1.5">Used when users tap “Contact Support”</p>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Maintenance Mode</h3>
                    <label className="flex items-center gap-2 cursor-pointer mb-4">
                      <input type="checkbox" checked={maintenanceMode} onChange={e => setMaintenanceMode(e.target.checked)} className="rounded border-white/10 bg-[#0c0d12] w-5 h-5 text-[#8792FF]" />
                      <span className="text-sm text-white/70">Enable Maintenance Mode (Blocks regular users)</span>
                    </label>
                    {maintenanceMode && (
                      <div>
                        <label className="text-xs text-white/50 mb-1.5 block">Twitter Link for Maintenance Screen</label>
                        <div className="flex items-center gap-2">
                          <input value={maintenanceTwitterLink} onChange={e => setMaintenanceTwitterLink(e.target.value)} placeholder="https://x.com/..." className="flex-1 bg-[#0c0d12] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#8792FF] outline-none" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#16171f] border border-[#8792FF]/20 rounded-2xl p-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-[#8792FF] uppercase tracking-wider">API Tokens (Verification)</h3>
                    <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                      Saved to Firebase <code className="text-white/50">settings/api_keys</code>. Cloud Functions read these to verify Telegram join & Twitter follow.
                      Do not share these tokens publicly.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Telegram Bot Token</label>
                    <input
                      type="password"
                      value={telegramBotToken}
                      onChange={e => setTelegramBotToken(e.target.value)}
                      placeholder="123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-[#8792FF] outline-none"
                      autoComplete="off"
                    />
                    <p className="text-[11px] text-white/30 mt-1.5">
                      BotFather → your bot → API Token. Add this bot as <strong className="text-white/50">Admin</strong> in the channel you verify.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Twitter / X Bearer Token</label>
                    <input
                      type="password"
                      value={twitterBearerToken}
                      onChange={e => setTwitterBearerToken(e.target.value)}
                      placeholder="AAAAAAAAAAAAAAAAAAAAxxxx..."
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-[#8792FF] outline-none"
                      autoComplete="off"
                    />
                    <p className="text-[11px] text-white/30 mt-1.5">
                      developer.x.com → Project → Keys and tokens → Bearer Token
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3 text-[11px] text-white/40 leading-relaxed">
                    <strong className="text-white/60">After saving:</strong> Deploy Cloud Functions (Blaze plan) so verification can call Telegram/Twitter APIs.
                    Until Functions are live, Verify will show a “service not configured” message for strict API tasks.
                  </div>
                </div>

                <button onClick={handleSaveSettings}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4" /> Save All Settings
                </button>
                {apiSaveMsg && (
                  <p className={`text-sm ${apiSaveMsg.includes("Failed") ? "text-red-400" : "text-emerald-400"}`}>{apiSaveMsg}</p>
                )}

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-sm text-amber-200/80">
                  <strong>Security:</strong> Admin password is <code className="bg-black/30 px-1 rounded">uusdadmin2026</code>.
                  Lock Firestore rules so only admins can read <code className="bg-black/30 px-1 rounded">settings/api_keys</code> before production.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
