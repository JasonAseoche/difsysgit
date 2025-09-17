import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrentUser, getUserId } from '../../utils/auth';
import axios from 'axios';
import '../../components/HRLayout/ManageRelation.css';

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

// Static data
const subjectOptions = [
  'System Access Issue', 'Leave Request', 'Equipment Request',
  'IT Support', 'HR Inquiry', 'Policy Question', 'Others'
];

const filterOptions = ['All Tickets', 'Open Tickets', 'In Progress Tickets', 'Closed Tickets'];

// SIMPLIFIED - No longer need complex FileViewer since everything opens in new tab
const FileViewer = ({ file, onClose }) => {
  // This component is no longer used but keeping for compatibility
  return null;
};

const ManageRelation = () => {
  // Core state
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Dashboard state
  const [isLoaded, setIsLoaded] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('All Tickets');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Form state
  const [replyForm, setReplyForm] = useState({ message: '', attachments: null });
  const [followUpForm, setFollowUpForm] = useState({
    subject: '',
    customSubject: '',
    priority: 'Medium',
    description: '',
    attachments: null
  });

  // Constants
  const API_BASE_URL = 'http://localhost/difsysapi/inquiries.php';
  const itemsPerPage = 8;

  // Effects
  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [tickets, currentFilter]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
      document.title = "DIFSYS | EMPLOYEE RELATION";
    }, []);

  // API Functions - memoized
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}?action=getTickets`);
      if (response.data.success) {
        setTickets(response.data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const handleViewDetails = useCallback(async (ticket) => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=getTicketDetails&ticket_id=${ticket.id}`);
      if (response.data.success) {
        setSelectedTicket(response.data.ticket);
        setCurrentView('details');
        if (ticket.unread) markTicketAsRead(ticket.id);
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    }
  }, [API_BASE_URL]);

  const markTicketAsRead = useCallback(async (ticketId) => {
    try {
      await axios.post(API_BASE_URL, { 
        action: 'markAsRead', 
        ticket_id: ticketId, 
        reader_type: 'hr' 
      });
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, unread: false } : ticket
      ));
    } catch (error) {
      console.error('Error marking ticket as read:', error);
    }
  }, [API_BASE_URL]);

  const handleSendReply = useCallback(async (closeTicket = false) => {
    if (!replyForm.message.trim()) {
      alert('Please enter a message');
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append('action', 'sendReply');
      formData.append('ticket_id', selectedTicket.id);
      formData.append('message', replyForm.message);
      formData.append('close_ticket', closeTicket);
      formData.append('sender_type', 'hr');
      
      // Add HR user ID - you'll need to get this from your authentication system
      const hrUserId = getCurrentUser()?.id || getUserId(); // Replace with actual HR user ID
      formData.append('sender_id', hrUserId);
      
      // Auto-update status to "In Progress" if ticket is currently "Open"
      if (selectedTicket.status === 'Open' && !closeTicket) {
        formData.append('update_status', 'In Progress');
      }
      
      if (replyForm.attachments) formData.append('attachment', replyForm.attachments);
  
      const response = await axios.post(API_BASE_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
  
      if (response.data.success) {
        await handleViewDetails(selectedTicket);
        await fetchTickets();
        setReplyForm({ message: '', attachments: null });
        if (closeTicket) handleBackToDashboard();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  }, [replyForm.message, replyForm.attachments, selectedTicket, API_BASE_URL, handleViewDetails, fetchTickets]);

  const handleFollowUpSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!followUpForm.subject || (followUpForm.subject === 'Others' && !followUpForm.customSubject) || !followUpForm.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('action', 'createFollowUp');
      formData.append('original_ticket_id', selectedTicket.id);
      formData.append('subject', followUpForm.subject === 'Others' ? followUpForm.customSubject : followUpForm.subject);
      formData.append('priority', followUpForm.priority);
      formData.append('description', followUpForm.description);
      if (followUpForm.attachments) formData.append('attachment', followUpForm.attachments);

      const response = await axios.post(API_BASE_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setShowFollowUpModal(false);
        setFollowUpForm({ subject: '', customSubject: '', priority: 'Medium', description: '', attachments: null });
        await fetchTickets();
      }
    } catch (error) {
      console.error('Error creating follow-up:', error);
    }
  }, [followUpForm, selectedTicket, API_BASE_URL, fetchTickets]);

  // Helper Functions - memoized
  const counters = useMemo(() => {
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'Open').length;
    const inProgressTickets = tickets.filter(t => t.status === 'In Progress').length;
    const closedTickets = tickets.filter(t => t.status === 'Closed').length;
    
    return { totalTickets, openTickets, inProgressTickets, closedTickets };
  }, [tickets]);

  const getUnreadCount = useCallback((status = null) => {
    let filtered = tickets.filter(ticket => ticket.unread);
    if (status) filtered = filtered.filter(ticket => ticket.status === status);
    return filtered.length;
  }, [tickets]);

  const getUnreadOpenAndInProgress = useMemo(() => {
    return tickets.filter(ticket => 
      ticket.unread && (ticket.status === 'Open' || ticket.status === 'In Progress')
    ).length;
  }, [tickets]);

  const applyFilter = useCallback(() => {
    let filtered = [...tickets];
    switch (currentFilter) {
      case 'Open Tickets': filtered = tickets.filter(t => t.status === 'Open'); break;
      case 'In Progress Tickets': filtered = tickets.filter(t => t.status === 'In Progress'); break;
      case 'Closed Tickets': filtered = tickets.filter(t => t.status === 'Closed'); break;
      default: filtered = tickets;
    }
    setFilteredTickets(filtered);
    setCurrentPage(1);
  }, [tickets, currentFilter]);

  const handleFilterSelect = useCallback((filter) => {
    setCurrentFilter(filter);
    setShowFilterDropdown(false);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    setSelectedTicket(null);
    setShowFollowUpModal(false);
  }, []);

  // SIMPLIFIED File handling - open everything in new tab or download
  const handleFileClick = useCallback((file) => {
    // Handle both old format (string) and new format (object with filename/url)
    const fileName = typeof file === 'object' ? file.filename : file;
    const fileUrl = typeof file === 'object' ? file.url : file;
    
    if (!fileName || !fileUrl) {
      console.error('Invalid file data:', file);
      alert('Invalid file data');
      return;
    }
    
    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
    const isPDF = /\.pdf$/i.test(fileName);
    
    console.log('File clicked:', { fileName, fileUrl, isImage, isPDF });
    
    if (isImage || isPDF) {
      // Open images and PDFs in new tab
      const newWindow = window.open(fileUrl, '_blank');
      if (!newWindow) {
        alert('Please allow popups to view files, or try downloading instead');
        // Fallback to download
        handleFileDownload(file);
      }
    } else {
      // Download other file types
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

  // File handling - stable callbacks
  const handleFileChange = useCallback((e, formType) => {
    const file = e.target.files[0];
    if (file && file.size > 20 * 1024 * 1024) {
      alert('File size must be less than 20MB');
      return;
    }
    
    if (formType === 'reply') {
      setReplyForm(prev => ({ ...prev, attachments: file }));
    } else {
      setFollowUpForm(prev => ({ ...prev, attachments: file }));
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
      
      if (formType === 'reply') {
        setReplyForm(prev => ({ ...prev, attachments: file }));
      } else {
        setFollowUpForm(prev => ({ ...prev, attachments: file }));
      }
    }
  }, []);

  const removeFile = useCallback((formType) => {
    if (formType === 'reply') {
      setReplyForm(prev => ({ ...prev, attachments: null }));
    } else {
      setFollowUpForm(prev => ({ ...prev, attachments: null }));
    }
  }, []);

  // Pagination logic - memoized
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredTickets.slice(startIndex, endIndex);
    
    return { totalPages, startIndex, endIndex, currentData };
  }, [filteredTickets, currentPage, itemsPerPage]);

  const renderPaginationButtons = useCallback(() => {
    const { totalPages } = paginationData;
    const buttons = [];
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`miPaginationBtn ${currentPage === i ? 'miPaginationActive' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(<span key="dots" className="miPaginationDots">...</span>);
      buttons.push(
        <button
          key={totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className={`miPaginationBtn ${currentPage === totalPages ? 'miPaginationActive' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    return buttons;
  }, [paginationData, currentPage]);

  // Memoized components that don't contain form inputs
  const SummaryCards = useMemo(() => {
    const { totalTickets, openTickets, inProgressTickets, closedTickets } = counters;
    
    return (
      <div className="miSummaryCards">
        {[
          { label: 'Total Tickets', value: totalTickets, icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z', className: 'miTotalTickets' },
          { label: 'Open Tickets', value: openTickets, icon: 'M12 2C6.486 2 2 6.486 2 12C2 17.514 6.486 22 12 22C17.514 22 22 17.514 22 12C22 6.486 17.514 2 12 2ZM12 20C7.589 20 4 16.411 4 12C4 7.589 7.589 4 12 4C16.411 4 20 7.589 20 12C20 16.411 16.411 20 12 20ZM17 11H13V7C13 6.73478 12.8946 6.48043 12.7071 6.29289C12.5196 6.10536 12.2652 6 12 6C11.7348 6 11.4804 6.10536 11.2929 6.29289C11.1054 6.48043 11 6.73478 11 7V12C11 12.2652 11.1054 12.5196 11.2929 12.7071C11.4804 12.8946 11.7348 13 12 13H17C17.2652 13 17.5196 12.8946 17.7071 12.7071C17.8946 12.5196 18 12.2652 18 12C18 11.7348 17.8946 11.4804 17.7071 11.2929C17.5196 11.1054 17.2652 11 17 11Z', className: 'miOpenTickets' },
          { label: 'In Progress Tickets', value: inProgressTickets, icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', className: 'miInProgressTickets' },
          { label: 'Closed Tickets', value: closedTickets, icon: 'M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C17.51 22 22 17.51 22 12C22 6.49 17.51 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM15.59 7L12 10.59L8.41 7L7 8.41L10.59 12L7 15.59L8.41 17L12 13.41L15.59 17L17 15.59L13.41 12L17 8.41L15.59 7Z', className: 'miClosedTickets' }
        ].map((card, index) => (
          <div key={index} className={`miSummaryCard ${card.className}`}>
            <div className="miCardIcon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d={card.icon}/>
              </svg>
            </div>
            <div className="miCardContent">
              <div className="miCardLabel">{card.label}</div>
              <div className="miCardValue">{card.value}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [counters]);

  const FilterSection = useMemo(() => (
    <div className="miFilterSection">
      <div className="miFilterContainer">
        <button className="miFilterBtn" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
          </svg>
          Filter
          {getUnreadOpenAndInProgress > 0 && (
            <span className="miFilterBadge">{getUnreadOpenAndInProgress}</span>
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="miDropdownIcon">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
        
        {showFilterDropdown && (
          <div className="miFilterDropdown">
            {filterOptions.map(filter => (
              <button 
                key={filter}
                className={`miFilterOption ${currentFilter === filter ? 'miFilterActive' : ''}`}
                onClick={() => handleFilterSelect(filter)}
              >
                {filter}
                {getUnreadCount(filter === 'All Tickets' ? null : filter.split(' ')[0]) > 0 && (
                  <span className="miOptionBadge">
                    {getUnreadCount(filter === 'All Tickets' ? null : filter.split(' ')[0])}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  ), [showFilterDropdown, currentFilter, getUnreadOpenAndInProgress, getUnreadCount, handleFilterSelect]);

  const TicketsTable = useMemo(() => {
    const { currentData, totalPages, startIndex, endIndex } = paginationData;
    
    return (
      <div className="miTableSection">
        <table className="miDataTable">
          <thead>
            <tr className="miTableHeader">
              <th>TICKET ID</th>
              <th>NAME OF EMPLOYEE</th>
              <th>SUBJECT</th>
              <th>DATE SUBMITTED</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((ticket, index) => (
              <tr key={index} className={`miTableRow ${ticket.unread ? 'miUnreadRow' : ''}`}>
                <td className="miTicketIdCell">
                  {ticket.id}
                  {ticket.unread && <span className="miUnreadDot"></span>}
                </td>
                <td className="miEmployeeCell">{ticket.employee_name}</td>
                <td className="miSubjectCell">{ticket.subject}</td>
                <td className="miDateCell">{formatDate(ticket.date_submitted)}</td>
                <td className="miStatusCell">
                  <span className={`miStatusBadge ${
                    ticket.status === 'Open' ? 'miStatusOpen' :
                    ticket.status === 'In Progress' ? 'miStatusProgress' :
                    'miStatusClosed'
                  }`}>
                    {ticket.status.toUpperCase()}
                  </span>
                </td>
                <td className="miActionsCell">
                  <button className="miViewBtn" onClick={() => handleViewDetails(ticket)}>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {currentData.length === 0 && (
              <tr>
                <td colSpan="6" className="miEmptyState">
                  No tickets found for the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="miPaginationArea">
            <div className="miPaginationInfo">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTickets.length)} of {filteredTickets.length} entries
            </div>
            <div className="miPaginationButtons">
              {renderPaginationButtons()}
            </div>
          </div>
        )}
      </div>
    );
  }, [paginationData, filteredTickets.length, handleViewDetails, renderPaginationButtons]);

  // Loading state
  if (loading) {
    return (
      <div className="miMainContainer">
        <div className="miLoadingSpinner">Loading...</div>
      </div>
    );
  }

  // Details view - NOT memoized because it contains form inputs
  if (currentView === 'details' && selectedTicket) {
    return (
      <div className="miMainContainer">
        <div className="miDetailsPage">
          <div className="miDetailsPageHeader">
            <button className="miBackBtn" onClick={handleBackToDashboard}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Back to Dashboard
            </button>
          </div>

          <div className="miDetailsPageTitle">
            <h1>{selectedTicket.subject}</h1>
            <p className="miDetailsPageSubtext">Request #{selectedTicket.id}</p>
          </div>
          
          <div className="miDetailsPageContent">
            <div className="miDetailsPageGrid">
              <div className="miMessagesContainer">
                <h3>Conversation</h3>
                <div className="miMessagesList">
                  {selectedTicket.messages?.map(message => (
                    <div key={message.id} className={`miMessageCard ${message.sender_type === 'hr' ? 'miHRMessage' : 'miEmployeeMessage'}`}>
                      <div className="miMessageHeader">
                        <div className="miMessageSender">
                        <div className="miSenderAvatar">
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
                          <div className="miSenderInfo">
                            <p className="miSenderName">{message.sender}</p>
                            <p className="miSenderType">{message.sender_type === 'hr' ? 'HR Team' : 'Employee'}</p>
                          </div>
                        </div>
                        <span className="miMessageTime">{formatTimestamp(message.timestamp)}</span>
                      </div>
                      <div className="miMessageContent">
                        <p>{message.message}</p>
                        {message.attachments?.length > 0 && (
                          <div className="miMessageAttachments">
                            {message.attachments.map((file, index) => (
                              <div 
                                key={index} 
                                className="miAttachmentItem miClickableAttachment"
                                onClick={() => handleFileClick(file)}
                                style={{ cursor: 'pointer' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="miFileIcon">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span>{typeof file === 'object' ? file.filename : file}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Show follow-up message if this is a follow-up ticket */}
                        {selectedTicket.follow_up_from && message.id === selectedTicket.messages[0]?.id && (
                          <div className="miFollowUpIndicator">
                            <em>This ticket is follow up from ticket #{selectedTicket.follow_up_from}</em>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="miTicketSummary">
                <h3>Ticket Summary</h3>
                {[
                  { label: 'Employee', value: selectedTicket.employee_name },
                  { label: 'Employee ID', value: `DIF${String(selectedTicket.employee_id).padStart(3, '0')}` },
                  { label: 'Subject', value: selectedTicket.subject },
                  { label: 'Priority', value: selectedTicket.priority, badge: true, type: 'priority' },
                  { label: 'Status', value: selectedTicket.status, badge: true, type: 'status' },
                  { label: 'Date Submitted', value: formatDate(selectedTicket.date_submitted) }
                ].map((item, index) => (
                  <div key={index} className="miSummaryItem">
                    <label>{item.label}:</label>
                    {item.badge ? (
                      <span className={`${
                        item.type === 'priority' 
                          ? `miDetailsPriorityBadge miDetailsPriority${item.value}` 
                          : `miDetailsStatusBadge miDetailsStatus${item.value.replace(' ', '')}`
                      }`}>
                        {item.value}
                      </span>
                    ) : (
                      <span>{item.value}</span>
                    )}
                  </div>
                ))}
                <div className="miSummaryItem miDescriptionItem">
                  <label>Description:</label>
                  <p>{selectedTicket.description}</p>
                </div>
              </div>
            </div>

            {selectedTicket.status !== 'Closed' ? (
              // Reply Section - NOT memoized because it contains form inputs
              <div className="miReplySection">
                <h3>Reply to Employee</h3>
                <div className="miReplyForm">
                  <textarea
                    value={replyForm.message}
                    onChange={(e) => setReplyForm({...replyForm, message: e.target.value})}
                    placeholder="Type your reply here..."
                    rows="4"
                    className="miReplyTextarea"
                  />
                  
                  <div className="miReplyAttachment">
                    <div 
                      className={`miFileDropZone miReplyDropZone ${dragActive ? 'miDragActive' : ''}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={(e) => handleDrop(e, 'reply')}
                    >
                      <input
                        type="file"
                        id="replyFileInput"
                        onChange={(e) => handleFileChange(e, 'reply')}
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        className="miFileInput"
                      />
                      
                      {!replyForm.attachments ? (
                        <div className="miDropContent miCompactDrop">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="miUploadIcon">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="miDropText">Attach File</span>
                        </div>
                      ) : (
                        <div className="miFilePreview">
                          <div className="miFileInfo">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="miFileIcon">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <div className="miFileDetails">
                              <p className="miFileName">{replyForm.attachments.name}</p>
                              <p className="miFileSize">{formatFileSize(replyForm.attachments.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile('reply')}
                            className="miRemoveFile"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="miReplyActions">
                    <button 
                      type="button" 
                      className="miSendBtn"
                      onClick={() => handleSendReply(false)}
                    >
                      Send Reply
                    </button>
                    <button 
                      type="button" 
                      className="miCloseTicketBtn"
                      onClick={() => handleSendReply(true)}
                    >
                      Send & Close Ticket
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="miClosedTicketSection">
                <div className="miClosedMessage">
                  <h3>Ticket Status: Closed</h3>
                  <p>This ticket has been closed and resolved. All conversation history is preserved above.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Follow-Up Modal - NOT memoized because it contains form inputs */}
        {showFollowUpModal && (
          <div className="miModalOverlay">
            <div className="miFormModal">
              <div className="miFormHeader">
                <h3>Create Follow-Up Inquiry</h3>
                <button className="miCloseBtn" onClick={() => setShowFollowUpModal(false)}>×</button>
              </div>
              
              <form onSubmit={handleFollowUpSubmit} className="miForm">
                <div className="miFormGroup">
                  <label>Subject *</label>
                  <select
                    value={followUpForm.subject}
                    onChange={(e) => setFollowUpForm({...followUpForm, subject: e.target.value})}
                    required
                  >
                    <option value="">Select a subject</option>
                    {subjectOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {followUpForm.subject === 'Others' && (
                  <div className="miFormGroup">
                    <label>Please specify *</label>
                    <input
                      type="text"
                      value={followUpForm.customSubject}
                      onChange={(e) => setFollowUpForm({...followUpForm, customSubject: e.target.value})}
                      placeholder="Enter custom subject"
                      required
                    />
                  </div>
                )}

                <div className="miFormGroup">
                  <label>Priority</label>
                  <select
                    value={followUpForm.priority}
                    onChange={(e) => setFollowUpForm({...followUpForm, priority: e.target.value})}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="miFormGroup">
                  <label>Description *</label>
                  <textarea
                    value={followUpForm.description}
                    onChange={(e) => setFollowUpForm({...followUpForm, description: e.target.value})}
                    placeholder="Please provide detailed information about your follow-up inquiry"
                    rows="4"
                    required
                  />
                </div>

                <div className="miFormGroup">
                  <label>Attach File (Max 20MB)</label>
                  <div 
                    className={`miFileDropZone ${dragActive ? 'miDragActive' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'followup')}
                  >
                    <input
                      type="file"
                      id="followUpFileInput"
                      onChange={(e) => handleFileChange(e, 'followup')}
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      className="miFileInput"
                    />
                    
                    {!followUpForm.attachments ? (
                      <div className="miDropContent">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="miUploadIcon">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p className="miDropText">
                          <span className="miDropTextBold">Click to upload</span> or drag and drop
                        </p>
                        <p className="miDropSubtext">PDF, DOC, DOCX, TXT, Images (max 20MB)</p>
                      </div>
                    ) : (
                      <div className="miFilePreview">
                        <div className="miFileInfo">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="miFileIcon">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <div className="miFileDetails">
                            <p className="miFileName">{followUpForm.attachments.name}</p>
                            <p className="miFileSize">{formatFileSize(followUpForm.attachments.size)}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeFile('followup')} className="miRemoveFile">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="miFormActions">
                  <button type="button" className="miCancelBtn" onClick={() => setShowFollowUpModal(false)}>Cancel</button>
                  <button type="submit" className="miSubmitBtn">Create Follow-Up</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="miMainContainer">
      {SummaryCards}
      {FilterSection}
      {TicketsTable}
      
      {/* File Viewer Modal - No longer needed but keeping the code structure */}
      {showFileViewer && selectedFile && (
        <FileViewer 
          file={selectedFile} 
          onClose={() => {
            setShowFileViewer(false);
            setSelectedFile(null);
          }} 
        />
      )}
    </div>
  );
};

export default ManageRelation;