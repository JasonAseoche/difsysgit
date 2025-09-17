import React, { useState, useEffect } from 'react';
import { Edit3, Save, X, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { getUserId } from '../../utils/auth';
import './EAProfile.css';

const EADetails = ({ userLevel }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [educationData, setEducationData] = useState([]);

  // Employee basic info state
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    id: '',
    gender: '',
    email: '',
    contact: '',
    position: '',
    dateHired: '',
    applicationDate: '',
    workingDays: '',
    restDay: '',
    workArrangement: '',
    profileImage: ''
  });

  // Background experience state
  const [experienceData, setExperienceData] = useState([]);

  // Skills state
  const [skillsData, setSkillsData] = useState([]);

  const [newSkill, setNewSkill] = useState('');

  // Random colors for skill pills
  const skillColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    '#f97316', '#6366f1', '#14b8a6', '#f43f5e'
  ];

  const getSkillColor = (index) => {
    return skillColors[index % skillColors.length];
  };

  // Get user ID
  useEffect(() => {
    const userIdFromAuth = getUserId();
    if (userIdFromAuth) {
      setUserId(userIdFromAuth);
    } else {
      setError('User ID not found');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = userLevel === 'employee' ? "DIFSYS | EMPLOYEE DETAILS" : "DIFSYS | APPLICANT DETAILS";
  }, [userLevel]);

  // Fetch employee data
  useEffect(() => {
    if (userId && userLevel) {
      fetchEmployeeData();
    }
  }, [userId, userLevel]);

  const getApiEndpoint = () => {
    return userLevel === 'employee' 
      ? 'http://localhost/difsysapi/employee_details.php'
      : 'http://localhost/difsysapi/applicant_details.php';
  };

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = getApiEndpoint();
      
      console.log('=== EADetails fetchEmployeeData START ===');
      console.log('User ID:', userId);
      console.log('User Level:', userLevel);
      console.log('API Endpoint:', endpoint);
      
      // FIXED: Use the correct parameter that matches your PHP handler
      const response = await axios.get(`${endpoint}?user_id=${userId}&type=empdetails`);
      
      console.log('=== EADetails API Response ===');
      console.log('Full Response:', response.data);
      
      if (response.data.error) {
        setError(response.data.error);
      } else {
        // FIXED: Handle the nested response structure from empdetails endpoint
        const responseData = response.data;
        
        console.log('=== EADetails Setting Data ===');
        console.log('Basic Info from response:', responseData.basicInfo);
        console.log('Background Experience:', responseData.backgroundExperience);
        console.log('Skills:', responseData.skills);
        console.log('Education:', responseData.education);
        
        // Set basic info
        if (responseData.basicInfo) {
          setBasicInfo({
            name: responseData.basicInfo.name || '',
            id: responseData.basicInfo.id || '',
            gender: responseData.basicInfo.gender || '',
            email: responseData.basicInfo.email || '',
            contact: responseData.basicInfo.contact || '',
            position: responseData.basicInfo.position || '',
            dateHired: responseData.basicInfo.dateHired || '',
            applicationDate: userLevel === 'applicant' ? (responseData.basicInfo.applicationDate || responseData.basicInfo.dateHired || '') : '',
            workingDays: responseData.basicInfo.workingDays || '',
            restDay: responseData.basicInfo.restDay || '',
            workArrangement: responseData.basicInfo.workArrangement || '',
            profileImage: responseData.basicInfo.profileImage || ''
          });
        }
        
        // Set experience data - initialize with one empty entry if none exists
        if (responseData.backgroundExperience && responseData.backgroundExperience.length > 0) {
          setExperienceData(responseData.backgroundExperience);
        } else {
          setExperienceData([{
            company: '',
            position: '',
            duration: '',
            description: ''
          }]);
        }
        
        // Set skills data
        setSkillsData(responseData.skills || []);
        
        // Set education data
        setEducationData(responseData.education || []);
        
        console.log('=== EADetails Data Set Complete ===');
      }
    } catch (err) {
      console.error('=== EADetails Error ===');
      console.error('Error fetching profile data:', err);
      
      // Provide more specific error messages
      if (err.response) {
        // Server responded with error status
        setError(`Server Error: ${err.response.data?.error || err.response.statusText}`);
      } else if (err.request) {
        // Request was made but no response received
        setError('Network Error: Unable to connect to server');
      } else {
        // Something else happened
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
      console.log('=== EADetails fetchEmployeeData END ===');
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      setError(null);
      
      // FIXED: Prepare data in the format expected by your PHP handler
      const saveData = {
        user_id: userId,
        backgroundExperience: experienceData.filter(exp => 
          exp.company || exp.position || exp.duration || exp.description
        ), // Only save non-empty experiences
        skills: skillsData,
        education: educationData
      };

      const endpoint = getApiEndpoint();
      console.log('=== Saving Data ===');
      console.log('Save Data:', saveData);
      console.log('Endpoint:', endpoint);
      
      // FIXED: Use POST request with the correct parameter format
      const response = await axios.post(`${endpoint}?type=empdetails`, saveData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Save Response:', response.data);
      
      if (response.data.success) {
        setIsEditing(false);
        setSaveSuccess(true);
        
        // Refresh data to ensure consistency
        await fetchEmployeeData();
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
        
      } else {
        setError(response.data.error || 'Failed to save profile details');
      }
    } catch (err) {
      console.error('Error saving profile data:', err);
      
      // Provide more specific error messages
      if (err.response) {
        setError(`Save Error: ${err.response.data?.error || err.response.statusText}`);
      } else if (err.request) {
        setError('Network Error: Unable to save data');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    // Reset to original data by refetching
    fetchEmployeeData();
  };

  const handleExperienceChange = (index, field, value) => {
    const updatedExperience = [...experienceData];
    updatedExperience[index][field] = value;
    setExperienceData(updatedExperience);
  };

  const addExperience = () => {
    setExperienceData([...experienceData, {
      company: '',
      position: '',
      duration: '',
      description: ''
    }]);
  };

  const removeExperience = (index) => {
    if (experienceData.length > 1) {
      const updatedExperience = experienceData.filter((_, i) => i !== index);
      setExperienceData(updatedExperience);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skillsData.includes(newSkill.trim())) {
      setSkillsData([...skillsData, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (index) => {
    const updatedSkills = skillsData.filter((_, i) => i !== index);
    setSkillsData(updatedSkills);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addSkill();
    }
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
    const initials = getInitials(basicInfo.name);
    const avatarColor = getAvatarColor(basicInfo.name || 'User');
    
    if (basicInfo.profileImage) {
      return (
        <img 
          src={basicInfo.profileImage.startsWith('http') ? 
            basicInfo.profileImage : 
            `http://localhost/difsysapi/${basicInfo.profileImage}`
          } 
          alt="Profile" 
          className="eaprof-avatar"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      );
    }
    
    return (
      <div 
        className="eaprof-avatar-fallback"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="eaprof-loading">
        <div className="eaprof-loading-spinner"></div>
        <p>Loading profile details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="eaprof-error">
        <p>Error: {error}</p>
        <button onClick={fetchEmployeeData}>Retry</button>
      </div>
    );
  }

  return (
    <>
      {/* Content Header */}
      <div className="eaprof-content-header">
        <h2 className="eaprof-section-title">{userLevel === 'employee' ? 'Employee' : 'Applicant'} Details</h2>
        {!isEditing ? (
          <button className="eaprof-edit-btn" onClick={handleEditClick}>
            <Edit3 size={16} />
            Edit
          </button>
        ) : (
          <div className="eaprof-edit-mode-actions">
            <button 
              className="eaprof-edit-save-btn" 
              onClick={handleSaveClick}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="eaprof-save-spinner"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save
                </>
              )}
            </button>
            <button className="eaprof-edit-cancel-btn" onClick={handleCancelClick}>
              <X size={16} />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {saveSuccess && (
        <div className="eaprof-message-overlay">
          <div className="eaprof-success-modal">
            <div className="eaprof-success-header">
              <div className="eaprof-success-icon-large">✓</div>
              <h3>Success!</h3>
              <p>Profile details saved successfully</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="eaprof-message-overlay">
          <div className="eaprof-error-modal">
            <div className="eaprof-error-header">
              <div className="eaprof-error-icon-large">⚠</div>
              <h3>Error</h3>
              <p>{error}</p>
              <button 
                className="eaprof-modal-close-btn"
                onClick={() => setError(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {saving && (
        <div className="eaprof-message-overlay">
          <div className="eaprof-loading-modal">
            <div className="eaprof-loading-header">
              <div className="eaprof-save-spinner-large"></div>
              <h3>Saving...</h3>
              <p>Please wait while we save your changes</p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information Card */}
      <div className="eaprof-basic-info-card">
        <h3 className="eaprof-card-title">Basic Information</h3>
        <div className="eaprof-basic-content">
          <div className="eaprof-left-section">
            <div className="eaprof-profile-image">
              {renderProfileImage()}
            </div>
            <div className="eaprof-profile-details">
              <h4 className="eaprof-name">{basicInfo.name || 'N/A'}</h4>
              <p className="eaprof-id">ID: {basicInfo.id || 'N/A'}</p>
              <p className="eaprof-gender">Gender: {basicInfo.gender || 'N/A'}</p>
              <p className="eaprof-email">Email: {basicInfo.email || 'N/A'}</p>
              <p className="eaprof-contact">Contact: {basicInfo.contact || 'N/A'}</p>
            </div>
          </div>
          
          <div className="eaprof-divider"></div>
          
          <div className="eaprof-right-section">
            {isEditing ? (
              <>
                <div className="eaprof-info-row">
                  <span className="eaprof-info-label">{userLevel === 'applicant' ? 'Applying Position' : 'Position'}</span>
                  <input
                    type="text"
                    className="eaprof-basic-edit-input"
                    value={basicInfo.position || ''}
                    onChange={(e) => setBasicInfo({...basicInfo, position: e.target.value})}
                    disabled={userLevel === 'employee'}
                  />
                </div>
                {userLevel === 'employee' ? (
                  <>
                    <div className="eaprof-info-row">
                      <span className="eaprof-info-label">Date Hired</span>
                      <input
                        type="date"
                        className="eaprof-basic-edit-input"
                        value={basicInfo.dateHired || ''}
                        disabled={true}
                      />
                    </div>
                    <div className="eaprof-info-row">
                      <span className="eaprof-info-label">Working Days</span>
                      <input
                        type="text"
                        className="eaprof-basic-edit-input"
                        value={basicInfo.workingDays || ''}
                        disabled={true}
                      />
                    </div>
                    <div className="eaprof-info-row">
                      <span className="eaprof-info-label">Rest Day</span>
                      <input
                        type="text"
                        className="eaprof-basic-edit-input"
                        value={basicInfo.restDay || ''}
                        disabled={true}
                      />
                    </div>
                    <div className="eaprof-info-row">
                      <span className="eaprof-info-label">Work Arrangement</span>
                      <select
                        className="eaprof-basic-edit-input"
                        value={basicInfo.workArrangement || ''}
                        disabled={true}
                      >
                        <option value="">Select Arrangement</option>
                        <option value="On-Site">On-Site</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="eaprof-info-row">
                    <span className="eaprof-info-label">Application Date</span>
                    <input
                      type="date"
                      className="eaprof-basic-edit-input"
                      value={basicInfo.applicationDate || ''}
                      disabled={true}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="eaprof-info-row">
                  <span className="eaprof-info-label">{userLevel === 'applicant' ? 'Applying Position' : 'Position'}</span>
                  <span className="eaprof-info-value">{basicInfo.position || 'N/A'}</span>
                </div>
                {userLevel === 'employee' ? (
                  <>
                    <div className="eaprof-info-row">
                      <span className="eaprof-info-label">Date Hired</span>
                      <span className="eaprof-info-value">{basicInfo.dateHired || 'N/A'}</span>
                    </div>
                    <div className="eaprof-info-row">
                      <span className="eaprof-info-label">Working Days</span>
                      <span className="eaprof-info-value">{basicInfo.workingDays || 'N/A'}</span>
                    </div>
                    <div className="eaprof-info-row">
                      <span className="eaprof-info-label">Rest Day</span>
                      <span className="eaprof-info-value">{basicInfo.restDay || 'N/A'}</span>
                    </div>
                    <div className="eaprof-info-row">
                      <span className="eaprof-info-label">Work Arrangement</span>
                      <span className="eaprof-info-value">{basicInfo.workArrangement || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <div className="eaprof-info-row">
                    <span className="eaprof-info-label">Application Date</span>
                    <span className="eaprof-info-value">{basicInfo.applicationDate || 'N/A'}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Background and Experience Card */}
      <div className="eaprof-full-width-card">
        <div className="eaprof-experience-card-header">
          <h3 className="eaprof-card-title">Background and Experience</h3>
          {isEditing && (
            <button className="eaprof-add-experience-btn" onClick={addExperience}>
              <Plus size={14} />
              Add Experience
            </button>
          )}
        </div>
        <div className="eaprof-experience-timeline">
          {experienceData.length > 0 ? experienceData.map((exp, index) => (
            <div key={index} className="eaprof-experience-item">
              <div className="eaprof-timeline-marker">
                <div className="eaprof-timeline-circle"></div>
                {index < experienceData.length - 1 && <div className="eaprof-timeline-line"></div>}
              </div>
              <div className="eaprof-experience-details">
                {isEditing ? (
                  <div className="eaprof-experience-edit-form">
                    <div className="eaprof-experience-edit-row">
                      <input
                        type="text"
                        className="eaprof-experience-edit-input"
                        placeholder="Position"
                        value={exp.position || ''}
                        onChange={(e) => handleExperienceChange(index, 'position', e.target.value)}
                      />
                      {experienceData.length > 1 && (
                        <button 
                          className="eaprof-experience-remove-btn"
                          onClick={() => removeExperience(index)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="eaprof-experience-edit-row">
                      <input
                        type="text"
                        className="eaprof-experience-edit-input"
                        placeholder="Company"
                        value={exp.company || ''}
                        onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                      />
                    </div>
                    <div className="eaprof-experience-edit-row">
                      <input
                        type="text"
                        className="eaprof-experience-edit-input"
                        placeholder="Duration (e.g., 2020 - Present)"
                        value={exp.duration || ''}
                        onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)}
                      />
                    </div>
                    <div className="eaprof-experience-edit-row">
                      <textarea
                        className="eaprof-experience-edit-textarea"
                        placeholder="Description"
                        value={exp.description || ''}
                        onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h4 className="eaprof-experience-position">{exp.position || 'No position specified'}</h4>
                    <p className="eaprof-experience-company">{exp.company || 'No company specified'}</p>
                    <p className="eaprof-experience-duration">{exp.duration || 'No duration specified'}</p>
                    <p className="eaprof-experience-description">{exp.description || 'No description provided'}</p>
                  </>
                )}
              </div>
            </div>
          )) : (
            <div className="eaprof-no-experience">
              <p>No work experience recorded</p>
              {isEditing && (
                <button className="eaprof-add-experience-btn" onClick={addExperience}>
                  <Plus size={14} />
                  Add Experience
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Education and Skills Row */}
      <div className="eaprof-two-card-row">
        {/* Education Card - Hidden when editing */}
        {!isEditing && (
          <div className="eaprof-education-card">
            <h3 className="eaprof-card-title">Education</h3>
            <div className="eaprof-education-timeline">
              {educationData && educationData.length > 0 ? (
                educationData.map((edu, index) => (
                  <div key={edu.id || index} className="eaprof-education-item">
                    <div className="eaprof-timeline-marker">
                      <div className="eaprof-timeline-circle"></div>
                      {index < educationData.length - 1 && <div className="eaprof-timeline-line"></div>}
                    </div>
                    <div className="eaprof-education-details">
                      <h4 className="eaprof-education-degree">{edu.level} - {edu.school}</h4>
                      <p className="eaprof-education-field">{edu.field}</p>
                      <p className="eaprof-education-year">{edu.startYear} - {edu.endYear}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="eaprof-no-data">No education information available</p>
              )}
            </div>
          </div>
        )}

        <div className={`eaprof-skills-card ${!isEditing ? '' : 'eaprof-skills-full-width'}`}>
          <div className="eaprof-skills-card-header">
            <h3 className="eaprof-card-title">Skills and Traits</h3>
            {isEditing && (
              <div className="eaprof-skill-add-container">
                <input
                  type="text"
                  className="eaprof-skill-add-input"
                  placeholder="Add new skill"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button className="eaprof-skill-add-btn" onClick={addSkill}>
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="eaprof-skills-pills-container">
            {skillsData.length > 0 ? skillsData.map((skill, index) => (
              <div 
                key={index} 
                className={`eaprof-skill-pill ${isEditing ? 'eaprof-skill-pill-editable' : ''}`}
                style={{ backgroundColor: getSkillColor(index) }}
              >
                {skill}
                {isEditing && (
                  <button
                    onClick={() => removeSkill(index)}
                    className="eaprof-skill-remove-btn"
                  >
                    ×
                  </button>
                )}
              </div>
            )) : (
              <div className="eaprof-no-skills">
                <p>No skills recorded</p>
                {isEditing && (
                  <p>Use the input above to add skills</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EADetails;