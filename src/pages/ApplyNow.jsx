import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X } from 'lucide-react';
import '../components/Landing/ApplyNow.css';

const ApplyNow = () => {
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobPositions, setJobPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = 'http://localhost/difsysapi/manage_hiring.php';

  // Company name for display
  const COMPANY_NAME = "DIFSYS, INC";

  useEffect(() => {
    fetchJobPositions();
  }, []);

  // Fetch job positions from API
  const fetchJobPositions = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(API_URL);
      if (response.data.success) {
        setJobPositions(response.data.data);
      } else {
        console.error('Failed to fetch job positions:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching job positions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (job) => {
    setSelectedJob(job);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseModal = () => {
    setSelectedJob(null);
    document.body.style.overflow = 'unset';
  };

  const handleSignUpToApply = () => {
    navigate('/signup');
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Parse tags from comma-separated string
  const parseTags = (tagsString) => {
    if (!tagsString) return [];
    return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
  };

  // Generate job tags based on job data
  const generateJobTags = (job) => {
    return parseTags(job.tags);
  };

  // Generate location from job data
  const generateLocation = (job) => {
    return job.location || 'Cabuyao City';
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && selectedJob) {
        handleCloseModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [selectedJob]);

  if (isLoading) {
    return (
      <div className="applynow-container">
        <div className="applynow-loading">
          <div className="applynow-loading-spinner"></div>
          <span>Loading available positions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="applynow-container">
      <div className="applynow-header">
        <h1 className="applynow-title">Open Positions</h1>
        <p className="applynow-subtitle">
          Join our team and build something amazing together
        </p>
      </div>
      
      {jobPositions.length === 0 ? (
        <div className="applynow-no-positions">
          <h3>No Open Positions</h3>
          <p>We don't have any open positions at the moment, but we're always looking for talented individuals. Check back soon!</p>
        </div>
      ) : (
        <div className="applynow-grid">
          {jobPositions.map((job, index) => {
            const tags = generateJobTags(job);
            const location = generateLocation(job);
            
            return (
              <div 
                key={job.id} 
                className="applynow-card"
                onClick={() => handleViewDetails(job)}
              >
                {/* WHITE OUTER CARD CONTENT */}
                
                {/* COLORED INNER CARD */}
                <div className="applynow-inner-card">
                  <div className="applynow-card-header">
                    <span className="applynow-card-date">
                      {formatDate(job.created_at)}
                    </span>
                  </div>

                  <div>
                    <div className="applynow-card-company">{COMPANY_NAME}</div>
                    <h3 className="applynow-card-title">{job.title}</h3>
                    
                    <div className="applynow-card-tags">
                      {tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="applynow-card-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="applynow-card-inner-footer">
                    {/* Empty footer - location moved to white card */}
                  </div>
                </div>

                {/* DETAILS BUTTON AND LOCATION ON WHITE CARD */}
                <div className="applynow-card-footer">
                  <span className="applynow-card-footer-location">{location}</span>
                  <button 
                    className="applynow-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(job);
                    }}
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for detailed view */}
      {selectedJob && (
        <div className="applynow-modal-overlay" onClick={handleCloseModal}>
          <div className="applynow-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="applynow-modal-header">
              <div className="applynow-modal-header-content">
                <div className="applynow-modal-title-section">
                  <div className="applynow-modal-company">{COMPANY_NAME}</div>
                  <h2 className="applynow-modal-title">{selectedJob.title}</h2>
                  
                  <div className="applynow-modal-meta">
                    {generateJobTags(selectedJob).map((tag, index) => (
                      <span key={index} className="applynow-modal-tag">
                        {tag}
                      </span>
                    ))}
                    <span className="applynow-modal-tag">
                      {generateLocation(selectedJob)}
                    </span>
                  </div>
                </div>
                
                <button 
                  className="applynow-signup-btn"
                  onClick={handleSignUpToApply}
                >
                  Apply Now
                </button>
                <button 
              className="applynow-modal-close" 
              onClick={handleCloseModal}
              aria-label="Close modal"
            >
              <X/>
            </button>
              </div>
            </div>
            
            <div className="applynow-modal-content">
              <div className="applynow-modal-sections">
                {/* About the Position */}
                <div className="applynow-modal-section">
                  <h3 className="applynow-section-title">About this Role</h3>
                  <p className="applynow-about-text">
                    {selectedJob.description || selectedJob.short_description || 
                    `We are looking for a talented ${selectedJob.title} to join our dynamic team. This is an exciting opportunity to work on cutting-edge projects and make a significant impact in a collaborative environment. You'll be working with a team of passionate professionals who are dedicated to delivering exceptional results and pushing the boundaries of innovation.`}
                  </p>
                </div>

                {/* Requirements */}
                <div className="applynow-modal-section">
                  <h3 className="applynow-section-title">What We're Looking For</h3>
                  <ul className="applynow-requirements-list">
                    {selectedJob.requirements && selectedJob.requirements.length > 0 ? (
                      selectedJob.requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))
                    ) : (
                      <>
                        <li>Bachelor's degree in relevant field or equivalent professional experience</li>
                        <li>Strong problem-solving skills and attention to detail</li>
                        <li>Excellent communication and collaboration abilities</li>
                        <li>Passion for continuous learning and professional growth</li>
                        <li>Ability to work effectively in a fast-paced, dynamic environment</li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Responsibilities */}
                <div className="applynow-modal-section">
                  <h3 className="applynow-section-title">Duties and Responsibilities</h3>
                  <ul className="applynow-duties-list">
                    {selectedJob.duties && selectedJob.duties.length > 0 ? (
                      selectedJob.duties.map((duty, index) => (
                        <li key={index}>{duty}</li>
                      ))
                    ) : (
                      <>
                        <li>Collaborate with cross-functional teams to deliver high-quality solutions</li>
                        <li>Contribute to the design and development of innovative products and features</li>
                        <li>Participate in code reviews, planning sessions, and team meetings</li>
                        <li>Stay up-to-date with industry best practices and emerging technologies</li>
                        <li>Mentor junior team members and contribute to a positive team culture</li>
                        <li>Take ownership of projects from conception to deployment</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplyNow;