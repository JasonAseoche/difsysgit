import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LogIn.css';

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

    // Get the appropriate redirect path based on user role - FIXED
    const getRedirectPath = (role) => {
        console.log("Getting redirect path for role:", role);
        
        // Normalize the role to lowercase for consistent comparison
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
                return '/dashboard-applicant';
            default:
                // Default fallback - should not reach here if roles are set correctly
                console.warn("Unknown role detected:", role);
                return '/dashboard-admin';
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');
        
        console.log('Login attempt with:', { email, password });

        try {
            const response = await axios.post('http://sql100.infinityfree.com/difsysapi/login.php', {
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
                
                // Store user info in localStorage for authentication
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('isAuthenticated', 'true');
                
                // IMPORTANT: Explicitly store the role in localStorage
                const userRole = userData.role || 'user';
                localStorage.setItem('userRole', userRole.toLowerCase());
                
                // Get the correct dashboard path
                const redirectPath = getRedirectPath(userRole);
                
                console.log(`Login successful as ${userRole}, redirecting to ${redirectPath}`);
                
                // Show success alert
                alert('Login successful!');
                
                // FIXED: Use explicit redirection to the role-specific dashboard
                navigate(redirectPath);
            } else {
                console.log('Login failed:', response.data.message);
                setErrorMessage(response.data.message || 'Login failed');
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
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
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
                            />
                            <span className="password-toggles1" onClick={togglePasswordVisibility}>
                                {showPassword ? "🙈" : "👁️"}
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
                    <p className="account-prompts1">Don't have an account? <a href="#">Sign Up</a></p>
                </div>
            </div>
        </div>
    );
};

export default Loginpages;