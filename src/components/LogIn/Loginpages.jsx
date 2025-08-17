import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEyeSlash, FaEye } from "react-icons/fa";
import axios from 'axios';
import { setUserData } from '../../utils/auth';
import './LogIn.css';
import { Slash } from 'lucide-react';




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

const Loginpages = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Check if applicant has completed their application
    const checkApplicantStatus = async (userId) => {
        try {
            const response = await axios.get(`http://localhost/difsysapi/check_applicant_status.php?user_id=${userId}`);
            if (response.data.success) {
                // Check resume_status instead of just hasApplied
                const resumeStatus = response.data.data.resumeStatus;
                return { 
                    hasApplied: resumeStatus === 'Uploaded',
                    resumeStatus: resumeStatus 
                };
            }
            return { hasApplied: false, resumeStatus: 'No File' };
        } catch (error) {
            console.error('Error checking applicant status:', error);
            return { hasApplied: false, resumeStatus: 'No File' };
        }
    };

    // Get the appropriate redirect path based on user role and status
    // Get the appropriate redirect path based on user role and status
const getRedirectPath = async (userData) => {
    console.log("Getting redirect path for role:", userData.role);
    
    const normalizedRole = userData.role.toLowerCase();
    
    switch (normalizedRole) {
        case 'admin':
            return '/dashboard-admin';
        case 'hr':
            return '/dashboard-hr';
        case 'accountant':
            return '/dashboard-accountant';
        case 'employee':
            return '/dashboard-employee';
        case 'supervisor':  // Add this case
            return '/dashboard-supervisor';  // Add this case
        case 'applicant':
            // For applicants, check if they have uploaded their resume
            const statusCheck = await checkApplicantStatus(userData.id);
            console.log('Applicant status check:', statusCheck);
            
            if (statusCheck.hasApplied && statusCheck.resumeStatus === 'Uploaded') {
                return '/dashboard-applicant';
            } else {
                return '/upload-resume';
            }
        default:
            console.warn("Unknown role detected:", userData.role);
            return '/dashboard-admin';  // You might want to change this default
    }
};

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');
        
        console.log('Login attempt with:', { email, password });

        try {

            const response = await axios.post('http://localhost/difsysapi/login.php', {

                email,
                password
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log('Response received:', response.data);

            if (response.data.success) {
                const userData = response.data.user;
                
                // Check if user requires email verification
                if (response.data.requires_verification) {
                    console.log('User requires email verification, redirecting to verification page');
                    
                    // Store user data temporarily for verification page
                    localStorage.setItem('tempUser', JSON.stringify(userData));
                    
                    // Navigate to verification page with user data
                    navigate('/verify-email', { 
                        state: { user: userData }
                    });
                } else {
                    // User is already verified, proceed with normal login
                    console.log('User is already verified, proceeding to appropriate page');
                    
                    // Use the updated auth utility to set user data
                    setUserData({
                        token: 'login-token-' + Date.now(),
                        role: userData.role.toLowerCase(),
                        id: userData.id,
                        user: {
                            id: userData.id,
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            email: userData.email,
                            role: userData.role,
                            auth_status: userData.auth_status
                        }
                    });

                    // Also keep the legacy storage for backward compatibility
                    localStorage.setItem('user', JSON.stringify(userData));
                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('userRole', userData.role.toLowerCase());
                    localStorage.setItem('userId', userData.id.toString());
                    
                    // Get the correct redirect path based on user role and application status
                    const redirectPath = await getRedirectPath(userData);
                    
                    console.log(`Login successful as ${userData.role}, redirecting to ${redirectPath}`);
                    console.log('User data stored:', {
                        id: userData.id,
                        role: userData.role,
                        name: `${userData.firstName} ${userData.lastName}`,
                        auth_status: userData.auth_status
                    });
                    
                    // Add a small delay to show success state
                    setTimeout(() => {
                        navigate(redirectPath);
                    }, 1000);
                }
            } else {
                console.log('Login failed:', response.data.message);
                setErrorMessage(response.data.message || 'Login failed');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Login error:', error);
            
            if (error.response) {
                console.error('Error response:', error.response.data);
                console.error('Error status:', error.response.status);
                setErrorMessage(`Server error (${error.response.status}): ${error.response.data.message || 'Unknown error'}`);
            } else if (error.request) {
                console.error('No response received');
                setErrorMessage('No response from server. Please check your connection and try again.');
            } else {
                console.error('Error message:', error.message);
                setErrorMessage(`Error: ${error.message}`);
            }
            setIsLoading(false);
        }
    };

    useEffect(() => {
          document.title = "DIFSYS | LOG IN";
        }, []);

    return (
        <div>
            <LoadingOverlay 
                isVisible={isLoading} 
                message="Signing you in..." 
            />
            
            <div className="login-containers1">
                <div className="blue-backgrounds1"></div>
                <div className="white-backgrounds1"></div>

                <div className="form-containers1">
                    <h1>WELCOME TO DIFSYS</h1>
                    <p className="subheadings1">Sign in to your account</p>

                    <form onSubmit={handleLogin}>
                        <div className="form-groups1">
                            <label htmlFor="emails1">Email Address</label>
                            <input
                                type="email"
                                id="emails1"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="form-groups1 password-groups1">
                            <label htmlFor="passwords1">Password</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                id="passwords1"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            <span className="password-toggles1" onClick={togglePasswordVisibility}>
                                {showPassword ? <FaEyeSlash/> : <FaEye />}
                            </span>
                        </div>

                        {errorMessage && <p className="error-messages1">{errorMessage}</p>}

                        <div className="forgot-passwords1">
                            <a href="#">Forgot Password?</a>
                        </div>

                        <button 
                            type="submit" 
                            className="login-buttons1" 
                            disabled={isLoading}
                        >
                            {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
                        </button>
                    </form>
                    <p className="account-prompts1">Don't have an account? <a href="signup">Sign Up</a></p>
                </div>
            </div>
        </div>
    );
};

export default Loginpages;
