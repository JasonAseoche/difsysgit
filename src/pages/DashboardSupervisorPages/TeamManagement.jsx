import React, { useState, useEffect, useRef } from 'react';
import { useNavigate} from 'react-router-dom';
import axios from 'axios';
import { getUserId, isAuthenticated } from '../../utils/auth'; // Import auth utilities
import '../../components/SupervisorLayout/TeamManagement.css';

const TeamManagement = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loadedCards, setLoadedCards] = useState(0);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [supervisorInfo, setSupervisorInfo] = useState(null);
  
  // Profile view states
  const [showProfileView, setShowProfileView] = useState(false);
  const [profileEmployee, setProfileEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('Personal Information');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const navigate = useNavigate();

  const tabs = [
    'Personal Information',
  ];

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true);
        
        // Check authentication first
        if (!isAuthenticated()) {
          navigate('/login');
          return;
        }
        
        // Get supervisor ID using the auth utility
        const supervisorId = getUserId();
        
        console.log('Using supervisor ID from auth:', supervisorId); // Debug log
        
        if (!supervisorId) {
          setError('Supervisor ID not found. Please log in again.');
          return;
        }

        console.log('Fetching team for supervisor ID:', supervisorId); // Debug log

        const response = await axios.get(`http://localhost/difsysapi/fetch_team.php?supervisor_id=${supervisorId}`);
        
        console.log('API Response:', response.data); // Debug log
        
        if (response.data.success) {
          setTeamMembers(response.data.team_members);
          setSupervisorInfo(response.data.supervisor_info);
          setLoadedCards(0);
        } else {
          setError('Failed to fetch team members: ' + (response.data.error || response.data.message));
        }
      } catch (err) {
        console.error('Full error object:', err);
        console.error('Error response:', err.response?.data);
        
        if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError('Error connecting to the server: ' + err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [navigate]);

  // Fetch detailed employee profile
  const fetchEmployeeProfile = async (employeeId) => {
    try {
      setProfileLoading(true);
      setProfileError(null);
      
      // Use the emp_id for fetching detailed profile from fetch_employee.php
      const response = await axios.get(`http://localhost/difsysapi/fetch_employee.php?id=${employeeId}`);
      
      if (response.data.success) {
        setProfileEmployee(response.data.employee);
      } else {
        setProfileError('Failed to fetch employee profile: ' + response.data.message);
      }
    } catch (err) {
      console.error('Error fetching employee profile:', err);
      setProfileError('Error loading employee profile: ' + err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Animate cards appearing one by one
  useEffect(() => {
    if (!loading && teamMembers.length > 0 && loadedCards < teamMembers.length) {
      const timer = setTimeout(() => {
        setLoadedCards(prev => Math.min(prev + 1, teamMembers.length));
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading, loadedCards, teamMembers.length]);

  useEffect(() => {
      document.title = "DIFSYS | TEAM MANAGEMENT";
    }, []);

  // Filter team members based on search term
  const filteredTeamMembers = teamMembers.filter(member => {
    const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
    const email = (member.email || '').toLowerCase();
    const position = (member.position || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    
    return fullName.includes(query) || email.includes(query) || position.includes(query);
  });

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setLoadedCards(0);
  };

  const handleViewDetails = (employeeId) => {
    console.log(`View details for employee ID: ${employeeId}`);
    setShowProfileView(true);
    setActiveTab('Personal Information');
    fetchEmployeeProfile(employeeId);
    
    const employeeToView = teamMembers.find(emp => emp.emp_id === employeeId);
    setViewingEmployee(employeeToView || null);
    
    // Store the current employee being viewed
    if (employeeToView) {
      setProfileEmployee(employeeToView); // Make sure this is set immediately
    }
    
    setTimeout(() => {
      setViewingEmployee(null);
    }, 3000);
  };

  const handleChangeShift = (employeeId) => {
    console.log(`Change shift for employee ID: ${employeeId}`);
    // You can implement shift change functionality here
    alert(`Change shift functionality for employee ${employeeId} - To be implemented`);
  };

  const handleViewEmployee = () => {
    // Get the current employee being viewed from profileEmployee state
    if (profileEmployee && profileEmployee.id) {
      navigate(`/employee-personal?user_id=${profileEmployee.id}`);
    } else {
      // Fallback to the viewing employee if profileEmployee is not set
      const employeeId = viewingEmployee?.emp_id || profileEmployee?.emp_id;
      if (employeeId) {
        navigate(`/employee-personal?user_id=${employeeId}`);
      } else {
        console.error('No employee ID available for navigation');
        navigate('/employee-personal'); // Navigate without ID as fallback
      }
    }
  };

  const handleCloseProfileView = () => {
    setShowProfileView(false);
    setProfileEmployee(null);
    setActiveTab('Personal Information');
    setProfileError(null);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Get initials for avatar
  const getInitials = (firstName, lastName) => {
    return (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');
  };

  // Function to generate a random color based on name
  const getAvatarColor = (firstName, lastName) => {
    const colors = [
      '#0D6275', '#1D4ED8', '#7E22CE', '#BE185D', '#0F766E', 
      '#047857', '#B45309', '#B91C1C', '#4F46E5', '#065F46'
    ];
    
    const fullName = `${firstName}${lastName}`;
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const renderViewAvatar = (person, isEmployee = false) => {
    const initials = getInitials(person.firstName, person.lastName);
    const avatarColor = getAvatarColor(person.firstName, person.lastName);
    
    return (
      <div className="tm-profile-picture" style={{ backgroundColor: person.profileImage ? 'transparent' : avatarColor }}>
        {person.profileImage ? (
          <img 
            src={person.profileImage.startsWith('http') ? person.profileImage : `http://localhost/difsysapi/${person.profileImage}`} 
            alt={`${person.firstName} ${person.lastName}`}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              // Show the initials span when image fails to load
              const initialsSpan = e.target.parentNode.querySelector('span');
              if (initialsSpan) {
                initialsSpan.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <span style={{ 
          display: person.profileImage ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: '60px',
          fontWeight: 'bold',
          color: 'white'
        }}>
          {initials}
        </span>
      </div>
    );
  };

  // Function to render avatar with profile image or initials
  const renderAvatar = (person, isEmployee = false) => {
    const initials = getInitials(person.firstName, person.lastName);
    const avatarColor = getAvatarColor(person.firstName, person.lastName);
    
    return (
      <div className="tm-avatar" style={{ backgroundColor: person.profileImage ? 'transparent' : avatarColor }}>
        {person.profileImage ? (
          <img 
            src={person.profileImage.startsWith('http') ? person.profileImage : `http://localhost/difsysapi/${person.profileImage}`} 
            alt={`${person.firstName} ${person.lastName}`}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
        ) : null}
        <span style={{ display: person.profileImage ? 'none' : 'block' }}>
          {initials}
        </span>
      </div>
    );
  };

  // Format work days and status for display
  const formatWorkDays = (workDays) => {
    return workDays || 'Monday-Friday';
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'active':
        return 'Working today';
      case 'inactive':
        return 'Not working';
      case 'on_leave':
        return 'On leave';
      default:
        return 'Working today';
    }
  };

  // Render profile content based on active tab
  const renderProfileContent = () => {
    if (profileLoading) {
      return (
        <div className="tm-profile-loading">
          <div className="tm-loading-spinner"></div>
          <p>Loading profile details...</p>
        </div>
      );
    }

    if (profileError) {
      return (
        <div className="tm-profile-error">
          <p>{profileError}</p>
        </div>
      );
    }

    if (!profileEmployee) {
      return (
        <div className="tm-profile-no-data">
          <p>No profile data available</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'Personal Information':
        return (
          <div className="tm-profile-content-section">
            <div className="tm-profile-info-grid">
              <div className="tm-profile-info-item">
                <label>Full Name:</label>
                <span>{profileEmployee.firstName} {profileEmployee.middleName ? profileEmployee.middleName + ' ' : ''}{profileEmployee.lastName}</span>
              </div>
              <div className="tm-profile-info-item">
                <label>Email:</label>
                <span>{profileEmployee.email}</span>
              </div>
              <div className="tm-profile-info-item">
                <label>Contact Number:</label>
                <span>{profileEmployee.contactNumber || 'Not provided'}</span>
              </div>
              <div className="tm-profile-info-item">
                <label>Date of Birth:</label>
                <span>{profileEmployee.dateOfBirth || 'Not provided'}</span>
              </div>
              <div className="tm-profile-info-item">
                <label>Address:</label>
                <span>{profileEmployee.address || 'Not provided'}</span>
              </div>
              <div className="tm-profile-info-item">
                <label>Civil Status:</label>
                <span>{profileEmployee.civilStatus || 'Not provided'}</span>
              </div>
              <div className="tm-profile-info-item">
                <label>Gender:</label>
                <span>{profileEmployee.gender || 'Not provided'}</span>
              </div>
              <div className="tm-profile-info-item">
                <label>Citizenship:</label>
                <span>{profileEmployee.citizenship || 'Not provided'}</span>
              </div>
              <div className="tm-profile-info-item">
                <label>Height:</label>
                <span>{profileEmployee.height || 'Not provided'}</span>
              </div>
              <div className="tm-profile-info-item">
                <label>Weight:</label>
                <span>{profileEmployee.weight || 'Not provided'}</span>
              </div>
              <div className="tm-profile-info-item">
                <label>Work Arrangement:</label>
                <span>{profileEmployee.workarrangement || 'Not specified'}</span>
              </div>
              <div className="tm-profile-info-item">
                <label>Work Schedule:</label>
                <span>{profileEmployee.workDays || 'Monday-Friday'}</span>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="tm-page">
      {/* Profile View Modal */}
      {showProfileView && (
        <div className="tm-profile-overlay">
          <div className="tm-profile-modal">
            {/* Close Button */}
            <button className="tm-profile-view" onClick={handleViewEmployee}>
                View Details
            </button>
            <button className="tm-profile-close" onClick={handleCloseProfileView}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="red">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Cover Photo Section */}
            <div className="tm-profile-cover">
              <div className="tm-profile-cover-image">
                {/* Default gradient background as cover */}
              </div>
            </div>

          {/* Profile Info Section */}
          <div className="tm-profile-info-section">
            <div className='tm-profile-picture-in-info'>
              <div className="tm-profile-picture-container">
                <div className="tm-profile-picture">
                  {profileEmployee && renderViewAvatar(profileEmployee, true)}
                </div>
              </div>
            </div>
            <div className="tm-profile-text-info">
              <div className="tm-profile-name">
                {profileEmployee ? `${profileEmployee.firstName} ${profileEmployee.lastName}` : 'Loading...'}
              </div>
              <div className="tm-profile-position">
                {profileEmployee ? profileEmployee.position : 'Loading position...'}
              </div>
            </div>
          </div>

            {/* Tabs Section */}
            <div className="tm-profile-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`tm-profile-tab ${activeTab === tab ? 'tm-profile-tab-active' : ''}`}
                  onClick={() => handleTabChange(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content Section */}
            <div className="tm-profile-content">
              {renderProfileContent()}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Header */}
      <div className="tm-header-container">
        <div className="tm-header-content">
          <div className="tm-title-section">
            <h1 className="tm-title">TEAM MANAGEMENT</h1>
            {supervisorInfo && (
              <div className="tm-supervisor-info">
                <p className="tm-department-name">{supervisorInfo.department_name}</p>
                <p className="tm-team-count">{teamMembers.length} Team Member{teamMembers.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
          <div className="tm-actions">
            <div className={`tm-search-box ${isSearchFocused ? 'tm-search-focused' : ''}`}>
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              <button className="tm-search-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="tm-content">
        {loading ? (
          <div className="tm-loading">
            <div className="tm-loading-spinner"></div>
            <p>Loading team members...</p>
          </div>
        ) : error ? (
          <div className="tm-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="tm-error-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        ) : filteredTeamMembers.length === 0 ? (
          <div className="tm-no-results">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="tm-no-results-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-6-6 6 6 0 006 6v1z" />
            </svg>
            <p>No team members found</p>
          </div>
        ) : (
          <div className="tm-team-grid">
            {filteredTeamMembers.slice(0, loadedCards).map((member, index) => {
              const avatarColor = getAvatarColor(member.firstName, member.lastName);
              const isViewing = viewingEmployee && viewingEmployee.emp_id === member.emp_id;
              
              return (
                <div 
                  key={member.emp_id || index} 
                  className={`tm-team-card tm-card-appear ${isViewing ? 'tm-card-viewing' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="tm-card-header">
                    {renderAvatar(member, true)}
                    <div className="tm-team-info">
                      <h3 className="tm-team-name">{member.firstName} {member.lastName}</h3>
                      <p className="tm-team-role">{member.position || 'Team Member'}</p>
                      <p className="tm-team-email">{member.email}</p>
                      <div className="tm-schedule">
                        <p className="tm-time">8:00am to 5:00pm</p>
                        <div className="tm-schedule-pills">
                          <span className="tm-day-pill">{formatWorkDays(member.work_days)}</span>
                          <span className="tm-status-pill">{formatStatus(member.status)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="tm-card-actions">
                    <button 
                      className="tm-action-button tm-view-button"
                      onClick={() => handleViewDetails(member.emp_id)}
                    >
                      <span className="tm-button-text">View Details</span>
                      <span className="tm-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </span>
                    </button>
                    <button 
                      className="tm-action-button tm-shift-button"
                      onClick={() => handleChangeShift(member.emp_id)}
                    >
                      <span className="tm-button-text">Change Shift</span>
                      <span className="tm-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;