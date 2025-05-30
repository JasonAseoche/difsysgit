// auth.js - Authentication utilities

/**
 * Get the current user's authentication status
 * @returns {boolean} True if the user is authenticated
 */
export const isAuthenticated = () => {
    const token = localStorage.getItem('token')
    return !!token // Convert to boolean
  }
  
  /**
   * Get the current user's role
   * @returns {string} The user's role or 'guest' if not found
   */
  export const getUserRole = () => {
    return localStorage.getItem('userRole') || 'guest'
  }
  
  /**
   * Check if the user has one of the specified roles
   * @param {string[]} allowedRoles - Array of roles to check against
   * @returns {boolean} True if the user has one of the allowed roles
   */
  export const hasRole = (allowedRoles = []) => {
    const userRole = getUserRole()
    
    // If no roles specified, allow access
    if (allowedRoles.length === 0) {
      return true
    }
    
    return allowedRoles.includes(userRole)
  }
  
  /**
   * Set user data after successful login
   * @param {Object} userData - User data from login response
   * @param {string} userData.token - Authentication token
   * @param {string} userData.role - User role
   * @param {Object} userData.user - User information
   */
  export const setUserData = (userData) => {
    if (userData.token) {
      localStorage.setItem('token', userData.token)
    }
    
    if (userData.role) {
      localStorage.setItem('userRole', userData.role)
    }
    
    if (userData.user) {
      localStorage.setItem('user', JSON.stringify(userData.user))
    }
  }
  
  /**
   * Clear user data on logout
   */
  export const clearUserData = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    localStorage.removeItem('user')
  }
  
  /**
   * Get the navigation path based on user role
   * @returns {string} Default navigation path for the user's role
   */
  export const getDefaultPath = () => {
    const role = getUserRole()
    
    // Define default paths for each role
    switch (role) {
      case 'admin':
        return '/dashboard-admin'
      case 'hr':
        return '/dashboard-hr'
      case 'accountant':
        return '/dashboard-accountant'
      case 'employee':
        return '/dashboard-employee'
      case 'applicant':
        return '/dashboard-applicant'
      default:
        return '/login'
    }
  }