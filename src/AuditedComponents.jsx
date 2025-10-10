// components/AuditedComponents.js - Copy this EXACT file to your project
import { withAuditTrail } from './utils/auditlogger.jsx';

// Import all your original components (update paths if needed)
import MainPage from './pages/Landing';
import ApplyNow from './pages/ApplyNow';
import SignUp from './pages/SignUp';
import LogIn from './pages/LogIn';
import Profile from './components/ProfileAccount/Profile';
import EmailVerification from './components/Verification/EmailVerification';
import ChangePassword from './components/Password/ChangePassword.jsx';
import ManageFingeprint from './pages/DashboardAdminPages/ManageFingerprint.jsx';
import About from './pages/DashboardAdminPages/About';
import TestAttendance from './pages/DashboardAdminPages/TestAttendance';
import Dashboard from './pages/DashboardAdminPages/DashboardAdmin';
import ManageAccounts from './pages/DashboardAdminPages/ManageAccounts';
import Notifications from './components/Notifications.jsx/Notifications.jsx';
import DemoAttendance from './pages/DashboardAdminPages/DemoAttendance.jsx';

import DashboardHR from './pages/DashboardHRPages/DashboardHR';
import ManageEmployee from './pages/DashboardHRPages/ManageEmployee';
import AttendanceTracking from './pages/DashboardHRPages/AttendanceTracking';
import PerformanceEvaluation from './pages/DashboardHRPages/PerformanceEvaluation';
import LeaveManagement from './pages/DashboardHRPages/LeaveManagement';
import ApplicantsTracking from './pages/DashboardHRPages/ApplicantsTracking';
import ManageExamination from './pages/DashboardHRPages/ManageExamination';
import ManageRelation from './pages/DashboardHRPages/ManageRelation';
import ManageHiring from './pages/DashboardHRPages/ManageHiring';
import ManageDepartment from './pages/DashboardHRPages/ManageDepartment';
import ManageEvents from './pages/DashboardHRPages/ManageEvents';
import EAProfile from './components/EAProfile/EAProfile';

import DashboardAccountant from './pages/DashboardAccountantPages/DashboardAccountant';
import PayrollAccount from './pages/DashboardAccountantPages/PayrollAccount';
import GeneratePayroll from './pages/DashboardAccountantPages/GeneratePayroll';
import ManagePayroll from './pages/DashboardAccountantPages/ManagePayroll';
import Benefits from './pages/DashboardAccountantPages/Benefits';
import EmployeeAttendance from './pages/DashboardAccountantPages/EmployeeAttendance';

import DashboardEmployee from './pages/DashboardEmployeePages/DashboardEmployee';
import Attendance from './pages/DashboardEmployeePages/Attendance';
import ManageDocuments from './pages/DashboardEmployeePages/ManageDocuments';
import MyPayroll from './pages/DashboardEmployeePages/MyPayroll';
import TimeKeeping from './pages/DashboardEmployeePages/TimeKeeping';
import FileInquiries from './pages/DashboardEmployeePages/FileInquiries';
import EmPersonal from './pages/DashboardHRPages/EMPersonal';
import EmpDetails from './pages/DashboardHRPages/EmpDetails';
import EmpAttHistory from './pages/DashboardHRPages/EmpAttHistory';
import EmpDocuments from './pages/DashboardHRPages/EmpDocuments';
import EADetails from './components/EAProfile/EADetails';
import OvertimeRequest from './pages/DashboardEmployeePages/OvertimeRequest.jsx';

import DashboardApplicant from './pages/DashboardApplicantPages/DashboardApplicant';
import UploadRequirements from './pages/DashboardApplicantPages/UploadRequirements';
import SetupProfile from './pages/DashboardApplicantPages/SetupProfile';
import TakeExam from './pages/DashboardApplicantPages/TakeExam';
import UploadResume from './pages/DashboardApplicantPages/UploadResume';

import DashboardSupervisor from './pages/DashboardSupervisorPages/DashboardSupervisor';
import TeamManagement from './pages/DashboardSupervisorPages/TeamManagement';
import SupervisorAttendance from './pages/DashboardSupervisorPages/SupervisorAttendance';
import PerformanceReview from './pages/DashboardSupervisorPages/PerformanceReview';
import LeaveApproval from './pages/DashboardSupervisorPages/LeaveApproval';
import Reports from './pages/DashboardSupervisorPages/Reports';

import Unauthorized from './pages/Unauthorized';

// Export audited versions - use these in your routes
export const AuditedMainPage = withAuditTrail(MainPage, 'MainPage');
export const AuditedApplyNow = withAuditTrail(ApplyNow, 'ApplyNow');
export const AuditedSignUp = withAuditTrail(SignUp, 'SignUp');
export const AuditedLogIn = withAuditTrail(LogIn, 'LogIn');
export const AuditedProfile = withAuditTrail(Profile, 'Profile');
export const AuditedEmailVerification = withAuditTrail(EmailVerification, 'EmailVerification');
export const AuditedChangePassword = withAuditTrail(ChangePassword, 'ChangePassword');
export const AuditedNotifications = withAuditTrail(Notifications, 'Notifications');

// Admin components
export const AuditedDashboard = withAuditTrail(Dashboard, 'DashboardAdmin');
export const AuditedManageAccounts = withAuditTrail(ManageAccounts, 'ManageAccounts');
export const AuditedManageFingeprint = withAuditTrail(ManageFingeprint, 'ManageFingeprint');
export const AuditedTestAttendance = withAuditTrail(TestAttendance, 'TestAttendance');
export const AuditedDemoAttendance = withAuditTrail(DemoAttendance, 'DemoAttendance');
export const AuditedAbout = withAuditTrail(About, 'About');

// HR components
export const AuditedDashboardHR = withAuditTrail(DashboardHR, 'DashboardHR');
export const AuditedManageEmployee = withAuditTrail(ManageEmployee, 'ManageEmployee');
export const AuditedAttendanceTracking = withAuditTrail(AttendanceTracking, 'AttendanceTracking');
export const AuditedPerformanceEvaluation = withAuditTrail(PerformanceEvaluation, 'PerformanceEvaluation');
export const AuditedLeaveManagement = withAuditTrail(LeaveManagement, 'LeaveManagement');
export const AuditedApplicantsTracking = withAuditTrail(ApplicantsTracking, 'ApplicantsTracking');
export const AuditedManageExamination = withAuditTrail(ManageExamination, 'ManageExamination');
export const AuditedManageRelation = withAuditTrail(ManageRelation, 'ManageRelation');
export const AuditedManageHiring = withAuditTrail(ManageHiring, 'ManageHiring');
export const AuditedManageDepartment = withAuditTrail(ManageDepartment, 'ManageDepartment');
export const AuditedManageEvents = withAuditTrail(ManageEvents, 'ManageEvents');
export const AuditedEmPersonal = withAuditTrail(EmPersonal, 'EmPersonal');
export const AuditedEmpDetails = withAuditTrail(EmpDetails, 'EmpDetails');
export const AuditedEmpAttHistory = withAuditTrail(EmpAttHistory, 'EmpAttHistory');
export const AuditedEmpDocuments = withAuditTrail(EmpDocuments, 'EmpDocuments');

// Accountant components
export const AuditedDashboardAccountant = withAuditTrail(DashboardAccountant, 'DashboardAccountant');
export const AuditedPayrollAccount = withAuditTrail(PayrollAccount, 'PayrollAccount');
export const AuditedGeneratePayroll = withAuditTrail(GeneratePayroll, 'GeneratePayroll');
export const AuditedManagePayroll = withAuditTrail(ManagePayroll, 'ManagePayroll');
export const AuditedBenefits = withAuditTrail(Benefits, 'Benefits');
export const AuditedEmployeeAttendance = withAuditTrail(EmployeeAttendance, 'EmployeeAttendance');

// Employee components
export const AuditedDashboardEmployee = withAuditTrail(DashboardEmployee, 'DashboardEmployee');
export const AuditedAttendance = withAuditTrail(Attendance, 'Attendance');
export const AuditedManageDocuments = withAuditTrail(ManageDocuments, 'ManageDocuments');
export const AuditedMyPayroll = withAuditTrail(MyPayroll, 'MyPayroll');
export const AuditedTimeKeeping = withAuditTrail(TimeKeeping, 'TimeKeeping');
export const AuditedFileInquiries = withAuditTrail(FileInquiries, 'FileInquiries');
export const AuditedOvertimeRequest = withAuditTrail(OvertimeRequest, 'OvertimeRequest');

// Applicant components
export const AuditedDashboardApplicant = withAuditTrail(DashboardApplicant, 'DashboardApplicant');
export const AuditedUploadRequirements = withAuditTrail(UploadRequirements, 'UploadRequirements');
export const AuditedSetupProfile = withAuditTrail(SetupProfile, 'SetupProfile');
export const AuditedTakeExam = withAuditTrail(TakeExam, 'TakeExam');
export const AuditedUploadResume = withAuditTrail(UploadResume, 'UploadResume');

// Supervisor components
export const AuditedDashboardSupervisor = withAuditTrail(DashboardSupervisor, 'DashboardSupervisor');
export const AuditedTeamManagement = withAuditTrail(TeamManagement, 'TeamManagement');
export const AuditedSupervisorAttendance = withAuditTrail(SupervisorAttendance, 'SupervisorAttendance');
export const AuditedPerformanceReview = withAuditTrail(PerformanceReview, 'PerformanceReview');
export const AuditedLeaveApproval = withAuditTrail(LeaveApproval, 'LeaveApproval');
export const AuditedReports = withAuditTrail(Reports, 'Reports');

// Profile components
export const AuditedEAProfile = withAuditTrail(EAProfile, 'EAProfile');
export const AuditedEADetails = withAuditTrail(EADetails, 'EADetails');

// Keep original for non-critical components
export { Unauthorized };