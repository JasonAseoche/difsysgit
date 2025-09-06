import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getCurrentUser, getUserId } from '../../utils/auth';
import '../../components/EmployeeLayout/Attendance.css';

const Attendance = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [shiftType, setShiftType] = useState('day');
  const [attendanceData, setAttendanceData] = useState([]);
  const [employeeInfo, setEmployeeInfo] = useState({
    firstName: 'Loading...',
    lastName: '',
    emp_id: null,
    position: 'Software Developer'
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [currentPayrollPeriod, setCurrentPayrollPeriod] = useState(null);

  const refreshIntervalRef = useRef(null);
  const API_BASE_URL = 'http://localhost/difsysapi/attendance_api.php';
  const itemsPerPage = 8;

  const getCurrentTimeUTC8 = () => {
    const now = new Date();
    const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return utc8Time;
  };

  const isWeekday = (date = null) => {
    const checkDate = date || getCurrentTimeUTC8();
    const dayOfWeek = checkDate.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  };

  // Fixed late calculation function (same as API)
  const calculateLateMinutes = (timeIn, detectedShift = null) => {
    const timeInObj = new Date(`2000-01-01 ${timeIn}`);
    
    // Detect shift if not provided
    if (detectedShift === null) {
      const hour = timeInObj.getHours();
      detectedShift = (hour >= 6 && hour < 18) ? 'day' : 'night';
    }
    
    if (detectedShift === 'day') {
      const workStartTime = new Date('2000-01-01 08:00:00');
      const graceTime = new Date('2000-01-01 08:10:00');
      
      if (timeInObj <= graceTime) {
        return 0;
      }
      
      const diffMs = timeInObj.getTime() - workStartTime.getTime();
      return Math.floor(diffMs / (1000 * 60));
    } else {
      // Night shift logic
      const currentHour = timeInObj.getHours();
      
      if (currentHour >= 22) {
        // Same day (10:00 PM - 11:59 PM)
        const workStartTime = new Date('2000-01-01 22:00:00');
        const graceTime = new Date('2000-01-01 22:10:00');
        
        if (timeInObj <= graceTime) {
          return 0;
        }
        
        const diffMs = timeInObj.getTime() - workStartTime.getTime();
        return Math.floor(diffMs / (1000 * 60));
      } else {
        // Next day (12:00 AM - 6:00 AM)
        const workStartTime = new Date('2000-01-01 22:00:00');
        const nextDayTimeIn = new Date('2000-01-02 ' + timeIn);
        
        const diffMs = nextDayTimeIn.getTime() - workStartTime.getTime();
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        
        return Math.max(0, totalMinutes - 10); // 10 minutes grace period
      }
    }
  };

  // Calculate undertime minutes if employee times out before 5:00 PM
  const calculateUndertimeMinutes = (timeOut) => {
    if (!timeOut) return 0;
    
    const timeOutObj = new Date(`2000-01-01 ${timeOut}`);
    const workEndTime = new Date('2000-01-01 17:00:00'); // 5:00 PM work end
    
    // If time out is at or after 5:00 PM, no undertime
    if (timeOutObj >= workEndTime) {
      return 0;
    }
    
    // Calculate minutes of undertime (how many minutes before 5:00 PM)
    const diffMs = workEndTime.getTime() - timeOutObj.getTime();
    const undertimeMinutes = Math.floor(diffMs / (1000 * 60));
    
    return undertimeMinutes;
  };

  useEffect(() => {
    const userId = getUserId();
    const currentUser = getCurrentUser();
    
    if (userId && currentUser) {
      setEmployeeInfo(prev => ({
        ...prev,
        firstName: currentUser.firstName || 'Employee',
        lastName: currentUser.lastName || '',
        emp_id: userId
      }));
    } else {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
            document.title = "DIFSYS | ATTENDANCE";
          }, []);

  useEffect(() => {
    if (employeeInfo.emp_id) {
      fetchEmployeeInfo();
      fetchCurrentPayrollPeriod();
      fetchAttendanceRecords();
      
      refreshIntervalRef.current = setInterval(() => {
        fetchAttendanceRecords(true);
      }, 10000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [employeeInfo.emp_id]);

  const fetchEmployeeInfo = async () => {
    if (!employeeInfo.emp_id) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}?action=get_employee_info&emp_id=${employeeInfo.emp_id}`);
      if (response.data.success) {
        setEmployeeInfo(prev => ({
          ...prev,
          ...response.data.employee,
          profile_image: response.data.employee.profile_image
        }));
      }
    } catch (error) {
      console.error('Error fetching employee info:', error);
    }
  };

  const fetchCurrentPayrollPeriod = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=get_current_payroll_period`);
      if (response.data.success) {
        setCurrentPayrollPeriod(response.data.payroll_period);
      } else {
        console.log('No current payroll period found');
      }
    } catch (error) {
      console.error('Error fetching current payroll period:', error);
    }
  };

  const fetchAttendanceRecords = async (silent = false) => {
    if (!employeeInfo.emp_id) return;
    
    try {
      if (!silent) setLoading(true);
      
      const response = await axios.get(`${API_BASE_URL}?action=get_attendance_records&emp_id=${employeeInfo.emp_id}&limit=50`);
      if (response.data.success) {
        const formattedRecords = response.data.records.map(record => {
          // Use late_undertime from database (combination of late_minutes + undertime_minutes)
          const lateUndertimeMinutes = record.late_undertime || 0;
          
          return {
            date: formatDate(record.date),
            checkIn: record.time_in ? formatTime(record.time_in) : '--',
            checkOut: record.time_out ? formatTime(record.time_out) : '--',
            totalHours: formatTotalHours(record.total_workhours),
            overtime: formatOvertime(record.overtime),
            lateUndertimeDisplay: formatLateUndertimeSimple(lateUndertimeMinutes),
            status: determineDisplayStatus(record),
            lateUndertimeMinutes: lateUndertimeMinutes,
            isWeekend: !isWeekday(new Date(record.date + 'T00:00:00')),
            // Add holiday information
            isHoliday: record.is_holiday === 1,
            holidayType: record.holiday_type,
            // Add holiday pay information
            regularHolidayHours: formatTotalHours(record.regular_holiday || 0),
            regularHolidayOT: formatTotalHours(record.regular_holiday_ot || 0),
            specialHolidayHours: formatTotalHours(record.special_holiday || 0),
            specialHolidayOT: formatTotalHours(record.special_holiday_ot || 0)
          };
        });
        
        const recordsChanged = JSON.stringify(formattedRecords) !== JSON.stringify(attendanceData);
        if (recordsChanged) {
          setAttendanceData(formattedRecords);
          setLastUpdateTime(Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Add this function to detect shift based on current time
const detectCurrentShiftType = () => {
  const now = getCurrentTimeUTC8();
  const hour = now.getHours();
  
  if (hour >= 6 && hour < 18) {
    return 'day';
  } else {
    return 'night';
  }
};

// Update shift type based on current time
useEffect(() => {
  const currentShift = detectCurrentShiftType();
  setShiftType(currentShift);
  
  // Update every hour to catch shift changes
  const interval = setInterval(() => {
    const newShift = detectCurrentShiftType();
    setShiftType(newShift);
  }, 3600000); // Every hour
  
  return () => clearInterval(interval);
}, []);

  // Simple format for Late/Undertime display - just show minutes or 0m
  const formatLateUndertimeSimple = (totalMinutes) => {
    if (!totalMinutes || totalMinutes === 0) {
      return '0m';
    }
    return `${totalMinutes}m`;
  };

  // Simplified function to determine display status
  const determineDisplayStatus = (record) => {
    const recordDate = new Date(record.date + 'T00:00:00');
    if (!isWeekday(recordDate)) {
      return 'Weekend';
    }
  
    if (!record.time_in) {
      return 'Absent';
    }
  
    if (record.time_in && !record.time_out) {
      // FIXED: Check for late status immediately when time_in exists, even without time_out
      if (record.late_undertime > 0 || record.late_minutes > 0) {
        return 'Late';
      }
      return 'Present';
    }
  
    // Check for holiday status first
    if (record.is_holiday === 1) {
      // Even on holidays, show Late if employee was late
      if (record.late_undertime > 0 || record.late_minutes > 0) {
        return 'Late';
      }
      return 'Present';
    }
  
    // MOVED UP: Check for late status BEFORE overtime check
    if (record.late_undertime > 0 || record.late_minutes > 0) {
      return 'Late';
    }
  
    // Check if it has overtime
    if (record.overtime > 0) {
      return 'Present';
    }
  
    // Check specific status from database
    if (record.status) {
      const statusLower = record.status.toLowerCase();
      if (statusLower.includes('absent')) return 'Absent';
      if (statusLower.includes('leave')) return 'On Leave';
    }
  
    return 'Present';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Manila'
    }).toUpperCase().replace(',', ',');
  };

  const formatTime = (timeStr) => {
    const time = new Date(`2000-01-01 ${timeStr}`);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila'
    });
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

  const getStatusBadgeClass = (status, isWeekend, isHoliday) => {
    if (isWeekend) return 'attendanceStatusWeekend';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'present') return 'attendanceStatusPresent';
    if (statusLower === 'late') return 'attendanceStatusLate';
    if (statusLower === 'absent') return 'attendanceStatusAbsent';
    if (statusLower === 'on leave') return 'attendanceStatusLeave';
    if (statusLower === 'weekend') return 'attendanceStatusWeekend';
    
    return 'attendanceStatusPresent';
  };

  const calculateStats = () => {
    const workDays = attendanceData.filter(record => !record.isWeekend);
    const presentDays = workDays.filter(record => 
      record.status === 'PRESENT' || 
      record.status === 'OVERTIME' ||
      record.status.includes('HOLIDAY')
    ).length;
    
    const totalWorkHours = workDays.reduce((sum, record) => {
      const hours = parseFloat(record.totalHours.replace(/[^\d.]/g, '')) || 0;
      return sum + hours;
    }, 0);
    
    const avgWorkHours = workDays.length > 0 ? (totalWorkHours / workDays.length).toFixed(1) : '0.0';
    const absentDays = workDays.filter(record => record.status === 'ABSENT').length;
    
    return {
      avgWorkHours,
      presentDays,
      absentDays,
      totalWorkDays: workDays.length
    };
  };

  const stats = calculateStats();
  const totalPages = Math.ceil(attendanceData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = attendanceData.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`attendancePaginationBtn ${currentPage === i ? 'attendancePaginationActive' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(
        <span key="dots" className="attendancePaginationDots">...</span>
      );
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`attendancePaginationBtn ${currentPage === totalPages ? 'attendancePaginationActive' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  const handleManualRefresh = () => {
    fetchAttendanceRecords();
  };

  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="attendanceMainContainer">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <p>Loading attendance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendanceMainContainer">
      <div className="attendanceHeaderSection">
        <div className="attendanceProfileArea">
          <div className="attendanceAvatarCircle">
            {employeeInfo.profile_image ? (
              <img 
                src={employeeInfo.profile_image.startsWith('http') ? employeeInfo.profile_image : `http://localhost/difsysapi/${employeeInfo.profile_image}`} 
                alt={employeeInfo.firstName}
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
            <span className="attendanceAvatarText" style={{ display: employeeInfo.profile_image ? 'none' : 'block' }}>
              {employeeInfo.firstName?.[0]}{employeeInfo.lastName?.[0]}
            </span>
          </div>
          <div className="attendanceProfileDetails">
            <h1 className="attendanceProfileName">
              {employeeInfo.firstName} {employeeInfo.lastName}
            </h1>
            <p className="attendanceProfileRole">{employeeInfo.position}</p>
          </div>
        </div>

        <div className="attendanceInfoCards">
          <div className="attendanceInfoCard">
            <div className="attendanceInfoIcon attendanceIconGreen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="attendanceInfoContent">
              <p className="attendanceInfoLabel">Employee ID</p>
              <p className="attendanceInfoValue">DIF{employeeInfo.emp_id}</p>
            </div>
          </div>

          <div className="attendanceInfoCard">
            <div className="attendanceInfoIcon attendanceIconBlue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
            </div>
            <div className="attendanceInfoContent">
              <p className="attendanceInfoLabel">Payroll Period</p>
              <p className="attendanceInfoValue">
                {currentPayrollPeriod ? currentPayrollPeriod.display : 'No active period'}
              </p>
            </div>
          </div>

          <div className="attendanceInfoCard">
            <div className="attendanceInfoIcon attendanceIconPurple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
              </svg>
            </div>
            <div className="attendanceInfoContent">
              <p className="attendanceInfoLabel">Absent Days</p>
              <p className="attendanceInfoValue">{stats.absentDays}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="attendanceTimeStatsGrid">
        <div className="attendanceTimeStatCard">
          <div className="attendanceTimeStatIcon attendanceIconBlueCard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
            </svg>
          </div>
          <div className="attendanceTimeValue">{stats.avgWorkHours}h</div>
          <div className="attendanceTimeLabel">Average Working Hours</div>
        </div>

        <div className="attendanceTimeStatCard">
          <div className="attendanceTimeStatIcon attendanceIconGreenCard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7,12.5L10.5,16L17,9.5L15.5,8L10.5,13L8.5,11L7,12.5Z"/>
            </svg>
          </div>
          <div className="attendanceTimeValue">
            {shiftType === 'day' ? '8:00 AM' : '10:00 PM'}
          </div>
          <div className="attendanceTimeLabel">Standard Start Time</div>
        </div>

        <div className="attendanceTimeStatCard">
          <div className="attendanceTimeStatIcon attendanceIconPurpleCard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M16.5,12A4.5,4.5 0 0,1 12,16.5A4.5,4.5 0 0,1 7.5,12A4.5,4.5 0 0,1 12,7.5A4.5,4.5 0 0,1 16.5,12Z"/>
            </svg>
          </div>
          <div className="attendanceTimeValue">
            {shiftType === 'day' ? '5:00 PM' : '6:00 AM'}
          </div>
          <div className="attendanceTimeLabel">Standard End Time</div>
        </div>

        <div className="attendanceTimeStatCard">
          <div className="attendanceTimeStatIcon attendanceIconOrangeCard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6,2V8H6V8L10,12L6,16V16H6V22H18V16H18V16L14,12L18,8V8H18V2H6M16,16.5V20H8V16.5L12,12.5L16,16.5M12,11.5L8,7.5V4H16V7.5L12,11.5Z"/>
            </svg>
          </div>
          <div className="attendanceTimeValue">{shiftType === 'day' ? '8:10 AM' : '10:10 PM'}</div>
          <div className="attendanceTimeLabel">Grace Period Cutoff</div>
        </div>
      </div>

      <div className="attendanceTableSection">        
        <table className="attendanceDataTable">
        <thead>
            <tr className="attendanceTableHeader">
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
                {currentData.map((record, index) => (
                  <tr key={index} className="attendanceTableRow">
                    <td className="attendanceDateCell">
                      {record.date}
                      {record.isHoliday && (
                        <span style={{ color: '#8b5cf6', fontWeight: '500' }}>
                          {' '}({record.holidayType} Holiday)
                        </span>
                      )}
                    </td>
                    <td className="attendanceTimeCell">{record.checkIn}</td>
                    <td className="attendanceTimeCell">{record.checkOut}</td>
                    <td className="attendanceTotalCell">{record.totalHours}</td>
                    <td className="attendanceOvertimeCell">{record.overtime}</td>
                    <td className="attendanceLateUndertimeCell">
                      {record.lateUndertimeDisplay}
                    </td>
                    <td className="attendanceStatusCell">
                      <span className={`attendanceStatusBadge ${getStatusBadgeClass(record.status, record.isWeekend, record.isHoliday)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
        </table>

        <div className="attendancePaginationArea">
          <div className="attendancePaginationInfo">
            Showing {startIndex + 1} to {Math.min(endIndex, attendanceData.length)} of {attendanceData.length} entries
          </div>
          <div className="attendancePaginationButtons">
            {renderPaginationButtons()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;