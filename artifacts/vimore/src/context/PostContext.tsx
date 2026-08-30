'use client';

import { createContext, useContext, useState, useRef, startTransition, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  account, databases, client, ID, Query, Models,
  COL, BUCKET, DATABASE_ID,
  getFileUrl, extractFileId, formatTimeAgo, avatarFallback, toProxyUrl,
} from '@/lib/appwrite';
import { BUCKET_STORIES, storage } from '@/lib/appwrite';

import { formatErrorDescription, logAppwriteError } from '@/lib/appwrite-error';
import { authFetch } from '@/lib/auth-fetch';
import { offlineCache } from '@/lib/offline-cache';
import { firePush } from '@/lib/push-fire';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  hapticIntensity: number;
  isGhostMode: boolean;
  playbackQuality: 'standard' | 'pro-hd';
  fontScale: number;
  isAutoFollowEnabled: boolean;
  activeSoundSet: 'cyberpunk' | 'lofi';
  isBiometricActive: boolean;
  isHardwareEnrolled: boolean;
  biometricProtectedAreas: string[];
  taggingPrivacy: 'everyone' | 'friends';
  discoveryVisibility: 'everyone' | 'mutual';
  showReadReceipts: boolean;
  legacyContact: string | null;
  isSilenceActive: boolean;
  silenceStart: string;
  silenceEnd: string;
  defaultStream: 'foryou' | 'following';
  goldRate: number;
  diamondRate: number;
  ldMultiplier: number;
  isMusicEnabled: boolean;
  isFreeMode?: boolean;
  isGiftingEnabled: boolean;
  isAiVerificationActive: boolean;
  isSensitivityFilterActive: boolean;
}

export interface User {
  $id: string;
  name: string;
  username: string;
  vimoreId?: string;
  display_name?: string;
  diamond_balance?: number;
  $createdAt?: string;
  phone?: string;
  avatar: string;
  cover?: string;
  isVerified?: boolean;
  followers?: string | number;
  following?: string | number;
  friendsCount?: number;
  posts?: string | number;
  bio?: string;
  category?: string;
  gender?: 'Male' | 'Female';
  nationality?: string;
  dateOfBirth?: string;
  goldBalance?: number;
  diamondBalance?: number;
  creditBalance?: number;
  starBalance?: number;
  referralCount?: number;
  role?: 'SUPER' | 'FINANCIAL' | 'MODERATOR' | 'USER';
  joinDate?: string;
  isEmailVerified?: boolean;
  hasEverBeenVerified?: boolean;
  verificationExpiry?: number;
  language?: string;
  introUrl?: string;
  status?: 'active' | 'suspended' | 'banned';
  suspendedUntil?: string;
  suspensionReason?: string;
  suspensionMessage?: string;
  warningCount?: number;
}

export interface StorySegment {
  $id: string;
  type: 'image' | 'video' | 'text';
  mediaUrl?: string;
  text?: string;
  duration?: number;
  overlays?: any[];
  poll?: { options: string[]; votes: number[] };
  orderIndex?: number;
  postId?: string;
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

export interface Post {
  $id: string;
  $createdAt?: string;
  user: User;
  content: string;
  time: string;
  likes: number;
  unlikes: number;
  comments: number;
  shares: number;
  views: number;
  image?: string;
  images?: string[];
  videoUrl?: string;
  theme?: string;
  imageFilter?: string;
  feeling?: string;
  location?: string;
  commentsDisabled?: boolean;
  poll?: any;
  isLocked?: boolean;
  unlockPrice?: number;
  isBoosted?: boolean;
  boostTargetViews?: number;
  boostCurrentViews?: number;
  boostExpiry?: number;
  commentNodes?: PostComment[];
  sharedPost?: Post;
  type?: string;
  timestamp?: string | number;
  mediaUrls?: string[];
  isPinned?: boolean;
  hashtags?: string[];
  taggedUsers?: string[];
  linkPreview?: LinkPreview | null;
}

export interface PostComment {
  $id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  time: string;
  parentId?: string;
  timestamp: number;
}

export interface Cluster {
  $id: string;
  name: string;
  adminUsername: string;
  avatar?: string;
  cover?: string;
  isAddLocked?: boolean;
  members: User[];
  isGroup: true;
}

export interface Connection extends User {
  followsYou?: boolean;
  isGroup: false;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  lastMessage?: string;
  lastTime?: string;
}

export interface SharedPostData {
  postId: string;
  postImage?: string;
  postVideo?: string;
  postContent?: string;
  postAuthorName?: string;
  postAuthorAvatar?: string;
  postAuthorUsername?: string;
}

export interface ChatMessage {
  $id: string;
  sender: "me" | "them";
  isMe?: boolean;
  senderName?: string;
  senderAvatar?: string;
  senderId: string;
  text?: string;
  time: string;
  status: "sent" | "delivered" | "read";
  type: "text" | "photo" | "video" | "link" | "voice" | "tag" | "workspace" | "post";
  mediaUrl?: string;
  voiceDuration?: string;
  isViewOnce?: boolean;
  isViewed?: boolean;
  isDownloaded?: boolean;
  reactions?: string[];
  createdAt?: number;
  postId?: string;
  sharedPostData?: SharedPostData;
  replyToId?: string;
  replyToText?: string;
  replyToSenderName?: string;
  replyToType?: string;
}

interface PostContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  posts: Post[];
  hasMoreFeed: boolean;
  isFeedLoading: boolean;
  loadMoreFeed: () => Promise<void>;
  activeComments: PostComment[];
  isLoading: boolean;
  initError: string | null;
  isOffline: boolean;
  likedPostIds: Set<string>;
  unlikedPostIds: Set<string>;
  savedPostIds: Set<string>;
  unlockedPostIds: Set<string>;
  seenPostIds: Set<string>;
  followingUsernames: Set<string>;
  followingUserIds: Set<string>;
  followerUsernames: Set<string>;
  friendUsernames: Set<string>;
  postCountOverrides: Record<string, { likes?: number; unlikes?: number; comments?: number; shares?: number }>;
  applyPostCountUpdate: (postId: string, update: { likes?: number; unlikes?: number; comments?: number; shares?: number }) => void;
  streamedComments: PostComment[];
  addStreamedComment: (comment: PostComment) => void;
  clearStreamedComments: () => void;
  sentRequestUsernames: Set<string>;
  receivedRequestUsernames: Set<string>;
  acceptedStrangerUsernames: Set<string>;
  activeStoryIndex: number | null;
  selectedPostId: string | null;
  selectedChatId: string | null;
  selectedImageUrl: string | null;
  selectedVideoUrl: string | null;
  isSearchOpen: boolean;
  isGiftHubOpen: boolean;
  targetUserForGift: User | null;
  activeCommentPostId: string | null;
  settings: AppSettings;
  gatewaySettings: any;
  stories: any[];
  campaigns: any[];
  reports: any[];
  tickets: any[];
  mutedUserNames: string[];
  connections: Connection[];
  clusters: Cluster[];
  auditLogs: any[];
  staff: any[];
  adStats: any;
  intelligenceMetrics: any;
  withdrawalHistory: any[];
  paymentRequests: any[];
  referralLink: string;
  pendingTransaction: any;
  activeSubscriptions: Set<string>;
  chatMessages: Record<string, ChatMessage[]>;
  login: (identifier: string, p: string) => Promise<{ success: boolean; message?: string; requiresVerification?: boolean }>;
  signup: (d: any) => Promise<{ success: boolean; message?: string; requiresVerification?: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (userId: string, secret: string, password: string) => Promise<void>;
  checkSession: () => Promise<void>;
  uploadMedia: (file: File, bucketId?: string) => Promise<string>;
  addPost: (post: any) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  editPost: (postId: string, updates: { content?: string; hashtags?: string[] }) => Promise<void>;
  deleteMessage: (messageId: string, chatId: string) => Promise<void>;
  editMessage: (messageId: string, chatId: string, newText: string) => Promise<void>;
  toggleLikePost: (postId: string) => Promise<void>;
  toggleUnlikePost: (postId: string) => Promise<void>;
  toggleSavePost: (postId: string) => void;
  updateCurrentUser: (data: Partial<User>) => Promise<void>;
  updateSettings: (data: Partial<AppSettings>) => void;
  setSearchOpen: (open: boolean) => void;
  setSelectedChatId: (id: string | null) => void;
  setSelectedPostId: (id: string | null) => void;
  setSelectedImageUrl: (url: string | null) => void;
  setSelectedVideoUrl: (url: string | null) => void;
  openCommentHub: (postId: string) => void;
  closeCommentHub: () => void;
  openGiftHub: (user: User) => void;
  closeGiftHub: () => void;
  setActiveStoryIndex: (index: number | null) => void;
  triggerHaptic: (intensity?: number) => void;
  isPostLiked: (postId: string) => boolean;
  isPostUnliked: (postId: string) => boolean;
  isPostSaved: (postId: string) => boolean;
  isPostUnlocked: (postId: string) => boolean;
  isFollowing: (username: string) => boolean;
  toggleFollowUser: (username: string) => Promise<void>;
  isFriend: (username: string) => boolean;
  isRequestSent: (username: string) => boolean;
  isRequestReceived: (username: string) => boolean;
  sendFriendRequest: (username: string) => Promise<void>;
  confirmFriendRequest: (username: string) => Promise<void>;
  cancelFriendRequest: (username: string) => Promise<void>;
  unfriendUser: (username: string) => Promise<void>;
  acceptMessageRequest: (username: string) => Promise<void>;
  declineMessageRequest: (username: string) => Promise<void>;
  isSubscribed: (username: string) => boolean;
  addComment: (postId: string, text: string) => Promise<void>;
  addReply: (postId: string, parentId: string, text: string) => Promise<void>;
  addStory: (segment: any) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  voteOnStoryPoll: (storyId: string, segmentId: string, optionIndex: number) => Promise<void>;
  voteOnPostPoll: (postId: string, optionIndex: number) => Promise<void>;
  toggleMuteUser: (username: string) => void;
  togglePinPost: (postId: string) => Promise<void>;
  archivePost: (postId: string) => Promise<void>;
  addAuditLog: (action: string, details: string) => Promise<void>;
  initiateTransaction: (data: any) => void;
  cancelTransaction: () => void;
  createPaymentRequest: (screenshot: string) => Promise<void>;
  approvePaymentRequest: (id: string) => Promise<void>;
  rejectPaymentRequest: (id: string) => Promise<void>;
  recordWithdrawal: (node: any) => Promise<void>;
  processWithdrawal: (id: string, status: 'APPROVED' | 'REJECTED', adminMessage?: string, proofImageUrl?: string) => Promise<void>;
  verifyUser: (cost: number, currency: 'DIAMOND' | 'STAR') => Promise<void>;
  processGiftTransaction: (cost: number, currency: 'GOLD' | 'DIAMOND') => Promise<void>;
  unlockPost: (postId: string, cost: number) => Promise<void>;
  subscribeToCreator: (username: string, cost: number) => Promise<void>;
  cancelSubscription: (username: string) => Promise<void>;
  incrementShareCount: (postId: string) => Promise<void>;
  viewedPostIds: Set<string>;
  createCluster: (name: string, members: any[], logoFile?: File) => Promise<void>;
  addMemberToCluster: (clusterId: string, member: any) => Promise<void>;
  leaveCluster: (clusterId: string) => Promise<void>;
  updateCluster: (clusterId: string, updates: { name?: string; cover?: string; isAddLocked?: boolean; avatarId?: string; coverId?: string }) => Promise<void>;
  promoteUser: (username: string, role: any) => Promise<void>;
  demoteUser: (username: string) => Promise<void>;
  addCampaign: (data: any) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  toggleCampaignStatus: (id: string) => Promise<void>;
  recordCampaignClick: (id: string) => Promise<void>;
  recordCampaignImpression: (id: string) => Promise<void>;
  buyVerificationBadge: () => Promise<{ status: 'success' | 'already_verified' | 'insufficient_balance'; expiry?: number; balance?: number }>;
  refreshAdminData: () => Promise<void>;
  fetchProfileByUsername: (username: string) => Promise<User | null>;
  searchAllUsers: (query: string) => Promise<User[]>;
  fetchComments: (postId: string) => Promise<void>;
  refreshProfiles: () => Promise<any[]>;
  refreshClusters: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  refreshStories: () => Promise<void>;
  recordView: (postId: string) => Promise<void>;
  recordStoryView: (storyId: string) => Promise<void>;
  updateUserIdentity: (userId: string, data: Partial<User>) => Promise<void>;
  handleReportAction: (reportId: string, action: any) => Promise<void>;
  handleTicketAction: (ticketId: string, status: any) => Promise<void>;
  replyToTicket: (ticketUserId: string, ticketId: string, reply: string) => Promise<void>;
  submitTicket: (data: { subject: string; message: string; category: string; priority?: string }) => Promise<void>;
  sendChatMessage: (recipientId: string, message: Partial<ChatMessage>) => Promise<void>;
  sendMessageRequest: (targetUserId: string, targetUser: User, text: string) => Promise<void>;
  purgeVibeCache: () => Promise<void>;
  archiveIdentityNode: () => Promise<void>;
  boostNode: (nodeId: string, duration: number, currency: 'CREDIT', type: 'POST' | 'SONIC') => Promise<void>;
  enrollHardwareBiometrics: () => Promise<boolean>;
  verifyHardwareBiometrics: () => Promise<boolean>;
  blockUser: (username: string) => Promise<void>;
  unblockUser: (username: string) => Promise<void>;
  blockedUsernames: string[];
  submitReport: (data: { reportedUsername: string; reason: string; details: string }) => Promise<void>;
  adminDeleteProduct: (productId: string) => Promise<void>;
  boostMarketplaceListing: (productId: string, diamonds: number) => Promise<string>;
  fetchAllUsersForDiscovery: () => Promise<User[]>;
  allUsers: User[];
  refreshAllUsers: () => Promise<void>;
  banUser: (userId: string, reason: string, note?: string) => Promise<void>;
  suspendUser: (userId: string, days: number, reason: string, message: string) => Promise<void>;
  warnUser: (userId: string, message: string, severity: 'SOFT' | 'FINAL') => Promise<void>;
  sendAdminBroadcast: (opts: { title: string; message: string; actionUrl?: string; targetUserIds: string[] | 'all' }) => Promise<number>;
  broadcastHistory: any[];
  addIncomingMessage: (clusterId: string, message: ChatMessage, preview: string, timeStr: string) => void;
  markChatMessagesRead: (chatId: string) => void;
  applyRemotePostEdit: (postId: string, content: string) => void;
  applyReadReceipt: (storageKey: string, lastReadAt: string, docId: string) => void;
  applyClusterMemberReceipt: (clusterId: string, userId: string, lastReadAt: string) => void;
  refreshSocialGraph: () => Promise<void>;
  chatLastMessageAt: Record<string, number>;
  chatLastIncomingAt: Record<string, number>;
  chatReadReceipts: Record<string, string>;
  clusterMemberReceipts: Record<string, Record<string, string>>;
  chatUnreadCounts: Record<string, number>;
  fetchProfilePosts: (userId: string, cursor?: string | null) => Promise<{ posts: Post[]; cursor: string | null; hasMore: boolean }>;
  fetchReels: (params: { phase: 'connections' | 'global'; connIds: string[]; connCursor: string | null; globalCursor: string | null }) => Promise<{ posts: Post[]; phase: 'connections' | 'global'; connCursor: string | null; globalCursor: string | null; hasMore: boolean }>;
  updateConnectionPresence: (userId: string, isOnline: boolean, lastSeenAt: string | null) => void;
  onlineUserIds: Set<string>;
  updateUserOnlineStatus: (userId: string, isOnline: boolean) => void;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

const INITIAL_SETTINGS: AppSettings = {
  theme: 'light', hapticIntensity: 50, isGhostMode: false, playbackQuality: 'standard',
  fontScale: 1, isAutoFollowEnabled: true, activeSoundSet: 'cyberpunk', isBiometricActive: false,
  isHardwareEnrolled: false, biometricProtectedAreas: ['messages', 'earnings', 'currency'],
  taggingPrivacy: 'everyone', discoveryVisibility: 'everyone',
  showReadReceipts: true, legacyContact: null, isSilenceActive: false, silenceStart: "22:00",
  silenceEnd: "07:00", defaultStream: 'foryou', goldRate: 0.01, diamondRate: 0.25,
  ldMultiplier: 190, isMusicEnabled: true, isGiftingEnabled: true,
  isAiVerificationActive: true, isSensitivityFilterActive: false,
};

const OFFICIAL_GATEWAY = {
  orangeName: "Amos Kortu",
  orangeNumber: "+231778451835",
  mtnName: "Amos Kortu",
  mtnNumber: "+231889322188",
};

function mapDocToUser(authUser: Models.User<Models.Preferences>, doc: Models.Document): User {
  return {
    $id: authUser.$id,
    name: doc.name || authUser.name,
    username: doc.username || '',
    vimoreId: authUser.email,
    phone: doc.phone || undefined,
    avatar: doc.avatar_id ? getFileUrl(BUCKET.AVATARS, doc.avatar_id) : avatarFallback(doc.name || authUser.name),
    cover: doc.cover_id ? getFileUrl(BUCKET.COVERS, doc.cover_id) : undefined,
    isVerified: doc.is_verified || false,
    isEmailVerified: authUser.emailVerification,
    followers: doc.followers_count || 0,
    following: doc.following_count || 0,
    friendsCount: doc.friends_count || 0,
    posts: doc.posts_count || 0,
    bio: doc.bio || '',
    category: doc.category || '',
    gender: doc.gender as 'Male' | 'Female' | undefined,
    nationality: doc.nationality || '',
    dateOfBirth: doc.date_of_birth || '',
    goldBalance: doc.gold_balance || 0,
    diamondBalance: doc.diamond_balance || 0,
    creditBalance: doc.credit_balance ?? doc.diamond_balance ?? 0,
    starBalance: doc.star_balance || 0,
    referralCount: doc.referral_count || 0,
    role: (doc.role as 'SUPER' | 'FINANCIAL' | 'MODERATOR' | 'USER') || 'USER',
    joinDate: doc.join_date || authUser.$createdAt,
    hasEverBeenVerified: doc.has_ever_been_verified || false,
    verificationExpiry: doc.verification_expiry || undefined,
    language: doc.language || '',
    status: (doc.status as 'active' | 'suspended' | 'banned') || 'active',
    suspendedUntil: doc.suspended_until || undefined,
    suspensionReason: doc.suspension_reason || undefined,
    suspensionMessage: doc.suspension_message || undefined,
    warningCount: doc.warning_count || 0,
  };
}

function mapProfileDocToUser(doc: Models.Document): User {
  return {
    $id: doc.$id,
    name: doc.name || '',
    username: doc.username || '',
    vimoreId: doc.email || '',
    avatar: doc.avatar_id ? getFileUrl(BUCKET.AVATARS, doc.avatar_id) : avatarFallback(doc.name || 'U'),
    cover: doc.cover_id ? getFileUrl(BUCKET.COVERS, doc.cover_id) : undefined,
    isVerified: doc.is_verified || false,
    followers: doc.followers_count || 0,
    following: doc.following_count || 0,
    friendsCount: doc.friends_count || 0,
    posts: doc.posts_count || 0,
    bio: doc.bio || '',
    category: doc.category || '',
    gender: doc.gender as 'Male' | 'Female' | undefined,
    nationality: doc.nationality || '',
    dateOfBirth: doc.date_of_birth || '',
    goldBalance: doc.gold_balance || 0,
    diamondBalance: doc.diamond_balance || 0,
    creditBalance: doc.credit_balance ?? doc.diamond_balance ?? 0,
    starBalance: doc.star_balance || 0,
    referralCount: doc.referral_count || 0,
    role: (doc.role as 'SUPER' | 'FINANCIAL' | 'MODERATOR' | 'USER') || 'USER',
    joinDate: doc.join_date || doc.$createdAt,
    hasEverBeenVerified: doc.has_ever_been_verified || false,
    verificationExpiry: doc.verification_expiry || undefined,
    language: doc.language || '',
    status: (doc.status as 'active' | 'suspended' | 'banned') || 'active',
    suspendedUntil: doc.suspended_until || undefined,
    suspensionReason: doc.suspension_reason || undefined,
    suspensionMessage: doc.suspension_message || undefined,
    warningCount: doc.warning_count || 0,
  };
}

const THEME_ID_TO_CLASS: Record<string, string> = {
  'none': '',
  'purple-grad': 'bg-gradient-to-br from-primary to-accent text-white',
  'ocean': 'bg-gradient-to-br from-blue-400 to-emerald-400 text-white',
  'sunset': 'bg-gradient-to-br from-orange-500 to-rose-500 text-white',
  'royal': 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white',
  'midnight': 'bg-gradient-to-br from-slate-900 to-slate-700 text-white',
};

function mapDocToPost(doc: Models.Document, authorDoc?: Models.Document): Post {
  const imageIds: string[] = Array.isArray(doc.image_ids) ? doc.image_ids : (doc.image_id ? [doc.image_id] : []);
  const images = imageIds.map((id: string) => getFileUrl(BUCKET.POST_MEDIA, id));
  const videoId = doc.video_id;
  const isReel = doc.type === 'reel';

  const author: User = authorDoc ? {
    $id: doc.user_id,
    name: authorDoc.name || 'Unknown',
    username: authorDoc.username || 'unknown',
    avatar: authorDoc.avatar_id ? getFileUrl(BUCKET.AVATARS, authorDoc.avatar_id) : avatarFallback(authorDoc.name || 'U'),
    isVerified: authorDoc.is_verified || false,
  } : {
    $id: doc.user_id,
    name: 'Unknown',
    username: 'unknown',
    avatar: avatarFallback('U'),
    isVerified: false,
  };

  let poll = undefined;
  if (doc.poll) {
    try { poll = typeof doc.poll === 'string' ? JSON.parse(doc.poll) : doc.poll; } catch { /* ignore */ }
  }

  return {
    $id: doc.$id,
    $createdAt: doc.$createdAt,
    user: author,
    content: doc.content || '',
    time: formatTimeAgo(doc.$createdAt),
    likes: doc.likes_count || 0,
    unlikes: doc.unlikes_count || 0,
    comments: doc.comments_count || 0,
    shares: doc.shares_count || 0,
    views: doc.views_count || 0,
    image: images[0],
    images: images.length > 0 ? images : undefined,
    videoUrl: isReel && doc.media_url
      ? getFileUrl(BUCKET.REEL_MEDIA, doc.media_url)
      : (videoId ? getFileUrl(BUCKET.POST_MEDIA, videoId) : undefined),
    type: doc.type,
    theme: doc.theme ? (THEME_ID_TO_CLASS[doc.theme] ?? doc.theme) : undefined,
    imageFilter: doc.image_filter,
    feeling: doc.feeling,
    location: doc.location,
    commentsDisabled: doc.comments_disabled || false,
    isLocked: doc.is_locked || false,
    unlockPrice: doc.unlock_price,
    boostExpiry: doc.boost_expiry ? Number(doc.boost_expiry) : undefined,
    isBoosted: (doc.is_boosted || false) && (!doc.boost_expiry || Number(doc.boost_expiry) > Date.now()),
    boostTargetViews: doc.boost_target_views,
    boostCurrentViews: doc.boost_current_views || 0,
    poll,
    hashtags: Array.isArray(doc.hashtags) ? doc.hashtags : [],
    taggedUsers: Array.isArray(doc.tagged_users) ? doc.tagged_users : [],
    linkPreview: doc.link_preview
      ? (() => { try { return typeof doc.link_preview === 'string' ? JSON.parse(doc.link_preview) : doc.link_preview; } catch { return null; } })()
      : null,
    sharedPost: doc.shared_post_data
      ? (() => { try { return typeof doc.shared_post_data === 'string' ? JSON.parse(doc.shared_post_data) : doc.shared_post_data; } catch { return undefined; } })()
      : undefined,
  };
}

function mapDocToComment(doc: Models.Document): PostComment {
  return {
    $id: doc.$id,
    userId: doc.user_id,
    userName: doc.user_name || 'Unknown',
    userAvatar: doc.user_avatar ? doc.user_avatar : avatarFallback(doc.user_name || 'U'),
    text: doc.text || doc.content || '',
    time: formatTimeAgo(doc.$createdAt),
    timestamp: new Date(doc.$createdAt).getTime(),
    parentId: doc.parent_id || undefined,
  };
}

function getChatMessagePreview(message: Partial<ChatMessage> & { type?: string }): string {
  if (message.text) return message.text;
  if (message.type === 'photo') return '📷 Photo';
  if (message.type === 'video') return '🎥 Video';
  if (message.type === 'voice') return message.voiceDuration ? `🎤 Voice · ${message.voiceDuration}` : '🎤 Voice message';
  if (message.type === 'post') return '📌 Shared Post';
  return '';
}

export function PostProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const router = useRouter();

  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [posts, setPostsState] = useState<Post[]>([]);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const feedCursorRef = useRef<string | null>(null);
  const feedPhaseRef = useRef<'connections' | 'global'>('connections');
  const feedConnCursorRef = useRef<string | null>(null);
  const feedGlobalCursorRef = useRef<string | null>(null);
  const [activeComments, setActiveComments] = useState<PostComment[]>([]);
  const [isLoading, setIsLoadingState] = useState(true);
  const [initError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [settings, setSettingsState] = useState<AppSettings>(INITIAL_SETTINGS);

  const [clusters, setClustersState] = useState<Cluster[]>([]);
  const clustersRef = useRef<Cluster[]>([]);
  useEffect(() => { clustersRef.current = clusters; }, [clusters]);
  const [connections, setConnectionsState] = useState<Connection[]>([]);
  const [stories, setStoriesState] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [campaigns, setCampaignsState] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [blockedUsernames, setBlockedUsernames] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);

  const [likedPostIds, setLikedPostIdsState] = useState<Set<string>>(new Set());
  const [unlikedPostIds, setUnlikedPostIdsState] = useState<Set<string>>(new Set());
  const [viewedPostIds, setViewedPostIdsState] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const stored = localStorage.getItem('vm_viewed_posts');
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [savedPostIds, setSavedPostIdsState] = useState<Set<string>>(new Set());
  const [unlockedPostIds, setUnlockedPostIdsState] = useState<Set<string>>(new Set());
  const [seenPostIds, setSeenPostIdsState] = useState<Set<string>>(new Set());

  const [followingUsernames, setFollowingUsernamesState] = useState<Set<string>>(new Set());
  const [followingUserIds, setFollowingUserIdsState] = useState<Set<string>>(new Set());
  const [followerUsernames, setFollowerUsernamesState] = useState<Set<string>>(new Set());
  const [postCountOverrides, setPostCountOverrides] = useState<Record<string, { likes?: number; unlikes?: number; comments?: number; shares?: number }>>({});
  const [streamedComments, setStreamedComments] = useState<PostComment[]>([]);
  const [friendUsernames, setFriendUsernamesState] = useState<Set<string>>(new Set());
  const [sentRequestUsernames, setSentRequestUsernamesState] = useState<Set<string>>(new Set());
  const [receivedRequestUsernames, setReceivedRequestUsernamesState] = useState<Set<string>>(new Set());
  const [acceptedStrangerUsernames] = useState<Set<string>>(new Set());
  const [activeSubscriptions, setActiveSubscriptionsState] = useState<Set<string>>(new Set());
  const [chatLastMessageAt, setChatLastMessageAt] = useState<Record<string, number>>({});
  const [chatLastIncomingAt, setChatLastIncomingAt] = useState<Record<string, number>>({});
  // Refs let loadChatMessages resolve username -> user $id without subscribing to state
  const followingUserIdsRef = useRef<Set<string>>(new Set());
  const connectionsRef = useRef<Connection[]>([]);
  const allUsersRef = useRef<User[]>([]);
  const chatLastMessageAtRef = useRef<Record<string, number>>({});
  const chatMessagesRef = useRef<Record<string, ChatMessage[]>>({});
  const pendingReactionIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => { followingUserIdsRef.current = followingUserIds; }, [followingUserIds]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  useEffect(() => { allUsersRef.current = allUsers; }, [allUsers]);
  useEffect(() => { chatLastMessageAtRef.current = chatLastMessageAt; }, [chatLastMessageAt]);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);
  const [chatReadReceipts, setChatReadReceipts] = useState<Record<string, string>>({});
  const [chatReadReceiptDocIds, setChatReadReceiptDocIds] = useState<Record<string, string>>({});
  const [clusterMemberReceipts, setClusterMemberReceipts] = useState<Record<string, Record<string, string>>>({});
  const [chatUnreadCounts, setChatUnreadCounts] = useState<Record<string, number>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set<string>());

  const [selectedPostId, setSelectedPostIdState] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatIdState] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrlState] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrlState] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpenState] = useState(false);
  const [activeStoryIndex, setActiveStoryIndexState] = useState<number | null>(null);
  const [isGiftHubOpen, setIsGiftHubOpenState] = useState(false);
  const [targetUserForGift, setTargetUserForGiftState] = useState<User | null>(null);
  const [activeCommentPostId, setActiveCommentPostIdState] = useState<string | null>(null);
  const [pendingTransaction, setPendingTransactionState] = useState<any>(null);
  const [mutedUserNames, setMutedUserNames] = useState<string[]>([]);

  const triggerHaptic = useCallback((intensity: number = 10) => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate && settings.hapticIntensity > 0) {
      window.navigator.vibrate((intensity * settings.hapticIntensity) / 50);
    }
  }, [settings.hapticIntensity]);

  // Resolve author profiles for a list of raw post documents
  const withAuthors = useCallback(async (docs: any[]): Promise<Post[]> => {
    const authorIds = [...new Set(docs.map((p: any) => p.user_id).filter(Boolean))];
    let authorsMap: Record<string, any> = {};
    if (authorIds.length > 0) {
      try {
        const r = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('$id', authorIds)]);
        authorsMap = Object.fromEntries(r.documents.map((u: any) => [u.$id, u]));
      } catch { /* ignore */ }
    }
    return docs.map((doc: any) => mapDocToPost(doc, authorsMap[doc.user_id]));
  }, []);

  const loadFeed = useCallback(async () => {
    feedPhaseRef.current = 'connections';
    feedConnCursorRef.current = null;
    feedGlobalCursorRef.current = null;
    feedCursorRef.current = null;
    setHasMoreFeed(true);
    try {
      const PAGE = 15;
      const connIds = [...followingUserIdsRef.current].slice(0, 100);

      let connDocs: any[] = [];

      // Phase 1: fetch connection posts first
      if (connIds.length > 0) {
        try {
          const r = await databases.listDocuments(DATABASE_ID, COL.POSTS, [
            Query.equal('user_id', connIds),
            Query.orderDesc('$createdAt'),
            Query.limit(PAGE),
          ]);
          connDocs = r.documents;
          if (connDocs.length > 0) feedConnCursorRef.current = connDocs[connDocs.length - 1].$id;
          if (connDocs.length < PAGE) feedPhaseRef.current = 'global';
        } catch {
          feedPhaseRef.current = 'global';
        }
      } else {
        feedPhaseRef.current = 'global';
      }

      // Phase 2 fill: connections didn't fill the page — top up from global
      let globalDocs: any[] = [];
      if (feedPhaseRef.current === 'global') {
        try {
          const r = await databases.listDocuments(DATABASE_ID, COL.POSTS, [
            Query.orderDesc('$createdAt'),
            Query.limit(PAGE),
          ]);
          const existingIds = new Set(connDocs.map((d: any) => d.$id));
          globalDocs = r.documents.filter((d: any) => !existingIds.has(d.$id));
          if (r.documents.length > 0) feedGlobalCursorRef.current = r.documents[r.documents.length - 1].$id;
          setHasMoreFeed(r.documents.length === PAGE);
        } catch {
          setHasMoreFeed(false);
        }
      } else {
        setHasMoreFeed(true);
      }

      const mapped = await withAuthors([...connDocs, ...globalDocs]);
      setPostsState(mapped);
      offlineCache.savePosts(mapped);
    } catch (err) {
      logAppwriteError('loadFeed', err);
      const cachedPosts = offlineCache.getPosts() as any[];
      if (cachedPosts.length > 0) setPostsState(cachedPosts);
    }
  }, [withAuthors]);

  const loadMoreFeed = useCallback(async () => {
    if (isFeedLoading) return;
    setIsFeedLoading(true);
    try {
      const PAGE = 15;
      const connIds = [...followingUserIdsRef.current].slice(0, 100);

      if (feedPhaseRef.current === 'connections' && connIds.length > 0 && feedConnCursorRef.current) {
        // Fetch next batch of connection posts
        const r = await databases.listDocuments(DATABASE_ID, COL.POSTS, [
          Query.equal('user_id', connIds),
          Query.orderDesc('$createdAt'),
          Query.cursorAfter(feedConnCursorRef.current),
          Query.limit(PAGE),
        ]);
        if (r.documents.length > 0) feedConnCursorRef.current = r.documents[r.documents.length - 1].$id;
        if (r.documents.length < PAGE) {
          feedPhaseRef.current = 'global';
          setHasMoreFeed(true); // global phase still has content
        }
        const mapped = await withAuthors(r.documents);
        setPostsState(prev => {
          const existingIds = new Set(prev.map(p => p.$id));
          return [...prev, ...mapped.filter(p => !existingIds.has(p.$id))];
        });
      } else {
        // Global phase: cursor-paginate through all posts; dedup removes already-shown ones
        const queries: any[] = [Query.orderDesc('$createdAt'), Query.limit(PAGE)];
        if (feedGlobalCursorRef.current) queries.push(Query.cursorAfter(feedGlobalCursorRef.current));
        const r = await databases.listDocuments(DATABASE_ID, COL.POSTS, queries);
        if (r.documents.length > 0) feedGlobalCursorRef.current = r.documents[r.documents.length - 1].$id;
        setHasMoreFeed(r.documents.length === PAGE);
        const mapped = await withAuthors(r.documents);
        setPostsState(prev => {
          const existingIds = new Set(prev.map(p => p.$id));
          return [...prev, ...mapped.filter(p => !existingIds.has(p.$id))];
        });
      }
    } catch (err) {
      logAppwriteError('loadMoreFeed', err);
    } finally {
      setIsFeedLoading(false);
    }
  }, [isFeedLoading, withAuthors]);

  const loadSocialGraph = useCallback(async (userId: string) => {
    try {
      const q = {
        followingOut:    [Query.equal('follower_id', userId), Query.limit(500)],
        followersIn:     [Query.equal('following_id', userId), Query.limit(500)],
        frSentPending:   [Query.equal('from_user_id', userId), Query.equal('status', 'PENDING'), Query.limit(500)],
        frRecvPending:   [Query.equal('to_user_id', userId), Query.equal('status', 'PENDING'), Query.limit(500)],
        frSentAccepted:  [Query.equal('from_user_id', userId), Query.equal('status', 'ACCEPTED'), Query.limit(500)],
        frRecvAccepted:  [Query.equal('to_user_id', userId), Query.equal('status', 'ACCEPTED'), Query.limit(500)],
        myLikes:         [Query.equal('user_id', userId), Query.equal('reaction_type', 'LIKE'), Query.limit(500)],
        myViews:         [Query.equal('user_id', userId), Query.equal('reaction_type', 'VIEW'), Query.limit(500)],
        myBookmarks:     [Query.equal('user_id', userId), Query.limit(500)],
        myUnlocks:       [Query.equal('user_id', userId), Query.limit(500)],
        mySubs:          [Query.equal('subscriber_id', userId), Query.equal('status', 'ACTIVE'), Query.limit(500)],
        myBlocked:       [Query.equal('blocker_id', userId), Query.limit(200)],
      };
      const [
        followingResult,
        followersResult,
        sentResult,
        receivedResult,
        acceptedSentResult,
        acceptedReceivedResult,
        likesResult,
        viewsResult,
        bookmarksResult,
        unlocksResult,
        subscriptionsResult,
        blockedUsersResult,
      ] = await Promise.allSettled([
        databases.listDocuments(DATABASE_ID, COL.FOLLOWS,          q.followingOut),
        databases.listDocuments(DATABASE_ID, COL.FOLLOWS,          q.followersIn),
        databases.listDocuments(DATABASE_ID, COL.FRIEND_REQUESTS,  q.frSentPending),
        databases.listDocuments(DATABASE_ID, COL.FRIEND_REQUESTS,  q.frRecvPending),
        databases.listDocuments(DATABASE_ID, COL.FRIEND_REQUESTS,  q.frSentAccepted),
        databases.listDocuments(DATABASE_ID, COL.FRIEND_REQUESTS,  q.frRecvAccepted),
        databases.listDocuments(DATABASE_ID, COL.POST_REACTIONS,   q.myLikes),
        databases.listDocuments(DATABASE_ID, COL.POST_REACTIONS,   q.myViews),
        databases.listDocuments(DATABASE_ID, COL.BOOKMARKS,        q.myBookmarks),
        databases.listDocuments(DATABASE_ID, COL.POST_UNLOCKS,     q.myUnlocks),
        databases.listDocuments(DATABASE_ID, COL.SUBSCRIPTIONS,    q.mySubs),
        databases.listDocuments(DATABASE_ID, COL.BLOCKED_USERS,    q.myBlocked),
      ]);

      if (followingResult.status === 'fulfilled') {
        setFollowingUsernamesState(new Set(followingResult.value.documents.map((f: any) => f.following_username).filter(Boolean)));
        setFollowingUserIdsState(new Set(followingResult.value.documents.map((f: any) => f.following_id).filter(Boolean)));
      }
      if (followersResult.status === 'fulfilled') {
        setFollowerUsernamesState(new Set(followersResult.value.documents.map((f: any) => f.follower_username).filter(Boolean)));
      }
      const frUserIds = new Set<string>();
      if (sentResult.status === 'fulfilled') sentResult.value.documents.forEach((r: any) => r.to_user_id && frUserIds.add(r.to_user_id));
      if (receivedResult.status === 'fulfilled') receivedResult.value.documents.forEach((r: any) => r.from_user_id && frUserIds.add(r.from_user_id));
      if (acceptedSentResult.status === 'fulfilled') acceptedSentResult.value.documents.forEach((r: any) => r.to_user_id && frUserIds.add(r.to_user_id));
      if (acceptedReceivedResult.status === 'fulfilled') acceptedReceivedResult.value.documents.forEach((r: any) => r.from_user_id && frUserIds.add(r.from_user_id));
      let frUsersMap: Record<string, string> = {};
      const frUserIdsArr = Array.from(frUserIds).filter(Boolean);
      if (frUserIdsArr.length > 0) {
        try {
          const frUsersRes = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('$id', frUserIdsArr), Query.limit(500)]);
          frUsersMap = Object.fromEntries(frUsersRes.documents.map((u: any) => [u.$id, u.username]));
        } catch { /* ignore */ }
      }
      const getUsernameById = (id: string) => frUsersMap[id] || allUsers.find(u => u.$id === id)?.username;
      if (sentResult.status === 'fulfilled') {
        setSentRequestUsernamesState(new Set(sentResult.value.documents.map((r: any) => getUsernameById(r.to_user_id)).filter(Boolean) as string[]));
      }
      if (receivedResult.status === 'fulfilled') {
        setReceivedRequestUsernamesState(new Set(receivedResult.value.documents.map((r: any) => getUsernameById(r.from_user_id)).filter(Boolean) as string[]));
      }
      const friendNames = new Set<string>();
      if (acceptedSentResult.status === 'fulfilled') {
        acceptedSentResult.value.documents.forEach((r: any) => { const u = getUsernameById(r.to_user_id); if (u) friendNames.add(u); });
      }
      if (acceptedReceivedResult.status === 'fulfilled') {
        acceptedReceivedResult.value.documents.forEach((r: any) => { const u = getUsernameById(r.from_user_id); if (u) friendNames.add(u); });
      }
      setFriendUsernamesState(friendNames);

      if (likesResult.status === 'fulfilled') {
        setLikedPostIdsState(new Set(likesResult.value.documents.map((r: any) => r.post_id).filter(Boolean)));
      }
      if (viewsResult.status === 'fulfilled') {
        const dbViewedIds = viewsResult.value.documents.map((r: any) => r.post_id).filter(Boolean) as string[];
        setViewedPostIdsState(prev => {
          const merged = new Set([...prev, ...dbViewedIds]);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('vm_viewed_posts', JSON.stringify([...merged])); } catch { /* ignore */ }
          }
          return merged;
        });
      }
      if (bookmarksResult.status === 'fulfilled') {
        setSavedPostIdsState(new Set(bookmarksResult.value.documents.map((b: any) => b.post_id).filter(Boolean)));
      }
      if (unlocksResult.status === 'fulfilled') {
        setUnlockedPostIdsState(new Set(unlocksResult.value.documents.map((u: any) => u.post_id).filter(Boolean)));
      }
      if (subscriptionsResult.status === 'fulfilled') {
        setActiveSubscriptionsState(new Set(subscriptionsResult.value.documents.map((s: any) => s.creator_username).filter(Boolean)));
      }
      if (blockedUsersResult.status === 'fulfilled') {
        setBlockedUsernames(blockedUsersResult.value.documents.map((b: any) => b.blocked_username).filter(Boolean));
      }
    } catch (err) {
      console.error('loadSocialGraph error:', err);
    }
  }, []);

  const loadConnections = useCallback(async (userId: string, currentUsername?: string) => {
    try {
      const [followsResult, friendsSentResult, friendsReceivedResult] = await Promise.allSettled([
        databases.listDocuments(DATABASE_ID, COL.FOLLOWS, [
          Query.equal('follower_id', userId),
          Query.limit(200),
        ]),
        databases.listDocuments(DATABASE_ID, COL.FRIEND_REQUESTS, [
          Query.equal('from_user_id', userId),
          Query.equal('status', 'ACCEPTED'),
          Query.limit(200),
        ]),
        databases.listDocuments(DATABASE_ID, COL.FRIEND_REQUESTS, [
          Query.equal('to_user_id', userId),
          Query.equal('status', 'ACCEPTED'),
          Query.limit(200),
        ]),
      ]);

      const allUserIds = new Set<string>();

      if (followsResult.status === 'fulfilled') {
        followsResult.value.documents.forEach((f: any) => { if (f.following_id) allUserIds.add(f.following_id); });
      }
      if (friendsSentResult.status === 'fulfilled') {
        friendsSentResult.value.documents.forEach((f: any) => { if (f.to_user_id) allUserIds.add(f.to_user_id); });
      }
      if (friendsReceivedResult.status === 'fulfilled') {
        friendsReceivedResult.value.documents.forEach((f: any) => { if (f.from_user_id) allUserIds.add(f.from_user_id); });
      }

      // Open inbox: also include anyone who has ever exchanged DMs with this user,
      // so non-friends still show up in the conversation list.
      try {
        const [sentMsgs, recvMsgs] = await Promise.allSettled([
          databases.listDocuments(DATABASE_ID, COL.MESSAGES, [
            Query.equal('sender_id', userId),
            Query.orderDesc('$createdAt'),
            Query.limit(500),
          ]),
          databases.listDocuments(DATABASE_ID, COL.MESSAGES, [
            Query.equal('receiver_id', userId),
            Query.orderDesc('$createdAt'),
            Query.limit(500),
          ]),
        ]);
        if (sentMsgs.status === 'fulfilled') {
          sentMsgs.value.documents.forEach((m: any) => {
            if (m.receiver_id && m.receiver_id !== userId) allUserIds.add(m.receiver_id);
          });
        }
        if (recvMsgs.status === 'fulfilled') {
          recvMsgs.value.documents.forEach((m: any) => {
            if (m.sender_id && m.sender_id !== userId) allUserIds.add(m.sender_id);
          });
        }
      } catch { /* ignore — friends/follows already loaded */ }

      const userIdsArr = Array.from(allUserIds).filter(id => id !== userId);
      if (userIdsArr.length === 0) { setConnectionsState([]); return; }

      const usersResult = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('$id', userIdsArr), Query.limit(200)]);

      const conns: Connection[] = usersResult.documents.map((u: any) => ({
        $id: u.$id,
        name: u.name || '',
        username: u.username || '',
        email: u.email || '',
        avatar: u.avatar_id ? getFileUrl(BUCKET.AVATARS, u.avatar_id) : avatarFallback(u.name || 'U'),
        cover: u.cover_id ? getFileUrl(BUCKET.COVERS, u.cover_id) : undefined,
        isVerified: u.is_verified || false,
        isGroup: false as const,
        isOnline: u.is_online || false,
        lastSeenAt: u.last_seen_at || null,
        followsYou: false,
      }));

      if (currentUsername && conns.length > 0) {
        try {
          const recentMsgs = await databases.listDocuments(DATABASE_ID, COL.MESSAGES, [
            Query.orderDesc('$createdAt'),
            Query.limit(500),
          ]);
          const lastMsgMap: Record<string, { text?: string; type?: ChatMessage['type']; time?: string }> = {};
          recentMsgs.documents.forEach((doc: any) => {
            const cid = doc.cluster_id;
            if (cid && !lastMsgMap[cid]) {
              lastMsgMap[cid] = { text: doc.text, type: doc.type as ChatMessage['type'], time: formatTimeAgo(doc.$createdAt) };
            }
          });
          const enriched = conns.map(c => {
            const clusterId = [currentUsername, c.username].sort().join('_');
            const lastMsg = lastMsgMap[clusterId];
            if (!lastMsg) return c;
            const preview = getChatMessagePreview(lastMsg);
            return { ...c, lastMessage: preview, lastTime: lastMsg.time };
          });
          setConnectionsState(enriched);
          offlineCache.saveConnections(enriched);
        } catch {
          setConnectionsState(conns);
          offlineCache.saveConnections(conns);
        }
      } else {
        setConnectionsState(conns);
        offlineCache.saveConnections(conns);
      }
    } catch {
      const cachedConns = offlineCache.getConnections() as any[];
      if (cachedConns.length > 0) setConnectionsState(cachedConns);
    }
  }, []);

  const updateConnectionPresence = useCallback((userId: string, isOnline: boolean, lastSeenAt: string | null) => {
    setConnectionsState(prev => prev.map(c =>
      c.$id === userId
        ? { ...c, isOnline, lastSeenAt: lastSeenAt ?? c.lastSeenAt }
        : c
    ));
  }, []);

  const updateUserOnlineStatus = useCallback((userId: string, isOnline: boolean) => {
    setOnlineUserIds(prev => {
      const next = new Set(prev);
      if (isOnline) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const loadStories = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const storiesResult = await databases.listDocuments(DATABASE_ID, COL.STORIES, [
        Query.greaterThan('expires_at', now),
        Query.orderDesc('$createdAt'),
        Query.limit(30),
      ]);

      const authorIds = [...new Set(storiesResult.documents.map((s: any) => s.user_id).filter(Boolean))];
      let authorsMap: Record<string, any> = {};
      if (authorIds.length > 0) {
        try {
          const ar = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('$id', authorIds)]);
          authorsMap = Object.fromEntries(ar.documents.map((u: any) => [u.$id, u]));
        } catch { /* ignore */ }
      }

      const storyIds = storiesResult.documents.map((s: any) => s.$id);
      let segmentsMap: Record<string, Models.Document[]> = {};
      if (storyIds.length > 0) {
        try {
          const segsResult = await databases.listDocuments(DATABASE_ID, COL.STORY_SEGMENTS, [
            Query.equal('story_id', storyIds),
            Query.orderAsc('order_index'),
            Query.limit(200),
          ]);
          segsResult.documents.forEach((seg: any) => {
            if (!segmentsMap[seg.story_id]) segmentsMap[seg.story_id] = [];
            segmentsMap[seg.story_id].push(seg);
          });
        } catch { /* ignore */ }
      }

      const mapped = storiesResult.documents.map((doc: any) => {
        const authorDoc = authorsMap[doc.user_id];
        const segments = (segmentsMap[doc.$id] || []).map(seg => ({
          $id: seg.$id,
          type: seg.type || 'image',
          mediaUrl: seg.media_id ? getFileUrl(BUCKET.STORY_MEDIA, seg.media_id) : (seg.story_url ? toProxyUrl(seg.story_url) : undefined),
          text: seg.text,
          duration: seg.duration || 5,
          filter: seg.filter,
          background: seg.background,
          textOverlays: seg.text_overlays ? JSON.parse(seg.text_overlays) : undefined,
          postId: seg.post_id || undefined,
        }));
        return {
          $id: doc.$id,
          user_id: doc.user_id,
          user: authorDoc ? mapProfileDocToUser(authorDoc) : { $id: doc.user_id, name: 'Unknown', username: 'unknown', avatar: avatarFallback('U'), isVerified: false },
          segments,
          expiry: doc.expiry || doc.expires_at,
          viewCount: doc.views_count ?? doc.view_count ?? 0,
          createdAt: doc.$createdAt,
        };
      });

      // Group stories by user — multiple uploads from same user become one story with many segments
      const userStoryMap: Record<string, any> = {};
      mapped.forEach(story => {
        if (!story.segments || story.segments.length === 0) return;
        const uid = story.user_id || story.user.$id;
        if (!userStoryMap[uid]) {
          userStoryMap[uid] = { ...story };
        } else {
          userStoryMap[uid].segments = [...userStoryMap[uid].segments, ...story.segments];
        }
      });
      const validStories = Object.values(userStoryMap).filter((s: any) => s.segments && s.segments.length > 0);
      setStoriesState(validStories);
    } catch (err) {
      console.error('loadStories error:', err);
    }
  }, []);

  const loadClusters = useCallback(async (userId: string) => {
    try {
      const membershipsResult = await databases.listDocuments(DATABASE_ID, COL.CLUSTER_MEMBERS, [
        Query.equal('user_id', userId),
        Query.limit(50),
      ]);
      if (membershipsResult.documents.length === 0) { setClustersState([]); return; }

      const clusterIds = membershipsResult.documents.map((m: any) => m.cluster_id).filter(Boolean);
      const clustersResult = await databases.listDocuments(DATABASE_ID, COL.CLUSTERS, [
        Query.equal('$id', clusterIds),
      ]);

      const allMembersResult = await databases.listDocuments(DATABASE_ID, COL.CLUSTER_MEMBERS, [
        Query.equal('cluster_id', clusterIds),
        Query.limit(500),
      ]);

      const memberUserIds = [...new Set(allMembersResult.documents.map(m => m.user_id).filter(Boolean))];
      let memberUsersMap: Record<string, Models.Document> = {};
      if (memberUserIds.length > 0) {
        try {
          const ur = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('$id', memberUserIds)]);
          memberUsersMap = Object.fromEntries(ur.documents.map(u => [u.$id, u]));
        } catch { /* ignore */ }
      }

      const mapped: Cluster[] = clustersResult.documents.map(cl => {
        const clMembers = allMembersResult.documents.filter(m => m.cluster_id === cl.$id);
        const members: User[] = clMembers.map(m => {
          const uDoc = memberUsersMap[m.user_id];
          return uDoc ? mapProfileDocToUser(uDoc) : {
            $id: m.user_id, name: m.username || 'Unknown', username: m.username || 'unknown',
            avatar: avatarFallback(m.username || 'U'), isVerified: false,
          };
        });
        return {
          $id: cl.$id,
          name: cl.name,
          adminUsername: cl.admin_username || '',
          avatar: cl.avatar_id ? getFileUrl(BUCKET.AVATARS, cl.avatar_id) : undefined,
          cover: cl.cover_id ? getFileUrl(BUCKET.COVERS, cl.cover_id) : undefined,
          isAddLocked: cl.is_add_locked || false,
          members,
          isGroup: true as const,
        };
      });
      setClustersState(mapped);

      // ── Fetch last message per cluster directly from the collection ──
      if (clusterIds.length > 0) {
        try {
          const perClusterResults = await Promise.allSettled(
            clusterIds.map(cid =>
              databases.listDocuments(DATABASE_ID, COL.GROUP_MESSAGES, [
                Query.equal('cluster_id', cid),
                Query.orderDesc('$createdAt'),
                Query.limit(1),
              ])
            )
          );
          const lastMsgMap: Record<string, any> = {};
          perClusterResults.forEach((res, i) => {
            if (res.status === 'fulfilled' && res.value.documents.length > 0) {
              lastMsgMap[clusterIds[i]] = res.value.documents[0];
            }
          });
          if (Object.keys(lastMsgMap).length > 0) {
            setClustersState(prev => prev.map(cl => {
              const doc = lastMsgMap[cl.$id];
              if (!doc) return cl;
              const preview = getChatMessagePreview({ text: doc.text, type: doc.type, voiceDuration: doc.voice_duration });
              return { ...cl, lastMessage: preview, lastTime: formatTimeAgo(doc.$createdAt) };
            }));
            setChatLastMessageAt(prev => {
              const next = { ...prev };
              for (const [cid, doc] of Object.entries(lastMsgMap)) {
                const ts = new Date((doc as any).$createdAt).getTime();
                if (!next[cid] || ts > next[cid]) next[cid] = ts;
              }
              return next;
            });
          }
        } catch { /* non-critical — real-time listener fills gaps */ }
      }

      // Online status is determined solely by real-time presence events.
      // Pre-populating from the stale `is_online` DB field causes phantom online counts.
    } catch { /* ignore */ }
  }, []);

  const loadChatMessages = useCallback(async (userId: string, otherId: string, currentUsername?: string, isCluster?: boolean) => {
    const clusterId = isCluster
      ? otherId
      : (currentUsername ? [currentUsername, otherId].sort().join('_') : [userId, otherId].sort().join('_'));
    try {
      // Resolve the other user's $id (DM only) so we can use the indexed sender_id/receiver_id
      // pair instead of scanning the whole messages collection by cluster_id.
      let otherUserId: string | null = null;
      if (!isCluster) {
        const conn = connectionsRef.current.find(c => c.username === otherId);
        if (conn?.$id) {
          otherUserId = conn.$id;
        } else {
          const u = allUsersRef.current.find(x => x.username === otherId);
          if (u?.$id) otherUserId = u.$id;
        }
      }

      let all: any[] = [];

      if (!isCluster && otherUserId) {
        // FAST PATH (DM): two parallel queries on already-used indexed fields.
        // Each side returns ≤80 of *just this thread's* messages, ordered newest-first.
        const [aRes, bRes] = await Promise.allSettled([
          databases.listDocuments(DATABASE_ID, COL.MESSAGES, [
            Query.equal('sender_id', userId),
            Query.equal('receiver_id', otherUserId),
            Query.orderDesc('$createdAt'),
            Query.limit(80),
          ]),
          databases.listDocuments(DATABASE_ID, COL.MESSAGES, [
            Query.equal('sender_id', otherUserId),
            Query.equal('receiver_id', userId),
            Query.orderDesc('$createdAt'),
            Query.limit(80),
          ]),
        ]);
        const merged: any[] = [];
        if (aRes.status === 'fulfilled') merged.push(...aRes.value.documents);
        if (bRes.status === 'fulfilled') merged.push(...bRes.value.documents);
        // Dedupe + sort ascending (oldest -> newest) for display
        const seen = new Set<string>();
        all = merged
          .filter(d => (seen.has(d.$id) ? false : (seen.add(d.$id), true)))
          .sort((x, y) => new Date(x.$createdAt).getTime() - new Date(y.$createdAt).getTime());
      } else {
        // CLUSTER (group) PATH: always query by cluster_id so we only see this group's
        // messages. Only apply a delta filter if we already have messages loaded in
        // memory for this cluster — prevents the "1 message" bug where loadClusters
        // pre-populates chatLastMessageAt before the conversation is ever opened.
        const existingMsgs = chatMessagesRef.current[otherId] || [];
        const cachedTs = existingMsgs.length > 0 ? (chatLastMessageAtRef.current[otherId] || 0) : 0;
        const queries: any[] = [
          Query.equal('cluster_id', clusterId),
          Query.orderDesc('$createdAt'),
          Query.limit(200),
        ];
        if (cachedTs > 0) {
          queries.push(Query.greaterThan('$createdAt', new Date(cachedTs - 1000).toISOString()));
        }
        const result = await databases.listDocuments(DATABASE_ID, COL.GROUP_MESSAGES, queries);
        all = result.documents.sort(
          (x: any, y: any) => new Date(x.$createdAt).getTime() - new Date(y.$createdAt).getTime()
        );
      }

      const msgs: ChatMessage[] = all.map(doc => {
        return {
          $id: doc.$id,
          sender: doc.sender_id === userId ? 'me' : 'them',
          senderId: doc.sender_id,
          text: doc.text,
          time: formatTimeAgo(doc.$createdAt),
          status: doc.is_read ? 'read' : 'delivered',
          type: (doc.type || 'text') as ChatMessage['type'],
          mediaUrl: doc.type === 'voice'
            ? (doc.media_id ? getFileUrl(BUCKET.VOICE_MESSAGES, doc.media_id) : (doc.media_url ? toProxyUrl(doc.media_url) : undefined))
            : (doc.media_id ? getFileUrl(BUCKET.MESSAGE_MEDIA, doc.media_id) : (doc.media_url ? toProxyUrl(doc.media_url) : undefined)),
          voiceDuration: doc.voice_duration || undefined,
          isViewOnce: doc.is_view_once || false,
          isViewed: doc.is_viewed || false,
          senderName: doc.sender_name,
          senderAvatar: doc.sender_avatar,
          createdAt: doc.$createdAt ? new Date(doc.$createdAt).getTime() : undefined,
          postId: doc.post_id || undefined,
          sharedPostData: doc.shared_post_data
            ? (() => { try { return typeof doc.shared_post_data === 'string' ? JSON.parse(doc.shared_post_data) : doc.shared_post_data; } catch { return undefined; } })()
            : undefined,
          replyToId: doc.reply_to_id || undefined,
          replyToText: doc.reply_to_text || undefined,
          replyToSenderName: doc.reply_to_sender_name || undefined,
          replyToType: doc.reply_to_type || undefined,
        };
      });

      setChatMessages(prev => {
        if (isCluster) {
          // Cluster path returns a delta; merge with whatever we already cached.
          const existing = prev[otherId] || [];
          const seen = new Set<string>(existing.map(m => m.$id));
          const additions = msgs.filter(m => !seen.has(m.$id));
          if (additions.length === 0) return prev;
          // Remove optimistic messages (temp IDs starting with 'msg_') that now
          // have a real server counterpart in the additions — avoids duplicates.
          const serverKeys = new Set(
            additions.map(m => `${m.senderId}|${m.text ?? ''}|${m.type}`)
          );
          const dedupedExisting = existing.filter(m => {
            if (!m.$id.startsWith('msg_')) return true;
            return !serverKeys.has(`${m.senderId}|${m.text ?? ''}|${m.type}`);
          });
          const merged = [...dedupedExisting, ...additions].sort(
            (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
          );
          return { ...prev, [otherId]: merged };
        }
        // DM path returns the full window for this conversation; replace.
        return { ...prev, [otherId]: msgs };
      });

      if (all.length > 0) {
        const lastDoc = all[all.length - 1];
        const ts = lastDoc.$createdAt ? new Date(lastDoc.$createdAt).getTime() : Date.now();
        setChatLastMessageAt(prev => ({ ...prev, [otherId]: Math.max(prev[otherId] || 0, ts) }));
      }

      const lastIncomingMsg = msgs.filter(m => m.sender === 'them' && m.createdAt).at(-1);
      if (lastIncomingMsg?.createdAt) {
        setChatLastIncomingAt(prev => ({ ...prev, [otherId]: lastIncomingMsg.createdAt! }));
      }

      if (!isCluster && msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        const preview = getChatMessagePreview(lastMsg);
        setConnectionsState(prev => prev.map(c =>
          c.username === otherId ? { ...c, lastMessage: preview, lastTime: lastMsg.time } : c
        ));
      }

      if (isCluster) {
        try {
          const receiptsResult = await databases.listDocuments(DATABASE_ID, COL.CHAT_READ_RECEIPTS, [
            Query.equal('cluster_id', otherId),
            Query.limit(100),
          ]);
          const memberReceipts: Record<string, string> = {};
          for (const doc of receiptsResult.documents) {
            memberReceipts[doc.user_id] = doc.last_read_at;
          }
          setClusterMemberReceipts(prev => ({ ...prev, [otherId]: memberReceipts }));
        } catch { /* non-critical */ }
      }
    } catch (err: any) {
      const message = err?.message || err?.response?.message || JSON.stringify(err) || 'Unknown error loading messages';
      toast({ variant: 'destructive', title: 'Failed to Load Messages', description: message });
    }
  }, [toast]);

  const loadChatReadReceipts = useCallback(async (userId: string) => {
    try {
      const result = await databases.listDocuments(DATABASE_ID, COL.CHAT_READ_RECEIPTS, [
        Query.equal('user_id', userId),
        Query.limit(200),
      ]);
      const receipts: Record<string, string> = {};
      const docIds: Record<string, string> = {};
      for (const doc of result.documents) {
        receipts[doc.cluster_id] = doc.last_read_at;
        docIds[doc.cluster_id] = doc.$id;
      }
      setChatReadReceipts(receipts);
      setChatReadReceiptDocIds(docIds);
    } catch { /* ignore */ }
  }, []);

  const loadUnreadSignals = useCallback(async (userId: string, userUsername: string) => {
    try {
      const result = await databases.listDocuments(DATABASE_ID, COL.MESSAGES, [
        Query.equal('receiver_id', userId),
        Query.equal('is_read', false),
        Query.orderDesc('$createdAt'),
        Query.limit(200),
      ]);

      if (result.documents.length === 0) return;

      const latestPerCluster: Record<string, number> = {};
      const countsPerCluster: Record<string, number> = {};
      for (const doc of result.documents) {
        const clusterId: string = doc.cluster_id || '';
        if (!clusterId) continue;
        const ts = doc.$createdAt ? new Date(doc.$createdAt).getTime() : Date.now();
        if (!latestPerCluster[clusterId] || ts > latestPerCluster[clusterId]) {
          latestPerCluster[clusterId] = ts;
        }
        countsPerCluster[clusterId] = (countsPerCluster[clusterId] || 0) + 1;
      }

      const signals: Record<string, number> = {};
      const counts: Record<string, number> = {};
      for (const [clusterId, ts] of Object.entries(latestPerCluster)) {
        const parts = clusterId.split('_');
        const otherUsername = parts.find(p => p !== userUsername);
        const storageKey = (parts.length === 2 && otherUsername) ? otherUsername : clusterId;
        signals[storageKey] = ts;
        counts[storageKey] = countsPerCluster[clusterId] || 0;
      }

      setChatLastIncomingAt(prev => ({ ...prev, ...signals }));
      setChatUnreadCounts(prev => ({ ...prev, ...counts }));

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`vimore_unread_signals_${userId}`, JSON.stringify(signals));
        } catch { /* ignore */ }
      }
    } catch { /* silent — non-critical */ }
  }, []);

  // Backfill last-message timestamps for every DM/cluster the user is part of so the
  // conversation list is correctly ordered by recency on first paint — even for chats
  // that haven't been opened yet. Uses only already-indexed fields (sender_id /
  // receiver_id / $createdAt) — no new Appwrite indexes required.
  const loadConversationMetadata = useCallback(async (userId: string, userUsername: string) => {
    try {
      const [sentRes, recvRes] = await Promise.allSettled([
        databases.listDocuments(DATABASE_ID, COL.MESSAGES, [
          Query.equal('sender_id', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(200),
        ]),
        databases.listDocuments(DATABASE_ID, COL.MESSAGES, [
          Query.equal('receiver_id', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(200),
        ]),
      ]);

      const docs: any[] = [];
      if (sentRes.status === 'fulfilled') docs.push(...sentRes.value.documents);
      if (recvRes.status === 'fulfilled') docs.push(...recvRes.value.documents);
      if (docs.length === 0) return;

      // Per-conversation: latest timestamp + latest body for preview.
      const latestPerKey: Record<string, { ts: number; body: string }> = {};
      for (const doc of docs) {
        const clusterId: string = doc.cluster_id || '';
        if (!clusterId) continue;
        const parts = clusterId.split('_');
        const otherUsername = parts.length === 2 ? parts.find(p => p !== userUsername) : undefined;
        const storageKey = (parts.length === 2 && otherUsername) ? otherUsername : clusterId;
        const ts = doc.$createdAt ? new Date(doc.$createdAt).getTime() : Date.now();
        if (!latestPerKey[storageKey] || ts > latestPerKey[storageKey].ts) {
          latestPerKey[storageKey] = { ts, body: String(doc.message_text || doc.body || '') };
        }
      }

      const tsMap: Record<string, number> = {};
      for (const [k, v] of Object.entries(latestPerKey)) tsMap[k] = v.ts;
      setChatLastMessageAt(prev => {
        const next = { ...prev };
        for (const [k, ts] of Object.entries(tsMap)) {
          next[k] = Math.max(prev[k] || 0, ts);
        }
        return next;
      });

      // Patch connection previews for chats that already exist in our connection list.
      setConnectionsState(prev => prev.map(c => {
        const meta = latestPerKey[c.username];
        if (!meta) return c;
        const dt = new Date(meta.ts);
        return {
          ...c,
          lastMessage: meta.body || c.lastMessage,
          lastTime: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }));
    } catch { /* non-critical */ }
  }, []);

  const loadUserWithdrawals = useCallback(async (userId: string) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.WITHDRAWAL_REQUESTS, [
        Query.equal('user_id', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]);
      setWithdrawalHistory(res.documents.map((doc: any) => ({
        ...doc,
        username: doc.username || '',
        accountName: doc.account_name || doc.accountName || '',
        payoutAmount: doc.payout_amount ?? doc.payoutAmount ?? 0,
        payoutCurrency: doc.payout_currency || doc.payoutCurrency || 'USD',
        method: doc.method || doc.payment_method || '',
        amount: doc.amount ?? 0,
        currency: doc.currency || '',
      })));
    } catch { /* ignore */ }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.AD_CAMPAIGNS, [
        Query.equal('is_active', true),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]);
      setCampaignsState(res.documents);
    } catch { /* ignore */ }
  }, []);

  const withStartupTimeout = useCallback(async <T,>(task: Promise<T>, timeoutMs = 8000): Promise<T | null> => {
    return await new Promise<T | null>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, timeoutMs);

      task.then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      }).catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      });
    });
  }, []);

  const checkSession = useCallback(async () => {
    setIsLoadingState(true);

    // Hard timeout: if the entire session check takes longer than 12s, bail out gracefully
    const timeoutId = setTimeout(() => {
      const cachedUser = offlineCache.getUser() as any | null;
      if (cachedUser) {
        setCurrentUserState(cachedUser);
        const cachedPosts = offlineCache.getPosts() as any[];
        if (cachedPosts.length > 0) setPostsState(cachedPosts);
        setIsOffline(true);
      } else {
        setCurrentUserState(null);
      }
      setIsLoadingState(false);
    }, 12000);

    // If the device has no connectivity, restore from local cache immediately
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      clearTimeout(timeoutId);
      const cachedUser = offlineCache.getUser() as any | null;
      if (cachedUser) {
        setCurrentUserState(cachedUser);
        const cachedPosts = offlineCache.getPosts() as any[];
        if (cachedPosts.length > 0) setPostsState(cachedPosts);
        const cachedConns = offlineCache.getConnections() as any[];
        if (cachedConns.length > 0) setConnectionsState(cachedConns);
        setIsOffline(true);
        setIsLoadingState(false);
        return;
      }
    }

    try {
      const meRes = await authFetch('/api/auth/me');
      if (!meRes.ok) throw new Error('Unauthorized');
      const meData = await meRes.json();
      clearTimeout(timeoutId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { authUser, profileDoc } = meData as any;
      const user = mapDocToUser(authUser, profileDoc);
      setCurrentUserState(user);
      offlineCache.saveUser(user);
      setIsOffline(false);

      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(`vimore_unread_signals_${authUser.$id}`);
          if (cached) setChatLastIncomingAt(JSON.parse(cached));
        } catch { /* ignore */ }
      }

      await Promise.allSettled([
        loadFeed(),
        loadSocialGraph(authUser.$id),
        loadConnections(authUser.$id, profileDoc.username || ''),
        loadStories(),
        loadClusters(authUser.$id),
        loadUserWithdrawals(authUser.$id),
        loadCampaigns(),
        loadChatReadReceipts(authUser.$id),
      ]);

      loadUnreadSignals(authUser.$id, profileDoc.username || '').catch(() => {});
      loadConversationMetadata(authUser.$id, profileDoc.username || '').catch(() => {});
    } catch (err: any) {
      // Network failure (offline) but we have a cached session → go offline mode
      const isNetworkError = (typeof navigator !== 'undefined' && !navigator.onLine) ||
        (err?.message && /fetch|network|failed to fetch/i.test(err.message));
      if (isNetworkError) {
        const cachedUser = offlineCache.getUser() as any | null;
        if (cachedUser) {
          setCurrentUserState(cachedUser);
          const cachedPosts = offlineCache.getPosts() as any[];
          if (cachedPosts.length > 0) setPostsState(cachedPosts);
          const cachedConns = offlineCache.getConnections() as any[];
          if (cachedConns.length > 0) setConnectionsState(cachedConns);
          setIsOffline(true);
          setIsLoadingState(false);
          return;
        }
      }
      // Auth error or no cached session — redirect to login
      clearTimeout(timeoutId);
      offlineCache.clearUser();
      setCurrentUserState(null);
    } finally {
      clearTimeout(timeoutId);
      setIsLoadingState(false);
    }
  }, [withStartupTimeout, loadFeed, loadSocialGraph, loadConnections, loadStories, loadClusters, loadUserWithdrawals, loadCampaigns, loadChatReadReceipts, loadUnreadSignals, loadConversationMetadata]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter(k => k.startsWith('vimore_qcache_'))
        .forEach(k => localStorage.removeItem(k));
    }
    checkSession();
  }, [checkSession]);

  // ── Presence heartbeat ────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.$id) return;
    const userId = currentUser.$id;

    const markOnline = async () => {
      try {
        await databases.updateDocument(DATABASE_ID, COL.USERS, userId, {
          is_online: true,
          last_seen_at: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn('[presence] markOnline failed:', err?.message ?? err);
      }
    };

    const markOffline = async () => {
      try {
        await databases.updateDocument(DATABASE_ID, COL.USERS, userId, {
          is_online: false,
          last_seen_at: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn('[presence] markOffline failed:', err?.message ?? err);
      }
    };

    // sendBeacon is reliable for tab-close/navigate — browser guarantees delivery
    // even when async fetch would be cancelled by the browser on unload.
    const markOfflineSync = () => {
      try {
        const data = JSON.stringify({ userId, isOnline: false });
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon('/api/presence', new Blob([data], { type: 'application/json' }));
        } else {
          markOffline();
        }
      } catch { /* ignore */ }
    };

    markOnline();
    const interval = setInterval(markOnline, 30000); // 30s heartbeat — max 1 min stale

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markOfflineSync();
      } else {
        markOnline();
      }
    };

    const handleBeforeUnload = () => { markOfflineSync(); };
    const handlePageHide = () => { markOfflineSync(); }; // fires on mobile/PWA navigate

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      markOffline();
    };
  }, [currentUser?.$id]);

  useEffect(() => {
    if (!currentUser?.$id) return;
    const channel = `databases.${DATABASE_ID}.collections.${COL.USERS}.documents.${currentUser.$id}`;
    const unsubscribe = client.subscribe(channel, (response) => {
      const events: string[] = response.events as string[];
      if (!events.some(e => e.endsWith('.update'))) return;
      const payload = response.payload as any;
      if (!payload) return;
      setCurrentUserState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          followers: typeof payload.followers_count === 'number' ? payload.followers_count : prev.followers,
          following: typeof payload.following_count === 'number' ? payload.following_count : prev.following,
          posts: typeof payload.posts_count === 'number' ? payload.posts_count : prev.posts,
          goldBalance: typeof payload.gold_balance === 'number' ? payload.gold_balance : prev.goldBalance,
          diamondBalance: typeof payload.diamond_balance === 'number' ? payload.diamond_balance : prev.diamondBalance,
          starBalance: typeof payload.star_balance === 'number' ? payload.star_balance : prev.starBalance,
        };
      });
    });
    return () => { unsubscribe(); };
  }, [currentUser?.$id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const credId = localStorage.getItem('vimore_biometric_cred_id');
    if (credId) {
      setSettingsState(prev => ({ ...prev, isHardwareEnrolled: true }));
    }
  }, []);

  useEffect(() => {
    if (selectedChatId && currentUser) {
      const isCluster = clusters.some(cl => cl.$id === selectedChatId);
      loadChatMessages(currentUser.$id, selectedChatId, currentUser.username, isCluster);
    }
  }, [selectedChatId, currentUser, loadChatMessages, clusters]);

  // Mark incoming messages as read when a chat is opened or new messages arrive
  useEffect(() => {
    if (!selectedChatId || !currentUser) return;
    const msgs = chatMessages[selectedChatId] || [];
    const unreadMsgs = msgs.filter(m => m.sender === 'them' && m.status !== 'read');
    if (unreadMsgs.length === 0) return;
    setChatMessages(prev => ({
      ...prev,
      [selectedChatId]: (prev[selectedChatId] || []).map(m =>
        m.sender === 'them' && m.status !== 'read' ? { ...m, status: 'read' as const } : m
      ),
    }));
    unreadMsgs.forEach(m => {
      databases.updateDocument(DATABASE_ID, COL.MESSAGES, m.$id, { is_read: true }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId, chatMessages, currentUser]);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsLoadingState(true);

    const trimmed = identifier.trim();
    const isPhone = !trimmed.includes('@') && /^[+\d][\d\s\-().]{5,}$/.test(trimmed);
    let vimoreId: string;

    if (isPhone) {
      try {
        const lookupRes = await fetch('/api/auth/lookup-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: trimmed }),
        });
        const lookupData = await lookupRes.json();
        if (!lookupRes.ok) {
          setIsLoadingState(false);
          return { success: false, message: lookupData.error || "No account found with that phone number." };
        }
        vimoreId = lookupData.email;
      } catch {
        setIsLoadingState(false);
        return { success: false, message: "Could not look up that phone number. Please try your ViMore ID." };
      }
    } else {
      vimoreId = trimmed.includes('@') ? trimmed : `${trimmed}@vimore.cfd`;
    }

    try {
      let authUser;
      try {
        authUser = await account.get();
      } catch {
        authUser = null;
      }
      if (!authUser) {
        // Use server-side login to avoid client-SDK platform/CORS restrictions.
        // The Next.js server proxies the credential check directly to Appwrite
        // (server-to-server), then returns the session secret for us to hydrate.
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: vimoreId, password }),
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) {
          throw new Error(loginData.error || 'Invalid credentials.');
        }
        // Hydrate the Appwrite client SDK with the server-returned session.
        const { client } = await import('@/lib/appwrite');
        client.setSession(loginData.secret);
        // Also persist in localStorage so authFetch and page refreshes work.
        try {
          const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
          const fallback = { [`a_session_${PROJECT_ID}`]: loginData.secret };
          localStorage.setItem('cookieFallback', JSON.stringify(fallback));
        } catch { /* ignore */ }
        // Skip account.get() — client-side account ops fail when the domain
        // isn't registered as an Appwrite platform (general_unauthorized_scope).
        // The server already gave us the userId we need.
        authUser = {
          $id: loginData.userId,
          email: vimoreId,
          name: '',
          emailVerification: false,
          $createdAt: loginData.expire ?? new Date().toISOString(),
        } as any;
      }
      const profileDoc = await databases.getDocument(DATABASE_ID, COL.USERS, authUser.$id);
      const user = mapDocToUser(authUser, profileDoc);
      setCurrentUserState(user);

      try {
        const saved = JSON.parse(localStorage.getItem('vimore_saved_accounts') || '[]');
        const idx = saved.findIndex((a: any) => a.vimoreId === vimoreId);
        const entry = { id: authUser.$id, vimoreId, name: user.name, avatar: user.avatar || null };
        if (idx !== -1) saved.splice(idx, 1);
        saved.unshift(entry);
        localStorage.setItem('vimore_saved_accounts', JSON.stringify(saved.slice(0, 10)));
      } catch { /* ignore */ }

      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(`vimore_unread_signals_${authUser.$id}`);
          if (cached) setChatLastIncomingAt(JSON.parse(cached));
        } catch { /* ignore */ }
      }

      await Promise.allSettled([
        loadFeed(),
        loadSocialGraph(authUser.$id),
        loadConnections(authUser.$id, profileDoc.username || ''),
        loadStories(),
        loadClusters(authUser.$id),
        loadUserWithdrawals(authUser.$id),
        loadCampaigns(),
        loadChatReadReceipts(authUser.$id),
      ]);

      loadUnreadSignals(authUser.$id, profileDoc.username || '').catch(() => {});
      loadConversationMetadata(authUser.$id, profileDoc.username || '').catch(() => {});
      setIsLoadingState(false);
      toast({ title: "Welcome back!", description: "You are now signed in." });
      return { success: true };
    } catch (err: any) {
      setIsLoadingState(false);
      logAppwriteError('login', err);
      const msg = formatErrorDescription(err, null) || 'Invalid credentials. Please try again.';
      return { success: false, message: msg };
    }
  }, [toast, loadFeed, loadSocialGraph, loadConnections, loadStories, loadClusters, loadUserWithdrawals, loadCampaigns, loadChatReadReceipts, loadUnreadSignals, loadConversationMetadata]);

  const signup = useCallback(async (data: any) => {
    setIsLoadingState(true);
    try {
      const vimoreId = data.vimoreId.includes('@') ? data.vimoreId : `${data.vimoreId}@vimore.cfd`;

      // Create account and session server-side — avoids client-SDK platform check
      // that rejects requests from unregistered domains (general_unauthorized_scope).
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: vimoreId, password: data.password, name: data.name }),
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        throw new Error(registerData.error || 'Failed to create account.');
      }

      // Hydrate the Appwrite client SDK and localStorage with the new session.
      const { client: appwriteClient } = await import('@/lib/appwrite');
      appwriteClient.setSession(registerData.secret);
      try {
        const PROJECT_ID_REG = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
        localStorage.setItem('cookieFallback', JSON.stringify({
          [`a_session_${PROJECT_ID_REG}`]: registerData.secret,
        }));
      } catch { /* ignore */ }

      // Construct a minimal auth user object from the server response.
      // We don't call account.get() here — that would fail on unregistered domains.
      const authUser = {
        $id: registerData.userId,
        email: vimoreId,
        name: data.name,
        emailVerification: false,
        $createdAt: new Date().toISOString(),
      } as any;

      const parts = data.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/);
      const username = parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0] || 'user';
      const referralCode = `VM${username.toUpperCase().slice(0, 6)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

      // Create the user profile document server-side (admin key bypasses collection perms)
      const { authFetch } = await import('@/lib/auth-fetch');
      const profileRes = await authFetch('/api/auth/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          username,
          email: vimoreId,
          phone: data.phone || null,
          nationality: data.nationality || '',
          dob: data.dob || '',
          gender: data.gender || '',
          securityQuestion: data.securityQuestion || '',
          securityAnswer: data.securityAnswer || '',
          referralCode,
        }),
      });
      if (!profileRes.ok) {
        const profileErr = await profileRes.json().catch(() => ({}));
        throw new Error(profileErr.error || 'Failed to create user profile.');
      }
      const profileResult = await profileRes.json();
      const assignedRole = profileResult.role || 'USER';

      // Fetch the profile doc we just created to build the local user object
      const newDoc = await databases.getDocument(DATABASE_ID, COL.USERS, authUser.$id);
      const user = mapDocToUser(authUser, newDoc);
      setCurrentUserState(user);

      try {
        const saved = JSON.parse(localStorage.getItem('vimore_saved_accounts') || '[]');
        const already = saved.find((a: any) => a.vimoreId === vimoreId);
        if (!already) {
          saved.unshift({ id: authUser.$id, vimoreId, name: data.name, avatar: null });
          localStorage.setItem('vimore_saved_accounts', JSON.stringify(saved.slice(0, 10)));
        }
      } catch { /* ignore */ }

      if (data.referredBy) {
        try {
          const referrerRes = await databases.listDocuments(DATABASE_ID, COL.USERS, [
            Query.equal('username', data.referredBy), Query.limit(1),
          ]);
          const referrerDoc = referrerRes.documents[0];
          if (referrerDoc) {
            const referralBonus = 5000;
            await Promise.allSettled([
              databases.updateDocument(DATABASE_ID, COL.USERS, referrerDoc.$id, {
                star_balance: (referrerDoc.star_balance || 0) + referralBonus,
                referral_count: (referrerDoc.referral_count || 0) + 1,
              }),
              databases.createDocument(DATABASE_ID, COL.FOLLOWS, ID.unique(), {
                follower_id: authUser.$id,
                following_id: referrerDoc.$id,
                follower_username: username,
                following_username: referrerDoc.username,
              }),
              databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
                user_id: referrerDoc.$id,
                type: 'SYSTEM',
                title: 'Referral Bonus!',
                content: `${data.name} (@${username}) joined via your referral link. You earned ${referralBonus} stars!`,
                message: `${data.name} (@${username}) joined via your referral link. You earned ${referralBonus} stars!`,
                is_read: false,
              }),
            ]);
          }
        } catch { /* referral processing failure should not block signup */ }
        try { localStorage.removeItem('vimore_referrer'); } catch { /* ignore */ }
      }

      await Promise.allSettled([
        loadFeed(),
        loadSocialGraph(authUser.$id),
        loadConnections(authUser.$id, username),
        loadStories(),
        loadClusters(authUser.$id),
        loadCampaigns(),
        loadChatReadReceipts(authUser.$id),
      ]);

      setIsLoadingState(false);
      toast({ title: "Welcome to ViMore!", description: "Your account is ready." });
      return { success: true };
    } catch (err: any) {
      setIsLoadingState(false);
      logAppwriteError('signup', err);
      const msg = formatErrorDescription(err, null) || 'Signup failed. Please try again.';
      return { success: false, message: msg };
    }
  }, [toast, loadFeed, loadSocialGraph, loadConnections, loadStories, loadClusters, loadCampaigns, loadChatReadReceipts]);

  const logout = useCallback(async () => {
    try { await account.deleteSession('current'); } catch { /* ignore */ }
    if (typeof window !== 'undefined') {
      try {
        const uid = currentUser?.$id;
        if (uid) localStorage.removeItem(`vimore_unread_signals_${uid}`);
      } catch { /* ignore */ }
    }
    offlineCache.clearUser();
    setIsOffline(false);
    setCurrentUserState(null);
    setPostsState([]);
    setStoriesState([]);
    setConnectionsState([]);
    setClustersState([]);
    setChatMessages({});
    setChatLastIncomingAt({});
    setChatReadReceipts({});
    setChatReadReceiptDocIds({});
    setLikedPostIdsState(new Set());
    setUnlikedPostIdsState(new Set());
    setSavedPostIdsState(new Set());
    setUnlockedPostIdsState(new Set());
    setFollowingUsernamesState(new Set());
    setFollowerUsernamesState(new Set());
    setFriendUsernamesState(new Set());
    setSentRequestUsernamesState(new Set());
    setReceivedRequestUsernamesState(new Set());
    setActiveSubscriptionsState(new Set());
    toast({ title: "Signed out", description: "See you next time!" });
    router.push("/login");
  }, [router, toast]);

  const uploadMedia = useCallback(async (file: File, bucketId: string = BUCKET.POST_MEDIA): Promise<string> => {
    const { uploadViaClient } = await import('@/lib/upload');
    const fileId = await uploadViaClient(file, bucketId);
    return getFileUrl(bucketId, fileId);
  }, []);

  const updateCurrentUser = useCallback(async (data: Partial<User>) => {
    if (!currentUser) return;

    // Build the server-side payload with only the fields the API allows
    const payload: Record<string, any> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.bio !== undefined) payload.bio = data.bio;
    if (data.category !== undefined) payload.category = data.category;
    if (data.nationality !== undefined) payload.nationality = data.nationality;
    if (data.dateOfBirth !== undefined) payload.date_of_birth = data.dateOfBirth;
    if (data.gender !== undefined) payload.gender = data.gender;
    if (data.language !== undefined) payload.language = data.language;
    if (data.phone !== undefined) payload.phone = data.phone;

    if (data.avatar !== undefined) {
      const fileId = extractFileId(data.avatar);
      if (fileId) payload.avatar_id = fileId;
    }
    if (data.cover !== undefined) {
      const fileId = extractFileId(data.cover);
      if (fileId) payload.cover_id = fileId;
    }

    if (Object.keys(payload).length === 0) return;

    const res = await authFetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(result?.error || 'Profile update failed');
    }

    setCurrentUserState(prev => prev ? { ...prev, ...data } : null);
    if (data.avatar !== undefined || data.name !== undefined || data.cover !== undefined) {
      setPostsState(prev => prev.map(p =>
        p.user?.$id === currentUser.$id
          ? { ...p, user: { ...p.user, ...(data.avatar !== undefined ? { avatar: data.avatar } : {}), ...(data.name !== undefined ? { name: data.name } : {}), ...(data.cover !== undefined ? { cover: data.cover } : {}) } }
          : p
      ));
    }
    toast({ title: "Profile updated" });
  }, [currentUser, toast]);

  const updateSettings = (data: Partial<AppSettings>) => {
    setSettingsState(prev => ({ ...prev, ...data }));
  };

  const refreshFeed = useCallback(async () => { await loadFeed(); }, [loadFeed]);
  const refreshStories = useCallback(async () => { if (currentUser) await loadStories(); }, [currentUser, loadStories]);

  const refreshAdminData = useCallback(async () => {
    try {
      const [reportsRes, ticketsRes, campaignsRes, payReqRes, wdRes, logsRes, staffRes] = await Promise.allSettled([
        databases.listDocuments(DATABASE_ID, COL.REPORTS, [Query.orderDesc('$createdAt'), Query.limit(100)]),
        databases.listDocuments(DATABASE_ID, COL.SUPPORT_TICKETS, [Query.orderDesc('$createdAt'), Query.limit(100)]),
        databases.listDocuments(DATABASE_ID, COL.AD_CAMPAIGNS, [Query.orderDesc('$createdAt'), Query.limit(100)]),
        databases.listDocuments(DATABASE_ID, COL.PAYMENT_REQUESTS, [Query.orderDesc('$createdAt'), Query.limit(100)]),
        databases.listDocuments(DATABASE_ID, COL.WITHDRAWAL_REQUESTS, [Query.orderDesc('$createdAt'), Query.limit(100)]),
        databases.listDocuments(DATABASE_ID, COL.AUDIT_LOGS, [Query.orderDesc('$createdAt'), Query.limit(100)]),
        databases.listDocuments(DATABASE_ID, COL.USERS, [Query.notEqual('role', 'USER'), Query.limit(50)]),
      ]);

      if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.documents);
      if (ticketsRes.status === 'fulfilled') setTickets(ticketsRes.value.documents);
      if (campaignsRes.status === 'fulfilled') setCampaignsState(campaignsRes.value.documents);
      if (payReqRes.status === 'fulfilled') setPaymentRequests(payReqRes.value.documents.map((doc: any) => ({
        ...doc,
        packageName: doc.package_name || doc.message || 'Package',
        screenshot: doc.screenshot_id ? getFileUrl(BUCKET.PAYMENT_SCREENSHOTS, doc.screenshot_id) : '',
      })));
      if (wdRes.status === 'fulfilled') setWithdrawalHistory(wdRes.value.documents.map((doc: any) => ({
        ...doc,
        username: doc.username || '',
        accountName: doc.account_name || doc.accountName || '',
        payoutAmount: doc.payout_amount ?? doc.payoutAmount ?? 0,
        payoutCurrency: doc.payout_currency || doc.payoutCurrency || 'USD',
        method: doc.method || doc.payment_method || '',
        amount: doc.amount ?? 0,
        currency: doc.currency || '',
      })));
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value.documents);
      if (staffRes.status === 'fulfilled') setStaff(staffRes.value.documents.map(mapProfileDocToUser));
    } catch (err) {
      logAppwriteError('refreshAdminData', err);
    }
  }, []);

  const refreshAllUsers = useCallback(async () => {
    try {
      const [allUsersRes, broadcastRes] = await Promise.allSettled([
        databases.listDocuments(DATABASE_ID, COL.USERS, [Query.orderDesc('$createdAt'), Query.limit(200)]),
        databases.listDocuments(DATABASE_ID, COL.ADMIN_NOTIFICATIONS, [Query.orderDesc('$createdAt'), Query.limit(50)]),
      ]);
      if (allUsersRes.status === 'fulfilled') {
        setAllUsers(allUsersRes.value.documents.map(mapProfileDocToUser));
      }
      if (broadcastRes.status === 'fulfilled') {
        setBroadcastHistory(broadcastRes.value.documents);
      }
    } catch (err) {
      logAppwriteError('refreshAllUsers', err);
    }
  }, []);

  const banUser = useCallback(async (userId: string, reason: string, note?: string) => {
    if (!currentUser) return;
    setAllUsers(prev => prev.map(u => u.$id === userId ? { ...u, status: 'banned' as const } : u));
    const res = await authFetch('/api/admin/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, reason, note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAllUsers(prev => prev.map(u => u.$id === userId ? { ...u, status: 'active' as const } : u));
      throw new Error(data?.error || 'Ban failed');
    }
  }, [currentUser]);

  const suspendUser = useCallback(async (userId: string, days: number, reason: string, message: string) => {
    if (!currentUser) return;
    const suspendedUntil = new Date(Date.now() + days * 86400000).toISOString();
    setAllUsers(prev => prev.map(u =>
      u.$id === userId
        ? { ...u, status: 'suspended' as const, suspendedUntil, suspensionReason: reason, suspensionMessage: message }
        : u
    ));
    const res = await authFetch('/api/admin/suspend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, days, reason, message }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAllUsers(prev => prev.map(u => u.$id === userId ? { ...u, status: 'active' as const } : u));
      throw new Error(data?.error || 'Suspension failed');
    }
  }, [currentUser]);

  const warnUser = useCallback(async (userId: string, message: string, severity: 'SOFT' | 'FINAL') => {
    if (!currentUser) return;
    const targetUser = allUsers.find(u => u.$id === userId);
    const optimisticCount = (targetUser?.warningCount || 0) + 1;
    setAllUsers(prev => prev.map(u => u.$id === userId ? { ...u, warningCount: optimisticCount } : u));
    try {
      const res = await authFetch('/api/admin/users/warn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: currentUser.$id, userId, message, severity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Warning failed');
      if (typeof data?.warning_count === 'number') {
        setAllUsers(prev => prev.map(u => u.$id === userId ? { ...u, warningCount: data.warning_count } : u));
      }
    } catch (err: any) {
      setAllUsers(prev => prev.map(u => u.$id === userId ? { ...u, warningCount: targetUser?.warningCount || 0 } : u));
      logAppwriteError('warnUser', err);
      toast({ variant: 'destructive', title: 'Warning Failed', description: formatErrorDescription(err, currentUser?.role) });
    }
  }, [currentUser, allUsers, toast]);

  const sendAdminBroadcast = useCallback(async (opts: { title: string; message: string; actionUrl?: string; targetUserIds: string[] | 'all' }) => {
    if (!currentUser) return 0;
    let targets: string[];
    if (opts.targetUserIds === 'all') {
      targets = allUsers.map(u => u.$id).filter(id => id !== currentUser.$id);
    } else {
      targets = opts.targetUserIds;
    }
    try {
      const broadcastDoc = await databases.createDocument(DATABASE_ID, COL.ADMIN_NOTIFICATIONS, ID.unique(), {
        user_id: currentUser.$id,
        type: 'BROADCAST',
        title: opts.title,
        content: opts.message,
        message: opts.message,
        is_read: false,
      });
      setBroadcastHistory(prev => [broadcastDoc, ...prev]);
    } catch (err: any) {
      logAppwriteError('sendAdminBroadcast:log', err);
      const fallbackDoc = {
        $id: 'local_' + Date.now(),
        $createdAt: new Date().toISOString(),
        type: 'BROADCAST',
        title: opts.title,
        content: opts.message,
        message: opts.message,
        user_id: currentUser.$id,
      };
      setBroadcastHistory(prev => [fallbackDoc, ...prev]);
    }
    if (targets.length === 0) {
      throw new Error('No target users found. Ensure users are loaded before broadcasting.');
    }
    const results = await Promise.allSettled(
      targets.map(uid =>
        databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
          user_id: uid,
          type: 'SYSTEM',
          title: opts.title,
          content: opts.message,
          message: opts.message,
          is_read: false,
          ...(opts.actionUrl ? { action_url: opts.actionUrl } : {}),
        })
      )
    );
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      const sample = (results.find(r => r.status === 'rejected') as PromiseRejectedResult)?.reason;
      const detail = sample?.message || sample?.type || 'Unknown Appwrite error';
      throw new Error(`${succeeded}/${targets.length} delivered. ${failed} failed: ${detail}`);
    }
    return succeeded;
  }, [currentUser, allUsers]);

  const addPost = async (p: any) => {
    if (!currentUser) return;

    const mediaIds: string[] = [];
    let videoId: string | undefined;

    if (p.images && Array.isArray(p.images)) {
      p.images.forEach((url: string) => {
        const fid = extractFileId(url);
        if (fid) mediaIds.push(fid);
      });
    } else if (p.image) {
      const fid = extractFileId(p.image);
      if (fid) mediaIds.push(fid);
    }
    if (p.videoUrl) {
      videoId = extractFileId(p.videoUrl) || undefined;
    }

    const hashtagRegex = /#[\w\u00C0-\u024F]+/g;
    const extractedHashtags: string[] = [...new Set<string>(
      ((p.content || '').match(hashtagRegex) || []).map((t: string) => t.toLowerCase())
    )];

    const taggedUserIds: string[] = Array.isArray(p.taggedUsers)
      ? p.taggedUsers.map((u: any) => (typeof u === 'string' ? u : u.$id)).filter(Boolean)
      : [];

    const docData: Record<string, any> = {
      user_id: currentUser.$id,
      content: p.content || '',
      likes_count: 0,
      unlikes_count: 0,
      comments_count: 0,
      shares_count: 0,
      views_count: 0,
      is_locked: p.isLocked || false,
      is_boosted: false,
      boost_current_views: 0,
      comments_disabled: p.commentsDisabled || false,
    };

    if (extractedHashtags.length > 0) docData.hashtags = extractedHashtags;
    if (taggedUserIds.length > 0) docData.tagged_users = taggedUserIds;
    if (p.linkPreview) docData.link_preview = JSON.stringify(p.linkPreview);
    if (mediaIds.length > 0) docData.image_ids = mediaIds;
    if (videoId) docData.video_id = videoId;
    if (p.theme) docData.theme = p.theme;
    if (p.imageFilter) docData.image_filter = p.imageFilter;
    if (p.feeling) docData.feeling = p.feeling;
    if (p.location) docData.location = p.location;
    if (p.unlockPrice) docData.unlock_price = p.unlockPrice;
    if (p.poll) docData.poll = JSON.stringify(p.poll);
    if (p.sharedPost) {
      docData.shared_post_data = JSON.stringify({
        $id: p.sharedPost.$id,
        content: p.sharedPost.content,
        image: p.sharedPost.image,
        videoUrl: p.sharedPost.videoUrl,
        user: {
          name: p.sharedPost.user?.name,
          username: p.sharedPost.user?.username,
          avatar: p.sharedPost.user?.avatar,
        },
      });
    }

    try {
      const doc = await databases.createDocument(DATABASE_ID, COL.POSTS, ID.unique(), docData);
      const newPost = mapDocToPost(doc, undefined);
      newPost.user = currentUser;
      newPost.hashtags = extractedHashtags;
      newPost.taggedUsers = taggedUserIds;
      if (p.linkPreview) newPost.linkPreview = p.linkPreview;
      if (p.images && p.images.length > 0) { newPost.images = p.images; newPost.image = p.images[0]; }
      if (p.videoUrl) newPost.videoUrl = p.videoUrl;
      if (p.sharedPost) {
        newPost.sharedPost = p.sharedPost;
        databases.updateDocument(DATABASE_ID, COL.POSTS, p.sharedPost.$id, {
          shares_count: (p.sharedPost.shares || 0) + 1,
        }).catch(() => {});
        setPostsState(prev => prev.map(post =>
          post.$id === p.sharedPost.$id ? { ...post, shares: (post.shares || 0) + 1 } : post
        ));
      }
      setPostsState(prev => [newPost, ...prev]);

      await databases.updateDocument(DATABASE_ID, COL.USERS, currentUser.$id, {
        posts_count: (currentUser.posts as number || 0) + 1,
      });
      setCurrentUserState(prev => prev ? { ...prev, posts: (prev.posts as number || 0) + 1 } : null);

      // Notify followers about the new post (fire-and-forget, limit 50)
      databases.listDocuments(DATABASE_ID, COL.FOLLOWS, [
        Query.equal('following_id', currentUser.$id),
        Query.limit(50),
      ]).then(res => {
        res.documents.forEach(follow => {
          if (follow.follower_id && follow.follower_id !== currentUser.$id) {
            databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
              user_id: follow.follower_id,
              from_user_id: currentUser.$id,
              from_user_name: currentUser.name || currentUser.username,
              from_user_avatar: currentUser.avatar || '',
              type: 'POST',
              title: 'New Post',
              content: `${currentUser.name || '@' + currentUser.username} published a new post`,
              message: `${currentUser.name || '@' + currentUser.username} published a new post`,
              post_id: doc.$id,
              is_read: false,
            }).catch(() => {});
          }
        });
      }).catch(() => {});

      // Notify tagged users (fire-and-forget)
      if (taggedUserIds.length > 0) {
        taggedUserIds.forEach(uid => {
          if (uid !== currentUser.$id) {
            databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
              user_id: uid,
              from_user_id: currentUser.$id,
              from_user_name: currentUser.name || currentUser.username,
              from_user_avatar: currentUser.avatar || '',
              type: 'TAG',
              title: 'You were tagged',
              content: `${currentUser.name || '@' + currentUser.username} tagged you in a post`,
              message: `${currentUser.name || '@' + currentUser.username} tagged you in a post`,
              post_id: doc.$id,
              is_read: false,
            }).catch(() => {});
          }
        });
      }
    } catch (err: any) {
      logAppwriteError('addPost', err);
      throw err;
    }
  };

  const deletePost = async (id: string) => {
    const original = posts.find(p => p.$id === id);
    setPostsState(prev => prev.filter(p => p.$id !== id));
    try {
      await databases.deleteDocument(DATABASE_ID, COL.POSTS, id);
      if (currentUser) {
        const newCount = Math.max(0, (currentUser.posts as number || 0) - 1);
        await databases.updateDocument(DATABASE_ID, COL.USERS, currentUser.$id, {
          posts_count: newCount,
        });
        setCurrentUserState(prev => prev ? { ...prev, posts: newCount } : null);
      }
      toast({ title: "Post deleted" });
    } catch (err: any) {
      if (original) setPostsState(prev => [original, ...prev.filter(p => p.$id !== id)]);
      logAppwriteError('deletePost', err);
      toast({ variant: "destructive", title: "Failed to delete post", description: formatErrorDescription(err, currentUser?.role) });
    }
  };

  const editPost = async (id: string, updates: { content?: string; hashtags?: string[] }) => {
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Not signed in', description: 'Please sign in to edit posts.' });
      return;
    }
    const original = posts.find(p => p.$id === id);
    const resolvedHashtags = updates.hashtags !== undefined
      ? updates.hashtags
      : updates.content !== undefined
        ? (updates.content.match(/#[\w\u00C0-\u024F]+/g) || []).map((h: string) => h.toLowerCase())
        : undefined;
    const mergedUpdates = { ...updates, ...(resolvedHashtags !== undefined ? { hashtags: resolvedHashtags } : {}) };
    setPostsState(prev => prev.map(p => p.$id === id ? { ...p, ...mergedUpdates } : p));
    try {
      const docUpdates: Record<string, any> = {};
      if (updates.content !== undefined) docUpdates.content = updates.content;
      if (resolvedHashtags !== undefined) docUpdates.hashtags = resolvedHashtags;
      await databases.updateDocument(DATABASE_ID, COL.POSTS, id, docUpdates);
      toast({ title: 'Post Updated', description: 'Your node has been updated.' });
    } catch (err: any) {
      if (original) setPostsState(prev => prev.map(p => p.$id === id ? original : p));
      logAppwriteError('editPost', err);
      toast({ variant: 'destructive', title: 'Update Failed', description: err?.message || formatErrorDescription(err, currentUser?.role) });
    }
  };

  const deleteMessage = async (messageId: string, chatId: string) => {
    let originalMessages: ChatMessage[] = [];
    const isGroupChat = clustersRef.current.some(cl => cl.$id === chatId);
    setChatMessages(prev => {
      originalMessages = prev[chatId] || [];
      return { ...prev, [chatId]: originalMessages.filter(m => m.$id !== messageId) };
    });
    try {
      await databases.deleteDocument(DATABASE_ID, isGroupChat ? COL.GROUP_MESSAGES : COL.MESSAGES, messageId);
    } catch (err: any) {
      setChatMessages(prev => ({ ...prev, [chatId]: originalMessages }));
      logAppwriteError('deleteMessage', err);
      toast({ variant: 'destructive', title: 'Delete Failed', description: err?.message || 'Could not delete message.' });
    }
  };

  const editMessage = async (messageId: string, chatId: string, newText: string) => {
    let originalMessages: ChatMessage[] = [];
    const isGroupChat = clustersRef.current.some(cl => cl.$id === chatId);
    setChatMessages(prev => {
      originalMessages = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: originalMessages.map(m => m.$id === messageId ? { ...m, text: newText } : m),
      };
    });
    try {
      await databases.updateDocument(DATABASE_ID, isGroupChat ? COL.GROUP_MESSAGES : COL.MESSAGES, messageId, { text: newText });
    } catch (err: any) {
      setChatMessages(prev => ({ ...prev, [chatId]: originalMessages }));
      logAppwriteError('editMessage', err);
      toast({ variant: 'destructive', title: 'Update Failed', description: err?.message || 'Could not update message.' });
    }
  };

  const toggleLikePost = async (id: string) => {
    if (!currentUser) return;
    if (pendingReactionIdsRef.current.has(id)) return;
    pendingReactionIdsRef.current.add(id);

    const wasLiked = likedPostIds.has(id);
    const wasUnliked = unlikedPostIds.has(id);

    setLikedPostIdsState(prev => { const n = new Set(prev); if (wasLiked) n.delete(id); else n.add(id); return n; });
    setUnlikedPostIdsState(prev => { const n = new Set(prev); n.delete(id); return n; });
    setPostsState(prev => prev.map(p => p.$id === id ? {
      ...p,
      likes: Math.max(0, p.likes + (wasLiked ? -1 : 1)),
      unlikes: wasUnliked ? Math.max(0, p.unlikes - 1) : p.unlikes,
    } : p));

    try {
      const action = wasLiked ? 'remove-like' : 'like';
      const res = await authFetch('/api/post/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Reaction failed');
      // Sync server-confirmed counts
      setPostsState(prev => prev.map(p => p.$id === id ? {
        ...p,
        likes: data.likesCount ?? p.likes,
        unlikes: data.unlikesCount ?? p.unlikes,
      } : p));
      if (!wasLiked) {
        const likedPost = posts.find(p => p.$id === id);
        if (likedPost && likedPost.user.$id !== currentUser.$id) {
          databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
            user_id: likedPost.user.$id,
            from_user_id: currentUser.$id,
            from_user_name: currentUser.name || currentUser.username,
            from_user_avatar: currentUser.avatar || '',
            type: 'POST',
            title: 'New Like',
            content: `${currentUser.name || '@' + currentUser.username} liked your post`,
            message: `${currentUser.name || '@' + currentUser.username} liked your post`,
            post_id: id,
            is_read: false,
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      logAppwriteError('toggleLikePost', err);
      setLikedPostIdsState(prev => { const n = new Set(prev); if (wasLiked) n.add(id); else n.delete(id); return n; });
      if (wasUnliked) setUnlikedPostIdsState(prev => new Set(prev).add(id));
      setPostsState(prev => prev.map(p => p.$id === id ? {
        ...p,
        likes: Math.max(0, p.likes + (wasLiked ? 1 : -1)),
        unlikes: wasUnliked ? p.unlikes + 1 : p.unlikes,
      } : p));
      toast({ variant: 'destructive', title: 'Reaction Failed', description: formatErrorDescription(err, currentUser?.role) });
    } finally {
      pendingReactionIdsRef.current.delete(id);
    }
  };

  const toggleUnlikePost = async (id: string) => {
    if (!currentUser) return;
    if (pendingReactionIdsRef.current.has(id)) return;
    pendingReactionIdsRef.current.add(id);
    const wasUnliked = unlikedPostIds.has(id);
    const wasLiked = likedPostIds.has(id);

    setUnlikedPostIdsState(prev => { const n = new Set(prev); if (wasUnliked) n.delete(id); else n.add(id); return n; });
    setLikedPostIdsState(prev => { const n = new Set(prev); n.delete(id); return n; });
    setPostsState(prev => prev.map(p => p.$id === id ? {
      ...p,
      unlikes: Math.max(0, p.unlikes + (wasUnliked ? -1 : 1)),
      likes: wasLiked ? Math.max(0, p.likes - 1) : p.likes,
    } : p));

    try {
      const action = wasUnliked ? 'remove-unlike' : 'unlike';
      const res = await authFetch('/api/post/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Reaction failed');
      // Sync server-confirmed counts
      setPostsState(prev => prev.map(p => p.$id === id ? {
        ...p,
        likes: data.likesCount ?? p.likes,
        unlikes: data.unlikesCount ?? p.unlikes,
      } : p));
    } catch (err: any) {
      logAppwriteError('toggleUnlikePost', err);
      setUnlikedPostIdsState(prev => { const n = new Set(prev); if (wasUnliked) n.add(id); else n.delete(id); return n; });
      if (wasLiked) setLikedPostIdsState(prev => new Set(prev).add(id));
      setPostsState(prev => prev.map(p => p.$id === id ? {
        ...p,
        unlikes: Math.max(0, p.unlikes + (wasUnliked ? 1 : -1)),
        likes: wasLiked ? p.likes + 1 : p.likes,
      } : p));
      toast({ variant: 'destructive', title: 'Reaction Failed', description: formatErrorDescription(err, currentUser?.role) });
    } finally {
      pendingReactionIdsRef.current.delete(id);
    }
  };

  const addComment = async (postId: string, text: string) => {
    if (!currentUser) return;
    const optimistic: PostComment = {
      $id: 'c_' + Date.now(), userId: currentUser.$id, userName: currentUser.name,
      userAvatar: currentUser.avatar, text, time: 'Just now', timestamp: Date.now(),
    };
    setActiveComments(prev => [...prev, optimistic]);
    startTransition(() => {
      setPostsState(prev => prev.map(p =>
        p.$id === postId ? { ...p, comments: p.comments + 1, commentNodes: [...(p.commentNodes || []), optimistic] } : p
      ));
    });

    try {
      const doc = await databases.createDocument(DATABASE_ID, COL.POST_COMMENTS, ID.unique(), {
        post_id: postId, user_id: currentUser.$id, user_name: currentUser.name,
        user_avatar: currentUser.avatar, text, timestamp: Date.now(),
      });
      const real = mapDocToComment(doc);
      setActiveComments(prev => prev.map(c => c.$id === optimistic.$id ? real : c));
      const commentedPost = posts.find(p => p.$id === postId);
      await databases.updateDocument(DATABASE_ID, COL.POSTS, postId, {
        comments_count: (commentedPost?.comments || 0) + 1,
      });
      if (commentedPost && commentedPost.user.$id !== currentUser.$id) {
        databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
          user_id: commentedPost.user.$id,
          from_user_id: currentUser.$id,
          from_user_name: currentUser.name || currentUser.username,
          from_user_avatar: currentUser.avatar || '',
          type: 'POST',
          title: 'New Comment',
          content: `${currentUser.name || '@' + currentUser.username} commented: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`,
          message: `${currentUser.name || '@' + currentUser.username} commented on your post`,
          post_id: postId,
          is_read: false,
        }).catch(() => {});
      }
    } catch { /* keep optimistic */ }
  };

  const addReply = async (postId: string, parentId: string, text: string) => {
    if (!currentUser) return;
    const optimistic: PostComment = {
      $id: 'r_' + Date.now(), userId: currentUser.$id, userName: currentUser.name,
      userAvatar: currentUser.avatar, text, time: 'Just now', timestamp: Date.now(), parentId,
    };
    setActiveComments(prev => [...prev, optimistic]);
    startTransition(() => {
      setPostsState(prev => prev.map(p =>
        p.$id === postId ? { ...p, commentNodes: [...(p.commentNodes || []), optimistic] } : p
      ));
    });
    try {
      await databases.createDocument(DATABASE_ID, COL.POST_COMMENTS, ID.unique(), {
        post_id: postId, user_id: currentUser.$id, user_name: currentUser.name,
        user_avatar: currentUser.avatar, text, parent_id: parentId, timestamp: Date.now(),
      });
    } catch { /* keep optimistic */ }
  };

  const addStory = async (segment: any) => {
    if (!currentUser) return;
    try {
      const expires_at = new Date(Date.now() + 86400000).toISOString();
      const rawMediaUrl = segment.mediaUrl || segment.image || '';
      // Only use explicitly provided fileId (from story media uploads).
      // Do NOT extract from post/other media URLs — those belong to different buckets.
      const mediaId: string | undefined = segment.fileId || undefined;

      const storyDoc = await databases.createDocument(DATABASE_ID, COL.STORIES, ID.unique(), {
        user_id: currentUser.$id,
        expires_at,
        views_count: 0,
        story_url: rawMediaUrl || '',
      });

      const segData: Record<string, any> = {
        story_id: storyDoc.$id,
        type: segment.type || 'image',
        order_index: 0,
        duration: segment.duration || 5,
        story_url: rawMediaUrl || '',
      };
      if (mediaId) segData.media_id = mediaId;
      if (segment.text) segData.text = segment.text;

      await databases.createDocument(DATABASE_ID, COL.STORY_SEGMENTS, ID.unique(), segData);

      const newSegment = { $id: 'seg_tmp_' + Date.now(), ...segment, mediaUrl: rawMediaUrl || undefined };
      setStoriesState(prev => {
        const existingIdx = prev.findIndex(s => s.user.$id === currentUser.$id || s.user.username === currentUser.username);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], segments: [...updated[existingIdx].segments, newSegment] };
          return updated;
        }
        return [{ $id: storyDoc.$id, user: currentUser, segments: [newSegment], expires_at, viewCount: 0 }, ...prev];
      });
    } catch (err: any) {
      logAppwriteError('addStory', err);
      throw err;
    }
  };

  const deleteStory = async (storyId: string) => {
    if (!currentUser) return;
    try {
      // Remove from local state immediately
      setStoriesState(prev => prev.filter(s => s.$id !== storyId));
      // Delete segments first
      const segsResult = await databases.listDocuments(DATABASE_ID, COL.STORY_SEGMENTS, [
        Query.equal('story_id', storyId), Query.limit(50),
      ]);
      await Promise.allSettled(
        segsResult.documents.map(async seg => {
          if (seg.media_id) {
            try { await storage.deleteFile(BUCKET_STORIES, seg.media_id); } catch { /* ignore */ }
          }
          await databases.deleteDocument(DATABASE_ID, COL.STORY_SEGMENTS, seg.$id);
        })
      );
      // Delete the story doc
      await databases.deleteDocument(DATABASE_ID, COL.STORIES, storyId);
    } catch (err: any) {
      logAppwriteError('deleteStory', err);
      throw err;
    }
  };

  const sendFriendRequest = useCallback(async (targetUsername: string) => {
    if (!currentUser) return;

    // Optimistic UI updates.
    const alreadyFollowing = followingUsernames.has(targetUsername);
    const prevFollowing = currentUser.following as number || 0;
    setSentRequestUsernamesState(p => new Set(p).add(targetUsername));
    if (!alreadyFollowing) {
      setFollowingUsernamesState(prev => new Set(prev).add(targetUsername));
      setCurrentUserState(prev => prev ? { ...prev, following: prevFollowing + 1 } : null);
    }

    try {
      const res = await authFetch('/api/friends/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', targetUsername }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Could not send friend request. Please try again.');
      }
      toast({ title: "Friend request sent!" });
    } catch (err: any) {
      // Roll back optimistic state on failure.
      setSentRequestUsernamesState(p => { const n = new Set(p); n.delete(targetUsername); return n; });
      if (!alreadyFollowing) {
        setFollowingUsernamesState(prev => { const n = new Set(prev); n.delete(targetUsername); return n; });
        setCurrentUserState(prev => prev ? { ...prev, following: prevFollowing } : null);
      }
      logAppwriteError('sendFriendRequest', err);
      toast({ variant: 'destructive', title: 'Request Failed', description: err?.message || 'Could not send friend request. Please try again.' });
    }
  }, [currentUser, followingUsernames, toast]);

  const confirmFriendRequest = useCallback(async (username: string) => {
    if (!currentUser) return;

    // Optimistic UI updates.
    setFriendUsernamesState(p => new Set(p).add(username));
    setReceivedRequestUsernamesState(p => { const n = new Set(p); n.delete(username); return n; });
    setFollowingUsernamesState(prev => new Set(prev).add(username));

    const senderDoc = allUsers.find(u => u.username === username);
    if (senderDoc) {
      setConnectionsState(prev => {
        if (prev.find(c => c.username === senderDoc.username)) return prev;
        const newConn: Connection = {
          ...senderDoc,
          isGroup: false,
          lastMessage: '',
          lastTime: '',
        };
        return [...prev, newConn];
      });
    }

    try {
      const res = await authFetch('/api/friends/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', targetUsername: username }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Could not confirm request.');
      }
    } catch (err: any) {
      // Roll back optimistic membership on failure.
      setFriendUsernamesState(p => { const n = new Set(p); n.delete(username); return n; });
      setReceivedRequestUsernamesState(p => new Set(p).add(username));
      logAppwriteError('confirmFriendRequest', err);
      toast({ variant: 'destructive', title: 'Failed to confirm request', description: formatErrorDescription(err, currentUser?.role) });
    }
  }, [currentUser, allUsers, toast]);

  const cancelFriendRequest = useCallback(async (username: string) => {
    if (!currentUser) return;
    const prevFollowing = currentUser.following as number || 0;
    const wasFollowing = followingUsernames.has(username);
    const targetDoc: any = allUsers.find(u => u.username === username) || null;

    // Optimistic UI updates.
    setSentRequestUsernamesState(p => { const n = new Set(p); n.delete(username); return n; });
    setFollowingUsernamesState(prev => { const n = new Set(prev); n.delete(username); return n; });
    if (targetDoc) setFollowingUserIdsState(prev => { const n = new Set(prev); n.delete(targetDoc.$id); return n; });
    const newFollowing = Math.max(0, prevFollowing - 1);
    setCurrentUserState(prev => prev ? { ...prev, following: newFollowing } : null);

    try {
      const res = await authFetch('/api/friends/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', targetUsername: username }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Could not cancel request.');
      }
    } catch (err) {
      // Roll back optimistic state on failure.
      setSentRequestUsernamesState(p => new Set(p).add(username));
      if (wasFollowing) setFollowingUsernamesState(prev => new Set(prev).add(username));
      setCurrentUserState(prev => prev ? { ...prev, following: prevFollowing } : null);
      logAppwriteError('cancelFriendRequest', err);
    }
  }, [currentUser, allUsers, followingUsernames]);

  const unfriendUser = useCallback(async (username: string) => {
    if (!currentUser) return;
    const prevFollowing = currentUser.following as number || 0;
    const prevFollowers = currentUser.followers as number || 0;
    const wasFollowing = followingUsernames.has(username);
    const targetUser = allUsers.find(u => u.username === username);

    // Optimistic UI updates.
    setFriendUsernamesState(p => { const n = new Set(p); n.delete(username); return n; });
    setFollowingUsernamesState(prev => { const n = new Set(prev); n.delete(username); return n; });
    if (targetUser) setFollowingUserIdsState(prev => { const n = new Set(prev); n.delete(targetUser.$id); return n; });
    const newFollowing = Math.max(0, prevFollowing - 1);
    const newFollowers = Math.max(0, prevFollowers - 1);
    setCurrentUserState(prev => prev ? { ...prev, following: newFollowing, followers: newFollowers } : null);

    try {
      const res = await authFetch('/api/friends/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unfriend', targetUsername: username }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Unfriend failed');
      }
      toast({ title: "Unfriended" });
    } catch (err) {
      // Roll back optimistic state on failure.
      setFriendUsernamesState(p => new Set(p).add(username));
      if (wasFollowing) setFollowingUsernamesState(prev => new Set(prev).add(username));
      setCurrentUserState(prev => prev ? { ...prev, following: prevFollowing, followers: prevFollowers } : null);
      logAppwriteError('unfriendUser', err);
      toast({ variant: "destructive", title: "Unfriend failed" });
    }
  }, [currentUser, allUsers, followingUsernames, toast]);

  const sendChatMessage = useCallback(async (recipientId: string, message: Partial<ChatMessage>) => {
    if (!currentUser) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const optimistic: ChatMessage = {
      $id: 'msg_' + Date.now(),
      sender: 'me',
      senderId: currentUser.$id,
      text: message.text,
      time,
      status: 'sent',
      type: message.type || 'text',
      ...message,
    };
    setChatMessages(prev => ({ ...prev, [recipientId]: [...(prev[recipientId] || []), optimistic] }));
    setChatLastMessageAt(prev => ({ ...prev, [recipientId]: Date.now() }));
    const preview = getChatMessagePreview(optimistic);
    setConnectionsState(prev => prev.map(c =>
      c.username === recipientId ? { ...c, lastMessage: preview, lastTime: time } : c
    ));
    setClustersState(prev => prev.map(cl =>
      cl.$id === recipientId ? { ...cl, lastMessage: preview, lastTime: time } : cl
    ));

    try {
      const isClusterMsg = clusters.some(cl => cl.$id === recipientId);
      const clusterId = isClusterMsg ? recipientId : [currentUser.username, recipientId].sort().join('_');
      const docData: Record<string, any> = {
        cluster_id: clusterId,
        sender_id: currentUser.$id,
        sender_name: currentUser.name || currentUser.username,
        type: message.type || 'text',
        is_read: false,
      };
      if (!isClusterMsg) {
        const recipientConn = connections.find(c => c.username === recipientId);
        if (recipientConn?.$id) docData.receiver_id = recipientConn.$id;
      }
      if (message.text) docData.text = message.text;
      if (currentUser.avatar) docData.sender_avatar = currentUser.avatar;
      if (message.mediaUrl) {
        const fid = extractFileId(message.mediaUrl);
        if (fid) docData.media_id = fid;
        docData.media_url = message.mediaUrl;
      }
      if (message.voiceDuration) docData.voice_duration = message.voiceDuration;
      if (message.postId) docData.post_id = message.postId;
      if (message.sharedPostData) docData.shared_post_data = JSON.stringify(message.sharedPostData);
      if (message.replyToId) docData.reply_to_id = message.replyToId;
      if (message.replyToText) docData.reply_to_text = message.replyToText;
      if (message.replyToSenderName) docData.reply_to_sender_name = message.replyToSenderName;
      if (message.replyToType) docData.reply_to_type = message.replyToType;
      await databases.createDocument(DATABASE_ID, isClusterMsg ? COL.GROUP_MESSAGES : COL.MESSAGES, ID.unique(), docData);

      // Deliver a Web Push to the recipient(s) for the new chat message
      try {
        const recipientIds: string[] = [];
        if (isClusterMsg) {
          const cluster = clusters.find(cl => cl.$id === recipientId);
          (cluster?.members || [])
            .map((m: any) => m.$id || m.userId || m.id)
            .filter(Boolean)
            .filter((id: string) => id !== currentUser.$id)
            .forEach((id: string) => recipientIds.push(id));
        } else if (docData.receiver_id) {
          recipientIds.push(docData.receiver_id);
        }
        if (recipientIds.length) {
          recipientIds.forEach((rid) => {
            firePush({
              userId: rid,
              title: currentUser.name || currentUser.username || 'New message',
              body: preview,
              url: `/messages?chat=${encodeURIComponent(recipientId)}`,
              icon: currentUser.avatar || '/icons/icon-192.png',
              tag: `vimore-chat-${clusterId}`,
              data: {
                type: 'MESSAGE',
                clusterId,
                senderId: currentUser.$id,
                recipientId: rid,
              },
              actions: [
                { action: 'reply', type: 'text', title: 'Reply', placeholder: 'Type a message…' },
                { action: 'mark-read', title: 'Mark as read' },
              ],
            });
          });
        }
      } catch { /* push is best-effort */ }
    } catch (err: any) {
      setChatMessages(prev => ({
        ...prev,
        [recipientId]: (prev[recipientId] || []).filter(m => m.$id !== optimistic.$id),
      }));
      logAppwriteError('sendChatMessage', err);
      toast({ variant: 'destructive', title: 'Message Failed', description: err?.message || 'Could not deliver your message. Please try again.' });
      throw err;
    }
  }, [currentUser, toast, clusters, connections]);

  const sendMessageRequest = useCallback(async (targetUserId: string, targetUser: User, text: string) => {
    if (!currentUser || !text.trim()) return;
    await sendChatMessage(targetUserId, { text: text.trim() });
    // Inject target into local connections so sender sees the chat immediately
    setConnectionsState(prev => {
      if (prev.find(c => c.username === targetUser.username)) return prev;
      const tempConn: Connection = {
        ...targetUser,
        isGroup: false,
        lastMessage: text.trim(),
        lastTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      return [tempConn, ...prev];
    });
    // Notify the recipient about the message request
    try {
      await databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
        user_id: targetUserId,
        from_user_id: currentUser.$id,
        from_user_name: currentUser.name || currentUser.username,
        from_user_avatar: currentUser.avatar || '',
        type: 'MESSAGE',
        message: `${currentUser.name} (@${currentUser.username}) sent you a message: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`,
        is_read: false,
      });
    } catch { /* ignore notification failure */ }
  }, [currentUser, sendChatMessage]);

  const unlockPost = useCallback(async (postId: string, _ignoredCost: number) => {
    if (!currentUser) return;
    const res = await authFetch('/api/monetization/unlock-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Unlock failed');
    }
    window.location.href = data.dialerUri;
    toast({ title: "Orange Money payment started", description: `Pay ${data.amountLD} LD to unlock this post.` });
  }, [currentUser, toast]);

  const subscribeToCreator = useCallback(async (username: string, _ignoredCost: number) => {
    if (!currentUser) return;
    const creatorUser = allUsers.find(u => u.username === username);
    const creatorId = creatorUser?.$id || username;

    // Optimistic UI
    setActiveSubscriptionsState(p => new Set(p).add(username));

    const res = await authFetch('/api/transaction/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActiveSubscriptionsState(p => { const n = new Set(p); n.delete(username); return n; });
      throw new Error(data?.error || 'Subscription failed');
    }
    if (typeof data.subscriberNewBalance === 'number') {
      setCurrentUserState(prev => prev ? { ...prev, diamondBalance: data.subscriberNewBalance } : null);
    }
    toast({ title: "Subscribed!", description: `${data.creatorShare ?? ''} Credits sent to @${username} · ${data.platformFee ?? ''} Credits platform fee` });
  }, [currentUser, allUsers, toast]);

  const cancelSubscription = useCallback(async (username: string) => {
    if (!currentUser) return;
    setActiveSubscriptionsState(p => { const n = new Set(p); n.delete(username); return n; });
    const creatorUser = allUsers.find(u => u.username === username);
    const creatorId = creatorUser?.$id || username;

    try {
      const existing = await databases.listDocuments(DATABASE_ID, COL.SUBSCRIPTIONS, [
        Query.equal('subscriber_id', currentUser.$id),
        Query.equal('creator_id', creatorId),
        Query.equal('status', 'ACTIVE'),
      ]);
      for (const doc of existing.documents) {
        await databases.updateDocument(DATABASE_ID, COL.SUBSCRIPTIONS, doc.$id, { status: 'CANCELLED' });
      }
    } catch { /* ignore */ }
    toast({ title: "Subscription cancelled" });
  }, [currentUser, allUsers, toast]);

  const processGiftTransaction = useCallback(async (cost: number, _currency: 'GOLD' | 'DIAMOND' = 'DIAMOND') => {
    if (!currentUser) throw new Error("Not logged in");
    if (!targetUserForGift) throw new Error("No recipient selected");

    // Optimistic balance deduction for snappy UI
    setCurrentUserState(prev => prev ? { ...prev, diamondBalance: (prev.diamondBalance || 0) - cost } : null);

    const res = await authFetch('/api/transaction/gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: targetUserForGift.$id, amount: cost }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Rollback optimistic deduction
      setCurrentUserState(prev => prev ? { ...prev, diamondBalance: (prev.diamondBalance || 0) + cost } : null);
      throw new Error(data?.error || 'Gift failed');
    }
    if (typeof data.senderNewBalance === 'number') {
      setCurrentUserState(prev => prev ? { ...prev, diamondBalance: data.senderNewBalance } : null);
    }
    toast({ title: "Gift sent!", description: `${data.creatorShare ?? ''} Credits sent to creator · ${data.platformFee ?? ''} Credits platform fee` });
  }, [currentUser, targetUserForGift, toast]);

  const verifyUser = useCallback(async (cost: number, currency: 'DIAMOND' | 'STAR') => {
    if (!currentUser) return;

    const res = await authFetch('/api/transaction/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency, cost }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Verification failed');
    }
    if (data.alreadyVerified) {
      toast({ title: "Already Verified ✅", description: "Your account is already verified." });
      return;
    }
    if (data.alreadyPending) {
      toast({ title: "Pending Review ⏳", description: "Your verification request is already under admin review." });
      return;
    }
    // Deduct balance optimistically now that server confirmed
    if (typeof data.newBalance === 'number') {
      setCurrentUserState(prev => {
        if (!prev) return null;
        return currency === 'DIAMOND'
          ? { ...prev, diamondBalance: data.newBalance }
          : { ...prev, starBalance: data.newBalance };
      });
    }
    toast({
      title: "Verification Submitted ⏳",
      description: "Your request is under admin review. You'll be notified once approved.",
    });
  }, [currentUser, toast]);

  const fetchProfileByUsername = useCallback(async (username: string): Promise<User | null> => {
    try {
      const result = await databases.listDocuments(DATABASE_ID, COL.USERS, [
        Query.equal('username', username), Query.limit(1),
      ]);
      if (result.documents.length === 0) return null;
      return mapProfileDocToUser(result.documents[0]);
    } catch {
      return null;
    }
  }, []);

  const fetchProfilePosts = useCallback(async (userId: string, cursor?: string | null): Promise<{ posts: Post[]; cursor: string | null; hasMore: boolean }> => {
    const queries: any[] = [
      Query.equal('user_id', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(15),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    try {
      const result = await databases.listDocuments(DATABASE_ID, COL.POSTS, queries);
      const authorIds = [...new Set(result.documents.map((p: any) => p.user_id).filter(Boolean))];
      let authorsMap: Record<string, any> = {};
      if (authorIds.length > 0) {
        try {
          const authorsResult = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('$id', authorIds)]);
          authorsMap = Object.fromEntries(authorsResult.documents.map((u: any) => [u.$id, u]));
        } catch { /* ignore */ }
      }
      const mapped = result.documents.map((doc: any) => mapDocToPost(doc, authorsMap[doc.user_id]));
      const newCursor = result.documents.length > 0 ? result.documents[result.documents.length - 1].$id : null;
      return { posts: mapped, cursor: newCursor, hasMore: result.documents.length === 15 };
    } catch {
      return { posts: [], cursor: null, hasMore: false };
    }
  }, []);

  const fetchReels = useCallback(async (params: {
    phase: 'connections' | 'global';
    connIds: string[];
    connCursor: string | null;
    globalCursor: string | null;
  }): Promise<{ posts: Post[]; phase: 'connections' | 'global'; connCursor: string | null; globalCursor: string | null; hasMore: boolean }> => {
    const PAGE = 15;
    let { phase, connIds, connCursor, globalCursor } = params;

    try {
      const videoFilter = Query.or([Query.equal('type', 'reel'), Query.isNotNull('video_id')]);

      if (phase === 'connections' && connIds.length > 0) {
        const q: any[] = [
          videoFilter,
          Query.equal('user_id', connIds),
          Query.orderDesc('$createdAt'),
          Query.limit(PAGE),
        ];
        if (connCursor) q.push(Query.cursorAfter(connCursor));
        const r = await databases.listDocuments(DATABASE_ID, COL.POSTS, q);
        if (r.documents.length > 0) connCursor = r.documents[r.documents.length - 1].$id;

        if (r.documents.length === PAGE) {
          // Still in connection phase — return connection results only
          return { posts: await withAuthors(r.documents), phase: 'connections', connCursor, globalCursor, hasMore: true };
        }

        // Connection phase exhausted — fill remainder from global
        phase = 'global';
        const connDocs = r.documents;
        const remaining = PAGE - connDocs.length;
        const connDocIds = new Set(connDocs.map((d: any) => d.$id));
        const gq: any[] = [videoFilter, Query.orderDesc('$createdAt'), Query.limit(PAGE)];
        if (globalCursor) gq.push(Query.cursorAfter(globalCursor));
        const gr = await databases.listDocuments(DATABASE_ID, COL.POSTS, gq);
        const newGlobal = gr.documents.filter((d: any) => !connDocIds.has(d.$id)).slice(0, remaining);
        if (gr.documents.length > 0) globalCursor = gr.documents[gr.documents.length - 1].$id;

        return {
          posts: await withAuthors([...connDocs, ...newGlobal]),
          phase: 'global',
          connCursor,
          globalCursor,
          hasMore: gr.documents.length === PAGE,
        };
      }

      // Global phase — cursor-paginate through all reels and video posts
      const q: any[] = [videoFilter, Query.orderDesc('$createdAt'), Query.limit(PAGE)];
      if (globalCursor) q.push(Query.cursorAfter(globalCursor));
      const r = await databases.listDocuments(DATABASE_ID, COL.POSTS, q);
      if (r.documents.length > 0) globalCursor = r.documents[r.documents.length - 1].$id;

      return {
        posts: await withAuthors(r.documents),
        phase: 'global',
        connCursor,
        globalCursor,
        hasMore: r.documents.length === PAGE,
      };
    } catch {
      return { posts: [], phase, connCursor, globalCursor, hasMore: false };
    }
  }, [withAuthors]);

  const searchAllUsers = useCallback(async (query: string): Promise<User[]> => {
    if (!query.trim()) return [];
    try {
      const [byName, byUsername] = await Promise.allSettled([
        databases.listDocuments(DATABASE_ID, COL.USERS, [
          Query.startsWith('name', query), Query.limit(20),
        ]),
        databases.listDocuments(DATABASE_ID, COL.USERS, [
          Query.startsWith('username', query), Query.limit(20),
        ]),
      ]);
      const seen = new Set<string>();
      const results: User[] = [];
      const addDocs = (docs: any[]) => {
        for (const doc of docs) {
          if (!seen.has(doc.$id)) {
            seen.add(doc.$id);
            results.push(mapProfileDocToUser(doc));
          }
        }
      };
      if (byName.status === 'fulfilled') addDocs(byName.value.documents);
      if (byUsername.status === 'fulfilled') addDocs(byUsername.value.documents);
      return results;
    } catch {
      return [];
    }
  }, []);

  const fetchAllUsersForDiscovery = useCallback(async (): Promise<User[]> => {
    try {
      const result = await databases.listDocuments(DATABASE_ID, COL.USERS, [
        Query.limit(200),
        Query.orderDesc('$createdAt'),
      ]);
      return result.documents.map(mapProfileDocToUser);
    } catch {
      return [];
    }
  }, []);

  const fetchComments = useCallback(async (postId: string) => {
    try {
      const result = await databases.listDocuments(DATABASE_ID, COL.POST_COMMENTS, [
        Query.equal('post_id', postId),
        Query.orderAsc('$createdAt'),
        Query.limit(100),
      ]);
      setActiveComments(result.documents.map(mapDocToComment));
    } catch { /* ignore */ }
  }, []);

  const refreshClusters = useCallback(async () => {
    if (currentUser) await loadClusters(currentUser.$id);
  }, [currentUser, loadClusters]);

  const refreshProfiles = useCallback(async () => {
    try {
      const result = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.limit(50)]);
      return result.documents.map(mapProfileDocToUser);
    } catch { return []; }
  }, []);

  const addAuditLog = useCallback(async (action: string, details: string) => {
    const newLog = {
      $id: 'log_' + Date.now(),
      action,
      details,
      performed_by: currentUser?.username || 'system',
      performed_by_avatar: currentUser?.avatar,
      $createdAt: new Date().toISOString(),
    };
    setAuditLogs(prev => [newLog, ...prev]);
    try {
      await databases.createDocument(DATABASE_ID, COL.AUDIT_LOGS, ID.unique(), {
        action, details,
        performed_by: currentUser?.username || 'system',
        performed_by_avatar: currentUser?.avatar || '',
      });
    } catch (err) { logAppwriteError('addAuditLog', err); }
  }, [currentUser]);

  const createPaymentRequest = useCallback(async (screenshotUrl: string) => {
    if (!currentUser) return;

    let screenshotFileId: string;
    try {
      if (screenshotUrl.startsWith('data:')) {
        const arr = screenshotUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        const file = new File([u8arr], 'receipt.jpg', { type: mime });
        const { uploadViaClient } = await import('@/lib/upload');
        screenshotFileId = await uploadViaClient(file, BUCKET.PAYMENT_SCREENSHOTS);
      } else {
        screenshotFileId = extractFileId(screenshotUrl) || screenshotUrl;
      }
    } catch {
      screenshotFileId = 'upload_failed';
    }

    const req: Record<string, any> = {
      $id: 'pay_' + Date.now(),
      user_id: currentUser.$id,
      username: currentUser.username,
      package_name: pendingTransaction?.packageName || 'Package',
      amount: pendingTransaction?.amount || '0',
      currency: pendingTransaction?.currency || 'USD',
      code: pendingTransaction?.code || '',
      screenshot_id: screenshotFileId,
      status: 'PENDING',
    };
    setPaymentRequests(prev => [req, ...prev]);

    try {
      await databases.createDocument(DATABASE_ID, COL.PAYMENT_REQUESTS, ID.unique(), {
        user_id: currentUser.$id,
        from_user_id: currentUser.$id,
        to_user_id: 'platform',
        username: currentUser.username,
        name: currentUser.name,
        currency: pendingTransaction?.currency || 'USD',
        amount: parseFloat(pendingTransaction?.amount || '0'),
        message: pendingTransaction?.packageName || '',
        package_name: pendingTransaction?.packageName || '',
        coin_type: pendingTransaction?.type || 'Gold',
        coin_amount: pendingTransaction?.coinAmount || 0,
        screenshot_id: screenshotFileId,
        status: 'PENDING',
      });
    } catch (err: any) {
      logAppwriteError('createPaymentRequest', err);
      throw err;
    }
  }, [currentUser, pendingTransaction, toast]);

  const approvePaymentRequest = async (id: string) => {
    setPaymentRequests(prev => prev.map(r => r.$id === id ? { ...r, status: 'APPROVED' } : r));
    const res = await authFetch('/api/payment/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPaymentRequests(prev => prev.map(r => r.$id === id ? { ...r, status: 'PENDING' } : r));
      throw new Error(data?.error || 'Approval failed');
    }
  };

  const rejectPaymentRequest = async (id: string) => {
    setPaymentRequests(prev => prev.map(r => r.$id === id ? { ...r, status: 'REJECTED' } : r));
    const res = await authFetch('/api/payment/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: id }),
    });
    if (!res.ok) {
      setPaymentRequests(prev => prev.map(r => r.$id === id ? { ...r, status: 'PENDING' } : r));
    }
  };

  const recordWithdrawal = async (n: any) => {
    if (!currentUser) return;
    const currency: string = (n.currency || 'GOLD').toUpperCase();
    const withdrawAmount = parseFloat(n.amount || 0);
    const balanceField = currency === 'DIAMOND' ? 'diamondBalance' : currency === 'STAR' ? 'starBalance' : 'goldBalance';

    // Unique key so duplicate taps don't double-submit
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const res = await authFetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currency,
        amount: withdrawAmount,
        method: n.method || 'MOBILE_MONEY',
        accountName: n.accountName || '',
        accountNumber: n.accountNumber || n.phoneNumber || '',
        payoutAmount: n.payoutAmount,
        payoutCurrency: n.payoutCurrency || 'USD',
        idempotencyKey,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Withdrawal failed');

    // Update local balance with the server-confirmed value
    setCurrentUserState(prev =>
      prev ? { ...prev, [balanceField]: data.newBalance } : null
    );

    const wd: Record<string, any> = {
      $id: data.withdrawalId,
      ...n,
      status: 'PENDING',
      $createdAt: new Date().toISOString(),
      username: currentUser.username,
      accountName: n.accountName || '',
      method: n.method || '',
    };
    setWithdrawalHistory(prev => [wd, ...prev]);
  };

  const processWithdrawal = async (id: string, status: 'APPROVED' | 'REJECTED', adminMessage?: string, proofImageUrl?: string) => {
    setWithdrawalHistory(prev => prev.map(w => w.$id === id ? { ...w, status } : w));
    try {
      await databases.updateDocument(DATABASE_ID, COL.WITHDRAWAL_REQUESTS, id, { status });
      // Fetch the withdrawal doc to get user_id and amount for notification
      const wdDoc = await databases.getDocument(DATABASE_ID, COL.WITHDRAWAL_REQUESTS, id);
      const notifTitle = status === 'APPROVED' ? 'Withdrawal Approved' : 'Withdrawal Rejected';
      const baseMsg = status === 'APPROVED'
        ? `Your withdrawal of ${wdDoc.amount} ${wdDoc.currency} has been approved.`
        : `Your withdrawal of ${wdDoc.amount} ${wdDoc.currency} has been rejected.`;
      const fullMsg = adminMessage ? `${baseMsg} ${adminMessage}` : baseMsg;
      const notifData: Record<string, any> = {
        user_id: wdDoc.user_id,
        type: 'SYSTEM',
        title: notifTitle,
        message: fullMsg,
        content: fullMsg,
        is_read: false,
      };
      if (proofImageUrl) notifData.image = proofImageUrl;
      await databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), notifData);
      // If REJECTED, refund the balance
      if (status === 'REJECTED') {
        const currency: string = wdDoc.currency || 'GOLD';
        const dbBalanceField = currency === 'DIAMOND' ? 'diamond_balance' : currency === 'STAR' ? 'star_balance' : 'gold_balance';
        const balanceField = currency === 'DIAMOND' ? 'diamondBalance' : currency === 'STAR' ? 'starBalance' : 'goldBalance';
        if (wdDoc.user_id === currentUser?.$id) {
          const currentBalance = (currentUser as any)[balanceField] || 0;
          setCurrentUserState(prev => prev ? { ...prev, [balanceField]: currentBalance + (wdDoc.amount || 0) } : null);
          await databases.updateDocument(DATABASE_ID, COL.USERS, wdDoc.user_id, {
            [dbBalanceField]: currentBalance + (wdDoc.amount || 0),
          });
        } else {
          // Update balance of the user whose withdrawal was rejected (admin side)
          const userRes = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('$id', wdDoc.user_id), Query.limit(1)]);
          if (userRes.documents[0]) {
            const userDoc = userRes.documents[0];
            const dbBal = currency === 'DIAMOND' ? 'diamond_balance' : currency === 'STAR' ? 'star_balance' : 'gold_balance';
            await databases.updateDocument(DATABASE_ID, COL.USERS, userDoc.$id, {
              [dbBal]: (userDoc[dbBal] || 0) + (wdDoc.amount || 0),
            });
          }
        }
      }
    } catch { /* ignore */ }
  };

  const createCluster = async (name: string, members: any[], logoFile?: File) => {
    if (!currentUser) return;
    try {
      let avatarId: string | undefined;
      if (logoFile) {
        const { uploadViaClient } = await import('@/lib/upload');
        avatarId = await uploadViaClient(logoFile, BUCKET.AVATARS);
      }

      const clDocData: Record<string, any> = {
        name, admin_id: currentUser.$id, admin_username: currentUser.username, is_add_locked: false,
      };
      if (avatarId) clDocData.avatar_id = avatarId;

      const clDoc = await databases.createDocument(DATABASE_ID, COL.CLUSTERS, ID.unique(), clDocData);

      const allMembers = [currentUser, ...members];
      const joinedAt = new Date().toISOString();
      await Promise.all(allMembers.map(m =>
        databases.createDocument(DATABASE_ID, COL.CLUSTER_MEMBERS, ID.unique(), {
          cluster_id: clDoc.$id,
          user_id: m.$id,
          role: m.$id === currentUser.$id ? 'ADMIN' : 'MEMBER',
          joined_at: joinedAt,
        })
      ));

      const avatarUrl = avatarId ? getFileUrl(BUCKET.AVATARS, avatarId) : undefined;
      const newCluster: Cluster = {
        $id: clDoc.$id, name, adminUsername: currentUser.username,
        avatar: avatarUrl,
        members: allMembers as User[], isGroup: true,
      };
      setClustersState(prev => [...prev, newCluster]);
    } catch (err: any) {
      logAppwriteError('createCluster', err);
      throw err;
    }
  };

  const addMemberToCluster = async (clusterId: string, member: any) => {
    setClustersState(prev => prev.map(cl =>
      cl.$id === clusterId ? { ...cl, members: [...cl.members, member] } : cl
    ));
    try {
      await databases.createDocument(DATABASE_ID, COL.CLUSTER_MEMBERS, ID.unique(), {
        cluster_id: clusterId, user_id: member.$id, role: 'MEMBER', joined_at: new Date().toISOString(),
      });
    } catch { /* keep optimistic */ }
  };

  const leaveCluster = async (clusterId: string) => {
    if (!currentUser) return;
    const cluster = clusters.find(cl => cl.$id === clusterId);
    if (!cluster) return;

    if (cluster.adminUsername === currentUser.username) {
      setClustersState(prev => prev.filter(cl => cl.$id !== clusterId));
      try { await databases.deleteDocument(DATABASE_ID, COL.CLUSTERS, clusterId); } catch { /* ignore */ }
      toast({ title: "Cluster dissolved" });
    } else {
      setClustersState(prev => prev.map(cl =>
        cl.$id === clusterId ? { ...cl, members: cl.members.filter(m => m.username !== currentUser.username) } : cl
      ));
      try {
        const existing = await databases.listDocuments(DATABASE_ID, COL.CLUSTER_MEMBERS, [
          Query.equal('cluster_id', clusterId), Query.equal('user_id', currentUser.$id),
        ]);
        for (const doc of existing.documents) {
          await databases.deleteDocument(DATABASE_ID, COL.CLUSTER_MEMBERS, doc.$id);
        }
      } catch { /* ignore */ }
      toast({ title: "Left cluster" });
    }
  };

  const updateCluster = async (clusterId: string, updates: { name?: string; cover?: string; isAddLocked?: boolean; avatarId?: string; coverId?: string }) => {
    const stateUpdates: Partial<Cluster> = {};
    if (updates.name !== undefined) stateUpdates.name = updates.name;
    if (updates.cover !== undefined) stateUpdates.cover = updates.cover;
    if (updates.avatarId !== undefined) stateUpdates.avatar = getFileUrl(BUCKET.AVATARS, updates.avatarId);
    if (updates.coverId !== undefined) stateUpdates.cover = getFileUrl(BUCKET.COVERS, updates.coverId);
    if (updates.isAddLocked !== undefined) stateUpdates.isAddLocked = updates.isAddLocked;
    setClustersState(prev => prev.map(cl => cl.$id === clusterId ? { ...cl, ...stateUpdates } : cl));
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.isAddLocked !== undefined) dbUpdates.is_add_locked = updates.isAddLocked;
      if (updates.cover !== undefined) {
        const fid = extractFileId(updates.cover);
        if (fid) dbUpdates.cover_id = fid;
      }
      if (updates.avatarId !== undefined) dbUpdates.avatar_id = updates.avatarId;
      if (updates.coverId !== undefined) dbUpdates.cover_id = updates.coverId;
      if (Object.keys(dbUpdates).length > 0) {
        await databases.updateDocument(DATABASE_ID, COL.CLUSTERS, clusterId, dbUpdates);
      }
    } catch { /* ignore */ }
  };

  const addCampaign = async (d: any) => {
    if (!currentUser) return;
    try {
      const campaignData: Record<string, any> = {
        user_id: currentUser.$id,
        title: d.title || '',
        content: d.content || '',
        budget: d.budget || 0,
        spent: 0,
        status: 'ACTIVE',
        is_active: true,
        impressions: 0,
        clicks: 0,
        placement: d.placement || 'story',
        type: d.type || 'photo',
        action_url: d.actionUrl || '',
        action_label: d.actionLabel || 'Learn More',
      };
      if (d.mediaUrl) {
        campaignData.media_url = d.mediaUrl;
        const fid = extractFileId(d.mediaUrl);
        if (fid) campaignData.media_id = fid;
      }
      if (d.endDate) campaignData.expires_at = d.endDate;

      const doc = await databases.createDocument(DATABASE_ID, COL.AD_CAMPAIGNS, ID.unique(), campaignData);

      // Merge local form values back into the state entry so action_url and action_label
      // are available immediately regardless of what Appwrite returns in the response.
      const enriched = {
        ...doc,
        action_url: doc.action_url ?? d.actionUrl ?? '',
        action_label: doc.action_label ?? d.actionLabel ?? 'Learn More',
        media_url: doc.media_url ?? d.mediaUrl ?? '',
      };
      setCampaignsState(prev => [enriched, ...prev]);
    } catch (err: any) {
      logAppwriteError('addCampaign', err);
      throw err;
    }
  };

  const deleteCampaign = async (id: string) => {
    setCampaignsState(prev => prev.filter(c => c.$id !== id));
    try { await databases.deleteDocument(DATABASE_ID, COL.AD_CAMPAIGNS, id); } catch { /* ignore */ }
  };

  const toggleCampaignStatus = async (id: string) => {
    const camp = campaigns.find(c => c.$id === id);
    const newStatus = (camp?.status === 'ACTIVE' || camp?.is_active) ? 'PAUSED' : 'ACTIVE';
    const newIsActive = newStatus === 'ACTIVE';
    setCampaignsState(prev => prev.map(c => c.$id === id ? { ...c, status: newStatus, is_active: newIsActive } : c));
    try { await databases.updateDocument(DATABASE_ID, COL.AD_CAMPAIGNS, id, { status: newStatus, is_active: newIsActive }); } catch { /* ignore */ }
  };

  const recordView = useCallback(async (id: string) => {
    if (viewedPostIds.has(id)) return;
    if (!currentUser) return;
    const newSet = new Set(viewedPostIds);
    newSet.add(id);
    setViewedPostIdsState(newSet);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('vm_viewed_posts', JSON.stringify([...newSet])); } catch { /* ignore */ }
    }
    setPostsState(prev => prev.map(p => p.$id === id ? { ...p, views: p.views + 1 } : p));
    try {
      const currentDoc = await databases.getDocument(DATABASE_ID, COL.POSTS, id);
      await databases.updateDocument(DATABASE_ID, COL.POSTS, id, {
        views_count: (currentDoc.views_count || 0) + 1,
      });
      databases.createDocument(DATABASE_ID, COL.POST_REACTIONS, ID.unique(), {
        post_id: id,
        user_id: currentUser.$id,
        reaction_type: 'VIEW',
      }).catch((err: any) => {
        logAppwriteError('recordView:createReaction', err);
      });
    } catch (err: any) {
      logAppwriteError('recordView', err);
      toast({ variant: 'destructive', title: 'View Error', description: err?.message || 'Could not record post view.' });
    }
  }, [viewedPostIds, currentUser, toast]);

  const recordStoryView = async (id: string) => {
    if (!currentUser) return;
    try {
      const viewedStory = stories.find(s => s.$id === id);
      const newViewCount = (viewedStory?.viewCount || 0) + 1;

      setStoriesState(prev => prev.map(s => s.$id === id ? { ...s, viewCount: newViewCount } : s));

      // Record the view document — ignore duplicate/constraint errors so each viewing still increments the count
      databases.createDocument(DATABASE_ID, COL.STORY_VIEWS, ID.unique(), {
        story_id: id, user_id: currentUser.$id, viewer_id: currentUser.$id,
      }).catch((err: any) => {
        logAppwriteError('recordStoryView:createDoc', err);
      });

      // Always update the view count on the story itself
      await databases.updateDocument(DATABASE_ID, COL.STORIES, id, {
        views_count: newViewCount,
      });

      // Send notification to story owner (only once — check before sending)
      if (viewedStory && viewedStory.user.$id !== currentUser.$id) {
        const alreadyNotified = await databases.listDocuments(DATABASE_ID, COL.STORY_VIEWS, [
          Query.equal('story_id', id),
          Query.equal('viewer_id', currentUser.$id),
          Query.limit(2),
        ]).catch(() => ({ documents: [] }));

        if (alreadyNotified.documents.length <= 1) {
          databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
            user_id: viewedStory.user.$id,
            from_user_id: currentUser.$id,
            from_user_name: currentUser.name || currentUser.username,
            from_user_avatar: currentUser.avatar || '',
            type: 'SOCIAL',
            title: 'Story View',
            content: `${currentUser.name || '@' + currentUser.username} viewed your story`,
            message: `${currentUser.name || '@' + currentUser.username} viewed your story`,
            is_read: false,
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      logAppwriteError('recordStoryView', err);
      toast({ variant: 'destructive', title: 'View Error', description: err?.message || 'Could not record story view.' });
    }
  };

  const submitTicket = async (data: { subject: string; message: string; category: string; priority?: string }) => {
    if (!currentUser) return;
    const ticket: Record<string, any> = {
      $id: 'tkt_' + Date.now(),
      username: currentUser.username,
      avatar: currentUser.avatar,
      subject: data.subject, message: data.message,
      category: data.category, status: 'OPEN',
      priority: data.priority || 'MEDIUM',
      $createdAt: new Date().toISOString(),
    };
    try {
      await databases.createDocument(DATABASE_ID, COL.SUPPORT_TICKETS, ID.unique(), {
        user_id: currentUser.$id,
        subject: data.subject, message: data.message,
        status: 'OPEN',
      });
      setTickets(prev => [ticket, ...prev]);
    } catch (err: any) {
      logAppwriteError('submitTicket', err);
      throw err;
    }
  };

  const handleReportAction = async (reportId: string, action: any) => {
    setReports(prev => prev.map((r: any) => r.$id === reportId ? { ...r, status: action } : r));
    try { await databases.updateDocument(DATABASE_ID, COL.REPORTS, reportId, { status: action }); } catch { /* ignore */ }
  };

  const handleTicketAction = async (ticketId: string, status: any) => {
    setTickets(prev => prev.map((t: any) => t.$id === ticketId ? { ...t, status } : t));
    try { await databases.updateDocument(DATABASE_ID, COL.SUPPORT_TICKETS, ticketId, { status }); } catch { /* ignore */ }
  };

  const replyToTicket = async (ticketUserId: string, ticketId: string, reply: string) => {
    if (!currentUser || !reply.trim()) return;
    await databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
      user_id: ticketUserId,
      type: 'SYSTEM',
      message: reply.trim(),
      is_read: false,
    });
    await databases.updateDocument(DATABASE_ID, COL.SUPPORT_TICKETS, ticketId, { status: 'IN_REVIEW' });
    setTickets(prev => prev.map((t: any) => t.$id === ticketId ? { ...t, status: 'IN_REVIEW' } : t));
  };

  const updateUserIdentity = async (userId: string, data: Partial<User>) => {
    setStaff(prev => prev.map((s: any) => s.$id === userId ? { ...s, ...data } : s));
    try {
      const dbData: Record<string, any> = {};
      if (data.name) dbData.name = data.name;
      if (data.role) dbData.role = data.role;
      if (Object.keys(dbData).length > 0) {
        await databases.updateDocument(DATABASE_ID, COL.USERS, userId, dbData);
      }
    } catch { /* ignore */ }
  };

  const promoteUser = async (username: string, role: any) => {
    setStaff(prev => {
      const existing = prev.find((s: any) => s.username === username);
      if (existing) return prev.map((s: any) => s.username === username ? { ...s, role } : s);
      return prev;
    });
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('username', username), Query.limit(1)]);
      if (res.documents[0]) {
        await databases.updateDocument(DATABASE_ID, COL.USERS, res.documents[0].$id, { role });
      }
    } catch { /* ignore */ }
  };

  const demoteUser = async (username: string) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('username', username), Query.limit(1)]);
      if (res.documents[0]) {
        const targetId = res.documents[0].$id;

        // Find the first user ever created — they can never be demoted
        const allRes = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.orderAsc('join_date'), Query.limit(1)]);
        const firstUserId = allRes.documents[0]?.$id;
        if (firstUserId && targetId === firstUserId) {
          return; // silently blocked — UI should already hide the button
        }

        await databases.updateDocument(DATABASE_ID, COL.USERS, targetId, { role: 'USER' });
        setStaff(prev => prev.filter((s: any) => s.username !== username));
      }
    } catch (err: any) {
      if (err?.message?.includes('PROTECTED_SUPER_ADMIN')) return;
      logAppwriteError('removeStaff', err);
    }
  };

  const boostNode = async (nodeId: string, duration: number, _currency: 'CREDIT', type: 'POST' | 'SONIC') => {
    if (!currentUser) return;

    const ratePerDay = 2;
    const totalCost = duration * ratePerDay;
    const currentBalance = currentUser.creditBalance ?? currentUser.diamondBalance ?? 0;

    // Balance check FIRST — before any state or DB changes
    if (currentBalance < totalCost) {
      throw new Error(
        `Insufficient Credits. You need ${totalCost} but only have ${currentBalance}.`
      );
    }

    const expiry = Date.now() + duration * 86400000;
    const balanceUpdate = { credit_balance: currentBalance - totalCost, diamond_balance: currentBalance - totalCost };

    if (type === 'POST') {
      // Optimistic update
      setPostsState(prev => prev.map(p => p.$id === nodeId ? { ...p, isBoosted: true, boostExpiry: expiry } : p));
      try {
        await Promise.all([
          databases.updateDocument(DATABASE_ID, COL.POSTS, nodeId, { is_boosted: true, boost_expiry: expiry }),
          databases.updateDocument(DATABASE_ID, COL.USERS, currentUser.$id, balanceUpdate),
        ]);
        setCurrentUserState(prev => {
          if (!prev) return null;
          return { ...prev, creditBalance: currentBalance - totalCost, diamondBalance: currentBalance - totalCost };
        });
      } catch (err: any) {
        // Roll back optimistic update on failure
        setPostsState(prev => prev.map(p => p.$id === nodeId ? { ...p, isBoosted: false, boostExpiry: undefined } : p));
        throw err;
      }
    } else if (type === 'SONIC') {
      try {
        await Promise.all([
          databases.updateDocument(DATABASE_ID, COL.TRACKS, nodeId, { is_boosted: true, boost_expiry: expiry }),
          databases.updateDocument(DATABASE_ID, COL.USERS, currentUser.$id, balanceUpdate),
        ]);
        setCurrentUserState(prev => {
          if (!prev) return null;
          return { ...prev, creditBalance: currentBalance - totalCost, diamondBalance: currentBalance - totalCost };
        });
      } catch (err: any) {
        throw err;
      }
    }
  };

  const applyPostCountUpdate = useCallback((postId: string, update: { likes?: number; unlikes?: number; comments?: number; shares?: number }) => {
    setPostCountOverrides(prev => ({ ...prev, [postId]: { ...(prev[postId] || {}), ...update } }));
  }, []);

  const addStreamedComment = useCallback((comment: PostComment) => {
    setStreamedComments(prev => prev.some(c => c.$id === comment.$id) ? prev : [...prev, comment]);
  }, []);

  const clearStreamedComments = useCallback(() => setStreamedComments([]), []);

  const value: PostContextType = {
    currentUser, isAuthenticated: !!currentUser, posts, hasMoreFeed, isFeedLoading, loadMoreFeed, activeComments, isLoading, initError, isOffline,
    likedPostIds, unlikedPostIds, savedPostIds, unlockedPostIds, seenPostIds, viewedPostIds,
    followingUsernames, followingUserIds, followerUsernames, friendUsernames, sentRequestUsernames,
    receivedRequestUsernames, acceptedStrangerUsernames,
    postCountOverrides, applyPostCountUpdate,
    streamedComments, addStreamedComment, clearStreamedComments,
    activeStoryIndex, selectedChatId, selectedPostId, selectedImageUrl, selectedVideoUrl,
    isSearchOpen, isGiftHubOpen, targetUserForGift, activeCommentPostId,
    settings, gatewaySettings: OFFICIAL_GATEWAY, stories, campaigns,
    reports, tickets, mutedUserNames, connections, clusters, auditLogs,
    staff, adStats: (() => {
      const revenue = campaigns.reduce((sum, c) => sum + ((c.clicks || 0) * 0.05 + (c.impressions || 0) * 0.001), 0);
      const handshakes = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
      return { revenue: Math.round(revenue * 100) / 100, handshakes };
    })(),
    intelligenceMetrics: (() => {
      const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
      const totalUnlikes = posts.reduce((sum, p) => sum + (p.unlikes || 0), 0);
      const sentiment = totalLikes + totalUnlikes > 0
        ? Math.min(99, Math.round((totalLikes / (totalLikes + totalUnlikes)) * 100))
        : 0;
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
      const recentPosts = posts.filter(p => (p.$createdAt || '') > oneDayAgo).length;
      const velocity = recentPosts > 20 ? 'HIGH' : recentPosts > 5 ? 'MEDIUM' : recentPosts > 0 ? 'LOW' : 'IDLE';
      return { sentiment, velocity };
    })(),
    withdrawalHistory, paymentRequests,
    referralLink: (typeof window !== 'undefined' ? window.location.origin : 'https://www.vimore.cfd') + "/join/" + (currentUser?.username || "guest"),
    pendingTransaction, activeSubscriptions, chatMessages,

    login, signup, logout, checkSession,
    resetPassword: async (userId: string, secret: string, password: string) => {
      await account.updateRecovery(userId, secret, password);
    },
    uploadMedia,
    addPost, deletePost, editPost, deleteMessage, editMessage, toggleLikePost, toggleUnlikePost,
    toggleSavePost: async (id: string) => {
      const wasSaved = savedPostIds.has(id);
      setSavedPostIdsState(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
      if (!currentUser) return;
      try {
        if (wasSaved) {
          const existing = await databases.listDocuments(DATABASE_ID, COL.BOOKMARKS, [
            Query.equal('post_id', id), Query.equal('user_id', currentUser.$id),
          ]);
          for (const doc of existing.documents) {
            await databases.deleteDocument(DATABASE_ID, COL.BOOKMARKS, doc.$id);
          }
        } else {
          await databases.createDocument(DATABASE_ID, COL.BOOKMARKS, ID.unique(), {
            post_id: id, user_id: currentUser.$id,
          });
        }
      } catch { /* ignore */ }
    },
    updateCurrentUser, updateSettings,
    setSearchOpen: setIsSearchOpenState,
    setSelectedChatId: setSelectedChatIdState,
    setSelectedPostId: setSelectedPostIdState,
    setSelectedImageUrl: setSelectedImageUrlState,
    setSelectedVideoUrl: setSelectedVideoUrlState,
    openCommentHub: (id: string) => { setActiveCommentPostIdState(id); fetchComments(id); clearStreamedComments(); },
    closeCommentHub: () => setActiveCommentPostIdState(null),
    openGiftHub: (u: User) => { setTargetUserForGiftState(u); setIsGiftHubOpenState(true); },
    closeGiftHub: () => setIsGiftHubOpenState(false),
    setActiveStoryIndex: setActiveStoryIndexState,
    triggerHaptic,
    isPostLiked: (id: string) => likedPostIds.has(id),
    isPostUnliked: (id: string) => unlikedPostIds.has(id),
    isPostSaved: (id: string) => savedPostIds.has(id),
    isPostUnlocked: (id: string) => unlockedPostIds.has(id),
    isFollowing: (u: string) => followingUsernames.has(u),
    toggleFollowUser: async (username: string) => {
      if (!currentUser) return;
      const isNowFollowing = followingUsernames.has(username);
      if (isNowFollowing) {
        const prevFollowing = currentUser.following as number || 0;
        setFollowingUsernamesState(prev => { const n = new Set(prev); n.delete(username); return n; });
        setCurrentUserState(prev => prev ? { ...prev, following: Math.max(0, prevFollowing - 1) } : null);
        try {
          const existing = await databases.listDocuments(DATABASE_ID, COL.FOLLOWS, [
            Query.equal('follower_id', currentUser.$id),
            Query.equal('following_username', username),
          ]);
          for (const doc of existing.documents) {
            const followingId = doc.following_id;
            await databases.deleteDocument(DATABASE_ID, COL.FOLLOWS, doc.$id);
            if (followingId) {
              setFollowingUserIdsState(prev => { const n = new Set(prev); n.delete(followingId); return n; });
              try {
                const targetDoc = await databases.getDocument(DATABASE_ID, COL.USERS, followingId);
                await databases.updateDocument(DATABASE_ID, COL.USERS, followingId, {
                  followers_count: Math.max(0, (targetDoc.followers_count || 0) - 1),
                });
              } catch { /* keep optimistic */ }
            }
          }
          await databases.updateDocument(DATABASE_ID, COL.USERS, currentUser.$id, {
            following_count: Math.max(0, prevFollowing - 1),
          });
        } catch {
          setFollowingUsernamesState(prev => new Set(prev).add(username));
          setCurrentUserState(prev => prev ? { ...prev, following: prevFollowing } : null);
        }
      } else {
        const prevFollowing = currentUser.following as number || 0;
        setFollowingUsernamesState(prev => new Set(prev).add(username));
        setCurrentUserState(prev => prev ? { ...prev, following: prevFollowing + 1 } : null);
        try {
          const targetRes = await databases.listDocuments(DATABASE_ID, COL.USERS, [
            Query.equal('username', username), Query.limit(1),
          ]);
          const targetDoc = targetRes.documents[0];
          if (targetDoc) {
            setFollowingUserIdsState(prev => new Set(prev).add(targetDoc.$id));
            await databases.createDocument(DATABASE_ID, COL.FOLLOWS, ID.unique(), {
              follower_id: currentUser.$id,
              following_id: targetDoc.$id,
              follower_username: currentUser.username,
              following_username: username,
            });
            await databases.updateDocument(DATABASE_ID, COL.USERS, currentUser.$id, {
              following_count: prevFollowing + 1,
            });
            await databases.updateDocument(DATABASE_ID, COL.USERS, targetDoc.$id, {
              followers_count: (targetDoc.followers_count || 0) + 1,
            });
          }
        } catch {
          setFollowingUsernamesState(prev => { const n = new Set(prev); n.delete(username); return n; });
          setCurrentUserState(prev => prev ? { ...prev, following: prevFollowing } : null);
        }
      }
    },
    isFriend: (u: string) => friendUsernames.has(u),
    isRequestSent: (u: string) => sentRequestUsernames.has(u),
    isRequestReceived: (u: string) => receivedRequestUsernames.has(u),
    isSubscribed: (u: string) => activeSubscriptions.has(u),
    sendFriendRequest, confirmFriendRequest, cancelFriendRequest, unfriendUser,
    acceptMessageRequest: async () => {},
    declineMessageRequest: async () => {},
    addComment, addReply, addStory, deleteStory,
    voteOnStoryPoll: async () => {},
    voteOnPostPoll: async (postId: string, optionIndex: number) => {
      if (!currentUser) return;
      let updatedPoll: any = null;
      setPostsState(prev => prev.map(post => {
        if (post.$id !== postId || !post.poll) return post;
        const poll = { ...post.poll };
        const voters = { ...(poll.voters || {}) };
        const options = poll.options.map((o: any) => ({ ...o }));
        const previousVote = voters[currentUser.username];
        if (previousVote === optionIndex) {
          delete voters[currentUser.username];
          options[optionIndex].votes = Math.max(0, (options[optionIndex].votes || 0) - 1);
          const totalVotes = Math.max(0, (poll.totalVotes || 0) - 1);
          updatedPoll = { ...poll, options, voters, totalVotes };
          return { ...post, poll: updatedPoll };
        }
        if (previousVote !== undefined) {
          options[previousVote].votes = Math.max(0, (options[previousVote].votes || 0) - 1);
        }
        voters[currentUser.username] = optionIndex;
        options[optionIndex].votes = (options[optionIndex].votes || 0) + 1;
        const totalVotes = previousVote !== undefined ? (poll.totalVotes || 0) : (poll.totalVotes || 0) + 1;
        updatedPoll = { ...poll, options, voters, totalVotes };
        return { ...post, poll: updatedPoll };
      }));
      if (updatedPoll) {
        try {
          await databases.updateDocument(DATABASE_ID, COL.POSTS, postId, {
            poll: JSON.stringify(updatedPoll),
          });
        } catch (err: any) {
          logAppwriteError('voteOnPostPoll', err);
          toast({ variant: 'destructive', title: 'Vote Failed', description: formatErrorDescription(err, currentUser?.role) });
        }
      }
    },
    toggleMuteUser: (u: string) => setMutedUserNames(p => p.includes(u) ? p.filter(x => x !== u) : [...p, u]),
    togglePinPost: async () => {},
    archivePost: async () => {},
    addAuditLog,
    submitTicket,
    initiateTransaction: (d: any) => setPendingTransactionState(d),
    cancelTransaction: () => setPendingTransactionState(null),
    createPaymentRequest, approvePaymentRequest, rejectPaymentRequest,
    recordWithdrawal, processWithdrawal,
    verifyUser, processGiftTransaction, unlockPost, subscribeToCreator, cancelSubscription,
    incrementShareCount: async (id: string) => {
      setPostsState(prev => prev.map(p => p.$id === id ? { ...p, shares: p.shares + 1 } : p));
      try {
        await databases.updateDocument(DATABASE_ID, COL.POSTS, id, {
          shares_count: (posts.find(p => p.$id === id)?.shares || 0) + 1,
        });
      } catch { /* ignore */ }
    },
    createCluster, addMemberToCluster, leaveCluster, updateCluster,
    promoteUser, demoteUser,
    addCampaign, deleteCampaign, toggleCampaignStatus,
    recordCampaignClick: async (id: string) => {
      try {
        const current = campaigns.find((c: any) => c.$id === id);
        if (!current) return;
        const newClicks = (current.clicks || 0) + 1;
        setCampaignsState(prev => prev.map((c: any) => c.$id === id ? { ...c, clicks: newClicks } : c));
        await databases.updateDocument(DATABASE_ID, COL.AD_CAMPAIGNS, id, { clicks: newClicks });
      } catch { /* ignore */ }
    },
    recordCampaignImpression: async (id: string) => {
      try {
        const current = campaigns.find((c: any) => c.$id === id);
        if (!current) return;
        const newImpressions = (current.impressions || 0) + 1;
        setCampaignsState(prev => prev.map((c: any) => c.$id === id ? { ...c, impressions: newImpressions } : c));
        await databases.updateDocument(DATABASE_ID, COL.AD_CAMPAIGNS, id, { impressions: newImpressions });
      } catch { /* ignore */ }
    },
    buyVerificationBadge: async () => {
      if (!currentUser) return { status: 'insufficient_balance' as const, balance: 0 };
      try {
        const userDoc = await databases.getDocument(DATABASE_ID, COL.USERS, currentUser.$id);
        const balance = userDoc.credit_balance ?? userDoc.diamond_balance ?? 0;
        const expiry = userDoc.verification_expiry as number | undefined;
        const COST = 8;
        if (userDoc.is_verified && expiry && expiry > Date.now()) {
          return { status: 'already_verified' as const, expiry };
        }
        if (balance < COST) {
          return { status: 'insufficient_balance' as const, balance };
        }
        const newExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
        const newBalance = balance - COST;
        await databases.updateDocument(DATABASE_ID, COL.USERS, currentUser.$id, {
          is_verified: true,
          verification_expiry: newExpiry,
          credit_balance: newBalance,
          diamond_balance: newBalance,
        });
        setCurrentUserState(prev => prev ? {
          ...prev,
          isVerified: true,
          diamondBalance: newBalance,
          creditBalance: newBalance,
          verificationExpiry: newExpiry,
        } : null);
        return { status: 'success' as const, expiry: newExpiry };
      } catch (e: any) {
        throw e;
      }
    },
    refreshAdminData,
    fetchProfileByUsername, fetchProfilePosts, fetchReels, searchAllUsers, fetchComments,
    refreshProfiles,
    refreshClusters,
    refreshFeed, refreshStories,
    chatLastMessageAt,
    chatLastIncomingAt,
    chatReadReceipts,
    clusterMemberReceipts,
    chatUnreadCounts,
    updateConnectionPresence,
    onlineUserIds,
    updateUserOnlineStatus,
    recordView, recordStoryView,
    updateUserIdentity,
    handleReportAction, handleTicketAction, replyToTicket,
    sendChatMessage, sendMessageRequest,
    fetchAllUsersForDiscovery, allUsers, refreshAllUsers, banUser, suspendUser, warnUser, sendAdminBroadcast, broadcastHistory,
    addIncomingMessage: (clusterId: string, message: ChatMessage, preview: string, timeStr: string) => {
      // For DMs, chatMessages is keyed by the other user's username (matching loadChatMessages).
      // For group clusters, chatMessages is keyed by the cluster $id.
      const matchingConn = connections.find(c =>
        c.username === clusterId || clusterId.includes(c.username)
      );
      const storageKey = matchingConn ? matchingConn.username : clusterId;
      const displayPreview = preview || getChatMessagePreview(message);
      setChatMessages(prev => {
        const existing = prev[storageKey] || [];
        const alreadyExists = existing.some(m => m.$id === message.$id);
        if (alreadyExists) return prev;
        return { ...prev, [storageKey]: [...existing, { ...message, createdAt: Date.now() }] };
      });
      setChatLastMessageAt(prev => ({ ...prev, [storageKey]: Date.now() }));
      setChatLastIncomingAt(prev => ({ ...prev, [storageKey]: Date.now() }));
      // Bump unread count only if this chat isn't currently open.
      if (selectedChatId !== storageKey) {
        setChatUnreadCounts(prev => ({ ...prev, [storageKey]: (prev[storageKey] || 0) + 1 }));
      }
      setConnectionsState(prev => prev.map(c => {
        if (c.username === storageKey || clusterId.includes(c.username)) {
          return { ...c, lastMessage: displayPreview, lastTime: timeStr };
        }
        return c;
      }));
      setClustersState(prev => prev.map(cl => {
        if (cl.$id === clusterId) {
          return { ...cl, lastMessage: displayPreview, lastTime: timeStr };
        }
        return cl;
      }));
    },
    refreshSocialGraph: async () => {
      if (currentUser) await loadSocialGraph(currentUser.$id).catch(() => {});
    },
    markChatMessagesRead: (chatId: string) => {
      if (!currentUser) return;
      setChatUnreadCounts(prev => (prev[chatId] ? { ...prev, [chatId]: 0 } : prev));
      const msgs = chatMessages[chatId] || [];
      const unreadMsgs = msgs.filter(m => m.sender === 'them' && m.status !== 'read');
      setChatMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m =>
          m.sender === 'them' && m.status !== 'read' ? { ...m, status: 'read' as const } : m
        ),
      }));
      const isGroupChat = clusters.some(cl => cl.$id === chatId);
      const msgCollection = isGroupChat ? COL.GROUP_MESSAGES : COL.MESSAGES;
      unreadMsgs.forEach(m => {
        databases.updateDocument(DATABASE_ID, msgCollection, m.$id, { is_read: true }).catch(() => {});
      });
      const now = new Date().toISOString();
      setChatReadReceipts(prev => ({ ...prev, [chatId]: now }));
      const existingDocId = chatReadReceiptDocIds[chatId];
      if (existingDocId) {
        databases.updateDocument(DATABASE_ID, COL.CHAT_READ_RECEIPTS, existingDocId, { last_read_at: now }).catch(() => {});
      } else {
        databases.createDocument(DATABASE_ID, COL.CHAT_READ_RECEIPTS, ID.unique(), {
          user_id: currentUser.$id,
          cluster_id: chatId,
          last_read_at: now,
        }).then(doc => {
          setChatReadReceiptDocIds(prev => ({ ...prev, [chatId]: doc.$id }));
        }).catch(() => {});
      }
    },
    applyReadReceipt: (storageKey: string, lastReadAt: string, docId: string) => {
      setChatReadReceipts(prev => ({ ...prev, [storageKey]: lastReadAt }));
      setChatReadReceiptDocIds(prev => ({ ...prev, [storageKey]: docId }));
    },
    applyClusterMemberReceipt: (clusterId: string, userId: string, lastReadAt: string) => {
      setClusterMemberReceipts(prev => ({
        ...prev,
        [clusterId]: { ...(prev[clusterId] || {}), [userId]: lastReadAt },
      }));
    },
    applyRemotePostEdit: (postId: string, content: string) => {
      setPostsState(prev => prev.map(p => p.$id === postId ? { ...p, content } : p));
    },
    purgeVibeCache: async () => setSeenPostIdsState(new Set()),
    archiveIdentityNode: async () => {},
    boostNode,
    enrollHardwareBiometrics: async (): Promise<boolean> => {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
      try {
        // We intentionally do NOT hard-gate on isUserVerifyingPlatformAuthenticatorAvailable().
        // That API returns false on some Android devices with only PIN/pattern but no biometrics,
        // even though credential creation succeeds. Let the OS decide which method to use
        // (fingerprint, face ID, PIN, pattern, or password).
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userId    = crypto.getRandomValues(new Uint8Array(16));
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp:   { name: "ViMore", id: window.location.hostname },
            user: {
              id:          userId,
              name:        currentUser?.username    || "vimore-user",
              displayName: currentUser?.name        || "ViMore User",
            },
            // ES256 (-7) + RS256 (-257) covers all platform authenticators
            pubKeyCredParams: [
              { type: "public-key", alg: -7   },
              { type: "public-key", alg: -257 },
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              // "preferred" allows the OS to fall back to PIN/pattern when no biometrics exist
              userVerification:    "preferred",
              requireResidentKey:  false,
            },
            timeout: 60000,
          },
        }) as PublicKeyCredential | null;
        if (credential) {
          const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
          localStorage.setItem('vimore_biometric_cred_id', credId);
          setSettingsState(prev => ({ ...prev, isBiometricActive: true, isHardwareEnrolled: true }));
          return true;
        }
        return false;
      } catch { return false; }
    },
    verifyHardwareBiometrics: async (): Promise<boolean> => {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
      try {
        const challenge      = crypto.getRandomValues(new Uint8Array(32));
        const credIdBase64   = localStorage.getItem('vimore_biometric_cred_id');
        const allowCredentials: PublicKeyCredentialDescriptor[] = credIdBase64
          ? [{ type: "public-key", id: Uint8Array.from(atob(credIdBase64), c => c.charCodeAt(0)), transports: ["internal" as AuthenticatorTransport] }]
          : [];
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout:          60000,
            // "preferred" triggers fingerprint/face/PIN/pattern — whatever the device has
            userVerification: "preferred",
            rpId:             window.location.hostname,
            allowCredentials,
          },
        });
        return credential !== null;
      } catch { return false; }
    },
    blockedUsernames,
    blockUser: async (username: string) => {
      if (!currentUser) return;
      setBlockedUsernames(prev => [...prev, username]);
      try {
        await databases.createDocument(DATABASE_ID, COL.BLOCKED_USERS, ID.unique(), {
          user_id: currentUser.$id,
          blocker_id: currentUser.$id,
          blocked_username: username,
        });
      } catch { /* keep optimistic */ }
    },
    unblockUser: async (username: string) => {
      if (!currentUser) return;
      setBlockedUsernames(prev => prev.filter(u => u !== username));
      try {
        const existing = await databases.listDocuments(DATABASE_ID, COL.BLOCKED_USERS, [
          Query.equal('blocker_id', currentUser.$id),
          Query.equal('blocked_username', username),
        ]);
        for (const doc of existing.documents) {
          await databases.deleteDocument(DATABASE_ID, COL.BLOCKED_USERS, doc.$id);
        }
      } catch { /* keep optimistic */ }
    },
    boostMarketplaceListing: async (productId: string, credits: number) => {
      if (!currentUser) throw new Error('Not signed in');
      const balance = currentUser.creditBalance ?? currentUser.diamondBalance ?? 0;
      if (balance < credits) throw new Error(`You need ${credits} Credits but only have ${balance}.`);
      try {
        const { boostProductFeatured, BOOST_DAYS_PER_DIAMOND } = await import('@/lib/marketplace');
        const newUntil = await boostProductFeatured(productId, credits);
        const days = credits * BOOST_DAYS_PER_DIAMOND;
        await databases.updateDocument(DATABASE_ID, COL.USERS, currentUser.$id, { credit_balance: balance - credits, diamond_balance: balance - credits });
        setCurrentUserState(prev => prev ? { ...prev, creditBalance: balance - credits, diamondBalance: balance - credits } : null);
        try {
          await databases.createDocument(DATABASE_ID, COL.TRANSACTIONS, ID.unique(), {
            user_id: currentUser.$id,
            type: 'MARKETPLACE_BOOST',
            currency: 'CREDIT',
            amount: -credits,
            description: `Featured listing boost — ${days} days`,
            reference_id: productId,
            status: 'COMPLETED',
          });
        } catch { /* non-fatal */ }
        toast({ title: 'Listing Featured!', description: `Promoted for ${days} days.` });
        return newUntil;
      } catch (err: any) {
        logAppwriteError('boostMarketplaceListing', err);
        toast({ variant: 'destructive', title: 'Boost failed', description: err?.message || 'Try again.' });
        throw err;
      }
    },
    adminDeleteProduct: async (productId: string) => {
      if (!currentUser) return;
      try {
        const res = await authFetch('/api/admin/products/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUserId: currentUser.$id, productId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Delete failed');
        toast({ title: 'Product Deleted', description: 'Listing removed from the marketplace.' });
      } catch (err: any) {
        logAppwriteError('adminDeleteProduct', err);
        toast({ variant: 'destructive', title: 'Could not delete product', description: err?.message || 'Try again.' });
        throw err;
      }
    },
    submitReport: async (data: { reportedUsername: string; reason: string; details: string }) => {
      if (!currentUser) return;
      try {
        const targetUser = allUsers.find(u => u.username === data.reportedUsername);
        await databases.createDocument(DATABASE_ID, COL.REPORTS, ID.unique(), {
          reporter_id: currentUser.$id,
          target_id: targetUser?.$id || data.reportedUsername,
          target_type: 'USER',
          reason: data.reason,
          details: data.details,
          status: 'PENDING',
        });
        toast({ title: 'Report Submitted', description: 'Your report has been received and will be reviewed.' });
      } catch (err: any) {
        logAppwriteError('submitReport', err);
        toast({ variant: 'destructive', title: 'Report Failed', description: err?.message || 'Could not submit your report. Please try again.' });
      }
    },
  };

  return <PostContext.Provider value={value}>{children}</PostContext.Provider>;
}

export function usePosts() {
  const context = useContext(PostContext);
  if (context === undefined) throw new Error('usePosts must be used within a PostProvider');
  return context;
}
