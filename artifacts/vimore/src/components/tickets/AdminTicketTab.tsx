"use client";

import { useState, useEffect, useRef } from "react";
import { databases, DATABASE_ID, COL, BUCKET, ID, getFileUrl, Query } from "@/lib/appwrite";
import { uploadViaClient } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Ticket, Gem, Calendar, Clock, MapPin, ImageIcon, X, Users, TrendingUp, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatEventDate, formatEventTime, isEventExpired } from "@/lib/ticket-utils";

interface AppwriteEvent {
  $id: string;
  $createdAt: string;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  start_time: string;
  end_time: string;
  flyer_id: string;
  flyer_url: string;
  ticket_price: number;
  is_active: boolean;
  created_by: string;
}

interface EventStats {
  eventId: string;
  totalTickets: number;
  totalDiamonds: number;
}

export function AdminTicketTab({ currentUserId }: { currentUserId: string }) {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<'create' | 'events'>('events');
  const [events, setEvents] = useState<AppwriteEvent[]>([]);
  const [eventStats, setEventStats] = useState<Record<string, EventStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [viewEvent, setViewEvent] = useState<AppwriteEvent | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    venue: '',
    event_date: '',
    start_time: '',
    end_time: '',
    ticket_price: '',
  });
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const flyerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.EVENTS, [
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]);
      const evs = res.documents as unknown as AppwriteEvent[];
      setEvents(evs);
      await loadStats(evs);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to load events' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async (evs: AppwriteEvent[]) => {
    const stats: Record<string, EventStats> = {};
    for (const ev of evs) {
      try {
        const ticketRes = await databases.listDocuments(DATABASE_ID, COL.TICKETS, [
          Query.equal('event_id', ev.$id),
          Query.limit(1000),
        ]);
        const tickets = ticketRes.documents;
        stats[ev.$id] = {
          eventId: ev.$id,
          totalTickets: tickets.length,
          totalDiamonds: tickets.reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0),
        };
      } catch {
        stats[ev.$id] = { eventId: ev.$id, totalTickets: 0, totalDiamonds: 0 };
      }
    }
    setEventStats(stats);
  };

  const handleFlyerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFlyerFile(file);
      setFlyerPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.venue.trim() || !form.event_date || !form.start_time || !form.end_time || !form.ticket_price || !flyerFile) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all fields and upload a flyer.' });
      return;
    }
    const price = parseInt(form.ticket_price);
    if (isNaN(price) || price < 1) {
      toast({ variant: 'destructive', title: 'Invalid price' });
      return;
    }
    setIsCreating(true);
    try {
      const flyerId = await uploadViaClient(flyerFile, BUCKET.EVENT_FLYERS);
      const flyerUrl = getFileUrl(BUCKET.EVENT_FLYERS, flyerId);

      await databases.createDocument(DATABASE_ID, COL.EVENTS, ID.unique(), {
        title: form.title.trim(),
        description: form.description.trim(),
        venue: form.venue.trim(),
        event_date: form.event_date,
        start_time: form.start_time,
        end_time: form.end_time,
        flyer_id: flyerId,
        flyer_url: flyerUrl,
        ticket_price: price,
        is_active: true,
        created_by: currentUserId,
      });

      toast({ title: 'Event Created', description: `"${form.title}" is now live.` });
      setForm({ title: '', description: '', venue: '', event_date: '', start_time: '', end_time: '', ticket_price: '' });
      setFlyerFile(null);
      setFlyerPreview(null);
      setSubTab('events');
      loadEvents();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to create event', description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (ev: AppwriteEvent) => {
    try {
      await databases.updateDocument(DATABASE_ID, COL.EVENTS, ev.$id, { is_active: !ev.is_active });
      toast({ title: ev.is_active ? 'Event deactivated' : 'Event activated' });
      loadEvents();
    } catch {
      toast({ variant: 'destructive', title: 'Update failed' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h3 className="text-3xl font-black italic uppercase tracking-tighter">Ticket System</h3>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ViMore Event Management</p>
        </div>
        <div className="flex gap-1 bg-secondary/40 p-1.5 rounded-2xl">
          <button
            onClick={() => setSubTab('events')}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'events' ? 'bg-white dark:bg-card text-primary shadow-md' : 'text-muted-foreground'}`}
          >
            Events
          </button>
          <button
            onClick={() => setSubTab('create')}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${subTab === 'create' ? 'bg-white dark:bg-card text-primary shadow-md' : 'text-muted-foreground'}`}
          >
            <Plus className="h-3 w-3" />
            Create Event
          </button>
        </div>
      </div>

      {subTab === 'create' && (
        <Card className="bg-card/40 border-border rounded-[2.5rem] overflow-hidden shadow-xl">
          <CardContent className="p-8 space-y-6">
            <h4 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              New Event
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Event Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. ViMore Annual Gala 2026"
                  className="bg-secondary/30 border-none rounded-2xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Venue *</Label>
                <Input
                  value={form.venue}
                  onChange={e => setForm(p => ({ ...p, venue: e.target.value }))}
                  placeholder="e.g. Monrovia Convention Center"
                  className="bg-secondary/30 border-none rounded-2xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Event Date *</Label>
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
                  className="bg-secondary/30 border-none rounded-2xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ticket Price (Credits) *</Label>
                <div className="relative">
                  <Gem className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    type="number"
                    min="1"
                    value={form.ticket_price}
                    onChange={e => setForm(p => ({ ...p, ticket_price: e.target.value }))}
                    placeholder="100"
                    className="bg-secondary/30 border-none rounded-2xl h-12 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Start Time *</Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                  className="bg-secondary/30 border-none rounded-2xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">End Time *</Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                  className="bg-secondary/30 border-none rounded-2xl h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Event Description / Details *</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the event, what to expect, dress code, etc..."
                className="bg-secondary/30 border-none rounded-2xl resize-none min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Event Flyer / Cover *</Label>
              {flyerPreview ? (
                <div className="relative rounded-3xl overflow-hidden border border-border/50 h-48">
                  <img src={flyerPreview} alt="Flyer preview" className="w-full h-full object-cover" />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setFlyerFile(null); setFlyerPreview(null); }}
                    className="absolute top-3 right-3 h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label
                  className="flex flex-col items-center justify-center h-40 rounded-3xl border-2 border-dashed border-border/50 hover:border-primary/50 cursor-pointer transition-colors bg-secondary/20 hover:bg-primary/5"
                  onClick={() => flyerInputRef.current?.click()}
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload Event Flyer</span>
                  <span className="text-[9px] text-muted-foreground mt-1">PNG, JPG, WebP</span>
                  <input ref={flyerInputRef} type="file" accept="image/*" className="hidden" onChange={handleFlyerChange} />
                </label>
              )}
            </div>

            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full h-14 rounded-2xl font-black italic uppercase tracking-tighter text-base bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
            >
              {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Ticket className="h-5 w-5 mr-2" /> Create Event</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {subTab === 'events' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <Card className="bg-card/40 border-border rounded-[2.5rem] p-12 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-black italic uppercase text-lg tracking-tighter">No Events Yet</p>
              <p className="text-muted-foreground text-sm mt-2">Create your first event to get started.</p>
              <Button onClick={() => setSubTab('create')} className="mt-6 rounded-2xl font-black uppercase text-[10px]">
                <Plus className="h-4 w-4 mr-2" /> Create Event
              </Button>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-card/40 border-border rounded-[2rem] p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Ticket className="h-6 w-6 text-primary" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Events</p>
                      <p className="text-2xl font-black italic uppercase tracking-tighter">{events.length}</p>
                    </div>
                  </div>
                </Card>
                <Card className="bg-card/40 border-border rounded-[2rem] p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-400/10 flex items-center justify-center"><Users className="h-6 w-6 text-blue-400" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tickets Sold</p>
                      <p className="text-2xl font-black italic uppercase tracking-tighter">{Object.values(eventStats).reduce((s, e) => s + e.totalTickets, 0)}</p>
                    </div>
                  </div>
                </Card>
                <Card className="bg-card/40 border-border rounded-[2rem] p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-400/10 flex items-center justify-center"><Gem className="h-6 w-6 text-amber-400" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Credits</p>
                      <p className="text-2xl font-black italic uppercase tracking-tighter">{Object.values(eventStats).reduce((s, e) => s + e.totalDiamonds, 0).toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                {events.map(ev => {
                  const stats = eventStats[ev.$id];
                  const expired = isEventExpired(ev.event_date, ev.end_time);
                  return (
                    <Card key={ev.$id} className="bg-card/40 border-border rounded-[2rem] overflow-hidden hover:border-primary/30 transition-all">
                      <div className="flex items-stretch gap-0">
                        {ev.flyer_url && (
                          <div className="w-24 sm:w-36 shrink-0 relative">
                            <img src={ev.flyer_url} alt={ev.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 p-5 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-black italic uppercase tracking-tighter text-base leading-tight">{ev.title}</h4>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{formatEventDate(ev.event_date)}</span>
                                <span className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{formatEventTime(ev.start_time)} – {formatEventTime(ev.end_time)}</span>
                                <span className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.venue}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase px-3">
                                <Gem className="h-2.5 w-2.5 mr-1" />{ev.ticket_price} Credits
                              </Badge>
                              {expired ? (
                                <Badge variant="outline" className="border-red-500/30 text-red-500 text-[9px] font-black uppercase">Expired</Badge>
                              ) : ev.is_active ? (
                                <Badge variant="outline" className="border-green-500/30 text-green-500 text-[9px] font-black uppercase">Active</Badge>
                              ) : (
                                <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 text-[9px] font-black uppercase">Paused</Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-secondary/30 rounded-xl px-3 py-1.5">
                              <Users className="h-3.5 w-3.5 text-blue-400" />
                              <span className="text-[10px] font-black uppercase">{stats?.totalTickets ?? 0} Tickets</span>
                            </div>
                            <div className="flex items-center gap-2 bg-secondary/30 rounded-xl px-3 py-1.5">
                              <Gem className="h-3.5 w-3.5 text-amber-400" />
                              <span className="text-[10px] font-black uppercase">{(stats?.totalDiamonds ?? 0).toLocaleString()} Credits</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewEvent(ev)}
                              className="h-8 rounded-xl text-[9px] font-black uppercase border-border/50"
                            >
                              <Eye className="h-3 w-3 mr-1" /> Details
                            </Button>
                            {!expired && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleActive(ev)}
                                className={`h-8 rounded-xl text-[9px] font-black uppercase ${ev.is_active ? 'border-yellow-500/30 text-yellow-500' : 'border-green-500/30 text-green-500'}`}
                              >
                                {ev.is_active ? 'Pause' : 'Activate'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <Dialog open={!!viewEvent} onOpenChange={o => { if (!o) setViewEvent(null); }}>
        <DialogContent className="bg-card border-border rounded-[2.5rem] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">{viewEvent?.title}</DialogTitle>
          </DialogHeader>
          {viewEvent && (
            <div className="space-y-4">
              {viewEvent.flyer_url && (
                <div className="rounded-2xl overflow-hidden h-48">
                  <img src={viewEvent.flyer_url} alt={viewEvent.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/30 rounded-2xl p-3">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Date</p>
                  <p className="font-bold text-sm mt-1">{formatEventDate(viewEvent.event_date)}</p>
                </div>
                <div className="bg-secondary/30 rounded-2xl p-3">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Time</p>
                  <p className="font-bold text-sm mt-1">{formatEventTime(viewEvent.start_time)} – {formatEventTime(viewEvent.end_time)}</p>
                </div>
                <div className="bg-secondary/30 rounded-2xl p-3">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Venue</p>
                  <p className="font-bold text-sm mt-1">{viewEvent.venue}</p>
                </div>
                <div className="bg-secondary/30 rounded-2xl p-3">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Ticket Price</p>
                  <p className="font-bold text-sm mt-1 text-primary">💎 {viewEvent.ticket_price} Credits</p>
                </div>
              </div>
              <div className="bg-secondary/30 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-2">Description</p>
                <p className="text-sm leading-relaxed">{viewEvent.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-500/10 rounded-2xl p-3 text-center">
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Tickets Sold</p>
                  <p className="text-2xl font-black text-blue-400">{eventStats[viewEvent.$id]?.totalTickets ?? 0}</p>
                </div>
                <div className="bg-amber-500/10 rounded-2xl p-3 text-center">
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Total Credits</p>
                  <p className="text-2xl font-black text-amber-400">{(eventStats[viewEvent.$id]?.totalDiamonds ?? 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewEvent(null)} className="w-full rounded-2xl font-black uppercase text-[10px]">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
