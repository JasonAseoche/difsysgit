import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../components/ApplicantLayout/UploadResume.css';

const UploadResume = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  
  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    message: '',
    type: 'info' // 'success', 'error', 'warning', 'info'
  });
  
  const [formData, setFormData] = useState({
    position: '',
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    contactNumber: '',
    age: '',
    gender: '',
    citizenship: '',
    birthday: '',
    address: '',
    resume: null
  });

  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];
  const API_URL = 'http://localhost/difsysapi/application_upload.php';

  // Custom Alert Function
  const showAlert = (message, type = 'info') => {
    setAlertConfig({
      isOpen: true,
      message,
      type
    });
  };

  const closeAlert = () => {
    setAlertConfig({
      ...alertConfig,
      isOpen: false
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    document.title = "DIFSYS | UPLOAD RESUME";
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
      
      const response = await axios.get(API_URL, {
        params: userId ? { user_id: userId } : {}
      });
      
      if (response.data.success) {
        if (response.data.data.positions) {
          setPositions(response.data.data.positions);
        }
        
        if (response.data.data.user) {
          const userData = response.data.data.user;
          setFormData(prev => ({
            ...prev,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || ''
          }));
        }
      } else {
        console.error('Failed to fetch data:', response.data.message);
        showAlert('Failed to load application data. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showAlert('Error loading application data. Please check your connection.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDFPreview = async (file) => {
  try {
    const fileUrl = URL.createObjectURL(file);
    setPreviewUrl(fileUrl);
    return fileUrl;
  } catch (error) {
    console.error('Error generating preview:', error);
    return null;
  }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (file) {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      showAlert('Please select a PDF, DOC, or DOCX file.', 'warning');
      e.target.value = '';
      return;
    }
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showAlert('File size must be less than 10MB.', 'warning');
      e.target.value = '';
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      resume: file
    }));

    // Generate preview and show modal
    if (file.type === 'application/pdf') {
      await generatePDFPreview(file);
      setShowPreviewModal(true);
    } else {
      // For DOC/DOCX files, just show the modal without preview
      setPreviewUrl(null);
      setShowPreviewModal(true);
    }
  }
};

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      showAlert('Please select a PDF, DOC, or DOCX file.', 'warning');
      return;
    }
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showAlert('File size must be less than 10MB.', 'warning');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      resume: file
    }));

    // Generate preview and show modal
    if (file.type === 'application/pdf') {
      await generatePDFPreview(file);
      setShowPreviewModal(true);
    } else {
      setPreviewUrl(null);
      setShowPreviewModal(true);
    }
  }
};

  const validateForm = () => {
    const requiredFields = ['position', 'firstName', 'lastName', 'email'];
    for (let field of requiredFields) {
      if (!formData[field]) {
        showAlert(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`, 'warning');
        return false;
      }
    }
    
    if (!formData.resume) {
      showAlert('Please upload your resume.', 'warning');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showAlert('Please enter a valid email address.', 'warning');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
      if (!userId) {
        showAlert('User session not found. Please log in again.', 'error');
        return;
      }
      
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'resume' && formData[key]) {
          formDataToSend.append('resume', formData[key]);
        } else if (key !== 'resume') {
          formDataToSend.append(key, formData[key] || '');
        }
      });
      
      formDataToSend.append('user_id', userId);
      
      const response = await axios.post(API_URL, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        // Send notification to HR
        try {
          await fetch('http://localhost/difsysapi/notifications_api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: 0,
              user_role: 'HR',
              type: 'resume_uploaded',
              title: 'New Resume Uploaded',
              message: `${formData.firstName} ${formData.lastName} has uploaded their resume for the position: ${formData.position}`,
              related_id: userId,
              related_type: 'applicant'
            })
          });
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      
        showAlert('Application submitted successfully!', 'success');
        setTimeout(() => {
          navigate('/dashboard-applicant');
        }, 2000);
      } else {
        showAlert('Error submitting application: ' + response.data.message, 'error');
      }
      
    } catch (error) {
      console.error('Error submitting application:', error);
      showAlert('Error submitting application. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplaceFile = () => {
  setShowPreviewModal(false);
  setPreviewUrl(null);
  setFormData(prev => ({ ...prev, resume: null }));
  document.getElementById('upload-resume-file-input').click();
};

const handleSaveAndSubmit = () => {
  setShowPreviewModal(false);
  setShowConfirmModal(true);
};

const handleConfirmSubmit = () => {
  setShowConfirmModal(false);
  handleSubmit();
};

const closePreviewModal = () => {
  setShowPreviewModal(false);
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }
};

  if (isLoading) {
    return (
      <div className="upload-resume-main-container">
        <div className="upload-resume-form-card">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading application form...</p>
          </div>
        </div>
      </div>
    );
  }

 

  return (
    <div className="upload-resume-main-container">
      {/* Custom Alert Modal */}
      {alertConfig.isOpen && (
        <div className="custom-alert-overlay" onClick={closeAlert}>
          <div className="custom-alert-modal" onClick={(e) => e.stopPropagation()}>
            <div className="custom-alert-body">
              <div className={`custom-alert-icon custom-alert-icon-${alertConfig.type}`}>
                {alertConfig.type === 'success' && '✓'}
                {alertConfig.type === 'error' && '✕'}
                {alertConfig.type === 'warning' && '⚠'}
                {alertConfig.type === 'info' && 'i'}
              </div>
              <div className="custom-alert-content">
                <h3 className="custom-alert-title">
                  {alertConfig.type === 'success' && 'Success'}
                  {alertConfig.type === 'error' && 'Error'}
                  {alertConfig.type === 'warning' && 'Warning'}
                  {alertConfig.type === 'info' && 'Information'}
                </h3>
                <p className="custom-alert-message">{alertConfig.message}</p>
              </div>
            </div>
            <div className="custom-alert-footer">
              <button 
                className={`custom-alert-btn custom-alert-btn-${alertConfig.type}`}
                onClick={closeAlert}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`upload-resume-form-card ${currentStep === 2 ? 'upload-resume-expanded' : ''} ${currentStep === 3 ? 'upload-resume-upload-card' : ''}`}>
        {currentStep > 1 && (
          <button className="upload-resume-back-btn" onClick={handleBack}>
             ← Back 
          </button>
        )}
        
        {currentStep === 1 && (
          <div className="upload-resume-step-one">
            <h2 className="upload-resume-main-title">What are you applying for</h2>
            <div className="upload-resume-dropdown-wrapper">
              <select
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="upload-resume-position-select"
              >
                <option value="">Select a position</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.title}>
                    {position.title}
                  </option>
                ))}
              </select>
            </div>
            <button 
              className="upload-resume-next-btn" 
              onClick={handleNext}
              disabled={!formData.position}
            >
              Next
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="upload-resume-step-two">
            <h2 className="upload-resume-main-title">Fill Up The Form</h2>
            
            <div className="upload-resume-form-row">
              <div className="upload-resume-field-group">
                <label className="upload-resume-field-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="upload-resume-text-input"
                  required
                />
              </div>
              <div className="upload-resume-field-group">
                <label className="upload-resume-field-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="upload-resume-text-input"
                  required
                />
              </div>
              <div className="upload-resume-field-group">
                <label className="upload-resume-field-label">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  className="upload-resume-text-input"
                />
              </div>
            </div>

            <div className="upload-resume-form-row">
              <div className="upload-resume-field-group">
                <label className="upload-resume-field-label">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="upload-resume-text-input"
                  required
                />
              </div>
              <div className="upload-resume-field-group">
                <label className="upload-resume-field-label">Contact Number</label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  className="upload-resume-text-input"
                />
              </div>
              <div className="upload-resume-field-group">
                <label className="upload-resume-field-label">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="upload-resume-text-input"
                  min="18"
                  max="100"
                />
              </div>
            </div>

            <div className="upload-resume-form-row">
              <div className="upload-resume-field-group">
                <label className="upload-resume-field-label">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="upload-resume-select-input"
                >
                  <option value="">Select gender</option>
                  {genderOptions.map((gender, index) => (
                    <option key={index} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
              </div>
              <div className="upload-resume-field-group">
                <label className="upload-resume-field-label">Citizenship</label>
                <input
                  type="text"
                  name="citizenship"
                  value={formData.citizenship}
                  onChange={handleInputChange}
                  className="upload-resume-text-input"
                />
              </div>
              <div className="upload-resume-field-group">
                <label className="upload-resume-field-label">Birthday</label>
                <input
                  type="date"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleInputChange}
                  className="upload-resume-text-input"
                />
              </div>
            </div>

            <div className="upload-resume-form-row upload-resume-full-width">
              <div className="upload-resume-field-group">
                <label className="upload-resume-field-label">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="upload-resume-textarea-input"
                  rows="4"
                  placeholder="Enter your complete address"
                />
              </div>
            </div>

            <button className="upload-resume-next-btn" onClick={handleNext}>
              Next
            </button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="upload-resume-step-three">
            <h2 className="upload-resume-main-title">Upload Your Application</h2>
            
            <div 
              className="upload-resume-drop-zone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="upload-resume-file-input"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx"
                className="upload-resume-hidden-input"
              />
              <label htmlFor="upload-resume-file-input" className="upload-resume-drop-label">
                <div className="upload-resume-drop-content">
                  <div className="upload-resume-file-icon">📄</div>
                  {formData.resume ? (
                    <div>
                      <p className="upload-resume-drop-text">File Selected:</p>
                      <p className="upload-resume-file-name">{formData.resume.name}</p>
                      <p className="upload-resume-drop-subtext">
                        Size: {(formData.resume.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="upload-resume-drop-text">Drag and drop your resume here</p>
                      <p className="upload-resume-drop-subtext">or click to browse files</p>
                      <p className="upload-resume-drop-formats">Accepted formats: PDF, DOC, DOCX (Max: 10MB)</p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <button 
              className="upload-resume-submit-btn"
              onClick={handleSubmit}
              disabled={!formData.resume || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        )}
      </div>
      {/* Document Preview Modal */}
{showPreviewModal && formData.resume && (
  <div className="custom-alert-overlay" onClick={closePreviewModal}>
    <div className="upload-resume-preview-modal" onClick={(e) => e.stopPropagation()}>
      <div className="upload-resume-preview-header">
        <h3>Document Preview</h3>
        <button className="upload-resume-close-btn" onClick={closePreviewModal}>×</button>
      </div>
      <div className="upload-resume-preview-content">
        {previewUrl ? (
          <iframe 
            src={previewUrl} 
            title="Document Preview"
            style={{ width: '100%', height: '400px', border: 'none' }}
          />
        ) : (
          <div className="upload-resume-file-info">
            <div className="upload-resume-file-icon">📄</div>
            <h4>{formData.resume.name}</h4>
            <p>File Type: {formData.resume.type}</p>
            <p>Size: {(formData.resume.size / 1024 / 1024).toFixed(2)} MB</p>
            <p className="upload-resume-preview-note">Preview not available for this file type</p>
          </div>
        )}
      </div>
      <div className="upload-resume-preview-actions">
        <button className="upload-resume-replace-btn" onClick={handleReplaceFile}>
          Replace Document
        </button>
        <button className="upload-resume-save-submit-btn" onClick={handleSaveAndSubmit}>
          Save and Submit Application
        </button>
      </div>
    </div>
  </div>
)}

{/* Confirmation Modal */}
{showConfirmModal && (
  <div className="custom-alert-overlay" onClick={() => setShowConfirmModal(false)}>
    <div className="custom-alert-modal" onClick={(e) => e.stopPropagation()}>
      <div className="custom-alert-body">
        <div className="custom-alert-icon custom-alert-icon-info">i</div>
        <div className="custom-alert-content">
          <h3 className="custom-alert-title">Ready to Submit?</h3>
          <p className="custom-alert-message">
            Are you confident that all the information provided is accurate and complete? 
            Once submitted, you may not be able to make changes to your application.
          </p>
        </div>
      </div>
      <div className="custom-alert-footer">
        <button 
          className="custom-alert-btn" 
          style={{ backgroundColor: '#6b7280', marginRight: '12px' }}
          onClick={() => setShowConfirmModal(false)}
        >
          Review Again
        </button>
        <button 
          className="custom-alert-btn custom-alert-btn-info"
          onClick={handleConfirmSubmit}
        >
          Submit Application
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default UploadResume;