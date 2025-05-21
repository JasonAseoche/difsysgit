import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import DashboardPage from './DashboardPage';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  // Get user information
  const userString = localStorage.getItem('user');
  let user = null;
  let userRole = localStorage.getItem('userRole');
  
  // Try to get user info and role from localStorage
  if (userString) {
    try {
      user = JSON.parse(userString);
      // If userRole isn't explicitly set, try to get it from the user object
      if (!userRole && user && user.role) {
        userRole = user.role;
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
  
  // Check if the current path is "/dashboard" and redirect to role-specific dashboard
  useEffect(() => {
    if (isAuthenticated && userRole && location.pathname === '/login') {
      // Redirect to role-specific dashboard
      const dashboardPath = getRoleDashboardPath(userRole);
      if (location.pathname !== dashboardPath) {
        window.location.href = dashboardPath;
      }
    }
  }, [isAuthenticated, userRole, location.pathname]);
  
  // Get the appropriate dashboard path based on user role
  const getRoleDashboardPath = (role) => {
    switch (role.toLowerCase()) {
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
        return '/dashboard-admin';
    }
  };
  
  console.log('Auth check - isAuthenticated:', isAuthenticated);
  console.log('Auth check - userRole:', userRole);
  console.log('Auth check - allowedRoles:', allowedRoles);
  console.log('Auth check - current path:', location.pathname);
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If role restrictions are specified, check if user has permission
  if (allowedRoles.length > 0) {
    const hasPermission = allowedRoles.some(
      role => userRole && userRole.toLowerCase() === role.toLowerCase()
    );
    
    if (!hasPermission) {
      console.log(`Access denied: Role ${userRole} not in allowed roles ${allowedRoles.join(', ')}`);
      
      // If the user doesn't have permission, redirect them to their appropriate dashboard
      const correctDashboard = getRoleDashboardPath(userRole);
      console.log(`Redirecting to correct dashboard: ${correctDashboard}`);
      return <Navigate to={correctDashboard} replace />;
    }
  }
  
  console.log(`Access granted for role: ${userRole}`);
  
  // Either render children directly or use Outlet with DashboardPage
  if (children) {
    return typeof children === 'function' 
      ? children({ userRole }) 
      : React.cloneElement(children, { userRole });
  }
  
  return (
    <DashboardPage userRole={userRole}>
      <Outlet />
    </DashboardPage>
  );
};

export default PrivateRoute;