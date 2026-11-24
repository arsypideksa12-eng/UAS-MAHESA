import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, testConnection } from './lib/firebase';
import {
  Attendance,
  Employee,
  LeaveRequest,
  OperationType,
  Payroll,
  PortalMode,
  Position,
  WorkSchedule,
} from './types/hrm';
import { DEMO_EMPLOYEE_ID, ensureDemoSeedData } from './services/hrmService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/PWAInstallBanner';
import { LoginScreen } from './components/LoginScreen';
import { AdminBackoffice } from './components/AdminBackoffice';
import { MobileEmployeePWA } from './components/MobileEmployeePWA';

const DEFAULT_SCHEDULE: WorkSchedule = {
  id: 'default',
  shiftName: 'Reguler Kantor Pusat',
  officeLocation: 'Menara Thamrin Lt. 12, Jakarta Pusat',
  workDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
  startTime: '08:00',
  endTime: '17:00',
  lateToleranceMinutes: 15,
};

interface DemoSession {
  portal: PortalMode;
  employeeId: string;
  adminName: string;
}

const SESSION_KEY = 'nusakerja_demo_session_v1';

function loadSavedSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoSession;
    if (parsed && (parsed.portal === 'admin' || parsed.portal === 'employee')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function AppContent() {
  const [session, setSession] = useState<DemoSession | null>(() => loadSavedSession());
  const [dbReady, setDbReady] = useState(false);

  const [positions, setPositions] = useState<Position[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>(DEFAULT_SCHEDULE);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);

  const saveSession = (next: DemoSession | null) => {
    setSession(next);
    try {
      if (next) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Ignore storage quota issues
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      await testConnection();
      await ensureDemoSeedData();
      if (active) setDbReady(true);
    };
    init();

    const unsubPositions = onSnapshot(
      collection(db, 'positions'),
      (snap) => setPositions(snap.docs.map((d) => d.data() as Position)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'positions')
    );

    const unsubSchedule = onSnapshot(
      collection(db, 'workSchedules'),
      (snap) => {
        const def = snap.docs.find((d) => d.id === 'default') || snap.docs[0];
        if (def) setWorkSchedule(def.data() as WorkSchedule);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'workSchedules')
    );

    const unsubEmployees = onSnapshot(
      collection(db, 'employees'),
      (snap) => setEmployees(snap.docs.map((d) => d.data() as Employee)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'employees')
    );

    const unsubAttendances = onSnapshot(
      collection(db, 'attendances'),
      (snap) => setAttendances(snap.docs.map((d) => d.data() as Attendance)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'attendances')
    );

    const unsubLeaves = onSnapshot(
      collection(db, 'leaveRequests'),
      (snap) => setLeaveRequests(snap.docs.map((d) => d.data() as LeaveRequest)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'leaveRequests')
    );

    const unsubPayrolls = onSnapshot(
      collection(db, 'payrolls'),
      (snap) => setPayrolls(snap.docs.map((d) => d.data() as Payroll)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'payrolls')
    );

    return () => {
      active = false;
      unsubPositions();
      unsubSchedule();
      unsubEmployees();
      unsubAttendances();
      unsubLeaves();
      unsubPayrolls();
    };
  }, []);

  const currentEmployee = useMemo(() => {
    const targetId = session?.employeeId || DEMO_EMPLOYEE_ID;
    return (
      employees.find((e) => e.id === targetId) ||
      employees.find((e) => e.id === DEMO_EMPLOYEE_ID) ||
      employees[0] ||
      null
    );
  }, [employees, session?.employeeId]);

  const handleLoginEmployee = (employeeId: string) => {
    saveSession({
      portal: 'employee',
      employeeId,
      adminName: 'HR Administrator',
    });
  };

  const handleLoginAdmin = (adminName: string) => {
    saveSession({
      portal: 'admin',
      employeeId: DEMO_EMPLOYEE_ID,
      adminName,
    });
  };

  const handleLogout = async () => {
    saveSession(null);
  };

  const defaultPortalOnDevice: PortalMode =
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'employee' : 'employee';

  if (!dbReady && employees.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="h-10 w-10 rounded-xl bg-slate-900 text-white font-display font-bold flex items-center justify-center text-lg">
          N
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-800">Menghubungkan ke NusaKerja HRM...</p>
        <p className="mt-1 text-xs text-slate-500">Menyiapkan sinkronisasi database real-time</p>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        employees={employees}
        initialPortal={defaultPortalOnDevice}
        onLoginEmployee={handleLoginEmployee}
        onLoginAdmin={handleLoginAdmin}
      />
    );
  }

  if (session.portal === 'admin') {
    return (
      <AdminBackoffice
        adminName={session.adminName || 'HR Administrator'}
        adminEmail="admin@nusakerja.id"
        positions={positions}
        employees={employees}
        schedule={workSchedule}
        attendances={attendances}
        leaveRequests={leaveRequests}
        payrolls={payrolls}
        onSwitchToMobile={() =>
          saveSession({
            ...session,
            portal: 'employee',
            employeeId: session.employeeId || DEMO_EMPLOYEE_ID,
          })
        }
        onLogout={handleLogout}
      />
    );
  }

  if (!currentEmployee) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <p className="text-sm font-semibold text-slate-800">Memuat profil Jibeks...</p>
      </div>
    );
  }

  return (
    <MobileEmployeePWA
      employee={currentEmployee}
      positions={positions}
      schedule={workSchedule}
      attendances={attendances}
      leaveRequests={leaveRequests}
      payrolls={payrolls}
      authUid={currentEmployee.authUid || currentEmployee.id}
      canSwitchToAdmin={true}
      onSwitchToAdmin={() =>
        saveSession({
          ...session,
          portal: 'admin',
        })
      }
      onLogout={handleLogout}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <OfflineIndicator />
      <AppContent />
    </ErrorBoundary>
  );
}
