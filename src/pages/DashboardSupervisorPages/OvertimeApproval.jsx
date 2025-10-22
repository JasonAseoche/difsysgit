import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser, getUserId } from '../../utils/auth';
import '../../components/SupervisorLayout/OvertimeApproval.css';

const API_BASE_URL = 'http://localhost/difsysapi';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return Promise.reject(error);
  }
);

const OvertimeApproval = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isLoaded, setIsLoaded] = useState(false);
  const [overtimeRequests, setOvertimeRequests] = useState([]);
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

  const itemsPerPage = 8;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    const userId = getUserId();
    const currentUser = getCurrentUser();
    
    if (userId && currentUser) {
      setSupervisorInfo({
        supervisor_id: userId,
        supervisor_name: `${currentUser.firstName} ${currentUser.lastName}`
      });
      loadOvertimeRequests(userId);
    } else {
      window.location.href = '/login';
    }
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.title = "DIFSYS | OVERTIME APPROVAL";
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

  const loadOvertimeRequests = async (supervisorId) => {
    try {
      setLoading(true);
      const response = await api.get('/overtime_approval.php', {
        params: {
          action: 'get_all_requests',
          supervisor_id: supervisorId
        }
      });
      
      if (response.data.success) {
        setOvertimeRequests(response.data.requests);
      } else {
        showCustomAlert('error', 'Error', 'Failed to load overtime requests: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error loading overtime requests:', error);
      showCustomAlert('error', 'Connection Error', 'Error loading overtime requests. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (request) => {
    setSelectedRequest(request);
    setShowViewDetails(true);
  };

  const approveRequest = async (request, comments = 'Approved by Supervisor') => {
    try {
      setLoading(true);
      
      const response = await api.post('/overtime_approval.php', {
        action: 'update_status',
        otr_id: request.otr_id,
        status: 'Approved',
        supervisor_id: supervisorInfo.supervisor_id,
        remarks: comments
      });
  
      if (response.data.success) {
        showCustomAlert('success', 'Success', 'Overtime request approved successfully');
        await loadOvertimeRequests(supervisorInfo.supervisor_id);
      } else {
        showCustomAlert('error', 'Error', 'Failed to approve overtime request: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error approving overtime request:', error);
      showCustomAlert('error', 'Error', 'An error occurred while approving the overtime request');
    } finally {
      setLoading(false);
    }
  };

  const declineRequest = async (request, reason) => {
    try {
      setLoading(true);
      
      const response = await api.post('/overtime_approval.php', {
        action: 'update_status',
        otr_id: request.otr_id,
        status: 'Declined',
        supervisor_id: supervisorInfo.supervisor_id,
        remarks: reason
      });
  
      if (response.data.success) {
        showCustomAlert('success', 'Success', 'Overtime request declined successfully');
        await loadOvertimeRequests(supervisorInfo.supervisor_id);
      } else {
        showCustomAlert('error', 'Error', 'Failed to decline overtime request: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error declining overtime request:', error);
      showCustomAlert('error', 'Error', 'An error occurred while declining the overtime request');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (request) => {
    showCustomConfirm(
      'Confirm Approval',
      `Are you sure you want to approve ${request.employee_name}'s overtime request?`,
      () => approveRequest(request)
    );
  };

  const handleDecline = (request) => {
    showCustomPrompt(
      'Decline Request',
      'Please provide a reason for declining this overtime request:',
      (reason) => declineRequest(request, reason)
    );
  };

  const handleDetailedApprove = () => {
    showCustomConfirm(
      'Confirm Approval',
      'Are you sure you want to approve this overtime request?',
      () => {
        approveRequest(selectedRequest, 'Approved by Supervisor');
        setShowViewDetails(false);
      }
    );
  };

  const handleDetailedDecline = () => {
    showCustomPrompt(
      'Decline Request',
      'Please provide a reason for declining this overtime request:',
      (reason) => {
        declineRequest(selectedRequest, reason);
        setShowViewDetails(false);
      }
    );
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  };

  const getStatusBadgeClass = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'pending') return 'otrStatusPending';
    if (statusLower === 'approved') return 'otrStatusApproved';
    if (statusLower === 'declined') return 'otrStatusDeclined';
    return 'otrStatusPending';
  };

  const filteredRequests = overtimeRequests
    .filter(request => {
      const matchesSearch = 
        request.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.project_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'All Status' || request.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredRequests.slice(startIndex, endIndex);

  const renderPaginationButtons = () => {
    const buttons = [];
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`otrPaginationBtn ${currentPage === i ? 'otrPaginationActive' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(
        <span key="dots" className="otrPaginationDots">...</span>
      );
      buttons.push(
        <button
          key={totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className={`otrPaginationBtn ${currentPage === totalPages ? 'otrPaginationActive' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  if (loading && overtimeRequests.length === 0) {
    return (
      <div className="otrMainContainer">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <p>Loading overtime requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="otrMainContainer">
      {loading && (
        <div className="otrOverlay">
          <div className="otrSpinnerWrapper">
            <div className="otrSpinner"></div>
            <p>Processing...</p>
          </div>
        </div>
      )}

      {showAlert && (
        <div className="otrAlertOverlay">
          <div className={`otrAlertBox otrAlert-${alertData.type}`}>
            <div className="otrAlertIcon">
              {alertData.type === 'success' ? '✓' : '✕'}
            </div>
            <h3>{alertData.title}</h3>
            <p>{alertData.message}</p>
            <button 
              className="otrAlertButton"
              onClick={() => setShowAlert(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="otrConfirmOverlay">
          <div className="otrConfirmBox">
            <h3>{confirmData.title}</h3>
            <p>{confirmData.message}</p>
            <div className="otrConfirmButtons">
              <button 
                className="otrActionBtn otrBtnCancel"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="otrActionBtn otrBtnConfirm"
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

      {showPrompt && (
        <div className="otrPromptOverlay">
          <div className="otrPromptBox">
            <h3>{promptData.title}</h3>
            <p>{promptData.message}</p>
            <textarea
              className="otrTextArea"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder="Enter your reason here..."
            />
            <div className="otrPromptButtons">
              <button 
                className="otrActionBtn otrBtnCancel"
                onClick={() => setShowPrompt(false)}
              >
                Cancel
              </button>
              <button 
                className="otrActionBtn otrBtnConfirm"
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

      {showViewDetails && selectedRequest && (
        <div className="otrModalOverlay" onClick={() => setShowViewDetails(false)}>
          <div className="otrModalContent otrModalLarge" onClick={(e) => e.stopPropagation()}>
            <div className="otrModalHeader">
              <h2>Overtime Request Details</h2>
              <button className="otrModalClose" onClick={() => setShowViewDetails(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="otrDetailsContent">
              <div className="otrDetailSection">
                <h3>Basic Information</h3>
                <div className="otrDetailRow">
                  <span className="otrDetailLabel">OTR ID:</span>
                  <span className="otrDetailValue">OTR-{selectedRequest.otr_id}</span>
                </div>
                <div className="otrDetailRow">
                  <span className="otrDetailLabel">Date Filed:</span>
                  <span className="otrDetailValue">{formatDate(selectedRequest.date_filed)}</span>
                </div>
                <div className="otrDetailRow">
                  <span className="otrDetailLabel">Employee Number:</span>
                  <span className="otrDetailValue">{selectedRequest.employee_number}</span>
                </div>
                <div className="otrDetailRow">
                  <span className="otrDetailLabel">Employee Name:</span>
                  <span className="otrDetailValue">{selectedRequest.employee_name}</span>
                </div>
                <div className="otrDetailRow">
                  <span className="otrDetailLabel">Status:</span>
                  <span className={`otrStatusBadge ${getStatusBadgeClass(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              <div className="otrDetailSection">
                <h3>Project Details</h3>
                <div className="otrDetailRow">
                  <span className="otrDetailLabel">Project Number:</span>
                  <span className="otrDetailValue">{selectedRequest.project_number}</span>
                </div>
                <div className="otrDetailRow">
                  <span className="otrDetailLabel">Project Name:</span>
                  <span className="otrDetailValue">{selectedRequest.project_name}</span>
                </div>
                <div className="otrDetailRow">
                  <span className="otrDetailLabel">Project Phase:</span>
                  <span className="otrDetailValue">{selectedRequest.project_phase}</span>
                </div>
              </div>

              <div className="otrDetailSection">
                <h3>Time Details</h3>
                <div className="otrDetailRow">
                    <span className="otrDetailLabel">Hours Requested:</span>
                    <span className="otrDetailValue">
                      {selectedRequest.hours_requested > 0 && `${selectedRequest.hours_requested} ${selectedRequest.hours_requested === 1 ? 'hour' : 'hours'}`}
                      {selectedRequest.minutes_requested > 0 && ` ${selectedRequest.minutes_requested} ${selectedRequest.minutes_requested === 1 ? 'min' : 'mins'}`}
                    </span>
                  </div>
                <div className="otrDetailRow">
                  <span className="otrDetailLabel">End Time:</span>
                  <span className="otrDetailValue">{selectedRequest.end_time}</span>
                </div>
              </div>

              <div className="otrDetailSection">
                <h3>Task Information</h3>
                <div className="otrDetailRow otrDetailFullWidth">
                  <span className="otrDetailLabel">Task Description:</span>
                  <p className="otrDetailText">{selectedRequest.task_description}</p>
                </div>
              </div>

              <div className="otrDetailSection">
                <h3>Purpose</h3>
                <div className="otrDetailRow otrDetailFullWidth">
                  <span className="otrDetailLabel">Why not accomplished earlier?</span>
                  <p className="otrDetailText">{selectedRequest.not_earlier_reason}</p>
                </div>
                <div className="otrDetailRow otrDetailFullWidth">
                  <span className="otrDetailLabel">Why not accomplished later?</span>
                  <p className="otrDetailText">{selectedRequest.not_later_reason}</p>
                </div>
                <div className="otrDetailRow">
                  <span className="otrDetailLabel">Is Urgent?</span>
                  <span className="otrDetailValue">{selectedRequest.is_urgent}</span>
                </div>
                {selectedRequest.is_urgent === 'Yes' && selectedRequest.urgent_explanation && (
                  <div className="otrDetailRow otrDetailFullWidth">
                    <span className="otrDetailLabel">Urgent Explanation:</span>
                    <p className="otrDetailText">{selectedRequest.urgent_explanation}</p>
                  </div>
                )}
              </div>

              {selectedRequest.remarks && (
                <div className="otrDetailSection">
                  <h3>Supervisor Remarks</h3>
                  <div className="otrDetailRow otrDetailFullWidth">
                    <p className="otrDetailText">{selectedRequest.remarks}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="otrModalFooter">
              {selectedRequest.status === 'Pending' ? (
                <>
                  <button 
                    className="otrActionButton otrBtnApprove"
                    onClick={handleDetailedApprove}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Approve'}
                  </button>
                  <button 
                    className="otrActionButton otrBtnDecline"
                    onClick={handleDetailedDecline}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Decline'}
                  </button>
                </>
              ) : (
                <div className="otrProcessedStatus">
                  <p>This overtime request has been {selectedRequest.status.toLowerCase()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="otrHeaderSection">
        <h1 className="otrPageTitle">OVERTIME APPROVAL</h1>
        <div className="otrHeaderControls">
          <select 
            className="otrFilterSelect"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All Status">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Declined">Declined</option>
          </select>
          <input
            type="text"
            className="otrSearchField"
            placeholder="Search by name, ID, or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="otrTableSection">
        <table className="otrDataTable">
          <thead>
            <tr className="otrTableHeader">
              <th>OTR ID</th>
              <th>EMPLOYEE</th>
              <th>DATE FILED</th>
              <th>PROJECT</th>
              <th>HOURS</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((request) => (
                <tr key={request.otr_id} className="otrTableRow">
                  <td className="otrIdCell">OTR-{request.otr_id}</td>
                  <td className="otrEmployeeCell">
                    <div>{request.employee_name}</div>
                    <div className="otrEmployeeId">{request.employee_number}</div>
                  </td>
                  <td className="otrDateCell">{formatDate(request.date_filed)}</td>
                  <td className="otrProjectCell">{request.project_name}</td>
                  <td className="otrHoursCell">
                      {request.hours_requested > 0 && `${request.hours_requested} ${request.hours_requested === 1 ? 'hour' : 'hours'}`}
                      {request.minutes_requested > 0 && ` ${request.minutes_requested} ${request.minutes_requested === 1 ? 'min' : 'mins'}`}
                    </td>
                  <td className="otrStatusCell">
                    <span className={`otrStatusBadge ${getStatusBadgeClass(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="otrActionCell">
                    <button 
                      className="otrViewBtn"
                      onClick={() => handleViewDetail(request)}
                    >
                      View
                    </button>
                    {request.status === 'Pending' && (
                      <>
                        <button 
                          className="otrApproveBtn"
                          onClick={() => handleApprove(request)}
                          disabled={loading}
                        >
                          Approve
                        </button>
                        <button 
                          className="otrDeclineBtn"
                          onClick={() => handleDecline(request)}
                          disabled={loading}
                        >
                          Decline
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No overtime requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {filteredRequests.length > 0 && (
          <div className="otrPaginationArea">
            <div className="otrPaginationInfo">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} entries
            </div>
            <div className="otrPaginationButtons">
              {renderPaginationButtons()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OvertimeApproval;

  