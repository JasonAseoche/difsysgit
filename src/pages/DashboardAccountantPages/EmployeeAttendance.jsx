import { Users, Clock, UserX, UserCheck, ChevronLeft, ChevronRight, Calendar, Filter, X, AlertTriangle, CheckCircle, XCircle, Settings, ChevronDown, User } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../components/AccountantLayout/EmployeeAttendance.css';

// Add CSS for date input groups
const dateInputGroupStyles = `
.employee-attendance-date-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.employee-attendance-date-input-label {
  font-weight: 600;
  color: #2d3748;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
`;

// Inject the styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = dateInputGroupStyles;
  document.head.appendChild(styleElement);
}

const EmployeeAttendance = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempFromDate, setTempFromDate] = useState('');
  const [tempToDate, setTempToDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [isMobile, setIsMobile] = useState(false);
  const [currentView, setCurrentView] = useState('attendance'); // 'attendance' or 'overtime'
  const [manageAllMode, setManageAllMode] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [overtimeData, setOvertimeData] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Pending', 'Approved'
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningAction, setWarningAction] = useState(''); // 'approve' or 'reject'

  // Ref for managing refresh interval
  const refreshIntervalRef = useRef(null);
  const filterRef = useRef(null);

  // API base URLs
  const ATTENDANCE_API_BASE_URL = 'http://localhost/difsysapi/attendance_api.php';
  const PERFORMANCE_API_BASE_URL = 'http://localhost/difsysapi/performance_api.php';

  // Changed to responsive items per page
  const itemsPerPage = isMobile ? 4 : 5;

  const calculateLateMinutes = (timeIn) => {
    if (!timeIn) return 0;
    
    const timeInObj = new Date(`2000-01-01 ${timeIn}`);
    const workStartTime = new Date('2000-01-01 08:00:00'); // 8:00 AM work start
    const graceTime = new Date('2000-01-01 08:10:00'); // 8:10 AM grace period
    
    // If time in is at or before 8:10 AM, not late
    if (timeInObj <= graceTime) {
      return 0;
    }
    
    // Calculate minutes late from 8:00 AM (not from 8:10 AM)
    const lateMinutes = Math.floor((timeInObj - workStartTime) / (1000 * 60));
    
    return lateMinutes;
  };

  // Get current date in UTC+8 timezone
  const getCurrentDateUTC8 = () => {
    const now = new Date();
    // Convert to UTC+8 (Philippines/Singapore/Hong Kong time)
    const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return utc8Time.toISOString().split('T')[0];
  };

  // Check if date is weekday (Monday-Friday)
  const isWeekday = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  };

  const checkIsMobile = () => {
    setIsMobile(window.innerWidth <= 500);
  };

  useEffect(() => {
    // Initial mobile check
    checkIsMobile();
  
    // Add resize listener
    const handleResize = () => {
      checkIsMobile();
    };
  
    window.addEventListener('resize', handleResize);
  
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const checkAndProcessAbsent = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Check if it's exactly 5:00 PM (17:00) on a weekday
      if (currentHour === 17 && currentMinute === 0 && isWeekday(getCurrentDateUTC8())) {
        processAbsentEmployees();
      }
    };
  
    // Check every minute
    const interval = setInterval(checkAndProcessAbsent, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle clicks outside filter dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
            document.title = "DIFSYS | EMPLOYEE ATTENDANCE";
          }, []);

  
  useEffect(() => {
    // Reset to page 1 when switching between mobile and desktop
    setCurrentPage(1);
  }, [isMobile]);

  useEffect(() => {
    // Set initial dates to current UTC+8 date
    const currentDateUTC8 = getCurrentDateUTC8();
    setFromDate(currentDateUTC8);
    setToDate(currentDateUTC8);
    setTempFromDate(currentDateUTC8);
    setTempToDate(currentDateUTC8);
  }, []);

  useEffect(() => {
    if (currentView === 'attendance') {
      fetchPerformanceData();
      
      // Set up automatic refresh every 1 second for real-time updates (silent)
      refreshIntervalRef.current = setInterval(() => {
        fetchPerformanceData(true); // Silent refresh
      }, 1000);
    } else {
      fetchOvertimeRecords();
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fromDate, toDate, currentView]);

  const fetchPerformanceData = async (silent = false) => {
    try {
      // Only show loading state for initial load or manual refresh
      if (!silent) {
        setLoading(true);
      }
      
      // Use from and to dates for API call
      const response = await axios.get(`${PERFORMANCE_API_BASE_URL}?action=get_performance_data&from_date=${fromDate}&to_date=${toDate}`);
      
      if (response.data.success) {
        const processedRecords = await Promise.all((response.data.records || []).map(async (record) => {
          // Fetch employee profile image from useraccounts table
          try {
            const profileResponse = await axios.get(`${ATTENDANCE_API_BASE_URL}?action=get_employee_info&emp_id=${record.emp_id}`);
            
            // Check if it's same date (daily view) or date range (aggregated view)
            const isSameDate = fromDate === toDate;
            
            return {
              id: record.emp_id,
              name: record.employee_name || 'Unknown',
              position: record.position || 'N/A',
              presentDays: record.total_present_days || 0,
              absentDays: record.total_absent_days || 0,
              leaveDays: record.total_leave_days || 0,
              // UPDATE THIS LINE - use the new total_work_hours_minutes field:
              totalHours: formatTotalHours(record.total_work_hours_minutes || 0),
              overtime: formatOvertime(record.total_overtime_minutes || 0),
              lateUndertime: formatLateUndertime(record.total_late_minutes || 0),
              profileImage: profileResponse.data.success ? profileResponse.data.employee.profile_image : null
            };
          } catch (error) {
            console.error('Error fetching profile for employee:', record.emp_id, error);
            return {
              id: record.emp_id,
              name: record.employee_name || 'Unknown',
              position: record.position || 'N/A',
              presentDays: record.total_present_days || 0,
              absentDays: record.total_absent_days || 0,
              leaveDays: record.total_leave_days || 0,
              // UPDATE THIS LINE:
              totalHours: formatTotalHours(record.total_work_hours_minutes || 0),
              overtime: formatOvertime(record.total_overtime_minutes || 0),
              lateUndertime: formatLateUndertime(record.total_late_minutes || 0),
              profileImage: null
            };
          }
        }));

        // Only update if there are actual changes to prevent unnecessary re-renders
        const currentDataString = JSON.stringify(performanceData);
        const newDataString = JSON.stringify(processedRecords);
        
        if (currentDataString !== newDataString) {
          setPerformanceData(processedRecords);
          setSummaryStats(response.data.summary_stats || {});
          setLastUpdateTime(Date.now());
        }
      }
    } catch (error) {
      // Only log errors if not a silent refresh to avoid console spam
      if (!silent) {
        console.error('Error fetching performance data:', error);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchOvertimeRecords = async () => {
    try {
      setLoading(true);
      
      // Mock overtime data with overtime types - replace with actual API call
      const mockOvertimeData = [
        {
          id: 1,
          name: 'John Doe',
          employeeId: 'EMP001',
          position: 'Software Developer',
          department: 'IT Department',
          date: '2024-01-15',
          totalHours: '8h 30m',
          overtime: '2h 30m',
          overtimeType: 'Regular',
          overtimeStatus: 'Pending',
          timeIn: '8:00 AM',
          timeOut: '6:30 PM',
          profileImage: null
        },
        {
          id: 2,
          name: 'Jane Smith',
          employeeId: 'EMP002',
          position: 'Marketing Manager',
          department: 'Marketing',
          date: '2024-01-15',
          totalHours: '9h 0m',
          overtime: '3h 0m',
          overtimeType: 'Holiday',
          overtimeStatus: 'Approved',
          timeIn: '7:30 AM',
          timeOut: '7:30 PM',
          profileImage: null
        },
        {
          id: 3,
          name: 'Mike Johnson',
          employeeId: 'EMP003',
          position: 'Sales Representative',
          department: 'Sales',
          date: '2024-01-15',
          totalHours: '8h 45m',
          overtime: '1h 45m',
          overtimeType: 'Weekend',
          overtimeStatus: 'Pending',
          timeIn: '8:15 AM',
          timeOut: '6:00 PM',
          profileImage: null
        },
        {
          id: 4,
          name: 'Sarah Wilson',
          employeeId: 'EMP004',
          position: 'HR Specialist',
          department: 'Human Resources',
          date: '2024-01-15',
          totalHours: '9h 15m',
          overtime: '2h 15m',
          overtimeType: 'Regular',
          overtimeStatus: 'Approved',
          timeIn: '7:45 AM',
          timeOut: '6:00 PM',
          profileImage: null
        },
        {
          id: 5,
          name: 'David Brown',
          employeeId: 'EMP005',
          position: 'Accountant',
          department: 'Finance',
          date: '2024-01-15',
          totalHours: '8h 30m',
          overtime: '1h 30m',
          overtimeType: 'Holiday',
          overtimeStatus: 'Pending',
          timeIn: '8:00 AM',
          timeOut: '5:30 PM',
          profileImage: null
        }
      ];
      
      setOvertimeData(mockOvertimeData);
    } catch (error) {
      console.error('Error fetching overtime records:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatOvertime = (overtimeMinutes) => {
    if (!overtimeMinutes || overtimeMinutes === 0) return '0h 0m';
    const hours = Math.floor(overtimeMinutes / 60);
    const minutes = overtimeMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatTotalHours = (totalMinutes) => {
    if (!totalMinutes || totalMinutes === 0) return '0h 0m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatLateUndertime = (lateUndertimeMinutes) => {
    if (!lateUndertimeMinutes || lateUndertimeMinutes === 0) return '0m';
    if (lateUndertimeMinutes >= 60) {
      const hours = Math.floor(lateUndertimeMinutes / 60);
      const minutes = lateUndertimeMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${lateUndertimeMinutes}m`;
  };

  // Function to render employee avatar with profile image or initials
  const renderEmployeeAvatar = (employee) => {
    const initials = employee.name.split(' ').map(n => n[0]).join('');
    
    return (
      <div className="employee-attendance-employee-avatar">
        {employee.profileImage ? (
          <img 
            src={employee.profileImage.startsWith('http') ? employee.profileImage : `http://localhost/difsysapi/${employee.profileImage}`} 
            alt={employee.name}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              objectPosition: 'center',
              // High quality image settings
              imageRendering: 'high-quality',
              filter: 'contrast(1.1) brightness(1.05)',
              transition: 'all 0.2s ease'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
            onLoad={(e) => {
              // Ensure high quality rendering
              e.target.style.imageRendering = 'high-quality';
              e.target.style.filter = 'contrast(1.1) brightness(1.05)';
            }}
          />
        ) : null}
        <span style={{ 
          display: employee.profileImage ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {initials}
        </span>
      </div>
    );
  };

  // Handle view switching
  const handleViewChange = (view) => {
    setCurrentView(view);
    setCurrentPage(1);
    setManageAllMode(false);
    setSelectedEmployees([]);
    setFilterStatus('All');
    setShowFilter(false);
  };

  // Handle manage all mode
  const handleManageAllToggle = () => {
    setManageAllMode(!manageAllMode);
    setSelectedEmployees([]);
  };

  // Handle filter toggle
  const handleFilterToggle = () => {
    setShowFilter(!showFilter);
  };

  // Handle filter selection
  const handleFilterSelect = (status) => {
    setFilterStatus(status);
    setShowFilter(false);
    setCurrentPage(1);
  };

  // Filter overtime data based on selected status
  const getFilteredOvertimeData = () => {
    if (filterStatus === 'All') {
      return overtimeData;
    }
    return overtimeData.filter(emp => emp.overtimeStatus === filterStatus);
  };

  // Handle select all employees
  const handleSelectAll = () => {
    const filteredData = getFilteredOvertimeData();
    if (selectedEmployees.length === filteredData.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredData.map(emp => emp.id));
    }
  };

  // Handle individual employee selection
  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Handle bulk actions
  const handleBulkAction = (action) => {
    setWarningAction(action);
    setShowWarning(true);
  };

  // Handle individual manage
  const handleManageIndividual = (employeeId) => {
    const employee = overtimeData.find(emp => emp.id === employeeId);
    setSelectedEmployee(employee);
    setShowEmployeeDetails(true);
  };

  // Handle employee details modal close
  const handleCloseEmployeeDetails = () => {
    setShowEmployeeDetails(false);
    setSelectedEmployee(null);
  };

  // Handle individual employee action from details modal
  const handleEmployeeAction = (action) => {
    console.log(`${action} employee:`, selectedEmployee.id);
    // Backend implementation will go here
    handleCloseEmployeeDetails();
  };

  // Handle warning confirmation
  const handleWarningConfirm = () => {
    console.log(`${warningAction} selected employees:`, selectedEmployees);
    // Backend implementation will go here
    setShowWarning(false);
    setWarningAction('');
    setSelectedEmployees([]);
  };

  // Handle warning cancel
  const handleWarningCancel = () => {
    setShowWarning(false);
    setWarningAction('');
  };

  const processAbsentEmployees = async () => {
    try {
      const response = await axios.get(`${ATTENDANCE_API_BASE_URL}?action=process_absent_employees`);
      if (response.data.success) {
        console.log('Absent employees processed:', response.data.message);
        // Refresh the attendance data
        fetchPerformanceData();
      }
    } catch (error) {
      console.error('Error processing absent employees:', error);
    }
  };

  const isWeekend = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  const filteredOvertimeData = getFilteredOvertimeData();
  const currentData = currentView === 'attendance' 
    ? performanceData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredOvertimeData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPages = Math.ceil(
    (currentView === 'attendance' ? performanceData.length : filteredOvertimeData.length) / itemsPerPage
  );

  // Enhanced statistics with new status counting
  const presentCount = summaryStats.avg_present_days || 0;
  const lateCount = summaryStats.avg_late_days || 0;
  const absentCount = summaryStats.avg_absent_days || 0;
  const onLeaveCount = summaryStats.avg_leave_days || 0;

  const getOvertimeStatusIcon = (status) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'approved') {
      return <CheckCircle className="employee-attendance-status-icon-small employee-attendance-approved" />;
    } else if (statusLower === 'pending') {
      return <Clock className="employee-attendance-status-icon-small employee-attendance-pending" />;
    } else if (statusLower === 'rejected') {
      return <XCircle className="employee-attendance-status-icon-small employee-attendance-rejected" />;
    } else {
      return <Clock className="employee-attendance-status-icon-small employee-attendance-pending" />;
    }
  };

  const getOvertimeStatusClass = (status) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'approved') {
      return 'employee-attendance-approved';
    } else if (statusLower === 'pending') {
      return 'employee-attendance-pending';
    } else if (statusLower === 'rejected') {
      return 'employee-attendance-rejected';
    } else {
      return 'employee-attendance-pending';
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleDatePickerOpen = () => {
    setTempFromDate(fromDate);
    setTempToDate(toDate);
    setShowDatePicker(true);
  };

  const handleDatePickerClose = () => {
    setShowDatePicker(false);
  };

  const handleDatePickerConfirm = () => {
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setShowDatePicker(false);
    setCurrentPage(1);
  };

  const formatDateDisplay = (fromDateString, toDateString) => {
    const fromDate = new Date(fromDateString + 'T00:00:00');
    const toDate = new Date(toDateString + 'T00:00:00');
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'Asia/Manila'
    };
    
    if (fromDateString === toDateString) {
      // Same date - show single date with day name
      const dayName = fromDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Manila' });
      const formatted = fromDate.toLocaleDateString('en-US', options);
      const isWeekendDay = !isWeekday(fromDateString);
      return `${dayName}, ${formatted}${isWeekendDay ? ' (Weekend)' : ''}`;
    } else {
      // Date range - show from date to date
      return `${fromDate.toLocaleDateString('en-US', options)} - ${toDate.toLocaleDateString('en-US', options)}`;
    }
  };

  const formatTableDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila'
    });
  };

  if (loading) {
    return (
      <div className="employee-attendance-page">
        <div className="employee-attendance-loading">
          <div className="employee-attendance-loading-spinner"></div>
          <p>Loading {currentView === 'attendance' ? 'attendance' : 'overtime'} records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-attendance-page">
      {/* Header Container */}
      <div className="employee-attendance-header-container">
        <div className="employee-attendance-header-content">
          <h1 className="employee-attendance-title">
            {currentView === 'attendance' ? 'EMPLOYEE ATTENDANCE' : 'OVERTIME REVIEW'}
          </h1>
          <div className="employee-attendance-actions">
            <div className="employee-attendance-actions-group">
              {currentView === 'attendance' && (
                <>
                  <div className="employee-attendance-date-picker-box">
                    <input
                      type="text"
                      value={formatDateDisplay(fromDate, toDate)}
                      readOnly
                      onClick={handleDatePickerOpen}
                      style={{ cursor: 'pointer' }}
                    />
                    <button className="employee-attendance-date-picker-button" onClick={handleDatePickerOpen}>
                      <Calendar size={16} />
                    </button>
                  </div>
                  <button 
                    className="employee-attendance-overtime-btn"
                    onClick={() => handleViewChange('overtime')}
                  >
                    <Clock size={16} />
                    Overtime Review
                  </button>
                </>
              )}
              {currentView === 'overtime' && (
                <>
                  <div className="employee-attendance-date-picker-box">
                    <input
                      type="text"
                      value={formatDateDisplay(fromDate, toDate)}
                      readOnly
                      onClick={handleDatePickerOpen}
                      style={{ cursor: 'pointer' }}
                    />
                    <button className="employee-attendance-date-picker-button" onClick={handleDatePickerOpen}>
                      <Calendar size={16} />
                    </button>
                  </div>
                  <button 
                    className="employee-attendance-back-btn"
                    onClick={() => handleViewChange('attendance')}
                  >
                    ← Back to Attendance
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="employee-attendance-content">
        {/* Statistics Cards - Only show for attendance view */}
        {currentView === 'attendance' && (
          <div className="employee-attendance-stats-grid">
            {/* Present Employees Card */}
            <div className="employee-attendance-stat-card">
              <div className="employee-attendance-stat-icon employee-attendance-present">
                <UserCheck size={24} />
              </div>
              <div className="employee-attendance-stat-content">
                <div className="employee-attendance-stat-number">{presentCount}</div>
                <div className="employee-attendance-stat-label">Avg. Present Days</div>
              </div>
            </div>

            {/* Late Employees Card */}
            <div className="employee-attendance-stat-card">
              <div className="employee-attendance-stat-icon employee-attendance-late">
                <Clock size={24} />
              </div>
              <div className="employee-attendance-stat-content">
                <div className="employee-attendance-stat-number">{lateCount}</div>
                <div className="employee-attendance-stat-label">Avg. Late Days</div>
              </div>
            </div>

            {/* Absent Employees Card */}
            <div className="employee-attendance-stat-card">
              <div className="employee-attendance-stat-icon employee-attendance-absent">
                <UserX size={24} />
              </div>
              <div className="employee-attendance-stat-content">
                <div className="employee-attendance-stat-number">{absentCount}</div>
                <div className="employee-attendance-stat-label">Avg. Absent Days</div>
              </div>
            </div>

            {/* On Leave Employees Card */}
            <div className="employee-attendance-stat-card">
              <div className="employee-attendance-stat-icon employee-attendance-on-leave">
                <Users size={24} />
              </div>
              <div className="employee-attendance-stat-content">
                <div className="employee-attendance-stat-number">{onLeaveCount}</div>
                <div className="employee-attendance-stat-label">Avg. Leave Days</div>
              </div>
            </div>
          </div>
        )}

        {/* Table Container */}
        <div className="employee-attendance-table-container">
          {/* Table Header */}
          <div className="employee-attendance-table-header1">
            <h2 className="employee-attendance-table-title">
              {currentView === 'attendance' ? 'Employee Attendance Records' : 'Employee Overtime Review'}
            </h2>
            {currentView === 'overtime' && (
              <div className="employee-attendance-table-actions">
                {/* Filter Button */}
                <div className="employee-attendance-filter-container" ref={filterRef} style={{ position: 'relative' }}>
                  <button 
                    className={`employee-attendance-filter-btn ${showFilter ? 'employee-attendance-filter-active' : ''}`}
                    onClick={handleFilterToggle}
                  >
                    <Filter size={16} />
                    {filterStatus}
                    <ChevronDown size={14} />
                  </button>
                  {showFilter && (
                    <div className="employee-attendance-filter-dropdown">
                      <div 
                        className={`employee-attendance-filter-option ${filterStatus === 'All' ? 'employee-attendance-filter-selected' : ''}`}
                        onClick={() => handleFilterSelect('All')}
                      >
                        All
                      </div>
                      <div 
                        className={`employee-attendance-filter-option ${filterStatus === 'Pending' ? 'employee-attendance-filter-selected' : ''}`}
                        onClick={() => handleFilterSelect('Pending')}
                      >
                        <Clock size={14} />
                        Pending
                      </div>
                      <div 
                        className={`employee-attendance-filter-option ${filterStatus === 'Approved' ? 'employee-attendance-filter-selected' : ''}`}
                        onClick={() => handleFilterSelect('Approved')}
                      >
                        <CheckCircle size={14} />
                        Approved
                      </div>
                    </div>
                  )}
                </div>

                {!manageAllMode ? (
                  <button 
                    className="employee-attendance-manage-all-btn"
                    onClick={handleManageAllToggle}
                  >
                    <Settings size={16} />
                    Manage All
                  </button>
                ) : (
                  <div className="employee-attendance-bulk-actions">
                    <button 
                      className="employee-attendance-approve-btn"
                      onClick={() => handleBulkAction('approve')}
                      disabled={selectedEmployees.length === 0}
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                    <button 
                      className="employee-attendance-reject-btn"
                      onClick={() => handleBulkAction('reject')}
                      disabled={selectedEmployees.length === 0}
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                    <button 
                      className="employee-attendance-cancel-btn"
                      onClick={handleManageAllToggle}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="employee-attendance-table-wrapper">
            <table className={`employee-attendance-table ${currentView === 'overtime' ? 'employee-attendance-overtime-table' : ''}`}>
              <thead>
                <tr className="employee-attendance-table-header-row">
                  {currentView === 'overtime' && manageAllMode && (
                    <th className="employee-attendance-table-th employee-attendance-checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.length === filteredOvertimeData.length && filteredOvertimeData.length > 0}
                        onChange={handleSelectAll}
                        className="employee-attendance-checkbox"
                      />
                    </th>
                  )}
                  <th className="employee-attendance-table-th">EMPLOYEE NAME</th>
                    {currentView === 'attendance' ? (
                    <>
                      <th className="employee-attendance-table-th">DATE</th>
                      <th className="employee-attendance-table-th">PRESENT DAYS</th>
                      <th className="employee-attendance-table-th">ABSENT DAYS</th>
                      <th className="employee-attendance-table-th">LATE/UNDERTIME</th>
                      <th className="employee-attendance-table-th">TOTAL HOURS</th>
                      <th className="employee-attendance-table-th">OVERTIME</th>
                      <th className="employee-attendance-table-th">LATE/UNDERTIME</th>
                    </>
                  ) : (
                    <>
                      <th className="employee-attendance-table-th">DATE</th>
                      <th className="employee-attendance-table-th">TOTAL HOURS</th>
                      <th className="employee-attendance-table-th">OVERTIME</th>
                      <th className="employee-attendance-table-th">OVERTIME TYPE</th>
                      <th className="employee-attendance-table-th">OVERTIME STATUS</th>
                      <th className="employee-attendance-table-th">ACTION</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentData.map((employee, index) => (
                  <tr key={employee.id} className="employee-attendance-table-row">
                    {currentView === 'overtime' && manageAllMode && (
                      <td className="employee-attendance-table-td employee-attendance-checkbox-col">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => handleEmployeeSelect(employee.id)}
                          className="employee-attendance-checkbox"
                        />
                      </td>
                    )}
                    <td className="employee-attendance-table-td">
                      <div className="employee-attendance-employee-info">
                        {renderEmployeeAvatar(employee)}
                        <div>
                          <span className="employee-attendance-employee-name">{employee.name}</span>
                          <div style={{ fontSize: '13px', color: '#666' }}>{employee.position || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    {currentView === 'attendance' ? (
                      <>
                        <td className="employee-attendance-table-td employee-attendance-date-cell">
                          {fromDate === toDate ? formatTableDate(fromDate) : `${formatTableDate(fromDate)} - ${formatTableDate(toDate)}`}
                        </td>
                        <td className="employee-attendance-table-td employee-attendance-total-cell">
                          <span className="employee-attendance-status-badge employee-attendance-present">
                            {employee.presentDays} days
                          </span>
                        </td>
                        <td className="employee-attendance-table-td employee-attendance-total-cell">
                          <span className="employee-attendance-status-badge employee-attendance-absent">
                            {employee.absentDays} days
                          </span>
                        </td>
                        <td className="employee-attendance-table-td employee-attendance-total-cell">
                          <span className="employee-attendance-status-badge employee-attendance-on-leave">
                            {employee.leaveDays} days
                          </span>
                        </td>
                        <td className="employee-attendance-table-td employee-attendance-total-cell">{employee.totalHours}</td>
                        <td className="employee-attendance-table-td employee-attendance-overtime-cell">{employee.overtime}</td>
                        <td className="employee-attendance-table-td employee-attendance-overtime-cell">{employee.lateUndertime}</td>
                      </>
                    ) : (
                      <>
                        <td className="employee-attendance-table-td employee-attendance-date-cell">{formatTableDate(employee.date)}</td>
                        <td className="employee-attendance-table-td employee-attendance-total-cell">{employee.totalHours}</td>
                        <td className="employee-attendance-table-td employee-attendance-overtime-cell">{employee.overtime}</td>
                        <td className="employee-attendance-table-td employee-attendance-overtime-type-cell">{employee.overtimeType}</td>
                        <td className="employee-attendance-table-td">
                          <span className={`employee-attendance-status-badge ${getOvertimeStatusClass(employee.overtimeStatus)}`}>
                            {getOvertimeStatusIcon(employee.overtimeStatus)}
                            <span className="employee-attendance-status-text">{employee.overtimeStatus}</span>
                          </span>
                        </td>
                        <td className="employee-attendance-table-td">
                          <button 
                            className="employee-attendance-manage-btn"
                            onClick={() => handleManageIndividual(employee.id)}
                          >
                            <Settings size={14} />
                            Manage
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {currentData.length === 0 && (
              <div className="employee-attendance-no-data">
                <UserX size={48} />
                <h3>No {currentView === 'attendance' ? 'attendance' : 'overtime'} records found</h3>
                <p>No employees have {currentView === 'attendance' ? 'attendance' : 'overtime'} records for this {currentView === 'overtime' && filterStatus !== 'All' ? filterStatus.toLowerCase() + ' ' : ''}date.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="employee-attendance-pagination">
              <div className="employee-attendance-pagination-info">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, currentView === 'attendance' ? performanceData.length : filteredOvertimeData.length)} of {currentView === 'attendance' ? performanceData.length : filteredOvertimeData.length} entries
              </div>
              <div className="employee-attendance-pagination-controls">
                <button 
                  className="employee-attendance-pagination-btn" 
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 5;
                  
                  if (totalPages <= maxVisiblePages) {
                    // Show all pages if 5 or fewer
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(
                        <button
                          key={i}
                          className={`employee-attendance-pagination-btn ${currentPage === i ? 'employee-attendance-active' : ''}`}
                          onClick={() => handlePageChange(i)}
                        >
                          {i}
                        </button>
                      );
                    }
                  } else {
                    // Show sliding window of 5 pages
                    let startPage = Math.max(1, currentPage - 2);
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    // Adjust start if we're near the end
                    if (endPage - startPage < maxVisiblePages - 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          className={`employee-attendance-pagination-btn ${currentPage === i ? 'employee-attendance-active' : ''}`}
                          onClick={() => handlePageChange(i)}
                        >
                          {i}
                        </button>
                      );
                    }
                  }
                  
                  return pages;
                })()}

                <button 
                  className="employee-attendance-pagination-btn" 
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="employee-attendance-date-picker-overlay" onClick={handleDatePickerClose}>
          <div className="employee-attendance-date-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="employee-attendance-date-picker-header">
              <h3 className="employee-attendance-date-picker-title">Select Date Range</h3>
              <button className="employee-attendance-date-picker-close" onClick={handleDatePickerClose}>
                <X size={20} />
              </button>
            </div>
            <div className="employee-attendance-date-picker-content">
              <div className="employee-attendance-date-input-group">
                <label className="employee-attendance-date-input-label">From Date</label>
                <input
                  type="date"
                  value={tempFromDate}
                  onChange={(e) => setTempFromDate(e.target.value)}
                  className="employee-attendance-date-picker-input"
                  max={tempToDate}
                />
              </div>
              <div className="employee-attendance-date-input-group">
                <label className="employee-attendance-date-input-label">To Date</label>
                <input
                  type="date"
                  value={tempToDate}
                  onChange={(e) => setTempToDate(e.target.value)}
                  className="employee-attendance-date-picker-input"
                  min={tempFromDate}
                />
              </div>
              <div className="employee-attendance-date-picker-info">
                {tempFromDate === tempToDate && !isWeekday(tempFromDate) && (
                  <div className="employee-attendance-weekend-warning">
                    <AlertTriangle size={16} />
                    <span>This is a weekend day</span>
                  </div>
                )}
                {tempFromDate === tempToDate && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    Same date selected - showing daily records
                  </div>
                )}
                {tempFromDate !== tempToDate && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    Date range selected - showing aggregated totals
                  </div>
                )}
              </div>
              <div className="employee-attendance-date-picker-actions">
                <button className="employee-attendance-date-picker-btn employee-attendance-secondary" onClick={handleDatePickerClose}>
                  Cancel
                </button>
                <button className="employee-attendance-date-picker-btn employee-attendance-primary" onClick={handleDatePickerConfirm}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {showEmployeeDetails && selectedEmployee && (
        <div className="employee-attendance-details-overlay" onClick={handleCloseEmployeeDetails}>
          <div className="employee-attendance-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="employee-attendance-details-header">
              <h3 className="employee-attendance-details-title">
                <User size={24} />
                Employee Details
              </h3>
              <button className="employee-attendance-details-close" onClick={handleCloseEmployeeDetails}>
                <X size={20} />
              </button>
            </div>
            
            <div className="employee-attendance-details-content">
              {/* Employee Info */}
              <div className="employee-attendance-details-employee">
                {renderEmployeeAvatar(selectedEmployee)}
                <div className="employee-attendance-details-info">
                  <h4 className="employee-attendance-details-name">{selectedEmployee.name}</h4>
                  <p className="employee-attendance-details-role">{selectedEmployee.position} • {selectedEmployee.department}</p>
                </div>
              </div>

              {/* Details Fields */}
              <div className="employee-attendance-details-grid">
                <div className="employee-attendance-details-field">
                  <div className="employee-attendance-details-label">Employee ID</div>
                  <div className="employee-attendance-details-value">{selectedEmployee.employeeId}</div>
                </div>
                
                <div className="employee-attendance-details-field">
                  <div className="employee-attendance-details-label">Date</div>
                  <div className="employee-attendance-details-value">{formatTableDate(selectedEmployee.date)}</div>
                </div>

                <div className="employee-attendance-details-field">
                  <div className="employee-attendance-details-label">Time In</div>
                  <div className="employee-attendance-details-value">{selectedEmployee.timeIn}</div>
                </div>

                <div className="employee-attendance-details-field">
                  <div className="employee-attendance-details-label">Time Out</div>
                  <div className="employee-attendance-details-value">{selectedEmployee.timeOut}</div>
                </div>

                <div className="employee-attendance-details-field">
                  <div className="employee-attendance-details-label">Total Hours</div>
                  <div className="employee-attendance-details-value">{selectedEmployee.totalHours}</div>
                </div>

                <div className="employee-attendance-details-field">
                  <div className="employee-attendance-details-label">Overtime Hours</div>
                  <div className="employee-attendance-details-value">{selectedEmployee.overtime}</div>
                </div>

                <div className="employee-attendance-details-field">
                  <div className="employee-attendance-details-label">Overtime Type</div>
                  <div className="employee-attendance-details-value">{selectedEmployee.overtimeType}</div>
                </div>

                <div className="employee-attendance-details-field">
                  <div className="employee-attendance-details-label">Status</div>
                  <div className="employee-attendance-details-value">
                    <div className="employee-attendance-details-status-value">
                      {getOvertimeStatusIcon(selectedEmployee.overtimeStatus)}
                      {selectedEmployee.overtimeStatus}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="employee-attendance-details-actions">
              <button 
                className="employee-attendance-details-btn employee-attendance-cancel"
                onClick={handleCloseEmployeeDetails}
              >
                Cancel
              </button>
              {selectedEmployee.overtimeStatus === 'Pending' && (
                <>
                  <button 
                    className="employee-attendance-details-btn employee-attendance-reject"
                    onClick={() => handleEmployeeAction('reject')}
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                  <button 
                    className="employee-attendance-details-btn employee-attendance-approve"
                    onClick={() => handleEmployeeAction('approve')}
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarning && (
        <div className="employee-attendance-warning-overlay" onClick={handleWarningCancel}>
          <div className="employee-attendance-warning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="employee-attendance-warning-header">
              <div className="employee-attendance-warning-icon">
                <AlertTriangle size={32} />
              </div>
              <h3 className="employee-attendance-warning-title">
                Confirm {warningAction === 'approve' ? 'Approval' : 'Rejection'}
              </h3>
              <p className="employee-attendance-warning-message">
                Are you sure you want to {warningAction} overtime for the selected employees? This action cannot be undone.
              </p>
              <div className="employee-attendance-warning-count">
                {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
              </div>
            </div>
            
            <div className="employee-attendance-warning-actions">
              <button 
                className="employee-attendance-warning-btn employee-attendance-cancel-warning"
                onClick={handleWarningCancel}
              >
                Cancel
              </button>
              <button 
                className={`employee-attendance-warning-btn employee-attendance-confirm ${warningAction === 'approve' ? 'employee-attendance-approve-action' : ''}`}
                onClick={handleWarningConfirm}
              >
                {warningAction === 'approve' ? (
                  <>
                    <CheckCircle size={16} />
                    Yes, Approve
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Yes, Reject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendance;