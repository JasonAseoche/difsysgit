import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser, getUserId } from '../../utils/auth';
import '../../components/EmployeeLayout/MyPayroll.css';

const MyPayroll = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [payrollData, setPayrollData] = useState([]);
  const [benefitsData, setBenefitsData] = useState([]);
  const [expandedCard, setExpandedCard] = useState(false);
  const [isViewingBenefits, setIsViewingBenefits] = useState(false);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [selectedBenefitsRecord, setSelectedBenefitsRecord] = useState(null);
  const [selectedBenefitsFile, setSelectedBenefitsFile] = useState('SSS Contribution');
  const [benefitsFiles, setBenefitsFiles] = useState({});
  const [employeeInfo, setEmployeeInfo] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    address: '',
    contactNumber: '',
    email: '',
    dateOfBirth: '',
    emp_id: null,
    position: '',
    profile_image: null,
    civilStatus: '',
    gender: '',
    citizenship: '',
    workArrangement: ''
  });
  const [payrollInfo, setPayrollInfo] = useState({
    payPeriodType: 'Semi-Monthly',
    basicPayMonthly: 0,
    basicPaySemiMonthly: 0,
    ratePerDay: 0,
    sssAccount: '',
    philhealthAccount: '',
    pagibigAccount: '',
    tinNumber: '',
    sssContribution: 0,
    philhealthContribution: 0,
    pagibigContribution: 0,
    taxContribution: 0
  });
  const [currentPayrollPeriod, setCurrentPayrollPeriod] = useState({
    display: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const itemsPerPage = 4;
  const API_BASE_URL = 'http://localhost/difsysapi/payroll_files.php';

  // Benefit types for file display
  const benefitTypes = [
    'SSS Contribution',
    'Tax Contribution', 
    'PhilHealth Contribution',
    'PAG-IBIG Contribution'
  ];

  // Initialize employee data
  useEffect(() => {
    const initializeEmployee = async () => {
      try {
        const userId = getUserId();
        const currentUser = getCurrentUser();
        
        if (userId && currentUser) {
          setEmployeeInfo(prev => ({
            ...prev,
            firstName: currentUser.firstName || '',
            lastName: currentUser.lastName || '',
            emp_id: userId
          }));
          
          // Fetch complete employee information from backend
          await fetchEmployeeInfo(userId);
          await fetchCurrentPayrollPeriod();
          await fetchPayrollData(userId);
          await fetchBenefitsData(userId);
        } else {
          setError('User not authenticated');
        }
      } catch (err) {
        console.error('Error initializing employee data:', err);
        setError('Failed to load employee data');
      } finally {
        setLoading(false);
      }
    };

    initializeEmployee();
  }, []);

  useEffect(() => {
            document.title = "DIFSYS | MY PAYROLL";
          }, []);

  // Fetch complete employee information
  const fetchEmployeeInfo = async (empId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=employee_info&emp_id=${empId}`);
      
      if (response.data.success && response.data.data.found) {
        const { employee_info, payroll_info } = response.data.data;
        
        setEmployeeInfo(prev => ({
          ...prev,
          ...employee_info
        }));
        
        setPayrollInfo(prev => ({
          ...prev,
          ...payroll_info
        }));
      } else {
        throw new Error(response.data.message || 'Employee information not found');
      }
    } catch (error) {
      console.error('Error fetching employee info:', error);
      setError('Failed to fetch employee information');
    }
  };

  // Fetch current payroll period
  const fetchCurrentPayrollPeriod = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=current_period`);
      
      if (response.data.success && response.data.data) {
        setCurrentPayrollPeriod({
          display: response.data.data.display,
          id: response.data.data.id,
          prp_id: response.data.data.prp_id
        });
      }
    } catch (error) {
      console.error('Error fetching current payroll period:', error);
    }
  };

  // Fetch payroll periods data
  const fetchPayrollData = async (empId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=payroll_periods&emp_id=${empId}`);
      
      if (response.data.success) {
        setPayrollData(response.data.data || []);
      } else {
        throw new Error(response.data.message || 'Failed to fetch payroll data');
      }
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      setPayrollData([]);
    }
  };

  // Fetch benefits records data
  const fetchBenefitsData = async (empId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=benefits_records&emp_id=${empId}`);
      
      if (response.data.success) {
        setBenefitsData(response.data.data || []);
      } else {
        throw new Error(response.data.message || 'Failed to fetch benefits data');
      }
    } catch (error) {
      console.error('Error fetching benefits data:', error);
      setBenefitsData([]);
    }
  };

  // Fetch benefits files for modal
  const fetchBenefitsFiles = async (empId, periodId) => {
    try {
      setLoading(true);
      
      // Use the new benefits_with_files endpoint for better data structure
      const response = await axios.get(`${API_BASE_URL}?action=benefits_with_files&emp_id=${empId}&period_id=${periodId}`);
      
      if (response.data.success && response.data.data.found) {
        const { files } = response.data.data;
        
        // Transform files array into an object keyed by benefit type
        const filesMap = {};
        
        if (files && files.length > 0) {
          files.forEach((file, index) => {
            // Map files to benefit types (you can improve this mapping logic)
            const benefitType = benefitTypes[index % benefitTypes.length];
            filesMap[benefitType] = {
              id: file.id,
              name: file.original_name,
              type: file.file_type,
              size: file.file_size,
              url: file.download_url
            };
          });
        }
        
        setBenefitsFiles(filesMap);
        return filesMap;
      } else {
        setBenefitsFiles({});
        return {};
      }
    } catch (error) {
      console.error('Error fetching benefits files:', error);
      setBenefitsFiles({});
      return {};
    } finally {
      setLoading(false);
    }
  };

  // Get current data based on view mode
  const getCurrentData = () => {
    return isViewingBenefits ? benefitsData : payrollData;
  };

  const currentData = getCurrentData();
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayData = currentData.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle viewing payslip
  // Handle viewing payslip
const handleViewPayslip = async (id) => {
  try {
    setLoading(true);
    
    // Find the record to get period_id
    const record = payrollData.find(item => item.payrollId === id);
    
    if (!record) {
      alert('Record not found');
      return;
    }

    const response = await axios.get(
      `${API_BASE_URL}?action=view_payslip&emp_id=${employeeInfo.emp_id}&period_id=${record.period_id}`
    );

    if (response.data.success) {
      if (response.data.data.found && response.data.data.download_url) {
        // Create a proper link element instead of using window.open
        const link = document.createElement('a');
        link.href = response.data.data.download_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(response.data.data.message || 'Payslip not yet available for this period');
      }
    } else {
      alert(`Error: ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error viewing payslip:', error);
    alert('Failed to view payslip. Please try again.');
  } finally {
    setLoading(false);
  }
};

  // Handle viewing benefits - show modal instead of direct download
  const handleViewBenefits = async (id) => {
    try {
      // Find the record to get period_id
      const record = benefitsData.find(item => item.benefitsId === id);
      
      if (!record) {
        alert('Record not found');
        return;
      }

      setSelectedBenefitsRecord(record);
      setSelectedBenefitsFile('SSS Contribution');
      setShowBenefitsModal(true);
      
      // Fetch benefits files for this record
      await fetchBenefitsFiles(employeeInfo.emp_id, record.period_id);
    } catch (error) {
      console.error('Error viewing benefits:', error);
      alert('Failed to load benefits. Please try again.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCardClick = () => {
    setExpandedCard(!expandedCard);
  };

  const handleOverlayClick = () => {
    setExpandedCard(false);
  };

  // Toggle between payroll and benefits view
  const handleToggleView = () => {
    setIsViewingBenefits(!isViewingBenefits);
    setCurrentPage(1); // Reset to first page when switching views
  };

  // Navigate benefits files in modal
  const handlePreviousBenefitsFile = React.useCallback(() => {
    const currentIndex = benefitTypes.indexOf(selectedBenefitsFile);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : benefitTypes.length - 1;
    setSelectedBenefitsFile(benefitTypes[previousIndex]);
  }, [selectedBenefitsFile]);

  const handleNextBenefitsFile = React.useCallback(() => {
    const currentIndex = benefitTypes.indexOf(selectedBenefitsFile);
    const nextIndex = currentIndex < benefitTypes.length - 1 ? currentIndex + 1 : 0;
    setSelectedBenefitsFile(benefitTypes[nextIndex]);
  }, [selectedBenefitsFile]);

  const renderPaginationButtons = () => {
    const buttons = [];
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`myPayrollPaginationBtn ${currentPage === i ? 'myPayrollPaginationActive' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(
        <span key="dots" className="myPayrollPaginationDots">...</span>
      );
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`myPayrollPaginationBtn ${currentPage === totalPages ? 'myPayrollPaginationActive' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  // Format currency values
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Get initials for avatar
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

  // Benefits Modal Component
  const BenefitsModal = () => {
    if (!showBenefitsModal || !selectedBenefitsRecord) return null;
  
    const currentFileType = selectedBenefitsFile;
    const hasFile = benefitsFiles[currentFileType];
  
    // Memoize the modal content to prevent unnecessary re-renders
    const modalContent = React.useMemo(() => {
      return (
        <div className="myPayrollBenefitsModalContent" onClick={(e) => e.stopPropagation()}>
          <div className="myPayrollBenefitsModalHeader">
            <div className="myPayrollBenefitsModalNav">
              <button onClick={handlePreviousBenefitsFile} className="myPayrollBenefitsNavBtn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              <h3>{currentFileType}</h3>
              <button onClick={handleNextBenefitsFile} className="myPayrollBenefitsNavBtn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </button>
            </div>
            <button onClick={() => setShowBenefitsModal(false)} className="myPayrollBenefitsCloseModal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          
          <div className="myPayrollBenefitsModalBody">
            <div className="myPayrollBenefitsModalLeft">
              <div 
                className="myPayrollBenefitsModalAvatar"
                style={{ backgroundColor: getAvatarColor(employeeInfo.firstName, employeeInfo.lastName) }}
              >
                {employeeInfo.profile_image ? (
                  <img 
                    src={employeeInfo.profile_image.startsWith('http') ? employeeInfo.profile_image : `http://localhost/difsysapi/${employeeInfo.profile_image}`} 
                    alt={`${employeeInfo.firstName} ${employeeInfo.lastName}`}
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
                <span style={{ display: employeeInfo.profile_image ? 'none' : 'block' }}>
                  {getInitials(employeeInfo.firstName, employeeInfo.lastName)}
                </span>
              </div>
              <div className="myPayrollBenefitsModalEmployeeInfo">
                <h4>{employeeInfo.firstName} {employeeInfo.lastName}</h4>
                <p>{employeeInfo.position}</p>
              </div>
              
              <div className="myPayrollBenefitsModalFileSelector">
                <label>Select Document:</label>
                <select 
                  value={currentFileType} 
                  onChange={(e) => {
                    e.stopPropagation();
                    setSelectedBenefitsFile(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="myPayrollBenefitsFileSelector"
                >
                  {benefitTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div className="myPayrollBenefitsFileSummary">
                <h5>Available Files:</h5>
                <ul>
                  {benefitTypes.map(type => (
                    <li 
                      key={type} 
                      className={`${benefitsFiles[type] ? 'available' : 'unavailable'} ${type === currentFileType ? 'current' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBenefitsFile(type);
                      }}
                    >
                      <span className="file-status-indicator">
                        {benefitsFiles[type] ? '✓' : '✗'}
                      </span>
                      <span className="file-type-name">{type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="myPayrollBenefitsModalRight">
              <FilePreviewSection 
                fileType={currentFileType}
                fileData={hasFile}
                formatFileSize={formatFileSize}
              />
            </div>
          </div>
        </div>
      );
    }, [currentFileType, hasFile, employeeInfo, benefitsFiles]);
  
    return (
      <div className="myPayrollBenefitsModalOverlay" onClick={() => setShowBenefitsModal(false)}>
        {modalContent}
      </div>
    );
  };
  
  // CREATE a separate memoized component for file preview to prevent re-renders
  const FilePreviewSection = React.memo(({ fileType, fileData, formatFileSize }) => {
    if (fileData) {
      return (
        <div className="myPayrollBenefitsModalPreview">
          <div className="myPayrollBenefitsFilePreviewHeader">
            <span>{fileData.name}</span>
            <span className="file-size">({formatFileSize(fileData.size)})</span>
          </div>
          <div className="myPayrollBenefitsFilePreviewContent">
            {fileData.type === 'application/pdf' ? (
              <iframe
                key={`pdf-${fileType}-${fileData.id}`} // Add key to force re-render for different files
                src={fileData.url}
                className="myPayrollBenefitsPdfPreview"
                title={fileData.name}
                style={{ width: '100%', height: '400px', border: 'none' }}
              />
            ) : fileData.type && fileData.type.startsWith('image/') ? (
              <div className="myPayrollBenefitsImagePreview">
                <img 
                  key={`img-${fileType}-${fileData.id}`} // Add key to force re-render for different files
                  src={fileData.url} 
                  alt={fileData.name}
                  className="myPayrollBenefitsPreviewImage"
                  style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className="myPayrollBenefitsFilePreviewPlaceholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="myPayrollBenefitsPreviewFileIcon">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                <p>Document Preview</p>
                <span>File: {fileData.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const link = document.createElement('a');
                    link.href = fileData.url;
                    link.download = fileData.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="myPayrollBenefitsDownloadBtn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                  </svg>
                  Download File
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }
  
    return (
      <div className="myPayrollBenefitsNoFile">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="myPayrollBenefitsNoFileIcon">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
        <p>No file uploaded for {fileType}</p>
      </div>
    );
  });
  

  if (loading) {
    return (
      <div className="myPayrollMainContainer">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <p>Loading {isViewingBenefits ? 'benefits' : 'payroll'} records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="myPayrollMainContainer">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <p style={{ color: 'red' }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="myPayrollMainContainer">
      {/* Overlay for expanded card */}
      {expandedCard && (
        <div 
          className="myPayrollCardOverlay" 
          onClick={handleOverlayClick}
        />
      )}

      {/* Header Section */}
      <div className="myPayrollHeaderSection">
        <div className="myPayrollProfileArea">
          <div className="myPayrollAvatarCircle">
            {employeeInfo.profile_image ? (
              <img 
                src={employeeInfo.profile_image.startsWith('http') ? employeeInfo.profile_image : `http://localhost/difsysapi/${employeeInfo.profile_image}`} 
                alt={employeeInfo.firstName}
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
            <span className="myPayrollAvatarText" style={{ display: employeeInfo.profile_image ? 'none' : 'block' }}>
              {employeeInfo.firstName?.[0]}{employeeInfo.lastName?.[0]}
            </span>
          </div>
          <div className="myPayrollProfileDetails">
            <h1 className="myPayrollProfileName">
              {employeeInfo.firstName} {employeeInfo.middleName} {employeeInfo.lastName}
            </h1>
            <p className="myPayrollProfileRole">{employeeInfo.position}</p>
          </div>
        </div>

        <div className="myPayrollInfoCards">
          <div className="myPayrollInfoCard">
            <div className="myPayrollInfoIcon myPayrollIconGreen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="myPayrollInfoContent">
              <p className="myPayrollInfoLabel">Employee ID</p>
              <p className="myPayrollInfoValue">DIF{employeeInfo.emp_id}</p>
            </div>
          </div>

          <div 
            className="myPayrollInfoCard myPayrollClickableCard"
            onClick={handleCardClick}
          >
            <div className="myPayrollInfoIcon myPayrollIconBlue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
            </div>
            <div className="myPayrollInfoContent">
              <p className="myPayrollInfoLabel">Payroll Period</p>
              <p className="myPayrollInfoValue">
                {currentPayrollPeriod ? currentPayrollPeriod.display : 'No active period'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Payroll Information Card */}
      {expandedCard && (
        <div className="myPayrollExpandedCard">
          <div className="myPayrollExpandedHeader">
            <div className="myPayrollExpandedIcon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
            </div>
            <h2 className="myPayrollExpandedTitle">Payroll Information</h2>
            <button className="myPayrollCloseButton" onClick={handleOverlayClick}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div className="myPayrollExpandedContent">
            <div className="myPayrollExpandedGrid">
              <div className="myPayrollExpandedItem">
                <label className="myPayrollExpandedLabel">Position:</label>
                <span className="myPayrollExpandedValue">{employeeInfo.position}</span>
              </div>
              <div className="myPayrollExpandedItem">
                <label className="myPayrollExpandedLabel">Pay Period:</label>
                <span className="myPayrollExpandedValue">{payrollInfo.payPeriodType}</span>
              </div>
              <div className="myPayrollExpandedItem">
                <label className="myPayrollExpandedLabel">Basic Pay (Monthly):</label>
                <span className="myPayrollExpandedValue">{formatCurrency(payrollInfo.basicPayMonthly)}</span>
              </div>
              <div className="myPayrollExpandedItem">
                <label className="myPayrollExpandedLabel">Basic Pay (Semi-Monthly):</label>
                <span className="myPayrollExpandedValue">{formatCurrency(payrollInfo.basicPaySemiMonthly)}</span>
              </div>
              <div className="myPayrollExpandedItem">
                <label className="myPayrollExpandedLabel">Rate Per Day:</label>
                <span className="myPayrollExpandedValue">{formatCurrency(payrollInfo.ratePerDay)}</span>
              </div>
              <div className="myPayrollExpandedItem">
                <label className="myPayrollExpandedLabel">TIN Number:</label>
                <span className="myPayrollExpandedValue">{payrollInfo.tinNumber || 'Not Set'}</span>
              </div>
              <div className="myPayrollExpandedItem">
                <label className="myPayrollExpandedLabel">SSS Account:</label>
                <span className="myPayrollExpandedValue">{payrollInfo.sssAccount || 'Not Set'}</span>
              </div>
              <div className="myPayrollExpandedItem">
                <label className="myPayrollExpandedLabel">Philhealth Account:</label>
                <span className="myPayrollExpandedValue">{payrollInfo.philhealthAccount || 'Not Set'}</span>
              </div>
              <div className="myPayrollExpandedItem">
                <label className="myPayrollExpandedLabel">PAG-IBIG Account:</label>
                <span className="myPayrollExpandedValue">{payrollInfo.pagibigAccount || 'Not Set'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="myPayrollTableSection">
        <div className="myPayrollTableHeader">
          <h3 className="myPayrollTableTitle">
            {isViewingBenefits ? 'Benefits Records' : 'Payroll Records'}
          </h3>
          <button 
            className="myPayrollToggleBtn"
            onClick={handleToggleView}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              {isViewingBenefits ? (
                // Money icon for "View Payroll"
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              ) : (
                // Gift/Benefits icon for "View Benefits"
                <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
              )}
            </svg>
            {isViewingBenefits ? 'View Payroll' : 'View Benefits'}
          </button>
        </div>
        
        <div className="myPayrollTableWrapper">
          <table className="myPayrollDataTable">
            <thead>
              <tr className="myPayrollTableHeaderRow">
                <th>{isViewingBenefits ? 'BENEFITS ID' : 'PAYROLL ID'}</th>
                <th>PAYROLL PERIOD</th>
                <th>DATE RELEASE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayData.length > 0 ? (
                displayData.map((record, index) => (
                  <tr key={index} className="myPayrollTableRow">
                    <td className="myPayrollIdCell">
                      {isViewingBenefits ? record.benefitsId : record.payrollId}
                    </td>
                    <td className="myPayrollPeriodCell">{record.payrollPeriod}</td>
                    <td className="myPayrollDateCell">{record.dateRelease}</td>
                    <td className="myPayrollStatusCell">
                      <span className={`myPayrollStatus ${record.status.toLowerCase()}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="myPayrollActionCell">
                      <button 
                        className="myPayrollViewBtn"
                        onClick={() => isViewingBenefits ? handleViewBenefits(record.benefitsId) : handleViewPayslip(record.payrollId)}
                        disabled={record.status === 'Pending'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                        {isViewingBenefits ? 'View Benefits' : 'View Payslip'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="myPayrollNoDataCell">
                    No {isViewingBenefits ? 'benefits' : 'payroll'} records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {currentData.length > 0 && (
          <div className="myPayrollPaginationArea">
            <div className="myPayrollPaginationInfo">
              Showing {startIndex + 1} to {Math.min(endIndex, currentData.length)} of {currentData.length} entries
            </div>
            <div className="myPayrollPaginationButtons">
              {renderPaginationButtons()}
            </div>
          </div>
        )}
      </div>

      {/* Benefits Modal */}
      <BenefitsModal />
    </div>
  );
};

export default MyPayroll;