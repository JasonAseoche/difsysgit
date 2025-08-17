import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser, getUserId, getUserRole } from '../../utils/auth';
import './Profile.css';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [activeTab, setActiveTab] = useState('Personal Information');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    address: '',
    contactNumber: '',
    role: '',
    email: '',
    profileImage: '/api/placeholder/200/200',
    coverPhoto: '',
    dateOfBirth: '',
    civilStatus: '',
    gender: '',
    citizenship: '',
    height: '',
    weight: ''
  });

  const tabs = [
    'Personal Information',
    'Background Experience',
    'Educational Attainment',
    'Documents'
  ];

  // Calculate completion percentage
  const calculateCompletionPercentage = (data) => {
    const requiredFields = [
      'firstName', 'lastName', 'email', 'contactNumber', 'address', 
      'role', 'dateOfBirth', 'civilStatus', 'gender', 'citizenship',
      'height', 'weight'
    ];
    
    let filledFields = 0;
    requiredFields.forEach(field => {
      if (data[field] && data[field].trim() !== '') {
        filledFields++;
      }
    });

    // Add point for profile image
    if (data.profileImage && data.profileImage !== '/api/placeholder/200/200') filledFields++;

    const totalFields = requiredFields.length + 1; // +1 for profile image
    return Math.round((filledFields / totalFields) * 100);
  };

  // Update completion percentage whenever profile data changes
  useEffect(() => {
    const percentage = calculateCompletionPercentage(profileData);
    setCompletionPercentage(percentage);
  }, [profileData]);

  useEffect(() => {
      document.title = "DIFSYS | PROFILE";
    }, []);

  // Load profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const userId = getUserId();
        const userRole = getUserRole();
        
        // Check if user has allowed role
        // In the fetchProfileData function, around line 69
        const allowedRoles = ['admin', 'hr', 'accountant', 'employee', 'supervisor']; // Add 'supervisor'
        if (!allowedRoles.includes(userRole)) {
          alert('Access denied. This page is only accessible to admin, hr, accountant, employee, and supervisor roles.');
          window.location.href = '/dashboard-' + userRole;
          return;
        }

        if (!userId) {
          window.location.href = '/login';
          return;
        }

        const response = await axios.get(`http://localhost/difsysapi/profile.php`, {
          params: { user_id: userId }
        });

        if (response.data.success && response.data.data) {
          const profileInfo = response.data.data;
          
          const newProfileData = {
            firstName: profileInfo.firstName || '',
            lastName: profileInfo.lastName || '',
            middleName: profileInfo.middle_name || '',
            address: profileInfo.address || '',
            contactNumber: profileInfo.contact_number || '',
            role: profileInfo.role || '',
            email: profileInfo.email || '',
            profileImage: profileInfo.profile_image ? 
              `http://localhost/difsysapi/${profileInfo.profile_image}` : 
              '/api/placeholder/200/200',
            coverPhoto: profileInfo.cover_photo ? 
              `http://localhost/difsysapi/${profileInfo.cover_photo}` : '',
            dateOfBirth: profileInfo.date_of_birth || '',
            civilStatus: profileInfo.civil_status || '',
            gender: profileInfo.gender || '',
            citizenship: profileInfo.citizenship || '',
            height: profileInfo.height || '',
            weight: profileInfo.weight || ''
          };
          
          setProfileData(newProfileData);
        } else {
          // Initialize with basic user data if no profile exists
          const currentUser = getCurrentUser();
          if (currentUser) {
            setProfileData(prev => ({
              ...prev,
              firstName: currentUser.firstName || '',
              lastName: currentUser.lastName || '',
              email: currentUser.email || '',
              role: currentUser.role || userRole
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        if (error.response) {
          alert('Error loading profile data: ' + (error.response.data?.message || 'Server error'));
        } else {
          alert('Error loading profile data. Please check your connection.');
        }
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

  const handleCoverUpload = async (event) => {
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
      formData.append('action', 'upload_cover');
      formData.append('user_id', userId);
      formData.append('cover_photo', file);

      const response = await axios.post('http://localhost/difsysapi/profile.php', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setProfileData(prev => ({
          ...prev,
          coverPhoto: response.data.imageUrl
        }));
        alert('Cover photo uploaded successfully!');
      } else {
        alert('Error uploading cover photo: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      if (error.response) {
        alert('Error uploading cover photo: ' + (error.response.data?.message || 'Server error'));
      } else {
        alert('Error uploading cover photo. Please check your connection.');
      }
    } finally {
      setUploading(false);
    }
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
      formData.append('user_id', userId);
      formData.append('profile_image', file);

      const response = await axios.post('http://localhost/difsysapi/profile.php', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setProfileData(prev => ({
          ...prev,
          profileImage: response.data.imageUrl
        }));
        alert('Profile image uploaded successfully!');
      } else {
        alert('Error uploading image: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      if (error.response) {
        alert('Error uploading image: ' + (error.response.data?.message || 'Server error'));
      } else {
        alert('Error uploading image. Please check your connection.');
      }
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
      formData.append('user_id', userId);
      formData.append('profileData', JSON.stringify(profileData));

      const response = await axios.post('http://localhost/difsysapi/profile.php', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setIsEditing(false);
        alert('Profile saved successfully!');
      } else {
        alert('Error saving profile: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      if (error.response) {
        alert('Error saving profile: ' + (error.response.data?.message || 'Server error'));
      } else {
        alert('Error saving profile. Please check your connection.');
      }
    } finally {
      setSaving(false);
    }
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

  // Function to render avatar with profile image or initials
  const renderAvatar = () => {
    const initials = getInitials(profileData.firstName, profileData.lastName);
    const avatarColor = getAvatarColor(profileData.firstName, profileData.lastName);
    
    return (
      <div className="profile-picture" style={{ backgroundColor: profileData.profileImage ? 'transparent' : avatarColor }}>
        {profileData.profileImage && profileData.profileImage !== '/api/placeholder/200/200' ? (
          <img 
            src={profileData.profileImage.startsWith('http') ? profileData.profileImage : `http://localhost/difsysapi/${profileData.profileImage}`} 
            alt={`${profileData.firstName} ${profileData.lastName}`}
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
        <span style={{ display: (profileData.profileImage && profileData.profileImage !== '/api/placeholder/200/200') ? 'none' : 'block' }}>
          {initials}
        </span>
      </div>
    );
  };

  // Render profile content based on active tab
  const renderProfileContent = () => {
    switch (activeTab) {
      case 'Personal Information':
        return (
          <div className="profile-content-section">
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <label>Full Name:</label>
                <span>{profileData.firstName} {profileData.middleName || ''} {profileData.lastName}</span>
              </div>
              <div className="profile-info-item">
                <label>Email:</label>
                <span>{profileData.email}</span>
              </div>
              <div className="profile-info-item">
                <label>Contact Number:</label>
                <span>{profileData.contactNumber || 'Not provided'}</span>
              </div>
              <div className="profile-info-item">
                <label>Date of Birth:</label>
                <span>{profileData.dateOfBirth || 'Not provided'}</span>
              </div>
              <div className="profile-info-item">
                <label>Address:</label>
                <span>{profileData.address || 'Not provided'}</span>
              </div>
              <div className="profile-info-item">
                <label>Civil Status:</label>
                <span>{profileData.civilStatus || 'Not provided'}</span>
              </div>
              <div className="profile-info-item">
                <label>Gender:</label>
                <span>{profileData.gender || 'Not provided'}</span>
              </div>
              <div className="profile-info-item">
                <label>Citizenship:</label>
                <span>{profileData.citizenship || 'Not provided'}</span>
              </div>
              <div className="profile-info-item">
                <label>Height:</label>
                <span>{profileData.height || 'Not provided'}</span>
              </div>
              <div className="profile-info-item">
                <label>Weight:</label>
                <span>{profileData.weight || 'Not provided'}</span>
              </div>
              <div className="profile-info-item">
                <label>Role:</label>
                <span>{profileData.role || 'Not provided'}</span>
              </div>
            </div>
          </div>
        );
      
      case 'Background Experience':
        return (
          <div className="profile-content-section">
            <div className="profile-section-title">Work Experience</div>
            <p>Work experience information will be displayed here.</p>
          </div>
        );
      
      case 'Educational Attainment':
        return (
          <div className="profile-content-section">
            <div className="profile-section-title">Education Background</div>
            <p>Educational information will be displayed here.</p>
          </div>
        );
      
      case 'Documents':
        return (
          <div className="profile-content-section">
            <div className="profile-section-title">Documents & Files</div>
            <p>Document information will be displayed here.</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Render edit form content
  const renderEditContent = () => {
    return (
      <div className="profile-edit-content-container">
        <div className="profile-image-edit-section">
          {renderAvatar()}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            id="profile-image-upload-input"
          />
          <button 
            className="profile-change-photo-btn"
            onClick={() => document.getElementById('profile-image-upload-input').click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Change Photo'}
          </button>
        </div>
        
        <div className="profile-edit-form-grid">
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-firstName">First Name <span className="profile-required">*</span></label>
            <input
              id="profile-edit-firstName"
              type="text"
              value={profileData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              required
            />
          </div>
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-lastName">Last Name <span className="profile-required">*</span></label>
            <input
              id="profile-edit-lastName"
              type="text"
              value={profileData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              required
            />
          </div>
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-middleName">Middle Name</label>
            <input
              id="profile-edit-middleName"
              type="text"
              value={profileData.middleName}
              onChange={(e) => handleInputChange('middleName', e.target.value)}
            />
          </div>
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-email">Email <span className="profile-required">*</span></label>
            <input
              id="profile-edit-email"
              type="email"
              value={profileData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
          </div>
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-contactNumber">Contact Number <span className="profile-required">*</span></label>
            <input
              id="profile-edit-contactNumber"
              type="tel"
              value={profileData.contactNumber}
              onChange={(e) => handleInputChange('contactNumber', e.target.value)}
              placeholder="e.g., +639123456789"
              required
            />
          </div>
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-role">Role <span className="profile-required">*</span></label>
            <input
              id="profile-edit-role"
              type="text"
              value={profileData.role}
              readOnly
              disabled
              style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
            />
          </div>
          <div className="profile-edit-field profile-full-width">
            <label htmlFor="profile-edit-address">Address <span className="profile-required">*</span></label>
            <textarea
              id="profile-edit-address"
              value={profileData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Complete address including street, barangay, city, province"
              required
            />
          </div>
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-dateOfBirth">Date of Birth <span className="profile-required">*</span></label>
            <input
              id="profile-edit-dateOfBirth"
              type="date"
              value={profileData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              required
            />
          </div>
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-civilStatus">Civil Status <span className="profile-required">*</span></label>
            <select
              id="profile-edit-civilStatus"
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
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-gender">Gender <span className="profile-required">*</span></label>
            <select
              id="profile-edit-gender"
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
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-citizenship">Citizenship <span className="profile-required">*</span></label>
            <input
              id="profile-edit-citizenship"
              type="text"
              value={profileData.citizenship}
              onChange={(e) => handleInputChange('citizenship', e.target.value)}
              placeholder="e.g., Filipino"
              required
            />
          </div>
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-height">Height <span className="profile-required">*</span></label>
            <input
              id="profile-edit-height"
              type="text"
              value={profileData.height}
              onChange={(e) => handleInputChange('height', e.target.value)}
              placeholder="e.g., 5'5&quot; or 165cm"
              required
            />
          </div>
          <div className="profile-edit-field">
            <label htmlFor="profile-edit-weight">Weight <span className="profile-required">*</span></label>
            <input
              id="profile-edit-weight"
              type="text"
              value={profileData.weight}
              onChange={(e) => handleInputChange('weight', e.target.value)}
              placeholder="e.g., 57kg or 125lbs"
              required
            />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading-container">
          <div className="profile-loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-modal">
        {/* Action Button */}
        <button 
          className="profile-action-button" 
          onClick={isEditing ? handleSave : () => setIsEditing(true)}
          disabled={saving}
        >
          {isEditing ? (saving ? 'SAVING...' : 'SAVE') : 'EDIT'}
        </button>

        {!isEditing ? (
          <>
            {/* Cover Photo Section */}
            <div className="profile-cover">
              <div className="profile-cover-image" style={{
                backgroundImage: profileData.coverPhoto ? `url(${profileData.coverPhoto})` : 'none'
              }}>
                {/* No change cover button in view mode */}
              </div>
            </div>

            {/* Profile Info Section */}
            <div className="profile-info-section">
              <div className="profile-picture-in-info">
                <div className="profile-picture-container">
                  {renderAvatar()}
                </div>
              </div>
              <div className="profile-text-info">
                <div className="profile-text-content">
                  <div className="profile-name">
                    {profileData.firstName} {profileData.lastName}
                  </div>
                  <div className="profile-position">
                    {profileData.role}
                  </div>
                </div>
                <div className="profile-completion-display">
                  <label className="profile-completion-label">Profile Completion</label>
                  <div className="profile-progress-container">
                    <div className="profile-progress-bar-background">
                      <div 
                        className="profile-progress-bar-fill"
                        style={{ 
                          width: `${completionPercentage}%`,
                          backgroundColor: completionPercentage === 100 ? '#28a745' : '#90EE90'
                        }}
                      ></div>
                    </div>
                    <span className="profile-progress-percentage">{completionPercentage}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="profile-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`profile-tab ${activeTab === tab ? 'profile-tab-active' : ''}`}
                  onClick={() => handleTabChange(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content Section */}
            <div className="profile-content">
              {renderProfileContent()}
            </div>
          </>
        ) : (
          <>
            {/* Cover Photo Section for Edit Mode */}
            <div className="profile-cover">
              <div className="profile-cover-image" style={{
                backgroundImage: profileData.coverPhoto ? `url(${profileData.coverPhoto})` : 'none'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  style={{ display: 'none' }}
                  id="cover-photo-upload-input-edit"
                />
                <button 
                  className="profile-change-cover-btn"
                  onClick={() => document.getElementById('cover-photo-upload-input-edit').click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Change Cover Photo'}
                </button>
              </div>
            </div>
            
            {/* Edit Content */}
            <div className="profile-content">
              {renderEditContent()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;