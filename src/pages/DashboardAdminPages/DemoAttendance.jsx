import React, { useState, useEffect } from 'react';
import '../../components/AdminLayout/DemoAttendance.css';

const API_BASE_URL = 'http://localhost/difsysapi';

const DemoAttendance = () => {
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    emp_id: '',
    firstName: '',
    lastName: '',
    date: '',
    time_in: '',
    time_out: '',
    status: 'present'
  });

  // Fetch attendance records
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/demo_attendance.php?action=fetch`);
      const data = await response.json();
      if (data.success) {
        setAttendanceList(data.data);
      } else {
        console.error('Error fetching data:', data.message);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission (Create/Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const action = editingId ? 'update' : 'create';
      
      const submitData = { ...formData };
      if (editingId) {
        submitData.id = editingId;
      }

      const response = await fetch(`${API_BASE_URL}/demo_attendance.php?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();
      
      if (result.success) {
        fetchAttendance();
        resetForm();
        setShowModal(false);
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while saving the record.');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/demo_attendance.php?action=delete&id=${id}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.success) {
          fetchAttendance();
        } else {
          alert('Error: ' + result.message);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while deleting the record.');
      }
    }
  };

  // Handle edit
  const handleEdit = (record) => {
    setFormData({
      emp_id: record.emp_id,
      firstName: record.firstName,
      lastName: record.lastName,
      date: record.date,
      time_in: record.time_in || '',
      time_out: record.time_out || '',
      status: record.status || 'present'
    });
    setEditingId(record.id);
    setShowModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      emp_id: '',
      firstName: '',
      lastName: '',
      date: '',
      time_in: '',
      time_out: '',
      status: 'present'
    });
    setEditingId(null);
  };

  // Handle add new
  const handleAddNew = () => {
    resetForm();
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="demo-attendance">
      <div className="header">
        <h2>Attendance Management</h2>
        <button className="btn btn-primary" onClick={handleAddNew}>
          Add New Record
        </button>
      </div>

      <div className="table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Employee ID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Date</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {attendanceList.length > 0 ? (
              attendanceList.map((record) => (
                <tr key={record.id}>
                  <td>{record.id}</td>
                  <td>{record.emp_id}</td>
                  <td>{record.firstName}</td>
                  <td>{record.lastName}</td>
                  <td>{record.date}</td>
                  <td>{record.time_in || '-'}</td>
                  <td>{record.time_out || '-'}</td>
                  <td>
                    <span className={`status ${record.status}`}>
                      {record.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-edit" 
                      onClick={() => handleEdit(record)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-delete" 
                      onClick={() => handleDelete(record.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="no-data">No attendance records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Attendance' : 'Add New Attendance'}</h3>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Employee ID:</label>
                <input
                  type="number"
                  name="emp_id"
                  value={formData.emp_id}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>First Name:</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name:</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Time In:</label>
                <input
                  type="time"
                  name="time_in"
                  value={formData.time_in}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Time Out:</label>
                <input
                  type="time"
                  name="time_out"
                  value={formData.time_out}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Status:</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoAttendance;