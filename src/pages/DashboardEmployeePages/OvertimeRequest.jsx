import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser, getUserId } from '../../utils/auth';
import '../../components/EmployeeLayout/OvertimeRequest.css';


const CustomAlert = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 20h20L12 2z" fill="currentColor" opacity="0.2"/>
            <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
    }
  };

  return (
    <div className={`otrCustomAlert otrCustomAlert-${type}`}>
      <div className="otrCustomAlertIcon">{getIcon()}</div>
      <p className="otrCustomAlertMessage">{message}</p>
      <button className="otrCustomAlertClose" onClick={onClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  );
};

const OvertimeRequest = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [employeeInfo, setEmployeeInfo] = useState({
    firstName: 'Loading...',
    lastName: '',
    emp_id: null,
    position: 'Software Developer'
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentPayrollPeriod, setCurrentPayrollPeriod] = useState(null);
  const [alert, setAlert] = useState(null);
  
  const [formData, setFormData] = useState({
    dateFiled: new Date().toISOString().split('T')[0],
    employeeNumber: '',
    employeeName: '',
    projectNumber: '',
    projectName: '',
    projectPhase: '',
    hoursRequested: '',
    minutesRequested: '',
    endTime: '',
    taskDescription: '',
    notEarlierReason: '',
    notLaterReason: '',
    isUrgent: 'No',
    urgentExplanation: ''
  });

  const API_BASE_URL = 'http://localhost/difsysapi/overtime_request.php';
  const ATTENDANCE_API = 'http://localhost/difsysapi/attendance_api.php';
  const itemsPerPage = 8;

  // Custom alert function
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
  };

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
      
      setFormData(prev => ({
        ...prev,
        employeeNumber: `DIF${userId}`,
        employeeName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
      }));
    } else {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    document.title = "DIFSYS | OVERTIME REQUEST";
  }, []);

  useEffect(() => {
    if (employeeInfo.emp_id) {
      fetchEmployeeInfo();
      fetchCurrentPayrollPeriod();
      fetchOvertimeRequests();
    }
  }, [employeeInfo.emp_id]);

  const fetchEmployeeInfo = async () => {
    if (!employeeInfo.emp_id) return;
    
    try {
      const response = await axios.get(`${ATTENDANCE_API}?action=get_employee_info&emp_id=${employeeInfo.emp_id}`);
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

  const fetchCurrentPayrollPeriod = async () => {
    try {
      const response = await axios.get(`${ATTENDANCE_API}?action=get_current_payroll_period`);
      if (response.data.success) {
        setCurrentPayrollPeriod(response.data.payroll_period);
      }
    } catch (error) {
      console.error('Error fetching payroll period:', error);
    }
  };

  const fetchOvertimeRequests = async () => {
    if (!employeeInfo.emp_id) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}?action=get_requests&emp_id=${employeeInfo.emp_id}`);
      if (response.data.success) {
        setOvertimeRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Error fetching overtime requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEndTime = (hours) => {
    const startTime = new Date();
    startTime.setHours(17, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + (hours * 60 * 60 * 1000));
    return endTime.toTimeString().slice(0, 5);
  };

  const handleHoursChange = (hours, minutes) => {
    const totalMinutes = (hours * 60) + minutes;
    const totalHours = totalMinutes / 60;
    const startTime = new Date();
    startTime.setHours(17, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + (totalMinutes * 60 * 1000));
    
    setFormData(prev => ({
      ...prev,
      hoursRequested: hours,
      minutesRequested: minutes,
      endTime: endTime.toTimeString().slice(0, 5)
    }));
  };

  const handleOpenModal = () => {
    showAlert('This form must be requested two hours before the official time of overtime work', 'warning');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.isUrgent === 'Yes' && !formData.urgentExplanation.trim()) {
      showAlert('Please provide an explanation for why this is urgent', 'error');
      return;
    }
    
    try {
      const response = await axios.post(API_BASE_URL, {
        action: 'create_request',
        emp_id: employeeInfo.emp_id,
        ...formData
      });

      if (response.data.success) {
        showAlert('Overtime request submitted successfully!', 'success');
        setShowModal(false);
        fetchOvertimeRequests();
        setFormData({
          dateFiled: new Date().toISOString().split('T')[0],
          employeeNumber: `DIF${employeeInfo.emp_id}`,
          employeeName: `${employeeInfo.firstName} ${employeeInfo.lastName}`,
          projectNumber: '',
          projectName: '',
          projectPhase: '',
          hoursRequested: '',
          minutesRequested: '',
          endTime: '',
          taskDescription: '',
          notEarlierReason: '',
          notLaterReason: '',
          isUrgent: 'No',
          urgentExplanation: ''
        });
      } else {
        showAlert('Error submitting request: ' + response.data.message, 'error');
      }
    } catch (error) {
      console.error('Error submitting overtime request:', error);
      showAlert('Error submitting overtime request', 'error');
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
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

  const totalPages = Math.ceil(overtimeRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = overtimeRequests.slice(startIndex, endIndex);

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

  if (loading) {
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
      {/* Custom Alert */}
      {alert && (
        <CustomAlert 
          message={alert.message} 
          type={alert.type} 
          onClose={() => setAlert(null)} 
        />
      )}

      <div className="otrHeaderSection">
        <div className="otrProfileArea">
          <div className="otrAvatarCircle">
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
            <span className="otrAvatarText" style={{ display: employeeInfo.profile_image ? 'none' : 'block' }}>
              {employeeInfo.firstName?.[0]}{employeeInfo.lastName?.[0]}
            </span>
          </div>
          <div className="otrProfileDetails">
            <h1 className="otrProfileName">
              {employeeInfo.firstName} {employeeInfo.lastName}
            </h1>
            <p className="otrProfileRole">{employeeInfo.position}</p>
          </div>
        </div>

        <div className="otrInfoCards">
          <div className="otrInfoCard">
            <div className="otrInfoIcon otrIconGreen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="otrInfoContent">
              <p className="otrInfoLabel">Employee ID</p>
              <p className="otrInfoValue">DIF{employeeInfo.emp_id}</p>
            </div>
          </div>

          <div className="otrInfoCard">
            <div className="otrInfoIcon otrIconBlue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
            </div>
            <div className="otrInfoContent">
              <p className="otrInfoLabel">Payroll Period</p>
              <p className="otrInfoValue">
                {currentPayrollPeriod ? currentPayrollPeriod.display : 'No active period'}
              </p>
            </div>
          </div>

          <button 
            className="otrBackBtn"
            onClick={() => window.location.href = '/attendance'}
          >
            <div className="otrBackIcon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </div>
            <span className="otrBackText">Back to Attendance</span>
          </button>
        </div>
      </div>

      <div className="otrActionSection">
        <button className="otrRequestBtn" onClick={handleOpenModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Request Overtime
        </button>
      </div>

      <div className="otrTableSection">
        <table className="otrDataTable">
          <thead>
            <tr className="otrTableHeader">
              <th>OTR ID</th>
              <th>DATE FILED</th>
              <th>HOURS REQUESTED</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((request) => (
                <tr key={request.otr_id} className="otrTableRow">
                  <td className="otrIdCell">OTR-{request.otr_id}</td>
                  <td className="otrDateCell">{formatDate(request.date_filed)}</td>
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
                      onClick={() => handleViewDetails(request)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No overtime requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {overtimeRequests.length > 0 && (
          <div className="otrPaginationArea">
            <div className="otrPaginationInfo">
              Showing {startIndex + 1} to {Math.min(endIndex, overtimeRequests.length)} of {overtimeRequests.length} entries
            </div>
            <div className="otrPaginationButtons">
              {renderPaginationButtons()}
            </div>
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="otrModalOverlay" onClick={() => setShowModal(false)}>
          <div className="otrModalContent otrModalLarge" onClick={(e) => e.stopPropagation()}>
            <div className="otrModalHeader">
              <h2>Request Overtime</h2>
              <button className="otrModalClose" onClick={() => setShowModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="otrModalForm">
              <div className="otrFormRow">
                <div className="otrFormGroup">
                  <label>Date Filed</label>
                  <input
                    type="date"
                    value={formData.dateFiled}
                    onChange={(e) => setFormData({...formData, dateFiled: e.target.value})}
                    required
                  />
                </div>
                <div className="otrFormGroup">
                  <label>Employee Number</label>
                  <input
                    type="text"
                    value={formData.employeeNumber}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="otrFormGroup">
                <label>Employee Name</label>
                <input
                  type="text"
                  value={formData.employeeName}
                  readOnly
                  disabled
                />
              </div>

              <div className="otrFormRow">
                <div className="otrFormGroup">
                  <label>Project Number</label>
                  <input
                    type="text"
                    value={formData.projectNumber}
                    onChange={(e) => setFormData({...formData, projectNumber: e.target.value})}
                    required
                  />
                </div>
                <div className="otrFormGroup">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="otrFormGroup">
                <label>Project Phase</label>
                <input
                  type="text"
                  value={formData.projectPhase}
                  onChange={(e) => setFormData({...formData, projectPhase: e.target.value})}
                  required
                />
              </div>

              <div className="otrFormRow">
                  <div className="otrFormGroup">
                    <label>Overtime Hours</label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      placeholder="0"
                      value={formData.hoursRequested === '' ? '' : formData.hoursRequested}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setFormData({...formData, hoursRequested: '', minutesRequested: '', endTime: ''});
                          return;
                        }
                        const hours = parseInt(e.target.value) || 0;
                        handleHoursChange(hours, formData.minutesRequested || 0);
                      }}
                    />
                  </div>
                  <div className="otrFormGroup">
                    <label>Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      placeholder="0"
                      value={formData.minutesRequested === '' ? '' : formData.minutesRequested}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          const hours = formData.hoursRequested || 0;
                          if (hours === 0) {
                            setFormData({...formData, hoursRequested: '', minutesRequested: '', endTime: ''});
                          } else {
                            handleHoursChange(hours, 0);
                          }
                          return;
                        }
                        const hours = formData.hoursRequested || 0;
                        const minutes = parseInt(e.target.value) || 0;
                        const validMinutes = Math.min(Math.max(minutes, 0), 59);
                        handleHoursChange(hours, validMinutes);
                      }}
                    />
                  </div>
                  <div className="otrFormGroup">
                    <label>End Time (Estimated)</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      readOnly
                    />
                  </div>
</div>
              <div className="otrFormGroup">
                <label>Task Description</label>
                <textarea
                  rows="3"
                  value={formData.taskDescription}
                  onChange={(e) => setFormData({...formData, taskDescription: e.target.value})}
                  placeholder="Describe the task that needs to be completed during overtime"
                  required
                ></textarea>
              </div>

              <div className="otrFormSection">
                <h3>Purpose</h3>
                
                <div className="otrFormGroup">
                  <label>1. Why were the task not accomplished earlier?</label>
                  <textarea
                    rows="2"
                    value={formData.notEarlierReason}
                    onChange={(e) => setFormData({...formData, notEarlierReason: e.target.value})}
                    placeholder="Explain why this task couldn't be completed during regular hours"
                    required
                  ></textarea>
                </div>

                <div className="otrFormGroup">
                  <label>2. Why were the task not accomplished later?</label>
                  <textarea
                    rows="2"
                    value={formData.notLaterReason}
                    onChange={(e) => setFormData({...formData, notLaterReason: e.target.value})}
                    placeholder="Explain why this task cannot be delayed to the next working day"
                    required
                  ></textarea>
                </div>

                <div className="otrFormGroup">
                  <label>3. Is it Urgent?</label>
                  <select
                    value={formData.isUrgent}
                    onChange={(e) => setFormData({...formData, isUrgent: e.target.value})}
                    required
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                {formData.isUrgent === 'Yes' && (
                  <div className="otrFormGroup otrUrgentExplanation">
                    <label>If yes, explain:</label>
                    <textarea
                      rows="2"
                      value={formData.urgentExplanation}
                      onChange={(e) => setFormData({...formData, urgentExplanation: e.target.value})}
                      placeholder="Provide detailed explanation of the urgency"
                      required={formData.isUrgent === 'Yes'}
                    ></textarea>
                  </div>
                )}
              </div>

              <div className="otrFormActions">
                <button type="button" className="otrCancelBtn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="otrSubmitBtn">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="otrModalOverlay" onClick={() => setShowDetailsModal(false)}>
          <div className="otrModalContent otrModalLarge" onClick={(e) => e.stopPropagation()}>
            <div className="otrModalHeader">
              <h2>Overtime Request Details</h2>
              <button className="otrModalClose" onClick={() => setShowDetailsModal(false)}>
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
                  <span className="otrDetailLabel">Is Urgent:</span>
                  <span className="otrDetailValue">{selectedRequest.is_urgent}</span>
                </div>
                {selectedRequest.is_urgent === 'Yes' && selectedRequest.urgent_explanation && (
                  <div className="otrDetailRow otrDetailFullWidth">
                    <span className="otrDetailLabel">Urgent Explanation:</span>
                    <p className="otrDetailText">{selectedRequest.urgent_explanation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimeRequest;