import React, { useState, useEffect } from 'react';
import { getCurrentUser, getUserId } from '../../utils/auth'; // Import auth utilities like Employee dashboard
import difsyslogo from '../../assets/difsyslogo.png'
import '../../components/ApplicantLayout/DashboardApplicant.css';

const DashboardApplicant = () => {
  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'Applicant'
  });

  const [applicantStatus, setApplicantStatus] = useState('pending');
  const [currentDate, setCurrentDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  
  // New state for real progress data
  const [progressData, setProgressData] = useState({
    applicationSubmitted: null,
    examAssigned: null,
    examCompleted: null,
    interviewScheduled: null,
    requirementsApproved: null,
    allRequirementsUploaded: false
  });
  const [interviewDetails, setInterviewDetails] = useState(null);

  useEffect(() => {
    // Get current date
    const today = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setCurrentDate(today.toLocaleDateString('en-US', options));

    // Get user data from auth utilities
    const userId = getUserId();
    const currentUser = getCurrentUser();
    
    if (userId && currentUser) {
      const userDetails = {
        firstName: currentUser.firstName || 'Guest',
        lastName: currentUser.lastName || 'User',
        email: currentUser.email || 'guest@example.com',
        role: currentUser.role || 'Applicant',
        profileImage: null
      };
      
      setUserInfo(userDetails);
      
      // Wait a bit for userInfo to be set, then fetch data
      setTimeout(() => {
        fetchApplicantData(userId);
      }, 100);
      
    } else {
      // Redirect to login if not authenticated
      window.location.href = '/login';
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    document.title = "DIFSYS | DASHBOARD APPLICANT";
  }, []);

  // Fetch all applicant data including progress
  const fetchApplicantData = async (userId) => {
    try {
      // Fetch applicant status
      let response = await fetch(`http://localhost/difsysapi/get_applicant_status.php?app_id=${userId}`);
      let data = await response.json();
      
      if (!data.success && userInfo.email) {
        response = await fetch(`http://localhost/difsysapi/get_applicant_status.php?email=${encodeURIComponent(userInfo.email)}`);
        data = await response.json();
      }
      
      if (data.success && data.status) {
        setApplicantStatus(data.status.toLowerCase());
      }

      // Fetch progress data with status data
      await fetchProgressData(userId, data);
      
      // Fetch profile image
      try {
        const profileResponse = await fetch(`http://localhost/difsysapi/profile_management.php?id=${userId}&type=user`);
        const profileData = await profileResponse.json();
        if (profileData.success && profileData.data && profileData.data.profile_image) {
          setUserInfo(prev => ({
            ...prev,
            profileImage: profileData.data.profile_image
          }));
        }
      } catch (error) {
        console.log('Could not fetch profile image:', error);
      }
    } catch (error) {
      console.error('Error fetching applicant data:', error);
    }
  };

  const fetchProgressData = async (userId, statusData = null) => {
    try {
      // 1. Get application submitted date from applicant_files table
      const filesResponse = await fetch(`http://localhost/difsysapi/file-manager.php?action=files&app_id=${userId}`);
      const filesData = await filesResponse.json();
      let applicationSubmitted = null;
      if (filesData.success && filesData.files && filesData.files.length > 0) {
        // Get the earliest uploaded file as application submission date
        const uploadDates = filesData.files.map(file => new Date(file.uploaded_at));
        applicationSubmitted = new Date(Math.min(...uploadDates));
      }

      // 2. Check if exam is assigned (from exam assignments)
      const examResponse = await fetch(`http://localhost/difsysapi/exam_api.php?endpoint=assignments&app_id=${userId}`);
      const examData = await examResponse.json();
      let examAssigned = null;
      if (examData && examData.length > 0) {
        examAssigned = new Date(examData[0].assigned_at);
      }

      // 3. Check if exam is completed (from exam attempts)
      const attemptsResponse = await fetch(`http://localhost/difsysapi/exam_api.php?endpoint=attempts&app_id=${userId}`);
      const attemptsData = await attemptsResponse.json();
      let examCompleted = null;
      if (attemptsData && attemptsData.length > 0) {
        const completedAttempt = attemptsData.find(attempt => attempt.status === 'Completed');
        if (completedAttempt) {
          examCompleted = new Date(completedAttempt.completed_at);
        }
      }

      // 4. Check interview schedule from applicant status (use statusData if available)
      let interviewScheduled = null;
      let interviewInfo = null;
      if (statusData && statusData.interview_details && statusData.interview_details.scheduled) {
        interviewScheduled = new Date(`${statusData.interview_details.date} ${statusData.interview_details.time}`);
        interviewInfo = {
          date: statusData.interview_details.date,
          time: statusData.interview_details.time
        };
      }

      // 5. Check if requirements are approved and uploaded
      let requirementsApproved = null;
      let allRequirementsUploaded = false;
      
      // Check if status is approved (requirements approved)
      const currentStatus = statusData ? statusData.status : applicantStatus;
      if (currentStatus === 'approved') {
        requirementsApproved = new Date(); // Set approval date
        
        // Get requirements from HR
        const reqResponse = await fetch(`http://localhost/difsysapi/get_applicant_requirements.php?app_id=${userId}`);
        const reqData = await reqResponse.json();
        
        if (reqData.success && reqData.requirements) {
          const requirements = reqData.requirements;
          
          // Check if all requirements are uploaded
          if (filesData.success && filesData.files) {
            const uploadedTypes = filesData.files.map(file => file.type_file);
            allRequirementsUploaded = requirements.every(req => uploadedTypes.includes(req));
          }
        }
      }

      setProgressData({
        applicationSubmitted,
        examAssigned,
        examCompleted,
        interviewScheduled,
        requirementsApproved,
        allRequirementsUploaded
      });

      setInterviewDetails(interviewInfo);

    } catch (error) {
      console.error('Error fetching progress data:', error);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusText = () => {
    switch(applicantStatus.toLowerCase()) {
      case 'pending':
        return 'Your Application is pending, wait for the HR review you application.';
      case 'scheduled':
        return 'Your application has been reviewed and scheduled for interview.';
      case 'approved':
        return 'Congratulations! Your application has been approved. Please check the following requirements to upload in "Upload Requirements".';
      case 'declined':
        return 'We regret to inform you that your application has been declined.';
      default:
        return 'Your Application is pending, wait for the HR review you application.';
    }
  };

  const getStatusClass = () => {
    switch(applicantStatus.toLowerCase()) {
      case 'pending':
        return 'app-dash-pending-status';
      case 'scheduled':
        return 'app-dash-scheduled-status';
      case 'approved':
        return 'app-dash-approved-status';
      case 'declined':
        return 'app-dash-declined-status';
      default:
        return 'app-dash-pending-status';
    }
  };

  const getStatusIcon = () => {
    switch(applicantStatus.toLowerCase()) {
      case 'pending':
        return (
          <div className="app-dash-status-icon app-dash-pending-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
        );
      case 'scheduled':
        return (
          <div className="app-dash-status-icon app-dash-scheduled-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
        );
      case 'approved':
        return (
          <div className="app-dash-status-icon app-dash-approved-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
        );
      case 'declined':
        return (
          <div className="app-dash-status-icon app-dash-declined-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="app-dash-status-icon app-dash-pending-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
        );
    }
  };

  // Function to get real progress steps based on actual data
  const getProgressSteps = () => {
    const steps = [];
    
    // 1. Application Submitted
    steps.push({
      id: 'submitted',
      title: 'Application Submitted',
      date: progressData.applicationSubmitted ? progressData.applicationSubmitted.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '',
      description: 'Your application has been successfully submitted',
      status: progressData.applicationSubmitted ? 'completed' : 'upcoming'
    });

    // 2. Application Under Review
    steps.push({
      id: 'review',
      title: 'Application Under Review',
      date: progressData.applicationSubmitted ? new Date(progressData.applicationSubmitted.getTime() + 24*60*60*1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '',
      description: 'HR is reviewing your application and documents',
      status: progressData.examAssigned || progressData.interviewScheduled || progressData.requirementsApproved ? 'completed' : (progressData.applicationSubmitted ? 'current' : 'upcoming')
    });

    // 3. Take Exam
    let examStatus = 'upcoming';
    let examDescription = 'Wait for HR to assign you an exam';
    let examDate = '';
    
    if (progressData.examCompleted) {
      examStatus = 'completed';
      examDescription = 'You have successfully completed the exam';
      examDate = progressData.examCompleted.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    } else if (progressData.examAssigned) {
      examStatus = 'current';
      examDescription = 'Exam has been assigned to you. Please complete it as soon as possible';
      examDate = progressData.examAssigned.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    steps.push({
      id: 'exam',
      title: 'Take Exam',
      date: examDate,
      description: examDescription,
      status: examStatus
    });

    // 4. Schedule for Interview (On-Site)
    let interviewStatus = 'upcoming';
    let interviewDescription = 'Wait for the HR to schedule you for on-site interview';
    let interviewDate = '';
    
    if (progressData.requirementsApproved) {
      // If approved, interview is considered completed
      interviewStatus = 'completed';
      interviewDescription = 'Interview process completed successfully';
      interviewDate = progressData.requirementsApproved.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    } else if (progressData.interviewScheduled && interviewDetails) {
      interviewStatus = 'current';
      interviewDescription = `You are scheduled for Interview. Please prepare yourself and arrive on time. Date: ${interviewDetails.date}, Time: ${interviewDetails.time}`;
      interviewDate = progressData.interviewScheduled.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    } else if (progressData.examCompleted) {
      interviewStatus = 'current';
    }

    steps.push({
      id: 'interview',
      title: 'Schedule for Interview (On-Site)',
      date: interviewDate,
      description: interviewDescription,
      status: interviewStatus
    });

    // 5. Upload Requirements
    let requirementsStatus = 'upcoming';
    let requirementsDescription = 'Wait for HR approval to proceed with requirements upload';
    let requirementsDate = '';
    
    if (progressData.requirementsApproved) {
      if (progressData.allRequirementsUploaded) {
        requirementsStatus = 'completed';
        requirementsDescription = 'All required documents have been successfully uploaded';
        requirementsDate = progressData.requirementsApproved.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      } else {
        requirementsStatus = 'current';
        requirementsDescription = 'Congratulations! Your application has been approved. Please check the following requirements to upload in "Upload Requirements"';
        requirementsDate = progressData.requirementsApproved.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      }
    }

    steps.push({
      id: 'requirements',
      title: 'Upload Requirements',
      date: requirementsDate,
      description: requirementsDescription,
      status: requirementsStatus
    });

    // 6. Onboard
    steps.push({
      id: 'onboard',
      title: 'Onboard',
      date: '',
      description: 'Wait for the HR to complete your onboarding process and provide further instructions',
      status: progressData.allRequirementsUploaded ? 'current' : 'upcoming'
    });

    return steps;
  };

  // Modal component
  const ProgressModal = () => {
    if (!showProgressModal) return null;

    const steps = getProgressSteps();

    return (
      <div className="app-dash-modal-overlay" onClick={() => setShowProgressModal(false)}>
        <div className="app-dash-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="app-dash-modal-header">
            <h2>Application Progress</h2>
            <button 
              className="app-dash-modal-close"
              onClick={() => setShowProgressModal(false)}
            >
              ×
            </button>
          </div>
          
          <div className="app-dash-modal-body">
            <div className="app-dash-progress-timeline">
              {steps.map((step, index) => {
                // Determine line status for connection to next step
                let lineStatus = 'upcoming';
                if (step.status === 'completed') {
                  lineStatus = 'completed';
                } else if (step.status === 'current') {
                  lineStatus = 'current';
                }
                
                return (
                  <div key={step.id} className="app-dash-timeline-item">
                    <div className="app-dash-timeline-connector">
                      <div className={`app-dash-timeline-circle ${step.status}`}>
                        {step.status === 'completed' && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                        )}
                        {step.status === 'current' && step.id !== 'declined' && applicantStatus !== 'declined' && (
                          <div className="app-dash-current-dot"></div>
                        )}
                        {step.status === 'declined' && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        )}
                        {step.status === 'upcoming' && (
                          <div className="app-dash-step-number">{index + 1}</div>
                        )}
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`app-dash-timeline-line ${lineStatus}`}></div>
                      )}
                    </div>
                    
                    <div className="app-dash-timeline-content">
                      <h3 className={`app-dash-timeline-title ${step.status}`}>{step.title}</h3>
                      {step.date && <p className="app-dash-timeline-date">{step.date}</p>}
                      <p className="app-dash-timeline-description">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="app-dash-container">
        <div className="app-dash-loading">
          <div className="app-dash-loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-dash-container">
      {/* Header Section */}
      {/* Main Content */}
      <div className="app-dash-content">
        {/* Mission, Vision, and Application Status Section */}
        <div className="app-dash-main-section">
          <div className="app-dash-info-cards">
            <div className="app-dash-info-card app-dash-mission-card">
              <div className="app-dash-card-header">
                <h3>Mission</h3>
              </div>
              <div className="app-dash-card-content">
                <p>
                  To deliver innovative and reliable facility management solutions 
                  that enhance operational efficiency, ensure safety, and create 
                  sustainable environments for our clients and communities.
                </p>
              </div>
            </div>
            
            <div className="app-dash-info-card app-dash-vision-card">
              <div className="app-dash-card-header">
                <h3>Vision</h3>
              </div>
              <div className="app-dash-card-content">
                <p>
                  To be the leading provider of digitally intelligent facility 
                  management systems, transforming how organizations manage their 
                  spaces through cutting-edge technology and exceptional service.
                </p>
              </div>
            </div>
          </div>
          
          <div className="app-dash-status-card">
            <div className="app-dash-card-header">
              <h3>Your Application Status</h3>
            </div>
            <div className="app-dash-status-content">
              {getStatusIcon()}
              <p className="app-dash-status-text">{getStatusText()}</p>
              <button 
                className="app-dash-progress-btn" 
                onClick={() => setShowProgressModal(true)}
              >
                CLICK TO VIEW YOUR PROGRESS
              </button>
            </div>
          </div>
        </div>

        {/* Company Information Card */}
        <div className="app-dash-company-section">
          <div className="app-dash-company-card">
            <div className="app-dash-company-header">
              <div className="app-dash-company-logo">
                <img src={difsyslogo} alt="DiFS Logo" className="app-dash-logo-image" />
              </div>
              <div className="app-dash-company-title">
                <h2>Digitally Intelligent Facility System, Inc.</h2>
                <p className="app-dash-company-tagline">
                  Empowering smart spaces through digitally intelligent systems for 
                  seamless, secure, and efficient facility management solutions.
                </p>
              </div>
            </div>
            
            <div className="app-dash-company-content">
              <div className="app-dash-company-info">
                <div className="app-dash-info-section">
                  <h4>Contact Information</h4>
                  <div className="app-dash-info-item">
                    <span className="app-dash-info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </span>
                    <div>
                      <p><strong>Address:</strong></p>
                      <p>Block 4 Lot 11, Lynville Residences</p>
                      <p>Brgy Marinig, Cabuyao, 4025 Laguna</p>
                    </div>
                  </div>
                  <div className="app-dash-info-item">
                    <span className="app-dash-info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </span>
                    <div>
                      <p><strong>Email:</strong></p>
                      <p>info@difsystem.com</p>
                    </div>
                  </div>
                  <div className="app-dash-info-item">
                    <span className="app-dash-info-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </span>
                    <div>
                      <p><strong>Phone:</strong></p>
                      <p>(555) 123-4567</p>
                    </div>
                  </div>
                </div>
  
                
                <div className="app-dash-map-section">
                  <h4>Location</h4>
                  <div className="app-dash-map-container">
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d966.6476343773678!2d121.14157315204628!3d14.27708538742735!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d9c3f4c12a43%3A0x377e0582067316af!2sDigitalIy%20Intelligent%20Facility%20Systems%20Inc.!5e0!3m2!1sen!2sph!4v1747881289922!5m2!1sen!2sph" 
                      width="100%" 
                      height="100%" 
                      style={{border:0}} 
                      allowFullScreen="" 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                      title="DIFS Location"
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="app-dash-company-footer">
              <div className="app-dash-copyright">
                <p>© 2025 Digitally Intelligent Facility System, Inc. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Modal */}
      <ProgressModal />
    </div>
  );
};

export default DashboardApplicant;