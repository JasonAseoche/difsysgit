import React from 'react'
import '../../components/SupervisorLayout/DashboardSupervisor.css'

const DashboardSupervisor = () => {
  const overviewData = [
    { title: 'Total Employee', value: '124', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
{ title: 'Present Today', value: '98', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3l8-8"></path><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9c1.51 0 2.93 0.37 4.18 1.03"></path></svg> },
{ title: 'Absent Today', value: '18', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><path d="M15 9l-6 6"></path><path d="M9 9l6 6"></path></svg> },
{ title: 'On Leave Today', value: '8', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5Z"></path><path d="M12 5L8 21l4-7 4 7-4-16"></path></svg> }
  ]

  const recentActivities = [
    { user: 'John Smith', action: 'Completed project milestone', time: '2 hours ago' },
    { user: 'Sarah Johnson', action: 'Submitted weekly report', time: '4 hours ago' },
    { user: 'Mike Davis', action: 'Updated task status', time: '6 hours ago' },
    { user: 'Lisa Brown', action: 'Requested time off', time: '1 day ago' }
  ]

  // Sample data for bar chart
  const statisticsData = {
    present: 98,
    absent: 18,
    onLeave: 8
  }

  const getCurrentDate = () => {
    const today = new Date()
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const generateCalendarDays = () => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const currentDate = today.getDate()
    
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
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
    
    return { days, currentDate, currentMonth, currentYear }
  }

  const { days, currentDate, currentMonth, currentYear } = generateCalendarDays()
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]

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
                <div className="supervisor-date-today">{getCurrentDate()}</div>
              </div>
              <div className="supervisor-overview-grid">
                {overviewData.map((item, index) => (
                  <div key={index} className="supervisor-overview-item">
                    <div className="supervisor-overview-icon">
                      {item.icon}
                    </div>
                    <div className="supervisor-overview-content">
                      <div className="supervisor-overview-value">{item.value}</div>
                      <div className="supervisor-overview-label">{item.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistics Bar Graph */}
            <div className="supervisor-statistics-card">
              <div className="supervisor-card-header">
                <h2 className="supervisor-card-title">Monthly Attendance</h2>
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
              </div>
              <div className="supervisor-statistics-content">
                <div className="supervisor-chart-container">
                  <div className="supervisor-y-axis">
                    <span>100</span>
                    <span>80</span>
                    <span>60</span>
                    <span>40</span>
                    <span>20</span>
                    <span>0</span>
                  </div>
                  
                  <div className="supervisor-chart-area">
                    <div className="supervisor-chart-grid">
                      <div className="supervisor-grid-line"></div>
                      <div className="supervisor-grid-line"></div>
                      <div className="supervisor-grid-line"></div>
                      <div className="supervisor-grid-line"></div>
                      <div className="supervisor-grid-line"></div>
                    </div>
                    
                    <div className="supervisor-bars-wrapper">
                      {/* January */}
                      <div className="supervisor-month-group">
                        <div className="supervisor-bar supervisor-bar-present" style={{height: '24%'}}></div>
                        <div className="supervisor-bar supervisor-bar-absent" style={{height: '30%'}}></div>
                        <div className="supervisor-bar supervisor-bar-leave" style={{height: '8%'}}></div>
                      </div>
                      
                      {/* February */}
                      <div className="supervisor-month-group">
                        <div className="supervisor-bar supervisor-bar-present" style={{height: '88%'}}></div>
                        <div className="supervisor-bar supervisor-bar-absent" style={{height: '12%'}}></div>
                        <div className="supervisor-bar supervisor-bar-leave" style={{height: '6%'}}></div>
                      </div>
                      
                      {/* March */}
                      <div className="supervisor-month-group">
                        <div className="supervisor-bar supervisor-bar-present" style={{height: '82%'}}></div>
                        <div className="supervisor-bar supervisor-bar-absent" style={{height: '18%'}}></div>
                        <div className="supervisor-bar supervisor-bar-leave" style={{height: '10%'}}></div>
                      </div>
                      
                      {/* April */}
                      <div className="supervisor-month-group">
                        <div className="supervisor-bar supervisor-bar-present" style={{height: '90%'}}></div>
                        <div className="supervisor-bar supervisor-bar-absent" style={{height: '10%'}}></div>
                        <div className="supervisor-bar supervisor-bar-leave" style={{height: '5%'}}></div>
                      </div>
                      
                      {/* May */}
                      <div className="supervisor-month-group">
                        <div className="supervisor-bar supervisor-bar-present" style={{height: '87%'}}></div>
                        <div className="supervisor-bar supervisor-bar-absent" style={{height: '13%'}}></div>
                        <div className="supervisor-bar supervisor-bar-leave" style={{height: '7%'}}></div>
                      </div>
                      
                      {/* June */}
                      <div className="supervisor-month-group">
                        <div className="supervisor-bar supervisor-bar-present" style={{height: '84%'}}></div>
                        <div className="supervisor-bar supervisor-bar-absent" style={{height: '16%'}}></div>
                        <div className="supervisor-bar supervisor-bar-leave" style={{height: '9%'}}></div>
                      </div>
                    </div>
                    
                    <div className="supervisor-chart-labels">
                      <span>Jan</span>
                      <span>Feb</span>
                      <span>Mar</span>
                      <span>Apr</span>
                      <span>May</span>
                      <span>Jun</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activities - Removed from left column */}
          </div>

          {/* Right Column - Calendar and Recent Activities */}
          <div className="supervisor-right-column">
            <div className="supervisor-calendar-card">
              <div className="supervisor-card-header">
                <h2 className="supervisor-card-title">{monthNames[currentMonth]} {currentYear}</h2>
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
                  {days.map((day, index) => (
                    <div 
                      key={index} 
                      className={`supervisor-calendar-day ${
                        day === currentDate ? 'supervisor-current-day' : ''
                      } ${day ? '' : 'supervisor-empty-day'}`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="supervisor-card supervisor-activities-card">
              <div className="supervisor-card-header">
                <h2 className="supervisor-card-title">Recent Activities</h2>
                <button className="supervisor-view-all-btn">View All</button>
              </div>
              <div className="supervisor-activities-list">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="supervisor-activity-item">
                    <div className="supervisor-activity-avatar">
                      {activity.user.split(' ').map(name => name[0]).join('')}
                    </div>
                    <div className="supervisor-activity-content">
                      <div className="supervisor-activity-user">{activity.user}</div>
                      <div className="supervisor-activity-action">{activity.action}</div>
                      <div className="supervisor-activity-time">{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardSupervisor