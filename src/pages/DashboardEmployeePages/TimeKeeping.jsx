import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser, getUserId } from '../../utils/auth';
import '../../components/EmployeeLayout/TimeKeeping.css';

// Configure axios base URL
const API_BASE_URL = 'http://localhost/difsysapi';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      console.error('Request error:', error.request);
    }
    return Promise.reject(error);
  }
);



const TimeKeeping = () => {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewDetails, setShowViewDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [employeeInfo, setEmployeeInfo] = useState({
    firstName: 'Loading...',
    lastName: '',
    emp_id: null,
    position: 'Project Manager'
  });

  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    attachments: null
  });

  const [dragActive, setDragActive] = useState(false);
  const [customAlert, setCustomAlert] = useState({ show: false, title: '', message: '', type: 'info' });

  const showCustomAlert = (title, message, type = 'info') => {
    setCustomAlert({ show: true, title, message, type });
  };
  
  const hideCustomAlert = () => {
    setCustomAlert({ show: false, title: '', message: '', type: 'info' });
  };
  
  const itemsPerPage = 8;

  useEffect(() => {
    const userId = getUserId();
    const currentUser = getCurrentUser();
    
    if (userId && currentUser) {
      setEmployeeInfo(prev => ({
        ...prev,
        firstName: currentUser.firstName || 'Employee',
        lastName: currentUser.lastName || '',
        emp_id: userId
      }));
      
      // Load employee's leave requests
      loadLeaveRequests(userId);
      fetchEmployeeInfo(userId);
    } else {
      window.location.href = '/login';
    }
    
    // Load leave types
    loadLeaveTypes();
    
    // Check if user has set "don't show again"
    const dontShow = localStorage.getItem('dontShowLeaveWarning');
    if (dontShow === 'true') {
      setDontShowAgain(true);
    }
  }, []);

  useEffect(() => {
            document.title = "DIFSYS | TIME KEEPING";
          }, []);

  const loadLeaveRequests = async (empId) => {
    try {
      setLoading(true);
      const response = await api.get('/leave_management.php', {
        params: {
          action: 'employee_requests',
          emp_id: empId
        }
      });
      
      if (response.data.success) {
        setLeaves(response.data.data);
      } else {
        console.error('Failed to load leave requests:', response.data.message);
        showCustomAlert('Error', 'Failed to load leave requests: ' + response.data.message, 'error');
      }
    } catch (error) {
      console.error('Error loading leave requests:', error);
      showCustomAlert('Connection Error', 'Error loading leave requests. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeInfo = async (empId) => {
    try {
      const response = await api.get('/attendance_api.php', {
        params: {
          action: 'get_employee_info',
          emp_id: empId
        }
      });
      
      if (response.data.success) {
        setEmployeeInfo(prev => ({
          ...prev,
          ...response.data.employee,
          profile_image: response.data.employee.profile_image
        }));
      }
    } catch (error) {
      console.error('Error fetching employee info:', error);
    }
  };

  const loadLeaveTypes = async () => {
    try {
      const response = await api.get('/leave_management.php', {
        params: {
          action: 'leave_types'
        }
      });
      
      if (response.data.success) {
        setLeaveTypes(response.data.data.map(type => type.type_name));
      } else {
        console.error('Failed to load leave types:', response.data.message);
        // Fallback to default leave types if API fails
        setLeaveTypes([
          'Vacation Leave',
          'Sick Leave',
          'Emergency Leave',
          'Maternity/Paternity Leave',
          'Bereavement Leave',
          'Personal Leave'
        ]);
      }
    } catch (error) {
      console.error('Error loading leave types:', error);
      // Fallback to default leave types
      setLeaveTypes([
        'Vacation Leave',
        'Sick Leave',
        'Emergency Leave',
        'Maternity/Paternity Leave',
        'Bereavement Leave',
        'Personal Leave'
      ]);
    }
  };

  const handleFileLeaveClick = () => {
    if (!dontShowAgain) {
      setShowWarningModal(true);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleWarningAccept = () => {
    if (dontShowAgain) {
      localStorage.setItem('dontShowLeaveWarning', 'true');
    }
    setShowWarningModal(false);
    setShowCreateModal(true);
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Calculate business days (excluding weekends)
    let days = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        days++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.leaveType) {
      showCustomAlert('Validation Error', 'Please select a leave type', 'error');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      showCustomAlert('Validation Error', 'Please select start and end dates', 'error');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      showCustomAlert('Validation Error', 'End date must be after start date', 'error');
      return;
    }

    if (!formData.reason) {
      showCustomAlert('Validation Error', 'Please provide a reason for leave', 'error');
      return;
    }

    try {
      setLoading(true);
      
      if (isEditing) {
        // Update existing leave request
        const updateData = {
          leave_id: selectedLeave.id,
          emp_id: employeeInfo.emp_id,
          leave_type: formData.leaveType,
          start_date: formData.startDate,
          end_date: formData.endDate,
          reason: formData.reason,
        };

        const response = await api.put('/leave_management.php?action=update_request', updateData);
        
        if (response.data.success) {
          showCustomAlert('Success', 'Leave request updated successfully', 'success');
          await loadLeaveRequests(employeeInfo.emp_id);
          setShowViewDetails(false);
          setIsEditing(false);
        } else {
          showCustomAlert('Error', 'Failed to update leave request: ' + response.data.message, 'error');
        }
      } else {
        // Create new leave request
        const submitData = {
          emp_id: employeeInfo.emp_id,
          leave_type: formData.leaveType,
          start_date: formData.startDate,
          end_date: formData.endDate,
          reason: formData.reason,
        };

        const response = await api.post('/leave_management.php?action=submit', submitData);
        
        if (response.data.success) {
          showCustomAlert('Success', `Leave request submitted successfully. Leave ID: ${response.data.leave_id}`, 'success');
          await loadLeaveRequests(employeeInfo.emp_id);
          setShowCreateModal(false);
        } else {
          showCustomAlert('Error', 'Failed to submit leave request: ' + response.data.message, 'error');
        }
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      
      // Better error handling
      let errorMessage = 'An error occurred while submitting the leave request';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showCustomAlert('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      leaveType: '',
      startDate: '',
      endDate: '',
      priority: 'Medium',
      reason: '',
      attachments: null
    });
  };

  const handleViewDetails = (leave) => {
    setSelectedLeave(leave);
    setFormData({
      leaveType: leave.leaveType || leave.subject,
      startDate: leave.startDate,
      endDate: leave.endDate,
      priority: leave.priority,
      reason: leave.description,
      attachments: null
    });
    setShowViewDetails(true);
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (selectedLeave.status === 'Pending') {
      setIsEditing(true);
    } else {
      showCustomAlert('Action Not Allowed', 'Cannot edit a leave request that has been processed', 'warning');
    }
  };

  const handleCancelLeave = async () => {
    if (window.confirm('Are you sure you want to cancel this leave request?')) {
      try {
        setLoading(true);
        
        const response = await api.put('/leave_management.php?action=cancel', {
          leave_id: selectedLeave.id,
          emp_id: employeeInfo.emp_id
        });

        if (response.data.success) {
          showCustomAlert('Success', 'Leave request cancelled successfully', 'success');
          await loadLeaveRequests(employeeInfo.emp_id);
          setShowViewDetails(false);
          setIsEditing(false);
        } else {
          showCustomAlert('Error', 'Failed to cancel leave request: ' + response.data.message, 'error');
        }
      } catch (error) {
        console.error('Error cancelling leave request:', error);
        showCustomAlert('Error', 'An error occurred while cancelling the leave request', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 20 * 1024 * 1024) {
      showCustomAlert('File Size Error', 'File size must be less than 20MB', 'warning');
      return;
    }
    setFormData(prev => ({
      ...prev,
      attachments: file
    }));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 20 * 1024 * 1024) {
        alert('File size must be less than 20MB');
        return;
      }
      setFormData(prev => ({
        ...prev,
        attachments: file
      }));
    }
  };

  const removeFile = () => {
    setFormData(prev => ({
      ...prev,
      attachments: null
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return `${start} - ${end}`;
  };

  const totalPages = Math.ceil(leaves.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = leaves.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`timekeepingPaginationBtn ${currentPage === i ? 'timekeepingPaginationActive' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(
        <span key="dots" className="timekeepingPaginationDots">...</span>
      );
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`timekeepingPaginationBtn ${currentPage === totalPages ? 'timekeepingPaginationActive' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  return (
    <div className="timekeepingMainContainer">
      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p>Processing...</p>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="timekeepingModalOverlay">
          <div className="timekeepingWarningModal">
            <div className="timekeepingWarningIcon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 className="timekeepingWarningTitle">File Leave Request</h3>
            <p className="timekeepingWarningMessage">
              You are about to file a leave request. Please ensure all details are accurate 
              as this will be submitted to HR for approval. Make sure to check your available 
              leave balance before submitting.
            </p>
            <div className="timekeepingWarningCheckbox">
              <input
                type="checkbox"
                id="dontShowAgain"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              <label htmlFor="dontShowAgain">Don't show this message again</label>
            </div>
            <button 
              className="timekeepingWarningBtn"
              onClick={handleWarningAccept}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Create Leave Modal */}
      {showCreateModal && (
        <div className="timekeepingModalOverlay">
          <div className="timekeepingFormModal">
            <div className="timekeepingFormHeader">
              <h3>File Leave Request</h3>
              <button 
                className="timekeepingCloseBtn"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="timekeepingForm">
            <div className="timekeepingFormGroup">
                  <label>Leave Type *</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              <div className="timekeepingFormRow">
                <div className="timekeepingFormGroup">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="timekeepingFormGroup">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              {formData.startDate && formData.endDate && (
                <div className="timekeepingFormGroup">
                  <label>Days Requested</label>
                  <input
                    type="text"
                    value={`${calculateDays(formData.startDate, formData.endDate)} business days`}
                    disabled
                  />
                </div>
              )}

              <div className="timekeepingFormGroup">
                <label>Reason for Leave *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Please provide a detailed reason for your leave request"
                  rows="4"
                  required
                />
              </div>

              <div className="timekeepingFormActions">
                <button 
                  type="button" 
                  className="timekeepingCancelBtn"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="timekeepingSubmitBtn"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewDetails && (
        <div className="timekeepingModalOverlay">
          <div className="timekeepingFormModal">
            <div className="timekeepingFormHeader">
              <h3>Leave Request Details</h3>
              <button 
                className="timekeepingCloseBtn"
                onClick={() => {
                  setShowViewDetails(false);
                  setIsEditing(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="timekeepingForm">
                <div className="timekeepingFormGroup">
                  <label>Leave Type</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                    disabled={!isEditing}
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              <div className="timekeepingFormRow">
                <div className="timekeepingFormGroup">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    disabled={!isEditing}
                    required
                  />
                </div>

                <div className="timekeepingFormGroup">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>

              {formData.startDate && formData.endDate && (
                <div className="timekeepingFormGroup">
                  <label>Days Requested</label>
                  <input
                    type="text"
                    value={`${calculateDays(formData.startDate, formData.endDate)} business days`}
                    disabled
                  />
                </div>
              )}

              <div className="timekeepingFormGroup">
                <label>Reason for Leave</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  disabled={!isEditing}
                  rows="4"
                  required
                />
              </div>

              {selectedLeave && selectedLeave.comments && (
                <div className="timekeepingFormGroup">
                  <label>HR Comments</label>
                  <textarea
                    value={selectedLeave.comments}
                    disabled
                    rows="3"
                  />
                </div>
              )}

              <div className="timekeepingFormActions">
                {!isEditing ? (
                  <>
                    {/* Only show Edit and Cancel buttons if status is Pending */}
                    {selectedLeave?.status === 'Pending' ? (
                      <>
                        <button 
                          type="button" 
                          className="timekeepingEditBtn"
                          onClick={handleEdit}
                        >
                          Edit
                        </button>
                        <button 
                          type="button" 
                          className="timekeepingCancelLeaveBtn"
                          onClick={handleCancelLeave}
                          disabled={loading}
                        >
                          {loading ? 'Processing...' : 'Cancel Leave'}
                        </button>
                      </>
                    ) : (
                      <div className={`timekeepingStatusInfo ${selectedLeave?.status?.toLowerCase()}`}>
                        <p>
                          This leave request has been <strong>{selectedLeave?.status?.toLowerCase()}</strong> and cannot be modified.
                          {selectedLeave?.comments && (
                            <>
                              <br />
                              <span style={{ fontSize: '13px', marginTop: '8px', display: 'block' }}>
                                <strong>HR Note:</strong> {selectedLeave.comments}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      type="button" 
                      className="timekeepingCancelBtn"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form to original data
                        setFormData({
                          leaveType: selectedLeave.leaveType || selectedLeave.subject,
                          startDate: selectedLeave.startDate,
                          endDate: selectedLeave.endDate,
                          priority: selectedLeave.priority,
                          reason: selectedLeave.description,
                          attachments: null
                        });
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="timekeepingSubmitBtn"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="timekeepingHeaderSection">
        <div className="timekeepingProfileArea">
        <div className="timekeepingAvatarCircle">
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
          <span className="timekeepingAvatarText" style={{ display: employeeInfo.profile_image ? 'none' : 'block' }}>
            {employeeInfo.firstName?.[0]}{employeeInfo.lastName?.[0]}
          </span>
        </div>
          <div className="timekeepingProfileDetails">
            <h1 className="timekeepingProfileName">
              {employeeInfo.firstName} {employeeInfo.lastName}
            </h1>
            <p className="timekeepingProfileRole">{employeeInfo.position}</p>
          </div>
        </div>

        <div className="timekeepingInfoCards">
          <div className="timekeepingInfoCard">
            <div className="timekeepingInfoIcon timekeepingIconGreen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7h-3V2h-2v2H8V2H6v2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H3V9h16v11z"/>
              </svg>
            </div>
            <div className="timekeepingInfoContent">
              <p className="timekeepingInfoLabel">Vacation Leave Credits</p>
              <p className="timekeepingInfoValue">{leaves.length > 0 ? leaves[0].vacation_credits - leaves[0].used_vacation : 15}</p>
            </div>
          </div>

          <div className="timekeepingInfoCard">
            <div className="timekeepingInfoIcon timekeepingIconBlue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.57,14.86L22,13.43L20.57,12L17,15.57L8.43,7L12,3.43L10.57,2L9.14,3.43L7.71,2L5.57,4.14L4.14,2.71L2.71,4.14L4.14,5.57L2,7.71L3.43,9.14L2,10.57L3.43,12L7,8.43L15.57,17L12,20.57L13.43,22L14.86,20.57L16.29,22L18.43,19.86L19.86,21.29L21.29,19.86L19.86,18.43L22,16.29L20.57,14.86Z"/>
              </svg>
            </div>
            <div className="timekeepingInfoContent">
              <p className="timekeepingInfoLabel">Sick Leave Credits</p>
              <p className="timekeepingInfoValue">{leaves.length > 0 ? leaves[0].sick_credits - leaves[0].used_sick : 10}</p>
            </div>
          </div>

          <div className="timekeepingInfoCard">
            <div className="timekeepingInfoIcon timekeepingIconPurple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z"/>
              </svg>
            </div>
            <div className="timekeepingInfoContent">
              <p className="timekeepingInfoLabel">Department</p>
              <p className="timekeepingInfoValue">{leaves.length > 0 ? leaves[0].department || 'Not Assigned' : 'Not Assigned'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* File Leave Button */}
      <div className="timekeepingActionSection">
        <button 
          className="timekeepingFileLeaveBtn"
          onClick={handleFileLeaveClick}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          File Leave Request
        </button>
      </div>

      {/* Table Section */}
      <div className="timekeepingTableSection">
        <table className="timekeepingDataTable">
          <thead>
            <tr className="timekeepingTableHeader">
              <th>LEAVE ID</th>
              <th>LEAVE TYPE</th>
              <th>DATE RANGE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((leave, index) => (
              <tr key={index} className="timekeepingTableRow">
                <td className="timekeepingLeaveIdCell">{leave.id}</td>
                <td className="timekeepingSubjectCell">{leave.leaveType || leave.subject}</td>
                <td className="timekeepingDateCell">
                  {formatDateRange(leave.startDate, leave.endDate)}
                </td>
                <td className="timekeepingStatusCell">
                  <span className={`timekeepingStatusBadge ${
                    leave.status === 'Approved' ? 'timekeepingStatusApproved' :
                    leave.status === 'Pending' ? 'timekeepingStatusPending' :
                    leave.status === 'Rejected' ? 'timekeepingStatusRejected' :
                    'timekeepingStatusCancelled'
                  }`}>
                    {leave.status.toUpperCase()}
                  </span>
                </td>
                <td className="timekeepingActionsCell">
                  <button 
                    className="timekeepingViewBtn"
                    onClick={() => handleViewDetails(leave)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="timekeepingPaginationArea">
          <div className="timekeepingPaginationInfo">
            Showing {startIndex + 1} to {Math.min(endIndex, leaves.length)} of {leaves.length} entries
          </div>
          <div className="timekeepingPaginationButtons">
            {renderPaginationButtons()}
          </div>
        </div>
      </div>

      {/* Custom Alert Modal */}
      {customAlert.show && (
        <div className="timekeepingModalOverlay">
          <div className="timekeepingCustomAlert">
            <div className={`timekeepingAlertIcon ${customAlert.type}`}>
              {customAlert.type === 'success' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              )}
              {customAlert.type === 'error' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
                </svg>
              )}
              {customAlert.type === 'warning' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
              )}
              {customAlert.type === 'info' && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              )}
            </div>
            <h3 className="timekeepingAlertTitle">{customAlert.title}</h3>
            <p className="timekeepingAlertMessage">{customAlert.message}</p>
            <button 
              className="timekeepingAlertBtn"
              onClick={hideCustomAlert}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeKeeping;