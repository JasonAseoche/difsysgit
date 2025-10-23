import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../components/AccountantLayout/DashboardAccountant.css';

const DashboardAccountant = () => {
  const navigate = useNavigate();
  
  // State management
  const [stats, setStats] = useState({
    total_employees: 0,
    completed_tasks: 0,
    new_tasks: 0
  });
  
  const [tasks, setTasks] = useState([]);
  const [calendarData, setCalendarData] = useState({
    current_month_year: '',
    calendar_events: {},
    days_with_events: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch all dashboard data
  useEffect(() => {
    fetchDashboardData();
    document.title = "DIFSYS | DASHBOARD ACCOUNTANT";
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost/difsysapi/dashboard_accountant.php?action=get_all_dashboard_data');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data.stats);
        setTasks(result.data.tasks);
        setCalendarData(result.data.calendar_events);
      } else {
        setError(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'acc-status-completed';
      case 'In Progress':
        return 'acc-status-progress';
      case 'Pending':
        return 'acc-status-pending';
      default:
        return 'acc-status-default';
    }
  };

  const handleViewDetail = (task) => {
    if (task.link) {
      navigate(task.link);
    }
  };

  // Calendar generation
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        hasEvent: false
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const hasEvent = calendarData.days_with_events?.includes(day) || false;
      days.push({
        day,
        isCurrentMonth: true,
        isToday: day === new Date().getDate() && 
                 month === new Date().getMonth() && 
                 year === new Date().getFullYear(),
        hasEvent
      });
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getEventsForDay = (day) => {
    return calendarData.calendar_events?.[day] || [];
  };

  if (loading) {
    return (
      <div className="acc-dashboard-container">
        <div className="acc-loading">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="acc-dashboard-container">
        <div className="acc-error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="acc-dashboard-container">
      {/* Main Layout Grid */}
      <div className="acc-main-layout-grid">
        
        {/* Left Content */}
        <div className="acc-left-content">
          
          {/* Summary Cards - 3 cards */}
          <div className="acc-summary-cards-container">
            <div className="acc-summary-card acc-total-employees">
              <div className="acc-card-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className="acc-card-content">
                <div className="acc-card-label">Total Employees</div>
                <div className="acc-card-value">{stats.total_employees}</div>
              </div>
            </div>

            <div className="acc-summary-card acc-new-tasks">
              <div className="acc-card-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <div className="acc-card-content">
                <div className="acc-card-label">New Tasks</div>
                <div className="acc-card-value">{stats.new_tasks}</div>
              </div>
            </div>

            <div className="acc-summary-card acc-completed-tasks">
              <div className="acc-card-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <div className="acc-card-content">
                <div className="acc-card-label">Completed Tasks</div>
                <div className="acc-card-value">{stats.completed_tasks}</div>
              </div>
            </div>
          </div>

          {/* Tasks Table Section */}
          <div className="acc-tasks-section">
            {/* Table Header */}
            <div className="acc-table-header">
              <h2 className="acc-table-title">My Tasks</h2>
              <button className="acc-filter-button" onClick={fetchDashboardData}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
                Refresh
              </button>
            </div>
            
            {/* Table Container */}
            <div className="acc-table-container">
              {tasks.length === 0 ? (
                <div className="acc-no-tasks">No tasks available</div>
              ) : (
                <table className="acc-task-table">
                  <thead>
                    <tr className="acc-table-header-row">
                      <th className="acc-table-header-cell">Task Name</th>
                      <th className="acc-table-header-cell">Status</th>
                      <th className="acc-table-header-cell">Due By</th>
                      <th className="acc-table-header-cell">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="acc-table-row">
                        <td className="acc-table-cell">
                          <div className="acc-task-name">
                            {task.name}
                          </div>
                        </td>
                        <td className="acc-table-cell">
                          <span className={`acc-status-badge ${getStatusClass(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="acc-table-cell">
                          <div className="acc-due-date">
                            {new Date(task.dueBy).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="acc-table-cell">
                          <button 
                            className="acc-view-detail-btn"
                            onClick={() => handleViewDetail(task)}
                          >
                            View Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Card - Right Side */}
        <div className="acc-calendar-card">
          <div className="acc-calendar-header">
            <button className="acc-calendar-nav" onClick={handlePrevMonth}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <h3 className="acc-calendar-title">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button className="acc-calendar-nav" onClick={handleNextMonth}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
              </svg>
            </button>
          </div>

          <div className="acc-calendar-grid">
            <div className="acc-calendar-weekdays">
              <div className="acc-weekday">S</div>
              <div className="acc-weekday">M</div>
              <div className="acc-weekday">T</div>
              <div className="acc-weekday">W</div>
              <div className="acc-weekday">T</div>
              <div className="acc-weekday">F</div>
              <div className="acc-weekday">S</div>
            </div>

            <div className="acc-calendar-days">
              {generateCalendar().map((dayObj, index) => (
                <div 
                  key={index}
                  className={`acc-calendar-day ${
                    !dayObj.isCurrentMonth ? 'acc-other-month' : ''
                  } ${dayObj.isToday ? 'acc-today' : ''} ${
                    dayObj.hasEvent ? 'acc-has-event' : ''
                  }`}
                >
                  {dayObj.day}
                </div>
              ))}
            </div>
          </div>

          <div className="acc-upcoming-events">
            <h4 className="acc-events-title">EVENTS</h4>
            <div className="acc-events-list">
              {(() => {
                const allEvents = [];
                const today = new Date().getDate();
                const month = currentDate.getMonth();
                const year = currentDate.getFullYear();
                
                // Get events for the next 7 days
                for (let i = 0; i < 7; i++) {
                  const checkDate = new Date(year, month, today + i);
                  const checkDay = checkDate.getDate();
                  const events = getEventsForDay(checkDay);
                  
                  events.forEach(event => {
                    allEvents.push({
                      ...event,
                      date: checkDate
                    });
                  });
                }
                
                if (allEvents.length === 0) {
                  return <div className="acc-no-events">No upcoming events</div>;
                }
                
                return allEvents.slice(0, 4).map((event, index) => (
                  <div key={index} className="acc-event-item">
                    <div className={`acc-event-indicator acc-${event.color || 'development'}`}></div>
                    <div className="acc-event-info">
                      <div className="acc-event-name">{event.title}</div>
                      <div className="acc-event-time">{event.time}</div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAccountant;