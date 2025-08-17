import axios from 'axios';
import React, { useState, useEffect } from 'react';
import './Signup.css';

// Loading Overlay Component
const LoadingOverlay = ({ isVisible, message }) => {
    if (!isVisible) return null;

    return (

      
        <div className="loading-overlay">
            <div className="loading-content">
                <div className="loading-spinner">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                </div>
                <p className="loading-text">{message}</p>
            </div>
        </div>
    );
};

const Signuppages = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id.replace('difsys_', '')]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Replace with your actual API endpoint URL
      const response = await axios.post('http://localhost/difsysapi/signup.php', formData);
      
      console.log('Response:', response.data);
      
      if (response.data.success) {
        setSuccess(response.data.message);
        // Clear form after successful submission
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        // Hide loading after showing success for a moment
        setTimeout(() => {
          setLoading(false);
        }, 2000);
      } else {
        setError(response.data.message || 'Registration failed');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(
        err.response?.data?.message || 
        'An error occurred connecting to the server. Please try again.'
      );
      setLoading(false);
    }
  };

  useEffect(() => {
            document.title = "DIFSYS | SIGN UP";
          }, []);

  return (

    
    <div className="difsys-signup">
      <LoadingOverlay 
        isVisible={loading} 
        message={success ? "Account created successfully!" : "Creating your account..."} 
      />
      
      <div className="signup-container">
        <div className="blue-background"></div>
        <div className="white-background"></div>

        
        
        <div className="form-container-signup">
          <h1>WELCOME TO DIFSYS</h1>
          <p className="subheading">Create an account to get started</p>
          
          {error && <div className="error-message">{error}</div>}
          {success && !loading && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="difsys_firstName">First Name</label>
                <input 
                  type="text" 
                  id="difsys_firstName" 
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="difsys_lastName">Last Name</label>
                <input 
                  type="text" 
                  id="difsys_lastName" 
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="difsys_email">Email Address</label>
              <input 
                type="email" 
                id="difsys_email" 
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group password-group">
              <label htmlFor="difsys_password">Password</label>
              <input 
                type={showPassword ? "text" : "password"} 
                id="difsys_password" 
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <span className="password-toggle" onClick={togglePasswordVisibility}>
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
            
            <div className="form-group password-group">
              <label htmlFor="difsys_confirmPassword">Confirm Password</label>
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                id="difsys_confirmPassword" 
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <span className="password-toggle" onClick={toggleConfirmPasswordVisibility}>
                {showConfirmPassword ? "🙈" : "👁️"}
              </span>
            </div>
            
            <button 
              type="submit" 
              className="sign-up-button" 
              disabled={loading}
            >
              {loading ? 'SIGNING UP...' : 'SIGN UP'}
            </button>
          </form>
          
          <p className="account-prompt">Already have an account? <a href="login">Sign In</a></p>
        </div>
      </div>
    </div>
  );
};

export default Signuppages;