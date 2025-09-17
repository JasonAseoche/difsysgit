import { Users, Clock, UserX, UserCheck, ChevronLeft, ChevronRight, Calendar, Filter, X, AlertTriangle, Loader } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../components/HRLayout/AttendanceTracking.css';

const AttendanceTracking = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(selectedDate);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [isMobile, setIsMobile] = useState(false);

  // Ref for managing refresh interval
  const refreshIntervalRef = useRef(null);

  // API base URL - adjust according to your setup
  const API_BASE_URL = 'http://localhost/difsysapi/attendance_api.php';

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
    // Reset to page 1 when switching between mobile and desktop
    setCurrentPage(1);
  }, [isMobile]);

  useEffect(() => {
    // Set initial selected date to current UTC+8 date
    const currentDateUTC8 = getCurrentDateUTC8();
    setSelectedDate(currentDateUTC8);
    setTempDate(currentDateUTC8);
  }, []);

  
   useEffect(() => {
      document.title = "DIFSYS | ATTENDANCE TRACKING";
    }, []);


  useEffect(() => {
    fetchAttendanceRecords();
    
    // Set up automatic refresh every 1 second for real-time updates (silent)
    refreshIntervalRef.current = setInterval(() => {
      fetchAttendanceRecords(true); // Silent refresh
    }, 1000);
    

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [selectedDate]);

  const fetchAttendanceRecords = async (silent = false) => {
    try {
      // Only show loading state for initial load or manual refresh
      if (!silent) {
        setLoading(true);
      }
      
      const response = await axios.get(`${API_BASE_URL}?action=get_attendance_records&limit=1000`);
      if (response.data.success) {
        const formattedRecords = response.data.records
          .filter(record => record.date === selectedDate)
          .map(record => ({
            id: record.id,
            name: `${record.firstName} ${record.lastName}`,
            timeIn: record.time_in ? formatTime(record.time_in) : '--',
            timeOut: record.time_out ? formatTime(record.time_out) : '--',
            totalHours: formatTotalHours(record.total_workhours),
            overtime: formatOvertime(record.overtime),
            status: determineDisplayStatus(record),
            profileImage: record.profile_image,
            shiftType: record.shift_type || 'day' // Add shift type
          }));
        
        // Only update if there are actual changes to prevent unnecessary re-renders
        const currentDataString = JSON.stringify(attendanceData);
        const newDataString = JSON.stringify(formattedRecords);
        
        if (currentDataString !== newDataString) {
          setAttendanceData(formattedRecords);
          setLastUpdateTime(Date.now());
        }
      }
    } catch (error) {
      // Only log errors if not a silent refresh to avoid console spam
      if (!silent) {
        console.error('Error fetching attendance records:', error);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Enhanced status determination function
  const determineDisplayStatus = (record) => {
    // Check if it's weekend first
    const recordDate = new Date(record.date + 'T00:00:00');
    const isWeekendDay = !isWeekday(record.date);
    
    if (isWeekendDay) {
      return 'Weekend';
    }
  
    // If no time_in, employee is absent
    if (!record.time_in) {
      return 'Absent';
    }
  
    // Get shift type from record or default to day
    const shiftType = record.shift_type || 'day';
  
    // Calculate late minutes using the shift type
    const lateMinutes = calculateLateMinutes(record.time_in, shiftType);
    
    // If time_in but no time_out, check current status
    if (record.time_in && !record.time_out) {
      if (lateMinutes > 0) {
        return `Late (${lateMinutes}m)`;
      } else {
        return 'Present';
      }
    }
  
    // If both time_in and time_out exist, determine final status
    if (record.time_in && record.time_out) {
      const overtimeHours = Math.floor((record.overtime || 0) / 60);
      
      // Always check late status first, regardless of API status
      if (overtimeHours > 0 && lateMinutes > 0) {
        return `Late (${lateMinutes}m)`;
      } else if (lateMinutes > 0) {
        return `Late (${lateMinutes}m)`;
      } else if (overtimeHours > 0) {
        return 'Overtime';
      } else {
        return 'Present';
      }
    }
  
    return 'Present';
  };



  const formatTime = (timeStr) => {
    // Create a date object with UTC+8 timezone consideration
    const time = new Date(`2000-01-01 ${timeStr}`);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila' // Use UTC+8 timezone
    });
  };

  const processAbsentEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=process_absent_employees`);
      if (response.data.success) {
        console.log('Absent employees processed:', response.data.message);
        // Refresh the attendance data
        fetchAttendanceRecords();
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

  

  const formatOvertime = (overtimeMinutes) => {
    if (!overtimeMinutes || overtimeMinutes === 0) return '0h 0m';
    const hours = Math.floor(overtimeMinutes / 60);
    // API now only stores full hours, so minutes should always be 0
    return `${hours}h 0m`;
  };

  const formatTotalHours = (totalMinutes, isLate = false) => {
    if (!totalMinutes || totalMinutes === 0) return '0h 0m';
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    // For non-late employees, API ensures static 8 hours + overtime
    // For late employees, show actual reduced hours
    return `${hours}h ${minutes}m`;
  };

  // Function to render employee avatar with profile image or initials (matching SideNav pattern)
  const renderEmployeeAvatar = (employee) => {
    const initials = employee.name.split(' ').map(n => n[0]).join('');
    
    return (
      <div className="attendance-tracking-employee-avatar">
        {employee.profileImage ? (
          <img 
            src={employee.profileImage.startsWith('http') ? employee.profileImage : `http://localhost/difsysapi/${employee.profileImage}`} 
            alt={employee.name}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
        ) : null}
        <span style={{ display: employee.profileImage ? 'none' : 'block' }}>
          {initials}
        </span>
      </div>
    );
  };

  const totalPages = Math.ceil(attendanceData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = attendanceData.slice(startIndex, startIndex + itemsPerPage);

  // Enhanced statistics with new status counting
  const presentCount = attendanceData.filter(emp => 
    emp.status === 'Present' && !isWeekend(selectedDate)
  ).length;
  
  const lateCount = attendanceData.filter(emp => 
    (emp.status.includes('Late')) && !isWeekend(selectedDate)
  ).length;
  
  const absentCount = attendanceData.filter(emp => 
    emp.status === 'Absent' && !isWeekend(selectedDate)
  ).length;
  
  const onLeaveCount = attendanceData.filter(emp => 
    emp.status === 'On Leave' && !emp.isWeekend
  ).length;


  const getStatusIcon = (status) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'present') {
      return <UserCheck className="attendance-tracking-status-icon-small attendance-tracking-present" />;
    } else if (statusLower.includes('late + overtime') || statusLower.includes('late+overtime')) {
      return <Clock className="attendance-tracking-status-icon-small attendance-tracking-late" />;
    } else if (statusLower.includes('late')) {
      return <Clock className="attendance-tracking-status-icon-small attendance-tracking-late" />;
    } else if (statusLower.includes('overtime')) {
      return <Clock className="attendance-tracking-status-icon-small attendance-tracking-overtime" />;
    } else if (statusLower === 'absent') {
      return <UserX className="attendance-tracking-status-icon-small attendance-tracking-absent" />;
    } else if (statusLower === 'on leave') {
      return <Users className="attendance-tracking-status-icon-small attendance-tracking-on-leave" />;
    } else {
      return <Users className="attendance-tracking-status-icon-small" />;
    }
  };

  const getStatusClass = (status) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'present') {
      return 'attendance-tracking-present';
    } else if (statusLower.includes('late + overtime') || statusLower.includes('late+overtime')) {
      return 'attendance-tracking-late-plus-overtime';
    } else if (statusLower.includes('late')) {
      return 'attendance-tracking-late';
    } else if (statusLower.includes('overtime')) {
      return 'attendance-tracking-overtime';
    } else if (statusLower === 'absent') {
      return 'attendance-tracking-absent';
    } else if (statusLower === 'on leave') {
      return 'attendance-tracking-on-leave';
    } else {
      return 'attendance-tracking-default';
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
    setTempDate(selectedDate);
    setShowDatePicker(true);
  };

  const handleDatePickerClose = () => {
    setShowDatePicker(false);
  };

  const handleDatePickerConfirm = () => {
    setSelectedDate(tempDate);
    setShowDatePicker(false);
    setCurrentPage(1);
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Manila' });
    const formatted = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
    
    const isWeekendDay = !isWeekday(dateString);
    return `${dayName}, ${formatted}${isWeekendDay ? ' (Weekend)' : ''}`;
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
      <div className="attendance-tracking-page">
        <div className="attendance-tracking-loading">
          <Loader className="attendance-tracking-loading-spinner"/>
          <p>Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-tracking-page">
      {/* Header Container */}
      <div className="attendance-tracking-header-container">
        <div className="attendance-tracking-header-content">
          <h1 className="attendance-tracking-title">ATTENDANCE TRACKING</h1>
          <div className="attendance-tracking-actions">
            <div className="attendance-tracking-date-picker-box">
              <input
                type="text"
                value={formatDateDisplay(selectedDate)}
                readOnly
                onClick={handleDatePickerOpen}
                style={{ cursor: 'pointer' }}
              />
              <button className="attendance-tracking-date-picker-button" onClick={handleDatePickerOpen}>
                <Calendar size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="attendance-tracking-content">
        {/* Statistics Cards */}
        <div className="attendance-tracking-stats-grid">
          {/* Present Employees Card */}
          <div className="attendance-tracking-stat-card">
            <div className="attendance-tracking-stat-icon attendance-tracking-present">
              <UserCheck size={24} />
            </div>
            <div className="attendance-tracking-stat-content">
              <div className="attendance-tracking-stat-number">{presentCount}</div>
              <div className="attendance-tracking-stat-label">Present Employees</div>
            </div>
          </div>

          {/* Late Employees Card */}
          <div className="attendance-tracking-stat-card">
            <div className="attendance-tracking-stat-icon attendance-tracking-late">
              <Clock size={24} />
            </div>
            <div className="attendance-tracking-stat-content">
              <div className="attendance-tracking-stat-number">{lateCount}</div>
              <div className="attendance-tracking-stat-label">Late Employees</div>
            </div>
          </div>

          {/* Absent Employees Card */}
          <div className="attendance-tracking-stat-card">
            <div className="attendance-tracking-stat-icon attendance-tracking-absent">
              <UserX size={24} />
            </div>
            <div className="attendance-tracking-stat-content">
              <div className="attendance-tracking-stat-number">{absentCount}</div>
              <div className="attendance-tracking-stat-label">Absent Employees</div>
            </div>
          </div>

          {/* On Leave Employees Card */}
          <div className="attendance-tracking-stat-card">
            <div className="attendance-tracking-stat-icon attendance-tracking-on-leave">
              <Users size={24} />
            </div>
            <div className="attendance-tracking-stat-content">
              <div className="attendance-tracking-stat-number">{onLeaveCount}</div>
              <div className="attendance-tracking-stat-label">On Leave Employees</div>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="attendance-tracking-table-container">
          {/* Table Header */}
          <div className="attendance-tracking-table-header1">
            <h2 className="attendance-tracking-table-title">Employee Attendance Records</h2>
          </div>

          {/* Table */}
          <div className="attendance-tracking-table-wrapper">
            <table className="attendance-tracking-table">
              <thead>
                <tr className="attendance-tracking-table-header-row">
                  <th className="attendance-tracking-table-th">EMPLOYEE NAME</th>
                  <th className="attendance-tracking-table-th">DATE</th>
                  <th className="attendance-tracking-table-th">TIME IN</th>
                  <th className="attendance-tracking-table-th">TIME OUT</th>
                  <th className="attendance-tracking-table-th">TOTAL HOURS</th>
                  <th className="attendance-tracking-table-th">OVERTIME</th>
                  <th className="attendance-tracking-table-th">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((employee, index) => (
                  <tr key={employee.id} className="attendance-tracking-table-row">
                    <td className="attendance-tracking-table-td">
                      <div className="attendance-tracking-employee-info">
                        {renderEmployeeAvatar(employee)}
                        <div className="attendance-tracking-employee-details">
                          <span className="attendance-tracking-employee-name">{employee.name}</span>
                          {employee.shiftType && employee.shiftType === 'night' && (
                            <span className="attendance-tracking-shift-badge">Night Shift</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="attendance-tracking-table-td attendance-tracking-date-cell">{formatTableDate(selectedDate)}</td>
                    <td className="attendance-tracking-table-td attendance-tracking-time-cell">{employee.timeIn}</td>
                    <td className="attendance-tracking-table-td attendance-tracking-time-cell">{employee.timeOut}</td>
                    <td className="attendance-tracking-table-td attendance-tracking-total-cell">{employee.totalHours}</td>
                    <td className="attendance-tracking-table-td attendance-tracking-overtime-cell">{employee.overtime}</td>
                    <td className="attendance-tracking-table-td">
                      <span className={`attendance-tracking-status-badge ${getStatusClass(employee.status)}`}>
                        {getStatusIcon(employee.status)}
                        <span className="attendance-tracking-status-text">{employee.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {currentData.length === 0 && (
              <div className="attendance-tracking-no-data">
                <UserX size={48} />
                <h3>No attendance records found</h3>
                <p>No employees have attendance records for this date.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="attendance-tracking-pagination">
              <div className="attendance-tracking-pagination-info">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, attendanceData.length)} of {attendanceData.length} entries
              </div>
              <div className="attendance-tracking-pagination-controls">
                <button 
                  className="attendance-tracking-pagination-btn" 
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
                          className={`attendance-tracking-pagination-btn ${currentPage === i ? 'attendance-tracking-active' : ''}`}
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
                          className={`attendance-tracking-pagination-btn ${currentPage === i ? 'attendance-tracking-active' : ''}`}
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
                  className="attendance-tracking-pagination-btn" 
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
        <div className="attendance-tracking-date-picker-overlay" onClick={handleDatePickerClose}>
          <div className="attendance-tracking-date-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="attendance-tracking-date-picker-header">
              <h3 className="attendance-tracking-date-picker-title">Select Date</h3>
              <button className="attendance-tracking-date-picker-close" onClick={handleDatePickerClose}>
                <X size={20} />
              </button>
            </div>
            <div className="attendance-tracking-date-picker-content">
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                className="attendance-tracking-date-picker-input"
              />
              <div className="attendance-tracking-date-picker-info">
                {!isWeekday(tempDate) && (
                  <div className="attendance-tracking-weekend-warning">
                    <AlertTriangle size={16} />
                    <span>This is a weekend day</span>
                  </div>
                )}
              </div>
              <div className="attendance-tracking-date-picker-actions">
                <button className="attendance-tracking-date-picker-btn attendance-tracking-secondary" onClick={handleDatePickerClose}>
                  Cancel
                </button>
                <button className="attendance-tracking-date-picker-btn attendance-tracking-primary" onClick={handleDatePickerConfirm}>
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

export default AttendanceTracking;