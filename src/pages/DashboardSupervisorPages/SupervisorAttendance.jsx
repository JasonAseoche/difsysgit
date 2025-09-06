import { Users, Clock, UserX, UserCheck, ChevronLeft, ChevronRight, Calendar, Filter, X, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../components/SupervisorLayout/SupervisorAttendance.css'

const SupervisorAttendance = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(selectedDate);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [isMobile, setIsMobile] = useState(false);
  const [supervisorInfo, setSupervisorInfo] = useState(null);
  const [statistics, setStatistics] = useState({
    present_count: 0,
    late_count: 0,
    absent_count: 0,
    on_leave_count: 0
  });

  // Ref for managing refresh interval
  const refreshIntervalRef = useRef(null);

  // API base URL - adjust according to your setup
  const API_BASE_URL = 'http://localhost/difsysapi/team_attendance.php';

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
    document.title = "DIFSYS | TEAM ATTENDANCE";
  }, []);

  useEffect(() => {
    fetchTeamAttendanceRecords();
    
    // Set up automatic refresh every 1 second for real-time updates (silent)
    refreshIntervalRef.current = setInterval(() => {
      fetchTeamAttendanceRecords(true); // Silent refresh
    }, 1000);
    

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [selectedDate]);

  const fetchTeamAttendanceRecords = async (silent = false) => {
    try {
      // Only show loading state for initial load or manual refresh
      if (!silent) {
        setLoading(true);
      }
      
      // Get supervisor ID from localStorage
      const supervisorId = localStorage.getItem('userId') || localStorage.getItem('sup_id');
      
      if (!supervisorId) {
        console.error('No supervisor ID found in localStorage');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}`, {
        params: {
          supervisor_id: supervisorId,
          date: selectedDate,
          limit: 100
        }
      });

      if (response.data.success) {
        const formattedRecords = response.data.records.map(record => {
          return {
            id: record.id,
            name: `${record.firstName} ${record.lastName}`,
            timeIn: record.time_in ? formatTime(record.time_in) : '--',
            timeOut: record.time_out ? formatTime(record.time_out) : '--',
            totalHours: formatTotalHours(record.total_workhours),
            overtime: formatOvertime(record.overtime),
            status: determineDisplayStatus(record),
            profileImage: record.profile_image,
            shiftType: record.shift_type || 'day' // Add shift type
          };
        });
        
        // Only update if there are actual changes to prevent unnecessary re-renders
        const currentDataString = JSON.stringify(attendanceData);
        const newDataString = JSON.stringify(formattedRecords);
        
        if (currentDataString !== newDataString) {
          setAttendanceData(formattedRecords);
          setLastUpdateTime(Date.now());
        }

        // Update supervisor info and statistics
        if (response.data.supervisor_info) {
          setSupervisorInfo(response.data.supervisor_info);
        }
        
        if (response.data.statistics) {
          setStatistics(response.data.statistics);
        }
      }
    } catch (error) {
      // Only log errors if not a silent refresh to avoid console spam
      if (!silent) {
        console.error('Error fetching team attendance records:', error);
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
      <div className="supervisor-attendance-employee-avatar">
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
              if (e.target.nextSibling) {
                e.target.nextSibling.style.display = 'block';
              }
            }}
            onLoad={() => {
              // Image loaded successfully
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

  // Enhanced statistics with new status counting using API statistics
  const presentCount = statistics.present_count || 0;
  const lateCount = statistics.late_count || 0;
  const absentCount = statistics.absent_count || 0;
  const onLeaveCount = statistics.on_leave_count || 0;

  const getStatusIcon = (status) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'present') {
      return <UserCheck className="supervisor-attendance-status-icon-small supervisor-attendance-present" />;
    } else if (statusLower.includes('late + overtime') || statusLower.includes('late+overtime')) {
      return <Clock className="supervisor-attendance-status-icon-small supervisor-attendance-late" />;
    } else if (statusLower.includes('late')) {
      return <Clock className="supervisor-attendance-status-icon-small supervisor-attendance-late" />;
    } else if (statusLower.includes('overtime')) {
      return <Clock className="supervisor-attendance-status-icon-small supervisor-attendance-overtime" />;
    } else if (statusLower === 'absent') {
      return <UserX className="supervisor-attendance-status-icon-small supervisor-attendance-absent" />;
    } else if (statusLower === 'on leave') {
      return <Users className="supervisor-attendance-status-icon-small supervisor-attendance-on-leave" />;
    } else {
      return <Users className="supervisor-attendance-status-icon-small" />;
    }
  };

  const getStatusClass = (status) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'present') {
      return 'supervisor-attendance-present';
    } else if (statusLower.includes('late + overtime') || statusLower.includes('late+overtime')) {
      return 'supervisor-attendance-late-plus-overtime';
    } else if (statusLower.includes('late')) {
      return 'supervisor-attendance-late';
    } else if (statusLower.includes('overtime')) {
      return 'supervisor-attendance-overtime';
    } else if (statusLower === 'absent') {
      return 'supervisor-attendance-absent';
    } else if (statusLower === 'on leave') {
      return 'supervisor-attendance-on-leave';
    } else {
      return 'supervisor-attendance-default';
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
      <div className="supervisor-attendance-page">
        <div className="supervisor-attendance-loading">
          <div className="supervisor-attendance-loading-spinner"></div>
          <p>Loading team attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="supervisor-attendance-page">
      {/* Header Container */}
      <div className="supervisor-attendance-header-container">
        <div className="supervisor-attendance-header-content">
          <div className="supervisor-attendance-title-section">
            <h1 className="supervisor-attendance-title">TEAM ATTENDANCE</h1>
            {supervisorInfo && (
              <p className="supervisor-attendance-subtitle">
                {supervisorInfo.department_name} • {supervisorInfo.supervisor_name}
              </p>
            )}
          </div>
          <div className="supervisor-attendance-actions">
            <div className="supervisor-attendance-date-picker-box">
              <input
                type="text"
                value={formatDateDisplay(selectedDate)}
                readOnly
                onClick={handleDatePickerOpen}
                style={{ cursor: 'pointer' }}
              />
              <button className="supervisor-attendance-date-picker-button" onClick={handleDatePickerOpen}>
                <Calendar size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="supervisor-attendance-content">
        {/* Statistics Cards */}
        <div className="supervisor-attendance-stats-grid">
          {/* Present Employees Card */}
          <div className="supervisor-attendance-stat-card">
            <div className="supervisor-attendance-stat-icon supervisor-attendance-present">
              <UserCheck size={24} />
            </div>
            <div className="supervisor-attendance-stat-content">
              <div className="supervisor-attendance-stat-number">{presentCount}</div>
              <div className="supervisor-attendance-stat-label">Present Employees</div>
            </div>
          </div>

          {/* Late Employees Card */}
          <div className="supervisor-attendance-stat-card">
            <div className="supervisor-attendance-stat-icon supervisor-attendance-late">
              <Clock size={24} />
            </div>
            <div className="supervisor-attendance-stat-content">
              <div className="supervisor-attendance-stat-number">{lateCount}</div>
              <div className="supervisor-attendance-stat-label">Late Employees</div>
            </div>
          </div>

          {/* Absent Employees Card */}
          <div className="supervisor-attendance-stat-card">
            <div className="supervisor-attendance-stat-icon supervisor-attendance-absent">
              <UserX size={24} />
            </div>
            <div className="supervisor-attendance-stat-content">
              <div className="supervisor-attendance-stat-number">{absentCount}</div>
              <div className="supervisor-attendance-stat-label">Absent Employees</div>
            </div>
          </div>

          {/* On Leave Employees Card */}
          <div className="supervisor-attendance-stat-card">
            <div className="supervisor-attendance-stat-icon supervisor-attendance-on-leave">
              <Users size={24} />
            </div>
            <div className="supervisor-attendance-stat-content">
              <div className="supervisor-attendance-stat-number">{onLeaveCount}</div>
              <div className="supervisor-attendance-stat-label">On Leave Employees</div>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="supervisor-attendance-table-container">
          {/* Table Header */}
          <div className="supervisor-attendance-table-header1">
            <h2 className="supervisor-attendance-table-title">Team Member Attendance Records</h2>
          </div>

          {/* Table */}
          <div className="supervisor-attendance-table-wrapper">
            <table className="supervisor-attendance-table">
              <thead>
                <tr className="supervisor-attendance-table-header-row">
                  <th className="supervisor-attendance-table-th">EMPLOYEE NAME</th>
                  <th className="supervisor-attendance-table-th">DATE</th>
                  <th className="supervisor-attendance-table-th">TIME IN</th>
                  <th className="supervisor-attendance-table-th">TIME OUT</th>
                  <th className="supervisor-attendance-table-th">TOTAL HOURS</th>
                  <th className="supervisor-attendance-table-th">OVERTIME</th>
                  <th className="supervisor-attendance-table-th">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((employee, index) => (
                  <tr key={employee.id} className="supervisor-attendance-table-row">
                    <td className="supervisor-attendance-table-td">
                      <div className="supervisor-attendance-employee-info">
                        {renderEmployeeAvatar(employee)}
                        <div className="supervisor-attendance-employee-details">
                          <span className="supervisor-attendance-employee-name">{employee.name}</span>
                          {employee.shiftType && employee.shiftType === 'night' && (
                            <span className="supervisor-attendance-shift-badge">Night Shift</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="supervisor-attendance-table-td supervisor-attendance-date-cell">{formatTableDate(selectedDate)}</td>
                    <td className="supervisor-attendance-table-td supervisor-attendance-time-cell">{employee.timeIn}</td>
                    <td className="supervisor-attendance-table-td supervisor-attendance-time-cell">{employee.timeOut}</td>
                    <td className="supervisor-attendance-table-td supervisor-attendance-total-cell">{employee.totalHours}</td>
                    <td className="supervisor-attendance-table-td supervisor-attendance-overtime-cell">{employee.overtime}</td>
                    <td className="supervisor-attendance-table-td">
                      <span className={`supervisor-attendance-status-badge ${getStatusClass(employee.status)}`}>
                        {getStatusIcon(employee.status)}
                        <span className="supervisor-attendance-status-text">{employee.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {currentData.length === 0 && (
              <div className="supervisor-attendance-no-data">
                <UserX size={48} />
                <h3>No team attendance records found</h3>
                <p>No team members have attendance records for this date.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="supervisor-attendance-pagination">
              <div className="supervisor-attendance-pagination-info">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, attendanceData.length)} of {attendanceData.length} entries
              </div>
              <div className="supervisor-attendance-pagination-controls">
                <button 
                  className="supervisor-attendance-pagination-btn" 
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
                          className={`supervisor-attendance-pagination-btn ${currentPage === i ? 'supervisor-attendance-active' : ''}`}
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
                          className={`supervisor-attendance-pagination-btn ${currentPage === i ? 'supervisor-attendance-active' : ''}`}
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
                  className="supervisor-attendance-pagination-btn" 
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
        <div className="supervisor-attendance-date-picker-overlay" onClick={handleDatePickerClose}>
          <div className="supervisor-attendance-date-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="supervisor-attendance-date-picker-header">
              <h3 className="supervisor-attendance-date-picker-title">Select Date</h3>
              <button className="supervisor-attendance-date-picker-close" onClick={handleDatePickerClose}>
                <X size={20} />
              </button>
            </div>
            <div className="supervisor-attendance-date-picker-content">
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                className="supervisor-attendance-date-picker-input"
              />
              <div className="supervisor-attendance-date-picker-info">
                {!isWeekday(tempDate) && (
                  <div className="supervisor-attendance-weekend-warning">
                    <AlertTriangle size={16} />
                    <span>This is a weekend day</span>
                  </div>
                )}
              </div>
              <div className="supervisor-attendance-date-picker-actions">
                <button className="supervisor-attendance-date-picker-btn supervisor-attendance-secondary" onClick={handleDatePickerClose}>
                  Cancel
                </button>
                <button className="supervisor-attendance-date-picker-btn supervisor-attendance-primary" onClick={handleDatePickerConfirm}>
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

export default SupervisorAttendance;