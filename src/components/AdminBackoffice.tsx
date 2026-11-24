import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  CalendarCheck,
  CalendarClock,
  Camera,
  Check,
  Download,
  Edit3,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  AdminTab,
  Attendance,
  Employee,
  EmployeeStatus,
  LeaveRequest,
  LeaveStatus,
  Payroll,
  Position,
  UserRole,
  WorkSchedule,
} from '../types/hrm';
import {
  formatDateID,
  formatDuration,
  formatPeriodID,
  formatRupiah,
  getCurrentPeriod,
  getTodayDateISO,
  WORK_DAY_OPTIONS,
} from '../lib/utils';
import {
  deleteAttendance,
  deleteEmployee,
  deletePosition,
  markPayrollPaid,
  reviewLeaveRequest,
  saveWorkSchedule,
  upsertEmployee,
  upsertPayrollRun,
  upsertPosition,
} from '../services/hrmService';
import { PWAInstallButton } from './PWAInstallBanner';

interface AdminBackofficeProps {
  adminName: string;
  adminEmail: string;
  positions: Position[];
  employees: Employee[];
  schedule: WorkSchedule;
  attendances: Attendance[];
  leaveRequests: LeaveRequest[];
  payrolls: Payroll[];
  onSwitchToMobile: () => void;
  onLogout: () => Promise<void>;
}

export const AdminBackoffice: React.FC<AdminBackofficeProps> = ({
  adminName,
  adminEmail,
  positions,
  employees,
  schedule,
  attendances,
  leaveRequests,
  payrolls,
  onSwitchToMobile,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sub-tabs
  const [empSubTab, setEmpSubTab] = useState<'employees' | 'positions'>('employees');
  const [attSubTab, setAttSubTab] = useState<'attendances' | 'leaves'>('attendances');

  // Filters
  const [empSearch, setEmpSearch] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState<'Semua' | EmployeeStatus>('Semua');
  const [attDateFilter, setAttDateFilter] = useState<string>('');
  const [attMonthFilter, setAttMonthFilter] = useState<string>(() => getCurrentPeriod());
  const [attSearch, setAttSearch] = useState('');
  const [leaveFilter, setLeaveFilter] = useState<'Semua' | LeaveStatus>('Semua');
  const [payrollPeriod, setPayrollPeriod] = useState<string>(() => getCurrentPeriod());

  // Photo Inspection Modal
  const [inspectPhoto, setInspectPhoto] = useState<{ src: string; title: string; subtitle: string } | null>(null);

  // Employee Modal
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    nik: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    positionId: '',
    dailyRateOverride: 0,
    joinDate: getTodayDateISO(),
    status: 'Aktif' as EmployeeStatus,
    role: 'employee' as UserRole,
  });

  // Position Modal
  const [showPosModal, setShowPosModal] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [posForm, setPosForm] = useState({
    title: '',
    department: '',
    dailyRate: 200000,
    description: '',
  });

  // Schedule Form State
  const [schedForm, setSchedForm] = useState<Omit<WorkSchedule, 'updatedAt'>>({
    id: schedule.id || 'default',
    shiftName: schedule.shiftName,
    officeLocation: schedule.officeLocation,
    workDays: schedule.workDays,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    lateToleranceMinutes: schedule.lateToleranceMinutes,
  });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSavedMsg, setScheduleSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setSchedForm({
      id: schedule.id || 'default',
      shiftName: schedule.shiftName,
      officeLocation: schedule.officeLocation,
      workDays: schedule.workDays,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      lateToleranceMinutes: schedule.lateToleranceMinutes,
    });
  }, [schedule]);

  // Leave Review Modal
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  // Payroll Adjustments Map (per employeeId in selected period)
  const [payrollAdj, setPayrollAdj] = useState<Record<string, { bonus: number; deduction: number; notes: string }>>({});
  const [processingPayrollId, setProcessingPayrollId] = useState<string | null>(null);

  const todayISO = getTodayDateISO();

  const positionMap = useMemo(() => {
    const map = new Map<string, Position>();
    positions.forEach((p) => map.set(p.id, p));
    return map;
  }, [positions]);

  const getEmployeeDailyRate = (emp: Employee): number => {
    if (emp.dailyRateOverride > 0) return emp.dailyRateOverride;
    return positionMap.get(emp.positionId)?.dailyRate ?? 0;
  };

  // Computed KPI Metrics
  const kpi = useMemo(() => {
    const activeEmployees = employees.filter((e) => e.status === 'Aktif');
    const todayAttendances = attendances.filter((a) => a.date === todayISO);
    const pendingLeaves = leaveRequests.filter((l) => l.status === 'Menunggu');
    const currentMonth = getCurrentPeriod();
    const monthAttendances = attendances.filter((a) => a.date.startsWith(currentMonth));
    const estimatedMonthlyPayroll = monthAttendances.reduce((acc, att) => {
      const emp = employees.find((e) => e.id === att.employeeId);
      const rate = att.dailyWageApplied || (emp ? getEmployeeDailyRate(emp) : 0);
      return acc + rate;
    }, 0);

    return {
      activeCount: activeEmployees.length,
      totalEmployees: employees.length,
      todayCheckInCount: todayAttendances.length,
      pendingLeaveCount: pendingLeaves.length,
      estimatedMonthlyPayroll,
      todayAttendances,
      pendingLeaves,
    };
  }, [employees, attendances, leaveRequests, todayISO, positionMap]);

  // Filtered Lists
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesStatus = empStatusFilter === 'Semua' || emp.status === empStatusFilter;
      const q = empSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        emp.fullName.toLowerCase().includes(q) ||
        emp.nik.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.positionTitle.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [employees, empStatusFilter, empSearch]);

  const filteredAttendances = useMemo(() => {
    return attendances
      .filter((att) => {
        const matchesDate = attDateFilter
          ? att.date === attDateFilter
          : att.date.startsWith(attMonthFilter);
        const q = attSearch.trim().toLowerCase();
        const matchesQuery =
          !q ||
          att.employeeName.toLowerCase().includes(q) ||
          att.positionTitle.toLowerCase().includes(q);
        return matchesDate && matchesQuery;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.checkInTime.localeCompare(a.checkInTime));
  }, [attendances, attDateFilter, attMonthFilter, attSearch]);

  const filteredLeaves = useMemo(() => {
    return leaveRequests
      .filter((l) => leaveFilter === 'Semua' || l.status === leaveFilter)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [leaveRequests, leaveFilter]);

  // Daily-Rate Payroll Rows
  const payrollRows = useMemo(() => {
    return employees
      .filter((e) => e.status === 'Aktif')
      .map((emp) => {
        const empAtts = attendances.filter(
          (a) => a.employeeId === emp.id && a.date.startsWith(payrollPeriod)
        );
        const presentDays = empAtts.length;
        const lateDays = empAtts.filter((a) => a.status === 'Terlambat').length;
        const approvedLeaveDays = leaveRequests
          .filter(
            (l) =>
              l.employeeId === emp.id &&
              l.status === 'Disetujui' &&
              l.startDate.startsWith(payrollPeriod)
          )
          .reduce((acc, l) => acc + l.totalDays, 0);

        const dailyRate = getEmployeeDailyRate(emp);
        const grossBasePay = presentDays * dailyRate;
        const existingSlip = payrolls.find(
          (p) => p.employeeId === emp.id && p.period === payrollPeriod
        );
        const localAdj = payrollAdj[emp.id];
        const bonus = localAdj ? localAdj.bonus : existingSlip?.bonus ?? 0;
        const deduction = localAdj ? localAdj.deduction : existingSlip?.deduction ?? 0;
        const notes = localAdj ? localAdj.notes : existingSlip?.notes ?? '';
        const netPay = Math.max(0, grossBasePay + bonus - deduction);

        return {
          emp,
          presentDays,
          lateDays,
          approvedLeaveDays,
          dailyRate,
          grossBasePay,
          bonus,
          deduction,
          notes,
          netPay,
          existingSlip,
        };
      });
  }, [employees, attendances, leaveRequests, payrolls, payrollPeriod, payrollAdj, positionMap]);

  const totalPayrollPeriodNet = useMemo(
    () => payrollRows.reduce((acc, row) => acc + row.netPay, 0),
    [payrollRows]
  );

  // Handlers
  const openAddEmployee = () => {
    const firstPos = positions[0];
    setEditingEmp(null);
    setEmpForm({
      nik: `NK-${new Date().getFullYear()}-${String(employees.length + 1).padStart(3, '0')}`,
      fullName: '',
      email: '',
      phone: '',
      address: '',
      positionId: firstPos?.id || '',
      dailyRateOverride: 0,
      joinDate: getTodayDateISO(),
      status: 'Aktif',
      role: 'employee',
    });
    setShowEmpModal(true);
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpForm({
      nik: emp.nik,
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone,
      address: emp.address,
      positionId: emp.positionId,
      dailyRateOverride: emp.dailyRateOverride,
      joinDate: emp.joinDate,
      status: emp.status,
      role: emp.role,
    });
    setShowEmpModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const pos = positionMap.get(empForm.positionId) || positions[0];
    if (!pos) return;
    await upsertEmployee(
      {
        id: editingEmp?.id || `emp_${Date.now()}`,
        authUid: editingEmp?.authUid || '',
        nik: empForm.nik,
        fullName: empForm.fullName,
        email: empForm.email,
        phone: empForm.phone,
        address: empForm.address,
        positionId: pos.id,
        positionTitle: pos.title,
        department: pos.department,
        dailyRateOverride: Number(empForm.dailyRateOverride) || 0,
        joinDate: empForm.joinDate,
        status: empForm.status,
        role: empForm.role,
        avatarUrl: editingEmp?.avatarUrl || '/src/assets/images/avatar_staff_member_1795494861208.jpg',
      },
      !editingEmp
    );
    setShowEmpModal(false);
  };

  const openAddPosition = () => {
    setEditingPos(null);
    setPosForm({ title: '', department: '', dailyRate: 200000, description: '' });
    setShowPosModal(true);
  };

  const openEditPosition = (pos: Position) => {
    setEditingPos(pos);
    setPosForm({
      title: pos.title,
      department: pos.department,
      dailyRate: pos.dailyRate,
      description: pos.description,
    });
    setShowPosModal(true);
  };

  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertPosition(
      {
        id: editingPos?.id || `pos_${Date.now()}`,
        title: posForm.title,
        department: posForm.department,
        dailyRate: Number(posForm.dailyRate) || 0,
        description: posForm.description,
      },
      !editingPos
    );
    setShowPosModal(false);
  };

  const handleToggleWorkDay = (day: string) => {
    setSchedForm((prev) => {
      const exists = prev.workDays.includes(day);
      if (exists && prev.workDays.length === 1) return prev;
      return {
        ...prev,
        workDays: exists
          ? prev.workDays.filter((d) => d !== day)
          : WORK_DAY_OPTIONS.filter((d) => d === day || prev.workDays.includes(d)),
      };
    });
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchedule(true);
    setScheduleSavedMsg(null);
    try {
      await saveWorkSchedule(schedForm);
      setScheduleSavedMsg('Pengaturan hari & jam kerja berhasil disimpan dan disinkronkan ke seluruh perangkat.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleLeaveDecision = async (status: LeaveStatus) => {
    if (!reviewingLeave) return;
    await reviewLeaveRequest({
      leaveId: reviewingLeave.id,
      status,
      adminNote: reviewNote,
      reviewedBy: adminName || adminEmail,
    });
    setReviewingLeave(null);
    setReviewNote('');
  };

  const handleGenerateSlip = async (row: (typeof payrollRows)[number]) => {
    const slipId = `${row.emp.id}_${payrollPeriod}`;
    setProcessingPayrollId(row.emp.id);
    try {
      await upsertPayrollRun(
        {
          id: slipId,
          employeeId: row.emp.id,
          employeeEmail: row.emp.email,
          employeeName: row.emp.fullName,
          positionTitle: row.emp.positionTitle,
          period: payrollPeriod,
          presentDays: row.presentDays,
          lateDays: row.lateDays,
          approvedLeaveDays: row.approvedLeaveDays,
          dailyRate: row.dailyRate,
          grossBasePay: row.grossBasePay,
          bonus: row.bonus,
          deduction: row.deduction,
          netPay: row.netPay,
          status: row.existingSlip?.status || 'Draft',
          notes: row.notes,
          paidAt: row.existingSlip?.paidAt || '',
        },
        !row.existingSlip
      );
    } finally {
      setProcessingPayrollId(null);
    }
  };

  const handleBatchGeneratePayroll = async () => {
    for (const row of payrollRows) {
      await handleGenerateSlip(row);
    }
  };

  const handleExportPayrollCSV = () => {
    const header = ['NIK', 'Nama', 'Jabatan', 'Periode', 'Hari Masuk', 'Tarif Harian', 'Gaji Pokok', 'Bonus', 'Potongan', 'Total Bersih', 'Status'];
    const lines = payrollRows.map((r) => [
      r.emp.nik,
      `"${r.emp.fullName}"`,
      `"${r.emp.positionTitle}"`,
      payrollPeriod,
      r.presentDays,
      r.dailyRate,
      r.grossBasePay,
      r.bonus,
      r.deduction,
      r.netPay,
      r.existingSlip?.status || 'Draft',
    ]);
    const csv = [header.join(','), ...lines.map((l) => l.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-harian-${payrollPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sidebarNav: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'employees', label: 'Karyawan & Jabatan', icon: Users },
    { id: 'schedule', label: 'Hari & Jam Kerja', icon: CalendarClock },
    {
      id: 'attendance',
      label: 'Kehadiran & Cuti',
      icon: CalendarCheck,
      count: kpi.pendingLeaveCount > 0 ? kpi.pendingLeaveCount : undefined,
    },
    { id: 'payroll', label: 'Payroll Harian', icon: Wallet },
  ];

  const currentTabTitle = sidebarNav.find((n) => n.id === activeTab)?.label || 'Ringkasan';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-display font-bold text-sm">
            N
          </div>
          <span className="font-display text-base font-bold tracking-tight text-slate-900">
            NusaKerja HRM
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sidebarNav.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.count !== undefined && (
                  <span className={`font-mono text-xs font-bold tabular-nums ${active ? 'text-emerald-400' : 'text-amber-600'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <button
            type="button"
            onClick={onSwitchToMobile}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 min-h-[44px]"
          >
            <Smartphone className="h-4 w-4 text-emerald-600" />
            <span>Buka Tampilan HP Karyawan</span>
          </button>

          <div className="flex items-center gap-3 pt-1">
            <img
              src="/src/assets/images/avatar_hr_admin_1795494861273.jpg"
              alt={adminName}
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{adminName}</p>
              <p className="text-[11px] text-slate-500 truncate">{adminEmail}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-600"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[80vw] bg-white h-full flex flex-col z-10 border-r border-slate-200">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200">
              <span className="font-display text-base font-bold text-slate-900">NusaKerja HRM</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {sidebarNav.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium min-h-[44px] ${
                      active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </span>
                    {item.count !== undefined && (
                      <span className="font-mono text-xs font-bold">{item.count}</span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={onSwitchToMobile}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white"
              >
                <Smartphone className="h-4 w-4" />
                <span>Tampilan HP Karyawan</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-rose-700"
              >
                <LogOut className="h-4 w-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract (Breadcrumb + Primary Actions) */}
        <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline">Backoffice</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-display font-bold text-slate-900 truncate">{currentTabTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton variant="compact" />
            <button
              type="button"
              onClick={onSwitchToMobile}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Mode HP Karyawan</span>
              <span className="sm:hidden">Mode HP</span>
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* 4-Column KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">Karyawan Aktif</p>
                  <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
                    {kpi.activeCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Dari total {kpi.totalEmployees} terdaftar
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">Hadir Hari Ini</p>
                  <p className="mt-2 font-mono text-3xl font-bold text-emerald-700 tabular-nums">
                    {kpi.todayCheckInCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Jadwal masuk {schedule.startTime} WIB
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">Pengajuan Cuti Menunggu</p>
                  <p className="mt-2 font-mono text-3xl font-bold text-amber-600 tabular-nums">
                    {kpi.pendingLeaveCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Perlu tinjauan manajemen
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">Estimasi Payroll Bulan Ini</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums truncate">
                    {formatRupiah(kpi.estimatedMonthlyPayroll)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Basis gaji harian kehadiran
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Today's Selfie Check-In Stream */}
                <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div>
                      <h2 className="font-display text-base font-bold text-slate-900">
                        Presensi Selfie Hari Ini
                      </h2>
                      <p className="text-xs text-slate-500">{formatDateID(todayISO)} · Pembaruan langsung</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('attendance');
                        setAttSubTab('attendances');
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Lihat Semua
                    </button>
                  </div>

                  {kpi.todayAttendances.length === 0 ? (
                    <div className="p-8 text-center">
                      <Camera className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-700">Belum Ada Check-In Hari Ini</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Foto selfie check-in karyawan dari Mobile PWA akan muncul otomatis di sini.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {kpi.todayAttendances.map((att) => (
                        <div key={att.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                setInspectPhoto({
                                  src: att.checkInPhoto,
                                  title: `${att.employeeName} — Check-In`,
                                  subtitle: `${formatDateID(att.date)} · ${att.checkInTime}`,
                                })
                              }
                              className="shrink-0 rounded-xl overflow-hidden border border-slate-200 hover:opacity-90"
                            >
                              <img
                                src={att.checkInPhoto}
                                alt={att.employeeName}
                                className="h-11 w-11 object-cover"
                              />
                            </button>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{att.employeeName}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {att.positionTitle} · {att.checkInNote || 'Hadir'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                              {att.checkInTime} {att.checkOutTime ? `→ ${att.checkOutTime}` : ''}
                            </p>
                            <p
                              className={`text-xs font-semibold ${
                                att.status === 'Terlambat' ? 'text-amber-600' : 'text-emerald-700'
                              }`}
                            >
                              {att.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Leave Requests */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div>
                      <h2 className="font-display text-base font-bold text-slate-900">
                        Antrean Persetujuan Cuti
                      </h2>
                      <p className="text-xs text-slate-500">Permohonan menunggu keputusan</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('attendance');
                        setAttSubTab('leaves');
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Kelola Cuti
                    </button>
                  </div>

                  {kpi.pendingLeaves.length === 0 ? (
                    <div className="p-8 text-center">
                      <Check className="mx-auto h-8 w-8 text-emerald-500" />
                      <p className="mt-2 text-sm font-semibold text-slate-700">Semua Pengajuan Terproses</p>
                      <p className="mt-1 text-xs text-slate-500">Tidak ada permohonan cuti yang tertunda.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {kpi.pendingLeaves.map((leave) => (
                        <div key={leave.id} className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{leave.employeeName}</p>
                              <p className="text-xs text-slate-500">
                                {leave.leaveType} · {formatDateID(leave.startDate)} ({leave.totalDays} hari)
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingLeave(leave);
                                setReviewNote('');
                              }}
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                            >
                              Tinjau
                            </button>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">{leave.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: EMPLOYEES & POSITIONS */}
          {activeTab === 'employees' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 self-start">
                  <button
                    type="button"
                    onClick={() => setEmpSubTab('employees')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      empSubTab === 'employees'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Data Karyawan ({employees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmpSubTab('positions')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      empSubTab === 'positions'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Data Jabatan & Tarif ({positions.length})
                  </button>
                </div>

                {empSubTab === 'employees' ? (
                  <button
                    type="button"
                    onClick={openAddEmployee}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Tambah Karyawan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openAddPosition}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Tambah Jabatan</span>
                  </button>
                )}
              </div>

              {empSubTab === 'employees' ? (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        placeholder="Cari NIK, nama, email, atau jabatan..."
                        className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 self-start">
                      {(['Semua', 'Aktif', 'Nonaktif'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setEmpStatusFilter(st)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                            empStatusFilter === st
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Karyawan</th>
                          <th className="px-4 py-3">NIK</th>
                          <th className="px-4 py-3">Jabatan & Departemen</th>
                          <th className="px-4 py-3 text-right">Gaji Harian</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={emp.avatarUrl || '/src/assets/images/avatar_staff_member_1795494861208.jpg'}
                                  alt={emp.fullName}
                                  referrerPolicy="no-referrer"
                                  className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
                                />
                                <div>
                                  <p className="font-semibold text-slate-900">{emp.fullName}</p>
                                  <p className="text-slate-500">{emp.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-700 tabular-nums">{emp.nik}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{emp.positionTitle}</p>
                              <p className="text-slate-500">{emp.department}</p>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                              {formatRupiah(getEmployeeDailyRate(emp))}/hari
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`font-semibold ${
                                  emp.status === 'Aktif' ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                {emp.status}
                              </span>
                              <span className="text-slate-400"> · {emp.role === 'admin' ? 'Admin' : 'Staf'}</span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openEditEmployee(emp)}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                title="Edit karyawan"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteEmployee(emp.id)}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                                title="Hapus karyawan"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {positions.map((pos) => {
                    const count = employees.filter((e) => e.positionId === pos.id).length;
                    return (
                      <div
                        key={pos.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-medium text-slate-500">{pos.department}</p>
                            <h3 className="mt-0.5 font-display text-base font-bold text-slate-900">
                              {pos.title}
                            </h3>
                            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                              {pos.description || 'Tidak ada deskripsi tambahan.'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono text-base font-bold text-emerald-700 tabular-nums">
                              {formatRupiah(pos.dailyRate)}
                            </p>
                            <p className="text-[11px] text-slate-500">per hari hadir</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span>{count} karyawan</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditPosition(pos)}
                              className="font-semibold text-slate-700 hover:text-slate-900 px-2 py-1"
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePosition(pos.id)}
                              className="font-semibold text-rose-600 hover:text-rose-800 px-2 py-1"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WORK SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Pengaturan Hari & Jam Kerja Perusahaan
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Perubahan jadwal kerja akan langsung diterapkan ke seluruh aplikasi Mobile PWA karyawan untuk menentukan status Tepat Waktu atau Terlambat.
              </p>

              <form onSubmit={handleSaveSchedule} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Shift</label>
                    <input
                      type="text"
                      required
                      value={schedForm.shiftName}
                      onChange={(e) => setSchedForm({ ...schedForm, shiftName: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lokasi Kantor / Cabang</label>
                    <input
                      type="text"
                      required
                      value={schedForm.officeLocation}
                      onChange={(e) => setSchedForm({ ...schedForm, officeLocation: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Hari Kerja Aktif
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WORK_DAY_OPTIONS.map((day) => {
                      const active = schedForm.workDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleWorkDay(day)}
                          className={`rounded-xl px-3.5 py-2 text-xs font-semibold border transition-colors min-h-[40px] ${
                            active
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jam Masuk</label>
                    <input
                      type="time"
                      required
                      value={schedForm.startTime}
                      onChange={(e) => setSchedForm({ ...schedForm, startTime: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jam Pulang</label>
                    <input
                      type="time"
                      required
                      value={schedForm.endTime}
                      onChange={(e) => setSchedForm({ ...schedForm, endTime: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Toleransi Telat (Menit)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      required
                      value={schedForm.lateToleranceMinutes}
                      onChange={(e) =>
                        setSchedForm({ ...schedForm, lateToleranceMinutes: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {scheduleSavedMsg && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
                    {scheduleSavedMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingSchedule ? 'Menyimpan...' : 'Simpan Pengaturan Jam Kerja'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: ATTENDANCE & LEAVE */}
          {activeTab === 'attendance' && (
            <div className="space-y-5">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70">
                <button
                  type="button"
                  onClick={() => setAttSubTab('attendances')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    attSubTab === 'attendances'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Data Kehadiran Selfie ({filteredAttendances.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAttSubTab('leaves')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    attSubTab === 'leaves'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pengajuan Cuti ({leaveRequests.length})
                </button>
              </div>

              {attSubTab === 'attendances' ? (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={attSearch}
                        onChange={(e) => setAttSearch(e.target.value)}
                        placeholder="Cari nama karyawan..."
                        className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="month"
                        value={attMonthFilter}
                        onChange={(e) => {
                          setAttMonthFilter(e.target.value);
                          setAttDateFilter('');
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-700"
                      />
                      <input
                        type="date"
                        value={attDateFilter}
                        onChange={(e) => setAttDateFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-700"
                      />
                      {attDateFilter && (
                        <button
                          type="button"
                          onClick={() => setAttDateFilter('')}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2"
                        >
                          Reset Tanggal
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Tanggal</th>
                          <th className="px-4 py-3">Karyawan</th>
                          <th className="px-4 py-3">Selfie Check-In</th>
                          <th className="px-4 py-3">Selfie Check-Out</th>
                          <th className="px-4 py-3">Durasi</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Upah Hari</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAttendances.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                              Belum ada catatan presensi pada filter ini.
                            </td>
                          </tr>
                        ) : (
                          filteredAttendances.map((att) => (
                            <tr key={att.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                                {formatDateID(att.date)}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-900">{att.employeeName}</p>
                                <p className="text-slate-500">{att.positionTitle}</p>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInspectPhoto({
                                      src: att.checkInPhoto,
                                      title: `${att.employeeName} — Check-In Selfie`,
                                      subtitle: `${formatDateID(att.date)} · ${att.checkInTime} · ${att.checkInNote || '-'}`,
                                    })
                                  }
                                  className="flex items-center gap-2.5 text-left hover:opacity-80"
                                >
                                  <img
                                    src={att.checkInPhoto}
                                    alt="Check-In"
                                    className="h-9 w-9 rounded-lg object-cover border border-slate-200"
                                  />
                                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                                    {att.checkInTime}
                                  </span>
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                {att.checkOutPhoto ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInspectPhoto({
                                        src: att.checkOutPhoto,
                                        title: `${att.employeeName} — Check-Out Selfie`,
                                        subtitle: `${formatDateID(att.date)} · ${att.checkOutTime} · ${att.checkOutNote || '-'}`,
                                      })
                                    }
                                    className="flex items-center gap-2.5 text-left hover:opacity-80"
                                  >
                                    <img
                                      src={att.checkOutPhoto}
                                      alt="Check-Out"
                                      className="h-9 w-9 rounded-lg object-cover border border-slate-200"
                                    />
                                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                                      {att.checkOutTime}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-slate-400">Belum Check-Out</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-700 tabular-nums">
                                {formatDuration(att.workMinutes)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`font-semibold ${
                                    att.status === 'Terlambat' ? 'text-amber-600' : 'text-emerald-700'
                                  }`}
                                >
                                  {att.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                                {formatRupiah(att.dailyWageApplied)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => deleteAttendance(att.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                  title="Hapus presensi"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100">
                    {(['Semua', 'Menunggu', 'Disetujui', 'Ditolak'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setLeaveFilter(st)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                          leaveFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredLeaves.map((leave) => (
                      <div
                        key={leave.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-display text-sm font-bold text-slate-900">
                              {leave.employeeName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {leave.positionTitle} · {leave.leaveType}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-bold ${
                              leave.status === 'Disetujui'
                                ? 'text-emerald-700'
                                : leave.status === 'Ditolak'
                                ? 'text-rose-700'
                                : 'text-amber-600'
                            }`}
                          >
                            {leave.status}
                          </span>
                        </div>

                        <p className="font-mono text-xs text-slate-700 tabular-nums">
                          {formatDateID(leave.startDate)} – {formatDateID(leave.endDate)} ({leave.totalDays} hari)
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">{leave.reason}</p>

                        {leave.adminNote && (
                          <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                            Catatan: {leave.adminNote}
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingLeave(leave);
                              setReviewNote(leave.adminNote || '');
                            }}
                            className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            {leave.status === 'Menunggu' ? 'Proses Persetujuan' : 'Ubah Keputusan'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DAILY-RATE PAYROLL */}
          {activeTab === 'payroll' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Payroll Model Gaji Harian — {formatPeriodID(payrollPeriod)}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Total gaji dihitung otomatis berdasarkan jumlah hari masuk tercatat dikalikan tarif harian jabatan (Rp/hari).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="month"
                    value={payrollPeriod}
                    onChange={(e) => setPayrollPeriod(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleBatchGeneratePayroll}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Check className="h-4 w-4" />
                    <span>Simpan Semua Slip</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPayrollCSV}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Download className="h-4 w-4" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Karyawan</th>
                        <th className="px-4 py-3 text-right">Tarif/Hari</th>
                        <th className="px-4 py-3 text-right">Masuk</th>
                        <th className="px-4 py-3 text-right">Gaji Pokok</th>
                        <th className="px-4 py-3 text-right">Bonus (Rp)</th>
                        <th className="px-4 py-3 text-right">Potongan (Rp)</th>
                        <th className="px-4 py-3 text-right">Total Gaji</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payrollRows.map((row) => (
                        <tr key={row.emp.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{row.emp.fullName}</p>
                            <p className="text-slate-500">
                              {row.emp.positionTitle} · {row.lateDays} telat · {row.approvedLeaveDays} cuti
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                            {formatRupiah(row.dailyRate)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {row.presentDays} hari
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-900 tabular-nums">
                            {formatRupiah(row.grossBasePay)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step={10000}
                              value={row.bonus}
                              onChange={(e) =>
                                setPayrollAdj((prev) => ({
                                  ...prev,
                                  [row.emp.id]: {
                                    bonus: Math.max(0, Number(e.target.value) || 0),
                                    deduction: prev[row.emp.id]?.deduction ?? row.deduction,
                                    notes: prev[row.emp.id]?.notes ?? row.notes,
                                  },
                                }))
                              }
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right font-mono text-xs tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step={10000}
                              value={row.deduction}
                              onChange={(e) =>
                                setPayrollAdj((prev) => ({
                                  ...prev,
                                  [row.emp.id]: {
                                    bonus: prev[row.emp.id]?.bonus ?? row.bonus,
                                    deduction: Math.max(0, Number(e.target.value) || 0),
                                    notes: prev[row.emp.id]?.notes ?? row.notes,
                                  },
                                }))
                              }
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right font-mono text-xs tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                            {formatRupiah(row.netPay)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-semibold ${
                                row.existingSlip?.status === 'Dibayarkan'
                                  ? 'text-emerald-700'
                                  : row.existingSlip
                                  ? 'text-amber-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {row.existingSlip?.status || 'Belum Disimpan'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                            <button
                              type="button"
                              disabled={processingPayrollId === row.emp.id}
                              onClick={() => handleGenerateSlip(row)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Simpan
                            </button>
                            {row.existingSlip && row.existingSlip.status !== 'Dibayarkan' && (
                              <button
                                type="button"
                                onClick={() => markPayrollPaid(row.existingSlip!.id)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 font-semibold text-white hover:bg-emerald-700"
                              >
                                Bayar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                      <tr>
                        <td colSpan={6} className="px-4 py-3 text-right text-slate-700">
                          Total Beban Payroll {formatPeriodID(payrollPeriod)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-base text-slate-900 tabular-nums">
                          {formatRupiah(totalPayrollPeriodNet)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Add/Edit Employee */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingEmp ? 'Ubah Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button type="button" onClick={() => setShowEmpModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEmployee} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIK</label>
                  <input
                    type="text"
                    required
                    value={empForm.nik}
                    onChange={(e) => setEmpForm({ ...empForm, nik: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Bergabung</label>
                  <input
                    type="date"
                    required
                    value={empForm.joinDate}
                    onChange={(e) => setEmpForm({ ...empForm, joinDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={empForm.fullName}
                  onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Karyawan</label>
                  <input
                    type="email"
                    required
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. Telepon</label>
                  <input
                    type="tel"
                    value={empForm.phone}
                    onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan</label>
                  <select
                    value={empForm.positionId}
                    onChange={(e) => setEmpForm({ ...empForm, positionId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({formatRupiah(p.dailyRate)}/hr)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Override Tarif Harian (0 = ikut jabatan)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={empForm.dailyRateOverride}
                    onChange={(e) => setEmpForm({ ...empForm, dailyRateOverride: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={empForm.status}
                    onChange={(e) => setEmpForm({ ...empForm, status: e.target.value as EmployeeStatus })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hak Akses</label>
                  <select
                    value={empForm.role}
                    onChange={(e) => setEmpForm({ ...empForm, role: e.target.value as UserRole })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="employee">Karyawan</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat</label>
                <textarea
                  rows={2}
                  value={empForm.address}
                  onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Simpan Data Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Position */}
      {showPosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingPos ? 'Ubah Jabatan' : 'Tambah Jabatan Baru'}
              </h3>
              <button type="button" onClick={() => setShowPosModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSavePosition} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Jabatan</label>
                <input
                  type="text"
                  required
                  value={posForm.title}
                  onChange={(e) => setPosForm({ ...posForm, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Departemen</label>
                <input
                  type="text"
                  required
                  value={posForm.department}
                  onChange={(e) => setPosForm({ ...posForm, department: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tarif Gaji Harian (Rp / hari)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={5000}
                  value={posForm.dailyRate}
                  onChange={(e) => setPosForm({ ...posForm, dailyRate: Number(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Tugas</label>
                <textarea
                  rows={2}
                  value={posForm.description}
                  onChange={(e) => setPosForm({ ...posForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPosModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Simpan Jabatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Leave Review */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500">Persetujuan Cuti</p>
                <h3 className="font-display text-base font-bold text-slate-900">
                  {reviewingLeave.employeeName} — {reviewingLeave.leaveType}
                </h3>
              </div>
              <button type="button" onClick={() => setReviewingLeave(null)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-xs space-y-1">
              <p className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatDateID(reviewingLeave.startDate)} – {formatDateID(reviewingLeave.endDate)} ({reviewingLeave.totalDays} hari)
              </p>
              <p className="text-slate-600">{reviewingLeave.reason}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Manajemen (Opsional)</label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Tambahkan catatan keputusan..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleLeaveDecision('Ditolak')}
                className="rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                Tolak Pengajuan
              </button>
              <button
                type="button"
                onClick={() => handleLeaveDecision('Disetujui')}
                className="rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Setujui Cuti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Inspect Selfie Photo */}
      {inspectPhoto && (
        <div
          onClick={() => setInspectPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white overflow-hidden shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-900">{inspectPhoto.title}</p>
                <p className="text-[11px] text-slate-500">{inspectPhoto.subtitle}</p>
              </div>
              <button type="button" onClick={() => setInspectPhoto(null)} className="text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <img src={inspectPhoto.src} alt={inspectPhoto.title} className="w-full aspect-square object-cover" />
          </div>
        </div>
      )}
    </div>
  );
};
