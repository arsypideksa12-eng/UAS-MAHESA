import { AttendanceStatus } from '../types/hrm';

export const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
export const WORK_DAY_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

export function getTodayDateISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentPeriod(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getCurrentTimeHHMM(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getIndonesianDayName(date: Date = new Date()): string {
  return INDONESIAN_DAYS[date.getDay()];
}

export function formatDateID(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dt);
}

export function formatPeriodID(period: string): string {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period;
  const [y, m] = period.split('-').map(Number);
  const dt = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(dt);
}

export function calculateDaysBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(90, diff));
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function determineCheckInStatus(
  checkInTime: string,
  scheduleStartTime: string,
  lateToleranceMinutes: number
): AttendanceStatus {
  const actual = timeToMinutes(checkInTime);
  const threshold = timeToMinutes(scheduleStartTime) + lateToleranceMinutes;
  return actual > threshold ? 'Terlambat' : 'Tepat Waktu';
}

export function calculateWorkMinutes(checkInTime: string, checkOutTime: string): number {
  if (!checkInTime || !checkOutTime) return 0;
  const diff = timeToMinutes(checkOutTime) - timeToMinutes(checkInTime);
  return Math.max(0, Math.min(1440, diff));
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}j ${mins}m`;
}

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleaned.slice(0, 64) || `id_${Date.now()}`;
}

export function clampStr(val: string, maxLen: number): string {
  return (val || '').trim().slice(0, maxLen);
}

export function compressImageToDataUrl(
  source: HTMLVideoElement | HTMLImageElement,
  maxWidth = 480,
  quality = 0.72
): string {
  const canvas = document.createElement('canvas');
  const srcWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const srcHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  const safeW = srcWidth || 480;
  const safeH = srcHeight || 480;
  const ratio = Math.min(1, maxWidth / safeW);
  canvas.width = Math.round(safeW * ratio);
  canvas.height = Math.round(safeH * ratio);

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (source instanceof HTMLVideoElement) {
    // Mirror selfie capture naturally
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  // Stamp subtle timestamp watermark in bottom-left corner of selfie for verification
  if (source instanceof HTMLVideoElement) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  const now = new Date();
  const stamp = `${getTodayDateISO(now)} ${now.toTimeString().slice(0, 8)}`;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(8, canvas.height - 28, 168, 20);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '11px monospace';
  ctx.fillText(stamp, 14, canvas.height - 14);

  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  if (dataUrl.length > 300000) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.5);
  }
  return dataUrl;
}
