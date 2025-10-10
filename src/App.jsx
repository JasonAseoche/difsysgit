import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// Import audited components with aliases to match your original structure
import {
  AuditedMainPage as MainPage,
  AuditedApplyNow as ApplyNow,
  AuditedSignUp as SignUp,
  AuditedLogIn as LogIn,
  AuditedProfile as Profile,
  AuditedEmailVerification as EmailVerification,
  AuditedChangePassword as ChangePassword,
  AuditedDashboard as Dashboard,
  AuditedManageAccounts as ManageAccounts,
  AuditedManageFingeprint as ManageFingeprint,
  AuditedTestAttendance as TestAttendance,
  AuditedDemoAttendance as DemoAttendance,
  AuditedAbout as About,
  AuditedDashboardHR as DashboardHR,
  AuditedManageEmployee as ManageEmployee,
  AuditedAttendanceTracking as AttendanceTracking,
  AuditedPerformanceEvaluation as PerformanceEvaluation,
  AuditedLeaveManagement as LeaveManagement,
  AuditedApplicantsTracking as ApplicantsTracking,
  AuditedManageExamination as ManageExamination,
  AuditedManageRelation as ManageRelation,
  AuditedManageHiring as ManageHiring,
  AuditedManageDepartment as ManageDepartment,
  AuditedManageEvents as ManageEvents,
  AuditedNotifications as Notifications,
  AuditedEmPersonal as EmPersonal,
  AuditedDashboardAccountant as DashboardAccountant,
  AuditedPayrollAccount as PayrollAccount,
  AuditedGeneratePayroll as GeneratePayroll,
  AuditedManagePayroll as ManagePayroll,
  AuditedBenefits as Benefits,
  AuditedEmployeeAttendance as EmployeeAttendance,
  AuditedDashboardEmployee as DashboardEmployee,
  AuditedAttendance as Attendance,
  AuditedOvertimeRequest as OvertimeRequest,
  AuditedManageDocuments as ManageDocuments,
  AuditedMyPayroll as MyPayroll,
  AuditedTimeKeeping as TimeKeeping,
  AuditedFileInquiries as FileInquiries,
  AuditedDashboardApplicant as DashboardApplicant,
  AuditedUploadRequirements as UploadRequirements,
  AuditedSetupProfile as SetupProfile,
  AuditedTakeExam as TakeExam,
  AuditedUploadResume as UploadResume,
  AuditedDashboardSupervisor as DashboardSupervisor,
  AuditedTeamManagement as TeamManagement,
  AuditedSupervisorAttendance as SupervisorAttendance,
  AuditedPerformanceReview as PerformanceReview,
  AuditedLeaveApproval as LeaveApproval,
  AuditedReports as Reports,
  Unauthorized
} from './AuditedComponents'

// Add the audit trail component
import AuditTrail from './pages/DashboardAdminPages/AuditTrail'

// Keep your original imports
import PrivateRoute from './PrivateRoute'
import ApplicantRouteGuard from './pages/ApplicantRouteGuard'

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/apply-now" element={<ApplyNow />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Upload Resume - Accessible immediately after email verification for applicants */}
        <Route 
          path="/upload-resume" 
          element={
            <PrivateRoute allowedRoles={['applicant']}>
              <UploadResume />
            </PrivateRoute>
          } 
        />

        <Route element={<PrivateRoute allowedRoles={['admin', 'hr', 'accountant', 'employee', 'supervisor', 'applicant']} />}>
          <Route path="/profile" element={<Profile/>} />
        </Route>

        {/* Dashboard Routes with Role-Based Access */}
        
        {/* Admin Routes */}
        <Route element={<PrivateRoute allowedRoles={['admin']} />}>
          <Route path="/dashboard-admin" element={<Dashboard />} />
          <Route path="/manage-fingerprint" element={<ManageFingeprint />} />
          <Route path="/about" element={<About />} />
          <Route path="/test-attendance" element={<TestAttendance/>} />
          <Route path="/demo-attendance" element={<DemoAttendance/>} />
          <Route path="/manage-accounts" element={<ManageAccounts />} />
          <Route path="/audit-trail" element={<AuditTrail />} />
        </Route>
        
        {/* HR Routes */}
        <Route element={<PrivateRoute allowedRoles={['hr']} />}>
          <Route path="/dashboard-hr" element={<DashboardHR />} />
          <Route path="/manage-employee" element={<ManageEmployee />} />
          <Route path="/attendance-tracking" element={<AttendanceTracking />} />
          <Route path="/performance-evaluation" element={<PerformanceEvaluation />} />
          <Route path="/leave-management" element={<LeaveManagement />} />
          <Route path="/applicants-tracking" element={<ApplicantsTracking />} />
          <Route path="/manage-examination" element={<ManageExamination />} />
          <Route path="/employee-relation" element={<ManageRelation />} />
          <Route path="/manage-hiring" element={<ManageHiring />} />
          <Route path="/employee-personal" element={<EmPersonal />} />
          <Route path="/manage-department" element={<ManageDepartment />} />
          <Route path="/manage-events" element={<ManageEvents />} />
        </Route>

        {/* Accountant Routes */}
        <Route element={<PrivateRoute allowedRoles={['accountant']} />}>
          <Route path="/dashboard-accountant" element={<DashboardAccountant />} />
          <Route path="/payroll-account" element={<PayrollAccount />} />
          <Route path="/generate-payroll" element={<GeneratePayroll />} />
          <Route path="/manage-payroll" element={<ManagePayroll />} />
          <Route path="/benefits" element={<Benefits />} />
          <Route path="/employee-attendance" element={<EmployeeAttendance />} />
        </Route>

        {/* Employee Routes */}
        <Route element={<PrivateRoute allowedRoles={['employee']} />}>
          <Route path="/dashboard-employee" element={<DashboardEmployee />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/overtime-request" element={<OvertimeRequest />} />  
          <Route path="/manage-documents" element={<ManageDocuments />} />
          <Route path="/my-payroll" element={<MyPayroll />} />
          <Route path="/time-keeping" element={<TimeKeeping />} />
          <Route path="/file-ticket" element={<FileInquiries />} />          
        </Route>

        {/* Supervisor Routes */}
        <Route element={<PrivateRoute allowedRoles={['supervisor']} />}>
          <Route path="/dashboard-supervisor" element={<DashboardSupervisor />} />
          <Route path="/team-management" element={<TeamManagement />} />
          <Route path="/supervisor-attendance" element={<SupervisorAttendance />} />
          <Route path="/performance-review" element={<PerformanceReview />} />
          <Route path="/leave-approval" element={<LeaveApproval />} />
          <Route path="/reports" element={<Reports />} />
        </Route>

        {/* Applicant Routes */}
        <Route element={<PrivateRoute allowedRoles={['applicant']} />}>
          {/* Dashboard protected by ApplicantRouteGuard - only accessible if application is complete */}
          <Route 
            path="/dashboard-applicant" 
            element={
              <ApplicantRouteGuard>
                <DashboardApplicant />
              </ApplicantRouteGuard>
            } 
          />
          
          {/* Other applicant routes - only accessible after completing application */}
          <Route 
            path="/upload-requirements" 
            element={
              <ApplicantRouteGuard>
                <UploadRequirements />
              </ApplicantRouteGuard>
            } 
          />
          <Route 
            path="/setup-profile" 
            element={
              <ApplicantRouteGuard>
                <SetupProfile />
              </ApplicantRouteGuard>
            } 
          />
          <Route 
            path="/take-exam" 
            element={
              <ApplicantRouteGuard>
                <TakeExam />
              </ApplicantRouteGuard>
            } 
          />
        </Route>
      </Routes>
    </Router>
  )
}

export default App