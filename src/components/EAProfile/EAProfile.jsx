import React, { useState, useEffect } from 'react';
import { Edit3, Save, X } from 'lucide-react';
import axios from 'axios';
import { getCurrentUser, getUserId } from '../../utils/auth';
import './EAProfile.css';
import EADetails from './EADetails';

const EAProfile = () => {
  const [activeTab, setActiveTab] = useState('Personal Info');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userLevel, setUserLevel] = useState('');
  
  // Employee data state with proper initial values
  const [employeeData, setEmployeeData] = useState({
    name: '',
    id: '',
    gender: '',
    email: '',
    contact: '',
    placeOfBirth: '',
    birthDate: '',
    maritalStatus: '',
    religion: '',
    citizenIdAddress: '',
    residentialAddress: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    education: [],
    family: [],
    profileImage: ''
  });

  const [originalData, setOriginalData] = useState({});
  
  const userId = getUserId();

  const tabs = [
  'Personal Info',
  userLevel === 'employee' ? 'Employee Details' : 'Applicant Details'
];

  // Check user access on component mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || !['employee', 'applicant'].includes(currentUser.role?.toLowerCase())) {
      alert('Access denied. This page is only accessible to employees and applicants.');
      window.location.href = '/login';
      return;
    }
    setUserLevel(currentUser.role?.toLowerCase());
  }, []);

  // Fetch employee data on component mount
  useEffect(() => {
    if (userId && userLevel) {
      fetchEmployeeData();
    }
  }, [userId, userLevel]);

  useEffect(() => {
    document.title = "DIFSYS | MY PROFILE";
  }, []);

  const getApiEndpoint = () => {
    return userLevel === 'employee' 
      ? 'http://localhost/difsysapi/employee_details.php'
      : 'http://localhost/difsysapi/applicant_details.php';
  };

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const endpoint = getApiEndpoint();
      console.log('=== EAProfile fetchEmployeeData START ===');
      console.log('User ID:', userId);
      console.log('User Level:', userLevel);
      console.log('API Endpoint:', endpoint);
      
      const response = await axios.get(`${endpoint}?user_id=${userId}`);
      console.log('=== EAProfile API Response ===');
      console.log('Full Response:', response.data);
      console.log('Profile Image from response:', response.data.profileImage);
      console.log('Profile Image Alt field:', response.data.profile_image);
      
      if (response.data) {
        const formattedData = {
          name: response.data.name || '',
          id: response.data.id || '',
          gender: response.data.gender || '',
          email: response.data.email || '',
          contact: response.data.contact || '',
          placeOfBirth: response.data.placeOfBirth || '',
          birthDate: response.data.birthDate || '',
          maritalStatus: response.data.maritalStatus || '',
          religion: response.data.religion || '',
          citizenIdAddress: response.data.citizenIdAddress || '',
          residentialAddress: response.data.residentialAddress || '',
          emergencyContactName: response.data.emergencyContactName || '',
          emergencyContactRelationship: response.data.emergencyContactRelationship || '',
          emergencyContactPhone: response.data.emergencyContactPhone || '',
          education: response.data.education || [],
          family: response.data.family || [],
          profileImage: response.data.profileImage || response.data.profile_image || ''
        };
        
        console.log('=== EAProfile Formatted Data ===');
        console.log('Formatted profileImage:', formattedData.profileImage);
        console.log('Setting employee data...');
        
        setEmployeeData(formattedData);
        setOriginalData(formattedData);
        
        console.log('=== EAProfile Data Set Complete ===');
      }
    } catch (error) {
      console.error('=== EAProfile Error ===');
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
      console.log('=== EAProfile fetchEmployeeData END ===');
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
        const newImageUrl = response.data.imageUrl;
        setEmployeeData(prev => ({
          ...prev,
          profileImage: newImageUrl
        }));
        alert('Profile image uploaded successfully!');
      } else {
        alert('Error uploading image: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please check your connection.');
    } finally {
      setUploading(false);
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const dataToSave = {
        user_id: userId,
        name: employeeData.name,
        id: employeeData.id,
        gender: employeeData.gender,
        email: employeeData.email,
        contact: employeeData.contact,
        placeOfBirth: employeeData.placeOfBirth,
        birthDate: employeeData.birthDate,
        maritalStatus: employeeData.maritalStatus,
        religion: employeeData.religion,
        citizenIdAddress: employeeData.citizenIdAddress,
        residentialAddress: employeeData.residentialAddress,
        emergencyContactName: employeeData.emergencyContactName,
        emergencyContactRelationship: employeeData.emergencyContactRelationship,
        emergencyContactPhone: employeeData.emergencyContactPhone,
        education: employeeData.education,
        family: employeeData.family
      };
      
      const endpoint = getApiEndpoint();
      const response = await axios.post(endpoint, dataToSave, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.data.success) {
        setOriginalData({ ...employeeData });
        setIsEditing(false);
        alert('Profile data saved successfully!');
      } else {
        alert('Failed to save profile data: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving profile data:', error);
      alert('Error saving profile data: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEmployeeData({ ...originalData });
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setEmployeeData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEducationChange = (id, field, value) => {
    setEmployeeData(prev => ({
      ...prev,
      education: prev.education.map(edu => 
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const addEducation = () => {
    const newEducation = {
      id: Date.now(),
      level: '',
      school: '',
      address: '',
      field: '',
      startYear: '',
      endYear: ''
    };
    setEmployeeData(prev => ({
      ...prev,
      education: [...prev.education, newEducation]
    }));
  };

  const removeEducation = (id) => {
    setEmployeeData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const handleFamilyChange = (id, field, value) => {
    setEmployeeData(prev => ({
      ...prev,
      family: prev.family.map(member => 
        member.id === id ? { ...member, [field]: value } : member
      )
    }));
  };

  const addFamilyMember = () => {
    const newMember = {
      id: Date.now(),
      type: '',
      name: ''
    };
    setEmployeeData(prev => ({
      ...prev,
      family: [...prev.family, newMember]
    }));
  };

  const removeFamilyMember = (id) => {
    setEmployeeData(prev => ({
      ...prev,
      family: prev.family.filter(member => member.id !== id)
    }));
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      '#0D6275', '#1D4ED8', '#7E22CE', '#BE185D', '#0F766E', 
      '#047857', '#B45309', '#B91C1C', '#4F46E5', '#065F46'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const renderProfileImage = () => {
    const initials = getInitials(employeeData.name);
    const avatarColor = getAvatarColor(employeeData.name || 'User');
    
    return (
      <>
        {employeeData.profileImage && (
          <img 
            src={employeeData.profileImage.startsWith('http') ? 
              employeeData.profileImage : 
              `http://localhost/difsysapi/${employeeData.profileImage}`
            } 
            alt="Profile" 
            className="eaprof-avatar"
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = e.target.nextSibling;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
        )}
        <div 
          className="eaprof-avatar-fallback"
          style={{ 
            backgroundColor: avatarColor,
            display: employeeData.profileImage ? 'none' : 'flex'
          }}
        >
          {initials}
        </div>
      </>
    );
  };

  const renderPersonalInfo = () => (
    <>
      {/* Basic Information Card */}
      <div className="eaprof-basic-info-card">
        <h3 className="eaprof-card-title">Basic Information</h3>
        <div className="eaprof-basic-content">
        <div className="eaprof-left-section">
          <div className="eaprof-profile-image-container">
            <div className="eaprof-profile-image">
              {renderProfileImage()}
            </div>
            {isEditing && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  id="eaprof-image-upload"
                />
                <button 
                  className="eaprof-change-photo-btn"
                  onClick={() => document.getElementById('eaprof-image-upload').click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Change Photo'}
                </button>
              </>
            )}
          </div>
          <div className="eaprof-profile-details">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={employeeData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="eaprof-edit-input eaprof-edit-name"
                    placeholder="Full Name"
                    disabled
                  />
                  <input
                    type="text"
                    value={employeeData.id || ''}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    className="eaprof-edit-input eaprof-edit-id"
                    placeholder="ID Number"
                    disabled
                  />
                  <select
                    value={employeeData.gender || ''}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="eaprof-edit-select"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="email"
                    value={employeeData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="eaprof-edit-input"
                    placeholder="Email"
                  />
                  <input
                    type="tel"
                    value={employeeData.contact || ''}
                    onChange={(e) => handleInputChange('contact', e.target.value)}
                    className="eaprof-edit-input"
                    placeholder="Contact Number"
                  />
                </>
              ) : (
                <>
                  <h4 className="eaprof-name">{employeeData.name || 'N/A'}</h4>
                  <p className="eaprof-id">{employeeData.id || 'N/A'}</p>
                  <p className="eaprof-gender">{employeeData.gender || 'N/A'}</p>
                  <p className="eaprof-email">{employeeData.email || 'N/A'}</p>
                  <p className="eaprof-contact">{employeeData.contact || 'N/A'}</p>
                </>
              )}
            </div>
          </div>
          
          <div className="eaprof-divider"></div>
          
          <div className="eaprof-right-section">
            <div className="eaprof-info-row">
              <span className="eaprof-info-label">Place of birth</span>
              {isEditing ? (
                <input
                  type="text"
                  value={employeeData.placeOfBirth}
                  onChange={(e) => handleInputChange('placeOfBirth', e.target.value)}
                  className="eaprof-edit-input eaprof-edit-small"
                  placeholder="Place of birth"
                />
              ) : (
                <span className="eaprof-info-value">{employeeData.placeOfBirth || 'N/A'}</span>
              )}
            </div>
            <div className="eaprof-info-row">
              <span className="eaprof-info-label">Birth date</span>
              {isEditing ? (
                <input
                  type="date"
                  value={employeeData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className="eaprof-edit-input eaprof-edit-small"
                />
              ) : (
                <span className="eaprof-info-value">{formatDateForDisplay(employeeData.birthDate)}</span>
              )}
            </div>
            <div className="eaprof-info-row">
              <span className="eaprof-info-label">Age</span>
              <span className="eaprof-info-value">{calculateAge(employeeData.birthDate)} years old</span>
            </div>
            <div className="eaprof-info-row">
              <span className="eaprof-info-label">Marital Status</span>
              {isEditing ? (
                <select
                  value={employeeData.maritalStatus}
                  onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                  className="eaprof-edit-select eaprof-edit-small"
                >
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              ) : (
                <span className="eaprof-info-value">{employeeData.maritalStatus || 'N/A'}</span>
              )}
            </div>
            <div className="eaprof-info-row">
              <span className="eaprof-info-label">Religion</span>
              {isEditing ? (
                <input
                  type="text"
                  value={employeeData.religion}
                  onChange={(e) => handleInputChange('religion', e.target.value)}
                  className="eaprof-edit-input eaprof-edit-small"
                  placeholder="Religion"
                />
              ) : (
                <span className="eaprof-info-value">{employeeData.religion || 'N/A'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address and Emergency Contact Row */}
      <div className="eaprof-two-card-row">
        <div className="eaprof-address-card">
          <h3 className="eaprof-card-title">Address</h3>
          <div className="eaprof-address-content">
            <div className="eaprof-address-item">
              <span className="eaprof-address-label">Home Address:</span>
              {isEditing ? (
                <textarea
                  value={employeeData.citizenIdAddress}
                  onChange={(e) => handleInputChange('citizenIdAddress', e.target.value)}
                  className="eaprof-edit-textarea"
                  placeholder="Home Address"
                  rows="3"
                />
              ) : (
                <p className="eaprof-address-value">{employeeData.citizenIdAddress || 'N/A'}</p>
              )}
            </div>
            <div className="eaprof-address-item">
              <span className="eaprof-address-label">Permanent Address:</span>
              {isEditing ? (
                <textarea
                  value={employeeData.residentialAddress}
                  onChange={(e) => handleInputChange('residentialAddress', e.target.value)}
                  className="eaprof-edit-textarea"
                  placeholder="Permanent Address"
                  rows="3"
                />
              ) : (
                <p className="eaprof-address-value">{employeeData.residentialAddress || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="eaprof-emergency-card">
          <h3 className="eaprof-card-title">Emergency Contact</h3>
          <div className="eaprof-emergency-content">
            <div className="eaprof-emergency-item">
              <span className="eaprof-emergency-label">Name:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={employeeData.emergencyContactName}
                  onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                  className="eaprof-edit-input eaprof-edit-small"
                  placeholder="Emergency contact name"
                />
              ) : (
                <span className="eaprof-emergency-value">{employeeData.emergencyContactName || 'N/A'}</span>
              )}
            </div>
            <div className="eaprof-emergency-item">
              <span className="eaprof-emergency-label">Relationship:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={employeeData.emergencyContactRelationship}
                  onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
                  className="eaprof-edit-input eaprof-edit-small"
                  placeholder="Relationship"
                />
              ) : (
                <span className="eaprof-emergency-value">{employeeData.emergencyContactRelationship || 'N/A'}</span>
              )}
            </div>
            <div className="eaprof-emergency-item">
              <span className="eaprof-emergency-label">Phone number:</span>
              {isEditing ? (
                <input
                  type="tel"
                  value={employeeData.emergencyContactPhone}
                  onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                  className="eaprof-edit-input eaprof-edit-small"
                  placeholder="Phone number"
                />
              ) : (
                <span className="eaprof-emergency-value">{employeeData.emergencyContactPhone || 'N/A'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Education and Family Row */}
      <div className="eaprof-two-card-row">
        <div className="eaprof-education-card">
          <div className="eaprof-card-header">
            <h3 className="eaprof-card-title">Education</h3>
            {isEditing && (
              <button className="eaprof-add-education-btn" onClick={addEducation}>
                + Add Education
              </button>
            )}
          </div>
          <div className="eaprof-education-timeline">
            {employeeData.education && employeeData.education.length > 0 ? (
              employeeData.education.map((edu, index) => (
                <div key={edu.id} className="eaprof-education-item">
                  <div className="eaprof-timeline-marker">
                    <div className="eaprof-timeline-circle"></div>
                    {index < employeeData.education.length - 1 && <div className="eaprof-timeline-line"></div>}
                  </div>
                  <div className="eaprof-education-details">
                    {isEditing ? (
                      <div className="eaprof-education-edit-form">
                        <div className="eaprof-education-row">
                          <select
                            value={edu.level || ''}
                            onChange={(e) => handleEducationChange(edu.id, 'level', e.target.value)}
                            className="eaprof-edit-select"
                          >
                            <option value="">Select Education Level</option>
                            <option value="Elementary">Elementary</option>
                            <option value="Junior High School">Junior High School</option>
                            <option value="Senior High School">Senior High School</option>
                            <option value="Tertiary">Tertiary</option>
                          </select>
                          <input
                            type="text"
                            value={edu.school || ''}
                            onChange={(e) => handleEducationChange(edu.id, 'school', e.target.value)}
                            className="eaprof-edit-input"
                            placeholder="School Name"
                          />
                        </div>
                        <div className="eaprof-education-row">
                          <input
                            type="text"
                            value={edu.address || ''}
                            onChange={(e) => handleEducationChange(edu.id, 'address', e.target.value)}
                            className="eaprof-edit-input"
                            placeholder="School Address"
                          />
                        </div>
                        {(edu.level === 'Tertiary' || edu.level === 'Senior High School') && (
                          <div className="eaprof-education-row">
                            <input
                              type="text"
                              value={edu.field || ''}
                              onChange={(e) => handleEducationChange(edu.id, 'field', e.target.value)}
                              className="eaprof-edit-input"
                              placeholder="Field of Study"
                            />
                          </div>
                        )}
                        <div className="eaprof-education-row eaprof-date-row">
                          <input
                            type="number"
                            value={edu.startYear || ''}
                            onChange={(e) => handleEducationChange(edu.id, 'startYear', e.target.value)}
                            className="eaprof-edit-input eaprof-year-input"
                            placeholder="Start Year"
                            min="1900"
                            max="2030"
                          />
                          <span className="eaprof-date-separator">-</span>
                          <input
                            type="number"
                            value={edu.endYear || ''}
                            onChange={(e) => handleEducationChange(edu.id, 'endYear', e.target.value)}
                            className="eaprof-edit-input eaprof-year-input"
                            placeholder="End Year"
                            min="1900"
                            max="2030"
                          />
                          <button
                            className="eaprof-remove-btn"
                            onClick={() => removeEducation(edu.id)}
                            type="button"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="eaprof-education-degree">{edu.level} - {edu.school}</h4>
                        <p className="eaprof-education-address">{edu.address}</p>
                        {(edu.level === 'Tertiary' || edu.level === 'Senior High School') && edu.field && (
                          <p className="eaprof-education-field">{edu.field}</p>
                        )}
                        <p className="eaprof-education-year">{edu.startYear} - {edu.endYear}</p>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="eaprof-no-data">No education information available</p>
            )}
          </div>
        </div>

        <div className="eaprof-family-card">
          <div className="eaprof-card-header">
            <h3 className="eaprof-card-title">Family</h3>
            {isEditing && (
              <button className="eaprof-add-family-btn" onClick={addFamilyMember}>
                + Add Member
              </button>
            )}
          </div>
          <div className="eaprof-family-table">
            <div className="eaprof-table-header">
              <div className="eaprof-table-cell eaprof-header-cell">Family type</div>
              <div className="eaprof-table-cell eaprof-header-cell">Person name</div>
              {isEditing && <div className="eaprof-table-cell eaprof-header-cell">Action</div>}
            </div>
            {employeeData.family && employeeData.family.length > 0 ? (
              employeeData.family.map((member) => (
                <div key={member.id} className="eaprof-table-row">
                  <div className="eaprof-table-cell">
                    {isEditing ? (
                      <input
                        type="text"
                        value={member.type || ''}
                        onChange={(e) => handleFamilyChange(member.id, 'type', e.target.value)}
                        className="eaprof-edit-input eaprof-edit-table"
                        placeholder="Family type"
                      />
                    ) : (
                      member.type || 'N/A'
                    )}
                  </div>
                  <div className="eaprof-table-cell eaprof-family-name-cell">
                    {isEditing ? (
                      <div className="eaprof-family-name-container">
                        <input
                          type="text"
                          value={member.name || ''}
                          onChange={(e) => handleFamilyChange(member.id, 'name', e.target.value)}
                          className="eaprof-edit-input eaprof-edit-table"
                          placeholder="Person name"
                        />
                      </div>
                    ) : (
                      member.name || 'N/A'
                    )}
                  </div>
                  {isEditing && (
                    <div className="eaprof-table-cell eaprof-family-name-cell">
                      <button
                        className="eaprof-remove-btn eaprof-remove-family-btn"
                        onClick={() => removeFamilyMember(member.id)}
                        type="button"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="eaprof-table-row">
                <div className="eaprof-table-cell" colSpan="2">No family information available</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Personal Info':
        return renderPersonalInfo();
      case 'Employee Details':
      case 'Applicant Details':
        return <EADetails userLevel={userLevel} />;
      default:
        return renderPersonalInfo();
    }
  };

  if (loading) {
    return (
      <div className="eaprof-details-container">
        <div className="eaprof-loading">Loading profile data...</div>
      </div>
    );
  }

  return (
    <div className="eaprof-details-container">
      {/* Header Card */}
      <div className="eaprof-header-card">
        <div className="eaprof-header-top">
          <div className="eaprof-title-section">
            <h1 className="eaprof-main-title">My Profile</h1>
            <p className="eaprof-breadcrumb">Profile / {userLevel === 'employee' ? 'Employee' : 'Applicant'} Information</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="eaprof-tabs-container">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`eaprof-tab ${activeTab === tab ? 'eaprof-tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Header - Only show for Personal Info tab */}
      {activeTab === 'Personal Info' && (
        <div className="eaprof-content-header">
          <h2 className="eaprof-section-title">{activeTab}</h2>
          <div className="eaprof-edit-actions">
            {isEditing ? (
              <>
                <button 
                  className="eaprof-save-btn" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="eaprof-cancel-btn" onClick={handleCancel}>
                  <X size={16} />
                  Cancel
                </button>
              </>
            ) : (
              <button className="eaprof-edit-btn" onClick={handleEditClick}>
                <Edit3 size={16} />
                Edit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default EAProfile;