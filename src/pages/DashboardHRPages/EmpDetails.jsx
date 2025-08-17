import React, { useState, useEffect } from 'react';
import { Edit3, Save, X, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import '../../components/HRLayout/EmployeeDetails.css';

const EmpDetails = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // Add this
  const [saveSuccess, setSaveSuccess] = useState(false); // Add this
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
    workingDays: '',
    restDay: '',
    workArrangement: '',
    profileImage: ''
  });

  // Background experience state - start with empty array
  const [experienceData, setExperienceData] = useState([]);

  // Skills state - start with empty array
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

  // Get user ID from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('user_id');
    if (userIdFromUrl) {
      setUserId(userIdFromUrl);
    } else {
      setError('User ID not found in URL');
      setLoading(false);
    }
  }, []);

   useEffect(() => {
      document.title = "DIFSYS | EMPLOYEE DETAILS";
    }, []);

  // Fetch employee data
  useEffect(() => {
    if (userId) {
      fetchEmployeeData();
    }
  }, [userId]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost/difsysapi/employee_details.php?type=empdetails&user_id=${userId}`);
      
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setBasicInfo(response.data.basicInfo || basicInfo);
        
        // Set experience data or initialize with one empty entry if none exists
        if (response.data.backgroundExperience && response.data.backgroundExperience.length > 0) {
          setExperienceData(response.data.backgroundExperience);
        } else {
          setExperienceData([{
            company: '',
            position: '',
            duration: '',
            description: ''
          }]);
        }
        
        // Set skills data or initialize empty array
        setSkillsData(response.data.skills || []);
        
        // Set education data or initialize empty array
        setEducationData(response.data.education || []); // ← Add this line
        
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching employee data:', err);
      setError('Failed to load employee data: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate) => {
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

  const handleSaveClick = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      setError(null);
      
      const saveData = {
        user_id: userId,
        backgroundExperience: experienceData,
        skills: skillsData,
        education: educationData  // Add this line
      };
  
      const response = await axios.post(`http://localhost/difsysapi/employee_details.php?type=empdetails`, saveData);
      
      if (response.data.success) {
        setIsEditing(false);
        setSaveSuccess(true);
        
        // Hide success message after 2 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
        
      } else {
        setError(response.data.error || 'Failed to save employee details');
      }
    } catch (err) {
      console.error('Error saving employee data:', err);
      setError('Failed to save employee details: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    // Reset to original data
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
    const updatedExperience = experienceData.filter((_, i) => i !== index);
    setExperienceData(updatedExperience);
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

  if (loading) {
    return (
      <div className="empdet-loading">
        <div className="empdet-loading-spinner"></div>
        <p>Loading employee details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empdet-error">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <>
      {/* Content Header */}
      <div className="empdet-content-header">
        <h2 className="empdet-section-title">Employee Details</h2>
        {!isEditing ? (
          <button className="empdet-edit-btn" onClick={handleEditClick}>
            <Edit3 size={16} />
            Edit
          </button>
        ) : (
          <div className="empdet-edit-mode-actions">
            <button 
                className="empdet-edit-save-btn" 
                onClick={handleSaveClick}
                disabled={saving}
                >
                {saving ? (
                    <>
                    <div className="empdet-save-spinner"></div>
                    Saving...
                    </>
                ) : (
                    <>
                    <Save size={16} />
                    Save
                    </>
                )}
                </button>
            <button className="empdet-edit-cancel-btn" onClick={handleCancelClick}>
              <X size={16} />
              Cancel
            </button>
          </div>
        )}
      </div>
        {/* Success Modal */}
            {saveSuccess && (
            <div className="empdet-message-overlay">
                <div className="empdet-success-modal">
                <div className="empdet-success-header">
                    <div className="empdet-success-icon-large">✓</div>
                    <h3>Success!</h3>
                    <p>Employee details saved successfully</p>
                </div>
                </div>
            </div>
            )}

            {/* Error Modal */}
            {error && (
            <div className="empdet-message-overlay">
                <div className="empdet-error-modal">
                <div className="empdet-error-header">
                    <div className="empdet-error-icon-large">⚠</div>
                    <h3>Error</h3>
                    <p>{error}</p>
                    <button 
                    className="empdet-modal-close-btn"
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
            <div className="empdet-message-overlay">
                <div className="empdet-loading-modal">
                <div className="empdet-loading-header">
                    <div className="empdet-save-spinner-large"></div>
                    <h3>Saving...</h3>
                    <p>Please wait while we save your changes</p>
                </div>
                </div>
            </div>
            )}

      {/* Basic Information Card - Now always visible with updated fields */}
      <div className="empdet-basic-info-card">
        <h3 className="empdet-card-title">Basic Information</h3>
        <div className="empdet-basic-content">
          <div className="empdet-left-section">
            <div className="empdet-profile-image">
              {basicInfo.profileImage ? (
                <img 
                  src={basicInfo.profileImage} 
                  alt="Profile" 
                  className="empdet-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="empdet-avatar-fallback"
                style={{
                  display: basicInfo.profileImage ? 'none' : 'flex',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: '#e2e8f0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#64748b'
                }}
              >
                {basicInfo.name ? basicInfo.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'N/A'}
              </div>
            </div>
            <div className="empdet-profile-details">
              <h4 className="empdet-name">{basicInfo.name || 'N/A'}</h4>
              <p className="empdet-id">{basicInfo.id || 'N/A'}</p>
              <p className="empdet-gender">{basicInfo.gender || 'N/A'}</p>
              <p className="empdet-email">{basicInfo.email || 'N/A'}</p>
              <p className="empdet-contact">{basicInfo.contact || 'N/A'}</p>
            </div>
          </div>
          
          <div className="empdet-divider"></div>
          
          <div className="empdet-right-section">
            {isEditing ? (
                <>
                <div className="empdet-info-row">
                    <span className="empdet-info-label">Position</span>
                    <input
                    type="text"
                    className="empdet-basic-edit-input"
                    value={basicInfo.position || ''}
                    onChange={(e) => setBasicInfo({...basicInfo, position: e.target.value})}
                    />
                </div>
                <div className="empdet-info-row">
                    <span className="empdet-info-label">Date Hired</span>
                    <input
                    type="date"
                    className="empdet-basic-edit-input"
                    value={basicInfo.dateHired || ''}
                    onChange={(e) => setBasicInfo({...basicInfo, dateHired: e.target.value})}
                    />
                </div>
                <div className="empdet-info-row">
                    <span className="empdet-info-label">Working Days</span>
                    <input
                    type="text"
                    className="empdet-basic-edit-input"
                    value={basicInfo.workingDays || ''}
                    onChange={(e) => setBasicInfo({...basicInfo, workingDays: e.target.value})}
                    />
                </div>
                <div className="empdet-info-row">
                    <span className="empdet-info-label">Rest Day</span>
                    <input
                    type="text"
                    className="empdet-basic-edit-input"
                    value={basicInfo.restDay || ''}
                    onChange={(e) => setBasicInfo({...basicInfo, restDay: e.target.value})}
                    />
                </div>
                <div className="empdet-info-row">
                    <span className="empdet-info-label">Work Arrangement</span>
                    <select
                    className="empdet-basic-edit-input"
                    value={basicInfo.workArrangement || ''}
                    onChange={(e) => setBasicInfo({...basicInfo, workArrangement: e.target.value})}
                    >
                    <option value="">Select Arrangement</option>
                    <option value="On-Site">On-Site</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    </select>
                </div>
                </>
            ) : (
                <>
                <div className="empdet-info-row">
                    <span className="empdet-info-label">Position</span>
                    <span className="empdet-info-value">{basicInfo.position || 'N/A'}</span>
                </div>
                <div className="empdet-info-row">
                    <span className="empdet-info-label">Date Hired</span>
                    <span className="empdet-info-value">{basicInfo.dateHired || 'N/A'}</span>
                </div>
                <div className="empdet-info-row">
                    <span className="empdet-info-label">Working Days</span>
                    <span className="empdet-info-value">{basicInfo.workingDays || 'N/A'}</span>
                </div>
                <div className="empdet-info-row">
                    <span className="empdet-info-label">Rest Day</span>
                    <span className="empdet-info-value">{basicInfo.restDay || 'N/A'}</span>
                </div>
                <div className="empdet-info-row">
                    <span className="empdet-info-label">Work Arrangement</span>
                    <span className="empdet-info-value">{basicInfo.workArrangement || 'N/A'}</span>
                </div>
                </>
            )}
            </div>
        </div>
      </div>

      {/* Full Width Background and Experience Card */}
      <div className="empdet-full-width-card">
        <div className="empdet-experience-card-header">
          <h3 className="empdet-card-title">Background and Experience</h3>
          {isEditing && (
            <button className="empdet-add-experience-btn" onClick={addExperience}>
              <Plus size={14} />
              Add Experience
            </button>
          )}
        </div>
        <div className="empdet-experience-timeline">
          {experienceData.length > 0 ? experienceData.map((exp, index) => (
            <div key={index} className="empdet-experience-item">
              <div className="empdet-timeline-marker">
                <div className="empdet-timeline-circle"></div>
                {index < experienceData.length - 1 && <div className="empdet-timeline-line"></div>}
              </div>
              <div className="empdet-experience-details">
                {isEditing ? (
                  <div className="empdet-experience-edit-form">
                    <div className="empdet-experience-edit-row">
                      <input
                        type="text"
                        className="empdet-experience-edit-input"
                        placeholder="Position"
                        value={exp.position || ''}
                        onChange={(e) => handleExperienceChange(index, 'position', e.target.value)}
                      />
                      {experienceData.length > 1 && (
                        <button 
                          className="empdet-experience-remove-btn"
                          onClick={() => removeExperience(index)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="empdet-experience-edit-row">
                      <input
                        type="text"
                        className="empdet-experience-edit-input"
                        placeholder="Company"
                        value={exp.company || ''}
                        onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                      />
                    </div>
                    <div className="empdet-experience-edit-row">
                      <input
                        type="text"
                        className="empdet-experience-edit-input"
                        placeholder="Duration (e.g., 2020 - Present)"
                        value={exp.duration || ''}
                        onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)}
                      />
                    </div>
                    <div className="empdet-experience-edit-row">
                      <textarea
                        className="empdet-experience-edit-textarea"
                        placeholder="Description"
                        value={exp.description || ''}
                        onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h4 className="empdet-experience-position">{exp.position || 'No position specified'}</h4>
                    <p className="empdet-experience-company">{exp.company || 'No company specified'}</p>
                    <p className="empdet-experience-duration">{exp.duration || 'No duration specified'}</p>
                    <p className="empdet-experience-description">{exp.description || 'No description provided'}</p>
                  </>
                )}
              </div>
            </div>
          )) : (
            <div className="empdet-no-experience">
              <p>No work experience recorded</p>
              {isEditing && (
                <button className="empdet-add-experience-btn" onClick={addExperience}>
                  <Plus size={14} />
                  Add Experience
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Education and Skills Row */}
      <div className="empdet-two-card-row">
        {/* Education Card - Hidden when editing */}
        {!isEditing && (
        <div className="empdet-education-card">
            <h3 className="empdet-card-title">Education</h3>
            <div className="empdet-education-timeline">
            {educationData && educationData.length > 0 ? (
                educationData.map((edu, index) => (
                <div key={edu.id || index} className="empdet-education-item">
                    <div className="empdet-timeline-marker">
                    <div className="empdet-timeline-circle"></div>
                    {index < educationData.length - 1 && <div className="empdet-timeline-line"></div>}
                    </div>
                    <div className="empdet-education-details">
                    <h4 className="empdet-education-degree">{edu.level} - {edu.school}</h4>
                    <p className="empdet-education-field">{edu.field}</p>
                    <p className="empdet-education-year">{edu.startYear} - {edu.endYear}</p>
                    </div>
                </div>
                ))
            ) : (
                <p className="empdet-no-data">No education information available</p>
            )}
            </div>
        </div>
        )}

        <div className={`empdet-skills-card ${!isEditing ? '' : 'empdet-skills-full-width'}`}>
          <div className="empdet-skills-card-header">
            <h3 className="empdet-card-title">Skills and Traits</h3>
            {isEditing && (
              <div className="empdet-skill-add-container">
                <input
                  type="text"
                  className="empdet-skill-add-input"
                  placeholder="Add new skill"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button className="empdet-skill-add-btn" onClick={addSkill}>
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="empdet-skills-pills-container">
            {skillsData.length > 0 ? skillsData.map((skill, index) => (
              <div 
                key={index} 
                className={`empdet-skill-pill ${isEditing ? 'empdet-skill-pill-editable' : ''}`}
                style={{ backgroundColor: getSkillColor(index) }}
              >
                {skill}
                {isEditing && (
                  <button
                    onClick={() => removeSkill(index)}
                    className="empdet-skill-remove-btn"
                  >
                    ×
                  </button>
                )}
              </div>
            )) : (
              <div className="empdet-no-skills">
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

export default EmpDetails;