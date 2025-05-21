import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../components/HRLayout/ManageEmployee.css';

const ManageEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingVisible, setIsAddingVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loadedCards, setLoadedCards] = useState(0);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  // Add state for tracking which dropdown is open
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  // Create a ref to track dropdown containers
  const dropdownRefs = useRef({});

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://sql100.infinityfree.com/difsysapi/fetch_employee.php');
        
        if (response.data.success) {
          setEmployees(response.data.employees);
          // Start the card loading animation sequence
          setLoadedCards(0);
        } else {
          setError('Failed to fetch employees: ' + response.data.message);
        }
      } catch (err) {
        setError('Error connecting to the server: ' + err.message);
        console.error('Error fetching employees:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Add effect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only process if a dropdown is open
      if (openDropdownId !== null) {
        // Check if the click was outside the current open dropdown
        const currentDropdownRef = dropdownRefs.current[openDropdownId];
        if (currentDropdownRef && !currentDropdownRef.contains(event.target)) {
          setOpenDropdownId(null);
        }
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  // Animate cards appearing one by one
  useEffect(() => {
    if (!loading && employees.length > 0 && loadedCards < employees.length) {
      const timer = setTimeout(() => {
        setLoadedCards(prev => Math.min(prev + 1, employees.length));
      }, 100); // Stagger the appearance of each card
      
      return () => clearTimeout(timer);
    }
  }, [loading, loadedCards, employees.length]);

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee => {
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    const email = employee.email.toLowerCase();
    const query = searchTerm.toLowerCase();
    
    return fullName.includes(query) || email.includes(query);
  });

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // Reset loaded cards counter to re-trigger animation for filtered results
    setLoadedCards(0);
  };

  const handleViewDetails = (employeeId) => {
    console.log(`View details for employee ID: ${employeeId}`);
    // Animation for view details - find the employee and set as viewing
    const employeeToView = employees.find(emp => emp.id === employeeId);
    setViewingEmployee(employeeToView || null);
    
    // Reset after animation completes
    setTimeout(() => {
      setViewingEmployee(null);
    }, 3000);
  };

  const handleChangeShift = (employeeId) => {
    console.log(`Change shift for employee ID: ${employeeId}`);
    // Implementation for changing employee shift
  };

  // Function to toggle dropdown menu visibility
  const toggleDropdown = (employeeId, event) => {
    // Prevent event bubbling
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    console.log(`Toggling dropdown for employee ID: ${employeeId}`);
    
    // Close any other open dropdowns first
    if (openDropdownId !== null && openDropdownId !== employeeId) {
      setOpenDropdownId(null);
      // Small delay to avoid UI flashing
      setTimeout(() => {
        setOpenDropdownId(employeeId);
      }, 10);
    } else {
      // Toggle the dropdown state
      setOpenDropdownId(current => current === employeeId ? null : employeeId);
    }
  };

  // Handle Edit option in dropdown
  const handleEdit = (employeeId, event) => {
    if (event) {
      event.stopPropagation();
    }
    console.log(`Edit employee ID: ${employeeId}`);
    setOpenDropdownId(null); // Close dropdown after action
    // Implementation for editing employee
  };

  // Handle Archive option in dropdown
  const handleArchive = (employeeId, event) => {
    if (event) {
      event.stopPropagation();
    }
    console.log(`Archive employee ID: ${employeeId}`);
    setOpenDropdownId(null); // Close dropdown after action
    // Implementation for archiving employee
  };

  const handleAddButtonClick = () => {
    setIsAddingVisible(true);
    // Reset after animation completes
    setTimeout(() => {
      setIsAddingVisible(false);
    }, 2000);
  };

  // Get initials for avatar
  const getInitials = (firstName, lastName) => {
    return (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');
  };

  // Function to generate a random color based on name (but consistent for same name)
  const getAvatarColor = (firstName, lastName) => {
    const colors = [
      '#0D6275', '#1D4ED8', '#7E22CE', '#BE185D', '#0F766E', 
      '#047857', '#B45309', '#B91C1C', '#4F46E5', '#065F46'
    ];
    
    const fullName = `${firstName}${lastName}`;
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Create or update the ref for a dropdown
  const setDropdownRef = (id, element) => {
    dropdownRefs.current[id] = element;
  };

  return (
    <div className="me-page">
      {/* Fixed Header */}
      <div className={`me-header-container ${isAddingVisible ? 'me-header-highlight' : ''}`}>
        <div className="me-header-content">
          <h1 className="me-title">MANAGE EMPLOYEE</h1>
          <div className="me-actions">
            <div className={`me-search-box ${isSearchFocused ? 'me-search-focused' : ''}`}>
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              <button className="me-search-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            <button 
              className={`me-add-button ${isAddingVisible ? 'me-button-active' : ''}`} 
              onClick={handleAddButtonClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Account
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="me-content">
        {loading ? (
          <div className="me-loading">
            <div className="me-loading-spinner"></div>
            <p>Loading employees...</p>
          </div>
        ) : error ? (
          <div className="me-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="me-error-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="me-no-results">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="me-no-results-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p>No employees found</p>
          </div>
        ) : (
          <div className="me-employee-grid">
            {filteredEmployees.slice(0, loadedCards).map((employee, index) => {
              const avatarColor = getAvatarColor(employee.firstName, employee.lastName);
              const isViewing = viewingEmployee && viewingEmployee.id === employee.id;
              const isDropdownOpen = openDropdownId === employee.id;
              
              return (
                <div 
                  key={employee.id || index} 
                  className={`me-employee-card me-card-appear ${isViewing ? 'me-card-viewing' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="me-card-header">
                    <div className="me-avatar" style={{ backgroundColor: avatarColor }}>
                      {getInitials(employee.firstName, employee.lastName)}
                    </div>
                    <div className="me-employee-info">
                      <h3 className="me-employee-name">{employee.firstName} {employee.lastName}</h3>
                      <p className="me-employee-role">Employee</p>
                      <p className="me-employee-email">{employee.email}</p>
                      <div className="me-schedule">
                        <p className="me-time">8:00am to 5:00pm</p>
                        <div className="me-schedule-pills">
                          <span className="me-day-pill">Monday</span>
                          <span className="me-status-pill">Working today</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="me-card-actions">
                    <button 
                      className="me-action-button me-view-button"
                      onClick={() => handleViewDetails(employee.id)}
                    >
                      <span className="me-button-text">View Details</span>
                      <span className="me-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </span>
                    </button>
                    <button 
                      className="me-action-button me-shift-button"
                      onClick={() => handleChangeShift(employee.id)}
                    >
                      <span className="me-button-text">Change Shift</span>
                      <span className="me-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </button>
            

                    <div 
                        className={`me-dropdown-container ${isDropdownOpen ? 'me-dropdown-active' : ''}`}
                        ref={(el) => setDropdownRef(employee.id, el)}
                      >
                        <button 
                          className="me-action-button me-manage-button"
                          onClick={(e) => toggleDropdown(employee.id, e)}
                        >
                          <span className="me-button-text">Manage</span>
                          <span className="me-button-icon">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="16" 
                              height="16" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor" 
                              className={isDropdownOpen ? 'me-icon-rotated' : ''}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                          <div className="me-dropdown-menu">
                            <button 
                              className="me-dropdown-item me-edit-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(employee.id, e);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button 
                              className="me-dropdown-item me-archive-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(employee.id, e);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                              Archive
                            </button>
                          </div>
                        )}
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageEmployee;