import React, { useState, useEffect } from 'react';
import '../../components/AdminLayout/AuditTrail.css';

const AuditTrail = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filters, setFilters] = useState({
    component: '',
    action: '',
    user: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    itemsPerPage: 10
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActions: 0,
    uniqueUsers: 0,
    topComponent: '',
    todayActions: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    itemsPerPage: 10,
    totalRecords: 0,
    totalPages: 0
  });

  // API Base URL - adjust this to match your PHP backend location
  const API_BASE_URL = 'http://localhost/difsysapi/'; // or 'http://localhost/your-project/api'

  useEffect(() => {
    fetchAuditLogs();
    fetchStatistics();
  }, [filters]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        component: filters.component,
        action: filters.action,
        user: filters.user,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page: filters.page.toString(),
        itemsPerPage: filters.itemsPerPage.toString()
      });

      const response = await fetch(`${API_BASE_URL}/audit_trail.php?endpoint=logs&${queryParams}`);
      const result = await response.json();

      if (result.success) {
        setAuditLogs(result.data);
        setFilteredLogs(result.data);
        setPagination(result.pagination);
      } else {
        console.error('Failed to fetch audit logs:', result.message);
        // Fallback to empty array
        setAuditLogs([]);
        setFilteredLogs([]);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      // Fallback to empty array
      setAuditLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/audit_trail.php?endpoint=stats`);
      const result = await response.json();

      if (result.success) {
        setStats(result.stats);
      } else {
        console.error('Failed to fetch statistics:', result.message);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    
    // Reset to page 1 when changing filters (except page itself)
    if (field !== 'page') {
      newFilters.page = 1;
    }
    
    setFilters(newFilters);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionColor = (action) => {
    const colorMap = {
      'create': 'audit-trail-action-create',
      'update': 'audit-trail-action-update',
      'delete': 'audit-trail-action-delete',
      'view': 'audit-trail-action-view',
      'login': 'audit-trail-action-login',
      'logout': 'audit-trail-action-logout'
    };
    return colorMap[action] || 'audit-trail-action-default';
  };

  const exportLogs = async () => {
    try {
      // Fetch all filtered logs for export (without pagination)
      const queryParams = new URLSearchParams({
        component: filters.component,
        action: filters.action,
        user: filters.user,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page: '1',
        itemsPerPage: '10000' // Large number to get all results
      });

      const response = await fetch(`${API_BASE_URL}/audit_trail.php?endpoint=logs&${queryParams}`);
      const result = await response.json();

      if (result.success) {
        const csvContent = [
          ['Timestamp', 'Component', 'Action', 'User', 'IP Address', 'Success', 'Details'],
          ...result.data.map(log => [
            formatTimestamp(log.timestamp),
            log.component,
            log.action,
            log.user_email,
            log.ip_address,
            log.success ? 'Yes' : 'No',
            log.details
          ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to export logs: ' + result.message);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export logs. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="audit-trail-container">
        <div className="audit-trail-loading">Loading audit trail...</div>
      </div>
    );
  }

  return (
    <div className="audit-trail-container">
      <div className="audit-trail-header">
        <h1 className="audit-trail-title">System Audit Trail</h1>
        <button 
          className="audit-trail-export-btn" 
          onClick={exportLogs}
        >
          Export CSV
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="audit-trail-stats">
        <div className="audit-trail-stat-card">
          <div className="audit-trail-stat-value">{stats.totalActions}</div>
          <div className="audit-trail-stat-label">Total Actions</div>
        </div>
        <div className="audit-trail-stat-card">
          <div className="audit-trail-stat-value">{stats.uniqueUsers}</div>
          <div className="audit-trail-stat-label">Active Users</div>
        </div>
        <div className="audit-trail-stat-card">
          <div className="audit-trail-stat-value">{stats.topComponent}</div>
          <div className="audit-trail-stat-label">Most Used Component</div>
        </div>
        <div className="audit-trail-stat-card">
          <div className="audit-trail-stat-value">{stats.todayActions}</div>
          <div className="audit-trail-stat-label">Today's Actions</div>
        </div>
      </div>

      {/* Filters */}
      <div className="audit-trail-filters">
        <div className="audit-trail-filter-group">
          <input
            type="text"
            placeholder="Filter by component..."
            className="audit-trail-filter-input"
            value={filters.component}
            onChange={(e) => handleFilterChange('component', e.target.value)}
          />
          <input
            type="text"
            placeholder="Filter by action..."
            className="audit-trail-filter-input"
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
          />
          <input
            type="text"
            placeholder="Filter by user..."
            className="audit-trail-filter-input"
            value={filters.user}
            onChange={(e) => handleFilterChange('user', e.target.value)}
          />
        </div>
        <div className="audit-trail-filter-group">
          <input
            type="date"
            className="audit-trail-filter-input"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            placeholder="From date"
          />
          <input
            type="date"
            className="audit-trail-filter-input"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            placeholder="To date"
          />
          <select
            className="audit-trail-filter-input"
            value={filters.itemsPerPage}
            onChange={(e) => handleFilterChange('itemsPerPage', parseInt(e.target.value))}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="audit-trail-results-info">
        Showing {filteredLogs.length} of {pagination.totalRecords} records
      </div>

      {/* Audit Logs Table */}
      <div className="audit-trail-table-container">
        <table className="audit-trail-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Component</th>
              <th>Action</th>
              <th>User</th>
              <th>IP Address</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map(log => (
                <tr key={log.id} className={!log.success ? 'audit-trail-error-row' : ''}>
                  <td className="audit-trail-timestamp">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="audit-trail-component">{log.component}</td>
                  <td>
                    <span className={`audit-trail-action ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="audit-trail-user">{log.user_email}</td>
                  <td className="audit-trail-ip">{log.ip_address}</td>
                  <td>
                    <span className={`audit-trail-status ${log.success ? 'audit-trail-success' : 'audit-trail-failure'}`}>
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="audit-trail-details">{log.details}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                  No audit logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="audit-trail-pagination">
          <button
            className="audit-trail-page-btn"
            disabled={pagination.page === 1}
            onClick={() => handleFilterChange('page', pagination.page - 1)}
          >
            Previous
          </button>
          
          <span className="audit-trail-page-info">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          
          <button
            className="audit-trail-page-btn"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => handleFilterChange('page', pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;