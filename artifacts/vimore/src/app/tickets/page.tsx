"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { databases, DATABASE_ID, COL, ID, Query } from "@/lib/appwrite";
import { usePosts } from "@/context/PostContext";
import { useNotifications } from "@/context/NotificationContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Ticket, Search, Gem, Calendar, Clock, MapPin, QrCode, X, User, CheckCircle2, ArrowLeft, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { generateSerialNumber, generateQRCodeDataUrl, formatEventDate, formatEventTime, isEventExpired, getDaysUntilEvent, getMinutesUntilEvent } from "@/lib/ticket-utils";

interface AppwriteEvent {
  $id: string;
  $createdAt: string;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  start_time: string;
  end_time: string;
  flyer_url: string;
  ticket_price: number;
  is_active: boolean;
}

interface AppwriteTicket {
  $id: string;
  $createdAt: string;
  event_id: string;
  user_id: string;
  serial_number: string;
  is_used: boolean;
  event_title: string;
  event_date: string;
  event_venue: string;
  event_start_time: string;
  event_end_time: string;
  price_paid: number;
  owner_name: string;
  owner_avatar: string;
  purchased_by_user_id: string;
  purchased_by_name: string;
}

type Tab = 'browse' | 'my_tickets';

export default function TicketsPage() {
  const { currentUser, triggerHaptic } = usePosts();
  const { addSignal } = useNotifications();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>('browse');
  const [events, setEvents] = useState<AppwriteEvent[]>([]);
  const [myTickets, setMyTickets] = useState<AppwriteTicket[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedEvent, setSelectedEvent] = useState<AppwriteEvent | null>(null);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [newTicket, setNewTicket] = useState<AppwriteTicket | null>(null);
  const [newTicketQR, setNewTicketQR] = useState<string>('');
  const [selectedTicketQR, setSelectedTicketQR] = useState<string>('');

  const [buyForOther, setBuyForOther] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientResults, setRecipientResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const recipientSearchTimer = useRef<NodeJS.Timeout | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<AppwriteTicket | null>(null);

  const filteredEvents = events.filter(ev =>
    ev.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => {
    if (tab === 'my_tickets' && currentUser?.$id) loadMyTickets();
  }, [tab, currentUser?.$id]);
  useEffect(() => {
    if (currentUser?.$id && myTickets.length > 0) checkReminders();
  }, [myTickets]);

  const loadEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.EVENTS, [
        Query.equal('is_active', true),
        Query.orderDesc('ticket_price'),
        Query.limit(100),
      ]);
      const evs = (res.documents as unknown as AppwriteEvent[]).filter(
        ev => !isEventExpired(ev.event_date, ev.end_time)
      );
      setEvents(evs);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to load events' });
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const loadMyTickets = async () => {
    if (!currentUser?.$id) return;
    setIsLoadingTickets(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.TICKETS, [
        Query.equal('user_id', currentUser.$id),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]);
      const tickets = res.documents as unknown as AppwriteTicket[];
      const expired: string[] = [];
      const valid: AppwriteTicket[] = [];
      for (const tk of tickets) {
        if (isEventExpired(tk.event_date, tk.event_end_time)) expired.push(tk.$id);
        else valid.push(tk);
      }
      for (const id of expired) {
        try { await databases.deleteDocument(DATABASE_ID, COL.TICKETS, id); } catch {}
      }
      setMyTickets(valid);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to load tickets' });
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const checkReminders = async () => {
    if (!currentUser?.$id) return;
    for (const ticket of myTickets) {
      const days = getDaysUntilEvent(ticket.event_date, ticket.event_start_time);
      const mins = getMinutesUntilEvent(ticket.event_date, ticket.event_start_time);
      if (days < 0) continue;
      try {
        const ticketDoc: any = await databases.getDocument(DATABASE_ID, COL.TICKETS, ticket.$id);
        const updates: Record<string, boolean> = {};
        const reminderTitle = `📅 Event Reminder: ${ticket.event_title}`;
        const baseInfo = `${formatEventDate(ticket.event_date)} at ${formatEventTime(ticket.event_start_time)}`;
        if (days <= 3 && days > 2 && !ticketDoc.reminder_1_sent) { addSignal({ type: 'SYSTEM', title: reminderTitle, content: `Your event is in 3 days! ${baseInfo} at ${ticket.event_venue}.`, recipientId: currentUser.$id }); updates.reminder_1_sent = true; }
        if (days <= 2 && days > 1 && !ticketDoc.reminder_2_sent) { addSignal({ type: 'SYSTEM', title: reminderTitle, content: `2 days to go! ${baseInfo} at ${ticket.event_venue}.`, recipientId: currentUser.$id }); updates.reminder_2_sent = true; }
        if (days <= 1 && days > 0 && !ticketDoc.reminder_3_sent) { addSignal({ type: 'SYSTEM', title: reminderTitle, content: `Tomorrow is the day! ${baseInfo} at ${ticket.event_venue}.`, recipientId: currentUser.$id }); updates.reminder_3_sent = true; }
        if (mins <= 1440 && mins > 60 && !ticketDoc.reminder_4_sent) { addSignal({ type: 'SYSTEM', title: reminderTitle, content: `Today is the day! ${ticket.event_title} starts at ${formatEventTime(ticket.event_start_time)}. Venue: ${ticket.event_venue}.`, recipientId: currentUser.$id }); updates.reminder_4_sent = true; }
        if (mins <= 30 && mins > 0 && !ticketDoc.reminder_5_sent) { addSignal({ type: 'SYSTEM', title: `⏰ Starting Soon: ${ticket.event_title}`, content: `Only 30 minutes left! Head to ${ticket.event_venue} now.`, recipientId: currentUser.$id }); updates.reminder_5_sent = true; }
        if (mins <= 0 && mins > -60 && !ticketDoc.reminder_6_sent) { addSignal({ type: 'SYSTEM', title: `🎉 Event Started: ${ticket.event_title}`, content: `The event has started! Don't miss out at ${ticket.event_venue}.`, recipientId: currentUser.$id }); updates.reminder_6_sent = true; }
        if (Object.keys(updates).length > 0) await databases.updateDocument(DATABASE_ID, COL.TICKETS, ticket.$id, updates);
      } catch {}
    }
  };

  const searchRecipient = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) { setRecipientResults([]); return; }
    setIsSearchingUser(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.USERS, [
        Query.contains('username', query.toLowerCase()),
        Query.limit(8),
      ]);
      setRecipientResults(res.documents.filter((u: any) => u.$id !== currentUser?.$id));
    } catch { setRecipientResults([]); }
    finally { setIsSearchingUser(false); }
  }, [currentUser?.$id]);

  const handleRecipientInput = (val: string) => {
    setRecipientSearch(val);
    setSelectedRecipient(null);
    if (recipientSearchTimer.current) clearTimeout(recipientSearchTimer.current);
    recipientSearchTimer.current = setTimeout(() => searchRecipient(val), 200);
  };

  const openBuyDialog = (ev: AppwriteEvent) => {
    setSelectedEvent(ev);
    setBuyForOther(false);
    setSelectedRecipient(null);
    setRecipientSearch('');
    setRecipientResults([]);
    setShowBuyDialog(true);
  };

  const handleProceedToConfirm = () => {
    if (!currentUser || !selectedEvent) return;
    const balance = currentUser.diamondBalance || 0;
    if (balance < selectedEvent.ticket_price) {
      toast({ variant: 'destructive', title: 'Insufficient Credits', description: `You need ${selectedEvent.ticket_price} credits but only have ${balance} credits.` });
      return;
    }
    if (buyForOther && !selectedRecipient) {
      toast({ variant: 'destructive', title: 'Select a recipient', description: 'Please search and select who you want to buy for.' });
      return;
    }
    setShowBuyDialog(false);
    setShowConfirmDialog(true);
  };

  const handleConfirmPurchase = async () => {
    if (!currentUser || !selectedEvent) return;
    setIsBuying(true);
    triggerHaptic(50);
    try {
      const serial = generateSerialNumber();
      const owner = buyForOther && selectedRecipient ? selectedRecipient : currentUser;
      const ownerName = owner.display_name || owner.name || owner.username || 'Guest';
      const ownerAvatar = owner.avatar || owner.avatar_url || '';
      const ownerId = owner.$id;
      const nextBalance = (currentUser.creditBalance ?? currentUser.diamondBalance ?? 0) - selectedEvent.ticket_price;
      await databases.updateDocument(DATABASE_ID, COL.USERS, currentUser.$id, { credit_balance: nextBalance, diamond_balance: nextBalance });
      const ticketDoc = await databases.createDocument(DATABASE_ID, COL.TICKETS, ID.unique(), {
        event_id: selectedEvent.$id, user_id: ownerId, serial_number: serial, is_used: false,
        event_title: selectedEvent.title, event_date: selectedEvent.event_date, event_venue: selectedEvent.venue,
        event_start_time: selectedEvent.start_time, event_end_time: selectedEvent.end_time,
        price_paid: selectedEvent.ticket_price, owner_name: ownerName, owner_avatar: ownerAvatar,
        purchased_by_user_id: currentUser.$id,
        purchased_by_name: currentUser.display_name || currentUser.name || currentUser.username || 'Someone',
        reminder_1_sent: false, reminder_2_sent: false, reminder_3_sent: false,
        reminder_4_sent: false, reminder_5_sent: false, reminder_6_sent: false,
      });
      if (buyForOther && selectedRecipient) {
        const buyerName = currentUser.display_name || currentUser.name || currentUser.username || 'Someone';
        const eventDay = formatEventDate(selectedEvent.event_date);
        const eventTime = `${formatEventTime(selectedEvent.start_time)} - ${formatEventTime(selectedEvent.end_time)}`;
        await databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
          user_id: selectedRecipient.$id, from_user_id: currentUser.$id, from_user_name: buyerName,
          from_user_avatar: currentUser.avatar || '', type: 'SYSTEM', title: '🎟️ You Got a Ticket!',
          content: `${buyerName} bought you a Ticket for ${selectedEvent.title} that will be on ${eventDay} Time ${eventTime}. Don't Miss it!`,
          is_read: false,
        });
      }
      const qrDataUrl = await generateQRCodeDataUrl(`VIMORE-TICKET:${serial}`);
      setNewTicketQR(qrDataUrl);
      setNewTicket(ticketDoc as unknown as AppwriteTicket);
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
      triggerHaptic(100);
      if (tab === 'my_tickets') loadMyTickets();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Purchase failed', description: e.message });
    } finally { setIsBuying(false); }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const balance = currentUser.diamondBalance || 0;

  return (
    <div className="min-h-screen bg-[#F4F6FB] dark:bg-[#08080f] pb-32">

      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#08080f]/90 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <button className="h-10 w-10 rounded-2xl bg-secondary/60 dark:bg-white/5 flex items-center justify-center hover:bg-secondary transition-all active:scale-90">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-black tracking-tight">{t('ticket_title')}</h1>
            </div>
            {/* Credit balance pill */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-primary/15 px-3.5 py-2 rounded-2xl">
              <span className="text-base">💎</span>
              <span className="font-black text-sm text-primary">{balance.toLocaleString()}</span>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-0 mb-0">
            <button
              onClick={() => setTab('browse')}
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${tab === 'browse' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {t('ticket_browse')}
            </button>
            <button
              onClick={() => setTab('my_tickets')}
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all relative ${tab === 'my_tickets' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {t('ticket_my_tickets')}
              {myTickets.length > 0 && (
                <span className="absolute -top-0.5 right-[calc(50%-28px)] h-4 min-w-[16px] px-1 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                  {myTickets.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {/* Browse tab */}
        {tab === 'browse' && (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('ticket_search')}
                className="w-full bg-white dark:bg-white/5 border border-black/5 dark:border-white/8 rounded-2xl h-12 pl-11 pr-10 text-sm outline-none focus:border-primary/40 transition-all shadow-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-secondary flex items-center justify-center">
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {isLoadingEvents ? (
              <div className="flex items-center justify-center h-52">
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-20">
                <div className="h-16 w-16 rounded-3xl bg-secondary/60 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Ticket className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-bold text-base">{t('ticket_no_events_title')}</p>
                <p className="text-muted-foreground text-sm mt-1.5">
                  {searchQuery ? `No events match "${searchQuery}"` : t('ticket_no_events_desc')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map(ev => (
                  <button
                    key={ev.$id}
                    onClick={() => openBuyDialog(ev)}
                    className="w-full bg-white dark:bg-white/4 rounded-3xl overflow-hidden border border-black/5 dark:border-white/6 hover:border-primary/30 transition-all cursor-pointer group shadow-sm hover:shadow-xl hover:shadow-primary/8 active:scale-[0.99] text-left"
                  >
                    {ev.flyer_url && (
                      <div className="h-52 w-full relative overflow-hidden">
                        <img src={ev.flyer_url} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        {/* Price badge */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-full">
                          <span className="text-sm">💎</span>
                          <span className="font-black text-sm">{ev.ticket_price}</span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-black text-xl leading-tight drop-shadow-sm">{ev.title}</h3>
                        </div>
                      </div>
                    )}
                    <div className="p-4 space-y-3">
                      {!ev.flyer_url && (
                        <div className="flex items-start justify-between">
                          <h3 className="font-black text-lg leading-tight">{ev.title}</h3>
                          <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full shrink-0">
                            <span className="text-sm">💎</span>
                            <span className="font-black text-sm">{ev.ticket_price}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-primary/70" />
                          {formatEventDate(ev.event_date)}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary/70" />
                          {formatEventTime(ev.start_time)} – {formatEventTime(ev.end_time)}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary/70" />
                          {ev.venue}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
                        <span className="text-[11px] font-semibold text-muted-foreground/70">Tap to get tickets</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* My Tickets tab */}
        {tab === 'my_tickets' && (
          <>
            {isLoadingTickets ? (
              <div className="flex items-center justify-center h-52">
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
              </div>
            ) : myTickets.length === 0 ? (
              <div className="text-center py-20">
                <div className="h-16 w-16 rounded-3xl bg-secondary/60 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <QrCode className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-bold text-base">{t('ticket_no_tickets_title')}</p>
                <p className="text-muted-foreground text-sm mt-1.5">{t('ticket_no_tickets_desc')}</p>
                <Button onClick={() => setTab('browse')} className="mt-6 rounded-2xl font-bold px-6">
                  Browse Events
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myTickets.map(ticket => (
                  <button
                    key={ticket.$id}
                    onClick={async () => {
                      setSelectedTicket(ticket);
                      const qr = await generateQRCodeDataUrl(`VIMORE-TICKET:${ticket.serial_number}`);
                      setSelectedTicketQR(qr);
                    }}
                    className="w-full text-left bg-white dark:bg-white/4 rounded-3xl border border-black/5 dark:border-white/6 hover:border-primary/30 transition-all cursor-pointer group shadow-sm overflow-hidden"
                  >
                    {/* Top coloured strip */}
                    <div className={`h-1.5 w-full ${ticket.is_used ? 'bg-muted' : 'bg-gradient-to-r from-primary to-purple-500'}`} />

                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-base leading-tight truncate">{ticket.event_title}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                              <Calendar className="h-3 w-3" />{formatEventDate(ticket.event_date)}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                              <MapPin className="h-3 w-3" />{ticket.event_venue}
                            </span>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ticket.is_used ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-600'}`}>
                          {ticket.is_used ? t('ticket_used') : t('ticket_valid')}
                        </span>
                      </div>

                      {/* Perforated divider */}
                      <div className="flex items-center gap-1.5 -mx-4">
                        <div className="h-4 w-4 rounded-full bg-[#F4F6FB] dark:bg-[#08080f] shrink-0" />
                        <div className="flex-1 border-t-2 border-dashed border-black/8 dark:border-white/10" />
                        <div className="h-4 w-4 rounded-full bg-[#F4F6FB] dark:bg-[#08080f] shrink-0" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black uppercase text-muted-foreground/60 mb-1">{t('ticket_serial')}</p>
                          <p className="font-mono text-xs font-black tracking-wider">{ticket.serial_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase text-muted-foreground/60 mb-1">{t('ticket_price_paid')}</p>
                          <p className="font-black text-primary text-sm">💎 {ticket.price_paid}</p>
                        </div>
                      </div>

                      {ticket.purchased_by_user_id !== currentUser.$id && (
                        <p className="text-[10px] font-semibold text-muted-foreground/70">
                          🎁 Gift from <span className="font-black text-foreground/80">{ticket.purchased_by_name}</span>
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Event Details + Buy Dialog ─── */}
      <Dialog open={showBuyDialog} onOpenChange={o => { if (!o) setShowBuyDialog(false); }}>
        <DialogContent className="bg-white dark:bg-[#12121a] border-black/8 dark:border-white/8 rounded-[2.5rem] max-w-md max-h-[92vh] overflow-y-auto p-0 shadow-2xl">
          {selectedEvent && (
            <>
              {selectedEvent.flyer_url && (
                <div className="h-56 w-full relative overflow-hidden rounded-t-[2.5rem]">
                  <img src={selectedEvent.flyer_url} alt={selectedEvent.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#12121a] via-transparent to-transparent" />
                </div>
              )}
              <div className="p-6 space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">{selectedEvent.title}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Date', value: formatEventDate(selectedEvent.event_date), icon: Calendar },
                    { label: 'Time', value: `${formatEventTime(selectedEvent.start_time)} – ${formatEventTime(selectedEvent.end_time)}`, icon: Clock },
                  ].map(item => (
                    <div key={item.label} className="bg-secondary/40 dark:bg-white/5 rounded-2xl p-3.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon className="h-3 w-3 text-primary/70" />
                        <p className="text-[9px] font-black uppercase text-muted-foreground/70">{item.label}</p>
                      </div>
                      <p className="font-bold text-sm">{item.value}</p>
                    </div>
                  ))}
                  <div className="bg-secondary/40 dark:bg-white/5 rounded-2xl p-3.5 col-span-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3 w-3 text-primary/70" />
                      <p className="text-[9px] font-black uppercase text-muted-foreground/70">Venue</p>
                    </div>
                    <p className="font-bold text-sm">{selectedEvent.venue}</p>
                  </div>
                </div>

                <div className="bg-secondary/30 dark:bg-white/4 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground/70 mb-2">About this Event</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{selectedEvent.description}</p>
                </div>

                {/* Price vs balance */}
                <div className="flex items-stretch gap-3">
                  <div className="flex-1 bg-primary/10 rounded-2xl p-4 text-center">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/70 mb-1">Ticket Price</p>
                    <p className="text-2xl font-black text-primary">💎 {selectedEvent.ticket_price}</p>
                  </div>
                  <div className="flex-1 bg-secondary/40 dark:bg-white/5 rounded-2xl p-4 text-center">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/70 mb-1">Your Balance</p>
                    <p className={`text-2xl font-black ${balance >= selectedEvent.ticket_price ? 'text-emerald-500' : 'text-red-500'}`}>
                      💎 {balance.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Buy for self / other */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {['myself', 'someone'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => { if (opt === 'myself') { setBuyForOther(false); setSelectedRecipient(null); setRecipientSearch(''); } else setBuyForOther(true); }}
                        className={`flex-1 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border ${(opt === 'myself' ? !buyForOther : buyForOther) ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'border-black/10 dark:border-white/10 text-muted-foreground hover:bg-secondary/40'}`}
                      >
                        {opt === 'myself' ? 'Buy for Myself' : 'Gift Someone'}
                      </button>
                    ))}
                  </div>

                  {buyForOther && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <input
                          value={recipientSearch}
                          onChange={e => handleRecipientInput(e.target.value)}
                          placeholder="Search by username..."
                          className="w-full bg-secondary/30 dark:bg-white/5 border border-transparent focus:border-primary/30 rounded-2xl h-11 pl-10 pr-4 text-sm outline-none transition-all"
                        />
                        {isSearchingUser && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                      </div>
                      {recipientResults.length > 0 && !selectedRecipient && (
                        <div className="bg-secondary/30 dark:bg-white/5 rounded-2xl overflow-hidden divide-y divide-black/5 dark:divide-white/5">
                          {recipientResults.map(u => (
                            <button
                              key={u.$id}
                              onClick={() => { setSelectedRecipient(u); setRecipientSearch(u.username || u.display_name); setRecipientResults([]); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/8 transition-colors text-left"
                            >
                              <Avatar className="h-8 w-8 border border-black/5 shrink-0">
                                <AvatarImage src={u.avatar} />
                                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-sm">{u.display_name || u.name}</p>
                                <p className="text-[10px] text-muted-foreground">@{u.username}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedRecipient && (
                        <div className="flex items-center gap-3 bg-primary/10 rounded-2xl px-4 py-3 border border-primary/20">
                          <Avatar className="h-9 w-9 border border-primary/20 shrink-0">
                            <AvatarImage src={selectedRecipient.avatar} />
                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-bold text-sm">{selectedRecipient.display_name || selectedRecipient.name}</p>
                            <p className="text-[10px] text-muted-foreground">@{selectedRecipient.username}</p>
                          </div>
                          <button onClick={() => { setSelectedRecipient(null); setRecipientSearch(''); }} className="h-7 w-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 transition-all">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleProceedToConfirm}
                  disabled={balance < selectedEvent.ticket_price}
                  className="w-full h-14 rounded-2xl font-black text-base bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25 disabled:opacity-40"
                >
                  {balance < selectedEvent.ticket_price
                    ? 'Not Enough Credits'
                    : <><Ticket className="h-5 w-5 mr-2" />Get Ticket — 💎 {selectedEvent.ticket_price}</>
                  }
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Dialog ─── */}
      <Dialog open={showConfirmDialog} onOpenChange={o => { if (!o && !isBuying) setShowConfirmDialog(false); }}>
        <DialogContent className="bg-white dark:bg-[#12121a] border-black/8 dark:border-white/8 rounded-[2.5rem] max-w-sm shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">Confirm Purchase</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 py-2">
              <div className="bg-secondary/30 dark:bg-white/4 rounded-2xl overflow-hidden divide-y divide-black/5 dark:divide-white/8">
                {[
                  { label: 'Event', value: selectedEvent.title },
                  { label: 'Date', value: formatEventDate(selectedEvent.event_date) },
                  { label: 'Time', value: `${formatEventTime(selectedEvent.start_time)} – ${formatEventTime(selectedEvent.end_time)}` },
                  { label: 'Venue', value: selectedEvent.venue },
                  ...(buyForOther && selectedRecipient ? [{ label: 'Ticket For', value: `@${selectedRecipient.username}` }] : []),
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center px-4 py-3">
                    <span className="text-[10px] font-black uppercase text-muted-foreground/70">{row.label}</span>
                    <span className="font-semibold text-sm text-right max-w-[180px]">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between bg-primary/10 rounded-2xl px-5 py-4">
                <div>
                  <p className="text-[9px] font-black uppercase text-muted-foreground/70 mb-0.5">Total</p>
                  <p className="text-2xl font-black text-primary">💎 {selectedEvent.ticket_price}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/70 mb-0.5">Remaining</p>
                  <p className="text-xl font-black text-foreground">💎 {(balance - selectedEvent.ticket_price).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2.5">
            <Button variant="ghost" onClick={() => setShowConfirmDialog(false)} disabled={isBuying} className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px]">Cancel</Button>
            <Button onClick={handleConfirmPurchase} disabled={isBuying} className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px] bg-gradient-to-r from-primary to-purple-600">
              {isBuying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Success Dialog ─── */}
      <Dialog open={showSuccessDialog} onOpenChange={o => { if (!o) { setShowSuccessDialog(false); setNewTicket(null); } }}>
        <DialogContent className="bg-white dark:bg-[#12121a] border-black/8 dark:border-white/8 rounded-[2.5rem] max-w-sm shadow-2xl">
          <div className="text-center space-y-5 py-4">
            <div className="relative mx-auto h-20 w-20">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl" />
              <div className="relative h-20 w-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">Ticket Purchased!</h3>
              <p className="text-muted-foreground text-sm mt-1.5">
                {buyForOther && selectedRecipient
                  ? `Ticket sent to @${selectedRecipient?.username}!`
                  : 'Saved in My Tickets.'}
              </p>
            </div>
            {newTicket && (
              <div className="space-y-3">
                {newTicketQR && (
                  <div className="bg-white rounded-2xl p-5 inline-block shadow-lg border border-black/5 mx-auto">
                    <img src={newTicketQR} alt="Ticket QR Code" className="w-44 h-44 mx-auto" />
                  </div>
                )}
                <div className="bg-secondary/40 dark:bg-white/5 rounded-2xl p-3.5">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/70 mb-1">Serial Number</p>
                  <p className="font-mono font-black text-base tracking-widest">{newTicket.serial_number}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2.5">
              <Button
                onClick={() => { setShowSuccessDialog(false); setNewTicket(null); setTab('my_tickets'); loadMyTickets(); }}
                className="flex-1 h-12 rounded-2xl font-black text-[11px] bg-gradient-to-r from-primary to-purple-600"
              >
                View My Tickets
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowSuccessDialog(false); setNewTicket(null); }}
                className="flex-1 h-12 rounded-2xl font-black text-[11px]"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Ticket Detail Dialog ─── */}
      <Dialog open={!!selectedTicket} onOpenChange={o => { if (!o) { setSelectedTicket(null); setSelectedTicketQR(''); } }}>
        <DialogContent className="bg-white dark:bg-[#12121a] border-black/8 dark:border-white/8 rounded-[2.5rem] max-w-sm shadow-2xl overflow-hidden p-0">
          {/* Top strip */}
          <div className={`h-1.5 w-full ${selectedTicket?.is_used ? 'bg-muted' : 'bg-gradient-to-r from-primary to-purple-500'}`} />
          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">{selectedTicket?.event_title}</DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <>
                {/* QR code */}
                <div className="bg-white rounded-2xl p-5 flex items-center justify-center shadow-md border border-black/5 min-h-[200px]">
                  {selectedTicketQR
                    ? <img src={selectedTicketQR} alt="QR Code" className="w-44 h-44" />
                    : <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  }
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-secondary/40 dark:bg-white/5 rounded-2xl p-3.5 col-span-2">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/70 mb-1">Serial Number</p>
                    <p className="font-mono font-black text-sm tracking-wider">{selectedTicket.serial_number}</p>
                  </div>
                  <div className="bg-secondary/40 dark:bg-white/5 rounded-2xl p-3.5">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/70 mb-1">Date</p>
                    <p className="font-bold text-xs">{formatEventDate(selectedTicket.event_date)}</p>
                  </div>
                  <div className="bg-secondary/40 dark:bg-white/5 rounded-2xl p-3.5">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/70 mb-1">Status</p>
                    <p className={`font-black text-sm ${selectedTicket.is_used ? 'text-red-500' : 'text-emerald-500'}`}>
                      {selectedTicket.is_used ? 'Used' : '✓ Valid'}
                    </p>
                  </div>
                  <div className="bg-secondary/40 dark:bg-white/5 rounded-2xl p-3.5 col-span-2">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/70 mb-1">Venue</p>
                    <p className="font-bold text-sm">{selectedTicket.event_venue}</p>
                  </div>
                  <div className="bg-secondary/40 dark:bg-white/5 rounded-2xl p-3.5">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/70 mb-1">Price Paid</p>
                    <p className="font-black text-primary">💎 {selectedTicket.price_paid}</p>
                  </div>
                  <div className="bg-secondary/40 dark:bg-white/5 rounded-2xl p-3.5">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/70 mb-1">Time</p>
                    <p className="font-bold text-xs">{formatEventTime(selectedTicket.event_start_time)} – {formatEventTime(selectedTicket.event_end_time)}</p>
                  </div>
                </div>

                {selectedTicket.purchased_by_user_id !== currentUser.$id && (
                  <div className="bg-primary/8 rounded-2xl p-3.5 text-center border border-primary/15">
                    <p className="text-[10px] font-semibold text-muted-foreground">🎁 Gift from <span className="font-black text-primary">{selectedTicket.purchased_by_name}</span></p>
                  </div>
                )}

                <p className="text-[9px] font-semibold uppercase text-muted-foreground/60 text-center">Show this QR code at the event entrance</p>

                <Button onClick={() => setSelectedTicket(null)} className="w-full rounded-2xl font-black uppercase text-[11px] bg-gradient-to-r from-primary to-purple-600">
                  Close
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
