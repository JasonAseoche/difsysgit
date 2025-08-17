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

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    // Load leave requests
    loadLeaveRequests();
    
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
          // Fetch employee profile image from useraccounts table
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
      <div className="leave-avatar">
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
          fontSize: '14px',
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

  const handleStatusUpdate = async (status, comments = '') => {
    if (!selectedRequest) return;
    
    try {
      setLoading(true);
      
      const response = await api.put('/leave_management.php?action=update_status', {
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
      
      // Better error handling
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
      
      const response = await api.put('/leave_management.php?action=update_status', {
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
    showCustomConfirm(
      'Confirm Approval',
      `Are you sure you want to approve ${request.name}'s leave request?`,
      () => approveRequest(request)
    );
  };


  const declineRequest = async (request, reason) => {
    try {
      setLoading(true);
      
      const response = await api.put('/leave_management.php?action=update_status', {
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
        handleStatusUpdate('Approved', 'Approved by HR');
      }
    );
  };

  const handleDetailedDecline = async () => {
    showCustomPrompt(
      'Decline Request',
      'Please provide a reason for declining this leave request:',
      (reason) => {
        handleStatusUpdate('Rejected', reason);
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

  if (loading && leaveRequests.length === 0) {
    return (
      <main className="leave-management">
        <div className="leave-loading">
          <p>Loading leave requests...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`leave-management ${isLoaded ? 'leave-loaded' : ''}`}>
      {/* Loading overlay */}
      {loading && (
          <div className="leave-loading-overlay">
            <div className="leave-loading-content">
              <div className="leave-loading-spinner"></div>
              <p>Processing...</p>
            </div>
          </div>
        )}

        {/* Custom Alert Dialog */}
{showAlert && (
  <div className="leave-alert-overlay">
    <div className={`leave-alert-dialog leave-alert-${alertData.type}`}>
      <div className="leave-alert-icon">
        {alertData.type === 'success' ? '✓' : '✕'}
      </div>
      <h3>{alertData.title}</h3>
      <p>{alertData.message}</p>
      <button 
        className="leave-alert-btn"
        onClick={() => setShowAlert(false)}
      >
        OK
      </button>
    </div>
  </div>
)}

{/* Custom Confirm Dialog */}
{showConfirm && (
  <div className="leave-confirm-overlay">
    <div className="leave-confirm-dialog">
      <h3>{confirmData.title}</h3>
      <p>{confirmData.message}</p>
      <div className="leave-confirm-actions">
        <button 
          className="leave-confirm-btn leave-confirm-btn-cancel"
          onClick={() => setShowConfirm(false)}
        >
          Cancel
        </button>
        <button 
          className="leave-confirm-btn leave-confirm-btn-confirm"
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
  <div className="leave-prompt-overlay">
    <div className="leave-prompt-dialog">
      <h3>{promptData.title}</h3>
      <p>{promptData.message}</p>
      <textarea
        className="leave-prompt-input"
        value={promptValue}
        onChange={(e) => setPromptValue(e.target.value)}
        placeholder="Enter your reason here..."
      />
      <div className="leave-prompt-actions">
        <button 
          className="leave-confirm-btn leave-confirm-btn-cancel"
          onClick={() => setShowPrompt(false)}
        >
          Cancel
        </button>
        <button 
          className="leave-confirm-btn leave-confirm-btn-confirm"
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
        <div className="leave-modal-overlay">
          <div className="leave-modal">
            <div className="leave-modal-header">
              <h3>Leave Request Details</h3>
              <button 
                className="leave-close-btn"
                onClick={() => {
                  setShowViewDetails(false);
                  setSelectedRequest(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="leave-modal-content">
              <div className="leave-employee-info-detailed">
              <div className="leave-avatar-large">
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
                    <span>{selectedRequest.name.split(' ').map(n => n[0]).join('')}</span>
                  )}
                </div>
                <div className="leave-employee-details-large">
                  <h3>{selectedRequest.employeeName || selectedRequest.name}</h3>
                  <p>{selectedRequest.employeePosition || selectedRequest.role}</p>
                  <p>{selectedRequest.employeeEmail || selectedRequest.email}</p>
                </div>
              </div>

              <div className="leave-details-grid">
                <div className="leave-detail-item">
                  <label>Leave Type</label>
                  <span>{selectedRequest.leaveType || selectedRequest.subject}</span>
                </div>
                
                <div className="leave-detail-item">
                  <label>Priority</label>
                  <span className={`leave-priority-badge leave-priority-${selectedRequest.priority?.toLowerCase()}`}>
                    {selectedRequest.priority}
                  </span>
                </div>

                <div className="leave-detail-item">
                  <label>Start Date</label>
                  <span>{new Date(selectedRequest.startDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>

                <div className="leave-detail-item">
                  <label>End Date</label>
                  <span>{new Date(selectedRequest.endDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>

                <div className="leave-detail-item">
                  <label>Days Requested</label>
                  <span>{selectedRequest.daysRequested} business days</span>
                </div>

                <div className="leave-detail-item">
                  <label>Status</label>
                  <span className={`leave-status-badge leave-status-${selectedRequest.status?.toLowerCase()}`}>
                    {selectedRequest.status}
                  </span>
                </div>

                <div className="leave-detail-item leave-detail-full">
                  <label>Reason for Leave</label>
                  <div className="leave-reason-box">
                    {selectedRequest.reason || selectedRequest.description}
                  </div>
                </div>

                {selectedRequest.comments && (
                  <div className="leave-detail-item leave-detail-full">
                    <label>HR Comments</label>
                    <div className="leave-comments-box">
                      {selectedRequest.comments}
                    </div>
                  </div>
                )}

                {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                  <div className="leave-detail-item leave-detail-full">
                    <label>Attachments</label>
                    <div className="leave-attachments">
                      {selectedRequest.attachments.map((attachment, index) => (
                        <div key={index} className="leave-attachment-item">
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

              <div className="leave-modal-actions">
                {selectedRequest.status === 'Pending' ? (
                  <>
                    <button 
                      className="leave-btn leave-btn-approve"
                      onClick={handleDetailedApprove}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Approve'}
                    </button>
                    <button 
                      className="leave-btn leave-btn-decline"
                      onClick={handleDetailedDecline}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Decline'}
                    </button>
                  </>
                ) : (
                  <div className="leave-status-info">
                    <p>This leave request has been {selectedRequest.status.toLowerCase()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="leave-header">
        <h1 className="leave-title">LEAVE MANAGEMENT</h1>
        <div className="leave-search-container">
          <input
            type="text"
            className="leave-search-input"
            placeholder="Search by name, email, or leave type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>
      
      <section className="leave-cards-container">
        <div className="leave-cards-grid">
          {filteredRequests.length === 0 ? (
            <div className="leave-no-requests">
              <p>{leaveRequests.length === 0 ? 'No leave requests found' : 'No results match your search'}</p>
            </div>
          ) : (
            filteredRequests.map((request, index) => (
              <article 
                key={request.id || index} 
                className="leave-card"
                style={{
                  animationDelay: `${index * 0.05}s`
                }}
              >
                <div className="leave-card-header">
                  <div className="leave-employee-info">
                       {renderEmployeeAvatar(request)}
                    <div className="leave-employee-details">
                      <h3 className="leave-employee-name">{request.name}</h3>
                      <p className="leave-employee-role">{request.role}</p>
                      <p className="leave-employee-email">{request.email}</p>
                    </div>
                  </div>
                  <div className="leave-status-corner">
                    <span className={`leave-status-badge leave-status-${request.status?.toLowerCase()}`}>
                      {request.status}
                    </span>
                  </div>
                </div>
                
                <div className="leave-info">
                  <div className="leave-info-row">
                    <span className="leave-label">Leave Type:</span>
                    <span className="leave-value">{request.leaveType}</span>
                  </div>
                  <div className="leave-info-row">
                    <span className="leave-label">Leave Period:</span>
                    <span className="leave-value">{request.leaveDate}</span>
                  </div>
                  <div className="leave-info-row">
                    <span className="leave-label">Days:</span>
                    <span className="leave-value">{request.daysRequested} business days</span>
                  </div>
                </div>
                
                <div className="leave-card-actions">
                  <button 
                    className="leave-btn leave-btn-view"
                    onClick={() => handleViewDetail(request)}
                  >
                    View Detail
                  </button>
                  {request.status === 'Pending' && (
                    <>
                      <button 
                        className="leave-btn leave-btn-approve"
                        onClick={() => handleApprove(request)}
                        disabled={loading}
                      >
                        Approve
                      </button>
                      <button 
                        className="leave-btn leave-btn-decline"
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

export default LeaveManagement;