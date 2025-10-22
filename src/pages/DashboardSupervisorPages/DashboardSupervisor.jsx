import React, { useState, useEffect } from 'react'
import '../../components/SupervisorLayout/DashboardSupervisor.css'

const DashboardSupervisor = () => {
  const [todayStats, setTodayStats] = useState({
    total_employees: 0,
    present_today: 0,
    absent_today: 0,
    on_leave_today: 0
  })

  const [attendanceData, setAttendanceData] = useState({
    labels: [],
    present_data: [],
    absent_data: [],
    leave_data: [],
    current_year: new Date().getFullYear()
  })

  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth())
  const [calendarDays, setCalendarDays] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const supervisorId = localStorage.getItem('sup_id') || localStorage.getItem('userId')

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    if (!supervisorId) {
      setError('Supervisor ID not found')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(
        `http://localhost/difsysapi/dashboard_supervisor.php?action=get_all_dashboard_data&supervisor_id=${supervisorId}`
      )
      const result = await response.json()

      if (result.success) {
        setTodayStats(result.data.today_stats)
        setAttendanceData(result.data.attendance_overview)
      } else {
        setError(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Error fetching dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Generate calendar days
  useEffect(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    setCalendarDays(days)
    setCurrentDate(new Date(year, month, 1))
  }, [])

  const handlePreviousMonth = () => {
    if (currentMonthIndex > 0) {
      setCurrentMonthIndex(currentMonthIndex - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonthIndex < 11) {
      setCurrentMonthIndex(currentMonthIndex + 1)
    }
  }

  const getCurrentMonthData = () => {
    return {
      present: attendanceData.present_data[currentMonthIndex] || 0,
      absent: attendanceData.absent_data[currentMonthIndex] || 0,
      leave: attendanceData.leave_data[currentMonthIndex] || 0
    }
  }

  const monthData = getCurrentMonthData()
  const maxValue = Math.max(monthData.present, monthData.absent, monthData.leave, 100)

  const getPercentageHeight = (value) => {
    return (value / maxValue) * 100
  }

  if (loading) {
    return (
      <div className="supervisor-dashboard-container">
        <div className="supervisor-loading">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="supervisor-dashboard-container">
      <div className="supervisor-dashboard-content">
        <div className="supervisor-main-layout">
          {/* Left Column */}
          <div className="supervisor-left-column">
            {/* Overview Today Card */}
            <div className="supervisor-overview-card">
              <div className="supervisor-overview-header">
                <h2 className="supervisor-overview-title">Overview Today</h2>
                <div className="supervisor-date-today">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              <div className="supervisor-overview-grid">
                {/* Total Employee */}
                <div className="supervisor-overview-item">
                  <div className="supervisor-overview-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <div className="supervisor-overview-content">
                    <div className="supervisor-overview-value">{todayStats.total_employees}</div>
                    <div className="supervisor-overview-label">Total Employee</div>
                  </div>
                </div>

                {/* Present Today */}
                <div className="supervisor-overview-item">
                  <div className="supervisor-overview-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 11l3 3l8-8"></path>
                      <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9c1.51 0 2.93 0.37 4.18 1.03"></path>
                    </svg>
                  </div>
                  <div className="supervisor-overview-content">
                    <div className="supervisor-overview-value">{todayStats.present_today}</div>
                    <div className="supervisor-overview-label">Present Today</div>
                  </div>
                </div>

                {/* Absent Today */}
                <div className="supervisor-overview-item">
                  <div className="supervisor-overview-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M15 9l-6 6"></path>
                      <path d="M9 9l6 6"></path>
                    </svg>
                  </div>
                  <div className="supervisor-overview-content">
                    <div className="supervisor-overview-value">{todayStats.absent_today}</div>
                    <div className="supervisor-overview-label">Absent Today</div>
                  </div>
                </div>

                {/* On Leave Today */}
                <div className="supervisor-overview-item">
                  <div className="supervisor-overview-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5Z"></path>
                      <path d="M12 5L8 21l4-7 4 7-4-16"></path>
                    </svg>
                  </div>
                  <div className="supervisor-overview-content">
                    <div className="supervisor-overview-value">{todayStats.on_leave_today}</div>
                    <div className="supervisor-overview-label">On Leave Today</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Attendance Chart */}
            <div className="supervisor-statistics-card">
              <div className="supervisor-card-header">
                <h2 className="supervisor-card-title">
                  Monthly Attendance - {monthNames[currentMonthIndex]}
                </h2>
                <div className="supervisor-chart-controls">
                  <button
                    className="supervisor-nav-btn"
                    onClick={handlePreviousMonth}
                    disabled={currentMonthIndex === 0}
                    title="Previous month"
                  >
                    ← Previous
                  </button>
                  <span className="supervisor-month-indicator">
                    {monthNames[currentMonthIndex]}
                  </span>
                  <button
                    className="supervisor-nav-btn"
                    onClick={handleNextMonth}
                    disabled={currentMonthIndex === 11}
                    title="Next month"
                  >
                    Next →
                  </button>
                </div>
              </div>

              <div className="supervisor-legend">
                <div className="supervisor-legend-item">
                  <div className="supervisor-legend-color supervisor-legend-present"></div>
                  <span>Present</span>
                </div>
                <div className="supervisor-legend-item">
                  <div className="supervisor-legend-color supervisor-legend-absent"></div>
                  <span>Absent</span>
                </div>
                <div className="supervisor-legend-item">
                  <div className="supervisor-legend-color supervisor-legend-leave"></div>
                  <span>On Leave</span>
                </div>
              </div>

              <div className="supervisor-statistics-content">
                <div className="supervisor-chart-container">
                  <div className="supervisor-y-axis">
                    <span>{Math.ceil(maxValue)}</span>
                    <span>{Math.ceil((maxValue * 3) / 4)}</span>
                    <span>{Math.ceil((maxValue * 2) / 4)}</span>
                    <span>{Math.ceil(maxValue / 4)}</span>
                    <span>0</span>
                  </div>

                  <div className="supervisor-chart-area">
                    <div className="supervisor-chart-grid">
                      <div className="supervisor-grid-line"></div>
                      <div className="supervisor-grid-line"></div>
                      <div className="supervisor-grid-line"></div>
                      <div className="supervisor-grid-line"></div>
                    </div>

                    <div className="supervisor-bars-wrapper">
                      {/* Present Bar */}
                      <div className="supervisor-month-group">
                        <div
                          className="supervisor-bar supervisor-bar-present"
                          style={{ height: `${getPercentageHeight(monthData.present)}%` }}
                          title={`Present: ${monthData.present}`}
                        ></div>
                      </div>

                      {/* Absent Bar */}
                      <div className="supervisor-month-group">
                        <div
                          className="supervisor-bar supervisor-bar-absent"
                          style={{ height: `${getPercentageHeight(monthData.absent)}%` }}
                          title={`Absent: ${monthData.absent}`}
                        ></div>
                      </div>

                      {/* Leave Bar */}
                      <div className="supervisor-month-group">
                        <div
                          className="supervisor-bar supervisor-bar-leave"
                          style={{ height: `${getPercentageHeight(monthData.leave)}%` }}
                          title={`On Leave: ${monthData.leave}`}
                        ></div>
                      </div>
                    </div>

                    <div className="supervisor-chart-labels">
                      <span>Present</span>
                      <span>Absent</span>
                      <span>Leave</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="supervisor-month-stats">
                <div className="supervisor-stat-box">
                  <div className="supervisor-stat-label">Present</div>
                  <div className="supervisor-stat-value supervisor-stat-present">
                    {monthData.present}
                  </div>
                </div>
                <div className="supervisor-stat-box">
                  <div className="supervisor-stat-label">Absent</div>
                  <div className="supervisor-stat-value supervisor-stat-absent">
                    {monthData.absent}
                  </div>
                </div>
                <div className="supervisor-stat-box">
                  <div className="supervisor-stat-label">On Leave</div>
                  <div className="supervisor-stat-value supervisor-stat-leave">
                    {monthData.leave}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Calendar */}
          <div className="supervisor-right-column">
            <div className="supervisor-calendar-card">
              <div className="supervisor-card-header">
                <h2 className="supervisor-card-title">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
              </div>
              <div className="supervisor-calendar">
                <div className="supervisor-calendar-weekdays">
                  <div className="supervisor-weekday">Sun</div>
                  <div className="supervisor-weekday">Mon</div>
                  <div className="supervisor-weekday">Tue</div>
                  <div className="supervisor-weekday">Wed</div>
                  <div className="supervisor-weekday">Thu</div>
                  <div className="supervisor-weekday">Fri</div>
                  <div className="supervisor-weekday">Sat</div>
                </div>
                <div className="supervisor-calendar-days">
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={`supervisor-calendar-day ${
                        day === new Date().getDate() && 
                        currentDate.getMonth() === new Date().getMonth()
                          ? 'supervisor-current-day'
                          : ''
                      } ${day ? '' : 'supervisor-empty-day'}`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="supervisor-quick-stats-card">
              <h3 className="supervisor-card-title">Attendance Summary</h3>
              <div className="supervisor-quick-stats">
                <div className="supervisor-quick-stat">
                  <div className="supervisor-quick-stat-icon supervisor-icon-present">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div className="supervisor-quick-stat-content">
                    <div className="supervisor-quick-stat-label">Present This Month</div>
                    <div className="supervisor-quick-stat-value">{monthData.present}</div>
                  </div>
                </div>

                <div className="supervisor-quick-stat">
                  <div className="supervisor-quick-stat-icon supervisor-icon-absent">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  </div>
                  <div className="supervisor-quick-stat-content">
                    <div className="supervisor-quick-stat-label">Absent This Month</div>
                    <div className="supervisor-quick-stat-value">{monthData.absent}</div>
                  </div>
                </div>

                <div className="supervisor-quick-stat">
                  <div className="supervisor-quick-stat-icon supervisor-icon-leave">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5Z"></path>
                    </svg>
                  </div>
                  <div className="supervisor-quick-stat-content">
                    <div className="supervisor-quick-stat-label">On Leave This Month</div>
                    <div className="supervisor-quick-stat-value">{monthData.leave}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardSupervisor