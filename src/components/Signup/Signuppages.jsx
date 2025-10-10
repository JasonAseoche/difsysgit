import axios from 'axios';
import { FaEyeSlash, FaEye } from "react-icons/fa";
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
    confirmPassword: '',
    agreeToTerms: false
  });
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleChange = (e) => {
  const { id, value } = e.target;
  const fieldName = id.replace('difsys_', '');
  
  setFormData({
    ...formData,
    [fieldName]: value
  });
  
  // Clear password error when user starts typing
  if (fieldName === 'password') {
    setPasswordError('');
  }
};

  // Terms Modal
const TermsModal = () => (
  <div className="modal-overlay" onClick={() => setShowTerms(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Terms and Conditions</h2>
        <button className="modal-close" onClick={() => setShowTerms(false)}>×</button>
      </div>
      <div className="modal-body">
        <h3>1. Acceptance of Terms</h3>
        <p>By creating an account with DIFSYS HR Management System, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.</p>
        
        <h3>2. Account Registration</h3>
        <p>You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials.</p>
        
        <h3>3. Use of Personal Information</h3>
        <p>By using our service, you consent to the collection and use of your personal information for HR management purposes, including but not limited to:</p>
        <ul>
          <li>Processing employment applications</li>
          <li>Payroll management and processing</li>
          <li>Employee record maintenance</li>
          <li>Compliance with labor laws and regulations</li>
        </ul>
        
        <h3>4. Document Uploads</h3>
        <p>You may be required to upload personal documents such as resumes, birth certificates, and other identification documents. You warrant that all uploaded documents are authentic and belong to you.</p>
        
        <h3>5. Data Security</h3>
        <p>We implement appropriate security measures to protect your personal information. However, you acknowledge that no system is completely secure.</p>
        
        <h3>6. Prohibited Uses</h3>
        <p>You agree not to use the service for any unlawful purpose or in any way that could damage, disable, or impair the service.</p>
        
        <h3>7. Termination</h3>
        <p>We reserve the right to terminate your account at any time for violation of these terms or for any other reason.</p>
        
        <h3>8. Changes to Terms</h3>
        <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.</p>
      </div>
      <div className="modal-footer">
        <button className="modal-btn" onClick={() => setShowTerms(false)}>Close</button>
      </div>
    </div>
  </div>
);

// Privacy Modal
const PrivacyModal = () => (
  <div className="modal-overlay" onClick={() => setShowPrivacy(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Data Privacy Policy</h2>
        <button className="modal-close" onClick={() => setShowPrivacy(false)}>×</button>
      </div>
      <div className="modal-body">
        <h3>1. Information We Collect</h3>
        <p>We collect the following types of information:</p>
        <ul>
          <li><strong>Personal Information:</strong> Name, email address, phone number, address</li>
          <li><strong>Employment Information:</strong> Resume, work history, educational background</li>
          <li><strong>Identity Documents:</strong> Birth certificates, government-issued IDs, licenses</li>
          <li><strong>Financial Information:</strong> Bank details for payroll processing</li>
        </ul>
        
        <h3>2. How We Use Your Information</h3>
        <p>Your information is used for:</p>
        <ul>
          <li>Processing job applications and employment</li>
          <li>Payroll processing and tax compliance</li>
          <li>HR record management</li>
          <li>Legal and regulatory compliance</li>
          <li>Communication regarding employment matters</li>
        </ul>
        
        <h3>3. Information Sharing</h3>
        <p>We do not sell your personal information. We may share your information with:</p>
        <ul>
          <li>Authorized personnel within your organization</li>
          <li>Government agencies as required by law</li>
          <li>Third-party service providers (with appropriate safeguards)</li>
        </ul>
        
        <h3>4. Data Security</h3>
        <p>We implement industry-standard security measures including:</p>
        <ul>
          <li>Encryption of sensitive data</li>
          <li>Access controls and authentication</li>
          <li>Regular security audits</li>
          <li>Secure data storage and transmission</li>
        </ul>
        
        <h3>5. Data Retention</h3>
        <p>We retain your information for as long as necessary to fulfill employment purposes and comply with legal requirements.</p>
        
        <h3>6. Your Rights</h3>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal information</li>
          <li>Request corrections to your data</li>
          <li>Request deletion of your information (subject to legal requirements)</li>
          <li>Receive a copy of your data</li>
        </ul>
        
        <h3>7. Contact Information</h3>
        <p>For privacy-related questions or requests, contact us at: privacy@difsys.com</p>
        
        <h3>8. Policy Updates</h3>
        <p>This policy may be updated periodically. We will notify you of significant changes.</p>
      </div>
      <div className="modal-footer">
        <button className="modal-btn" onClick={() => setShowPrivacy(false)}>Close</button>
      </div>
    </div>
  </div>
);

  const getPasswordStrength = (password) => {
  let score = 0;
  let feedback = [];

  if (password.length >= 8) score += 1;
  else feedback.push('at least 8 characters');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('lowercase letter');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('uppercase letter');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('number');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('special character');

  const strength = {
    0: { text: 'Very Weak', class: 'very-weak', percentage: 20 },
    1: { text: 'Weak', class: 'weak', percentage: 40 },
    2: { text: 'Fair', class: 'fair', percentage: 60 },
    3: { text: 'Good', class: 'good', percentage: 80 },
    4: { text: 'Strong', class: 'strong', percentage: 90 },
    5: { text: 'Very Strong', class: 'very-strong', percentage: 100 }
  };

  return strength[score] || strength[0];
};



  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  setPasswordError('');
  
  // Check password strength before submitting
  const passwordStrength = getPasswordStrength(formData.password);
  if (passwordStrength.class === 'very-weak' || passwordStrength.class === 'weak') {
    setPasswordError('Your password is too weak. Please create a stronger password.');
    return;
  }
  
  // Check if passwords match
  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match');
    return;
  }
  
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
          confirmPassword: '',
          agreeToTerms: false
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
    {showTerms && <TermsModal />}
    {showPrivacy && <PrivacyModal />}
    
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
                {showPassword ? <FaEyeSlash/> : <FaEye />}
              </span>
              {formData.password && (
                <div className="password-strength">
                  <div className="password-strength-bar">
                    <div 
                      className={`password-strength-fill ${getPasswordStrength(formData.password).class}`}
                      style={{ width: `${getPasswordStrength(formData.password).percentage}%` }}
                    ></div>
                  </div>
                  <span className={`password-strength-text ${getPasswordStrength(formData.password).class}`}>
                    {getPasswordStrength(formData.password).text}
                  </span>
                </div>
              )}
              {passwordError && <div className="password-error-message">{passwordError}</div>}
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
                  {showConfirmPassword ? <FaEyeSlash/> : <FaEye />}
              </span>
            </div>
            
            <div className="terms-container">
              <label className="terms-checkbox-container">
                <input 
                  type="checkbox" 
                  checked={formData.agreeToTerms}
                  onChange={(e) => setFormData({...formData, agreeToTerms: e.target.checked})}
                  required
                  disabled={loading}
                />
                <span className="checkmark"></span>
                <span className="terms-text">
                  I agree to the <button type="button" className="terms-link" onClick={() => setShowTerms(true)}>Terms and Conditions</button> and <button type="button" className="terms-link" onClick={() => setShowPrivacy(true)}>Data Privacy Policy</button>
                </span>
              </label>
            </div>
              <button 
                type="submit" 
                className="sign-up-button" 
                disabled={loading || !formData.agreeToTerms || passwordError}
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