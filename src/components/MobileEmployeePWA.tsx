import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Home,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react';
import {
  Attendance,
  Employee,
  LeaveRequest,
  LeaveType,
  MobileTab,
  Payroll,
  Position,
  WorkSchedule,
} from '../types/hrm';
import {
  calculateDaysBetween,
  formatDateID,
  formatDuration,
  formatPeriodID,
  formatRupiah,
  getCurrentPeriod,
  getIndonesianDayName,
  getTodayDateISO,
} from '../lib/utils';
import {
  deleteLeaveRequest,
  submitLeaveRequest,
  submitSelfieCheckIn,
  submitSelfieCheckOut,
  updateEmployeePersonalContact,
} from '../services/hrmService';
import { SelfieCameraModal } from './SelfieCameraModal';
import { PWAInstallButton } from './PWAInstallBanner';

interface MobileEmployeePWAProps {
  employee: Employee;
  positions: Position[];
  schedule: WorkSchedule;
  attendances: Attendance[];
  leaveRequests: LeaveRequest[];
  payrolls: Payroll[];
  authUid: string;
  canSwitchToAdmin: boolean;
  onSwitchToAdmin: () => void;
  onLogout: () => Promise<void>;
}

const LEAVE_TYPES: LeaveType[] = ['Cuti Tahunan', 'Sakit', 'Izin Khusus', 'Cuti Melahirkan'];

export const MobileEmployeePWA: React.FC<MobileEmployeePWAProps> = ({
  employee,
  positions,
  schedule,
  attendances,
  leaveRequests,
  payrolls,
  authUid,
  canSwitchToAdmin,
  onSwitchToAdmin,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('beranda');
  const [now, setNow] = useState<Date>(() => new Date());
  const [cameraMode, setCameraMode] = useState<'checkin' | 'checkout' | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<{ src: string; title: string } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => getCurrentPeriod());

  // Cuti Modal Form State
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('Cuti Tahunan');
  const [startDate, setStartDate] = useState<string>(() => getTodayDateISO());
  const [endDate, setEndDate] = useState<string>(() => getTodayDateISO());
  const [reason, setReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveFeedback, setLeaveFeedback] = useState<string | null>(null);

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false);
  const [phoneInput, setPhoneInput] = useState(employee.phone);
  const [addressInput, setAddressInput] = useState(employee.address);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setPhoneInput(employee.phone);
    setAddressInput(employee.address);
  }, [employee.phone, employee.address]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const todayISO = getTodayDateISO(now);
  const todayDayName = getIndonesianDayName(now);
  const isWorkDayToday = schedule.workDays.includes(todayDayName);

  const employeePosition = useMemo(
    () => positions.find((p) => p.id === employee.positionId),
    [positions, employee.positionId]
  );

  const effectiveDailyRate =
    employee.dailyRateOverride > 0
      ? employee.dailyRateOverride
      : employeePosition?.dailyRate ?? 0;

  const myAttendances = useMemo(() => {
    return attendances
      .filter((a) => a.employeeId === employee.id || a.employeeEmail === employee.email)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendances, employee.id, employee.email]);

  const todayAttendance = useMemo(
    () => myAttendances.find((a) => a.date === todayISO),
    [myAttendances, todayISO]
  );

  const myLeaves = useMemo(() => {
    return leaveRequests
      .filter((l) => l.employeeId === employee.id || l.employeeEmail === employee.email)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [leaveRequests, employee.id, employee.email]);

  const myPayrolls = useMemo(() => {
    return payrolls
      .filter((p) => p.employeeId === employee.id || p.employeeEmail === employee.email)
      .sort((a, b) => b.period.localeCompare(a.period));
  }, [payrolls, employee.id, employee.email]);

  const periodStats = useMemo(() => {
    const monthAttendances = myAttendances.filter((a) => a.date.startsWith(selectedPeriod));
    const presentDays = monthAttendances.length;
    const lateDays = monthAttendances.filter((a) => a.status === 'Terlambat').length;
    const onTimeDays = presentDays - lateDays;
    const totalMinutes = monthAttendances.reduce((acc, a) => acc + (a.workMinutes || 0), 0);
    const estimatedEarnings = monthAttendances.reduce(
      (acc, a) => acc + (a.dailyWageApplied || effectiveDailyRate),
      0
    );
    const approvedLeaveDays = myLeaves
      .filter((l) => l.status === 'Disetujui' && l.startDate.startsWith(selectedPeriod))
      .reduce((acc, l) => acc + l.totalDays, 0);
    const officialPayroll = myPayrolls.find((p) => p.period === selectedPeriod);

    return {
      monthAttendances,
      presentDays,
      lateDays,
      onTimeDays,
      totalMinutes,
      estimatedEarnings,
      approvedLeaveDays,
      officialPayroll,
    };
  }, [myAttendances, myLeaves, myPayrolls, selectedPeriod, effectiveDailyRate]);

  const handleConfirmSelfie = async (data: {
    photoDataUrl: string;
    timeHHMM: string;
    note: string;
  }) => {
    if (cameraMode === 'checkin') {
      await submitSelfieCheckIn({
        employee,
        authUid,
        date: todayISO,
        checkInTime: data.timeHHMM,
        checkInPhoto: data.photoDataUrl,
        checkInNote: data.note,
        schedule,
        dailyWageApplied: effectiveDailyRate,
      });
    } else if (cameraMode === 'checkout' && todayAttendance) {
      await submitSelfieCheckOut({
        attendance: todayAttendance,
        checkOutTime: data.timeHHMM,
        checkOutPhoto: data.photoDataUrl,
        checkOutNote: data.note,
      });
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 3) {
      setLeaveFeedback('Mohon isi alasan cuti minimal 3 karakter.');
      return;
    }
    const safeEnd = endDate < startDate ? startDate : endDate;
    const totalDays = calculateDaysBetween(startDate, safeEnd);
    setLeaveSubmitting(true);
    setLeaveFeedback(null);
    try {
      await submitLeaveRequest({
        employee,
        authUid,
        leaveType,
        startDate,
        endDate: safeEnd,
        totalDays,
        reason,
      });
      setReason('');
      setShowLeaveForm(false);
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateEmployeePersonalContact(employee.id, authUid, phoneInput, addressInput);
      setEditingProfile(false);
    } finally {
      setSavingProfile(false);
    }
  };

  const navItems: { id: MobileTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'presensi', label: 'Presensi', icon: Camera },
    { id: 'cuti', label: 'Cuti', icon: CalendarDays },
    { id: 'laporan', label: 'Laporan', icon: BarChart3 },
    { id: 'profil', label: 'Profil', icon: UserIcon },
  ];

  const liveClockStr = now.toTimeString().slice(0, 8);
  const fullDateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  const renderCheckInActionCard = () => {
    const hasCheckedIn = Boolean(todayAttendance?.checkInTime);
    const hasCheckedOut = Boolean(todayAttendance?.checkOutTime);

    return (
      <div className="rounded-2xl bg-slate-900 p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-300">{fullDateLabel}</p>
            <p className="mt-0.5 font-mono text-2xl font-bold tracking-tight tabular-nums">
              {liveClockStr}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-emerald-400">
              {isWorkDayToday ? schedule.shiftName : 'Hari Libur Kerja'}
            </p>
            <p className="font-mono text-slate-300 tabular-nums">
              {schedule.startTime} – {schedule.endTime}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
          <div className="rounded-xl bg-white/10 px-3 py-2.5">
            <p className="text-slate-300">Check-In</p>
            <p className="mt-0.5 font-mono text-base font-bold tabular-nums">
              {todayAttendance?.checkInTime || '--:--'}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2.5">
            <p className="text-slate-300">Check-Out</p>
            <p className="mt-0.5 font-mono text-base font-bold tabular-nums">
              {todayAttendance?.checkOutTime || '--:--'}
            </p>
          </div>
        </div>

        <div className="mt-4">
          {!hasCheckedIn ? (
            <button
              type="button"
              onClick={() => setCameraMode('checkin')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 active:scale-[0.99] transition-transform min-h-[48px]"
            >
              <Camera className="h-4 w-4" />
              <span>Check-In Selfie Sekarang</span>
            </button>
          ) : !hasCheckedOut ? (
            <button
              type="button"
              onClick={() => setCameraMode('checkout')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 active:scale-[0.99] transition-transform min-h-[48px]"
            >
              <Camera className="h-4 w-4" />
              <span>Check-Out Selfie Pulang</span>
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-xs font-semibold text-emerald-300 min-h-[48px]">
              <CheckCircle2 className="h-4 w-4" />
              <span>Presensi Hari Ini Selesai ({formatDuration(todayAttendance?.workMinutes || 0)})</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const phoneContent = (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      {/* Compact Mobile Top Bar (<= 54px) */}
      <header className="sticky top-0 z-20 flex h-[54px] shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={employee.avatarUrl || '/src/assets/images/avatar_staff_member_1795494861208.jpg'}
            alt={employee.fullName}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate leading-tight">
              {employee.fullName}
            </p>
            <p className="text-[11px] text-slate-500 truncate leading-tight">
              {employee.positionTitle} · {employee.nik}
            </p>
          </div>
        </div>
        {canSwitchToAdmin && (
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="lg:hidden inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Backoffice</span>
          </button>
        )}
      </header>

      {/* Scrollable Mobile Body */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        {activeTab === 'beranda' && (
          <>
            {renderCheckInActionCard()}

            {/* 2-Column Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <p className="text-xs text-slate-500">Hadir Bulan Ini</p>
                <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  {periodStats.presentDays} <span className="text-xs font-normal text-slate-500">hari</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {periodStats.onTimeDays} tepat · {periodStats.lateDays} telat
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <p className="text-xs text-slate-500">Estimasi Gaji</p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums truncate">
                  {formatRupiah(periodStats.estimatedEarnings)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums truncate">
                  {formatRupiah(effectiveDailyRate)}/hari
                </p>
              </div>
            </div>

            {/* Today's Selfie Verification Thumbnails */}
            {todayAttendance && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Bukti Selfie Hari Ini</h3>
                  <span className="text-xs font-semibold text-emerald-700">
                    {todayAttendance.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setZoomPhoto({
                        src: todayAttendance.checkInPhoto,
                        title: `Check-In · ${todayAttendance.checkInTime}`,
                      })
                    }
                    className="text-left rounded-xl border border-slate-200 overflow-hidden bg-slate-50"
                  >
                    <img
                      src={todayAttendance.checkInPhoto}
                      alt="Selfie Check-In"
                      className="h-28 w-full object-cover"
                    />
                    <div className="p-2">
                      <p className="text-[11px] font-semibold text-slate-900">Check-In</p>
                      <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                        {todayAttendance.checkInTime}
                      </p>
                    </div>
                  </button>

                  {todayAttendance.checkOutPhoto ? (
                    <button
                      type="button"
                      onClick={() =>
                        setZoomPhoto({
                          src: todayAttendance.checkOutPhoto,
                          title: `Check-Out · ${todayAttendance.checkOutTime}`,
                        })
                      }
                      className="text-left rounded-xl border border-slate-200 overflow-hidden bg-slate-50"
                    >
                      <img
                        src={todayAttendance.checkOutPhoto}
                        alt="Selfie Check-Out"
                        className="h-28 w-full object-cover"
                      />
                      <div className="p-2">
                        <p className="text-[11px] font-semibold text-slate-900">Check-Out</p>
                        <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                          {todayAttendance.checkOutTime}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
                      <Clock className="h-5 w-5 text-slate-400" />
                      <p className="mt-1 text-[11px] text-slate-500">Belum Check-Out</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Schedule & Quick Leave Status */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Jadwal Kerja Aktif</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('cuti')}
                  className="text-xs font-semibold text-emerald-700"
                >
                  Ajukan Cuti
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{schedule.officeLocation}</span>
              </div>
              <p className="text-xs text-slate-500">
                {schedule.workDays.join(', ')} · Toleransi {schedule.lateToleranceMinutes} menit
              </p>
            </div>
          </>
        )}

        {activeTab === 'presensi' && (
          <>
            {renderCheckInActionCard()}

            <div className="flex items-center justify-between pt-1">
              <h3 className="text-sm font-bold text-slate-900">Riwayat Presensi Selfie</h3>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700"
              />
            </div>

            {periodStats.monthAttendances.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <Camera className="mx-auto h-7 w-7 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-800">Belum Ada Data Presensi</p>
                <p className="mt-1 text-xs text-slate-500">
                  Lakukan Check-In Selfie di atas untuk mencatat kehadiran periode {formatPeriodID(selectedPeriod)}.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {periodStats.monthAttendances.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{formatDateID(item.date)}</p>
                        <p className="text-xs text-slate-500">
                          {item.status} · {formatDuration(item.workMinutes)}
                        </p>
                      </div>
                      <p className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
                        +{formatRupiah(item.dailyWageApplied || effectiveDailyRate)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomPhoto({
                            src: item.checkInPhoto,
                            title: `Check-In ${formatDateID(item.date)} · ${item.checkInTime}`,
                          })
                        }
                        className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2 text-left hover:bg-slate-100"
                      >
                        <img
                          src={item.checkInPhoto}
                          alt="Selfie Masuk"
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-500">Masuk</p>
                          <p className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                            {item.checkInTime}
                          </p>
                        </div>
                      </button>

                      {item.checkOutPhoto ? (
                        <button
                          type="button"
                          onClick={() =>
                            setZoomPhoto({
                              src: item.checkOutPhoto,
                              title: `Check-Out ${formatDateID(item.date)} · ${item.checkOutTime}`,
                            })
                          }
                          className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2 text-left hover:bg-slate-100"
                        >
                          <img
                            src={item.checkOutPhoto}
                            alt="Selfie Pulang"
                            className="h-10 w-10 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500">Pulang</p>
                            <p className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                              {item.checkOutTime}
                            </p>
                          </div>
                        </button>
                      ) : (
                        <div className="flex items-center justify-center rounded-xl bg-slate-50 p-2 text-[11px] text-slate-400">
                          Belum Check-Out
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'cuti' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Pengajuan Cuti</h2>
                <p className="text-xs text-slate-500">Sinkron real-time dengan persetujuan HR</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveForm(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 min-h-[44px]"
              >
                <Plus className="h-4 w-4" />
                <span>Ajukan Cuti</span>
              </button>
            </div>

            {myLeaves.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <CalendarDays className="mx-auto h-7 w-7 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-800">Belum Ada Pengajuan Cuti</p>
                <p className="mt-1 text-xs text-slate-500">
                  Ketuk tombol Ajukan Cuti untuk mengirim permohonan cuti atau izin.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myLeaves.map((leave) => {
                  const statusColor =
                    leave.status === 'Disetujui'
                      ? 'text-emerald-700'
                      : leave.status === 'Ditolak'
                      ? 'text-rose-700'
                      : 'text-amber-700';

                  return (
                    <div
                      key={leave.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{leave.leaveType}</p>
                          <p className="text-xs text-slate-500 font-mono tabular-nums">
                            {formatDateID(leave.startDate)} – {formatDateID(leave.endDate)} · {leave.totalDays} hari
                          </p>
                        </div>
                        <span className={`text-xs font-bold ${statusColor}`}>{leave.status}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{leave.reason}</p>
                      {leave.adminNote && (
                        <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">Catatan HR:</span> {leave.adminNote}
                        </div>
                      )}
                      {leave.status === 'Menunggu' && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => deleteLeaveRequest(leave.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 py-1 px-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Batalkan Pengajuan</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'laporan' && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Laporan & Upah</h2>
                <p className="text-xs text-slate-500">Perhitungan gaji berbasis hari masuk</p>
              </div>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-mono text-slate-700"
              />
            </div>

            <div className="rounded-2xl bg-slate-900 p-4 text-white space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Periode {formatPeriodID(selectedPeriod)}</span>
                <span>
                  {periodStats.officialPayroll ? periodStats.officialPayroll.status : 'Estimasi Berjalan'}
                </span>
              </div>
              <p className="font-mono text-2xl font-bold tabular-nums">
                {formatRupiah(
                  periodStats.officialPayroll
                    ? periodStats.officialPayroll.netPay
                    : periodStats.estimatedEarnings
                )}
              </p>
              <div className="pt-2 border-t border-white/10 text-xs text-slate-300 flex items-center justify-between">
                <span>Tarif Gaji Harian</span>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {formatRupiah(effectiveDailyRate)} / hari
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
              <div className="flex items-center justify-between px-4 py-3 text-xs">
                <span className="text-slate-600">Total Hari Hadir</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {periodStats.presentDays} hari
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-xs">
                <span className="text-slate-600">Tepat Waktu / Terlambat</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {periodStats.onTimeDays} / {periodStats.lateDays} hari
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-xs">
                <span className="text-slate-600">Cuti Disetujui</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {periodStats.approvedLeaveDays} hari
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-xs">
                <span className="text-slate-600">Akumulasi Jam Kerja</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatDuration(periodStats.totalMinutes)}
                </span>
              </div>
              {periodStats.officialPayroll && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 text-xs">
                    <span className="text-slate-600">Bonus</span>
                    <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                      +{formatRupiah(periodStats.officialPayroll.bonus)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 text-xs">
                    <span className="text-slate-600">Potongan</span>
                    <span className="font-mono font-semibold text-rose-700 tabular-nums">
                      -{formatRupiah(periodStats.officialPayroll.deduction)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'profil' && (
          <>
            {/* Profile Hero Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3.5">
              <img
                src={employee.avatarUrl || '/src/assets/images/avatar_staff_member_1795494861208.jpg'}
                alt={employee.fullName}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-2xl object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-bold text-slate-900 truncate">
                  {employee.fullName}
                </h2>
                <p className="text-xs text-slate-600 truncate">
                  {employee.positionTitle} · {employee.department}
                </p>
                <p className="mt-0.5 text-[11px] font-mono text-slate-500">
                  NIK: {employee.nik} · Status: {employee.status}
                </p>
              </div>
            </div>

            {/* Biodata Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Biodata Karyawan</h3>
                <button
                  type="button"
                  onClick={() => setEditingProfile(!editingProfile)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>{editingProfile ? 'Batal' : 'Ubah Kontak'}</span>
                </button>
              </div>

              {editingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">No. Telepon</label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Domisili</label>
                    <textarea
                      rows={2}
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 min-h-[44px]"
                  >
                    {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Kontak'}
                  </button>
                </form>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4 py-1 border-b border-slate-100">
                    <span className="text-slate-500">Email</span>
                    <span className="font-medium text-slate-900 text-right truncate">{employee.email}</span>
                  </div>
                  <div className="flex justify-between gap-4 py-1 border-b border-slate-100">
                    <span className="text-slate-500">No. Telepon</span>
                    <span className="font-mono text-slate-900 text-right">{employee.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between gap-4 py-1 border-b border-slate-100">
                    <span className="text-slate-500">Bergabung</span>
                    <span className="font-mono text-slate-900 text-right">{formatDateID(employee.joinDate)}</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-500 block">Alamat</span>
                    <span className="text-slate-900">{employee.address || '-'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Daily Wage & Payroll History Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  <span>Informasi Gaji Harian</span>
                </h3>
                <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                  {formatRupiah(effectiveDailyRate)}/hari
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gaji dihitung otomatis setiap hari kehadiran tercatat melalui Check-In Selfie.
              </p>

              {myPayrolls.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-700">Riwayat Slip Gaji</p>
                  {myPayrolls.map((slip) => (
                    <div
                      key={slip.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{formatPeriodID(slip.period)}</p>
                        <p className="text-slate-500 font-mono tabular-nums">
                          {slip.presentDays} hari · {slip.status}
                        </p>
                      </div>
                      <p className="font-mono font-bold text-slate-900 tabular-nums">
                        {formatRupiah(slip.netPay)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Slip gaji resmi akan tampil di sini setelah diproses HR.</span>
                </div>
              )}
            </div>

            <PWAInstallButton variant="card" />

            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 min-h-[48px]"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar dari Akun</span>
            </button>
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation (Mobile App Tab Bar) */}
      <nav className="sticky bottom-0 z-20 grid grid-cols-5 items-center border-t border-slate-200 bg-white/95 backdrop-blur-md h-16 pb-safe shrink-0">
        {navItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
                isActive ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : ''}`} />
              <span className="mt-1 text-[10px] tracking-tight whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop Top Switcher Bar when Admin views Mobile PWA */}
      <div className="hidden lg:block max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Smartphone Preview Container */}
          <div className="col-span-5 flex justify-center">
            <div className="w-[390px] h-[780px] rounded-[44px] border-[10px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
              <div className="h-6 bg-slate-900 flex items-center justify-center shrink-0">
                <div className="h-3.5 w-24 rounded-full bg-slate-800" />
              </div>
              <div className="flex-1 overflow-hidden rounded-t-[26px] rounded-b-[32px] bg-slate-50 flex flex-col">
                {phoneContent}
              </div>
            </div>
          </div>

          {/* Desktop Companion Context Panel */}
          <div className="col-span-7 space-y-6 pt-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-700">Mobile PWA Karyawan</p>
                  <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
                    Tampilan Aplikasi HP Karyawan
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-600">
                    Setiap aksi Check-In Selfie, Check-Out Selfie, dan Pengajuan Cuti langsung tersimpan ke Firestore dan tampil secara real-time di Panel Backoffice.
                  </p>
                </div>
                {canSwitchToAdmin && (
                  <button
                    type="button"
                    onClick={onSwitchToAdmin}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    <span>Panel Backoffice</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500">Tarif Gaji Harian</p>
                  <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                    {formatRupiah(effectiveDailyRate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Hadir Periode Ini</p>
                  <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                    {periodStats.presentDays} hari
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Estimasi Pendapatan</p>
                  <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
                    {formatRupiah(periodStats.estimatedEarnings)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
              <h2 className="font-display text-base font-bold text-slate-900">
                Jadwal & Ketentuan Presensi
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Shift Aktif</p>
                  <p className="font-semibold text-slate-900">{schedule.shiftName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Jam Masuk & Pulang</p>
                  <p className="font-mono font-semibold text-slate-900 tabular-nums">
                    {schedule.startTime} – {schedule.endTime} WIB
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Hari Kerja</p>
                  <p className="text-slate-900">{schedule.workDays.join(', ')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Lokasi Kantor</p>
                  <p className="text-slate-900">{schedule.officeLocation}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <p className="text-sm font-bold text-slate-900">Akses dari Smartphone</p>
                <p className="text-xs text-slate-500">
                  Buka URL aplikasi ini di Chrome/Safari HP lalu pasang ke layar utama.
                </p>
              </div>
              <PWAInstallButton variant="compact" />
            </div>
          </div>
        </div>
      </div>

      {/* Native Full-Screen Mobile Viewport on Phones & Tablets (< lg) */}
      <div className="lg:hidden h-dvh flex flex-col overflow-hidden">
        {phoneContent}
      </div>

      {/* Selfie Check-In / Check-Out Camera Modal */}
      {cameraMode && (
        <SelfieCameraModal
          mode={cameraMode}
          employeeName={employee.fullName}
          schedule={schedule}
          onClose={() => setCameraMode(null)}
          onConfirm={handleConfirmSelfie}
        />
      )}

      {/* Leave Request Modal */}
      {showLeaveForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white border border-slate-200 p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display text-lg font-bold text-slate-900">Ajukan Cuti / Izin</h3>
              <button
                type="button"
                onClick={() => setShowLeaveForm(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitLeave} className="mt-4 space-y-4 pb-safe">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Cuti</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none min-h-[44px]"
                >
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt} value={lt}>{lt}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate < e.target.value) setEndDate(e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono focus:border-slate-900 focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono focus:border-slate-900 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Total durasi: <strong className="text-slate-900 font-mono">{calculateDaysBetween(startDate, endDate)} hari</strong>
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Pengajuan</label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan keperluan cuti atau izin Anda..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              {leaveFeedback && (
                <p className="text-xs text-rose-600 font-medium">{leaveFeedback}</p>
              )}
              <button
                type="submit"
                disabled={leaveSubmitting}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 min-h-[48px]"
              >
                {leaveSubmitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Cuti'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Selfie Photo Zoom Modal */}
      {zoomPhoto && (
        <div
          onClick={() => setZoomPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-900">{zoomPhoto.title}</p>
              <button
                type="button"
                onClick={() => setZoomPhoto(null)}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img src={zoomPhoto.src} alt={zoomPhoto.title} className="w-full aspect-square object-cover" />
          </div>
        </div>
      )}
    </div>
  );
};
