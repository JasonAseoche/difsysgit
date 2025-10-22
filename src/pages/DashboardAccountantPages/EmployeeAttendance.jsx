import { Users, Clock, UserX, UserCheck, ChevronLeft, ChevronRight, Calendar, X, AlertTriangle } from 'lucide-react';
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

  // Ref for managing refresh interval
  const refreshIntervalRef = useRef(null);

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
    fetchPerformanceData();
    
    // Set up automatic refresh every 1 second for real-time updates (silent)
    refreshIntervalRef.current = setInterval(() => {
      fetchPerformanceData(true); // Silent refresh
    }, 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fromDate, toDate]);

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
            
            return {
              id: record.emp_id,
              name: record.employee_name || 'Unknown',
              position: record.position || 'N/A',
              presentDays: record.total_present_days || 0,
              absentDays: record.total_absent_days || 0,
              leaveDays: record.total_leave_days || 0,
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

  const currentData = performanceData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(performanceData.length / itemsPerPage);

  // Enhanced statistics with new status counting
  const presentCount = summaryStats.avg_present_days || 0;
  const lateCount = summaryStats.avg_late_days || 0;
  const absentCount = summaryStats.avg_absent_days || 0;
  const onLeaveCount = summaryStats.avg_leave_days || 0;

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
          <p>Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-attendance-page">
      {/* Header Container */}
      <div className="employee-attendance-header-container">
        <div className="employee-attendance-header-content">
          <h1 className="employee-attendance-title">EMPLOYEE ATTENDANCE</h1>
          <div className="employee-attendance-actions">
            <div className="employee-attendance-actions-group">
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
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="employee-attendance-content">
        {/* Statistics Cards */}
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

        {/* Table Container */}
        <div className="employee-attendance-table-container">
          {/* Table Header */}
          <div className="employee-attendance-table-header1">
            <h2 className="employee-attendance-table-title">Employee Attendance Records</h2>
          </div>

          {/* Table */}
          <div className="employee-attendance-table-wrapper">
            <table className="employee-attendance-table">
              <thead>
                <tr className="employee-attendance-table-header-row">
                  <th className="employee-attendance-table-th">EMPLOYEE NAME</th>
                  <th className="employee-attendance-table-th">DATE</th>
                  <th className="employee-attendance-table-th">PRESENT DAYS</th>
                  <th className="employee-attendance-table-th">ABSENT DAYS</th>
                  <th className="employee-attendance-table-th">LEAVE DAYS</th>
                  <th className="employee-attendance-table-th">TOTAL HOURS</th>
                  <th className="employee-attendance-table-th">OVERTIME</th>
                  <th className="employee-attendance-table-th">LATE/UNDERTIME</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((employee, index) => (
                  <tr key={employee.id} className="employee-attendance-table-row">
                    <td className="employee-attendance-table-td">
                      <div className="employee-attendance-employee-info">
                        {renderEmployeeAvatar(employee)}
                        <div>
                          <span className="employee-attendance-employee-name">{employee.name}</span>
                          <div style={{ fontSize: '13px', color: '#666' }}>{employee.position || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>

            {currentData.length === 0 && (
              <div className="employee-attendance-no-data">
                <UserX size={48} />
                <h3>No attendance records found</h3>
                <p>No employees have attendance records for this date.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="employee-attendance-pagination">
              <div className="employee-attendance-pagination-info">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, performanceData.length)} of {performanceData.length} entries
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
    </div>
  );
};

export default EmployeeAttendance;