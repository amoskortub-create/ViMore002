import QRCode from 'qrcode';

export function generateSerialNumber(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let serial = '';
  for (let i = 0; i < 15; i++) {
    serial += chars[Math.floor(Math.random() * chars.length)];
  }
  return serial;
}

export async function generateQRCodeDataUrl(data: string): Promise<string> {
  try {
    const url = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return url;
  } catch {
    return '';
  }
}

export function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatEventTime(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function isEventExpired(eventDate: string, endTime: string): boolean {
  if (!eventDate || !endTime) return false;
  const dateStr = eventDate.split('T')[0];
  const [h, m] = endTime.split(':').map(Number);
  const eventEnd = new Date(dateStr);
  eventEnd.setHours(h, m, 0, 0);
  return Date.now() > eventEnd.getTime();
}

export function getMinutesUntilEvent(eventDate: string, startTime: string): number {
  const dateStr = eventDate.split('T')[0];
  const [h, m] = startTime.split(':').map(Number);
  const eventStart = new Date(dateStr);
  eventStart.setHours(h, m, 0, 0);
  return (eventStart.getTime() - Date.now()) / 60000;
}

export function getDaysUntilEvent(eventDate: string, startTime: string): number {
  return getMinutesUntilEvent(eventDate, startTime) / 1440;
}
