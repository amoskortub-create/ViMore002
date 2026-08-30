import { NextRequest, NextResponse } from 'next/server';

import * as AuthLogin from '@/server/api-impl/root/auth/login';
import * as AuthMe from '@/server/api-impl/root/auth/me';
import * as AuthRegister from '@/server/api-impl/root/auth/register';
import * as AuthResetPassword from '@/server/api-impl/root/auth/reset-password';
import * as AuthLookupPhone from '@/server/api-impl/root/auth/lookup-phone';
import * as AuthCreateProfile from '@/server/api-impl/root/auth/create-profile';
import * as AdvertiseSubmit from '@/server/api-impl/root/advertise/submit';
import * as CronCleanup from '@/server/api-impl/root/cron/cleanup';
import * as CronExpiryAlerts from '@/server/api-impl/root/cron/expiry-alerts';
import * as File from '@/server/api-impl/root/file';
import * as FriendsAction from '@/server/api-impl/root/friends/action';
import * as DebugAdminWrite from '@/server/api-impl/root/debug-adminwrite';
import * as Intelligent from '@/server/api-impl/root/intelligent';
import * as IntelligentDelete from '@/server/api-impl/root/intelligent-delete';
import * as KnowledgeAdmin from '@/server/api-impl/root/knowledge-admin';
import * as LinkPreview from '@/server/api-impl/root/link-preview';
import * as MarketplaceCreateStore from '@/server/api-impl/root/marketplace/create-store';
import * as MarketplaceMessagesConversations from '@/server/api-impl/root/marketplace/messages/conversations';
import * as MarketplaceMessagesList from '@/server/api-impl/root/marketplace/messages/list';
import * as MarketplaceMessagesSend from '@/server/api-impl/root/marketplace/messages/send';
import * as MessagesMarkRead from '@/server/api-impl/root/messages/mark-read';
import * as MessagesSend from '@/server/api-impl/root/messages/send';
import * as Moderate from '@/server/api-impl/root/moderate';
import * as MusicCatalog from '@/server/api-impl/root/music/catalog';
import * as MusicStream from '@/server/api-impl/root/music/stream';
import * as NotificationsDelete from '@/server/api-impl/root/notifications-delete';
import * as PaymentApprove from '@/server/api-impl/root/payment/approve';
import * as PaymentReject from '@/server/api-impl/root/payment/reject';
import * as Presence from '@/server/api-impl/root/presence';
import * as PushSend from '@/server/api-impl/root/push/send';
import * as PushSubscribe from '@/server/api-impl/root/push/subscribe';
import * as PushUnsubscribe from '@/server/api-impl/root/push/unsubscribe';
import * as TransactionGift from '@/server/api-impl/root/transaction/gift';
import * as TransactionLockPost from '@/server/api-impl/root/transaction/lock-post';
import * as TransactionSubscribe from '@/server/api-impl/root/transaction/subscribe';
import * as TransactionUnlockPost from '@/server/api-impl/root/transaction/unlock-post';
import * as TransactionVerify from '@/server/api-impl/root/transaction/verify';
import * as UploadReel from '@/server/api-impl/root/upload-reel';
import * as UserActivity from '@/server/api-impl/root/user/activity';
import * as UserProfile from '@/server/api-impl/root/user/profile';
import * as Withdraw from '@/server/api-impl/root/withdraw';
import * as PostReaction from '@/server/api-impl/root/post-reaction';
import * as MonetizationValidateCreatorEligibility from '@/server/api-impl/root/monetization/validate-creator-eligibility';
import * as MonetizationGenerateUssd from '@/server/api-impl/root/monetization/generate-ussd';
import * as MonetizationLogTransaction from '@/server/api-impl/root/monetization/log-transaction';
import * as MonetizationUpdateCreatorEarnings from '@/server/api-impl/root/monetization/update-creator-earnings';
import * as MonetizationOrangeMoneyAccount from '@/server/api-impl/root/monetization/orange-money-account';
import * as MonetizationSubscribe from '@/server/api-impl/root/monetization/subscribe';
import * as MonetizationUnlockPost from '@/server/api-impl/root/monetization/unlock-post';
import * as MonetizationEarningsSummary from '@/server/api-impl/root/monetization/earnings-summary';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Handler = Partial<Record<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS', (...args: any[]) => Promise<Response> | Response>>;

const ROUTES: Record<string, Handler> = {
  'auth/login': AuthLogin,
  'auth/me': AuthMe,
  'auth/register': AuthRegister,
  'auth/reset-password': AuthResetPassword,
  'auth/lookup-phone': AuthLookupPhone,
  'auth/create-profile': AuthCreateProfile,
  'advertise/submit': AdvertiseSubmit,
  'cron/cleanup': CronCleanup,
  'cron/expiry-alerts': CronExpiryAlerts,
  'friends/action': FriendsAction,
  'debug/adminwrite': DebugAdminWrite,
  'intelligent': Intelligent,
  'intelligent/delete': IntelligentDelete,
  'knowledge-admin': KnowledgeAdmin,
  'link-preview': LinkPreview,
  'marketplace/create-store': MarketplaceCreateStore,
  'marketplace/messages/conversations': MarketplaceMessagesConversations,
  'marketplace/messages/list': MarketplaceMessagesList,
  'marketplace/messages/send': MarketplaceMessagesSend,
  'messages/mark-read': MessagesMarkRead,
  'messages/send': MessagesSend,
  'moderate': Moderate,
  'music/catalog': MusicCatalog,
  'music/stream': MusicStream,
  'notifications/delete': NotificationsDelete,
  'payment/approve': PaymentApprove,
  'payment/reject': PaymentReject,
  'presence': Presence,
  'push/send': PushSend,
  'push/subscribe': PushSubscribe,
  'push/unsubscribe': PushUnsubscribe,
  'transaction/gift': TransactionGift,
  'transaction/lock-post': TransactionLockPost,
  'transaction/subscribe': TransactionSubscribe,
  'transaction/unlock-post': TransactionUnlockPost,
  'transaction/verify': TransactionVerify,
  'upload/reel': UploadReel,
  'user/activity': UserActivity,
  'user/profile': UserProfile,
  'withdraw': Withdraw,
  'post/reaction': PostReaction,
  'monetization/validate-creator-eligibility': MonetizationValidateCreatorEligibility,
  'monetization/generate-ussd': MonetizationGenerateUssd,
  'monetization/log-transaction': MonetizationLogTransaction,
  'monetization/update-creator-earnings': MonetizationUpdateCreatorEarnings,
  'monetization/orange-money-account': MonetizationOrangeMoneyAccount,
  'monetization/subscribe': MonetizationSubscribe,
  'monetization/unlock-post': MonetizationUnlockPost,
  'monetization/earnings-summary': MonetizationEarningsSummary,
};

async function dispatch(req: NextRequest, method: string, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const segments = path || [];

  if (segments[0] === 'file' && segments.length === 3) {
    const fn = (File as Handler)[method as keyof Handler];
    if (!fn) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return fn(req, { params: Promise.resolve({ bucket: segments[1], fileId: segments[2] }) });
  }

  const key = segments.join('/');
  const mod = ROUTES[key];
  const fn = mod?.[method as keyof Handler];
  if (!fn) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return fn(req);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, 'GET', ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, 'POST', ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, 'PUT', ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, 'DELETE', ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, 'PATCH', ctx);
}
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, 'OPTIONS', ctx);
}
