import React, { useState, useEffect } from 'react';
import * as ExcelJS from 'exceljs';
import difsyslogo from '../../assets/difsyslogo.png';
import '../../components/AccountantLayout/GeneratePayroll.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const GeneratePayroll = () => {
  // State management
  const [currentView, setCurrentView] = useState('employees');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAllEmployeesModal, setShowAllEmployeesModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Data states
  const [employees, setEmployees] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [payslipHistory, setPayslipHistory] = useState([]);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedPayrollPeriod, setSelectedPayrollPeriod] = useState('');
  const [availablePayrollPeriods, setAvailablePayrollPeriods] = useState([]);
  const [allEmployeesPayroll, setAllEmployeesPayroll] = useState([]);
  const [showGeneratePreviewModal, setShowGeneratePreviewModal] = useState(false);
  const [showReleasePreviewModal, setShowReleasePreviewModal] = useState(false);
  const [selectedEmployeesPayroll, setSelectedEmployeesPayroll] = useState([]);
  const [modalCurrentPage, setModalCurrentPage] = useState(1);

  useEffect(() => {
            document.title = "DIFSYS | GENERATE PAYROLL";
          }, []);
  
  const API_BASE_URL = 'http://localhost/difsysapi/generate_payroll.php';

  const itemsPerPage = 6;
  const modalItemsPerPage = 6; // Declare this first
  const [dynamicItemsPerPage, setDynamicItemsPerPage] = useState(8); // Use hardcoded value instead


// Add this useEffect to handle screen size changes
useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth <= 480) {
      setDynamicItemsPerPage(4);
    } else {
      setDynamicItemsPerPage(8); // Use hardcoded value instead of modalItemsPerPage
    }
  };

  handleResize(); // Set initial value
  window.addEventListener('resize', handleResize);
  
  return () => window.removeEventListener('resize', handleResize);
}, []);

  // API Functions
  const fetchCurrentPayrollPeriod = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_current_payroll_period`);
      const data = await response.json();
      if (data.success) {
        setCurrentPeriod(data.current_period);
      }
    } catch (error) {
      console.error('Error fetching current payroll period:', error);
    }
  };

  const fetchEmployeesForPayroll = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_employees_for_payroll`);
      const data = await response.json();
      if (data.success) {
        // Add this console.log to see what data structure you're getting
        console.log('Raw employee data:', data.employees[0]);
        
        // Process records to include profile images like your other components
        const processedEmployees = await Promise.all((data.employees || []).map(async (employee) => {
          // Fetch employee profile image from attendance_api
          try {
            const profileResponse = await fetch(`http://localhost/difsysapi/attendance_api.php?action=get_employee_info&emp_id=${employee.emp_id}`);
            const profileData = await profileResponse.json();
            
            console.log(`Profile data for ${employee.emp_id}:`, profileData);
            
            return {
              ...employee,
              profileImage: profileData.success ? profileData.employee.profile_image : null
            };
          } catch (error) {
            console.error('Error fetching profile for employee:', employee.emp_id, error);
            return {
              ...employee,
              profileImage: null
            };
          }
        }));
  
        console.log('Processed employees with profiles:', processedEmployees[0]);
        
        setEmployees(processedEmployees);
        setCurrentPeriod(data.current_period);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAvatar = (person) => {
    // Handle different name formats from your API
    let firstName = '';
    let lastName = '';
    
    if (person.firstName && person.lastName) {
      firstName = person.firstName;
      lastName = person.lastName;
    } else if (person.employee_name) {
      const nameParts = person.employee_name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts[nameParts.length - 1] || '';
    }
    
    const initials = getInitials(firstName, lastName);
    const avatarColor = getAvatarColor(firstName, lastName);
    
    return (
      <div 
        className="gp-avatar"
        style={{ backgroundColor: person.profileImage ? 'transparent' : avatarColor }}
      >
        {person.profileImage ? (
          <img 
            src={person.profileImage.startsWith('http') ? person.profileImage : `http://localhost/difsysapi/${person.profileImage}`} 
            alt={`${firstName} ${lastName}`}
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

  const handleModalPageChange = (page) => {
    setModalCurrentPage(page);
  };

  const renderModalPaginationButtons = () => {
    const modalData = showGeneratePreviewModal ? selectedEmployeesPayroll : 
                     showReleasePreviewModal ? selectedEmployeesPayroll : allEmployeesPayroll;
    const modalTotalPages = Math.ceil(modalData.length / modalItemsPerPage);
    
    const buttons = [];
    
    for (let i = 1; i <= Math.min(modalTotalPages, 5); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handleModalPageChange(i)}
          className={`gp-pagination-btn ${modalCurrentPage === i ? 'gp-pagination-active' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (modalTotalPages > 5) {
      buttons.push(
        <span key="modal-dots" className="gp-pagination-dots">...</span>
      );
      buttons.push(
        <button
          key={modalTotalPages}
          onClick={() => handleModalPageChange(modalTotalPages)}
          className={`gp-pagination-btn ${modalCurrentPage === modalTotalPages ? 'gp-pagination-active' : ''}`}
        >
          {modalTotalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  const fetchPayrollHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_payroll_history`);
      const data = await response.json();
      if (data.success) {
        setPayrollHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching payroll history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayslipHistory = async (empId = null, payrollPeriodId = null) => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}?action=get_payslip_history`;
      if (empId) url += `&emp_id=${empId}`;
      if (payrollPeriodId) url += `&payroll_period_id=${payrollPeriodId}`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setPayslipHistory(data.payslips);
      }
    } catch (error) {
      console.error('Error fetching payslip history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePayrollPeriods = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_available_payroll_periods`);
      const data = await response.json();
      if (data.success) {
        setAvailablePayrollPeriods(data.periods);
      }
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
    }
  };

  const fetchAllEmployeesPayroll = async (payrollPeriodId = null) => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}?action=get_all_employees_payroll`;
      if (payrollPeriodId) url += `&payroll_period_id=${payrollPeriodId}`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        // ADD THIS: Process records to include profile images
        const processedEmployees = await Promise.all((data.employees || []).map(async (employee) => {
          try {
            const profileResponse = await fetch(`http://localhost/difsysapi/attendance_api.php?action=get_employee_info&emp_id=${employee.emp_id}`);
            const profileData = await profileResponse.json();
            
            return {
              ...employee,
              profileImage: profileData.success ? profileData.employee.profile_image : null
            };
          } catch (error) {
            console.error('Error fetching profile for employee:', employee.emp_id, error);
            return {
              ...employee,
              profileImage: null
            };
          }
        }));
  
        setAllEmployeesPayroll(processedEmployees);
      }
    } catch (error) {
      console.error('Error fetching all employees payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeePayrollDetails = async (empId, payrollPeriodId = null) => {
    try {
      let url = `${API_BASE_URL}?action=get_employee_payroll_details&emp_id=${empId}`;
      if (payrollPeriodId) url += `&payroll_period_id=${payrollPeriodId}`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        // ADD THIS: Fetch profile image for the single employee
        try {
          const profileResponse = await fetch(`http://localhost/difsysapi/attendance_api.php?action=get_employee_info&emp_id=${empId}`);
          const profileData = await profileResponse.json();
          
          return {
            ...data.employee,
            profileImage: profileData.success ? profileData.employee.profile_image : null
          };
        } catch (error) {
          console.error('Error fetching profile for employee:', empId, error);
          return data.employee;
        }
      }
    } catch (error) {
      console.error('Error fetching employee payroll details:', error);
    }
    return null;
  };

  

  const formatHoursAndMinutes = (totalMinutes) => {
    if (!totalMinutes || totalMinutes === 0) return '0h';
    
    const hours = Math.floor(totalMinutes / 60); // Only show whole hours
    return `${hours}h`;
  };
  
  const formatDecimalHours = (decimalHours) => {
    if (!decimalHours || decimalHours === 0) return '0h';
    
    const hours = Math.floor(decimalHours); // Only show whole hours
    return `${hours}h`;
  };

  // Initialize data
  useEffect(() => {
    fetchCurrentPayrollPeriod();
    fetchEmployeesForPayroll();
    fetchAvailablePayrollPeriods();
  }, []);

  // Load data based on current view
  useEffect(() => {
    switch (currentView) {
      case 'history':
        fetchPayrollHistory();
        break;
      case 'payslip_history':
        if (selectedPayrollPeriod) {
          fetchPayslipHistory(null, selectedPayrollPeriod);
        } else {
          fetchPayslipHistory();
        }
        break;
      case 'generate':
        fetchEmployeesForPayroll();
        break;
      default:
        fetchEmployeesForPayroll();
        break;
    }
  }, [currentView, selectedPayrollPeriod]);

  const handleGenerate = async () => {
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee to generate payroll.');
      return;
    }
    
    setGenerateLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}?action=generate_payroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_employees: selectedEmployees,
          regenerate: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Payroll generated successfully for ${data.generated_count} employees!`);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        // Fetch updated data and show preview modal (DON'T EXPORT YET)
        await fetchEmployeesForPayroll();
        await fetchSelectedEmployeesPayroll();
        setShowGeneratePreviewModal(true);
        setShowAllEmployeesModal(true); // Show the modal
        setIsEditing(false);
        setEditedData({});
        setHasChanges(false);
      } else {
        alert('Error generating payroll: ' + data.message);
      }
    } catch (error) {
      console.error('Error generating payroll:', error);
      alert('Error generating payroll. Please try again.');
    } finally {
      setGenerateLoading(false);
    }
  };
  const fetchSelectedEmployeesPayroll = async () => {
    setLoading(true);
    try {
      const employeeIds = selectedEmployees.join(',');
      const response = await fetch(`${API_BASE_URL}?action=get_selected_employees_payroll&emp_ids=${employeeIds}`);
      const data = await response.json();
      if (data.success) {
        // ADD THIS: Process records to include profile images
        const processedEmployees = await Promise.all((data.employees || []).map(async (employee) => {
          try {
            const profileResponse = await fetch(`http://localhost/difsysapi/attendance_api.php?action=get_employee_info&emp_id=${employee.emp_id}`);
            const profileData = await profileResponse.json();
            
            return {
              ...employee,
              profileImage: profileData.success ? profileData.employee.profile_image : null
            };
          } catch (error) {
            console.error('Error fetching profile for employee:', employee.emp_id, error);
            return {
              ...employee,
              profileImage: null
            };
          }
        }));
  
        setSelectedEmployeesPayroll(processedEmployees);
      }
    } catch (error) {
      console.error('Error fetching selected employees payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePayroll = async () => {
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee to release payslip.');
      return;
    }
    
    // Check if selected employees have generated payroll
    const hasGeneratedPayroll = employees
      .filter(emp => selectedEmployees.includes(emp.emp_id))
      .every(emp => emp.status === 'Generated' || emp.status === 'Released');
      
    if (!hasGeneratedPayroll) {
      alert('Please generate payroll first for selected employees.');
      return;
    }
    
    setReleaseLoading(true);
    
    try {
      // Fetch selected employees payroll data first and show preview
      await fetchSelectedEmployeesPayroll();
      setShowReleasePreviewModal(true);
      setShowAllEmployeesModal(true); // Show the modal
      setIsEditing(false);
      setEditedData({});
      setHasChanges(false);
    } catch (error) {
      console.error('Error preparing payslip release:', error);
      alert('Error preparing payslip release. Please try again.');
    } finally {
      setReleaseLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    try {
      console.log('Saving changes:', editedData);
      
      // Group edited data by employee
      const employeeUpdates = {};
      
      Object.keys(editedData).forEach(cellKey => {
        // FIXED: Split only on the FIRST underscore to get empId and full field name
        const underscoreIndex = cellKey.indexOf('_');
        const empId = cellKey.substring(0, underscoreIndex);
        const field = cellKey.substring(underscoreIndex + 1); // Get everything after first underscore
        
        if (!employeeUpdates[empId]) {
          employeeUpdates[empId] = {};
        }
        
        // Convert empty strings to 0 for saving
        const value = editedData[cellKey] === '' ? 0 : parseFloat(editedData[cellKey]) || 0;
        
        // Now field contains the full field name like "basic_pay_semi_monthly"
        employeeUpdates[empId][field] = value;
      });
      
      console.log('Grouped updates:', employeeUpdates);
      
      // Save each employee's changes
      for (const empId of Object.keys(employeeUpdates)) {
        console.log(`Updating employee ${empId}:`, employeeUpdates[empId]);
        
        const response = await fetch(`${API_BASE_URL}?action=update_employee_payroll_data`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emp_id: parseInt(empId),
            payroll_period_id: currentPeriod?.id,
            updates: employeeUpdates[empId] // This now contains clean field names
          })
        });
        
        const data = await response.json();
        console.log(`Response for employee ${empId}:`, data);
        
        if (!data.success) {
          throw new Error(`Error updating employee ${empId}: ${data.message}`);
        }
        
        // CRITICAL FIX: Update the local state with the new computation
        if (data.updated_computation) {
          // Update the displayed data immediately
          if (showGeneratePreviewModal) {
            setSelectedEmployeesPayroll(prev => 
              prev.map(emp => 
                emp.emp_id === parseInt(empId) 
                  ? { ...emp, computation: data.updated_computation }
                  : emp
              )
            );
          } else if (showReleasePreviewModal) {
            setSelectedEmployeesPayroll(prev => 
              prev.map(emp => 
                emp.emp_id === parseInt(empId) 
                  ? { ...emp, computation: data.updated_computation }
                  : emp
              )
            );
          } else {
            setAllEmployeesPayroll(prev => 
              prev.map(emp => 
                emp.emp_id === parseInt(empId) 
                  ? { ...emp, computation: data.updated_computation }
                  : emp
              )
            );
          }
        }
      }
      
      // Clear editing state AFTER successful updates
      setIsEditing(false);
      setHasChanges(false);
      setEditedData({});
      
      // Show success message
      setSuccessMessage('Payroll updated successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      console.log('Save completed successfully - local state updated');
      
    } catch (error) {
      console.error('Error updating payroll:', error);
      alert('Error updating payroll: ' + error.message);
    }
  };


  const generatePayslipPDFs = async (employeesData) => {
    console.log('=== STARTING PDF GENERATION ===');
    console.log('Employees data:', employeesData.length, 'employees');
    console.log('Current period:', currentPeriod);
    console.log('API Base URL:', API_BASE_URL);
    
    try {
      let successfulPDFs = 0;
      
      if (!employeesData || employeesData.length === 0) {
        console.error('No employees data provided');
        return 0;
      }
      
      for (const employee of employeesData) {
        try {
          console.log(`\n--- Processing employee: ${employee.employee_name || `${employee.firstName} ${employee.lastName}`} (ID: ${employee.emp_id}) ---`);
          
          // Ensure we have computation data
          if (!employee.computation) {
            console.warn('No computation data for employee:', employee.emp_id);
            continue;
          }
          
          // Log computation data for debugging
          console.log('Employee computation sample:', {
            emp_id: employee.emp_id,
            basic_pay_semi_monthly: employee.computation.basic_pay_semi_monthly,
            gross_pay: employee.computation.gross_pay,
            net_pay: employee.computation.net_pay,
            total_deductions: employee.computation.total_deductions,
            regular_ot_amount: employee.computation.regular_ot_amount
          });
          
          const doc = new jsPDF('portrait', 'mm', 'a4');
          const comp = employee.computation;
          
          // Create Employee Copy
          createPayslipPage(doc, employee, comp, 'EMPLOYEE COPY');
          
          // Generate filename
          const employeeId = employee.employee_id || `DIF${String(employee.emp_id).padStart(3, '0')}`;
          const periodText = currentPeriod?.display_period?.replace(/[^a-zA-Z0-9]/g, '_') || 'current';
          const filename = `payslip_${employeeId}_${periodText}.pdf`;
          
          console.log(`Generated filename: ${filename}`);
          
          // Convert to blob
          const pdfBlob = doc.output('blob');
          console.log(`PDF blob generated, size: ${pdfBlob.size} bytes`);
          
          if (pdfBlob.size > 0) {
            // Upload to server
            try {
              const uploadResult = await uploadPDFToServer(pdfBlob, filename, employee.emp_id);
              console.log('✅ Upload successful:', uploadResult);
            } catch (uploadError) {
              console.warn('❌ Server upload failed for', filename, ':', uploadError);
              // Continue with download even if upload fails
            }
            
            successfulPDFs++;
            console.log(`✅ Generated and downloaded PDF for ${employeeId}`);
          } else {
            console.error(`❌ Failed to generate PDF blob for ${employeeId}`);
          }
          
          // Small delay to prevent browser freezing
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`❌ Error generating PDF for employee ${employee.emp_id}:`, error);
        }
      }
      
      console.log(`\n=== PDF GENERATION COMPLETE ===`);
      console.log(`Successfully generated ${successfulPDFs} PDFs`);
      return successfulPDFs;
      
    } catch (error) {
      console.error('❌ Error in generatePayslipPDFs:', error);
      throw error;
    }
};

  // Updated createPayslipPage function with proper peso sign handling
const createPayslipPage = (doc, employee, comp, copyType) => {
  const margin = 15;
  
  // Set default font to support Unicode characters
  doc.setFont('helvetica', 'normal');
  
  // Add logo in top left
  try {
    if (difsyslogo) {
      doc.addImage(difsyslogo, 'PNG', 20, 30, 25, 15);
    }
  } catch (e) {
    console.warn('Could not add logo to PDF:', e.message);
  }
  
  // EMPLOYEE COPY header (top right)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE COPY', 150, 35);
  
  // Main title - EMPLOYEE PAYSLIP (centered)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE PAYSLIP', 85, 43, { align: 'center' });
  
  // Employee Information Section
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  let yPos = 47;
  
  // Row 1: Payroll Period and TIN
  doc.text('Payroll Period:', margin, yPos);
  doc.text(currentPeriod?.display_period || 'July 24, 2025 - July 28, 2025', margin + 50, yPos);
  doc.text('TIN:', 120, yPos);
  doc.text(employee.tax_account || 'N/A', 175, yPos);
  
  yPos += 3.5;
  
  // Row 2: Employee Number and SSS Number
  doc.text('Employee Number:', margin, yPos);
  doc.text(employee.employee_id || `DIF${String(employee.emp_id).padStart(3, '0')}`, margin + 63, yPos);
  doc.text('SSS Number:', 120, yPos);
  doc.text(employee.sss_account || 'N/A', 175, yPos);
  
  yPos += 3.5;
  
  // Row 3: Employee Name and PhilHealth Number
  doc.text('Employee Name:', margin, yPos);
  doc.text(employee.employee_name || `${employee.firstName || ''} ${employee.lastName || ''}`, margin + 60, yPos);
  doc.text('PhilHealth Number:', 120, yPos);
  doc.text(employee.phic_account || 'N/A', 175, yPos);
  
  yPos += 3.5;

  // Row 4: Date Hired and Pag-IBIG Number
  doc.text('Date Hired:', margin, yPos);
  doc.text(employee.date_hired || 'N/A', margin + 57, yPos);
  doc.text('Pag-IBIG Number:', 120, yPos);
  doc.text(employee.hdmf_account || 'N/A', 175, yPos);

  yPos += 3.5;
  
  // Row 5: Position
  doc.text('Position:', margin, yPos);
  doc.text(employee.position || 'N/A', margin + 57, yPos);
  
  // Basic Semi Monthly Salary - USE REAL DATA
  yPos += 3.5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Basic Semi Monthly Salary          :', margin, yPos);
  const basicPay = parseFloat(comp.basic_pay_semi_monthly || 0);
  // FIX: Use PHP peso sign (P) instead of Unicode ₱
  doc.text(`P${formatCurrency(basicPay)}`, margin + 60, yPos);
  doc.text('Holiday Pay', 120, yPos);
  
  // Table headers
  yPos += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  
  // Left side headers
  doc.text('ADD', margin, yPos);
  doc.text('HRS', margin + 41, yPos);
  
  yPos += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  // Data rows - FIXED: Proper number parsing and formatting
  const leftData = [
    ['Regular Overtime', parseFloat(comp.regular_ot_hours || 0), parseFloat(comp.regular_ot_amount || 0)],
    ['Night Differential', parseFloat(comp.regular_ot_nd_hours || 0), parseFloat(comp.regular_ot_nd_amount || 0)],
    ['Rest Day Overtime', parseFloat(comp.rest_day_ot_hours || 0), parseFloat(comp.rest_day_ot_amount || 0)],
    ['Rest Day OT (Beyond 8hrs)', parseFloat(comp.rest_day_ot_plus_ot_hours || 0), parseFloat(comp.rest_day_ot_plus_ot_amount || 0)],
    ['Rest Day OT + Night Diff', parseFloat(comp.rest_day_nd_hours || 0), parseFloat(comp.rest_day_nd_amount || 0)],
    ['Site Allowance', '', parseFloat(comp.site_allowance || 0)],
    ['Salary Adjustment', '', parseFloat(comp.travel_time_amount || 0)]
  ];

  const rightData = [
    ['Regular Holiday', parseFloat(comp.regular_holiday_hours || 0), parseFloat(comp.regular_holiday_amount || 0)],
    ['Regular Holiday + Overtime', parseFloat(comp.regular_holiday_ot_hours || 0), parseFloat(comp.regular_holiday_ot_amount || 0)],
    ['Regular Holiday + Night Diff', parseFloat(comp.regular_holiday_nd_hours || 0), parseFloat(comp.regular_holiday_nd_amount || 0)],
    ['Regular Holiday + ROT', 0, 0],
    ['Regular Holiday + ROT + OT', parseFloat(comp.regular_holiday_rot_ot_hours || 0), parseFloat(comp.regular_holiday_rot_ot_amount || 0)],
    ['Special Holiday', parseFloat(comp.special_holiday_hours || 0), parseFloat(comp.special_holiday_amount || 0)],
    ['Special Holiday + Overtime', parseFloat(comp.special_holiday_ot_hours || 0), parseFloat(comp.special_holiday_ot_amount || 0)],
    ['Special Holiday + Night Diff', parseFloat(comp.special_holiday_nd_hours || 0), parseFloat(comp.special_holiday_nd_amount || 0)],
    ['Special Holiday + ROT', parseFloat(comp.special_holiday_rot_hours || 0), parseFloat(comp.special_holiday_rot_amount || 0)],
    ['SH + ROT (Beyond 8hrs)', 0, 0],
    ['SH + ROT + ND', parseFloat(comp.special_holiday_rot_nd_hours || 0), parseFloat(comp.special_holiday_rot_nd_amount || 0)]
  ];

  const maxRows = Math.max(leftData.length, rightData.length);
  const rightSideOffset = -3.5;

  for (let i = 0; i < maxRows; i++) {
    const currentLeftYPos = yPos;
    const currentRightYPos = yPos + rightSideOffset;
    
    // Left side
    if (i < leftData.length) {
      const [label, hours, amount] = leftData[i];
      doc.text(label, margin, currentLeftYPos);
      if (hours !== '') {
        doc.text(Math.floor(hours).toString(), margin + 43, currentLeftYPos);
      }
      // FIX: Use 'P' instead of '₱'
      const formattedAmount = amount > 0 ? `P${formatCurrency(amount)}` : 'P0.00';
      doc.text(formattedAmount, 87, currentLeftYPos, { align: 'right' });
    }
    
    // Right side (holiday section)
    if (i < rightData.length) {
      const [label, hours, amount] = rightData[i];
      doc.text(label, 120, currentRightYPos);
      if (hours !== '') {
        doc.text(Math.floor(hours).toString(), 163, currentRightYPos);
      }
      // FIX: Use 'P' instead of '₱'
      const formattedAmount = amount > 0 ? `P${formatCurrency(amount)}` : 'P0.00';
      doc.text(formattedAmount, 183, currentRightYPos, { align: 'right' });
    }
    
    yPos += 4;
  }
  
  // Total Gross - USE REAL DATA
  yPos += 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Total Gross:', 120, yPos);
  const grossPay = parseFloat(comp.gross_pay || 0);
  // FIX: Use 'P' instead of '₱'
  doc.text(`P${formatCurrency(grossPay)}`, 185, yPos, { align: 'right' });
  
  // Deductions Section
  yPos += 4.3;
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions', margin, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  // Deductions data - FIXED: Proper number parsing
  const leftDeductions = [
    ['Absences', parseFloat(comp.absences_amount || 0)],
    ['Undertime', parseFloat(comp.late_undertime_amount || 0)],
    ['SSS Contribution', parseFloat(comp.sss_contribution || 0)],
    ['PHIC Contribution', parseFloat(comp.phic_contribution || 0)],
    ['HDMF Contribution', parseFloat(comp.hdmf_contribution || 0)],
    ['Withholding TAX', parseFloat(comp.tax_amount || 0)]
  ];
  
  const rightDeductions = [
    ['SSS Loan', parseFloat(comp.sss_loan || 0)],
    ['HDMF Loan', parseFloat(comp.hdmf_loan || 0)],
    ['TEED', parseFloat(comp.teed || 0)],
    ['Staff House Rent', parseFloat(comp.staff_house || 0)],
    ['Cash Advance', parseFloat(comp.cash_advance || 0)]
  ];
  
  const maxDeductRows = Math.max(leftDeductions.length, rightDeductions.length);
  
  for (let i = 0; i < maxDeductRows; i++) {
    // Left side deductions
    if (i < leftDeductions.length) {
      const [label, amount] = leftDeductions[i];
      doc.text(label, margin, yPos);
      // FIX: Use 'P' instead of '₱'
      const formattedAmount = amount > 0 ? `P${formatCurrency(amount)}` : 'P0.00';
      doc.text(formattedAmount, 87, yPos, { align: 'right' });
    }
    
    // Right side deductions
    if (i < rightDeductions.length) {
      const [label, amount] = rightDeductions[i];
      doc.text(label, 120, yPos);
      // FIX: Use 'P' instead of '₱'
      const formattedAmount = amount > 0 ? `P${formatCurrency(amount)}` : 'P0.00';
      doc.text(formattedAmount, 183, yPos, { align: 'right' });
    }
    
    yPos += 4;
  }
  
  // Total Deductions - USE REAL DATA
  yPos += -3.1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Total Deductions:', 120, yPos);
  const totalDeductions = parseFloat(comp.total_deductions || 0);
  // FIX: Use 'P' instead of '₱'
  doc.text(`P${formatCurrency(totalDeductions)}`, 183, yPos, { align: 'right' });
  
  // Total Net Pay - USE REAL DATA
  yPos += 8;
  doc.setFontSize(8);
  doc.text('Total Net Pay:', 120, yPos);
  const netPay = parseFloat(comp.net_pay || 0);
  // FIX: Use 'P' instead of '₱'
  doc.text(`P${formatCurrency(netPay)}`, 183, yPos, { align: 'right' });
  
  // Footer disclaimer
  yPos += -125;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const disclaimerText = 'This document generated by the company under no circumstances is to be amended, deleted or otherwise tampered with. In the event of any amendment, deletion or tampering, the company will treat the same with utmost severity and will proceed to act to the full extent of the law. This statement constitutes a record of your earnings and deductions. Please report any discrepancies to the management immediately.';

  const lines = doc.splitTextToSize(disclaimerText, 180);
  doc.text(lines, margin + 88, 165, {
      align: 'center',
      maxWidth: 180
  });

  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(10, yPos + 130, 200, yPos + 130);

  // Border around the entire payslip
  doc.setLineWidth(0.5);
  doc.rect(10, 30, 190, 144);
};

// Alternative solution: You can also try using the Unicode escape sequence
// Instead of 'P', you could try '\u20B1' (which is the Unicode for peso sign)
// Example: doc.text(`\u20B1${formatCurrency(basicPay)}`, margin + 60, yPos);

// Updated formatCurrency function (no changes needed, but included for completeness)
const formatCurrency = (amount) => {
  // Handle null, undefined, empty string, or non-numeric values
  if (amount === null || amount === undefined || amount === '' || isNaN(amount)) {
    return '0.00';
  }
  
  // Convert to number and ensure it's positive for display
  const numAmount = Math.abs(parseFloat(amount));
  
  return numAmount.toLocaleString('en-US', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
};

  
  
  // Function to upload PDF to server
  const uploadPDFToServer = async (pdfBlob, filename, empId) => {
    try {
      console.log(`Attempting to upload PDF: ${filename} for employee ${empId}`);
      console.log(`PDF blob size: ${pdfBlob.size} bytes`);
      console.log(`Current period ID: ${currentPeriod?.id}`);
      
      const formData = new FormData();
      formData.append('pdf', pdfBlob, filename);
      formData.append('emp_id', empId.toString());
      formData.append('payroll_period_id', currentPeriod?.id?.toString() || '');
      formData.append('action', 'upload_payslip_pdf');
      
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (key === 'pdf') {
          console.log(`${key}: [File object, size: ${value.size}]`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      
      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        body: formData
      });
      
      console.log(`Upload response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Upload response:', result);
      
      if (!result.success) {
        console.error('Upload failed:', result.message);
        throw new Error(result.message);
      }
      
      console.log(`PDF uploaded successfully: ${filename}`);
      return result;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      throw error;
    }
};



  // Excel Export Function
  const exportToExcel = async (exportData) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Payroll Data');
  
      // Add logo
      try {
        const response = await fetch(difsyslogo);
        const arrayBuffer = await response.arrayBuffer();
        
        const imageId = workbook.addImage({
          buffer: arrayBuffer,
          extension: 'png',
        });
        
        worksheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          br: { col: 2.0, row: 4 },
          editAs: 'oneCell'
        });
      } catch (logoError) {
        console.warn('Could not load logo:', logoError);
      }
  
      // Add company header information
      worksheet.mergeCells('C1:K1');
      worksheet.getCell('C1').value = `Payroll Cut-off: ${exportData.period}`;
      worksheet.getCell('C1').font = { bold: true, size: 12 };
      worksheet.getCell('C1').alignment = { horizontal: 'left', vertical: 'middle' };
  
      worksheet.mergeCells('C2:K2');
      worksheet.getCell('C2').value = `Payroll Period: ${new Date().toLocaleDateString()}`;
      worksheet.getCell('C2').font = { bold: true, size: 12 };
      worksheet.getCell('C2').alignment = { horizontal: 'left', vertical: 'middle' };
  
      // Add some spacing
      worksheet.getRow(6).height = 20;
  
      // Define the detailed header structure (starting from row 8)
      const headerStartRow = 8;
      const headers = [
        // First row - main headers
        [
          'No.', 'Employee ID', 'Employee Name', 'Monthly', 'Semi-Monthly', 'Rate Per Day', 'Rate Per Hour', 'Rate Per Minute',
          'Non-taxable Allowances', '', '', 'Training Days', 'Regular Holiday', '', '', 'Regular Holiday + Overtime', '', '',
          'Regular Holiday + Night Differential', '', '', 'Regular Holiday + OT + ROT', '', '', 'Special Holiday', '', '',
          'Special Holiday + Overtime', '', '', 'Special Holiday + Night Differential', '', '', 'Special Holiday + ROT', '', '',
          'Special Holiday + ROT + OT', '', '', 'Special Holiday + ROT + ND', '', '', 'Total Holiday Pay',
          'Regular OT', '', '', 'Regular OT - Night Diff', '', '', 'Rest Day OT', '', '', 'Rest Day OT + OT', '', '',
          'Rest Day + Night Differential', '', '', 'Total OT Pay', 'Gross Pay',
          'Undertime / Late', '', 'Absences', '', 'Total Deduction',
          'Government Mandatory Contribution', '', '', '', 'Other Deductions', '', '', '', '', 'Net Pay'
        ],
        // Second row - sub headers
        [
          '', '', '', 'Basic Pay', 'Basic Pay', '', '', '',
          'Site Allowance', 'Transpo Allowance', 'Total Allowance', '', 'RH RATE', '# HRS', 'RH AMOUNT',
          'RH - OT RATE', '# HRS', 'RH-OT AMOUNT', 'RH+ND RATE', '# HRS', 'RH+ND AMOUNT',
          'RH/ROT/OT RATE', '# HRS', 'RH/ROT/OT AMOUNT', 'SH RATE', '# HRS', 'SH AMOUNT',
          'SH - OT RATE', '# HRS', 'SH-OT AMOUNT', 'SH+ND RATE', '# HRS', 'SH+ND AMOUNT',
          'SH-ROT RATE', '# HRS', 'SH-ROT AMOUNT', 'SH/ROT/OT RATE', '# HRS', 'SH/ROT/OT AMOUNT',
          'SH/ROT/ND RATE', '# HRS', 'SH/ROT/ND AMOUNT', '',
          'OT Rate', '# HRS', 'OT Amount', 'OT - ND Rate', '# HRS', 'ND Amount', 
          'ROT RATE', '# HRS', 'ROT AMOUNT', 'ROT + OT RATE', '# HRS', 'ROT + OT AMOUNT', 
          'ROT + ND RATE', '# HRS', 'ROT + ND AMOUNT', '', '',
          'Undertime/Late #mins', 'Undertime/Late Amount', 'Absences #days', 'Absences Amount', '',
          'SSS', 'PHIC', 'HDMF', 'TAX', 'SSS LOAN', 'HDMF LOAN', 'TEED', 'STAFF HOUSE', 'CASH ADVANCE', ''
        ]
      ];
  
      // Add headers to worksheet starting from row 8
      headers.forEach((row, index) => {
        const targetRow = headerStartRow + index;
        row.forEach((cell, colIndex) => {
          worksheet.getCell(targetRow, colIndex + 1).value = cell;
        });
      });
  
      // Add employee data starting from row 10
      let dataStartRow = headerStartRow + 2;
      exportData.employees.forEach((employee, index) => {
        const comp = employee.computation || {};
        const rowData = [
          index + 1, // No. column
          employee.employee_id,
          employee.employee_name,
          comp.basic_pay_monthly || '-',
          comp.basic_pay_semi_monthly || '-',
          comp.rate_per_day || '-',
          comp.rate_per_hour || '-',
          comp.rate_per_minute || '-',
          comp.site_allowance || '-',
          comp.transportation_allowance || '-',
          comp.total_allowances || '-',
          comp.training_days || '-',
          comp.travel_time_hours || '-',
          comp.travel_time_amount || '-',
          comp.regular_holiday_rate || '-',
          comp.regular_holiday_hours || '-', // Hours - no currency
          comp.regular_holiday_amount || '-',
          comp.regular_holiday_ot_rate || '-',
          comp.regular_holiday_ot_hours || '-', // Hours - no currency
          comp.regular_holiday_ot_amount || '-',
          comp.regular_holiday_nd_rate || '-',
          comp.regular_holiday_nd_hours || '-', // Hours - no currency
          comp.regular_holiday_nd_amount || '-',
          comp.regular_holiday_rot_rate || '-',
          comp.regular_holiday_rot_hours || '-', // Hours - no currency
          comp.regular_holiday_rot_amount || '-',
          comp.special_holiday_rate || '-',
          comp.special_holiday_hours || '-', // Hours - no currency
          comp.special_holiday_amount || '-',
          comp.special_holiday_ot_rate || '-',
          comp.special_holiday_ot_hours || '-', // Hours - no currency
          comp.special_holiday_ot_amount || '-',
          comp.special_holiday_nd_rate || '-',
          comp.special_holiday_nd_hours || '-', // Hours - no currency
          comp.special_holiday_nd_amount || '-',
          comp.special_holiday_rot_rate || '-',
          comp.special_holiday_rot_hours || '-', // Hours - no currency
          comp.special_holiday_rot_amount || '-',
          comp.special_holiday_rot_ot_rate || '-',
          comp.special_holiday_rot_ot_hours || '-', // Hours - no currency
          comp.special_holiday_rot_ot_amount || '-',
          comp.special_holiday_rot_nd_rate || '-',
          comp.special_holiday_rot_nd_hours || '-', // Hours - no currency
          comp.special_holiday_rot_nd_amount || '-',
          comp.total_holiday_pay || '-',
          comp.regular_ot_rate || '-',
          comp.regular_ot_hours || '-', // Hours - no currency
          comp.regular_ot_amount || '-',
          comp.regular_ot_nd_rate || '-',
          comp.regular_ot_nd_hours || '-', // Hours - no currency
          comp.regular_ot_nd_amount || '-',
          comp.rest_day_ot_rate || '-',
          comp.rest_day_ot_hours || '-', // Hours - no currency
          comp.rest_day_ot_amount || '-',
          comp.rest_day_ot_plus_ot_rate || '-',
          comp.rest_day_ot_plus_ot_hours || '-', // Hours - no currency
          comp.rest_day_ot_plus_ot_amount || '-',
          comp.rest_day_nd_rate || '-',
          comp.rest_day_nd_hours || '-', // Hours - no currency
          comp.rest_day_nd_amount || '-',
          comp.total_overtime_pay || '-',
          comp.gross_pay || '-',
          comp.late_undertime_minutes || '-',
          comp.late_undertime_amount || '-',
          comp.absences_days || '-',
          comp.absences_amount || '-',
          comp.total_deductions || '-',
          comp.sss_contribution || '-',
          comp.phic_contribution || '-',
          comp.hdmf_contribution || '-',
          comp.tax_amount || '-',
          comp.sss_loan || '-',
          comp.hdmf_loan || '-',
          comp.teed || '-',
          comp.staff_house || '-',
          comp.cash_advance || '-',
          comp.net_pay || '-'
        ];
        
        const targetRow = dataStartRow + index;
        rowData.forEach((cell, colIndex) => {
          worksheet.getCell(targetRow, colIndex + 1).value = cell;
        });
      });
  
      // Merge cells for grouped headers
      const merges = [
        // No., Employee ID and Name (span both header rows)
        `A${headerStartRow}:A${headerStartRow + 1}`, 
        `B${headerStartRow}:B${headerStartRow + 1}`, 
        `C${headerStartRow}:C${headerStartRow + 1}`,
        
        // Monthly and Semi-Monthly Basic Pay
        `D${headerStartRow}:D${headerStartRow + 1}`,
        `E${headerStartRow}:E${headerStartRow + 1}`,
        
        // Rate columns
        `F${headerStartRow}:F${headerStartRow + 1}`, 
        `G${headerStartRow}:G${headerStartRow + 1}`, 
        `H${headerStartRow}:H${headerStartRow + 1}`,
        
        // Non-taxable Allowances
        `I${headerStartRow}:K${headerStartRow}`,
        
        // Training Days
        `L${headerStartRow}:L${headerStartRow + 1}`,
        
        // Regular Holiday
        `M${headerStartRow}:O${headerStartRow}`,
        // Regular Holiday + Overtime
        `P${headerStartRow}:R${headerStartRow}`,
        // Regular Holiday + Night Differential
        `S${headerStartRow}:U${headerStartRow}`,
        // Regular Holiday + OT + ROT
        `V${headerStartRow}:X${headerStartRow}`,
        
        // Special Holiday
        `Y${headerStartRow}:AA${headerStartRow}`,
        // Special Holiday + Overtime
        `AB${headerStartRow}:AD${headerStartRow}`,
        // Special Holiday + Night Differential
        `AE${headerStartRow}:AG${headerStartRow}`,
        // Special Holiday + ROT
        `AH${headerStartRow}:AJ${headerStartRow}`,
        // Special Holiday + ROT + OT
        `AK${headerStartRow}:AM${headerStartRow}`,
        // Special Holiday + ROT + ND
        `AN${headerStartRow}:AP${headerStartRow}`,
        
        // Total Holiday Pay
        `AQ${headerStartRow}:AQ${headerStartRow + 1}`,
        
        // Regular OT
        `AR${headerStartRow}:AT${headerStartRow}`,
        // Regular OT - Night Diff
        `AU${headerStartRow}:AW${headerStartRow}`,
        
        // REST DAY COLUMNS (NEW)
        // Rest Day OT
        `AX${headerStartRow}:AZ${headerStartRow}`,
        // Rest Day OT + OT
        `BA${headerStartRow}:BC${headerStartRow}`,
        // Rest Day + Night Differential
        `BD${headerStartRow}:BF${headerStartRow}`,
        
        // Total OT Pay (shifted)
        `BG${headerStartRow}:BG${headerStartRow + 1}`,
        // Gross Pay (shifted)
        `BH${headerStartRow}:BH${headerStartRow + 1}`,
        
        // Undertime / Late (shifted)
        `BI${headerStartRow}:BJ${headerStartRow}`,
        // Absences (shifted)
        `BK${headerStartRow}:BL${headerStartRow}`,
        // Total Deduction (shifted)
        `BM${headerStartRow}:BM${headerStartRow + 1}`,
        
        // Government Mandatory Contribution (shifted)
        `BN${headerStartRow}:BQ${headerStartRow}`,
        // Other Deductions (shifted)
        `BR${headerStartRow}:BV${headerStartRow}`,
        // Net Pay (shifted)
        `BW${headerStartRow}:BW${headerStartRow + 1}`
      ];
  
      // Apply merges
      merges.forEach(merge => {
        try {
          worksheet.mergeCells(merge);
        } catch (e) {
          console.warn('Could not merge cells:', merge);
        }
      });
  
      // Style the headers
      for (let row = headerStartRow; row <= headerStartRow + 1; row++) {
        worksheet.getRow(row).eachCell((cell, colNumber) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFF' }
          };
          cell.font = {
            bold: true,
            size: 12
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
          };
          cell.border = {
            top: { style: 'medium' },
            left: { style: 'medium' },
            bottom: { style: 'medium' },
            right: { style: 'medium' }
          };
        });
      }
  
      // Style data rows
      const lastDataRow = dataStartRow + exportData.employees.length - 1;
      for (let row = dataStartRow; row <= lastDataRow; row++) {
        worksheet.getRow(row).height = 25;
        worksheet.getRow(row).eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'right'
          };
          cell.font = {
            size: 12  // Add this line - change 12 to whatever size you want
          };
          cell.border = {
            top: { style: 'medium' },
            left: { style: 'medium' },
            bottom: { style: 'medium' },
            right: { style: 'medium' }
          };
          
          // Format currency columns (Monthly Basic Pay onwards)
          if (colNumber >= 4) {
            // Skip formatting for hours columns
            const hoursColumns = [14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 45, 48, 51, 54, 57, 61, 63]; // Days and minutes columns
            if (!hoursColumns.includes(colNumber)) {
              cell.numFmt = '"₱"#,##0.00';
            }
          }
        });
      }


 
  
      // Set column widths
      worksheet.getColumn('A').width = 5;   // No.
      worksheet.getColumn('B').width = 12;  // Employee ID
      worksheet.getColumn('C').width = 30;  // Employee Name
      worksheet.getColumn('F').width = 13;  // Rate Per Day
      worksheet.getColumn('G').width = 15;  // Rate Per Hour
      worksheet.getColumn('H').width = 19;  // Rate Per Minute
      worksheet.getColumn('AQ').width = 14;  // TOTAL HOLIDAY PAY
      worksheet.getColumn('BM').width = 14;  // TOTAL DEDUCTION
      worksheet.getColumn('BW').width = 15;  // Net pay
            



      //Text Alignment
      for (let row = 10; row <= worksheet.rowCount; row++) {
        worksheet.getCell(`A${row}`).alignment = { horizontal: 'left', vertical: 'middle' };
      }

      for (let row = 10; row <= worksheet.rowCount; row++) {
        worksheet.getCell(`B${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
      }

      for (let row = 10; row <= worksheet.rowCount; row++) {
        worksheet.getCell(`C${row}`).alignment = { horizontal: 'left', vertical: 'middle' };
      }








      //Borders
      //for (let row = 1; row <= 36; row++) {
        //worksheet.getCell(`B${row}`).border = { left: { style: 'medium' } };
      //}


  
      // Set other columns

      for (let i = 4; i <= 5; i++) {
        worksheet.getColumn(i).width = 20;
      }
      
      // Set allowance columns
      for (let i = 9; i <= 11; i++) {
        worksheet.getColumn(i).width = 15;
      }
      
      // Set holiday columns (13-42)
      for (let i = 13; i <= 42; i++) {
        worksheet.getColumn(i).width = 13;
      }
      
      // Set Training Days column
      worksheet.getColumn(12).width = 13;
      
      // Set Total Holiday Pay
      worksheet.getColumn(43).width = 14;
      
      // Set Regular OT columns (44-49)
      for (let i = 44; i <= 49; i++) {
        worksheet.getColumn(i).width = 13;
      }
      
      // Set Rest Day columns (50-58)
      for (let i = 50; i <= 58; i++) {
        worksheet.getColumn(i).width = 13;
      }
      
      // Set Total OT Pay and Gross Pay
  
      
      // Set Undertime/Late and Absences columns
      for (let i = 59; i <= 66; i++) {
        worksheet.getColumn(i).width = 15;
      }
      
      // Set Government and Other Deductions
      for (let i = 67; i <= 75; i++) {
        worksheet.getColumn(i).width = 15;
      }
      
      // Set specific widths for hours columns to make them smaller
      const hoursColumnNumbers = [14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 45, 48, 51, 54, 57];
      hoursColumnNumbers.forEach(colNum => {
        worksheet.getColumn(colNum).width = 7; // Smaller width for hours columns
      });

      
  
      // Set row heights
      worksheet.getRow(headerStartRow).height = 45;
      worksheet.getRow(headerStartRow + 1).height = 50;
  
      // Generate filename and save
      const filename = `Payroll_${exportData.period.replace(/\s/g, '_')}_${exportData.generated_date}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  
    } catch (error) {
      console.error('Excel export error:', error);
      throw error;
    }
  };

  // NEW FUNCTION - Add this, don't replace exportToExcel
  // REPLACE the existing exportPayslipsToExcel function with this updated version
const exportPayslipsToExcel = async (employeesData) => {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // Create separate sheets for each employee with both copies on same sheet
    for (const employee of employeesData) {
      const comp = employee.computation || {};
      
      // Create one sheet per employee with both Employee and Employer copies
      const sheet = workbook.addWorksheet(`${employee.employee_id || employee.emp_id}_Payslip`);
      await createCombinedPayslipSheet(sheet, employee, comp);
    }
    
    // Generate filename and save
    const filename = `Payslips_${currentPeriod?.display_period.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Payslip export error:', error);
    throw error;
  }
};

const createCombinedPayslipSheet = async (worksheet, employee, comp) => {
  // Set page setup for printing
  worksheet.pageSetup = {
    paperSize: 1, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 2, // Allow 2 pages vertically (employee copy + employer copy)
    margins: {
      left: 1.10236220472441,
      right: 0.708661417322835,
      top: 0.748031496062992,
      bottom: 0.748031496062992,
      header: 0.31496062992126,
      footer: 0.31496062992126
    },
    printArea: 'B1:H69', // Define print area
    horizontalDpi: 300,
    verticalDpi: 300
  };

  // Add manual page break after employee copy (row 36)
  worksheet.getRow(37).pageBreak = true;

  // Set column widths first
  worksheet.getColumn('A').width = 1.77;
  worksheet.getColumn('B').width = 27;
  worksheet.getColumn('C').width = 7;
  worksheet.getColumn('D').width = 27;
  worksheet.getColumn('E').width = 5;
  worksheet.getColumn('F').width = 27;
  worksheet.getColumn('G').width = 7;
  worksheet.getColumn('H').width = 27;

  // Set all row heights to 15
  for (let i = 1; i <= 71; i++) {
    worksheet.getRow(i).height = 15;
  }

  // Add logo (rows 1-3, column B)
  try {
    const response = await fetch(difsyslogo);
    const arrayBuffer = await response.arrayBuffer();
    
    const imageId = worksheet.workbook.addImage({
      buffer: arrayBuffer,
      extension: 'png',
    });
    
    worksheet.addImage(imageId, {
      tl: { col: 1.99, row: 0.2 }, // Centered in column B with some top padding
      ext: { width: 100.52, height: 60.16 }, // 0.66" width × 0.53" height (72 DPI)
      editAs: 'oneCell'
    });
  } catch (logoError) {
    console.warn('Could not load logo:', logoError);
  }

  // ===== EMPLOYEE COPY (Rows 1-36) =====
  
  // F1:H1 - Employee Copy header
  worksheet.mergeCells('F1:H1');
  worksheet.getCell('F1').value = 'EMPLOYEE COPY';
  worksheet.getCell('F1').font = { bold: true, size: 12 };
  worksheet.getCell('F1').alignment = { horizontal: 'center', vertical: 'middle' };

  // C3:E3 - EMPLOYEE PAYSLIP
  worksheet.mergeCells('C3:E3');
  worksheet.getCell('C3').value = 'EMPLOYEE PAYSLIP';
  worksheet.getCell('C3').font = { bold: true, size: 12 };
  worksheet.getCell('C3').alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Employee Copy alignment (C4-C8)
  for (let row = 4; row <= 32; row++) {
    worksheet.getCell(`C${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  for (let row = 9; row <= 32; row++) {
    worksheet.getCell(`D${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Employee information section (B4-B8 labels, C4:D8 merged values)
  const employeeInfo = [
    { row: 4, label: 'Payroll Period', value: currentPeriod?.display_period || 'N/A' },
    { row: 5, label: 'Employee Number', value: employee.employee_id || `DIF${String(employee.emp_id).padStart(3, '0')}` },
    { row: 6, label: 'Employee Name', value: employee.employee_name || `${employee.firstName} ${employee.lastName}` },
    { row: 7, label: 'Date Hired', value: '02-Jun-25' },
    { row: 8, label: 'Position', value: employee.position || 'N/A' }
  ];

  employeeInfo.forEach(info => {
    worksheet.getCell(`B${info.row}`).value = info.label;
    worksheet.mergeCells(`C${info.row}:D${info.row}`);
    worksheet.getCell(`C${info.row}`).value = info.value;
  });

  // Account numbers (F4-F7 labels, G4:H7 merged values)
  const accountInfo = [
    { row: 4, label: 'TIN', value: employee.tax_account || '#N/A' },
    { row: 5, label: 'SSS Number', value: employee.sss_account || '#N/A' },
    { row: 6, label: 'PhilHealth Number', value: employee.phic_account || '#N/A' },
    { row: 7, label: 'Pag-IBIG Number', value: employee.hdmf_account || '#N/A' }
  ];

  for (let row = 4; row <= 7; row++) {
    worksheet.getCell(`G${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  accountInfo.forEach(info => {
    worksheet.getCell(`F${info.row}`).value = info.label;
    worksheet.mergeCells(`G${info.row}:H${info.row}`);
    worksheet.getCell(`G${info.row}`).value = info.value;
  });

  // B9 - Basic Semi Monthly Salary label and colon
  worksheet.getCell('B9').value = 'Basic Semi Monthly Salary';
  worksheet.getCell('B9').font = { bold: true };
  worksheet.getCell('C9').value = ':';
  worksheet.getCell('C9').font = { bold: true };
  worksheet.getCell('B9').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('D9').value = comp.basic_pay_semi_monthly || '#N/A';
  worksheet.getCell('D9').font = { bold: true };
  if (comp.basic_pay_semi_monthly) {
    worksheet.getCell('D9').numFmt = '"₱"#,##0.00';
  }

  // B10-B17 - Earnings section
  const earningsLabels = [
    'ADD',
    'Regular Overtime', 
    'Night Differential',
    'Rest Day Overtime',
    'Rest Day OT (Beyond 8hrs)',
    'Rest Day OT + Night Diff',
    'Site Allowance',
    'Salary Adjustment'
  ];

  earningsLabels.forEach((label, index) => {
    const row = 10 + index;
    worksheet.getCell(`B${row}`).value = label;
    
    if (index === 0) { // ADD row - add HRS header
      worksheet.getCell(`C${row}`).value = 'HRS';
      worksheet.getCell(`C${row}`).font = { bold: true };
      worksheet.getCell(`C${row}`).alignment = { horizontal: 'center' };
    } else if (index >= 1 && index <= 5) { // Overtime entries
      const overtimeData = {
        1: { hours: comp.regular_ot_hours, amount: comp.regular_ot_amount },
        2: { hours: comp.regular_ot_nd_hours, amount: comp.regular_ot_nd_amount },
        3: { hours: comp.rest_day_ot_hours, amount: comp.rest_day_ot_amount },
        4: { hours: comp.rest_day_ot_plus_ot_hours, amount: comp.rest_day_ot_plus_ot_amount },
        5: { hours: comp.rest_day_nd_hours, amount: comp.rest_day_nd_amount }
      };
      
      worksheet.getCell(`C${row}`).value = overtimeData[index]?.hours || '#N/A';
      worksheet.getCell(`C${row}`).alignment = { horizontal: 'center' };
      
      const amount = overtimeData[index]?.amount || '#N/A';
      worksheet.getCell(`D${row}`).value = amount;
      if (amount !== '#N/A') {
        worksheet.getCell(`D${row}`).numFmt = '"₱"#,##0.00';
      }
    } else if (index === 6) { // Site Allowance
      const allowance = comp.site_allowance || '#N/A';
      worksheet.getCell(`D${row}`).value = allowance;
      if (allowance !== '#N/A') {
        worksheet.getCell(`D${row}`).numFmt = '"₱"#,##0.00';
      }
    }
  });

  // F9-F20 - Holiday Pay section
  worksheet.getCell('F9').value = 'Holiday Pay';
  worksheet.getCell('F9').font = { bold: true };
  worksheet.getCell('F9').alignment = { horizontal: 'left', vertical: 'middle' };

  const holidayLabels = [
    'Regular Holiday',
    'Regular Holiday + Overtime', 
    'Regular Holiday + Night Diff',
    'Regular Holiday + ROT',
    'Regular Holiday + ROT + OT',
    'Special Holiday',
    'Special Holiday + Overtime',
    'Special Holiday + Night Diff',
    'Special Holiday + ROT',
    'SH + ROT (Beyond 8hrs)',
    'SH + ROT + ND'
  ];

  const holidayData = [
    { hours: comp.regular_holiday_hours, amount: comp.regular_holiday_amount },
    { hours: comp.regular_holiday_ot_hours, amount: comp.regular_holiday_ot_amount },
    { hours: comp.regular_holiday_nd_hours, amount: comp.regular_holiday_nd_amount },
    { hours: 0, amount: 0 }, // Regular Holiday + ROT
    { hours: comp.regular_holiday_rot_ot_hours, amount: comp.regular_holiday_rot_ot_amount },
    { hours: comp.special_holiday_hours, amount: comp.special_holiday_amount },
    { hours: comp.special_holiday_ot_hours, amount: comp.special_holiday_ot_amount },
    { hours: comp.special_holiday_nd_hours, amount: comp.special_holiday_nd_amount },
    { hours: comp.special_holiday_rot_ot_hours, amount: comp.special_holiday_rot_ot_amount },
    { hours: 0, amount: 0 }, // SH + ROT (Beyond 8hrs)
    { hours: comp.special_holiday_rot_nd_hours, amount: comp.special_holiday_rot_nd_amount }
  ];

  holidayLabels.forEach((label, index) => {
    const row = 10 + index;
    worksheet.getCell(`F${row}`).value = label;
    
    const hours = holidayData[index]?.hours || '#N/A';
    worksheet.getCell(`G${row}`).value = hours;
    worksheet.getCell(`G${row}`).alignment = { horizontal: 'center' };
    
    const amount = holidayData[index]?.amount || '#N/A';
    worksheet.getCell(`H${row}`).value = amount;
    if (amount !== '#N/A' && amount !== 0) {
      worksheet.getCell(`H${row}`).numFmt = '"₱"#,##0.00';
    }

    for (let row = 10; row <= 32; row++) {
      worksheet.getCell(`H${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  // H22 - Total Gross with thick top border
  worksheet.getCell('F22').value = 'Total Gross';
  worksheet.getCell('F22').font = { bold: true };
  const grossPay = comp.gross_pay || '#N/A';
  worksheet.getCell('H22').value = grossPay;
  if (grossPay !== '#N/A') {
    worksheet.getCell('H22').numFmt = '"₱"#,##0.00';
  }
  worksheet.getCell('H22').font = { bold: true };
  worksheet.getCell('H22').border = { top: { style: 'thin' } };

  // B23:B24 - Deductions header (merged)
  worksheet.mergeCells('B23:B24');
  worksheet.getCell('B23').value = 'Deductions';
  worksheet.getCell('B23').font = { bold: true, size: 11 };
  worksheet.getCell('B23').alignment = { vertical: 'middle' };

  // B25-B30 - Deduction items
  const deductionLabels = [
    'Absences',
    'Undertime', 
    'SSS Contribution',
    'PHIC Contribution',
    'HDMF Contribution',
    'Withholding TAX'
  ];

  const deductionData = [
    comp.absences_amount,
    comp.late_undertime_amount,
    comp.sss_contribution,
    comp.phic_contribution, 
    comp.hdmf_contribution,
    comp.tax_amount
  ];

  deductionLabels.forEach((label, index) => {
    const row = 25 + index;
    worksheet.getCell(`B${row}`).value = label;
    
    const amount = deductionData[index] || '#N/A';
    worksheet.getCell(`D${row}`).value = amount;
    if (amount !== '#N/A' && amount !== 0) {
      worksheet.getCell(`D${row}`).numFmt = '"₱"#,##0.00';
    }
  });

  // F25-F29 - Other deductions
  const otherDeductionLabels = [
    'SSS Loan',
    'HDMF Loan',
    'TEED', 
    'Staff House Rent - May',
    'Cash Advance'
  ];

  const otherDeductionData = [
    comp.sss_loan,
    comp.hdmf_loan,
    comp.teed,
    comp.staff_house,
    comp.cash_advance
  ];

  otherDeductionLabels.forEach((label, index) => {
    const row = 25 + index;
    worksheet.getCell(`F${row}`).value = label;
    
    const amount = otherDeductionData[index] || '#N/A';  
    worksheet.getCell(`H${row}`).value = amount;
    if (amount !== '#N/A' && amount !== 0) {
      worksheet.getCell(`H${row}`).numFmt = '"₱"#,##0.00';
    }
  });

  // H29 - Bottom thick border for deductions section
  worksheet.getCell('H29').border = { bottom: { style: 'thin' }, right: { style: 'thick' } };

  // F30 - Total Deductions
  worksheet.getCell('F30').value = 'Total Deductions';
  worksheet.getCell('F30').font = { bold: true };
  const totalDeductions = comp.total_deductions || '#N/A';
  worksheet.getCell('H30').value = totalDeductions;
  if (totalDeductions !== '#N/A') {
    worksheet.getCell('H30').numFmt = '"₱"#,##0.00';
  }
  worksheet.getCell('H30').font = { bold: true };

  // F32 - Total Net Pay
  worksheet.getCell('F32').value = 'Total Net Pay';
  worksheet.getCell('F32').font = { bold: true, size: 12 };
  const netPay = comp.net_pay || '#N/A';
  worksheet.getCell('H32').value = netPay;
  if (netPay !== '#N/A') {
    worksheet.getCell('H32').numFmt = '"₱"#,##0.00';
  }
  worksheet.getCell('H32').font = { bold: true, size: 12 };

  // B33:H36 - Footer text (merged) - EMPLOYEE COPY ONLY
  worksheet.mergeCells('B33:H36');
  worksheet.getCell('B33').value = 'This document generated by the company under no circumstances is to be amended, deleted or otherwise tampered with. In the event of any amendment, deletion or tampering, the company will treat the same with utmost severity and will proceed to act to the full extent of the law. This statement constitutes a record of your earnings and deductions. Please report any discrepancies to the management immediately.';
  worksheet.getCell('B33').font = { size: 8 };
  worksheet.getCell('B33').alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

  // ===== ROW 37 GAP =====
  worksheet.getRow(37).height = 5;

  // ===== EMPLOYER COPY (Rows 38-73) =====
  
  // Add logo for employer copy (rows 38-40, column B)
  try {
    const response = await fetch(difsyslogo);
    const arrayBuffer = await response.arrayBuffer();
    
    const imageId2 = worksheet.workbook.addImage({
      buffer: arrayBuffer,
      extension: 'png',
    });
    
    worksheet.addImage(imageId2, {
      tl: { col: 1.99, row: 37.2 }, // Centered in column B with some top padding
      ext: { width: 95.52, height: 60.16 }, // 0.66" width × 0.53" height (72 DPI)
      editAs: 'oneCell'
    });
  } catch (logoError) {
    console.warn('Could not load employer copy logo:', logoError);
  }
  
  // F38:H38 - Employer Copy header  
  worksheet.mergeCells('F38:H38');
  worksheet.getCell('F38').value = 'EMPLOYER COPY';
  worksheet.getCell('F38').font = { bold: true, size: 12 };
  worksheet.getCell('F38').alignment = { horizontal: 'center', vertical: 'middle' };

  // C40:E40 - EMPLOYEE PAYSLIP
  worksheet.mergeCells('C40:E40');
  worksheet.getCell('C40').value = 'EMPLOYEE PAYSLIP';
  worksheet.getCell('C40').font = { bold: true, size: 12 };
  worksheet.getCell('C40').alignment = { horizontal: 'center', vertical: 'middle' };

  // Employer copy alignment (C41-C45)
  for (let row = 41; row <= 45; row++) {
    worksheet.getCell(`C${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  for (let row = 46; row <= 69; row++) {
    worksheet.getCell(`D${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  for (let row = 41; row <= 44; row++) {
    worksheet.getCell(`G${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  for (let row = 47; row <= 69; row++) {
    worksheet.getCell(`H${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Employer copy employee information (B41-B45)
  employeeInfo.forEach((info, index) => {
    const row = 41 + index;
    worksheet.getCell(`B${row}`).value = info.label;
    worksheet.mergeCells(`C${row}:D${row}`);
    worksheet.getCell(`C${row}`).value = info.value;
  });

  // Employer copy account numbers (F41-F44)
  accountInfo.forEach((info, index) => {
    const row = 41 + index;
    worksheet.getCell(`F${row}`).value = info.label;
    worksheet.mergeCells(`G${row}:H${row}`);
    worksheet.getCell(`G${row}`).value = info.value;
  });

  // B46 - Basic Semi Monthly Salary (employer copy)
  worksheet.getCell('B46').value = 'Basic Semi Monthly Salary';
  worksheet.getCell('B46').font = { bold: true };
  worksheet.getCell('C46').value = ':';
  worksheet.getCell('C46').font = { bold: true };
  worksheet.getCell('B46').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('D46').value = comp.basic_pay_semi_monthly || '#N/A';
  worksheet.getCell('D46').font = { bold: true };
  if (comp.basic_pay_semi_monthly) {
    worksheet.getCell('D46').numFmt = '"₱"#,##0.00';
  }

  // B47-B54 - Earnings section (employer copy)
  earningsLabels.forEach((label, index) => {
    const row = 47 + index;
    worksheet.getCell(`B${row}`).value = label;
    
    if (index === 0) { // ADD row
      worksheet.getCell(`C${row}`).value = 'HRS';
      worksheet.getCell(`C${row}`).font = { bold: true };
      worksheet.getCell(`C${row}`).alignment = { horizontal: 'center' };
    } else if (index >= 1 && index <= 5) { // Overtime entries
      const overtimeData = {
        1: { hours: comp.regular_ot_hours, amount: comp.regular_ot_amount },
        2: { hours: comp.regular_ot_nd_hours, amount: comp.regular_ot_nd_amount },
        3: { hours: comp.rest_day_ot_hours, amount: comp.rest_day_ot_amount },
        4: { hours: comp.rest_day_ot_plus_ot_hours, amount: comp.rest_day_ot_plus_ot_amount },
        5: { hours: comp.rest_day_nd_hours, amount: comp.rest_day_nd_amount }
      };
      
      worksheet.getCell(`C${row}`).value = overtimeData[index]?.hours || '#N/A';
      worksheet.getCell(`C${row}`).alignment = { horizontal: 'center' };
      
      const amount = overtimeData[index]?.amount || '#N/A';
      worksheet.getCell(`D${row}`).value = amount;
      if (amount !== '#N/A') {
        worksheet.getCell(`D${row}`).numFmt = '"₱"#,##0.00';
      }
    } else if (index === 6) { // Site Allowance
      const allowance = comp.site_allowance || '#N/A';
      worksheet.getCell(`D${row}`).value = allowance;
      if (allowance !== '#N/A') {
        worksheet.getCell(`D${row}`).numFmt = '"₱"#,##0.00';
      }
    }
  });

  // F46-F57 - Holiday Pay section (employer copy)
  worksheet.getCell('F46').value = 'Holiday Pay';
  worksheet.getCell('F46').font = { bold: true };
  worksheet.getCell('F46').alignment = { horizontal: 'left', vertical: 'middle' };

  holidayLabels.forEach((label, index) => {
    const row = 47 + index;
    worksheet.getCell(`F${row}`).value = label;
    
    const hours = holidayData[index]?.hours || '#N/A';
    worksheet.getCell(`G${row}`).value = hours;
    worksheet.getCell(`G${row}`).alignment = { horizontal: 'center' };
    
    const amount = holidayData[index]?.amount || '#N/A';
    worksheet.getCell(`H${row}`).value = amount;
    if (amount !== '#N/A' && amount !== 0) {
      worksheet.getCell(`H${row}`).numFmt = '"₱"#,##0.00';
    }
  });

  // H59 - Total Gross (employer copy)
  worksheet.getCell('F59').value = 'Total Gross';
  worksheet.getCell('F59').font = { bold: true };
  worksheet.getCell('H59').value = grossPay;
  if (grossPay !== '#N/A') {
    worksheet.getCell('H59').numFmt = '"₱"#,##0.00';
  }
  worksheet.getCell('H59').font = { bold: true };

  // B60:B61 - Deductions header (employer copy)
  worksheet.mergeCells('B60:B61');
  worksheet.getCell('B60').value = 'Deductions';
  worksheet.getCell('B60').font = { bold: true, size: 11 };
  worksheet.getCell('B60').alignment = { vertical: 'middle' };

  // B62-B67 - Deduction items (employer copy)
  deductionLabels.forEach((label, index) => {
    const row = 62 + index;
    worksheet.getCell(`B${row}`).value = label;
    
    const amount = deductionData[index] || '#N/A';
    worksheet.getCell(`D${row}`).value = amount;
    if (amount !== '#N/A' && amount !== 0) {
      worksheet.getCell(`D${row}`).numFmt = '"₱"#,##0.00';
    }
  });

  // F62-F66 - Other deductions (employer copy)
  otherDeductionLabels.forEach((label, index) => {
    const row = 62 + index;
    worksheet.getCell(`F${row}`).value = label;
    
    const amount = otherDeductionData[index] || '#N/A';
    worksheet.getCell(`H${row}`).value = amount;
    if (amount !== '#N/A' && amount !== 0) {
      worksheet.getCell(`H${row}`).numFmt = '"₱"#,##0.00';
    }
  });

  // H66 - Bottom thick border for deductions section (employer copy)
  worksheet.getCell('H66').border = { bottom: { style: 'thin' }, right: { style: 'thick' } };

  // F67 - Total Deductions (employer copy)
  worksheet.getCell('F67').value = 'Total Deductions';
  worksheet.getCell('F67').font = { bold: true };
  worksheet.getCell('H67').value = totalDeductions;
  if (totalDeductions !== '#N/A') {
    worksheet.getCell('H67').numFmt = '"₱"#,##0.00';
  }
  worksheet.getCell('H67').font = { bold: true };

  // F69 - Total Net Pay (employer copy)
  worksheet.getCell('F69').value = 'Total Net Pay';
  worksheet.getCell('F69').font = { bold: true, size: 12 };
  worksheet.getCell('H69').value = netPay;
  if (netPay !== '#N/A') {
    worksheet.getCell('H69').numFmt = '"₱"#,##0.00';
  }
  worksheet.getCell('H69').font = { bold: true, size: 12 };

  // Apply borders
  // Left border for column B (rows 1-36)
  for (let row = 1; row <= 36; row++) {
    worksheet.getCell(`B${row}`).border = { left: { style: 'medium' } };
  }

  // Right border for column H (rows 1-36) 
  for (let row = 1; row <= 36; row++) {
    const currentBorder = worksheet.getCell(`H${row}`).border || {};
    worksheet.getCell(`H${row}`).border = { 
      ...currentBorder,
      right: { style: 'medium' } 
    };
  }

  // Left border for column B (rows 38-73) - employer copy
  for (let row = 38; row <= 69; row++) {
    worksheet.getCell(`B${row}`).border = { left: { style: 'medium' } };
  }

  for (let col = 2; col <= 8; col++) { // B=2, C=3, D=4, E=5, F=6, G=7, H=8
    const cell = worksheet.getCell(1, col);
    const currentBorder = cell.border || {};
    cell.border = {
      ...currentBorder,
      top: { style: 'thick' }
    };
  }


  for (let col = 2; col <= 8; col++) { // B=2, C=3, D=4, E=5, F=6, G=7, H=8
    const cell = worksheet.getCell(32, col);
    const currentBorder = cell.border || {};
    cell.border = {
      ...currentBorder,
      bottom: { style: 'medium' }
    };
  }

  for (let col = 2; col <= 8; col++) { // B=2, C=3, D=4, E=5, F=6, G=7, H=8
    const cell = worksheet.getCell(36, col);
    const currentBorder = cell.border || {};
    cell.border = {
      ...currentBorder,
      bottom: { style: 'medium' }
    };
  }

  for (let col = 2; col <= 8; col++) { // B=2, C=3, D=4, E=5, F=6, G=7, H=8
    const cell = worksheet.getCell(38, col);
    const currentBorder = cell.border || {};
    cell.border = {
      ...currentBorder,
      top: { style: 'medium' }
    };
  }

  // Right border for column H (rows 38-73) - employer copy
  for (let row = 38; row <= 69; row++) {
    const currentBorder = worksheet.getCell(`H${row}`).border || {};
    worksheet.getCell(`H${row}`).border = { 
      ...currentBorder,
      right: { style: 'medium' } 
    };
  }

  for (let col = 2; col <= 8; col++) { // B=2, C=3, D=4, E=5, F=6, G=7, H=8
    const cell = worksheet.getCell(69, col);
    const currentBorder = cell.border || {};
    cell.border = {
      ...currentBorder,
      bottom: { style: 'medium' }
    };
  }
};


  // View navigation functions
  const handleViewHistory = () => {
    setCurrentView('history');
    setCurrentPage(1);
  };

  const handleViewPayslipHistory = () => {
    setCurrentView('payslip_history');
    setCurrentPage(1);
  };

  const handleGeneratePayroll = () => {
    setCurrentView('generate');
    setCurrentPage(1);
  };

  const handleBackToEmployees = () => {
    setCurrentView('employees');
    setSelectedEmployees([]);
    setSelectAll(false);
    setCurrentPage(1);
  };

  const handleBackToPayrollHistory = () => {
    setCurrentView('history');
    setCurrentPage(1);
  };

  // Employee selection handlers
  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
    } else {
      const currentData = getCurrentData();
      setSelectedEmployees(currentData.map(emp => emp.emp_id));
    }
    setSelectAll(!selectAll);
  };

  // Update selectAll state when individual selections change
  useEffect(() => {
    const currentData = getCurrentData();
    setSelectAll(selectedEmployees.length === currentData.length && currentData.length > 0);
  }, [selectedEmployees, currentView]);

  // Modal handlers
  const handleViewDetail = async (employee) => {
    const detailedEmployee = await fetchEmployeePayrollDetails(employee.emp_id);
    if (detailedEmployee) {
      setSelectedEmployee(detailedEmployee);
      setShowDetailModal(true);
      setIsEditing(false);
      setEditedData({});
      setHasChanges(false);
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedEmployee(null);
    setIsEditing(false);
    setEditedData({});
    setHasChanges(false);
  };

  const handleViewAllEmployees = async () => {
    // Check if payroll is generated first
    const hasGeneratedPayroll = employees.some(emp => emp.status === 'Generated' || emp.status === 'Released');
    
    if (!hasGeneratedPayroll) {
      alert('Please Generate The Payroll First');
      return;
    }
    
    await fetchAllEmployeesPayroll();
    setModalCurrentPage(1); // ADD THIS LINE
    setShowAllEmployeesModal(true);
    setIsEditing(false);
    setEditedData({});
    setHasChanges(false);
  };

  const handleCloseAllEmployeesModal = () => {
    setShowAllEmployeesModal(false);
    setShowGeneratePreviewModal(false);
    setShowReleasePreviewModal(false);
    setIsEditing(false);
    setModalCurrentPage(1); // ADD THIS LINE
    setEditedData({});
    setHasChanges(false);
  };

  // Editing handlers
  const handleEdit = () => {
    setIsEditing(true);
    setEditedData({});
    setHasChanges(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
    setHasChanges(false);
  };

  const handleInputChange = (cellKey, value) => {
    console.log(`🔧 Input change: ${cellKey} = ${value}`);
    
    // Allow empty string for clearing the field
    let finalValue = value;
    if (value === '' || value === null || value === undefined) {
      finalValue = ''; // Keep as empty string while editing
    } else {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        console.warn('⚠️ Invalid numeric value:', value);
        return;
      }
      finalValue = numericValue;
    }
    
    setEditedData(prev => {
      const newData = {
        ...prev,
        [cellKey]: finalValue
      };
      console.log('📝 Updated editedData:', newData);
      return newData;
    });
    
    setHasChanges(true);
  };

  // Get current data based on view
  const getCurrentData = () => {
    switch (currentView) {
      case 'history':
        return payrollHistory;
      case 'payslip_history':
        return payslipHistory;
      default:
        return employees;
    }
  };

  // Pagination logic
  const currentData = getCurrentData();
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`gp-pagination-btn ${currentPage === i ? 'gp-pagination-active' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(
        <span key="dots" className="gp-pagination-dots">...</span>
      );
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`gp-pagination-btn ${currentPage === totalPages ? 'gp-pagination-active' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  // Utility functions
  const getInitials = (firstName, lastName) => {
    const first = (firstName || '').charAt(0).toUpperCase();
    const last = (lastName || '').charAt(0).toUpperCase();
    
    if (first && last) {
      return first + last;
    }
    
    if (first && !last) {
      const secondChar = (firstName || '').charAt(1).toUpperCase();
      return first + (secondChar || '');
    }
    
    if (!first && last) {
      return last;
    }
    
    return 'NA';
  };

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

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'gp-status-pending';
      case 'generated':
        return 'gp-status-generated';
      case 'released':
        return 'gp-status-released';
      case 'completed':
        return 'gp-status-completed';
      default:
        return 'gp-status-default';
    }
  };

  const renderEditableCell = (field, value, type = 'number', empId) => {
    // Define non-editable fields (rates and calculated amounts)
    const nonEditableFields = [
      'rate_per_day',
      'rate_per_hour', 
      'rate_per_minute',
      'total_holiday_pay',
      'total_overtime_pay',
      'gross_pay',
      'late_undertime_amount',
      'absences_amount', 
      'total_deductions',
      'travel_time_amount',
      'net_pay',
      // Holiday and overtime rates/amounts (calculated fields)
      'regular_holiday_rate', 'regular_holiday_amount',
      'regular_holiday_ot_rate', 'regular_holiday_ot_amount',
      'regular_holiday_nd_rate', 'regular_holiday_nd_amount',
      'regular_holiday_rot_ot_rate', 'regular_holiday_rot_ot_amount',
      'special_holiday_rate', 'special_holiday_amount',
      'special_holiday_ot_rate', 'special_holiday_ot_amount', 
      'special_holiday_nd_rate', 'special_holiday_nd_amount',
      'special_holiday_rot_rate', 'special_holiday_rot_amount',
      'special_holiday_rot_ot_rate', 'special_holiday_rot_ot_amount',
      'special_holiday_rot_nd_rate', 'special_holiday_rot_nd_amount',
      'regular_ot_rate', 'regular_ot_amount',
      'regular_ot_nd_rate', 'regular_ot_nd_amount',
      'rest_day_ot_rate', 'rest_day_ot_amount',
      'rest_day_ot_plus_ot_rate', 'rest_day_ot_plus_ot_amount',
      'rest_day_nd_rate', 'rest_day_nd_amount'
    ];
  
    // Check if this field should not be editable
    if (nonEditableFields.includes(field)) {
      if (type === 'currency') {
        return `₱${parseFloat(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      } else if (type === 'hours') {
        const hours = Math.floor((value || 0));
        return `${hours}h`;
      } else if (type === 'minutes') {
        const minutes = Math.floor((value || 0));
        return `${minutes}m`;
      }
      return value || 0;
    }
  
    // If not editing, display as read-only
    if (!isEditing) {
      if (type === 'currency') {
        return `₱${parseFloat(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      } else if (type === 'hours') {
        const hours = Math.floor((value || 0));
        return `${hours}h`;
      } else if (type === 'minutes') {
        const minutes = Math.floor((value || 0));
        return `${minutes}m`;
      }
      return value || 0;
    }
    
    // Create unique key for each cell
    const cellKey = `${empId}_${field}`;
    // CRITICAL FIX: Use the actual current value from the computation if no edit has been made
    const cellValue = editedData[cellKey] !== undefined ? editedData[cellKey] : (value || 0);
    
    return (
      <input
        type="number"
        step={type === 'currency' ? "0.01" : "1"}
        value={cellValue}
        onChange={(e) => handleInputChange(cellKey, e.target.value)}
        onFocus={(e) => {
          e.target.select();
        }}
        className="generate-payroll-editable-input"
        style={{
          width: '100%',
          padding: '4px 8px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'right'
        }}
      />
    );
  };

  const handleSaveAndExport = async () => {
    if (hasChanges) {
      await handleSave();
    }
    // Keep using existing exportToExcel for payroll
    await exportToExcel(prepareExportDataFromModal());
    handleCloseAllEmployeesModal();
  };
  
  const handleReleaseAndExport = async () => {
    try {
      setReleaseLoading(true);
      
      const response = await fetch(`${API_BASE_URL}?action=release_payslip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_employees: selectedEmployees
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Show progress message
        setSuccessMessage('Generating Excel and PDF files...');
        setShowSuccess(true);
        
        // Generate Excel first
        await exportPayslipsToExcel(selectedEmployeesPayroll);
        console.log('✅ Excel generation completed');
        
        // Generate PDFs
        const pdfCount = await generatePayslipPDFs(selectedEmployeesPayroll);
        console.log(`✅ PDF generation completed: ${pdfCount} files`);
        
        setSuccessMessage(`Payslips released successfully! Generated Excel files and ${pdfCount} PDF files.`);
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setShowSuccess(false), 5000);
        
        fetchEmployeesForPayroll();
        handleCloseAllEmployeesModal();
      } else {
        alert('Error releasing payslips: ' + data.message);
      }
    } catch (error) {
      console.error('Error releasing payslips:', error);
      alert('Error releasing payslips. Please try again.');
    } finally {
      setReleaseLoading(false);
    }
  };
  
  const prepareExportDataFromModal = () => {
    const employeeData = showGeneratePreviewModal ? selectedEmployeesPayroll : 
                        showReleasePreviewModal ? selectedEmployeesPayroll : allEmployeesPayroll;
    
    return {
      employees: employeeData.map(employee => ({
        employee_id: employee.employee_id || `DIF${String(employee.emp_id).padStart(3, '0')}`,
        employee_name: employee.employee_name || `${employee.firstName} ${employee.lastName}`,
        position: employee.position,
        computation: employee.computation
      })),
      period: currentPeriod?.display_period,
      generated_date: new Date().toISOString().split('T')[0]
    };
  };
  
  const generateEmployeePDFs = async () => {
    // This function will generate PDF versions for employees
    try {
      const response = await fetch(`${API_BASE_URL}?action=generate_employee_pdfs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_employees: selectedEmployees,
          payroll_period_id: currentPeriod?.id
        })
      });
      
      const data = await response.json();
      console.log('PDFs generated:', data);
    } catch (error) {
      console.error('Error generating PDFs:', error);
    }
  };

  // Render payroll table
  const renderPayrollTable = (employees = null) => {
    const employeeData = employees || [selectedEmployee];
    
    return (
      <div className="generate-payroll-payroll-table-container">
        <table className="generate-payroll-payroll-table">
          <thead>
            <tr>
              <th rowSpan="2">Employee ID</th>
              <th rowSpan="2">Employee Name</th>
              <th colSpan="1">Monthly</th>
              <th colSpan="1">Semi-Monthly</th>
              <th rowSpan="2">Rate Per Day</th>
              <th rowSpan="2">Rate Per Hour</th>
              <th rowSpan="2">Rate Per Minute</th>
              <th colSpan="3">Non-taxable Allowances</th>
              <th rowSpan="2">Training Days</th>
              <th rowSpan="2">Travel Time Hours</th>
              <th rowSpan="2">Travel Time Amount</th>
              <th colSpan="3">Regular Holiday</th>
              <th colSpan="3">Regular Holiday + Overtime</th>
              <th colSpan="3">Regular Holiday + Night Differential</th>
              <th colSpan="3">Regular Holiday + ROT + OT</th>
              <th colSpan="3">Special Holiday</th>
              <th colSpan="3">Special Holiday + Overtime</th>
              <th colSpan="3">Special Holiday + Night Differential</th>
              <th colSpan="3">Special Holiday + ROT</th>
              <th colSpan="3">Special Holiday + ROT + OT</th>
              <th colSpan="3">Special Holiday + ROT + ND</th>
              <th rowSpan="2">TOTAL HOLIDAY PAY</th>
              <th colSpan="3">Regular OT</th>
              <th colSpan="3">Regular OT - Night Diff</th>
              <th colSpan="3">Rest Day OT</th>
              <th colSpan="3">Rest Day OT + OT</th>
              <th colSpan="3">Rest Day + Night Differential</th>
              <th rowSpan="2">Total OT Pay</th>
              <th rowSpan="2">Gross Pay</th>
              <th colSpan="2">Undertime / Late</th>
              <th colSpan="2">Absences</th>
              <th rowSpan="2">Total Deduction</th>
              <th colSpan="4">Government Mandatory Contribution</th>
              <th colSpan="5">Other Deductions</th>
              <th rowSpan="2">Net Pay</th>
            </tr>
            <tr>
              <th className='gp-basic-pay'>Basic Pay</th>
              <th className='gp-basic-pay'>Basic Pay</th>
              <th>Site Allowance</th>
              <th>Transpo Allowance</th>
              <th>Total Allowance</th>
              <th>RH RATE</th>
              <th># HRS</th>
              <th>RH AMOUNT</th>
              <th>RH - OT RATE</th>
              <th># HRS</th>
              <th>RH-OT AMOUNT</th>
              <th>RH+ND RATE</th>
              <th># HRS</th>
              <th>RH+ND AMOUNT</th>
              <th>RH/ROT/OT RATE</th>
              <th># HRS</th>
              <th>RH/ROT/OT AMOUNT</th>
              <th>SH RATE</th>
              <th># HRS</th>
              <th>SH AMOUNT</th>
              <th>SH - OT RATE</th>
              <th># HRS</th>
              <th>SH-OT AMOUNT</th>
              <th>SH+ND RATE</th>
              <th># HRS</th>
              <th>SH+ND AMOUNT</th>
              <th>SH-ROT RATE</th>
              <th># HRS</th>
              <th>SH-ROT AMOUNT</th>
              <th>SH/ROT/OT RATE</th>
              <th># HRS</th>
              <th>SH/ROT/OT AMOUNT</th>
              <th>SH/ROT/ND RATE</th>
              <th># HRS</th>
              <th>SH/ROT/ND AMOUNT</th>
              <th>OT Rate</th>
              <th># HRS</th>
              <th>OT Amount</th>
              <th>OT - ND Rate</th>
              <th># HRS</th>
              <th>ND Amount</th>
              <th>ROT RATE</th>
              <th># HRS</th>
              <th>ROT AMOUNT</th>
              <th>ROT + OT RATE</th>
              <th># HRS</th>
              <th>ROT + OT AMOUNT</th>
              <th>ROT + ND RATE</th>
              <th># HRS</th>
              <th>ROT + ND AMOUNT</th>
              <th>Undertime/Late #mins</th>
              <th>Undertime/Late Amount</th>
              <th>Absences #days</th>
              <th>Absences Amount</th>
              <th>SSS</th>
              <th>PHIC</th>
              <th>HDMF</th>
              <th>TAX</th>
              <th>SSS LOAN</th>
              <th>HDMF LOAN</th>
              <th>TEED</th>
              <th>STAFF HOUSE</th>
              <th>CASH ADVANCE</th>
            </tr>
          </thead>
          <tbody>
            {employeeData.map((employee) => {
              const comp = employee.computation || {};
              // CRITICAL: Use the correct employee ID
              const empId = employee.emp_id || employee.id;
              
              return (
                <tr key={empId}>
                  {/* Employee Info */}
                  <td>{employee.employee_id || employee.empId}</td>
                  <td>
                      <div className="generate-payroll-employee-info">
                        {renderAvatar(employee)}
                        <div className="generate-payroll-name-details">
                          <div className="generate-payroll-name">{employee.firstName} {employee.lastName}</div>
                        </div>
                      </div>
                    </td>
                  
                  {/* Basic Pay Section */}
                  <td>{renderEditableCell('basic_pay_monthly', comp.basic_pay_monthly, 'currency', empId)}</td>
                  <td>{renderEditableCell('basic_pay_semi_monthly', comp.basic_pay_semi_monthly, 'currency', empId)}</td>
                  <td>{renderEditableCell('rate_per_day', comp.rate_per_day, 'currency', empId)}</td>
                  <td>{renderEditableCell('rate_per_hour', comp.rate_per_hour, 'currency', empId)}</td>
                  <td>{renderEditableCell('rate_per_minute', comp.rate_per_minute, 'currency', empId)}</td>
                  
                  {/* Allowances Section */}
                  <td>{renderEditableCell('site_allowance', comp.site_allowance, 'currency', empId)}</td>
                  <td>{renderEditableCell('transportation_allowance', comp.transportation_allowance, 'currency', empId)}</td>
                  <td>{renderEditableCell('total_allowances', comp.total_allowances, 'currency', empId)}</td>
                  <td>{renderEditableCell('training_days', comp.training_days, 'number', empId)}</td>
                  <td>{renderEditableCell('travel_time_hours', comp.travel_time_hours, 'number', empId)}</td>
                  <td>{renderEditableCell('travel_time_amount', comp.travel_time_amount, 'currency', empId)}</td>
                  
                  {/* Regular Holiday Section */}
                  <td>{renderEditableCell('regular_holiday_rate', comp.regular_holiday_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('regular_holiday_hours', comp.regular_holiday_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('regular_holiday_amount', comp.regular_holiday_amount, 'currency', empId)}</td>
                  
                  {/* Regular Holiday + Overtime */}
                  <td>{renderEditableCell('regular_holiday_ot_rate', comp.regular_holiday_ot_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('regular_holiday_ot_hours', comp.regular_holiday_ot_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('regular_holiday_ot_amount', comp.regular_holiday_ot_amount, 'currency', empId)}</td>
                  
                  {/* Regular Holiday + Night Differential */}
                  <td>{renderEditableCell('regular_holiday_nd_rate', comp.regular_holiday_nd_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('regular_holiday_nd_hours', comp.regular_holiday_nd_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('regular_holiday_nd_amount', comp.regular_holiday_nd_amount, 'currency', empId)}</td>
                  
                  {/* Regular Holiday + ROT + OT */}
                  <td>{renderEditableCell('regular_holiday_rot_ot_rate', comp.regular_holiday_rot_ot_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('regular_holiday_rot_ot_hours', comp.regular_holiday_rot_ot_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('regular_holiday_rot_ot_amount', comp.regular_holiday_rot_ot_amount, 'currency', empId)}</td>
                  
                  {/* Special Holiday Section */}
                  <td>{renderEditableCell('special_holiday_rate', comp.special_holiday_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('special_holiday_hours', comp.special_holiday_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('special_holiday_amount', comp.special_holiday_amount, 'currency', empId)}</td>
                  
                  {/* Special Holiday + Overtime */}
                  <td>{renderEditableCell('special_holiday_ot_rate', comp.special_holiday_ot_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('special_holiday_ot_hours', comp.special_holiday_ot_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('special_holiday_ot_amount', comp.special_holiday_ot_amount, 'currency', empId)}</td>
                  
                  {/* Special Holiday + Night Differential */}
                  <td>{renderEditableCell('special_holiday_nd_rate', comp.special_holiday_nd_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('special_holiday_nd_hours', comp.special_holiday_nd_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('special_holiday_nd_amount', comp.special_holiday_nd_amount, 'currency', empId)}</td>
                  
                  {/* Special Holiday + ROT */}
                  <td>{renderEditableCell('special_holiday_rot_rate', comp.special_holiday_rot_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('special_holiday_rot_hours', comp.special_holiday_rot_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('special_holiday_rot_amount', comp.special_holiday_rot_amount, 'currency', empId)}</td>
                  
                  {/* Special Holiday + ROT + OT */}
                  <td>{renderEditableCell('special_holiday_rot_ot_rate', comp.special_holiday_rot_ot_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('special_holiday_rot_ot_hours', comp.special_holiday_rot_ot_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('special_holiday_rot_ot_amount', comp.special_holiday_rot_ot_amount, 'currency', empId)}</td>
                  
                  {/* Special Holiday + ROT + ND */}
                  <td>{renderEditableCell('special_holiday_rot_nd_rate', comp.special_holiday_rot_nd_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('special_holiday_rot_nd_hours', comp.special_holiday_rot_nd_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('special_holiday_rot_nd_amount', comp.special_holiday_rot_nd_amount, 'currency', empId)}</td>
                  
                  {/* Total Holiday Pay */}
                  <td className="generate-payroll-total-cell">{renderEditableCell('total_holiday_pay', comp.total_holiday_pay, 'currency', empId)}</td>
                  
                  {/* Regular OT Section */}
                  <td>{renderEditableCell('regular_ot_rate', comp.regular_ot_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('regular_ot_hours', comp.regular_ot_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('regular_ot_amount', comp.regular_ot_amount, 'currency', empId)}</td>
                  
                  {/* Regular OT - Night Diff */}
                  <td>{renderEditableCell('regular_ot_nd_rate', comp.regular_ot_nd_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('regular_ot_nd_hours', comp.regular_ot_nd_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('regular_ot_nd_amount', comp.regular_ot_nd_amount, 'currency', empId)}</td>
                  
                  {/* Rest Day OT */}
                  <td>{renderEditableCell('rest_day_ot_rate', comp.rest_day_ot_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('rest_day_ot_hours', comp.rest_day_ot_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('rest_day_ot_amount', comp.rest_day_ot_amount, 'currency', empId)}</td>
                  
                  {/* Rest Day OT + OT */}
                  <td>{renderEditableCell('rest_day_ot_plus_ot_rate', comp.rest_day_ot_plus_ot_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('rest_day_ot_plus_ot_hours', comp.rest_day_ot_plus_ot_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('rest_day_ot_plus_ot_amount', comp.rest_day_ot_plus_ot_amount, 'currency', empId)}</td>
                  
                  {/* Rest Day + Night Differential */}
                  <td>{renderEditableCell('rest_day_nd_rate', comp.rest_day_nd_rate, 'currency', empId)}</td>
                  <td>{renderEditableCell('rest_day_nd_hours', comp.rest_day_nd_hours, 'hours', empId)}</td>
                  <td>{renderEditableCell('rest_day_nd_amount', comp.rest_day_nd_amount, 'currency', empId)}</td>
                  
                  {/* Total OT Pay */}
                  <td className="generate-payroll-total-cell">{renderEditableCell('total_overtime_pay', comp.total_overtime_pay, 'currency', empId)}</td>
                  
                  {/* Gross Pay */}
                  <td className="generate-payroll-total-cell">{renderEditableCell('gross_pay', comp.gross_pay, 'currency', empId)}</td>
                  
                  {/* Undertime / Late */}
                  <td>{renderEditableCell('late_undertime_minutes', comp.late_undertime_minutes, 'minutes', empId)}</td>
                  <td>{renderEditableCell('late_undertime_amount', comp.late_undertime_amount, 'currency', empId)}</td>
                  
                  {/* Absences */}
                  <td>{renderEditableCell('absences_days', comp.absences_days, 'number', empId)}</td>
                  <td>{renderEditableCell('absences_amount', comp.absences_amount, 'currency', empId)}</td>
                  
                  {/* Total Deductions */}
                  <td className="generate-payroll-total-cell">{renderEditableCell('total_deductions', comp.total_deductions, 'currency', empId)}</td>
                  
                  {/* Government Mandatory Contributions */}
                  <td>{renderEditableCell('sss_contribution', comp.sss_contribution, 'currency', empId)}</td>
                  <td>{renderEditableCell('phic_contribution', comp.phic_contribution, 'currency', empId)}</td>
                  <td>{renderEditableCell('hdmf_contribution', comp.hdmf_contribution, 'currency', empId)}</td>
                  <td>{renderEditableCell('tax_amount', comp.tax_amount, 'currency', empId)}</td>
                  
                  {/* Other Deductions */}
                  <td>{renderEditableCell('sss_loan', comp.sss_loan, 'currency', empId)}</td>
                  <td>{renderEditableCell('hdmf_loan', comp.hdmf_loan, 'currency', empId)}</td>
                  <td>{renderEditableCell('teed', comp.teed, 'currency', empId)}</td>
                  <td>{renderEditableCell('staff_house', comp.staff_house, 'currency', empId)}</td>
                  <td>{renderEditableCell('cash_advance', comp.cash_advance, 'currency', empId)}</td>
                  
                  {/* Net Pay */}
                  <td className="generate-payroll-net-pay-cell">{renderEditableCell('net_pay', comp.net_pay, 'currency', empId)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Render detail modal
  const renderDetailModal = () => {
  if (!selectedEmployee) return null;

  return (
    <div className="generate-payroll-modal-overlay" onClick={handleCloseDetailModal}>
      <div className="generate-payroll-modal-content generate-payroll-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="generate-payroll-modal-header">
          <div className="generate-payroll-employee-header">
          {renderAvatar(selectedEmployee)}
            <div className="generate-payroll-employee-details">
              <h3>{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
              <p className="generate-payroll-employee-id">Employee ID: {selectedEmployee.employee_id}</p>
              <p className="generate-payroll-employee-position">{selectedEmployee.position}</p>
              <p className="generate-payroll-payroll-period">Payroll Period: {selectedEmployee.payroll_period}</p>
            </div>
          </div>
          <div className="generate-payroll-modal-actions">
            {/* REMOVE ALL THE CONDITIONAL BUTTONS - ONLY KEEP CLOSE BUTTON */}
            <button className="generate-payroll-close-btn" onClick={handleCloseDetailModal}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="generate-payroll-modal-info">
          <div className="generate-payroll-info-section">
            <h4>Personal Information</h4>
            <div className="generate-payroll-info-grid">
              <div className="generate-payroll-info-item">
                <span className="generate-payroll-info-label">Address:</span>
                <span className="generate-payroll-info-value">{selectedEmployee.address || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="generate-payroll-info-section">
            <h4>Benefits Account</h4>
            <div className="generate-payroll-info-grid">
              <div className="generate-payroll-info-item">
                <span className="generate-payroll-info-label">SSS:</span>
                <span className="generate-payroll-info-value">{selectedEmployee.sss_account || 'N/A'}</span>
              </div>
              <div className="generate-payroll-info-item">
                <span className="generate-payroll-info-label">Pag-IBIG:</span>
                <span className="generate-payroll-info-value">{selectedEmployee.hdmf_account || 'N/A'}</span>
              </div>
              <div className="generate-payroll-info-item">
                <span className="generate-payroll-info-label">PhilHealth:</span>
                <span className="generate-payroll-info-value">{selectedEmployee.phic_account || 'N/A'}</span>
              </div>
              <div className="generate-payroll-info-item">
                <span className="generate-payroll-info-label">Tax:</span>
                <span className="generate-payroll-info-value">{selectedEmployee.tax_account || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="generate-payroll-attendance-section">
          <h4>Employee Payroll Details</h4>
          {renderPayrollTable()}
        </div>
      </div>
    </div>
  );
};

  // Render all employees modal
  // Render all employees modal
  const renderAllEmployeesModal = () => {
    const modalData = showGeneratePreviewModal ? selectedEmployeesPayroll : 
                     showReleasePreviewModal ? selectedEmployeesPayroll : allEmployeesPayroll;
    const modalTotalPages = Math.ceil(modalData.length / dynamicItemsPerPage); // Use dynamic value
    const modalStartIndex = (modalCurrentPage - 1) * dynamicItemsPerPage; // Use dynamic value
    const modalEndIndex = modalStartIndex + dynamicItemsPerPage; // Use dynamic value
    const modalPaginatedData = modalData.slice(modalStartIndex, modalEndIndex);

  return (
    <div className="generate-payroll-modal-overlay" onClick={handleCloseAllEmployeesModal}>
      <div className="generate-payroll-modal-content generate-payroll-all-employees-modal" onClick={(e) => e.stopPropagation()}>
        <div className="generate-payroll-modal-header">
          <div className="generate-payroll-employee-header">
            <h3>All Employees Payroll</h3>
            <p className="generate-payroll-payroll-period">Payroll Period: {currentPeriod?.display_period}</p>
          </div>
          <div className="generate-payroll-modal-actions">
            {/* REMOVED TOP PAGINATION - ONLY KEEP ACTION BUTTONS */}
            {showGeneratePreviewModal && (
              <>
                {!isEditing ? (
                  <>
                    <button className="generate-payroll-edit-btn" onClick={handleEdit}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                      Edit
                    </button>
                    <button className="generate-payroll-save-btn" onClick={handleSaveAndExport}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
                      </svg>
                      Save and Export
                    </button>
                  </>
                ) : (
                  <div className="generate-payroll-edit-actions">
                    <button 
                      className="generate-payroll-save-btn" 
                      onClick={handleSave}
                      disabled={!hasChanges}
                    >
                      Save Changes
                    </button>
                    <button className="generate-payroll-cancel-btn" onClick={handleCancel}>
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
            
            {showReleasePreviewModal && (
              <button className="generate-payroll-save-btn" onClick={handleReleaseAndExport}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
                </svg>
                Release and Export
              </button>
            )}
            
            <button className="generate-payroll-close-btn" onClick={handleCloseAllEmployeesModal}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="generate-payroll-attendance-section">
          {/* USE PAGINATED DATA */}
          {showGeneratePreviewModal && renderPayrollTable(modalPaginatedData)}
          {showReleasePreviewModal && renderPayrollTable(modalPaginatedData)}
          {(!showGeneratePreviewModal && !showReleasePreviewModal) && renderPayrollTable(modalPaginatedData)}
        </div>

        {/* BOTTOM PAGINATION ONLY */}
        <div className="gp-pagination-area" style={{ marginTop: '20px' }}>
          <div className="gp-pagination-info">
            Showing {modalStartIndex + 1} to {Math.min(modalEndIndex, modalData.length)} of {modalData.length} entries
          </div>
          <div className="gp-pagination-buttons">
            {renderModalPaginationButtons()}
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="gp-main-container">
      {/* Success Message */}
      {showSuccess && (
        <div className="gp-success-overlay">
          <div className="gp-success-message">
            <div className="gp-success-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="gp-success-text">{successMessage}</div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && renderDetailModal()}

      {/* All Employees Modal */}
      {showAllEmployeesModal && renderAllEmployeesModal()}

      {/* Header Section with Stats Cards */}
      <div className="gp-header-section">
        <div className="gp-stats-cards">
          <div className="gp-stat-card">
            <div className="gp-stat-icon gp-icon-blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="gp-stat-content">
              <div className="gp-stat-value">{stats.total_employees || 0}</div>
              <div className="gp-stat-label">Total Employees</div>
            </div>
          </div>

          <div className="gp-stat-card">
            <div className="gp-stat-icon gp-icon-orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="gp-stat-content">
              <div className="gp-stat-value">{stats.pending_payroll || 0}</div>
              <div className="gp-stat-label">Pending Payroll</div>
            </div>
          </div>

          <div className="gp-stat-card">
            <div className="gp-stat-icon gp-icon-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="gp-stat-content">
              <div className="gp-stat-value">{stats.released_payroll || 0}</div>
              <div className="gp-stat-label">Released Payroll</div>
            </div>
          </div>

          <div className="gp-stat-card">
            <div className="gp-stat-icon gp-icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
            </div>
            <div className="gp-stat-content">
              <div className="gp-stat-value">{stats.current_payroll_period || 'N/A'}</div>
              <div className="gp-stat-label">Current Payroll Period</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="gp-action-section">
        {currentView === 'generate' ? (
          <div className="gp-generate-actions">
            <button
              onClick={handleSelectAll}
              className={`gp-action-btn gp-select-all-btn ${selectAll ? 'active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              {selectAll ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={selectedEmployees.length === 0 || generateLoading || releaseLoading}
              className="gp-action-btn gp-generate-btn"
            >
              {generateLoading ? (
                <>
                  <div className="gp-spinner"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                  </svg>
                  Generate ({selectedEmployees.length})
                </>
              )}
            </button>
            <button
              onClick={handleReleasePayroll}
              disabled={selectedEmployees.length === 0 || generateLoading || releaseLoading}
              className="gp-action-btn gp-release-payroll-btn"
            >
              {releaseLoading ? (
                <>
                  <div className="gp-spinner"></div>
                  Releasing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Release Payslip ({selectedEmployees.length})
                </>
              )}
            </button>
            <button
              onClick={handleBackToEmployees}
              className="gp-action-btn gp-back-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Back
            </button>
          </div>
        ) : currentView === 'payslip_history' ? (
          <div className="gp-view-actions">
            <select
              value={selectedPayrollPeriod}
              onChange={(e) => setSelectedPayrollPeriod(e.target.value)}
              className="gp-payroll-period-select"
            >
              <option value="">All Payroll Periods</option>
              {availablePayrollPeriods.map(period => (
                <option key={period.id} value={period.id}>
                  {period.display_period}
                </option>
              ))}
            </select>
            <button
              onClick={handleBackToPayrollHistory}
              className="gp-action-btn gp-back-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Back to Payroll History
            </button>
          </div>
        ) : (
          <div className="gp-view-actions">
            {currentView !== 'history' && (
              <button
                onClick={handleViewHistory}
                className="gp-action-btn gp-history-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                </svg>
                View History
              </button>
            )}
            {currentView === 'history' && (
              <button
                onClick={handleViewPayslipHistory}
                className="gp-action-btn gp-payslip-history-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                </svg>
                Payslip History
              </button>
            )}
            {currentView !== 'history' && (
              <button
                onClick={handleGeneratePayroll}
                className="gp-action-btn gp-generate-payroll-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                </svg>
                Generate Payroll
              </button>
            )}
            {currentView !== 'history' && (
              <button
                onClick={handleViewAllEmployees}
                className="gp-action-btn gp-view-all-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                View All
              </button>
            )}
            {currentView === 'history' && (
              <button
                onClick={handleBackToEmployees}
                className="gp-action-btn gp-back-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
                Back to Employees
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="gp-loading-overlay">
          <div className="gp-spinner-large"></div>
        </div>
      )}

      {/* Table Section */}
      <div className="gp-table-section">
        <div className="gp-table-container">
          <table className="gp-data-table">
            <thead>
              <tr className="gp-table-header">
                {currentView === 'generate' && <th className="gp-checkbox-header"></th>}
                {currentView === 'history' ? (
                  <>
                    <th>Payroll ID</th>
                    <th>Payroll Period</th>
                    <th>Total Employees</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </>
                ) : currentView === 'payslip_history' ? (
                  <>
                    <th>Employee ID</th>
                    <th>Employee Name</th>
                    <th>Payroll Period</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                    <th>Action</th>
                  </>
                ) : (
                  <>
                    <th>Employee ID</th>
                    <th>Employee Name</th>
                    <th>Payroll Period</th>
                    <th>Status</th>
                    {currentView === 'generate' && <th>Action</th>}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((record, index) => (
                <tr key={record.id || record.emp_id} className="gp-table-row">
                  {currentView === 'generate' && (
                    <td className="gp-checkbox-cell">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(record.emp_id)}
                        onChange={() => handleSelectEmployee(record.emp_id)}
                        className="gp-checkbox"
                      />
                    </td>
                  )}
                  
                  {currentView === 'history' ? (
                    <>
                      <td className="gp-id-cell">{record.payroll_id}</td>
                      <td className="gp-period-cell">{record.payroll_period}</td>
                      <td className="gp-count-cell">{record.total_employees}</td>
                      <td className="gp-amount-cell">₱{parseFloat(record.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="gp-status-cell">
                        <span className={`gp-status-badge ${getStatusClass(record.status)}`}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="gp-action-cell">
                        <button
                          onClick={() => handleViewAllEmployees()}
                          className="gp-table-action-btn gp-view-detail-btn"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                          View Details
                        </button>
                      </td>
                    </>
                  ) : currentView === 'payslip_history' ? (
                    <>
                      <td className="gp-id-cell">{record.employee_id}</td>
                      <td className="gp-name-cell">
                        <div className="gp-employee-info">
                          <div className="gp-name-details">
                            <div className="gp-name">{record.employee_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="gp-period-cell">{record.payroll_period}</td>
                      <td className="gp-amount-cell">₱{parseFloat(record.net_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="gp-status-cell">
                        <span className={`gp-status-badge ${getStatusClass(record.status)}`}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="gp-action-cell">
                        <button
                          onClick={() => handleViewDetail(record)}
                          className="gp-table-action-btn gp-view-detail-btn"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                          View Details
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="gp-id-cell">{record.employee_id}</td>
                      <td className="gp-name-cell">
                      <div className="gp-employee-info">
                          {renderAvatar(record)}
                          <div className="gp-name-details">
                            <div className="gp-name">{record.employee_name}</div>
                            <div className="gp-position">{record.position}</div>
                          </div>
                        </div>
                      </td>
                      <td className="gp-period-cell">{record.payroll_period}</td>
                      <td className="gp-status-cell">
                        <span className={`gp-status-badge ${getStatusClass(record.status)}`}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                      {currentView === 'generate' && (
                        <td className="gp-action-cell">
                          <button
                            onClick={() => handleViewDetail(record)}
                            className="gp-table-action-btn gp-view-detail-btn"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                            View Details
                          </button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="gp-pagination-area">
          <div className="gp-pagination-info">
            Showing {startIndex + 1} to {Math.min(endIndex, currentData.length)} of {currentData.length} entries
          </div>
          <div className="gp-pagination-buttons">
            {renderPaginationButtons()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratePayroll;