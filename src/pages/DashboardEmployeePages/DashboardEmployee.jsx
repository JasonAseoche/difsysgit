import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getCurrentUser, getUserId } from '../../utils/auth';
import DashboardHeader from '../../components/DashboardHeader/DashboardHeader';
import '../../components/EmployeeLayout/DashboardEmployee.css';

const DashboardEmployee = () => {
  const [workArrangement, setWorkArrangement] = useState('');
  const [isTimeIn, setIsTimeIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [todayHours, setTodayHours] = useState(0);
  const [timeInStart, setTimeInStart] = useState(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [shiftType, setShiftType] = useState('day');
  const [currentShiftType, setCurrentShiftType] = useState('day');
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

  // MODIFIED: Get current time in UTC+8 timezone with database test mode support
  const getCurrentTimeUTC8 = async () => {
    try {
      // Check database for test mode settings
      const response = await axios.get(`${API_BASE_URL}?action=get_test_settings`);
      
      if (response.data.success && response.data.data && response.data.data.test_mode === 1) {
        const { test_time, test_date } = response.data.data;
        
        if (test_time && test_date) {
          const [hours, minutes, seconds] = test_time.split(':');
          const testDateTime = new Date(test_date);
          testDateTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds) || 0);
          
          
          return testDateTime;
        }
      }
      
      // Fallback to real time if test mode is off or data is missing
      const now = new Date();
      const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
      return utc8Time;
    } catch (error) {
      console.warn('Failed to fetch test settings, using real time:', error);
      // Fallback to real time on error
      const now = new Date();
      const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
      return utc8Time;
    }
  };

  // Check if current time is within work hours (8:00 AM - 5:00 PM)
  const isWorkHours = async (shiftType = 'day') => {
    const now = await getCurrentTimeUTC8();
    const hour = now.getHours();
    
    if (shiftType === 'day') {
      return hour >= 6 && hour < 17; // 6:00 AM - 5:00 PM (attendance allowed)
    } else {
      return hour >= 22 || hour < 6; // 10:00 PM - 6:00 AM (next day)
    }
  };

  // Check if current time is break time (12:00 PM - 1:00 PM)
  const isBreakTime = async () => {
    if (shiftType === 'night') {
      return false; // No lunch break for night shift
    }
    
    const now = await getCurrentTimeUTC8();
    const hour = now.getHours();
    const minute = now.getMinutes();
    return hour === 12 || (hour === 13 && minute === 0);
  };

  // Check if current time is overtime (after 5:00 PM)
  const isOvertimeHours = async (shiftType = 'day') => {
    const now = await getCurrentTimeUTC8();
    const hour = now.getHours();
    
    if (shiftType === 'day') {
      return hour >= 17; // After 5:00 PM for day shift
    } else {
      // FIXED: Night shift overtime is after 6:00 AM until 8:00 AM
      return hour >= 6 && hour < 8; // 6:00 AM to 8:00 AM is overtime for night shift
    }
  }

  // Fixed late calculation (same as API)
  const calculateLateMinutes = (timeIn, shiftType = null) => {
    const timeInObj = new Date(`2000-01-01 ${timeIn}`);
  
    // Detect shift type if not provided
    if (!shiftType) {
      const hour = timeInObj.getHours();
      shiftType = (hour >= 6 && hour < 18) ? 'day' : 'night';
    }
  
    if (shiftType === 'day') {
      const workStartTime = new Date('2000-01-01 08:00:00');
      const graceTime = new Date('2000-01-01 08:10:00');
  
      if (timeInObj <= graceTime) {
        return 0;
      }
  
      const diffMs = timeInObj - workStartTime;
      return Math.floor(diffMs / (1000 * 60));
    } else {
      // Night shift
      const currentHour = timeInObj.getHours();
  
      if (currentHour >= 22) {
        // Same day (10:00 PM – 11:59 PM)
        const workStartTime = new Date('2000-01-01 22:00:00');
        const graceTime = new Date('2000-01-01 22:10:00');
  
        if (timeInObj <= graceTime) {
          return 0;
        }
  
        const diffMs = timeInObj - workStartTime;
        return Math.floor(diffMs / (1000 * 60));
      } else if (currentHour >= 18 && currentHour < 22) {
        // Early arrival (6:00 PM – 9:59 PM) → not late
        return 0;
      } else {
        // Next day (00:00 AM – 06:00 AM)
        const workStartTime = new Date('2000-01-01 22:00:00');
        const graceTime = new Date('2000-01-01 22:10:00');
  
        // Shift timeIn to next day
        const nextDayTimeIn = new Date('2000-01-02 ' + timeIn);
  
        if (nextDayTimeIn <= new Date(graceTime.getTime() + 24 * 60 * 60 * 1000)) {
          return 0;
        }
  
        const diffMs = nextDayTimeIn - workStartTime;
        return Math.floor(diffMs / (1000 * 60));
      }
    }
  };
  

  // MODIFIED: ENHANCED break time management with better logging and state handling
  const manageBreakTime = async () => {
    const now = await getCurrentTimeUTC8(); // CHANGED: Made async
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Only manage breaks if timer should be running and employee is timed in
    if (currentHour < 8 || !isTimeIn || !employeeInfo.emp_id) {
      return;
    }
    
    // FIXED: Prevent duplicate API calls within the same minute
    if (lastBreakCheck) {
      const timeDiff = Math.abs(now.getTime() - lastBreakCheck.getTime());
      if (timeDiff < 45000) { // Increased to 45 seconds to prevent loops
        return;
      }
    }
    
    try {
      
      
      const url = `${API_BASE_URL}?action=get_break_status&emp_id=${employeeInfo.emp_id}`;
      
      
      const response = await axios.get(url);
      
      
      
      
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
        
        // FIXED: Check for state changes to prevent unnecessary alerts
        const stateChanged = (is_on_break !== isOnBreak) || (is_auto_break !== isAutoBreak);
        
        // PRIORITY 1: Handle lunch break START (12:00 PM)
        if (currentHour === 12 && !isOnBreak && is_on_break && is_auto_break && stateChanged) {
          
          setIsOnBreak(true);
          setIsAutoBreak(true);
          
          const breakStart = new Date(`${now.toDateString()} 12:00:00`);
          setBreakStartTime(breakStart);
          
          // FIXED: Only show alert once when state actually changes
          showCustomAlert('info', 'Lunch Break Started', 'Timer paused for lunch break (12:00 PM - 1:00 PM)');
        }
        
        // PRIORITY 2: Handle lunch break END (1:00 PM or after)
        if (currentHour >= 13 && isOnBreak && (break_end_time || !is_on_break) && stateChanged) {
          
          setIsOnBreak(false);
          setIsAutoBreak(false);
          setBreakStartTime(null);
          
          // FIXED: Only show alert when state actually changes
          showCustomAlert('success', 'Lunch Break Ended', 'Timer resumed. Welcome back from lunch!');
        }
                
        // PRIORITY 3: Sync state if out of sync but avoid duplicate alerts
        if (is_on_break !== isOnBreak && !stateChanged) {
          
          setIsOnBreak(is_on_break);
          setIsAutoBreak(is_auto_break);
          
          if (is_on_break && break_start_time) {
            const breakStart = new Date(`${now.toDateString()} ${break_start_time}`);
            setBreakStartTime(breakStart);
          } else {
            setBreakStartTime(null);
          }
          
          // FIXED: Only show resume alert when break ends, not during sync
          if (!is_on_break && isOnBreak && currentHour >= 13) {
            showCustomAlert('success', 'Lunch Break Ended', 'Timer resumed. Welcome back from lunch!');
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

  // MODIFIED: CRITICAL: Break monitoring with proper timing
  useEffect(() => {
    if (isTimeIn && employeeInfo.emp_id) {
      
      
      // Check break status every 15 seconds during lunch time, every 60 seconds otherwise
      const getCheckInterval = async () => {
        const now = await getCurrentTimeUTC8(); // CHANGED: Made async
        const hour = now.getHours();
        
        // More frequent checks during lunch time and transition periods
        if (hour >= 11 && hour <= 13) {
          return 15000; // 15 seconds during lunch period
        }
        return 60000; // 60 seconds otherwise
      };
      
      // Initial check
      const initialCheck = async () => {
        await manageBreakTime(); // CHANGED: Made async
      };
      initialCheck();
      
      // Set up interval with dynamic timing
      const checkBreakStatus = async () => {
        await manageBreakTime(); // CHANGED: Made async
        
        // Clear existing interval and set new one with updated timing
        if (breakCheckIntervalRef.current) {
          clearInterval(breakCheckIntervalRef.current);
        }
        
        const interval = await getCheckInterval();
        breakCheckIntervalRef.current = setInterval(async () => {
          await manageBreakTime(); // CHANGED: Made async
        }, interval);
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
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, immediately check break state
        const now = await getCurrentTimeUTC8(); // CHANGED: Made async
        if (now.getHours() >= 8 && isTimeIn) {
          
          await manageBreakTime(); // CHANGED: Made async
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

  const checkTimerStatus = async () => {
    if (!employeeInfo.emp_id || workArrangement === 'Work From Home') return;

    if (isTimeIn && currentShiftType === 'night') {
      const currentHour = (await getCurrentTimeUTC8()).getHours(); // CHANGED: Made async
      if ((currentHour >= 22) || (currentHour >= 0 && currentHour < 8)) {
        // Timer is running during valid night shift hours - don't recalculate
        
        return;
      }
    }
  
    try {
      
      
      
      
      const response = await axios.get(`${API_BASE_URL}?action=check_timer_status&emp_id=${employeeInfo.emp_id}`);
      
      
      if (response.data.success) {
        const { shouldStartTimer, isBreakTime: apiBreakTime, record } = response.data;
        
        console.log('Timer Status Data:', {
          shouldStartTimer,
          apiBreakTime,
          record,
          currentIsTimeIn: isTimeIn
        });
        
        const recordShiftType = record?.shift_type || await detectCurrentShiftType(); // CHANGED: Made async
        setCurrentShiftType(recordShiftType);
        
        // PRIORITY 1: Check if timer should STOP (employee timed out)
        if (isTimeIn && record && record.time_out) {
          
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
          
          
          
          
          const currentTimeUTC8 = await getCurrentTimeUTC8(); // CHANGED: Made async
          const currentHour = currentTimeUTC8.getHours();
          
          
          
          
          
          // REWRITTEN: Comprehensive shift validation logic
          let canStartTimer = false;
          let validationMessage = '';
          
          if (recordShiftType === 'day') {
            // Day shift: 8:00 AM onwards (continues during overtime after 5 PM)
            canStartTimer = currentHour >= 8;
            validationMessage = `Day shift check: Current hour ${currentHour} >= 8 = ${canStartTimer}`;
          } else if (recordShiftType === 'night') {
            // Night shift: Only during actual work hours (10:00 PM - 6:00 AM)
            // NOT during early arrival period (6:00 PM - 9:59 PM)
            const isWorkHours = currentHour >= 22 || currentHour < 8;
            
            if (record.time_in) {
              const timeInHour = parseInt(record.time_in.split(':')[0]);
              const isEarlyArrival = timeInHour >= 18 && timeInHour < 22;
              const isCurrentlyEarly = currentHour >= 18 && currentHour < 22;
              
              if (isEarlyArrival && isCurrentlyEarly) {
                // Employee timed in early and current time is still in early period
                canStartTimer = false;
                validationMessage = `Night shift early arrival: Time in at ${timeInHour}:xx, current hour ${currentHour} - timer waits until 10 PM`;
              } else if (isEarlyArrival && !isCurrentlyEarly) {
                // Employee timed in early but now it's work time
                canStartTimer = isWorkHours;
                validationMessage = `Night shift post-early arrival: Now ${currentHour}:xx, work hours = ${isWorkHours}`;
              } else {
                // Normal night shift time in
                canStartTimer = isWorkHours;
                validationMessage = `Night shift normal: Current hour ${currentHour}, work hours (22+ OR <6) = ${isWorkHours}`;
              }
            } else {
              canStartTimer = isWorkHours;
              validationMessage = `Night shift no time_in data: Current hour ${currentHour}, work hours = ${isWorkHours}`;
            }
          }
          
          
          
          if (!canStartTimer) {
            
            return;
          }
          
          
          
          // Calculate elapsed seconds using enhanced shift-aware logic
          const { elapsedSeconds, effectiveStartTime } = calculateElapsedTimeEnhanced( // CHANGED: Back to synchronous
            record.time_in, 
            record.date, 
            currentTimeUTC8, 
            recordShiftType,
            record.last_time_in,
            record.accumulated_hours || 0
          );
  
          
          
          
  
          setIsTimeIn(true);
          setCurrentTime(elapsedSeconds);
          setTimeInStart(effectiveStartTime);
          setAutoRefreshEnabled(false);
          setBreakTimeAccumulated(0);
          
          // Calculate late minutes with shift-aware logic
          const lateMins = record.late_minutes || calculateLateMinutes(record.time_in, record.shift_type);
          setLateMinutes(lateMins);
          
          const isOvertimeNow = await isOvertimeHours(recordShiftType); // CHANGED: Made async
          if (isOvertimeNow || elapsedSeconds > 28800) {
            setIsOvertime(true);
          }
          
          // Check if currently in break time (only for day shift)
          if (recordShiftType === 'day') {
            setTimeout(async () => await manageBreakTime(), 1000); // CHANGED: Made async
          }
          
          
        } else {
          
          
          
          
          
          
        }
      }
    } catch (error) {
      console.error('Error checking timer status:', error);
    }
  };


  const calculateElapsedTimeEnhanced = (timeIn, date, currentTimeUTC8, shiftType = 'day', lastTimeIn = null, accumulatedMinutes = 0) => {
    console.log('CALCULATE ELAPSED TIME ENHANCED - START');
    console.log('Input parameters:', {
      timeIn,
      recordDate: date,
      currentTime: currentTimeUTC8.toLocaleString(),
      shiftType,
      lastTimeIn,
      accumulatedMinutes
    });
  
    const effectiveTimeIn = lastTimeIn || timeIn;
    console.log('Effective time in:', effectiveTimeIn);
    
    let effectiveStartTime;
    let currentSessionSeconds = 0;
    const accumulatedSeconds = accumulatedMinutes * 60;
    
    // Create consistent session key for localStorage
    const sessionKey = `session_${date}_${effectiveTimeIn.replace(/:/g, '')}_${shiftType}`;
    console.log('Session key:', sessionKey);
    
    // Helper function to get stored session data
    const getStoredSessionData = () => {
      try {
        const storedData = localStorage.getItem(sessionKey);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log('Retrieved stored session data:', parsedData);
          return parsedData;
        }
      } catch (e) {
        console.log('Error parsing stored session data:', e);
      }
      return null;
    };
    
    // Helper function to store session data
    const storeSessionData = (seconds) => {
      const sessionData = {
        accumulated: seconds,
        lastUpdate: new Date().toISOString(),
        effectiveTimeIn: effectiveTimeIn,
        date: date,
        shiftType: shiftType
      };
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      console.log('Stored session data:', sessionData);
    };
    
    // Check if this is a re-entry (lastTimeIn exists and is different from original timeIn)
    const isReEntry = lastTimeIn && lastTimeIn !== timeIn;
    
    if (isReEntry) {
      console.log('RE-ENTRY DETECTED - Starting timer from actual re-entry time');
      
      if (shiftType === 'day') {
        const lastTimeInHour = parseInt(lastTimeIn.split(':')[0]);
        const lastTimeInMinute = parseInt(lastTimeIn.split(':')[1]);
        const currentHour = currentTimeUTC8.getHours();
        const currentMinute = currentTimeUTC8.getMinutes();
        
        if (currentHour < 8) {
          // Current time is before work starts - no session time yet
          currentSessionSeconds = 0;
          effectiveStartTime = new Date(`${date} 08:00:00`);
          console.log('DAY SHIFT RE-ENTRY: Before 8 AM - waiting for work hours');
        } else {
          // Get stored session data first
          const storedData = getStoredSessionData();
          let storedSeconds = storedData ? storedData.accumulated : 0;
          
          // Calculate fresh elapsed time
          effectiveStartTime = new Date(`${date} ${lastTimeIn}`);
          
          if (lastTimeInHour < 8) {
            // Start counting from 8:00 AM, not from the early re-entry time
            effectiveStartTime = new Date(`${date} 08:00:00`);
            currentSessionSeconds = Math.floor((currentTimeUTC8 - effectiveStartTime) / 1000);
          } else {
            // Normal re-entry during work hours
            currentSessionSeconds = Math.floor((currentTimeUTC8 - effectiveStartTime) / 1000);
          }
          
          currentSessionSeconds = Math.max(0, currentSessionSeconds);
          
          // Apply lunch break deduction only if this session spans lunch time
          if (lastTimeInHour < 12 && currentHour >= 13) {
            if (currentHour > 13) {
              currentSessionSeconds = Math.max(0, currentSessionSeconds - 3600);
            } else if (currentHour === 13 && currentMinute > 0) {
              currentSessionSeconds = Math.max(0, currentSessionSeconds - 3600);
            }
          }
          
          // Use maximum between stored and fresh calculation
          currentSessionSeconds = Math.max(storedSeconds, currentSessionSeconds);
          
          console.log('DAY SHIFT RE-ENTRY: Stored:', storedSeconds, 'Fresh:', currentSessionSeconds, 'Using:', currentSessionSeconds);
          
          // Store updated session data
          storeSessionData(currentSessionSeconds);
        }
        
      } else {
        // Night shift re-entry
        const lastTimeInHour = parseInt(lastTimeIn.split(':')[0]);
        const currentHour = currentTimeUTC8.getHours();
        const currentMinutes = currentTimeUTC8.getMinutes();
        
        console.log('NIGHT SHIFT RE-ENTRY:');
        console.log('- Last time in hour:', lastTimeInHour);
        console.log('- Current hour:', currentHour);
        
        // Get stored session data
        const storedData = getStoredSessionData();
        let storedSeconds = storedData ? storedData.accumulated : 0;
        
        if (lastTimeInHour >= 18 && lastTimeInHour < 22) {
          // Re-entry during early arrival (6PM-9:59PM)
          if (currentHour >= 18 && currentHour < 22) {
            // Still in early arrival period
            currentSessionSeconds = Math.max(storedSeconds, 0);
            effectiveStartTime = new Date(`${date} 22:00:00`);
            console.log('- Still in early arrival, using stored:', currentSessionSeconds);
          } else if (currentHour >= 22) {
            // Now in work hours - calculate from 10 PM
            effectiveStartTime = new Date(`${date} 22:00:00`);
            const currentTimeForCalc = new Date(`${date} ${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}:00`);
            const freshSeconds = Math.floor((currentTimeForCalc - effectiveStartTime) / 1000);
            currentSessionSeconds = Math.max(storedSeconds, freshSeconds);
            console.log('- Counting from 10 PM same day:', currentSessionSeconds);
          } else if (currentHour >= 0 && currentHour < 8) {
            // Next day - count from 10 PM to current time
            effectiveStartTime = new Date(`${date} 22:00:00`);
            const hoursFromTenPM = (24 - 22) + currentHour;
            const minutesFromTenPM = hoursFromTenPM * 60 + currentMinutes;
            const freshSeconds = minutesFromTenPM * 60;
            currentSessionSeconds = Math.max(storedSeconds, freshSeconds);
            console.log('- Next day calculation, using:', currentSessionSeconds);
          }
          
        } else if (lastTimeInHour >= 22) {
          // Re-entry during work hours (10 PM onwards)
          effectiveStartTime = new Date(`${date} ${lastTimeIn}`);
          
          if (currentHour >= 22) {
            // Same day work hours
            const timeInDate = new Date(`${date} ${lastTimeIn}`);
            const freshSeconds = Math.floor((currentTimeUTC8 - timeInDate) / 1000);
            currentSessionSeconds = Math.max(storedSeconds, freshSeconds);
            effectiveStartTime = timeInDate;
            console.log('- Night shift re-entry, using:', currentSessionSeconds);
          } else if (currentHour >= 0 && currentHour < 8) {
            // Crossed to next day
            const lastHour = parseInt(lastTimeIn.split(':')[0]);
            const lastMinute = parseInt(lastTimeIn.split(':')[1]);
            const minutesToMidnight = (23 - lastHour) * 60 + (60 - lastMinute);
            const minutesAfterMidnight = currentHour * 60 + currentMinutes;
            const freshSeconds = (minutesToMidnight + minutesAfterMidnight) * 60;
            currentSessionSeconds = Math.max(storedSeconds, freshSeconds);
            console.log('- Crossed midnight, using:', currentSessionSeconds);
          }
          
        } else if (lastTimeInHour >= 0 && lastTimeInHour < 8) {
          // Re-entry during next day work hours (12 AM - 8 AM)
          effectiveStartTime = new Date(`${date} ${lastTimeIn}`);
          effectiveStartTime.setDate(effectiveStartTime.getDate() + 1);
          
          const currentTimeForCalc = new Date(`${date} ${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}:00`);
          currentTimeForCalc.setDate(currentTimeForCalc.getDate() + 1);
          
          const freshSeconds = Math.floor((currentTimeForCalc - effectiveStartTime) / 1000);
          currentSessionSeconds = Math.max(storedSeconds, freshSeconds);
          console.log('- Next day work hours re-entry, using:', currentSessionSeconds);
        }
        
        // Store updated session data
        storeSessionData(currentSessionSeconds);
        
        currentSessionSeconds = Math.max(0, currentSessionSeconds);
        if (currentSessionSeconds > 28800) {
          currentSessionSeconds = 28800; // Cap at 8 hours per session
        }
      }
      
    } else {
      // FIRST TIME-IN LOGIC
      console.log('FIRST TIME-IN DETECTED - Starting fresh timer');
      
      if (shiftType === 'day') {
        const timeInHour = parseInt(effectiveTimeIn.split(':')[0]);
        const timeInMinute = parseInt(effectiveTimeIn.split(':')[1]);
        const currentHour = currentTimeUTC8.getHours();
        const currentMinute = currentTimeUTC8.getMinutes();
        
        console.log('DAY SHIFT FIRST TIME-IN:');
        console.log('- Time in hour:', timeInHour);
        console.log('- Current hour:', currentHour);
        
        // Get stored session data
        const storedData = getStoredSessionData();
        let storedSeconds = storedData ? storedData.accumulated : 0;
        
        if (currentHour < 8) {
          // Current time is before work starts
          currentSessionSeconds = Math.max(storedSeconds, 0);
          effectiveStartTime = new Date(`${date} 08:00:00`);
          console.log('- Before work hours, using stored:', currentSessionSeconds);
        } else {
          // Work hours - calculate elapsed time from actual time-in or 8:00 AM
          if (timeInHour < 8) {
            // Early time-in, start counting from 8:00 AM
            effectiveStartTime = new Date(`${date} 08:00:00`);
            const freshSeconds = Math.floor((currentTimeUTC8 - effectiveStartTime) / 1000);
            currentSessionSeconds = Math.max(storedSeconds, freshSeconds);
            
            // Apply lunch break deduction if applicable
            if (currentHour >= 13) {
              if (currentHour > 13) {
                currentSessionSeconds = Math.max(0, currentSessionSeconds - 3600);
              } else if (currentHour === 13 && currentMinute > 0) {
                currentSessionSeconds = Math.max(0, currentSessionSeconds - 3600);
              }
            }
          } else {
            // Normal time-in during work hours
            effectiveStartTime = new Date(`${date} ${effectiveTimeIn}`);
            const freshSeconds = Math.floor((currentTimeUTC8 - effectiveStartTime) / 1000);
            currentSessionSeconds = Math.max(storedSeconds, freshSeconds);
            
            // Apply lunch break deduction if applicable
            if (timeInHour < 12 && currentHour >= 13) {
              if (currentHour > 13) {
                currentSessionSeconds = Math.max(0, currentSessionSeconds - 3600);
              } else if (currentHour === 13 && currentMinute > 0) {
                currentSessionSeconds = Math.max(0, currentSessionSeconds - 3600);
              }
            }
          }
          
          console.log('- Day shift calculation, stored:', storedSeconds, 'fresh calculation, using:', currentSessionSeconds);
        }
        
        // Store session data
        storeSessionData(currentSessionSeconds);
        
      } else {
        // NIGHT SHIFT FIRST TIME-IN
        const timeInHour = parseInt(effectiveTimeIn.split(':')[0]);
        const currentHour = currentTimeUTC8.getHours();
        const currentMinute = currentTimeUTC8.getMinutes();
        
        console.log('NIGHT SHIFT FIRST TIME-IN:');
        console.log('- Time in hour:', timeInHour);
        console.log('- Current hour:', currentHour);
        
        // Get stored session data
        const storedData = getStoredSessionData();
        let storedSeconds = storedData ? storedData.accumulated : 0;
        
        if (timeInHour >= 18 && timeInHour < 22) {
          // Early arrival (6PM-9:59PM)
          if (currentHour >= 18 && currentHour < 22) {
            // Still in early arrival period
            currentSessionSeconds = Math.max(storedSeconds, 0);
            effectiveStartTime = new Date(`${date} 22:00:00`);
            console.log('- Early arrival, using stored:', currentSessionSeconds);
          } else if (currentHour >= 22) {
            // Now in work hours - calculate from 10 PM or current time
            effectiveStartTime = new Date(`${date} 22:00:00`);
            const freshSeconds = Math.floor((currentTimeUTC8 - effectiveStartTime) / 1000);
            currentSessionSeconds = Math.max(storedSeconds, freshSeconds);
            console.log('- Work hours started, using:', currentSessionSeconds);
          } else if (currentHour >= 0 && currentHour < 8) {
            // Next day - calculate total time from 10 PM
            effectiveStartTime = new Date(`${date} 22:00:00`);
            const hoursFromTenPM = (24 - 22) + currentHour;
            const minutesFromTenPM = hoursFromTenPM * 60 + currentMinute;
            const freshSeconds = minutesFromTenPM * 60;
            currentSessionSeconds = Math.max(storedSeconds, freshSeconds);
            console.log('- Next day work hours, using:', currentSessionSeconds);
          }
          
        } else if (timeInHour >= 22) {
          // Time in during work hours (10 PM onwards)
          const timeInDate = new Date(`${date} ${effectiveTimeIn}`);
          const freshSeconds = Math.floor((currentTimeUTC8 - timeInDate) / 1000);
          currentSessionSeconds = Math.max(storedSeconds, freshSeconds);
          effectiveStartTime = timeInDate;
          console.log('- Work hours time-in, using:', currentSessionSeconds);
          
        } else if (timeInHour >= 0 && timeInHour < 8) {
          // Time in during next day work hours - FIXED: Both dates must be same day
          const timeInDate = new Date(`${date} ${effectiveTimeIn}`);
          timeInDate.setDate(timeInDate.getDate() + 1); // Next day for time-in
          
          // Also move currentTimeUTC8 to next day for calculation
          const currentTimeNextDay = new Date(currentTimeUTC8);
          currentTimeNextDay.setDate(currentTimeNextDay.getDate() + 1);
          
          currentSessionSeconds = Math.floor((currentTimeNextDay - timeInDate) / 1000);
          currentSessionSeconds = Math.max(0, currentSessionSeconds);
          effectiveStartTime = timeInDate;
          console.log('- Next day work hours time-in, elapsed seconds:', currentSessionSeconds);
        }
        
        // Store session data
        storeSessionData(currentSessionSeconds);
      }
    }
    
    // Final validation
    currentSessionSeconds = Math.max(0, currentSessionSeconds);
    if (currentSessionSeconds > 43200) { // 12 hours max
      currentSessionSeconds = 43200;
    }
    
    // Total elapsed time = accumulated from previous sessions + current session
    const totalElapsedSeconds = accumulatedSeconds + currentSessionSeconds;
    
    console.log('FINAL CALCULATION RESULTS:');
    console.log('Is re-entry:', isReEntry);
    console.log('Effective start time:', effectiveStartTime ? effectiveStartTime.toLocaleString() : 'N/A');
    console.log('Accumulated from previous sessions (seconds):', accumulatedSeconds);
    console.log('Current session seconds:', currentSessionSeconds);
    console.log('Total elapsed seconds:', totalElapsedSeconds);
    console.log('Total elapsed hours:', (totalElapsedSeconds / 3600).toFixed(2));
    
    return {
      elapsedSeconds: totalElapsedSeconds,
      effectiveStartTime: effectiveStartTime || currentTimeUTC8,
      currentSessionSeconds,
      accumulatedSeconds
    };
  };

  const cleanupSession = (timeInStart, shiftType) => {
    if (timeInStart) {
      const dateStr = timeInStart.toISOString().split('T')[0];
      const timeStr = timeInStart.toISOString().split('T')[1].substring(0,8).replace(/:/g, '');
      const sessionKey = `session_${dateStr}_${timeStr}_${shiftType}`;
      
      console.log('Cleaning up session:', sessionKey);
      localStorage.removeItem(sessionKey);
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
  }, [employeeInfo.emp_id, workArrangement, autoRefreshEnabled]);

  // MODIFIED: ENHANCED timer effect with proper break handling
  useEffect(() => {
    if (isTimeIn && !isOnBreak) {
      
      
      timerIntervalRef.current = setInterval(async () => {
        setCurrentTime(prevTime => {
          const updateTimer = async () => {
            const currentTimeUTC8 = await getCurrentTimeUTC8();
            const currentHour = currentTimeUTC8.getHours();
            
            // Check for early arrival periods for BOTH shifts
            if (currentShiftType === 'day') {
              // Day shift early arrival check
              if (currentHour < 8) {
                
                return prevTime; // Don't increment during early arrival period
              }
            } else if (currentShiftType === 'night') {
              // Night shift early arrival check - ONLY pause during 6PM-9:59PM
              if (currentHour >= 18 && currentHour < 22) {
                
                return prevTime; // Don't increment during early arrival period
              }
              // FIXED: Continue running during 6AM-8AM for overtime
              // Timer should only stop after 8:00 AM (changed from 8:00 AM to let API handle it)
              if (currentHour >= 8) {
                
                // Let the API handle stopping the timer via checkTimerStatus
              }
            }
            
            // Normal timer increment
            const newTime = prevTime + 1;
            
            // Check overtime conditions
            const isOvertimeNow = await isOvertimeHours(currentShiftType);
            if (isOvertimeNow) {
              setIsOvertime(true);
            }
            
            if (newTime > 28800) { // More than 8 hours
              setIsOvertime(true);
            }
            
            return newTime;
          };
          
          updateTimer().catch(console.error);
          return prevTime + 1; // Immediate increment, async check happens in background
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimeIn, isOnBreak, currentShiftType, timeInStart]);

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
      console.log('FETCHING TODAY STATUS - START');
      console.log('Employee ID:', employeeInfo.emp_id);
      
      const response = await axios.get(`${API_BASE_URL}?action=get_today_status&emp_id=${employeeInfo.emp_id}`);  
      console.log('Today Status API Response:', response.data);
      
      if (response.data.success && response.data.record) {
        const record = response.data.record;
        console.log('Today Status Record:', record);
        
        if (record.time_in && !record.time_out) {
          console.log('FOUND ACTIVE TIME IN RECORD');
          
          const currentTimeUTC8 = await getCurrentTimeUTC8();
          const currentHour = currentTimeUTC8.getHours();
          
          const recordShiftType = record.shift_type || await detectCurrentShiftType();
          setCurrentShiftType(recordShiftType);
          
          console.log('SHIFT AND TIME INFO:');
          console.log('Current Hour:', currentHour);
          console.log('Current Time:', currentTimeUTC8.toLocaleTimeString());
          console.log('Record Shift Type:', recordShiftType);
          console.log('Accumulated Hours (from DB):', record.accumulated_hours);
  
          // FIXED: Calculate elapsed seconds FIRST before any validation
          const { elapsedSeconds, effectiveStartTime } = calculateElapsedTimeEnhanced(
            record.time_in, 
            record.date, 
            currentTimeUTC8, 
            recordShiftType,
            record.last_time_in,
            record.accumulated_hours || 0
          );
  
          console.log('CALCULATED ELAPSED SECONDS:', elapsedSeconds);
          console.log('EFFECTIVE START TIME:', effectiveStartTime);
  
          // Enhanced shift validation for timer start
          let shouldStartTimer = false;
          let validationReason = '';
  
          if (recordShiftType === 'day') {
            shouldStartTimer = currentHour >= 8;
            validationReason = `Day shift: ${currentHour} >= 8 = ${shouldStartTimer}`;
          } else if (recordShiftType === 'night') {
            // Night shift work hours are 10 PM to 8 AM (includes overtime until 8 AM)
            const isWorkHours = currentHour >= 22 || currentHour < 8;
            
            if (record.time_in) {
              const timeInHour = parseInt(record.time_in.split(':')[0]);
              const isEarlyArrival = timeInHour >= 18 && timeInHour < 22;
              const isCurrentlyEarly = currentHour >= 18 && currentHour < 22;
              
              if (isEarlyArrival && isCurrentlyEarly) {
                shouldStartTimer = false;
                validationReason = `Night shift early arrival: Time in ${timeInHour}:xx, current ${currentHour}:xx - waiting for 10 PM`;
              } else {
                shouldStartTimer = isWorkHours;
                validationReason = `Night shift: Current hour ${currentHour}, work hours (22+ OR <8) = ${shouldStartTimer}`;
              }
            } else {
              shouldStartTimer = isWorkHours;
              validationReason = `Night shift no time_in: Current hour ${currentHour}, work hours (22+ OR <8) = ${shouldStartTimer}`;
            }
          }
  
          console.log('TIMER VALIDATION RESULT:', validationReason);
  
          // FIXED: Now we can safely check elapsedSeconds since it's already calculated
          if (!shouldStartTimer) {
            // Special case: if employee is actually timed in and has valid elapsed time, allow small timers
            if (record && record.time_in && !record.time_out && elapsedSeconds >= 0) {
              console.log('ALLOWING TIMER - Employee is timed in with', elapsedSeconds, 'seconds');
              shouldStartTimer = true;
              validationReason = `Overriding validation - employee has valid time record with ${elapsedSeconds}s elapsed`;
            } else {
              console.log('NOT STARTING TIMER -', validationReason);
              setIsTimeIn(false);
              setAutoRefreshEnabled(true);
              return;
            }
          }
  
          console.log('TIMER VALIDATION PASSED - Starting timer');
          
          setIsTimeIn(true);
          setTimeInStart(effectiveStartTime);
  
          console.log('SETTING TIMER STATE:');
          console.log('Elapsed seconds to set:', elapsedSeconds);
          console.log('Effective start time:', effectiveStartTime);
  
          // FIXED: Don't subtract late minutes from timer - lateness is tracked separately
          const lateMinutes = record.late_minutes || 0;
          setCurrentTime(elapsedSeconds); // Use full elapsed seconds, don't subtract lateness
          setLateMinutes(lateMinutes);
          
          console.log('Late minutes (for status only):', lateMinutes);
          
          const isOvertimeNow = await isOvertimeHours(recordShiftType);
          if (isOvertimeNow || elapsedSeconds > 28800) {
            setIsOvertime(true);
          }
  
          // Check current break state after a short delay (only for day shift)
          if (recordShiftType === 'day') {
            setTimeout(async () => await manageBreakTime(), 2000);
          }
          
          setAutoRefreshEnabled(false);
          
          console.log('TIMER STARTED SUCCESSFULLY FROM fetchTodayStatus');
        } else {
          console.log('NO ACTIVE TIME IN RECORD - Setting auto refresh');
          setAutoRefreshEnabled(true);
        }
      } else {
        console.log('NO RECORD FOUND - Setting auto refresh');
        setAutoRefreshEnabled(true);
      }
    } catch (error) {
      console.error('Error fetching today status:', error);
    }
  };

  const handleTimeToggle = async () => {
  
    if (!isTimeIn) {
      try {
        
        
        const response = await axios.post(`${API_BASE_URL}?action=time_in`, {
          emp_id: employeeInfo.emp_id
        });
        
        
        
        // Check if response contains PHP warnings/errors in the response text
        const responseText = typeof response.data === 'string' ? response.data : '';
        let jsonData = response.data;
        
        // If response contains HTML (PHP warnings), extract the JSON part
        if (responseText.includes('<br />') && responseText.includes('{')) {
          const jsonStart = responseText.lastIndexOf('{');
          const jsonPart = responseText.substring(jsonStart);
          try {
            jsonData = JSON.parse(jsonPart);
          } catch (e) {
            console.error('Failed to parse JSON from response:', e);
            jsonData = { success: false, error: 'Invalid response format' };
          }
        }
        
        if (jsonData.success) {
          const now = await getCurrentTimeUTC8(); // CHANGED: Made async
          
          
          // Detect shift type based on actual time in from response
          const timeInStr = jsonData.time_in;
          const currentShift = detectShiftType(timeInStr);
          setCurrentShiftType(currentShift);
          
          
          
          // Calculate elapsed time for WFH (similar to biometric method)
          let elapsedSeconds = 0;
          let effectiveStartTime = now;
          
          if (jsonData.is_re_entry) {
            // For re-entry, calculate elapsed time from the original time_in or last_time_in
            const timeInToUse = jsonData.last_time_in || jsonData.original_time_in || timeInStr;
            const accumulatedMinutes = jsonData.accumulated_hours || 0;
          
            
            
            
            
            
            // Update todayHours with accumulated hours from previous sessions
            setTodayHours(0); // Convert minutes to seconds
            
            // Use the same calculateElapsedTime function as biometric
            const today = now.toISOString().split('T')[0]; // Get date in YYYY-MM-DD format
            const { elapsedSeconds: calculatedSeconds, effectiveStartTime: calcStartTime } = calculateElapsedTimeEnhanced ( // CHANGED: Back to synchronous
              jsonData.original_time_in || timeInStr, // Use original time_in for calculation
              today, // Today's date
              now,
              currentShift,
              timeInToUse, // Use last_time_in for current session start
              accumulatedMinutes
            );
            
            elapsedSeconds = calculatedSeconds;
            effectiveStartTime = calcStartTime;
            
            
            
          } else {
            // First time in - start from 0 but set proper start time
            elapsedSeconds = 0;
            effectiveStartTime = now;
            
          }
          
          // Check if should start timer now (only for day shift early time-in)
          const currentHour = now.getHours();
          const shouldStartTimerNow = currentShift === 'day' 
            ? currentHour >= 8  // Day shift: only start timer at 8:00 AM or later
            : (currentHour >= 22 || currentHour < 6); // Night shift: existing logic (work hours only, not early arrival)

          if (shouldStartTimerNow) {
            setIsTimeIn(true);
            setTimeInStart(effectiveStartTime);
            setCurrentTime(elapsedSeconds);
            setAutoRefreshEnabled(false);
          } else {
            // Day shift early time-in: don't start timer yet
            setIsTimeIn(false);
            setTimeInStart(null);
            setCurrentTime(0);
            setAutoRefreshEnabled(true);
          }

          setIsOnBreak(false);
          setIsAutoBreak(false);
          setIsOvertime(elapsedSeconds > 28800);
          setBreakTimeAccumulated(0);;
          
          // Set late minutes from response
          const lateMinutes = jsonData.late_minutes || 0;
          setLateMinutes(lateMinutes);
          
          
          
          // Check if should be on break immediately (only for day shift)
          if (currentShift === 'day') {
            setTimeout(async () => await manageBreakTime(), 1000); // CHANGED: Made async
          }
          
          // Show success message
          let alertMessage = jsonData.message;
          if (jsonData.is_re_entry) {
            alertMessage = `Re-time in successful (Session ${jsonData.session_type})`;
          } else if (currentShift === 'day' && currentHour < 8) {
            alertMessage = `Early time-in recorded. Timer will start at 8:00 AM.`;
          }
          
          
          showCustomAlert('success', 'Time In Successful', alertMessage);
          
        } else {
          console.error('❌ WFH Time In Failed:', jsonData);
          showCustomAlert('error', 'Time In Failed', jsonData.error || 'Unknown error');
        }
      } catch (error) {
        console.error('❌ WFH Time In Error:', error);
        const errorMessage = error.response?.data?.error || 'Error recording time in';
        showCustomAlert('error', 'Time In Failed', errorMessage);
      }
    } else {
      try {
        
        
        const response = await axios.post(`${API_BASE_URL}?action=time_out`, {
          emp_id: employeeInfo.emp_id
        });
        
        
        
        // Check if response contains PHP warnings/errors in the response text
        const responseText = typeof response.data === 'string' ? response.data : '';
        let jsonData = response.data;
        
        // If response contains HTML (PHP warnings), extract the JSON part
        if (responseText.includes('<br />') && responseText.includes('{')) {
          const jsonStart = responseText.lastIndexOf('{');
          const jsonPart = responseText.substring(jsonStart);
          try {
            jsonData = JSON.parse(jsonPart);
          } catch (e) {
            console.error('Failed to parse JSON from response:', e);
            jsonData = { success: false, error: 'Invalid response format' };
          }
        }
        
        if (jsonData.success) {
          
          
          setIsTimeIn(false);
          const totalHoursFromBackend = parseFloat(jsonData.total_hours || '0');
          setTodayHours(totalHoursFromBackend * 3600);
          setCurrentTime(0);
          setTimeInStart(null);
          setIsOnBreak(false);
          setIsAutoBreak(false);
          setBreakStartTime(null);
          setIsOvertime(false);
          setLateMinutes(0);
          setBreakTimeAccumulated(0);
          setAutoRefreshEnabled(true);
          
          const summary =  `Time Out: ${jsonData.display_time || 'Recorded'}\nTotal Hours: ${jsonData.total_hours || '0.00'}h${jsonData.overtime_hours > 0 ? `\nOvertime: ${jsonData.overtime_hours}h` : ''}`;
          
          
          showCustomAlert('success', 'Time Out Successful', jsonData.message + '\n\n' + summary);
          
        } else {
          console.error('❌ WFH Time Out Failed:', jsonData);
          showCustomAlert('error', 'Time Out Failed', jsonData.error || 'Unknown error');
        }
      } catch (error) {
        console.error('❌ WFH Time Out Error:', error);
        const errorMessage = error.response?.data?.error || 'Error recording time out';
        showCustomAlert('error', 'Time Out Failed', errorMessage);
      }
    }
  };

  const detectShiftType = (timeIn) => {
    const timeInObj = new Date(`2000-01-01 ${timeIn}`);
    const hour = timeInObj.getHours();
    
    // Detect shift based on time in
    if (hour >= 6 && hour < 18) {
      // Time in between 6:00 AM and 6:00 PM = Day Shift
      return 'day';
    } else {
      // Time in between 6:00 PM and 6:00 AM = Night Shift
      return 'night';
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

  const detectCurrentShiftType = async () => {
    const now = await getCurrentTimeUTC8(); // CHANGED: Made async
    const hour = now.getHours();
    
    
    
    
    // FIXED: Night shift is 10 PM to 6 AM next day
    if (hour >= 18) {  // 6:00 PM onwards = night shift
      
      return 'night';
    } else {
      
      return 'day';
    }
  };
  
  useEffect(() => {
    const updateShiftType = async () => {
      const currentShift = await detectCurrentShiftType(); // CHANGED: Made async
      setCurrentShiftType(currentShift);
    };
    
    updateShiftType();
    
    // Update every hour to catch shift changes
    const interval = setInterval(updateShiftType, 3600000); // Every hour
    
    return () => clearInterval(interval);
  }, []);

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

  const getCurrentDate = async () => {
    const utc8Time = await getCurrentTimeUTC8(); // CHANGED: Made async
    return utc8Time.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
  };

  const getGreeting = async () => {
    const utc8Time = await getCurrentTimeUTC8(); // CHANGED: Made async
    const hour = utc8Time.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStatusText = () => {
    if (isOnBreak && isAutoBreak) return 'Lunch Break';
    if (isOnBreak) return 'On Break';
    if (isOvertime && isTimeIn) return 'Overtime';
    if (lateMinutes > 0 && isTimeIn) return `Late (${lateMinutes}m)`;
    return isTimeIn ? 'On Duty' : 'Off Duty';
  };

  const getStatusClass = () => {
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

  
  // MODIFIED: UPDATED getWorkProgress function to work with simplified timer
  const getWorkProgress = async () => {
  const currentTimeUTC8 = await getCurrentTimeUTC8(); // CHANGED: Made async
  const currentHour = currentTimeUTC8.getHours();
  const currentMinute = currentTimeUTC8.getMinutes();
  
  // Start with base work seconds
  let workSeconds = todayHours + (isTimeIn ? currentTime : 0);
  
  // Handle early arrival for BOTH shifts
  if (currentShiftType === 'day') {
    if (isTimeIn && currentHour < 8) {
      // During early arrival period - don't count current session
      workSeconds = todayHours;
      
    }
  }
  
  // FIXED: Proper lunch break deduction for progress calculation (DAY SHIFT ONLY)
  if (currentShiftType === 'day' && isTimeIn) {
    if (currentHour > 13 || (currentHour === 13 && currentMinute > 0)) {
      // Past 1:00 PM - subtract full lunch break (60 minutes = 3600 seconds)
      workSeconds = Math.max(0, workSeconds - 3600);
    } else if (currentHour === 12 || (currentHour === 13 && currentMinute === 0)) {
      // Currently in lunch break - subtract elapsed lunch time
      const lunchStartTime = new Date();
      lunchStartTime.setHours(12, 0, 0, 0);
      
      // Calculate how much lunch break time has elapsed
      const elapsedLunchSeconds = Math.floor((currentTimeUTC8 - lunchStartTime) / 1000);
      const lunchDeduction = Math.min(Math.max(0, elapsedLunchSeconds), 3600); // Cap at 1 hour
      
      workSeconds = Math.max(0, workSeconds - lunchDeduction);
    }
  }
  
  const eightHours = 8 * 3600; // 8 hours in seconds
  return Math.min((workSeconds / eightHours) * 100, 100);
};
  // Replace the existing getTodayDisplayHours function with this fixed version
  const getTodayDisplayHours = async () => {
    const currentTimeUTC8 = await getCurrentTimeUTC8(); // CHANGED: Made async
    const currentHour = currentTimeUTC8.getHours();
    const currentMinute = currentTimeUTC8.getMinutes();
    
    // Start with base work seconds
    let workSeconds = todayHours + (isTimeIn && !isOnBreak ? currentTime : 0);
    
    // Handle early arrival for BOTH shifts
    if (currentShiftType === 'day') {
      if (isTimeIn && currentHour < 8) {
        // During early arrival period - don't count current session
        workSeconds = todayHours;
        
      }
    }
    
    // FIXED: Proper lunch break deduction for display hours (DAY SHIFT ONLY)
    if (currentShiftType === 'day' && isTimeIn) {
      if (currentHour > 13 || (currentHour === 13 && currentMinute > 0)) {
        // Past 1:00 PM - subtract full lunch break (60 minutes = 3600 seconds)
        workSeconds = Math.max(0, workSeconds - 3600);
      } else if (currentHour === 12 || (currentHour === 13 && currentMinute === 0)) {
        // Currently in lunch break - subtract elapsed lunch time
        const lunchStartTime = new Date();
        lunchStartTime.setHours(12, 0, 0, 0);
        
        // Calculate how much lunch break time has elapsed
        const elapsedLunchSeconds = Math.floor((currentTimeUTC8 - lunchStartTime) / 1000);
        const lunchDeduction = Math.min(Math.max(0, elapsedLunchSeconds), 3600); // Cap at 1 hour
        
        workSeconds = Math.max(0, workSeconds - lunchDeduction);
      }
    }
    
    return formatHours(workSeconds);
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
      <div className="emp-dash-content">
        {/* Time Tracking Section */}
        <DashboardHeader />
        <div className="emp-dash-time-section">
          <div className="emp-dash-time-card emp-dash-main-card">
            <div className="emp-dash-card-header">
              <h3>Time Tracker</h3>
              <div className="emp-dash-timer-display">
                <span className="emp-dash-time-text">{formatTime(currentTime)}</span>
                <div className="emp-dash-status-badge">
                  <span className={`emp-dash-status-dot ${getStatusClass()}`}></span>
                  {getStatusText()}
                </div>
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
                <span className="emp-dash-hours-number">{(() => {
                  const [displayHours, setDisplayHours] = useState('0.00');
                  
                  useEffect(() => {
                    const updateDisplayHours = async () => {
                      const hours = await getTodayDisplayHours();
                      setDisplayHours(hours);
                    };
                    
                    updateDisplayHours();
                    const interval = setInterval(updateDisplayHours, 10000); // Update every 10 seconds
                    
                    return () => clearInterval(interval);
                  }, [todayHours, currentTime, isTimeIn, isOnBreak, currentShiftType]);
                  
                  return displayHours;
                })()}</span>
                <span className="emp-dash-hours-unit">hrs</span>
              </div>
              <div className="emp-dash-progress-section">
                <div className="emp-dash-progress-bar">
                  <div 
                    className="emp-dash-progress-fill" 
                    style={{ width: `${(() => {
                      const [progress, setProgress] = useState(0);
                      
                      useEffect(() => {
                        const updateProgress = async () => {
                          const prog = await getWorkProgress();
                          setProgress(prog);
                        };
                        
                        updateProgress();
                        const interval = setInterval(updateProgress, 10000); // Update every 10 seconds
                        
                        return () => clearInterval(interval);
                      }, [todayHours, currentTime, isTimeIn, currentShiftType]);
                      
                      return Math.round(progress);
                    })()}%` }}
                  ></div>
                </div>
                <span className="emp-dash-progress-text">
                  {(() => {
                    const [progressText, setProgressText] = useState(0);
                    
                    useEffect(() => {
                      const updateProgressText = async () => {
                        const prog = await getWorkProgress();
                        setProgressText(Math.round(prog));
                      };
                      
                      updateProgressText();
                      const interval = setInterval(updateProgressText, 10000); // Update every 10 seconds
                      
                      return () => clearInterval(interval);
                    }, [todayHours, currentTime, isTimeIn, currentShiftType]);
                    
                    return progressText;
                  })()} % of 8-hour work day
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
                  {isTimeIn ? 'Active' : 'Idle'}
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
              <p className="emp-dash-stat-value">{(() => {
                const [progressStat, setProgressStat] = useState(0);
                
                useEffect(() => {
                  const updateProgressStat = async () => {
                    const prog = await getWorkProgress();
                    setProgressStat(Math.round(prog));
                  };
                  
                  updateProgressStat();
                  const interval = setInterval(updateProgressStat, 10000);
                  
                  return () => clearInterval(interval);
                }, [todayHours, currentTime, isTimeIn, currentShiftType]);
                
                return progressStat;
              })()}%</p>
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
              <p className="emp-dash-activity-time">{shiftType === 'day' ? '8:00 AM - 5:00 PM (8 hours)' : '10:00 PM - 6:00 AM (8 hours)'}
              </p>
            </div>
          </div>
              
          {shiftType === 'day' && (
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
          )}

          {shiftType === 'night' && (
            <div className="emp-dash-activity-item">
              <div className="emp-dash-activity-icon emp-dash-lunch-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </div>
              <div className="emp-dash-activity-content">
                <p className="emp-dash-activity-title">Night Shift</p>
                <p className="emp-dash-activity-time">No Lunch Break</p>
              </div>
            </div>
          )}

              <div className="emp-dash-activity-item">
                <div className="emp-dash-activity-icon emp-dash-overtime-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="6" y="6" width="12" height="12"/>
                  </svg>
                </div>
                <div className="emp-dash-activity-content">
                  <p className="emp-dash-activity-title">Overtime</p>
                  <p className="emp-dash-activity-time">
                    {shiftType === 'day' ? 'After 5:00 PM' : 'After 6:00 AM'}
                  </p>
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
                  <p className="emp-dash-activity-time">Individual rest day assigned</p>
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