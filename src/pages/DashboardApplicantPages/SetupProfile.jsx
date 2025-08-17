import React, { useState, useEffect } from 'react';
import { getCurrentUser, getUserId } from '../../utils/auth';
import '../../components/ApplicantLayout/SetupProfile.css';

const SetupProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('tab1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    address: '',
    contactNumber: '',
    position: '',
    email: '',
    profileImage: '/api/placeholder/200/200',
    dateOfBirth: '',
    civilStatus: '',
    gender: '',
    citizenship: '',
    height: '',
    weight: '',
    objective: '',
    education: [],
    workExperience: [],
    skills: [],
    traits: []
  });

  // Position options for dropdown
  const positionOptions = [
    'Software Developer',
    'Web Developer',
    'Frontend Developer', 
    'Backend Developer',
    'Full Stack Developer',
    'Mobile Developer',
    'UI/UX Designer',
    'Data Scientist',
    'Data Analyst',
    'Project Manager',
    'Product Manager',
    'DevOps Engineer',
    'QA Engineer',
    'System Administrator',
    'Network Administrator',
    'Database Administrator',
    'Business Analyst',
    'Technical Writer',
    'IT Support Specialist',
    'Cybersecurity Specialist',
    'Cloud Engineer',
    'Machine Learning Engineer',
    'Digital Marketing Specialist',
    'Graphic Designer',
    'Content Writer',
    'Sales Representative',
    'Customer Service Representative',
    'Human Resources Specialist',
    'Accountant',
    'Finance Analyst',
    'Operations Manager',
    'Administrative Assistant',
    'Receptionist',
    'Other'
  ];

  // Degree/Course options for dropdown
  const degreeOptions = [
    // Computer Science & IT
    'Bachelor of Science in Computer Science',
    'Bachelor of Science in Information Technology',
    'Bachelor of Science in Computer Engineering',
    'Bachelor of Science in Software Engineering',
    'Bachelor of Science in Cybersecurity',
    'Bachelor of Science in Data Science',
    'Bachelor of Science in Information Systems',
    
    // Engineering
    'Bachelor of Science in Civil Engineering',
    'Bachelor of Science in Mechanical Engineering',
    'Bachelor of Science in Electrical Engineering',
    'Bachelor of Science in Electronics Engineering',
    'Bachelor of Science in Chemical Engineering',
    'Bachelor of Science in Industrial Engineering',
    
    // Business & Management
    'Bachelor of Science in Business Administration',
    'Bachelor of Science in Management',
    'Bachelor of Science in Marketing',
    'Bachelor of Science in Finance',
    'Bachelor of Science in Accounting',
    'Bachelor of Science in Economics',
    'Bachelor of Science in Entrepreneurship',
    
    // Healthcare
    'Bachelor of Science in Nursing',
    'Bachelor of Science in Medical Technology',
    'Bachelor of Science in Physical Therapy',
    'Bachelor of Science in Pharmacy',
    'Bachelor of Science in Psychology',
    
    // Education
    'Bachelor of Elementary Education',
    'Bachelor of Secondary Education',
    'Bachelor of Special Education',
    'Bachelor of Physical Education',
    
    // Liberal Arts & Communications
    'Bachelor of Arts in Communication',
    'Bachelor of Arts in Journalism',
    'Bachelor of Arts in English',
    'Bachelor of Arts in Political Science',
    'Bachelor of Arts in History',
    'Bachelor of Arts in Philosophy',
    
    // Other Fields
    'Bachelor of Science in Agriculture',
    'Bachelor of Science in Architecture',
    'Bachelor of Fine Arts',
    'Bachelor of Science in Tourism Management',
    'Bachelor of Science in Criminology',
    'Bachelor of Laws',
    'Other'
  ];

  // Calculate completion percentage
  const calculateCompletionPercentage = (data) => {
    const requiredFields = [
      'firstName', 'lastName', 'email', 'contactNumber', 'address', 
      'position', 'dateOfBirth', 'civilStatus', 'gender', 'citizenship',
      'height', 'weight', 'objective'
    ];
    
    let filledFields = 0;
    requiredFields.forEach(field => {
      if (data[field] && data[field].trim() !== '') {
        filledFields++;
      }
    });

    // Add points for arrays
    if (data.education && data.education.length > 0) filledFields++;
    if (data.workExperience && data.workExperience.length > 0) filledFields++;
    if (data.skills && data.skills.length > 0) filledFields++;
    if (data.traits && data.traits.length > 0) filledFields++;
    if (data.profileImage && data.profileImage !== '/api/placeholder/200/200') filledFields++;

    const totalFields = requiredFields.length + 5; // +5 for arrays and profile image
    return Math.round((filledFields / totalFields) * 100);
  };

  // Update completion percentage whenever profile data changes
  useEffect(() => {
    const percentage = calculateCompletionPercentage(profileData);
    setCompletionPercentage(percentage);
  }, [profileData]);


  useEffect(() => {
            document.title = "DIFSYS | SETUP PROFILE";
          }, []);

  // Load profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const userId = getUserId();
        const currentUser = getCurrentUser();
        
        if (!userId) {
          window.location.href = '/login';
          return;
        }

        const response = await fetch(`http://localhost/difsysapi/setup_profile.php?app_id=${userId}`);
        const data = await response.json();

        if (data.success && data.data) {
          const profileInfo = data.data;
          
          const newProfileData = {
            firstName: profileInfo.firstName || '',
            lastName: profileInfo.lastName || '',
            middleName: profileInfo.middle_name || '',
            address: profileInfo.address || '',
            contactNumber: profileInfo.contact_number || '',
            position: profileInfo.position || '',
            email: profileInfo.email || currentUser?.email || '',
            profileImage: profileInfo.profile_image ? 
              `http://localhost/difsysapi/${profileInfo.profile_image}` : 
              '/api/placeholder/200/200',
            dateOfBirth: profileInfo.date_of_birth || '',
            civilStatus: profileInfo.civil_status || '',
            gender: profileInfo.gender || '',
            citizenship: profileInfo.citizenship || '',
            height: profileInfo.height || '',
            weight: profileInfo.weight || '',
            objective: profileInfo.objective || '',
            education: profileInfo.education || [],
            workExperience: profileInfo.work_experience || [],
            skills: profileInfo.skills || [],
            traits: profileInfo.traits || []
          };
          
          setProfileData(newProfileData);
        } else {
          // Initialize with basic user data if no profile exists
          if (currentUser) {
            setProfileData(prev => ({
              ...prev,
              firstName: currentUser.firstName || '',
              lastName: currentUser.lastName || '',
              email: currentUser.email || ''
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayChange = (arrayName, index, field, value) => {
    setProfileData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleAddEducation = () => {
    setProfileData(prev => ({
      ...prev,
      education: [...prev.education, {
        level: '',
        degree: '',
        school: '',
        year: '',
        location: ''
      }]
    }));
  };

  const handleAddWorkExperience = () => {
    setProfileData(prev => ({
      ...prev,
      workExperience: [...prev.workExperience, {
        position: '',
        company: '',
        duration: '',
        description: ''
      }]
    }));
  };

  const handleRemoveEducation = (index) => {
    setProfileData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveWorkExperience = (index) => {
    setProfileData(prev => ({
      ...prev,
      workExperience: prev.workExperience.filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const userId = getUserId();
      const formData = new FormData();
      formData.append('action', 'upload_image');
      formData.append('app_id', userId);
      formData.append('profile_image', file);

      const response = await fetch('http://localhost/difsysapi/setup_profile.php', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setProfileData(prev => ({
          ...prev,
          profileImage: data.imageUrl
        }));
        alert('Profile image uploaded successfully!');
      } else {
        alert('Error uploading image: ' + data.message);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const userId = getUserId();
      const formData = new FormData();
      formData.append('action', 'update_profile');
      formData.append('app_id', userId);
      formData.append('profileData', JSON.stringify(profileData));

      const response = await fetch('http://localhost/difsysapi/setup_profile.php', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setIsEditing(false);
        alert('Profile saved successfully!');
      } else {
        alert('Error saving profile: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Generate year options for education
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1960; year--) {
      years.push(year);
    }
    return years;
  };

  if (loading) {
    return (
      <div id="profile-setup-main" className="profile-setup-main">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="profile-setup-main" className="profile-setup-main">
      {!isEditing ? (
        // VIEW MODE
        <div id="view-mode-container" className="view-mode-container">
          {/* Top Row: Profile Image + Personal Info + Progress Bar + Edit Button */}
          <div id="top-section" className="top-section">
            <div id="profile-image-card" className="profile-image-card">
              <img 
                id="profile-photo" 
                src={profileData.profileImage} 
                alt="Profile" 
                className="profile-photo"
                onError={(e) => {
                  e.target.src = '/api/placeholder/200/200';
                }}
              />
            </div>
            
            <div id="personal-info-and-edit" className="personal-info-and-edit">
              <div id="personal-info-card" className="personal-info-card">
                <div className="info-header-with-progress">
                  <h2 id="personal-info-header">Personal Information</h2>
                  <div className="progress-section">
                    <div className="progress-bar-container">
                      <div className="progress-bar-background">
                        <div 
                          className="progress-bar-fill"
                          style={{ 
                            width: `${completionPercentage}%`,
                            backgroundColor: completionPercentage === 100 ? '#28a745' : '#90EE90'
                          }}
                        ></div>
                      </div>
                      <span className="progress-percentage">{completionPercentage}% Complete</span>
                    </div>
                  </div>
                </div>
                
                <div id="personal-info-grid" className="personal-info-grid">
                  <div className="info-item">
                    <label>First Name:</label>
                    <span>{profileData.firstName || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <label>Last Name:</label>
                    <span>{profileData.lastName || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <label>Middle Name:</label>
                    <span>{profileData.middleName || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <label>Address:</label>
                    <span>{profileData.address || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <label>Contact Number:</label>
                    <span>{profileData.contactNumber || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <label>Applying Position:</label>
                    <span>{profileData.position || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{profileData.email || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <label>Date of Birth:</label>
                    <span>{profileData.dateOfBirth || 'Not provided'}</span>
                  </div>
                </div>
              </div>
              
              <div id="edit-button-section" className="edit-button-section">
                <button id="edit-button" className="edit-button" onClick={() => setIsEditing(true)}>
                  EDIT
                </button>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div id="tabs-section" className="tabs-section">
            {/* Dropdown for mobile */}
            <div id="tab-dropdown-container" className="tab-dropdown-container">
              <select 
                id="tab-dropdown"
                className="tab-dropdown"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
              >
                <option value="tab1">Educational Attainment</option>
                <option value="tab2">Background Experience</option>
                <option value="tab3">Skills and Traits</option>
              </select>
            </div>
            
            {/* Tab buttons for desktop */}
            <div id="tab-buttons-row" className="tab-buttons-row">
              <button 
                id="tab1-button"
                className={`main-tab-button ${activeTab === 'tab1' ? 'active' : ''}`}
                onClick={() => setActiveTab('tab1')}
              >
                Educational Attainment
              </button>
              <button 
                id="tab2-button"
                className={`main-tab-button ${activeTab === 'tab2' ? 'active' : ''}`}
                onClick={() => setActiveTab('tab2')}
              >
                Background Experience
              </button>
              <button 
                id="tab3-button"
                className={`main-tab-button ${activeTab === 'tab3' ? 'active' : ''}`}
                onClick={() => setActiveTab('tab3')}
              >
                Skills and Traits
              </button>
            </div>
            
            <div id="tab-content-area" className="tab-content-area">
              {activeTab === 'tab1' && (
                <div id="tab1-content" className="tab-content">
                  <h3>Educational Attainment</h3>
                  {profileData.education && profileData.education.length > 0 ? (
                    profileData.education.map((edu, index) => (
                      <div key={index} className="education-entry">
                        <h4>{edu.level || 'Educational Level'}:</h4>
                        <p><strong>Degree:</strong> {edu.degree || 'Not specified'}</p>
                        <p><strong>School:</strong> {edu.school || 'Not specified'}</p>
                        <p><strong>Year:</strong> {edu.year || 'Not specified'}</p>
                      </div>
                    ))
                  ) : (
                    <p>No educational information provided yet.</p>
                  )}
                </div>
              )}
              
              {activeTab === 'tab2' && (
                <div id="tab2-content" className="tab-content">
                  <h3>Background Experience</h3>
                  
                  <div className="objective-section">
                    <h4>Objective:</h4>
                    <p>{profileData.objective || 'No objective provided yet.'}</p>
                  </div>
                  
                  <div className="personal-background">
                    <h4>Personal Background:</h4>
                    <div className="background-details">
                      <p><strong>Date of Birth:</strong> {profileData.dateOfBirth || 'Not provided'}</p>
                      <p><strong>Civil Status:</strong> {profileData.civilStatus || 'Not provided'}</p>
                      <p><strong>Gender:</strong> {profileData.gender || 'Not provided'}</p>
                      <p><strong>Citizenship:</strong> {profileData.citizenship || 'Not provided'}</p>
                      <p><strong>Height:</strong> {profileData.height || 'Not provided'}</p>
                      <p><strong>Weight:</strong> {profileData.weight || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="work-experience-section">
                    <h4>Work Experience:</h4>
                    {profileData.workExperience && profileData.workExperience.length > 0 ? (
                      profileData.workExperience.map((exp, index) => (
                        <div key={index} className="experience-entry">
                          <h5>{exp.position || 'Position not specified'}</h5>
                          <p><strong>Company:</strong> {exp.company || 'Not specified'}</p>
                          <p><strong>Duration:</strong> {exp.duration || 'Not specified'}</p>
                          <p><strong>Description:</strong> {exp.description || 'No description provided'}</p>
                        </div>
                      ))
                    ) : (
                      <p>No work experience provided yet.</p>
                    )}
                  </div>
                </div>
              )}
              
              {activeTab === 'tab3' && (
                <div id="tab3-content" className="tab-content">
                  <h3>Skills and Traits</h3>
                  <div className="skills-section">
                    <h4>Skills:</h4>
                    {profileData.skills && profileData.skills.length > 0 ? (
                      <ul className="skills-list">
                        {profileData.skills.map((skill, index) => (
                          <li key={index}>{skill}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No skills listed yet.</p>
                    )}
                  </div>
                  <div className="traits-section">
                    <h4>Personal Traits:</h4>
                    {profileData.traits && profileData.traits.length > 0 ? (
                      <div className="traits-tags">
                        {profileData.traits.map((trait, index) => (
                          <span key={index} className="trait-tag">{trait}</span>
                        ))}
                      </div>
                    ) : (
                      <p>No personal traits listed yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // EDIT MODE
        <div id="edit-mode-container" className="edit-mode-container">
          {/* Save Button */}
          <div id="save-button-section" className="save-button-section">
            <button 
              id="save-button" 
              className="save-button" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>

          {/* Edit Tabs */}
          <div id="edit-tabs-section" className="edit-tabs-section">
            {/* Dropdown for mobile */}
            <div id="edit-tab-dropdown-container" className="tab-dropdown-container">
              <select 
                id="edit-tab-dropdown"
                className="tab-dropdown"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
              >
                <option value="tab1">Personal Information</option>
                <option value="tab2">Educational Attainment</option>
                <option value="tab3">Background Experience & Skills</option>
              </select>
            </div>
            
            {/* Tab buttons for desktop */}
            <div id="edit-tab-buttons" className="edit-tab-buttons">
              <button 
                id="edit-tab1-button"
                className={`edit-tab-button ${activeTab === 'tab1' ? 'active' : ''}`}
                onClick={() => setActiveTab('tab1')}
              >
                Personal Information
              </button>
              <button 
                id="edit-tab2-button"
                className={`edit-tab-button ${activeTab === 'tab2' ? 'active' : ''}`}
                onClick={() => setActiveTab('tab2')}
              >
                Educational Attainment
              </button>
              <button 
                id="edit-tab3-button"
                className={`edit-tab-button ${activeTab === 'tab3' ? 'active' : ''}`}
                onClick={() => setActiveTab('tab3')}
              >
                Background Experience & Skills
              </button>
            </div>

            <div id="edit-content-container" className="edit-content-container">
              {activeTab === 'tab1' && (
                <div id="edit-tab1-content" className="edit-tab-content">
                  <div className="image-edit-section">
                    <img 
                      src={profileData.profileImage} 
                      alt="Profile" 
                      className="edit-profile-image"
                      onError={(e) => {
                        e.target.src = '/api/placeholder/200/200';
                      }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                      id="image-upload-input"
                    />
                    <button 
                      className="change-photo-btn"
                      onClick={() => document.getElementById('image-upload-input').click()}
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading...' : 'Change Photo'}
                    </button>
                  </div>
                  
                  <div className="edit-form-grid">
                    <div className="edit-field">
                      <label htmlFor="edit-firstName">First Name <span className="required">*</span></label>
                      <input
                        id="edit-firstName"
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="edit-field">
                      <label htmlFor="edit-lastName">Last Name <span className="required">*</span></label>
                      <input
                        id="edit-lastName"
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="edit-field">
                      <label htmlFor="edit-middleName">Middle Name</label>
                      <input
                        id="edit-middleName"
                        type="text"
                        value={profileData.middleName}
                        onChange={(e) => handleInputChange('middleName', e.target.value)}
                      />
                    </div>
                    <div className="edit-field">
                      <label htmlFor="edit-email">Email <span className="required">*</span></label>
                      <input
                        id="edit-email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                      />
                    </div>
                    <div className="edit-field">
                      <label htmlFor="edit-contactNumber">Contact Number <span className="required">*</span></label>
                      <input
                        id="edit-contactNumber"
                        type="tel"
                        value={profileData.contactNumber}
                        onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                        placeholder="e.g., +639123456789"
                        required
                      />
                    </div>
                    <div className="edit-field">
                      <label htmlFor="edit-position">Applying Position <span className="required">*</span></label>
                      <select
                        id="edit-position"
                        value={profileData.position}
                        onChange={(e) => handleInputChange('position', e.target.value)}
                        required
                      >
                        <option value="">Select Position</option>
                        {positionOptions.map((position, index) => (
                          <option key={index} value={position}>{position}</option>
                        ))}
                      </select>
                    </div>
                    <div className="edit-field full-width">
                      <label htmlFor="edit-address">Address <span className="required">*</span></label>
                      <textarea
                        id="edit-address"
                        value={profileData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Complete address including street, barangay, city, province"
                        required
                      />
                    </div>
                    <div className="edit-field">
                      <label htmlFor="edit-dateOfBirth">Date of Birth <span className="required">*</span></label>
                      <input
                        id="edit-dateOfBirth"
                        type="date"
                        value={profileData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        required
                      />
                    </div>
                    <div className="edit-field">
                      <label htmlFor="edit-civilStatus">Civil Status <span className="required">*</span></label>
                      <select
                        id="edit-civilStatus"
                        value={profileData.civilStatus}
                        onChange={(e) => handleInputChange('civilStatus', e.target.value)}
                        required
                      >
                        <option value="">Select Civil Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                    <div className="edit-field">
                      <label htmlFor="edit-gender">Gender <span className="required">*</span></label>
                      <select
                        id="edit-gender"
                        value={profileData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        required
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="edit-field">
                      <label htmlFor="edit-citizenship">Citizenship <span className="required">*</span></label>
                      <input
                        id="edit-citizenship"
                        type="text"
                        value={profileData.citizenship}
                        onChange={(e) => handleInputChange('citizenship', e.target.value)}
                        placeholder="e.g., Filipino"
                        required
                      />
                    </div>
                    <div className="edit-field">
                      <label htmlFor="edit-height">Height <span className="required">*</span></label>
                      <input
                        id="edit-height"
                        type="text"
                        value={profileData.height}
                        onChange={(e) => handleInputChange('height', e.target.value)}
                        placeholder="e.g., 5'5&quot; or 165cm"
                        required
                      />
                    </div>
                    <div className="edit-field">
                      <label htmlFor="edit-weight">Weight <span className="required">*</span></label>
                      <input
                        id="edit-weight"
                        type="text"
                        value={profileData.weight}
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                        placeholder="e.g., 57kg or 125lbs"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tab2' && (
                <div id="edit-tab2-content" className="edit-tab-content">
                  <h3>Educational Attainment</h3>
                  <button 
                    type="button" 
                    className="add-button"
                    onClick={handleAddEducation}
                  >
                    Add Education
                  </button>
                  
                  {profileData.education && profileData.education.map((edu, index) => (
                    <div key={index} className="edit-education-item">
                      <div className="item-header">
                        <h4>Education {index + 1}</h4>
                        <button 
                          type="button"
                          className="remove-button"
                          onClick={() => handleRemoveEducation(index)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="edit-form-grid">
                        <div className="edit-field">
                          <label htmlFor={`edit-level-${index}`}>Level</label>
                          <select
                            id={`edit-level-${index}`}
                            value={edu.level || ''}
                            onChange={(e) => handleArrayChange('education', index, 'level', e.target.value)}
                          >
                            <option value="">Select Level</option>
                            <option value="Elementary">Elementary</option>
                            <option value="Secondary">Secondary</option>
                            <option value="College">College</option>
                            <option value="Graduate">Graduate</option>
                            <option value="Post Graduate">Post Graduate</option>
                          </select>
                        </div>
                        <div className="edit-field">
                          <label htmlFor={`edit-degree-${index}`}>Degree/Course</label>
                          <select
                            id={`edit-degree-${index}`}
                            value={edu.degree || ''}
                            onChange={(e) => handleArrayChange('education', index, 'degree', e.target.value)}
                          >
                            <option value="">Select Degree/Course</option>
                            {degreeOptions.map((degree, idx) => (
                              <option key={idx} value={degree}>{degree}</option>
                            ))}
                          </select>
                        </div>
                        <div className="edit-field">
                          <label htmlFor={`edit-school-${index}`}>School</label>
                          <input
                            id={`edit-school-${index}`}
                            type="text"
                            value={edu.school || ''}
                            onChange={(e) => handleArrayChange('education', index, 'school', e.target.value)}
                            placeholder="e.g., University Name"
                          />
                        </div>
                        <div className="edit-field">
                          <label htmlFor={`edit-year-${index}`}>Year Graduated</label>
                          <select
                            id={`edit-year-${index}`}
                            value={edu.year || ''}
                            onChange={(e) => handleArrayChange('education', index, 'year', e.target.value)}
                          >
                            <option value="">Select Year</option>
                            {generateYearOptions().map((year) => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'tab3' && (
                <div id="edit-tab3-content" className="edit-tab-content">
                  <div className="edit-field full-width">
                    <label htmlFor="edit-objective">Objective <span className="required">*</span></label>
                    <textarea
                      id="edit-objective"
                      value={profileData.objective}
                      onChange={(e) => handleInputChange('objective', e.target.value)}
                      rows="4"
                      placeholder="Describe your career objective and goals..."
                      required
                    />
                  </div>
                  
                  <h4>Work Experience</h4>
                  <button 
                    type="button" 
                    className="add-button"
                    onClick={handleAddWorkExperience}
                  >
                    Add Work Experience
                  </button>
                  
                  {profileData.workExperience && profileData.workExperience.map((exp, index) => (
                    <div key={index} className="edit-experience-item">
                      <div className="item-header">
                        <h4>Experience {index + 1}</h4>
                        <button 
                          type="button"
                          className="remove-button"
                          onClick={() => handleRemoveWorkExperience(index)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="edit-form-grid">
                        <div className="edit-field">
                          <label htmlFor={`edit-exp-position-${index}`}>Position</label>
                          <input
                            id={`edit-exp-position-${index}`}
                            type="text"
                            value={exp.position || ''}
                            onChange={(e) => handleArrayChange('workExperience', index, 'position', e.target.value)}
                            placeholder="e.g., Software Developer"
                          />
                        </div>
                        <div className="edit-field">
                          <label htmlFor={`edit-company-${index}`}>Company</label>
                          <input
                            id={`edit-company-${index}`}
                            type="text"
                            value={exp.company || ''}
                            onChange={(e) => handleArrayChange('workExperience', index, 'company', e.target.value)}
                            placeholder="e.g., Tech Company Inc."
                          />
                        </div>
                        <div className="edit-field">
                          <label htmlFor={`edit-duration-${index}`}>Duration</label>
                          <input
                            id={`edit-duration-${index}`}
                            type="text"
                            value={exp.duration || ''}
                            onChange={(e) => handleArrayChange('workExperience', index, 'duration', e.target.value)}
                            placeholder="e.g., Jan 2020 - Dec 2023"
                          />
                        </div>
                        <div className="edit-field full-width">
                          <label htmlFor={`edit-description-${index}`}>Description</label>
                          <textarea
                            id={`edit-description-${index}`}
                            value={exp.description || ''}
                            onChange={(e) => handleArrayChange('workExperience', index, 'description', e.target.value)}
                            placeholder="Describe your responsibilities and achievements..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="edit-field full-width">
                    <label htmlFor="edit-skills">Skills (one per line) <span className="required">*</span></label>
                    <textarea
                      id="edit-skills"
                      value={Array.isArray(profileData.skills) ? profileData.skills.join('\n') : ''}
                      onChange={(e) => handleInputChange('skills', e.target.value.split('\n').filter(skill => skill.trim()))}
                      rows="6"
                      placeholder="Enter each skill on a new line..."
                      required
                    />
                  </div>
                  
                  <div className="edit-field full-width">
                    <label htmlFor="edit-traits">Personal Traits (comma separated) <span className="required">*</span></label>
                    <input
                      id="edit-traits"
                      type="text"
                      value={Array.isArray(profileData.traits) ? profileData.traits.join(', ') : ''}
                      onChange={(e) => handleInputChange('traits', e.target.value.split(',').map(trait => trait.trim()).filter(trait => trait))}
                      placeholder="e.g., Team Player, Problem Solver, Detail-oriented"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupProfile;