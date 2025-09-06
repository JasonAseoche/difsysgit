import React, { useState } from 'react';
import '../../components/AdminLayout/Dashboard.css';
import DashboardHeader from '../../components/DashboardHeader/DashboardHeader';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'; // You'll need to install recharts

// Import icons - assuming you're using an icon library like react-icons
import { 
  FiUsers,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiCheck
} from 'react-icons/fi';

const Dashboard = () => {
  // Mock data for charts and stats
  const [period, setPeriod] = useState('month');
  
  // Analytics data
  const revenueData = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 5000 },
    { name: 'Apr', value: 7000 },
    { name: 'May', value: 5000 },
    { name: 'Jun', value: 6000 },
    { name: 'Jul', value: 8500 },
  ];
  
  const userActivityData = [
    { name: 'Mon', active: 20, new: 5 },
    { name: 'Tue', active: 25, new: 8 },
    { name: 'Wed', active: 30, new: 6 },
    { name: 'Thu', active: 28, new: 12 },
    { name: 'Fri', active: 32, new: 10 },
    { name: 'Sat', active: 22, new: 3 },
    { name: 'Sun', active: 18, new: 4 },
  ];
  
  // Updated userTypeData with values from image
  const userTypeData = [
    { name: 'Admin', value: 20 },
    { name: 'Manager', value: 30 },
    { name: 'Accountant', value: 30 },
    { name: 'Employee', value: 70 },
    { name: 'Applicants', value: 35 }
  ];
  
  // Set the exact matching colors from the image
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9575CD'];
  
  // Updated summary cards data with appropriate icons
  const summaryCards = [
    { title: 'Total Users', value: '1,285', increase: '+12%', icon: <FiUsers />, color: '#3498db', showIncrease: true },
    { title: 'New Account Created', value: '24', increase: '+8%', icon: <FiUsers />, color: '#2ecc71', showIncrease: true },
    { title: 'HR Account', value: '2', increase: '', icon: <FiUsers />, color: '#9b59b6', showIncrease: false },
    { title: 'Accountant Account', value: '2', increase: '', icon: <FiUsers />, color: '#e74c3c', showIncrease: false }
  ];
  
  // Recent activities
  const recentActivities = [
    { user: 'Juan Dela Cruz', action: 'Created a new account', time: '5 mins ago', avatar: '/api/placeholder/30/30' },
    { user: 'Admin', action: 'Updated system settings', time: '2 hours ago', avatar: '/api/placeholder/30/30' },
    { user: 'Maria Santos', action: 'Completed profile setup', time: '5 hours ago', avatar: '/api/placeholder/30/30' },
    { user: 'System', action: 'Scheduled maintenance', time: 'Yesterday', avatar: '/api/placeholder/30/30' },
  ];
  
  // Upcoming events
  const upcomingEvents = [
    { title: 'Weekly Team Meeting', date: 'Today, 3:00 PM', type: 'meeting' },
    { title: 'System Maintenance', date: 'Tomorrow, 12:00 AM', type: 'maintenance' },
    { title: 'Quarterly Review', date: 'May 25, 10:00 AM', type: 'meeting' },
    { title: 'New Feature Launch', date: 'May 30', type: 'event' },
  ];
  
  // Recent alerts
  const recentAlerts = [
    { message: 'System update required', level: 'warning', time: '1 hour ago' },
    { message: 'Unusual login attempt detected', level: 'danger', time: '3 hours ago' },
    { message: 'Backup completed successfully', level: 'success', time: '12 hours ago' },
    { message: 'Storage space running low', level: 'warning', time: 'Yesterday' },
  ];

  return (
    <div className="dashboard-content">
  {/* Summary Cards */}
    <DashboardHeader />
      <div className="summary-cards">
        {summaryCards.map((card, index) => (
          <div className="summary-card" key={index}>
            <div className="card-icon" style={{ backgroundColor: card.color }}>
              {card.icon}
            </div>
            <div className="card-content">
              <h3 className="card-title">{card.title}</h3>
              <div className="card-value">{card.value}</div>
              {card.showIncrease && (
                <div className="card-increase">{card.increase} this week</div>
              )}
            </div>
          </div>
      ))}
      </div>
          
      {/* Charts Section */}
      <div className="charts-grid">
        <div className="chart-card revenue-chart">
          <h2>Account Overview</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3498db" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="chart-card user-chart">
          <h2>User Activity</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={userActivityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="active" stroke="#3498db" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="new" stroke="#2ecc71" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="chart-card distribution-chart">
          <h2>User Distribution</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={userTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ value }) => `${value}`}
                >
                  {userTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => <span style={{ color: COLORS[userTypeData.findIndex(item => item.name === value)], fontWeight: 500 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Bottom Widgets */}
      <div className="widgets-grid">
        <div className="widget recent-activities">
          <h2>Recent Activities</h2>
          <div className="activity-list">
            {recentActivities.map((activity, index) => (
              <div className="activity-item" key={index}>
                <img src={activity.avatar} alt={activity.user} className="activity-avatar" />
                <div className="activity-details">
                  <div className="activity-text">
                    <strong>{activity.user}</strong> {activity.action}
                  </div>
                  <div className="activity-time">
                    <FiClock /> {activity.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="widget upcoming-events">
          <h2>Upcoming Events</h2>
          <div className="events-list">
            {upcomingEvents.map((event, index) => (
              <div className={`event-item ${event.type}`} key={index}>
                <div className="event-icon">
                  <FiCalendar />
                </div>
                <div className="event-details">
                  <div className="event-title">{event.title}</div>
                  <div className="event-date">{event.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="widget recent-alerts">
          <h2>System Alerts</h2>
          <div className="alerts-list">
            {recentAlerts.map((alert, index) => (
              <div className={`alert-item ${alert.level}`} key={index}>
                <div className="alert-icon">
                  {alert.level === 'danger' || alert.level === 'warning' ? 
                    <FiAlertCircle /> : <FiCheck />}
                </div>
                <div className="alert-details">
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-time">{alert.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;