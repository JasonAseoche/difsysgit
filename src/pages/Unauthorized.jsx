import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <div className="unauthorized-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#FF5555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 9L9 15" stroke="#FF5555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9L15 15" stroke="#FF5555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <p>Please contact your administrator if you believe this is an error.</p>
        <div className="unauthorized-actions">
          <Link to="/dashboard" className="primary-button">
            Go to Dashboard
          </Link>
          <Link to="/login" className="secondary-button">
            Log In Again
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;