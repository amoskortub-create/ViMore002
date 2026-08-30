
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { 
  ShieldCheck, 
  Zap, 
  Activity, 
  Users, 
  BarChart3, 
  Rocket, 
  Coins, 
  Gem, 
  Star,
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  TrendingUp,
  Globe,
  Settings,
  MoreVertical,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  Eye,
  Trash2,
  Search,
  CircleDashed,
  ShieldAlert,
  Flag,
  Ban,
  MessageCircle,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  ImageIcon,
  X,
  Smartphone,
  Building2,
  Check,
  Send,
  Loader2,
  FileText,
  Lock,
  Music2,
  Clapperboard,
  LayoutDashboard,
  EyeOff,
  Unplug,
  Sparkles,
  Trophy,
  ArrowRight,
  Mic2,
  ListMusic,
  Hammer,
  RotateCcw,
  Bell,
  Download,
  Megaphone,
  Palette,
  Video,
  ExternalLink,
  Plus,
  Shield,
  UserCheck,
  UserCheck as UserVerifyIcon,
  UserMinus,
  KeyRound,
  RefreshCcw,
  LayoutGrid,
  Upload,
  Film,
  ArrowLeft,
  MousePointerClick,
  CalendarClock,
  UserX,
  AlertOctagon,
  BellRing,
  Filter,
  Target,
  Timer,
  Siren,
  BookOpen,
  SendHorizonal,
  MailCheck,
  ChevronDown,
  Info,
  GanttChart,
  Undo2,
  Share2,
  Medal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { usePosts } from "@/context/PostContext";
import { useNotifications } from "@/context/NotificationContext";
import { useAdminAlerts } from "@/context/AdminAlertsContext";
import { useMusic } from "@/context/MusicContext";
import { useTranslation } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { BUCKET, toProxyUrl, getFileUrl, databases, DATABASE_ID, COL, Query } from "@/lib/appwrite";
import Link from "next/link";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useToast } from "@/hooks/use-toast";
import { calculatePlatformFee } from "@/lib/transaction-fee";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminTicketTab } from "@/components/tickets/AdminTicketTab";
import { AdminCheckTicketTab } from "@/components/tickets/AdminCheckTicketTab";
import { SecurityEventsTab } from "@/components/admin/SecurityEventsTab";

type AdminTab = "economy" | "safety" | "campaigns" | "resolution" | "logs" | "staff" | "users" | "broadcast" | "tickets" | "check_ticket" | "treasury" | "referrals" | "knowledge" | "sync" | "verifications" | "security" | "active_users" | "cleanup";

interface TreasurySnapshot {
  totalUsers: number;
  totalGold: number;
  totalDiamond: number;
  totalStar: number;
  goldUSD: number;
  diamondUSD: number;
  totalUSD: number;
  totalLRD: number;
  platformFeesUSD: number;
  platformFeesLRD: number;
  topHolders: { username: string; gold: number; diamond: number; usd: number }[];
  snapshotTime: Date;
}
type EconomySubTab = "outbound" | "inbound";

export default function AdminDashboard() {
  const { withdrawalHistory, paymentRequests, reports, tickets, processWithdrawal, approvePaymentRequest, rejectPaymentRequest, triggerHaptic, posts, settings, updateSettings, auditLogs, addAuditLog, adStats, intelligenceMetrics, connections, campaigns, currentUser, staff, promoteUser, demoteUser, refreshAdminData, addCampaign, deleteCampaign, toggleCampaignStatus, updateUserIdentity, handleReportAction, handleTicketAction, replyToTicket, submitTicket, uploadMedia, isLoading, allUsers, refreshAllUsers, banUser, suspendUser, warnUser, sendAdminBroadcast, broadcastHistory, adminDeleteProduct } = usePosts();
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    economyAlerts,
    openTickets: realtimeOpenTickets,
    resetEconomyBadge,
    resetTicketsBadge,
  } = useAdminAlerts();

  const AdminAlertBadge = ({ count }: { count: number }) => {
    if (!count || count <= 0) return null;
    return (
      <div className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-destructive text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-destructive/30 animate-in zoom-in duration-300 border border-background">
        {count > 99 ? '99+' : count}
      </div>
    );
  };
  
  const userRole = currentUser?.role || 'USER';
  const isSuper = userRole === 'SUPER';
  const isFinancial = userRole === 'FINANCIAL';
  const isModerator = userRole === 'MODERATOR';

  // Declared here (before isUnauthorized) so the derived value can read them
  const [serverRoleChecked, setServerRoleChecked] = useState(false);
  const [serverAuthorized, setServerAuthorized] = useState<boolean | null>(null);

  // Command Core dedicated login state
  const [ccIdentifier, setCcIdentifier] = useState("");
  const [ccPassword, setCcPassword] = useState("");
  const [ccShowPassword, setCcShowPassword] = useState(false);
  const [ccLoading, setCcLoading] = useState(false);
  const [ccError, setCcError] = useState<string | null>(null);
  const [ccDenied, setCcDenied] = useState(false);

  // Use server-confirmed role once available; fall back to client role while checking
  const isUnauthorized = serverRoleChecked ? serverAuthorized === false : userRole === 'USER';

  const [activeTab, setActiveTab] = useState<AdminTab>("economy");
  const [economySubTab, setEconomySubTab] = useState<EconomySubTab>("outbound");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const hasLoggedBreach = useRef(false);

  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');

  const [banTarget, setBanTarget] = useState<any | null>(null);
  const [banReason, setBanReason] = useState("Violation of Community Guidelines");
  const [banNote, setBanNote] = useState("");
  const [banConfirmText, setBanConfirmText] = useState("");
  const [isBanning, setIsBanning] = useState(false);

  const [suspendTarget, setSuspendTarget] = useState<any | null>(null);
  const [suspendDays, setSuspendDays] = useState(7);
  const [suspendReason, setSuspendReason] = useState("Repeated Policy Violations");
  const [suspendMessage, setSuspendMessage] = useState("");
  const [isSuspending, setIsSuspending] = useState(false);

  const [warnTarget, setWarnTarget] = useState<any | null>(null);
  const [warnMessage, setWarnMessage] = useState("");
  const [warnSeverity, setWarnSeverity] = useState<'SOFT' | 'FINAL'>('SOFT');
  const [isWarning, setIsWarning] = useState(false);

  const [broadcastMode, setBroadcastMode] = useState<'all' | 'targeted'>('all');
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastActionUrl, setBroadcastActionUrl] = useState("");
  const [broadcastTargetSearch, setBroadcastTargetSearch] = useState("");
  const [broadcastTargetIds, setBroadcastTargetIds] = useState<string[]>([]);
  const [broadcastFollowerMin, setBroadcastFollowerMin] = useState(0);
  const [broadcastFollowerMax, setBroadcastFollowerMax] = useState(9999999);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});

  const [treasurySnapshot, setTreasurySnapshot] = useState<TreasurySnapshot | null>(null);
  const [isFetchingTreasury, setIsFetchingTreasury] = useState(false);
  const [treasuryCountdown, setTreasuryCountdown] = useState(3600);

  const [referralLeaders, setReferralLeaders] = useState<any[]>([]);
  const [isFetchingReferrals, setIsFetchingReferrals] = useState(false);
  const [recentReferralActivity, setRecentReferralActivity] = useState<any[]>([]);
  const [totalReferralCount, setTotalReferralCount] = useState(0);

  const [knowledgeEntries, setKnowledgeEntries] = useState<any[]>([]);
  const [knowledgeTotal, setKnowledgeTotal] = useState(0);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [knowledgeCategoryFilter, setKnowledgeCategoryFilter] = useState('all');
  const [knowledgePage, setKnowledgePage] = useState(0);
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState<string | null>(null);
  const [expandedKnowledgeId, setExpandedKnowledgeId] = useState<string | null>(null);

  // Verifications tab state
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(false);
  const [verificationActionId, setVerificationActionId] = useState<string | null>(null);
  const [verificationRejectReason, setVerificationRejectReason] = useState('');
  const [verificationRejectTarget, setVerificationRejectTarget] = useState<any | null>(null);
  const [isProcessingVerification, setIsProcessingVerification] = useState(false);

  // Cleanup tab state (Super + Moderator)
  const [cleanupResult, setCleanupResult] = useState<{ postBoosts: number; trackBoosts: number; verifications: number; campaigns: number } | null>(null);
  const [alertResult, setAlertResult] = useState<{ posts: number; tracks: number; users: number } | null>(null);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [isRunningAlerts, setIsRunningAlerts] = useState(false);
  const [cleanupLastRun, setCleanupLastRun] = useState<Date | null>(null);

  // Active Users tab state (SUPER admin only)
  const [activeUsersData, setActiveUsersData] = useState<{
    dau: number; mau: number; totalTracked: number;
    userList: { user_id: string; username: string; ip_address: string; last_seen: string; user_agent: string }[];
    dailyChart: { date: string; count: number }[];
  } | null>(null);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [activeUsersIpSearch, setActiveUsersIpSearch] = useState("");

  // Sync tool state (SUPER admin only)
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [syncResults, setSyncResults] = useState<{ updated: number; skipped: number; errors: number } | null>(null);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  // Withdrawal action dialogs
  const [withdrawalActionTarget, setWithdrawalActionTarget] = useState<{ id: string; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [withdrawalAdminMessage, setWithdrawalAdminMessage] = useState("");
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);
  const [withdrawalProofFile, setWithdrawalProofFile] = useState<File | null>(null);
  const [withdrawalProofPreview, setWithdrawalProofPreview] = useState<string | null>(null);

  // Payment action dialogs
  const [paymentActionTarget, setPaymentActionTarget] = useState<{ id: string; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [paymentRejectReason, setPaymentRejectReason] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [broadcastSent, setBroadcastSent] = useState<number | null>(null);

  // Campaign Form State
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignSubTab, setCampaignSubTab] = useState<'story' | 'download' | 'music' | 'feed' | 'reel'>('story');
  const [campForm, setCampForm] = useState({
    title: "",
    content: "",
    type: "photo" as "photo" | "video" | "audio",
    actionUrl: "",
    actionLabel: "Learn More",
    placement: "story" as "story" | "download" | "music" | "feed" | "reel",
    budget: 0,
    endDate: "",
    endTime: "",
  });
  const [campFile, setCampFile] = useState<File | null>(null);
  const [campPreview, setCampPreview] = useState<string | null>(null);
  const campInputRef = useRef<HTMLInputElement>(null);

  const [aiShieldCount, setAiShieldCount] = useState<number>(0);

  useEffect(() => {
    if (isUnauthorized) return;
    const fetchShieldCount = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COL.ADMIN_REPORTS, [
          Query.equal('status', 'open'),
          Query.limit(1),
        ]);
        setAiShieldCount(res.total);
      } catch { /* non-critical */ }
    };
    fetchShieldCount();
    const interval = setInterval(fetchShieldCount, 30000);
    return () => clearInterval(interval);
  }, [isUnauthorized]);

  useEffect(() => {
    if (isUnauthorized && !hasLoggedBreach.current && currentUser?.username) {
      addAuditLog("UNAUTHORIZED_CORE_ACCESS_ATTEMPT", `Standard user node @${currentUser.username} attempted to synchronize with the Command Core.`);
      hasLoggedBreach.current = true;
    }
    
    if (!isUnauthorized) {
      refreshAdminData();
      const interval = setInterval(() => {
        refreshAdminData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isUnauthorized, refreshAdminData, addAuditLog, currentUser?.username]);

  useEffect(() => {
    if ((activeTab === 'users' || activeTab === 'broadcast') && !isUnauthorized) {
      refreshAllUsers();
      const interval = setInterval(() => {
        refreshAllUsers();
      }, 20000);
      return () => clearInterval(interval);
    }
  }, [activeTab, isUnauthorized, refreshAllUsers]);

  const handleBanUser = async () => {
    if (!banTarget || banConfirmText !== 'CONFIRM BAN') return;
    if (banTarget.$id === firstUserId) { toast({ variant: "destructive", title: "Action Blocked", description: "This user is permanently protected." }); return; }
    setIsBanning(true);
    try {
      await banUser(banTarget.$id, banReason, banNote);
      await addAuditLog('USER_BANNED', `@${banTarget.username} permanently banned. Reason: ${banReason}${banNote ? ` | Note: ${banNote}` : ''}`);
      toast({ title: "Account Terminated", description: `@${banTarget.username} has been banned from ViMore.` });
      setBanTarget(null); setBanReason("Violation of Community Guidelines"); setBanNote(""); setBanConfirmText("");
    } catch { toast({ variant: "destructive", title: "Ban failed" }); }
    finally { setIsBanning(false); }
  };

  const handleSuspendUser = async () => {
    if (!suspendTarget || !suspendMessage.trim()) return;
    if (suspendTarget.$id === firstUserId) { toast({ variant: "destructive", title: "Action Blocked", description: "This user is permanently protected." }); return; }
    setIsSuspending(true);
    try {
      await suspendUser(suspendTarget.$id, suspendDays, suspendReason, suspendMessage);
      await addAuditLog('USER_SUSPENDED', `@${suspendTarget.username} suspended for ${suspendDays} day(s). Reason: ${suspendReason}`);
      toast({ title: "Account Suspended", description: `@${suspendTarget.username} suspended for ${suspendDays} day(s).` });
      setSuspendTarget(null); setSuspendDays(7); setSuspendReason("Repeated Policy Violations"); setSuspendMessage("");
    } catch { toast({ variant: "destructive", title: "Suspension failed" }); }
    finally { setIsSuspending(false); }
  };

  const handleWarnUser = async () => {
    if (!warnTarget || !warnMessage.trim()) return;
    setIsWarning(true);
    try {
      await warnUser(warnTarget.$id, warnMessage, warnSeverity);
      await addAuditLog('USER_WARNED', `@${warnTarget.username} issued a ${warnSeverity} warning.`);
      toast({ title: "Warning Issued", description: `@${warnTarget.username} has been notified.` });
      setWarnTarget(null); setWarnMessage(""); setWarnSeverity('SOFT');
    } catch { toast({ variant: "destructive", title: "Warning failed" }); }
    finally { setIsWarning(false); }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setIsBroadcasting(true);
    setBroadcastSent(null);
    try {
      let targetIds: string[] | 'all' = 'all';
      if (broadcastMode === 'targeted') {
        if (broadcastTargetIds.length > 0) {
          targetIds = broadcastTargetIds;
        } else {
          targetIds = allUsers
            .filter(u => {
              const followers = typeof u.followers === 'number' ? u.followers : parseInt(String(u.followers || '0'));
              return followers >= broadcastFollowerMin && followers <= broadcastFollowerMax;
            })
            .map(u => u.$id);
        }
      }
      const count = await sendAdminBroadcast({ title: broadcastTitle, message: broadcastMessage, actionUrl: broadcastActionUrl || undefined, targetUserIds: targetIds });
      await addAuditLog('BROADCAST_SENT', `Admin broadcast "${broadcastTitle}" sent to ${count} user(s).`);
      setBroadcastSent(count);
      toast({ title: "Broadcast Sent", description: `Notification delivered to ${count} user(s).` });
      setBroadcastTitle(""); setBroadcastMessage(""); setBroadcastActionUrl(""); setBroadcastTargetIds([]); setBroadcastTargetSearch("");
    } catch (err: any) { toast({ variant: "destructive", title: "Broadcast failed", description: err?.message || "Could not send the broadcast. Please try again." }); }
    finally { setIsBroadcasting(false); }
  };

  const pendingWithdrawals = useMemo(() => 
    withdrawalHistory.filter(w => w.status === 'PENDING'), 
    [withdrawalHistory]
  );

  const pendingPayments = useMemo(() => 
    paymentRequests.filter(p => p.status === 'PENDING'), 
    [paymentRequests]
  );

  const userMap = useMemo(() => {
    const map: Record<string, typeof allUsers[0]> = {};
    for (const u of allUsers) { if (u.username) map[u.username] = u; }
    return map;
  }, [allUsers]);

  const availableTabs = useMemo(() => {
    if (isSuper) return ["economy", "treasury", "referrals", "safety", "users", "broadcast", "campaigns", "tickets", "check_ticket", "resolution", "verifications", "logs", "staff", "knowledge", "active_users", "cleanup", "sync", "security"] as AdminTab[];
    const tabs: AdminTab[] = ["logs"];
    if (isFinancial) tabs.push("economy", "treasury");
    if (isModerator) tabs.push("safety", "users", "campaigns", "resolution", "tickets", "check_ticket", "security", "cleanup");
    return tabs;
  }, [isSuper, isFinancial, isModerator]);

  const stats = useMemo(() => ({
    totalNodes: connections.length,
    totalSignatures: posts.length,
    totalEnergy: connections.reduce((acc, c) => acc + (c.goldBalance || 0), 0),
    auditEntries: auditLogs.length
  }), [posts, connections, auditLogs]);

  // The first user ever created is permanently protected — their SUPER role can never be removed
  const firstUserId = useMemo(() => {
    const allUsers = [currentUser, ...connections].filter(Boolean) as any[];
    allUsers.sort((a, b) =>
      new Date(a.joinDate || a.$createdAt || 0).getTime() -
      new Date(b.joinDate || b.$createdAt || 0).getTime()
    );
    return allUsers[0]?.$id ?? null;
  }, [currentUser, connections]);


  const handleOpenWithdrawalDialog = (id: string, action: 'APPROVED' | 'REJECTED') => {
    setWithdrawalAdminMessage("");
    setWithdrawalProofFile(null);
    setWithdrawalProofPreview(null);
    setWithdrawalActionTarget({ id, action });
  };

  const handleConfirmWithdrawal = async () => {
    if (!withdrawalActionTarget) return;
    setIsProcessingWithdrawal(true);
    triggerHaptic(withdrawalActionTarget.action === 'APPROVED' ? 50 : 100);
    try {
      let proofImageUrl: string | undefined;
      if (withdrawalActionTarget.action === 'APPROVED' && withdrawalProofFile) {
        const { uploadViaClient } = await import('@/lib/upload');
        const uploadedFileId = await uploadViaClient(withdrawalProofFile, BUCKET.PAYMENT_SCREENSHOTS);
        proofImageUrl = toProxyUrl(getFileUrl(BUCKET.PAYMENT_SCREENSHOTS, uploadedFileId));
      }
      await processWithdrawal(withdrawalActionTarget.id, withdrawalActionTarget.action, withdrawalAdminMessage || undefined, proofImageUrl);
      toast({ title: withdrawalActionTarget.action === 'APPROVED' ? "Withdrawal Approved" : "Withdrawal Rejected" });
    } catch {
      toast({ variant: 'destructive', title: 'Action Failed', description: 'Could not process withdrawal.' });
    } finally {
      setIsProcessingWithdrawal(false);
      setWithdrawalActionTarget(null);
      setWithdrawalProofFile(null);
      setWithdrawalProofPreview(null);
    }
  };

  const handleOpenPaymentDialog = (id: string, action: 'APPROVED' | 'REJECTED') => {
    setPaymentRejectReason("");
    setPaymentActionTarget({ id, action });
  };

  const handleConfirmPayment = async () => {
    if (!paymentActionTarget) return;
    setIsProcessingPayment(true);
    triggerHaptic(paymentActionTarget.action === 'APPROVED' ? 50 : 100);
    try {
      if (paymentActionTarget.action === 'APPROVED') {
        await approvePaymentRequest(paymentActionTarget.id);
      } else {
        await rejectPaymentRequest(paymentActionTarget.id);
      }
      toast({ title: paymentActionTarget.action === 'APPROVED' ? "Payment Approved" : "Payment Rejected" });
    } catch {
      toast({ variant: 'destructive', title: 'Action Failed', description: 'Could not process payment.' });
    } finally {
      setIsProcessingPayment(false);
      setPaymentActionTarget(null);
    }
  };


  const handleCampaignMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCampFile(file);
      if (file.type.startsWith('audio/')) {
        setCampPreview(null);
        setCampForm(prev => ({ ...prev, type: 'audio' }));
      } else if (file.type.startsWith('video/')) {
        setCampPreview(URL.createObjectURL(file));
        setCampForm(prev => ({ ...prev, type: 'video' }));
      } else {
        setCampPreview(URL.createObjectURL(file));
        setCampForm(prev => ({ ...prev, type: 'photo' }));
      }
    }
  };

  const handleLaunchCampaign = async () => {
    if (!campForm.title || !campForm.content || !campFile) return;
    setIsCreatingCampaign(true);
    triggerHaptic(50);
    try {
      const mediaUrl = await uploadMedia(campFile);
      let endDateIso: string | null = null;
      if (campForm.endDate) {
        const timeStr = campForm.endTime || "23:59";
        endDateIso = new Date(`${campForm.endDate}T${timeStr}:00`).toISOString();
      }
      await addCampaign({ ...campForm, mediaUrl, placement: campaignSubTab, endDate: endDateIso });
      toast({ title: "Campaign Created", description: "Your ad campaign is now live." });
      setCampForm({ title: "", content: "", type: campaignSubTab === 'music' ? 'audio' : campaignSubTab === 'reel' ? 'video' : 'photo', actionUrl: "", actionLabel: "Learn More", placement: campaignSubTab, budget: 0, endDate: "", endTime: "" });
      setCampFile(null);
      setCampPreview(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleCampaignSubTabChange = (tab: 'story' | 'download' | 'music' | 'feed' | 'reel') => {
    setCampaignSubTab(tab);
    setCampForm({ title: "", content: "", type: tab === 'music' ? 'audio' : tab === 'reel' ? 'video' : 'photo', actionUrl: "", actionLabel: "Learn More", placement: tab, budget: 0, endDate: "", endTime: "" });
    setCampFile(null);
    setCampPreview(null);
  };

  // Auto-expire campaigns that have passed their end date
  // Field stored in Appwrite is `expires_at` (not `end_date`)
  useEffect(() => {
    const checkExpiry = () => {
      const now = new Date();
      campaigns.forEach((c: any) => {
        const expiryField = c.expires_at || c.end_date;
        if (c.is_active && expiryField) {
          const endDate = new Date(expiryField);
          if (endDate <= now) {
            toggleCampaignStatus(c.$id);
          }
        }
      });
    };
    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, [campaigns, toggleCampaignStatus]);

  const fetchTreasuryData = async () => {
    setIsFetchingTreasury(true);
    try {
      // Paginate through all users
      let fetched: any[] = [];
      let offset = 0;
      const PAGE = 100;
      while (true) {
        const res = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.limit(PAGE), Query.offset(offset)]);
        fetched = [...fetched, ...res.documents];
        if (res.documents.length < PAGE) break;
        offset += PAGE;
      }

      let totalGold = 0, totalDiamond = 0, totalStar = 0;
      fetched.forEach(u => {
        totalGold += u.gold_balance || 0;
        totalDiamond += u.diamond_balance || 0;
        totalStar += u.star_balance || 0;
      });

      const GOLD_RATE = 0.01;
      const DIAMOND_RATE = 0.25;
      const LD_MULTIPLIER = 190;
      const goldUSD = totalGold * GOLD_RATE;
      const diamondUSD = totalDiamond * DIAMOND_RATE;
      const totalUSD = goldUSD + diamondUSD;
      const totalLRD = totalUSD * LD_MULTIPLIER;

      // Calculate platform fees from transactions (10% of all sender-side tx amounts)
      let pfGold = 0, pfDiamond = 0;
      try {
        const txRes = await databases.listDocuments(DATABASE_ID, COL.TRANSACTIONS, [
          Query.orderDesc('$createdAt'), Query.limit(500),
        ]);
        txRes.documents.forEach((tx: any) => {
          const senderTypes = ['GIFT_SENT', 'POST_UNLOCK', 'SUBSCRIPTION'];
          if (!senderTypes.includes(tx.type)) return;
          const cut = calculatePlatformFee(Number(tx.amount || 0));
          if (tx.currency === 'GOLD') pfGold += cut;
          else if (tx.currency === 'DIAMOND') pfDiamond += cut;
        });
      } catch { /* ignore */ }

      const platformFeesUSD = pfGold * GOLD_RATE + pfDiamond * DIAMOND_RATE;
      const platformFeesLRD = platformFeesUSD * LD_MULTIPLIER;

      const topHolders = fetched
        .map(u => ({
          username: u.username || 'unknown',
          gold: u.gold_balance || 0,
          diamond: u.diamond_balance || 0,
          usd: (u.gold_balance || 0) * GOLD_RATE + (u.diamond_balance || 0) * DIAMOND_RATE,
        }))
        .sort((a, b) => b.usd - a.usd)
        .slice(0, 20);

      setTreasurySnapshot({
        totalUsers: fetched.length,
        totalGold,
        totalDiamond,
        totalStar,
        goldUSD,
        diamondUSD,
        totalUSD,
        totalLRD,
        platformFeesUSD,
        platformFeesLRD,
        topHolders,
        snapshotTime: new Date(),
      });
      setTreasuryCountdown(3600);
    } catch { /* ignore */ }
    finally { setIsFetchingTreasury(false); }
  };

  useEffect(() => {
    if (activeTab !== 'treasury') return;
    fetchTreasuryData();
    // Countdown timer — tick every second, refetch at 0
    const ticker = setInterval(() => {
      setTreasuryCountdown(prev => {
        if (prev <= 1) {
          fetchTreasuryData();
          return 3600;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'referrals') return;
    setIsFetchingReferrals(true);
    Promise.allSettled([
      databases.listDocuments(DATABASE_ID, COL.USERS, [
        Query.orderDesc('referral_count'),
        Query.limit(20),
      ]),
      databases.listDocuments(DATABASE_ID, COL.NOTIFICATIONS, [
        Query.equal('title', 'Referral Bonus!'),
        Query.orderDesc('$createdAt'),
        Query.limit(30),
      ]),
    ]).then(([leadersRes, activityRes]) => {
      if (leadersRes.status === 'fulfilled') {
        const leaders = leadersRes.value.documents.filter((u: any) => (u.referral_count || 0) > 0);
        setReferralLeaders(leaders);
        setTotalReferralCount(leaders.reduce((s: number, u: any) => s + (u.referral_count || 0), 0));
      }
      if (activityRes.status === 'fulfilled') {
        setRecentReferralActivity(activityRes.value.documents);
      }
    }).catch(() => {}).finally(() => setIsFetchingReferrals(false));
  }, [activeTab]);

  const fetchKnowledgeEntries = async (page = 0) => {
    setIsLoadingKnowledge(true);
    try {
      const res = await authFetch(`/api/knowledge-admin?limit=50&offset=${page * 50}`);
      if (!res.ok) return;
      const data = await res.json();
      setKnowledgeEntries(data.documents || []);
      setKnowledgeTotal(data.total || 0);
      setKnowledgePage(page);
    } catch { /* silent */ }
    finally { setIsLoadingKnowledge(false); }
  };

  const deleteKnowledgeEntry = async (id: string) => {
    setDeletingKnowledgeId(id);
    try {
      const res = await authFetch(`/api/knowledge-admin?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKnowledgeEntries(prev => prev.filter(e => e.$id !== id));
        setKnowledgeTotal(prev => Math.max(0, prev - 1));
        toast({ title: 'Entry deleted', description: 'Knowledge bank entry removed.' });
      }
    } catch { toast({ variant: 'destructive', title: 'Delete failed' }); }
    finally { setDeletingKnowledgeId(null); }
  };

  useEffect(() => {
    if (activeTab !== 'knowledge') return;
    fetchKnowledgeEntries(0);
  }, [activeTab]);

  // Server-side admin role verification — prevent client-side bypass
  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const res = await authFetch('/api/admin/check');
        const data = await res.json().catch(() => ({ authorized: false }));
        setServerAuthorized(data.authorized === true);
      } catch {
        setServerAuthorized(false);
      } finally {
        setServerRoleChecked(true);
      }
    };
    checkAdminRole();
  }, []);

  // Load active users data when on active_users tab
  useEffect(() => {
    if (activeTab !== 'active_users' || !isSuper) return;
    const load = async () => {
      setActiveUsersLoading(true);
      try {
        const res = await authFetch('/api/admin/active-users');
        if (res.ok) {
          const data = await res.json();
          setActiveUsersData(data);
        }
      } catch { /* ignore */ } finally {
        setActiveUsersLoading(false);
      }
    };
    load();
  }, [activeTab, isSuper]);

  // Load pending verifications when on verifications tab
  useEffect(() => {
    if (activeTab !== 'verifications') return;
    const loadVerifications = async () => {
      setIsLoadingVerifications(true);
      try {
        const res = await authFetch('/api/admin/verifications');
        if (res.ok) {
          const data = await res.json();
          setPendingVerifications(data.records ?? []);
        }
      } catch { /* ignore */ } finally {
        setIsLoadingVerifications(false);
      }
    };
    loadVerifications();
  }, [activeTab]);

  const handleApproveVerification = async (recordId: string) => {
    setVerificationActionId(recordId);
    setIsProcessingVerification(true);
    try {
      const res = await authFetch('/api/admin/verify-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Approval failed');
      toast({ title: 'Verification Approved ✅', description: 'User has been granted verified status.' });
      setPendingVerifications(prev => prev.filter(r => r.$id !== recordId));
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Approval Failed', description: e?.message });
    } finally {
      setIsProcessingVerification(false);
      setVerificationActionId(null);
    }
  };

  const handleRejectVerification = async () => {
    if (!verificationRejectTarget) return;
    setIsProcessingVerification(true);
    try {
      const res = await authFetch('/api/admin/verify-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: verificationRejectTarget.$id, reason: verificationRejectReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Rejection failed');
      toast({ title: 'Verification Rejected', description: 'Fee has been refunded to the user.' });
      setPendingVerifications(prev => prev.filter(r => r.$id !== verificationRejectTarget.$id));
      setVerificationRejectTarget(null);
      setVerificationRejectReason('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Rejection Failed', description: e?.message });
    } finally {
      setIsProcessingVerification(false);
    }
  };

  const runCountSync = async () => {
    if (!isSuper || isSyncing) return;
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncTotal(0);
    setSyncResults(null);
    setSyncLog([]);

    let updated = 0, skipped = 0, errors = 0;
    const log: string[] = [];

    try {
      // Page through ALL users
      let offset = 0;
      const pageSize = 100;
      let allUsers: any[] = [];
      while (true) {
        const res = await databases.listDocuments(DATABASE_ID, COL.USERS, [
          Query.limit(pageSize),
          Query.offset(offset),
        ]);
        allUsers = allUsers.concat(res.documents);
        if (res.documents.length < pageSize) break;
        offset += pageSize;
      }
      setSyncTotal(allUsers.length);

      for (let i = 0; i < allUsers.length; i++) {
        const u = allUsers[i];
        setSyncProgress(i + 1);
        try {
          const [followersRes, followingRes, postsRes] = await Promise.allSettled([
            databases.listDocuments(DATABASE_ID, COL.FOLLOWS, [Query.equal('following_id', u.$id), Query.limit(1)]),
            databases.listDocuments(DATABASE_ID, COL.FOLLOWS, [Query.equal('follower_id', u.$id), Query.limit(1)]),
            databases.listDocuments(DATABASE_ID, COL.POSTS, [Query.equal('user_id', u.$id), Query.limit(1)]),
          ]);

          const realFollowers = followersRes.status === 'fulfilled' ? followersRes.value.total : null;
          const realFollowing = followingRes.status === 'fulfilled' ? followingRes.value.total : null;
          const realPosts = postsRes.status === 'fulfilled' ? postsRes.value.total : null;

          const storedFollowers = u.followers_count ?? 0;
          const storedFollowing = u.following_count ?? 0;
          const storedPosts = u.posts_count ?? 0;

          const needsUpdate =
            (realFollowers !== null && realFollowers !== storedFollowers) ||
            (realFollowing !== null && realFollowing !== storedFollowing) ||
            (realPosts !== null && realPosts !== storedPosts);

          if (needsUpdate) {
            const patch: Record<string, number> = {};
            if (realFollowers !== null) patch.followers_count = realFollowers;
            if (realFollowing !== null) patch.following_count = realFollowing;
            if (realPosts !== null) patch.posts_count = realPosts;
            await databases.updateDocument(DATABASE_ID, COL.USERS, u.$id, patch);
            log.push(`✓ @${u.username || u.$id}: followers ${storedFollowers}→${realFollowers ?? '?'}, following ${storedFollowing}→${realFollowing ?? '?'}, posts ${storedPosts}→${realPosts ?? '?'}`);
            updated++;
          } else {
            skipped++;
          }
        } catch (e: any) {
          log.push(`✗ @${u.username || u.$id}: ${e.message || 'unknown error'}`);
          errors++;
        }

        // Throttle to avoid rate limits
        if ((i + 1) % 10 === 0) {
          setSyncLog([...log]);
          await new Promise(r => setTimeout(r, 200));
        }
      }

      setSyncResults({ updated, skipped, errors });
      setSyncLog([...log]);
      toast({ title: 'Sync Complete', description: `${updated} updated · ${skipped} already correct · ${errors} errors` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: e.message });
    } finally {
      setIsSyncing(false);
    }
  };


  // Show a brief checking state only while the server role check is in flight
  if (!serverRoleChecked && isUnauthorized) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 animate-pulse">Checking Authorization...</p>
      </div>
    );
  }

  const QrCode2 = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/>
      <path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
    </svg>
  );

  const TABS_DATA = {
    economy: { label: "Economy", icon: Coins },
    treasury: { label: "Treasury", icon: BarChart3 },
    referrals: { label: "Referrals", icon: Share2 },
    safety: { label: "Safety", icon: ShieldAlert },
    users: { label: "Users", icon: GanttChart },
    broadcast: { label: "Broadcast", icon: BellRing },
    campaigns: { label: "Campaigns", icon: Megaphone },
    tickets: { label: "Tickets", icon: CalendarClock },
    check_ticket: { label: "Check Ticket", icon: QrCode2 },
    resolution: { label: "Resol", icon: Hammer },
    logs: { label: "Logs", icon: FileText },
    staff: { label: "Staff", icon: Users },
    knowledge: { label: "Knowledge", icon: BookOpen },
    sync: { label: "Sync", icon: RefreshCcw },
    verifications: { label: "Verifications", icon: UserVerifyIcon },
    security: { label: "Security", icon: ShieldAlert },
    active_users: { label: "Active Users", icon: Activity },
    cleanup: { label: "Cleanup", icon: RotateCcw },
  };

  const handleCcLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccIdentifier.trim() || !ccPassword.trim()) return;
    setCcLoading(true);
    setCcError(null);
    setCcDenied(false);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: ccIdentifier.trim(), password: ccPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCcError(data.error || 'Authentication failed.');
        return;
      }
      if (!data.authorized) {
        setCcDenied(true);
        if (data.session && currentUser?.username) {
          addAuditLog("UNAUTHORIZED_CORE_ACCESS_ATTEMPT", `Node @${ccIdentifier} attempted Command Core synchronization without sufficient authority.`);
        }
        return;
      }
      // Store the session so authFetch can use it
      if (data.session) {
        try {
          const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
          localStorage.setItem(`a_session_${PROJECT_ID}`, JSON.stringify({ secret: data.session }));
          localStorage.setItem('vimore_cc_session', data.session);
        } catch { /* ignore */ }
      }
      // Grant access directly
      setServerAuthorized(true);
      setServerRoleChecked(true);
    } catch {
      setCcError('Connection to Command Core failed. Retry.');
    } finally {
      setCcLoading(false);
    }
  };

  if (isUnauthorized) {
    if (ccDenied) {
      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center space-y-8 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-destructive/20 blur-[150px] rounded-full animate-pulse" />
          </div>
          <div className="relative">
            <div className="absolute -inset-8 bg-destructive/10 rounded-full blur-2xl animate-ping opacity-40" />
            <div className="h-24 w-24 bg-destructive/10 rounded-3xl flex items-center justify-center text-destructive relative z-10 border border-destructive/20 shadow-2xl">
              <ShieldAlert className="h-12 w-12" />
            </div>
          </div>
          <div className="space-y-3 relative z-10">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Handshake Denied</h1>
            <div className="flex flex-col items-center gap-2">
              <p className="text-muted-foreground text-sm max-w-xs uppercase font-bold tracking-widest leading-relaxed">
                Insufficient spatial authority to synchronize with the MTL Command Core.
              </p>
              <Badge variant="outline" className="border-destructive/20 text-destructive text-[8px] font-black uppercase px-2 h-5">BREACH ATTEMPT LOGGED</Badge>
            </div>
          </div>
          <div className="flex gap-3 relative z-10">
            <Button onClick={() => { setCcDenied(false); setCcError(null); setCcIdentifier(""); setCcPassword(""); }} variant="outline" className="rounded-2xl border-white/10 text-white font-black uppercase italic text-[10px] tracking-[0.3em] h-12 px-8 transition-all hover:bg-white/10 active:scale-95">
              Try Again
            </Button>
            <Link href="/">
              <Button variant="outline" className="rounded-2xl border-white/10 text-white font-black uppercase italic text-[10px] tracking-[0.3em] h-12 px-8 transition-all hover:bg-white hover:text-black active:scale-95">
                Return to Network
              </Button>
            </Link>
          </div>
          <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em] pt-12">ViMore Sentry v1.5 • Command Core Active</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-primary/3 blur-[100px] rounded-full animate-pulse delay-1000" />
        </div>
        <div className="relative z-10 w-full max-w-sm space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary border border-primary/20 shadow-2xl shadow-primary/10">
                <ShieldCheck className="h-10 w-10" />
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-1">MTL Network</p>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">Command Core</h1>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-2">Restricted Access — Admin Only</p>
            </div>
          </div>

          <form onSubmit={handleCcLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">ViMore ID or Phone</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  value={ccIdentifier}
                  onChange={e => { setCcIdentifier(e.target.value); setCcError(null); }}
                  placeholder="yourname or +1 555..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 h-14 text-white placeholder:text-white/20 text-sm font-bold focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all"
                  autoComplete="username"
                  disabled={ccLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type={ccShowPassword ? "text" : "password"}
                  value={ccPassword}
                  onChange={e => { setCcPassword(e.target.value); setCcError(null); }}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-12 h-14 text-white placeholder:text-white/20 text-sm font-bold focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all"
                  autoComplete="current-password"
                  disabled={ccLoading}
                />
                <button
                  type="button"
                  onClick={() => setCcShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {ccShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {ccError && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-[11px] font-bold text-destructive">{ccError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={ccLoading || !ccIdentifier.trim() || !ccPassword.trim()}
              className="w-full h-14 bg-primary text-white font-black italic uppercase tracking-[0.2em] text-[11px] rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {ccLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Synchronizing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Synchronize
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <Link href="/" className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white/40 transition-colors">
              ← Return to Network
            </Link>
          </div>
        </div>
        <p className="absolute bottom-6 text-[8px] font-black text-white/10 uppercase tracking-[0.5em]">ViMore Sentry v1.5 • Command Core Active</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden selection:bg-primary/30 transition-colors duration-500">
      <aside className={cn(
        "h-screen bg-card/40 backdrop-blur-3xl border-r border-border transition-all duration-500 hidden md:flex flex-col shrink-0 z-[100]",
        isSidebarOpen ? "w-72" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-4 border-b border-border">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shrink-0 shadow-lg shadow-primary/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <h1 className="font-black italic uppercase tracking-tighter text-lg leading-none">{t('nav_admin')}</h1>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">
                {userRole === 'SUPER' ? t('admin_role_super') : userRole === 'FINANCIAL' ? t('admin_role_financial') : t('admin_role_moderator')}
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
          {availableTabs.map((tab) => {
            const Icon = TABS_DATA[tab].icon;
            const isActive = activeTab === tab;
            const tabBadge =
              tab === 'economy' ? economyAlerts :
              (tab === 'resolution' || tab === 'tickets') ? realtimeOpenTickets :
              0;
            const handleTabClick = () => {
              triggerHaptic(5);
              setActiveTab(tab);
              if (tab === 'economy') resetEconomyBadge();
              if (tab === 'resolution' || tab === 'tickets') resetTicketsBadge();
            };
            return (
              <button key={tab} onClick={handleTabClick} className={cn("w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative", isActive ? "bg-primary text-white shadow-xl shadow-primary/10" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}>
                <div className="relative shrink-0">
                  <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive && "animate-pulse")} />
                  {!isSidebarOpen && <AdminAlertBadge count={tabBadge} />}
                </div>
                {isSidebarOpen && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="text-xs font-black italic uppercase tracking-widest">{TABS_DATA[tab].label}</span>
                    {tabBadge > 0 && !isActive && (
                      <div className="ml-2 min-w-[18px] h-[18px] bg-destructive text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-destructive/30 border border-background shrink-0">
                        {tabBadge > 99 ? '99+' : tabBadge}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {(isSuper || isFinancial) && (
          <div className="px-4 pb-2 space-y-1 border-t border-border pt-4">
            {isSidebarOpen && (
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 px-2 pb-1">
                Advanced
              </p>
            )}
            {isSuper && (
              <Link href="/admin/system">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-4 h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                >
                  <Server className="h-4 w-4 shrink-0" />
                  {isSidebarOpen && (
                    <span className="font-bold text-xs uppercase tracking-widest">The System</span>
                  )}
                </Button>
              </Link>
            )}
            {(isSuper || isFinancial) && (
              <Link href="/admin/financial-audit">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-4 h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                >
                  <Coins className="h-4 w-4 shrink-0" />
                  {isSidebarOpen && (
                    <span className="font-bold text-xs uppercase tracking-widest">Financial Audit</span>
                  )}
                </Button>
              </Link>
            )}
            {isSuper && (
              <Link href="/admin/financial-monitor">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-4 h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:border-violet-500/30 border border-transparent"
                >
                  <Users className="h-4 w-4 shrink-0 text-violet-400" />
                  {isSidebarOpen && (
                    <span className="font-bold text-xs uppercase tracking-widest text-violet-400">Fin. Monitor</span>
                  )}
                </Button>
              </Link>
            )}
          </div>
        )}

        <div className="p-4 border-t border-border">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50">
              <Rocket className="h-5 w-5" />
              {isSidebarOpen && <span className="font-bold text-xs uppercase tracking-widest">Exit Core</span>}
            </Button>
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto scrollbar-hide">
        <header className="h-20 px-4 sm:px-8 flex items-center justify-between bg-card/20 border-b border-border backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="md:hidden">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:flex"><Menu className="h-6 w-6" /></Button>
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Spatial Node</h2>
              <span className="text-sm sm:text-lg font-black italic uppercase tracking-tighter">Cluster: ViMore-Main-Alpha</span>
            </div>
          </div>
          <Avatar className="h-10 w-10 border-2 border-primary/20"><AvatarImage src={currentUser?.avatar} /></Avatar>
        </header>

        <div className="p-4 sm:p-10 space-y-10 pb-32">
          {activeTab === 'economy' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Header */}
              <div className="px-1">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Economy</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Financial requests & withdrawals</p>
              </div>

              {/* Tab Toggle */}
              <div className="flex gap-1 bg-secondary/40 p-1.5 rounded-2xl w-full">
                <button onClick={() => setEconomySubTab("outbound")} className={cn("flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", economySubTab === "outbound" ? "bg-card text-primary shadow-md" : "text-muted-foreground")}>
                  <span className="flex items-center justify-center gap-2"><ArrowUpCircle className="h-4 w-4" />Withdrawals</span>
                </button>
                <button onClick={() => setEconomySubTab("inbound")} className={cn("flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", economySubTab === "inbound" ? "bg-card text-primary shadow-md" : "text-muted-foreground")}>
                  <span className="flex items-center justify-center gap-2"><ArrowDownCircle className="h-4 w-4" />Payments</span>
                </button>
              </div>

              {/* Summary row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card/60 border border-border/50 rounded-3xl p-4 flex items-center gap-3">
                  <div className="h-10 w-10 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0">
                    <ArrowUpCircle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending</p>
                    <p className="text-xl font-black text-amber-500">{pendingWithdrawals.length}</p>
                    <p className="text-[9px] text-muted-foreground font-bold">Withdrawals</p>
                  </div>
                </div>
                <div className="bg-card/60 border border-border/50 rounded-3xl p-4 flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                    <ArrowDownCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending</p>
                    <p className="text-xl font-black text-primary">{pendingPayments.length}</p>
                    <p className="text-[9px] text-muted-foreground font-bold">Payments</p>
                  </div>
                </div>
              </div>

              {/* Outbound — Withdrawals */}
              {economySubTab === 'outbound' && (
                <div className="space-y-4">
                  {pendingWithdrawals.length > 0 ? pendingWithdrawals.map((w) => {
                    const wUser = userMap[w.username];
                    const accountRef = w.account_number || w.accountNumber || w.payment_details || '';
                    const methodColor = (w.method || '').toLowerCase().includes('orange') ? 'orange' : 'yellow';
                    return (
                      <div key={w.$id} className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-lg">
                        {/* Header strip */}
                        <div className={cn(
                          "px-5 py-2 flex items-center justify-between",
                          methodColor === 'orange' ? "bg-orange-500/10 border-b border-orange-500/20" : "bg-yellow-500/10 border-b border-yellow-500/20"
                        )}>
                          <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", methodColor === 'orange' ? "text-orange-500" : "text-yellow-600 dark:text-yellow-400")}>Withdrawal Request</span>
                          <Badge className={cn("text-[9px] font-black uppercase border-none px-3", methodColor === 'orange' ? "bg-orange-500/20 text-orange-500" : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400")}>{w.method || 'Mobile Money'}</Badge>
                        </div>

                        <div className="p-5 space-y-4">
                          {/* User identity row */}
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border-2 border-border rounded-2xl shrink-0">
                              <AvatarImage src={wUser?.avatar} className="object-cover" />
                              <AvatarFallback className="text-lg font-black rounded-2xl bg-primary/10">{(w.username || '?')[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-black text-base leading-tight">{wUser?.name || w.accountName || w.username}</p>
                                {wUser?.isVerified && <CheckCircle2 className="h-4 w-4 text-primary fill-primary shrink-0" />}
                              </div>
                              <p className="text-[11px] font-bold text-muted-foreground">@{w.username}</p>
                              {w.$createdAt && (
                                <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">
                                  {new Date(w.$createdAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Account details */}
                          <div className="bg-secondary/30 rounded-2xl p-4 space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Account Details</p>
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-black text-sm">{w.accountName || '—'}</p>
                                {accountRef && <p className="text-xs font-bold text-muted-foreground font-mono mt-0.5">{accountRef}</p>}
                              </div>
                            </div>
                          </div>

                          {/* Amount breakdown */}
                          <div className="grid grid-cols-3 gap-2 items-center">
                            <div className="bg-secondary/30 rounded-2xl p-3 text-center">
                              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">From</p>
                              <p className="font-black text-base leading-tight">{w.amount}</p>
                              <p className="text-[9px] font-bold text-muted-foreground">{w.currency}</p>
                            </div>
                            <div className="flex justify-center">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <ArrowRight className="h-4 w-4 text-primary" />
                              </div>
                            </div>
                            <div className="bg-primary/10 rounded-2xl p-3 text-center border border-primary/20">
                              <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest mb-1">Payout</p>
                              <p className="font-black text-base text-primary leading-tight">{(w.payoutAmount ?? 0).toFixed(2)}</p>
                              <p className="text-[9px] font-bold text-primary/60">{w.payoutCurrency}</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            <Button className="flex-1 h-12 rounded-2xl bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white font-black uppercase text-xs transition-all gap-2" onClick={() => handleOpenWithdrawalDialog(w.$id, 'APPROVED')}>
                              <Check className="h-4 w-4" />Approve
                            </Button>
                            <Button className="flex-1 h-12 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white font-black uppercase text-xs transition-all gap-2" onClick={() => handleOpenWithdrawalDialog(w.$id, 'REJECTED')}>
                              <X className="h-4 w-4" />Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-16 flex flex-col items-center gap-3 bg-card/30 rounded-3xl border border-dashed border-border">
                      <ArrowUpCircle className="h-10 w-10 text-muted-foreground/20" />
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">No pending withdrawals</p>
                    </div>
                  )}
                </div>
              )}

              {/* Inbound — Payments */}
              {economySubTab === 'inbound' && (
                <div className="space-y-4">
                  {pendingPayments.length > 0 ? pendingPayments.map((p) => {
                    const pUser = userMap[p.username];
                    const coinColor = (p.coin_type || '').toLowerCase() === 'diamond' ? 'cyan' : 'amber';
                    return (
                      <div key={p.$id} className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-lg">
                        {/* Header strip */}
                        <div className={cn(
                          "px-5 py-2 flex items-center justify-between",
                          coinColor === 'cyan' ? "bg-cyan-500/10 border-b border-cyan-500/20" : "bg-amber-500/10 border-b border-amber-500/20"
                        )}>
                          <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", coinColor === 'cyan' ? "text-cyan-500" : "text-amber-500")}>Payment Request</span>
                          <Badge className={cn("text-[9px] font-black uppercase border-none px-3", coinColor === 'cyan' ? "bg-cyan-500/20 text-cyan-500" : "bg-amber-500/20 text-amber-500")}>
                            {coinColor === 'cyan' ? <Gem className="h-3 w-3 mr-1 inline" /> : <Coins className="h-3 w-3 mr-1 inline" />}
                            {p.coin_amount || ''} {p.coin_type || 'Gold'}
                          </Badge>
                        </div>

                        <div className="p-5 space-y-4">
                          {/* User identity row */}
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border-2 border-border rounded-2xl shrink-0">
                              <AvatarImage src={pUser?.avatar} className="object-cover" />
                              <AvatarFallback className="text-lg font-black rounded-2xl bg-primary/10">{(p.username || '?')[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-black text-base leading-tight">{pUser?.name || p.name || p.username}</p>
                                {pUser?.isVerified && <CheckCircle2 className="h-4 w-4 text-primary fill-primary shrink-0" />}
                              </div>
                              <p className="text-[11px] font-bold text-muted-foreground">@{p.username}</p>
                              {p.$createdAt && (
                                <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">
                                  {new Date(p.$createdAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Package + amount details */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-secondary/30 rounded-2xl p-3">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Package</p>
                              <p className="font-black text-sm leading-tight">{p.packageName || '—'}</p>
                            </div>
                            <div className={cn("rounded-2xl p-3 border", coinColor === 'cyan' ? "bg-cyan-500/10 border-cyan-500/20" : "bg-amber-500/10 border-amber-500/20")}>
                              <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", coinColor === 'cyan' ? "text-cyan-500/70" : "text-amber-500/70")}>Amount Paid</p>
                              <p className={cn("font-black text-lg leading-tight", coinColor === 'cyan' ? "text-cyan-500" : "text-amber-500")}>
                                {p.currency === 'USD' ? '$' : 'L$'} {p.amount}
                              </p>
                            </div>
                          </div>

                          {/* Ref code */}
                          {p.code && (
                            <div className="bg-secondary/20 rounded-2xl px-4 py-2.5 flex items-center justify-between">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ref Code</p>
                              <p className="font-black text-sm font-mono text-primary tracking-widest">{p.code}</p>
                            </div>
                          )}

                          {/* Screenshot — full width, prominent */}
                          {p.screenshot ? (
                            <div
                              className="relative w-full rounded-2xl overflow-hidden cursor-zoom-in group"
                              style={{ aspectRatio: '9/16', maxHeight: '480px' }}
                              onClick={() => setSelectedReceipt(p.screenshot)}
                            >
                              <Image src={p.screenshot} alt="Payment Confirmation" fill className="object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                                <div className="bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 group-hover:bg-primary/80 transition-colors">
                                  <Eye className="h-4 w-4 text-white" />
                                  <span className="text-white text-[10px] font-black uppercase tracking-widest">Tap to Zoom</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full rounded-2xl bg-secondary/20 border border-dashed border-border flex items-center justify-center py-10 gap-2">
                              <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                              <p className="text-xs font-black uppercase text-muted-foreground/40">No screenshot uploaded</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            <Button className="flex-1 h-12 rounded-2xl bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white font-black uppercase text-xs transition-all gap-2" onClick={() => handleOpenPaymentDialog(p.$id, 'APPROVED')}>
                              <Check className="h-4 w-4" />Approve
                            </Button>
                            <Button className="flex-1 h-12 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white font-black uppercase text-xs transition-all gap-2" onClick={() => handleOpenPaymentDialog(p.$id, 'REJECTED')}>
                              <X className="h-4 w-4" />Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-16 flex flex-col items-center gap-3 bg-card/30 rounded-3xl border border-dashed border-border">
                      <ArrowDownCircle className="h-10 w-10 text-muted-foreground/20" />
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">No pending payments</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="space-y-1 px-2">
                <h3 className="text-3xl font-black italic uppercase tracking-tighter">Campaign Hub</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Create and manage in-app ad campaigns</p>
              </div>

              {/* Sub-tab selector — horizontal scroll on mobile */}
              <div className="overflow-x-auto pb-1 -mx-2 px-2">
                <div className="flex gap-2 bg-secondary/30 p-1.5 rounded-2xl w-max min-w-full">
                  {([
                    { key: 'story', label: 'Story Ads', icon: Clapperboard },
                    { key: 'download', label: 'Download Ads', icon: Download },
                    { key: 'music', label: 'Music Audio', icon: Music2 },
                    { key: 'feed', label: 'Feed Post Ads', icon: LayoutGrid },
                    { key: 'reel', label: 'Reel Video Ads', icon: Film },
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => handleCampaignSubTabChange(key)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0",
                        campaignSubTab === key ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description for each type */}
              <div className="px-2">
                {campaignSubTab === 'story' && (
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-3">
                    <Clapperboard className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Story Ads</p>
                      <p className="text-xs text-muted-foreground mt-0.5">These ads appear automatically after every 2 stories a user views. They match the exact full-screen story design with your photo or video and a call-to-action button.</p>
                    </div>
                  </div>
                )}
                {campaignSubTab === 'download' && (
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
                    <Download className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Download Ads</p>
                      <p className="text-xs text-muted-foreground mt-0.5">These ads show as a 30-second interstitial when a user clicks any download button. One active campaign shows at a time; if multiple exist they rotate. Supports photo and video.</p>
                    </div>
                  </div>
                )}
                {campaignSubTab === 'music' && (
                  <div className="p-4 bg-accent/5 border border-accent/10 rounded-2xl flex items-start gap-3">
                    <Music2 className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Music Audio Ads</p>
                      <p className="text-xs text-muted-foreground mt-0.5">These audio ads play automatically after every 2 songs. Users cannot skip to another song until the audio finishes. Upload an audio file — maximum 45 seconds long.</p>
                    </div>
                  </div>
                )}
                {campaignSubTab === 'feed' && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3">
                    <LayoutGrid className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Feed Post Ads</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Photo ads that appear directly in the home feed every 3 posts, looking exactly like a regular post. Only shows your title, description, and a call-to-action button — no likes, comments, share, or download.</p>
                    </div>
                  </div>
                )}
                {campaignSubTab === 'reel' && (
                  <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-start gap-3">
                    <Film className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Reel Video Ads</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Video ads that appear in the Reels page exactly like a real reel, every 3 reels. Only shows your title, description, and a call-to-action button — no likes, comments, share, or download.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Creation Form */}
                <Card className="lg:col-span-1 bg-card/40 border-border rounded-[2.5rem] p-8 space-y-5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5"><Megaphone className="h-24 w-24" /></div>
                  <div className="space-y-1 relative z-10">
                    <h4 className="text-xl font-black italic uppercase tracking-tighter">
                      {campaignSubTab === 'story' ? 'New Story Ad' : campaignSubTab === 'download' ? 'New Download Ad' : campaignSubTab === 'music' ? 'New Music Audio Ad' : campaignSubTab === 'feed' ? 'New Feed Post Ad' : 'New Reel Video Ad'}
                    </h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      {campaignSubTab === 'music' ? 'Upload audio (max 45 sec)' : campaignSubTab === 'reel' ? 'Upload video only' : 'Upload photo or video'}
                    </p>
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ad Title</Label>
                      <Input value={campForm.title} onChange={(e) => setCampForm({...campForm, title: e.target.value})} className="h-12 bg-secondary/30 border-none rounded-xl font-bold" placeholder="Your brand message..." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
                      <Textarea value={campForm.content} onChange={(e) => setCampForm({...campForm, content: e.target.value})} className="bg-secondary/30 border-none rounded-xl font-medium min-h-[80px] resize-none" placeholder="Tell users about your offer..." />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Budget (USD)</Label>
                      <Input type="number" min={0} value={campForm.budget} onChange={(e) => setCampForm({...campForm, budget: parseFloat(e.target.value) || 0})} className="h-11 bg-secondary/30 border-none rounded-xl font-bold text-sm" placeholder="0.00" />
                    </div>

                    {campaignSubTab !== 'music' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Link URL</Label>
                          <Input value={campForm.actionUrl} onChange={(e) => setCampForm({...campForm, actionUrl: e.target.value})} className="h-11 bg-secondary/30 border-none rounded-xl font-bold text-sm" placeholder="https://..." />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Button Text</Label>
                          <Input value={campForm.actionLabel} onChange={(e) => setCampForm({...campForm, actionLabel: e.target.value})} className="h-11 bg-secondary/30 border-none rounded-xl font-bold text-sm" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {campaignSubTab === 'music' ? 'Audio File (MP3, max 45s)' : campaignSubTab === 'reel' ? 'Video File' : 'Photo or Video'}
                      </Label>
                      <div
                        className="relative rounded-2xl bg-secondary/30 border-2 border-dashed border-primary/10 flex flex-col items-center justify-center cursor-pointer group hover:border-primary/30 transition-all overflow-hidden"
                        style={{ minHeight: campaignSubTab === 'music' ? '80px' : '140px' }}
                        onClick={() => campInputRef.current?.click()}
                      >
                        {campPreview && campForm.type !== 'audio' ? (
                          <>
                            {campForm.type === 'video'
                              ? <video src={campPreview} className="w-full h-full object-cover" autoPlay loop muted />
                              : <Image src={campPreview} alt="Preview" fill className="object-cover" />
                            }
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><RefreshCcw className="h-6 w-6 text-white" /></div>
                          </>
                        ) : campFile && campForm.type === 'audio' ? (
                          <div className="flex flex-col items-center gap-2 py-4">
                            <Music2 className="h-8 w-8 text-primary" />
                            <span className="text-[10px] font-black uppercase text-primary">{campFile.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity py-5">
                            <Upload className="h-6 w-6" />
                            <span className="text-[9px] font-black uppercase">
                              {campaignSubTab === 'music' ? 'Upload Audio File' : campaignSubTab === 'reel' ? 'Upload Video' : 'Upload Photo or Video'}
                            </span>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={campInputRef}
                        className="hidden"
                        accept={campaignSubTab === 'music' ? 'audio/*' : campaignSubTab === 'reel' ? 'video/*' : 'image/*,video/*'}
                        onChange={handleCampaignMedia}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">End Date & Time (optional)</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="date"
                            value={campForm.endDate}
                            onChange={(e) => setCampForm({...campForm, endDate: e.target.value})}
                            min={new Date().toISOString().split('T')[0]}
                            className="h-11 bg-secondary/30 border-none rounded-xl font-bold text-sm pl-9"
                          />
                        </div>
                        <Input
                          type="time"
                          value={campForm.endTime}
                          onChange={(e) => setCampForm({...campForm, endTime: e.target.value})}
                          className="h-11 bg-secondary/30 border-none rounded-xl font-bold text-sm"
                          disabled={!campForm.endDate}
                        />
                      </div>
                      {campForm.endDate && (
                        <p className="text-[10px] text-muted-foreground ml-1">Campaign will auto-off on {new Date(`${campForm.endDate}T${campForm.endTime || "23:59"}:00`).toLocaleString()}</p>
                      )}
                    </div>

                    <Button
                      className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-xl shadow-primary/20"
                      disabled={isCreatingCampaign || !campForm.title || !campFile}
                      onClick={handleLaunchCampaign}
                    >
                      {isCreatingCampaign ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Zap className="h-5 w-5 mr-2" />}
                      Launch Campaign
                    </Button>
                  </div>
                </Card>

                {/* Campaign List */}
                <Card className="lg:col-span-2 bg-card/40 border-border rounded-[2.5rem] overflow-hidden shadow-xl flex flex-col">
                  <div className="p-8 border-b border-border flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xl font-black italic uppercase tracking-tighter">Active Campaigns</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        {campaignSubTab === 'story' ? 'Story ad placements' : campaignSubTab === 'download' ? 'Download interstitials' : campaignSubTab === 'music' ? 'Music audio spots' : campaignSubTab === 'feed' ? 'Home feed post ads' : 'Reel video ads'}
                      </p>
                    </div>
                    <Badge className="bg-primary text-primary-foreground border-none font-black h-5 px-3 uppercase tracking-tighter">
                      {campaigns.filter((c: any) => c.placement === campaignSubTab).length} ADS
                    </Badge>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-6 grid grid-cols-1 gap-4">
                      {campaigns
                        .filter((c: any) => c.placement === campaignSubTab)
                        .map((c: any) => (
                        <div key={c.$id} className="p-4 bg-secondary/20 rounded-3xl border border-white/5 flex items-center gap-5 group hover:bg-secondary/30 transition-all">
                          <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0 shadow-lg bg-secondary/30 flex items-center justify-center">
                            {c.type === 'audio' ? (
                              <Music2 className="h-7 w-7 text-primary" />
                            ) : c.type === 'video' ? (
                              c.media_url ? <video src={c.media_url} className="w-full h-full object-cover" muted /> : <Video className="h-7 w-7 text-muted-foreground" />
                            ) : (
                              c.media_url ? <Image src={c.media_url} alt="Campaign" fill className="object-cover" /> : <ImageIcon className="h-7 w-7 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-sm truncate">{c.title}</h5>
                              <Badge className={cn("text-[8px] font-black uppercase h-4 px-1.5 border-none", c.is_active ? "bg-green-500 text-white" : "bg-zinc-500 text-white")}>
                                {c.is_active ? 'LIVE' : 'PAUSED'}
                              </Badge>
                              <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">
                                {c.type || 'photo'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">{c.content}</p>
                            <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                              <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2 py-0.5">
                                <Eye className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-black text-primary tabular-nums">{(c.impressions || 0).toLocaleString()} views</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-accent/10 rounded-lg px-2 py-0.5">
                                <MousePointerClick className="h-3 w-3 text-accent" />
                                <span className="text-[10px] font-black text-accent tabular-nums">{(c.clicks || 0).toLocaleString()} clicks</span>
                              </div>
                              {(c.impressions || 0) > 0 && (
                                <span className="text-[10px] font-black text-muted-foreground">
                                  CTR: {(((c.clicks || 0) / (c.impressions || 1)) * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                            {c.end_date && (
                              <div className={cn("flex items-center gap-1.5 mt-0.5", new Date(c.end_date) <= new Date() ? "text-destructive" : "text-muted-foreground")}>
                                <CalendarClock className="h-3 w-3 shrink-0" />
                                <span className="text-[10px] font-black">
                                  {new Date(c.end_date) <= new Date() ? "Expired: " : "Ends: "}
                                  {new Date(c.end_date).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={!!c.is_active} onCheckedChange={() => toggleCampaignStatus(c.$id)} />
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive" onClick={() => { triggerHaptic(50); deleteCampaign(c.$id); }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                      {campaigns.filter((c: any) => c.placement === campaignSubTab).length === 0 && (
                        <div className="py-24 text-center opacity-40 italic text-xs uppercase font-black">No campaigns yet — create one to get started</div>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            </div>
          )}




          {activeTab === 'safety' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Header */}
              <div className="px-1">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Safety</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Flagged content & community reports</p>
              </div>

              {/* Stats + AI Shield link */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card/60 border border-border/50 rounded-3xl p-4 flex flex-col items-center gap-1">
                  <p className="text-xl font-black text-amber-400">{reports.filter((r: any) => r.status === 'PENDING').length}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Pending</p>
                </div>
                <div className="bg-card/60 border border-border/50 rounded-3xl p-4 flex flex-col items-center gap-1">
                  <p className="text-xl font-black text-green-500">{reports.filter((r: any) => r.status === 'RESOLVED').length}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Resolved</p>
                </div>
                <Link href="/admin/shield" className="block">
                  <div className="relative bg-primary/10 border border-primary/20 rounded-3xl p-4 flex flex-col items-center gap-1 active:scale-95 transition-transform">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary text-center">AI Shield</p>
                    {aiShieldCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-destructive text-white text-[9px] font-black flex items-center justify-center">
                        {aiShieldCount > 99 ? '99+' : aiShieldCount}
                      </span>
                    )}
                  </div>
                </Link>
              </div>

              {/* Report cards */}
              <div className="space-y-3">
                {reports.length > 0 ? reports.map((r: any) => {
                  const isProduct = r.target_type === 'PRODUCT';
                  let meta: any = null;
                  if (r.target_meta) { try { meta = typeof r.target_meta === 'string' ? JSON.parse(r.target_meta) : r.target_meta; } catch { meta = null; } }
                  const reporter = allUsers.find(u => u.$id === r.reporter_id);
                  const reportedUser = isProduct
                    ? allUsers.find(u => u.$id === meta?.sellerId || u.username === meta?.sellerUsername)
                    : allUsers.find(u => u.$id === r.target_id || u.username === r.target_id);
                  const reportedLabel = isProduct
                    ? (meta?.productName || 'Product')
                    : (reportedUser?.username || r.reportedUsername || r.target_id);
                  const reporterLabel = reporter?.username || r.reporterUsername || r.reporter_id;
                  return (
                    <div key={r.$id} className="bg-card/60 border border-border/50 rounded-3xl p-5 space-y-4">
                      {/* Top row: type + status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-[9px] font-black uppercase border-none", isProduct ? "bg-primary/10 text-primary" : "bg-amber-400/10 text-amber-400")}>
                            {isProduct ? 'Product' : (r.target_type || 'User')}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[9px] font-black uppercase", r.reason === 'Spam' ? "border-amber-400/30 text-amber-400" : r.reason === 'Harassment' ? "border-destructive/30 text-destructive" : "border-border text-muted-foreground")}>{r.reason}</Badge>
                        </div>
                        <Badge className={cn("text-[9px] font-black uppercase border-none shrink-0", r.status === 'PENDING' ? "bg-amber-400/10 text-amber-400" : r.status === 'RESOLVED' ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground")}>{r.status}</Badge>
                      </div>

                      {/* Reported target */}
                      <div className="flex items-center gap-3">
                        {isProduct && meta?.thumbnailFileId ? (
                          <img src={`${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1'}/storage/buckets/Marketplace_Images/files/${meta.thumbnailFileId}/preview?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123'}&width=64&height=64&quality=60&output=webp`} alt="" className="h-12 w-12 rounded-2xl object-cover shrink-0" />
                        ) : (
                          <div className="h-12 w-12 bg-secondary/40 rounded-2xl flex items-center justify-center shrink-0">
                            <ShieldAlert className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-sm truncate">{isProduct ? reportedLabel : `@${reportedLabel}`}</p>
                          {isProduct && meta?.sellerUsername && <p className="text-[10px] text-muted-foreground">@{meta.sellerUsername}</p>}
                          {r.details && <p className="text-[10px] text-muted-foreground/70 line-clamp-2 mt-0.5">{r.details}</p>}
                        </div>
                      </div>

                      {/* Reporter */}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-black uppercase tracking-widest">Reported by</span>
                        <span className="font-bold">@{reporterLabel}</span>
                      </div>

                      {/* Actions */}
                      {r.status === 'PENDING' && (
                        <div className="flex flex-col gap-2">
                          {isProduct && (
                            <div className="flex gap-2">
                              <Button asChild size="sm" className="flex-1 h-10 rounded-2xl bg-secondary/40 text-foreground font-black uppercase text-xs">
                                <a href={`/marketplace/${r.target_id}`} target="_blank" rel="noopener"><Eye className="h-3.5 w-3.5 mr-1.5" />View</a>
                              </Button>
                              {meta?.sellerId && (
                                <Button size="sm" className="flex-1 h-10 rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white font-black uppercase text-xs transition-all" onClick={async () => {
                                  triggerHaptic(50);
                                  const severity = confirm('Send FINAL warning?\n\nOK = FINAL warning\nCancel = SOFT warning') ? 'FINAL' : 'SOFT';
                                  const msg = `Your product "${reportedLabel}" was reported for: ${r.reason}. Please review ViMore Marketplace policies.`;
                                  await warnUser(meta.sellerId, msg, severity as 'SOFT' | 'FINAL');
                                  await handleReportAction(r.$id, 'RESOLVED');
                                  addAuditLog('USER_WARNED_FROM_PRODUCT_REPORT', `Warned @${meta.sellerUsername} (${severity}) for product ${r.target_id}`);
                                  toast({ title: `${severity} warning sent` });
                                }}><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Warn</Button>
                              )}
                              <Button size="sm" className="flex-1 h-10 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white font-black uppercase text-xs transition-all" onClick={async () => {
                                triggerHaptic(80);
                                if (!confirm(`Delete product "${reportedLabel}"? This cannot be undone.`)) return;
                                try {
                                  await adminDeleteProduct(r.target_id);
                                  await handleReportAction(r.$id, 'RESOLVED');
                                  addAuditLog('PRODUCT_DELETED_BY_ADMIN', `Product ${r.target_id} ("${reportedLabel}") deleted from report ${r.$id}`);
                                } catch { /* toast already shown */ }
                              }}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete</Button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 h-11 rounded-2xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white font-black uppercase text-xs transition-all" onClick={() => { triggerHaptic(30); handleReportAction(r.$id, 'RESOLVED'); addAuditLog(isProduct ? 'PRODUCT_REPORT_RESOLVED' : 'REPORT_RESOLVED', `Report ${r.$id} marked resolved`); toast({ title: "Report Resolved" }); }}>
                              <Check className="h-4 w-4 mr-1.5" />Resolve
                            </Button>
                            <Button size="sm" className="flex-1 h-11 rounded-2xl bg-secondary/40 text-muted-foreground hover:bg-destructive/10 hover:text-destructive font-black uppercase text-xs transition-all" onClick={() => { triggerHaptic(80); handleReportAction(r.$id, 'DISMISSED'); addAuditLog(isProduct ? 'PRODUCT_REPORT_DISMISSED' : 'REPORT_DISMISSED', `Report ${r.$id} dismissed`); toast({ title: "Report Dismissed" }); }}>
                              <X className="h-4 w-4 mr-1.5" />Dismiss
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="py-16 flex flex-col items-center gap-3 bg-card/30 rounded-3xl border border-dashed border-border">
                    <ShieldAlert className="h-10 w-10 text-muted-foreground/20" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">Safety shields nominal — no reports</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (() => {
            const displayUsers = allUsers.filter(u => {
              const matchesSearch = !userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.name?.toLowerCase().includes(userSearch.toLowerCase());
              const matchesStatus = userStatusFilter === 'all' || (u.status || 'active') === userStatusFilter;
              return matchesSearch && matchesStatus;
            });
            return (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                  <div className="space-y-1">
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter">User Management</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">All registered platform nodes</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-primary/10 text-primary border-none font-black uppercase">{allUsers.length} Total</Badge>
                    <Badge className="bg-amber-400/10 text-amber-400 border-none font-black uppercase">{allUsers.filter(u => u.status === 'suspended').length} Suspended</Badge>
                    <Badge className="bg-destructive/10 text-destructive border-none font-black uppercase">{allUsers.filter(u => u.status === 'banned').length} Banned</Badge>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by username or name..." className="pl-10 h-12 bg-secondary/30 border-none rounded-2xl font-bold" />
                  </div>
                  <div className="flex gap-1 bg-secondary/40 p-1.5 rounded-2xl shrink-0">
                    {(['all', 'active', 'suspended', 'banned'] as const).map(f => (
                      <button key={f} onClick={() => setUserStatusFilter(f)} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all capitalize", userStatusFilter === f ? "bg-white dark:bg-card text-primary shadow-md" : "text-muted-foreground hover:text-foreground")}>{f}</button>
                    ))}
                  </div>
                </div>

                <Card className="bg-card/40 border-border rounded-[2.5rem] overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border text-[9px] font-black text-muted-foreground uppercase tracking-widest bg-secondary/20">
                          <th className="px-6 py-4">User</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Followers</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Warnings</th>
                          <th className="px-6 py-4">Joined</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {displayUsers.length > 0 ? displayUsers.map(u => {
                          const isProtected = u.$id === firstUserId;
                          const isCurrentUser = u.$id === currentUser?.$id;
                          const userStatus = u.status || 'active';
                          const isSuspended = userStatus === 'suspended' && u.suspendedUntil && new Date(u.suspendedUntil).getTime() > Date.now();
                          return (
                            <tr key={u.$id} className={cn("hover:bg-secondary/10 transition-colors", userStatus === 'banned' && "opacity-60")}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 border-2 border-primary/10"><AvatarImage src={u.avatar} /><AvatarFallback>{u.name?.[0]}</AvatarFallback></Avatar>
                                  <div>
                                    <p className="font-bold text-sm">@{u.username}</p>
                                    <p className="text-[10px] text-muted-foreground">{u.name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant="outline" className={cn("text-[9px] font-black uppercase", u.role === 'SUPER' ? "border-amber-400/30 text-amber-400" : u.role === 'FINANCIAL' ? "border-green-400/30 text-green-400" : u.role === 'MODERATOR' ? "border-blue-400/30 text-blue-400" : "border-border text-muted-foreground")}>{u.role || 'USER'}</Badge>
                              </td>
                              <td className="px-6 py-4"><span className="font-black text-sm">{(u.followers || 0).toLocaleString()}</span></td>
                              <td className="px-6 py-4">
                                <Badge className={cn("text-[9px] font-black uppercase border-none",
                                  userStatus === 'banned' ? "bg-destructive/20 text-destructive" :
                                  isSuspended ? "bg-amber-400/10 text-amber-400" :
                                  "bg-green-500/10 text-green-400"
                                )}>
                                  {userStatus === 'banned' ? 'Banned' : isSuspended ? `Suspended` : 'Active'}
                                </Badge>
                                {isSuspended && u.suspendedUntil && (
                                  <p className="text-[9px] text-muted-foreground mt-0.5">Until {new Date(u.suspendedUntil).toLocaleDateString()}</p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn("font-black text-sm", (u.warningCount || 0) >= 3 ? "text-destructive" : (u.warningCount || 0) > 0 ? "text-amber-400" : "text-muted-foreground")}>
                                  {u.warningCount || 0}
                                </span>
                              </td>
                              <td className="px-6 py-4"><span className="text-[10px] font-black text-muted-foreground">{u.joinDate ? new Date(u.joinDate).toLocaleDateString() : '—'}</span></td>
                              <td className="px-6 py-4 text-right">
                                {isCurrentUser ? (
                                  <Badge className="text-[8px] font-black uppercase bg-primary/10 text-primary border-none">You</Badge>
                                ) : isProtected ? (
                                  <Badge className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border-none">Protected</Badge>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    {userStatus !== 'banned' && (
                                      <>
                                        <Button size="sm" variant="ghost" className="h-8 px-3 rounded-xl text-[9px] font-black uppercase text-amber-400 hover:bg-amber-400/10" onClick={() => { triggerHaptic(10); setWarnTarget(u); setWarnMessage(""); setWarnSeverity('SOFT'); }}>
                                          <AlertOctagon className="h-3 w-3 mr-1" />Warn
                                        </Button>
                                        {userStatus !== 'suspended' && (
                                          <Button size="sm" variant="ghost" className="h-8 px-3 rounded-xl text-[9px] font-black uppercase text-blue-400 hover:bg-blue-400/10" onClick={() => { triggerHaptic(20); setSuspendTarget(u); setSuspendDays(7); setSuspendMessage(""); }}>
                                            <Timer className="h-3 w-3 mr-1" />Suspend
                                          </Button>
                                        )}
                                        {userStatus === 'suspended' && (
                                          <Button size="sm" variant="ghost" className="h-8 px-3 rounded-xl text-[9px] font-black uppercase text-green-400 hover:bg-green-400/10" onClick={async () => {
                                            triggerHaptic(10);
                                            await suspendUser(u.$id, 0, '', '');
                                            await addAuditLog('SUSPENSION_LIFTED', `Suspension on @${u.username} lifted early by admin`);
                                            toast({ title: "Suspension Lifted", description: `@${u.username} can now access the platform.` });
                                          }}>
                                            <Undo2 className="h-3 w-3 mr-1" />Lift
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    <Button size="sm" variant="ghost" className="h-8 px-3 rounded-xl text-[9px] font-black uppercase text-destructive hover:bg-destructive/10" onClick={() => { triggerHaptic(50); setBanTarget(u); setBanConfirmText(""); setBanNote(""); }}>
                                      <UserX className="h-3 w-3 mr-1" />{userStatus === 'banned' ? 'Banned' : 'Ban'}
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan={7} className="py-24 text-center opacity-40 italic text-xs uppercase">No users found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            );
          })()}

          {activeTab === 'broadcast' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter">Notification Center</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Broadcast & Targeted Notifications</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-none font-black uppercase self-start sm:self-auto">{broadcastHistory.length} Sent</Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="bg-card/40 border-border rounded-[2.5rem] p-8 space-y-6 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center"><BellRing className="h-5 w-5 text-primary" /></div>
                      <div>
                        <h4 className="text-lg font-black italic uppercase tracking-tighter">Compose Notification</h4>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Write and send to your audience</p>
                      </div>
                    </div>

                    <div className="flex gap-1 bg-secondary/40 p-1.5 rounded-2xl">
                      <button onClick={() => setBroadcastMode('all')} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all", broadcastMode === 'all' ? "bg-white dark:bg-card text-primary shadow-md" : "text-muted-foreground")}><Bell className="h-3.5 w-3.5" />All Users</button>
                      <button onClick={() => setBroadcastMode('targeted')} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all", broadcastMode === 'targeted' ? "bg-white dark:bg-card text-primary shadow-md" : "text-muted-foreground")}><Target className="h-3.5 w-3.5" />Targeted</button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notification Title *</Label>
                        <Input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} placeholder="e.g. New Feature Alert!" className="h-12 bg-secondary/30 border-none rounded-2xl font-bold" maxLength={80} />
                        <p className="text-[9px] text-muted-foreground text-right">{broadcastTitle.length}/80</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Message *</Label>
                        <Textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Write your notification message here..." className="bg-secondary/30 border-none rounded-2xl font-medium resize-none min-h-[100px]" maxLength={300} />
                        <p className="text-[9px] text-muted-foreground text-right">{broadcastMessage.length}/300</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action URL (optional)</Label>
                        <Input value={broadcastActionUrl} onChange={e => setBroadcastActionUrl(e.target.value)} placeholder="https://... or /reels" className="h-12 bg-secondary/30 border-none rounded-2xl font-bold" />
                      </div>
                    </div>

                    {broadcastMode === 'targeted' && (
                      <div className="space-y-4 border-t border-border pt-6">
                        <h5 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Filter className="h-3.5 w-3.5" />Audience Filter</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Min Followers</Label>
                            <Input type="number" value={broadcastFollowerMin} onChange={e => setBroadcastFollowerMin(Number(e.target.value))} className="h-10 bg-secondary/30 border-none rounded-xl font-bold" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Max Followers</Label>
                            <Input type="number" value={broadcastFollowerMax} onChange={e => setBroadcastFollowerMax(Number(e.target.value))} className="h-10 bg-secondary/30 border-none rounded-xl font-bold" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">Or target specific users</Label>
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input value={broadcastTargetSearch} onChange={e => setBroadcastTargetSearch(e.target.value)} placeholder="Search users to add..." className="pl-10 h-12 bg-secondary/30 border-none rounded-2xl font-bold" />
                          </div>
                          {broadcastTargetSearch.trim().length >= 2 && (() => {
                            const results = allUsers.filter(u => u.username?.toLowerCase().includes(broadcastTargetSearch.toLowerCase()) || u.name?.toLowerCase().includes(broadcastTargetSearch.toLowerCase())).slice(0, 5);
                            return results.length > 0 ? (
                              <div className="space-y-2">
                                {results.map(u => (
                                  <div key={u.$id} className="flex items-center justify-between bg-secondary/20 rounded-xl p-3">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-7 w-7"><AvatarImage src={u.avatar} /><AvatarFallback>{u.name?.[0]}</AvatarFallback></Avatar>
                                      <span className="text-xs font-bold">@{u.username}</span>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-7 text-[9px] rounded-lg font-black uppercase text-primary" onClick={() => {
                                      if (!broadcastTargetIds.includes(u.$id)) {
                                        setBroadcastTargetIds(prev => [...prev, u.$id]);
                                        setBroadcastTargetSearch("");
                                      }
                                    }}><Plus className="h-3 w-3" />Add</Button>
                                  </div>
                                ))}
                              </div>
                            ) : null;
                          })()}
                          {broadcastTargetIds.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[9px] font-black uppercase text-muted-foreground">Selected ({broadcastTargetIds.length})</p>
                              <div className="flex flex-wrap gap-2">
                                {broadcastTargetIds.map(id => {
                                  const u = allUsers.find(u => u.$id === id);
                                  return u ? (
                                    <div key={id} className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2.5 py-1">
                                      <span className="text-[10px] font-black text-primary">@{u.username}</span>
                                      <button onClick={() => setBroadcastTargetIds(prev => prev.filter(x => x !== id))} className="text-primary/60 hover:text-primary"><X className="h-3 w-3" /></button>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-secondary/20 rounded-2xl p-3 flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-[10px] font-black text-muted-foreground">
                            {broadcastTargetIds.length > 0
                              ? `Sending to ${broadcastTargetIds.length} specific user(s)`
                              : `Sending to ~${allUsers.filter(u => { const f = typeof u.followers === 'number' ? u.followers : parseInt(String(u.followers || '0')); return f >= broadcastFollowerMin && f <= broadcastFollowerMax; }).length} users matching follower filter`}
                          </p>
                        </div>
                      </div>
                    )}

                    {broadcastMode === 'all' && (
                      <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl p-4 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-amber-400">This notification will be sent to all <strong>{allUsers.length}</strong> registered users. Rate limit: 1 broadcast per 24 hours.</p>
                      </div>
                    )}

                    {broadcastSent !== null && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
                        <MailCheck className="h-5 w-5 text-green-400" />
                        <p className="text-sm font-black text-green-400">Broadcast delivered to {broadcastSent} users.</p>
                      </div>
                    )}

                    <Button onClick={handleBroadcast} disabled={isBroadcasting || !broadcastTitle.trim() || !broadcastMessage.trim()} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                      {isBroadcasting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><SendHorizonal className="h-4 w-4 mr-2" />Send Notification</>}
                    </Button>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground px-1">Send History</h4>
                  {broadcastHistory.length > 0 ? broadcastHistory.map((b: any) => (
                    <Card key={b.$id} className="bg-card/40 border-border rounded-3xl p-5 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-sm line-clamp-1">{b.title}</p>
                        <Badge className={cn("text-[8px] font-black uppercase border-none shrink-0", b.target_type === 'ALL' ? "bg-primary/10 text-primary" : "bg-blue-400/10 text-blue-400")}>{b.target_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{b.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-muted-foreground uppercase">{b.recipient_count} recipients</span>
                        <span className="text-[9px] font-black text-muted-foreground">{b.sent_at ? new Date(b.sent_at).toLocaleDateString() : '—'}</span>
                      </div>
                    </Card>
                  )) : (
                    <div className="py-16 text-center bg-card/20 border border-dashed border-border rounded-3xl opacity-40 text-xs font-black uppercase">No broadcasts sent yet</div>
                  )}
                </div>
              </div>
            </div>
          )}


          {activeTab === 'resolution' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                <div className="space-y-1"><h3 className="text-3xl font-black italic uppercase tracking-tighter">Resolution Hub</h3><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Support Ticket Management</p></div>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-destructive/10 text-destructive border-none font-black uppercase">{tickets.filter((t: any) => t.status === 'OPEN').length} Open</Badge>
                  <Badge className="bg-amber-400/10 text-amber-400 border-none font-black uppercase">{tickets.filter((t: any) => t.status === 'IN_REVIEW').length} In Review</Badge>
                  <Badge className="bg-green-500/10 text-green-500 border-none font-black uppercase">{tickets.filter((t: any) => t.status === 'CLOSED').length} Closed</Badge>
                </div>
              </div>
              <div className="space-y-4">
                {tickets.length > 0 ? tickets.map((t: any) => (
                  <Card key={t.$id} className="bg-card/40 border-border rounded-[2.5rem] p-6 sm:p-8 space-y-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-11 w-11 border-2 border-primary/10"><AvatarImage src={t.avatar} /></Avatar>
                        <div>
                          <p className="font-bold text-base">@{t.username}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20">{t.category}</Badge>
                            <Badge className={cn("text-[9px] font-black uppercase border-none", t.priority === 'HIGH' ? "bg-destructive/10 text-destructive" : t.priority === 'MEDIUM' ? "bg-amber-400/10 text-amber-400" : "bg-secondary text-muted-foreground")}>{t.priority}</Badge>
                          </div>
                        </div>
                      </div>
                      <Badge className={cn("text-[9px] font-black uppercase border-none self-start sm:self-auto", t.status === 'OPEN' ? "bg-destructive/10 text-destructive" : t.status === 'IN_REVIEW' ? "bg-amber-400/10 text-amber-400" : "bg-green-500/10 text-green-500")}>{t.status}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      <h5 className="font-black text-base">{t.subject}</h5>
                      <p className="text-sm text-muted-foreground leading-relaxed">{t.message}</p>
                    </div>
                    {t.status !== 'CLOSED' && (
                      <div className="space-y-3">
                        <textarea
                          className="w-full rounded-2xl bg-background/60 border border-border p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
                          rows={2}
                          placeholder="Type a reply to send to this user..."
                          value={ticketReplies[t.$id] || ''}
                          onChange={e => setTicketReplies(prev => ({ ...prev, [t.$id]: e.target.value }))}
                        />
                        <div className="flex gap-3 flex-wrap">
                          {t.status === 'OPEN' && <Button size="sm" className="h-10 rounded-2xl bg-amber-400/10 text-amber-400 hover:bg-amber-400 hover:text-black font-black uppercase text-[10px]" onClick={() => { triggerHaptic(20); handleTicketAction(t.$id, 'IN_REVIEW'); addAuditLog('TICKET_REVIEWED', `Ticket ${t.$id} from @${t.username} moved to review`); toast({ title: "Ticket Under Review" }); }}><Eye className="h-3 w-3 mr-1" />Review</Button>}
                          <Button
                            size="sm"
                            disabled={!ticketReplies[t.$id]?.trim() || sendingReply === t.$id}
                            className="h-10 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-black uppercase text-[10px]"
                            onClick={async () => {
                              triggerHaptic(20);
                              setSendingReply(t.$id);
                              try {
                                await replyToTicket(t.user_id, t.$id, ticketReplies[t.$id]);
                                setTicketReplies(prev => { const n = { ...prev }; delete n[t.$id]; return n; });
                                addAuditLog('TICKET_REPLIED', `Reply sent to @${t.username} for ticket ${t.$id}`);
                                toast({ title: "Reply Sent", description: "User has been notified." });
                              } catch { toast({ variant: 'destructive', title: 'Reply Failed' }); }
                              finally { setSendingReply(null); }
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />{sendingReply === t.$id ? 'Sending...' : 'Send Reply'}
                          </Button>
                          <Button size="sm" className="h-10 rounded-2xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white font-black uppercase text-[10px]" onClick={() => { triggerHaptic(50); handleTicketAction(t.$id, 'CLOSED'); addAuditLog('TICKET_CLOSED', `Ticket ${t.$id} from @${t.username} resolved and closed`); toast({ title: "Ticket Closed" }); }}><Check className="h-3 w-3 mr-1" />Close</Button>
                        </div>
                      </div>
                    )}
                  </Card>
                )) : (<div className="py-24 text-center bg-card/20 rounded-[2.5rem] border border-dashed border-border opacity-40 uppercase text-xs font-black">Resolution queue clear</div>)}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                <div className="space-y-1"><h3 className="text-3xl font-black italic uppercase tracking-tighter">Audit Logs</h3><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Immutable Admin Action Trail</p></div>
                <Badge className="bg-primary/10 text-primary border-none font-black uppercase self-start sm:self-auto">{auditLogs.length} Entries</Badge>
              </div>
              <Card className="bg-card/40 border-border rounded-[2.5rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="border-b border-border text-[9px] font-black text-muted-foreground uppercase tracking-widest bg-secondary/20"><th className="px-8 py-4">Action</th><th className="px-8 py-4">Details</th><th className="px-8 py-4">Performed By</th><th className="px-8 py-4">Timestamp</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {auditLogs.length > 0 ? auditLogs.map((log: any) => (
                        <tr key={log.$id} className="hover:bg-secondary/10 transition-colors">
                          <td className="px-8 py-5">
                            <Badge variant="outline" className={cn("text-[9px] font-black uppercase whitespace-nowrap",
                              log.action.includes('DELETE') || log.action.includes('BAN') || log.action.includes('BREACH') ? "border-destructive/30 text-destructive" :
                              log.action.includes('APPROVED') || log.action.includes('VERIFIED') || log.action.includes('LAUNCHED') ? "border-green-400/30 text-green-400" :
                              log.action.includes('UPDATED') || log.action.includes('REVIEWED') ? "border-blue-400/30 text-blue-400" :
                              "border-border text-muted-foreground"
                            )}>{log.action.replace(/_/g, ' ')}</Badge>
                          </td>
                          <td className="px-8 py-5"><p className="text-xs text-muted-foreground max-w-[280px] truncate">{log.details || '—'}</p></td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <Avatar className="h-6 w-6 border border-primary/10">
                                <AvatarImage src={log.performedByAvatar} />
                                <AvatarFallback className="text-[8px]">{log.performedBy?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] font-black text-foreground">@{log.performedBy || 'system'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 whitespace-nowrap"><span className="text-[10px] font-black text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span></td>
                        </tr>
                      )) : (<tr><td colSpan={4} className="py-24 text-center opacity-40 italic text-xs uppercase">No audit entries found</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter">Staff Management</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Assign & Manage Admin Roles</p>
                </div>
                <Badge className="bg-violet-500/10 text-violet-400 border-none font-black uppercase self-start sm:self-auto">{staff.length} Active Staff</Badge>
              </div>

              <Card className="bg-card/40 border-border rounded-[2.5rem] p-8 shadow-xl space-y-6">
                <h4 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground">Search & Assign Role</h4>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    placeholder="Search username..."
                    className="w-full h-14 bg-secondary/30 border border-border rounded-2xl pl-12 pr-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {staffSearch.trim().length >= 2 && (() => {
                  const query = staffSearch.trim().toLowerCase();
                  const results = connections.filter(c =>
                    c.username?.toLowerCase().includes(query) || c.name?.toLowerCase().includes(query)
                  ).slice(0, 5);
                  return results.length > 0 ? (
                    <div className="space-y-3">
                      {results.map((user: any) => (
                        <div key={user.$id} className="flex items-center justify-between bg-secondary/20 border border-border rounded-2xl p-4 gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-10 w-10 border-2 border-primary/10 shrink-0">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">{user.name}</p>
                              <p className="text-[10px] font-black text-muted-foreground">@{user.username}</p>
                            </div>
                            {user.role && user.role !== 'USER' && (
                              <Badge className="text-[9px] font-black uppercase border-none bg-primary/10 text-primary shrink-0">{user.role}</Badge>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] font-black uppercase rounded-xl border-violet-500/30 text-violet-400 hover:bg-violet-500 hover:text-white transition-all"
                              onClick={async () => {
                                await promoteUser(user.username, 'MODERATOR');
                                addAuditLog('STAFF_PROMOTED', `@${user.username} promoted to MODERATOR`);
                                toast({ title: "Role Assigned", description: `@${user.username} is now a Moderator` });
                              }}
                            >Moderator</Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] font-black uppercase rounded-xl border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white transition-all"
                              onClick={async () => {
                                await promoteUser(user.username, 'FINANCIAL');
                                addAuditLog('STAFF_PROMOTED', `@${user.username} promoted to FINANCIAL`);
                                toast({ title: "Role Assigned", description: `@${user.username} is now Financial Admin` });
                              }}
                            >Financial</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-xs text-muted-foreground uppercase font-black opacity-50">No matching users found</p>
                  );
                })()}
              </Card>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground px-2">Active Staff Roster</h4>
                {staff.length > 0 ? (
                  <Card className="bg-card/40 border-border rounded-[2.5rem] overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="border-b border-border text-[9px] font-black text-muted-foreground uppercase tracking-widest bg-secondary/20"><th className="px-8 py-4">Staff Member</th><th className="px-8 py-4">Role</th><th className="px-8 py-4">Assigned</th><th className="px-8 py-4">Action</th></tr></thead>
                        <tbody className="divide-y divide-border">
                          {staff.map((member: any) => (
                            <tr key={member.$id || member.username} className="hover:bg-secondary/10 transition-colors">
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 border border-primary/10">
                                    <AvatarImage src={member.avatar} />
                                    <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-bold">{member.name}</p>
                                    <p className="text-[10px] font-black text-muted-foreground">@{member.username}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <Badge className={cn("text-[9px] font-black uppercase border-none",
                                  member.role === 'MODERATOR' ? "bg-violet-500/10 text-violet-400" :
                                  member.role === 'FINANCIAL' ? "bg-green-500/10 text-green-400" :
                                  "bg-primary/10 text-primary"
                                )}>{member.role}</Badge>
                              </td>
                              <td className="px-8 py-5"><span className="text-[10px] font-black text-muted-foreground">{member.assignedAt ? new Date(member.assignedAt).toLocaleDateString() : '—'}</span></td>
                              <td className="px-8 py-5">
                                {member.$id !== firstUserId ? (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="text-[10px] font-black uppercase rounded-xl h-8 px-4"
                                    onClick={async () => {
                                      await demoteUser(member.username);
                                      addAuditLog('STAFF_REMOVED', `@${member.username} removed from staff roster`);
                                      toast({ title: "Staff Removed", description: `@${member.username} has been demoted to User` });
                                    }}
                                  >Remove</Button>
                                ) : (
                                  <Badge className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border-none">Protected</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ) : (
                  <div className="py-16 text-center bg-white/40 dark:bg-white/5 border border-dashed border-primary/10 rounded-[2.5rem] opacity-40 uppercase text-xs font-black">No staff assigned yet</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'referrals' && (
            <div className="space-y-6 animate-in fade-in duration-500">

              {/* Header */}
              <div className="flex items-start justify-between flex-wrap gap-4 px-1">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter">Star Network</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Platform-wide referral activity &amp; leaderboard</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFetchingReferrals}
                  onClick={() => {
                    setIsFetchingReferrals(true);
                    Promise.allSettled([
                      databases.listDocuments(DATABASE_ID, COL.USERS, [
                        Query.orderDesc('referral_count'),
                        Query.limit(20),
                      ]),
                      databases.listDocuments(DATABASE_ID, COL.NOTIFICATIONS, [
                        Query.equal('title', 'Referral Bonus!'),
                        Query.orderDesc('$createdAt'),
                        Query.limit(30),
                      ]),
                    ]).then(([leadersRes, activityRes]) => {
                      if (leadersRes.status === 'fulfilled') {
                        const leaders = leadersRes.value.documents.filter((u: any) => (u.referral_count || 0) > 0);
                        setReferralLeaders(leaders);
                        setTotalReferralCount(leaders.reduce((s: number, u: any) => s + (u.referral_count || 0), 0));
                      }
                      if (activityRes.status === 'fulfilled') {
                        setRecentReferralActivity(activityRes.value.documents);
                      }
                    }).catch(() => {}).finally(() => setIsFetchingReferrals(false));
                  }}
                  className="h-10 rounded-2xl border-primary/20 gap-2 font-black uppercase text-[9px] tracking-widest"
                >
                  {isFetchingReferrals ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                  Refresh
                </Button>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    label: "Total Referrals",
                    value: totalReferralCount.toLocaleString(),
                    icon: Users,
                    color: "text-primary",
                    bg: "bg-primary/10",
                    sub: "across all users",
                  },
                  {
                    label: "Stars Awarded",
                    value: (totalReferralCount * 5000).toLocaleString(),
                    icon: Star,
                    color: "text-amber-400",
                    bg: "bg-amber-400/10",
                    sub: "5,000 per referral",
                  },
                  {
                    label: "Top Referrer",
                    value: referralLeaders[0]?.name?.split(' ')[0] ?? '—',
                    icon: Medal,
                    color: "text-yellow-400",
                    bg: "bg-yellow-400/10",
                    sub: referralLeaders[0] ? `${referralLeaders[0].referral_count} referrals` : 'No referrals yet',
                  },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <Card key={card.label} className="rounded-3xl border-border/40 bg-card/60">
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${card.bg} shrink-0`}>
                          <Icon className={`h-6 w-6 ${card.color}`} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{card.label}</p>
                          <p className="text-xl font-black tracking-tight">{isFetchingReferrals ? '—' : card.value}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{card.sub}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {isFetchingReferrals ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Loading Data...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Recent Activity Feed */}
                  <Card className="rounded-3xl border-border/40 overflow-hidden">
                    <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-black uppercase tracking-widest">Recent Activity</CardTitle>
                          <CardDescription className="text-[10px] uppercase tracking-widest">Latest referral sign-ups platform-wide</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    {recentReferralActivity.length === 0 ? (
                      <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                        <Share2 className="h-10 w-10 text-muted-foreground/20" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No referral activity yet</p>
                      </CardContent>
                    ) : (
                      <ScrollArea className="h-[380px]">
                        <div className="divide-y divide-border/30">
                          {recentReferralActivity.map((doc: any) => {
                            const nameMatch = doc.content?.match(/^(.*?)\s\(@/);
                            const usernameMatch = doc.content?.match(/@([\w.]+)\)/);
                            const joinedName = nameMatch?.[1] || 'ViMore User';
                            const joinedUsername = usernameMatch?.[1] || 'user';
                            const timeAgo = (() => {
                              const diff = Math.floor((Date.now() - new Date(doc.$createdAt).getTime()) / 1000);
                              if (diff < 60) return 'Just now';
                              if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                              if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                              return `${Math.floor(diff / 86400)}d ago`;
                            })();
                            return (
                              <div key={doc.$id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                  <span className="text-sm font-black text-primary">{joinedName[0]?.toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black truncate">{joinedName}</p>
                                  <p className="text-[10px] font-bold text-muted-foreground truncate">@{joinedUsername} joined via referral</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <div className="flex items-center gap-1 justify-end">
                                    <Star className="h-3 w-3 text-amber-400 fill-current" />
                                    <span className="text-[10px] font-black text-amber-500">+5,000</span>
                                  </div>
                                  <p className="text-[9px] text-muted-foreground font-medium">{timeAgo}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </Card>

                  {/* Leaderboard */}
                  <Card className="rounded-3xl border-border/40 overflow-hidden">
                    <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-black uppercase tracking-widest">Leaderboard</CardTitle>
                          <CardDescription className="text-[10px] uppercase tracking-widest">Top 20 referrers by count</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    {referralLeaders.length === 0 ? (
                      <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                        <Medal className="h-10 w-10 text-muted-foreground/20" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No referrals yet</p>
                      </CardContent>
                    ) : (
                      <ScrollArea className="h-[380px]">
                        <div className="divide-y divide-border/30">
                          {referralLeaders.map((user: any, i: number) => {
                            const starsEarned = (user.referral_count || 0) * 5000;
                            const rankColor = i === 0 ? "text-yellow-400 bg-yellow-400/10" : i === 1 ? "text-slate-300 bg-slate-300/10" : i === 2 ? "text-amber-600 bg-amber-600/10" : "text-muted-foreground bg-secondary";
                            return (
                              <div key={user.$id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black", rankColor)}>
                                  {i < 3 ? <Medal className="h-4 w-4" /> : i + 1}
                                </div>
                                <Avatar className="h-9 w-9 border border-border shrink-0">
                                  <AvatarImage src={user.avatar} />
                                  <AvatarFallback className="text-xs font-black bg-secondary">{(user.name || '?')[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black truncate">{user.name}</p>
                                  <p className="text-[10px] font-bold text-muted-foreground truncate">@{user.username}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black text-primary">{(user.referral_count || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground font-bold">refs</span></p>
                                  <p className="text-[10px] font-bold text-amber-400">{starsEarned.toLocaleString()} ★</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </Card>

                </div>
              )}

              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 text-center">Each referral awards 5,000 Stars to the referrer. Join links are generated dynamically per user.</p>
            </div>
          )}

          {activeTab === 'tickets' && (
            <AdminTicketTab currentUserId={currentUser?.$id || ''} />
          )}

          {activeTab === 'check_ticket' && (
            <AdminCheckTicketTab />
          )}

          {activeTab === 'treasury' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Header */}
              <div className="flex items-start justify-between flex-wrap gap-4 px-2">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter">Treasury Ledger</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Platform Balance Sheet — Auto-Refreshes Every Hour</p>
                </div>
                <div className="flex items-center gap-3">
                  {treasurySnapshot && (
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Last Snapshot</span>
                      <span className="text-[10px] font-black text-primary">{treasurySnapshot.snapshotTime.toLocaleTimeString()}</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center bg-secondary/40 rounded-2xl px-4 py-2 min-w-[80px]">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Next Refresh</span>
                    <span className="text-sm font-black tabular-nums text-primary">
                      {String(Math.floor(treasuryCountdown / 60)).padStart(2, '0')}:{String(treasuryCountdown % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isFetchingTreasury}
                    onClick={() => { fetchTreasuryData(); }}
                    className="h-10 rounded-2xl border-primary/20 gap-2 font-black uppercase text-[9px] tracking-widest"
                  >
                    {isFetchingTreasury ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                    Refresh
                  </Button>
                </div>
              </div>

              {isFetchingTreasury && !treasurySnapshot && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Scanning All User Nodes...</p>
                </div>
              )}

              {treasurySnapshot && (
                <>
                  {/* Rates Reference */}
                  <div className="flex flex-wrap gap-3 px-2">
                    {[
                      { label: "Gold Rate", value: "$0.01 / Gold", color: "text-amber-500", bg: "bg-amber-500/10" },
                      { label: "Credit Rate", value: "$0.25 / Credit", color: "text-cyan-500", bg: "bg-cyan-500/10" },
                      { label: "LRD Rate", value: "L$190 / $1 USD", color: "text-green-500", bg: "bg-green-500/10" },
                      { label: "Platform Cut", value: "10% per tx", color: "text-primary", bg: "bg-primary/10" },
                    ].map(r => (
                      <div key={r.label} className={`flex items-center gap-2 px-4 py-2 rounded-2xl ${r.bg}`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${r.color}`}>{r.label}</span>
                        <span className={`text-[11px] font-black ${r.color}`}>{r.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        label: "Total User Holdings",
                        value: `$${treasurySnapshot.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        sub: `L$${Math.round(treasurySnapshot.totalLRD).toLocaleString()}`,
                        icon: Globe,
                        color: "text-primary",
                        bg: "bg-primary/10",
                        desc: "Sum of all user Gold + Credit → USD",
                      },
                      {
                        label: "Gold in Circulation",
                        value: `${treasurySnapshot.totalGold.toLocaleString()} GD`,
                        sub: `$${treasurySnapshot.goldUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
                        icon: Coins,
                        color: "text-amber-500",
                        bg: "bg-amber-500/10",
                        desc: "All user gold_balance combined",
                      },
                      {
                        label: "Credits in Circulation",
                        value: `${treasurySnapshot.totalDiamond.toLocaleString()} DM`,
                        sub: `$${treasurySnapshot.diamondUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
                        icon: Gem,
                        color: "text-cyan-500",
                        bg: "bg-cyan-500/10",
                        desc: "All user diamond_balance combined",
                      },
                      {
                        label: "Platform Fees Earned",
                        value: `$${treasurySnapshot.platformFeesUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        sub: `L$${Math.round(treasurySnapshot.platformFeesLRD).toLocaleString()}`,
                        icon: TrendingUp,
                        color: "text-green-500",
                        bg: "bg-green-500/10",
                        desc: "10% cut from gifts, unlocks & subscriptions",
                      },
                    ].map(m => (
                      <Card key={m.label} className="bg-card/40 border-border rounded-[2rem] overflow-hidden group hover:border-primary/20 transition-all">
                        <CardContent className="p-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{m.label}</span>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${m.bg} ${m.color}`}><m.icon className="h-4 w-4" /></div>
                          </div>
                          <div>
                            <p className={`text-2xl font-black italic tracking-tighter ${m.color}`}>{m.value}</p>
                            <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{m.sub}</p>
                          </div>
                          <p className="text-[9px] text-muted-foreground/70 uppercase font-bold tracking-widest leading-relaxed">{m.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Currency breakdown bar */}
                  <Card className="bg-card/40 border-border rounded-[2rem] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black italic uppercase tracking-tighter">Holdings Breakdown</h4>
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{treasurySnapshot.totalUsers.toLocaleString()} Active Nodes</span>
                    </div>
                    {treasurySnapshot.totalUSD > 0 && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                            <span className="text-amber-500">Gold Holdings</span>
                            <span className="text-amber-500">{treasurySnapshot.totalUSD > 0 ? ((treasurySnapshot.goldUSD / treasurySnapshot.totalUSD) * 100).toFixed(1) : 0}%</span>
                          </div>
                          <div className="h-3 bg-secondary/30 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${treasurySnapshot.totalUSD > 0 ? (treasurySnapshot.goldUSD / treasurySnapshot.totalUSD) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                            <span className="text-cyan-500">Credit Holdings</span>
                            <span className="text-cyan-500">{treasurySnapshot.totalUSD > 0 ? ((treasurySnapshot.diamondUSD / treasurySnapshot.totalUSD) * 100).toFixed(1) : 0}%</span>
                          </div>
                          <div className="h-3 bg-secondary/30 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full transition-all duration-700" style={{ width: `${treasurySnapshot.totalUSD > 0 ? (treasurySnapshot.diamondUSD / treasurySnapshot.totalUSD) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50">
                      {[
                        { label: "Gold (GD)", value: treasurySnapshot.totalGold.toLocaleString(), color: "text-amber-500" },
                        { label: "Credit (C)", value: treasurySnapshot.totalDiamond.toLocaleString(), color: "text-cyan-500" },
                        { label: "Stars (ST)", value: treasurySnapshot.totalStar.toLocaleString(), color: "text-yellow-500" },
                        { label: "Combined USD", value: `$${treasurySnapshot.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "text-primary" },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <p className={`text-lg font-black italic tracking-tighter ${s.color}`}>{s.value}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Top 20 holders table */}
                  <Card className="bg-card/40 border-border rounded-[2rem] overflow-hidden">
                    <div className="p-6 border-b border-border">
                      <h4 className="text-sm font-black italic uppercase tracking-tighter">Top 20 Holders by USD Value</h4>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Ranked by combined Gold + Credit balance</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-border text-[9px] font-black text-muted-foreground uppercase tracking-widest bg-secondary/20">
                            <th className="px-6 py-3">#</th>
                            <th className="px-6 py-3">Username</th>
                            <th className="px-6 py-3 text-amber-500">Gold (GD)</th>
                            <th className="px-6 py-3 text-cyan-500">Credit (C)</th>
                            <th className="px-6 py-3 text-right text-primary">USD Value</th>
                            <th className="px-6 py-3 text-right text-green-500">LRD Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {treasurySnapshot.topHolders.map((h, i) => (
                            <tr key={h.username} className="hover:bg-secondary/10 transition-colors">
                              <td className="px-6 py-3">
                                <span className={`text-[10px] font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>#{i + 1}</span>
                              </td>
                              <td className="px-6 py-3">
                                <span className="text-sm font-bold">@{h.username}</span>
                              </td>
                              <td className="px-6 py-3">
                                <span className="text-[11px] font-black text-amber-500">{h.gold.toLocaleString()}</span>
                              </td>
                              <td className="px-6 py-3">
                                <span className="text-[11px] font-black text-cyan-500">{h.diamond.toLocaleString()}</span>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <span className="text-[11px] font-black text-primary">${h.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <span className="text-[11px] font-black text-green-500">L${Math.round(h.usd * 190).toLocaleString()}</span>
                              </td>
                            </tr>
                          ))}
                          {treasurySnapshot.topHolders.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground text-sm font-bold">No user balance data available.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex items-start justify-between flex-wrap gap-4 px-2">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter">Knowledge Bank</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">AI Memory — Everything the AI has learned from user conversations</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoadingKnowledge}
                  onClick={() => fetchKnowledgeEntries(knowledgePage)}
                  className="h-10 rounded-2xl border-primary/20 gap-2 font-black uppercase text-[9px] tracking-widest"
                >
                  {isLoadingKnowledge ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                  Refresh
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Entries", value: knowledgeTotal.toLocaleString(), icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
                  { label: "ViMore Specific", value: knowledgeEntries.filter(e => e.is_vimore_specific).length.toLocaleString(), icon: Sparkles, color: "text-violet-400", bg: "bg-violet-400/10" },
                  { label: "Most Used", value: knowledgeEntries.length > 0 ? Math.max(...knowledgeEntries.map(e => e.usage_count || 0)).toLocaleString() : '0', icon: TrendingUp, color: "text-green-400", bg: "bg-green-400/10" },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <Card key={card.label} className="rounded-3xl border-border/40 bg-card/60">
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${card.bg} shrink-0`}>
                          <Icon className={`h-6 w-6 ${card.color}`} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{card.label}</p>
                          <p className="text-xl font-black tracking-tight">{card.value}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={knowledgeSearch}
                    onChange={e => setKnowledgeSearch(e.target.value)}
                    placeholder="Search questions..."
                    className="w-full h-11 pl-11 pr-4 bg-secondary/30 border border-border/30 rounded-2xl text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
                  />
                </div>
                <select
                  value={knowledgeCategoryFilter}
                  onChange={e => setKnowledgeCategoryFilter(e.target.value)}
                  className="h-11 px-4 bg-secondary/30 border border-border/30 rounded-2xl text-sm font-black text-foreground appearance-none min-w-[160px]"
                >
                  <option value="all">All Categories</option>
                  {['economy','social','content','marketplace','referral','account','moderation','platform','math','science','history','technology','health','business','food','music','sports','language','law','religion','environment','general'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              {isLoadingKnowledge ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Loading Knowledge Bank...</p>
                </div>
              ) : knowledgeEntries.length === 0 ? (
                <Card className="rounded-3xl border-border/40">
                  <CardContent className="flex flex-col items-center justify-center py-24 gap-4">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                      No entries yet. The AI will start learning as users chat with it.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {knowledgeEntries
                    .filter(e => {
                      const matchesSearch = !knowledgeSearch || e.question?.toLowerCase().includes(knowledgeSearch.toLowerCase());
                      const matchesCategory = knowledgeCategoryFilter === 'all' || e.category === knowledgeCategoryFilter;
                      return matchesSearch && matchesCategory;
                    })
                    .map((entry: any) => (
                      <Card key={entry.$id} className="rounded-3xl border-border/40 bg-card/40 overflow-hidden">
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            <div className={cn("h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5", entry.is_vimore_specific ? "bg-violet-500/10" : "bg-primary/10")}>
                              <BookOpen className={cn("h-4 w-4", entry.is_vimore_specific ? "text-violet-400" : "text-primary")} />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <p className="text-sm font-black leading-snug flex-1">{entry.question?.slice(0, 120)}{(entry.question?.length || 0) > 120 ? '...' : ''}</p>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="outline" className="text-[8px] font-black uppercase h-5 px-2 border-border/50">{entry.category || 'general'}</Badge>
                                  {entry.is_vimore_specific && <Badge className="text-[8px] font-black uppercase h-5 px-2 bg-violet-500/10 text-violet-400 border-violet-500/20 border">ViMore</Badge>}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                  <Eye className="h-3 w-3" /> {entry.usage_count || 0} uses
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" /> {Math.round((entry.quality_score || 0) * 100)}% quality
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  {entry.created_at ? new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                </span>
                              </div>
                              {expandedKnowledgeId === entry.$id && (
                                <div className="mt-3 p-4 bg-secondary/20 rounded-2xl border border-border/30 animate-in slide-in-from-top-2 duration-200">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">AI Answer</p>
                                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{entry.answer?.slice(0, 600)}{(entry.answer?.length || 0) > 600 ? '...' : ''}</p>
                                  {entry.keywords?.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                      {entry.keywords.slice(0, 12).map((kw: string) => (
                                        <span key={kw} className="text-[8px] font-black bg-primary/5 border border-primary/10 text-primary/70 rounded-lg px-2 py-0.5">{kw.replace('_', ' ')}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                                onClick={() => setExpandedKnowledgeId(expandedKnowledgeId === entry.$id ? null : entry.$id)}
                              >
                                <ChevronDown className={cn("h-4 w-4 transition-transform", expandedKnowledgeId === entry.$id && "rotate-180")} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive"
                                disabled={deletingKnowledgeId === entry.$id}
                                onClick={() => deleteKnowledgeEntry(entry.$id)}
                              >
                                {deletingKnowledgeId === entry.$id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Showing {Math.min(knowledgeEntries.length, 50)} of {knowledgeTotal} entries
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={knowledgePage === 0 || isLoadingKnowledge}
                        onClick={() => fetchKnowledgeEntries(knowledgePage - 1)}
                        className="h-9 rounded-2xl font-black uppercase text-[9px]"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={(knowledgePage + 1) * 50 >= knowledgeTotal || isLoadingKnowledge}
                        onClick={() => fetchKnowledgeEntries(knowledgePage + 1)}
                        className="h-9 rounded-2xl font-black uppercase text-[9px]"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 text-center pb-4">
                Gemini 2.5 Flash · Knowledge Bank v1 · Only SUPER admins can view or delete entries
              </p>
            </div>
          )}

          {/* ── VERIFICATIONS TAB ── */}
          {activeTab === 'verifications' && (
            <div className="p-6 space-y-6 max-w-2xl mx-auto">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20 shrink-0">
                  <UserVerifyIcon className="h-7 w-7 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">Verification Requests</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Review pending creator verification submissions</p>
                </div>
              </div>

              {isLoadingVerifications ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : pendingVerifications.length === 0 ? (
                <Card className="rounded-3xl border-border/40 bg-card/40">
                  <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
                    <div className="h-16 w-16 rounded-3xl bg-muted/20 flex items-center justify-center">
                      <UserVerifyIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">No Pending Requests</p>
                    <p className="text-xs text-muted-foreground/60 font-medium">All verification requests have been reviewed.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pendingVerifications.map((rec: any) => (
                    <Card key={rec.$id} className="rounded-3xl border-border/40 bg-card/40">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden border border-border/40">
                          {rec.user?.avatar ? (
                            <img src={rec.user.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-lg font-black text-muted-foreground">{(rec.user?.username?.[0] || '?').toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-foreground truncate">@{rec.user?.username ?? rec.user_id}</p>
                          {rec.user?.display_name && (
                            <p className="text-xs text-muted-foreground font-medium truncate">{rec.user.display_name}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] font-black uppercase border-blue-500/30 text-blue-400 px-2 h-4">
                              {rec.amount ?? '?'} {rec.currency ?? 'DIAMOND'}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground/50 font-bold">{rec.$createdAt ? new Date(rec.$createdAt).toLocaleDateString() : ''}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            disabled={isProcessingVerification && verificationActionId === rec.$id}
                            onClick={() => handleApproveVerification(rec.$id)}
                            className="h-9 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[9px]"
                          >
                            {isProcessingVerification && verificationActionId === rec.$id ? <Loader2 className="h-3 w-3 animate-spin" /> : '✓ Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isProcessingVerification}
                            onClick={() => { setVerificationRejectTarget(rec); setVerificationRejectReason(''); }}
                            className="h-9 px-4 rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 font-black uppercase text-[9px]"
                          >
                            ✕ Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Reject Dialog */}
              <Dialog open={!!verificationRejectTarget} onOpenChange={open => { if (!open) { setVerificationRejectTarget(null); setVerificationRejectReason(''); } }}>
                <DialogContent className="rounded-3xl border-border/40 bg-card max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="font-black uppercase tracking-tight">Reject Verification</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Provide a reason. The fee will be refunded automatically.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <Textarea
                      value={verificationRejectReason}
                      onChange={e => setVerificationRejectReason(e.target.value)}
                      placeholder="e.g. Insufficient follower count, profile incomplete..."
                      className="bg-secondary/30 border-none rounded-2xl resize-none min-h-[80px]"
                    />
                  </div>
                  <DialogFooter className="flex gap-3 pt-2">
                    <Button variant="ghost" className="flex-1 h-11 rounded-2xl font-black uppercase text-[10px]" onClick={() => setVerificationRejectTarget(null)}>Cancel</Button>
                    <Button
                      disabled={isProcessingVerification}
                      onClick={handleRejectVerification}
                      className="flex-1 h-11 rounded-2xl bg-destructive text-white font-black uppercase text-[10px] hover:bg-destructive/80"
                    >
                      {isProcessingVerification ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Reject'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ── SYNC TAB (SUPER only) ── */}
          {activeTab === 'sync' && isSuper && (
            <div className="p-6 space-y-6 max-w-2xl mx-auto">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-violet-500/10 rounded-3xl flex items-center justify-center border border-violet-500/20 shrink-0">
                  <RefreshCcw className="h-7 w-7 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">Count Sync</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Repair stored counters for every user account</p>
                </div>
              </div>

              {/* Info card */}
              <Card className="rounded-3xl border-violet-500/20 bg-violet-500/5">
                <CardContent className="p-5 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">What this does</p>
                  <ul className="space-y-2 text-xs text-muted-foreground font-bold">
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />Reads the real follower count for every user from the FOLLOWS collection</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />Reads the real following count from the FOLLOWS collection</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />Reads the real post count from the POSTS collection</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />Updates any user document where the stored counter is out of sync</li>
                  </ul>
                  <p className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest pt-1">Only accounts with mismatched counters are written to. Already-correct accounts are skipped.</p>
                </CardContent>
              </Card>

              {/* Progress */}
              {isSyncing && (
                <Card className="rounded-3xl border-border/40 bg-card/40">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Progress</p>
                      <p className="text-sm font-black text-primary">{syncProgress} / {syncTotal || '…'}</p>
                    </div>
                    <div className="w-full h-2.5 bg-secondary/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-300"
                        style={{ width: syncTotal > 0 ? `${(syncProgress / syncTotal) * 100}%` : '0%' }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold animate-pulse">Syncing accounts… this may take a few minutes for large networks</p>
                  </CardContent>
                </Card>
              )}

              {/* Results */}
              {syncResults && !isSyncing && (
                <div className="grid grid-cols-3 gap-3">
                  <Card className="rounded-3xl border-emerald-500/20 bg-emerald-500/5">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-black text-emerald-400">{syncResults.updated}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Updated</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-3xl border-border/40 bg-card/40">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-black text-muted-foreground">{syncResults.skipped}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Skipped</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-3xl border-destructive/20 bg-destructive/5">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-black text-destructive">{syncResults.errors}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Errors</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Run button */}
              <Button
                onClick={runCountSync}
                disabled={isSyncing}
                className="w-full h-14 rounded-2xl font-black italic uppercase tracking-widest text-sm bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-500/20 transition-all active:scale-[0.98]"
              >
                {isSyncing ? (
                  <><Loader2 className="h-5 w-5 animate-spin mr-2" />Syncing {syncProgress} of {syncTotal}…</>
                ) : (
                  <><RefreshCcw className="h-5 w-5 mr-2" />{syncResults ? 'Run Sync Again' : 'Run Count Sync'}</>
                )}
              </Button>

              {/* Activity log */}
              {syncLog.length > 0 && (
                <Card className="rounded-3xl border-border/40 bg-card/40">
                  <CardContent className="p-5 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Activity Log</p>
                    <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-hide">
                      {syncLog.map((line, i) => (
                        <p key={i} className={cn(
                          "text-[10px] font-mono leading-relaxed",
                          line.startsWith('✓') ? "text-emerald-400" : "text-destructive"
                        )}>{line}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 text-center pb-4">
                Count Sync v1 · SUPER Admin Only · Safe to re-run anytime
              </p>
            </div>
          )}

          {/* ── ACTIVE USERS TAB (SUPER only) ── */}
          {activeTab === 'active_users' && isSuper && (
            <div className="p-6 space-y-6 max-w-5xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                    <Activity className="h-7 w-7 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Active Users</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Daily & Monthly active user intelligence · Super Admin Only</p>
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    setActiveUsersLoading(true);
                    try {
                      const res = await authFetch('/api/admin/active-users');
                      if (res.ok) setActiveUsersData(await res.json());
                    } catch { /* ignore */ } finally { setActiveUsersLoading(false); }
                  }}
                  disabled={activeUsersLoading}
                  variant="outline"
                  className="rounded-2xl border-emerald-500/30 text-emerald-400 font-black uppercase text-[10px] h-10 px-5 hover:bg-emerald-500/10"
                >
                  {activeUsersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCcw className="h-4 w-4 mr-2" />Refresh</>}
                </Button>
              </div>

              {activeUsersLoading && !activeUsersData && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                </div>
              )}

              {activeUsersData && (
                <>
                  {/* DAU / MAU / Total cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="rounded-3xl border-emerald-500/20 bg-emerald-500/5">
                      <CardContent className="p-6 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Daily Active Users</p>
                        <p className="text-5xl font-black text-emerald-400">{activeUsersData.dau.toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-muted-foreground mt-2 uppercase tracking-wider">Today</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-3xl border-violet-500/20 bg-violet-500/5">
                      <CardContent className="p-6 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-2">Monthly Active Users</p>
                        <p className="text-5xl font-black text-violet-400">{activeUsersData.mau.toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-muted-foreground mt-2 uppercase tracking-wider">Last 30 Days</p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-3xl border-border/40 bg-card/40">
                      <CardContent className="p-6 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Total Tracked</p>
                        <p className="text-5xl font-black">{activeUsersData.totalTracked.toLocaleString()}</p>
                        <p className="text-[9px] font-bold text-muted-foreground mt-2 uppercase tracking-wider">All Time Users</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 14-day chart */}
                  <Card className="rounded-3xl border-border/40 bg-card/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-black italic uppercase tracking-widest">14-Day Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={activeUsersData.dailyChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="auGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 9, fontWeight: 700 }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }}
                            formatter={(v: any) => [v, 'Active Users']}
                          />
                          <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#auGrad)" dot={{ r: 3, fill: '#10b981' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* IP Address table */}
                  <Card className="rounded-3xl border-border/40 bg-card/40">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          User IP Intelligence
                        </CardTitle>
                        <div className="relative w-56">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            value={activeUsersIpSearch}
                            onChange={(e) => setActiveUsersIpSearch(e.target.value)}
                            placeholder="Search username or IP…"
                            className="pl-8 h-9 rounded-xl text-xs font-bold bg-secondary/30 border-none"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border/40">
                              <th className="text-left px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">User</th>
                              <th className="text-left px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">IP Address</th>
                              <th className="text-left px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Last Seen</th>
                              <th className="text-left px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell">Device</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeUsersData.userList
                              .filter((u) => {
                                const q = activeUsersIpSearch.toLowerCase();
                                if (!q) return true;
                                return u.username.toLowerCase().includes(q) || u.ip_address.includes(q);
                              })
                              .slice(0, 100)
                              .map((u, i) => (
                                <tr key={u.user_id} className={cn("border-b border-border/20 hover:bg-secondary/20 transition-colors", i % 2 === 0 ? '' : 'bg-secondary/5')}>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-7 w-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                        <span className="text-[10px] font-black text-emerald-400">{u.username[0]?.toUpperCase() || '?'}</span>
                                      </div>
                                      <span className="font-black text-foreground">@{u.username}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <code className="font-mono text-[11px] bg-secondary/30 px-2 py-0.5 rounded-lg text-emerald-400">{u.ip_address}</code>
                                  </td>
                                  <td className="px-5 py-3 text-muted-foreground font-bold">
                                    {new Date(u.last_seen).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="px-5 py-3 text-muted-foreground font-bold hidden md:table-cell max-w-[200px] truncate">
                                    <span className="text-[10px]" title={u.user_agent}>
                                      {u.user_agent
                                        ? u.user_agent.includes('Mobile') ? '📱 Mobile'
                                          : u.user_agent.includes('Tablet') ? '📟 Tablet'
                                          : '🖥 Desktop'
                                        : '—'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {activeUsersData.userList.length === 0 && (
                          <div className="py-16 text-center">
                            <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No activity recorded yet</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">Users will appear here as they visit the app</p>
                          </div>
                        )}
                        {activeUsersData.userList.length > 100 && (
                          <p className="text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground py-3">
                            Showing 100 of {activeUsersData.userList.length} users · Use search to filter
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 text-center pb-4">
                Active User Intelligence v1 · Super Admin Only · Updates on each user visit
              </p>
            </div>
          )}

          {/* ── CLEANUP TAB ── */}
          {activeTab === 'cleanup' && (
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-orange-500/10 rounded-3xl flex items-center justify-center border border-orange-500/20 shrink-0">
                  <RotateCcw className="h-7 w-7 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">Cleanup Center</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Manually reset expired boosts, verifications & campaigns · Moderator + Super Admin</p>
                </div>
              </div>

              {/* Info banner */}
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 text-sm text-orange-300 font-bold leading-relaxed">
                ⚡ These tools let you immediately remove expired flags from the database. The automated cleanup runs every 15 min in the background — use this tab to force an instant reset or send expiry alerts to users right now.
              </div>

              {/* Action cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Cleanup card */}
                <Card className="rounded-3xl border-border/40 bg-card/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-orange-400" />
                      Run Expiry Cleanup
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground font-bold leading-relaxed">
                      Finds all expired boosts, verification badges, and ad campaigns and resets them to inactive — instantly.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cleanupResult && (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Post Boosts Reset', value: cleanupResult.postBoosts, color: 'text-orange-400' },
                          { label: 'Track Boosts Reset', value: cleanupResult.trackBoosts, color: 'text-violet-400' },
                          { label: 'Badges Revoked', value: cleanupResult.verifications, color: 'text-blue-400' },
                          { label: 'Campaigns Ended', value: cleanupResult.campaigns, color: 'text-rose-400' },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-border/30 bg-secondary/20 p-3 text-center">
                            <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {cleanupLastRun && (
                      <p className="text-[10px] font-bold text-muted-foreground">
                        Last run: {cleanupLastRun.toLocaleString()}
                      </p>
                    )}
                    <Button
                      className="w-full rounded-2xl h-11 font-black uppercase text-[11px] bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={isRunningCleanup}
                      onClick={async () => {
                        setIsRunningCleanup(true);
                        try {
                          const res = await authFetch('/api/cron/cleanup');
                          if (res.ok) {
                            const data = await res.json();
                            setCleanupResult(data.reset);
                            setCleanupLastRun(new Date());
                          }
                        } catch { /* ignore */ } finally { setIsRunningCleanup(false); }
                      }}
                    >
                      {isRunningCleanup ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Running…</> : <><RotateCcw className="h-4 w-4 mr-2" />Run Cleanup Now</>}
                    </Button>
                  </CardContent>
                </Card>

                {/* Expiry alerts card */}
                <Card className="rounded-3xl border-border/40 bg-card/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2">
                      <Bell className="h-4 w-4 text-amber-400" />
                      Send Expiry Alerts
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground font-bold leading-relaxed">
                      Notifies users whose boosts or verification badges expire in the next 72 hours — so they can renew before losing visibility.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {alertResult && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Post Owners', value: alertResult.posts, color: 'text-amber-400' },
                          { label: 'Track Owners', value: alertResult.tracks, color: 'text-violet-400' },
                          { label: 'Creators', value: alertResult.users, color: 'text-blue-400' },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-border/30 bg-secondary/20 p-3 text-center">
                            <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">{item.label}</p>
                          </div>
                        ))}
                        <p className="col-span-3 text-[10px] font-bold text-muted-foreground">
                          Alerts already sent in the last 20 hours are skipped automatically.
                        </p>
                      </div>
                    )}
                    <Button
                      className="w-full rounded-2xl h-11 font-black uppercase text-[11px] bg-amber-500 hover:bg-amber-600 text-white"
                      disabled={isRunningAlerts}
                      onClick={async () => {
                        setIsRunningAlerts(true);
                        try {
                          const res = await authFetch('/api/cron/expiry-alerts');
                          if (res.ok) {
                            const data = await res.json();
                            setAlertResult(data.sent);
                          }
                        } catch { /* ignore */ } finally { setIsRunningAlerts(false); }
                      }}
                    >
                      {isRunningAlerts ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending…</> : <><Bell className="h-4 w-4 mr-2" />Send Expiry Alerts Now</>}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* What gets cleaned table */}
              <Card className="rounded-3xl border-border/40 bg-card/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-black italic uppercase tracking-widest">What Gets Cleaned</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="text-left px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Target</th>
                        <th className="text-left px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Condition</th>
                        <th className="text-left px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { target: '🚀 Post Boosts', condition: 'is_boosted = true AND boost_expiry < now', action: 'Set is_boosted = false', color: 'text-orange-400' },
                        { target: '🎵 Track Boosts', condition: 'is_boosted = true AND boost_expiry < now', action: 'Set is_boosted = false', color: 'text-violet-400' },
                        { target: '✅ Verification Badges', condition: 'is_verified = true AND verification_expiry < now', action: 'Set is_verified = false', color: 'text-blue-400' },
                        { target: '📣 Ad Campaigns', condition: 'is_active = true AND expires_at < now', action: 'Set is_active = false', color: 'text-rose-400' },
                      ].map((row) => (
                        <tr key={row.target} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                          <td className="px-5 py-3 font-black text-foreground">{row.target}</td>
                          <td className="px-5 py-3 font-mono text-[10px] text-muted-foreground">{row.condition}</td>
                          <td className={`px-5 py-3 font-black ${row.color}`}>{row.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 text-center pb-4">
                Cleanup Center v1 · Moderator & Super Admin · Auto-runs every 15 min via scheduler
              </p>
            </div>
          )}

          {/* ── SECURITY EVENTS TAB ── */}
          {activeTab === 'security' && (
            <SecurityEventsTab />
          )}
        </div>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-[200] bg-card/95 backdrop-blur-3xl border-t border-border safe-area-bottom">
        <div className="flex overflow-x-auto scrollbar-hide py-2 px-2 gap-1">
          {availableTabs.map((tab) => {
            const { label, icon: Icon } = TABS_DATA[tab];
            const isTabActive = activeTab === tab;
            const mobileBadge =
              tab === 'economy' ? economyAlerts :
              (tab === 'resolution' || tab === 'tickets') ? realtimeOpenTickets :
              0;
            const handleMobileTabClick = () => {
              triggerHaptic(5);
              setActiveTab(tab);
              if (tab === 'economy') resetEconomyBadge();
              if (tab === 'resolution' || tab === 'tickets') resetTicketsBadge();
            };
            return (
              <button
                key={tab}
                onClick={handleMobileTabClick}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all shrink-0 min-w-[56px] relative",
                  isTabActive ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {mobileBadge > 0 && !isTabActive && (
                    <div className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-destructive text-white text-[7px] font-black rounded-full flex items-center justify-center px-0.5 border border-background shadow-sm">
                      {mobileBadge > 9 ? '9+' : mobileBadge}
                    </div>
                  )}
                </div>
                <span className="text-[8px] font-black uppercase tracking-wide leading-none">{label}</span>
              </button>
            );
          })}

          {isSuper && (
            <div className="w-px bg-border/50 self-stretch mx-1" />
          )}

          {isSuper && (
            <Link href="/admin/system" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all shrink-0 min-w-[56px] text-muted-foreground hover:text-foreground hover:bg-secondary/40">
              <Server className="h-5 w-5" />
              <span className="text-[8px] font-black uppercase tracking-wide leading-none">System</span>
            </Link>
          )}

          {(isSuper || isFinancial) && (
            <Link href="/admin/financial-audit" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all shrink-0 min-w-[56px] text-muted-foreground hover:text-foreground hover:bg-secondary/40">
              <Coins className="h-5 w-5" />
              <span className="text-[8px] font-black uppercase tracking-wide leading-none">Finance</span>
            </Link>
          )}
          {isSuper && (
            <Link href="/admin/financial-monitor" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all shrink-0 min-w-[56px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10">
              <Users className="h-5 w-5" />
              <span className="text-[8px] font-black uppercase tracking-wide leading-none">Fin. Mon.</span>
            </Link>
          )}
        </div>
      </nav>

      {selectedReceipt && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <Button variant="ghost" size="icon" className="absolute top-6 right-6 text-white bg-white/10 rounded-full" onClick={() => setSelectedReceipt(null)}><X className="h-6 w-6" /></Button>
          <div className="relative w-full max-w-2xl aspect-[3/4] sm:aspect-video rounded-[2rem] overflow-hidden shadow-2xl border border-white/10"><Image src={selectedReceipt} alt="Receipt Proof" fill className="object-contain" /></div>
          <p className="mt-6 text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Audit Trail Inspector</p>
        </div>
      )}

      {banTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-6" onClick={() => setBanTarget(null)}>
          <div className="bg-card border border-destructive/30 rounded-[2.5rem] p-8 w-full max-w-md space-y-6 shadow-2xl shadow-destructive/20 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-destructive/10 rounded-3xl flex items-center justify-center border border-destructive/20"><UserX className="h-7 w-7 text-destructive" /></div>
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-destructive">Permanent Ban</h3>
                <p className="text-xs font-bold text-muted-foreground">@{banTarget.username} · All content will be purged</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reason</Label>
                <select value={banReason} onChange={e => setBanReason(e.target.value)} className="w-full h-12 bg-secondary/40 border border-border rounded-2xl px-4 text-sm font-bold text-foreground appearance-none">
                  <option>Violation of Community Guidelines</option>
                  <option>Harassment or Hate Speech</option>
                  <option>CSAM or Illegal Content</option>
                  <option>Spam or Bot Activity</option>
                  <option>Identity Fraud</option>
                  <option>Doxxing or Privacy Violation</option>
                  <option>Repeat Policy Offenses</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Internal Note (optional)</Label>
                <Textarea value={banNote} onChange={e => setBanNote(e.target.value)} placeholder="Additional context for the record..." className="bg-secondary/30 border-none rounded-2xl resize-none min-h-[80px] font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-destructive">Type CONFIRM BAN to proceed</Label>
                <Input value={banConfirmText} onChange={e => setBanConfirmText(e.target.value)} placeholder="CONFIRM BAN" className="h-12 bg-destructive/5 border border-destructive/20 rounded-2xl font-black tracking-widest text-sm" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px]" onClick={() => setBanTarget(null)}>Cancel</Button>
              <Button disabled={banConfirmText !== 'CONFIRM BAN' || isBanning} onClick={handleBanUser} className="flex-1 h-12 rounded-2xl bg-destructive text-white font-black uppercase text-[10px] hover:bg-destructive/90">
                {isBanning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Execute Ban'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {suspendTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-6" onClick={() => setSuspendTarget(null)}>
          <div className="bg-card border border-amber-400/20 rounded-[2.5rem] p-8 w-full max-w-md space-y-6 shadow-2xl shadow-amber-400/10 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-amber-400/10 rounded-3xl flex items-center justify-center border border-amber-400/20"><Timer className="h-7 w-7 text-amber-400" /></div>
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-amber-400">Suspend Account</h3>
                <p className="text-xs font-bold text-muted-foreground">@{suspendTarget.username} · Temporary access restriction</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Duration</Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 3, 7, 14, 30, 60].map(d => (
                    <button key={d} onClick={() => setSuspendDays(d)} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all", suspendDays === d ? "bg-amber-400/10 border-amber-400/40 text-amber-400" : "border-border text-muted-foreground hover:border-amber-400/30")}>{d}d</button>
                  ))}
                  <div className="flex items-center gap-2 border border-border rounded-xl px-3">
                    <Input type="number" value={suspendDays} onChange={e => setSuspendDays(Math.max(1, Number(e.target.value)))} className="w-12 h-8 border-none bg-transparent font-black text-center p-0 text-sm" min={1} max={365} />
                    <span className="text-[9px] font-black text-muted-foreground uppercase">days</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reason</Label>
                <select value={suspendReason} onChange={e => setSuspendReason(e.target.value)} className="w-full h-12 bg-secondary/40 border border-border rounded-2xl px-4 text-sm font-bold text-foreground appearance-none">
                  <option>Repeated Policy Violations</option>
                  <option>Harassment</option>
                  <option>Spam</option>
                  <option>Misleading Content</option>
                  <option>Pending Investigation</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Message to User *</Label>
                <Textarea value={suspendMessage} onChange={e => setSuspendMessage(e.target.value)} placeholder="Explain to the user why they are suspended and what they need to do..." className="bg-secondary/30 border-none rounded-2xl resize-none min-h-[90px] font-medium" />
              </div>
              <div className="bg-secondary/20 rounded-2xl p-3 text-[10px] font-bold text-muted-foreground">
                Access locked until: <span className="text-amber-400">{new Date(Date.now() + suspendDays * 86400000).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px]" onClick={() => setSuspendTarget(null)}>Cancel</Button>
              <Button disabled={!suspendMessage.trim() || isSuspending} onClick={handleSuspendUser} className="flex-1 h-12 rounded-2xl bg-amber-400 text-black font-black uppercase text-[10px] hover:bg-amber-300">
                {isSuspending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Suspend ${suspendDays}d`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {warnTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-6" onClick={() => setWarnTarget(null)}>
          <div className="bg-card border border-border rounded-[2.5rem] p-8 w-full max-w-md space-y-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20"><AlertOctagon className="h-7 w-7 text-primary" /></div>
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Issue Warning</h3>
                <p className="text-xs font-bold text-muted-foreground">@{warnTarget.username} · Formal in-app notice</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Severity</Label>
                <div className="flex gap-3">
                  {(['SOFT', 'FINAL'] as const).map(s => (
                    <button key={s} onClick={() => setWarnSeverity(s)} className={cn("flex-1 py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all", warnSeverity === s ? (s === 'FINAL' ? "bg-destructive/10 border-destructive/40 text-destructive" : "bg-primary/10 border-primary/40 text-primary") : "border-border text-muted-foreground hover:border-primary/30")}>
                      {s === 'SOFT' ? '⚠ Soft Warning' : '🚨 Final Warning'}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] font-bold text-muted-foreground pl-1">{warnSeverity === 'FINAL' ? 'Final warning — next violation will result in ban.' : 'Standard notice. User has been cautioned.'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Warning Message *</Label>
                <Textarea value={warnMessage} onChange={e => setWarnMessage(e.target.value)} placeholder="Describe the violation and expected behavior..." className="bg-secondary/30 border-none rounded-2xl resize-none min-h-[100px] font-medium" maxLength={500} />
                <p className="text-[9px] text-muted-foreground text-right">{warnMessage.length}/500</p>
              </div>
              <div className="bg-secondary/20 rounded-2xl p-3 text-[10px] font-bold text-muted-foreground">
                Warning count after this action: <span className={cn("font-black", (warnTarget.warningCount || 0) + 1 >= 3 ? "text-destructive" : "text-amber-400")}>{(warnTarget.warningCount || 0) + 1}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px]" onClick={() => setWarnTarget(null)}>Cancel</Button>
              <Button disabled={!warnMessage.trim() || isWarning} onClick={handleWarnUser} className="flex-1 h-12 rounded-2xl bg-primary text-white font-black uppercase text-[10px] hover:opacity-90">
                {isWarning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Issue Warning'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Approve/Reject Dialog */}
      <Dialog open={!!withdrawalActionTarget} onOpenChange={(o) => { if (!o) setWithdrawalActionTarget(null); }}>
        <DialogContent className="bg-card border-border rounded-[2.5rem] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">
              {withdrawalActionTarget?.action === 'APPROVED' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {withdrawalActionTarget?.action === 'APPROVED'
                ? 'Confirm you have processed the payment. Upload a proof screenshot (optional) and add a message for the user.'
                : 'Provide a reason for rejecting this withdrawal request. The user will be notified and their balance refunded.'}
            </p>
            {withdrawalActionTarget?.action === 'APPROVED' && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Proof Screenshot (Optional)</Label>
                {withdrawalProofPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-green-500/30">
                    <img src={withdrawalProofPreview} alt="Proof" className="w-full h-32 object-cover" />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-7 w-7 bg-black/60 hover:bg-black/80 text-white rounded-full"
                      onClick={() => { setWithdrawalProofFile(null); setWithdrawalProofPreview(null); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 rounded-2xl border-2 border-dashed border-border/50 hover:border-green-500/50 cursor-pointer transition-colors bg-secondary/20 hover:bg-green-500/5">
                    <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload Screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setWithdrawalProofFile(file);
                          setWithdrawalProofPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {withdrawalActionTarget?.action === 'APPROVED' ? 'Message (Optional)' : 'Rejection Reason'}
              </Label>
              <Textarea
                value={withdrawalAdminMessage}
                onChange={(e) => setWithdrawalAdminMessage(e.target.value)}
                placeholder={withdrawalActionTarget?.action === 'APPROVED'
                  ? 'e.g. Payment sent via Mobile Money...'
                  : 'e.g. Account details could not be verified...'}
                className="bg-secondary/30 border-none rounded-2xl resize-none min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="ghost" className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px]" onClick={() => setWithdrawalActionTarget(null)}>Cancel</Button>
            <Button
              disabled={isProcessingWithdrawal || (withdrawalActionTarget?.action === 'REJECTED' && !withdrawalAdminMessage.trim())}
              onClick={handleConfirmWithdrawal}
              className={`flex-1 h-12 rounded-2xl font-black uppercase text-[10px] ${withdrawalActionTarget?.action === 'APPROVED' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-destructive text-white hover:bg-destructive/80'}`}
            >
              {isProcessingWithdrawal ? <Loader2 className="h-4 w-4 animate-spin" /> : (withdrawalActionTarget?.action === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Approve/Reject Dialog */}
      <Dialog open={!!paymentActionTarget} onOpenChange={(o) => { if (!o) setPaymentActionTarget(null); }}>
        <DialogContent className="bg-card border-border rounded-[2.5rem] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">
              {paymentActionTarget?.action === 'APPROVED' ? 'Approve Payment' : 'Reject Payment'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {paymentActionTarget?.action === 'APPROVED'
                ? 'Confirm this payment screenshot is valid and approve the top-up.'
                : 'Provide a reason for rejecting this payment request.'}
            </p>
            {paymentActionTarget?.action === 'REJECTED' && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rejection Reason</Label>
                <Textarea
                  value={paymentRejectReason}
                  onChange={(e) => setPaymentRejectReason(e.target.value)}
                  placeholder="e.g. Screenshot is unclear, invalid reference..."
                  className="bg-secondary/30 border-none rounded-2xl resize-none min-h-[80px]"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-3">
            <Button variant="ghost" className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px]" onClick={() => setPaymentActionTarget(null)}>Cancel</Button>
            <Button
              disabled={isProcessingPayment || (paymentActionTarget?.action === 'REJECTED' && !paymentRejectReason.trim())}
              onClick={handleConfirmPayment}
              className={`flex-1 h-12 rounded-2xl font-black uppercase text-[10px] ${paymentActionTarget?.action === 'APPROVED' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-destructive text-white hover:bg-destructive/80'}`}
            >
              {isProcessingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : (paymentActionTarget?.action === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
