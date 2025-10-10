import React, { useState, useEffect } from 'react';
import '../../components/HRLayout/DashboardHR.css';

const DashboardHR = () => {
  // State for animations and dynamic content
  const [isLoaded, setIsLoaded] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [applicantCount, setApplicantCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart data states
  const [pendingApplicantData, setPendingApplicantData] = useState([]);
  const [attendanceData, setAttendanceData] = useState({ present: [], absent: [] });
  const [chartLabels, setChartLabels] = useState(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']);
  const [chartPeriod, setChartPeriod] = useState(0); // 0 = current period, -1 = previous, 1 = next
  const [allChartData, setAllChartData] = useState({
    pending: [],
    attendance: { present: [], absent: [] },
    labels: []
  });
  
  // Calendar and events state
  const [calendarData, setCalendarData] = useState({
    currentMonthYear: 'March 2025',
    todayEvents: [],
    upcomingEvents: []
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Attendance activities state
  const [attendanceActivities, setAttendanceActivities] = useState([]);

  // API base URL
  const API_BASE_URL = 'http://localhost/difsysapi/dashboard_hr.php';

  useEffect(() => {
    document.title = "DIFSYS | HR DASHBOARD";
    fetchDashboardData();
    
    // Set up real-time updates every 10 seconds
    const interval = setInterval(fetchDashboardData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}?action=get_all_dashboard_data`);
      const result = await response.json();
      
      if (result.success) {
        const data = result.data;
        
        console.log('=== DASHBOARD DATA DEBUG ===');
        console.log('Raw API Response:', data);
        console.log('Attendance Chart Data:', data.attendance_chart);
        console.log('Present Data Array:', data.attendance_chart?.present_data);
        console.log('Absent Data Array:', data.attendance_chart?.absent_data);
        
        // Set stats with animation
        animateCounters(data.stats);
        
        // Generate chart data for different pages (Jan-Jun, Jul-Dec)
        const currentMonth = new Date().getMonth(); // 0-based (September = 8)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Create two pages: Page 0 = Jan-Jun, Page 1 = Jul-Dec
        const getChartPage = (pageIndex) => {
          const startMonth = pageIndex === 0 ? 0 : 6; // 0=Jan, 6=Jul
          const endMonth = pageIndex === 0 ? 5 : 11;  // 5=Jun, 11=Dec
          
          const pageMonths = [];
          const pageData = [];
          const pagePresent = [];
          const pageAbsent = [];
          
          for (let i = startMonth; i <= endMonth; i++) {
            pageMonths.push(months[i]);
            pageData.push(data.pending_applicants_chart.data[i] || 0);
            pagePresent.push(data.attendance_chart.present_data[i] || 0);
            pageAbsent.push(data.attendance_chart.absent_data[i] || 0);
          }
          
          return {
            labels: pageMonths,
            pending: pageData,
            present: pagePresent,
            absent: pageAbsent
          };
        };
        
        // Determine which page should be shown first (based on current month)
        const initialPage = currentMonth >= 6 ? 1 : 0; // Jul-Dec = page 1, Jan-Jun = page 0
        
        // Store all pages data
        setAllChartData({
          pages: {
            '0': getChartPage(0), // Jan-Jun
            '1': getChartPage(1)  // Jul-Dec
          }
        });
        
        // Set initial page data (focus on current month's page)
        setChartPeriod(initialPage);
        const initialPageData = getChartPage(initialPage);
        setPendingApplicantData(initialPageData.pending);
        setAttendanceData({
          present: initialPageData.present,
          absent: initialPageData.absent
        });
        setChartLabels(initialPageData.labels);
        
        // Set calendar data
        setCalendarData({
          currentMonthYear: data.calendar_events.current_month_year || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          todayEvents: data.calendar_events.today_events || [],
          upcomingEvents: data.calendar_events.upcoming_events || []
        });
        
        // Set attendance activities
        setAttendanceActivities(data.attendance_activities || []);
        
        setIsLoaded(true);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const animateCounters = (stats) => {
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
    
    countUp(0, stats.total_employees, setEmployeeCount);
    countUp(0, stats.total_applicants, setApplicantCount);
    countUp(0, stats.pending_applicants, setPendingCount);
  };

  // Function to generate calendar days
  const generateCalendarDays = () => {
    const today = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of the month and how many days in the month
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();
    
    // Get last month's details for previous month days
    const lastDayOfPrevMonth = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Add previous month's days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = lastDayOfPrevMonth - i;
      days.push(
        <div key={`prev-${day}`} className="hr-calendar-day11 hr-other-month11">
          {day}
        </div>
      );
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(year, month, day);
      const isToday = currentDay.toDateString() === today.toDateString();
      const hasEvent = Math.random() > 0.8; // Random events for demo, replace with real event check
      
      let className = "hr-calendar-day11";
      if (isToday) className += " hr-today11";
      if (hasEvent) className += " hr-has-event11";
      
      days.push(
        <div key={`current-${day}`} className={className}>
          {day}
        </div>
      );
    }
    
    // Add next month's days to fill the grid
    const totalCells = 42; // 6 rows × 7 days
    const remainingCells = totalCells - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      days.push(
        <div key={`next-${day}`} className="hr-calendar-day11 hr-other-month11">
          {day}
        </div>
      );
    }
    
    return days;
  };

  // Function to navigate chart pages
  const navigateChartPeriod = (direction) => {
    const newPage = direction > 0 ? 1 : 0; // Only 2 pages: 0 and 1
    if (newPage !== chartPeriod && allChartData.pages) {
      setChartPeriod(newPage);
      const pageData = allChartData.pages[newPage.toString()];
      if (pageData) {
        setPendingApplicantData(pageData.pending);
        setAttendanceData({
          present: pageData.present,
          absent: pageData.absent
        });
        setChartLabels(pageData.labels);
      }
    }
  };

  // Function to get period title
  const getPeriodTitle = (page) => {
    const currentYear = new Date().getFullYear();
    switch(page) {
      case 0: return `${currentYear} Q1 - Q2 (Jan-Jun)`;
      case 1: return `${currentYear} Q3 - Q4 (Jul-Dec)`;
      default: return `${currentYear} Current Year`;
    }
  };

  // Function to navigate calendar months
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

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
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="activity-svgs11">
            <path d="M12 12.75C8.83 12.75 6.25 10.17 6.25 7C6.25 3.83 8.83 1.25 12 1.25C15.17 1.25 17.75 3.83 17.75 7C17.75 10.17 15.17 12.75 12 12.75Z" />
          </svg>
        );
    }
  };

  // Function to render the single bar chart (for pending applicants)
  const renderSingleBarChart = (data, labels, title) => {
    // Fix: Calculate maxValue based on actual data, with a reasonable minimum
    const dataMax = Math.max(...data);
    const maxValue = dataMax > 0 ? Math.max(dataMax * 1.2, 10) : 100; // 20% padding above highest value, minimum 10
    
    return (
      <div className="bar-charts11">
        <div className="chart-valuess11">
          <div>{Math.round(maxValue)}</div>
          <div>{Math.round(maxValue * 0.75)}</div>
          <div>{Math.round(maxValue * 0.5)}</div>
          <div>{Math.round(maxValue * 0.25)}</div>
          <div>0</div>
        </div>
        <div className="chart-barss11">
          {data.map((value, index) => (
            <div key={index} className="chart-bar-containers11">
              <div 
                className="chart-bars11 single-bar" 
                style={{ 
                  height: `${(value / maxValue) * 100}%`,
                  opacity: isLoaded ? 1 : 0,
                  transition: `height 0.8s ease-in-out ${index * 0.1}s, opacity 0.8s ease-in-out ${index * 0.1}s`
                }}
                title={`${labels[index]}: ${value} pending applicants`}
              ></div>
              <div className="chart-labels11">{labels[index]}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Function to render the dual bar chart (for attendance)
  const renderDualBarChart = (presentData, absentData, labels, title) => {
    console.log('=== DUAL BAR CHART DEBUG ===');
    console.log('Present Data:', presentData);
    console.log('Absent Data:', absentData);
    console.log('Labels:', labels);
    
    // Fix: Calculate maxValue based on actual data, with a reasonable minimum
    const dataMax = Math.max(...presentData, ...absentData);
    const maxValue = dataMax > 0 ? Math.max(dataMax * 1.2, 10) : 100; // 20% padding above highest value, minimum 10
    console.log('Data Max:', dataMax, 'Chart Max Value:', maxValue);
    
    return (
      <div className="bar-charts11">
        <div className="chart-valuess11">
          <div>{Math.round(maxValue)}</div>
          <div>{Math.round(maxValue * 0.75)}</div>
          <div>{Math.round(maxValue * 0.5)}</div>
          <div>{Math.round(maxValue * 0.25)}</div>
          <div>0</div>
        </div>
        <div className="chart-barss11">
          {labels.map((label, index) => {
            const presentValue = presentData[index] || 0;
            const absentValue = absentData[index] || 0;
            const presentHeight = (presentValue / maxValue) * 100;
            const absentHeight = (absentValue / maxValue) * 100;
            
            console.log(`Bar ${index} (${label}): Present=${presentValue} (${presentHeight.toFixed(1)}%), Absent=${absentValue} (${absentHeight.toFixed(1)}%)`);
            
            return (
              <div key={index} className="chart-bar-containers11">
                <div className="dual-bar-group">
                  <div 
                    className="chart-bars11 present-bar" 
                    style={{ 
                      height: `${presentHeight}%`,
                      opacity: isLoaded ? 1 : 0,
                      transition: `height 0.8s ease-in-out ${index * 0.1}s, opacity 0.8s ease-in-out ${index * 0.1}s`
                    }}
                    title={`${label}: ${presentValue} Present`}
                  ></div>
                  <div 
                    className="chart-bars11 absent-bar" 
                    style={{ 
                      height: `${absentHeight}%`,
                      opacity: isLoaded ? 1 : 0,
                      transition: `height 0.8s ease-in-out ${index * 0.1 + 0.05}s, opacity 0.8s ease-in-out ${index * 0.1 + 0.05}s`
                    }}
                    title={`${label}: ${absentValue} Absent`}
                  ></div>
                </div>
                <div className="chart-labels11">{label}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading && !isLoaded) {
    return (
      <div className="dashboard-containers11">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-containers11">
        <div className="error-container">
          <p>Error: {error}</p>
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-containers11">
      {/* Main Layout: Left Content + Right Calendar */}
      <div className="main-layout-grid11">
        
        {/* Left Content Column */}
        <div className="left-content11">
          {/* Summary Cards Row */}
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
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
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
          </div>

          {/* Charts Row */}
          <div className="charts-rows11">
            <div className="chart-cards11">
              <div className="chart-header-with-nav">
                <button 
                  className="chart-nav-btn" 
                  onClick={() => navigateChartPeriod(-1)}
                  disabled={chartPeriod === 0}
                  title="Previous Half (Jan-Jun)"
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </button>
                <div className="chart-title-container">
                  <h3 className="chart-titles11">Pending Applicant Overview</h3>
                  <span className="chart-period-indicator">{getPeriodTitle(chartPeriod)}</span>
                </div>
                <button 
                  className="chart-nav-btn" 
                  onClick={() => navigateChartPeriod(1)}
                  disabled={chartPeriod === 1}
                  title="Next Half (Jul-Dec)"
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                  </svg>
                </button>
              </div>
              {renderSingleBarChart(pendingApplicantData, chartLabels, 'Pending Applicants')}
            </div>
            
            <div className="chart-cards11">
              <div className="chart-header-with-nav">
                <button 
                  className="chart-nav-btn" 
                  onClick={() => navigateChartPeriod(-1)}
                  disabled={chartPeriod === 0}
                  title="Previous Half (Jan-Jun)"
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </button>
                <div className="chart-title-container">
                  <h3 className="chart-titles11">Attendance Overview</h3>
                  <span className="chart-period-indicator">{getPeriodTitle(chartPeriod)}</span>
                </div>
                <button 
                  className="chart-nav-btn" 
                  onClick={() => navigateChartPeriod(1)}
                  disabled={chartPeriod === 1}
                  title="Next Half (Jul-Dec)"
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                  </svg>
                </button>
              </div>
              {renderDualBarChart(attendanceData.present, attendanceData.absent, chartLabels, 'Attendance')}
            </div>
          </div>

          {/* Activities Section */}
          <div className="activities-rows11">
            <h3 className="activity-titles11">Attendance Activities</h3>
            <div className="activity-lists11">
              {attendanceActivities.map((activity, index) => (
                <div key={activity.id || index} className="activity-items11">
                  <div className={`activity-icons11 ${activity.action === 'Checked in' ? 'checkin-icons11' : 'checkout-icons11'}`}>
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
              {attendanceActivities.length === 0 && (
                <div className="no-activities">
                  <p>No recent attendance activities</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Calendar Column - Full Height */}
        <div className="hr-calendar-card11">
          <div className="hr-calendar-header11">
            <button className="hr-calendar-nav11" onClick={() => navigateMonth(-1)}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <h3 className="hr-calendar-title11">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button className="hr-calendar-nav11" onClick={() => navigateMonth(1)}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
              </svg>
            </button>
          </div>

          <div className="hr-calendar-grid11">
            <div className="hr-calendar-weekdays11">
              <div className="hr-weekday11">S</div>
              <div className="hr-weekday11">M</div>
              <div className="hr-weekday11">T</div>
              <div className="hr-weekday11">W</div>
              <div className="hr-weekday11">T</div>
              <div className="hr-weekday11">F</div>
              <div className="hr-weekday11">S</div>
            </div>

            <div className="hr-calendar-days11">
              {generateCalendarDays()}
            </div>
          </div>

          <div className="hr-upcoming-events11">
            <h4 className="hr-events-title11">TODAY'S EVENTS</h4>
            <div className="hr-events-list11">
              {calendarData.todayEvents.map((event, index) => (
                <div key={`today-${index}`} className="hr-event-item11">
                  <div className="hr-event-indicator11 hr-development11"></div>
                  <div className="hr-event-info11">
                    <div className="hr-event-name11">{event.title}</div>
                    <div className="hr-event-time11">{event.time}</div>
                  </div>
                </div>
              ))}
              {calendarData.todayEvents.length === 0 && (
                <div className="hr-event-item11">
                  <div className="hr-event-indicator11 hr-ux11"></div>
                  <div className="hr-event-info11">
                    <div className="hr-event-name11">No events today</div>
                    <div className="hr-event-time11">--</div>
                  </div>
                </div>
              )}
            </div>
            
            <h4 className="hr-events-title11" style={{ marginTop: '1rem' }}>UPCOMING EVENTS</h4>
            <div className="hr-events-list11">
              {calendarData.upcomingEvents.map((event, index) => (
                <div key={`upcoming-${index}`} className="hr-event-item11">
                  <div className="hr-event-indicator11 hr-ux11"></div>
                  <div className="hr-event-info11">
                    <div className="hr-event-name11">{event.title}</div>
                    <div className="hr-event-time11">{event.formatted_date} - {event.time}</div>
                  </div>
                </div>
              ))}
              {calendarData.upcomingEvents.length === 0 && (
                <div className="hr-event-item11">
                  <div className="hr-event-indicator11 hr-development11"></div>
                  <div className="hr-event-info11">
                    <div className="hr-event-name11">No upcoming events</div>
                    <div className="hr-event-time11">--</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHR;