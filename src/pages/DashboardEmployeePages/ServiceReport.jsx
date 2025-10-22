import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getCurrentUser, getUserId } from '../../utils/auth';
import axios from 'axios';
import * as ExcelJS from 'exceljs';
import { Loader } from 'lucide-react';
import difsyslogo from '../../assets/difsyslogo.png';
import '../../components/EmployeeLayout/ServiceReport.css'

// Utility functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    
    // Handle datetime format from database (e.g., "2025-10-14 15:30:45")
    // Replace space with 'T' to make it ISO format
    const date = new Date(dateStr.replace(' ', 'T'));
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    });
  };

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const maxPurposeLength = 70;

// Status class mapper
const getTableStatusClass = (status) => {
  switch (status) {
    case 'Pending': return 'srStatusPending';
    case 'Approved': return 'srStatusApproved';
    case 'Rejected': return 'srStatusRejected';
    default: return 'srStatusPending';
  }
};

const ServiceReport = () => {
  // State management
  const [currentView, setCurrentView] = useState('dashboard');
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showOBFormModal, setShowOBFormModal] = useState(false);
  const [showAttachReportModal, setShowAttachReportModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showLoading, setShowLoading] = useState(false); // Add this line
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetails, setReportDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [obFormPage, setObFormPage] = useState(1);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  
  // Employee information
  const [employeeInfo, setEmployeeInfo] = useState({
    firstName: 'Loading...',
    lastName: '',
    emp_id: null,
    position: 'Project Manager',
    profile_image: null
  });

  // OB Form data - supporting multiple entries
  // OB Form data - supporting multiple entries
  const [obFormData, setObFormData] = useState({
    pages: [
      {
        date: '',
        destinationFrom: '',
        destinationTo: '',
        departure: '',
        arrival: '',
        purpose: ''
      }
    ]
  });
  
  // Store submitted OB form data for download after submission
  const [submittedOBData, setSubmittedOBData] = useState(null);

  // Attach report data
  const [attachReportData, setAttachReportData] = useState({
    title: '',
    description: '',
    attachment: null
  });

  const API_BASE_URL = 'http://localhost/difsysapi/service_reports.php';
  const itemsPerPage = 8;
  const dropdownRef = useRef(null);

  useEffect(() => {
    document.title = "DIFSYS | SERVICE REPORT";
  }, []);

  // Initialize component
  useEffect(() => {
    const userId = getUserId();
    const currentUser = getCurrentUser();
    
    if (userId && currentUser) {
      setEmployeeInfo(prev => ({
        ...prev,
        firstName: currentUser.firstName || 'Employee',
        lastName: currentUser.lastName || '',
        emp_id: userId
      }));
      fetchUserReports(userId);
      fetchEmployeeInfo(userId);
    } else {
      window.location.href = '/login';
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowActionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const fetchEmployeeInfo = useCallback(async (empId) => {
    try {
      const response = await axios.get(`http://localhost/difsysapi/attendance_api.php?action=get_employee_info&emp_id=${empId}`);
      
      if (response.data.success) {
        setEmployeeInfo(prev => ({
          ...prev,
          ...response.data.employee,
          profile_image: response.data.employee.profile_image
        }));
      }
    } catch (error) {
      console.error('Error fetching employee info:', error);
    }
  }, []);

  const fetchReportDetails = async (reportId) => {
    try {
      setLoadingDetails(true);
      console.log('Fetching details for report:', reportId);
      
      const response = await axios.get(`${API_BASE_URL}?action=getReportDetails&report_id=${reportId}`);
      
      console.log('Report details response:', response.data);
      
      if (response.data.success) {
        setReportDetails(response.data.report);
        setShowDetailsModal(true);
      } else {
        alert('Failed to fetch report details: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
      alert('Failed to fetch report details. Please try again.');
    } finally {
      setLoadingDetails(false);
    }
  };
  
  const handleViewDetails = (report) => {
    setSelectedReport(report);
    fetchReportDetails(report.id);
  };
  

  const fetchUserReports = useCallback(async (employeeId) => {
    try {
      setLoading(true);
      console.log('Fetching reports for employee:', employeeId);
      
      const response = await axios.get(`${API_BASE_URL}?action=getUserReports&employee_id=${employeeId}`);
      
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        console.log('Reports received:', response.data.reports);
        setReports(response.data.reports || []);
      } else {
        console.error('Failed to fetch reports:', response.data.message);
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const generateOBFormExcelFromReport = async (reportData, obEntries) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('OB Form');
      
      worksheet.pageSetup = {
        paperSize: 1,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.708661417322835,
          right: 0.708661417322835,
          top: 0.748031496062992,
          bottom: 0.748031496062992,
          header: 0.31496062992126,
          footer: 0.31496062992126
        }
      };
  
      worksheet.getColumn('A').width = 1.77;
      worksheet.getColumn('B').width = 5;
      worksheet.getColumn('C').width = 18;
      worksheet.getColumn('D').width = 18;
      worksheet.getColumn('E').width = 18;
      worksheet.getColumn('F').width = 14;
      worksheet.getColumn('G').width = 14;
      worksheet.getColumn('H').width = 3;
      worksheet.getColumn('I').width = 1.77;
      worksheet.getColumn('J').width = 5;
      worksheet.getColumn('K').width = 18;
      worksheet.getColumn('L').width = 18;
      worksheet.getColumn('M').width = 18;
      worksheet.getColumn('N').width = 14;
      worksheet.getColumn('O').width = 14;
      worksheet.getColumn('P').width = 3;
  
      for (let i = 1; i <= 42; i++) {
        worksheet.getRow(i).height = 15;
      }
  
      const leftFormCol = 'B';
      const rightFormCol = 'J';
      
      // Convert entries to the format expected by createOBFormInExcel
      const formattedEntries = obEntries.map(entry => ({
        date: entry.ob_date,
        destinationFrom: entry.destination_from,
        destinationTo: entry.destination_to,
        departure: entry.departure_time,
        arrival: entry.arrival_time,
        purpose: entry.purpose
      }));
  
      await createOBFormInExcel(worksheet, leftFormCol, formattedEntries, 1);
      await createOBFormInExcel(worksheet, rightFormCol, formattedEntries, 2);
  
      const filename = `OB_Form_${employeeInfo.firstName}_${employeeInfo.lastName}_${reportData.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
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
  
      return true;
    } catch (error) {
      console.error('Error generating Excel:', error);
      return false;
    }
  };

  const handleAddMorePage = () => {
    setObFormData(prev => ({
      pages: [...prev.pages, {
        date: '',
        destinationFrom: '',
        destinationTo: '',
        departure: '',
        arrival: '',
        purpose: ''
      }]
    }));
    setObFormPage(obFormData.pages.length + 1);
  };

  const handleRemovePage = (pageIndex) => {
    if (obFormData.pages.length > 1) {
      setObFormData(prev => ({
        pages: prev.pages.filter((_, index) => index !== pageIndex)
      }));
      if (obFormPage > obFormData.pages.length - 1) {
        setObFormPage(obFormData.pages.length - 1);
      }
    }
  };


  const handleOBFormChange = (field, value) => {
    setObFormData(prev => {
      const newPages = [...prev.pages];
      newPages[obFormPage - 1] = {
        ...newPages[obFormPage - 1],
        [field]: value
      };
      return { pages: newPages };
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (file && !allowedTypes.includes(file.type)) {
      alert('Only images, PDF, DOC, DOCX, XLS, and XLSX files are allowed');
      return;
    }
    
    setAttachReportData(prev => ({ ...prev, attachment: file }));
  };

  const removeFile = () => {
    setAttachReportData(prev => ({ ...prev, attachment: null }));
  };

  const createOBFormInExcel = async (worksheet, startCol, pageData, formNumber) => {
    // Calculate column offset (B=1, J=9)
    const colOffset = startCol === 'B' ? 1 : 9;
    
    // Helper to get column letter by offset from column A
    const getCol = (offset) => String.fromCharCode(65 + colOffset + offset);
    
    // Add logo
    try {
      const response = await fetch(difsyslogo);
      const arrayBuffer = await response.arrayBuffer();
      
      const imageId = worksheet.workbook.addImage({
        buffer: arrayBuffer,
        extension: 'png',
      });
      
      worksheet.addImage(imageId, {
        tl: { col: colOffset + 0.99, row: 40.2 },
        ext: { width: 50, height: 30 },
        editAs: 'oneCell'
      });
    } catch (logoError) {
      console.warn('Could not load logo:', logoError);
    }

    for (let row = 2; row <= 44; row++) {
        worksheet.getCell(`${getCol(0)}${row}`).border = {
          left: { style: 'medium' }
        };
      }
    
    for (let row = 2; row <= 44; row++) {
        worksheet.getCell(`${getCol(6)}${row}`).border = {
          right: { style: 'medium' }
        };
      }

      for (let col = 0; col <= 6; col++) {
        const cell = worksheet.getCell(`${getCol(col)}44`);
        let border = {
          bottom: { style: 'medium' }
        };
        
        if (col === 0) border.left = { style: 'medium' };
        if (col === 6) border.right = { style: 'medium' };
        
        cell.border = border;
      }

      worksheet.mergeCells(`${getCol(2)}2:${getCol(5)}2`);
      const titleCell = worksheet.getCell(`${getCol(2)}2`);
      titleCell.value = 'OB FORM';
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Apply top border to all cells in the merged range
      for (let col = 0; col <= 6; col++) {
        const cell = worksheet.getCell(`${getCol(col)}2`);
        cell.border = {
          ...cell.border, // Keep existing borders
          top: { style: 'medium' }
        };
      }

    // Employee Name (Row 4)
    worksheet.mergeCells(`${getCol(0)}4:${getCol(1)}4`);
    worksheet.getCell(`${getCol(0)}4`).value = 'Employee Name:';
    worksheet.getCell(`${getCol(0)}4`).font = { bold: true };
    
    worksheet.mergeCells(`${getCol(3)}4:${getCol(5)}4`);
    const nameCell = worksheet.getCell(`${getCol(3)}4`);
    nameCell.value = `${employeeInfo.firstName} ${employeeInfo.lastName}`;
    nameCell.alignment = { horizontal: 'center', vertical: 'middle' };
    nameCell.border = { 
      bottom: { style: 'thin' },
    };

    // Position (Row 5)
    worksheet.mergeCells(`${getCol(0)}5:${getCol(1)}5`);
    worksheet.getCell(`${getCol(0)}5`).value = 'Position:';
    worksheet.getCell(`${getCol(0)}5`).font = { bold: true };
    
    worksheet.mergeCells(`${getCol(3)}5:${getCol(5)}5`);
    const posCell = worksheet.getCell(`${getCol(3)}5`);
    posCell.value = employeeInfo.position;
    posCell.alignment = { horizontal: 'center', vertical: 'middle' };
    posCell.border = { 
      bottom: { style: 'thin' },
    };

    // Date file (Row 6)
    worksheet.mergeCells(`${getCol(0)}6:${getCol(1)}6`);
    worksheet.getCell(`${getCol(0)}6`).value = 'Date file :';
    worksheet.getCell(`${getCol(0)}6`).font = { bold: true };
    worksheet.getCell(`${getCol(0)}6`).border = { left: { style: 'medium' } };
    
    worksheet.mergeCells(`${getCol(3)}6:${getCol(5)}6`);
    const dateCell = worksheet.getCell(`${getCol(3)}6`);
    dateCell.value = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateCell.border = { 
      bottom: { style: 'thin' },
    };

    // Table headers (Row 9) - Starting from column C (offset 1 from B)
    worksheet.getCell(`${getCol(1)}9`).value = 'DATE';
    worksheet.getCell(`${getCol(1)}9`).font = { bold: true, size: 11 };
    worksheet.getCell(`${getCol(1)}9`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell(`${getCol(1)}9`).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
      bottom: { style: 'thin' }
    };

    // DESTINATION header (merged columns 2-3)
    worksheet.mergeCells(`${getCol(2)}9:${getCol(3)}9`);
    const destCell = worksheet.getCell(`${getCol(2)}9`);
    destCell.value = 'DESTINATION';
    destCell.font = { bold: true, size: 11 };
    destCell.alignment = { horizontal: 'center', vertical: 'middle' };
    destCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
      bottom: { style: 'thin' }
    };

    // TIME header (merged columns 4-5)
    worksheet.mergeCells(`${getCol(4)}9:${getCol(5)}9`);
    const timeCell = worksheet.getCell(`${getCol(4)}9`);
    timeCell.value = 'TIME';
    timeCell.font = { bold: true, size: 11 };
    timeCell.alignment = { horizontal: 'center', vertical: 'middle' };
    timeCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
      bottom: { style: 'thin' }
    };

    // Sub-headers (Row 10) - Starting from column C
    const subHeaders = ['', 'From', 'To', 'Departure', 'Arrival'];
    subHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(`${getCol(index + 1)}10`);
      cell.value = header;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      let border = {
        top: { style: 'thin'},
        bottom: { style: 'thin' }
      };
      
      if (index === 0) border.left = { style: 'thin' };
      if (index === 4) border.right = { style: 'thin' };
      if (index > 0 && index < 4) {
        border.left = { style: 'thin' };
        border.right = { style: 'thin' };
      }
      
      cell.border = border;
    });

    for (let row = 11; row <= 18; row++) {
        for (let col = 1; col <= 5; col++) {
          const cell = worksheet.getCell(`${getCol(col)}${row}`);
          
          const entryIndex = row - 11;
          if (Array.isArray(pageData) && entryIndex < pageData.length) {
            const entry = pageData[entryIndex];
            if (col === 1) cell.value = entry.date || '';
            else if (col === 2) cell.value = entry.destinationFrom || '';
            else if (col === 3) cell.value = entry.destinationTo || '';
            else if (col === 4) cell.value = formatTime12Hour(entry.departure) || ''; // Convert to 12hr
            else if (col === 5) cell.value = formatTime12Hour(entry.arrival) || ''; // Convert to 12hr
          }
          
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          
          let border = {
            top: { style: 'thin' },
            bottom: row === 18 ? { style: 'thin'} : { style: 'thin' }
          };
          
          if (col === 1) border.left = { style: 'thin' };
          if (col === 5) border.right = { style: 'thin' };
          if (col > 1 && col < 5) {
            border.left = { style: 'thin' };
            border.right = { style: 'thin' };
          }
          
          cell.border = border;
        }
      }

      worksheet.getCell(`${getCol(1)}20`).value = 'PURPOSE :';
      worksheet.getCell(`${getCol(1)}20`).font = { bold: true, size: 11 };
      worksheet.getCell(`${getCol(1)}20`).alignment = { horizontal: 'right', vertical: 'top' };
      
      // Merge the entire purpose area as ONE cell (rows 20-23, columns 2-5)
      worksheet.mergeCells(`${getCol(2)}20:${getCol(5)}23`);
      
      const purposeCell = worksheet.getCell(`${getCol(2)}20`);
      
      // Combine all purposes with numbering
      let combinedPurposes = '';
      if (Array.isArray(pageData)) {
        combinedPurposes = pageData.map((entry, index) => {
          return `${index + 1}. ${entry.purpose}`;
        }).join('\n');
      } else if (pageData?.purpose) {
        combinedPurposes = pageData.purpose;
      }
      purposeCell.value = combinedPurposes;
      purposeCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };


    // Team Activity section (Row 25-33)
    worksheet.mergeCells(`${getCol(1)}25:${getCol(5)}25`);
    const teamCell = worksheet.getCell(`${getCol(1)}25`);
    teamCell.value = 'To be filled out by the supervisor only';
    teamCell.font = { italic: true, size: 9 };
    teamCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`${getCol(1)}26:${getCol(5)}26`);
    const activityCell = worksheet.getCell(`${getCol(1)}26`);
    activityCell.value = 'TEAM ACTIVITY';
    activityCell.font = { bold: true, size: 11 };
    activityCell.alignment = { horizontal: 'center', vertical: 'middle' };
    activityCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin'},
      right: { style: 'thin' },
      bottom: { style: 'thin' }
    };

    // Team activity headers (Row 27)
    const activityHeaders = ['EMPLOYEE NAME', 'DESIGNATION', 'ASSIGN TASK', 'TIME DURATION', 'REMARKS'];
    activityHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(`${getCol(index + 1)}27`);
      cell.value = header;
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      
      let border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' }
      };
      
      if (index === 0) border.left = { style: 'thin' };
      if (index === 4) border.right = { style: 'thin'};
      if (index > 0 && index < 4) {
        border.left = { style: 'thin' };
        border.right = { style: 'thin' };
      }
      
      cell.border = border;
    });

    // Team activity data rows (28-33)
    for (let row = 28; row <= 33; row++) {
      for (let col = 1; col <= 5; col++) {
        const cell = worksheet.getCell(`${getCol(col)}${row}`);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        let border = {
          top: { style: 'thin' },
          bottom: row === 33 ? { style: 'thin' } : { style: 'thin' }
        };
        
        if (col === 1) border.left = { style: 'thin' };
        if (col === 5) border.right = { style: 'thin' };
        if (col > 1 && col < 5) {
          border.left = { style: 'thin' };
          border.right = { style: 'thin' };
        }
        
        cell.border = border;
      }
    }

    // Supervisor note (Row 34)
    worksheet.mergeCells(`${getCol(0)}34:${getCol(6)}34`);
    const supCell = worksheet.getCell(`${getCol(0)}34`);
    supCell.value = '----------------------------------------------------------------To be filled out by HR / Admin----------------------------------------------------------------';
    supCell.font = { italic: true, size: 9 };
    supCell.alignment = { horizontal: 'center', vertical: 'middle' };
    supCell.border = { right: { style: 'medium' }, left: { style: 'medium' }, }

    // Computation section (Row 35)
    worksheet.mergeCells(`${getCol(0)}35:${getCol(1)}35`);
    const compCell = worksheet.getCell(`${getCol(0)}35`);
    compCell.value = 'STANDARD OF COMPUTATION:';
    compCell.font = { bold: true, size: 9 };
    compCell.alignment = { horizontal: 'left', vertical: 'middle' };

    worksheet.mergeCells(`${getCol(2)}35:${getCol(4)}35`);
    const formulaCell = worksheet.getCell(`${getCol(2)}35`);
    formulaCell.value = "Employee's hourly rate × hours of exceeded travel time";
    formulaCell.font = { bold: true, color: { argb: 'FFFF0000' }, size: 9 };
    formulaCell.alignment = { horizontal: 'left', vertical: 'middle' };

    // Google Maps hours (Row 36)
    worksheet.mergeCells(`${getCol(0)}36:${getCol(1)}36`);
    const mapsCell = worksheet.getCell(`${getCol(0)}36`);
    mapsCell.value = "Google Maps' hours:";
    mapsCell.font = { size: 9 };
    mapsCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.mergeCells(`${getCol(2)}36:${getCol(3)}36`);
    worksheet.getCell(`${getCol(3)}36`).border = { bottom: { style: 'thin' } };

    worksheet.mergeCells(`${getCol(2)}37:${getCol(3)}37`);
    worksheet.getCell(`${getCol(3)}37`).border = { bottom: { style: 'thin' } };

    // Total hours (Row 38)
    worksheet.mergeCells(`${getCol(0)}38:${getCol(1)}38`);
    const totalCell = worksheet.getCell(`${getCol(0)}38`);
    totalCell.value = 'Total hours:';
    totalCell.font = { size: 9 };
    totalCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.mergeCells(`${getCol(2)}38:${getCol(3)}38`);
    worksheet.getCell(`${getCol(3)}38`).border = { bottom: { style: 'thin' } };

    // Employee Signature (Row 40)
    worksheet.mergeCells(`${getCol(4)}40:${getCol(5)}40`);
    const sigCell = worksheet.getCell(`${getCol(4)}40`);
    sigCell.value = 'Employee Signature';
    sigCell.font = { size: 9 };
    sigCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sigCell.border = { top: { style: 'thin' } };

    // Approved by (Row 42)
    worksheet.mergeCells(`${getCol(4)}42:${getCol(5)}42`);
    const approveCell = worksheet.getCell(`${getCol(4)}42`);
    approveCell.value = 'Approved by: HR/Admin';
    approveCell.font = { size: 9 };
    approveCell.alignment = { horizontal: 'center', vertical: 'middle' };
    approveCell.border = { top: { style: 'thin' } };
  };

  const generateOBFormExcel = async () => {
    try {
      // Use submittedOBData if available (after form submission), otherwise use current obFormData
      const dataToExport = submittedOBData || obFormData;
      
      if (!dataToExport || !dataToExport.pages || dataToExport.pages.length === 0) {
        alert('No data available to export');
        return false;
      }
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('OB Form');
      
      worksheet.pageSetup = {
        paperSize: 1,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.708661417322835,
          right: 0.708661417322835,
          top: 0.748031496062992,
          bottom: 0.748031496062992,
          header: 0.31496062992126,
          footer: 0.31496062992126
        }
      };

      worksheet.getColumn('A').width = 1.77;
      worksheet.getColumn('B').width = 5;
      worksheet.getColumn('C').width = 18;
      worksheet.getColumn('D').width = 18;
      worksheet.getColumn('E').width = 18;
      worksheet.getColumn('F').width = 14;
      worksheet.getColumn('G').width = 14;
      worksheet.getColumn('H').width = 3;
      worksheet.getColumn('I').width = 1.77;
      worksheet.getColumn('J').width = 5;
      worksheet.getColumn('K').width = 18;
      worksheet.getColumn('L').width = 18;
      worksheet.getColumn('M').width = 18
      worksheet.getColumn('N').width = 14;
      worksheet.getColumn('O').width = 14;
      worksheet.getColumn('P').width = 3;

      for (let i = 1; i <= 42; i++) {
        worksheet.getRow(i).height = 15;
      }

      const leftFormCol = 'B';
      const rightFormCol = 'J';
      
      const allEntries = dataToExport.pages;
      // Both copies get ALL entries (not just first one)
      await createOBFormInExcel(worksheet, leftFormCol, allEntries, 1);
      await createOBFormInExcel(worksheet, rightFormCol, allEntries, 2);

      const filename = `OB_Form_${employeeInfo.firstName}_${employeeInfo.lastName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
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

      return true;
    } catch (error) {
      console.error('Error generating Excel:', error);
      return false;
    }
  };

  const handleOBFormSubmit = async (e) => {
    e.preventDefault();
    
    const isValid = obFormData.pages.every(page => 
      page.date && page.destinationFrom && page.destinationTo && 
      page.departure && page.arrival && page.purpose
    );
    
    if (!isValid) {
      alert('Please fill in all required fields on all pages');
      return;
    }
  
    try {
      setShowLoading(true);
      
      // Save the form data before resetting
      const dataToSubmit = {...obFormData};
      
      console.log('Submitting OB Form:', {
        employee_id: employeeInfo.emp_id,
        entries: dataToSubmit.pages
      });
  
      const formDataToSend = new FormData();
      formDataToSend.append('action', 'submitOBForm');
      formDataToSend.append('employee_id', employeeInfo.emp_id);
      formDataToSend.append('ob_entries', JSON.stringify(dataToSubmit.pages));
  
      const response = await axios.post(API_BASE_URL, formDataToSend);
  
      // Add delay to show loading animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowLoading(false); // Hide loading
  
      if (response.data.success) {
        // Store the submitted data for download
        setSubmittedOBData(dataToSubmit);
        
        // Reset the form
        setObFormData({
          pages: [{
            date: '',
            destinationFrom: '',
            destinationTo: '',
            departure: '',
            arrival: '',
            purpose: ''
          }]
        });
        setObFormPage(1);
        setShowOBFormModal(false);
        setShowSuccessPopup('obform');
        
        await fetchUserReports(employeeInfo.emp_id);
      } else {
        alert('Failed to submit OB Form: ' + response.data.message);
      }
    } catch (error) {
      setShowLoading(false); // Hide loading on error
      console.error('Error submitting OB Form:', error);
      alert('Failed to submit OB Form. Please try again.');
    }
  };

  const handleAttachReportSubmit = async (e) => {
    e.preventDefault();
    
    if (!attachReportData.title || !attachReportData.description || !attachReportData.attachment) {
      alert('Please fill in all required fields');
      return;
    }
  
    try {
      setShowLoading(true); // Show loading
  
      const formDataToSend = new FormData();
      formDataToSend.append('action', 'attachReport');
      formDataToSend.append('employee_id', employeeInfo.emp_id);
      formDataToSend.append('title', attachReportData.title);
      formDataToSend.append('description', attachReportData.description);
      formDataToSend.append('attachment', attachReportData.attachment);
  
      const response = await axios.post(API_BASE_URL, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
  
      // Add delay to show loading animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowLoading(false); // Hide loading
  
      if (response.data.success) {
        setAttachReportData({
          title: '',
          description: '',
          attachment: null
        });
        setShowAttachReportModal(false);
        setShowSuccessPopup('attach');
        setTimeout(() => setShowSuccessPopup(false), 5000);
        await fetchUserReports(employeeInfo.emp_id);
      } else {
        alert('Failed to attach report. Please try again.');
      }
    } catch (error) {
      setShowLoading(false); // Hide loading on error
      console.error('Error attaching report:', error);
      alert('Failed to attach report. Please try again.');
    }
  };

  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = reports.slice(startIndex, endIndex);

  const renderPaginationButtons = () => {
    const buttons = [];
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`srPaginationBtn ${currentPage === i ? 'srPaginationActive' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(<span key="dots" className="srPaginationDots">...</span>);
      buttons.push(
        <button
          key={totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className={`srPaginationBtn ${currentPage === totalPages ? 'srPaginationActive' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  if (loading) {
    return (
      <div className="srContainer">
        <div className="srLoadingSpinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="srContainer">
        {showLoading && (
            <div className="srLoadingBackdrop">
                <div className="srLoadingSpinnerContainer">
                <Loader className="srLoadingSpinnerCircle" size={60} />
                <p className="srLoadingText">Submitting your report...</p>
                </div>
            </div>
            )}
        
      {showSuccessPopup && (
        <div className="srSuccessBackdrop">
            <div className="srSuccessModal">
            <div className="srSuccessHeader">
                <div className="srSuccessIcon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    />
                </svg>
                </div>
                <div className="srSuccessIconRipple"></div>
            </div>
            
            <div className="srSuccessContent">
                <h3 className="srSuccessTitle">Report Submitted Successfully!</h3>
                <p className="srSuccessMessage">
                Your report has been submitted and will be reviewed by the HR team.
                {showSuccessPopup === 'obform' && ' Would you like to download the Excel file?'}
                </p>
            </div>
            
            <div className="srSuccessFooter">
                {showSuccessPopup === 'obform' ? (
                <>
                    <button 
                    className="srCancelBtn"
                    onClick={() => setShowSuccessPopup(false)}
                    style={{ marginRight: '10px' }}
                    >
                    No, thanks
                    </button>
                    <button 
                    className="srSuccessCloseBtn"
                    onClick={async () => {
                        const success = await generateOBFormExcel();
                        if (!success) {
                        alert('Failed to generate Excel file. Please try again.');
                        }
                        setShowSuccessPopup(false);
                    }}
                    >
                    Yes, Download
                    </button>
                </>
                ) : (
                <button 
                    className="srSuccessCloseBtn"
                    onClick={() => setShowSuccessPopup(false)}
                >
                    Got it!
                </button>
                )}
            </div>
            
            {showSuccessPopup === 'attach' && (
                <div className="srSuccessProgressBar">
                <div className="srSuccessProgressFill"></div>
                </div>
            )}
            </div>
        </div>
        )}

      {showOBFormModal && (
        <div className="srModalBackdrop">
          <div className="srFormModalWrapper">
            <div className="srFormModalHeader">
              <h3>File OB Form - Page {obFormPage} of {obFormData.pages.length}</h3>
              <button 
                className="srModalCloseBtn" 
                onClick={() => {
                  setShowOBFormModal(false);
                  setObFormData({
                    pages: [{
                      date: '',
                      destinationFrom: '',
                      destinationTo: '',
                      departure: '',
                      arrival: '',
                      purpose: ''
                    }]
                  });
                  setObFormPage(1);
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleOBFormSubmit} className="srOBForm">
              <div className="srAutoFilledSection">
                <div className="srFormFieldGroup">
                  <label>Employee Name</label>
                  <input
                    type="text"
                    value={`${employeeInfo.firstName} ${employeeInfo.lastName}`}
                    disabled
                    className="srDisabledInput"
                  />
                </div>

                <div className="srFormFieldGroup">
                  <label>Position</label>
                  <input
                    type="text"
                    value={employeeInfo.position}
                    disabled
                    className="srDisabledInput"
                  />
                </div>

                <div className="srFormFieldGroup">
                  <label>Date Filed</label>
                  <input
                    type="text"
                    value={new Date().toLocaleDateString('en-GB')}
                    disabled
                    className="srDisabledInput"
                  />
                </div>
              </div>

              <div className="srFormFieldGroup">
                <label>Date *</label>
                <input
                  type="date"
                  value={obFormData.pages[obFormPage - 1].date}
                  onChange={(e) => handleOBFormChange('date', e.target.value)}
                  required
                />
              </div>

              <div className="srDestinationGroup">
                <div className="srFormFieldGroup">
                  <label>Destination From *</label>
                  <input
                    type="text"
                    value={obFormData.pages[obFormPage - 1].destinationFrom}
                    onChange={(e) => handleOBFormChange('destinationFrom', e.target.value)}
                    placeholder="Enter starting location"
                    required
                  />
                </div>

                <div className="srFormFieldGroup">
                  <label>Destination To *</label>
                  <input
                    type="text"
                    value={obFormData.pages[obFormPage - 1].destinationTo}
                    onChange={(e) => handleOBFormChange('destinationTo', e.target.value)}
                    placeholder="Enter destination"
                    required
                  />
                </div>
              </div>

              <div className="srTimeGroup">
                <div className="srFormFieldGroup">
                  <label>Departure Time *</label>
                  <input
                    type="time"
                    value={obFormData.pages[obFormPage - 1].departure}
                    onChange={(e) => handleOBFormChange('departure', e.target.value)}
                    required
                  />
                </div>

                <div className="srFormFieldGroup">
                  <label>Arrival Time *</label>
                  <input
                    type="time"
                    value={obFormData.pages[obFormPage - 1].arrival}
                    onChange={(e) => handleOBFormChange('arrival', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="srFormFieldGroup">
                <label>
                    Purpose * 
                    <span style={{ 
                    float: 'right', 
                    fontSize: '12px',
                    color: obFormData.pages[obFormPage - 1].purpose.length > maxPurposeLength ? '#e74c3c' : '#666'
                    }}>
                    {obFormData.pages[obFormPage - 1].purpose.length}/{maxPurposeLength}
                    </span>
                </label>
                <textarea
                    value={obFormData.pages[obFormPage - 1].purpose}
                    onChange={(e) => handleOBFormChange('purpose', e.target.value)}
                    placeholder="Explain the purpose of your official business. Be specific."
                    rows="4"
                    maxLength={maxPurposeLength}
                    required
                />
                {obFormData.pages[obFormPage - 1].purpose.length > maxPurposeLength - 50 && (
                    <p style={{ fontSize: '12px', color: '#e67e22', marginTop: '4px' }}>
                    Warning: You're approaching the character limit
                    </p>
                )}
                </div>

              <div className="srPageNavigation">
                <div className="srPageIndicators">
                  {obFormData.pages.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`srPageIndicator ${obFormPage === index + 1 ? 'active' : ''}`}
                      onClick={() => setObFormPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="srAddPageBtn"
                  onClick={handleAddMorePage}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  Add More
                </button>
              </div>

              <div className="srFormActions">
                {obFormPage > 1 && (
                  <button
                    type="button"
                    className="srPrevBtn"
                    onClick={() => setObFormPage(obFormPage - 1)}
                  >
                    Previous
                  </button>
                )}
                
                {obFormPage < obFormData.pages.length && (
                  <button
                    type="button"
                    className="srNextBtn"
                    onClick={() => setObFormPage(obFormPage + 1)}
                  >
                    Next
                  </button>
                )}

                {obFormData.pages.length > 1 && (
                  <button
                    type="button"
                    className="srRemovePageBtn"
                    onClick={() => handleRemovePage(obFormPage - 1)}
                  >
                    Remove This Page
                  </button>
                )}
                
                <button 
                  type="button" 
                  className="srCancelBtn" 
                  onClick={() => {
                    setShowOBFormModal(false);
                    setObFormData({
                      pages: [{
                        date: '',
                        destinationFrom: '',
                        destinationTo: '',
                        departure: '',
                        arrival: '',
                        purpose: ''
                      }]
                    });
                    setObFormPage(1);
                  }}
                >
                  Cancel
                </button>
                
                <button type="submit" className="srSubmitBtn">
                  Submit OB Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAttachReportModal && (
        <div className="srModalBackdrop">
          <div className="srFormModalWrapper">
            <div className="srFormModalHeader">
              <h3>Attach Service Report</h3>
              <button 
                className="srModalCloseBtn" 
                onClick={() => {
                  setShowAttachReportModal(false);
                  setAttachReportData({
                    title: '',
                    description: '',
                    attachment: null
                  });
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAttachReportSubmit} className="srAttachForm">
              <div className="srFormFieldGroup">
                <label>Report Title *</label>
                <input
                  type="text"
                  value={attachReportData.title}
                  onChange={(e) => setAttachReportData(prev => ({...prev, title: e.target.value}))}
                  placeholder="Enter report title"
                  required
                />
              </div>

              <div className="srFormFieldGroup">
                <label>Description *</label>
                <textarea
                  value={attachReportData.description}
                  onChange={(e) => setAttachReportData(prev => ({...prev, description: e.target.value}))}
                  placeholder="Describe the service report"
                  rows="4"
                  required
                />
              </div>

              <div className="srFormFieldGroup">
                <label>Attach File (Max 5MB) *</label>
                <div className="srFileUploadZone">
                  <input
                    type="file"
                    id="srFileInput"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="srFileInputHidden"
                  />
                  
                  {!attachReportData.attachment ? (
                    <div className="srFileDropContent">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="srUploadIconSvg">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="srDropText">
                        <span className="srDropTextBold">Click to upload</span> or drag and drop
                      </p>
                      <p className="srDropSubtext">Images, PDF, DOC, DOCX, XLS, XLSX (max 5MB)</p>
                    </div>
                  ) : (
                    <div className="srFilePreviewBox">
                      <div className="srFileInfoSection">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="srFileIconSvg">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div className="srFileDetails">
                          <p className="srFileName">{attachReportData.attachment.name}</p>
                          <p className="srFileSize">{formatFileSize(attachReportData.attachment.size)}</p>
                        </div>
                      </div>
                      <button type="button" onClick={removeFile} className="srRemoveFileBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="srFormActions">
                <button 
                  type="button" 
                  className="srCancelBtn" 
                  onClick={() => {
                    setShowAttachReportModal(false);
                    setAttachReportData({
                      title: '',
                      description: '',
                      attachment: null
                    });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="srSubmitBtn">
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{showDetailsModal && reportDetails && (
        <div className="srModalBackdrop">
          <div className="srFormModalWrapper">
            <div className="srFormModalHeader">
              <h3>
                Report Details - {reportDetails.report_type}
                {reportDetails.report_type === 'OB Form' && reportDetails.ob_entries && 
                  ` - Page ${obFormPage} of ${reportDetails.ob_entries.length}`
                }
              </h3>
              <button 
                className="srModalCloseBtn" 
                onClick={() => {
                  setShowDetailsModal(false);
                  setReportDetails(null);
                  setSelectedReport(null);
                  setObFormPage(1); // Reset page
                }}
              >
                ×
              </button>
            </div>
            
            <div className="srDetailsModalContent">
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader className="srLoadingSpinnerCircle" size={40} />
                  <p>Loading details...</p>
                </div>
              ) : reportDetails.status === 'Rejected' ? (
                <div className="srRejectionDisplay">
                  <div className="srRejectionIcon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                      <line x1="15" y1="9" x2="9" y2="15" stroke="#ef4444" strokeWidth="2"/>
                      <line x1="9" y1="9" x2="15" y2="15" stroke="#ef4444" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h3 className="srRejectionTitle">Report Rejected</h3>
                  <div className="srRejectionReasonBox">
                    <label>Reason for Rejection:</label>
                    <p>{reportDetails.remarks || 'No reason provided'}</p>
                  </div>
                  <div className="srFormActions" style={{ marginTop: '30px' }}>
                    <button 
                      className="srCancelBtn"
                      onClick={() => {
                        setShowDetailsModal(false);
                        setReportDetails(null);
                        setSelectedReport(null);
                        setObFormPage(1);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Auto-filled Section */}
                  <div className="srAutoFilledSection">
                    <div className="srFormFieldGroup">
                      <label>Employee Name</label>
                      <input
                        type="text"
                        value={`${employeeInfo.firstName} ${employeeInfo.lastName}`}
                        disabled
                        className="srDisabledInput"
                      />
                    </div>

                    <div className="srFormFieldGroup">
                      <label>Position</label>
                      <input
                        type="text"
                        value={employeeInfo.position}
                        disabled
                        className="srDisabledInput"
                      />
                    </div>

                    <div className="srFormFieldGroup">
                      <label>Date Filed</label>
                      <input
                        type="text"
                        value={formatTimestamp(reportDetails.date_submitted)}
                        disabled
                        className="srDisabledInput"
                      />
                    </div>
                  </div>

                  {/* OB Form Entries - Using Same Design as Filing Form */}
                  {reportDetails.report_type === 'OB Form' && reportDetails.ob_entries && reportDetails.ob_entries.length > 0 && (
                    <>
                      {/* Current Entry Display */}
                      {(() => {
                        const currentEntry = reportDetails.ob_entries[obFormPage - 1];
                        return (
                          <>
                            <div className="srFormFieldGroup">
                              <label>Date *</label>
                              <input
                                type="text"
                                value={formatDate(currentEntry.ob_date)}
                                disabled
                                className="srDisabledInput"
                              />
                            </div>

                            <div className="srDestinationGroup">
                              <div className="srFormFieldGroup">
                                <label>Destination From *</label>
                                <input
                                  type="text"
                                  value={currentEntry.destination_from}
                                  disabled
                                  className="srDisabledInput"
                                />
                              </div>

                              <div className="srFormFieldGroup">
                                <label>Destination To *</label>
                                <input
                                  type="text"
                                  value={currentEntry.destination_to}
                                  disabled
                                  className="srDisabledInput"
                                />
                              </div>
                            </div>

                            <div className="srTimeGroup">
                              <div className="srFormFieldGroup">
                                <label>Departure Time *</label>
                                <input
                                  type="text"
                                  value={formatTime12Hour(currentEntry.departure_time)}
                                  disabled
                                  className="srDisabledInput"
                                />
                              </div>

                              <div className="srFormFieldGroup">
                                <label>Arrival Time *</label>
                                <input
                                  type="text"
                                  value={formatTime12Hour(currentEntry.arrival_time)}
                                  disabled
                                  className="srDisabledInput"
                                />
                              </div>
                            </div>

                            <div className="srFormFieldGroup">
                              <label>Purpose *</label>
                              <textarea
                                value={currentEntry.purpose}
                                disabled
                                className="srDisabledInput"
                                rows="4"
                              />
                            </div>
                          </>
                        );
                      })()}

                      {/* Page Navigation - Same as Filing Form */}
                      <div className="srPageNavigation">
                        <div className="srPageIndicators">
                          {reportDetails.ob_entries.map((_, index) => (
                            <button
                              key={index}
                              type="button"
                              className={`srPageIndicator ${obFormPage === index + 1 ? 'active' : ''}`}
                              onClick={() => setObFormPage(index + 1)}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>

                        <div style={{ 
                          fontSize: '14px', 
                          color: '#7f8c8d',
                          fontWeight: '500'
                        }}>
                          Total Entries: {reportDetails.ob_entries.length}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Service Report File */}
                  {reportDetails.report_type === 'Service Report' && (
                    <>
                      <div className="srFormFieldGroup">
                        <label>Report Title</label>
                        <input
                          type="text"
                          value={reportDetails.title}
                          disabled
                          className="srDisabledInput"
                        />
                      </div>

                      <div className="srFormFieldGroup">
                        <label>Description</label>
                        <textarea
                          value={reportDetails.description || 'No description provided'}
                          disabled
                          className="srDisabledInput"
                          rows="4"
                        />
                      </div>

                      {reportDetails.file_path && (
                        <div className="srFormFieldGroup">
                          <label>Attached File</label>
                          <div style={{
                            padding: '15px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="14,2 14,8 20,8" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <div>
                                <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{reportDetails.file_name}</p>
                                <p style={{ fontSize: '12px', color: '#7f8c8d' }}>{formatFileSize(reportDetails.file_size)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => window.open(`http://localhost/difsysapi/${reportDetails.file_path}`, '_blank')}
                              className="srSubmitBtn"
                              style={{ margin: 0 }}
                            >
                              Open File
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="srFormActions" style={{ marginTop: '30px' }}>
                    {reportDetails.report_type === 'OB Form' && reportDetails.ob_entries && (
                      <button
                        className="srSubmitBtn"
                        onClick={async () => {
                          const success = await generateOBFormExcelFromReport(reportDetails, reportDetails.ob_entries);
                          if (!success) {
                            alert('Failed to generate Excel file. Please try again.');
                          }
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                        Download Excel
                      </button>
                    )}
                    <button 
                      className="srCancelBtn"
                      onClick={() => {
                        setShowDetailsModal(false);
                        setReportDetails(null);
                        setSelectedReport(null);
                        setObFormPage(1); // Reset page
                      }}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="srHeaderWrapper">
        <div className="srProfileSection">
          <div className="srAvatarDisplay">
            {employeeInfo.profile_image ? (
              <img 
                src={employeeInfo.profile_image.startsWith('http') 
                  ? employeeInfo.profile_image 
                  : `http://localhost/difsysapi/${employeeInfo.profile_image}`} 
                alt={`${employeeInfo.firstName} ${employeeInfo.lastName}`}
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
            <span 
              className="srAvatarText" 
              style={{ display: employeeInfo.profile_image ? 'none' : 'block' }}
            >
              {employeeInfo.firstName?.[0]}{employeeInfo.lastName?.[0]}
            </span>
          </div>
          <div className="srProfileInfo">
            <h1 className="srNameDisplay">
              {employeeInfo.firstName} {employeeInfo.lastName}
            </h1>
            <p className="srRoleDisplay">{employeeInfo.position}</p>
          </div>
        </div>

        <div className="srInfoCardsGrid">
          <div className="srInfoCardItem">
            <div className="srInfoIconWrapper srIconGreen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="srInfoContent">
              <p className="srInfoLabel">Employee ID</p>
              <p className="srInfoValue">DIF{String(employeeInfo.emp_id).padStart(3, '0')}</p>
            </div>
          </div>
          
          <div className="srInfoCardItem">
            <div className="srInfoIconWrapper srIconBlue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
            </div>
            <div className="srInfoContent">
              <p className="srInfoLabel">Total Reports</p>
              <p className="srInfoValue">{reports.length}</p>
            </div>
          </div>
          
          <div className="srInfoCardItem">
            <div className="srInfoIconWrapper srIconPurple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z"/>
              </svg>
            </div>
            <div className="srInfoContent">
              <p className="srInfoLabel">Department</p>
              <p className="srInfoValue">Account</p>
            </div>
          </div>
        </div>
      </div>

      <div className="srActionWrapper">
        <div className="srDropdownContainer" ref={dropdownRef}>
          <button 
            className="srSelectActionBtn" 
            onClick={() => setShowActionDropdown(!showActionDropdown)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Select Action
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="srDropdownIcon">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          
          {showActionDropdown && (
            <div className="srDropdownMenu">
              <button
                className="srDropdownItem"
                onClick={() => {
                  setShowOBFormModal(true);
                  setShowActionDropdown(false);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                </svg>
                File OB Form
              </button>
              
              <button
                className="srDropdownItem"
                onClick={() => {
                  setShowAttachReportModal(true);
                  setShowActionDropdown(false);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                </svg>
                Attach Service Report
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="srTableWrapper">
        <table className="srDataTable">
          <thead>
            <tr className="srTableHeader">
              <th>REPORT ID</th>
              <th>REPORT TYPE</th>
              <th>TITLE</th>
              <th>DATE SUBMITTED</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReports.map((report, index) => (
              <tr key={index} className="srTableRow">
                <td className="srIdCell">{report.id}</td>
                <td className="srTypeCell">{report.type}</td>
                <td className="srTitleCell">{report.title}</td>
                <td className="srDateCell">{formatDate(report.date_submitted)}</td>
                <td className="srStatusCell">
                  <span className={`srStatusBadge ${getTableStatusClass(report.status)}`}>
                    {report.status.toUpperCase()}
                  </span>
                </td>
                <td className="srActionsCell">
                    <button 
                        className="srViewBtn"
                        onClick={() => handleViewDetails(report)}
                    >
                        View Details
                    </button>
                    </td>
              </tr>
            ))}
            {paginatedReports.length === 0 && (
              <tr>
                <td colSpan="6" className="srEmptyState">
                  No reports found. Click "Select Action" to file a report.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="srPaginationSection">
            <div className="srPaginationInfo">
              Showing {startIndex + 1} to {Math.min(endIndex, reports.length)} of {reports.length} entries
            </div>
            <div className="srPaginationControls">
              {renderPaginationButtons()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceReport;