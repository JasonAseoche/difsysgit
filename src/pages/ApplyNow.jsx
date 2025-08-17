import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/Landing/ApplyNow.css';

const ApplyNow = () => {
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobPositions, setJobPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = 'http://localhost/difsysapi/manage_hiring.php';

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
  };

  const handleCloseModal = () => {
    setSelectedJob(null);
  };

  const handleSignUpToApply = () => {
    navigate('/signup');
  };

  if (isLoading) {
    return (
      <div className="applynow-container">
        <div className="applynow-loading">
          <p>Loading job positions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="applynow-container">
      <div className="applynow-header">
        <h1 className="applynow-title">OUR COMPANY LOOK FOR</h1>
      </div>
      
      {jobPositions.length === 0 ? (
        <div className="applynow-no-positions">
          <p>No job positions available at the moment. Please check back later.</p>
        </div>
      ) : (
        <div className="applynow-grid">
          {jobPositions.map((job) => (
            <div key={job.id} className="applynow-card">
              <div className="applynow-card-image">
                <img 
                  src={job.image_path ? `http://localhost/difsysapi/${job.image_path}` : '/placeholder-image.jpg'} 
                  alt={job.title}
                  onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                />
              </div>
              <div className="applynow-card-body">
                <h3 className="applynow-card-title">{job.title}</h3>
                <p className="applynow-card-text">{job.short_description}</p>
                <button 
                  className="applynow-btn"
                  onClick={() => handleViewDetails(job)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for detailed view */}
      {selectedJob && (
        <div className="applynow-modal-overlay" onClick={handleCloseModal}>
          <div className="applynow-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="applynow-modal-close" onClick={handleCloseModal}>
              ×
            </button>
            
            <div className="applynow-modal-header">
              <h2 className="applynow-modal-title">{selectedJob.title}</h2>
              <button 
                className="applynow-signup-btn"
                onClick={handleSignUpToApply}
              >
                Sign Up to Apply
              </button>
            </div>
            
            <div className="applynow-modal-content">
              {/* Top Section - Image and About the Position */}
              <div className="applynow-modal-top">
                <div className="applynow-modal-image">
                  <img 
                    src={selectedJob.image_path ? `http://localhost/difsysapi/${selectedJob.image_path}` : '/placeholder-image.jpg'} 
                    alt={selectedJob.title}
                    onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                  />
                </div>
                
                <div className="applynow-modal-about">
                  <div className="applynow-modal-section">
                    <h3 className="applynow-section-title">About the Position</h3>
                    <p className="applynow-about-text">
                      {selectedJob.short_description || selectedJob.description || 'No description available for this position.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Requirements and Duties */}
              <div className="applynow-modal-bottom">
                <div className="applynow-modal-section">
                  <h3 className="applynow-section-title">List of Requirements</h3>
                  <ul className="applynow-requirements-list">
                    {selectedJob.requirements && selectedJob.requirements.length > 0 ? (
                      selectedJob.requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))
                    ) : (
                      <li>No specific requirements listed</li>
                    )}
                  </ul>
                </div>

                <div className="applynow-modal-section">
                  <h3 className="applynow-section-title">Duties and Responsibilities</h3>
                  <ul className="applynow-duties-list">
                    {selectedJob.duties && selectedJob.duties.length > 0 ? (
                      selectedJob.duties.map((duty, index) => (
                        <li key={index}>{duty}</li>
                      ))
                    ) : (
                      <li>No specific duties listed</li>
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