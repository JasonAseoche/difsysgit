import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const ApplicantRouteGuard = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasApplied, setHasApplied] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        checkApplicantStatus();
    }, []);

    const checkApplicantStatus = async () => {
        try {
            // Check if user is authenticated
            const isAuth = localStorage.getItem('isAuthenticated') === 'true';
            const role = localStorage.getItem('userRole');
            const userId = localStorage.getItem('userId');

            setIsAuthenticated(isAuth);
            setUserRole(role);

            if (!isAuth || !userId) {
                setIsLoading(false);
                return;
            }

            // Only check application status for applicants
            if (role === 'applicant') {
                const response = await axios.get(`http://localhost/difsysapi/check_applicant_status.php?user_id=${userId}`);
                
                if (response.data.success) {
                    // Check if resume_status is "Uploaded"
                    const resumeStatus = response.data.data.resumeStatus;
                    setHasApplied(resumeStatus === 'Uploaded');
                } else {
                    setHasApplied(false);
                }
            } else {
                // Non-applicants can access their dashboards
                setHasApplied(true);
            }
        } catch (error) {
            console.error('Error checking applicant status:', error);
            setHasApplied(false);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                fontSize: '18px'
            }}>
                Loading...
            </div>
        );
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If applicant hasn't applied yet, redirect to upload-resume
    if (userRole === 'applicant' && !hasApplied) {
        return <Navigate to="/upload-resume" replace />;
    }

    // Allow access to the protected route
    return children;
};

export default ApplicantRouteGuard;