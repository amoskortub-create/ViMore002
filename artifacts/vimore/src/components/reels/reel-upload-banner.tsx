'use client';
import { useReelUpload } from '@/context/ReelUploadContext';
import { X, CheckCircle2, AlertCircle, Upload, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReelUploadBanner() {
  const { job, dismissJob, retryUpload } = useReelUpload();
  if (!job) return null;

  const isActive = job.status === 'compressing' || job.status === 'uploading';

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[200] pointer-events-auto">
      <div className={cn(
        "rounded-2xl border px-4 py-3 flex items-center gap-3 shadow-2xl backdrop-blur-xl transition-all",
        job.status === 'done'       && "bg-green-950/90 border-green-500/40",
        job.status === 'error'      && "bg-red-950/90 border-red-500/40",
        job.status === 'compressing' && "bg-black/90 border-primary/20",
        job.status === 'uploading'  && "bg-black/90 border-white/10",
      )}>
        {/* Icon */}
        <div className="shrink-0">
          {job.status === 'compressing' && (
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
          )}
          {job.status === 'uploading' && (
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Upload className="h-4 w-4 text-primary animate-bounce" />
            </div>
          )}
          {job.status === 'done'  && <CheckCircle2 className="h-8 w-8 text-green-400" />}
          {job.status === 'error' && <AlertCircle className="h-8 w-8 text-red-400" />}
        </div>

        {/* Label + progress bar */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-bold truncate",
            job.status === 'done'        && "text-green-400",
            job.status === 'error'       && "text-red-400",
            (isActive)                   && "text-white",
          )}>
            {job.status === 'error' ? job.error || 'Upload failed' : job.label}
          </p>
          {isActive && (
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}
          {isActive && (
            <p className="text-white/40 text-[10px] mt-0.5">
              {job.status === 'compressing'
                ? 'Compressing… you can keep browsing'
                : `${job.progress}% — you can keep browsing`}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2">
          {job.status === 'error' && job.retryable && (
            <button
              onClick={retryUpload}
              className="h-7 px-3 rounded-full bg-primary/20 border border-primary/30 text-primary text-[11px] font-bold flex items-center gap-1 active:scale-90 transition-transform"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          )}
          {(job.status === 'done' || job.status === 'error') && (
            <button
              onClick={dismissJob}
              className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="h-4 w-4 text-white/60" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
