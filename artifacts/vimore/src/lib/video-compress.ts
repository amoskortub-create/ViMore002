'use client';

export interface CompressOptions {
  maxDurationSec?: number;
  targetVideoBitrate?: number;
  targetAudioBitrate?: number;
  maxWidth?: number;
  maxHeight?: number;
  onProgress?: (pct: number, label: string) => void;
}

export interface CompressResult {
  file: File;
  duration: number;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
}

const DEFAULT_MAX_DURATION = 900; // 15 minutes
const DEFAULT_VIDEO_BITRATE = 2_000_000; // 2 Mbps
const DEFAULT_AUDIO_BITRATE = 96_000;   // 96 kbps
const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1080;
const SKIP_COMPRESSION_THRESHOLD_BPS = 3_000_000; // skip if already < 3 Mbps

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(video.duration) ? video.duration : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot read video metadata'));
    };
  });
}

function getTargetDimensions(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number
): { w: number; h: number } {
  if (srcW <= maxW && srcH <= maxH) return { w: srcW, h: srcH };
  const scale = Math.min(maxW / srcW, maxH / srcH);
  return {
    w: Math.round(srcW * scale / 2) * 2, // keep even for codec
    h: Math.round(srcH * scale / 2) * 2,
  };
}

function reencodeVideo(
  file: File,
  duration: number,
  opts: CompressOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);

    const videoEl = document.createElement('video');
    videoEl.src = url;
    videoEl.preload = 'auto';
    videoEl.playsInline = true;
    videoEl.muted = true; // we'll capture audio separately
    videoEl.crossOrigin = 'anonymous';

    // Attach to DOM (required by some browsers for audio context)
    videoEl.style.position = 'fixed';
    videoEl.style.top = '-9999px';
    videoEl.style.left = '-9999px';
    videoEl.style.width = '1px';
    videoEl.style.height = '1px';
    document.body.appendChild(videoEl);

    const cleanup = (blobUrl: string) => {
      URL.revokeObjectURL(blobUrl);
      document.body.removeChild(videoEl);
    };

    videoEl.onloadedmetadata = () => {
      const { videoWidth, videoHeight } = videoEl;

      const maxW = opts.maxWidth ?? DEFAULT_MAX_WIDTH;
      const maxH = opts.maxHeight ?? DEFAULT_MAX_HEIGHT;
      const { w: targetW, h: targetH } = getTargetDimensions(videoWidth, videoHeight, maxW, maxH);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { alpha: false })!;

      // Capture video from canvas
      const videoStream = canvas.captureStream(30);

      // Capture audio via Web Audio API
      let combinedStream: MediaStream;
      try {
        const audioCtx = new AudioContext();
        const src = audioCtx.createMediaElementSource(videoEl);
        const dest = audioCtx.createMediaStreamDestination();
        src.connect(dest);

        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);

        videoEl.muted = false; // unmute after audio graph is set up

        const handleDone = () => {
          audioCtx.close().catch(() => {});
        };
        videoEl.addEventListener('ended', handleDone, { once: true });
      } catch {
        // Web Audio not available — video-only re-encode
        combinedStream = videoStream;
      }

      const mimeTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const mime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) ?? '';

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(combinedStream, {
          ...(mime ? { mimeType: mime } : {}),
          videoBitsPerSecond: opts.targetVideoBitrate ?? DEFAULT_VIDEO_BITRATE,
          audioBitsPerSecond: opts.targetAudioBitrate ?? DEFAULT_AUDIO_BITRATE,
        });
      } catch {
        cleanup(url);
        reject(new Error('MediaRecorder not supported in this browser'));
        return;
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = () => {
        cleanup(url);
        if (chunks.length === 0) { reject(new Error('No output from encoder')); return; }
        const outputType = mime || 'video/webm';
        resolve(new Blob(chunks, { type: outputType }));
      };

      let animFrame: number;

      const drawFrame = () => {
        if (videoEl.readyState >= 2) {
          ctx.drawImage(videoEl, 0, 0, targetW, targetH);
        }
        const pct = duration > 0 ? Math.min(videoEl.currentTime / duration, 1) : 0;
        opts.onProgress?.(pct * 0.9, `Compressing… ${Math.round(pct * 100)}%`);
        if (!videoEl.ended && !videoEl.paused) {
          animFrame = requestAnimationFrame(drawFrame);
        }
      };

      videoEl.onended = () => {
        cancelAnimationFrame(animFrame);
        setTimeout(() => { try { recorder.stop(); } catch { /* ignore */ } }, 200);
      };

      videoEl.onerror = () => {
        cancelAnimationFrame(animFrame);
        try { recorder.stop(); } catch { /* ignore */ }
        cleanup(url);
        reject(new Error('Video decode error during compression'));
      };

      recorder.start(200);
      videoEl.play()
        .then(() => { animFrame = requestAnimationFrame(drawFrame); })
        .catch(e => {
          cleanup(url);
          reject(new Error(`Video playback failed: ${e.message}`));
        });
    };

    videoEl.onerror = () => {
      cleanup(url);
      reject(new Error('Cannot load video for compression'));
    };
  });
}

export async function validateAndCompressVideo(
  file: File,
  opts: CompressOptions = {}
): Promise<CompressResult> {
  const maxDuration = opts.maxDurationSec ?? DEFAULT_MAX_DURATION;

  opts.onProgress?.(0, 'Reading video…');

  const duration = await getVideoDuration(file);

  if (duration <= 0) throw new Error('Could not read video duration. Please try a different file.');
  if (duration > maxDuration) {
    const maxMin = Math.floor(maxDuration / 60);
    const actualMin = Math.floor(duration / 60);
    const actualSec = Math.round(duration % 60);
    throw new Error(
      `Video is too long (${actualMin}m ${actualSec}s). Maximum allowed is ${maxMin} minutes.`
    );
  }

  const effectiveBitrate = duration > 0 ? (file.size * 8) / duration : 0;
  const alreadyOptimized =
    effectiveBitrate < SKIP_COMPRESSION_THRESHOLD_BPS;

  if (alreadyOptimized) {
    opts.onProgress?.(1, 'Video is already optimized');
    return {
      file,
      duration,
      compressed: false,
      originalSize: file.size,
      finalSize: file.size,
    };
  }

  // Needs compression
  opts.onProgress?.(0.02, 'Starting compression…');

  const compressedBlob = await reencodeVideo(file, duration, opts);

  // Only use the compressed version if it's actually smaller
  const outputBlob = compressedBlob.size < file.size ? compressedBlob : file;
  const ext = compressedBlob.type.includes('mp4') ? 'mp4' : 'webm';
  const outputFile = new File(
    [outputBlob],
    file.name.replace(/\.[^.]+$/, '') + `.${ext}`,
    { type: outputBlob.type || 'video/webm' }
  );

  opts.onProgress?.(1, 'Compression complete');

  return {
    file: outputFile,
    duration,
    compressed: compressedBlob.size < file.size,
    originalSize: file.size,
    finalSize: outputFile.size,
  };
}
