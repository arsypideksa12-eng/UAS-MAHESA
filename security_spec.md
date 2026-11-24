# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Master Admin Authority**: Only verified emails matching the bootstrapped admin (`pideksaarsy1206@gmail.com`) or UIDs present in `/admins/{uid}` may mutate `positions`, `workSchedules`, `payrolls`, or approve/reject `leaveRequests` and manage other employees.
2. **PII & Employee Isolation**: Employees contain PII (`email`, `phone`, `address`, `nik`). Blanket reads/lists for non-admins are strictly forbidden. Non-admins may only `get` or `list` records where `resource.data.authUid == request.auth.uid` or `resource.data.email == request.auth.token.email` (with `email_verified == true`).
3. **Selfie Check-In & Check-Out Integrity**: An employee can only create an attendance record for their own existing `employeeId`, matching their verified `authUid` and `employeeEmail`, with server-validated `request.time` timestamps. Check-out updates can only mutate `checkOutTime`, `checkOutPhoto`, `checkOutNote`, `workMinutes`, `status`, and `updatedAt` while `existing().checkOutTime == ''`.
4. **Leave Request State Machine**: Employees can only submit leave requests with `status: 'Menunggu'`, `adminNote: ''`, and `reviewedBy: ''`. Once a leave request leaves `'Menunggu'` (`'Disetujui'` or `'Ditolak'`), non-admins cannot modify or delete it.
5. **No Self-Assigned Privileges**: Non-admin users creating or updating their own employee profile cannot set `role: 'admin'` or alter `dailyRateOverride`, `positionId`, `status`, `nik`, or `email`.
6. **Strict Field Allowlisting & Boundary Caps**: Every document enforces exact `keys().hasAll(...)` and `keys().hasOnly(...)` checks plus string `.size()` limits to prevent shadow fields and payload exhaustion.

## 2. The "Dirty Dozen" Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Creating a position without `request.auth`.
2. **Unverified Email Spoof**: User with `email: 'pideksaarsy1206@gmail.com'` and `email_verified: false` attempting admin write on `positions`.
3. **Privilege Escalation (Self-Admin)**: Employee creating `/admins/{uid}` for themselves.
4. **Role Escalation on Employee Profile**: Employee updating their own `/employees/{id}` with `{ role: 'admin' }`.
5. **Shadow Field Injection**: Employee creating an attendance record with an extra ghost field `{ isVerified: true }`.
6. **Cross-Employee PII Read**: Employee A attempting to `get` Employee B's `/employees/{empB}` document.
7. **Blanket List Scrape**: Employee attempting an unfiltered `list` query on `/employees` or `/attendances` or `/payrolls`.
8. **Spoofed Attendance Identity**: Employee A creating an `/attendances/{id}` document with `employeeEmail` or `authUid` belonging to Employee B.
9. **Tampered Check-In Overwrite**: Employee attempting to modify `checkInTime` or `dailyWageApplied` during a check-out update.
10. **Auto-Approved Leave Request**: Employee creating a `/leaveRequests/{id}` with `status: 'Disetujui'`.
11. **Terminal Leave Mutation**: Employee updating a `/leaveRequests/{id}` after it was already `'Ditolak'` or `'Disetujui'`.
12. **Oversized Path / Resource Poisoning**: Creating a document with an invalid ID (`bad/id` or 200-char ID) or exceeding string `.size()` limits.
