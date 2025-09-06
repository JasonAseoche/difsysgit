import { Users, Clock, UserX, UserCheck, ChevronLeft, ChevronRight, Calendar, X, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../components/SupervisorLayout/PerformanceReview.css';

const PerformanceReview = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempFromDate, setTempFromDate] = useState('');
  const [tempToDate, setTempToDate] = useState('');
  const [performanceData, setPerformanceData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [isMobile, setIsMobile] = useState(false);

  // Ref for managing refresh interval
  const refreshIntervalRef = useRef(null);

  // API base URLs
  const TEAM_ATTENDANCE_API_BASE_URL = 'http://localhost/difsysapi/team_attendance.php';
  const PERFORMANCE_API_BASE_URL = 'http://localhost/difsysapi/performance_api.php';

  // Changed to responsive items per page
  const itemsPerPage = isMobile ? 4 : 5;

  // Get current date in UTC+8 timezone
  const getCurrentDateUTC8 = () => {
    const now = new Date();
    const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return utc8Time.toISOString().split('T')[0];
  };

  // Check if date is weekday (Monday-Friday)
  const isWeekday = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  };

  const checkIsMobile = () => {
    setIsMobile(window.innerWidth <= 500);
  };

  useEffect(() => {
    checkIsMobile();
    const handleResize = () => {
      checkIsMobile();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    document.title = "DIFSYS | PERFORMANCE REVIEW";
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [isMobile]);

  useEffect(() => {
    const currentDateUTC8 = getCurrentDateUTC8();
    setFromDate(currentDateUTC8);
    setToDate(currentDateUTC8);
    setTempFromDate(currentDateUTC8);
    setTempToDate(currentDateUTC8);
  }, []);

  useEffect(() => {
    fetchTeamPerformanceData();
    
    refreshIntervalRef.current = setInterval(() => {
      fetchTeamPerformanceData(true);
    }, 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fromDate, toDate]);

  const fetchTeamPerformanceData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      
      // Get supervisor ID from localStorage
      const supervisorId = localStorage.getItem('userId') || localStorage.getItem('sup_id');
      
      if (!supervisorId) {
        throw new Error('Supervisor ID not found. Please log in again.');
      }

      // First get team members under this supervisor
      const teamResponse = await axios.get(`${TEAM_ATTENDANCE_API_BASE_URL}?supervisor_id=${supervisorId}&date=${fromDate}`);
      
      if (!teamResponse.data.success) {
        throw new Error(teamResponse.data.error || 'Failed to fetch team data');
      }

      // Get team member IDs
      const teamMemberIds = teamResponse.data.records.map(record => record.emp_id);
      
      if (teamMemberIds.length === 0) {
        setPerformanceData([]);
        setSummaryStats({});
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      // Now fetch performance data and filter for team members only
      const performanceResponse = await axios.get(`${PERFORMANCE_API_BASE_URL}?action=get_performance_data&from_date=${fromDate}&to_date=${toDate}`);
      
      if (performanceResponse.data.success) {
        // Filter to only include team members
        const allPerformanceData = performanceResponse.data.records || [];
        const teamPerformanceData = allPerformanceData.filter(record => 
          teamMemberIds.includes(record.emp_id)
        );

        const processedRecords = await Promise.all(teamPerformanceData.map(async (record) => {
          // Fetch employee profile image
          try {
            const profileResponse = await axios.get(`${TEAM_ATTENDANCE_API_BASE_URL.replace('team_attendance.php', 'attendance_api.php')}?action=get_employee_info&emp_id=${record.emp_id}`);
            
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

        const currentDataString = JSON.stringify(performanceData);
        const newDataString = JSON.stringify(processedRecords);
        
        if (currentDataString !== newDataString) {
          setPerformanceData(processedRecords);
          
          // Calculate summary stats for team members only
          const teamSummaryStats = {
            avg_present_days: Math.round(processedRecords.reduce((sum, emp) => sum + emp.presentDays, 0) / processedRecords.length) || 0,
            avg_absent_days: Math.round(processedRecords.reduce((sum, emp) => sum + emp.absentDays, 0) / processedRecords.length) || 0,
            avg_leave_days: Math.round(processedRecords.reduce((sum, emp) => sum + emp.leaveDays, 0) / processedRecords.length) || 0,
            avg_late_days: 0 // Add if you have late days data
          };
          
          setSummaryStats(teamSummaryStats);
          setLastUpdateTime(Date.now());
        }
      }
    } catch (error) {
      if (!silent) {
        console.error('Error fetching team performance data:', error);
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

  const renderEmployeeAvatar = (employee) => {
    const initials = employee.name.split(' ').map(n => n[0]).join('');
    
    return (
      <div className="performance-review-employee-avatar">
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
              imageRendering: 'high-quality',
              filter: 'contrast(1.1) brightness(1.05)',
              transition: 'all 0.2s ease'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
            onLoad={(e) => {
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

  const currentData = performanceData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(performanceData.length / itemsPerPage);

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
      const dayName = fromDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Manila' });
      const formatted = fromDate.toLocaleDateString('en-US', options);
      const isWeekendDay = !isWeekday(fromDateString);
      return `${dayName}, ${formatted}${isWeekendDay ? ' (Weekend)' : ''}`;
    } else {
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
      <div className="performance-review-page">
        <div className="performance-review-loading">
          <div className="performance-review-loading-spinner"></div>
          <p>Loading team performance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-review-page">
      {/* Header Container */}
      <div className="performance-review-header-container">
        <div className="performance-review-header-content">
          <h1 className="performance-review-title">
            TEAM PERFORMANCE REVIEW
          </h1>
          <div className="performance-review-actions">
            <div className="performance-review-actions-group">
              <div className="performance-review-date-picker-box">
                <input
                  type="text"
                  value={formatDateDisplay(fromDate, toDate)}
                  readOnly
                  onClick={handleDatePickerOpen}
                  style={{ cursor: 'pointer' }}
                />
                <button className="performance-review-date-picker-button" onClick={handleDatePickerOpen}>
                  <Calendar size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="performance-review-content">
        {/* Statistics Cards */}
        <div className="performance-review-stats-grid">
          {/* Present Employees Card */}
          <div className="performance-review-stat-card">
            <div className="performance-review-stat-icon performance-review-excellent">
              <UserCheck size={24} />
            </div>
            <div className="performance-review-stat-content">
              <div className="performance-review-stat-number">{presentCount}</div>
              <div className="performance-review-stat-label">Avg. Present Days</div>
            </div>
          </div>

          {/* Late Employees Card */}
          <div className="performance-review-stat-card">
            <div className="performance-review-stat-icon performance-review-average">
              <Clock size={24} />
            </div>
            <div className="performance-review-stat-content">
              <div className="performance-review-stat-number">{lateCount}</div>
              <div className="performance-review-stat-label">Avg. Late Days</div>
            </div>
          </div>

          {/* Absent Employees Card */}
          <div className="performance-review-stat-card">
            <div className="performance-review-stat-icon performance-review-poor">
              <UserX size={24} />
            </div>
            <div className="performance-review-stat-content">
              <div className="performance-review-stat-number">{absentCount}</div>
              <div className="performance-review-stat-label">Avg. Absent Days</div>
            </div>
          </div>

          {/* On Leave Employees Card */}
          <div className="performance-review-stat-card">
            <div className="performance-review-stat-icon performance-review-good">
              <Users size={24} />
            </div>
            <div className="performance-review-stat-content">
              <div className="performance-review-stat-number">{onLeaveCount}</div>
              <div className="performance-review-stat-label">Avg. Leave Days</div>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="performance-review-table-container">
          {/* Table Header */}
          <div className="performance-review-table-header1">
            <h2 className="performance-review-table-title">
              Team Performance Records
            </h2>
          </div>

          {/* Table */}
          <div className="performance-review-table-wrapper">
            <table className="performance-review-table">
              <thead>
                <tr className="performance-review-table-header-row">
                  <th className="performance-review-table-th">EMPLOYEE NAME</th>
                  <th className="performance-review-table-th">DATE</th>
                  <th className="performance-review-table-th">PRESENT DAYS</th>
                  <th className="performance-review-table-th">ABSENT DAYS</th>
                  <th className="performance-review-table-th">LEAVE DAYS</th>
                  <th className="performance-review-table-th">TOTAL HOURS</th>
                  <th className="performance-review-table-th">OVERTIME</th>
                  <th className="performance-review-table-th">LATE/UNDERTIME</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((employee, index) => (
                  <tr key={employee.id} className="performance-review-table-row">
                    <td className="performance-review-table-td">
                      <div className="performance-review-employee-info">
                        {renderEmployeeAvatar(employee)}
                        <div>
                          <span className="performance-review-employee-name">{employee.name}</span>
                          <div style={{ fontSize: '13px', color: '#666' }}>{employee.position || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="performance-review-table-td">
                      <span className="performance-review-position-cell">
                        {fromDate === toDate ? formatTableDate(fromDate) : `${formatTableDate(fromDate)} - ${formatTableDate(toDate)}`}
                      </span>
                    </td>
                    <td className="performance-review-table-td performance-review-percentage-cell">
                      <span className="performance-review-percentage-badge performance-review-present">
                        {employee.presentDays} days
                      </span>
                    </td>
                    <td className="performance-review-table-td performance-review-percentage-cell">
                      <span className="performance-review-percentage-badge performance-review-absent">
                        {employee.absentDays} days
                      </span>
                    </td>
                    <td className="performance-review-table-td performance-review-percentage-cell">
                      <span className="performance-review-percentage-badge performance-review-late">
                        {employee.leaveDays} days
                      </span>
                    </td>
                    <td className="performance-review-table-td performance-review-total-cell">{employee.totalHours}</td>
                    <td className="performance-review-table-td performance-review-total-cell">{employee.overtime}</td>
                    <td className="performance-review-table-td performance-review-total-cell">{employee.lateUndertime}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {currentData.length === 0 && (
              <div className="performance-review-no-data">
                <UserX size={48} />
                <h3>No team performance records found</h3>
                <p>No team members have performance records for this date.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="performance-review-pagination">
              <div className="performance-review-pagination-info">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, performanceData.length)} of {performanceData.length} entries
              </div>
              <div className="performance-review-pagination-controls">
                <button 
                  className="performance-review-pagination-btn" 
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 5;
                  
                  if (totalPages <= maxVisiblePages) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(
                        <button
                          key={i}
                          className={`performance-review-pagination-btn ${currentPage === i ? 'performance-review-active' : ''}`}
                          onClick={() => handlePageChange(i)}
                        >
                          {i}
                        </button>
                      );
                    }
                  } else {
                    let startPage = Math.max(1, currentPage - 2);
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    if (endPage - startPage < maxVisiblePages - 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          className={`performance-review-pagination-btn ${currentPage === i ? 'performance-review-active' : ''}`}
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
                  className="performance-review-pagination-btn" 
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
        <div className="performance-review-date-picker-overlay" onClick={handleDatePickerClose}>
          <div className="performance-review-date-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="performance-review-date-picker-header">
              <h3 className="performance-review-date-picker-title">Select Date Range</h3>
              <button className="performance-review-date-picker-close" onClick={handleDatePickerClose}>
                <X size={20} />
              </button>
            </div>
            <div className="performance-review-date-picker-content">
              <div className="performance-review-date-input-group">
                <label className="performance-review-date-input-label">From Date</label>
                <input
                  type="date"
                  value={tempFromDate}
                  onChange={(e) => setTempFromDate(e.target.value)}
                  className="performance-review-date-picker-input"
                  max={tempToDate}
                />
              </div>
              <div className="performance-review-date-input-group">
                <label className="performance-review-date-input-label">To Date</label>
                <input
                  type="date"
                  value={tempToDate}
                  onChange={(e) => setTempToDate(e.target.value)}
                  className="performance-review-date-picker-input"
                  min={tempFromDate}
                />
              </div>
              <div className="performance-review-date-picker-info">
                {tempFromDate === tempToDate && !isWeekday(tempFromDate) && (
                  <div className="performance-review-weekend-warning">
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
              <div className="performance-review-date-picker-actions">
                <button className="performance-review-date-picker-btn performance-review-secondary" onClick={handleDatePickerClose}>
                  Cancel
                </button>
                <button className="performance-review-date-picker-btn performance-review-primary" onClick={handleDatePickerConfirm}>
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

export default PerformanceReview;