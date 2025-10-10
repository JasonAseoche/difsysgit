import React, { useState, useEffect } from 'react';
import '../../components/AdminLayout/ManageFingerprint.css';

const ManageFingerprint = () => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Filter states
  const [sortOrder, setSortOrder] = useState('latest'); // 'latest' or 'oldest'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'registered', 'unregistered'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [fingerprintId, setFingerprintId] = useState('');
  const [waitingForFingerprint, setWaitingForFingerprint] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');

  const API_URL = 'http://localhost/difsysapi/fingerprint_management.php';
  const [currentApiUrl, setCurrentApiUrl] = useState(API_URL);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, accounts, sortOrder, statusFilter]);

  const applyFilters = () => {
    let filtered = [...accounts];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(account => 
        account.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'registered') {
        filtered = filtered.filter(account => account.fingerprint_status === 'Registered');
      } else if (statusFilter === 'unregistered') {
        filtered = filtered.filter(account => account.fingerprint_status !== 'Registered');
      }
    }

    // Apply sort order
    filtered.sort((a, b) => {
      const aValue = a.id || 0;
      const bValue = b.id || 0;
      
      if (sortOrder === 'latest') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });

    setFilteredAccounts(filtered);
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${currentApiUrl}/fingerprint_management.php?action=fetch_accounts`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.data);
        setError('');
      } else {
        throw new Error(data.error || 'Failed to fetch accounts');
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts. Please check your AWS server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = (account) => {
    setSelectedAccount(account);
    setShowModal(true);
    setFingerprintId('');
    setWaitingForFingerprint(false);
    setRegistrationStatus('');
    setModalLoading(false);
    setFailureMessage('');
  };

  const handleUnregister = async (account) => {
    if (window.confirm(`Are you sure you want to unregister fingerprint for ${account.firstName} ${account.lastName}?`)) {
      try {
        const response = await fetch(`${currentApiUrl}/fingerprint_management.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'unregister_fingerprint',
            user_id: account.id
          })
        });

        const data = await response.json();

        if (data.success) {
          showMessage('Fingerprint unregistered successfully!', 'success');
          fetchAccounts();
        } else {
          throw new Error(data.error || 'Failed to unregister fingerprint');
        }
      } catch (err) {
        console.error('Error unregistering fingerprint:', err);
        showMessage('Failed to unregister fingerprint. Please try again.', 'error');
      }
    }
  };

  const startFingerprintRegistration = async () => {
    if (!fingerprintId.trim()) {
      showMessage('Please enter a Fingerprint ID', 'error');
      return;
    }

    setModalLoading(true);
    setWaitingForFingerprint(true);
    setRegistrationStatus('waiting');
    setFailureMessage('');

    try {
      const response = await fetch(`${currentApiUrl}/fingerprint_management.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start_registration',
          user_id: selectedAccount.id,
          fingerprint_id: fingerprintId.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        pollForFingerprintData();
      } else {
        throw new Error(data.error || 'Failed to start registration');
      }
    } catch (err) {
      console.error('Error starting registration:', err);
      setRegistrationStatus('error');
      setWaitingForFingerprint(false);
      setModalLoading(false);
      showMessage('Failed to start registration. Please try again.', 'error');
    }
  };

  const pollForFingerprintData = async () => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        
        const response = await fetch(`${currentApiUrl}/fingerprint_management.php?action=check_registration&user_id=${selectedAccount.id}&fingerprint_id=${fingerprintId.trim()}`);
        const data = await response.json();

        if (data.success && data.status === 'completed') {
          setRegistrationStatus('success');
          setWaitingForFingerprint(false);
          setModalLoading(false);
          
          setTimeout(() => {
            setShowModal(false);
            showMessage('Fingerprint registered successfully!', 'success');
            fetchAccounts();
          }, 2000);
          
        } else if (data.success && data.status === 'failed') {
          setRegistrationStatus('failed');
          setWaitingForFingerprint(false);
          setModalLoading(false);
          setFailureMessage(data.message || 'Wrong fingerprint was scanned. Please try again.');
          
        } else if (data.success && data.status === 'waiting') {
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000);
          } else {
            setRegistrationStatus('timeout');
            setWaitingForFingerprint(false);
            setModalLoading(false);
          }
        } else if (data.success && data.status === 'expired') {
          setRegistrationStatus('expired');
          setWaitingForFingerprint(false);
          setModalLoading(false);
        } else {
          setRegistrationStatus('error');
          setWaitingForFingerprint(false);
          setModalLoading(false);
        }
      } catch (err) {
        console.error('Error polling for fingerprint data:', err);
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setRegistrationStatus('error');
          setWaitingForFingerprint(false);
          setModalLoading(false);
        }
      }
    };

    poll();
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAccount(null);
    setFingerprintId('');
    setWaitingForFingerprint(false);
    setRegistrationStatus('');
    setModalLoading(false);
    setFailureMessage('');
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'sort') {
      setSortOrder(value);
    } else if (filterType === 'status') {
      setStatusFilter(value);
    }
    setShowFilterDropdown(false);
  };

  const getFilterDisplayText = () => {
    const sortText = sortOrder === 'latest' ? 'Latest' : 'Oldest';
    const statusText = statusFilter === 'all' ? 'All Status' : 
                      statusFilter === 'registered' ? 'Registered' : 'Unregistered';
    return `${sortText} • ${statusText}`;
  };

  if (loading) {
    return (
      <div className="fingerprint-manage-container">
        <div className="fingerprint-content-wrapper">
          <div className="fingerprint-loading-container">
            <div className="fingerprint-loading-spinner"></div>
            <p className="fingerprint-loading-text">Loading accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fingerprint-manage-container">
      <div className="fingerprint-content-wrapper">
        {/* Header */}
        <div className="fingerprint-header-card">
          <div className="fingerprint-header-content">
            <h1 className="fingerprint-page-title">Manage Fingerprints</h1>
            <div className="fingerprint-header-actions">
              <div className="fingerprint-search-container">
                <svg className="fingerprint-search-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  className="fingerprint-search-input"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="fingerprint-search-clear"
                    onClick={clearSearch}
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Mobile Filter - Duplicate for mobile header */}
              <div className="fingerprint-mobile-filter-container">
                <button
                  className="fingerprint-filter-button"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                  </svg>
                  <span className="fingerprint-filter-text">{getFilterDisplayText()}</span>
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                    className={`fingerprint-filter-chevron ${showFilterDropdown ? 'fingerprint-filter-chevron-open' : ''}`}
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {showFilterDropdown && (
                  <div className="fingerprint-filter-dropdown">
                    <div className="fingerprint-filter-section">
                      <h4 className="fingerprint-filter-section-title">Sort</h4>
                      <button
                        className={`fingerprint-filter-option ${sortOrder === 'latest' ? 'fingerprint-filter-option-active' : ''}`}
                        onClick={() => handleFilterChange('sort', 'latest')}
                      >
                        Latest
                      </button>
                      <button
                        className={`fingerprint-filter-option ${sortOrder === 'oldest' ? 'fingerprint-filter-option-active' : ''}`}
                        onClick={() => handleFilterChange('sort', 'oldest')}
                      >
                        Oldest
                      </button>
                    </div>
                    
                    <div className="fingerprint-filter-section">
                      <h4 className="fingerprint-filter-section-title">Status</h4>
                      <button
                        className={`fingerprint-filter-option ${statusFilter === 'all' ? 'fingerprint-filter-option-active' : ''}`}
                        onClick={() => handleFilterChange('status', 'all')}
                      >
                        All Status
                      </button>
                      <button
                        className={`fingerprint-filter-option ${statusFilter === 'registered' ? 'fingerprint-filter-option-active' : ''}`}
                        onClick={() => handleFilterChange('status', 'registered')}
                      >
                        Registered
                      </button>
                      <button
                        className={`fingerprint-filter-option ${statusFilter === 'unregistered' ? 'fingerprint-filter-option-active' : ''}`}
                        onClick={() => handleFilterChange('status', 'unregistered')}
                      >
                        Unregistered
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`fingerprint-message fingerprint-message-${messageType}`}>
            <svg className="fingerprint-message-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {messageType === 'success' ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              )}
            </svg>
            {message}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="fingerprint-table-container">
            <div className="fingerprint-error-container">
              <svg className="fingerprint-error-icon" width="48" height="48" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="fingerprint-error-text">{error}</p>
              <button className="fingerprint-retry-button" onClick={fetchAccounts}>
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {!error && (
          <div className="fingerprint-table-container">
            {filteredAccounts.length === 0 ? (
              <div className="fingerprint-empty-container">
                <p className="fingerprint-empty-text">No accounts found.</p>
              </div>
            ) : (
              <div className="fingerprint-table-scroll">
                <table className="fingerprint-accounts-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Fingerprint ID</th>
                      <th>Fingerprint Status</th>
                      <th className="fingerprint-actions-header">
                        <div className="fingerprint-filter-header">
                          Actions
                          <div className="fingerprint-filter-container">
                            <button
                              className="fingerprint-filter-button"
                              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            >
                              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                              </svg>
                              <span className="fingerprint-filter-text">{getFilterDisplayText()}</span>
                              <svg 
                                width="12" 
                                height="12" 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                                className={`fingerprint-filter-chevron ${showFilterDropdown ? 'fingerprint-filter-chevron-open' : ''}`}
                              >
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                            
                            {showFilterDropdown && (
                              <div className="fingerprint-filter-dropdown">
                                <div className="fingerprint-filter-section">
                                  <h4 className="fingerprint-filter-section-title">Sort</h4>
                                  <button
                                    className={`fingerprint-filter-option ${sortOrder === 'latest' ? 'fingerprint-filter-option-active' : ''}`}
                                    onClick={() => handleFilterChange('sort', 'latest')}
                                  >
                                    Latest
                                  </button>
                                  <button
                                    className={`fingerprint-filter-option ${sortOrder === 'oldest' ? 'fingerprint-filter-option-active' : ''}`}
                                    onClick={() => handleFilterChange('sort', 'oldest')}
                                  >
                                    Oldest
                                  </button>
                                </div>
                                
                                <div className="fingerprint-filter-section">
                                  <h4 className="fingerprint-filter-section-title">Status</h4>
                                  <button
                                    className={`fingerprint-filter-option ${statusFilter === 'all' ? 'fingerprint-filter-option-active' : ''}`}
                                    onClick={() => handleFilterChange('status', 'all')}
                                  >
                                    All Status
                                  </button>
                                  <button
                                    className={`fingerprint-filter-option ${statusFilter === 'registered' ? 'fingerprint-filter-option-active' : ''}`}
                                    onClick={() => handleFilterChange('status', 'registered')}
                                  >
                                    Registered
                                  </button>
                                  <button
                                    className={`fingerprint-filter-option ${statusFilter === 'unregistered' ? 'fingerprint-filter-option-active' : ''}`}
                                    onClick={() => handleFilterChange('status', 'unregistered')}
                                  >
                                    Unregistered
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((account) => (
                      <tr key={account.id}>
                        <td data-label="Name">
                          <span className="fingerprint-account-name">
                            {account.firstName} {account.lastName}
                          </span>
                        </td>
                        <td data-label="Email">
                          <span className="fingerprint-account-email">{account.email}</span>
                        </td>
                        <td data-label="Fingerprint ID">
                          <span className="fingerprint-uid">
                            {account.fingerprint_uid || '-'}
                          </span>
                        </td>
                        <td data-label="Fingerprint Status">
                          <span className={`fingerprint-status-badge ${account.fingerprint_status === 'Registered' ? 'fingerprint-status-registered' : 'fingerprint-status-not-registered'}`}>
                            {account.fingerprint_status}
                          </span>
                        </td>
                        <td data-label="Actions" className="fingerprint-actions-cell">
                          <div className="fingerprint-actions-buttons">
                            {account.fingerprint_status === 'Registered' ? (
                              <button
                                className="fingerprint-action-button fingerprint-unregister-button"
                                onClick={() => handleUnregister(account)}
                              >
                                <svg className="fingerprint-button-icon-small" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Unregister
                              </button>
                            ) : (
                              <button
                                className="fingerprint-action-button fingerprint-register-button"
                                onClick={() => handleRegister(account)}
                              >
                                <svg className="fingerprint-button-icon-small" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                Register
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Registration Modal */}
        {showModal && (
          <div className="fingerprint-modal-overlay">
            <div className="fingerprint-modal-content">
              <div className="fingerprint-modal-body">
                <div className="fingerprint-modal-header">
                  <h3 className="fingerprint-modal-title">Register Fingerprint</h3>
                  <button className="fingerprint-modal-close" onClick={closeModal}>
                    <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="fingerprint-modal-user-info">
                  <p><strong>Employee:</strong> {selectedAccount?.firstName} {selectedAccount?.lastName}</p>
                  <p><strong>Email:</strong> {selectedAccount?.email}</p>
                </div>

                {registrationStatus === '' && (
                  <div className="fingerprint-registration-form">
                    <div className="fingerprint-form-group">
                      <label className="fingerprint-form-label">Fingerprint ID</label>
                      <input
                        type="text"
                        className="fingerprint-form-input"
                        placeholder="Please put the Fingerprint ID from device"
                        value={fingerprintId}
                        onChange={(e) => setFingerprintId(e.target.value)}
                        disabled={modalLoading}
                      />
                    </div>
                    <div className="fingerprint-modal-actions">
                      <button
                        className="fingerprint-button fingerprint-button-secondary"
                        onClick={closeModal}
                        disabled={modalLoading}
                      >
                        Cancel
                      </button>
                      <button
                        className="fingerprint-button fingerprint-button-primary"
                        onClick={startFingerprintRegistration}
                        disabled={modalLoading || !fingerprintId.trim()}
                      >
                        {modalLoading ? 'Starting...' : 'Start Registration'}
                      </button>
                    </div>
                  </div>
                )}

                {registrationStatus === 'waiting' && (
                  <div className="fingerprint-waiting-state">
                    <div className="fingerprint-waiting-animation">
                      <div className="fingerprint-pulse-ring"></div>
                      <svg className="fingerprint-fingerprint-icon" width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.69-2.5 1.68-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94s2.08-.87 2.08-1.94c0-3.77-3.25-6.83-7.25-6.83-2.84 0-5.44 1.58-6.61 4.03-.39.81-.59 1.76-.59 2.8 0 .78.07 2.01.67 3.61.1.26-.03.55-.29.64-.26.1-.55-.04-.64-.29-.49-1.31-.73-2.61-.73-3.96 0-1.2.23-2.29.68-3.24 1.33-2.79 4.28-4.6 7.51-4.6 4.55 0 8.25 3.51 8.25 7.83 0 1.62-1.38 2.94-3.08 2.94s-3.08-1.32-3.08-2.94c0-1.07-.93-1.94-2.08-1.94s-2.08.87-2.08 1.94c0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z"/>
                      </svg>
                    </div>
                    <h4>Waiting for Fingerprint</h4>
                    <p>Please place your finger on the device scanner...</p>
                    <div className="fingerprint-waiting-info">
                      <p><strong>Fingerprint ID:</strong> {fingerprintId}</p>
                      <p><strong>Employee:</strong> {selectedAccount?.firstName} {selectedAccount?.lastName}</p>
                    </div>
                    <button className="fingerprint-button fingerprint-button-secondary" onClick={closeModal}>
                      Cancel
                    </button>
                  </div>
                )}

                {registrationStatus === 'success' && (
                  <div className="fingerprint-success-state">
                    <div className="fingerprint-success-animation">
                      <svg className="fingerprint-check-icon" width="64" height="64" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4>Successfully Registered!</h4>
                    <p>Fingerprint has been registered successfully for {selectedAccount?.firstName} {selectedAccount?.lastName}</p>
                  </div>
                )}

                {registrationStatus === 'failed' && (
                  <div className="fingerprint-error-state">
                    <div className="fingerprint-error-animation">
                      <svg className="fingerprint-error-icon" width="64" height="64" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4>Registration Failed</h4>
                    <p>{failureMessage || 'Wrong fingerprint was scanned. Please try again with the correct finger.'}</p>
                    <div className="fingerprint-modal-actions">
                      <button className="fingerprint-button fingerprint-button-secondary" onClick={closeModal}>
                        Close
                      </button>
                      <button 
                        className="fingerprint-button fingerprint-button-primary" 
                        onClick={() => {
                          setRegistrationStatus('');
                          setWaitingForFingerprint(false);
                          setModalLoading(false);
                          setFailureMessage('');
                        }}
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}

                {(registrationStatus === 'error' || registrationStatus === 'timeout' || registrationStatus === 'expired') && (
                  <div className="fingerprint-error-state">
                    <div className="fingerprint-error-animation">
                      <svg className="fingerprint-error-icon" width="64" height="64" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h4>
                      {registrationStatus === 'timeout' ? 'Registration Timeout' : 
                       registrationStatus === 'expired' ? 'Registration Expired' : 'Registration Failed'}
                    </h4>
                    <p>
                      {registrationStatus === 'timeout' 
                        ? 'No fingerprint data received within the time limit. Please try again.'
                        : registrationStatus === 'expired'
                        ? 'The registration session has expired. Please start a new registration.'
                        : 'Failed to register fingerprint. Please try again.'
                      }
                    </p>
                    <div className="fingerprint-modal-actions">
                      <button className="fingerprint-button fingerprint-button-secondary" onClick={closeModal}>
                        Close
                      </button>
                      <button 
                        className="fingerprint-button fingerprint-button-primary" 
                        onClick={() => {
                          setRegistrationStatus('');
                          setWaitingForFingerprint(false);
                          setModalLoading(false);
                          setFailureMessage('');
                        }}
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageFingerprint;