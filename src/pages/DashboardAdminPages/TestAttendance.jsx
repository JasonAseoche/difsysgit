import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; 
import '../../components/AdminLayout/TestAttendance.css'

const TestAttendance = () => {
  const [testMode, setTestMode] = useState(false);
  const [testTime, setTestTime] = useState('14:00:00');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentRealTime, setCurrentRealTime] = useState(new Date());
  const [currentTestTime, setCurrentTestTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isTestMode, setIsTestMode] = useState(false);

  const API_BASE_URL = 'http://localhost/difsysapi/attendance_api.php';

  // Fetch test settings from database
  const fetchTestSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}?action=get_test_settings`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const settings = result.data;
        setTestMode(settings.test_mode === 1 || settings.test_mode === true);
        setTestTime(settings.test_time || '14:00:00');
        setTestDate(settings.test_date || new Date().toISOString().split('T')[0]);
        
        console.log('Fetched test settings:', settings);
      } else {
        console.warn('No test settings found or error:', result.error);
        // Set default values if no settings exist
        setTestMode(false);
        setTestTime('14:00:00');
        setTestDate(new Date().toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Error fetching test settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkTestMode = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=get_test_settings`);
      if (response.data.success && response.data.data) {
        setIsTestMode(response.data.data.test_mode === 1);
      }
    } catch (error) {
      console.warn('Could not check test mode:', error);
      setIsTestMode(false);
    }
  }, []);

  useEffect(() => {
    checkTestMode();
    
    const testModeInterval = setInterval(checkTestMode, 10000); // Check every 10 seconds
    
    return () => clearInterval(testModeInterval);
  }, [checkTestMode])

  // Update test settings in database
  const updateTestSettings = useCallback(async (mode, time, date) => {
    try {
      setIsSaving(true);
      
      const response = await fetch(`${API_BASE_URL}?action=update_test_settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_mode: mode,
          test_time: time,
          test_date: date
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('Test settings updated successfully:', result);
        setLastSaved(new Date());
        
        // Show success notification
        showNotification('success', 'Settings saved successfully!');
      } else {
        console.error('Failed to update test settings:', result.error);
        showNotification('error', 'Failed to save settings: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating test settings:', error);
      showNotification('error', 'Error saving settings: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Initialize component - fetch settings from database
  useEffect(() => {
    fetchTestSettings();
  }, [fetchTestSettings]);

  // Update real time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentRealTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update test time display
  useEffect(() => {
    if (testMode && testTime && testDate) {
      const [hours, minutes, seconds] = testTime.split(':');
      const testDateTime = new Date(testDate);
      testDateTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds) || 0);
      setCurrentTestTime(testDateTime);
    }
  }, [testTime, testDate, testMode]);

  // Debounced save to database
  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        updateTestSettings(testMode, testTime, testDate);
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [testMode, testTime, testDate, isLoading, updateTestSettings]);

  const handleTestModeToggle = () => {
    setTestMode(!testMode);
  };

  const handleTimeChange = (e) => {
    setTestTime(e.target.value + ':00');
  };

  const handleDateChange = (e) => {
    setTestDate(e.target.value);
  };

  const getShiftType = (timeStr) => {
    const [hours] = timeStr.split(':');
    const hour = parseInt(hours);
    return (hour >= 6 && hour < 18) ? 'Day' : 'Night';
  };

  const formatTimeWithAMPM = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const resetToCurrentTime = () => {
    const now = new Date();
    const newDate = now.toISOString().split('T')[0];
    const newTime = now.toTimeString().split(' ')[0].substring(0, 5) + ':00';
    
    setTestDate(newDate);
    setTestTime(newTime);
  };

  const refreshFromDatabase = () => {
    fetchTestSettings();
    showNotification('info', 'Settings refreshed from database');
  };

  const showNotification = (type, message) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `test-notification test-notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '600',
      zIndex: '10000',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease',
      backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  const presetTimes = [
    { label: 'Early Morning (6:00 AM)', value: '06:00:00' },
    { label: 'Work Start (8:00 AM)', value: '08:00:00' },
    { label: 'Lunch Time (12:00 PM)', value: '12:00:00' },
    { label: 'After Lunch (1:00 PM)', value: '13:00:00' },
    { label: 'End of Work (5:00 PM)', value: '17:00:00' },
    { label: 'Evening (6:00 PM)', value: '18:00:00' },
    { label: 'Night Start (10:00 PM)', value: '22:00:00' },
    { label: 'Midnight (12:00 AM)', value: '00:00:00' },
    { label: 'Late Night (2:00 AM)', value: '02:00:00' },
    { label: 'Early Morning (5:00 AM)', value: '05:00:00' },
  ];

  if (isLoading) {
    return (
      <div className="test-attendance-container">
        <div className="test-attendance-content">
          <div className="test-attendance-loading">
            <div className="test-attendance-spinner"></div>
            <p>Loading test settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="test-attendance-container">
      <div className="test-attendance-content">
        <div className="test-attendance-header">
          <h1 className="test-attendance-title">
            Attendance Testing System
            {isSaving && <span className="test-attendance-saving-indicator">Saving...</span>}
          </h1>
          <p className="test-attendance-subtitle">
            Control test time settings for attendance system debugging (Database-backed)
          </p>
          {lastSaved && (
            <p className="test-attendance-last-saved">
              Last saved: {lastSaved.toLocaleString()}
            </p>
          )}
        </div>

        {/* Test Mode Toggle */}
        <div className="test-attendance-card test-attendance-mode-card">
          <div className="test-attendance-card-header">
            <h3>Test Mode Control</h3>
            <button 
              onClick={refreshFromDatabase}
              className="test-attendance-btn-refresh"
              title="Refresh from database"
            >
              🔄 Refresh
            </button>
          </div>
          <div className="test-attendance-mode-toggle">
            <label className="test-attendance-toggle-label">
              <input
                type="checkbox"
                checked={testMode}
                onChange={handleTestModeToggle}
                className="test-attendance-toggle-input"
                disabled={isSaving}
              />
              <span className="test-attendance-toggle-slider"></span>
              <span className="test-attendance-toggle-text">
                {testMode ? 'Test Mode ON' : 'Test Mode OFF'}
              </span>
            </label>
            <p className="test-attendance-mode-description">
              {testMode 
                ? 'System will use test time instead of real time (stored in database)'
                : 'System will use real system time'
              }
            </p>
          </div>
        </div>

        {/* Time Controls */}
        <div className="test-attendance-grid">
          {/* Date Control */}
          <div className="test-attendance-card">
            <div className="test-attendance-card-header">
              <h3>Test Date</h3>
            </div>
            <div className="test-attendance-date-control">
              <input
                type="date"
                value={testDate}
                onChange={handleDateChange}
                className="test-attendance-date-input"
                disabled={!testMode || isSaving}
              />
              <div className="test-attendance-date-display">
                <span className="test-attendance-date-formatted">
                  {formatDate(testDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Time Control */}
          <div className="test-attendance-card">
            <div className="test-attendance-card-header">
              <h3>Test Time</h3>
            </div>
            <div className="test-attendance-time-control">
              <input
                type="time"
                value={testTime.substring(0, 5)}
                onChange={handleTimeChange}
                className="test-attendance-time-input"
                disabled={!testMode || isSaving}
              />
              <div className="test-attendance-time-display">
                <span className="test-attendance-time-formatted">
                  {formatTimeWithAMPM(testTime)}
                </span>
                <span className="test-attendance-shift-indicator">
                  {getShiftType(testTime)} Shift
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Preset Times */}
        <div className="test-attendance-card">
          <div className="test-attendance-card-header">
            <h3>Quick Time Presets</h3>
          </div>
          <div className="test-attendance-presets">
            {presetTimes.map((preset, index) => (
              <button
                key={index}
                onClick={() => setTestTime(preset.value)}
                className={`test-attendance-preset-btn ${
                  testTime === preset.value ? 'test-attendance-preset-active' : ''
                }`}
                disabled={!testMode || isSaving}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current Status Display */}
        <div className="test-attendance-grid">
          <div className="test-attendance-card test-attendance-status-card">
            <div className="test-attendance-card-header">
              <h3>Real System Time</h3>
            </div>
            <div className="test-attendance-status-content">
              <div className="test-attendance-time-large">
                {currentRealTime.toLocaleTimeString()}
              </div>
              <div className="test-attendance-date-small">
                {currentRealTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>

          <div className="test-attendance-card test-attendance-status-card">
            <div className="test-attendance-card-header">
              <h3>Active System Time</h3>
              <span className={`test-attendance-status-badge ${
                testMode ? 'test-attendance-test-active' : 'test-attendance-real-active'
              }`}>
                {testMode ? 'TEST MODE' : 'REAL MODE'}
              </span>
            </div>
            <div className="test-attendance-status-content">
              <div className="test-attendance-time-large">
                {testMode ? formatTimeWithAMPM(testTime) : currentRealTime.toLocaleTimeString()}
              </div>
              <div className="test-attendance-date-small">
                {testMode ? formatDate(testDate) : currentRealTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              {testMode && (
                <div className="test-attendance-shift-info">
                  <span className="test-attendance-shift-label">
                    Detected: {getShiftType(testTime)} Shift
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="test-attendance-actions">
          <button
            onClick={resetToCurrentTime}
            className="test-attendance-btn test-attendance-btn-secondary"
            disabled={!testMode || isSaving}
          >
            Reset to Current Time
          </button>
          
          <button
            onClick={refreshFromDatabase}
            className="test-attendance-btn test-attendance-btn-info"
            disabled={isSaving}
          >
            Refresh from Database
          </button>
          
          <button
            onClick={() => window.location.href = '/employee-dashboard'}
            className="test-attendance-btn test-attendance-btn-primary"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Instructions */}
        <div className="test-attendance-card test-attendance-instructions">
          <div className="test-attendance-card-header">
            <h3>Instructions</h3>
          </div>
          <div className="test-attendance-instructions-content">
            <ol className="test-attendance-instructions-list">
              <li>Toggle "Test Mode" to enable/disable test time functionality</li>
              <li>When test mode is ON, the system will use your set test time instead of real time</li>
              <li>All settings are automatically saved to the database</li>
              <li>Set your desired test date using the date picker</li>
              <li>Set your desired test time using the time picker or quick presets</li>
              <li>The system will detect shift type automatically (Day: 6AM-6PM, Night: 6PM-6AM)</li>
              <li>Use "Reset to Current Time" to sync test time with real time</li>
              <li>Use "Refresh from Database" to reload settings from database</li>
              <li>Navigate to Dashboard to see the test time in action</li>
              <li>Remember to turn OFF test mode when done testing</li>
            </ol>
          </div>
        </div>

        {/* Database Status */}
        <div className="test-attendance-card test-attendance-db-status">
          <div className="test-attendance-card-header">
            <h3>Database Status</h3>
          </div>
          <div className="test-attendance-db-status-content">
            <div className="test-attendance-db-status-item">
              <span className="test-attendance-db-status-label">Connection:</span>
              <span className="test-attendance-db-status-value test-attendance-db-connected">
                Connected ✓
              </span>
            </div>
            <div className="test-attendance-db-status-item">
              <span className="test-attendance-db-status-label">Auto-save:</span>
              <span className="test-attendance-db-status-value">
                {isSaving ? 'Saving...' : 'Ready'}
              </span>
            </div>
            {lastSaved && (
              <div className="test-attendance-db-status-item">
                <span className="test-attendance-db-status-label">Last Updated:</span>
                <span className="test-attendance-db-status-value">
                  {lastSaved.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Warning */}
        {testMode && (
          <div className="test-attendance-warning">
            <div className="test-attendance-warning-icon">⚠️</div>
            <div className="test-attendance-warning-content">
              <strong>Test Mode Active (Database Controlled)</strong>
              <p>The attendance system is currently using test time from database. Remember to disable test mode when finished testing.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestAttendance;