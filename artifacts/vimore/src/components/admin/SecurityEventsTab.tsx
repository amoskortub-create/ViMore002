'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { databases, DATABASE_ID, client, Query } from '@/lib/appwrite';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ShieldAlert,
  RefreshCw,
  Search,
  Circle,
  Filter,
  X,
  Zap,
  Info,
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  Loader2,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COLL = 'security_events';
const PAGE_SIZE = 50;

type Severity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
type EventResult = 'success' | 'failure' | 'blocked';

interface SecurityEvent {
  $id: string;
  $createdAt: string;
  event_type: string;
  severity: Severity;
  user_id?: string;
  actor_id?: string;
  actor_role?: string;
  target_id?: string;
  amount?: string;
  currency?: string;
  result?: EventResult;
  endpoint?: string;
  method?: string;
  ip_address?: string;
  user_agent?: string;
  details?: string;
}

// ─── Severity helpers ────────────────────────────────────────────────────────
function severityColor(s: Severity) {
  switch (s) {
    case 'CRITICAL': return 'text-red-400 border-red-400/30 bg-red-500/10';
    case 'ERROR':    return 'text-orange-400 border-orange-400/30 bg-orange-500/10';
    case 'WARN':     return 'text-yellow-400 border-yellow-400/30 bg-yellow-500/10';
    default:         return 'text-blue-400 border-blue-400/30 bg-blue-500/10';
  }
}

function SeverityIcon({ s, className }: { s: Severity; className?: string }) {
  const cls = cn('h-3.5 w-3.5', className);
  if (s === 'CRITICAL') return <AlertOctagon className={cn(cls, 'text-red-400')} />;
  if (s === 'ERROR')    return <AlertTriangle className={cn(cls, 'text-orange-400')} />;
  if (s === 'WARN')     return <AlertTriangle className={cn(cls, 'text-yellow-400')} />;
  return <Info className={cn(cls, 'text-blue-400')} />;
}

function resultBadge(r?: EventResult) {
  if (r === 'failure') return <Badge className="text-[9px] font-black uppercase bg-red-500/10 text-red-400 border-none">failure</Badge>;
  if (r === 'blocked') return <Badge className="text-[9px] font-black uppercase bg-yellow-500/10 text-yellow-400 border-none">blocked</Badge>;
  return <Badge className="text-[9px] font-black uppercase bg-green-500/10 text-green-400 border-none">success</Badge>;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)    return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Main component ──────────────────────────────────────────────────────────
export function SecurityEventsTab() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const [isLive, setIsLive] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'ALL'>('ALL');
  const [resultFilter, setResultFilter] = useState<EventResult | 'ALL'>('ALL');

  const cursorRef   = useRef<string | null>(null);
  const unsubRef    = useRef<(() => void) | null>(null);
  const topRef      = useRef<HTMLDivElement>(null);
  const isLiveRef   = useRef(isLive);
  isLiveRef.current = isLive;

  // ─── fetch page ────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      cursorRef.current = null;
    } else {
      setLoadingMore(true);
    }

    try {
      const q: string[] = [
        Query.orderDesc('$createdAt'),
        Query.limit(PAGE_SIZE),
      ];
      if (!reset && cursorRef.current) q.push(Query.cursorAfter(cursorRef.current));

      const res = await databases.listDocuments(DATABASE_ID, COLL, q);
      const docs = res.documents as unknown as SecurityEvent[];

      if (reset) {
        setEvents(docs);
      } else {
        setEvents(prev => [...prev, ...docs]);
      }

      setHasMore(docs.length === PAGE_SIZE);
      if (docs.length > 0) cursorRef.current = docs[docs.length - 1].$id;
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // ─── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPage(true);
  }, [fetchPage]);

  // ─── real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    const channel = `databases.${DATABASE_ID}.collections.${COLL}.documents`;

    const unsub = client.subscribe(channel, (payload: any) => {
      const event = payload.events?.[0] ?? '';
      if (!event.includes('.create')) return;

      const doc = payload.payload as SecurityEvent;

      // Always count the live event
      setLiveCount(c => c + 1);

      // Prepend to the list only when "live" mode is on
      if (isLiveRef.current) {
        setEvents(prev => [doc, ...prev]);
        // Scroll to top smoothly
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    });

    unsubRef.current = unsub;
    return () => { unsub(); };
  }, []);

  // ─── filtered view ─────────────────────────────────────────────────────────
  const filtered = events.filter(ev => {
    if (severityFilter !== 'ALL' && ev.severity !== severityFilter) return false;
    if (resultFilter   !== 'ALL' && ev.result   !== resultFilter)   return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        ev.event_type?.toLowerCase().includes(q) ||
        ev.user_id?.toLowerCase().includes(q) ||
        ev.actor_id?.toLowerCase().includes(q) ||
        ev.ip_address?.toLowerCase().includes(q) ||
        ev.details?.toLowerCase().includes(q) ||
        ev.endpoint?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hasFilters = severityFilter !== 'ALL' || resultFilter !== 'ALL' || search !== '';

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
        <div className="space-y-1">
          <h3 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-primary" />
            Security Events
          </h3>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Real-time transaction & admin action audit trail
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Live pill */}
          <button
            onClick={() => setIsLive(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all',
              isLive
                ? 'bg-green-500/10 text-green-400 border-green-400/20'
                : 'bg-muted/20 text-muted-foreground border-border',
            )}
          >
            <Radio className={cn('h-3 w-3', isLive && 'animate-pulse')} />
            {isLive ? 'Live' : 'Paused'}
          </button>

          {liveCount > 0 && (
            <Badge className="bg-primary/10 text-primary border-none font-black uppercase">
              +{liveCount} new
            </Badge>
          )}

          <Badge className="bg-card border-border text-muted-foreground font-black uppercase">
            {filtered.length} shown
          </Badge>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 rounded-xl"
            onClick={() => { setLiveCount(0); fetchPage(true); }}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card/40 border-border rounded-[2rem] p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search event type, user, IP, endpoint…"
              className="pl-9 bg-secondary/30 border-border rounded-xl text-xs h-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Severity filter */}
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'INFO', 'WARN', 'ERROR', 'CRITICAL'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                  severityFilter === s
                    ? s === 'ALL'       ? 'bg-primary text-white border-primary'
                    : s === 'CRITICAL'  ? 'bg-red-500/20 text-red-400 border-red-400/30'
                    : s === 'ERROR'     ? 'bg-orange-500/20 text-orange-400 border-orange-400/30'
                    : s === 'WARN'      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'
                                        : 'bg-blue-500/20 text-blue-400 border-blue-400/30'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Result filter */}
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'success', 'failure', 'blocked'] as const).map(r => (
              <button
                key={r}
                onClick={() => setResultFilter(r)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                  resultFilter === r
                    ? r === 'ALL'     ? 'bg-primary text-white border-primary'
                    : r === 'failure' ? 'bg-red-500/20 text-red-400 border-red-400/30'
                    : r === 'blocked' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'
                                      : 'bg-green-500/20 text-green-400 border-green-400/30'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {hasFilters && (
            <Button
              size="sm" variant="ghost"
              className="h-9 px-3 rounded-xl text-[10px] font-black uppercase text-muted-foreground"
              onClick={() => { setSearch(''); setSeverityFilter('ALL'); setResultFilter('ALL'); }}
            >
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <div ref={topRef} />
      <Card className="bg-card/40 border-border rounded-[2.5rem] overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest">Loading events…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center opacity-40 italic text-xs uppercase font-black">
            {hasFilters ? 'No events match your filters' : 'No security events recorded yet'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-[9px] font-black text-muted-foreground uppercase tracking-widest bg-secondary/20">
                    <th className="px-6 py-4 w-28">Severity</th>
                    <th className="px-6 py-4">Event</th>
                    <th className="px-6 py-4">Result</th>
                    <th className="px-6 py-4">User / Actor</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">IP / Endpoint</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4 w-24">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((ev, i) => (
                    <tr
                      key={ev.$id}
                      className={cn(
                        'hover:bg-secondary/10 transition-colors',
                        i === 0 && isLive && 'animate-in fade-in slide-in-from-top-2 duration-300',
                        ev.severity === 'CRITICAL' && 'bg-red-500/5',
                        ev.severity === 'ERROR'    && 'bg-orange-500/5',
                      )}
                    >
                      {/* Severity */}
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={cn('text-[9px] font-black uppercase gap-1', severityColor(ev.severity ?? 'INFO'))}
                        >
                          <SeverityIcon s={ev.severity ?? 'INFO'} />
                          {ev.severity ?? 'INFO'}
                        </Badge>
                      </td>

                      {/* Event type */}
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-foreground whitespace-nowrap">
                          {ev.event_type?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Result */}
                      <td className="px-6 py-4">
                        {resultBadge(ev.result as EventResult)}
                      </td>

                      {/* User / Actor */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          {ev.user_id && (
                            <span className="text-[9px] text-muted-foreground font-mono">
                              user: <span className="text-foreground">{ev.user_id.slice(0, 12)}…</span>
                            </span>
                          )}
                          {ev.actor_id && (
                            <span className="text-[9px] text-muted-foreground font-mono">
                              actor: <span className="text-primary">{ev.actor_id.slice(0, 12)}…</span>
                              {ev.actor_role && <span className="ml-1 text-[8px] uppercase text-muted-foreground">({ev.actor_role})</span>}
                            </span>
                          )}
                          {ev.target_id && (
                            <span className="text-[9px] text-muted-foreground font-mono">
                              target: <span className="text-yellow-400">{ev.target_id.slice(0, 12)}…</span>
                            </span>
                          )}
                          {!ev.user_id && !ev.actor_id && (
                            <span className="text-[9px] text-muted-foreground/40">—</span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ev.amount ? (
                          <span className="text-[10px] font-black text-foreground">
                            {ev.amount} {ev.currency === 'DIAMOND' ? '◆' : ev.currency === 'GOLD' ? '⬡' : ev.currency === 'STAR' ? '★' : ev.currency ?? ''}
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* IP / Endpoint */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          {ev.ip_address && (
                            <span className="text-[9px] font-mono text-muted-foreground">{ev.ip_address}</span>
                          )}
                          {ev.endpoint && (
                            <span className="text-[9px] font-mono text-primary/60 truncate max-w-[140px]">
                              {ev.method && <span className="text-muted-foreground mr-1">{ev.method}</span>}
                              {ev.endpoint}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Details */}
                      <td className="px-6 py-4">
                        <p className="text-[10px] text-muted-foreground max-w-[240px] truncate" title={ev.details ?? ''}>
                          {ev.details || '—'}
                        </p>
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[9px] font-black text-muted-foreground" title={new Date(ev.$createdAt).toLocaleString()}>
                          {timeAgo(ev.$createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load more */}
            {hasMore && !hasFilters && (
              <div className="flex justify-center p-6 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchPage(false)}
                  disabled={loadingMore}
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground gap-2"
                >
                  {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronDown className="h-3 w-3" />}
                  Load older events
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Stats bar */}
      {events.length > 0 && (
        <div className="flex flex-wrap gap-4 px-2">
          {(['CRITICAL', 'ERROR', 'WARN', 'INFO'] as Severity[]).map(s => {
            const count = events.filter(e => e.severity === s).length;
            return count > 0 ? (
              <div key={s} className={cn('flex items-center gap-1.5 text-[10px] font-black uppercase', severityColor(s).split(' ')[0])}>
                <SeverityIcon s={s} />
                {count} {s}
              </div>
            ) : null;
          })}
          <div className="ml-auto flex gap-4 text-[10px] font-black uppercase text-muted-foreground">
            <span className="text-green-400">{events.filter(e => e.result === 'success').length} success</span>
            <span className="text-yellow-400">{events.filter(e => e.result === 'blocked').length} blocked</span>
            <span className="text-red-400">{events.filter(e => e.result === 'failure').length} failed</span>
          </div>
        </div>
      )}
    </div>
  );
}
