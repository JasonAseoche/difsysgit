import React, { useState, useEffect } from 'react';
import '../../components/AdminLayout/Dashboard.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  FiUsers,
  FiClock,
  FiUserCheck,
  FiActivity
} from 'react-icons/fi';
import axios from 'axios';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const API_URL = 'http://localhost/difsysapi/admin.php';
  const AUDIT_API_URL = 'http://localhost/difsysapi/audit_trail.php';
  
  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
    fetchRecentActivities();
    
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchRecentActivities();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API_URL}?endpoint=dashboard`);
      
      if (response.data.success) {
        setDashboardData(response.data.data);
        setError(null);
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRecentActivities = async () => {
    try {
      const response = await axios.get(`${AUDIT_API_URL}?endpoint=logs&page=1&itemsPerPage=4`);
      
      if (response.data.success && response.data.data) {
        // Update dashboard data with fresh activities
        setDashboardData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            recentActivities: response.data.data.map(log => ({
              user: log.user_email || 'System',
              action: `${log.component} - ${log.action}`,
              time: formatRelativeTime(log.timestamp),
              timestamp: log.timestamp
            }))
          };
        });
      }
    } catch (err) {
      console.error('Error fetching recent activities:', err);
    }
  };
  
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - logTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };
  
  // Calculate percentage increase for new users
  const calculateIncrease = (newUsers, totalUsers) => {
    if (totalUsers === 0) return '0%';
    const percentage = ((newUsers / totalUsers) * 100).toFixed(1);
    return `+${percentage}%`;
  };
  
  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9575CD'];
  
  // Default avatar SVG (generic person icon)
  const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
  
  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="dashboard-content">
        <div className="error-message">{error}</div>
      </div>
    );
  }
  
  if (!dashboardData) {
    return (
      <div className="dashboard-content">
        <div className="error-message">No data available</div>
      </div>
    );
  }
  
  const { summaryCards, accountOverview, userActivity, userDistribution, recentActivities } = dashboardData;
  
  // Log data for debugging
  console.log('Dashboard Data:', dashboardData);
  
  // Prepare summary cards data
  const summaryCardsData = [
    { 
      title: 'Total Users', 
      value: summaryCards.totalUsers.toLocaleString(), 
      increase: calculateIncrease(summaryCards.newUsers, summaryCards.totalUsers), 
      icon: <FiUsers />, 
      color: '#3498db', 
      showIncrease: true 
    },
    { 
      title: 'New Account Created', 
      value: summaryCards.newUsers.toString(), 
      increase: '', 
      icon: <FiUsers />, 
      color: '#2ecc71', 
      showIncrease: false,
      subtitle: 'Last 7 days'
    },
    { 
      title: 'Verified Accounts', 
      value: summaryCards.verifiedAccounts.toString(), 
      increase: '', 
      icon: <FiUserCheck />, 
      color: '#9b59b6', 
      showIncrease: false 
    },
    { 
      title: 'Active Users', 
      value: summaryCards.activeUsers.toString(), 
      increase: '', 
      icon: <FiActivity />, 
      color: '#e74c3c', 
      showIncrease: false,
      subtitle: 'Online now'
    }
  ];

  return (
    <div className="dashboard-content">
      {/* Summary Cards */}
      <div className="summary-cards">
        {summaryCardsData.map((card, index) => (
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
              {card.subtitle && (
                <div className="card-subtitle">{card.subtitle}</div>
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
              <BarChart data={accountOverview} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              <LineChart data={userActivity} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="active" stroke="#3498db" activeDot={{ r: 8 }} />
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
                  data={userDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ value }) => `${value}`}
                >
                  {userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Recent Activities Widget */}
      <div className="widgets-grid">
        <div className="widget recent-activities">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Recent Activities</h2>
            <button 
              onClick={fetchRecentActivities}
              style={{
                padding: '6px 12px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Refresh
            </button>
          </div>
          <div className="activity-list">
            {recentActivities && recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div className="activity-item" key={index}>
                  <img 
                    src={defaultAvatar} 
                    alt="User" 
                    className="activity-avatar" 
                  />
                  <div className="activity-details">
                    <div className="activity-text">
                      <strong>{activity.user}</strong> {activity.action}
                    </div>
                    <div className="activity-time">
                      <FiClock /> {activity.time}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activities" style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: '#7f8c8d',
                fontSize: '14px'
              }}>
                No recent activities found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;