import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getUserData } from '../../utils/auth';
import difsyslogo from '../../assets/difsyslogo.png';
import './ChangePassword.css';

const ChangePassword = () => {
    // Component states
    const [currentStep, setCurrentStep] = useState(1); // 1: Initial, 2: OTP Verification, 3: Password Change
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(120);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState('');
    const [userData, setUserData] = useState(null);
    
    const navigate = useNavigate();
    const inputRefs = useRef([]);
    
    // Get user data on component mount
    useEffect(() => {
        const user = getUserData();
        if (!user || !user.user) {
            navigate('/login');
            return;
        }
        setUserData(user.user);
    }, [navigate]);
    
    // Timer effect for OTP resend
    useEffect(() => {
        let timer;
        if (currentStep === 2 && resendTimer > 0) {
            timer = setInterval(() => {
                setResendTimer(prev => {
                    if (prev <= 1) {
                        setCanResend(true);
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [currentStep, resendTimer]);
    
    // Password strength checker
    const checkPasswordStrength = (password) => {
        if (password.length < 6) return 'weak';
        if (password.length < 8) return 'medium';
        if (password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return 'strong';
        return 'medium';
    };
    
    // Handle password input changes
    const handlePasswordChange = (field, value) => {
        setPasswords(prev => ({
            ...prev,
            [field]: value
        }));
        
        if (field === 'new') {
            setPasswordStrength(checkPasswordStrength(value));
        }
        
        // Clear errors when user starts typing
        if (error) setError('');
        if (success) setSuccess('');
    };
    
    // Handle OTP input changes (similar to EmailVerification)
    const handleOtpChange = (index, value) => {
        // Allow only numeric values
        if (!/^\d*$/.test(value)) return;
        
        // Handle paste - if more than 1 character, it's likely a paste
        if (value.length > 1) {
            const pastedValue = value.slice(0, 6);
            const newOtp = [...otp];
            
            for (let i = 0; i < pastedValue.length && (index + i) < 6; i++) {
                newOtp[index + i] = pastedValue[i];
            }
            
            setOtp(newOtp);
            
            const nextIndex = Math.min(index + pastedValue.length, 5);
            if (inputRefs.current[nextIndex]) {
                inputRefs.current[nextIndex].focus();
            }
            
            if (error) setError('');
            if (success) setSuccess('');
            return;
        }
        
        // Handle single character input
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        
        if (error) setError('');
        if (success) setSuccess('');
        
        // Auto-focus next input
        if (value && index < 5) {
            if (inputRefs.current[index + 1]) {
                inputRefs.current[index + 1].focus();
            }
        }
    };
    
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            if (inputRefs.current[index - 1]) {
                inputRefs.current[index - 1].focus();
            }
        }
    };
    
    // Step 1: Request OTP for password change
    const handleRequestOTP = async () => {
        if (!userData) {
            setError('User data not found. Please login again.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        setSuccess('');
        
        try {
            const response = await axios.post('http://localhost/difsysapi/change_password.php', {
                action: 'request_otp',
                user_id: userData.id
            });
            
            if (response.data.success) {
                setSuccess('Verification code sent to your email!');
                setCurrentStep(2);
                setResendTimer(120);
                setCanResend(false);
                
                // Focus first OTP input after a short delay
                setTimeout(() => {
                    if (inputRefs.current[0]) {
                        inputRefs.current[0].focus();
                    }
                }, 100);
                
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.data.message || 'Failed to send verification code');
            }
        } catch (error) {
            console.error('Request OTP error:', error);
            setError('Failed to send verification code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Step 2: Verify OTP
    const handleVerifyOTP = async () => {
        const code = otp.join('');
        
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit verification code');
            return;
        }
        
        setIsLoading(true);
        setError('');
        setSuccess('');
        
        try {
            const response = await axios.post('http://localhost/difsysapi/change_password.php', {
                action: 'verify_otp',
                user_id: userData.id,
                otp: code
            });
            
            if (response.data.success) {
                setSuccess('Verification successful! You can now change your password.');
                setCurrentStep(3);
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.data.message || 'Invalid verification code');
                setOtp(['', '', '', '', '', '']);
                setTimeout(() => {
                    if (inputRefs.current[0]) {
                        inputRefs.current[0].focus();
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Verify OTP error:', error);
            setError('Verification failed. Please try again.');
            setOtp(['', '', '', '', '', '']);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Step 3: Change Password
    const handleChangePassword = async () => {
        const { current, new: newPassword, confirm } = passwords;
        
        // Validation
        if (!current || !newPassword || !confirm) {
            setError('Please fill in all password fields');
            return;
        }
        
        if (newPassword !== confirm) {
            setError('New password and confirm password do not match');
            return;
        }
        
        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters long');
            return;
        }
        
        if (current === newPassword) {
            setError('New password must be different from current password');
            return;
        }
        
        setIsLoading(true);
        setError('');
        setSuccess('');
        
        try {
            const response = await axios.post('http://localhost/difsysapi/change_password.php', {
                action: 'change_password',
                user_id: userData.id,
                current_password: current,
                new_password: newPassword
            });
            
            if (response.data.success) {
                setSuccess('Password changed successfully!');
                setShowSuccessModal(true);
                
                // Redirect after success modal
                setTimeout(() => {
                    navigate('/dashboard-' + userData.role.toLowerCase());
                }, 3000);
            } else {
                setError(response.data.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Change password error:', error);
            setError('Failed to change password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Resend OTP
    const handleResendOTP = async () => {
        setIsResending(true);
        setError('');
        setSuccess('');
        
        try {
            const response = await axios.post('http://localhost/difsysapi/change_password.php', {
                action: 'request_otp',
                user_id: userData.id
            });
            
            if (response.data.success) {
                setSuccess('New verification code sent to your email');
                setCanResend(false);
                setResendTimer(120);
                setOtp(['', '', '', '', '', '']);
                
                setTimeout(() => {
                    if (inputRefs.current[0]) {
                        inputRefs.current[0].focus();
                    }
                }, 100);
                
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(response.data.message || 'Failed to resend verification code');
            }
        } catch (error) {
            console.error('Resend error:', error);
            setError('Failed to resend verification code. Please try again.');
        } finally {
            setIsResending(false);
        }
    };
    
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Success Modal Component
    const SuccessModal = memo(() => (
        <div className="difsys-change-password-success-overlay-unique">
            <div className="difsys-change-password-success-modal-unique">
                <div className="difsys-change-password-success-icon-wrapper-unique">
                    <div className="difsys-change-password-success-icon-unique">
                        ✓
                    </div>
                </div>
                <h2 className="difsys-change-password-success-title-unique">Password Changed Successfully!</h2>
                <p className="difsys-change-password-success-subtitle-unique">
                    Your password has been updated. You will be redirected to your dashboard.
                </p>
            </div>
        </div>
    ));
    
    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <>
                        <div className="difsys-change-password-header-unique">
                            <img src={difsyslogo} alt="DIFSYS Logo" className="difsys-change-password-logo-unique" />
                            <h1 className="difsys-change-password-title-unique">Change Password</h1>
                            <p className="difsys-change-password-subtitle-unique">
                                To change your password, we need to verify your identity first.
                                <br />
                                <strong>Email:</strong> {userData?.email}
                            </p>
                        </div>
                        
                        <div className="difsys-change-password-actions-unique">
                            <button
                                onClick={handleRequestOTP}
                                disabled={isLoading}
                                className="difsys-change-password-btn-unique difsys-change-password-btn-primary-unique"
                            >
                                {isLoading ? (
                                    <span className="difsys-change-password-loading-unique">
                                        <span className="difsys-change-password-spinner-unique"></span>
                                        Sending...
                                    </span>
                                ) : (
                                    'Send Verification Code'
                                )}
                            </button>
                            <button
                                onClick={() => navigate(-1)}
                                className="difsys-change-password-btn-unique difsys-change-password-btn-secondary-unique"
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                );
            
            case 2:
                return (
                    <>
                        <div className="difsys-change-password-header-unique">
                            <img src={difsyslogo} alt="DIFSYS Logo" className="difsys-change-password-logo-unique" />
                            <h1 className="difsys-change-password-title-unique">Enter Verification Code</h1>
                            <p className="difsys-change-password-subtitle-unique">
                                We've sent a 6-digit verification code to your email: <strong>{userData?.email}</strong>
                            </p>
                        </div>
                        
                        <div className="difsys-change-password-otp-container-unique">
                            <div className="difsys-change-password-otp-inputs-unique">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={el => inputRefs.current[index] = el}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength="6"
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className="difsys-change-password-otp-input-unique"
                                        disabled={isLoading}
                                    />
                                ))}
                            </div>
                            
                            <div className="difsys-change-password-actions-unique">
                                <button
                                    onClick={handleVerifyOTP}
                                    disabled={isLoading || otp.some(digit => digit === '')}
                                    className="difsys-change-password-btn-unique difsys-change-password-btn-primary-unique"
                                >
                                    {isLoading ? (
                                        <span className="difsys-change-password-loading-unique">
                                            <span className="difsys-change-password-spinner-unique"></span>
                                            Verifying...
                                        </span>
                                    ) : (
                                        'Verify Code'
                                    )}
                                </button>
                                <button
                                    onClick={handleResendOTP}
                                    disabled={!canResend || isResending}
                                    className="difsys-change-password-btn-unique difsys-change-password-btn-secondary-unique"
                                >
                                    {isResending ? 'Sending...' : 
                                     canResend ? 'Resend Code' : 
                                     `Resend Code in ${formatTime(resendTimer)}`}
                                </button>
                            </div>
                        </div>
                    </>
                );
            
            case 3:
                return (
                    <>
                        <div className="difsys-change-password-header-unique">
                            <img src={difsyslogo} alt="DIFSYS Logo" className="difsys-change-password-logo-unique" />
                            <h1 className="difsys-change-password-title-unique">Set New Password</h1>
                            <p className="difsys-change-password-subtitle-unique">
                                Please enter your current password and choose a new secure password.
                            </p>
                        </div>
                        
                        <div className="difsys-change-password-form-unique">
                            <div className="difsys-change-password-input-group-unique">
                                <label className="difsys-change-password-label-unique">Current Password</label>
                                <input
                                    type="password"
                                    value={passwords.current}
                                    onChange={(e) => handlePasswordChange('current', e.target.value)}
                                    className="difsys-change-password-input-unique"
                                    placeholder="Enter your current password"
                                    disabled={isLoading}
                                />
                            </div>
                            
                            <div className="difsys-change-password-input-group-unique">
                                <label className="difsys-change-password-label-unique">New Password</label>
                                <input
                                    type="password"
                                    value={passwords.new}
                                    onChange={(e) => handlePasswordChange('new', e.target.value)}
                                    className="difsys-change-password-input-unique"
                                    placeholder="Enter your new password"
                                    disabled={isLoading}
                                />
                                {passwords.new && (
                                    <div className={`difsys-change-password-strength-unique ${passwordStrength}`}>
                                        Password strength: {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                                    </div>
                                )}
                            </div>
                            
                            <div className="difsys-change-password-input-group-unique">
                                <label className="difsys-change-password-label-unique">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwords.confirm}
                                    onChange={(e) => handlePasswordChange('confirm', e.target.value)}
                                    className={`difsys-change-password-input-unique ${
                                        passwords.confirm && passwords.new !== passwords.confirm ? 'error' : 
                                        passwords.confirm && passwords.new === passwords.confirm ? 'success' : ''
                                    }`}
                                    placeholder="Confirm your new password"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        
                        <div className="difsys-change-password-actions-unique">
                            <button
                                onClick={handleChangePassword}
                                disabled={isLoading || !passwords.current || !passwords.new || !passwords.confirm || passwords.new !== passwords.confirm}
                                className="difsys-change-password-btn-unique difsys-change-password-btn-primary-unique"
                            >
                                {isLoading ? (
                                    <span className="difsys-change-password-loading-unique">
                                        <span className="difsys-change-password-spinner-unique"></span>
                                        Changing Password...
                                    </span>
                                ) : (
                                    'Change Password'
                                )}
                            </button>
                            <button
                                onClick={() => setCurrentStep(1)}
                                disabled={isLoading}
                                className="difsys-change-password-btn-unique difsys-change-password-btn-secondary-unique"
                            >
                                Start Over
                            </button>
                        </div>
                    </>
                );
            
            default:
                return null;
        }
    };
    
    if (!userData) {
        return <div>Loading...</div>;
    }
    
    return (
        <div className="difsys-change-password-container-unique">
            {showSuccessModal && <SuccessModal />}
            
            <div className="difsys-change-password-card-unique">
                {/* Step indicators */}
                <div className="difsys-change-password-steps-unique">
                    <div className={`difsys-change-password-step-unique ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                        1
                    </div>
                    <div className={`difsys-change-password-step-unique ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                        2
                    </div>
                    <div className={`difsys-change-password-step-unique ${currentStep >= 3 ? 'active' : ''}`}>
                        3
                    </div>
                </div>
                
                {/* Error and success messages */}
                {error && <div className="difsys-change-password-error-message-unique">{error}</div>}
                {success && <div className="difsys-change-password-success-message-unique">{success}</div>}
                
                {/* Step content */}
                {renderStepContent()}
            </div>
        </div>
    );
};

export default ChangePassword;