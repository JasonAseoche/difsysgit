import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MainPage from './pages/Landing'
import ApplyNow from './pages/ApplyNow'
import SignUp from './pages/SignUp'
import LogIn from './pages/LogIn'
import Profile from './components/ProfileAccount/Profile'
import EmailVerification from './components/Verification/EmailVerification'
import ManageFingeprint from './pages/DashboardAdminPages/ManageFingerprint'
import About from './pages/DashboardAdminPages/About'
import Contact from './pages/DashboardAdminPages/Contact'
import Dashboard from './pages/DashboardAdminPages/DashboardAdmin'
import ManageAccounts from './pages/DashboardAdminPages/ManageAccounts'
import PrivateRoute from './PrivateRoute'


// Import new pages for different roles
// HR pages
import DashboardHR from './pages/DashboardHRPages/DashboardHR'
import ManageEmployee from './pages/DashboardHRPages/ManageEmployee'
import AttendanceTracking from './pages/DashboardHRPages/AttendanceTracking'
import PerformanceEvaluation from './pages/DashboardHRPages/PerformanceEvaluation'
import LeaveManagement from './pages/DashboardHRPages/LeaveManagement'
import ApplicantsTracking from './pages/DashboardHRPages/ApplicantsTracking'
import ManageExamination from './pages/DashboardHRPages/ManageExamination'
import ManageRelation from './pages/DashboardHRPages/ManageRelation'
import ManageHiring from './pages/DashboardHRPages/ManageHiring'

// Accountant pages
import DashboardAccountant from './pages/DashboardAccountantPages/DashboardAccountant'
import PayrollAccount from './pages/DashboardAccountantPages/PayrollAccount'
import GeneratePayroll from './pages/DashboardAccountantPages/GeneratePayroll'
import ManagePayroll from './pages/DashboardAccountantPages/ManagePayroll'
import Benefits from './pages/DashboardAccountantPages/Benefits'
import EmployeeAttendance from './pages/DashboardAccountantPages/EmployeeAttendance'

// Employee pages
import DashboardEmployee from './pages/DashboardEmployeePages/DashboardEmployee'
import Attendance from './pages/DashboardEmployeePages/Attendance'
import ManageDocuments from './pages/DashboardEmployeePages/ManageDocuments'
import MyPayroll from './pages/DashboardEmployeePages/MyPayroll'
import TimeKeeping from './pages/DashboardEmployeePages/TimeKeeping'
import FileInquiries from './pages/DashboardEmployeePages/FileInquiries'
import EmPersonal from './pages/DashboardHRPages/EMPersonal'

// Applicant pages
import DashboardApplicant from './pages/DashboardApplicantPages/DashboardApplicant'
import UploadRequirements from './pages/DashboardApplicantPages/UploadRequirements'
import SetupProfile from './pages/DashboardApplicantPages/SetupProfile'
import TakeExam from './pages/DashboardApplicantPages/TakeExam'
import UploadResume from './pages/DashboardApplicantPages/UploadResume'
import ApplicantRouteGuard from './pages/ApplicantRouteGuard'

// Supervisor pages
import DashboardSupervisor from './pages/DashboardSupervisorPages/DashboardSupervisor'
import TeamManagement from './pages/DashboardSupervisorPages/TeamManagement'
import SupervisorAttendance from './pages/DashboardSupervisorPages/SupervisorAttendance'
import PerformanceReview from './pages/DashboardSupervisorPages/PerformanceReview'
import LeaveApproval from './pages/DashboardSupervisorPages/LeaveApproval'
import Reports from './pages/DashboardSupervisorPages/Reports'

// For role-based access you might want to import an unauthorized page
import Unauthorized from './pages/Unauthorized'

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/apply-now" element={<ApplyNow />} />
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

      <Route element={<PrivateRoute allowedRoles={['admin', 'hr', 'accountant', 'employee', 'supervisor']} />}>
        <Route path="/profile" element={<Profile/>} />
      </Route>

        {/* Dashboard Routes with Role-Based Access */}
        
        {/* Admin Routes */}
        <Route element={<PrivateRoute allowedRoles={['admin']} />}>
          <Route path="/dashboard-admin" element={<Dashboard />} />
          <Route path="/manage-fingerprint" element={<ManageFingeprint />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/manage-accounts" element={<ManageAccounts />} />
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