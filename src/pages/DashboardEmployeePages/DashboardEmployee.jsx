import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getCurrentUser, getUserId } from '../../utils/auth';
import '../../components/EmployeeLayout/DashboardEmployee.css';

const DashboardEmployee = () => {
  const [workArrangement, setWorkArrangement] = useState('');
  const [isTimeIn, setIsTimeIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [todayHours, setTodayHours] = useState(0);
  const [timeInStart, setTimeInStart] = useState(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState(null);
  const [employeeInfo, setEmployeeInfo] = useState({
    firstName: 'Loading...',
    lastName: '',
    emp_id: null,
    workarrangement: ''
  });
  const [isOvertime, setIsOvertime] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [isAutoBreak, setIsAutoBreak] = useState(false);
  const [lateMinutes, setLateMinutes] = useState(0);
  const [breakTimeAccumulated, setBreakTimeAccumulated] = useState(0);
  const [lastBreakCheck, setLastBreakCheck] = useState(null);

  // Refs for managing intervals
  const timerIntervalRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);
  const breakCheckIntervalRef = useRef(null);

  // API base URL
  const API_BASE_URL = 'http://localhost/difsysapi/attendance_api.php';

  // Get current time in UTC+8 timezone
  const getCurrentTimeUTC8 = () => {
    const now = new Date();
    const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return utc8Time;
  };

  // Check if current day is weekday (Monday-Friday)
  const isWeekday = (date = null) => {
    const checkDate = date || getCurrentTimeUTC8();
    const dayOfWeek = checkDate.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  };

  // Check if current time is within work hours (8:00 AM - 5:00 PM)
  const isWorkHours = () => {
    const now = getCurrentTimeUTC8();
    const hour = now.getHours();
    return hour >= 8 && hour < 17;
  };

  // Check if current time is break time (12:00 PM - 1:00 PM)
  const isBreakTime = () => {
    const now = getCurrentTimeUTC8();
    const hour = now.getHours();
    const minute = now.getMinutes();
    return hour === 12 || (hour === 13 && minute === 0);
  };

  // Check if current time is overtime (after 5:00 PM)
  const isOvertimeHours = () => {
    const now = getCurrentTimeUTC8();
    const hour = now.getHours();
    return hour >= 17;
  };

  // Fixed late calculation (same as API)
  const calculateLateMinutes = (timeIn) => {
    const timeInObj = new Date(`2000-01-01 ${timeIn}`);
    const workStartTime = new Date('2000-01-01 08:00:00'); // 8:00 AM work start
    const graceTime = new Date('2000-01-01 08:10:00'); // 8:10 AM grace period
    
    // If time in is at or before 8:10 AM, not late
    if (timeInObj <= graceTime) {
      return 0;
    }
    
    // Calculate minutes late from 8:00 AM (not from 8:10 AM)
    const diffMs = timeInObj.getTime() - workStartTime.getTime();
    const lateMinutes = Math.floor(diffMs / (1000 * 60));
    
    return lateMinutes;
  };

  // ENHANCED break time management with better logging and state handling
  const manageBreakTime = async () => {
    const now = getCurrentTimeUTC8();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Only manage breaks if timer should be running and employee is timed in
    if (currentHour < 8 || !isTimeIn || !employeeInfo.emp_id) {
      return;
    }
    
    try {
      console.log(`🔍 Checking break status at ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
      
      // Construct the URL properly
      const url = `${API_BASE_URL}?action=get_break_status&emp_id=${employeeInfo.emp_id}`;
      console.log('📞 API URL:', url);
      
      // Get break status from server
      const response = await axios.get(url);
      
      console.log('📡 Full API Response:', response);
      console.log('📊 Response Data:', response.data);
      
      if (response.data && response.data.success) {
        const { is_on_break, is_auto_break, break_start_time, break_end_time, debug } = response.data;
        
        console.log('🔄 Break status response:', {
          is_on_break,
          is_auto_break,
          break_start_time,
          break_end_time,
          currentBreakState: isOnBreak,
          debug
        });
        
        // PRIORITY 1: Handle lunch break START (12:00 PM)
        if (currentHour === 12 && !isOnBreak && is_on_break && is_auto_break) {
          console.log('🍽️ STARTING LUNCH BREAK at 12:00 PM');
          setIsOnBreak(true);
          setIsAutoBreak(true);
          
          const breakStart = new Date(`${getCurrentTimeUTC8().toDateString()} 12:00:00`);
          setBreakStartTime(breakStart);
          
          showCustomAlert('info', 'Lunch Break Started', 'Timer paused for lunch break (12:00 PM - 1:00 PM)');
        }
        
        // PRIORITY 2: Handle lunch break END (1:00 PM)
        if (currentHour === 13 && currentMinute === 0 && isOnBreak && break_end_time) {
          console.log('🍽️ ENDING LUNCH BREAK at 1:00 PM');
          setIsOnBreak(false);
          setIsAutoBreak(false);
          setBreakStartTime(null);
          
          showCustomAlert('success', 'Lunch Break Ended', 'Timer resumed. Welcome back from lunch!');
        }
        
        // PRIORITY 3: Sync state if out of sync
        if (is_on_break !== isOnBreak) {
          console.log(`🔄 Syncing break state: ${isOnBreak} → ${is_on_break}`);
          setIsOnBreak(is_on_break);
          setIsAutoBreak(is_auto_break);
          
          if (is_on_break && break_start_time) {
            const breakStart = new Date(`${getCurrentTimeUTC8().toDateString()} ${break_start_time}`);
            setBreakStartTime(breakStart);
          } else {
            setBreakStartTime(null);
          }
        }
        
        setLastBreakCheck(now);
        
      } else {
        console.error('❌ API returned success: false', response.data);
        console.error('❌ Error details:', response.data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Error checking break status:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // Only log the specific error, don't show alert to user unless it's critical
      if (error.response?.status >= 500) {
        console.error('🚨 Server error detected, may need admin attention');
      }
    }
  };
  // Enhanced page title effect
  useEffect(() => {
    document.title = "DIFSYS | DASHBOARD EMPLOYEE";
  }, []);

  // CRITICAL: Break monitoring with proper timing
  useEffect(() => {
    if (isTimeIn && employeeInfo.emp_id) {
      console.log('⏰ Setting up break monitoring for employee', employeeInfo.emp_id);
      
      // Check break status every 15 seconds during lunch time, every 60 seconds otherwise
      const getCheckInterval = () => {
        const now = getCurrentTimeUTC8();
        const hour = now.getHours();
        
        // More frequent checks during lunch time and transition periods
        if (hour >= 11 && hour <= 13) {
          return 15000; // 15 seconds during lunch period
        }
        return 60000; // 60 seconds otherwise
      };
      
      // Initial check
      manageBreakTime();
      
      // Set up interval with dynamic timing
      const checkBreakStatus = () => {
        manageBreakTime();
        
        // Clear existing interval and set new one with updated timing
        if (breakCheckIntervalRef.current) {
          clearInterval(breakCheckIntervalRef.current);
        }
        
        breakCheckIntervalRef.current = setInterval(() => {
          manageBreakTime();
        }, getCheckInterval());
      };
      
      checkBreakStatus();
      
      // Also check every hour to adjust interval timing
      const hourlyCheck = setInterval(checkBreakStatus, 3600000); // Every hour
      
      return () => {
        if (breakCheckIntervalRef.current) {
          clearInterval(breakCheckIntervalRef.current);
        }
        clearInterval(hourlyCheck);
      };
    }
  }, [isTimeIn, employeeInfo.emp_id]);

  // Enhanced page visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, immediately check break state
        const now = getCurrentTimeUTC8();
        if (now.getHours() >= 8 && isTimeIn) {
          console.log('👁️ Page visible - checking break status');
          manageBreakTime();
        }
      }
    };
  
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTimeIn, employeeInfo.emp_id]);

  // Get current user from authentication
  useEffect(() => {
    const userId = getUserId();
    const currentUser = getCurrentUser();
    
    if (userId && currentUser) {
      setCurrentUserId(userId);
      setEmployeeInfo({
        firstName: currentUser.firstName || 'Employee',
        lastName: currentUser.lastName || '',
        emp_id: userId
      });
    } else {
      window.location.href = '/login';
    }
  }, []);

  // Format time display (HH:MM:SS)
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert seconds to hours with decimal
  const formatHours = (seconds) => {
    return (seconds / 3600).toFixed(2);
  };

  // ENHANCED timer status checking
  const checkTimerStatus = async () => {
    if (!employeeInfo.emp_id || workArrangement === 'Work From Home') return;
  
    try {
      const response = await axios.get(`${API_BASE_URL}?action=check_timer_status&emp_id=${employeeInfo.emp_id}`);
      if (response.data.success) {
        const { shouldStartTimer, isBreakTime: apiBreakTime, record } = response.data;
        
        // PRIORITY 1: Check if timer should STOP (employee timed out)
        if (isTimeIn && record && record.time_out) {
          console.log('🛑 STOPPING TIMER - Time out detected:', record.time_out);
          setIsTimeIn(false);
          setCurrentTime(0);
          setTimeInStart(null);
          setIsOnBreak(false);
          setIsAutoBreak(false);
          setBreakStartTime(null);
          setIsOvertime(false);
          setAutoRefreshEnabled(true);
          setBreakTimeAccumulated(0);
          
          const timeIn = new Date(`${record.date} ${record.time_in}`);
          const timeOut = new Date(`${record.date} ${record.time_out}`);
          const hoursWorked = ((timeOut - timeIn) / (1000 * 60 * 60)).toFixed(2);
          
          showCustomAlert('success', 'Time Out Completed', 
            `Biometric time out recorded at ${record.time_out}\nTotal hours worked: ${hoursWorked}h`);
          return;
        }
        
        // PRIORITY 2: Check if timer should STOP (shouldStartTimer is false but timer is running)
        if (isTimeIn && !shouldStartTimer) {
          console.log('🛑 STOPPING TIMER - shouldStartTimer is false');
          setIsTimeIn(false);
          setCurrentTime(0);
          setTimeInStart(null);
          setIsOnBreak(false);
          setIsAutoBreak(false);
          setBreakStartTime(null);
          setIsOvertime(false);
          setAutoRefreshEnabled(true);
          setBreakTimeAccumulated(0);
          
          showCustomAlert('success', 'Session Ended', 'Your work session has been completed via biometric scan.');
          return;
        }
        
        // PRIORITY 3: Check if timer should START
        if (shouldStartTimer && !isTimeIn && record && record.time_in && !record.time_out) {
          console.log('▶️ STARTING TIMER - Time in detected:', record.time_in);
          
          const currentTimeUTC8 = getCurrentTimeUTC8();
          
          // ONLY start timer if current time is 8:00 AM or later
          if (currentTimeUTC8.getHours() < 8) {
            console.log('⏸️ NOT STARTING TIMER - Before 8:00 AM');
            return;
          }
          
          // Always use 8:00 AM as the effective start time for timer calculation
          const workStartTime = new Date(`${record.date} 08:00:00`);
          const actualTimeIn = new Date(`${record.date} ${record.time_in}`);
          
          // Use the later of actual time in or 8:00 AM for timer calculation
          const effectiveStartTime = actualTimeIn > workStartTime ? actualTimeIn : workStartTime;
          
          let diffSeconds = Math.floor((currentTimeUTC8 - effectiveStartTime) / 1000);
  
          // FRONTEND DISPLAY ONLY: Subtract lunch break time for timer display
          // This does NOT affect database calculations or payroll
          const currentHour = currentTimeUTC8.getHours();
          const currentMinute = currentTimeUTC8.getMinutes();
  
          if (currentHour > 13 || (currentHour === 13 && currentMinute > 0)) {
            // Past 1:00 PM - subtract full 1-hour lunch break from display
            diffSeconds = Math.max(0, diffSeconds - 3600); // 3600 seconds = 1 hour
          } else if (currentHour === 12 || (currentHour === 13 && currentMinute === 0)) {
            // Currently in lunch break - subtract elapsed lunch time from display
            const lunchStartTime = new Date(`${record.date} 12:00:00`);
            const elapsedLunchSeconds = Math.floor((currentTimeUTC8 - lunchStartTime) / 1000);
            diffSeconds = Math.max(0, diffSeconds - elapsedLunchSeconds);
          }
  
          setIsTimeIn(true);
          setCurrentTime(Math.max(0, diffSeconds));
          setTimeInStart(effectiveStartTime);
          setAutoRefreshEnabled(false);
          setBreakTimeAccumulated(0);
          
          // Calculate late minutes with fixed logic
          const lateMins = calculateLateMinutes(record.time_in);
          setLateMinutes(lateMins);
          
          if (isOvertimeHours() || diffSeconds > 28800) {
            setIsOvertime(true);
          }
          
          // Check if currently in break time
          setTimeout(() => manageBreakTime(), 1000);
        }
      }
    } catch (error) {
      console.error('Error checking timer status:', error);
    }
  };

  // Fetch employee info and today's status on component mount
  useEffect(() => {
    if (employeeInfo.emp_id) {
      fetchEmployeeInfo();
      fetchTodayStatus();
    }
  }, [employeeInfo.emp_id]);

  // Set up auto-refresh for biometric employees
  useEffect(() => {
    if (employeeInfo.emp_id && workArrangement !== 'Work From Home' && autoRefreshEnabled) {
      statusCheckIntervalRef.current = setInterval(checkTimerStatus, 3000);
    } else if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }

    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, [employeeInfo.emp_id, workArrangement, autoRefreshEnabled, isTimeIn]);

  // ENHANCED timer effect with proper break handling
  useEffect(() => {
    if (isTimeIn && !isOnBreak) {
      console.log('▶️ Starting timer - not on break');
      timerIntervalRef.current = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = prevTime + 1;
          
          // Check if overtime based on current time (after 5:00 PM)
          if (isOvertimeHours()) {
            setIsOvertime(true);
          }
          
          // Also check if worked more than 8 hours (28800 seconds)
          if (newTime > 28800) {
            setIsOvertime(true);
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        console.log('⏸️ Pausing timer - on break or not timed in');
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimeIn, isOnBreak]);

  const fetchEmployeeInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=get_employee_info&emp_id=${employeeInfo.emp_id}`);
      if (response.data.success) {
        setEmployeeInfo(prev => ({
          ...prev,
          ...response.data.employee,
          profile_image: response.data.employee.profile_image
        }));
        setWorkArrangement(response.data.employee.workarrangement || '');
      }
    } catch (error) {
      console.error('Error fetching employee info:', error);
    }
  };

  const fetchTodayStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=get_today_status&emp_id=${employeeInfo.emp_id}`);  
      if (response.data.success && response.data.record) {
        const record = response.data.record;
        if (record.time_in && !record.time_out) {
          
          const currentTimeUTC8 = getCurrentTimeUTC8();
          
          // ONLY start timer if current time is 8:00 AM or later
          if (currentTimeUTC8.getHours() < 8) {
            console.log('⏸️ NOT STARTING TIMER - Before 8:00 AM');
            setAutoRefreshEnabled(true);
            return;
          }
          
          setIsTimeIn(true);
          
          // Always use 8:00 AM as the effective start time for timer calculation
          const workStartTime = new Date(`${record.date} 08:00:00`);
          const actualTimeIn = new Date(`${record.date} ${record.time_in}`);
          
          // Use the later of actual time in or 8:00 AM for timer calculation
          const effectiveStartTime = actualTimeIn > workStartTime ? actualTimeIn : workStartTime;
  
          let diffSeconds = Math.floor((currentTimeUTC8 - effectiveStartTime) / 1000);
  
          // FRONTEND DISPLAY ONLY: Subtract lunch break time for timer display
          // This does NOT affect database calculations or payroll
          const currentHour = currentTimeUTC8.getHours();
          const currentMinute = currentTimeUTC8.getMinutes();
  
          if (currentHour > 13 || (currentHour === 13 && currentMinute > 0)) {
            // Past 1:00 PM - subtract full 1-hour lunch break from display
            diffSeconds = Math.max(0, diffSeconds - 3600); // 3600 seconds = 1 hour
          } else if (currentHour === 12 || (currentHour === 13 && currentMinute === 0)) {
            // Currently in lunch break (12:00 PM - 1:00 PM) - subtract elapsed lunch time from display
            const lunchStartTime = new Date(`${record.date} 12:00:00`);
            const elapsedLunchSeconds = Math.floor((currentTimeUTC8 - lunchStartTime) / 1000);
            diffSeconds = Math.max(0, diffSeconds - elapsedLunchSeconds);
          }
  
          setCurrentTime(Math.max(0, diffSeconds));
          setTimeInStart(effectiveStartTime);
          
          // Set late minutes with fixed logic
          const lateMins = calculateLateMinutes(record.time_in);
          setLateMinutes(lateMins);
          
          if (isOvertimeHours() || diffSeconds > 28800) {
            setIsOvertime(true);
          }
  
          // Check current break state after a short delay
          setTimeout(() => manageBreakTime(), 2000);
          
          setAutoRefreshEnabled(false);
        } else {
          setAutoRefreshEnabled(true);
        }
      }
    } catch (error) {
      console.error('Error fetching today status:', error);
    }
  };

  const handleTimeToggle = async () => {
    if (!isWeekday()) {
      showCustomAlert('error', 'Weekend Day', 'No work for Saturday and Sunday, See you on Monday!');
      return;
    }

    if (!isTimeIn) {
      try {
        const response = await axios.post(`${API_BASE_URL}?action=time_in`, {
          emp_id: employeeInfo.emp_id
        });
        
        if (response.data.success) {
          const now = getCurrentTimeUTC8();
          const workStartTime = new Date();
          workStartTime.setHours(8, 0, 0, 0);
          const effectiveStartTime = now < workStartTime ? workStartTime : now;
          
          setIsTimeIn(true);
          setTimeInStart(effectiveStartTime);
          setCurrentTime(0);
          setIsOnBreak(false);
          setIsAutoBreak(false);
          setIsOvertime(false);
          setBreakTimeAccumulated(0);
          setAutoRefreshEnabled(false);
          
          if (response.data.late_minutes) {
            setLateMinutes(response.data.late_minutes);
          }
          
          // Check if should be on break immediately
          setTimeout(() => manageBreakTime(), 1000);
          
          showCustomAlert('success', 'Time In Successful', response.data.message);
        }
      } catch (error) {
        const errorMessage = error.response?.data?.error || 'Error recording time in';
        showCustomAlert('error', 'Time In Failed', errorMessage);
      }
    } else {
      try {
        const response = await axios.post(`${API_BASE_URL}?action=time_out`, {
          emp_id: employeeInfo.emp_id
        });
        
        if (response.data.success) {
          setIsTimeIn(false);
          setTodayHours(prevHours => prevHours + currentTime);
          setCurrentTime(0);
          setTimeInStart(null);
          setIsOnBreak(false);
          setIsAutoBreak(false);
          setBreakStartTime(null);
          setIsOvertime(false);
          setLateMinutes(0);
          setBreakTimeAccumulated(0);
          setAutoRefreshEnabled(true);
          
          const summary = `
            Time Out: ${response.data.display_time}
            Total Hours: ${response.data.total_hours}h
            ${response.data.overtime_hours > 0 ? `Overtime: ${response.data.overtime_hours}h` : ''}
          `;
          showCustomAlert('success', 'Time Out Successful', response.data.message + '\n\n' + summary);
        }
      } catch (error) {
        const errorMessage = error.response?.data?.error || 'Error recording time out';
        showCustomAlert('error', 'Time Out Failed', errorMessage);
      }
    }
  };

  // Custom Alert Function
  const showCustomAlert = (type, title, message) => {
    const alertOverlay = document.createElement('div');
    alertOverlay.className = 'custom-alert-overlay';
    
    const alertBox = document.createElement('div');
    alertBox.className = `custom-alert-box ${type}`;
    
    const alertIcon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    const alertColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
    
    alertBox.innerHTML = `
      <div class="custom-alert-header" style="color: ${alertColor}">
        <span class="custom-alert-icon">${alertIcon}</span>
        <h3 class="custom-alert-title">${title}</h3>
      </div>
      <div class="custom-alert-content">
        <p class="custom-alert-message">${message.replace(/\n/g, '<br>')}</p>
      </div>
      <div class="custom-alert-actions">
        <button class="custom-alert-btn custom-alert-btn-primary" onclick="this.closest('.custom-alert-overlay').remove()">
          OK
        </button>
      </div>
    `;
    
    alertOverlay.appendChild(alertBox);
    document.body.appendChild(alertOverlay);
    
    if (!document.getElementById('custom-alert-styles')) {
      const styles = document.createElement('style');
      styles.id = 'custom-alert-styles';
      styles.textContent = `
        .custom-alert-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease-out;
        }
        .custom-alert-box {
          background: white;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          animation: slideInScale 0.3s ease-out;
          min-width: 400px;
          max-width: 90vw;
          max-height: 80vh;
          overflow-y: auto;
        }
        .custom-alert-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f1f5f9;
        }
        .custom-alert-icon {
          font-size: 24px;
        }
        .custom-alert-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }
        .custom-alert-content {
          margin-bottom: 25px;
        }
        .custom-alert-message {
          font-size: 1rem;
          line-height: 1.6;
          color: #4a5568;
          margin: 0;
          white-space: pre-wrap;
        }
        .custom-alert-actions {
          display: flex;
          justify-content: center;
        }
        .custom-alert-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 1rem;
        }
        .custom-alert-btn-primary {
          background: #003D7C;
          color: white;
        }
        .custom-alert-btn-primary:hover {
          background: #002a5c;
          transform: translateY(-1px);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInScale {
          from { opacity: 0; transform: scale(0.9) translateY(-20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `;
      document.head.appendChild(styles);
    }
    
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        if (alertOverlay.parentNode) {
          alertOverlay.remove();
        }
      }, 5000);
    }
  };

  const handleBreakToggle = () => {
    if (isAutoBreak) {
      showCustomAlert('info', 'Automatic Break', 'You are currently on automatic lunch break (12:00 PM - 1:00 PM).\nBreak will end automatically at 1:00 PM.');
      return;
    }
    
    showCustomAlert('info', 'Manual Break', 'Manual breaks are managed automatically during lunch time (12:00 PM - 1:00 PM).');
  };

  // Check if break is allowed (after 4 hours) but not during lunch time if auto break is active
  const isBreakAllowed = () => {
    if (currentTime < 14400) return false; // Less than 4 hours
    if (isAutoBreak) return false; // Cannot manually break during auto break
    return true;
  };

  const getCurrentDate = () => {
    const utc8Time = getCurrentTimeUTC8();
    return utc8Time.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
  };

  const getGreeting = () => {
    const utc8Time = getCurrentTimeUTC8();
    const hour = utc8Time.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStatusText = () => {
    if (!isWeekday()) return 'Weekend';
    if (isOnBreak && isAutoBreak) return 'Lunch Break';
    if (isOnBreak) return 'On Break';
    if (isOvertime && isTimeIn) return 'Overtime';
    if (lateMinutes > 0 && isTimeIn) return `Late (${lateMinutes}m)`;
    return isTimeIn ? 'On Duty' : 'Off Duty';
  };

  const getStatusClass = () => {
    if (!isWeekday()) return 'emp-dash-weekend-status';
    if (isOnBreak) return 'emp-dash-break-status';
    if (isOvertime && isTimeIn) return 'emp-dash-overtime-status';
    if (lateMinutes > 0 && isTimeIn) return 'emp-dash-late-status';
    return isTimeIn ? 'emp-dash-active-status' : 'emp-dash-inactive-status';
  };

  const formatTimeWithTimezone = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      timeZone: 'Asia/Manila'
    });
  };

  
  // Get work progress percentage (8 hours = 100%)
    const getWorkProgress = () => {
      // Use currentTime directly since it already excludes lunch break time
      const workSeconds = todayHours + (isTimeIn ? currentTime : 0);
      const eightHours = 8 * 3600; // 8 hours in seconds
      return Math.min((workSeconds / eightHours) * 100, 100);
    };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      if (breakCheckIntervalRef.current) {
        clearInterval(breakCheckIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="emp-dash-container">
      <div className="emp-dash-header">
        <div className="emp-dash-header-content">
          <div className="emp-dash-user-info">
            <div className="emp-dash-user-avatar">
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
              <span style={{ display: employeeInfo.profile_image ? 'none' : 'block' }}>
                {employeeInfo.firstName?.[0]}{employeeInfo.lastName?.[0]}
              </span>
            </div>
            <div className="emp-dash-user-details">
              <h1 className="emp-dash-greeting">
                {getGreeting()}, {employeeInfo.firstName}
              </h1>
              <p className="emp-dash-date">{getCurrentDate()}</p>
            </div>
          </div>
          <div className="emp-dash-status-badge">
            <span className={`emp-dash-status-dot ${getStatusClass()}`}></span>
            {getStatusText()}
          </div>
        </div>
      </div>

      <div className="emp-dash-content">
        {/* Time Tracking Section */}
        <div className="emp-dash-time-section">
          <div className="emp-dash-time-card emp-dash-main-card">
            <div className="emp-dash-card-header">
              <h3>Time Tracker</h3>
              <div className="emp-dash-timer-display">
                <span className="emp-dash-time-text">{formatTime(currentTime)}</span>
                <div className="emp-dash-status-indicators">
                  {isOnBreak && isAutoBreak && <span className="emp-dash-lunch-indicator">LUNCH BREAK</span>}
                  {isOnBreak && !isAutoBreak && <span className="emp-dash-break-indicator">BREAK</span>}
                  {isOvertime && isTimeIn && <span className="emp-dash-overtime-indicator">OVERTIME</span>}
                  {lateMinutes > 0 && isTimeIn && <span className="emp-dash-late-indicator">LATE ({lateMinutes}m)</span>}
                </div>
              </div>
            </div>
          
            <div className="emp-dash-time-controls">
              <div className="emp-dash-button-group">
                {workArrangement === 'Work From Home' && (
                  <button 
                    className={`emp-dash-time-button ${isTimeIn ? 'emp-dash-time-out' : 'emp-dash-time-in'}`}
                    onClick={handleTimeToggle}
                    disabled={!isWeekday()}
                  >
                    {isTimeIn ? 'Time Out' : 'Time In'}
                  </button>
                )}
                
                {workArrangement === 'Work From Home' && (
                  <button 
                    className={`emp-dash-break-button ${isOnBreak ? 'emp-dash-end-break' : 'emp-dash-start-break'} ${!isBreakAllowed() ? 'emp-dash-disabled' : ''}`}
                    onClick={handleBreakToggle}
                    disabled={!isTimeIn || !isBreakAllowed()}
                    title={
                      !isBreakAllowed() 
                        ? 'Break available after 4 hours of work' 
                        : isAutoBreak 
                          ? 'Automatic lunch break (12:00 PM - 1:00 PM)' 
                          : 'Take a break'
                    }
                  >
                    {isOnBreak ? (isAutoBreak ? 'Lunch Break' : 'End Break') : 'Break Time'}
                  </button>
                )}
                
                {workArrangement !== 'Work From Home' && (
                  <div className="emp-dash-info-text">
                    <p>Use Biometric Fingerprints to Attendance</p>
                    <span className="emp-dash-status-text">
                      {isTimeIn ? 'Timer running from biometric scan' : 'Waiting for biometric scan...'}
                    </span>
                  </div>
                )}
              </div>
              
              {timeInStart && (
                <div className="emp-dash-session-info">
                  <span>Session started: {formatTimeWithTimezone(timeInStart)}</span>
                  {breakStartTime && !isAutoBreak && (
                    <span>Break started: {formatTimeWithTimezone(breakStartTime)}</span>
                  )}
                  {isAutoBreak && (
                    <span>Lunch break: 12:00 PM - 1:00 PM</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Today Hours Card */}
          <div className="emp-dash-hours-card">
            <div className="emp-dash-card-header">
              <h3>Today's Progress</h3>
            </div>
            <div className="emp-dash-hours-content">
              <div className="emp-dash-hours-display">
                <span className="emp-dash-hours-number">{formatHours(todayHours + (isTimeIn && !isOnBreak ? currentTime : 0))}</span>
                <span className="emp-dash-hours-unit">hrs</span>
              </div>
              <div className="emp-dash-progress-section">
                <div className="emp-dash-progress-bar">
                  <div 
                    className="emp-dash-progress-fill" 
                    style={{ width: `${getWorkProgress()}%` }}
                  ></div>
                </div>
                <span className="emp-dash-progress-text">
                  {Math.round(getWorkProgress())}% of 8-hour work day
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="emp-dash-stats-grid">
          <div className="emp-dash-stat-card">
            <div className="emp-dash-stat-icon emp-dash-clock-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <div className="emp-dash-stat-content">
              <h4>Current Session</h4>
              <p className="emp-dash-stat-value">{formatTime(currentTime)}</p>
            </div>
          </div>

          <div className="emp-dash-stat-card">
            <div className="emp-dash-stat-icon emp-dash-calendar-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="emp-dash-stat-content">
              <h4>Work Status</h4>
              <p className="emp-dash-stat-value">
                {!isWeekday() ? 'Weekend' : isTimeIn ? 'Active' : 'Idle'}
              </p>
            </div>
          </div>

          <div className="emp-dash-stat-card">
            <div className="emp-dash-stat-icon emp-dash-chart-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <div className="emp-dash-stat-content">
              <h4>Daily Progress</h4>
              <p className="emp-dash-stat-value">{Math.round(getWorkProgress())}%</p>
            </div>
          </div>

          <div className="emp-dash-stat-card">
            <div className="emp-dash-stat-icon emp-dash-user-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="emp-dash-stat-content">
              <h4>Overtime</h4>
              <p className="emp-dash-stat-value">
                {isOvertime ? formatHours(Math.max(0, currentTime - 28800)) : '0.00'}h
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="emp-dash-activity-section">
          <div className="emp-dash-activity-card">
            <div className="emp-dash-card-header">
              <h3>Today's Schedule</h3>
            </div>
            <div className="emp-dash-activity-list">
              <div className="emp-dash-activity-item">
                <div className="emp-dash-activity-icon emp-dash-work-start-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                </div>
                <div className="emp-dash-activity-content">
                  <p className="emp-dash-activity-title">Work Hours</p>
                  <p className="emp-dash-activity-time">8:00 AM - 5:00 PM (8 hours)</p>
                </div>
              </div>
              
              <div className="emp-dash-activity-item">
                <div className="emp-dash-activity-icon emp-dash-lunch-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                  </svg>
                </div>
                <div className="emp-dash-activity-content">
                  <p className="emp-dash-activity-title">Lunch Break</p>
                  <p className="emp-dash-activity-time">12:00 PM - 1:00 PM (Automatic)</p>
                </div>
              </div>

              <div className="emp-dash-activity-item">
                <div className="emp-dash-activity-icon emp-dash-overtime-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="6" width="12" height="12"/>
                  </svg>
                </div>
                <div className="emp-dash-activity-content">
                  <p className="emp-dash-activity-title">Overtime</p>
                  <p className="emp-dash-activity-time">After 5:00 PM</p>
                </div>
              </div>

              <div className="emp-dash-activity-item">
                <div className="emp-dash-activity-icon emp-dash-weekend-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div className="emp-dash-activity-content">
                  <p className="emp-dash-activity-title">Rest Days</p>
                  <p className="emp-dash-activity-time">Saturday & Sunday</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEmployee;