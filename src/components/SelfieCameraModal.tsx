import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, RefreshCw, Upload, X } from 'lucide-react';
import {
  compressImageToDataUrl,
  determineCheckInStatus,
  getCurrentTimeHHMM,
} from '../lib/utils';
import { WorkSchedule } from '../types/hrm';

interface SelfieCameraModalProps {
  mode: 'checkin' | 'checkout';
  employeeName: string;
  schedule: WorkSchedule;
  onClose: () => void;
  onConfirm: (data: { photoDataUrl: string; timeHHMM: string; note: string }) => Promise<void>;
}

export const SelfieCameraModal: React.FC<SelfieCameraModalProps> = ({
  mode,
  employeeName,
  schedule,
  onClose,
  onConfirm,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraStatus, setCameraStatus] = useState<'initializing' | 'ready' | 'unavailable'>('initializing');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [capturedTime, setCapturedTime] = useState<string>(getCurrentTimeHHMM());
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [liveClock, setLiveClock] = useState<string>(() => new Date().toTimeString().slice(0, 8));

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date().toTimeString().slice(0, 8));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraStatus('initializing');
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('unavailable');
      setCameraError('Peramban tidak mendukung akses kamera langsung. Gunakan tombol unggah kamera perangkat.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStatus('ready');
    } catch {
      setCameraStatus('unavailable');
      setCameraError('Izin kamera belum aktif atau kamera tidak terdeteksi. Anda dapat mengambil foto selfie melalui tombol Kamera Perangkat di bawah.');
    }
  };

  useEffect(() => {
    if (!capturedPhoto) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [capturedPhoto]);

  const handleCaptureFromVideo = () => {
    if (!videoRef.current) return;
    const dataUrl = compressImageToDataUrl(videoRef.current, 480, 0.72);
    if (dataUrl) {
      setCapturedTime(getCurrentTimeHHMM());
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  };

  const handleFileFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const compressed = compressImageToDataUrl(img, 480, 0.72);
        setCapturedTime(getCurrentTimeHHMM());
        setCapturedPhoto(compressed);
        stopCamera();
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedPhoto('');
  };

  const handleConfirmSubmit = async () => {
    if (!capturedPhoto) return;
    setSubmitting(true);
    try {
      await onConfirm({
        photoDataUrl: capturedPhoto,
        timeHHMM: capturedTime,
        note,
      });
      stopCamera();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const predictedCheckInStatus = determineCheckInStatus(
    capturedTime,
    schedule.startTime,
    schedule.lateToleranceMinutes
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-emerald-700">
              {mode === 'checkin' ? 'Presensi Masuk' : 'Presensi Pulang'}
            </p>
            <h3 className="font-display text-lg font-bold text-slate-900">
              {mode === 'checkin' ? 'Check-In Selfie' : 'Check-Out Selfie'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            aria-label="Tutup kamera"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Live Info Strip */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{employeeName}</p>
              <p className="text-slate-500 truncate">
                {schedule.shiftName} · {schedule.startTime}–{schedule.endTime}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">{liveClock}</p>
              {mode === 'checkin' && (
                <p
                  className={`text-[11px] font-semibold ${
                    predictedCheckInStatus === 'Tepat Waktu' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {predictedCheckInStatus}
                </p>
              )}
            </div>
          </div>

          {/* Camera Viewfinder / Photo Preview */}
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-900 border border-slate-200 flex items-center justify-center">
            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt="Hasil foto selfie"
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`h-full w-full object-cover scale-x-[-1] ${
                    cameraStatus === 'ready' ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                {cameraStatus === 'initializing' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                    <Camera className="h-8 w-8 mb-2 text-emerald-400" />
                    <p className="text-sm font-medium">Menyiapkan kamera depan...</p>
                  </div>
                )}
                {cameraStatus === 'unavailable' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center space-y-3">
                    <Camera className="h-9 w-9 text-slate-400" />
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 min-h-[44px]"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Buka Kamera / Unggah Selfie</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileFallback}
            className="hidden"
          />

          {capturedPhoto && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Lokasi / Aktivitas (Opsional)
              </label>
              <input
                type="text"
                maxLength={180}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  mode === 'checkin'
                    ? 'Contoh: Hadir di kantor pusat lantai 12'
                    : 'Contoh: Pekerjaan harian selesai'
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none min-h-[44px]"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3 pb-safe">
          {!capturedPhoto ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[48px] shrink-0"
              >
                <Upload className="h-4 w-4" />
                <span>Kamera File</span>
              </button>
              <button
                type="button"
                disabled={cameraStatus !== 'ready'}
                onClick={handleCaptureFromVideo}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 min-h-[48px]"
              >
                <Camera className="h-4 w-4" />
                <span>Ambil Foto Selfie</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={handleRetake}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 min-h-[48px]"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Ulangi</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmSubmit}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 min-h-[48px]"
              >
                <Check className="h-4 w-4" />
                <span>
                  {submitting
                    ? 'Menyimpan...'
                    : mode === 'checkin'
                    ? 'Konfirmasi Check-In'
                    : 'Konfirmasi Check-Out'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
