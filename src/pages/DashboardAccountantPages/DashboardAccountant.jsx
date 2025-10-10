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
        return 'acc-status-completed';
      case 'In Progress':
        return 'acc-status-progress';
      case 'Pending':
        return 'acc-status-pending';
      default:
        return 'acc-status-default';
    }
  };

  useEffect(() => {
    document.title = "DIFSYS | DASHBOARD ACCOUNTANT";
  }, []);

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
                <div className="acc-card-value">145</div>
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
                <div className="acc-card-value">12</div>
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
                <div className="acc-card-value">28</div>
              </div>
            </div>
          </div>

          {/* Tasks Table Section */}
          <div className="acc-tasks-section">
            {/* Table Header */}
            <div className="acc-table-header">
              <h2 className="acc-table-title">My Tasks</h2>
              <button className="acc-filter-button">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
                </svg>
                Filter
              </button>
            </div>
            
            {/* Table Container */}
            <div className="acc-table-container">
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
                        <button className="acc-view-detail-btn">
                          View Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Calendar Card - Right Side */}
        <div className="acc-calendar-card">
          <div className="acc-calendar-header">
            <button className="acc-calendar-nav">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <h3 className="acc-calendar-title">March 2025</h3>
            <button className="acc-calendar-nav">
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
              {/* Previous month days */}
              <div className="acc-calendar-day acc-other-month">26</div>
              <div className="acc-calendar-day acc-other-month">27</div>
              <div className="acc-calendar-day acc-other-month">28</div>
              <div className="acc-calendar-day acc-other-month">29</div>
              <div className="acc-calendar-day acc-other-month">30</div>
              <div className="acc-calendar-day acc-other-month">31</div>
              
              {/* Current month days */}
              <div className="acc-calendar-day">1</div>
              <div className="acc-calendar-day">2</div>
              <div className="acc-calendar-day">3</div>
              <div className="acc-calendar-day">4</div>
              <div className="acc-calendar-day">5</div>
              <div className="acc-calendar-day">6</div>
              <div className="acc-calendar-day">7</div>
              <div className="acc-calendar-day">8</div>
              <div className="acc-calendar-day">9</div>
              <div className="acc-calendar-day">10</div>
              <div className="acc-calendar-day">11</div>
              <div className="acc-calendar-day">12</div>
              <div className="acc-calendar-day">13</div>
              <div className="acc-calendar-day">14</div>
              <div className="acc-calendar-day acc-today">15</div>
              <div className="acc-calendar-day">16</div>
              <div className="acc-calendar-day">17</div>
              <div className="acc-calendar-day">18</div>
              <div className="acc-calendar-day">19</div>
              <div className="acc-calendar-day acc-has-event">20</div>
              <div className="acc-calendar-day">21</div>
              <div className="acc-calendar-day acc-has-event">22</div>
              <div className="acc-calendar-day">23</div>
              <div className="acc-calendar-day">24</div>
              <div className="acc-calendar-day acc-has-event">25</div>
              <div className="acc-calendar-day">26</div>
              <div className="acc-calendar-day">27</div>
              <div className="acc-calendar-day">28</div>
              <div className="acc-calendar-day">29</div>
              <div className="acc-calendar-day acc-has-event">30</div>
              <div className="acc-calendar-day">31</div>
            </div>
          </div>

          <div className="acc-upcoming-events">
            <h4 className="acc-events-title">EVENTS</h4>
            <div className="acc-events-list">
              <div className="acc-event-item">
                <div className="acc-event-indicator acc-development"></div>
                <div className="acc-event-info">
                  <div className="acc-event-name">Payroll Meeting</div>
                  <div className="acc-event-time">10:00 AM</div>
                </div>
              </div>
              <div className="acc-event-item">
                <div className="acc-event-indicator acc-ux"></div>
                <div className="acc-event-info">
                  <div className="acc-event-name">Tax Review</div>
                  <div className="acc-event-time">2:00 PM</div>
                </div>
              </div>
              <div className="acc-event-item">
                <div className="acc-event-indicator acc-development"></div>
                <div className="acc-event-info">
                  <div className="acc-event-name">Budget Planning</div>
                  <div className="acc-event-time">4:00 PM</div>
                </div>
              </div>
              <div className="acc-event-item">
                <div className="acc-event-indicator acc-ux"></div>
                <div className="acc-event-info">
                  <div className="acc-event-name">Financial Audit</div>
                  <div className="acc-event-time">9:00 AM</div>
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