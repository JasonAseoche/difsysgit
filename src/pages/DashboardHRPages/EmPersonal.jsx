import React, { useState, useEffect } from 'react';
import { Edit3, Save, X } from 'lucide-react';
import axios from 'axios';
import '../../components/HRLayout/EmployeeDetails.css';
import EmpDetails from './EmpDetails';
import EmpDocuments from './EmpDocuments';
import EmpAttHistory from './EmpAttHistory';

const EmPersonal = () => {
  const [activeTab, setActiveTab] = useState('Personal Info');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Employee data state with proper initial values to avoid controlled/uncontrolled warnings
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
    citizenIdAddress: '', // Home Address
    residentialAddress: '', // Permanent Address
    emergencyContactName: '',
    emergencyContactRelationship: '',
    profileImage: '',  // ← ADD THIS LINE
    emergencyContactPhone: '',
    education: [],
    family: []
  });

  const [originalData, setOriginalData] = useState({});
  
  // Get user ID from URL params, props, or context
  const getEmployeeId = () => {
    // Try to get from URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('user_id');
    if (urlUserId) return parseInt(urlUserId);
    
    // You can also get from props, context, or localStorage
    // For now, let's default to 105 if nothing is found
    return 105;
  };
  
  const userId = getEmployeeId();

  const tabs = [
    'Personal Info',
    'Employee Details', 
    'Documents',
    'Attendance History'
  ];

  // Fetch employee data on component mount
  useEffect(() => {
    fetchEmployeeData();
  }, []);

  useEffect(() => {
    document.title = "DIFSYS | EMPLOYEE INFO";
  }, []);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost/difsysapi/employee_details.php?user_id=${userId}`);
      if (response.data) {
        // Ensure all fields have default values to prevent controlled/uncontrolled warnings
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
          profileImage: response.data.profileImage || '',  // ← ADD THIS LINE
          education: response.data.education || [],
          family: response.data.family || []
        };
        
        setEmployeeData(formattedData);
        setOriginalData(formattedData);
        console.log('Fetched employee data:', formattedData);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      console.error('Error details:', error.response?.data);
      // You can add toast notification here
    } finally {
      setLoading(false);
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
      
      // Format the data properly for the backend
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
      
      console.log('Sending data to save:', dataToSave);
      
      const response = await axios.post('http://localhost/difsysapi/employee_details.php', dataToSave, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Save response:', response.data);
      
      if (response.data.success) {
        setOriginalData({ ...employeeData });
        setIsEditing(false);
        console.log('Employee data saved successfully');
        // You can add success toast notification here
        alert('Employee data saved successfully!');
      } else {
        console.error('Save failed:', response.data);
        alert('Failed to save employee data: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving employee data:', error);
      console.error('Error response:', error.response?.data);
      // You can add error toast notification here
      alert('Error saving employee data: ' + (error.response?.data?.error || error.message));
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

  const renderPersonalInfo = () => (
    <>
      {/* Basic Information Card */}
      <div className="empdet-basic-info-card">
        <h3 className="empdet-card-title">Basic Information</h3>
        <div className="empdet-basic-content">
          <div className="empdet-left-section">
            {!isEditing && (
                <div className="empdet-profile-image">
                  {employeeData.profileImage ? (
                    <img 
                      src={employeeData.profileImage} 
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
                      display: employeeData.profileImage ? 'none' : 'flex',
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
                    {employeeData.name ? employeeData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'N/A'}
                  </div>
                </div>
              )}
            <div className="empdet-profile-details">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={employeeData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="empdet-edit-input empdet-edit-name"
                    placeholder="Full Name"
                    disabled // Name editing might be handled in user accounts
                  />
                  <input
                    type="text"
                    value={employeeData.id || ''}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    className="empdet-edit-input empdet-edit-id"
                    placeholder="Employee ID"
                    disabled // ID should not be editable
                  />
                  <select
                    value={employeeData.gender || ''}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="empdet-edit-select"
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
                    className="empdet-edit-input"
                    placeholder="Email"
                  />
                  <input
                    type="tel"
                    value={employeeData.contact || ''}
                    onChange={(e) => handleInputChange('contact', e.target.value)}
                    className="empdet-edit-input"
                    placeholder="Contact Number"
                  />
                </>
              ) : (
                <>
                  <h4 className="empdet-name">{employeeData.name || 'N/A'}</h4>
                  <p className="empdet-id">{employeeData.id || 'N/A'}</p>
                  <p className="empdet-gender">{employeeData.gender || 'N/A'}</p>
                  <p className="empdet-email">{employeeData.email || 'N/A'}</p>
                  <p className="empdet-contact">{employeeData.contact || 'N/A'}</p>
                </>
              )}
            </div>
          </div>
          
          <div className="empdet-divider"></div>
          
          <div className="empdet-right-section">
            <div className="empdet-info-row">
              <span className="empdet-info-label">Place of birth</span>
              {isEditing ? (
                <input
                  type="text"
                  value={employeeData.placeOfBirth}
                  onChange={(e) => handleInputChange('placeOfBirth', e.target.value)}
                  className="empdet-edit-input empdet-edit-small"
                  placeholder="Place of birth"
                />
              ) : (
                <span className="empdet-info-value">{employeeData.placeOfBirth || 'N/A'}</span>
              )}
            </div>
            <div className="empdet-info-row">
              <span className="empdet-info-label">Birth date</span>
              {isEditing ? (
                <input
                  type="date"
                  value={employeeData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className="empdet-edit-input empdet-edit-small"
                />
              ) : (
                <span className="empdet-info-value">{formatDateForDisplay(employeeData.birthDate)}</span>
              )}
            </div>
            <div className="empdet-info-row">
              <span className="empdet-info-label">Age</span>
              <span className="empdet-info-value">{calculateAge(employeeData.birthDate)} years old</span>
            </div>
            <div className="empdet-info-row">
              <span className="empdet-info-label">Marital Status</span>
              {isEditing ? (
                <select
                  value={employeeData.maritalStatus}
                  onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                  className="empdet-edit-select empdet-edit-small"
                >
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              ) : (
                <span className="empdet-info-value">{employeeData.maritalStatus || 'N/A'}</span>
              )}
            </div>
            <div className="empdet-info-row">
              <span className="empdet-info-label">Religion</span>
              {isEditing ? (
                <input
                  type="text"
                  value={employeeData.religion}
                  onChange={(e) => handleInputChange('religion', e.target.value)}
                  className="empdet-edit-input empdet-edit-small"
                  placeholder="Religion"
                />
              ) : (
                <span className="empdet-info-value">{employeeData.religion || 'N/A'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Address and Emergency Contact Row */}
      <div className="empdet-two-card-row">
        <div className="empdet-address-card">
          <h3 className="empdet-card-title">Address</h3>
          <div className="empdet-address-content">
            <div className="empdet-address-item">
              <span className="empdet-address-label">Home Address:</span>
              {isEditing ? (
                <textarea
                  value={employeeData.citizenIdAddress}
                  onChange={(e) => handleInputChange('citizenIdAddress', e.target.value)}
                  className="empdet-edit-textarea"
                  placeholder="Home Address"
                  rows="3"
                />
              ) : (
                <p className="empdet-address-value">{employeeData.citizenIdAddress || 'N/A'}</p>
              )}
            </div>
            <div className="empdet-address-item">
              <span className="empdet-address-label">Permanent Address:</span>
              {isEditing ? (
                <textarea
                  value={employeeData.residentialAddress}
                  onChange={(e) => handleInputChange('residentialAddress', e.target.value)}
                  className="empdet-edit-textarea"
                  placeholder="Permanent Address"
                  rows="3"
                />
              ) : (
                <p className="empdet-address-value">{employeeData.residentialAddress || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="empdet-emergency-card">
          <h3 className="empdet-card-title">Emergency Contact</h3>
          <div className="empdet-emergency-content">
            <div className="empdet-emergency-item">
              <span className="empdet-emergency-label">Name:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={employeeData.emergencyContactName}
                  onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                  className="empdet-edit-input empdet-edit-small"
                  placeholder="Emergency contact name"
                />
              ) : (
                <span className="empdet-emergency-value">{employeeData.emergencyContactName || 'N/A'}</span>
              )}
            </div>
            <div className="empdet-emergency-item">
              <span className="empdet-emergency-label">Relationship:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={employeeData.emergencyContactRelationship}
                  onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
                  className="empdet-edit-input empdet-edit-small"
                  placeholder="Relationship"
                />
              ) : (
                <span className="empdet-emergency-value">{employeeData.emergencyContactRelationship || 'N/A'}</span>
              )}
            </div>
            <div className="empdet-emergency-item">
              <span className="empdet-emergency-label">Phone number:</span>
              {isEditing ? (
                <input
                  type="tel"
                  value={employeeData.emergencyContactPhone}
                  onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                  className="empdet-edit-input empdet-edit-small"
                  placeholder="Phone number"
                />
              ) : (
                <span className="empdet-emergency-value">{employeeData.emergencyContactPhone || 'N/A'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Education and Family Row */}
      <div className="empdet-two-card-row">
        <div className="empdet-education-card">
          <div className="empdet-card-header">
            <h3 className="empdet-card-title">Education</h3>
            {isEditing && (
              <button className="empdet-add-education-btn" onClick={addEducation}>
                + Add Education
              </button>
            )}
          </div>
          <div className="empdet-education-timeline">
            {employeeData.education && employeeData.education.length > 0 ? (
              employeeData.education.map((edu, index) => (
                <div key={edu.id} className="empdet-education-item">
                  <div className="empdet-timeline-marker">
                    <div className="empdet-timeline-circle"></div>
                    {index < employeeData.education.length - 1 && <div className="empdet-timeline-line"></div>}
                  </div>
                  <div className="empdet-education-details">
                    {isEditing ? (
                      <div className="empdet-education-edit-form">
                        <div className="empdet-education-row">
                          <select
                            value={edu.level || ''}
                            onChange={(e) => handleEducationChange(edu.id, 'level', e.target.value)}
                            className="empdet-edit-select"
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
                            className="empdet-edit-input"
                            placeholder="School Name"
                          />
                        </div>
                        <div className="empdet-education-row">
                          <input
                            type="text"
                            value={edu.address || ''}
                            onChange={(e) => handleEducationChange(edu.id, 'address', e.target.value)}
                            className="empdet-edit-input"
                            placeholder="School Address"
                          />
                        </div>
                        {(edu.level === 'Tertiary' || edu.level === 'Senior High School') && (
                          <div className="empdet-education-row">
                            <input
                              type="text"
                              value={edu.field || ''}
                              onChange={(e) => handleEducationChange(edu.id, 'field', e.target.value)}
                              className="empdet-edit-input"
                              placeholder="Field of Study"
                            />
                          </div>
                        )}
                        <div className="empdet-education-row empdet-date-row">
                          <input
                            type="number"
                            value={edu.startYear || ''}
                            onChange={(e) => handleEducationChange(edu.id, 'startYear', e.target.value)}
                            className="empdet-edit-input empdet-year-input"
                            placeholder="Start Year"
                            min="1900"
                            max="2030"
                          />
                          <span className="empdet-date-separator">-</span>
                          <input
                            type="number"
                            value={edu.endYear || ''}
                            onChange={(e) => handleEducationChange(edu.id, 'endYear', e.target.value)}
                            className="empdet-edit-input empdet-year-input"
                            placeholder="End Year"
                            min="1900"
                            max="2030"
                          />
                          <button
                            className="empdet-remove-btn"
                            onClick={() => removeEducation(edu.id)}
                            type="button"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="empdet-education-degree">{edu.level} - {edu.school}</h4>
                        <p className="empdet-education-address">{edu.address}</p>
                        {(edu.level === 'Tertiary' || edu.level === 'Senior High School') && edu.field && (
                          <p className="empdet-education-field">{edu.field}</p>
                        )}
                        <p className="empdet-education-year">{edu.startYear} - {edu.endYear}</p>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="empdet-no-data">No education information available</p>
            )}
          </div>
        </div>

        <div className="empdet-family-card">
          <div className="empdet-card-header">
            <h3 className="empdet-card-title">Family</h3>
            {isEditing && (
              <button className="empdet-add-family-btn" onClick={addFamilyMember}>
                + Add Member
              </button>
            )}
          </div>
          <div className="empdet-family-table">
            <div className="empdet-table-header">
              <div className="empdet-table-cell empdet-header-cell">Family type</div>
              <div className="empdet-table-cell empdet-header-cell">Person name</div>
              {isEditing && <div className="empdet-table-cell empdet-header-cell">Action</div>}
            </div>
            {employeeData.family && employeeData.family.length > 0 ? (
              employeeData.family.map((member) => (
                <div key={member.id} className="empdet-table-row">
                  <div className="empdet-table-cell">
                    {isEditing ? (
                      <input
                        type="text"
                        value={member.type || ''}
                        onChange={(e) => handleFamilyChange(member.id, 'type', e.target.value)}
                        className="empdet-edit-input empdet-edit-table"
                        placeholder="Family type"
                      />
                    ) : (
                      member.type || 'N/A'
                    )}
                  </div>
                  <div className="empdet-table-cell empdet-family-name-cell">
                    {isEditing ? (
                      <div className="empdet-family-name-container">
                        <input
                          type="text"
                          value={member.name || ''}
                          onChange={(e) => handleFamilyChange(member.id, 'name', e.target.value)}
                          className="empdet-edit-input empdet-edit-table"
                          placeholder="Person name"
                        />
                      </div>
                    ) : (
                      member.name || 'N/A'
                    )}
                  </div>
                  {isEditing && (
                    <div className="empdet-table-cell empdet-family-name-cell">
                      <button
                        className="empdet-remove-btn empdet-remove-family-btn"
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
              <div className="empdet-table-row">
                <div className="empdet-table-cell" colSpan="2">No family information available</div>
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
        return <EmpDetails />;
      case 'Documents':
        return <EmpDocuments />;
      case 'Attendance History':
        return <EmpAttHistory />;
      default:
        return renderPersonalInfo();
    }
  };

  if (loading) {
    return (
      <div className="empdet-details-container">
        <div className="empdet-loading">Loading employee data...</div>
      </div>
    );
  }

  return (
    <div className="empdet-details-container">
      {/* Header Card */}
      <div className="empdet-header-card">
        <div className="empdet-header-top">
          <div className="empdet-title-section">
            <h1 className="empdet-main-title">Employee</h1>
            <p className="empdet-breadcrumb">Employee / Employee Details</p>
          </div>
          <button className="empdet-back-btn">
            <span className="empdet-back-arrow">←</span>
            Back
          </button>
        </div>
        
        {/* Tabs */}
        <div className="empdet-tabs-container">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`empdet-tab ${activeTab === tab ? 'empdet-tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Header - Only show for Personal Info tab */}
      {activeTab === 'Personal Info' && (
        <div className="empdet-content-header">
          <h2 className="empdet-section-title">{activeTab}</h2>
          <div className="empdet-edit-actions">
            {isEditing ? (
              <>
                <button 
                  className="empdet-save-btn" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="empdet-cancel-btn" onClick={handleCancel}>
                  <X size={16} />
                  Cancel
                </button>
              </>
            ) : (
              <button className="empdet-edit-btn" onClick={handleEditClick}>
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

export default EmPersonal;