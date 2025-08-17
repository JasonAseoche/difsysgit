import React, { useState, useEffect, useRef } from 'react';
import { useNavigate} from 'react-router-dom';
import axios from 'axios';
import '../../components/HRLayout/ManageEmployee.css';

const ManageEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingVisible, setIsAddingVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loadedCards, setLoadedCards] = useState(0);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  // Profile view states
  const [showProfileView, setShowProfileView] = useState(false);
  const [profileEmployee, setProfileEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('Personal Information');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const navigate = useNavigate();
  
  // Applicant selection states
  const [showApplicantOverlay, setShowApplicantOverlay] = useState(false);
  const [selectedApplicants, setSelectedApplicants] = useState([]);
  const [applicantLoading, setApplicantLoading] = useState(false);
  const [applicantError, setApplicantError] = useState(null);
  const [isSubmittingApplicants, setIsSubmittingApplicants] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedWorkArrangement, setSelectedWorkArrangement] = useState('');
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);

  const positionOptions = [
    'Software Developer',
    'Project Manager',
    'UI/UX Designer',
    'Data Analyst',
    'HR Specialist',
    'Marketing Coordinator',
    'Sales Representative',
    'Quality Assurance',
    'System Administrator',
    'Business Analyst'
  ];
  
  const workArrangementOptions = [
    'On-Site',
    'Work From Home'
  ];

  const tabs = [
    'Personal Information',
  ];
  
  // Create a ref to track dropdown containers
  const dropdownRefs = useRef({});

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost/difsysapi/fetch_employee.php');
        
        if (response.data.success) {
          setEmployees(response.data.employees);
          setLoadedCards(0);
        } else {
          setError('Failed to fetch employees: ' + response.data.message);
        }
      } catch (err) {
        setError('Error connecting to the server: ' + err.message);
        console.error('Error fetching employees:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const fetchApplicants = async () => {
    try {
      setApplicantLoading(true);
      setApplicantError(null);
      
      const response = await axios.get('http://localhost/difsysapi/fetch_applicants.php');
      
      console.log('API Response:', response.data);
      
      if (!response.data) {
        throw new Error('No response data received from server');
      }
      
      if (response.data.success === true) {
        const applicantsData = Array.isArray(response.data.applicants) 
          ? response.data.applicants 
          : [];
        
        setApplicants(applicantsData);
        setApplicantError(null);
        
        console.log('Applicants loaded:', applicantsData.length);
      } else {
        const errorMessage = response.data.message || 'Unknown error occurred';
        setApplicantError('Failed to fetch applicants: ' + errorMessage);
        setApplicants([]);
      }
    } catch (err) {
      console.error('Error fetching applicants:', err);
      
      if (err.response) {
        const serverMessage = err.response.data?.message || err.response.statusText || 'Server error';
        setApplicantError(`Server error (${err.response.status}): ${serverMessage}`);
      } else if (err.request) {
        setApplicantError('Unable to connect to server. Please check your connection.');
      } else {
        setApplicantError('Error: ' + (err.message || 'Unknown error occurred'));
      }
      
      setApplicants([]);
    } finally {
      setApplicantLoading(false);
    }
  };

  // Fetch detailed employee profile
  const fetchEmployeeProfile = async (employeeId) => {
    try {
      setProfileLoading(true);
      setProfileError(null);
      
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

  // Add effect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdownId !== null) {
        const currentDropdownRef = dropdownRefs.current[openDropdownId];
        if (currentDropdownRef && !currentDropdownRef.contains(event.target)) {
          setOpenDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  // Animate cards appearing one by one
  useEffect(() => {
    if (!loading && employees.length > 0 && loadedCards < employees.length) {
      const timer = setTimeout(() => {
        setLoadedCards(prev => Math.min(prev + 1, employees.length));
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading, loadedCards, employees.length]);

  useEffect(() => {
      document.title = "DIFSYS | MANAGE EMPLOYEE";
    }, []);

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee => {
    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase();
    const email = (employee.email || '').toLowerCase();
    const position = (employee.position || '').toLowerCase();
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
    
    const employeeToView = employees.find(emp => emp.id === employeeId);
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
  };

  const toggleDropdown = (employeeId, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    console.log(`Toggling dropdown for employee ID: ${employeeId}`);
    
    if (openDropdownId !== null && openDropdownId !== employeeId) {
      setOpenDropdownId(null);
      setTimeout(() => {
        setOpenDropdownId(employeeId);
      }, 10);
    } else {
      setOpenDropdownId(current => current === employeeId ? null : employeeId);
    }
  };

  const handleEdit = (employeeId, event) => {
    if (event) {
      event.stopPropagation();
    }
    console.log(`Edit employee ID: ${employeeId}`);
    setOpenDropdownId(null);
  };

  const handleArchive = (employeeId, event) => {
    if (event) {
      event.stopPropagation();
    }
    console.log(`Archive employee ID: ${employeeId}`);
    setOpenDropdownId(null);
  };

  const handleAddButtonClick = () => {
    setIsAddingVisible(true);
    setShowApplicantOverlay(true);
    fetchApplicants();
    setTimeout(() => {
      setIsAddingVisible(false);
    }, 2000);
  };

  const handleApplicantSelect = (applicantId) => {
    setSelectedApplicants(prev => {
      if (prev.includes(applicantId)) {
        return prev.filter(id => id !== applicantId);
      } else {
        return [...prev, applicantId];
      }
    });
  };

  const handleAddSelectedEmployees = async () => {
    if (selectedApplicants.length === 0) {
      setApplicantError('Please select at least one applicant to add as employee.');
      return;
    }
  
    if (!selectedPosition) {
      setApplicantError('Please select a position for the new employees.');
      return;
    }
  
    if (!selectedWorkArrangement) {
      setApplicantError('Please select a work arrangement for the new employees.');
      return;
    }
  
    setIsSubmittingApplicants(true);
    
    try {
      console.log('Sending applicant IDs:', selectedApplicants);
      
      const response = await axios.post('http://localhost/difsysapi/rolechange.php', {
        applicant_ids: selectedApplicants,
        position: selectedPosition,
        work_arrangement: selectedWorkArrangement
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Full API Response:', response.data);
      
      if (response.data.success) {
        if (response.data.new_employees && Array.isArray(response.data.new_employees)) {
          console.log('New employees to add:', response.data.new_employees);
          
          setIsSubmissionSuccessful(true);
          setApplicantError(null);
          
          setEmployees(prev => {
            const updated = [...prev, ...response.data.new_employees];
            console.log('Updated employees list:', updated);
            return updated;
          });
          
          setApplicants(prev => prev.filter(applicant => !selectedApplicants.includes(applicant.id)));
          
          setTimeout(() => {
            setShowApplicantOverlay(false);
            setSelectedApplicants([]);
            setSelectedPosition('');
            setSelectedWorkArrangement('');
            setIsSubmissionSuccessful(false);
          }, 2000);
          
          setTimeout(async () => {
            try {
              const refreshResponse = await axios.get('http://localhost/difsysapi/fetch_employee.php');
              if (refreshResponse.data.success) {
                setEmployees(refreshResponse.data.employees);
                setLoadedCards(0);
              }
            } catch (refreshErr) {
              console.error('Error refreshing employees:', refreshErr);
            }
          }, 1000);
          
          console.log('Applicants converted to employees successfully');
        } else {
          console.error('No new_employees in response or invalid format');
          setApplicantError('Invalid response format from server');
        }
      } else {
        console.error('API returned success: false', response.data.message);
        setApplicantError(response.data.message || 'Unknown error occurred');
      }
    } catch (err) {
      console.error('Error converting applicants:', err);
      
      if (err.response) {
        console.error('Error response:', err.response.data);
        console.error('Error status:', err.response.status);
        setApplicantError(`Server error: ${err.response.data?.message || err.response.statusText}`);
      } else if (err.request) {
        console.error('No response received:', err.request);
        setApplicantError('No response from server. Please check your connection.');
      } else {
        console.error('Request setup error:', err.message);
        setApplicantError('Error setting up request: ' + err.message);
      }
    } finally {
      setIsSubmittingApplicants(false);
    }
  };


  const handleViewEmployee = () => {
    // Get the current employee being viewed from profileEmployee state
    if (profileEmployee && profileEmployee.id) {
      navigate(`/employee-personal?user_id=${profileEmployee.id}`);
    } else {
      // Fallback to the viewing employee if profileEmployee is not set
      const employeeId = viewingEmployee?.id || profileEmployee?.id;
      if (employeeId) {
        navigate(`/employee-personal?user_id=${employeeId}`);
      } else {
        console.error('No employee ID available for navigation');
        navigate('/employee-personal'); // Navigate without ID as fallback
      }
    }
  };

  const handleCloseApplicantOverlay = () => {
    setShowApplicantOverlay(false);
    setSelectedApplicants([]);
    setApplicantError(null);
    setSelectedPosition('');
    setSelectedWorkArrangement('');
    setIsSubmissionSuccessful(false);
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
      <div className="me-profile-picture" style={{ backgroundColor: person.profileImage ? 'transparent' : avatarColor }}>
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
      <div className="me-avatar" style={{ backgroundColor: person.profileImage ? 'transparent' : avatarColor }}>
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

  const setDropdownRef = (id, element) => {
    dropdownRefs.current[id] = element;
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
        <div className="me-profile-loading">
          <div className="me-loading-spinner"></div>
          <p>Loading profile details...</p>
        </div>
      );
    }

    if (profileError) {
      return (
        <div className="me-profile-error">
          <p>{profileError}</p>
        </div>
      );
    }

    if (!profileEmployee) {
      return (
        <div className="me-profile-no-data">
          <p>No profile data available</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'Personal Information':
        return (
          <div className="me-profile-content-section">
            <div className="me-profile-info-grid">
              <div className="me-profile-info-item">
                <label>Full Name:</label>
                <span>{profileEmployee.firstName} {profileEmployee.middleName || ''} {profileEmployee.lastName}</span>
              </div>
              <div className="me-profile-info-item">
                <label>Email:</label>
                <span>{profileEmployee.email}</span>
              </div>
              <div className="me-profile-info-item">
                <label>Contact Number:</label>
                <span>{profileEmployee.contactNumber || 'Not provided'}</span>
              </div>
              <div className="me-profile-info-item">
                <label>Date of Birth:</label>
                <span>{profileEmployee.dateOfBirth || 'Not provided'}</span>
              </div>
              <div className="me-profile-info-item">
                <label>Address:</label>
                <span>{profileEmployee.address || 'Not provided'}</span>
              </div>
              <div className="me-profile-info-item">
                <label>Civil Status:</label>
                <span>{profileEmployee.civilStatus || 'Not provided'}</span>
              </div>
              <div className="me-profile-info-item">
                <label>Gender:</label>
                <span>{profileEmployee.gender || 'Not provided'}</span>
              </div>
              <div className="me-profile-info-item">
                <label>Citizenship:</label>
                <span>{profileEmployee.citizenship || 'Not provided'}</span>
              </div>
              <div className="me-profile-info-item">
                <label>Height:</label>
                <span>{profileEmployee.height || 'Not provided'}</span>
              </div>
              <div className="me-profile-info-item">
                <label>Weight:</label>
                <span>{profileEmployee.weight || 'Not provided'}</span>
              </div>
              <div className="me-profile-info-item">
                <label>Work Arrangement:</label>
                <span>{profileEmployee.workarrangement || 'Not specified'}</span>
              </div>
              <div className="me-profile-info-item">
                <label>Work Schedule:</label>
                <span>{profileEmployee.workDays || 'Monday-Friday'}</span>
              </div>
            </div>
          </div>
        );
      
      case 'Background Experience':
        return (
          <div className="me-profile-content-section">
            <div className="me-profile-section-title">Work Experience</div>
            <p>Work experience information will be displayed here.</p>
          </div>
        );
      
      case 'Educational Attainment':
        return (
          <div className="me-profile-content-section">
            <div className="me-profile-section-title">Education Background</div>
            <p>Educational information will be displayed here.</p>
          </div>
        );
      
      case 'Documents':
        return (
          <div className="me-profile-content-section">
            <div className="me-profile-section-title">Documents & Files</div>
            <p>Document information will be displayed here.</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="me-page">
      {/* Profile View Modal */}
      {showProfileView && (
        <div className="me-profile-overlay">
          <div className="me-profile-modal">
            {/* Close Button */}
            <button className="me-profile-view" onClick={handleViewEmployee}>
                View Details
            </button>
            <button className="me-profile-close" onClick={handleCloseProfileView}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="red">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Cover Photo Section */}
            <div className="me-profile-cover">
              <div className="me-profile-cover-image">
                {/* Default gradient background as cover */}
              </div>
            </div>


          {/* Profile Info Section */}
          <div className="me-profile-info-section">
            <div className='me-profile-picture-in-info'>
              <div className="me-profile-picture-container">
                <div className="me-profile-picture">
                  {profileEmployee && renderViewAvatar(profileEmployee, true)}
                </div>
              </div>
            </div>
            <div className="me-profile-text-info">
              <div className="me-profile-name">
                {profileEmployee ? `${profileEmployee.firstName} ${profileEmployee.lastName}` : 'Loading...'}
              </div>
              <div className="me-profile-position">
                {profileEmployee ? profileEmployee.position : 'Loading position...'}
              </div>
            </div>
          </div>

            {/* Tabs Section */}
            <div className="me-profile-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`me-profile-tab ${activeTab === tab ? 'me-profile-tab-active' : ''}`}
                  onClick={() => handleTabChange(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content Section */}
            <div className="me-profile-content">
              {renderProfileContent()}
            </div>
          </div>
        </div>
      )}

      {/* Applicant Selection Overlay */}
      {showApplicantOverlay && (
        <div className="me-form-overlay">
          <div className="me-applicant-container">
            <div className="me-form-header">
              <h2>Select Applicants to Add as Employees</h2>
              <button className="me-close-button" onClick={handleCloseApplicantOverlay}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="me-applicant-content">
              {isSubmissionSuccessful ? (
                <div className="me-success-state">
                  <div className="me-success-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="me-success-title">Success!</h3>
                  <p className="me-success-message">
                    {selectedApplicants.length} applicant{selectedApplicants.length !== 1 ? 's' : ''} successfully converted to employee{selectedApplicants.length !== 1 ? 's' : ''}
                  </p>
                  <div className="me-success-details">
                    <p><strong>Position:</strong> {selectedPosition}</p>
                    <p><strong>Work Arrangement:</strong> {selectedWorkArrangement}</p>
                  </div>
                </div>
              ) : (
                <>
                  {applicantError && (
                    <div className="me-form-error-general">
                      {applicantError}
                    </div>
                  )}
                  
                  <div className="me-form-dropdowns">
                    <div className="me-dropdown-group">
                      <label htmlFor="position-select" className="me-dropdown-label">Position</label>
                      <select
                        id="position-select"
                        value={selectedPosition}
                        onChange={(e) => setSelectedPosition(e.target.value)}
                        className="me-dropdown-select"
                      >
                        <option value="">Select Position</option>
                        {positionOptions.map((position, index) => (
                          <option key={index} value={position}>{position}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="me-dropdown-group">
                      <label htmlFor="work-arrangement-select" className="me-dropdown-label">Work Arrangement</label>
                      <select
                        id="work-arrangement-select"
                        value={selectedWorkArrangement}
                        onChange={(e) => setSelectedWorkArrangement(e.target.value)}
                        className="me-dropdown-select"
                      >
                        <option value="">Select Work Arrangement</option>
                        {workArrangementOptions.map((arrangement, index) => (
                          <option key={index} value={arrangement}>{arrangement}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {applicantLoading ? (
                    <div className="me-loading">
                      <div className="me-loading-spinner"></div>
                      <p>Loading applicants...</p>
                    </div>
                  ) : applicants.length === 0 ? (
                    <div className="me-no-results">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="me-no-results-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-6-6 6 6 0 006 6v1z" />
                      </svg>
                      <p>No applicants available</p>
                    </div>
                  ) : (
                    <div className="me-applicant-list">
                      {applicants.map((applicant) => (
                        <div key={applicant.id} className="me-applicant-item">
                          <div className="me-applicant-checkbox">
                            <input
                              type="checkbox"
                              id={`applicant-${applicant.id}`}
                              checked={selectedApplicants.includes(applicant.id)}
                              onChange={() => handleApplicantSelect(applicant.id)}
                            />
                            <label htmlFor={`applicant-${applicant.id}`} className="me-checkbox-label"></label>
                          </div>
                          
                          <div className="me-applicant-avatar">
                            {renderAvatar(applicant, false)}
                          </div>
                          
                          <div className="me-applicant-details">
                            <h3 className="me-applicant-name">
                              {applicant.firstName} {applicant.lastName}
                            </h3>
                            <p className="me-applicant-position">{applicant.position}</p>
                            <p className="me-applicant-email">{applicant.email}</p>
                            <p className="me-applicant-address">{applicant.address}</p>
                            <div className="me-applicant-meta">
                              <span className="me-applicant-status">Status: {applicant.status}</span>
                              <span className="me-applicant-phone">{applicant.number}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              {!isSubmissionSuccessful && (
                <div className="me-form-actions">
                  <button 
                    type="button" 
                    className="me-form-cancel" 
                    onClick={handleCloseApplicantOverlay}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="me-form-submit" 
                    onClick={handleAddSelectedEmployees}
                    disabled={isSubmittingApplicants || selectedApplicants.length === 0}
                  >
                    {isSubmittingApplicants 
                      ? 'Adding...' 
                      : `Add ${selectedApplicants.length} Employee${selectedApplicants.length !== 1 ? 's' : ''}`
                    }
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Header */}
      <div className={`me-header-container ${isAddingVisible ? 'me-header-highlight' : ''}`}>
        <div className="me-header-content">
          <h1 className="me-title">MANAGE EMPLOYEE</h1>
          <div className="me-actions">
            <div className={`me-search-box ${isSearchFocused ? 'me-search-focused' : ''}`}>
              <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              <button className="me-search-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            <button 
              className={`me-add-button ${isAddingVisible ? 'me-button-active' : ''}`} 
              onClick={handleAddButtonClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Employee
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="me-content">
        {loading ? (
          <div className="me-loading">
            <div className="me-loading-spinner"></div>
            <p>Loading employees...</p>
          </div>
        ) : error ? (
          <div className="me-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="me-error-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="me-no-results">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="me-no-results-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p>No employees found</p>
          </div>
        ) : (
          <div className="me-employee-grid">
            {filteredEmployees.slice(0, loadedCards).map((employee, index) => {
              const avatarColor = getAvatarColor(employee.firstName, employee.lastName);
              const isViewing = viewingEmployee && viewingEmployee.id === employee.id;
              const isDropdownOpen = openDropdownId === employee.id;
              
              return (
                <div 
                  key={employee.id || index} 
                  className={`me-employee-card me-card-appear ${isViewing ? 'me-card-viewing' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="me-card-header">
                    {renderAvatar(employee, true)}
                    <div className="me-employee-info">
                      <h3 className="me-employee-name">{employee.firstName} {employee.lastName}</h3>
                      <p className="me-employee-role">{employee.position || 'Employee'}</p>
                      <p className="me-employee-email">{employee.email}</p>
                      <div className="me-schedule">
                        <p className="me-time">8:00am to 5:00pm</p>
                        <div className="me-schedule-pills">
                          <span className="me-day-pill">{formatWorkDays(employee.workDays)}</span>
                          <span className="me-status-pill">{formatStatus(employee.status)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="me-card-actions">
                    <button 
                      className="me-action-button me-view-button"
                      onClick={() => handleViewDetails(employee.id)}
                    >
                      <span className="me-button-text">View Details</span>
                      <span className="me-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </span>
                    </button>
                    <button 
                      className="me-action-button me-shift-button"
                      onClick={() => handleChangeShift(employee.id)}
                    >
                      <span className="me-button-text">Change Shift</span>
                      <span className="me-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </button>

                    <div 
                      className={`me-dropdown-container ${isDropdownOpen ? 'me-dropdown-active' : ''}`}
                      ref={(el) => setDropdownRef(employee.id, el)}
                    >
                      <button 
                        className="me-action-button me-manage-button2"
                        onClick={(e) => toggleDropdown(employee.id, e)}
                      >
                        <span className="me-button-text">Manage</span>
                        <span className="me-button-icon">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor" 
                            className={isDropdownOpen ? 'me-icon-rotated' : ''}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>

                      {isDropdownOpen && (
                        <div className="me-dropdown-menu">
                          <button 
                            className="me-dropdown-item me-edit-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(employee.id, e);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button 
                            className="me-dropdown-item me-archive-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(employee.id, e);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            Archive
                          </button>
                        </div>
                      )}
                    </div>
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

export default ManageEmployee;