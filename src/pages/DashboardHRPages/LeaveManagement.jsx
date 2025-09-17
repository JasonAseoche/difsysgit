import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../components/HRLayout/LeaveManagement.css';

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

const LeaveManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showViewDetails, setShowViewDetails] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState({ type: '', title: '', message: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState({ title: '', message: '', onConfirm: null });
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptData, setPromptData] = useState({ title: '', message: '', onConfirm: null });
  const [promptValue, setPromptValue] = useState('');
  const [activeTab, setActiveTab] = useState('requests');
  
  // Leave Credits Management
  const [leaveCredits, setLeaveCredits] = useState([]);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [creditsForm, setCreditsForm] = useState({
    vacation_credits: 15,
    sick_credits: 10
  });

  // Pagination for leave credits table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    // Load leave requests and credits
    loadLeaveRequests();
    loadLeaveCredits();
    
    return () => clearTimeout(timer);
  }, []);

  const showCustomAlert = (type, title, message) => {
    setAlertData({ type, title, message });
    setShowAlert(true);
  };
  
  const showCustomConfirm = (title, message, onConfirm) => {
    setConfirmData({ title, message, onConfirm });
    setShowConfirm(true);
  };
  
  const showCustomPrompt = (title, message, onConfirm) => {
    setPromptData({ title, message, onConfirm });
    setPromptValue('');
    setShowPrompt(true);
  };

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leave_management.php', {
        params: {
          action: 'all_requests'
        }
      });
      
      if (response.data.success) {
        // Process requests to include profile images
        const processedRequests = await Promise.all(response.data.data.map(async (request) => {
          try {
            const profileResponse = await api.get('/attendance_api.php', {
              params: {
                action: 'get_employee_info',
                emp_id: request.emp_id || request.employee_id
              }
            });
            
            return {
              ...request,
              profile_image: profileResponse.data.success ? profileResponse.data.employee.profile_image : null
            };
          } catch (error) {
            console.error('Error fetching profile for employee:', request.emp_id || request.employee_id, error);
            return {
              ...request,
              profile_image: null
            };
          }
        }));
  
        setLeaveRequests(processedRequests);
      } else {
        console.error('Failed to load leave requests:', response.data.message);
        showCustomAlert('error', 'Error', 'Failed to load leave requests: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error loading leave requests:', error);
      showCustomAlert('error', 'Connection Error', 'Error loading leave requests. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveCredits = async () => {
    try {
      const response = await api.get('/leave_management.php', {
        params: {
          action: 'leave_credits'
        }
      });
      
      if (response.data.success) {
        setLeaveCredits(response.data.data);
      } else {
        console.error('Failed to load leave credits:', response.data.message);
      }
    } catch (error) {
      console.error('Error loading leave credits:', error);
    }
  };

  const renderEmployeeAvatar = (request) => {
    const initials = request.name ? request.name.split(' ').map(n => n[0]).join('') : 'N/A';
    
    return (
      <div className="hr-leave-employee-avatar">
        {request.profile_image ? (
          <img 
            src={request.profile_image.startsWith('http') ? request.profile_image : `http://localhost/difsysapi/${request.profile_image}`} 
            alt={request.name || 'Employee'}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <span style={{ 
          display: request.profile_image ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          {initials}
        </span>
      </div>
    );
  };

  const handleViewDetail = async (request) => {
    try {
      const response = await api.get('/leave_management.php', {
        params: {
          action: 'request_details',
          leave_id: request.leave_id
        }
      });
      
      if (response.data.success) {
        setSelectedRequest({
          ...response.data.data,
          ...request // Merge with original request data
        });
        setShowViewDetails(true);
      } else {
        showCustomAlert('error', 'Error', 'Failed to load request details: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error loading request details:', error);
      showCustomAlert('error', 'Error', 'An error occurred while loading request details');
    }
  };

  const handleHRStatusUpdate = async (status, comments = '') => {
    if (!selectedRequest) return;
    
    try {
      setLoading(true);
      
      const response = await api.put('/leave_management.php?action=update_hr_status', {
        leave_id: selectedRequest.id,
        status: status,
        comments: comments,
        hr_id: 1 // Replace with actual HR user ID from auth
      });
  
      if (response.data.success) {
        showCustomAlert('success', 'Success', `Leave request ${status.toLowerCase()} successfully`);
        setShowViewDetails(false);
        setSelectedRequest(null);
        await loadLeaveRequests(); // Reload the list
      } else {
        showCustomAlert('error', 'Error', 'Failed to update leave request: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error updating leave request:', error);
      
      let errorMessage = 'An error occurred while updating the leave request';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showCustomAlert('error', 'Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (request) => {
    try {
      setLoading(true);
      
      const response = await api.put('/leave_management.php?action=update_hr_status', {
        leave_id: request.leave_id,
        status: 'Approved',
        comments: 'Approved by HR'
      });
  
      if (response.data.success) {
        showCustomAlert('success', 'Success', 'Leave request approved successfully');
        await loadLeaveRequests();
      } else {
        showCustomAlert('error', 'Error', 'Failed to approve leave request: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error approving leave request:', error);
      
      let errorMessage = 'An error occurred while approving the leave request';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showCustomAlert('error', 'Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    // Create a temporary state to track the paid status for this specific request
    let isPaidTemp = 'No';
    
    const handleApprovalWithPaidOption = () => {
      setConfirmData({
        title: 'Confirm Approval',
        message: (
          <div>
            <p>Are you sure you want to approve {request.name}'s leave request?</p>
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  defaultChecked={false}
                  onChange={(e) => {
                    isPaidTemp = e.target.checked ? 'Yes' : 'No';
                  }}
                  style={{ transform: 'scale(1.2)' }}
                />
                Mark as Paid Leave
              </label>
            </div>
          </div>
        ),
        onConfirm: () => approveRequestWithPaidStatus(request, isPaidTemp)
      });
      setShowConfirm(true);
    };
  
    handleApprovalWithPaidOption();
  };

  const approveRequestWithPaidStatus = async (request, isPaid = 'No') => {
    try {
      setLoading(true);
      
      const response = await api.put('/leave_management.php?action=update_hr_status', {
        leave_id: request.leave_id,
        status: 'Approved',
        comments: 'Approved by HR',
        is_paid: isPaid
        // Remove hr_id: 1
      });
  
      if (response.data.success) {
        showCustomAlert('success', 'Success', 'Leave request approved successfully');
        await loadLeaveRequests();
      } else {
        showCustomAlert('error', 'Error', 'Failed to approve leave request: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error approving leave request:', error);
      
      let errorMessage = 'An error occurred while approving the leave request';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showCustomAlert('error', 'Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const declineRequest = async (request, reason) => {
    try {
      setLoading(true);
      
      const response = await api.put('/leave_management.php?action=update_hr_status', {
        leave_id: request.leave_id,
        status: 'Rejected',
        comments: reason
      });
  
      if (response.data.success) {
        showCustomAlert('success', 'Success', 'Leave request declined successfully');
        await loadLeaveRequests();
      } else {
        showCustomAlert('error', 'Error', 'Failed to decline leave request: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error declining leave request:', error);
      
      let errorMessage = 'An error occurred while declining the leave request';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showCustomAlert('error', 'Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDecline = async (request) => {
    showCustomPrompt(
      'Decline Request',
      'Please provide a reason for declining this leave request:',
      (reason) => declineRequest(request, reason)
    );
  };

  const handleDetailedApprove = async () => {
    showCustomConfirm(
      'Confirm Approval',
      'Are you sure you want to approve this leave request?',
      () => {
        handleHRStatusUpdate('Approved', 'Approved by HR');
      }
    );
  };

  const handleDetailedDecline = async () => {
    showCustomPrompt(
      'Decline Request',
      'Please provide a reason for declining this leave request:',
      (reason) => {
        handleHRStatusUpdate('Rejected', reason);
      }
    );
  };

  // Leave Credits Management Functions
  const handleEditCredits = (employee) => {
    setSelectedEmployee(employee);
    setCreditsForm({
      vacation_credits: employee.vacation_credits,
      sick_credits: employee.sick_credits
    });
    setShowCreditsModal(true);
  };

  const handleUpdateCredits = async () => {
    try {
      setLoading(true);
      
      const response = await api.put('/leave_management.php?action=update_leave_credits', {
        emp_id: selectedEmployee.emp_id,
        vacation_credits: creditsForm.vacation_credits,
        sick_credits: creditsForm.sick_credits
      });

      if (response.data.success) {
        showCustomAlert('success', 'Success', 'Leave credits updated successfully');
        setShowCreditsModal(false);
        await loadLeaveCredits();
      } else {
        showCustomAlert('error', 'Error', 'Failed to update leave credits: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error updating leave credits:', error);
      showCustomAlert('error', 'Error', 'An error occurred while updating leave credits');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCredits = async (employee) => {
    showCustomConfirm(
      'Reset Leave Credits',
      `Are you sure you want to reset ${employee.name}'s used leave credits to 0?`,
      async () => {
        try {
          setLoading(true);
          
          const response = await api.put('/leave_management.php?action=reset_leave_credits', {
            emp_id: employee.emp_id
          });

          if (response.data.success) {
            showCustomAlert('success', 'Success', 'Leave credits reset successfully');
            await loadLeaveCredits();
          } else {
            showCustomAlert('error', 'Error', 'Failed to reset leave credits: ' + response.data.message);
          }
        } catch (error) {
          console.error('Error resetting leave credits:', error);
          showCustomAlert('error', 'Error', 'An error occurred while resetting leave credits');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  useEffect(() => {
    document.title = "DIFSYS | LEAVE MANAGEMENT";
  }, []);

  const filteredRequests = leaveRequests.filter(request =>
    request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.leaveType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCredits = leaveCredits.filter(credit =>
    credit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (credit.position && credit.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculations for leave credits
  const totalPages = Math.ceil(filteredCredits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCreditsData = filteredCredits.slice(startIndex, endIndex);

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
          className={`hr-leave-pagination-btn ${currentPage === i ? 'hr-leave-pagination-active' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(
        <span key="dots" className="hr-leave-pagination-dots">...</span>
      );
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`hr-leave-pagination-btn ${currentPage === totalPages ? 'hr-leave-pagination-active' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  if (loading && leaveRequests.length === 0 && leaveCredits.length === 0) {
    return (
      <main className="hr-leave-container">
        <div className="hr-leave-loading-state">
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`hr-leave-container ${isLoaded ? 'hr-leave-active' : ''}`}>
      {/* Loading overlay */}
      {loading && (
        <div className="hr-leave-overlay">
          <div className="hr-leave-spinner-wrapper">
            <div className="hr-leave-spinner"></div>
            <p>Processing...</p>
          </div>
        </div>
      )}

      {/* Custom Alert Dialog */}
      {showAlert && (
        <div className="hr-leave-alert-overlay">
          <div className={`hr-leave-alert-box hr-leave-alert-${alertData.type}`}>
            <div className="hr-leave-alert-icon">
              {alertData.type === 'success' ? '✓' : '✕'}
            </div>
            <h3>{alertData.title}</h3>
            <p>{alertData.message}</p>
            <button 
              className="hr-leave-alert-button"
              onClick={() => setShowAlert(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      {showConfirm && (
        <div className="hr-leave-confirm-overlay">
          <div className="hr-leave-confirm-box">
            <h3>{confirmData.title}</h3>
            <div>{typeof confirmData.message === 'string' ? <p>{confirmData.message}</p> : confirmData.message}</div>
            <div className="hr-leave-confirm-buttons">
              <button 
                className="hr-leave-action-btn hr-leave-btn-cancel"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="hr-leave-action-btn hr-leave-btn-confirm"
                onClick={() => {
                  setShowConfirm(false);
                  if (confirmData.onConfirm) confirmData.onConfirm();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Prompt Dialog */}
      {showPrompt && (
        <div className="hr-leave-prompt-overlay">
          <div className="hr-leave-prompt-box">
            <h3>{promptData.title}</h3>
            <p>{promptData.message}</p>
            <textarea
              className="hr-leave-text-area"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder="Enter your reason here..."
            />
            <div className="hr-leave-prompt-buttons">
              <button 
                className="hr-leave-action-btn hr-leave-btn-cancel"
                onClick={() => setShowPrompt(false)}
              >
                Cancel
              </button>
              <button 
                className="hr-leave-action-btn hr-leave-btn-confirm"
                onClick={() => {
                  if (promptValue.trim()) {
                    setShowPrompt(false);
                    if (promptData.onConfirm) promptData.onConfirm(promptValue);
                  } else {
                    showCustomAlert('error', 'Required', 'Please provide a reason for declining');
                  }
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Credits Modal */}
      {showCreditsModal && selectedEmployee && (
        <div className="hr-leave-modal-backdrop">
          <div className="hr-leave-modal-window">
            <div className="hr-leave-modal-header">
              <h3>Edit Leave Credits - {selectedEmployee.name}</h3>
              <button 
                className="hr-leave-modal-close"
                onClick={() => {
                  setShowCreditsModal(false);
                  setSelectedEmployee(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="hr-leave-modal-body">
              <div className="hr-leave-credits-form">
                <div className="hr-leave-detail-group">
                  <label>Vacation Leave Credits</label>
                  <input
                    type="number"
                    value={selectedEmployee.remaining_vacation}
                    onChange={(e) => setCreditsForm({
                      ...creditsForm,
                      vacation_credits: parseInt(e.target.value) || 0
                    })}
                    min="0"
                    max="50"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div className="hr-leave-detail-group">
                  <label>Sick Leave Credits</label>
                  <input
                    type="number"
                    value={selectedEmployee.remaining_sick}
                    onChange={(e) => setCreditsForm({
                      ...creditsForm,
                      sick_credits: parseInt(e.target.value) || 0
                    })}
                    min="0"
                    max="30"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div className="hr-leave-detail-group">
                  <label>Current Usage</label>
                  <p>Vacation Used: {selectedEmployee.used_vacation} | Sick Used: {selectedEmployee.used_sick}</p>
                </div>
              </div>

              <div className="hr-leave-modal-footer">
                <button 
                  className="hr-leave-action-button hr-leave-btn-cancel"
                  onClick={() => setShowCreditsModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="hr-leave-action-button hr-leave-btn-approve"
                  onClick={handleUpdateCredits}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewDetails && selectedRequest && (
        <div className="hr-leave-modal-backdrop">
          <div className="hr-leave-modal-window">
            <div className="hr-leave-modal-header">
              <h3>Leave Request Details</h3>
              <button 
                className="hr-leave-modal-close"
                onClick={() => {
                  setShowViewDetails(false);
                  setSelectedRequest(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="hr-leave-modal-body">
              <div className="hr-leave-employee-detailed">
                <div className="hr-leave-avatar-large">
                  {selectedRequest.profile_image ? (
                    <img 
                      src={selectedRequest.profile_image.startsWith('http') ? selectedRequest.profile_image : `http://localhost/difsysapi/${selectedRequest.profile_image}`} 
                      alt={selectedRequest.name || 'Employee'}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                    />
                  ) : (
                    <span>{selectedRequest.name ? selectedRequest.name.split(' ').map(n => n[0]).join('') : 'N/A'}</span>
                  )}
                </div>
                <div className="hr-leave-employee-detailed-info">
                  <h3>{selectedRequest.employeeName || selectedRequest.name}</h3>
                  <p>{selectedRequest.employeePosition || selectedRequest.role}</p>
                  <p>{selectedRequest.employeeEmail || selectedRequest.email}</p>
                </div>
              </div>

              <div className="hr-leave-modal-details">
                <div className="hr-leave-detail-group">
                  <label>Leave Type</label>
                  <span>{selectedRequest.leaveType || selectedRequest.subject}</span>
                </div>

                <div className="hr-leave-detail-group">
                  <label>Start Date</label>
                  <span>{new Date(selectedRequest.startDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>

                <div className="hr-leave-detail-group">
                  <label>End Date</label>
                  <span>{new Date(selectedRequest.endDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>

                <div className="hr-leave-detail-group">
                  <label>Days Requested</label>
                  <span>{selectedRequest.daysRequested} business days</span>
                </div>

                <div className="hr-leave-detail-group">
                  <label>HR Status</label>
                  <span className={`hr-leave-status-indicator hr-leave-status-${selectedRequest.hr_status?.toLowerCase()}`}>
                    {selectedRequest.hr_status}
                  </span>
                </div>

                <div className="hr-leave-detail-group">
                  <label>Supervisor Status</label>
                  <span className={`hr-leave-status-indicator hr-leave-status-${selectedRequest.supervisor_status?.toLowerCase()}`}>
                    {selectedRequest.supervisor_status}
                  </span>
                </div>

                <div className="hr-leave-detail-group">
                  <label>Overall Status</label>
                  <span className={`hr-leave-status-indicator hr-leave-status-${selectedRequest.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                    {selectedRequest.status}
                  </span>
                </div>

                <div className="hr-leave-detail-group hr-leave-detail-full-width">
                  <label>Reason for Leave</label>
                  <div className="hr-leave-reason-display">
                    {selectedRequest.reason || selectedRequest.description}
                  </div>
                </div>

                {selectedRequest.hr_comments && (
                  <div className="hr-leave-detail-group hr-leave-detail-full-width">
                    <label>HR Comments</label>
                    <div className="hr-leave-comments-display">
                      {selectedRequest.hr_comments}
                    </div>
                  </div>
                )}

                {selectedRequest.supervisor_comments && (
                  <div className="hr-leave-detail-group hr-leave-detail-full-width">
                    <label>Supervisor Comments</label>
                    <div className="hr-leave-comments-display">
                      {selectedRequest.supervisor_comments}
                    </div>
                  </div>
                )}

                {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                  <div className="hr-leave-detail-group hr-leave-detail-full-width">
                    <label>Attachments</label>
                    <div className="hr-leave-attachments-list">
                      {selectedRequest.attachments.map((attachment, index) => (
                        <div key={index} className="hr-leave-attachment-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          <span>{attachment}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="hr-leave-modal-footer">
                {selectedRequest.hr_status === 'Pending' ? (
                  <>
                    <button 
                      className="hr-leave-action-button hr-leave-btn-approve"
                      onClick={handleDetailedApprove}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Approve'}
                    </button>
                    <button 
                      className="hr-leave-action-button hr-leave-btn-decline"
                      onClick={handleDetailedDecline}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Decline'}
                    </button>
                  </>
                ) : (
                  <div className="hr-leave-processed-status">
                    <p>This leave request has been {selectedRequest.hr_status.toLowerCase()} by HR</p>
                    {selectedRequest.hr_status === 'Approved' && selectedRequest.supervisor_status === 'Pending' && (
                      <p>Waiting for supervisor approval</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="hr-leave-header-card">
        <div className="hr-leave-header-top">
          <div className="hr-leave-title-section">
            <h1 className="hr-leave-page-title">LEAVE MANAGEMENT</h1>
            <p className="hr-leave-breadcrumb">HR / Leave Management</p>
          </div>
          <div className="hr-leave-search-wrapper">
            <input
              type="text"
              className="hr-leave-search-field"
              placeholder={activeTab === 'requests' ? "Search by name, email, or leave type..." : "Search by name or position..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Tabs */}
        <div className="hr-leave-tabs">
          <button 
            className={`hr-leave-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Leave Requests
          </button>
          <button 
            className={`hr-leave-tab ${activeTab === 'credits' ? 'active' : ''}`}
            onClick={() => setActiveTab('credits')}
          >
            Leave Credits
          </button>
        </div>
      </div>
      
      <section className="hr-leave-content-area">
        {activeTab === 'requests' ? (
          <div className="hr-leave-cards-grid">
            {filteredRequests.length === 0 ? (
              <div className="hr-leave-empty-state">
                <p>{leaveRequests.length === 0 ? 'No leave requests found' : 'No results match your search'}</p>
              </div>
            ) : (
              filteredRequests.map((request, index) => (
                <article 
                  key={request.id || index} 
                  className="hr-leave-request-card"
                  style={{
                    animationDelay: `${index * 0.05}s`
                  }}
                >
                  <div className="hr-leave-card-header">
                    <div className="hr-leave-employee-section">
                      {renderEmployeeAvatar(request)}
                      <div className="hr-leave-employee-info">
                        <h3 className="hr-leave-employee-name">{request.name}</h3>
                        <p className="hr-leave-employee-position">{request.role}</p>
                        <p className="hr-leave-employee-email">{request.email}</p>
                      </div>
                    </div>
                    <div className="hr-leave-status-corner">
                      <span className={`hr-leave-status-indicator hr-leave-status-${request.status?.toLowerCase().replace(/\s+/g, '-').replace('hr-approved---pending-supervisor', 'hr-approved-pending')}`}>
                        {request.status === 'HR Approved - Pending Supervisor' ? 'HR Approved' : request.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="hr-leave-details-section">
                    <div className="hr-leave-info-row">
                      <span className="hr-leave-info-label">Leave Type:</span>
                      <span className="hr-leave-info-value">{request.leaveType}</span>
                    </div>
                    <div className="hr-leave-info-row">
                      <span className="hr-leave-info-label">Leave Period:</span>
                      <span className="hr-leave-info-value">{request.leaveDate}</span>
                    </div>
                    <div className="hr-leave-info-row">
                      <span className="hr-leave-info-label">Days:</span>
                      <span className="hr-leave-info-value">{request.daysRequested} business days</span>
                    </div>
                    <div className="hr-leave-info-row">
                      <span className="hr-leave-info-label">HR Status:</span>
                      <span className={`hr-leave-status-indicator hr-leave-status-${request.hr_status?.toLowerCase()}`}>
                        {request.hr_status}
                      </span>
                    </div>
                    <div className="hr-leave-info-row">
                      <span className="hr-leave-info-label">Supervisor Status:</span>
                      <span className={`hr-leave-status-indicator hr-leave-status-${request.supervisor_status?.toLowerCase()}`}>
                        {request.supervisor_status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="hr-leave-card-actions">
                    <button 
                      className="hr-leave-action-button hr-leave-btn-view"
                      onClick={() => handleViewDetail(request)}
                    >
                      View Detail
                    </button>
                    {request.hr_status === 'Pending' && (
                      <>
                        <button 
                          className="hr-leave-action-button hr-leave-btn-approve"
                          onClick={() => handleApprove(request)}
                          disabled={loading}
                        >
                          Approve
                        </button>
                        <button 
                          className="hr-leave-action-button hr-leave-btn-decline"
                          onClick={() => handleDecline(request)}
                          disabled={loading}
                        >
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        ) : (
          /* Leave Credits Table */
          <div className="hr-leave-table-container">
            <div className="hr-leave-table-wrapper">
              <table className="hr-leave-table">
                <thead>
                  <tr className="hr-leave-table-header">
                    <th>EMPLOYEE ID</th>
                    <th>EMPLOYEE NAME</th>
                    <th>VACATION LEAVE CREDITS</th>
                    <th>SICK LEAVE CREDITS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCreditsData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="hr-leave-empty-cell">
                        {leaveCredits.length === 0 ? 'No leave credits found' : 'No results match your search'}
                      </td>
                    </tr>
                  ) : (
                    currentCreditsData.map((credit, index) => (
                      <tr key={credit.id || index} className="hr-leave-table-row">
                        <td className="hr-leave-emp-id-cell">EN{credit.emp_id}</td>
                        <td className="hr-leave-name-cell">
                          <div className="hr-leave-employee-info-table">
                            <div className="hr-leave-employee-avatar-small">
                              <span>
                                {credit.name ? credit.name.split(' ').map(n => n[0]).join('') : 'N/A'}
                              </span>
                            </div>
                            <div className="hr-leave-employee-details">
                              <span className="hr-leave-employee-name-table">{credit.name}</span>
                              <span className="hr-leave-employee-position-table">{credit.position || 'Not Assigned'}</span>
                            </div>
                          </div>
                        </td>
                         <td className="hr-leave-credits-cell">
                          <div className="hr-leave-credits-info">
                            <span className="hr-leave-credits-total">{credit.remaining_vacation}</span>
                          </div>
                        </td>
                        <td className="hr-leave-credits-cell">
                          <div className="hr-leave-credits-info">
                            <span className="hr-leave-credits-total">{credit.remaining_sick}</span>
                          </div>
                        </td>
                        <td className="hr-leave-actions-cell">
                          <button 
                            className="hr-leave-manage-btn"
                            onClick={() => handleEditCredits(credit)}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Credits Table */}
            {filteredCredits.length > 0 && (
              <div className="hr-leave-pagination-area">
                <div className="hr-leave-pagination-info">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredCredits.length)} of {filteredCredits.length} entries
                </div>
                <div className="hr-leave-pagination-buttons">
                  {renderPaginationButtons()}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default LeaveManagement;