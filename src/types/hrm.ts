export type EmployeeStatus = 'Aktif' | 'Nonaktif';
export type UserRole = 'admin' | 'employee';
export type AttendanceStatus = 'Tepat Waktu' | 'Terlambat' | 'Selesai' | 'Izin';
export type LeaveType = 'Cuti Tahunan' | 'Sakit' | 'Izin Khusus' | 'Cuti Melahirkan';
export type LeaveStatus = 'Menunggu' | 'Disetujui' | 'Ditolak';
export type PayrollStatus = 'Draft' | 'Dibayarkan';

export type PortalMode = 'admin' | 'employee';
export type AdminTab = 'overview' | 'employees' | 'schedule' | 'attendance' | 'payroll';
export type MobileTab = 'beranda' | 'presensi' | 'cuti' | 'laporan' | 'profil';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface Position {
  id: string;
  title: string;
  department: string;
  dailyRate: number;
  description: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkSchedule {
  id: string;
  shiftName: string;
  officeLocation: string;
  workDays: string[];
  startTime: string;
  endTime: string;
  lateToleranceMinutes: number;
  updatedAt?: unknown;
}

export interface Employee {
  id: string;
  authUid: string;
  nik: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  positionId: string;
  positionTitle: string;
  department: string;
  dailyRateOverride: number;
  joinDate: string;
  status: EmployeeStatus;
  role: UserRole;
  avatarUrl: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Attendance {
  id: string;
  employeeId: string;
  authUid: string;
  employeeEmail: string;
  employeeName: string;
  positionTitle: string;
  date: string;
  checkInTime: string;
  checkInPhoto: string;
  checkInNote: string;
  checkOutTime: string;
  checkOutPhoto: string;
  checkOutNote: string;
  status: AttendanceStatus;
  workMinutes: number;
  dailyWageApplied: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  authUid: string;
  employeeEmail: string;
  employeeName: string;
  positionTitle: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  adminNote: string;
  reviewedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Payroll {
  id: string;
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  positionTitle: string;
  period: string;
  presentDays: number;
  lateDays: number;
  approvedLeaveDays: number;
  dailyRate: number;
  grossBasePay: number;
  bonus: number;
  deduction: number;
  netPay: number;
  status: PayrollStatus;
  notes: string;
  paidAt: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const FIELD_LIMITS = {
  idMax: 64,
  titleMax: 100,
  departmentMax: 80,
  descriptionMax: 300,
  nikMax: 32,
  fullNameMax: 120,
  emailMax: 160,
  phoneMax: 32,
  addressMax: 300,
  noteMax: 200,
  reasonMax: 500,
  adminNoteMax: 300,
  photoMax: 340000,
  avatarMax: 240000,
} as const;

export const SUPER_ADMIN_EMAIL = 'pideksaarsy1206@gmail.com';
