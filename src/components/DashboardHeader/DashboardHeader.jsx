import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoDocumentAttachOutline } from "react-icons/io5";
import { LuMessageSquareQuote } from "react-icons/lu";
import axios from 'axios';
import '../../components/DashboardHeader/DashboardHeader.css';

const DashboardHeader = () => {
  const navigate = useNavigate();
  const [dashUserData, setDashUserData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    profileImage: null
  });
  const [dashNotificationsOpen, setDashNotificationsOpen] = useState(false);
  const [dashSettingsOpen, setDashSettingsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [dashNotifications, setDashNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const dashNotificationsRef = useRef(null);
  const dashSettingsRef = useRef(null);

  const fetchNotificationCount = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const response = await fetch(`http://localhost/difsysapi/notifications_api.php?user_id=${user.id}&user_role=${user.role}&unread_only=true`);
        const data = await response.json();
        if (data.success) {
          setNotificationCount(data.unread_count);
        }
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const fetchDashNotifications = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const response = await fetch(`http://localhost/difsysapi/notifications_api.php?user_id=${user.id}&user_role=${user.role}&limit=5`);
        const data = await response.json();
        if (data.success) {
          setDashNotifications(data.notifications);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotificationCount();
    fetchDashNotifications(); // Add this line
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotificationCount();
      fetchDashNotifications(); // Add this line
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get user data from localStorage and fetch from database if needed
  useEffect(() => {
    const fetchDashUserData = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          if (parsedUser.firstName && parsedUser.lastName && parsedUser.role) {
            const userDataToSet = {
              firstName: parsedUser.firstName,
              lastName: parsedUser.lastName,
              role: parsedUser.role,
              profileImage: null
            };
            
            setDashUserData(userDataToSet);
            
            if (parsedUser.id) {
              try {
                const profileResponse = await fetch(`http://localhost/difsysapi/profile_management.php?id=${parsedUser.id}&type=user`);
                const profileData = await profileResponse.json();
                
                if (profileData.success && profileData.data && profileData.data.profile_image) {
                  setDashUserData(prev => ({
                    ...prev,
                    profileImage: profileData.data.profile_image
                  }));
                }
              } catch (error) {
                console.log('Could not fetch profile image:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchDashUserData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleDashClickOutside = (event) => {
      if (dashNotificationsRef.current && !dashNotificationsRef.current.contains(event.target)) {
        setDashNotificationsOpen(false);
      }
      if (dashSettingsRef.current && !dashSettingsRef.current.contains(event.target)) {
        setDashSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDashClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleDashClickOutside);
    };
  }, []);

  const openNotificationModal = (notification) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);
    setDashNotificationsOpen(false);
    
    // Mark as read when opening modal
    if (!notification.is_read) {
      markDashAsRead(notification.id);
    }
  };
  
  const closeNotificationModal = () => {
    setShowNotificationModal(false);
    setSelectedNotification(null);
  };

  const toggleDashNotifications = () => {
    setDashNotificationsOpen(!dashNotificationsOpen);
    setDashSettingsOpen(false);
  };

  const toggleDashSettings = () => {
    setDashSettingsOpen(!dashSettingsOpen);
    setDashNotificationsOpen(false);
  };

  const getDashUserInitials = () => {
    if (dashUserData.firstName && dashUserData.lastName) {
      return `${dashUserData.firstName.charAt(0)}${dashUserData.lastName.charAt(0)}`;
    }
    return "U";
  };

  const formatDashRoleText = (role) => {
    if (!role) return "";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getDashNotificationIcon = (type) => {
    switch (type) {
      case 'resume_uploaded':
        return <svg xmlns="http://www.w3.org/2000/svg" height="35px" viewBox="0 0 24 24" width="30px" fill="#003979"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>;
      case 'exam_submitted':
        return <svg xmlns="http://www.w3.org/2000/svg" height="35px" viewBox="0 0 24 24" width="30px" fill="#003979"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18 9l-1.41-1.42L10 14.17l-2.59-2.58L6 13l4 4zm1-6h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-.14 0-.27.01-.4.04-.39.08-.74.28-1.01.55-.18.18-.33.4-.43.64-.1.23-.16.49-.16.77v14c0 .27.06.54.16.78s.25.45.43.64c.27.27.62.47 1.01.55.13.02.26.03.4.03h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7-.25c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zM19 19H5V5h14v14z"/></svg>;
      case 'requirements_uploaded':
        return <svg xmlns="http://www.w3.org/2000/svg" height="35px" viewBox="0 0 24 24" width="30px" fill="#003979"><g><path d="M0,0h24v24H0V0z" fill="none"/></g><g><g><path d="M15,3H5C3.9,3,3.01,3.9,3.01,5L3,19c0,1.1,0.89,2,1.99,2H19c1.1,0,2-0.9,2-2V9L15,3z M5,19V5h9v5h5v9H5z M9,8 c0,0.55-0.45,1-1,1S7,8.55,7,8s0.45-1,1-1S9,7.45,9,8z M9,12c0,0.55-0.45,1-1,1s-1-0.45-1-1s0.45-1,1-1S9,11.45,9,12z M9,16 c0,0.55-0.45,1-1,1s-1-0.45-1-1s0.45-1,1-1S9,15.45,9,16z"/></g></g></svg>;
      case 'interview_scheduled':
        return <svg xmlns="http://www.w3.org/2000/svg" height="35px" viewBox="0 0 24 24" width="30px" fill="#003979"><g><rect fill="none" height="24" width="24"/></g><g><path d="M17.6,10.81L16.19,9.4l3.56-3.55l1.41,1.41C21.05,7.29,17.6,10.81,17.6,10.81z M13,3h-2v5h2V3z M6.4,10.81L7.81,9.4 L4.26,5.84L2.84,7.26C2.95,7.29,6.4,10.81,6.4,10.81z M20,14h-3.42c-0.77,1.76-2.54,3-4.58,3s-3.81-1.24-4.58-3H4v5h16V14 M20,12 c1.1,0,2,0.9,2,2v5c0,1.1-0.9,2-2,2H4c-1.1,0-2-0.9-2-2v-5c0-1.1,0.9-2,2-2h5c0,1.66,1.34,3,3,3s3-1.34,3-3H20z"/></g></svg>;
      case 'application_approved':
        return <svg xmlns="http://www.w3.org/2000/svg" height="35px" viewBox="0 0 24 24" width="30px" fill="#003979"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19.77 4.93l1.4 1.4L8.43 19.07l-5.6-5.6 1.4-1.4 4.2 4.2L19.77 4.93m0-2.83L8.43 13.44l-4.2-4.2L0 13.47l8.43 8.43L24 6.33 19.77 2.1z"/></svg>;
      case 'application_declined':
        return <svg xmlns="http://www.w3.org/2000/svg" height="35px" viewBox="0 0 24 24" width="30px" fill="#003979"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14.59 8L12 10.59 9.41 8 8 9.41 10.59 12 8 14.59 9.41 16 12 13.41 14.59 16 16 14.59 13.41 12 16 9.41 14.59 8zM12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>;
      case 'exam_assigned':
        return <svg xmlns="http://www.w3.org/2000/svg" height="35px" viewBox="0 0 24 24" width="30px" fill="#003979"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7 15h7v2H7zm0-4h10v2H7zm0-4h10v2H7zm12-4h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-.14 0-.27.01-.4.04-.39.08-.74.28-1.01.55-.18.18-.33.4-.43.64-.1.23-.16.49-.16.77v14c0 .27.06.54.16.78s.25.45.43.64c.27.27.62.47 1.01.55.13.02.26.03.4.03h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7-.25c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zM19 19H5V5h14v14z"/></svg>;
      case 'exam_graded':
        return <svg xmlns="http://www.w3.org/2000/svg" height="35px" viewBox="0 0 24 24" width="30px" fill="#003979"><g><rect fill="none" height="24" width="24"/></g><g><path d="M4,7h16v2H4V7z M4,13h16v-2H4V13z M4,17h7v-2H4V17z M4,21h7v-2H4V21z M15.41,18.17L14,16.75l-1.41,1.41L15.41,21L20,16.42 L18.58,15L15.41,18.17z M4,3v2h16V3H4z"/></g></svg>;
      // Keep old ones for backwards compatibility
      case 'Leave Request':
        return <svg xmlns="http://www.w3.org/2000/svg" height="35px" viewBox="0 0 24 24" width="30px" fill="#003979"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zM5 7V5h14v2H5zm2 4h10v2H7zm0 4h7v2H7z"/></svg>;
      case 'manage_document':
       return <IoDocumentAttachOutline color="#003979"  size={32} />
      case 'file-inquiries':
       return  <LuMessageSquareQuote color="#003979"  size={32}/>
      case 'payslip_release':
       return <svg xmlns="http://www.w3.org/2000/svg" height="35px" viewBox="0 0 24 24" width="30px" fill="#003979"><path d="M0 0h24v24H0z" fill="none"/><path d="M21 8V7l-3 2-2-1-3 2-2-1-3 2-2-1-3 2v9h18V8zm-9 10H6v-2h6v2zm6-4H6v-2h12v2zm0-4H6V8h12v2zM3 4h18v2H3z"/></svg>;
      case 'new_employee':
        return '👋';
      case 'document_update':
        return '📄';
      case 'performance_review':
        return '📊';
      case 'attendance_alert':
        return '⏰';
      default:
        return '📢';
    }
  };

  const unreadCount = dashNotifications.filter(notif => !notif.is_read).length;

  const markDashAsRead = async (id) => {
    try {
      await fetch('http://localhost/difsysapi/notifications_api.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: id })
      });
      
      setDashNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      );
      
      // Update the notification count
      fetchNotificationCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markDashAllAsRead = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        await fetch('http://localhost/difsysapi/notifications_api.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            user_id: user.id, 
            user_role: user.role 
          })
        });
        
        setDashNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        
        // Update the notification count
        fetchNotificationCount();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Logout handler
  const handleDashLogout = async (e) => {
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

  return (
    <div className="dash-header-container">
      <div className="dash-header-left">
      <h1 className="dash-header-title">
          <span className="dash-header-title-full">Digitally Intelligent Facility Systems, Inc.</span>
          <span className="dash-header-title-short">DIFSYS, INC.</span>
        </h1>
      </div>
      
      <div className="dash-header-right">
        {/* Notifications */}
        <div className="dash-header-item" ref={dashNotificationsRef}>
          <button 
            className="dash-header-btn dash-notification-btn" 
            onClick={toggleDashNotifications}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {notificationCount > 0 && (
                <span className="dash-notification-badge">{notificationCount}</span>
              )}
          </button>
          
          {dashNotificationsOpen && (
            <div className="dash-dropdown dash-notifications-dropdown">
              <div className="dash-dropdown-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className="dash-mark-all-read-btn" onClick={markDashAllAsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="dash-notifications-list">
              {dashNotifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`dash-notification-item ${!notification.is_read ? 'dash-unread' : ''}`}
                    onClick={() => openNotificationModal(notification)}
                  >
                    <div className="dash-notification-icon">
                      {getDashNotificationIcon(notification.type)}
                    </div>
                    <div className="dash-notification-content">
                      <h4 className="dash-notification-title">{notification.title}</h4>
                      <p className="dash-notification-message">{notification.message}</p>
                      <span className="dash-notification-time">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>
                    {!notification.is_read && <div className="dash-unread-dot"></div>}
                  </div>
                ))}
              </div>
              <div className="dash-dropdown-footer">
              <button 
                  className="dash-view-all-notifications-btn"
                  onClick={() => navigate('/notifications')}
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="dash-header-item" ref={dashSettingsRef}>
          <button 
            className="dash-header-btn dash-settings-btn" 
            onClick={toggleDashSettings}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          
          {dashSettingsOpen && (
            <div className="dash-dropdown dash-settings-dropdown">
              <a href="/change-password" className="dash-dropdown-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13 5H11V3.5C11 1.57 9.43 0 7.5 0C5.57 0 4 1.57 4 3.5V5H2C1.45 5 1 5.45 1 6V14C1 14.55 1.45 15 2 15H13C13.55 15 14 14.55 14 14V6C14 5.45 13.55 5 13 5ZM5.5 3.5C5.5 2.4 6.4 1.5 7.5 1.5C8.6 1.5 9.5 2.4 9.5 3.5V5H5.5V3.5Z" fill="currentColor"/>
                </svg>
                Change Password
              </a>
              <button 
                onClick={handleDashLogout} 
                className="dash-dropdown-item"
                disabled={isLoggingOut}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  width: '100%',
                  textAlign: 'left',
                  opacity: isLoggingOut ? 0.6 : 1
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12H4V4H6V2H0V14H6V12Z" fill="currentColor"/>
                  <path d="M7 5L9 5V2H16V14H9V11H7V15H18V1H7V5Z" fill="currentColor"/>
                  <path d="M10 8L7 6V7H1V9H7V10L10 8Z" fill="currentColor"/>
                </svg>
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="dash-user-profile">
          <div className="dash-user-avatar">
            {dashUserData.profileImage ? (
              <img 
                src={dashUserData.profileImage.startsWith('http') ? dashUserData.profileImage : `http://localhost/difsysapi/${dashUserData.profileImage}`} 
                alt="Profile" 
                className="dash-profile-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <span className="dash-profile-initials" style={{ display: dashUserData.profileImage ? 'none' : 'flex' }}>
              {getDashUserInitials()}
            </span>
          </div>
          <div className="dash-user-info">
            <span className="dash-user-name">{dashUserData.firstName} {dashUserData.lastName}</span>
            <span className="dash-user-role">{formatDashRoleText(dashUserData.role)}</span>
          </div>
        </div>
      </div>


      {showNotificationModal && selectedNotification && (
        <div className="dash-notification-modal-overlay" onClick={closeNotificationModal}>
          <div className="dash-notification-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dash-modal-close-btn" onClick={closeNotificationModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            
            <div className="dash-modal-header">
              <div className="dash-modal-icon">
                {getDashNotificationIcon(selectedNotification.type)}
              </div>
              <h2 className="dash-modal-title">{selectedNotification.title}</h2>
              <span className={`notification-type-badge ${selectedNotification.type}`}>
                {selectedNotification.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            
            <div className="dash-modal-body">
              <p className="dash-modal-message">{selectedNotification.message}</p>
              
              <div className="dash-modal-meta">
                <div className="dash-modal-meta-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>{new Date(selectedNotification.created_at).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                
                <div className="dash-modal-meta-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{selectedNotification.is_read ? 'Read' : 'Unread'}</span>
                </div>
              </div>
            </div>
            
            <div className="dash-modal-footer">
              <button className="dash-modal-close-footer-btn" onClick={closeNotificationModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;