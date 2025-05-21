import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./SideNav.css";

function SideNav({ userRole = "admin" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState(location.pathname);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    role: userRole
  });
  const dropdownRef = useRef(null);

  // Get user data from localStorage and fetch from database if needed
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get user data from localStorage
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // If we already have the name and role, use it directly
          if (parsedUser.firstName && parsedUser.lastName && parsedUser.role) {
            setUserData({
              firstName: parsedUser.firstName,
              lastName: parsedUser.lastName,
              role: parsedUser.role
            });
          } 
          // Otherwise fetch from the database using email
          else if (parsedUser.email) {
            const response = await axios.post(
              'http://sql100.infinityfree.com/difsysapi/get_user_data.php',
              { email: parsedUser.email },
              {
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (response.data.success) {
              const user = response.data.user;
              
              // Update userData state
              setUserData({
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
              });
              
              // Update the localStorage with complete user data
              const updatedUser = {
                ...parsedUser,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
              };
              
              localStorage.setItem('user', JSON.stringify(updatedUser));
              
              // Update userRole if it's being used elsewhere
              localStorage.setItem('userRole', user.role);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, []);

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
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // Get user initials for avatar
  const getUserInitials = () => {
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`;
    }
    return "U"; // Default if no name is available
  };

  // Format role text for display (capitalize first letter)
  const formatRoleText = (role) => {
    if (!role) return "";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Navigation items based on user role - using your existing code
  const getNavItems = () => {
    // Using userData.role instead of userRole prop to ensure consistency
    switch (userData.role.toLowerCase()) {
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
            path: "/setup-profile", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 10C12.21 10 14 8.21 14 6C14 3.79 12.21 2 10 2C7.79 2 6 3.79 6 6C6 8.21 7.79 10 10 10Z" fill="currentColor"/>
                <path d="M10 12C6.67 12 4 14.67 4 18H16C16 14.67 13.33 12 10 12Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Set Up Your Profile" 
          }
        ];
      
      case "hr":
        return [
          { 
            path: "/dashboard-hr", 
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
            path: "/manage-employee", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16 8C17.1 8 18 7.1 18 6C18 4.9 17.1 4 16 4C14.9 4 14 4.9 14 6C14 7.1 14.9 8 16 8ZM8 8C9.1 8 10 7.1 10 6C10 4.9 9.1 4 8 4C6.9 4 6 4.9 6 6C6 7.1 6.9 8 8 8ZM8 10C5.67 10 1 11.17 1 13.5V16H15V13.5C15 11.17 10.33 10 8 10ZM16 10C15.71 10 15.38 10.02 15.03 10.05C16.19 10.89 17 12.02 17 13.5V16H19V13.5C19 11.17 17.33 10 16 10Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Manage Employee" 
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
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17 2H14V5L12.35 3.35C11.155 2.155 9.515 1.5 7.75 1.5C4.31 1.5 1.5 4.31 1.5 7.75C1.5 11.19 4.31 14 7.75 14C9.215 14 10.565 13.505 11.645 12.645L13.06 14.06C11.565 15.25 9.74 16 7.75 16C3.2 16 0 12.645 0 7.75C0 2.855 3.2 0 7.75 0C10.085 0 12.26 0.91 13.75 2.4L14 2H17V5H20V2C20 0.9 19.1 0 18 0H3C1.9 0 1 0.9 1 2V18C1 19.1 1.9 20 3 20H18C19.1 20 20 19.1 20 18V9H17V18H3V2H17Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Performance Evaluation" 
          },
          { 
            path: "/timekeeping-tracking", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 0C4.5 0 0 4.5 0 10C0 15.5 4.5 20 10 20C15.5 20 20 15.5 20 10C20 4.5 15.5 0 10 0ZM10 18C5.59 18 2 14.41 2 10C2 5.59 5.59 2 10 2C14.41 2 18 5.59 18 10C18 14.41 14.41 18 10 18ZM10.5 5H9V11L14.2 14.2L15 12.9L10.5 10.2V5Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Time-Keeping Tracking" 
          },
          { 
            path: "/applicants-tracking", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 6C12 8.21 10.21 10 8 10C5.79 10 4 8.21 4 6C4 3.79 5.79 2 8 2C10.21 2 12 3.79 12 6ZM14 6C14 2.69 11.31 0 8 0C4.69 0 2 2.69 2 6C2 9.31 4.69 12 8 12C11.31 12 14 9.31 14 6ZM2 17V18H14V17C14 14.34 8.67 13 8 13C7.33 13 2 14.34 2 17ZM0 17C0 13.67 5.33 11 8 11C10.67 11 16 13.67 16 17V20H0V17Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Applicants Tracking" 
          },
          { 
            path: "/list-of-onboard", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 4H0V18C0 19.1 0.9 20 2 20H16V18H2V4ZM18 0H6C4.9 0 4 0.9 4 2V14C4 15.1 4.9 16 6 16H18C19.1 16 20 15.1 20 14V2C20 0.9 19.1 0 18 0ZM18 14H6V2H18V14ZM8 8H16V10H8V8ZM8 11H14V13H8V11ZM8 5H16V7H8V5Z" fill="currentColor"/>
              </svg>
            ), 
            text: "List of Onboard" 
          }
        ];
      
      case "accountant":
        return [
          { 
            path: "/dashboard-accountant", 
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
            path: "/list-of-employee", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16 8C17.1 8 18 7.1 18 6C18 4.9 17.1 4 16 4C14.9 4 14 4.9 14 6C14 7.1 14.9 8 16 8ZM8 8C9.1 8 10 7.1 10 6C10 4.9 9.1 4 8 4C6.9 4 6 4.9 6 6C6 7.1 6.9 8 8 8ZM8 10C5.67 10 1 11.17 1 13.5V16H15V13.5C15 11.17 10.33 10 8 10ZM16 10C15.71 10 15.38 10.02 15.03 10.05C16.19 10.89 17 12.02 17 13.5V16H19V13.5C19 11.17 17.33 10 16 10Z" fill="currentColor"/>
              </svg>
            ), 
            text: "List of Employee" 
          },
          { 
            path: "/generate-payroll", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M19.5 8H17.5V1.5C17.5 0.67 16.83 0 16 0H4C3.17 0 2.5 0.67 2.5 1.5V8H0.5C0.22 8 0 8.22 0 8.5V19.5C0 19.78 0.22 20 0.5 20H19.5C19.78 20 20 19.78 20 19.5V8.5C20 8.22 19.78 8 19.5 8ZM14.5 8H5.5V3H14.5V8Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Generate Payroll" 
          },
          { 
            path: "/manage-payroll", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 4H0V18C0 19.1 0.9 20 2 20H16V18H2V4ZM18 0H6C4.9 0 4 0.9 4 2V14C4 15.1 4.9 16 6 16H18C19.1 16 20 15.1 20 14V2C20 0.9 19.1 0 18 0ZM18 14H6V2H18V14ZM10 10.5C11.38 10.5 12.5 9.38 12.5 8C12.5 6.62 11.38 5.5 10 5.5C8.62 5.5 7.5 6.62 7.5 8C7.5 9.38 8.62 10.5 10 10.5ZM10 7C10.55 7 11 7.45 11 8C11 8.55 10.55 9 10 9C9.45 9 9 8.55 9 8C9 7.45 9.45 7 10 7ZM15 13.5V12.5C15 11.12 12.88 10 10 10C7.12 10 5 11.12 5 12.5V13.5H15Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Manage Payroll" 
          },
          { 
            path: "/benefits", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 0L2 3V9.09C2 14.14 5.41 18.85 10 20C14.59 18.85 18 14.14 18 9.09V3L10 0ZM10 11H16C15.47 14.11 13.31 16.78 10 17.93V11H4V4.95L10 2.68V11Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Benefits" 
          }
        ];
      
      case "employee":
        return [
          { 
            path: "/dashboard-employee", 
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
            path: "/attendance", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 0C4.03 0 0 4.03 0 9C0 13.97 4.03 18 9 18C13.97 18 18 13.97 18 9C18 4.03 13.97 0 9 0ZM9 16C5.13 16 2 12.87 2 9C2 5.13 5.13 2 9 2C12.87 2 16 5.13 16 9C16 12.87 12.87 16 9 16ZM9.5 4.5H8V10.25L12.75 13L13.5 11.75L9.5 9.5V4.5Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Attendance" 
          },
          { 
            path: "/manage-documents", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M6 2C4.9 2 4.01 2.9 4.01 4L4 16C4 17.1 4.89 18 5.99 18H14C15.1 18 16 17.1 16 16V8L10 2H6ZM13 9V3.5L14.5 5L16 6.5V16H4V4H10V9H13Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Manage myDocuments" 
          },
          { 
            path: "/my-payroll", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M19.5 8H17.5V1.5C17.5 0.67 16.83 0 16 0H4C3.17 0 2.5 0.67 2.5 1.5V8H0.5C0.22 8 0 8.22 0 8.5V19.5C0 19.78 0.22 20 0.5 20H19.5C19.78 20 20 19.78 20 19.5V8.5C20 8.22 19.78 8 19.5 8ZM14.5 8H5.5V3H14.5V8Z" fill="currentColor"/>
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
          }
        ];
        
      // For admin role (default)
      default:
        return [
          { 
            path: "/dashboard-admin", 
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
            path: "/home", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3L2 10H4V17H7V13H13V17H16V10H18L10 3Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Home" 
          },
          { 
            path: "/about", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C5.58 2 2 5.58 2 10C2 14.42 5.58 18 10 18C14.42 18 18 14.42 18 10C18 5.58 14.42 2 10 2ZM11 15H9V9H11V15ZM11 7H9V5H11V7Z" fill="currentColor"/>
              </svg>
            ), 
            text: "About" 
          },
          { 
            path: "/contact", 
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 3C2 2.45 2.45 2 3 2H17C17.55 2 18 2.45 18 3V14C18 14.55 17.55 15 17 15H6L2 19V3Z" fill="currentColor"/>
              </svg>
            ), 
            text: "Contact" 
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
      <div className={`sidenav1 ${mobileMenuOpen ? 'mobile-open1' : ''}`}>
        {/* User Profile Section - Visible on both Desktop and Mobile */}
        <div className="user-profile1">
          <div className="user-avatar1">
            <span>{getUserInitials()}</span>
          </div>
          <div className="user-info1" ref={dropdownRef}>
            <div className="user-details1">
              <span className="user-name1">{userData.firstName} {userData.lastName}</span>
              <span className="user-role1">{formatRoleText(userData.role)}</span>
            </div>
            <div className="dropdown-icon1" onClick={toggleDropdown}>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path d="M1 1L6 6L11 1" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            {/* User Dropdown Menu */}
            {dropdownOpen && (
              <div className="user-dropdown-menu1">
                <Link to="/profile" className="dropdown-item1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8C10.21 8 12 6.21 12 4C12 1.79 10.21 0 8 0C5.79 0 4 1.79 4 4C4 6.21 5.79 8 8 8Z" fill="currentColor"/>
                    <path d="M8 10C5.33 10 0 11.34 0 14V16H16V14C16 11.34 10.67 10 8 10Z" fill="currentColor"/>
                  </svg>
                  View Profile
                </Link>
                <Link to="/change-password" className="dropdown-item1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13 5H11V3.5C11 1.57 9.43 0 7.5 0C5.57 0 4 1.57 4 3.5V5H2C1.45 5 1 5.45 1 6V14C1 14.55 1.45 15 2 15H13C13.55 15 14 14.55 14 14V6C14 5.45 13.55 5 13 5ZM5.5 3.5C5.5 2.4 6.4 1.5 7.5 1.5C8.6 1.5 9.5 2.4 9.5 3.5V5H5.5V3.5Z" fill="currentColor"/>
                  </svg>
                  Change Password
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="dropdown-item1"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 15px',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12H4V4H6V2H0V14H6V12Z" fill="currentColor"/>
                    <path d="M7 5L9 5V2H16V14H9V11H7V15H18V1H7V5Z" fill="currentColor"/>
                    <path d="M10 8L7 6V7H1V9H7V10L10 8Z" fill="currentColor"/>
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items - Based on Role */}
        <div className="nav-items1">
          {navItems.map((item, index) => (
            <Link 
              key={index}
              to={item.path} 
              className={`nav-item1 secondary1 ${activeItem === item.path ? 'active1' : ''}`}
              onClick={() => handleItemClick(item.path)}
            >
              <div className="nav-icon1">
                {item.icon}
              </div>
              <span>{item.text}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default SideNav;