import React, { useState, useEffect } from 'react';
import { getCurrentUser, getUserId } from '../../utils/auth'; // Import auth utilities like Employee dashboard
import difsyslogo from '../../assets/difsyslogo.png'
import '../../components/ApplicantLayout/DashboardApplicant.css';

const DashboardApplicant = () => {
  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'Applicant'
  });

  const [applicantStatus, setApplicantStatus] = useState('pending'); // New state for applicant status
  const [currentDate, setCurrentDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current date
    const today = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setCurrentDate(today.toLocaleDateString('en-US', options));

    // Get user data from auth utilities
    const userId = getUserId();
    const currentUser = getCurrentUser();
    
    console.log('Debug - User ID from auth:', userId); // Debug log
    console.log('Debug - Current User from auth:', currentUser); // Debug log
    
    if (userId && currentUser) {
      const userDetails = {
        firstName: currentUser.firstName || 'Guest',
        lastName: currentUser.lastName || 'User',
        email: currentUser.email || 'guest@example.com',
        role: currentUser.role || 'Applicant',
        profileImage: null
      };
      
      setUserInfo(userDetails);
      
      // Wait a bit for userInfo to be set, then fetch status
      setTimeout(() => {
        fetchApplicantStatus(userId);
      }, 100);
      
    } else {
      // Redirect to login if not authenticated
      window.location.href = '/login';
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
            document.title = "DIFSYS | DASHBOARD APPLICANT";
          }, []);

  // Add useEffect to fetch status when userInfo changes
  useEffect(() => {
    if (userInfo.firstName !== '' && userInfo.firstName !== 'Guest') {
      const userId = getUserId();
      if (userId) {
        fetchApplicantStatus(userId);
      }
    }
  }, [userInfo.email]); // Trigger when email is set

  const fetchApplicantStatus = async (userId) => {
    try {
      console.log('Debug - Fetching status for user ID:', userId); // Debug log
      
      // Try multiple approaches to find the applicant record
      // First try with the userId as app_id
      let response = await fetch(`http://localhost/difsysapi/get_applicant_status.php?app_id=${userId}`);
      let data = await response.json();
      
      console.log('Debug - API Response (by app_id):', data); // Debug log
      
      // If that doesn't work, try to find by user info (email, firstName, lastName)
      if (!data.success && userInfo.email) {
        console.log('Debug - Trying to fetch by email:', userInfo.email);
        response = await fetch(`http://localhost/difsysapi/get_applicant_status.php?email=${encodeURIComponent(userInfo.email)}`);
        data = await response.json();
        console.log('Debug - API Response (by email):', data);
      }
      
      if (data.success && data.status) {
        console.log('Debug - Setting status to:', data.status); // Debug log
        setApplicantStatus(data.status.toLowerCase());
      } else {
        console.log('Debug - API call failed or no status returned:', data); // Debug log
        
        // For debugging: If Chi Gona is logged in, set to scheduled directly
        if (userInfo.firstName === 'Chi' && userInfo.lastName === 'Gona') {
          console.log('Debug - Manually setting Chi Gona to scheduled for testing');
          setApplicantStatus('scheduled');
        }
      }
  
      // Also fetch profile image
      try {
        const profileResponse = await fetch(`http://localhost/difsysapi/profile_management.php?id=${userId}&type=user`);
        const profileData = await profileResponse.json();
        if (profileData.success && profileData.data && profileData.data.profile_image) {
          setUserInfo(prev => ({
            ...prev,
            profileImage: profileData.data.profile_image
          }));
        }
      } catch (error) {
        console.log('Could not fetch profile image:', error);
      }
    } catch (error) {
      console.error('Error fetching applicant status:', error);
      
      // For debugging: If Chi Gona is logged in, set to scheduled directly
      if (userInfo.firstName === 'Chi' && userInfo.lastName === 'Gona') {
        console.log('Debug - Error occurred, but manually setting Chi Gona to scheduled for testing');
        setApplicantStatus('scheduled');
      }
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusText = () => {
    switch(applicantStatus.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'scheduled':
        return 'Scheduled';
      case 'approved':
        return 'Approved';
      case 'declined':
        return 'Declined';
      default:
        return 'Pending';
    }
  };

  const getStatusClass = () => {
    switch(applicantStatus.toLowerCase()) {
      case 'pending':
        return 'app-dash-pending-status';
      case 'scheduled':
        return 'app-dash-scheduled-status';
      case 'approved':
        return 'app-dash-approved-status';
      case 'declined':
        return 'app-dash-declined-status';
      default:
        return 'app-dash-pending-status';
    }
  };

  if (loading) {
    return (
      <div className="app-dash-container">
        <div className="app-dash-loading">
          <div className="app-dash-loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-dash-container">
      {/* Header Section */}
      <div className="app-dash-header">
        <div className="app-dash-header-content">
          <div className="app-dash-user-info">
            <div className="app-dash-user-avatar">
                {userInfo.profileImage ? (
                  <img 
                    src={userInfo.profileImage.startsWith('http') ? userInfo.profileImage : `http://localhost/difsysapi/${userInfo.profileImage}`}
                    alt="Profile"
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span style={{ 
                  display: userInfo.profileImage ? 'none' : 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '100%', 
                  height: '100%' 
                }}>
                  {getInitials(userInfo.firstName, userInfo.lastName)}
                </span>
              </div>
            <div>
              <div className="app-dash-greeting">
                Good Afternoon, {userInfo.firstName}
              </div>
              <div className="app-dash-date">{currentDate}</div>
            </div>
          </div>
          <div className="app-dash-status-badge">
            <div className={`app-dash-status-dot ${getStatusClass()}`}></div>
            <span>{getStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="app-dash-content">
        {/* Video and Mission/Vision Section */}
        <div className="app-dash-main-section">
          <div className="app-dash-video-card">
            <div className="app-dash-video-container">
              <video 
                className="app-dash-video-player" 
                controls 
                poster="/api/placeholder/640/360"
              >
                <source src="/videos/company-intro.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
          
          <div className="app-dash-info-cards">
            <div className="app-dash-info-card app-dash-mission-card">
              <div className="app-dash-card-header">
                <h3>Mission</h3>
              </div>
              <div className="app-dash-card-content">
                <p>
                  To deliver innovative and reliable facility management solutions 
                  that enhance operational efficiency, ensure safety, and create 
                  sustainable environments for our clients and communities.
                </p>
              </div>
            </div>
            
            <div className="app-dash-info-card app-dash-vision-card">
              <div className="app-dash-card-header">
                <h3>Vision</h3>
              </div>
              <div className="app-dash-card-content">
                <p>
                  To be the leading provider of digitally intelligent facility 
                  management systems, transforming how organizations manage their 
                  spaces through cutting-edge technology and exceptional service.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information Card */}
        <div className="app-dash-company-section">
          <div className="app-dash-company-card">
            <div className="app-dash-company-header">
              <div className="app-dash-company-logo">
                <img src={difsyslogo} alt="DiFS Logo" className="app-dash-logo-image" />
              </div>
              <div className="app-dash-company-title">
                <h2>Digitally Intelligent Facility System, Inc.</h2>
                <p className="app-dash-company-tagline">
                  Empowering smart spaces through digitally intelligent systems for 
                  seamless, secure, and efficient facility management solutions.
                </p>
              </div>
            </div>
            
            <div className="app-dash-company-content">
              <div className="app-dash-company-info">
                <div className="app-dash-info-section">
                  <h4>Contact Information</h4>
                  <div className="app-dash-info-item">
                    <span className="app-dash-info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </span>
                    <div>
                      <p><strong>Address:</strong></p>
                      <p>Block 4 Lot 11, Lynville Residences</p>
                      <p>Brgy Marinig, Cabuyao, 4025 Laguna</p>
                    </div>
                  </div>
                  <div className="app-dash-info-item">
                    <span className="app-dash-info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </span>
                    <div>
                      <p><strong>Email:</strong></p>
                      <p>info@difsystem.com</p>
                    </div>
                  </div>
                  <div className="app-dash-info-item">
                    <span className="app-dash-info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </span>
                    <div>
                      <p><strong>Phone:</strong></p>
                      <p>(555) 123-4567</p>
                    </div>
                  </div>
                </div>
  
                
                <div className="app-dash-map-section">
                  <h4>Location</h4>
                  <div className="app-dash-map-container">
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d966.6476343773678!2d121.14157315204628!3d14.27708538742735!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d9c3f4c12a43%3A0x377e0582067316af!2sDigitalIy%20Intelligent%20Facility%20Systems%20Inc.!5e0!3m2!1sen!2sph!4v1747881289922!5m2!1sen!2sph" 
                      width="100%" 
                      height="100%" 
                      style={{border:0}} 
                      allowFullScreen="" 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                      title="DIFS Location"
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="app-dash-company-footer">
              <div className="app-dash-copyright">
                <p>© 2025 Digitally Intelligent Facility System, Inc. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardApplicant;