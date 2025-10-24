import React, { useState, useEffect } from 'react';
import '../../components/HRLayout/ArchieveEmp.css';
import { FaSearch, FaArchive, FaUndo, FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const ArchieveEmp = () => {
  const [archivedEmployees, setArchivedEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('latest');
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalAction, setModalAction] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Fetch archived employees on component mount
  useEffect(() => {
    fetchArchivedEmployees();
  }, [sortOrder]);

  // Filter employees based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmployees(archivedEmployees);
    } else {
      const filtered = archivedEmployees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toString().includes(searchTerm)
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, archivedEmployees]);

  // Fetch archived employees from backend
  const fetchArchivedEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost/difsysapi/archieve_employee.php?sort=${sortOrder}`);
      const result = await response.json();

      if (result.success) {
        setArchivedEmployees(result.data);
        setFilteredEmployees(result.data);
      } else {
        showToast('Failed to fetch archived employees', 'error');
      }
    } catch (error) {
      console.error('Error fetching archived employees:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle unarchive employee
  const handleUnarchiveClick = (employee) => {
    setSelectedEmployee(employee);
    setModalAction('unarchive');
    setShowModal(true);
  };

  // Confirm unarchive action
  const confirmUnarchive = async () => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch('http://localhost/difsysapi/archieve_employee.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unarchive',
          emp_id: selectedEmployee.id
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast('Employee unarchived successfully!', 'success');
        fetchArchivedEmployees(); // Refresh the list
      } else {
        showToast(result.message || 'Failed to unarchive employee', 'error');
      }
    } catch (error) {
      console.error('Error unarchiving employee:', error);
      showToast('Error unarchiving employee', 'error');
    } finally {
      setShowModal(false);
      setSelectedEmployee(null);
    }
  };

  // Show toast notification
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Handle sort change
  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="archive-emp-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`archive-toast ${toast.type === 'success' ? 'archive-toast-success' : 'archive-toast-error'}`}>
          <div className="archive-toast-icon">
            {toast.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
          </div>
          <div className="archive-toast-message">{toast.message}</div>
        </div>
      )}

      {/* Header */}
      <div className="archive-emp-header">
        <h1 className="archive-emp-title">
          <FaArchive style={{ marginRight: '10px' }} />
          Archived Employees
        </h1>
        <div className="archive-emp-controls">
          {/* Search Bar */}
          <div className="archive-search-container">
            <FaSearch className="archive-search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              className="archive-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Sort Filter */}
          <select
            className="archive-filter-dropdown"
            value={sortOrder}
            onChange={handleSortChange}
          >
            <option value="latest">Latest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Content Card */}
      <div className="archive-content-card">
        {loading ? (
          <div className="archive-loading">
            <div className="archive-loading-spinner"></div>
            <p>Loading archived employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="archive-empty-state">
            <div className="archive-empty-icon">
              <FaArchive />
            </div>
            <h3 className="archive-empty-title">No Archived Employees</h3>
            <p className="archive-empty-text">
              {searchTerm ? 'No employees match your search criteria.' : 'There are no archived employees at the moment.'}
            </p>
          </div>
        ) : (
          <div className="archive-table-container">
            <table className="archive-employee-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Date Archived</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="archive-emp-id">{employee.id}</td>
                    <td className="archive-emp-name">{employee.name}</td>
                    <td className="archive-emp-email">{employee.email}</td>
                    <td className="archive-emp-date">{formatDate(employee.date_archived)}</td>
                    <td>
                      <div className="archive-action-cell">
                        <button
                          className="archive-unarchive-btn"
                          onClick={() => handleUnarchiveClick(employee)}
                          title="Restore this employee"
                        >
                          <FaUndo />
                          Unarchive
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

      {/* Confirmation Modal */}
      {showModal && selectedEmployee && (
        <div className="archive-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="archive-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="archive-modal-header">
              <div className="archive-modal-icon">
                <FaExclamationTriangle />
              </div>
              <h2 className="archive-modal-title">Confirm Unarchive</h2>
            </div>
            <div className="archive-modal-body">
              <p className="archive-modal-text">
                Are you sure you want to unarchive this employee? They will be restored as an active employee.
              </p>
              <div className="archive-modal-employee-info">
                <p><strong>Name:</strong> {selectedEmployee.name}</p>
                <p><strong>Email:</strong> {selectedEmployee.email}</p>
                <p><strong>ID:</strong> {selectedEmployee.id}</p>
              </div>
            </div>
            <div className="archive-modal-footer">
              <button
                className="archive-modal-btn archive-modal-cancel-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="archive-modal-btn archive-modal-unarchive-btn"
                onClick={confirmUnarchive}
              >
                Confirm Unarchive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchieveEmp;