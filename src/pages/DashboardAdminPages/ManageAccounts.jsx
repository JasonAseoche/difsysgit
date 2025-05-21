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
  const API_URL = 'http://http://sql100.infinityfree.com/difsysapi/';

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
      password: '' // Don't populate password for security
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
        return 'role-admin';
      case 'hr':
        return 'role-hr';
      case 'accountant':
        return 'role-accountant';
      case 'employee':
        return 'role-employee';
      case 'applicant':
        return 'role-applicant';
      default:
        return 'role-user';
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
    <div className="manage-accounts-container">
      {/* Header */}
      <div className="content-wrapper">
        <div className="header-card">
          <div className="header-content">
            <h1 className="page-title">Manage User Accounts</h1>
            <div className="header-actions">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search accounts..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="search-icon" size={18} />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="search-clear"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <button
                onClick={openAddModal}
                className="add-button"
              >
                <PlusCircle size={18} className="button-icon" />
                Add New Account
              </button>
            </div>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`message ${message.type === 'success' ? 'message-success' : 'message-error'}`}>
            <AlertCircle size={20} className="message-icon" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Table */}
        <div className="table-container">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Loading accounts...</p>
            </div>
          ) : isError ? (
            <div className="error-container">
              <AlertCircle size={40} className="error-icon" />
              <p className="error-text">Failed to load accounts</p>
              <button 
                onClick={fetchAccounts}
                className="retry-button"
              >
                Try Again
              </button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="empty-container">
              {searchTerm ? (
                <>
                  <p className="empty-text">No accounts found matching "{searchTerm}"</p>
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="empty-action"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <p className="empty-text">No accounts available</p>
                  <button 
                    onClick={openAddModal}
                    className="empty-action"
                  >
                    <PlusCircle size={16} className="button-icon-small" />
                    Add your first account
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="table-scroll">
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th className="actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.map((account) => (
                      <tr key={account.id}>
                        <td data-label="Name: ">
                          <div className="account-name">{account.firstName} {account.lastName}</div>
                        </td>
                        <td data-label="Email: " className="account-email">{account.email}</td>
                        <td data-label="Role: ">
                          <span className={`role-badge ${getRoleBadgeClass(account.role)}`}>
                            {account.role.charAt(0).toUpperCase() + account.role.slice(1)}
                          </span>
                        </td>
                        <td data-label="Actions: " className="actions-cell">
                          <div className="actions-buttons">
                            <button
                              onClick={() => openEditModal(account)}
                              className="action-button edit-button"
                              title="Edit account"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => confirmDelete(account.id)}
                              className="action-button delete-button"
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
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <h2 className="modal-title">
                {modalMode === 'add' ? 'Add New Account' : 'Edit Account'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName" className="form-label">
                      First Name*
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={currentAccount.firstName}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName" className="form-label">
                      Last Name*
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={currentAccount.lastName}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email Address*
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={currentAccount.email}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    {modalMode === 'add' ? 'Password*' : 'Password (leave empty to keep current)'}
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={currentAccount.password}
                    onChange={handleInputChange}
                    className="form-input"
                    required={modalMode === 'add'}
                  />
                  {modalMode === 'add' && (
                    <p className="form-hint">Password must be at least 6 characters</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="role" className="form-label">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={currentAccount.role}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="accountant">Accountant</option>
                    <option value="employee">Employee</option>
                    <option value="applicant">Applicant</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="button button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button-primary"
                  >
                    <Save size={18} className="button-icon" />
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
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3 className="confirm-title">Confirm Delete</h3>
            <p className="confirm-text">Are you sure you want to delete this account? This action cannot be undone.</p>
            <div className="confirm-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="button button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="button button-danger"
              >
                <Trash2 size={18} className="button-icon" />
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