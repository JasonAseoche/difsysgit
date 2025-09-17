import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Eye, Check, X, Filter, Search, Mail, Phone, MapPin, Clock, MoreVertical, FileText, File, ChevronDown, Download, AlertCircle, Loader, User, Plus, Trash2 } from 'lucide-react';
import '../../components/HRLayout/ApplicantTracking.css'; 

const ApplicantsTracking = () => {
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, scheduled: 0, approved: 0, declined: 0 });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateFiles, setCandidateFiles] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [scheduleCandidate, setScheduleCandidate] = useState(null);
  const [approvalCandidate, setApprovalCandidate] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState(new Set());
  const [requirements, setRequirements] = useState([{ type: '', customText: '' }]);

  // API Base URL
  const API_BASE_URL = 'http://localhost/difsysapi/applicant_tracking.php';

  // Configure axios defaults
  axios.defaults.headers.common['Content-Type'] = 'application/json';

  // Default avatar fallback
  const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face';

  // Handle image error
  const handleImageError = (candidateId) => {
    setImageErrors(prev => new Set(prev).add(candidateId));
  };

  // Get avatar URL with fallback
  const getAvatarUrl = (candidate) => {
    if (imageErrors.has(candidate.id)) {
      return DEFAULT_AVATAR;
    }
    
    if (!candidate.avatar || candidate.avatar === '') {
      return DEFAULT_AVATAR;
    }
    
    if (candidate.avatar.startsWith('http')) {
      return candidate.avatar;
    }
    
    return `http://localhost/difsysapi/${candidate.avatar}`;
  };

  // Function to render employee avatar with profile image or initials fallback
  const renderEmployeeAvatar = (candidate) => {
    const initials = candidate.name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #ff8a80 0%, #ea7066 100%)'
    ];
    
    const colorIndex = candidate.id % colors.length;
    const backgroundColor = colors[colorIndex];
    
    const hasValidAvatar = candidate.avatar && 
                          candidate.avatar !== DEFAULT_AVATAR && 
                          candidate.avatar !== '' && 
                          !imageErrors.has(candidate.id);
    
    return (
      <div className="apptrack-candidate-avatar">
        {hasValidAvatar ? (
          <img 
            src={getAvatarUrl(candidate)} 
            alt={candidate.name}
            className="apptrack-avatar-img"
            onError={() => handleImageError(candidate.id)}
          />
        ) : (
          <div className="apptrack-avatar-fallback" style={{ background: backgroundColor }}>
            <span>{initials}</span>
          </div>
        )}
      </div>
    );
  };

  // Fetch applicants from API
  const fetchApplicants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(API_BASE_URL, {
        params: {
          action: 'applicants',
          search: searchTerm,
          status: filterStatus === 'all' ? '' : mapStatusToDb(filterStatus)
        }
      });

      if (response.data.success) {
        const processedCandidates = response.data.data.map(candidate => ({
          ...candidate,
        }));
        setCandidates(processedCandidates);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError('Failed to fetch applicants: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await axios.get(API_BASE_URL, {
        params: { action: 'stats' }
      });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Fetch applicant details
  const fetchApplicantDetails = async (appId) => {
    try {
      setActionLoading(true);
      
      setCandidateFiles([]);
      
      const response = await axios.get(API_BASE_URL, {
        params: {
          action: 'applicant_details',
          app_id: appId
        }
      });

      if (response.data.success) {
        const processedApplicant = {
          ...response.data.data,
          avatar: response.data.data.avatar || DEFAULT_AVATAR
        };
        setSelectedCandidate(processedApplicant);
        setCandidateFiles(response.data.data.files || []);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError('Failed to fetch applicant details: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle file view in new tab
  const handleFileView = (fileId, fileName) => {
    const fileUrl = `${API_BASE_URL}?action=download_file&file_id=${fileId}`;
    window.open(fileUrl, '_blank');
  };

  // Map frontend status to database status
  const mapStatusToDb = (status) => {
    const statusMap = {
      'New Applicant': 'pending',
      'Scheduled': 'scheduled',
      'Approved': 'approved',
      'Declined': 'declined'
    };
    return statusMap[status] || status.toLowerCase();
  };

  // Schedule interview
  const scheduleInterview = async (appId, date, time) => {
    try {
      setActionLoading(true);
      
      const response = await axios.post(API_BASE_URL, {
        app_id: appId,
        date: date,
        time: time
      }, {
        params: { action: 'schedule_interview' }
      });

      if (response.data.success) {
        // Send notification to applicant
        try {
          await fetch('http://localhost/difsysapi/notifications_api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: appId,
              user_role: 'applicant',
              type: 'interview_scheduled',
              title: 'Interview Scheduled',
              message: `Your interview has been scheduled for ${date} at ${time}. Please be prepared and arrive on time.`,
              related_id: appId,
              related_type: 'interview'
            })
          });
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      
        alert('Interview scheduled successfully! Email notification sent to the applicant.');
        window.location.href = window.location.href;
        return true;
      } else {
        setError(response.data.error);
        return false;
      }
    } catch (err) {
      setError('Failed to schedule interview: ' + (err.response?.data?.error || err.message));
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Update candidate status
  const updateCandidateStatus = async (appId, status, comments = '') => {
    try {
      setActionLoading(true);
      
      const response = await axios.post(API_BASE_URL, {
        app_id: appId,
        status: mapStatusToDb(status),
        comments: comments
      }, {
        params: { action: 'update_status' }
      });

      if (response.data.success) {
        // Send notification to applicant for decline status
        if (status.toLowerCase() === 'declined') {
          try {
            await fetch('http://localhost/difsysapi/notifications_api.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: appId,
                user_role: 'applicant',
                type: 'application_declined',
                title: 'Application Status Update',
                message: 'Thank you for your interest in our position. After careful consideration, we have decided to move forward with other candidates.',
                related_id: appId,
                related_type: 'application'
              })
            });
          } catch (error) {
            console.error('Error sending notification:', error);
          }
        }
      
        alert(`Application ${status.toLowerCase()} successfully! Email notification sent to the applicant.`);
        window.location.href = window.location.href;
        return true;
      } else {
        setError(response.data.error);
        return false;
      }
    } catch (err) {
      setError('Failed to update status: ' + (err.response?.data?.error || err.message));
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Approve with requirements
  const approveWithRequirements = async (appId, requirementsList) => {
    try {
      setActionLoading(true);
      
      const response = await axios.post(API_BASE_URL, {
        app_id: appId,
        status: 'approved',
        requirements: requirementsList.map(req => req.type === 'Other Requirements' ? req.customText : req.type).filter(req => req.trim() !== '')
      }, {
        params: { action: 'approve_with_requirements' }
      });

      if (response.data.success) {
        // Send notification to applicant
        try {
          await fetch('http://localhost/difsysapi/notifications_api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: appId,
              user_role: 'applicant',
              type: 'application_approved',
              title: 'Application Approved',
              message: 'Congratulations! Your application has been approved. Please upload the required documents to proceed.',
              related_id: appId,
              related_type: 'application'
            })
          });
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      
        alert('Application approved successfully! Requirements list sent to the applicant.');
        window.location.href = window.location.href;
        return true;
      } else {
        setError(response.data.error);
        return false;
      }
    } catch (err) {
      setError('Failed to approve application: ' + (err.response?.data?.error || err.message));
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Get status color class
  const getStatusColor = (status) => {
    const colors = {
      "New Applicant": "apptrack-status-new",
      "Scheduled": "apptrack-status-scheduled", 
      "Approved": "apptrack-status-approved",
      "Declined": "apptrack-status-declined"
    };
    return colors[status] || "apptrack-status-default";
  };

  // Filter candidates based on search and status
  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || candidate.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Handle actions
  const handleStatusUpdate = async (appId, newStatus) => {
    const success = await updateCandidateStatus(appId, newStatus);
    if (success) {
      setActiveDropdown(null);
    }
  };

  const handleScheduleClick = (candidate) => {
    setScheduleCandidate(candidate);
    setShowScheduleModal(true);
    setActiveDropdown(null);
  };

  const handleApproveClick = (candidate) => {
    setApprovalCandidate(candidate);
    setRequirements([{ type: '', customText: '' }]);
    setShowApprovalModal(true);
    setActiveDropdown(null);
  };

  const handleScheduleConfirm = async () => {
    if (selectedDate && selectedTime && scheduleCandidate) {
      const success = await scheduleInterview(scheduleCandidate.app_id, selectedDate, selectedTime);
      if (success) {
        setShowScheduleModal(false);
        setScheduleCandidate(null);
        setSelectedDate('');
        setSelectedTime('');
      }
    }
  };

  const handleScheduleCancel = () => {
    setShowScheduleModal(false);
    setScheduleCandidate(null);
    setSelectedDate('');
    setSelectedTime('');
  };

  const handleApprovalConfirm = async () => {
    if (approvalCandidate && requirements.some(req => req.type !== '' && (req.type !== 'Other Requirements' || req.customText.trim() !== ''))) {
      const success = await approveWithRequirements(approvalCandidate.app_id, requirements);
      if (success) {
        setShowApprovalModal(false);
        setApprovalCandidate(null);
        setRequirements([{ type: '', customText: '' }]);
      }
    }
  };

  const handleApprovalCancel = () => {
    setShowApprovalModal(false);
    setApprovalCandidate(null);
    setRequirements([{ type: '', customText: '' }]);
  };

  const handleViewDetails = async (candidate) => {
    await fetchApplicantDetails(candidate.app_id);
    setActiveDropdown(null);
  };

  const handleDownloadFile = (fileId, fileName) => {
    const downloadUrl = `${API_BASE_URL}?action=download_file&file_id=${fileId}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

 // Predefined requirements list
  const predefinedRequirements = [
    'Cover Letter',
    '2x2 ID Picture', 
    'Valid ID',
    'NBI Clearance',
    'Police Clearance',
    'Barangay Clearance',
    'Transcript of Records (TOR)',
    'Diploma',
    'Employment Certificate',
    'Medical/Health Certificate',
    'Other Requirements'
  ];

  // Requirements management
  const addRequirement = () => {
    setRequirements([...requirements, { type: '', customText: '' }]);
  };

  const removeRequirement = (index) => {
    if (requirements.length > 1) {
      const newRequirements = requirements.filter((_, i) => i !== index);
      setRequirements(newRequirements);
    }
  };

  const updateRequirement = (index, field, value) => {
    const newRequirements = [...requirements];
    newRequirements[index] = { ...newRequirements[index], [field]: value };
    setRequirements(newRequirements);
  };

  useEffect(() => {
    document.title = "DIFSYS | APPLICANTS TRACKING";
  }, []);

  // Effect hooks
  useEffect(() => {
    fetchApplicants();
    fetchStats();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== '' || filterStatus !== 'all') {
        fetchApplicants();
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filterStatus]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
      setShowFilterDropdown(false);
    };
    
    if (activeDropdown || showFilterDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeDropdown, showFilterDropdown]);

  // Show loading state
  if (loading) {
    return (
      <div className="apptrack-container">
        <div className="apptrack-loading">
          <Loader className="apptrack-loading-spinner" />
          <p>Loading applicants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="apptrack-container">
      {/* Error Message */}
      {error && (
        <div className="apptrack-error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Action Loading Overlay */}
      {actionLoading && (
        <div className="apptrack-action-loading">
          <Loader className="apptrack-loading-spinner" />
          <p>Processing...</p>
        </div>
      )}

      {/* Header Section */}
      <div className="apptrack-header-section">
        <div className="apptrack-profile-area">
          <div className="apptrack-profile-details">
            <h1 className="apptrack-profile-name">APPLICANT TRACKING SYSTEM</h1>
            <p className="apptrack-profile-role">Manage and track job candidates</p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="apptrack-info-cards">
          <div className="apptrack-info-card">
            <div className="apptrack-info-icon apptrack-icon-blue">
              <FileText size={20} />
            </div>
            <div className="apptrack-info-content">
              <p className="apptrack-info-label">Total Applications</p>
              <p className="apptrack-info-value">{stats.total}</p>
            </div>
          </div>
          
          <div className="apptrack-info-card">
            <div className="apptrack-info-icon apptrack-icon-green">
              <Check size={20} />
            </div>
            <div className="apptrack-info-content">
              <p className="apptrack-info-label">Approved</p>
              <p className="apptrack-info-value">{stats.approved}</p>
            </div>
          </div>
          
          <div className="apptrack-info-card">
            <div className="apptrack-info-icon apptrack-icon-purple">
              <Calendar size={20} />
            </div>
            <div className="apptrack-info-content">
              <p className="apptrack-info-label">Scheduled</p>
              <p className="apptrack-info-value">{stats.scheduled}</p>
            </div>
          </div>

          <div className="apptrack-info-card">
            <div className="apptrack-info-icon apptrack-icon-red">
              <X size={20} />
            </div>
            <div className="apptrack-info-content">
              <p className="apptrack-info-label">Declined</p>
              <p className="apptrack-info-value">{stats.declined}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="apptrack-search-section">
        <div className="apptrack-search-container">
          <Search className="apptrack-search-icon" />
          <input
            type="text"
            placeholder="Search candidates..."
            className="apptrack-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="apptrack-filter-container">
          <button 
            className="apptrack-filter-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowFilterDropdown(!showFilterDropdown);
            }}
          >
            <Filter size={18} />
            <span className="apptrack-filter-text">
              {filterStatus === 'all' ? 'All Status' : filterStatus}
            </span>
            <ChevronDown size={16} className={`apptrack-filter-chevron ${showFilterDropdown ? 'rotated' : ''}`} />
          </button>
          
          {showFilterDropdown && (
            <div className="apptrack-filter-dropdown">
              <button 
                className={`apptrack-filter-option ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setFilterStatus('all');
                  setShowFilterDropdown(false);
                }}
              >
                All Status
              </button>
              <button 
                className={`apptrack-filter-option ${filterStatus === 'New Applicant' ? 'active' : ''}`}
                onClick={() => {
                  setFilterStatus('New Applicant');
                  setShowFilterDropdown(false);
                }}
              >
                New Applicant
              </button>
              <button 
                className={`apptrack-filter-option ${filterStatus === 'Scheduled' ? 'active' : ''}`}
                onClick={() => {
                  setFilterStatus('Scheduled');
                  setShowFilterDropdown(false);
                }}
              >
                Scheduled
              </button>
              <button 
                className={`apptrack-filter-option ${filterStatus === 'Approved' ? 'active' : ''}`}
                onClick={() => {
                  setFilterStatus('Approved');
                  setShowFilterDropdown(false);
                }}
              >
                Approved
              </button>
              <button 
                className={`apptrack-filter-option ${filterStatus === 'Declined' ? 'active' : ''}`}
                onClick={() => {
                  setFilterStatus('Declined');
                  setShowFilterDropdown(false);
                }}
              >
                Declined
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Candidates Grid */}
      <div className="apptrack-candidates-grid">
        {filteredCandidates.length === 0 ? (
          <div className="apptrack-no-results">
            <p>No applicants found matching your criteria.</p>
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <div key={candidate.id} className="apptrack-candidate-card">
              <div className="apptrack-card-header">
              {renderEmployeeAvatar(candidate)}
                <div className="apptrack-candidate-info">
                  <h3 className="apptrack-candidate-name">{candidate.name}</h3>
                  <p className="apptrack-candidate-position">{candidate.position}</p>
                </div>

                <div className="apptrack-card-menu">
                  <button 
                    className="apptrack-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === candidate.id ? null : candidate.id);
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                  
                  {activeDropdown === candidate.id && (
                    <div className="apptrack-dropdown">
                      <button 
                        className="apptrack-dropdown-item"
                        onClick={() => handleViewDetails(candidate)}
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                      <button 
                        className="apptrack-dropdown-item"
                        onClick={() => handleScheduleClick(candidate)}
                      >
                        <Calendar size={14} />
                        Schedule Interview
                      </button>
                      <button 
                        className="apptrack-dropdown-item"
                        onClick={() => handleApproveClick(candidate)}
                      >
                        <Check size={14} />
                        Approve with Requirements
                      </button>
                      <button 
                        className="apptrack-dropdown-item apptrack-dropdown-item-danger"
                        onClick={() => handleStatusUpdate(candidate.app_id, 'Declined')}
                      >
                        <X size={14} />
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="apptrack-card-body">
                <div className="apptrack-contact-info">
                  <div className="apptrack-contact-item">
                    <Mail size={14} />
                    <span>{candidate.email}</span>
                  </div>
                  <div className="apptrack-contact-item">
                    <Phone size={14} />
                    <span>{candidate.phone}</span>
                  </div>
                  <div className="apptrack-contact-item">
                    <MapPin size={14} />
                    <span>{candidate.location}</span>
                  </div>
                  <div className="apptrack-contact-item">
                    <Clock size={14} />
                    <span>Applied {new Date(candidate.appliedDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="apptrack-status-section">
                  <span className={`apptrack-status-badge ${getStatusColor(candidate.status)}`}>
                    {candidate.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="apptrack-modal-overlay" onClick={handleScheduleCancel}>
          <div className="apptrack-schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="apptrack-modal-header">
              <h3>Schedule Interview</h3>
              <button className="apptrack-modal-close" onClick={handleScheduleCancel}>
                <X size={20} />
              </button>
            </div>
            
            <div className="apptrack-modal-body">
              <div className="apptrack-candidate-info-modal">
                <img 
                  src={getAvatarUrl(scheduleCandidate)} 
                  alt={scheduleCandidate?.name} 
                  className="apptrack-modal-avatar-img"
                  onError={() => handleImageError(scheduleCandidate?.id)}
                />
                <div>
                  <h4>{scheduleCandidate?.name}</h4>
                  <p>{scheduleCandidate?.position}</p>
                </div>
              </div>
              
              <div className="apptrack-schedule-form">
                <div className="apptrack-form-group">
                  <label>Select Date</label>
                  <input
                    type="date"
                    className="apptrack-date-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="apptrack-form-group">
                  <label>Select Time</label>
                  <select
                    className="apptrack-time-select"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  >
                    <option value="">Choose time</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="apptrack-modal-actions">
              <button className="apptrack-btn apptrack-btn-cancel" onClick={handleScheduleCancel}>
                Cancel
              </button>
              <button 
                className="apptrack-btn apptrack-btn-confirm"
                onClick={handleScheduleConfirm}
                disabled={!selectedDate || !selectedTime || actionLoading}
              >
                {actionLoading ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="apptrack-modal-overlay" onClick={handleApprovalCancel}>
          <div className="apptrack-approval-modal" onClick={(e) => e.stopPropagation()}>
            <div className="apptrack-modal-header">
              <h3>Approve Application with Requirements</h3>
              <button className="apptrack-modal-close" onClick={handleApprovalCancel}>
                <X size={20} />
              </button>
            </div>
            
            <div className="apptrack-modal-body">
              <div className="apptrack-candidate-info-modal">
                <img 
                  src={getAvatarUrl(approvalCandidate)} 
                  alt={approvalCandidate?.name} 
                  className="apptrack-modal-avatar-img"
                  onError={() => handleImageError(approvalCandidate?.id)}
                />
                <div>
                  <h4>{approvalCandidate?.name}</h4>
                  <p>{approvalCandidate?.position}</p>
                </div>
              </div>
              
              <div className="apptrack-requirements-form">
                <div className="apptrack-requirements-header">
                  <h4>Requirements List</h4>
                  <p>Enter the documents/requirements the applicant needs to upload:</p>
                </div>
                
                <div className="apptrack-requirements-list">
                  {requirements.map((requirement, index) => (
                    <div key={index} className="apptrack-requirement-item">
                      <select
                        className="apptrack-requirement-select"
                        value={requirement.type}
                        onChange={(e) => updateRequirement(index, 'type', e.target.value)}
                      >
                        <option value="">Select Requirement</option>
                        {predefinedRequirements.map((req, idx) => (
                          <option key={idx} value={req}>{req}</option>
                        ))}
                      </select>
                      {requirement.type === 'Other Requirements' && (
                        <input
                          type="text"
                          className="apptrack-requirement-input"
                          value={requirement.customText}
                          onChange={(e) => updateRequirement(index, 'customText', e.target.value)}
                          placeholder="Specify other requirement"
                        />
                      )}
                      {requirements.length > 1 && (
                        <button 
                          className="apptrack-requirement-remove"
                          onClick={() => removeRequirement(index)}
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <button 
                  className="apptrack-add-requirement"
                  onClick={addRequirement}
                  type="button"
                >
                  <Plus size={16} />
                  Add Another Requirement
                </button>
              </div>
            </div>
            
            <div className="apptrack-modal-actions">
              <button className="apptrack-btn apptrack-btn-cancel" onClick={handleApprovalCancel}>
                Cancel
              </button>
              <button 
                className="apptrack-btn apptrack-btn-approve"
                onClick={handleApprovalConfirm}
                disabled={!requirements.some(req => req.type !== '' && (req.type !== 'Other Requirements' || req.customText.trim() !== '')) || actionLoading}
              >
                {actionLoading ? 'Approving...' : 'Approve Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <div className="apptrack-modal-overlay" onClick={() => setSelectedCandidate(null)}>
          <div className="apptrack-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="apptrack-modal-header">
              <h3>Candidate Details</h3>
              <button className="apptrack-modal-close" onClick={() => setSelectedCandidate(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="apptrack-modal-body-large">
              <div className="apptrack-candidate-section">
                <div className="apptrack-candidate-header-modal">
                  <img 
                    src={getAvatarUrl(selectedCandidate)} 
                    alt={selectedCandidate.name} 
                    className="apptrack-modal-avatar-img"
                    onError={() => handleImageError(selectedCandidate.id)}
                  />
                  <div className="apptrack-candidate-details">
                    <h4>{selectedCandidate.name}</h4>
                    <p>{selectedCandidate.position}</p>
                    <span className={`apptrack-status-badge ${getStatusColor(selectedCandidate.status)}`}>
                      {selectedCandidate.status}
                    </span>
                  </div>
                </div>
                
                <div className="apptrack-contact-details">
                  <h5>Contact Information</h5>
                  <div className="apptrack-detail-item">
                    <Mail size={16} />
                    <span>{selectedCandidate.email}</span>
                  </div>
                  <div className="apptrack-detail-item">
                    <Phone size={16} />
                    <span>{selectedCandidate.phone}</span>
                  </div>
                  <div className="apptrack-detail-item">
                    <MapPin size={16} />
                    <span>{selectedCandidate.location}</span>
                  </div>
                  <div className="apptrack-detail-item">
                    <Clock size={16} />
                    <span>Applied on {new Date(selectedCandidate.appliedDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Additional Information */}
                {selectedCandidate.dateOfBirth && (
                  <div className="apptrack-additional-info">
                    <h5>Personal Information</h5>
                    <div className="apptrack-info-grid">
                      <div className="apptrack-info-item">
                        <label>Date of Birth:</label>
                        <span>{selectedCandidate.dateOfBirth}</span>
                      </div>
                      <div className="apptrack-info-item">
                        <label>Gender:</label>
                        <span>{selectedCandidate.gender}</span>
                      </div>
                      <div className="apptrack-info-item">
                        <label>Civil Status:</label>
                        <span>{selectedCandidate.civilStatus}</span>
                      </div>
                      <div className="apptrack-info-item">
                        <label>Citizenship:</label>
                        <span>{selectedCandidate.citizenship}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedCandidate.objective && (
                  <div className="apptrack-objective-section">
                    <h5>Objective</h5>
                    <p>{selectedCandidate.objective}</p>
                  </div>
                )}

                {/* Files Section */}
                {candidateFiles.length > 0 && (
                  <div className="apptrack-files-section">
                    <div className="apptrack-files-header">
                      <h5 className="apptrack-files-title">
                        <FileText size={16} />
                        Documents ({candidateFiles.length})
                      </h5>
                    </div>
                    
                    <div className="apptrack-files-grid">
                      {candidateFiles.map((file) => (
                        <div key={file.id} className="apptrack-file-card">
                          <div className="apptrack-file-icon">
                            <FileText size={24} />
                          </div>
                          <div className="apptrack-file-info">
                            <h6>{file.file_type}</h6>
                            <p>{file.file_name}</p>
                            <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                          </div>
                          <div className="apptrack-file-actions">
                            <button
                              onClick={() => handleFileView(file.id, file.file_name)}
                              className="apptrack-btn apptrack-btn-view"
                              title="View in new tab"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDownloadFile(file.id, file.file_name)}
                              className="apptrack-btn apptrack-btn-download"
                              title="Download"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {candidateFiles.length === 0 && (
                  <div className="apptrack-no-files">
                    <FileText size={48} color="#94a3b8" />
                    <p>No documents uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="apptrack-modal-actions">
              <button 
                className="apptrack-btn apptrack-btn-schedule"
                onClick={() => {
                  setSelectedCandidate(null);
                  handleScheduleClick(selectedCandidate);
                }}
                disabled={actionLoading}
              >
                <Calendar size={16} />
                Schedule Interview
              </button>
              <button 
                className="apptrack-btn apptrack-btn-approve"
                onClick={() => {
                  setSelectedCandidate(null);
                  handleApproveClick(selectedCandidate);
                }}
                disabled={actionLoading}
              >
                <Check size={16} />
                Approve with Requirements
              </button>
              <button 
                className="apptrack-btn apptrack-btn-decline"
                onClick={() => {
                  handleStatusUpdate(selectedCandidate.app_id, 'Declined');
                  setSelectedCandidate(null);
                }}
                disabled={actionLoading}
              >
                <X size={16} />
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicantsTracking;