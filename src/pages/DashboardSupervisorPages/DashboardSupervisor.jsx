import React from 'react'
import '../../components/SupervisorLayout/DashboardSupervisor.css'

const DashboardSupervisor = () => {
  const statsData = [
    { title: 'Total Employees', value: '124', change: '+12%', trend: 'up' },
    { title: 'Active Projects', value: '18', change: '+5%', trend: 'up' },
    { title: 'Pending Tasks', value: '47', change: '-8%', trend: 'down' },
    { title: 'Completed Today', value: '23', change: '+15%', trend: 'up' }
  ]

  const recentActivities = [
    { user: 'John Smith', action: 'Completed project milestone', time: '2 hours ago' },
    { user: 'Sarah Johnson', action: 'Submitted weekly report', time: '4 hours ago' },
    { user: 'Mike Davis', action: 'Updated task status', time: '6 hours ago' },
    { user: 'Lisa Brown', action: 'Requested time off', time: '1 day ago' }
  ]

  const upcomingDeadlines = [
    { project: 'Website Redesign', deadline: 'Tomorrow', priority: 'high' },
    { project: 'Marketing Campaign', deadline: '3 days', priority: 'medium' },
    { project: 'Database Migration', deadline: '1 week', priority: 'low' },
    { project: 'Security Audit', deadline: '2 weeks', priority: 'medium' }
  ]

  return (
    <div className="supervisor-dashboard-container">
      <div className="supervisor-dashboard-header">
        <h1 className="supervisor-dashboard-title">Supervisor Dashboard</h1>
        <p className="supervisor-dashboard-subtitle">Welcome back! Here's what's happening with your team today.</p>
      </div>

      {/* Stats Grid */}
      <div className="supervisor-stats-grid">
        {statsData.map((stat, index) => (
          <div key={index} className="supervisor-stat-card">
            <div className="supervisor-stat-header">
              <h3 className="supervisor-stat-title">{stat.title}</h3>
              <span className={`supervisor-stat-trend ${stat.trend}`}>
                {stat.change}
              </span>
            </div>
            <div className="supervisor-stat-value">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="supervisor-content-grid">
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

        {/* Upcoming Deadlines */}
        <div className="supervisor-card supervisor-deadlines-card">
          <div className="supervisor-card-header">
            <h2 className="supervisor-card-title">Upcoming Deadlines</h2>
            <button className="supervisor-view-all-btn">View All</button>
          </div>
          <div className="supervisor-deadlines-list">
            {upcomingDeadlines.map((item, index) => (
              <div key={index} className="supervisor-deadline-item">
                <div className="supervisor-deadline-info">
                  <div className="supervisor-deadline-project">{item.project}</div>
                  <div className="supervisor-deadline-time">Due in {item.deadline}</div>
                </div>
                <span className={`supervisor-priority-badge ${item.priority}`}>
                  {item.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="supervisor-card supervisor-actions-card">
          <div className="supervisor-card-header">
            <h2 className="supervisor-card-title">Quick Actions</h2>
          </div>
          <div className="supervisor-actions-grid">
            <button className="supervisor-action-btn">
              <span className="supervisor-action-icon">👥</span>
              <span className="supervisor-action-text">Manage Team</span>
            </button>
            <button className="supervisor-action-btn">
              <span className="supervisor-action-icon">📊</span>
              <span className="supervisor-action-text">View Reports</span>
            </button>
            <button className="supervisor-action-btn">
              <span className="supervisor-action-icon">✅</span>
              <span className="supervisor-action-text">Approve Tasks</span>
            </button>
            <button className="supervisor-action-btn">
              <span className="supervisor-action-icon">📅</span>
              <span className="supervisor-action-text">Schedule Meeting</span>
            </button>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="supervisor-card supervisor-performance-card">
          <div className="supervisor-card-header">
            <h2 className="supervisor-card-title">Team Performance</h2>
            <select className="supervisor-period-select">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Quarter</option>
            </select>
          </div>
          <div className="supervisor-performance-content">
            <div className="supervisor-performance-metric">
              <div className="supervisor-metric-label">Productivity</div>
              <div className="supervisor-progress-bar">
                <div className="supervisor-progress-fill" style={{width: '85%'}}></div>
              </div>
              <div className="supervisor-metric-value">85%</div>
            </div>
            <div className="supervisor-performance-metric">
              <div className="supervisor-metric-label">Task Completion</div>
              <div className="supervisor-progress-bar">
                <div className="supervisor-progress-fill" style={{width: '92%'}}></div>
              </div>
              <div className="supervisor-metric-value">92%</div>
            </div>
            <div className="supervisor-performance-metric">
              <div className="supervisor-metric-label">Team Satisfaction</div>
              <div className="supervisor-progress-bar">
                <div className="supervisor-progress-fill" style={{width: '78%'}}></div>
              </div>
              <div className="supervisor-metric-value">78%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardSupervisor