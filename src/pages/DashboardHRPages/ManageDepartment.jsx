import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../components/HRLayout/ManageDepartment.css';

const API_BASE_URL = 'http://localhost/difsysapi/manage_department.php';

const ManageDepartment = () => {
  const [currentView, setCurrentView] = useState('list'); // 'list', 'view', 'add'
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [supervisorSearchTerm, setSupervisorSearchTerm] = useState('');
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [showEditSupervisorModal, setShowEditSupervisorModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Data states
  const [departments, setDepartments] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [departmentEmployees, setDepartmentEmployees] = useState([]);

  const [showPositionModal, setShowPositionModal] = useState(false);
  const [showEditPositionModal, setShowEditPositionModal] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [editSelectedPositions, setEditSelectedPositions] = useState([]);
  const [otherPosition, setOtherPosition] = useState('');
  const [editOtherPosition, setEditOtherPosition] = useState('');

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    supervisor_id: '',
    supervisor_name: '',
    positions: [],
    employee_ids: []
  });

  const [editedDepartment, setEditedDepartment] = useState({
    id: '',
    name: '',
    supervisor_id: '',
    supervisor_name: '',
    positions: []
  });

  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const positionOptions = [
  'Senior Accoutant',
  'Accounting Assistant', 
  'Welder',
  'Helper',
  'HR Specialist',
  'Electrician',
  'Sales Representative',
  'Purchasing Staff',
  'Technical Sales Engineer',
  'Driver',
];

  // API Functions
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}?action=departments&search=${searchTerm}`);
      if (response.data.success) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      alert('Error fetching departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisors = async (search = '') => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=supervisors&search=${search}`);
      if (response.data.success) {
        setSupervisors(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  const fetchAvailableEmployees = async (search = '') => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=available_employees&search=${search}`);
      if (response.data.success) {
        setAvailableEmployees(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching available employees:', error);
    }
  };

  const fetchDepartmentDetails = async (id) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}?action=department_details&id=${id}`);
      if (response.data.success) {
        const dept = response.data.data;
        setSelectedDepartment(dept);
        setDepartmentEmployees(dept.employees || []);
        setEditedDepartment({
          id: dept.id,
          name: dept.name,
          supervisor_id: dept.supervisor_id,
          supervisor_name: dept.supervisor_name,
          positions: dept.positions ? dept.positions.split(',') : []
        });
      }
    } catch (error) {
      console.error('Error fetching department details:', error);
      alert('Error fetching department details');
    } finally {
      setLoading(false);
    }
  };

  const createDepartment = async () => {
    if (!newDepartment.name || newDepartment.positions.length === 0) {
      alert('Please fill in department name and select at least one position');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}?action=create_department`, newDepartment);
      if (response.data.success) {
        alert('Department created successfully');
        setCurrentView('list');
        fetchDepartments();
        setNewDepartment({
          name: '',
          supervisor_id: '',
          supervisor_name: '',
          positions: [],
          employee_ids: []
        });
      }
    } catch (error) {
      console.error('Error creating department:', error);
      alert(error.response?.data?.error || 'Error creating department');
    } finally {
      setLoading(false);
    }
  };

  const updateDepartment = async () => {
    try {
      setLoading(true);
      const response = await axios.put(`${API_BASE_URL}?action=update_department`, editedDepartment);
      if (response.data.success) {
        alert('Department updated successfully');
        setIsEditing(false);
        fetchDepartmentDetails(editedDepartment.id);
        fetchDepartments();
      }
    } catch (error) {
      console.error('Error updating department:', error);
      alert(error.response?.data?.error || 'Error updating department');
    } finally {
      setLoading(false);
    }
  };

  const deleteDepartment = async (id) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      setLoading(true);
      const response = await axios.delete(`${API_BASE_URL}?action=delete_department&id=${id}`);
      if (response.data.success) {
        alert('Department deleted successfully');
        setCurrentView('list');
        fetchDepartments();
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Error deleting department');
    } finally {
      setLoading(false);
    }
  };

  const assignEmployeesToDepartment = async (employeeIds) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}?action=assign_employees`, {
        department_id: selectedDepartment.id,
        employee_ids: employeeIds
      });
      if (response.data.success) {
        alert('Employees assigned successfully');
        fetchDepartmentDetails(selectedDepartment.id);
        fetchAvailableEmployees();
        setShowEmployeeModal(false);
      }
    } catch (error) {
      console.error('Error assigning employees:', error);
      alert('Error assigning employees');
    } finally {
      setLoading(false);
    }
  };

  const removeEmployeesFromDepartment = async () => {
    if (selectedEmployees.length === 0) {
      alert('Please select employees to remove');
      return;
    }

    if (!confirm('Are you sure you want to remove selected employees from this department?')) return;

    try {
      setLoading(true);
      const response = await axios.delete(`${API_BASE_URL}?action=remove_employees`, {
        data: { employee_ids: selectedEmployees }
      });
      if (response.data.success) {
        alert('Employees removed successfully');
        fetchDepartmentDetails(selectedDepartment.id);
        fetchAvailableEmployees();
        setSelectedEmployees([]);
      }
    } catch (error) {
      console.error('Error removing employees:', error);
      alert('Error removing employees');
    } finally {
      setLoading(false);
    }
  };

  // Event Handlers
  useEffect(() => {
    fetchDepartments();
    fetchSupervisors();
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [searchTerm]);

  const filteredSupervisors = supervisors.filter(supervisor =>
    supervisor.name.toLowerCase().includes(supervisorSearchTerm.toLowerCase()) ||
    supervisor.position.toLowerCase().includes(supervisorSearchTerm.toLowerCase())
  );

  const filteredAvailableEmployees = availableEmployees.filter(emp =>
    emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(employeeSearchTerm.toLowerCase())
  );

  const handleViewDepartment = (department) => {
    fetchDepartmentDetails(department.id);
    setCurrentView('view');
    setIsEditing(false);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedDepartment(null);
    setIsEditing(false);
    setShowSupervisorModal(false);
    setShowEditSupervisorModal(false);
    setSelectedEmployees([]);
  };

  const handleAddDepartment = () => {
    setCurrentView('add');
    setNewDepartment({
      name: '',
      supervisor_id: '',
      supervisor_name: '',
      positions: [],
      employee_ids: []
    });
    setShowSupervisorModal(false);
    fetchAvailableEmployees();
  };

  const handleEditToggle = () => {
  if (isEditing) {
    // Cancel editing
    setEditedDepartment({
      id: selectedDepartment.id,
      name: selectedDepartment.name,
      supervisor_id: selectedDepartment.supervisor_id,
      supervisor_name: selectedDepartment.supervisor_name,
      positions: selectedDepartment.positions ? selectedDepartment.positions.split(',') : []
    });
  }
  setIsEditing(!isEditing);
  setShowEditSupervisorModal(false);
};

  const handleSelectAll = () => {
    if (selectedEmployees.length === departmentEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(departmentEmployees.map(emp => emp.emp_id));
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSupervisorSelect = (supervisor) => {
    setNewDepartment({
      ...newDepartment,
      supervisor_id: supervisor.id,
      supervisor_name: supervisor.name
    });
    setShowSupervisorModal(false);
  };

  const handleEditSupervisorSelect = (supervisor) => {
    setEditedDepartment({
      ...editedDepartment,
      supervisor_id: supervisor.id,
      supervisor_name: supervisor.name
    });
    setShowEditSupervisorModal(false);
  };

  const handlePositionSave = (positions) => {
  setNewDepartment({ ...newDepartment, positions });
};

const handleEditPositionSave = (positions) => {
  setEditedDepartment({ ...editedDepartment, positions });
};

const PositionModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  title = "Select Positions",
  initialPositions = [],
  positionOptions
}) => {
  const [selectedPositions, setSelectedPositions] = useState(initialPositions);
  const [otherPosition, setOtherPosition] = useState('');

  if (!isOpen) return null;

  const handlePositionToggle = (position) => {
    setSelectedPositions(prev => 
      prev.includes(position) 
        ? prev.filter(p => p !== position)
        : [...prev, position]
    );
  };

  const handleOtherAdd = () => {
    if (otherPosition.trim() && !selectedPositions.includes(otherPosition.trim())) {
      setSelectedPositions(prev => [...prev, otherPosition.trim()]);
      setOtherPosition('');
    }
  };

  const handleSave = () => {
    onSave(selectedPositions);
    onClose();
  };

  return (
    <div className="manage-dept-modal-overlay">
      <div className="manage-dept-modal">
        <div className="manage-dept-modal-header">
          <h3>{title}</h3>
          <button className="manage-dept-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="manage-dept-modal-content">
          <div className="manage-dept-position-list">
            {positionOptions.map((position) => (
              <div key={position} className="manage-dept-position-item">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedPositions.includes(position)}
                    onChange={() => handlePositionToggle(position)}
                  />
                  <span>{position}</span>
                </label>
              </div>
            ))}
          </div>
          
          <div className="manage-dept-other-position">
            <h4>Other Position</h4>
            <div className="manage-dept-other-input">
              <input
                type="text"
                value={otherPosition}
                onChange={(e) => setOtherPosition(e.target.value)}
                placeholder="Enter custom position"
              />
              <button onClick={handleOtherAdd} disabled={!otherPosition.trim()}>
                Add
              </button>
            </div>
          </div>

          {selectedPositions.length > 0 && (
            <div className="manage-dept-selected-positions">
              <h4>Selected Positions:</h4>
              <div className="manage-dept-position-tags">
                {selectedPositions.map((position, index) => (
                  <span key={index} className="manage-dept-position-tag">
                    {position}
                    <button onClick={() => setSelectedPositions(prev => prev.filter(p => p !== position))}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="manage-dept-modal-actions">
            <button onClick={onClose}>Cancel</button>
            <button onClick={handleSave}>Save Positions</button>
          </div>
        </div>
      </div>
    </div>
  );
};

  // Move this OUTSIDE and BEFORE the ManageDepartment component
const SupervisorModal = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  selectedValue, 
  title = "Select Supervisor",
  supervisors,
  supervisorSearchTerm,
  setSupervisorSearchTerm 
}) => {
  if (!isOpen) return null;

  // Use client-side filtering instead of server calls
  const filteredSupervisors = supervisors.filter(supervisor =>
    supervisor.name.toLowerCase().includes(supervisorSearchTerm.toLowerCase()) ||
    supervisor.position.toLowerCase().includes(supervisorSearchTerm.toLowerCase())
  );

  return (
    <div className="manage-dept-modal-overlay">
      <div className="manage-dept-modal">
        <div className="manage-dept-modal-header">
          <h3>{title}</h3>
          <button
            className="manage-dept-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="manage-dept-modal-content">
          <div className="manage-dept-search-container">
            <input
              type="text"
              placeholder="Search supervisors..."
              className="manage-dept-search-input"
              value={supervisorSearchTerm}
              onChange={(e) => setSupervisorSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="manage-dept-employee-list">
            {filteredSupervisors.map((supervisor) => (
              <div key={supervisor.id} className="manage-dept-employee-item">
                <div className="manage-dept-employee-info">
                  <span className="manage-dept-employee-name">{supervisor.name}</span>
                  <span className="manage-dept-employee-position">{supervisor.position}</span>
                  <span className="manage-dept-employee-email">{supervisor.email}</span>
                </div>
                <button 
                  className="manage-dept-btn manage-dept-btn-sm manage-dept-btn-primary"
                  onClick={() => onSelect(supervisor)}
                >
                  Select
                </button>
              </div>
            ))}
            {filteredSupervisors.length === 0 && (
              <div className="manage-dept-empty-state">
                No supervisors found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderListView = () => (
    <div className="manage-dept-container">
      <div className="manage-dept-header-card">
        <div className="manage-dept-header-left">
          <h1 className="manage-dept-title">MANAGE DEPARTMENT</h1>
        </div>
        <div className="manage-dept-header-right">
          <div className="manage-dept-search-container">
            <input
              type="text"
              placeholder="Search departments..."
              className="manage-dept-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="manage-dept-btn-primary" onClick={handleAddDepartment}>
            Add Department
          </button>
        </div>
      </div>

      {loading ? (
        <div className="manage-dept-loading">Loading departments...</div>
      ) : (
        <div className="manage-dept-departments-grid">
          {departments.map((department) => (
            <div key={department.id} className="manage-dept-department-card">
              <div className="manage-dept-card-header">
                <h3 className="manage-dept-department-name">{department.name}</h3>
                <button
                  className="manage-dept-btn manage-dept-btn-view"
                  onClick={() => handleViewDepartment(department)}
                >
                  View
                </button>
              </div>
              <div className="manage-dept-card-content">
                <div className="manage-dept-info-item">
                  <span className="manage-dept-info-label">Assigned Supervisor:</span>
                  <span className="manage-dept-info-value">{department.supervisor_name || 'Not assigned'}</span>
                </div>
                <div className="manage-dept-info-item">
                  <span className="manage-dept-info-label">Department Positions:</span>
                  <span className="manage-dept-info-value">
                    {department.positions ? department.positions.split(',').join(', ') : 'No positions assigned'}
                  </span>
                </div>
                <div className="manage-dept-info-item">
                  <span className="manage-dept-info-label">No. of Employees:</span>
                  <span className="manage-dept-info-value">{department.employee_count}</span>
                </div>
              </div>
            </div>
          ))}
          {departments.length === 0 && (
            <div className="manage-dept-empty-state">
              No departments found
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderViewDepartment = () => (
    <div className="manage-dept-container">
      <div className="manage-dept-header-card">
        <div className="manage-dept-header-left">
          <h1 className="manage-dept-title">{selectedDepartment?.name}</h1>
        </div>
        <div className="manage-dept-header-right">
          <button className="manage-dept-btn manage-dept-btn-secondary" onClick={handleBackToList}>
            Back
          </button>
        </div>
      </div>

      <div className="manage-dept-section-card">
        <div className="manage-dept-section-header">
          <h2 className="manage-dept-section-title">Department Info</h2>
          <div className="manage-dept-section-actions">
            {isEditing ? (
              <>
                <button className="manage-dept-btn manage-dept-btn-primary" onClick={updateDepartment}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button className="manage-dept-btn manage-dept-btn-secondary" onClick={handleEditToggle}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button className="manage-dept-btn manage-dept-btn-secondary" onClick={handleEditToggle}>
                  Edit
                </button>
                <button 
                  className="manage-dept-btn manage-dept-btn-danger" 
                  onClick={() => deleteDepartment(selectedDepartment.id)}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="manage-dept-info-card">
          <div className="manage-dept-info-grid">
            <div className="manage-dept-info-item">
              <span className="manage-dept-info-label">Name of Department:</span>
              {isEditing ? (
                <input
                  type="text"
                  className="manage-dept-edit-input"
                  value={editedDepartment.name}
                  onChange={(e) => setEditedDepartment({ ...editedDepartment, name: e.target.value })}
                />
              ) : (
                <span className="manage-dept-info-value">{selectedDepartment?.name}</span>
              )}
            </div>
            <div className="manage-dept-info-item">
                <span className="manage-dept-info-label">Department Positions:</span>
                {isEditing ? (
                  <div className="manage-dept-positions-input-container">
                    <input
                      type="text"
                      className="manage-dept-edit-input"
                      value={editedDepartment.positions.length > 0 ? editedDepartment.positions.join(', ') : 'Click to select positions...'}
                      readOnly
                      onClick={() => {
                        setEditSelectedPositions(editedDepartment.positions);
                        setShowEditPositionModal(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                ) : (
                  <span className="manage-dept-info-value">
                    {selectedDepartment?.positions ? selectedDepartment.positions.split(',').join(', ') : 'No positions assigned'}
                  </span>
                )}
              </div>
            <div className="manage-dept-info-item">
              <span className="manage-dept-info-label">Assigned Supervisor:</span>
              {isEditing ? (
                <div className="manage-dept-supervisor-input-container">
                  <input
                    type="text"
                    className="manage-dept-edit-input"
                    value={editedDepartment.supervisor_name || 'Click to select supervisor...'}
                    readOnly
                    onClick={() => {
                      fetchSupervisors();
                      setSupervisorSearchTerm('');
                      setShowEditSupervisorModal(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              ) : (
                <span className="manage-dept-info-value">{selectedDepartment?.supervisor_name || 'Not assigned'}</span>
              )}
            </div>
            <div className="manage-dept-info-item">
              <span className="manage-dept-info-label">No. of Employees:</span>
              <span className="manage-dept-info-value">{departmentEmployees.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="manage-dept-section-card">
        <div className="manage-dept-section-header">
          <h2 className="manage-dept-section-title">Employee List</h2>
          {isEditing && (
            <div className="manage-dept-table-actions">
              <button className="manage-dept-btn manage-dept-btn-sm" onClick={handleSelectAll}>
                {selectedEmployees.length === departmentEmployees.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                className="manage-dept-btn manage-dept-btn-sm manage-dept-btn-primary"
                onClick={() => {
                  fetchAvailableEmployees();
                  setEmployeeSearchTerm('');
                  setShowEmployeeModal(true);
                }}
              >
                Add
              </button>
              <button 
                className="manage-dept-btn manage-dept-btn-sm manage-dept-btn-danger"
                onClick={removeEmployeesFromDepartment}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="manage-dept-table-container">
          <table className="manage-dept-table">
            <thead>
              <tr>
                {isEditing && <th className="manage-dept-checkbox-col">
                  <input 
                    type="checkbox" 
                    checked={selectedEmployees.length === departmentEmployees.length && departmentEmployees.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>}
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Position</th>
                <th>Work Days</th>
                <th>Rest Day</th>
              </tr>
            </thead>
            <tbody>
              {departmentEmployees.map((employee) => (
                <tr key={employee.emp_id}>
                  {isEditing && (
                    <td className="manage-dept-checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.emp_id)}
                        onChange={() => handleEmployeeSelect(employee.emp_id)}
                      />
                    </td>
                  )}
                  <td>{employee.emp_id}</td>
                  <td>{employee.name}</td>
                  <td>{employee.position}</td>
                  <td>{employee.work_days}</td>
                  <td>{employee.rest_day}</td>
                </tr>
              ))}
              {departmentEmployees.length === 0 && (
                <tr>
                  <td colSpan={isEditing ? "6" : "5"} className="manage-dept-empty-state">
                    No employees assigned yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEmployeeModal && (
        <div className="manage-dept-modal-overlay">
          <div className="manage-dept-modal">
            <div className="manage-dept-modal-header">
              <h3>Add Employees</h3>
              <button
                className="manage-dept-modal-close"
                onClick={() => setShowEmployeeModal(false)}
              >
                ×
              </button>
            </div>
            <div className="manage-dept-modal-content">
              <div className="manage-dept-search-container">
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="manage-dept-search-input"
                  value={employeeSearchTerm}
                  onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                />
              </div>
              <div className="manage-dept-employee-list">
                {filteredAvailableEmployees.map((employee) => (
                  <div key={employee.emp_id} className="manage-dept-employee-item">
                    <div className="manage-dept-employee-info">
                      <span className="manage-dept-employee-name">{employee.name}</span>
                      <span className="manage-dept-employee-position">{employee.position}</span>
                      <span className="manage-dept-employee-email">{employee.email}</span>
                    </div>
                    <button 
                      className="manage-dept-btn manage-dept-btn-sm manage-dept-btn-primary"
                      onClick={() => assignEmployeesToDepartment([employee.emp_id])}
                    >
                      Add
                    </button>
                  </div>
                ))}
                {filteredAvailableEmployees.length === 0 && (
                  <div className="manage-dept-empty-state">
                    No available employees found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAddDepartment = () => (
    <div className="manage-dept-container">
      <div className="manage-dept-header-card">
        <div className="manage-dept-header-left">
          <h1 className="manage-dept-title">Add Department</h1>
        </div>
        <div className="manage-dept-header-right">
          <button className="manage-dept-btn manage-dept-btn-secondary" onClick={handleBackToList}>
            Back
          </button>
        </div>
      </div>

      <div className="manage-dept-section-card">
        <div className="manage-dept-form-grid">
          <div className="manage-dept-form-group">
            <label className="manage-dept-form-label">Name of Department *</label>
            <input
              type="text"
              className="manage-dept-form-input"
              value={newDepartment.name}
              onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
              placeholder="Enter department name"
            />
          </div>
          <div className="manage-dept-form-group">
            <label className="manage-dept-form-label">Department Positions *</label>
            <input
              type="text"
              className="manage-dept-form-input"
              value={newDepartment.positions.length > 0 ? newDepartment.positions.join(', ') : 'Click to select positions...'}
              readOnly
              onClick={() => {
                setSelectedPositions(newDepartment.positions);
                setShowPositionModal(true);
              }}
              style={{ cursor: 'pointer' }}
              placeholder="Click to select positions"
            />
          </div>
          <div className="manage-dept-form-group">
            <label className="manage-dept-form-label">Assign Supervisor</label>
            <input
              type="text"
              className="manage-dept-form-input"
              value={newDepartment.supervisor_name || 'Click to select supervisor...'}
              readOnly
              onClick={() => {
                fetchSupervisors();
                setSupervisorSearchTerm('');
                setShowSupervisorModal(true);
              }}
              style={{ cursor: 'pointer' }}
              placeholder="Optional - Click to select"
            />
          </div>
        </div>
      </div>

      <div className="manage-dept-section-card">
        <div className="manage-dept-section-header">
          <h2 className="manage-dept-section-title">Employee Assignment</h2>
          <div className="manage-dept-table-actions">
            <button 
              className="manage-dept-btn manage-dept-btn-sm"
              onClick={() => {
                if (newDepartment.employee_ids.length === availableEmployees.length) {
                  setNewDepartment({ ...newDepartment, employee_ids: [] });
                } else {
                  setNewDepartment({ ...newDepartment, employee_ids: availableEmployees.map(emp => emp.emp_id) });
                }
              }}
            >
              {newDepartment.employee_ids.length === availableEmployees.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              className="manage-dept-btn manage-dept-btn-sm manage-dept-btn-primary"
              onClick={() => {
                fetchAvailableEmployees();
                setEmployeeSearchTerm('');
                setShowEmployeeModal(true);
              }}
            >
              Add Employees
            </button>
            <button 
              className="manage-dept-btn manage-dept-btn-sm manage-dept-btn-danger"
              onClick={() => {
                const remainingEmployees = newDepartment.employee_ids.filter(id => 
                  !selectedEmployees.includes(id)
                );
                setNewDepartment({ ...newDepartment, employee_ids: remainingEmployees });
                setSelectedEmployees([]);
              }}
            >
              Remove Selected
            </button>
          </div>
        </div>

        <div className="manage-dept-table-container">
          <table className="manage-dept-table">
            <thead>
              <tr>
                <th className="manage-dept-checkbox-col">
                  <input 
                    type="checkbox"
                    checked={selectedEmployees.length === newDepartment.employee_ids.length && newDepartment.employee_ids.length > 0}
                    onChange={() => {
                      if (selectedEmployees.length === newDepartment.employee_ids.length) {
                        setSelectedEmployees([]);
                      } else {
                        setSelectedEmployees(newDepartment.employee_ids);
                      }
                    }}
                  />
                </th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Position</th>
                <th>Work Days</th>
                <th>Rest Day</th>
              </tr>
            </thead>
            <tbody>
              {availableEmployees
                .filter(emp => newDepartment.employee_ids.includes(emp.emp_id))
                .map((employee) => (
                <tr key={employee.emp_id}>
                  <td className="manage-dept-checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(employee.emp_id)}
                      onChange={() => {
                        if (selectedEmployees.includes(employee.emp_id)) {
                          setSelectedEmployees(prev => prev.filter(id => id !== employee.emp_id));
                        } else {
                          setSelectedEmployees(prev => [...prev, employee.emp_id]);
                        }
                      }}
                    />
                  </td>
                  <td>{employee.emp_id}</td>
                  <td>{employee.name}</td>
                  <td>{employee.position}</td>
                  <td>{employee.work_days}</td>
                  <td>{employee.rest_day}</td>
                </tr>
              ))}
              {newDepartment.employee_ids.length === 0 && (
                <tr>
                  <td colSpan="6" className="manage-dept-empty-state">
                    No employees assigned yet. Click "Add Employees" to assign employees to this department.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="manage-dept-form-actions">
          <button 
            className="manage-dept-btn manage-dept-btn-primary"
            onClick={createDepartment}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Save Department'}
          </button>
        </div>
      </div>

      {showEmployeeModal && (
        <div className="manage-dept-modal-overlay">
          <div className="manage-dept-modal">
            <div className="manage-dept-modal-header">
              <h3>Add Employees to Department</h3>
              <button
                className="manage-dept-modal-close"
                onClick={() => setShowEmployeeModal(false)}
              >
                ×
              </button>
            </div>
            <div className="manage-dept-modal-content">
              <div className="manage-dept-search-container">
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="manage-dept-search-input"
                  value={employeeSearchTerm}
                  onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                />
              </div>
              <div className="manage-dept-employee-list">
                {filteredAvailableEmployees
                  .filter(emp => !newDepartment.employee_ids.includes(emp.emp_id))
                  .map((employee) => (
                  <div key={employee.emp_id} className="manage-dept-employee-item">
                    <div className="manage-dept-employee-info">
                      <span className="manage-dept-employee-name">{employee.name}</span>
                      <span className="manage-dept-employee-position">{employee.position}</span>
                      <span className="manage-dept-employee-email">{employee.email}</span>
                    </div>
                    <button 
                      className="manage-dept-btn manage-dept-btn-sm manage-dept-btn-primary"
                      onClick={() => {
                        setNewDepartment(prev => ({
                          ...prev,
                          employee_ids: [...prev.employee_ids, employee.emp_id]
                        }));
                      }}
                    >
                      Add
                    </button>
                  </div>
                ))}
                {filteredAvailableEmployees.filter(emp => !newDepartment.employee_ids.includes(emp.emp_id)).length === 0 && (
                  <div className="manage-dept-empty-state">
                    {newDepartment.employee_ids.length === availableEmployees.length 
                      ? 'All available employees have been added to this department'
                      : 'No available employees found'
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <SupervisorModal
        isOpen={showSupervisorModal}
        onClose={() => setShowSupervisorModal(false)}
        onSelect={handleSupervisorSelect}
        selectedValue={newDepartment.supervisor_name}
        supervisors={supervisors}
        supervisorSearchTerm={supervisorSearchTerm}
        setSupervisorSearchTerm={setSupervisorSearchTerm}
      />
    </div>
  );

  return (
    <div className="manage-dept-wrapper">
      {currentView === 'list' && renderListView()}
      {currentView === 'view' && renderViewDepartment()}
      {currentView === 'add' && renderAddDepartment()}

      <PositionModal
        isOpen={showPositionModal}
        onClose={() => setShowPositionModal(false)}
        onSave={handlePositionSave}
        title="Select Department Positions"
        initialPositions={selectedPositions}
        positionOptions={positionOptions}
      />

      <PositionModal
        isOpen={showEditPositionModal}
        onClose={() => setShowEditPositionModal(false)}
        onSave={handleEditPositionSave}
        title="Edit Department Positions"
        initialPositions={editSelectedPositions}
        positionOptions={positionOptions}
      />
      
      <SupervisorModal
        isOpen={showEditSupervisorModal}
        onClose={() => setShowEditSupervisorModal(false)}
        onSelect={handleEditSupervisorSelect}
        selectedValue={editedDepartment.supervisor_name}
        title="Change Supervisor"
        supervisors={supervisors}
        supervisorSearchTerm={supervisorSearchTerm}
        setSupervisorSearchTerm={setSupervisorSearchTerm}
      />
    </div>
    
  );
};

export default ManageDepartment;