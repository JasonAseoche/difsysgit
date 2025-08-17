import React from 'react';
import { useEffect } from 'react';
import '../../components/AccountantLayout/DashboardAccountant.css';

const DashboardAccountant = () => {
  // Sample data for demonstration
  const tasks = [
    {
      id: 1,
      name: "Monthly Payroll Processing",
      status: "In Progress",
      dueBy: "2025-07-20"
    },
    {
      id: 2,
      name: "Tax Filing Preparation",
      status: "Pending",
      dueBy: "2025-07-25"
    },
    {
      id: 3,
      name: "Employee Benefits Review",
      status: "Completed",
      dueBy: "2025-07-15"
    },
    {
      id: 4,
      name: "Financial Report Analysis",
      status: "In Progress",
      dueBy: "2025-07-30"
    },
    {
      id: 5,
      name: "Overtime Calculation",
      status: "Pending",
      dueBy: "2025-07-22"
    }
  ];

  const getStatusClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'acc-dash-status-completed';
      case 'In Progress':
        return 'acc-dash-status-progress';
      case 'Pending':
        return 'acc-dash-status-pending';
      default:
        return 'acc-dash-status-default';
    }
  };

  useEffect(() => {
            document.title = "DIFSYS | DASHBOARD ACCOUNTANT";
          }, []);

  return (
    <div className="acc-dash-container">
      {/* Header Section with Cards */}
      <div className="acc-dash-header-section">
        <div className="acc-dash-cards-grid">
          <div className="acc-dash-stat-card">
            <div className="acc-dash-card-content">
              <div className="acc-dash-card-icon acc-dash-employee-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className="acc-dash-card-info">
                <h3 className="acc-dash-card-title">Total Employees</h3>
                <p className="acc-dash-card-value">145</p>
              </div>
            </div>
          </div>

          <div className="acc-dash-stat-card">
            <div className="acc-dash-card-content">
              <div className="acc-dash-card-icon acc-dash-new-tasks-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <div className="acc-dash-card-info">
                <h3 className="acc-dash-card-title">New Tasks</h3>
                <p className="acc-dash-card-value">12</p>
              </div>
            </div>
          </div>

          <div className="acc-dash-stat-card">
            <div className="acc-dash-card-content">
              <div className="acc-dash-card-icon acc-dash-completed-tasks-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <div className="acc-dash-card-info">
                <h3 className="acc-dash-card-title">Completed Tasks</h3>
                <p className="acc-dash-card-value">28</p>
              </div>
            </div>
          </div>

          <div className="acc-dash-stat-card">
            <div className="acc-dash-card-content">
              <div className="acc-dash-card-icon acc-dash-payroll-icon">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                </svg>
              </div>
              <div className="acc-dash-card-info">
                <h3 className="acc-dash-card-title">Current Payroll Period</h3>
                <p className="acc-dash-card-value">July 2025</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Tasks Table and Calendar */}
      <div className="acc-dash-main-content">

            {/* Table Header Card */}
      <div className="acc-dash-table-header-card">
        <h2 className="acc-dash-table-title">My Tasks</h2>
        <button className="acc-dash-filter-button">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
          </svg>
          Filter
        </button>
      </div>
      
        <div className="acc-dash-content-grid">
          {/* Tasks Table */}
          <div className="acc-dash-table-card">

            
            <div className="acc-dash-table-container">
              <table className="acc-dash-table">
                <thead>
                  <tr className="acc-dash-table-header-row">
                    <th className="acc-dash-table-header-cell">Task Name</th>
                    <th className="acc-dash-table-header-cell">Status</th>
                    <th className="acc-dash-table-header-cell">Due By</th>
                    <th className="acc-dash-table-header-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="acc-dash-table-row">
                      <td className="acc-dash-table-cell">
                        <div className="acc-dash-task-name">
                          {task.name}
                        </div>
                      </td>
                      <td className="acc-dash-table-cell">
                        <span className={`acc-dash-status-badge ${getStatusClass(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="acc-dash-table-cell">
                        <div className="acc-dash-due-date">
                          {new Date(task.dueBy).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="acc-dash-table-cell">
                        <button className="acc-dash-view-detail-btn">
                          View Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calendar */}
          <div className="acc-dash-calendar-card">
            <div className="acc-dash-calendar-header">
              <button className="acc-dash-calendar-nav">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              <h3 className="acc-dash-calendar-title">March 2025</h3>
              <button className="acc-dash-calendar-nav">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                </svg>
              </button>
            </div>

            <div className="acc-dash-calendar-grid">
              <div className="acc-dash-calendar-weekdays">
                <div className="acc-dash-weekday">S</div>
                <div className="acc-dash-weekday">M</div>
                <div className="acc-dash-weekday">T</div>
                <div className="acc-dash-weekday">W</div>
                <div className="acc-dash-weekday">T</div>
                <div className="acc-dash-weekday">F</div>
                <div className="acc-dash-weekday">S</div>
              </div>

              <div className="acc-dash-calendar-days">
                {/* Previous month days */}
                <div className="acc-dash-calendar-day acc-dash-other-month">26</div>
                <div className="acc-dash-calendar-day acc-dash-other-month">27</div>
                <div className="acc-dash-calendar-day acc-dash-other-month">28</div>
                <div className="acc-dash-calendar-day acc-dash-other-month">29</div>
                <div className="acc-dash-calendar-day acc-dash-other-month">30</div>
                <div className="acc-dash-calendar-day acc-dash-other-month">31</div>
                
                {/* Current month days */}
                <div className="acc-dash-calendar-day">1</div>
                <div className="acc-dash-calendar-day">2</div>
                <div className="acc-dash-calendar-day">3</div>
                <div className="acc-dash-calendar-day">4</div>
                <div className="acc-dash-calendar-day">5</div>
                <div className="acc-dash-calendar-day">6</div>
                <div className="acc-dash-calendar-day">7</div>
                <div className="acc-dash-calendar-day">8</div>
                <div className="acc-dash-calendar-day">9</div>
                <div className="acc-dash-calendar-day">10</div>
                <div className="acc-dash-calendar-day">11</div>
                <div className="acc-dash-calendar-day">12</div>
                <div className="acc-dash-calendar-day">13</div>
                <div className="acc-dash-calendar-day">14</div>
                <div className="acc-dash-calendar-day acc-dash-today">15</div>
                <div className="acc-dash-calendar-day">16</div>
                <div className="acc-dash-calendar-day">17</div>
                <div className="acc-dash-calendar-day">18</div>
                <div className="acc-dash-calendar-day">19</div>
                <div className="acc-dash-calendar-day acc-dash-has-event">20</div>
                <div className="acc-dash-calendar-day">21</div>
                <div className="acc-dash-calendar-day acc-dash-has-event">22</div>
                <div className="acc-dash-calendar-day">23</div>
                <div className="acc-dash-calendar-day">24</div>
                <div className="acc-dash-calendar-day acc-dash-has-event">25</div>
                <div className="acc-dash-calendar-day">26</div>
                <div className="acc-dash-calendar-day">27</div>
                <div className="acc-dash-calendar-day">28</div>
                <div className="acc-dash-calendar-day">29</div>
                <div className="acc-dash-calendar-day acc-dash-has-event">30</div>
                <div className="acc-dash-calendar-day">31</div>
              </div>
            </div>

            <div className="acc-dash-upcoming-events">
              <h4 className="acc-dash-events-title">EVENTS</h4>
              <div className="acc-dash-events-list">
                <div className="acc-dash-event-item">
                  <div className="acc-dash-event-indicator acc-dash-development"></div>
                  <div className="acc-dash-event-info">
                    <div className="acc-dash-event-name">Development planning</div>
                    <div className="acc-dash-event-time">4:00 PM</div>
                  </div>
                </div>
                <div className="acc-dash-event-item">
                  <div className="acc-dash-event-indicator acc-dash-ux"></div>
                  <div className="acc-dash-event-info">
                    <div className="acc-dash-event-name">UX Research</div>
                    <div className="acc-dash-event-time">3:00 PM</div>
                  </div>
                </div>
                <div className="acc-dash-event-item">
                  <div className="acc-dash-event-indicator acc-dash-development"></div>
                  <div className="acc-dash-event-info">
                    <div className="acc-dash-event-name">Development planning</div>
                    <div className="acc-dash-event-time">8:00 PM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAccountant;