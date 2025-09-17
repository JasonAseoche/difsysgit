// utils/auditLogger.js - Utility functions for logging audit entries

import React from 'react';

class AuditLogger {
    static API_BASE_URL = 'http://localhost/difsysapi';

  // Get current user info using your auth system
  static getCurrentUser() {
    try {
      // Import and use your auth utilities
      const userStr = localStorage.getItem('user');
      const userId = localStorage.getItem('userId');
      const userRole = localStorage.getItem('userRole');
      
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          userId: userId ? parseInt(userId) : null,
          userEmail: user.email || user.username || 'unknown',
          userRole: userRole || 'guest',
          userData: user
        };
      }
      
      return {
        userId: userId ? parseInt(userId) : null,
        userEmail: 'anonymous',
        userRole: userRole || 'guest',
        userData: null
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return {
        userId: null,
        userEmail: 'anonymous',
        userRole: 'guest',
        userData: null
      };
    }
  }

  // Get session ID
  static getSessionId() {
    let sessionId = sessionStorage.getItem('audit_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('audit_session_id', sessionId);
    }
    return sessionId;
  }

  // Main logging function
  static async log(component, action, details = '', success = true) {
    try {
      const user = this.getCurrentUser();
      
      const auditData = {
        component: component,
        action: action,
        userId: user.userId,
        userEmail: user.userEmail,
        userRole: user.userRole,
        sessionId: this.getSessionId(),
        details: details,
        success: success,
        url: window.location.pathname,
        timestamp: new Date().toISOString()
      };

      // Send to PHP backend
      const response = await fetch(`${this.API_BASE_URL}/audit_trail.php?endpoint=log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auditData)
      });

      const result = await response.json();
      
      if (!result.success) {
        console.error('Audit log failed:', result.message);
        // Store locally as backup if server fails
        this.storeLocalAudit(auditData);
      }

      return result;
    } catch (error) {
      console.error('Audit logging error:', error);
      // Store locally as backup if network fails
      const user = this.getCurrentUser();
      this.storeLocalAudit({
        component,
        action,
        userId: user.userId,
        userEmail: user.userEmail,
        sessionId: this.getSessionId(),
        details,
        success,
        url: window.location.pathname,
        timestamp: new Date().toISOString()
      });
      return { success: false, error: error.message };
    }
  }

  // Store audit logs locally as backup
  static storeLocalAudit(auditData) {
    try {
      const existing = JSON.parse(localStorage.getItem('auditTrail') || '[]');
      existing.push(auditData);
      
      // Keep only last 1000 entries locally
      if (existing.length > 1000) {
        existing.shift();
      }
      
      localStorage.setItem('auditTrail', JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to store local audit:', error);
    }
  }

  // Convenience methods for common actions
  static async logView(component, details = '') {
    return this.log(component, 'view', details, true);
  }

  static async logCreate(component, details = '') {
    return this.log(component, 'create', details, true);
  }

  static async logUpdate(component, details = '') {
    return this.log(component, 'update', details, true);
  }

  static async logDelete(component, details = '') {
    return this.log(component, 'delete', details, true);
  }

  static async logLogin(component = 'Authentication', details = '') {
    return this.log(component, 'login', details, true);
  }

  static async logLogout(component = 'Authentication', details = '') {
    return this.log(component, 'logout', details, true);
  }

  static async logError(component, action, details = '') {
    return this.log(component, action, details, false);
  }

  static async logDownload(component, filename = '') {
    return this.log(component, 'download', `Downloaded: ${filename}`, true);
  }

  static async logUpload(component, filename = '') {
    return this.log(component, 'upload', `Uploaded: ${filename}`, true);
  }

  // Batch logging for multiple actions
  static async logBatch(logs) {
    const promises = logs.map(logData => {
      return this.log(
        logData.component,
        logData.action,
        logData.details || '',
        logData.success !== false
      );
    });
    
    return Promise.allSettled(promises);
  }
}

// Higher-Order Component for automatic audit logging
export const withAuditTrail = (WrappedComponent, componentName) => {
  return function AuditTrailWrapper(props) {
    const auditComponentName = componentName || WrappedComponent.name || 'UnknownComponent';

    React.useEffect(() => {
      // Log component mount/view
      AuditLogger.logView(auditComponentName, 'Component accessed');

      return () => {
        // Optionally log component unmount
        // AuditLogger.log(auditComponentName, 'unmount', 'Component closed');
      };
    }, []);

    // Wrap common event handlers
    const wrapEventHandlers = (props) => {
      const wrappedProps = { ...props };
      
      const eventHandlers = [
        { prop: 'onClick', action: 'click' },
        { prop: 'onSubmit', action: 'submit' },
        { prop: 'onChange', action: 'change' },
        { prop: 'onSave', action: 'save' },
        { prop: 'onEdit', action: 'edit' },
        { prop: 'onDelete', action: 'delete' },
        { prop: 'onUpdate', action: 'update' },
        { prop: 'onCreate', action: 'create' }
      ];
      
      eventHandlers.forEach(({ prop, action }) => {
        if (props[prop]) {
          wrappedProps[prop] = (...args) => {
            // Log the action
            AuditLogger.log(auditComponentName, action, `User performed ${action} action`);
            
            // Execute original handler
            return props[prop](...args);
          };
        }
      });

      return wrappedProps;
    };

    return React.createElement(WrappedComponent, wrapEventHandlers(props));
  };
};

// React Hook for manual audit logging
export const useAuditTrail = () => {
  return {
    logAction: (action, component, details, success = true) => {
      return AuditLogger.log(component, action, details, success);
    },
    logView: (component, details) => AuditLogger.logView(component, details),
    logCreate: (component, details) => AuditLogger.logCreate(component, details),
    logUpdate: (component, details) => AuditLogger.logUpdate(component, details),
    logDelete: (component, details) => AuditLogger.logDelete(component, details),
    logError: (component, action, details) => AuditLogger.logError(component, action, details),
    logDownload: (component, filename) => AuditLogger.logDownload(component, filename),
    logUpload: (component, filename) => AuditLogger.logUpload(component, filename)
  };
};

// Auto-wrap multiple components
export const wrapComponentsWithAudit = (components) => {
  const wrappedComponents = {};
  
  Object.keys(components).forEach(key => {
    wrappedComponents[key] = withAuditTrail(components[key], key);
  });
  
  return wrappedComponents;
};

export default AuditLogger;