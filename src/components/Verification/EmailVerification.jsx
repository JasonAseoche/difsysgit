import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { setUserData } from '../../utils/auth';
import difsyslogo from '../../assets/difsyslogo.png';
import './EmailVerification.css';

const EmailVerification = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(120);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [success, setSuccess] = useState('');
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get user data from location state or localStorage
    const userData = location.state?.user || JSON.parse(localStorage.getItem('tempUser') || '{}');
    
    useEffect(() => {
        if (!userData.email) {
            navigate('/login');
            return;
        }
        
        // Start countdown timer
        const timer = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) {
                    setCanResend(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(timer);
    }, [userData.email, navigate]);
    
    const handleOtpChange = (index, value) => {
        if (value.length > 1) return;
        
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        
        // Clear any previous errors when user starts typing
        if (error) setError('');
        if (success) setSuccess('');
        
        // Auto-focus next input but DON'T auto-submit
        if (value && index < 5) {
            const nextInput = document.getElementById(`difsys-otp-input-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };
    
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`difsys-otp-input-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    // Get redirect path based on user role - UPDATED FOR APPLICANT FLOW
    const getRedirectPath = (role) => {
        const normalizedRole = role.toLowerCase();
        switch (normalizedRole) {
            case 'admin': 
                return '/dashboard-admin';
            case 'hr': 
                return '/dashboard-hr';
            case 'accountant': 
                return '/dashboard-accountant';
            case 'employee': 
                return '/dashboard-employee';
            case 'applicant': 
                // For applicants, redirect to upload-resume after verification
                // This is their first time, so they need to fill out the application
                return '/upload-resume';
            default: 
                return '/dashboard-admin';
        }
    };
    
    const handleVerification = async () => {
        const code = otp.join('');
        
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit OTP');
            return;
        }
        
        // Prevent multiple submissions
        if (isLoading || isVerified) return;
        
        setIsLoading(true);
        setError('');
        setSuccess('');
        
        try {
            const response = await axios.post('http://localhost/difsysapi/verify_otp.php', {
                action: 'verify',
                user_id: userData.id,
                otp: code
            });
            
            if (response.data.success) {
                // Set verified state immediately to prevent re-renders
                setIsVerified(true);
                setSuccess('Account verified successfully!');
                
                // Show success animation after a tiny delay
                setTimeout(() => {
                    setShowSuccessAnimation(true);
                }, 100);
                
                // Set user data in auth system with verified status
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
                        auth_status: 'Verified'
                    }
                });
                
                // Legacy storage with verified status
                const verifiedUserData = {
                    ...userData,
                    auth_status: 'Verified'
                };
                
                localStorage.setItem('user', JSON.stringify(verifiedUserData));
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userRole', userData.role.toLowerCase());
                localStorage.setItem('userId', userData.id.toString()); // Add userId for API calls
                localStorage.removeItem('tempUser');
                
                // Wait for animation to complete before redirecting
                setTimeout(() => {
                    const redirectPath = getRedirectPath(userData.role);
                    console.log(`Email verification successful for ${userData.role}, redirecting to ${redirectPath}`);
                    navigate(redirectPath);
                }, 4000); // 4 seconds to show the success animation
                
            } else {
                setError(response.data.message || 'Invalid OTP');
                // Clear OTP fields on error
                setOtp(['', '', '', '', '', '']);
                // Focus first input
                setTimeout(() => {
                    const firstInput = document.getElementById('difsys-otp-input-0');
                    if (firstInput) firstInput.focus();
                }, 100);
            }
        } catch (error) {
            console.error('Verification error:', error);
            setError('Verification failed. Please try again.');
            setOtp(['', '', '', '', '', '']);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleResendOTP = async () => {
        setIsResending(true);
        setError('');
        setSuccess('');
        
        try {
            const response = await axios.post('http://localhost/difsysapi/verify_otp.php', {
                action: 'resend',
                user_id: userData.id
            });
            
            if (response.data.success) {
                setSuccess('New OTP sent to your email');
                setCanResend(false);
                setResendTimer(120);
                setOtp(['', '', '', '', '', '']);
                
                // Focus first input
                setTimeout(() => {
                    const firstInput = document.getElementById('difsys-otp-input-0');
                    if (firstInput) firstInput.focus();
                }, 100);
                
                // Restart timer
                const timer = setInterval(() => {
                    setResendTimer(prev => {
                        if (prev <= 1) {
                            setCanResend(true);
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
                
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.data.message || 'Failed to resend OTP');
            }
        } catch (error) {
            console.error('Resend error:', error);
            setError('Failed to resend OTP. Please try again.');
        } finally {
            setIsResending(false);
        }
    };
    
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Success Animation Component with unique classes - FIXED NO RE-RENDER
    const DifsysSuccessModal = memo(() => {
        const progressStarted = useRef(false);
        const [progressActive, setProgressActive] = useState(false);

        useEffect(() => {
            // Only start once, prevent re-triggering
            if (!progressStarted.current) {
                progressStarted.current = true;
                const timer = setTimeout(() => {
                    setProgressActive(true);
                }, 500);
                return () => clearTimeout(timer);
            }
        }, []); // Empty dependency array - runs only once

        // Dynamic message based on user role
        const getRedirectMessage = () => {
            const role = userData.role?.toLowerCase();
            if (role === 'applicant') {
                return 'Redirecting to application form...';
            }
            return 'Redirecting to your dashboard...';
        };

        return (
            <div className="difsys-success-overlay-unique" key="difsys-success-static">
                <div className="difsys-success-modal-unique">
                    <div className="difsys-success-icon-wrapper-unique">
                        <div className="difsys-success-icon-unique">
                            ✓
                        </div>
                    </div>
                    <h2 className="difsys-success-title-unique">Account Successfully Verified!</h2>
                    <p className="difsys-success-subtitle-unique">{getRedirectMessage()}</p>
                    <div className="difsys-success-progress-unique">
                        <div className={`difsys-success-progress-bar-unique ${progressActive ? 'difsys-progress-active-unique' : ''}`}></div>
                    </div>
                    <div className="difsys-success-progress-text-unique">Please wait...</div>
                </div>
            </div>
        );
    });
    
    return (
        <div className="difsys-email-verification-container-unique">
            {showSuccessAnimation && <DifsysSuccessModal key="success-modal-permanent" />}
            
            <div className="difsys-email-verification-card-unique">
                <div className="difsys-email-verification-header-unique">
                    <img src={difsyslogo} alt="DIFSYS Logo" className="difsys-email-verification-logo-unique" />
                    <h1 className="difsys-email-verification-title-unique">Verify Your Account</h1>
                    <p className="difsys-email-verification-subtitle-unique">
                        The OTP code has been sent to your email: <strong>{userData.email}</strong>. 
                        Check Spam or Trash folder if not seen.
                    </p>
                </div>
                
                <div className="difsys-email-verification-otp-container-unique">
                    <div className="difsys-email-verification-otp-inputs-unique">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                id={`difsys-otp-input-${index}`}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className={`difsys-email-verification-otp-input-unique ${isVerified ? 'difsys-verified-state-unique' : ''}`}
                                disabled={isLoading || isVerified}
                            />
                        ))}
                    </div>
                    
                    {error && <div className="difsys-email-verification-error-message-unique">{error}</div>}
                    {success && !showSuccessAnimation && <div className="difsys-email-verification-success-message-unique">{success}</div>}
                    
                    <div className="difsys-email-verification-actions-unique">
                        <button
                            onClick={handleVerification}
                            disabled={isLoading || otp.some(digit => digit === '') || isVerified}
                            className={`difsys-email-verification-verify-button-unique ${isVerified ? 'difsys-verified-button-state-unique' : ''}`}
                        >
                            {isLoading ? 'Verifying...' : 
                             isVerified ? '✓ Verified' : 
                             'Verify Account'}
                        </button>
                        
                        <button
                            onClick={handleResendOTP}
                            disabled={!canResend || isResending || isVerified}
                            className="difsys-email-verification-resend-button-unique"
                        >
                            {isResending ? 'Sending...' : 
                             canResend ? 'Resend OTP' : 
                             `Resend OTP in ${formatTime(resendTimer)}`}
                        </button>  
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailVerification;