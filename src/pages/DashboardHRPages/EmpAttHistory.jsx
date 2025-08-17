import React, { useState, useEffect } from 'react';
import { Users, Clock, UserX, UserCheck, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import '../../components/HRLayout/EmployeeDetails.css';

const EmpAttHistory = ({ empId }) => {
  const [attendanceStats, setAttendanceStats] = useState({
    avgWorkHours: '0.0',
    presentDays: 0,
    lateDays: 0,
    absentDays: 0
  });
  
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substr(0, 7)); // YYYY-MM format
  const [recordLimit, setRecordLimit] = useState(30);
  const [userId, setUserId] = useState(null);

  // API base URL - update this path to match your file location
  const API_BASE_URL = 'http://localhost/difsysapi';

  // Get user ID from URL parameters or props - same pattern as EmpDocuments
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('user_id');
    if (userIdFromUrl) {
      setUserId(userIdFromUrl);
    } else if (empId) {
      setUserId(empId);
    }
  }, [empId]);

 useEffect(() => {
    document.title = "DIFSYS | ATTENDANCE HISTORY";
  }, []);

  // Load attendance when userId is available - same pattern as EmpDocuments
  useEffect(() => {
    if (userId) {
      fetchAttendanceData();
    }
  }, [userId, selectedMonth, recordLimit]);

  const fetchAttendanceData = async () => {
    if (!userId) {
      console.error('No employee ID provided');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching attendance data for user ID:', userId);
      
      // Fetch attendance statistics and history in parallel
      const [statsResponse, historyResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/empdocsatt.php`, {
          params: {
            action: 'attendance',
            type: 'stats',
            emp_id: userId,
            month: selectedMonth
          }
        }),
        axios.get(`${API_BASE_URL}/empdocsatt.php`, {
          params: {
            action: 'attendance',
            emp_id: userId,
            limit: recordLimit,
            month: selectedMonth
          }
        })
      ]);

      console.log('Stats API Response:', statsResponse.data);
      console.log('History API Response:', historyResponse.data);

      // Update state with fetched data
      if (statsResponse.data && statsResponse.data.stats) {
        setAttendanceStats(statsResponse.data.stats);
      }

      if (historyResponse.data && historyResponse.data.attendance) {
        setAttendanceHistory(historyResponse.data.attendance);
      }

    } catch (err) {
      console.error('Error fetching attendance data:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.error || 'Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (direction) => {
    const currentDate = new Date(selectedMonth + '-01');
    if (direction === 'prev') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    setSelectedMonth(currentDate.toISOString().substr(0, 7));
  };

  const handleRefresh = () => {
    fetchAttendanceData();
  };

  const formatMonthDisplay = (monthStr) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getStatusBadgeClass = (status, isWeekend) => {
    if (isWeekend) return 'empdet-status-weekend';
    
    const statusLower = status.toLowerCase();
    if (statusLower === 'present') return 'empdet-status-present';
    if (statusLower === 'late') return 'empdet-status-late';
    if (statusLower === 'absent') return 'empdet-status-absent';
    if (statusLower === 'overtime') return 'empdet-status-overtime';
    if (statusLower === 'weekend') return 'empdet-status-weekend';
    if (statusLower.includes('holiday')) return 'empdet-status-holiday';
    if (statusLower === 'on leave') return 'empdet-status-leave';
    
    return 'empdet-status-present';
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Debug info - same pattern as EmpDocuments */}
      {!userId && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          <strong>Error:</strong> No employee ID found in URL or props. Expected ?user_id=XXX in URL.
        </div>
      )}

      {/* Content Header */}
      <div className="empdet-content-header">
        <h2 className="empdet-section-title">Attendance History</h2>
        <div className="empdet-attendance-controls">
          {/* Month Navigation */}
          <div className="empdet-month-navigation">
            <button 
              className="empdet-month-nav-btn" 
              onClick={() => handleMonthChange('prev')}
              disabled={loading}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="empdet-current-month">
              <Calendar size={16} />
              {formatMonthDisplay(selectedMonth)}
            </span>
            <button 
              className="empdet-month-nav-btn" 
              onClick={() => handleMonthChange('next')}
              disabled={loading}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="empdet-attendance-container">
        {/* Show loading state */}
        {loading && (
          <div className="empdet-loading">
            <div className="empdet-docs-spinner"></div>
            <p>Loading attendance data...</p>
          </div>
        )}

        {/* Show error state */}
        {error && !loading && (
          <div className="empdet-error-container">
            <p className="empdet-error-message">Error: {error}</p>
            <button 
              className="empdet-retry-button" 
              onClick={handleRefresh}
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        )}

        {/* Show content when not loading and no error */}
        {!loading && !error && (
          <>
            {/* Stats Cards */}
            <div className="empdet-attendance-stats-grid">
              <div className="empdet-attendance-stat-card">
                <div className="empdet-attendance-stat-icon empdet-attendance-icon-blue">
                  <Clock size={24} />
                </div>
                <div className="empdet-attendance-stat-content">
                  <div className="empdet-attendance-stat-number">{attendanceStats.avgWorkHours}h</div>
                  <div className="empdet-attendance-stat-label">Average Working Hours</div>
                </div>
              </div>

              <div className="empdet-attendance-stat-card">
                <div className="empdet-attendance-stat-icon empdet-attendance-icon-green">
                  <UserCheck size={24} />
                </div>
                <div className="empdet-attendance-stat-content">
                  <div className="empdet-attendance-stat-number">{attendanceStats.presentDays}</div>
                  <div className="empdet-attendance-stat-label">Present Days</div>
                </div>
              </div>

              <div className="empdet-attendance-stat-card">
                <div className="empdet-attendance-stat-icon empdet-attendance-icon-orange">
                  <Users size={24} />
                </div>
                <div className="empdet-attendance-stat-content">
                  <div className="empdet-attendance-stat-number">{attendanceStats.lateDays}</div>
                  <div className="empdet-attendance-stat-label">Late Days</div>
                </div>
              </div>

              <div className="empdet-attendance-stat-card">
                <div className="empdet-attendance-stat-icon empdet-attendance-icon-red">
                  <UserX size={24} />
                </div>
                <div className="empdet-attendance-stat-content">
                  <div className="empdet-attendance-stat-number">{attendanceStats.absentDays}</div>
                  <div className="empdet-attendance-stat-label">Absent Days</div>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="empdet-attendance-table-section">
              {attendanceHistory.length === 0 ? (
                <div className="empdet-no-documents">
                  <div className="empdet-no-documents-content">
                    <Clock size={48} color="#6b7280" />
                    <h3>No Attendance Records Found</h3>
                    <p>This employee has no attendance records for the selected period.</p>
                  </div>
                </div>
              ) : (
                <table className="empdet-attendance-table">
                  <thead>
                    <tr className="empdet-attendance-table-header">
                      <th>DATE</th>
                      <th>TIME IN</th>
                      <th>TIME OUT</th>
                      <th>TOTAL</th>
                      <th>OVERTIME</th>
                      <th>LATE/UNDERTIME</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.map((record, index) => (
                      <tr key={record.id || index} className="empdet-attendance-table-row">
                        <td className="empdet-attendance-date-cell">{record.date}</td>
                        <td className="empdet-attendance-time-cell">{record.checkIn}</td>
                        <td className="empdet-attendance-time-cell">{record.checkOut}</td>
                        <td className="empdet-attendance-total-cell">{record.totalHours}</td>
                        <td className="empdet-attendance-overtime-cell">{record.overtime}</td>
                        <td className="empdet-attendance-late-cell">{record.lateUndertime}</td>
                        <td className="empdet-attendance-status-cell">
                          <span className={`empdet-attendance-status-badge ${getStatusBadgeClass(record.status, record.isWeekend)}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Summary Info */}
            {attendanceHistory.length > 0 && (
              <div className="empdet-attendance-summary">
                <p>Showing {attendanceHistory.length} records for {formatMonthDisplay(selectedMonth)}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmpAttHistory;