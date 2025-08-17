import React, { useState, useEffect } from 'react';
import { Users, Calendar, ChevronDown, X, Upload, Download, Eye, FileText, Image, File, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import '../../components/AccountantLayout/Benefits.css'

const Benefits = () => {
  const [currentView, setCurrentView] = useState('main'); // 'main', 'manage', 'upload', 'history'
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [showViewDetailModal, setShowViewDetailModal] = useState(false);
  const [selectedHistoryEmployee, setSelectedHistoryEmployee] = useState(null);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState('SSS Contribution');
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [submittedFiles, setSubmittedFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [currentBenefitId, setCurrentBenefitId] = useState(null);
  
  const itemsPerPage = 8;
  const API_BASE_URL = 'http://localhost/difsysapi/employee_benefits.php';

  // Benefit types for file upload
  const benefitTypes = [
    'SSS Contribution',
    'Tax Contribution', 
    'PhilHealth Contribution',
    'PAG-IBIG Contribution'
  ];

  // Initialize data on component mount
  useEffect(() => {
    fetchPayrollPeriods();
  }, []);

  // Fetch data when period changes
  useEffect(() => {
    if (selectedPeriod) {
      if (currentView === 'main' || currentView === 'manage') {
        fetchPendingEmployees();
      } else if (currentView === 'history') {
        fetchCompletedEmployees();
      }
    }
  }, [selectedPeriod, currentView]);

  useEffect(() => {
            document.title = "DIFSYS | BENEFITS";
          }, []);

  // API Functions
  const fetchPayrollPeriods = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}?action=payroll_periods`);
      if (response.data.success) {
        setPayrollPeriods(response.data.data);
        // Set the most recent period as default
        if (response.data.data.length > 0) {
          setSelectedPeriod(response.data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
      setError('Failed to load payroll periods');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingEmployees = async () => {
    if (!selectedPeriod) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}?action=pending_employees&period_id=${selectedPeriod.id}`);
      if (response.data.success) {
        const formattedEmployees = response.data.data.map(emp => ({
          ...emp,
          empId: emp.id.toString(),
          payrollPeriod: `${selectedPeriod.dateFrom} to ${selectedPeriod.dateTo}`,
          uploadedBenefits: '0/4', // Will be updated based on actual files
          profileImage: emp.profileImage
        }));
        setEmployees(formattedEmployees);
      }
    } catch (error) {
      console.error('Error fetching pending employees:', error);
      setError('Failed to load pending employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedEmployees = async () => {
    if (!selectedPeriod) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}?action=completed_employees&period_id=${selectedPeriod.id}`);
      if (response.data.success) {
        const formattedEmployees = response.data.data.map(emp => ({
          ...emp,
          empId: emp.id.toString(),
          payrollPeriod: `${selectedPeriod.dateFrom} to ${selectedPeriod.dateTo}`,
          uploadedBenefits: `${emp.uploadedFiles}/4`,
          profileImage: emp.profileImage
        }));
        setHistoryData(formattedEmployees);
      }
    } catch (error) {
      console.error('Error fetching completed employees:', error);
      setError('Failed to load completed employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeBenefitDetails = async (employeeId, periodId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}?action=employee_benefit_details&employee_id=${employeeId}&period_id=${periodId}`);
      if (response.data.success) {
        const employeeData = response.data.data;
        
        // Set current benefit ID or create one if it doesn't exist
        if (employeeData.benefitId) {
          setCurrentBenefitId(employeeData.benefitId);
        } else {
          await createBenefitRecord(employeeId, periodId);
        }
        
        // Convert uploaded files to the format expected by the component
        const files = {};
        employeeData.files.forEach((file, index) => {
          const benefitType = benefitTypes[index] || `File ${index + 1}`;
          files[benefitType] = {
            id: file.id,
            name: file.originalName,
            type: file.fileType,
            size: file.fileSize,
            url: `http://localhost/difsysapi/${file.filePath}`
          };
        });
        
        setUploadedFiles(files);
        setSubmittedFiles(files);
        
        return employeeData;
      }
    } catch (error) {
      console.error('Error fetching employee benefit details:', error);
      setError('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const createBenefitRecord = async (employeeId, periodId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}?action=create_benefit_record`, {
        employee_id: employeeId,
        period_id: periodId
      });
      
      if (response.data.success) {
        setCurrentBenefitId(response.data.benefit_id);
        return response.data.benefit_id;
      }
    } catch (error) {
      console.error('Error creating benefit record:', error);
      throw error;
    }
  };

  const uploadFile = async (benefitType, file) => {
    if (!currentBenefitId) {
      setError('No benefit record found. Please try again.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('benefit_id', currentBenefitId);

    try {
      setUploadingFiles(prev => ({ ...prev, [benefitType]: true }));
      
      const response = await axios.post(`${API_BASE_URL}?action=upload_file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const fileData = {
          id: response.data.file_id,
          name: response.data.original_name,
          type: file.type,
          size: response.data.file_size,
          url: URL.createObjectURL(file)
        };

        setUploadedFiles(prev => ({ ...prev, [benefitType]: fileData }));
        
        // Auto-preview the first uploaded file if no file is currently previewed
        if (!previewFile) {
          setPreviewFile(fileData);
        }
      } else {
        setError(response.data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [benefitType]: false }));
    }
  };

  const deleteFile = async (fileId, benefitType) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}?action=delete_file`, {
        data: { file_id: fileId }
      });

      if (response.data.success) {
        removeFile(benefitType);
      } else {
        setError(response.data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
    }
  };

  const releasePayslip = async () => {
    if (!currentBenefitId) {
      setError('No benefit record found');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}?action=release_payslip`, {
        benefit_id: currentBenefitId
      });

      if (response.data.success) {
        alert('Benefits released successfully!');
        setCurrentView('manage');
        fetchPendingEmployees(); // Refresh the list
      } else {
        setError(response.data.error || 'Failed to release payslip');
      }
    } catch (error) {
      console.error('Error releasing payslip:', error);
      setError('Failed to release payslip');
    }
  };

  // Get current data based on view
  const getCurrentData = () => {
    return currentView === 'history' ? historyData : employees;
  };

  // Pagination logic
  const currentData = getCurrentData();
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);

  // Pagination buttons renderer
  const renderPaginationButtons = () => {
    const buttons = [];
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`ben-pagination-btn ${currentPage === i ? 'ben-pagination-active' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(
        <span key="dots" className="ben-pagination-dots">...</span>
      );
      buttons.push(
        <button
          key={totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className={`ben-pagination-btn ${currentPage === totalPages ? 'ben-pagination-active' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  // Handle view changes
  const handleViewHistory = () => {
    setCurrentView('history');
    setCurrentPage(1);
    if (selectedPeriod) {
      fetchCompletedEmployees();
    }
  };

  const handleManage = () => {
    setCurrentView('manage');
    setCurrentPage(1);
    if (selectedPeriod) {
      fetchPendingEmployees();
    }
  };

  const handleBackToMain = () => {
    setCurrentView('main');
    setCurrentPage(1);
    if (selectedPeriod) {
      fetchPendingEmployees();
    }
  };

  const handleUploadBenefits = async (employee) => {
    setSelectedEmployee(employee);
    setCurrentView('upload');
    setUploadedFiles({});
    setSubmittedFiles({});
    setPreviewFile(null);
    setCurrentBenefitId(null);
    
    // Fetch employee details and existing files
    await fetchEmployeeBenefitDetails(employee.id, selectedPeriod.id);
  };

  // Handle employee details
  const handleEmployeeClick = () => {
    setShowEmployeeDetails(!showEmployeeDetails);
  };

  // Handle view detail modal
  const handleViewDetail = async (employee) => {
    setSelectedHistoryEmployee(employee);
    setSelectedPreviewFile('SSS Contribution');
    setShowViewDetailModal(true);
    
    // Clear previous files first
    setUploadedFiles({});
    
    // Fetch detailed information for the employee and populate files
    const employeeData = await fetchEmployeeBenefitDetails(employee.id, selectedPeriod.id);
    if (employeeData) {
      // Wait a bit for uploadedFiles to be set by fetchEmployeeBenefitDetails
      setTimeout(() => {
        setSelectedHistoryEmployee(prev => ({
          ...prev,
          files: uploadedFiles
        }));
      }, 100);
    }
  };

  // Handle file upload for specific benefit type
  const handleFileUpload = (benefitType, file) => {
    if (!file) return;
    uploadFile(benefitType, file);
  };

  const handleFileInput = (benefitType, e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(benefitType, file);
    }
  };

  const removeFile = (benefitType) => {
    const fileData = uploadedFiles[benefitType];
    if (fileData && fileData.id) {
      deleteFile(fileData.id, benefitType);
    }
    
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[benefitType];
      return newFiles;
    });
    
    setSubmittedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[benefitType];
      return newFiles;
    });

    // Clear preview if the removed file was being previewed
    if (previewFile && uploadedFiles[benefitType] && previewFile.id === uploadedFiles[benefitType].id) {
      setPreviewFile(null);
    }
  };

  // Handle preview file selection
  const handlePreviewFile = (fileData) => {
    setPreviewFile(fileData);
  };

  const handleRelease = () => {
    if (Object.keys(uploadedFiles).length === 0) {
      alert('Please upload at least one file before releasing.');
      return;
    }

    const confirmed = window.confirm('This action cannot be undone. Are you sure you want to release the benefits?');
    if (confirmed) {
      releasePayslip();
    }
  };

  // Navigate preview files in upload section
  const handlePreviousPreviewFile = () => {
    const uploadedFilesList = Object.entries(uploadedFiles);
    if (uploadedFilesList.length === 0) return;
    
    if (!previewFile) {
      setPreviewFile(uploadedFilesList[0][1]);
      return;
    }
    
    const currentIndex = uploadedFilesList.findIndex(([_, fileData]) => fileData.id === previewFile.id);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : uploadedFilesList.length - 1;
    setPreviewFile(uploadedFilesList[previousIndex][1]);
  };

  const handleNextPreviewFile = () => {
    const uploadedFilesList = Object.entries(uploadedFiles);
    if (uploadedFilesList.length === 0) return;
    
    if (!previewFile) {
      setPreviewFile(uploadedFilesList[0][1]);
      return;
    }
    
    const currentIndex = uploadedFilesList.findIndex(([_, fileData]) => fileData.id === previewFile.id);
    const nextIndex = currentIndex < uploadedFilesList.length - 1 ? currentIndex + 1 : 0;
    setPreviewFile(uploadedFilesList[nextIndex][1]);
  };

  // Navigate preview files in modal
  const handlePreviousFile = () => {
    const currentIndex = benefitTypes.indexOf(selectedPreviewFile);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : benefitTypes.length - 1;
    setSelectedPreviewFile(benefitTypes[previousIndex]);
  };

  const handleNextFile = () => {
    const currentIndex = benefitTypes.indexOf(selectedPreviewFile);
    const nextIndex = currentIndex < benefitTypes.length - 1 ? currentIndex + 1 : 0;
    setSelectedPreviewFile(benefitTypes[nextIndex]);
  };

  // Handle period change
  const handlePeriodChange = (e) => {
    const periodId = parseInt(e.target.value);
    const period = payrollPeriods.find(p => p.id === periodId);
    setSelectedPeriod(period);
    setCurrentPage(1);
  };

  // Utility functions
  const getFileIcon = (fileType) => {
    if (fileType === 'application/pdf') return <FileText className="ben-file-icon" />;
    if (fileType && fileType.startsWith('image/')) return <Image className="ben-file-icon" />;
    return <File className="ben-file-icon" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getInitials = (firstName, lastName) => {
    return (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');
  };

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
  const renderAvatar = (person) => {
    const initials = getInitials(person.firstName, person.lastName);
    const avatarColor = getAvatarColor(person.firstName, person.lastName);
    
    return (
      <div 
        className="ben-employee-avatar"
        style={{ backgroundColor: person.profileImage ? 'transparent' : avatarColor }}
      >
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

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'ben-status-pending';
      case 'completed':
        return 'ben-status-completed';
      default:
        return 'ben-status-default';
    }
  };

  // Error notification component
  const ErrorNotification = () => {
    if (!error) return null;
    
    return (
      <div className="ben-error-notification">
        <AlertTriangle size={16} />
        <span>{error}</span>
        <button onClick={() => setError(null)} className="ben-error-close">
          <X size={16} />
        </button>
      </div>
    );
  };

  // View Detail Modal
  const ViewDetailModal = () => {
    if (!showViewDetailModal || !selectedHistoryEmployee) return null;

    const currentFileType = selectedPreviewFile;
    const hasFile = uploadedFiles && uploadedFiles[currentFileType];

    return (
      <div className="ben-modal-overlay" onClick={() => setShowViewDetailModal(false)}>
        <div className="ben-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="ben-modal-header">
            <div className="ben-modal-nav">
              <button onClick={handlePreviousFile} className="ben-nav-btn">
                <ChevronLeft size={20} />
              </button>
              <h3>{selectedPreviewFile}</h3>
              <button onClick={handleNextFile} className="ben-nav-btn">
                <ChevronRight size={20} />
              </button>
            </div>
            <button onClick={() => setShowViewDetailModal(false)} className="ben-close-modal">
              <X size={20} />
            </button>
          </div>
          
          <div className="ben-modal-body">
            <div className="ben-modal-left">
              <div 
                className="ben-modal-avatar"
                style={{ backgroundColor: getAvatarColor(selectedHistoryEmployee.firstName, selectedHistoryEmployee.lastName) }}
              >
                {selectedHistoryEmployee.profileImage ? (
                  <img 
                    src={selectedHistoryEmployee.profileImage.startsWith('http') ? selectedHistoryEmployee.profileImage : `http://localhost/difsysapi/${selectedHistoryEmployee.profileImage}`} 
                    alt={`${selectedHistoryEmployee.firstName} ${selectedHistoryEmployee.lastName}`}
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
                <span style={{ display: selectedHistoryEmployee.profileImage ? 'none' : 'block' }}>
                  {getInitials(selectedHistoryEmployee.firstName, selectedHistoryEmployee.lastName)}
                </span>
              </div>
              <div className="ben-modal-employee-info">
                <h4>{selectedHistoryEmployee.firstName} {selectedHistoryEmployee.lastName}</h4>
                <p>{selectedHistoryEmployee.position}</p>
              </div>
              
              <div className="ben-modal-file-selector">
                <label>Select Document:</label>
                <select 
                  value={selectedPreviewFile} 
                  onChange={(e) => setSelectedPreviewFile(e.target.value)}
                  className="ben-file-selector"
                >
                  {benefitTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="ben-modal-right">
            {uploadedFiles[currentFileType] ? (
                <div className="ben-modal-preview">
                  <div className="ben-file-preview-header">
                    <span>{uploadedFiles[currentFileType].name}</span>
                  </div>
                  <div className="ben-file-preview-content">
                    {hasFile.type === 'application/pdf' ? (
                      <iframe
                        src={hasFile.url}
                        className="ben-pdf-preview"
                        title={hasFile.name}
                        style={{ width: '100%', height: '400px', border: 'none' }}
                      />
                    ) : hasFile.type.startsWith('image/') ? (
                      <div className="ben-image-preview">
                        <img 
                          src={hasFile.url} 
                          alt={hasFile.name}
                          className="ben-preview-image"
                          style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div className="ben-file-preview-placeholder">
                        <FileText size={64} className="ben-preview-file-icon" />
                        <p>Document Preview</p>
                        <span>File: {hasFile.name}</span>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = hasFile.url;
                            link.download = hasFile.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="ben-download-btn"
                        >
                          <Download size={16} />
                          Download File
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="ben-no-file">
                  <File size={64} className="ben-no-file-icon" />
                  <p>No file uploaded for {selectedPreviewFile}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Show loading state
  if (loading && payrollPeriods.length === 0) {
    return (
      <div className="ben-page">
        <div className="ben-loading">
          <div className="ben-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Render upload page
  if (currentView === 'upload') {
    return (
      <div className="ben-page">
        <ErrorNotification />
        <div className="ben-upload-container">
          <div className="ben-upload-grid">
            <div className="ben-employee-section">
              <div className={`ben-employee-header ${showEmployeeDetails ? 'ben-expanded' : ''}`}>
                <div className="ben-employee-basic" onClick={handleEmployeeClick}>
                  {renderAvatar(selectedEmployee)}
                  <div className="ben-employee-info">
                    <h3>{selectedEmployee?.firstName} {selectedEmployee?.lastName}</h3>
                    <p>{selectedEmployee?.position}</p>
                  </div>
                  <ChevronDown className={`ben-expand-icon ${showEmployeeDetails ? 'ben-rotated' : ''}`} />
                </div>
                
                {showEmployeeDetails && selectedEmployee && (
                  <div className="ben-employee-details">
                    <div className="ben-details-grid">
                      <div className="ben-details-section">
                        <h4>Personal Information</h4>
                        <div className="ben-details-item">
                          <span>Email:</span>
                          <span>{selectedEmployee.email}</span>
                        </div>
                        <div className="ben-details-item">
                          <span>Employee ID:</span>
                          <span>{selectedEmployee.empId}</span>
                        </div>
                        <div className="ben-details-item">
                          <span>Position:</span>
                          <span>{selectedEmployee.position}</span>
                        </div>
                        <div className="ben-details-item">
                          <span>Work Arrangement:</span>
                          <span>{selectedEmployee.workarrangement || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="ben-details-section">
                        <h4>Payroll Information</h4>
                        <div className="ben-details-item">
                          <span>Payroll Period:</span>
                          <span>{selectedEmployee.payrollPeriod}</span>
                        </div>
                        <div className="ben-details-item">
                          <span>Status:</span>
                          <span>{selectedEmployee.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* File Upload Section */}
              <div className="ben-upload-section">
                <h4>Upload Benefits Documents</h4>
                <p>Upload documents for each benefit type</p>
                
                <div className="ben-upload-cards">
                  {benefitTypes.map(benefitType => (
                    <div key={benefitType} className="ben-upload-card">
                      <div className="ben-card-content">
                        <div className="ben-card-info">
                          <h5>{benefitType}</h5>
                          {uploadedFiles[benefitType] && (
                            <div className="ben-file-info">
                              <span className="ben-file-name">{uploadedFiles[benefitType].name}</span>
                              <span className="ben-file-size">{formatFileSize(uploadedFiles[benefitType].size)}</span>
                            </div>
                          )}
                          {submittedFiles[benefitType] && (
                            <div className="ben-submitted-badge">
                              <CheckCircle size={16} />
                              Submitted
                            </div>
                          )}
                        </div>
                        
                        <div className="ben-card-actions">
                          {uploadedFiles[benefitType] ? (
                            <div className="ben-file-actions">
                              <button
                                onClick={() => handlePreviewFile(uploadedFiles[benefitType])}
                                className="ben-preview-file-btn"
                              >
                                <Eye size={16} />
                                Preview
                              </button>
                              <button
                                onClick={() => removeFile(benefitType)}
                                className="ben-remove-file-btn"
                              >
                                <X size={16} />
                                Remove
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                className="ben-choose-file-btn"
                                onClick={() => document.getElementById(`file-${benefitType}`).click()}
                                disabled={uploadingFiles[benefitType]}
                              >
                                {uploadingFiles[benefitType] ? 'Uploading...' : 'Choose File'}
                              </button>
                              <input
                                id={`file-${benefitType}`}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.gif,.xlsx,.xls,.doc,.docx"
                                onChange={(e) => handleFileInput(benefitType, e)}
                                style={{ display: 'none' }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                      
                      {uploadingFiles[benefitType] && (
                        <div className="ben-upload-progress">
                          <div className="ben-progress-bar">
                            <div className="ben-progress-fill"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="ben-upload-actions">
                  <button
                    onClick={() => setCurrentView('manage')}
                    className="ben-back-btn"
                  >
                    Back to List
                  </button>
                  <button
                    onClick={handleRelease}
                    className={`ben-release-btn ${Object.keys(uploadedFiles).length === 0 ? 'ben-disabled' : ''}`}
                    disabled={Object.keys(uploadedFiles).length === 0}
                  >
                    Release Benefits
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="ben-preview-section">
              <div className="ben-preview-header-section">
                <h4>File Preview</h4>
                {Object.keys(uploadedFiles).length > 1 && previewFile && (
                  <div className="ben-preview-nav">
                    <button onClick={handlePreviousPreviewFile} className="ben-preview-nav-btn">
                      <ChevronLeft size={20} />
                    </button>
                    <button onClick={handleNextPreviewFile} className="ben-preview-nav-btn">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
              
              {previewFile ? (
                <div className="ben-preview-container">
                  <div className="ben-preview-header">
                    <span>{previewFile.name}</span>
                    <button
                      onClick={() => setPreviewFile(null)}
                      className="ben-close-preview"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {previewFile.type === 'application/pdf' ? (
                    <iframe
                      src={previewFile.url}
                      className="ben-pdf-preview"
                      title={previewFile.name}
                    />
                  ) : previewFile.type.startsWith('image/') ? (
                    <div className="ben-image-preview">
                      <img 
                        src={previewFile.url} 
                        alt={previewFile.name}
                        className="ben-preview-image"
                      />
                    </div>
                  ) : (
                    <div className="ben-file-preview-placeholder">
                      <File size={64} className="ben-preview-file-icon" />
                      <p>{previewFile.name}</p>
                      <span>File type: {previewFile.type}</span>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = previewFile.url;
                          link.download = previewFile.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="ben-download-btn"
                      >
                        <Download size={16} />
                        Download File
                      </button>
                    </div>
                  )}
                </div>
              ) : Object.keys(uploadedFiles).length > 0 ? (
                <div className="ben-uploaded-files-list">
                  <h5>Uploaded Files</h5>
                  <div className="ben-file-list">
                    {Object.entries(uploadedFiles).map(([benefitType, fileData]) => (
                      <div 
                        key={benefitType} 
                        className="ben-file-list-item"
                        onClick={() => handlePreviewFile(fileData)}
                      >
                        <div className="ben-file-list-info">
                          {getFileIcon(fileData.type)}
                          <div>
                            <div className="ben-file-list-name">{fileData.name}</div>
                            <div className="ben-file-list-type">{benefitType}</div>
                          </div>
                        </div>
                        <Eye size={16} className="ben-file-list-preview" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="ben-no-preview">
                  <FileText size={64} className="ben-no-preview-icon" />
                  <p>Select a file to preview</p>
                  <span>Uploaded files will appear here for preview</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Benefits page
  return (
    <div className="ben-page">
      <ErrorNotification />
      
      {/* Header Container */}
      <div className="ben-header-container">
        <div className="ben-header-content">
          <h1 className="ben-title">EMPLOYEE BENEFITS</h1>
          <div className="ben-actions">
            <div className="ben-actions-group">
              <div className="ben-period-picker-box">
                <select
                  value={selectedPeriod?.id || ''}
                  onChange={handlePeriodChange}
                  className="ben-period-select"
                  disabled={loading}
                >
                  <option value="">Select Payroll Period</option>
                  {payrollPeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.dateFrom} to {period.dateTo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="ben-content">
        {/* Action Buttons - Above table */}
        <div className="ben-table-actions">
          {currentView === 'main' && (
            <>
              <button 
                className="ben-history-btn"
                onClick={handleViewHistory}
                disabled={!selectedPeriod}
              >
                <Eye size={16} />
                View History
              </button>
              <button 
                className="ben-manage-btn"
                onClick={handleManage}
                disabled={!selectedPeriod}
              >
                <Upload size={16} />
                Manage
              </button>
            </>
          )}
          
          {(currentView === 'history' || currentView === 'manage') && (
            <button 
              className="ben-back-btn"
              onClick={handleBackToMain}
            >
              ← Back
            </button>
          )}
        </div>

        {/* Table Container */}
        {selectedPeriod ? (
          <div className="ben-table-container">
            <div className="ben-table-header">
              <h2 className="ben-table-title">
                {currentView === 'history' ? 'Benefits History' : 
                 currentView === 'manage' ? 'Manage Employee Benefits' : 
                 'Employee Benefits Overview'}
              </h2>
            </div>

            {loading ? (
              <div className="ben-loading">
                <div className="ben-spinner"></div>
                <p>Loading employees...</p>
              </div>
            ) : (
              <>
                <div className="ben-table-wrapper">
                  <table className="ben-table">
                    <thead>
                      <tr className="ben-table-header-row">
                        <th className="ben-table-th">Employee ID</th>
                        <th className="ben-table-th">Employee Name</th>
                        <th className="ben-table-th">Payroll Period</th>
                        <th className="ben-table-th">Status</th>
                        <th className="ben-table-th">Uploaded Benefits</th>
                        {(currentView === 'history' || currentView === 'manage') && (
                          <th className="ben-table-th">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.length > 0 ? (
                        paginatedData.map((employee) => (
                          <tr key={employee.id} className="ben-table-row">
                            <td className="ben-table-td">{employee.empId}</td>
                            <td className="ben-table-td">
                              <div className="ben-employee-info">
                                {renderAvatar(employee)}
                                <span className="ben-employee-name">
                                  {employee.firstName} {employee.lastName}
                                </span>
                              </div>
                            </td>
                            <td className="ben-table-td">{employee.payrollPeriod}</td>
                            <td className="ben-table-td">
                              <span className={`ben-status-badge ${getStatusClass(employee.status)}`}>
                                {employee.status?.toUpperCase() || 'PENDING'}
                              </span>
                            </td>
                            <td className="ben-table-td">{employee.uploadedBenefits}</td>
                            {(currentView === 'history' || currentView === 'manage') && (
                              <td className="ben-table-td">
                                {currentView === 'manage' ? (
                                  <button
                                    onClick={() => handleUploadBenefits(employee)}
                                    className="ben-table-action-btn ben-upload-btn"
                                  >
                                    <Upload size={16} />
                                    Upload Benefits
                                  </button>
                                ) : currentView === 'history' ? (
                                  <button
                                    onClick={() => handleViewDetail(employee)}
                                    className="ben-table-action-btn ben-view-detail-btn"
                                  >
                                    <Eye size={16} />
                                    View Detail
                                  </button>
                                ) : null}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="ben-table-td ben-no-data">
                            {currentView === 'history' 
                              ? 'No completed benefits found for this period' 
                              : 'No pending benefits found for this period'
                            }
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="ben-pagination-area">
                    <div className="ben-pagination-info">
                      Showing {startIndex + 1} to {Math.min(endIndex, currentData.length)} of {currentData.length} entries
                    </div>
                    <div className="ben-pagination-buttons">
                      {renderPaginationButtons()}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="ben-no-period-selected">
            <Calendar size={64} className="ben-no-period-icon" />
            <h3>Select a Payroll Period</h3>
            <p>Please select a payroll period from the dropdown above to view employee benefits.</p>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      <ViewDetailModal />
    </div>
  );
};

export default Benefits;