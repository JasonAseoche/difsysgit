import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./SideNav.css";
import difsyslogo from '../../assets/difsyslogo.png';

function SideNav({ userRole = "admin" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState(location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Get user data from localStorage and fetch from database if needed
  

  const toggleSidenav = () => {
    // Only allow minimization on screens larger than 768px
    if (window.innerWidth <= 768) {
      return; // Do nothing on mobile
    }
    
    setIsMinimized(!isMinimized);
    
    // Find all dashboard content elements and toggle the class
    const dashboardContents = document.querySelectorAll('.dashboard-contents1');
    dashboardContents.forEach(element => {
      if (!isMinimized) {
        element.classList.add('sidenav-minimized');
      } else {
        element.classList.remove('sidenav-minimized');
      }
    });
  };

  const handleItemClick = (path) => {
    setActiveItem(path);
    setMobileMenuOpen(false); // Close mobile menu when item is clicked
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Logout handler - updated to redirect to main page "/"
  const handleLogout = async (e) => {
    e.preventDefault();
    
    if (isLoggingOut) return; // Prevent multiple clicks
    
    setIsLoggingOut(true);
    
    try {
      // Get user ID if available
      const userData = localStorage.getItem('user');
      let userId = null;
      
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          if (parsedData && parsedData.id) {
            userId = parsedData.id;
          }
        } catch (err) {
          console.error('Error parsing user data:', err);
        }
      }
      
      // Make logout request to server
      await axios.post('http://localhost/difsysapi/logout.php',
        { userId },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
      
      console.log('User logged out successfully');
      
      // Clear all authentication data from localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      localStorage.removeItem('token');
      
      // Redirect to main page "/"
      navigate('/');
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if the server request fails, clear localStorage and redirect
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      localStorage.removeItem('token');
      
      // Redirect to main page "/"
      navigate('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Close dropdown when clicking outside
  

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navigation items based on user role - using your existing code
  const getNavItems = () => {
    // Using userData.role instead of userRole prop to ensure consistency
    switch (userRole.toLowerCase()) {
      case "applicant":
        return [
          { 
            path: "/dashboard-applicant", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor"/>
                <rect x="11" y="3" width="6" height="6" rx="1" fill="currentColor"/>
                <rect x="3" y="11" width="6" height="6" rx="1" fill="currentColor"/>
                <rect x="11" y="11" width="6" height="6" rx="1" fill="currentColor"/>
              </svg>
            ), 
            text: "Dashboard" 
          },
          { 
            path: "/upload-requirements", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H16C17.1 18 18 17.1 18 16V4C18 2.9 17.1 2 16 2ZM16 16H4V4H16V16ZM7 10L9 12L11 10L14 13H6L9 10L10 11L7 10Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Upload Requirements" 
          },
          { 
            path: "/take-exam", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
              </svg>
            ), 
            text: "Take Exam" 
          },
          { 
            path: "/profile", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" fill="currentColor"/>
              </svg>
                  ), 
            text: "Profile" 
          }
        ];
      
      case "hr":
        return [
          { 
            path: "/dashboard-hr", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard-icon lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            ), 
            text: "Dashboard" 
          },
          { 
            path: "/manage-employee", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users-round-icon lucide-users-round"><path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/></svg>
            ), 
            text: "Manage Employee" 
          },
          { 
            path: "/manage-department", 
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-icon lucide-building"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>

              ), 
              text: "Manage Department"
          },
          { 
            path: "/manage-events", 
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-icon lucide-building"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>

              ), 
              text: "Manage Events"
          },
          { 
            path: "/attendance-tracking", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 0C4.03 0 0 4.03 0 9C0 13.97 4.03 18 9 18C13.97 18 18 13.97 18 9C18 4.03 13.97 0 9 0ZM9 16C5.13 16 2 12.87 2 9C2 5.13 5.13 2 9 2C12.87 2 16 5.13 16 9C16 12.87 12.87 16 9 16ZM9.5 4.5H8V10.25L12.75 13L13.5 11.75L9.5 9.5V4.5Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Attendance Tracking" 
          },
          { 
            path: "/performance-evaluation", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 3H5V21H3V3ZM10 10H12V21H10V10ZM17 5H19V21H17V5Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Performance Evaluation" 
          },
          { 
            path: "/leave-management", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-fold-icon lucide-calendar-fold"><path d="M8 2v4"/><path d="M16 2v4"/><path d="M21 17V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11Z"/><path d="M3 10h18"/><path d="M15 22v-4a2 2 0 0 1 2-2h4"/></svg>
            ), 
            text: "Leave Management" 
          },
          { 
            path: "/sr-approval", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" 
                    width="24" height="24" viewBox="0 0 24 24" 
                    fill="none" stroke="currentColor" stroke-width="2" 
                    stroke-linecap="round" stroke-linejoin="round" 
                    class="lucide lucide-file-check">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <path d="m9 15 2 2 4-4"/>
                </svg>
            ), 
            text: "Service Report Approval" 
          },
          { 
            path: "/applicants-tracking", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-search-icon lucide-user-round-search"><circle cx="10" cy="8" r="5"/><path d="M2 21a8 8 0 0 1 10.434-7.62"/><circle cx="18" cy="18" r="3"/><path d="m22 22-1.9-1.9"/></svg>
            ), 
            text: "Applicants Tracking" 
          },
          { 
            path: "/manage-hiring", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-cog-icon lucide-file-cog"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m2.305 15.53.923-.382"/><path d="m3.228 12.852-.924-.383"/><path d="M4.677 21.5a2 2 0 0 0 1.313.5H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v2.5"/><path d="m4.852 11.228-.383-.923"/><path d="m4.852 16.772-.383.924"/><path d="m7.148 11.228.383-.923"/><path d="m7.53 17.696-.382-.924"/><path d="m8.772 12.852.923-.383"/><path d="m8.772 15.148.923.383"/><circle cx="6" cy="14" r="3"/></svg>
            ), 
            text: "Manage Hiring" 
          },
          { 
            path: "/manage-examination", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open-check-icon lucide-book-open-check"><path d="M12 21V7"/><path d="m16 12 2 2 4-4"/><path d="M22 6V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4 4 4 0 0 0-4-4H3a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6a1 1 0 0 0 1-1v-1.3"/></svg>
            ), 
            text: "Manage Examination" 
          },
          { 
            path: "/employee-relation", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V20L6 16H20C21.1 16 22 15.1 22 14V4C22 2.9 21.1 2 20 2ZM20 14H5.17L4 15.17V4H20V14Z" fill="currentColor"/>
              </svg>

            ), 
            text: "Employee Relation" 
          },
          { 
            path: "/profile", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" fill="currentColor"/>
              </svg>
                  ), 
            text: "Profile" 
          }
        ];
      
      case "accountant":
        return [
          { 
            path: "/dashboard-accountant", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard-icon lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            ), 
            text: "Dashboard" 
          },
          { 
            path: "/employee-attendance", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 16H5V9h14v10zm0-12H5V5h14v2zm-6.5 8.29l2.79-2.79-1.42-1.42L12.5 13.17l-1.29-1.29-1.42 1.42L12.5 17z" fill="currentColor"/>
              </svg>


            ), 
            text: "Employee Attendance" 
          },
          { 
            path: "/payroll-account", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16 8C17.1 8 18 7.1 18 6C18 4.9 17.1 4 16 4C14.9 4 14 4.9 14 6C14 7.1 14.9 8 16 8ZM8 8C9.1 8 10 7.1 10 6C10 4.9 9.1 4 8 4C6.9 4 6 4.9 6 6C6 7.1 6.9 8 8 8ZM8 10C5.67 10 1 11.17 1 13.5V16H15V13.5C15 11.17 10.33 10 8 10ZM16 10C15.71 10 15.38 10.02 15.03 10.05C16.19 10.89 17 12.02 17 13.5V16H19V13.5C19 11.17 17.33 10 16 10Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Payroll Account" 
          },
          { 
            path: "/generate-payroll", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-philippine-peso-icon lucide-philippine-peso"><path d="M20 11H4"/><path d="M20 7H4"/><path d="M7 21V4a1 1 0 0 1 1-1h4a1 1 0 0 1 0 12H7"/></svg>
            ), 
            text: "Generate Payroll" 
          },
          { 
            path: "/manage-payroll", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-icon lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>

            ), 
            text: "Manage Payroll" 
          },
          { 
            path: "/benefits", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-handshake-icon lucide-handshake"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>
            ), 
            text: "Benefits" 
          },
          { 
            path: "/profile", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" fill="currentColor"/>
              </svg>
                  ), 
            text: "Profile" 
          }
        ];
      
      case "employee":
        return [
          { 
            path: "/dashboard-employee", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard-icon lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            ), 
            text: "Dashboard" 
          },
          { 
            path: "/attendance", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 0C4.03 0 0 4.03 0 9C0 13.97 4.03 18 9 18C13.97 18 18 13.97 18 9C18 4.03 13.97 0 9 0ZM9 16C5.13 16 2 12.87 2 9C2 5.13 5.13 2 9 2C12.87 2 16 5.13 16 9C16 12.87 12.87 16 9 16ZM9.5 4.5H8V10.25L12.75 13L13.5 11.75L9.5 9.5V4.5Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Attendance" 
          },
          { 
            path: "/service-report", 
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" 
                    width="20" height="20" viewBox="0 0 24 24" 
                    fill="none" stroke="currentColor" stroke-width="2" 
                    stroke-linecap="round" stroke-linejoin="round" 
                    class="lucide lucide-file-text">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <line x1="10" y1="9" x2="8" y2="9"/>
                </svg>
            ), 
            text: "Service Report" 
          },
          { 
            path: "/manage-documents", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2"/>
                <path d="M3 7h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
            ), 
            text: "Manage Documents" 
          },
          { 
            path: "/my-payroll", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" ry="2"/>
              <circle cx="12" cy="12" r="2"/>
              <path d="M6 12h.01M18 12h.01"/>
            </svg>
            ), 
            text: "My Payroll" 
          },
          { 
            path: "/time-keeping", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 0C4.5 0 0 4.5 0 10C0 15.5 4.5 20 10 20C15.5 20 20 15.5 20 10C20 4.5 15.5 0 10 0ZM10 18C5.59 18 2 14.41 2 10C2 5.59 5.59 2 10 2C14.41 2 18 5.59 18 10C18 14.41 14.41 18 10 18ZM10.5 5H9V11L14.2 14.2L15 12.9L10.5 10.2V5Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Time-Keeping" 
          },
          { 
            path: "/file-ticket", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                  stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
            </svg>
            ), 
            text: "File A Inquiries" 
          },
          { 
            path: "/profile", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" fill="currentColor"/>
              </svg>
                  ), 
            text: "Profile" 
          }
        ];

        case "supervisor":
  return [
    { 
      path: "/dashboard-supervisor", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard-icon lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
      ), 
      text: "Dashboard" 
    },
    { 
      path: "/team-management", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M16 8C17.1 8 18 7.1 18 6C18 4.9 17.1 4 16 4C14.9 4 14 4.9 14 6C14 7.1 14.9 8 16 8ZM8 8C9.1 8 10 7.1 10 6C10 4.9 9.1 4 8 4C6.9 4 6 4.9 6 6C6 7.1 6.9 8 8 8ZM8 10C5.67 10 1 11.17 1 13.5V16H15V13.5C15 11.17 10.33 10 8 10ZM16 10C15.71 10 15.38 10.02 15.03 10.05C16.19 10.89 17 12.02 17 13.5V16H19V13.5C19 11.17 17.33 10 16 10Z" fill="currentColor"/>
        </svg>
      ), 
      text: "Team Management" 
    },
    { 
      path: "/supervisor-attendance", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M9 0C4.03 0 0 4.03 0 9C0 13.97 4.03 18 9 18C13.97 18 18 13.97 18 9C18 4.03 13.97 0 9 0ZM9 16C5.13 16 2 12.87 2 9C2 5.13 5.13 2 9 2C12.87 2 16 5.13 16 9C16 12.87 12.87 16 9 16ZM9.5 4.5H8V10.25L12.75 13L13.5 11.75L9.5 9.5V4.5Z" fill="currentColor"/>
        </svg>
      ), 
      text: "Team Attendance" 
    },
    { 
      path: "/performance-review", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 3H5V21H3V3ZM10 10H12V21H10V10ZM17 5H19V21H17V5Z" fill="currentColor"/>
        </svg>
      ), 
      text: "Performance Review" 
    },
    { 
      path: "/leave-approval", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M7 2V4H5C3.9 4 3 4.9 3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4H17V2H15V4H9V2H7ZM19 20H5V9H19V20ZM16.59 13.58L11 19.17L8.41 16.58L7 18L11 22L18 15L16.59 13.58Z" fill="currentColor"/>
        </svg>
      ), 
      text: "Leave Approval" 
    },
    { 
      path: "/overtime-approval", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg"
          width="24" height="24" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"
          class="lucide lucide-file-clock">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
        <circle cx="12" cy="15" r="5"/>
        <polyline points="12 13 12 15 14 16"/>
      </svg>
      ), 
      text: "Overtime Approval" 
    },
    { 
      path: "/team-ob", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" 
            width="20" height="20" viewBox="0 0 24 24" 
            fill="none" stroke="currentColor" stroke-width="2" 
            stroke-linecap="round" stroke-linejoin="round" 
            class="lucide lucide-file-user">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
          <circle cx="12" cy="13" r="2"/>
          <path d="M8 19c0-2 2-3 4-3s4 1 4 3"/>
        </svg>
      ), 
      text: "Team Service Report" 
    },
    { 
      path: "/profile", 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" fill="currentColor"/>
        </svg>
      ), 
      text: "Profile" 
    }
  ];
        
      // For admin role (default)
      default:
        return [
          { 
            path: "/dashboard-admin", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard-icon lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            ), 
            text: "Dashboard" 
          },
          { 
            path: "/manage-accounts", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 10C12.21 10 14 8.21 14 6C14 3.79 12.21 2 10 2C7.79 2 6 3.79 6 6C6 8.21 7.79 10 10 10Z" fill="currentColor"/>
                <path d="M10 12C6.67 12 4 14.67 4 18H16C16 14.67 13.33 12 10 12Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Manage Accounts" 
          },
          { 
            path: "/manage-fingerprint", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-fingerprint-icon lucide-fingerprint"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>
            ), 
            text: "Manage Fingerprint" 
          },
          { 
            path: "/audit-trail", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-brick-wall-shield-icon lucide-brick-wall-shield"><path d="M12 9v1.258"/><path d="M16 3v5.46"/><path d="M21 9.118V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5.75"/><path d="M22 17.5c0 2.499-1.75 3.749-3.83 4.474a.5.5 0 0 1-.335-.005c-2.085-.72-3.835-1.97-3.835-4.47V14a.5.5 0 0 1 .5-.499c1 0 2.25-.6 3.12-1.36a.6.6 0 0 1 .76-.001c.875.765 2.12 1.36 3.12 1.36a.5.5 0 0 1 .5.5z"/><path d="M3 15h7"/><path d="M3 9h12.142"/><path d="M8 15v6"/><path d="M8 3v6"/></svg>
            ), 
            text: "Audit Trail" 
          },
          { 
            path: "/test-attendance", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-cog-icon lucide-monitor-cog"><path d="M12 17v4"/><path d="m14.305 7.53.923-.382"/><path d="m15.228 4.852-.923-.383"/><path d="m16.852 3.228-.383-.924"/><path d="m16.852 8.772-.383.923"/><path d="m19.148 3.228.383-.924"/><path d="m19.53 9.696-.382-.924"/><path d="m20.772 4.852.924-.383"/><path d="m20.772 7.148.924.383"/><path d="M22 13v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="M8 21h8"/><circle cx="18" cy="6" r="3"/></svg>
            ), 
            text: "Test Attendance" 
          },
          { 
            path: "/demo-attendance", 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-cog-icon lucide-monitor-cog"><path d="M12 17v4"/><path d="m14.305 7.53.923-.382"/><path d="m15.228 4.852-.923-.383"/><path d="m16.852 3.228-.383-.924"/><path d="m16.852 8.772-.383.923"/><path d="m19.148 3.228.383-.924"/><path d="m19.53 9.696-.382-.924"/><path d="m20.772 4.852.924-.383"/><path d="m20.772 7.148.924.383"/><path d="M22 13v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="M8 21h8"/><circle cx="18" cy="6" r="3"/></svg>
            ), 
            text: "Demo Attendance" 
          },
          { 
            path: "/profile", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" fill="currentColor"/>
              </svg>
                  ), 
            text: "Profile" 
          }
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header1">
        <div className="mobile-header-content1">
          <button className="menu-toggle1" onClick={toggleMobileMenu}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && <div className="mobile-menu-overlay1" onClick={() => setMobileMenuOpen(false)}></div>}

      

      {/* Desktop Sidenav / Mobile Menu */}
      <div className={`sidenav1 ${mobileMenuOpen ? 'mobile-open1' : ''} ${isMinimized ? 'minimized' : ''}`} onClick={window.innerWidth > 768 ? toggleSidenav : undefined}>
        {/* Navigation Items - Based on Role */}
          {/* Logo container */}
          <div className="logo-container1">
            <img src={difsyslogo} alt="DIFSYS Logo" />
            {!isMinimized && (
              <div className="logo-text1">
                <span className="logo-title1">Digitally Intelligent Facility</span>
                <span className="logo-subtitle1">System Inc.</span>
              </div>
            )}
          </div>
        <div className="nav-items1">
          {navItems.map((item, index) => (
            <Link 
            key={index}
            to={item.path} 
            className={`nav-item1 secondary1 ${activeItem === item.path ? 'active1' : ''}`}
            onClick={(e) => {
              e.stopPropagation(); // Prevent sidenav toggle when clicking nav items
              handleItemClick(item.path);
            }}
          >
            <div className="nav-icon1">
              {item.icon}
            </div>
            {!isMinimized && <span>{item.text}</span>}
          </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default SideNav;