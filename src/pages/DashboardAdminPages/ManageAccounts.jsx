import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, Edit2, Trash2, Search, X, Save, AlertCircle } from 'lucide-react';
import '../../components/AdminLayout/ManageAccount.css';

const ManageAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentAccount, setCurrentAccount] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // API base URL
  const API_URL = 'http://localhost/difsysapi/';

  // Fetch all accounts
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}fetch_account.php`);
      setAccounts(response.data);
      setIsError(false);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setCurrentAccount({
      ...currentAccount,
      [e.target.name]: e.target.value
    });
  };

  const openAddModal = () => {
    setCurrentAccount({
      id: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'user'
    });
    setModalMode('add');
    setShowModal(true);
  };

  const openEditModal = (account) => {
    setCurrentAccount({
      ...account,
      password: '', // Don't populate password for security
    });
    setModalMode('edit');
    setShowModal(true);
  };
  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!currentAccount.firstName || !currentAccount.lastName || !currentAccount.email) {
      setMessage({ text: 'Please fill all required fields', type: 'error' });
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentAccount.email)) {
      setMessage({ text: 'Please enter a valid email address', type: 'error' });
      return;
    }
    
    // Password validation for new accounts
    if (modalMode === 'add' && (!currentAccount.password || currentAccount.password.length < 6)) {
      setMessage({ text: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    
    try {
      // Create form data
      const formData = new FormData();
      Object.keys(currentAccount).forEach(key => {
        formData.append(key, currentAccount[key]);
      });
      
      // Set Axios config
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      
      // Determine which endpoint to use
      const url = modalMode === 'add' ? 'add_account.php' : 'update_account.php';
      
      // Make the request
      const response = await axios.post(`${API_URL}${url}`, formData, config);
      
      if (response.data.success) {
        setMessage({ text: response.data.message, type: 'success' });
        setShowModal(false);
        fetchAccounts();
      } else {
        setMessage({ text: response.data.message || `Failed to ${modalMode} account`, type: 'error' });
      }
    } catch (error) {
      console.error(`Error ${modalMode}ing account:`, error);
      // Handle specific error messages from the server if available
      if (error.response && error.response.data && error.response.data.message) {
        setMessage({ text: error.response.data.message, type: 'error' });
      } else {
        setMessage({ text: `An error occurred while ${modalMode}ing the account`, type: 'error' });
      }
    }
  };

  const handleDelete = async () => {
    try {
      const formData = new FormData();
      formData.append('id', deleteId);
      
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      
      const response = await axios.post(`${API_URL}delete_account.php`, formData, config);
      
      if (response.data.success) {
        setMessage({ text: response.data.message, type: 'success' });
        fetchAccounts();
      } else {
        setMessage({ text: response.data.message || 'Failed to delete account', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      // Handle specific error messages from the server if available
      if (error.response && error.response.data && error.response.data.message) {
        setMessage({ text: error.response.data.message, type: 'error' });
      } else {
        setMessage({ text: 'An error occurred while deleting the account', type: 'error' });
      }
    } finally {
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const searchLower = searchTerm.toLowerCase();
    return (
      account.firstName.toLowerCase().includes(searchLower) ||
      account.lastName.toLowerCase().includes(searchLower) ||
      account.email.toLowerCase().includes(searchLower) ||
      account.role.toLowerCase().includes(searchLower)
    );
  });

  // Get role badge class based on role
  const getRoleBadgeClass = (role) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'manage-account-role-admin';
      case 'hr':
        return 'manage-account-role-hr';
      case 'accountant':
        return 'manage-account-role-accountant';
      case 'employee':
        return 'manage-account-role-employee';
      case 'applicant':
        return 'manage-account-role-applicant';
      case 'supervisor':  // Add this line
        return 'manage-account-role-supervisor';  // Add this line
      default:
        return 'manage-account-role-user';
    }
  };

  
  // Clear message after 5 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="manage-account-container">
      {/* Header */}
      <div className="manage-account-content-wrapper">
        <div className="manage-account-header-card">
          <div className="manage-account-header-content">
            <h1 className="manage-account-page-title">Manage User Accounts</h1>
            <div className="manage-account-header-actions">
              <div className="manage-account-search-container">
                <input
                  type="text"
                  placeholder="Search accounts..."
                  className="manage-account-search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="manage-account-search-icon" size={18} />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="manage-account-search-clear"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <button
                onClick={openAddModal}
                className="manage-account-add-button"
              >
                <PlusCircle size={18} className="manage-account-button-icon" />
                Add New Account
              </button>
            </div>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`manage-account-message ${message.type === 'success' ? 'manage-account-message-success' : 'manage-account-message-error'}`}>
            <AlertCircle size={20} className="manage-account-message-icon" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Table */}
        <div className="manage-account-table-container">
          {isLoading ? (
            <div className="manage-account-loading-container">
              <div className="manage-account-loading-spinner"></div>
              <p className="manage-account-loading-text">Loading accounts...</p>
            </div>
          ) : isError ? (
            <div className="manage-account-error-container">
              <AlertCircle size={40} className="manage-account-error-icon" />
              <p className="manage-account-error-text">Failed to load accounts</p>
              <button 
                onClick={fetchAccounts}
                className="manage-account-retry-button"
              >
                Try Again
              </button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="manage-account-empty-container">
              {searchTerm ? (
                <>
                  <p className="manage-account-empty-text">No accounts found matching "{searchTerm}"</p>
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="manage-account-empty-action"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <p className="manage-account-empty-text">No accounts available</p>
                  <button 
                    onClick={openAddModal}
                    className="manage-account-empty-action"
                  >
                    <PlusCircle size={16} className="manage-account-button-icon-small" />
                    Add your first account
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="manage-account-table-scroll">
                <table className="manage-account-accounts-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th className="manage-account-actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((account) => (
                      <tr key={account.id}>
                        <td data-label="Name: ">
                          <div className="manage-account-account-name">{account.firstName} {account.lastName}</div>
                        </td>
                        <td data-label="Email: " className="manage-account-account-email">{account.email}</td>
                        <td data-label="Role: ">
                          <span className={`manage-account-role-badge ${getRoleBadgeClass(account.role)}`}>
                            {account.role.charAt(0).toUpperCase() + account.role.slice(1)}
                          </span>
                        </td>
                        <td data-label="Actions: " className="manage-account-actions-cell">
                          <div className="manage-account-actions-buttons">
                            <button
                              onClick={() => openEditModal(account)}
                              className="manage-account-action-button manage-account-edit-button"
                              title="Edit account"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => confirmDelete(account.id)}
                              className="manage-account-action-button manage-account-delete-button"
                              title="Delete account"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="manage-account-modal-overlay">
          <div className="manage-account-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="manage-account-modal-body">
              <h2 className="manage-account-modal-title">
                {modalMode === 'add' ? 'Add New Account' : 'Edit Account'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="manage-account-form-row">
                  <div className="manage-account-form-group">
                    <label htmlFor="firstName" className="manage-account-form-label">
                      First Name*
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={currentAccount.firstName}
                      onChange={handleInputChange}
                      className="manage-account-form-input"
                      required
                    />
                  </div>
                  <div className="manage-account-form-group">
                    <label htmlFor="lastName" className="manage-account-form-label">
                      Last Name*
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={currentAccount.lastName}
                      onChange={handleInputChange}
                      className="manage-account-form-input"
                      required
                    />
                  </div>
                </div>
                <div className="manage-account-form-group">
                  <label htmlFor="email" className="manage-account-form-label">
                    Email Address*
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={currentAccount.email}
                    onChange={handleInputChange}
                    className="manage-account-form-input"
                    required
                  />
                </div>
                <div className="manage-account-form-group">
                  <label htmlFor="password" className="manage-account-form-label">
                    {modalMode === 'add' ? 'Password*' : 'Password (leave empty to keep current)'}
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={currentAccount.password}
                    onChange={handleInputChange}
                    className="manage-account-form-input"
                    required={modalMode === 'add'}
                  />
                  {modalMode === 'add' && (
                    <p className="manage-account-form-hint">Password must be at least 6 characters</p>
                  )}
                </div>
                <div className="manage-account-form-group">
                  <label htmlFor="role" className="manage-account-form-label">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={currentAccount.role}
                    onChange={handleInputChange}
                    className="manage-account-form-select"
                  >
                    <option value="admin">Admin</option>
                    <option value="supervisor">Supervisor</option>  {/* Add this line */}
                    <option value="hr">HR</option>
                    <option value="accountant">Accountant</option>
                    <option value="employee">Employee</option>
                    <option value="applicant">Applicant</option>
                  </select>
                </div>
                    
                <div className="manage-account-modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="manage-account-button manage-account-button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="manage-account-button manage-account-button-primary"
                  >
                    <Save size={18} className="manage-account-button-icon" />
                    {modalMode === 'add' ? 'Create Account' : 'Update Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="manage-account-modal-overlay">
          <div className="manage-account-confirm-modal">
            <h3 className="manage-account-confirm-title">Confirm Delete</h3>
            <p className="manage-account-confirm-text">Are you sure you want to delete this account? This action cannot be undone.</p>
            <div className="manage-account-confirm-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="manage-account-button manage-account-button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="manage-account-button manage-account-button-danger"
              >
                <Trash2 size={18} className="manage-account-button-icon" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAccounts;