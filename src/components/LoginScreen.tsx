import React, { useEffect, useState } from 'react';
import { Building2, Camera, CheckCircle2, LogIn, ShieldCheck, Smartphone, UserCheck } from 'lucide-react';
import { Employee, PortalMode } from '../types/hrm';
import { DEMO_EMPLOYEE_ID } from '../services/hrmService';
import { PWAInstallButton } from './PWAInstallBanner';

interface LoginScreenProps {
  employees: Employee[];
  initialPortal: PortalMode;
  onLoginEmployee: (employeeId: string) => void;
  onLoginAdmin: (username: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  employees,
  initialPortal,
  onLoginEmployee,
  onLoginAdmin,
}) => {
  const [portal, setPortal] = useState<PortalMode>(initialPortal);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(DEMO_EMPLOYEE_ID);
  const [adminUsername, setAdminUsername] = useState<string>('admin');
  const [adminPassword, setAdminPassword] = useState<string>('admin123');
  const [error, setError] = useState<string | null>(null);

  const activeEmployees = employees.filter((e) => e.status === 'Aktif');

  useEffect(() => {
    if (activeEmployees.length > 0) {
      const hasCurrent = activeEmployees.some((e) => e.id === selectedEmpId);
      if (!hasCurrent) {
        const jibeks = activeEmployees.find((e) => e.id === DEMO_EMPLOYEE_ID || e.fullName.toLowerCase() === 'jibeks');
        setSelectedEmpId(jibeks?.id || activeEmployees[0].id);
      }
    }
  }, [activeEmployees, selectedEmpId]);

  const selectedEmployee =
    activeEmployees.find((e) => e.id === selectedEmpId) ||
    activeEmployees.find((e) => e.id === DEMO_EMPLOYEE_ID) ||
    activeEmployees[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (portal === 'employee') {
      if (!selectedEmployee) {
        setError('Data karyawan sedang dimuat dari database. Silakan tunggu sebentar.');
        return;
      }
      onLoginEmployee(selectedEmployee.id);
      return;
    }

    const uname = adminUsername.trim().toLowerCase();
    const pwd = adminPassword.trim();
    if (!uname || !pwd) {
      setError('Masukkan username dan kata sandi admin.');
      return;
    }

    const matchedAdminEmp = activeEmployees.find(
      (emp) =>
        emp.role === 'admin' &&
        (emp.email.toLowerCase() === uname || emp.nik.toLowerCase() === uname || emp.fullName.toLowerCase() === uname)
    );

    if ((uname === 'admin' && pwd === 'admin123') || (matchedAdminEmp && pwd === 'admin123')) {
      onLoginAdmin(matchedAdminEmp ? matchedAdminEmp.fullName : 'HR Administrator');
    } else {
      setError('Username atau kata sandi salah. Gunakan akun demo: admin / admin123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm items-stretch">
          {/* Left architectural photo column */}
          <div className="relative lg:col-span-6 min-h-[250px] lg:min-h-[620px] bg-slate-900">
            <img
              src="/src/assets/images/hrm_login_workspace_1795494860429.jpg"
              alt="Ruang kerja modern NusaKerja"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/20" />
            <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-10 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-display font-extrabold text-lg">
                  N
                </div>
                <span className="font-display text-lg font-bold tracking-tight">NusaKerja HRM</span>
              </div>

              <div className="max-w-md space-y-4">
                <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-balance">
                  Satu Sumber Data Real-Time untuk Manajemen SDM dan Presensi Karyawan.
                </h1>
                <p className="text-sm text-slate-200 leading-relaxed">
                  Kelola karyawan, jadwal kerja, verifikasi check-in dan check-out selfie, persetujuan cuti, serta payroll harian otomatis yang tersinkron di semua perangkat.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/15 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Selfie Check-In & Check-Out</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Payroll Harian Otomatis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Demo Login Form column */}
          <div className="lg:col-span-6 flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div>
                <p className="text-xs font-semibold text-emerald-700">Akses Demo Multi-Perangkat</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
                  Masuk ke Sistem HRM
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Pilih portal untuk masuk langsung sebagai karyawan demo atau administrator backoffice tanpa perlu akun Google.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Pilih Portal Akses
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setPortal('employee');
                        setError(null);
                      }}
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors min-h-[44px] ${
                        portal === 'employee'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Smartphone className="h-4 w-4 shrink-0" />
                      <span>Mobile Karyawan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPortal('admin');
                        setError(null);
                      }}
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors min-h-[44px] ${
                        portal === 'admin'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>Backoffice Admin</span>
                    </button>
                  </div>
                </div>

                {portal === 'employee' ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3.5">
                      <img
                        src={selectedEmployee?.avatarUrl || '/src/assets/images/avatar_staff_member_1795494861208.jpg'}
                        alt={selectedEmployee?.fullName || 'Jibeks'}
                        referrerPolicy="no-referrer"
                        className="h-12 w-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-emerald-700">Akun Demo Karyawan</p>
                        <p className="font-display text-sm font-bold text-slate-900 truncate">
                          {selectedEmployee?.fullName || 'Jibeks'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono truncate">
                          {selectedEmployee?.nik || 'NK-2026-001'} · {selectedEmployee?.positionTitle || 'Staff Operasional'}
                        </p>
                      </div>
                      <UserCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    </div>

                    <div>
                      <label htmlFor="employeeSelect" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Pilih Profil Karyawan
                      </label>
                      <select
                        id="employeeSelect"
                        value={selectedEmployee?.id || DEMO_EMPLOYEE_ID}
                        onChange={(e) => setSelectedEmpId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none min-h-[44px]"
                      >
                        {activeEmployees.length === 0 ? (
                          <option value={DEMO_EMPLOYEE_ID}>Jibeks (NK-2026-001)</option>
                        ) : (
                          activeEmployees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.fullName} ({emp.nik} · {emp.positionTitle})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="adminUsername" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Username / NIK Admin
                      </label>
                      <input
                        id="adminUsername"
                        type="text"
                        required
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="admin"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="adminPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Kata Sandi
                      </label>
                      <input
                        id="adminPassword"
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none min-h-[44px]"
                      />
                      <p className="mt-1.5 text-[11px] text-slate-500 font-mono">
                        Kredensial Demo: admin / admin123
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 min-h-[48px]"
                >
                  <LogIn className="h-4 w-4" />
                  <span>
                    {portal === 'employee'
                      ? `Masuk sebagai ${selectedEmployee?.fullName || 'Jibeks'}`
                      : 'Masuk ke Panel Backoffice'}
                  </span>
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                <div className="space-y-1.5 text-xs text-slate-500">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Database Firestore terhubung real-time di semua perangkat.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Presensi Check-In & Check-Out selfie langsung tercatat ke payroll harian.</span>
                  </p>
                </div>

                <PWAInstallButton variant="card" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
