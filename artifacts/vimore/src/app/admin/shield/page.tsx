"use client";

import { useState, useEffect, useCallback } from "react";
import { usePosts } from "@/context/PostContext";
import { databases, DATABASE_ID, COL } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LiteLink as Link } from "@/components/ui/lite-link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Eye,
  FileText,
} from "lucide-react";

interface AdminReport {
  $id: string;
  doc_id: string;
  collection_name: string;
  reason: string;
  severity: "low" | "medium" | "high";
  reported_at: string;
  status: "open" | "resolved" | "dismissed";
  user_id: string;
  content_preview: string;
  resolved_by?: string;
  resolved_at?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  low: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800",
};

export default function AdminShieldPage() {
  const { currentUser } = usePosts();
  const { toast } = useToast();

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "resolved" | "dismissed">("open");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isAdmin = currentUser?.role && currentUser.role !== "USER";

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.ADMIN_REPORTS, [
        Query.equal("status", filter),
        Query.orderDesc("reported_at"),
        Query.limit(50),
      ]);
      setReports(res.documents as any);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!isAdmin) return;
    loadReports();
  }, [isAdmin, loadReports]);

  async function handleRemove(report: AdminReport) {
    setProcessingId(report.$id);
    try {
      await databases.deleteDocument(DATABASE_ID, report.collection_name, report.doc_id);
      await databases.updateDocument(DATABASE_ID, COL.ADMIN_REPORTS, report.$id, {
        status: "resolved",
        resolved_by: currentUser!.$id,
        resolved_at: new Date().toISOString(),
      });

      if (report.user_id) {
        try {
          await databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
            user_id: report.user_id,
            type: "MODERATION",
            title: "Content removed",
            message: `Your recent post was removed for violating ViMore's Terms of Service. Reason: ${report.reason}`,
            is_read: false,
          });
        } catch { /* notification failure is non-critical */ }
      }

      setReports((prev) => prev.filter((r) => r.$id !== report.$id));
      toast({ title: "Content removed", description: "User has been notified." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to remove", description: e.message });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDismiss(report: AdminReport) {
    setProcessingId(report.$id);
    try {
      await databases.updateDocument(DATABASE_ID, COL.ADMIN_REPORTS, report.$id, {
        status: "dismissed",
        resolved_by: currentUser!.$id,
        resolved_at: new Date().toISOString(),
      });
      try {
        await databases.updateDocument(DATABASE_ID, report.collection_name, report.doc_id, {
          status: "published",
        });
      } catch { /* content may already be gone */ }
      setReports((prev) => prev.filter((r) => r.$id !== report.$id));
      toast({ title: "Report dismissed", description: "Content restored to published." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed", description: e.message });
    } finally {
      setProcessingId(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-bold text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">Admin access required.</p>
          <Link href="/admin" className="mt-4 block">
            <Button variant="outline" size="sm">Back to Admin</Button>
          </Link>
        </div>
      </div>
    );
  }

  const openCount = filter === "open" ? reports.length : 0;

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#050505]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-border h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-black text-base tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Automated Shield
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">AI Content Moderation</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9"
          onClick={loadReports}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats banner */}
        <div className="grid grid-cols-3 gap-3">
          {(["open", "resolved", "dismissed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-2xl p-4 text-left border transition-all",
                filter === s
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                  : "bg-white dark:bg-card border-border hover:border-primary/30"
              )}
            >
              <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", filter === s ? "text-white/70" : "text-muted-foreground")}>
                {s}
              </p>
              <p className={cn("text-xl font-black", filter === s ? "text-white" : "text-foreground")}>
                {s === filter ? reports.length : "—"}
              </p>
            </button>
          ))}
        </div>

        {/* Reports list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-bold text-foreground">All clear</p>
            <p className="text-sm text-muted-foreground">No {filter} reports.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.$id}
                className="bg-white dark:bg-card rounded-3xl border border-border p-5 shadow-sm space-y-4"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border", SEVERITY_STYLES[report.severity])}>
                      {report.severity} severity
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {report.collection_name}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(report.reported_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Reason */}
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl p-3">
                  <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> AI Reason
                  </p>
                  <p className="text-sm text-foreground">{report.reason}</p>
                </div>

                {/* Content preview */}
                {report.content_preview && (
                  <div className="bg-secondary/50 rounded-2xl p-3">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Content Preview
                    </p>
                    <p className="text-sm text-foreground line-clamp-3">{report.content_preview}</p>
                  </div>
                )}

                {/* Actions */}
                {filter === "open" && (
                  <div className="flex gap-3 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl border-border hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                      onClick={() => handleDismiss(report)}
                      disabled={processingId === report.$id}
                    >
                      {processingId === report.$id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200 dark:shadow-red-900/20"
                      onClick={() => handleRemove(report)}
                      disabled={processingId === report.$id}
                    >
                      {processingId === report.$id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
