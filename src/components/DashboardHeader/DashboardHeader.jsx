import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
        return '📄';
      case 'exam_submitted':
        return '📝';
      case 'requirements_uploaded':
        return '📋';
      case 'interview_scheduled':
        return '🗓️';
      case 'application_approved':
        return '✅';
      case 'application_declined':
        return '❌';
      case 'exam_assigned':
        return '📚';
      case 'exam_graded':
        return '🎯';
      // Keep old ones for backwards compatibility
      case 'leave_request':
        return '🏖️';
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
        <h1 className="dash-header-title">Dashboard</h1>
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
                    onClick={() => markDashAsRead(notification.id)}
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
    </div>
  );
};

export default DashboardHeader;