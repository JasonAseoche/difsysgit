import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getUserId, getUserRole, getCurrentUser } from '../../utils/auth';
import axios from 'axios';
import '../../components/EmployeeLayout/FileInquiries.css';

// Utility functions outside component (never re-created)
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
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// Static data - never changes
const subjectOptions = [
  'System Access Issue', 'Leave Request', 'Equipment Request',
  'IT Support', 'HR Inquiry', 'Policy Question', 'Others'
];

// Status class mappers - pure functions
const getTableStatusClass = (status) => {
  switch (status) {
    case 'Open': return 'employeeStatusOpen';
    case 'In Progress': return 'employeeStatusInProgress';
    case 'Closed': return 'employeeStatusClosed';
    case 'Cancelled': return 'employeeStatusCancelled';
    default: return 'employeeStatusOpen';
  }
};

const getDetailsStatusClass = (status) => {
  switch (status) {
    case 'Open': return 'employeeDetailsStatusOpen';
    case 'In Progress': return 'employeeDetailsStatusInProgress';
    case 'Closed': return 'employeeDetailsStatusClosed';
    case 'Cancelled': return 'employeeDetailsStatusCancelled';
    default: return 'employeeDetailsStatusOpen';
  }
};

// FileUploadZone component - memoized properly with stable props
const FileUploadZone = React.memo(({ 
  formType, 
  attachments, 
  label = "Attach File (Max 20MB)", 
  onFileChange, 
  onDrop, 
  onRemoveFile, 
  dragActive, 
  onDrag 
}) => {
  const fileInputId = useRef(`employeeFileInput-${formType}-${Date.now()}`);
  
  return (
    <div className="employeeFormFieldGroup">
      <label>{label}</label>
      <div 
        className={`employeeFileUploadZone ${dragActive ? 'employeeDragActiveState' : ''} ${formType === 'reply' ? 'employeeReplyDropZone' : ''}`}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={(e) => onDrop(e, formType)}
      >
        <input
          type="file"
          id={fileInputId.current}
          onChange={(e) => onFileChange(e, formType)}
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="employeeFileInputHidden"
        />
        
        {!attachments ? (
          <div className={`employeeFileDropContent ${formType === 'reply' ? 'employeeCompactDrop' : ''}`}>
            <svg width={formType === 'reply' ? "24" : "48"} height={formType === 'reply' ? "24" : "48"} viewBox="0 0 24 24" fill="none" className="employeeUploadIconSvg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              {formType !== 'reply' && (
                <>
                  <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </>
              )}
            </svg>
            {formType === 'reply' ? (
              <span className="employeeDropText">Attach File</span>
            ) : (
              <>
                <p className="employeeDropText">
                  <span className="employeeDropTextBold">Click to upload</span> or drag and drop
                </p>
                <p className="employeeDropSubtext">PDF, DOC, DOCX, TXT, Images (max 20MB)</p>
              </>
            )}
          </div>
        ) : (
          <div className="employeeFilePreviewBox">
            <div className="employeeFileInfoSection">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="employeeFileIconSvg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="employeeFileDetails">
                <p className="employeeFileName">{attachments.name}</p>
                <p className="employeeFileSize">{formatFileSize(attachments.size)}</p>
              </div>
            </div>
            <button type="button" onClick={() => onRemoveFile(formType)} className="employeeRemoveFileBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

FileUploadZone.displayName = 'FileUploadZone';

const FileInquiries = () => {
  // Core state management
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [submittedTicketInfo, setSubmittedTicketInfo] = useState({
    subject: '',
    priority: ''
  });

  // Modal and form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const userId = getUserId();
  const userRole = getUserRole();
  const currentUser = getCurrentUser();

  // Send notification function
const sendNotification = async (notificationType, title, message, relatedId = null) => {
  try {
    // Determine target based on user role
    let targetUserId = 0; // 0 means send to all HR
    let targetRole = 'HR'; // Default to HR
    
    // If current user is HR, send to applicant/employee
    if (userRole === 'Employee') {
      targetUserId = relatedId; // Send to specific user
      targetRole = 'HR'; // or 'employee' based on context
    }
    
    const notificationData = {
      user_id: targetUserId,
      user_role: targetRole,
      type: notificationType,
      title: title,
      message: message,
      related_id: relatedId,
      related_type: notificationType.split('_')[0] // Extract type from notification type
    };
    
    const response = await fetch('http://localhost/difsysapi/notifications_api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationData)
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('Notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

  // Employee information
  const [employeeInfo, setEmployeeInfo] = useState({
    firstName: 'Loading...',
    lastName: '',
    emp_id: null,
    position: 'Project Manager',
    profile_image: null
  });

  // Form data states
  const [formData, setFormData] = useState({
    subject: '',
    customSubject: '',
    priority: 'Medium',
    description: '',
    attachments: null,
    followUpTicketId: null
  });

  const [replyForm, setReplyForm] = useState({
    message: '',
    attachments: null
  });

  // Constants
  const API_BASE_URL = 'http://localhost/difsysapi/inquiries.php';
  const itemsPerPage = 8;

  // Initialize component
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
      fetchUserTickets(userId);
      fetchEmployeeInfo(userId);
    } else {
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
            document.title = "DIFSYS | FILE INQUIRIES";
          }, []);

  // Fetch employee info including profile image
  const fetchEmployeeInfo = useCallback(async (empId) => {
    try {
      const response = await axios.get(`http://localhost/difsysapi/attendance_api.php?action=get_employee_info&emp_id=${empId}`);
      
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
  }, []);

  // API Functions - memoized for performance
  const fetchUserTickets = useCallback(async (employeeId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}?action=getUserTickets&employee_id=${employeeId}`);
      if (response.data.success) {
        setTickets(response.data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const refreshTicketDetails = useCallback(async (ticketId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=getTicketDetails&ticket_id=${ticketId}`);
      if (response.data.success) {
        setSelectedTicket(response.data.ticket);
      }
    } catch (error) {
      console.error('Error refreshing ticket details:', error);
    }
  }, [API_BASE_URL]);

  const markTicketAsRead = useCallback(async (ticketId) => {
    try {
      await axios.post(API_BASE_URL, {
        action: 'markAsRead',
        ticket_id: ticketId,
        reader_type: 'employee'
      });
      
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, unread: false } : ticket
      ));
    } catch (error) {
      console.error('Error marking ticket as read:', error);
    }
  }, [API_BASE_URL]);

  // Event handlers - stable with useCallback
  const handleViewDetails = useCallback(async (ticket) => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=getTicketDetails&ticket_id=${ticket.id}`);
      if (response.data.success) {
        setSelectedTicket(response.data.ticket);
        setFormData({
          subject: response.data.ticket.subject,
          customSubject: '',
          priority: response.data.ticket.priority,
          description: response.data.ticket.description,
          attachments: null,
          followUpTicketId: null
        });
        setCurrentView('details');
        setIsEditing(false);
        
        if (ticket.unread) markTicketAsRead(ticket.id);
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    }
  }, [API_BASE_URL, markTicketAsRead]);

  const handleCreateTicket = useCallback(async () => {
    // Capture the values FIRST before any async operations
    const submittedSubject = formData.subject === 'Others' ? formData.customSubject : formData.subject;
    const submittedPriority = formData.priority;
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('action', 'createInquiry');
      formDataToSend.append('employee_id', employeeInfo.emp_id);
      formDataToSend.append('subject', submittedSubject);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('priority', submittedPriority);
      
      if (formData.followUpTicketId) {
        formDataToSend.append('follow_up_from', formData.followUpTicketId);
      }
      
      if (formData.attachments) {
        formDataToSend.append('attachment', formData.attachments);
      }
  
      const response = await axios.post(API_BASE_URL, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
  
      if (response.data.success) {
        // Store submitted info IMMEDIATELY after success
        setSubmittedTicketInfo({
          subject: submittedSubject || 'N/A',
          priority: submittedPriority || 'Medium'
        });
        
        // Close modal and reset form
        setShowCreateModal(false);
        setFormData({
          subject: '',
          customSubject: '',
          priority: 'Medium',
          description: '',
          attachments: null,
          followUpTicketId: null
        });
        
        // Show success popup
        setShowSuccessPopup(true);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 3000);
        
        await fetchUserTickets(employeeInfo.emp_id);
      } else {
        alert('Failed to create inquiry. Please try again.');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create inquiry. Please try again.');
    }
  }, [API_BASE_URL, employeeInfo.emp_id, formData, fetchUserTickets]);

  const handleSendReply = useCallback(async () => {
    if (!replyForm.message.trim()) {
      alert('Please enter a message');
      return;
    }

    const currentMessage = replyForm.message;
    const currentAttachment = replyForm.attachments;

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('action', 'sendReply');
      formDataToSend.append('ticket_id', selectedTicket.id);
      formDataToSend.append('message', currentMessage);
      formDataToSend.append('sender_type', 'employee');
      formDataToSend.append('sender_id', employeeInfo.emp_id);
      
      if (currentAttachment) {
        formDataToSend.append('attachment', currentAttachment);
      }

      setReplyForm({ message: '', attachments: null });

      const response = await axios.post(API_BASE_URL, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        await refreshTicketDetails(selectedTicket.id);
        await fetchUserTickets(employeeInfo.emp_id);
      } else {
        setReplyForm({ message: currentMessage, attachments: currentAttachment });
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      setReplyForm({ message: currentMessage, attachments: currentAttachment });
    }
  }, [replyForm.message, replyForm.attachments, selectedTicket?.id, employeeInfo.emp_id, API_BASE_URL, refreshTicketDetails, fetchUserTickets]);

  // File handling - open everything in new tab or download
  const handleFileClick = useCallback((file) => {
    const fileName = typeof file === 'object' ? file.filename : file;
    const fileUrl = typeof file === 'object' ? file.url : file;
    
    if (!fileName || !fileUrl) {
      console.error('Invalid file data:', file);
      alert('Invalid file data');
      return;
    }
    
    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
    const isPDF = /\.pdf$/i.test(fileName);
    
    if (isImage || isPDF) {
      const newWindow = window.open(fileUrl, '_blank');
      if (!newWindow) {
        alert('Please allow popups to view files, or try downloading instead');
        handleFileDownload(file);
      }
    } else {
      handleFileDownload(file);
    }
  }, []);

  const handleFileDownload = useCallback((file) => {
    const fileName = typeof file === 'object' ? file.filename : file;
    const fileUrl = typeof file === 'object' ? file.url : file;
    
    try {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  }, []);

  const handleCreateFollowUp = useCallback((ticketId) => {
    setFormData(prev => ({
      ...prev,
      followUpTicketId: ticketId,
      subject: '',
      customSubject: '',
      priority: 'Medium',
      description: '',
      attachments: null
    }));
    setCurrentView('dashboard');
    setShowCreateModal(true);
  }, []);

  // File handling - stable callbacks
  const handleFileChange = useCallback((e, formType) => {
    const file = e.target.files[0];
    if (file && file.size > 20 * 1024 * 1024) {
      alert('File size must be less than 20MB');
      return;
    }
    
    if (formType === 'create' || formType === 'edit') {
      setFormData(prev => ({ ...prev, attachments: file }));
    } else if (formType === 'reply') {
      setReplyForm(prev => ({ ...prev, attachments: file }));
    }
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback((e, formType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 20 * 1024 * 1024) {
        alert('File size must be less than 20MB');
        return;
      }
      
      if (formType === 'create' || formType === 'edit') {
        setFormData(prev => ({ ...prev, attachments: file }));
      } else if (formType === 'reply') {
        setReplyForm(prev => ({ ...prev, attachments: file }));
      }
    }
  }, []);

  const removeFile = useCallback((formType) => {
    if (formType === 'create' || formType === 'edit') {
      setFormData(prev => ({ ...prev, attachments: null }));
    } else if (formType === 'reply') {
      setReplyForm(prev => ({ ...prev, attachments: null }));
    }
  }, []);

  // Navigation handlers
  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    setSelectedTicket(null);
    setIsEditing(false);
  }, []);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleFormSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!formData.subject || (formData.subject === 'Others' && !formData.customSubject) || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    if (isEditing) {
      try {
        const updateData = {
          action: 'updateTicket',
          ticket_id: selectedTicket.id,
          subject: formData.subject === 'Others' ? formData.customSubject : formData.subject,
          description: formData.description,
          priority: formData.priority
        };

        const response = await axios.post(API_BASE_URL, updateData);
        if (response.data.success) {
          setCurrentView('dashboard');
          setIsEditing(false);
          await fetchUserTickets(employeeInfo.emp_id);
        }
      } catch (error) {
        console.error('Error updating ticket:', error);
      }
    } else {
      await handleCreateTicket();
    }

    await sendNotification(
      'file-inquiries',                                    // type
      'New Inquiries',                               // title
      `${currentUser.firstName} has submit a inquiry`, // message
      userId                                                // related_id
    );

  }, [formData, isEditing, selectedTicket?.id, API_BASE_URL, employeeInfo.emp_id, fetchUserTickets, handleCreateTicket]);

  // Pagination logic - memoized
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(tickets.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = tickets.slice(startIndex, endIndex);
    
    return { totalPages, startIndex, endIndex, currentData };
  }, [tickets, currentPage, itemsPerPage]);

  const renderPaginationButtons = useCallback(() => {
    const { totalPages } = paginationData;
    const buttons = [];
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`employeePaginationBtn ${currentPage === i ? 'employeePaginationActive' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(<span key="dots" className="employeePaginationDots">...</span>);
      buttons.push(
        <button
          key={totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className={`employeePaginationBtn ${currentPage === totalPages ? 'employeePaginationActive' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    return buttons;
  }, [paginationData, currentPage]);

  // Memoized components that don't contain form inputs
  const HeaderSection = useMemo(() => (
    <div className="employeeHeaderWrapper">
      <div className="employeeProfileSection">
        <div className="employeeAvatarDisplay">
          {employeeInfo.profile_image ? (
            <img 
              src={employeeInfo.profile_image.startsWith('http') 
                ? employeeInfo.profile_image 
                : `http://localhost/difsysapi/${employeeInfo.profile_image}`} 
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
          <span 
            className="employeeAvatarText" 
            style={{ display: employeeInfo.profile_image ? 'none' : 'block' }}
          >
            {employeeInfo.firstName?.[0]}{employeeInfo.lastName?.[0]}
          </span>
        </div>
        <div className="employeeProfileInfo">
          <h1 className="employeeNameDisplay">
            {employeeInfo.firstName} {employeeInfo.lastName}
          </h1>
          <p className="employeeRoleDisplay">{employeeInfo.position}</p>
        </div>
      </div>

      <div className="employeeInfoCardsGrid">
        <div className="employeeInfoCardItem">
          <div className="employeeInfoIconWrapper employeeIconGreen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div className="employeeInfoContent">
            <p className="employeeInfoLabel">Employee ID</p>
            <p className="employeeInfoValue">DIF{String(employeeInfo.emp_id).padStart(3, '0')}</p>
          </div>
        </div>
        <div className="employeeInfoCardItem">
          <div className="employeeInfoIconWrapper employeeIconBlue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
          </div>
          <div className="employeeInfoContent">
            <p className="employeeInfoLabel">Joining Date</p>
            <p className="employeeInfoValue">22 January 2019</p>
          </div>
        </div>
        <div className="employeeInfoCardItem">
          <div className="employeeInfoIconWrapper employeeIconPurple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z"/>
            </svg>
          </div>
          <div className="employeeInfoContent">
            <p className="employeeInfoLabel">Department</p>
            <p className="employeeInfoValue">Account</p>
          </div>
        </div>
      </div>
    </div>
  ), [employeeInfo]);

  const ActionSection = useMemo(() => (
    <div className="employeeActionWrapper">
      <button className="employeeCreateInquiryBtn" onClick={() => setShowCreateModal(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        File A Inquiries
      </button>
    </div>
  ), []);

  const TicketsTable = useMemo(() => {
    const { currentData, totalPages, startIndex, endIndex } = paginationData;
    
    return (
      <div className="employeeTableWrapper">
        <table className="employeeDataTable">
          <thead>
            <tr className="employeeTableHeader">
              <th>TICKET ID</th>
              <th>SUBJECT</th>
              <th>DATE SUBMITTED</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((ticket, index) => (
              <tr key={index} className={`employeeTableRow ${ticket.unread ? 'employeeUnreadRow' : ''}`}>
                <td className="employeeTicketIdCell">
                  {ticket.id}
                  {ticket.unread && <span className="employeeUnreadDot"></span>}
                </td>
                <td className="employeeSubjectCell">{ticket.subject}</td>
                <td className="employeeDateCell">{formatDate(ticket.date_submitted)}</td>
                <td className="employeeStatusCell">
                  <span className={`employeeStatusBadge ${getTableStatusClass(ticket.status)}`}>
                    {ticket.status.toUpperCase()}
                  </span>
                </td>
                <td className="employeeActionsCell">
                  <button className="employeeViewBtn" onClick={() => handleViewDetails(ticket)}>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {currentData.length === 0 && (
              <tr>
                <td colSpan="5" className="employeeEmptyState">
                  No inquiries found. Click "File A Inquiries" to create your first ticket.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="employeePaginationSection">
            <div className="employeePaginationInfo">
              Showing {startIndex + 1} to {Math.min(endIndex, tickets.length)} of {tickets.length} entries
            </div>
            <div className="employeePaginationControls">
              {renderPaginationButtons()}
            </div>
          </div>
        )}
      </div>
    );
  }, [paginationData, tickets.length, handleViewDetails, renderPaginationButtons]);

  // Loading state
  if (loading) {
    return (
      <div className="employeeInquiriesContainer">
        <div className="employeeLoadingSpinner">Loading...</div>
      </div>
    );
  }

  // Details view - NOT memoized because it contains form inputs
  if (currentView === 'details' && selectedTicket) {
    return (
      <div className="employeeInquiriesContainer">
        <div className="employeeDetailsPageWrapper">
          <div className="employeeDetailsPageHeader">
            <button className="employeeBackBtn" onClick={handleBackToDashboard}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Back to Dashboard
            </button>
          </div>

          <div className="employeeDetailsPageTitle">
            <h1>{selectedTicket.subject}</h1>
            <p className="employeeDetailsPageSubtext">Request #{selectedTicket.id}</p>
          </div>
          
          <div className="employeeDetailsPageContent">
            <div className="employeeDetailsPageGrid">
              <div className="employeeMessagesContainer">
                <h3>Conversation</h3>
                <div className="employeeMessagesList">
                  {selectedTicket.messages?.map(message => (
                    <div key={message.id} className={`employeeMessageCard ${message.sender_type === 'hr' ? 'employeeHRMessage' : 'employeeEmployeeMessage'}`}>
                      <div className="employeeMessageHeader">
                        <div className="employeeMessageSender">
                        <div className="employeeSenderAvatar">
                            {message.sender_profile?.profile_image_url ? (
                              <img 
                                src={message.sender_profile.profile_image_url}
                                alt={message.sender}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '50%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <span 
                              style={{ 
                                display: message.sender_profile?.profile_image_url ? 'none' : 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}
                            >
                              {message.sender.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="employeeSenderInfo">
                            <p className="employeeSenderName">{message.sender}</p>
                            <p className="employeeSenderType">{message.sender_type === 'hr' ? 'HR Team' : 'Employee'}</p>
                          </div>
                        </div>
                        <span className="employeeMessageTime">{formatTimestamp(message.timestamp)}</span>
                      </div>
                      <div className="employeeMessageContent">
                        <p>{message.message}</p>
                        {message.attachments?.length > 0 && (
                          <div className="employeeMessageAttachments">
                            {message.attachments.map((file, index) => (
                              <div 
                                key={index} 
                                className="employeeAttachmentItem employeeClickableAttachment"
                                onClick={() => handleFileClick(file)}
                                style={{ cursor: 'pointer' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="employeeFileIconSvg">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span>{typeof file === 'object' ? file.filename : file}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedTicket.follow_up_from && message.id === selectedTicket.messages[0]?.id && (
                          <div className="employeeFollowUpIndicator">
                            <em>This ticket is follow up from ticket #{selectedTicket.follow_up_from}</em>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="employeeTicketSummary">
                <h3>Ticket Summary</h3>
                <div className="employeeSummaryItem">
                  <label>Ticket ID:</label>
                  <span>{selectedTicket.id}</span>
                </div>
                <div className="employeeSummaryItem">
                  <label>Subject:</label>
                  <span>{selectedTicket.subject}</span>
                </div>
                <div className="employeeSummaryItem">
                  <label>Priority:</label>
                  <span className={`employeePriorityBadge employeePriority${selectedTicket.priority}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <div className="employeeSummaryItem">
                  <label>Status:</label>
                  <span className={`employeeDetailsStatusBadge ${getDetailsStatusClass(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <div className="employeeSummaryItem">
                  <label>Date Submitted:</label>
                  <span>{formatDate(selectedTicket.date_submitted)}</span>
                </div>
                <div className="employeeSummaryItem employeeDescriptionItem">
                  <label>Description:</label>
                  <p>{selectedTicket.description}</p>
                </div>
              </div>
            </div>

            {/* Action Section Based on Ticket Status */}
            {selectedTicket.status !== 'Closed' && selectedTicket.status !== 'Cancelled' ? (
              !isEditing ? (
                <div className="employeeReplySection">
                  <h3>Reply to HR</h3>
                  <div className="employeeReplyForm">
                    <textarea
                      value={replyForm.message}
                      onChange={(e) => setReplyForm(prev => ({...prev, message: e.target.value}))}
                      placeholder="Type your reply here..."
                      rows="4"
                      className="employeeReplyTextarea"
                    />
                    
                    <div className="employeeReplyAttachment">
                      <FileUploadZone 
                        formType="reply" 
                        attachments={replyForm.attachments} 
                        label=""
                        onFileChange={handleFileChange}
                        onDrop={handleDrop}
                        onRemoveFile={removeFile}
                        dragActive={dragActive}
                        onDrag={handleDrag}
                      />
                    </div>

                    <div className="employeeReplyActions">
                      <button type="button" className="employeeEditBtn" onClick={handleEdit}>
                        Edit Ticket
                      </button>
                      <button type="button" className="employeeSendBtn" onClick={handleSendReply}>
                        Send Reply
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="employeeEditSection">
                  <h3>Edit Ticket</h3>
                  <form onSubmit={handleFormSubmit} className="employeeInquiryForm">
                    <div className="employeeFormFieldGroup">
                      <label>Subject</label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({...prev, subject: e.target.value}))}
                        required
                      >
                        <option value="">Select a subject</option>
                        {subjectOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    {formData.subject === 'Others' && (
                      <div className="employeeFormFieldGroup">
                        <label>Please specify</label>
                        <input
                          type="text"
                          value={formData.customSubject}
                          onChange={(e) => setFormData(prev => ({...prev, customSubject: e.target.value}))}
                          placeholder="Enter custom subject"
                          required
                        />
                      </div>
                    )}

                    <div className="employeeFormFieldGroup">
                      <label>Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value}))}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>

                    <div className="employeeFormFieldGroup">
                      <label>Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                        placeholder="Please provide detailed information about your inquiry"
                        rows="4"
                        required
                      />
                    </div>

                    <div className="employeeFormActions">
                      <button 
                        type="button" 
                        className="employeeCancelBtn"
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            subject: selectedTicket.subject,
                            customSubject: '',
                            priority: selectedTicket.priority,
                            description: selectedTicket.description,
                            attachments: null,
                            followUpTicketId: null
                          });
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="employeeSubmitBtn">
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              )
            ) : (
              <div className="employeeClosedTicketSection">
                <div className="employeeClosedMessage">
                  <h3>Ticket Status: {selectedTicket.status}</h3>
                  <p>
                    The ticket is already closed. The conversation has been resolved and archived.
                    {selectedTicket.status === 'Closed' && (
                      <>
                        {' '}Click to create a follow-up for this ticket{' '}
                        <button 
                          className="employeeTicketLink"
                          onClick={() => handleCreateFollowUp(selectedTicket.id)}
                        >
                          #{selectedTicket.id}
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="employeeInquiriesContainer">
      {/* Create Modal */}
      {showCreateModal && (
        <div className="employeeModalBackdrop">
          <div className="employeeFormModalWrapper">
            <div className="employeeFormModalHeader">
              <h3>File An Inquiry</h3>
              <button 
                className="employeeModalCloseBtn" 
                onClick={() => { 
                  setShowCreateModal(false); 
                  setFormData({
                    subject: '',
                    customSubject: '',
                    priority: 'Medium',
                    description: '',
                    attachments: null,
                    followUpTicketId: null
                  });
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="employeeInquiryForm">
              {formData.followUpTicketId && (
                <div className="employeeFollowUpNotice">
                  <div className="employeeFollowUpIcon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                    </svg>
                  </div>
                  <span>Creating follow-up ticket for #{formData.followUpTicketId}</span>
                  <button 
                    type="button" 
                    className="employeeClearFollowUp"
                    onClick={() => setFormData(prev => ({...prev, followUpTicketId: null}))}
                  >
                    ×
                  </button>
                </div>
              )}
              
              <div className="employeeFormFieldGroup">
                <label>Subject *</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({...prev, subject: e.target.value}))}
                  required
                >
                  <option value="">Select a subject</option>
                  {subjectOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {formData.subject === 'Others' && (
                <div className="employeeFormFieldGroup">
                  <label>Please specify *</label>
                  <input
                    type="text"
                    value={formData.customSubject}
                    onChange={(e) => setFormData(prev => ({...prev, customSubject: e.target.value}))}
                    placeholder="Enter custom subject"
                    required
                  />
                </div>
              )}

              <div className="employeeFormFieldGroup">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value}))}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="employeeFormFieldGroup">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                  placeholder="Please provide detailed information about your inquiry"
                  rows="4"
                  required
                />
              </div>

              <FileUploadZone 
                formType="create" 
                attachments={formData.attachments}
                onFileChange={handleFileChange}
                onDrop={handleDrop}
                onRemoveFile={removeFile}
                dragActive={dragActive}
                onDrag={handleDrag}
              />

              <div className="employeeFormActions">
                <button 
                  type="button" 
                  className="employeeCancelBtn" 
                  onClick={() => { 
                    setShowCreateModal(false); 
                    setFormData({
                      subject: '',
                      customSubject: '',
                      priority: 'Medium',
                      description: '',
                      attachments: null,
                      followUpTicketId: null
                    });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="employeeSubmitBtn">Submit Inquiry</button>
              </div>
            </form>
          </div>
        </div>
      )}

 {/* Success Popup */}
{showSuccessPopup && (
  <div className="employeeInquirySuccessBackdrop">
    <div className="employeeInquirySuccessModal">
      <div className="employeeInquirySuccessHeader">
        <div className="employeeInquirySuccessIcon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="employeeInquirySuccessIconRipple"></div>
      </div>
      
      <div className="employeeInquirySuccessContent">
        <h3 className="employeeInquirySuccessTitle">Inquiry Submitted Successfully!</h3>
        <p className="employeeInquirySuccessMessage">
          Your inquiry has been submitted and will be reviewed by our HR team. 
          You'll receive updates on the status of your request.
        </p>
        <div className="employeeInquirySuccessDetails">
          <div className="employeeInquirySuccessDetailItem">
            <span className="employeeInquirySuccessDetailLabel">Subject:</span>
            <span className="employeeInquirySuccessDetailValue">
              {submittedTicketInfo.subject}
            </span>
          </div>
          <div className="employeeInquirySuccessDetailItem">
            <span className="employeeInquirySuccessDetailLabel">Priority:</span>
            <span className={`employeeInquirySuccessDetailValue employeeInquirySuccessPriority${submittedTicketInfo.priority}`}>
              {submittedTicketInfo.priority}
            </span>
          </div>
        </div>
      </div>
      
      <div className="employeeInquirySuccessFooter">
        <button 
          className="employeeInquirySuccessCloseBtn"
          onClick={() => setShowSuccessPopup(false)}
        >
          Got it!
        </button>
      </div>
      
      <div className="employeeInquirySuccessProgressBar">
        <div className="employeeInquirySuccessProgressFill"></div>
      </div>
    </div>
  </div>
)}

      {HeaderSection}
      {ActionSection}
      {TicketsTable}
    </div>
  );
};

export default FileInquiries;