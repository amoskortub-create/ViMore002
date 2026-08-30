let audio: HTMLAudioElement | null = null;

export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    if (!audio) audio = new Audio('/sounds/notification.mp3');
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {}
}
