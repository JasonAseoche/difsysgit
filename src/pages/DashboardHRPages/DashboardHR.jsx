import React, { useState, useEffect } from 'react';
import '../../components/HRLayout/DashboardHR.css';

const DashboardHR = () => {
  // State for animations and dynamic content
  const [isLoaded, setIsLoaded] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [applicantCount, setApplicantCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [declinedCount, setDeclinedCount] = useState(0);

  // Sample data for charts (using exact values from design)
  const newApplicantData = [3000, 3500, 6500, 5000, 5500, 6000, 8200];
  const attendanceData = [3500, 3000, 5000, 6800, 5500, 5800, 8000];
  
  // Sample data for donut chart with total matching design (185)
  const donutData = [
    { label: "Marketing", value: 30, color: "#4CAF50" },
    { label: "Development", value: 20, color: "#2196F3" },
    { label: "HR", value: 35, color: "#9C27B0" },
    { label: "Finance", value: 70, color: "#FF9800" },
    { label: "Operations", value: 30, color: "#00BCD4" }
  ];
  
  // Sample data for recent activities with avatar images
  const attendanceActivities = [
    { 
      id: 1, 
      employee: "Emma Johnson", 
      action: "Checked in", 
      time: "9:03 AM", 
      date: "May 21, 2025",
      avatar: "https://randomuser.me/api/portraits/women/11.jpg",
      iconClass: "checkin-icons11" 
    },
    { 
      id: 2, 
      employee: "Michael Chen", 
      action: "Checked out", 
      time: "5:15 PM", 
      date: "May 21, 2025",
      avatar: "https://randomuser.me/api/portraits/men/22.jpg",
      iconClass: "checkout-icons11" 
    },
    { 
      id: 3, 
      employee: "Sarah Williams", 
      action: "Requested leave", 
      time: "11:30 AM", 
      date: "May 21, 2025",
      avatar: "https://randomuser.me/api/portraits/women/33.jpg",
      iconClass: "leave-icons11" 
    },
    { 
      id: 4, 
      employee: "David Kim", 
      action: "Marked absent", 
      time: "9:00 AM", 
      date: "May 20, 2025",
      avatar: "https://randomuser.me/api/portraits/men/44.jpg",
      iconClass: "absent-icons11" 
    }
  ];
  
  const applicantActivities = [
    { 
      id: 1, 
      applicant: "John Smith", 
      position: "Senior Developer", 
      status: "Interview scheduled", 
      date: "May 21, 2025",
      statusClass: "interview-status"
    },
    { 
      id: 2, 
      applicant: "Maria Garcia", 
      position: "UI/UX Designer", 
      status: "Application received", 
      date: "May 21, 2025",
      statusClass: "application-status"
    },
    { 
      id: 3, 
      applicant: "Robert Johnson", 
      position: "Project Manager", 
      status: "Assessment sent", 
      date: "May 20, 2025",
      statusClass: "assessment-status"
    },
    { 
      id: 4, 
      applicant: "Priya Patel", 
      position: "Data Analyst", 
      status: "Shortlisted", 
      date: "May 20, 2025",
      statusClass: "shortlisted-status"
    }
  ];

  // Add animation effect on load
  useEffect(() => {
    setIsLoaded(true);
    
    // Animate count-up for card values
    const countUp = (startValue, endValue, setValue, duration = 1500) => {
      const startTime = Date.now();
      const updateCount = () => {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        
        if (elapsedTime < duration) {
          const value = Math.round(startValue + (endValue - startValue) * (elapsedTime / duration));
          setValue(value);
          requestAnimationFrame(updateCount);
        } else {
          setValue(endValue);
        }
      };
      
      updateCount();
    };
    
    countUp(0, 2200, setEmployeeCount);
    countUp(0, 231, setApplicantCount);
    countUp(0, 120, setPendingCount);
    countUp(0, 130, setDeclinedCount);
  }, []);

  // Function to get specific icon based on activity type
  const getActivityIcon = (action) => {
    switch(action) {
      case "Checked in":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="activity-svgs11">
            <path d="M12 2C6.486 2 2 6.486 2 12C2 17.514 6.486 22 12 22C17.514 22 22 17.514 22 12C22 6.486 17.514 2 12 2ZM12 20C7.589 20 4 16.411 4 12C4 7.589 7.589 4 12 4C16.411 4 20 7.589 20 12C20 16.411 16.411 20 12 20ZM15.293 9.293L11 13.586L8.707 11.293L7.293 12.707L11 16.414L16.707 10.707L15.293 9.293Z" />
          </svg>
        );
      case "Checked out":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="activity-svgs11">
            <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM15.59 7L12 10.59L8.41 7L7 8.41L10.59 12L7 15.59L8.41 17L12 13.41L15.59 17L17 15.59L13.41 12L17 8.41L15.59 7Z" />
          </svg>
        );
      case "Requested leave":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="activity-svgs11">
            <path d="M19 4h-1V3c0-.55-.45-1-1-1s-1 .45-1 1v1H8V3c0-.55-.45-1-1-1s-1 .45-1 1v1H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" />
          </svg>
        );
      case "Marked absent":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="activity-svgs11">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="activity-svgs11">
            <path d="M12 12.75C8.83 12.75 6.25 10.17 6.25 7C6.25 3.83 8.83 1.25 12 1.25C15.17 1.25 17.75 3.83 17.75 7C17.75 10.17 15.17 12.75 12 12.75Z" />
          </svg>
        );
    }
  };

  // Function to render the bar chart with exact design
  const renderBarChart = (data, labels) => {
    // Calculate the max value to ensure bars are proportional
    const maxValue = 10000; // Fixed max value to match design
    
    return (
      <div className="bar-charts11">
        <div className="chart-valuess11">
          <div>10000</div>
          <div>7500</div>
          <div>5000</div>
          <div>2500</div>
          <div>0</div>
        </div>
        <div className="chart-barss11">
          {data.map((value, index) => (
            <div key={index} className="chart-bar-containers11">
              <div 
                className="chart-bars11" 
                style={{ 
                  height: `${(value / maxValue) * 100}%`,
                  opacity: isLoaded ? 1 : 0,
                  transition: `height 0.8s ease-in-out ${index * 0.1}s, opacity 0.8s ease-in-out ${index * 0.1}s`
                }}
              ></div>
              <div className="chart-labels11">{labels[index]}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Function to render donut chart
  const renderDonutChart = (data) => {
    let cumulativePercent = 0;
    const total = data.reduce((sum, { value }) => sum + value, 0);
    
    return (
      <div className="donut-chart-containers11">
        <div className="donut-chart-wrappers11">
          <svg width="100%" height="100%" viewBox="0 0 42 42" className="donut-charts11">
            <circle className="donut-holes11" cx="21" cy="21" r="15.91549430918954" fill="#fff"></circle>
            <circle className="donut-rings11" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#d2d3d4" strokeWidth="3"></circle>
            
            {data.map((item, i) => {
              const startPercent = cumulativePercent;
              const percent = item.value / total;
              cumulativePercent += percent;
              
              return (
                <circle 
                  key={i}
                  className="donut-segments11" 
                  cx="21" 
                  cy="21" 
                  r="15.91549430918954" 
                  fill="transparent" 
                  stroke={item.color} 
                  strokeWidth="3"
                  strokeDasharray={`${percent * 100} ${100 - (percent * 100)}`}
                  strokeDashoffset={isLoaded ? 100 - (startPercent * 100) : 100}
                  style={{ 
                    transition: `stroke-dashoffset 1s ease-in-out ${i * 0.2}s, stroke-width 0.3s ease` 
                  }}
                ></circle>
              );
            })}
            
            <g className="donut-texts11">
              <text x="50%" y="50%" className="donut-numbers11">
                185
              </text>
              <text x="50%" y="50%" className="donut-labels11" dy="1.6em">
                Total
              </text>
            </g>
          </svg>
        </div>
        
        <div className="donut-legends11">
          {data.map((item, i) => (
            <div key={i} className="legend-items11">
              <span className="legend-colors11" style={{ backgroundColor: item.color }}></span>
              <span className="legend-labels11">{item.label}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-containers11">
      {/* Summary Cards */}
      <div className="summary-cardss11">
        <div className="summary-cards11 total-employeess11">
          <div className="card-icons11">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12.75C8.83 12.75 6.25 10.17 6.25 7C6.25 3.83 8.83 1.25 12 1.25C15.17 1.25 17.75 3.83 17.75 7C17.75 10.17 15.17 12.75 12 12.75ZM12 2.75C9.66 2.75 7.75 4.66 7.75 7C7.75 9.34 9.66 11.25 12 11.25C14.34 11.25 16.25 9.34 16.25 7C16.25 4.66 14.34 2.75 12 2.75Z"></path>
              <path d="M3.41 22.75C3 22.75 2.66 22.41 2.66 22C2.66 17.73 6.73 14.25 12 14.25C17.27 14.25 21.34 17.73 21.34 22C21.34 22.41 21 22.75 20.59 22.75C20.18 22.75 19.84 22.41 19.84 22C19.84 18.52 16.38 15.75 12 15.75C7.62 15.75 4.16 18.52 4.16 22C4.16 22.41 3.82 22.75 3.41 22.75Z"></path>
            </svg>
          </div>
          <div className="card-contents11">
            <div className="card-labels11">Total of Employees</div>
            <div className="card-values11">{employeeCount}</div>
          </div>
        </div>
        
        <div className="summary-cards11 total-applicantss11">
          <div className="card-icons11">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.75 17.25v1.5a1.5 1.5 0 0 1-1.5 1.5H4.5a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5h9.75a1.5 1.5 0 0 1 1.5 1.5v1.5m0 10.5V6.75m0 10.5h5.25a1.5 1.5 0 0 0 1.5-1.5v-7.5a1.5 1.5 0 0 0-1.5-1.5H15.75" />
            </svg>
          </div>
          <div className="card-contents11">
            <div className="card-labels11">Total of Applicants</div>
            <div className="card-values11">{applicantCount}</div>
          </div>
        </div>
        
        <div className="summary-cards11 pending-applicantss11">
          <div className="card-icons11">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C10.6868 2 9.38642 2.25866 8.17317 2.7612C6.95991 3.26375 5.85752 4.00035 4.92893 4.92893C3.05357 6.8043 2 9.34784 2 12C2 14.6522 3.05357 17.1957 4.92893 19.0711C5.85752 19.9997 6.95991 20.7362 8.17317 21.2388C9.38642 21.7413 10.6868 22 12 22C14.6522 22 17.1957 20.9464 19.0711 19.0711C20.9464 17.1957 22 14.6522 22 12C22 10.6868 21.7413 9.38642 21.2388 8.17317C20.7362 6.95991 19.9997 5.85752 19.0711 4.92893C18.1425 4.00035 17.0401 3.26375 15.8268 2.7612C14.6136 2.25866 13.3132 2 12 2ZM12 20C9.87827 20 7.84344 19.1571 6.34315 17.6569C4.84285 16.1566 4 14.1217 4 12C4 9.87827 4.84285 7.84344 6.34315 6.34315C7.84344 4.84285 9.87827 4 12 4C14.1217 4 16.1566 4.84285 17.6569 6.34315C19.1571 7.84344 20 9.87827 20 12C20 14.1217 19.1571 16.1566 17.6569 17.6569C16.1566 19.1571 14.1217 20 12 20ZM17 11H13V7C13 6.73478 12.8946 6.48043 12.7071 6.29289C12.5196 6.10536 12.2652 6 12 6C11.7348 6 11.4804 6.10536 11.2929 6.29289C11.1054 6.48043 11 6.73478 11 7V12C11 12.2652 11.1054 12.5196 11.2929 12.7071C11.4804 12.8946 11.7348 13 12 13H17C17.2652 13 17.5196 12.8946 17.7071 12.7071C17.8946 12.5196 18 12.2652 18 12C18 11.7348 17.8946 11.4804 17.7071 11.2929C17.5196 11.1054 17.2652 11 17 11Z" />
            </svg>
          </div>
          <div className="card-contents11">
            <div className="card-labels11">Pending Applicants</div>
            <div className="card-values11">{pendingCount}</div>
          </div>
        </div>
        
        <div className="summary-cards11 declined-applicantss11">
          <div className="card-icons11">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM15.59 7L12 10.59L8.41 7L7 8.41L10.59 12L7 15.59L8.41 17L12 13.41L15.59 17L17 15.59L13.41 12L17 8.41L15.59 7Z" />
            </svg>
          </div>
          <div className="card-contents11">
            <div className="card-labels11">Declined Applicants</div>
            <div className="card-values11">{declinedCount}</div>
          </div>
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="charts-rows11">
        <div className="chart-cards11">
          <h3 className="chart-titles11">New Applicant Overview</h3>
          {renderBarChart(
            newApplicantData,
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
          )}
        </div>
        
        <div className="chart-cards11">
          <h3 className="chart-titles11">Attendance Overview</h3>
          {renderBarChart(
            attendanceData,
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
          )}
        </div>
        
        <div className="chart-cards11">
          <h3 className="chart-titles11">Pending and Declined Applicants</h3>
          {renderDonutChart(donutData)}
        </div>
      </div>
      
      {/* Activities Row */}
      <div className="activities-rows11">
        <div className="activity-cards11">
          <h3 className="activity-titles11">Attendance Activities</h3>
          <div className="activity-lists11">
            {attendanceActivities.map(activity => (
              <div key={activity.id} className="activity-items11">
                <div className={`activity-icons11 ${activity.iconClass}`}>
                  {activity.avatar ? (
                    <img src={activity.avatar} alt={activity.employee} className="activity-avatars11" />
                  ) : (
                    getActivityIcon(activity.action)
                  )}
                </div>
                <div className="activity-detailss11">
                  <div className="activity-persons11">{activity.employee}</div>
                  <div className="activity-descriptions11">
                    {activity.action} - {activity.time}
                  </div>
                  <div className="activity-dates11">{activity.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="activity-cards11">
          <h3 className="activity-titles11">Applicant Activities</h3>
          <div className="activity-lists11">
            {applicantActivities.map(activity => (
              <div key={activity.id} className="activity-items11">
                <div className="activity-icons11 document-icons11">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="activity-svgs11">
                    <path d="M19.5 3h-15C3.67157 3 3 3.67157 3 4.5v15c0 .8284.67157 1.5 1.5 1.5h15c.8284 0 1.5-.6716 1.5-1.5v-15c0-.82843-.6716-1.5-1.5-1.5ZM8 17.5H6.5v-1.5H8v1.5Zm0-3H6.5V13H8v1.5Zm0-3H6.5V10H8v1.5Zm0-3H6.5V7H8v1.5ZM17.5 17h-8v-1.5h8V17Zm0-3h-8v-1.5h8V14Zm0-3h-8v-1.5h8V11Zm0-3h-8V6.5h8V8Z" />
                  </svg>
                </div>
                <div className="activity-detailss11">
                  <div className="activity-persons11">{activity.applicant}</div>
                  <div className="activity-descriptions11">
                    {activity.position} - <span className={`activity-statuss11 ${activity.statusClass}`}>{activity.status}</span>
                  </div>
                  <div className="activity-dates11">{activity.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHR;