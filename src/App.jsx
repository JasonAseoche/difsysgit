import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MainPage from './pages/Landing'
import SignUp from './pages/SignUp'
import LogIn from './pages/LogIn'
import Home from './pages/DashboardAdminPages/Home'
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
import TimeKeepingTracking from './pages/DashboardHRPages/TimeKeepingTracking'
import ApplicantsTracking from './pages/DashboardHRPages/ApplicantsTracking'
import ListOfOnboard from './pages/DashboardHRPages/ListOfOnboard'

// Accountant pages

import DashboardAccountant from './pages/DashboardAccountantPages/DashboardAccountant'
import ListOfEmployee from './pages/DashboardAccountantPages/ListOfEmployee'
import GeneratePayroll from './pages/DashboardAccountantPages/GeneratePayroll'
import ManagePayroll from './pages/DashboardAccountantPages/ManagePayroll'
import Benefits from './pages/DashboardAccountantPages/Benefits'

// Employee pages
import DashboardEmployee from './pages/DashboardEmployeePages/DashboardEmployee'
import Attendance from './pages/DashboardEmployeePages/Attendance'
import ManageDocuments from './pages/DashboardEmployeePages/ManageDocuments'
import MyPayroll from './pages/DashboardEmployeePages/MyPayroll'
import TimeKeeping from './pages/DashboardEmployeePages/TimeKeeping'

// Applicant pages
import DashboardApplicant from './pages/DashboardApplicantPages/DashboardApplicant'
import UploadRequirements from './pages/DashboardApplicantPages/UploadRequirements'
import SetupProfile from './pages/DashboardApplicantPages/SetupProfile'

// For role-based access you might want to import an unauthorized page
import Unauthorized from './pages/Unauthorized'


const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Dashboard Routes with Role-Based Access */}
        
        {/* Admin Routes */}
        <Route element={<PrivateRoute allowedRoles={['admin']} />}>
          <Route path="/dashboard-admin" element={<Dashboard />} />
          <Route path="/home" element={<Home />} />
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
          <Route path="/timekeeping-tracking" element={<TimeKeepingTracking />} />
          <Route path="/applicants-tracking" element={<ApplicantsTracking />} />
          <Route path="/list-of-onboard" element={<ListOfOnboard />} />
        </Route>

        {/* Accountant Routes */}
        <Route element={<PrivateRoute allowedRoles={['accountant']} />}>
          <Route path="/dashboard-accountant" element={<DashboardAccountant />} />
          <Route path="/list-of-employee" element={<ListOfEmployee />} />
          <Route path="/generate-payroll" element={<GeneratePayroll />} />
          <Route path="/manage-payroll" element={<ManagePayroll />} />
          <Route path="/benefits" element={<Benefits />} />
        </Route>

        {/* Employee Routes */}
        <Route element={<PrivateRoute allowedRoles={['employee']} />}>
          <Route path="/dashboard-employee" element={<DashboardEmployee />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/manage-documents" element={<ManageDocuments />} />
          <Route path="/my-payroll" element={<MyPayroll />} />
          <Route path="/time-keeping" element={<TimeKeeping />} />
        </Route>

        {/* Applicant Routes */}
        <Route element={<PrivateRoute allowedRoles={['applicant']} />}>
          <Route path="/dashboard-applicant" element={<DashboardApplicant />} />
          <Route path="/upload-requirements" element={<UploadRequirements />} />
          <Route path="/setup-profile" element={<SetupProfile />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App