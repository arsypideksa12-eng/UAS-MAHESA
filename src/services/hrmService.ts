import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import {
  calculateWorkMinutes,
  clampStr,
  determineCheckInStatus,
  getTodayDateISO,
  sanitizeId,
} from '../lib/utils';
import {
  Attendance,
  Employee,
  FIELD_LIMITS,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  OperationType,
  Payroll,
  PayrollStatus,
  Position,
  WorkSchedule,
} from '../types/hrm';

const DEFAULT_STAFF_AVATAR = '/src/assets/images/avatar_staff_member_1795494861208.jpg';
const DEFAULT_ADMIN_AVATAR = '/src/assets/images/avatar_hr_admin_1795494861273.jpg';

export const DEMO_EMPLOYEE_ID = 'emp_beram';
export const PAK_TUNG_EMPLOYEE_ID = 'emp_paktung';

export async function ensureDemoSeedData(): Promise<void> {
  try {
    const posSnap = await getDocs(collection(db, 'positions'));
    const nowTs = serverTimestamp();

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getTodayDateISO(yesterdayDate);

    if (posSnap.empty) {
      const batch = writeBatch(db);

      const positions: Omit<Position, 'createdAt' | 'updatedAt'>[] = [
        {
          id: 'pos_ops',
          title: 'Staff Operasional',
          department: 'Operasional',
          dailyRate: 185000,
          description: 'Pelaksanaan operasional harian, logistik, dan kontrol kualitas lapangan.',
        },
        {
          id: 'pos_eng',
          title: 'Software Engineer',
          department: 'Teknologi',
          dailyRate: 350000,
          description: 'Pengembangan sistem internal, pemeliharaan layanan cloud, dan otomasi.',
        },
        {
          id: 'pos_hr',
          title: 'HR & GA Specialist',
          department: 'Human Resources',
          dailyRate: 240000,
          description: 'Pengelolaan administrasi kepegawaian, presensi, cuti, dan fasilitas kerja.',
        },
        {
          id: 'pos_fin',
          title: 'Finance Officer',
          department: 'Keuangan',
          dailyRate: 225000,
          description: 'Rekonsiliasi transaksi, pengupahan harian, dan pelaporan anggaran.',
        },
      ];

      for (const pos of positions) {
        batch.set(doc(db, 'positions', pos.id), {
          ...pos,
          createdAt: nowTs,
          updatedAt: nowTs,
        });
      }

      batch.set(doc(db, 'workSchedules', 'default'), {
        id: 'default',
        shiftName: 'Reguler Kantor Pusat',
        officeLocation: 'Menara Thamrin Lt. 12, Jakarta Pusat',
        workDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
        startTime: '08:00',
        endTime: '17:00',
        lateToleranceMinutes: 15,
        updatedAt: nowTs,
      });

      const today = getTodayDateISO();

      const employees: Omit<Employee, 'createdAt' | 'updatedAt'>[] = [
        {
          id: DEMO_EMPLOYEE_ID,
          authUid: DEMO_EMPLOYEE_ID,
          nik: 'NK-2026-001',
          fullName: 'Jibeks',
          email: 'jibeks@nusakerja.id',
          phone: '0812-8890-1122',
          address: 'Jl. Kemang Raya No. 45, Jakarta Selatan',
          positionId: 'pos_ops',
          positionTitle: 'Staff Operasional',
          department: 'Operasional',
          dailyRateOverride: 200000,
          joinDate: '2024-02-01',
          status: 'Aktif',
          role: 'employee',
          avatarUrl: DEFAULT_STAFF_AVATAR,
        },
        {
          id: PAK_TUNG_EMPLOYEE_ID,
          authUid: PAK_TUNG_EMPLOYEE_ID,
          nik: 'NK-2026-005',
          fullName: 'Pak Tung',
          email: 'pak.tung@nusakerja.id',
          phone: '0811-2233-4455',
          address: 'Jl. Kebayoran Baru No. 88, Jakarta Selatan',
          positionId: 'pos_ops',
          positionTitle: 'Staff Operasional',
          department: 'Operasional',
          dailyRateOverride: 210000,
          joinDate: '2024-03-15',
          status: 'Aktif',
          role: 'employee',
          avatarUrl: DEFAULT_STAFF_AVATAR,
        },
        {
          id: 'emp_budi',
          authUid: 'emp_budi',
          nik: 'NK-2026-002',
          fullName: 'Budi Santoso',
          email: 'budi.santoso@nusakerja.id',
          phone: '0813-4421-9087',
          address: 'Jl. Tebet Barat Dalam No. 18, Jakarta Selatan',
          positionId: 'pos_eng',
          positionTitle: 'Software Engineer',
          department: 'Teknologi',
          dailyRateOverride: 0,
          joinDate: '2024-06-15',
          status: 'Aktif',
          role: 'employee',
          avatarUrl: DEFAULT_STAFF_AVATAR,
        },
        {
          id: 'emp_siti',
          authUid: 'emp_siti',
          nik: 'NK-2026-003',
          fullName: 'Siti Rahmawati',
          email: 'siti.rahmawati@nusakerja.id',
          phone: '0856-7712-3344',
          address: 'Jl. Bintaro Utama Sektor 5, Tangerang Selatan',
          positionId: 'pos_fin',
          positionTitle: 'Finance Officer',
          department: 'Keuangan',
          dailyRateOverride: 0,
          joinDate: '2025-01-10',
          status: 'Aktif',
          role: 'employee',
          avatarUrl: DEFAULT_STAFF_AVATAR,
        },
        {
          id: 'emp_rani',
          authUid: 'emp_rani',
          nik: 'NK-2026-004',
          fullName: 'Rani Kusuma',
          email: 'rani.kusuma@nusakerja.id',
          phone: '0819-3310-6542',
          address: 'Jl. Menteng Dalam No. 12, Jakarta Selatan',
          positionId: 'pos_hr',
          positionTitle: 'HR & GA Specialist',
          department: 'Human Resources',
          dailyRateOverride: 0,
          joinDate: '2024-04-01',
          status: 'Aktif',
          role: 'admin',
          avatarUrl: DEFAULT_ADMIN_AVATAR,
        },
      ];

      for (const emp of employees) {
        batch.set(doc(db, 'employees', emp.id), {
          ...emp,
          createdAt: nowTs,
          updatedAt: nowTs,
        });
      }

      const sampleAttendances: Omit<Attendance, 'createdAt' | 'updatedAt'>[] = [
        {
          id: `${DEMO_EMPLOYEE_ID}_${yesterday}`,
          employeeId: DEMO_EMPLOYEE_ID,
          authUid: DEMO_EMPLOYEE_ID,
          employeeEmail: 'jibeks@nusakerja.id',
          employeeName: 'Jibeks',
          positionTitle: 'Staff Operasional',
          date: yesterday,
          checkInTime: '07:50',
          checkInPhoto: DEFAULT_STAFF_AVATAR,
          checkInNote: 'Hadir tepat waktu di gudang operasional',
          checkOutTime: '17:04',
          checkOutPhoto: DEFAULT_STAFF_AVATAR,
          checkOutNote: 'Serah terima shift selesai',
          status: 'Selesai',
          workMinutes: 554,
          dailyWageApplied: 200000,
        },
        {
          id: `${PAK_TUNG_EMPLOYEE_ID}_${yesterday}`,
          employeeId: PAK_TUNG_EMPLOYEE_ID,
          authUid: PAK_TUNG_EMPLOYEE_ID,
          employeeEmail: 'pak.tung@nusakerja.id',
          employeeName: 'Pak Tung',
          positionTitle: 'Staff Operasional',
          date: yesterday,
          checkInTime: '07:48',
          checkInPhoto: DEFAULT_STAFF_AVATAR,
          checkInNote: 'Hadir shift pagi operasional',
          checkOutTime: '17:02',
          checkOutPhoto: DEFAULT_STAFF_AVATAR,
          checkOutNote: 'Selesai pengecekan stok',
          status: 'Selesai',
          workMinutes: 554,
          dailyWageApplied: 210000,
        },
        {
          id: `emp_budi_${yesterday}`,
          employeeId: 'emp_budi',
          authUid: 'emp_budi',
          employeeEmail: 'budi.santoso@nusakerja.id',
          employeeName: 'Budi Santoso',
          positionTitle: 'Software Engineer',
          date: yesterday,
          checkInTime: '07:52',
          checkInPhoto: DEFAULT_STAFF_AVATAR,
          checkInNote: 'Hadir di kantor pusat',
          checkOutTime: '17:08',
          checkOutPhoto: DEFAULT_STAFF_AVATAR,
          checkOutNote: 'Selesai sprint review',
          status: 'Selesai',
          workMinutes: 556,
          dailyWageApplied: 350000,
        },
        {
          id: `emp_siti_${yesterday}`,
          employeeId: 'emp_siti',
          authUid: 'emp_siti',
          employeeEmail: 'siti.rahmawati@nusakerja.id',
          employeeName: 'Siti Rahmawati',
          positionTitle: 'Finance Officer',
          date: yesterday,
          checkInTime: '08:21',
          checkInPhoto: DEFAULT_STAFF_AVATAR,
          checkInNote: 'Kendala lalu lintas Sudirman',
          checkOutTime: '17:15',
          checkOutPhoto: DEFAULT_STAFF_AVATAR,
          checkOutNote: 'Rekonsiliasi harian selesai',
          status: 'Terlambat',
          workMinutes: 534,
          dailyWageApplied: 225000,
        },
      ];

      for (const att of sampleAttendances) {
        batch.set(doc(db, 'attendances', att.id), {
          ...att,
          createdAt: nowTs,
          updatedAt: nowTs,
        });
      }

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 3);
      const futureStart = getTodayDateISO(nextDate);
      const nextEndDate = new Date();
      nextEndDate.setDate(nextEndDate.getDate() + 4);
      const futureEnd = getTodayDateISO(nextEndDate);

      batch.set(doc(db, 'leaveRequests', 'leave_sample_01'), {
        id: 'leave_sample_01',
        employeeId: DEMO_EMPLOYEE_ID,
        authUid: DEMO_EMPLOYEE_ID,
        employeeEmail: 'jibeks@nusakerja.id',
        employeeName: 'Jibeks',
        positionTitle: 'Staff Operasional',
        leaveType: 'Cuti Tahunan',
        startDate: futureStart,
        endDate: futureEnd,
        totalDays: 2,
        reason: 'Keperluan acara keluarga di luar kota.',
        status: 'Menunggu',
        adminNote: '',
        reviewedBy: '',
        createdAt: nowTs,
        updatedAt: nowTs,
      });

      batch.set(doc(db, 'leaveRequests', 'leave_sample_02'), {
        id: 'leave_sample_02',
        employeeId: 'emp_budi',
        authUid: 'emp_budi',
        employeeEmail: 'budi.santoso@nusakerja.id',
        employeeName: 'Budi Santoso',
        positionTitle: 'Software Engineer',
        leaveType: 'Sakit',
        startDate: today,
        endDate: today,
        totalDays: 1,
        reason: 'Kontrol kesehatan rutin di klinik.',
        status: 'Disetujui',
        adminNote: 'Disetujui, harap lampirkan surat kontrol bila diperlukan.',
        reviewedBy: 'HR Administrator',
        createdAt: nowTs,
        updatedAt: nowTs,
      });

      await batch.commit();
      return;
    }

    // Sync existing DB: rename Beram Berok -> Jibeks & ensure Pak Tung exists
    const jibeksSnap = await getDoc(doc(db, 'employees', DEMO_EMPLOYEE_ID));
    if (!jibeksSnap.exists()) {
      await setDoc(doc(db, 'employees', DEMO_EMPLOYEE_ID), {
        id: DEMO_EMPLOYEE_ID,
        authUid: DEMO_EMPLOYEE_ID,
        nik: 'NK-2026-001',
        fullName: 'Jibeks',
        email: 'jibeks@nusakerja.id',
        phone: '0812-8890-1122',
        address: 'Jl. Kemang Raya No. 45, Jakarta Selatan',
        positionId: 'pos_ops',
        positionTitle: 'Staff Operasional',
        department: 'Operasional',
        dailyRateOverride: 200000,
        joinDate: '2024-02-01',
        status: 'Aktif',
        role: 'employee',
        avatarUrl: DEFAULT_STAFF_AVATAR,
        createdAt: nowTs,
        updatedAt: nowTs,
      });
    } else if ((jibeksSnap.data() as Employee).fullName === 'Beram Berok') {
      await updateDoc(doc(db, 'employees', DEMO_EMPLOYEE_ID), {
        fullName: 'Jibeks',
        email: 'jibeks@nusakerja.id',
        updatedAt: nowTs,
      });

      const attSnap = await getDocs(collection(db, 'attendances'));
      for (const d of attSnap.docs) {
        const data = d.data() as Attendance;
        if (data.employeeId === DEMO_EMPLOYEE_ID && data.employeeName === 'Beram Berok') {
          await updateDoc(doc(db, 'attendances', d.id), {
            employeeName: 'Jibeks',
            employeeEmail: 'jibeks@nusakerja.id',
            updatedAt: nowTs,
          });
        }
      }

      const leaveSnap = await getDocs(collection(db, 'leaveRequests'));
      for (const d of leaveSnap.docs) {
        const data = d.data() as LeaveRequest;
        if (data.employeeId === DEMO_EMPLOYEE_ID && data.employeeName === 'Beram Berok') {
          await updateDoc(doc(db, 'leaveRequests', d.id), {
            employeeName: 'Jibeks',
            employeeEmail: 'jibeks@nusakerja.id',
            updatedAt: nowTs,
          });
        }
      }
    }

    const pakTungSnap = await getDoc(doc(db, 'employees', PAK_TUNG_EMPLOYEE_ID));
    if (!pakTungSnap.exists()) {
      await setDoc(doc(db, 'employees', PAK_TUNG_EMPLOYEE_ID), {
        id: PAK_TUNG_EMPLOYEE_ID,
        authUid: PAK_TUNG_EMPLOYEE_ID,
        nik: 'NK-2026-005',
        fullName: 'Pak Tung',
        email: 'pak.tung@nusakerja.id',
        phone: '0811-2233-4455',
        address: 'Jl. Kebayoran Baru No. 88, Jakarta Selatan',
        positionId: 'pos_ops',
        positionTitle: 'Staff Operasional',
        department: 'Operasional',
        dailyRateOverride: 210000,
        joinDate: '2024-03-15',
        status: 'Aktif',
        role: 'employee',
        avatarUrl: DEFAULT_STAFF_AVATAR,
        createdAt: nowTs,
        updatedAt: nowTs,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'ensureDemoSeedData');
  }
}

// Positions CRUD
export async function upsertPosition(
  input: Omit<Position, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const id = sanitizeId(input.id || `pos_${Date.now()}`);
  const path = `positions/${id}`;
  try {
    const payload = {
      id,
      title: clampStr(input.title, FIELD_LIMITS.titleMax),
      department: clampStr(input.department, FIELD_LIMITS.departmentMax),
      dailyRate: Math.max(0, Math.min(100000000, Number(input.dailyRate) || 0)),
      description: clampStr(input.description, FIELD_LIMITS.descriptionMax),
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      await setDoc(doc(db, 'positions', id), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'positions', id), payload);
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deletePosition(positionId: string): Promise<void> {
  const path = `positions/${positionId}`;
  try {
    await deleteDoc(doc(db, 'positions', positionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Work Schedule CRUD
export async function saveWorkSchedule(schedule: Omit<WorkSchedule, 'updatedAt'>): Promise<void> {
  const id = sanitizeId(schedule.id || 'default');
  const path = `workSchedules/${id}`;
  try {
    await setDoc(doc(db, 'workSchedules', id), {
      id,
      shiftName: clampStr(schedule.shiftName, FIELD_LIMITS.titleMax),
      officeLocation: clampStr(schedule.officeLocation, 150),
      workDays: schedule.workDays.length > 0 ? schedule.workDays.slice(0, 7) : ['Senin'],
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      lateToleranceMinutes: Math.max(0, Math.min(180, Number(schedule.lateToleranceMinutes) || 0)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Employees CRUD
export async function upsertEmployee(
  input: Omit<Employee, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const id = sanitizeId(input.id || `emp_${Date.now()}`);
  const path = `employees/${id}`;
  try {
    const payload = {
      id,
      authUid: clampStr(input.authUid || id, 128),
      nik: clampStr(input.nik, FIELD_LIMITS.nikMax),
      fullName: clampStr(input.fullName, FIELD_LIMITS.fullNameMax),
      email: clampStr(input.email.toLowerCase(), FIELD_LIMITS.emailMax),
      phone: clampStr(input.phone, FIELD_LIMITS.phoneMax),
      address: clampStr(input.address, FIELD_LIMITS.addressMax),
      positionId: sanitizeId(input.positionId),
      positionTitle: clampStr(input.positionTitle, FIELD_LIMITS.titleMax),
      department: clampStr(input.department, FIELD_LIMITS.departmentMax),
      dailyRateOverride: Math.max(0, Math.min(100000000, Number(input.dailyRateOverride) || 0)),
      joinDate: input.joinDate,
      status: input.status,
      role: input.role,
      avatarUrl: clampStr(input.avatarUrl || DEFAULT_STAFF_AVATAR, FIELD_LIMITS.avatarMax),
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      await setDoc(doc(db, 'employees', id), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'employees', id), payload);
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function linkEmployeeAuthUid(employeeId: string, uid: string): Promise<void> {
  const path = `employees/${employeeId}`;
  try {
    await updateDoc(doc(db, 'employees', employeeId), {
      authUid: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateEmployeePersonalContact(
  employeeId: string,
  authUid: string,
  phone: string,
  address: string
): Promise<void> {
  const path = `employees/${employeeId}`;
  try {
    await updateDoc(doc(db, 'employees', employeeId), {
      authUid,
      phone: clampStr(phone, FIELD_LIMITS.phoneMax),
      address: clampStr(address, FIELD_LIMITS.addressMax),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  const path = `employees/${employeeId}`;
  try {
    await deleteDoc(doc(db, 'employees', employeeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Selfie Check-in & Check-out
export async function submitSelfieCheckIn(params: {
  employee: Employee;
  authUid: string;
  date: string;
  checkInTime: string;
  checkInPhoto: string;
  checkInNote: string;
  schedule: WorkSchedule;
  dailyWageApplied: number;
}): Promise<void> {
  const attendanceId = sanitizeId(`${params.employee.id}_${params.date}`);
  const path = `attendances/${attendanceId}`;
  const status = determineCheckInStatus(
    params.checkInTime,
    params.schedule.startTime,
    params.schedule.lateToleranceMinutes
  );

  try {
    await setDoc(doc(db, 'attendances', attendanceId), {
      id: attendanceId,
      employeeId: params.employee.id,
      authUid: params.authUid,
      employeeEmail: params.employee.email.toLowerCase(),
      employeeName: clampStr(params.employee.fullName, FIELD_LIMITS.fullNameMax),
      positionTitle: clampStr(params.employee.positionTitle, FIELD_LIMITS.titleMax),
      date: params.date,
      checkInTime: params.checkInTime,
      checkInPhoto: clampStr(params.checkInPhoto, FIELD_LIMITS.photoMax),
      checkInNote: clampStr(params.checkInNote, FIELD_LIMITS.noteMax),
      checkOutTime: '',
      checkOutPhoto: '',
      checkOutNote: '',
      status,
      workMinutes: 0,
      dailyWageApplied: Math.max(0, params.dailyWageApplied),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitSelfieCheckOut(params: {
  attendance: Attendance;
  checkOutTime: string;
  checkOutPhoto: string;
  checkOutNote: string;
}): Promise<void> {
  const path = `attendances/${params.attendance.id}`;
  const workMinutes = calculateWorkMinutes(params.attendance.checkInTime, params.checkOutTime);
  const nextStatus = params.attendance.status === 'Terlambat' ? 'Terlambat' : 'Selesai';

  try {
    await updateDoc(doc(db, 'attendances', params.attendance.id), {
      checkOutTime: params.checkOutTime,
      checkOutPhoto: clampStr(params.checkOutPhoto, FIELD_LIMITS.photoMax),
      checkOutNote: clampStr(params.checkOutNote, FIELD_LIMITS.noteMax),
      workMinutes,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAttendance(attendanceId: string): Promise<void> {
  const path = `attendances/${attendanceId}`;
  try {
    await deleteDoc(doc(db, 'attendances', attendanceId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Leave Requests
export async function submitLeaveRequest(params: {
  employee: Employee;
  authUid: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
}): Promise<void> {
  const leaveId = sanitizeId(`leave_${Date.now()}_${params.employee.id.slice(0, 8)}`);
  const path = `leaveRequests/${leaveId}`;
  try {
    await setDoc(doc(db, 'leaveRequests', leaveId), {
      id: leaveId,
      employeeId: params.employee.id,
      authUid: params.authUid,
      employeeEmail: params.employee.email.toLowerCase(),
      employeeName: clampStr(params.employee.fullName, FIELD_LIMITS.fullNameMax),
      positionTitle: clampStr(params.employee.positionTitle, FIELD_LIMITS.titleMax),
      leaveType: params.leaveType,
      startDate: params.startDate,
      endDate: params.endDate,
      totalDays: Math.max(1, Math.min(90, params.totalDays)),
      reason: clampStr(params.reason, FIELD_LIMITS.reasonMax),
      status: 'Menunggu',
      adminNote: '',
      reviewedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function reviewLeaveRequest(params: {
  leaveId: string;
  status: LeaveStatus;
  adminNote: string;
  reviewedBy: string;
}): Promise<void> {
  const path = `leaveRequests/${params.leaveId}`;
  try {
    await updateDoc(doc(db, 'leaveRequests', params.leaveId), {
      status: params.status,
      adminNote: clampStr(params.adminNote, FIELD_LIMITS.adminNoteMax),
      reviewedBy: clampStr(params.reviewedBy, FIELD_LIMITS.fullNameMax),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteLeaveRequest(leaveId: string): Promise<void> {
  const path = `leaveRequests/${leaveId}`;
  try {
    await deleteDoc(doc(db, 'leaveRequests', leaveId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Daily-Rate Payroll
export async function upsertPayrollRun(
  input: Omit<Payroll, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const id = sanitizeId(input.id || `${input.employeeId}_${input.period}`);
  const path = `payrolls/${id}`;
  try {
    const payload = {
      id,
      employeeId: sanitizeId(input.employeeId),
      employeeEmail: clampStr(input.employeeEmail.toLowerCase(), FIELD_LIMITS.emailMax),
      employeeName: clampStr(input.employeeName, FIELD_LIMITS.fullNameMax),
      positionTitle: clampStr(input.positionTitle, FIELD_LIMITS.titleMax),
      period: input.period,
      presentDays: Math.max(0, Math.min(31, input.presentDays)),
      lateDays: Math.max(0, Math.min(31, input.lateDays)),
      approvedLeaveDays: Math.max(0, Math.min(31, input.approvedLeaveDays)),
      dailyRate: Math.max(0, input.dailyRate),
      grossBasePay: Math.max(0, input.grossBasePay),
      bonus: Math.max(0, input.bonus),
      deduction: Math.max(0, input.deduction),
      netPay: Math.max(0, input.netPay),
      status: input.status as PayrollStatus,
      notes: clampStr(input.notes, FIELD_LIMITS.adminNoteMax),
      paidAt: clampStr(input.paidAt, 30),
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      await setDoc(doc(db, 'payrolls', id), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'payrolls', id), payload);
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function markPayrollPaid(payrollId: string): Promise<void> {
  const path = `payrolls/${payrollId}`;
  try {
    await updateDoc(doc(db, 'payrolls', payrollId), {
      status: 'Dibayarkan',
      paidAt: getTodayDateISO(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
