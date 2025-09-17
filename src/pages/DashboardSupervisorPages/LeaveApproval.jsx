import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser, getUserId } from '../../utils/auth';
import '../../components/SupervisorLayout/LeaveApproval.css';

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

const LeaveApproval = () => {
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
  const [supervisorInfo, setSupervisorInfo] = useState({
    supervisor_id: null,
    supervisor_name: 'Loading...'
  });

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    // Get supervisor info and load leave requests
    const userId = getUserId();
    const currentUser = getCurrentUser();
    
    if (userId && currentUser) {
      setSupervisorInfo({
        supervisor_id: userId,
        supervisor_name: `${currentUser.firstName} ${currentUser.lastName}`
      });
      loadLeaveRequests(userId);
    } else {
      window.location.href = '/login';
    }
    
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

  const loadLeaveRequests = async (supervisorId) => {
    try {
      setLoading(true);
      const response = await api.get('/leave_management.php', {
        params: {
          action: 'supervisor_requests',
          supervisor_id: supervisorId
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

  const renderEmployeeAvatar = (request) => {
    const initials = request.name ? request.name.split(' ').map(n => n[0]).join('') : 'N/A';
    
    return (
      <div className="sup-leave-employee-avatar">
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

  const handleSupervisorStatusUpdate = async (status, comments = '') => {
    if (!selectedRequest) return;
    
    try {
      setLoading(true);
      
      const response = await api.put('/leave_management.php?action=update_supervisor_status', {
        leave_id: selectedRequest.id,
        status: status,
        comments: comments,
        supervisor_id: supervisorInfo.supervisor_id,
        // Include leave details for attendance creation
        emp_id: selectedRequest.emp_id,
        start_date: selectedRequest.startDate,
        end_date: selectedRequest.endDate,
        is_paid: selectedRequest.is_paid || 'No'
      });
  
      if (response.data.success) {
        showCustomAlert('success', 'Success', `Leave request ${status.toLowerCase()} successfully`);
        setShowViewDetails(false);
        setSelectedRequest(null);
        await loadLeaveRequests(supervisorInfo.supervisor_id);
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
      
      const response = await api.put('/leave_management.php?action=update_supervisor_status', {
        leave_id: request.leave_id,
        status: 'Approved',
        comments: 'Approved by Supervisor',
        supervisor_id: supervisorInfo.supervisor_id
      });
  
      if (response.data.success) {
        showCustomAlert('success', 'Success', 'Leave request approved successfully');
        await loadLeaveRequests(supervisorInfo.supervisor_id);
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
    showCustomConfirm(
      'Confirm Approval',
      `Are you sure you want to approve ${request.name}'s leave request?`,
      () => approveRequest(request)
    );
  };

  const declineRequest = async (request, reason) => {
    try {
      setLoading(true);
      
      const response = await api.put('/leave_management.php?action=update_supervisor_status', {
        leave_id: request.leave_id,
        status: 'Rejected',
        comments: reason,
        supervisor_id: supervisorInfo.supervisor_id
      });
  
      if (response.data.success) {
        showCustomAlert('success', 'Success', 'Leave request declined successfully');
        await loadLeaveRequests(supervisorInfo.supervisor_id);
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
        handleSupervisorStatusUpdate('Approved', 'Approved by Supervisor');
      }
    );
  };

  const handleDetailedDecline = async () => {
    showCustomPrompt(
      'Decline Request',
      'Please provide a reason for declining this leave request:',
      (reason) => {
        handleSupervisorStatusUpdate('Rejected', reason);
      }
    );
  };

  useEffect(() => {
    document.title = "DIFSYS | LEAVE APPROVAL";
  }, []);

  const filteredRequests = leaveRequests.filter(request =>
    request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.leaveType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && leaveRequests.length === 0) {
    return (
      <main className="sup-leave-container">
        <div className="sup-leave-loading-state">
          <p>Loading leave requests...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`sup-leave-container ${isLoaded ? 'sup-leave-active' : ''}`}>
      {/* Loading overlay */}
      {loading && (
        <div className="sup-leave-overlay">
          <div className="sup-leave-spinner-wrapper">
            <div className="sup-leave-spinner"></div>
            <p>Processing...</p>
          </div>
        </div>
      )}

      {/* Custom Alert Dialog */}
      {showAlert && (
        <div className="sup-leave-alert-overlay">
          <div className={`sup-leave-alert-box sup-leave-alert-${alertData.type}`}>
            <div className="sup-leave-alert-icon">
              {alertData.type === 'success' ? '✓' : '✕'}
            </div>
            <h3>{alertData.title}</h3>
            <p>{alertData.message}</p>
            <button 
              className="sup-leave-alert-button"
              onClick={() => setShowAlert(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      {showConfirm && (
        <div className="sup-leave-confirm-overlay">
          <div className="sup-leave-confirm-box">
            <h3>{confirmData.title}</h3>
            <p>{confirmData.message}</p>
            <div className="sup-leave-confirm-buttons">
              <button 
                className="sup-leave-action-btn sup-leave-btn-cancel"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="sup-leave-action-btn sup-leave-btn-confirm"
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
        <div className="sup-leave-prompt-overlay">
          <div className="sup-leave-prompt-box">
            <h3>{promptData.title}</h3>
            <p>{promptData.message}</p>
            <textarea
              className="sup-leave-text-area"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder="Enter your reason here..."
            />
            <div className="sup-leave-prompt-buttons">
              <button 
                className="sup-leave-action-btn sup-leave-btn-cancel"
                onClick={() => setShowPrompt(false)}
              >
                Cancel
              </button>
              <button 
                className="sup-leave-action-btn sup-leave-btn-confirm"
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

      {/* View Details Modal */}
      {showViewDetails && selectedRequest && (
        <div className="sup-leave-modal-backdrop">
          <div className="sup-leave-modal-window">
            <div className="sup-leave-modal-header">
              <h3>Leave Request Details</h3>
              <button 
                className="sup-leave-modal-close"
                onClick={() => {
                  setShowViewDetails(false);
                  setSelectedRequest(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="sup-leave-modal-body">
              <div className="sup-leave-employee-detailed">
                <div className="sup-leave-avatar-large">
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
                <div className="sup-leave-employee-detailed-info">
                  <h3>{selectedRequest.employeeName || selectedRequest.name}</h3>
                  <p>{selectedRequest.employeePosition || selectedRequest.role}</p>
                  <p>{selectedRequest.employeeEmail || selectedRequest.email}</p>
                </div>
              </div>

              <div className="sup-leave-modal-details">
                <div className="sup-leave-detail-group">
                  <label>Leave Type</label>
                  <span>{selectedRequest.leaveType || selectedRequest.subject}</span>
                </div>

                <div className="sup-leave-detail-group">
                  <label>Start Date</label>
                  <span>{new Date(selectedRequest.startDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>

                <div className="sup-leave-detail-group">
                  <label>End Date</label>
                  <span>{new Date(selectedRequest.endDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>

                <div className="sup-leave-detail-group">
                  <label>Days Requested</label>
                  <span>{selectedRequest.daysRequested} business days</span>
                </div>

                <div className="sup-leave-detail-group">
                  <label>HR Status</label>
                  <span className={`sup-leave-status-indicator sup-leave-status-${selectedRequest.hr_status?.toLowerCase()}`}>
                    {selectedRequest.hr_status}
                  </span>
                </div>

                <div className="sup-leave-detail-group">
                  <label>Supervisor Status</label>
                  <span className={`sup-leave-status-indicator sup-leave-status-${selectedRequest.supervisor_status?.toLowerCase()}`}>
                    {selectedRequest.supervisor_status}
                  </span>
                </div>

                <div className="sup-leave-detail-group sup-leave-detail-full-width">
                  <label>Reason for Leave</label>
                  <div className="sup-leave-reason-display">
                    {selectedRequest.reason || selectedRequest.description}
                  </div>
                </div>

                {selectedRequest.hr_comments && (
                  <div className="sup-leave-detail-group sup-leave-detail-full-width">
                    <label>HR Comments</label>
                    <div className="sup-leave-comments-display">
                      {selectedRequest.hr_comments}
                    </div>
                  </div>
                )}

                {selectedRequest.supervisor_comments && (
                  <div className="sup-leave-detail-group sup-leave-detail-full-width">
                    <label>Supervisor Comments</label>
                    <div className="sup-leave-comments-display">
                      {selectedRequest.supervisor_comments}
                    </div>
                  </div>
                )}

                {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                  <div className="sup-leave-detail-group sup-leave-detail-full-width">
                    <label>Attachments</label>
                    <div className="sup-leave-attachments-list">
                      {selectedRequest.attachments.map((attachment, index) => (
                        <div key={index} className="sup-leave-attachment-item">
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

              <div className="sup-leave-modal-footer">
                {selectedRequest.supervisor_status === 'Pending' ? (
                  <>
                    <button 
                      className="sup-leave-action-button sup-leave-btn-approve"
                      onClick={handleDetailedApprove}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Approve'}
                    </button>
                    <button 
                      className="sup-leave-action-button sup-leave-btn-decline"
                      onClick={handleDetailedDecline}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Decline'}
                    </button>
                  </>
                ) : (
                  <div className="sup-leave-processed-status">
                    <p>This leave request has been {selectedRequest.supervisor_status.toLowerCase()} by supervisor</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="sup-leave-main-header">
        <h1 className="sup-leave-page-title">LEAVE APPROVAL</h1>
        <div className="sup-leave-search-wrapper">
          <input
            type="text"
            className="sup-leave-search-field"
            placeholder="Search by name, email, or leave type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>
      
      <section className="sup-leave-content-area">
        <div className="sup-leave-cards-grid">
          {filteredRequests.length === 0 ? (
            <div className="sup-leave-empty-state">
              <p>{leaveRequests.length === 0 ? 'No leave requests found' : 'No results match your search'}</p>
            </div>
          ) : (
            filteredRequests.map((request, index) => (
              <article 
                key={request.id || index} 
                className="sup-leave-request-card"
                style={{
                  animationDelay: `${index * 0.05}s`
                }}
              >
                <div className="sup-leave-card-header">
                  <div className="sup-leave-employee-section">
                    {renderEmployeeAvatar(request)}
                    <div className="sup-leave-employee-info">
                      <h3 className="sup-leave-employee-name">{request.name}</h3>
                      <p className="sup-leave-employee-position">{request.role}</p>
                      <p className="sup-leave-employee-email">{request.email}</p>
                    </div>
                  </div>
                  <div className="sup-leave-status-corner">
                    <span className={`sup-leave-status-indicator sup-leave-status-${request.supervisor_status?.toLowerCase()}`}>
                      {request.supervisor_status}
                    </span>
                  </div>
                </div>
                
                <div className="sup-leave-details-section">
                  <div className="sup-leave-info-row">
                    <span className="sup-leave-info-label">Leave Type:</span>
                    <span className="sup-leave-info-value">{request.leaveType}</span>
                  </div>
                  <div className="sup-leave-info-row">
                    <span className="sup-leave-info-label">Leave Period:</span>
                    <span className="sup-leave-info-value">{request.leaveDate}</span>
                  </div>
                  <div className="sup-leave-info-row">
                    <span className="sup-leave-info-label">Days:</span>
                    <span className="sup-leave-info-value">{request.daysRequested} business days</span>
                  </div>
                  <div className="sup-leave-info-row">
                    <span className="sup-leave-info-label">HR Status:</span>
                    <span className={`sup-leave-status-indicator sup-leave-status-${request.hr_status?.toLowerCase()}`}>
                      {request.hr_status}
                    </span>
                  </div>
                </div>
                
                <div className="sup-leave-card-actions">
                  <button 
                    className="sup-leave-action-button sup-leave-btn-view"
                    onClick={() => handleViewDetail(request)}
                  >
                    View Detail
                  </button>
                  {request.supervisor_status === 'Pending' && (
                    <>
                      <button 
                        className="sup-leave-action-button sup-leave-btn-approve"
                        onClick={() => handleApprove(request)}
                        disabled={loading}
                      >
                        Approve
                      </button>
                      <button 
                        className="sup-leave-action-button sup-leave-btn-decline"
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
      </section>
    </main>
  );
};

export default LeaveApproval;