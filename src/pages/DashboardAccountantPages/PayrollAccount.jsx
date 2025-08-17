import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../components/AccountantLayout/PayrollAccount.css';

const PayrollAccount = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loadedCards, setLoadedCards] = useState(0);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [viewDetailsEmployee, setViewDetailsEmployee] = useState(null);

  
  // Manage page state
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'manage'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState(null);
  const [payrollData, setPayrollData] = useState(null);
  const [showEmployeeDetailsModal, setShowEmployeeDetailsModal] = useState(false);
  const [isEditingBenefits, setIsEditingBenefits] = useState(false);
  const [benefitsData, setBenefitsData] = useState({
    sss_account: '',
    phic_account: '',
    hdmf_account: '',
    tax_account: ''
  });
  const [payrollFormData, setPayrollFormData] = useState({
    basic_pay: {
      monthly: '0.00',
      semi_monthly: '0.00',
      grosspay: '0.00'  // Add this line
    },
    employee_rate: {
      rate_per_day: '0.00',
      rate_per_hour: '0.00',
      rate_per_minute: '0.00'
    },
    non_taxable_allowances: {
      enabled: false,
      site_allowance: '0.00',
      transportation_allowance: '0.00'
    },
    training_days: {
      number_of_training_days: '0'
    },
    regular_overtime: {
      regular_ot_rate: '0.00',
      regular_ot_nd: '0.00',
      rest_day_ot: '0.00',
      rest_day_ot_plus_ot: '0.00',
      rest_day_nd: '0.00'
    },
    holiday_rates: {
      regular_holiday: {
        rh_rate: '0.00',
        rh_ot_rate: '0.00',
        rh_nd_rate: '0.00',
        rh_rot_ot_rate: '0.00'
      },
      special_holiday: {
        sh_rate: '0.00',
        sh_ot_rate: '0.00',
        sh_nd_rate: '0.00',
        sh_rot_ot_rate: '0.00',
        sh_rot_ot_plus_ot_rate: '0.00',
        sh_rot_nd: '0.00'
      }
    },
    government_contributions: {
      sss: '0.00',
      phic: '0.00',
      hdmf: '0.00',
      tax: '0.00',
      sss_loan: '0.00',
      hdmf_loan: '0.00',
      teed: '0.00',
      staff_house: '0.00',
      cash_advance: '0.00'
    }
  });
  
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);
  const [payrollSaveStatus, setPayrollSaveStatus] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
            document.title = "DIFSYS | PAYROLL ACCOUNT";
          }, []);

  // Animate cards appearing one by one
  useEffect(() => {
    if (!loading && employees.length > 0 && loadedCards < employees.length) {
      const timer = setTimeout(() => {
        setLoadedCards(prev => Math.min(prev + 1, employees.length));
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading, loadedCards, employees.length]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost/difsysapi/payroll_account.php?action=fetch_employees');
      
      if (response.data.success) {
        setEmployees(response.data.employees);
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

  const fetchEmployeeDetails = async (empId) => {
    try {
      const response = await axios.get(`http://localhost/difsysapi/payroll_account.php?action=fetch_employee_details&emp_id=${empId}`);
      if (response.data && response.data.success) {
        setSelectedEmployeeDetails(response.data.employee);
        setBenefitsData(response.data.employee.benefits);
      } else {
        console.error('Error fetching employee details:', response.data?.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    }
  };

  const fetchPayrollData = async (empId) => {
    try {
      const response = await axios.get(`http://localhost/difsysapi/payroll_account.php?action=fetch_payroll_data&emp_id=${empId}`);
      if (response.data && response.data.success) {
        setPayrollData(response.data.payroll_data);
        setPayrollFormData(response.data.payroll_data);
      } else {
        console.error('Error fetching payroll data:', response.data?.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching payroll data:', error);
    }
  };

  const savePayrollData = async () => {
    if (!selectedEmployee) return;
    
    setIsSavingPayroll(true);
    setPayrollSaveStatus('');
    
    try {
      const dataToSave = {
        emp_id: selectedEmployee.id,
        ...payrollFormData
      };
      
      const response = await axios.post('http://localhost/difsysapi/payroll_account.php?action=save_payroll_data', dataToSave, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.success) {
        setPayrollSaveStatus('success');
        setTimeout(() => setPayrollSaveStatus(''), 3000);
      } else {
        setPayrollSaveStatus('error');
        console.error('Save error:', response.data?.message || 'Unknown error occurred');
      }
    } catch (error) {
      setPayrollSaveStatus('error');
      console.error('Error saving payroll data:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Request setup error:', error.message);
      }
    } finally {
      setIsSavingPayroll(false);
    }
  };

  const updateBenefits = async () => {
    if (!selectedEmployee) return;
    
    try {
      console.log('Updating benefits for employee:', selectedEmployee.id);
      console.log('Benefits data:', benefitsData);
      
      const response = await axios.put('http://localhost/difsysapi/payroll_account.php?action=update_employee_benefits_accounts', {
        emp_id: selectedEmployee.id,
        benefits: benefitsData
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response:', response.data);
      
      if (response.data && response.data.success) {
        setIsEditingBenefits(false);
        // Update the local state
        if (selectedEmployeeDetails) {
          setSelectedEmployeeDetails({
            ...selectedEmployeeDetails,
            benefits: benefitsData
          });
        }
        console.log('Benefits updated successfully');
      } else {
        console.error('Benefits update error:', response.data?.message || 'Unknown error occurred');
        alert('Error: ' + (response.data?.message || 'Unknown error occurred'));
      }
    } catch (error) {
      console.error('Error updating benefits:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
        alert('Server Error: ' + JSON.stringify(error.response.data));
      } else if (error.request) {
        console.error('No response received:', error.request);
        alert('No response from server');
      } else {
        console.error('Request setup error:', error.message);
        alert('Request error: ' + error.message);
      }
    }
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee => {
    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.toLowerCase();
    const email = (employee.email || '').toLowerCase();
    const position = (employee.position || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    
    return fullName.includes(query) || email.includes(query) || position.includes(query);
  });

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setLoadedCards(0);
  };

  const handleViewDetails = async (employeeId) => {
    console.log(`View payroll details for employee ID: ${employeeId}`);
    
    try {
      const response = await axios.get(`http://localhost/difsysapi/payroll_account.php?action=fetch_complete_employee_details&emp_id=${employeeId}`);
      if (response.data && response.data.success) {
        setViewDetailsEmployee(response.data.employee);
        setShowViewDetailsModal(true);
      } else {
        console.error('Error fetching employee details:', response.data?.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    }
  };

  const handleManage = async (employeeId) => {
    console.log(`Manage payroll for employee ID: ${employeeId}`);
    const employeeToManage = employees.find(emp => emp.id === employeeId);
    
    if (employeeToManage) {
      setSelectedEmployee(employeeToManage);
      
      try {
        const response = await axios.get(`http://localhost/difsysapi/payroll_account.php?action=fetch_employee_details&emp_id=${employeeId}`);
        if (response.data && response.data.success) {
          setSelectedEmployeeDetails(response.data.employee);
          // Set the benefits data for editing
          setBenefitsData({
            sss_account: response.data.employee.benefits?.sss_account || '',
            phic_account: response.data.employee.benefits?.phic_account || '',
            hdmf_account: response.data.employee.benefits?.hdmf_account || '',
            tax_account: response.data.employee.benefits?.tax_account || ''
          });
        }
      } catch (error) {
        console.error('Error fetching employee details:', error);
      }
      
      await fetchPayrollData(employeeId);
      setCurrentView('manage');
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedEmployee(null);
    setSelectedEmployeeDetails(null);
    setPayrollData(null);
    setShowEmployeeDetailsModal(false);
    setIsEditingBenefits(false);
  };

  const handleEmployeeCardClick = () => {
    setShowEmployeeDetailsModal(true);
  };

  const handleCloseEmployeeModal = () => {
    setShowEmployeeDetailsModal(false);
    setIsEditingBenefits(false);
  };

  const handlePayrollInputChange = (section, field, value) => {
    setPayrollFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedPayrollInputChange = (section, subsection, field, value) => {
    setPayrollFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  // Get initials for avatar
  const getInitials = (firstName, lastName) => {
    return (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');
  };

  // Function to generate a random color based on name
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

  // Function to render avatar
  const renderAvatar = (person) => {
    const initials = getInitials(person.firstName, person.lastName);
    const avatarColor = getAvatarColor(person.firstName, person.lastName);
    
    return (
      <div className="pa-avatar" style={{ backgroundColor: person.profileImage ? 'transparent' : avatarColor }}>
        {person.profileImage ? (
          <img 
            src={person.profileImage.startsWith('http') ? person.profileImage : `http://localhost/difsysapi/${person.profileImage}`} 
            alt={`${person.firstName} ${person.lastName}`}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
        ) : null}
        <span style={{ display: person.profileImage ? 'none' : 'block' }}>
          {initials}
        </span>
      </div>
    );
  };

  if (currentView === 'manage' && selectedEmployee) {
    return (
      <div className="pa-page">
        {/* Employee Details Modal */}
        {showEmployeeDetailsModal && selectedEmployeeDetails && (
          <div className="pa-employee-details-modal">
            <div className="pa-modal-backdrop" onClick={handleCloseEmployeeModal}></div>
            <div className="pa-modal-content">
              <div className="pa-modal-header">
                <h2>Employee Details</h2>
                <button className="pa-close-button" onClick={handleCloseEmployeeModal}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="pa-modal-body">
                <div className="pa-employee-full-details">
                  {renderAvatar(selectedEmployeeDetails)}
                  <div className="pa-details-info">
                    <h3>{selectedEmployeeDetails.firstName} {selectedEmployeeDetails.lastName}</h3>
                    <p className="pa-detail-position">{selectedEmployeeDetails.position}</p>
                    <div className="pa-detail-grid">
                      <div className="pa-detail-item">
                        <label>Email:</label>
                        <span>{selectedEmployeeDetails.email}</span>
                      </div>
                      <div className="pa-detail-item">
                        <label>Work Days:</label>
                        <span>{selectedEmployeeDetails.workDays}</span>
                      </div>
                      <div className="pa-detail-item">
                        <label>Work Arrangement:</label>
                        <span>{selectedEmployeeDetails.workarrangement}</span>
                      </div>
                      <div className="pa-detail-item">
                        <label>Address:</label>
                        <span>{selectedEmployeeDetails.address || 'N/A'}</span>
                      </div>
                      <div className="pa-detail-item">
                        <label>Contact Number:</label>
                        <span>{selectedEmployeeDetails.number || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="pa-benefits-section">
                      <div className="pa-benefits-header">
                        <h4>Benefits Account Numbers</h4>
                        <button 
                          className="pa-edit-benefits-btn"
                          onClick={() => setIsEditingBenefits(!isEditingBenefits)}
                        >
                          {isEditingBenefits ? 'Cancel' : 'Edit Benefits'}
                        </button>
                      </div>
                      
                      <div className="pa-benefits-grid">
                      <div className="pa-benefit-item">
                          <label>SSS Account:</label>
                          {isEditingBenefits ? (
                            <input
                              type="text"
                              value={benefitsData.sss_account || ''}
                              onChange={(e) => setBenefitsData({...benefitsData, sss_account: e.target.value})}
                              placeholder="SSS Account Number"
                            />
                          ) : (
                            <span>{selectedEmployeeDetails?.benefits?.sss_account || 'Not Set'}</span>
                          )}
                        </div>
                        <div className="pa-benefit-item">
                          <label>PHIC Account:</label>
                          {isEditingBenefits ? (
                            <input
                              type="text"
                              value={benefitsData.phic_account || ''}
                              onChange={(e) => setBenefitsData({...benefitsData, phic_account: e.target.value})}
                              placeholder="PHIC Account Number"
                            />
                          ) : (
                            <span>{selectedEmployeeDetails?.benefits?.phic_account || 'Not Set'}</span>
                          )}
                        </div>
                        <div className="pa-benefit-item">
                          <label>HDMF Account:</label>
                          {isEditingBenefits ? (
                            <input
                              type="text"
                              value={benefitsData.hdmf_account || ''}
                              onChange={(e) => setBenefitsData({...benefitsData, hdmf_account: e.target.value})}
                              placeholder="HDMF Account Number"
                            />
                          ) : (
                            <span>{selectedEmployeeDetails?.benefits?.hdmf_account || 'Not Set'}</span>
                          )}
                        </div>
                        <div className="pa-benefit-item">
                          <label>TIN:</label>
                          {isEditingBenefits ? (
                            <input
                              type="text"
                              value={benefitsData.tax_account || ''}
                              onChange={(e) => setBenefitsData({...benefitsData, tax_account: e.target.value})}
                              placeholder="Tax Identification Number"
                            />
                          ) : (
                            <span>{selectedEmployeeDetails?.benefits?.tax_account || 'Not Set'}</span>
                          )}
                        </div>
                      </div>
                      
                      {isEditingBenefits && (
                        <div className="pa-benefits-actions">
                          <button className="pa-save-benefits-btn" onClick={updateBenefits}>
                            Save Benefits
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manage Payroll Header */}
        <div className="pa-manage-header">
          <button className="pa-back-button" onClick={handleBackToList}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Payroll Accounts
          </button>
          
          <h1 className="pa-manage-title">Payroll Management</h1>
        </div>

        {/* Employee Header Card */}
        <div className="pa-manage-content">
          <div className="pa-employee-header-card" onClick={handleEmployeeCardClick}>
            {renderAvatar(selectedEmployee)}
            <div className="pa-employee-header-info">
              <h2>{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
              <p>{selectedEmployee.position}</p>
            </div>
            <div className="pa-click-hint">
              <span>Click to view details</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Payroll Form */}
          <div className="pa-payroll-form-card">
            <div className="pa-payroll-form-header">
              <h3>Payroll Information</h3>
              <div className="pa-save-section">
                {payrollSaveStatus === 'success' && (
                  <span className="pa-save-status success">✓ Saved successfully</span>
                )}
                {payrollSaveStatus === 'error' && (
                  <span className="pa-save-status error">✗ Save failed</span>
                )}
                <button 
                  className="pa-save-payroll-btn" 
                  onClick={savePayrollData}
                  disabled={isSavingPayroll}
                >
                  {isSavingPayroll ? 'Saving...' : 'Save Payroll Data'}
                </button>
              </div>
            </div>
            
            <div className="pa-payroll-form-content">
              {/* First Column */}
              <div className="pa-payroll-column">
                {/* Basic Pay */}
                <div className="pa-form-section">
                  <h4 className="pa-section-title">Basic Pay</h4>
                  <div className="pa-form-row">
                    <div className="pa-form-group">
                      <label>Monthly:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.basic_pay.monthly}
                        onChange={(e) => handlePayrollInputChange('basic_pay', 'monthly', e.target.value)}
                      />
                    </div>
                    <div className="pa-form-group">
                      <label>Semi-Monthly:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.basic_pay.semi_monthly}
                        onChange={(e) => handlePayrollInputChange('basic_pay', 'semi_monthly', e.target.value)}
                      />
                    </div>
                    <div className="pa-form-group">
                      <label>Gross Pay:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.basic_pay.grosspay}
                        onChange={(e) => handlePayrollInputChange('basic_pay', 'grosspay', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Employee Rate */}
                <div className="pa-form-section">
                  <h4 className="pa-section-title">Employee Rate</h4>
                  <div className="pa-form-group">
                    <label>Rate Per Day:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.employee_rate.rate_per_day}
                      onChange={(e) => handlePayrollInputChange('employee_rate', 'rate_per_day', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>Rate Per Hour:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.employee_rate.rate_per_hour}
                      onChange={(e) => handlePayrollInputChange('employee_rate', 'rate_per_hour', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>Rate Per Minute:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.employee_rate.rate_per_minute}
                      onChange={(e) => handlePayrollInputChange('employee_rate', 'rate_per_minute', e.target.value)}
                    />
                  </div>
                </div>

                {/* Non-taxable Allowances */}
                <div className="pa-form-section">
                  <h4 className="pa-section-title">
                    Non-taxable Allowances <span className="pa-section-subtitle">(If Applicable)</span>
                  </h4>
                  <div className="pa-radio-group">
                    <label>
                      <input
                        type="radio"
                        name="allowances"
                        checked={!payrollFormData.non_taxable_allowances.enabled}
                        onChange={() => handlePayrollInputChange('non_taxable_allowances', 'enabled', false)}
                      />
                      No
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="allowances"
                        checked={payrollFormData.non_taxable_allowances.enabled}
                        onChange={() => handlePayrollInputChange('non_taxable_allowances', 'enabled', true)}
                      />
                      Yes
                    </label>
                  </div>
                  {payrollFormData.non_taxable_allowances.enabled && (
                    <div className="pa-allowances-fields">
                      <div className="pa-form-group">
                        <label>Site Allowance:</label>
                        <input
                          type="number"
                          step="0.01"
                          value={payrollFormData.non_taxable_allowances.site_allowance}
                          onChange={(e) => handlePayrollInputChange('non_taxable_allowances', 'site_allowance', e.target.value)}
                        />
                      </div>
                      <div className="pa-form-group">
                        <label>Transportation Allowance:</label>
                        <input
                          type="number"
                          step="0.01"
                          value={payrollFormData.non_taxable_allowances.transportation_allowance}
                          onChange={(e) => handlePayrollInputChange('non_taxable_allowances', 'transportation_allowance', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Training Days */}
                <div className="pa-form-section">
                  <h4 className="pa-section-title">
                    Training Days <span className="pa-section-subtitle">(Put "N/A" if none)</span>
                  </h4>
                  <div className="pa-form-group">
                    <label>Number of Training Days:</label>
                    <input
                      type="number"
                      min="0"
                      value={payrollFormData.training_days.number_of_training_days}
                      onChange={(e) => handlePayrollInputChange('training_days', 'number_of_training_days', e.target.value)}
                    />
                  </div>
                </div>

                {/* Regular Overtime */}
                <div className="pa-form-section">
                  <h4 className="pa-section-title">Regular Overtime</h4>
                  <div className="pa-form-group">
                    <label>Regular OT Rate:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.regular_overtime.regular_ot_rate}
                      onChange={(e) => handlePayrollInputChange('regular_overtime', 'regular_ot_rate', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>Regular OT ND:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.regular_overtime.regular_ot_nd}
                      onChange={(e) => handlePayrollInputChange('regular_overtime', 'regular_ot_nd', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>Rest Day OT:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.regular_overtime.rest_day_ot}
                      onChange={(e) => handlePayrollInputChange('regular_overtime', 'rest_day_ot', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>Rest Day OT + OT:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.regular_overtime.rest_day_ot_plus_ot}
                      onChange={(e) => handlePayrollInputChange('regular_overtime', 'rest_day_ot_plus_ot', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>Rest Day ND:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.regular_overtime.rest_day_nd}
                      onChange={(e) => handlePayrollInputChange('regular_overtime', 'rest_day_nd', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Second Column */}
              <div className="pa-payroll-column">
                {/* Holiday Rates */}
                <div className="pa-form-section">
                  <h4 className="pa-section-title">Holiday Rates</h4>
                  
                  {/* Regular Holiday */}
                  <div className="pa-subsection">
                    <h5 className="pa-subsection-title">Regular Holiday</h5>
                    <div className="pa-form-group">
                      <label>RH RATE:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.holiday_rates.regular_holiday.rh_rate}
                        onChange={(e) => handleNestedPayrollInputChange('holiday_rates', 'regular_holiday', 'rh_rate', e.target.value)}
                      />
                    </div>
                    <div className="pa-form-group">
                      <label>RH OT RATE:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.holiday_rates.regular_holiday.rh_ot_rate}
                        onChange={(e) => handleNestedPayrollInputChange('holiday_rates', 'regular_holiday', 'rh_ot_rate', e.target.value)}
                      />
                    </div>
                    <div className="pa-form-group">
                      <label>RH ND RATE:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.holiday_rates.regular_holiday.rh_nd_rate}
                        onChange={(e) => handleNestedPayrollInputChange('holiday_rates', 'regular_holiday', 'rh_nd_rate', e.target.value)}
                      />
                    </div>
                    <div className="pa-form-group">
                      <label>RH ROT OT RATE:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.holiday_rates.regular_holiday.rh_rot_ot_rate}
                        onChange={(e) => handleNestedPayrollInputChange('holiday_rates', 'regular_holiday', 'rh_rot_ot_rate', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Special Holiday */}
                  <div className="pa-subsection">
                    <h5 className="pa-subsection-title">Special Holiday</h5>
                    <div className="pa-form-group">
                      <label>SH RATE:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.holiday_rates.special_holiday.sh_rate}
                        onChange={(e) => handleNestedPayrollInputChange('holiday_rates', 'special_holiday', 'sh_rate', e.target.value)}
                      />
                    </div>
                    <div className="pa-form-group">
                      <label>SH OT RATE:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.holiday_rates.special_holiday.sh_ot_rate}
                        onChange={(e) => handleNestedPayrollInputChange('holiday_rates', 'special_holiday', 'sh_ot_rate', e.target.value)}
                      />
                    </div>
                    <div className="pa-form-group">
                      <label>SH ND RATE:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.holiday_rates.special_holiday.sh_nd_rate}
                        onChange={(e) => handleNestedPayrollInputChange('holiday_rates', 'special_holiday', 'sh_nd_rate', e.target.value)}
                      />
                    </div>
                    <div className="pa-form-group">
                      <label>SH ROT OT RATE:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.holiday_rates.special_holiday.sh_rot_ot_rate}
                        onChange={(e) => handleNestedPayrollInputChange('holiday_rates', 'special_holiday', 'sh_rot_ot_rate', e.target.value)}
                      />
                    </div>
                    <div className="pa-form-group">
                      <label>SH ROT OT + OT RATE:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.holiday_rates.special_holiday.sh_rot_ot_plus_ot_rate}
                        onChange={(e) => handleNestedPayrollInputChange('holiday_rates', 'special_holiday', 'sh_rot_ot_plus_ot_rate', e.target.value)}
                      />
                    </div>
                    <div className="pa-form-group">
                      <label>SH + ROT + ND:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={payrollFormData.holiday_rates.special_holiday.sh_rot_nd}
                        onChange={(e) => handleNestedPayrollInputChange('holiday_rates', 'special_holiday', 'sh_rot_nd', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Government Mandatory Contributions and Other Deductions */}
                <div className="pa-form-section">
                  <h4 className="pa-section-title">GOVERNMENT MANDATORY CONTRIBUTION AND OTHER DEDUCTIONS</h4>
                  <div className="pa-form-group">
                    <label>SSS:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.government_contributions.sss}
                      onChange={(e) => handlePayrollInputChange('government_contributions', 'sss', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>PHIC:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.government_contributions.phic}
                      onChange={(e) => handlePayrollInputChange('government_contributions', 'phic', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>HDMF:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.government_contributions.hdmf}
                      onChange={(e) => handlePayrollInputChange('government_contributions', 'hdmf', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>TAX:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.government_contributions.tax}
                      onChange={(e) => handlePayrollInputChange('government_contributions', 'tax', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>SSS LOAN:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.government_contributions.sss_loan}
                      onChange={(e) => handlePayrollInputChange('government_contributions', 'sss_loan', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>HDMF LOAN:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.government_contributions.hdmf_loan}
                      onChange={(e) => handlePayrollInputChange('government_contributions', 'hdmf_loan', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>TEED:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.government_contributions.teed}
                      onChange={(e) => handlePayrollInputChange('government_contributions', 'teed', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>STAFF HOUSE:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.government_contributions.staff_house}
                      onChange={(e) => handlePayrollInputChange('government_contributions', 'staff_house', e.target.value)}
                    />
                  </div>
                  <div className="pa-form-group">
                    <label>CASH ADVANCE:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payrollFormData.government_contributions.cash_advance}
                      onChange={(e) => handlePayrollInputChange('government_contributions', 'cash_advance', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default list view
  return (
    <div className="pa-page">
      {/* Fixed Header */}
      <div className="pa-header-container">
        <div className="pa-header-content">
          <h1 className="pa-title">PAYROLL ACCOUNT</h1>
          <div className="pa-actions">
            <div className={`pa-search-box ${isSearchFocused ? 'pa-search-focused' : ''}`}>
              <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              <button className="pa-search-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="pa-content">
        {loading ? (
          <div className="pa-loading">
            <div className="pa-loading-spinner"></div>
            <p>Loading payroll data...</p>
          </div>
        ) : error ? (
          <div className="pa-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="pa-error-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="pa-no-results">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="pa-no-results-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p>No payroll records found</p>
          </div>
        ) : (
          <div className="pa-employee-grid">
            {filteredEmployees.slice(0, loadedCards).map((employee, index) => {
              const isViewing = viewingEmployee && viewingEmployee.id === employee.id;
              
              return (
                <div 
                  key={employee.id || index} 
                  className={`pa-employee-card pa-card-appear ${isViewing ? 'pa-card-viewing' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="pa-card-header">
                    {renderAvatar(employee)}
                    <div className="pa-employee-info">
                      <h3 className="pa-employee-name">{employee.firstName} {employee.lastName}</h3>
                      <p className="pa-employee-role">{employee.position || 'Employee'}</p>
                      <p className="pa-employee-email">{employee.email}</p>
                      <div className="pa-payroll-info">
                        <div className="pa-payroll-pills">
                          <span className="pa-status-pill">Active</span>
                          <span className="pa-work-arrangement">{employee.workarrangement}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pa-card-actions">
                    <button 
                      className="pa-action-button pa-view-button"
                      onClick={() => handleViewDetails(employee.id)}
                    >
                      <span className="pa-button-text">View Details</span>
                      <span className="pa-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </span>
                    </button>

                    <button 
                      className="pa-action-button pa-manage-button"
                      onClick={() => handleManage(employee.id)}
                    >
                      <span className="pa-button-text">Manage</span>
                      <span className="pa-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

            {/* NEW View Details Modal for Employee List */}
      {showViewDetailsModal && viewDetailsEmployee && (
        <div className="pa-employee-details-modal">
          <div className="pa-modal-backdrop" onClick={() => setShowViewDetailsModal(false)}></div>
          <div className="pa-modal-content">
            <div className="pa-modal-header">
              <h2>Employee Complete Details</h2>
              <button className="pa-close-button" onClick={() => setShowViewDetailsModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="pa-modal-body">
              <div className="pa-employee-full-details">
                {renderAvatar(viewDetailsEmployee)}
                <div className="pa-details-info">
                  <h3>{viewDetailsEmployee.firstName} {viewDetailsEmployee.lastName}</h3>
                  <p className="pa-detail-position">{viewDetailsEmployee.position}</p>
                </div>
              </div>

              {/* Personal Information Section */}
                <div className="pa-info-section">
                  <h4>Personal Information</h4>
                  <div className="pa-detail-grid">
                    <div className="pa-detail-item">
                      <label>Full Name:</label>
                      <span>
                        {viewDetailsEmployee.firstName} 
                        {viewDetailsEmployee.personal_info?.middle_name ? ` ${viewDetailsEmployee.personal_info.middle_name}` : ''} 
                        {viewDetailsEmployee.lastName}
                      </span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Email:</label>
                      <span>{viewDetailsEmployee.email}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Contact Number:</label>
                      <span>{viewDetailsEmployee.number || 'N/A'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Address:</label>
                      <span>{viewDetailsEmployee.address || 'N/A'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Date of Birth:</label>
                      <span>
                        {viewDetailsEmployee.personal_info?.date_of_birth && 
                        viewDetailsEmployee.personal_info.date_of_birth !== '0000-00-00' 
                          ? viewDetailsEmployee.personal_info.date_of_birth 
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Civil Status:</label>
                      <span>{viewDetailsEmployee.personal_info?.civil_status || 'N/A'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Gender:</label>
                      <span>{viewDetailsEmployee.personal_info?.gender || 'N/A'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Citizenship:</label>
                      <span>{viewDetailsEmployee.personal_info?.citizenship || 'N/A'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Height:</label>
                      <span>{viewDetailsEmployee.personal_info?.height || 'N/A'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Weight:</label>
                      <span>{viewDetailsEmployee.personal_info?.weight || 'N/A'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Work Days:</label>
                      <span>{viewDetailsEmployee.workDays}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Work Arrangement:</label>
                      <span>{viewDetailsEmployee.workarrangement}</span>
                    </div>
                  </div>
                </div>
              
              {/* Benefits Account Section */}
              <div className="pa-benefits-section">
                <h4>Benefits Account Numbers</h4>
                <div className="pa-benefits-grid">
                  <div className="pa-benefit-item">
                    <label>SSS Account:</label>
                    <span>{viewDetailsEmployee.benefits?.sss_account || 'Not Set'}</span>
                  </div>
                  <div className="pa-benefit-item">
                    <label>PHIC Account:</label>
                    <span>{viewDetailsEmployee.benefits?.phic_account || 'Not Set'}</span>
                  </div>
                  <div className="pa-benefit-item">
                    <label>HDMF Account:</label>
                    <span>{viewDetailsEmployee.benefits?.hdmf_account || 'Not Set'}</span>
                  </div>
                  <div className="pa-benefit-item">
                    <label>TIN:</label>
                    <span>{viewDetailsEmployee.benefits?.tax_account || 'Not Set'}</span>
                  </div>
                </div>
              </div>

              {/* Complete Payroll Information */}
              <div className="pa-payroll-complete-section">
                <h4>Complete Payroll Information</h4>
                
                <div className="pa-payroll-subsection">
                  <h5>Basic Pay</h5>
                  <div className="pa-detail-grid">
                    <div className="pa-detail-item">
                      <label>Monthly:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.basic_pay?.monthly || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Semi-Monthly:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.basic_pay?.semi_monthly || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Gross Pay:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.basic_pay?.grosspay || '0.00'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="pa-payroll-subsection">
                  <h5>Employee Rates</h5>
                  <div className="pa-detail-grid">
                    <div className="pa-detail-item">
                      <label>Rate Per Day:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.employee_rate?.rate_per_day || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Rate Per Hour:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.employee_rate?.rate_per_hour || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Rate Per Minute:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.employee_rate?.rate_per_minute || '0.00'}</span>
                    </div>
                  </div>
                </div>

                <div className="pa-payroll-subsection">
                  <h5>Government Contributions & Deductions</h5>
                  <div className="pa-detail-grid">
                    <div className="pa-detail-item">
                      <label>SSS:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.government_contributions?.sss || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>PHIC:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.government_contributions?.phic || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>HDMF:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.government_contributions?.hdmf || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Tax:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.government_contributions?.tax || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>SSS Loan:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.government_contributions?.sss_loan || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>HDMF Loan:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.government_contributions?.hdmf_loan || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>TEED:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.government_contributions?.teed || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Staff House:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.government_contributions?.staff_house || '0.00'}</span>
                    </div>
                    <div className="pa-detail-item">
                      <label>Cash Advance:</label>
                      <span>₱{viewDetailsEmployee.payroll_data?.government_contributions?.cash_advance || '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollAccount;