import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUserId } from '../../utils/auth';
import axios from 'axios';
import * as ExcelJS from 'exceljs';
import { Loader } from 'lucide-react';
import difsyslogo from '../../assets/difsyslogo.png';
import '../../components/SupervisorLayout/TeamOB.css';

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
  const date = new Date(dateStr.replace(' ', 'T'));
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
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getTableStatusClass = (status) => {
  switch (status) {
    case 'Pending': return 'tob-status-pending';
    case 'Approved': return 'tob-status-approved';
    case 'Rejected': return 'tob-status-rejected';
    default: return 'tob-status-pending';
  }
};

const TeamOB = () => {
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showTeamOBModal, setShowTeamOBModal] = useState(false);
  const [showAttachReportModal, setShowAttachReportModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetails, setReportDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [currentEntryGroup, setCurrentEntryGroup] = useState(1);
  const dropdownRef = useRef(null);

  const [supervisorInfo, setSupervisorInfo] = useState({
    firstName: '',
    lastName: '',
    sup_id: null,
    position: '',
    profile_image: null
  });

  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [teamOBData, setTeamOBData] = useState({
    title: '',
    entries: [
      {
        employee_ids: [],
        designation: '',
        assign_task: '',
        time_duration: '',
        remarks: ''
      }
    ]
  });

  const [attachReportData, setAttachReportData] = useState({
    title: '',
    description: '',
    attachment: null
  });

  const API_BASE_URL = 'http://localhost/difsysapi/team_ob.php';
  const TEAM_API_URL = 'http://localhost/difsysapi/fetch_team.php';
  const itemsPerPage = 8;

  useEffect(() => {
    document.title = "DIFSYS | TEAM SERVICE REPORT";
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowActionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const initializeSupervisor = async () => {
      const userId = getUserId();
      
      if (!userId) {
        window.location.href = '/login';
        return;
      }
      
      try {
        const response = await axios.get(
          `http://localhost/difsysapi/team_ob.php?action=getSupervisorInfo&sup_id=${userId}`
        );
        
        if (response.data.success) {
          const supervisor = response.data.supervisor;
          setSupervisorInfo({
            firstName: supervisor.firstName || '',
            lastName: supervisor.lastName || '',
            sup_id: supervisor.sup_id,
            position: supervisor.position || 'Supervisor',
            profile_image: supervisor.profile_image
          });
          
          fetchSupervisorReports(supervisor.sup_id);
          fetchTeamMembers(supervisor.sup_id);
        } else {
          console.error('Supervisor lookup failed:', response.data);
          alert(`Unable to load supervisor information.\nUser ID: ${userId}\nError: ${response.data.error || 'Unknown error'}\n\nPlease contact your administrator.`);
          // Don't redirect, let them see the error
          // window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error initializing supervisor:', error);
        alert('Failed to load supervisor information. Please try again.');
        window.location.href = '/login';
      }
    };
    
    initializeSupervisor();
  }, []);


  const fetchSupervisorReports = useCallback(async (supervisorId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}?action=getSupervisorReports&supervisor_id=${supervisorId}`);
      
      if (response.data.success) {
        setReports(response.data.reports || []);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const fetchTeamMembers = useCallback(async (supervisorId) => {
    try {
      const response = await axios.get(`${TEAM_API_URL}?supervisor_id=${supervisorId}`);
      
      if (response.data.success) {
        setTeamMembers(response.data.team_members || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }, [TEAM_API_URL]);

  const createOBFormInExcel = async (worksheet, startCol, destinationActivities, formNumber, supInfo, teamActivities = []) => {
    const colOffset = startCol === 'B' ? 1 : 9;
    const getCol = (offset) => String.fromCharCode(65 + colOffset + offset);
  
    // Use the passed supInfo instead of relying on state
    const supervisorData = supInfo || supervisorInfo;
  
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
      let border = { bottom: { style: 'medium' } };
      if (col === 0) border.left = { style: 'medium' };
      if (col === 6) border.right = { style: 'medium' };
      cell.border = border;
    }
  
    worksheet.mergeCells(`${getCol(2)}2:${getCol(5)}2`);
    const titleCell = worksheet.getCell(`${getCol(2)}2`);
    titleCell.value = 'OB FORM';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    for (let col = 0; col <= 6; col++) {
      const cell = worksheet.getCell(`${getCol(col)}2`);
      cell.border = { ...cell.border, top: { style: 'medium' } };
    }
  
    worksheet.mergeCells(`${getCol(0)}4:${getCol(1)}4`);
    worksheet.getCell(`${getCol(0)}4`).value = 'Employee Name:';
    worksheet.getCell(`${getCol(0)}4`).font = { bold: true };
    
    worksheet.mergeCells(`${getCol(3)}4:${getCol(5)}4`);
    const nameCell = worksheet.getCell(`${getCol(3)}4`);
    nameCell.value = `${supervisorData.firstName} ${supervisorData.lastName}`;
    nameCell.alignment = { horizontal: 'center', vertical: 'middle' };
    nameCell.border = { bottom: { style: 'thin' } };
  
    worksheet.mergeCells(`${getCol(0)}5:${getCol(1)}5`);
    worksheet.getCell(`${getCol(0)}5`).value = 'Position:';
    worksheet.getCell(`${getCol(0)}5`).font = { bold: true };
    
    worksheet.mergeCells(`${getCol(3)}5:${getCol(5)}5`);
    const posCell = worksheet.getCell(`${getCol(3)}5`);
    posCell.value = supervisorData.position;
    posCell.alignment = { horizontal: 'center', vertical: 'middle' };
    posCell.border = { bottom: { style: 'thin' } };
  
    worksheet.mergeCells(`${getCol(0)}6:${getCol(1)}6`);
    worksheet.getCell(`${getCol(0)}6`).value = 'Date file :';
    worksheet.getCell(`${getCol(0)}6`).font = { bold: true };
    worksheet.getCell(`${getCol(0)}6`).border = { left: { style: 'medium' } };
    
    worksheet.mergeCells(`${getCol(3)}6:${getCol(5)}6`);
    const dateCell = worksheet.getCell(`${getCol(3)}6`);
    dateCell.value = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateCell.border = { bottom: { style: 'thin' } };

    // DATE header (Row 9, Column 1)
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

    // Sub-headers (Row 10)
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

    // Data rows (11-18) - 8 rows for entries
    for (let row = 11; row <= 18; row++) {
      for (let col = 1; col <= 5; col++) {
        const cell = worksheet.getCell(`${getCol(col)}${row}`);
        
        const entryIndex = row - 11;
        if (Array.isArray(destinationActivities) && entryIndex < destinationActivities.length) {
          const entry = destinationActivities[entryIndex];
          if (col === 1) cell.value = entry.date || '';
          else if (col === 2) cell.value = entry.destinationFrom || '';
          else if (col === 3) cell.value = entry.destinationTo || '';
          else if (col === 4) cell.value = formatTime12Hour(entry.departure) || '';
          else if (col === 5) cell.value = formatTime12Hour(entry.arrival) || '';
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

    // PURPOSE section (Row 20-23)
    worksheet.getCell(`${getCol(1)}20`).value = 'PURPOSE :';
    worksheet.getCell(`${getCol(1)}20`).font = { bold: true, size: 11 };
    worksheet.getCell(`${getCol(1)}20`).alignment = { horizontal: 'right', vertical: 'top' };
    
    worksheet.mergeCells(`${getCol(2)}20:${getCol(5)}23`);
    const purposeCell = worksheet.getCell(`${getCol(2)}20`);
    
    let combinedPurposes = '';
    if (Array.isArray(destinationActivities)) {
      combinedPurposes = destinationActivities.map((entry, index) => {
        return `${index + 1}. ${entry.purpose}`;
      }).join('\n');
    }
    purposeCell.value = combinedPurposes;
    purposeCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

    // Team Activity section header (Row 25)
    worksheet.mergeCells(`${getCol(1)}25:${getCol(5)}25`);
    const teamCell = worksheet.getCell(`${getCol(1)}25`);
    teamCell.value = 'To be filled out by the supervisor only';
    teamCell.font = { italic: true, size: 9 };
    teamCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // TEAM ACTIVITY header (Row 26)
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

    // Team activity data rows (28-33) - Fill with actual team activity data
    for (let row = 28; row <= 33; row++) {
      for (let col = 1; col <= 5; col++) {
        const cell = worksheet.getCell(`${getCol(col)}${row}`);
        
        // Fill in the data from teamActivities array
        const activityIndex = row - 28;
        if (Array.isArray(teamActivities) && activityIndex < teamActivities.length) {
          const activity = teamActivities[activityIndex];
          if (col === 1) cell.value = activity.employee_name || '';
          else if (col === 2) cell.value = activity.designation || '';
          else if (col === 3) cell.value = activity.assign_task || '';
          else if (col === 4) cell.value = activity.time_duration || '';
          else if (col === 5) cell.value = activity.remarks || '';
        }
        
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
    supCell.border = { right: { style: 'medium' }, left: { style: 'medium' } };

    // Computation section (Row 35)
    worksheet.mergeCells(`${getCol(0)}35:${getCol(1)}35`);
    const compCell = worksheet.getCell(`${getCol(0)}35`);
    compCell.value = 'STANDARD OF COMPUTATION';
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

  const generateOBFormExcelFromReport = async (reportData, activities) => {
    try {
      let currentSupervisorInfo = { ...supervisorInfo };
      
      if (!currentSupervisorInfo.firstName || !currentSupervisorInfo.lastName || !currentSupervisorInfo.sup_id) {
        const userId = getUserId();
        if (!userId) {
          alert('Session expired. Please log in again.');
          return false;
        }
        
        try {
          const response = await axios.get(
            `http://localhost/difsysapi/team_ob.php?action=getSupervisorInfo&sup_id=${userId}`
          );
          
          if (response.data.success) {
            currentSupervisorInfo = {
              firstName: response.data.supervisor.firstName || '',
              lastName: response.data.supervisor.lastName || '',
              sup_id: response.data.supervisor.sup_id,
              position: response.data.supervisor.position || 'Supervisor',
              profile_image: response.data.supervisor.profile_image
            };
            setSupervisorInfo(currentSupervisorInfo);
          } else {
            throw new Error('Unable to fetch supervisor information');
          }
        } catch (error) {
          console.error('Error fetching supervisor info:', error);
          alert('Unable to load supervisor information. Please refresh the page and try again.');
          return false;
        }
      }
      
      if (!currentSupervisorInfo.firstName || !currentSupervisorInfo.lastName) {
        alert('Supervisor information is incomplete. Please refresh the page and try again.');
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
      worksheet.getColumn('M').width = 18;
      worksheet.getColumn('N').width = 14;
      worksheet.getColumn('O').width = 14;
      worksheet.getColumn('P').width = 3;
  
      for (let i = 1; i <= 42; i++) {
        worksheet.getRow(i).height = 15;
      }
  
      const leftFormCol = 'B';
      const rightFormCol = 'J';
      
      const emptyEntries = []; // No destination/time data for Team OB

      await createOBFormInExcel(worksheet, leftFormCol, emptyEntries, 1, currentSupervisorInfo, activities);
      await createOBFormInExcel(worksheet, rightFormCol, emptyEntries, 2, currentSupervisorInfo, activities);
  
      const filename = `Team_OB_Form_${currentSupervisorInfo.firstName}_${currentSupervisorInfo.lastName}_${reportData.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
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
      alert('Failed to generate Excel file: ' + error.message);
      return false;
    }
  };
  

  const fetchReportDetails = async (reportId) => {
    try {
      setLoadingDetails(true);
      const response = await axios.get(`${API_BASE_URL}?action=getReportDetails&report_id=${reportId}`);
      
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

  const handleAddEntry = () => {
    setTeamOBData(prev => ({
      ...prev,
      entries: [
        ...prev.entries,
        {
          employee_ids: [],
          designation: '',
          assign_task: '',
          time_duration: '',
          remarks: ''
        }
      ]
    }));
    setCurrentEntryGroup(teamOBData.entries.length + 1);
  };

  const handleRemoveEntry = (index) => {
    if (teamOBData.entries.length > 1) {
      setTeamOBData(prev => ({
        ...prev,
        entries: prev.entries.filter((_, i) => i !== index)
      }));
      if (currentEntryGroup > teamOBData.entries.length - 1) {
        setCurrentEntryGroup(teamOBData.entries.length - 1);
      }
    }
  };

  const handleEntryChange = (index, field, value) => {
    setTeamOBData(prev => {
      const newEntries = [...prev.entries];
      newEntries[index] = {
        ...newEntries[index],
        [field]: value
      };
      return { ...prev, entries: newEntries };
    });
  };

  const handleEmployeeSelection = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) 
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const handleConfirmEmployees = () => {
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }
    
    setTeamOBData(prev => {
      const newEntries = [...prev.entries];
      newEntries[currentEntryGroup - 1] = {
        ...newEntries[currentEntryGroup - 1],
        employee_ids: selectedEmployees
      };
      return { ...prev, entries: newEntries };
    });
    
    setShowEmployeeModal(false);
    setSelectedEmployees([]);
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

  const handleTeamOBSubmit = async (e) => {
    e.preventDefault();
    
    if (!teamOBData.title) {
      alert('Please enter a report title');
      return;
    }

    const isValid = teamOBData.entries.every(entry => 
      entry.employee_ids.length > 0 &&
      entry.designation &&
      entry.assign_task &&
      entry.time_duration
    );
    
    if (!isValid) {
      alert('Please fill in all required fields for all entries');
      return;
    }

    try {
      setShowLoading(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('action', 'submitTeamOB');
      formDataToSend.append('supervisor_id', supervisorInfo.sup_id);
      formDataToSend.append('title', teamOBData.title);
      formDataToSend.append('entries', JSON.stringify(teamOBData.entries));

      const response = await axios.post(API_BASE_URL, formDataToSend);

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowLoading(false);

      if (response.data.success) {
        setTeamOBData({
          title: '',
          entries: [{
            employee_ids: [],
            designation: '',
            assign_task: '',
            time_duration: '',
            remarks: ''
          }]
        });
        setCurrentEntryGroup(1);
        setShowTeamOBModal(false);
        setShowSuccessPopup('obform');
        
        await fetchSupervisorReports(supervisorInfo.sup_id);
      } else {
        alert('Failed to submit Team OB: ' + response.data.message);
      }
    } catch (error) {
      setShowLoading(false);
      console.error('Error submitting Team OB:', error);
      alert('Failed to submit Team OB. Please try again.');
    }
  };

  const handleAttachReportSubmit = async (e) => {
    e.preventDefault();
    
    if (!attachReportData.title || !attachReportData.description || !attachReportData.attachment) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setShowLoading(true);

      const formDataToSend = new FormData();
      formDataToSend.append('action', 'attachReport');
      formDataToSend.append('supervisor_id', supervisorInfo.sup_id);
      formDataToSend.append('title', attachReportData.title);
      formDataToSend.append('description', attachReportData.description);
      formDataToSend.append('attachment', attachReportData.attachment);

      const response = await axios.post(API_BASE_URL, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowLoading(false);

      if (response.data.success) {
        setAttachReportData({
          title: '',
          description: '',
          attachment: null
        });
        setShowAttachReportModal(false);
        setShowSuccessPopup('attach');
        setTimeout(() => setShowSuccessPopup(false), 5000);
        await fetchSupervisorReports(supervisorInfo.sup_id);
      } else {
        alert('Failed to attach report. Please try again.');
      }
    } catch (error) {
      setShowLoading(false);
      console.error('Error attaching report:', error);
      alert('Failed to attach report. Please try again.');
    }
  };

  const filteredTeamMembers = teamMembers.filter(member =>
    member.firstName.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
    member.lastName.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
    member.position.toLowerCase().includes(employeeSearchTerm.toLowerCase())
  );

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
          className={`tob-pagination-btn ${currentPage === i ? 'tob-pagination-active' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(<span key="dots" className="tob-pagination-dots">...</span>);
      buttons.push(
        <button
          key={totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className={`tob-pagination-btn ${currentPage === totalPages ? 'tob-pagination-active' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  const getEmployeeNames = (employeeIds) => {
    return employeeIds
      .map(id => {
        const member = teamMembers.find(m => m.emp_id === id);
        return member ? `${member.firstName} ${member.lastName}` : '';
      })
      .filter(Boolean)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="tob-container">
        <div className="tob-loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="tob-page">
      {showLoading && (
        <div className="tob-loading-backdrop">
          <div className="tob-loading-spinner-container">
            <Loader className="tob-loading-spinner-circle" size={60} />
            <p className="tob-loading-text">Submitting your report...</p>
          </div>
        </div>
      )}

      {showAttachReportModal && (
        <div className="tob-modal-backdrop">
          <div className="tob-form-modal-wrapper">
            <div className="tob-form-modal-header">
              <h3>Attach Service Report</h3>
              <button 
                className="tob-modal-close-btn" 
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
            
            <form onSubmit={handleAttachReportSubmit} className="tob-form">
              <div className="tob-form-field-group">
                <label>Report Title *</label>
                <input
                  type="text"
                  value={attachReportData.title}
                  onChange={(e) => setAttachReportData(prev => ({...prev, title: e.target.value}))}
                  placeholder="Enter report title"
                  required
                />
              </div>

              <div className="tob-form-field-group">
                <label>Description *</label>
                <textarea
                  value={attachReportData.description}
                  onChange={(e) => setAttachReportData(prev => ({...prev, description: e.target.value}))}
                  placeholder="Describe the service report"
                  rows="4"
                  required
                />
              </div>

              <div className="tob-form-field-group">
                <label>Attach File (Max 5MB) *</label>
                <div className="tob-file-upload-zone">
                  <input
                    type="file"
                    id="tobFileInput"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="tob-file-input-hidden"
                  />
                  
                  {!attachReportData.attachment ? (
                    <div className="tob-file-drop-content">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="tob-upload-icon-svg">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="tob-drop-text">
                        <span className="tob-drop-text-bold">Click to upload</span> or drag and drop
                      </p>
                      <p className="tob-drop-subtext">Images, PDF, DOC, DOCX, XLS, XLSX (max 5MB)</p>
                    </div>
                  ) : (
                    <div className="tob-file-preview-box">
                      <div className="tob-file-info-section">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="tob-file-icon-svg">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div className="tob-file-details">
                          <p className="tob-file-name">{attachReportData.attachment.name}</p>
                          <p className="tob-file-size">{formatFileSize(attachReportData.attachment.size)}</p>
                        </div>
                      </div>
                      <button type="button" onClick={removeFile} className="tob-remove-file-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="tob-form-actions">
                <button 
                  type="button" 
                  className="tob-cancel-btn" 
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
                <button type="submit" className="tob-submit-btn">
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className="tob-success-backdrop">
          <div className="tob-success-modal">
            <div className="tob-success-header">
              <div className="tob-success-icon">
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
            </div>
            
            <div className="tob-success-content">
              <h3 className="tob-success-title">Report Submitted Successfully!</h3>
              <p className="tob-success-message">
                Your {showSuccessPopup === 'obform' ? 'team activity' : 'service'} report has been submitted and will be reviewed by the HR team.
                {showSuccessPopup === 'obform' && ' Would you like to download the Excel file?'}
              </p>
            </div>
            
            <div className="tob-success-footer">
              {showSuccessPopup === 'obform' ? (
                <>
                  <button 
                    className="tob-cancel-btn"
                    onClick={() => setShowSuccessPopup(false)}
                    style={{ marginRight: '10px' }}
                  >
                    No, thanks
                  </button>
                  <button 
                      className="tob-success-close-btn"
                      onClick={async () => {
                        setShowLoading(true);
                        try {
                          // Fetch the latest reports to get activities
                          const response = await axios.get(`${API_BASE_URL}?action=getSupervisorReports&supervisor_id=${supervisorInfo.sup_id}`);
                          
                          if (response.data.success && response.data.reports.length > 0) {
                            const latestReport = response.data.reports[0];
                            
                            if (latestReport.activities && latestReport.activities.length > 0) {
                              const success = await generateOBFormExcelFromReport(latestReport, latestReport.activities);
                              if (!success) {
                                alert('Failed to generate Excel file. Please try again from the details view.');
                              }
                            } else {
                              alert('No activities found for this report.');
                            }
                          } else {
                            alert('Could not fetch the latest report.');
                          }
                        } catch (error) {
                          console.error('Error downloading Excel:', error);
                          alert('Failed to download Excel file.');
                        } finally {
                          setShowLoading(false);
                          setShowSuccessPopup(false);
                        }
                      }}
                    >
                      Yes, Download
                    </button>
                </>
              ) : (
                <button 
                  className="tob-success-close-btn"
                  onClick={() => setShowSuccessPopup(false)}
                >
                  Got it!
                </button>
              )}
            </div>
            
            {showSuccessPopup === 'attach' && (
              <div className="tob-success-progress-bar">
                <div className="tob-success-progress-fill"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {showTeamOBModal && (
        <div className="tob-modal-backdrop">
          <div className="tob-form-modal-wrapper">
            <div className="tob-form-modal-header">
              <h3>Team Activity Report - Entry {currentEntryGroup} of {teamOBData.entries.length}</h3>
              <button 
                className="tob-modal-close-btn" 
                onClick={() => {
                  setShowTeamOBModal(false);
                  setTeamOBData({
                    title: '',
                    entries: [{
                      employee_ids: [],
                      designation: '',
                      assign_task: '',
                      time_duration: '',
                      remarks: ''
                    }]
                  });
                  setCurrentEntryGroup(1);
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleTeamOBSubmit} className="tob-form">
              <div className="tob-form-field-group">
                <label>Report Title *</label>
                <input
                  type="text"
                  value={teamOBData.title}
                  onChange={(e) => setTeamOBData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter report title"
                  required
                />
              </div>

              <div className="tob-form-field-group">
                <label>Selected Employees *</label>
                <div className="tob-employee-display">
                  {teamOBData.entries[currentEntryGroup - 1]?.employee_ids.length > 0 ? (
                    <div className="tob-selected-employees">
                      {getEmployeeNames(teamOBData.entries[currentEntryGroup - 1].employee_ids)}
                    </div>
                  ) : (
                    <div className="tob-no-employees">No employees selected</div>
                  )}
                  <button
                    type="button"
                    className="tob-select-employee-btn"
                    onClick={() => {
                      setSelectedEmployees(teamOBData.entries[currentEntryGroup - 1]?.employee_ids || []);
                      setShowEmployeeModal(true);
                    }}
                  >
                    Select Employees
                  </button>
                </div>
              </div>

              <div className="tob-form-field-group">
                <label>Designation *</label>
                <input
                  type="text"
                  value={teamOBData.entries[currentEntryGroup - 1]?.designation || ''}
                  onChange={(e) => handleEntryChange(currentEntryGroup - 1, 'designation', e.target.value)}
                  placeholder="Enter designation"
                  required
                />
              </div>

              <div className="tob-form-field-group">
                <label>Assigned Task *</label>
                <textarea
                  value={teamOBData.entries[currentEntryGroup - 1]?.assign_task || ''}
                  onChange={(e) => handleEntryChange(currentEntryGroup - 1, 'assign_task', e.target.value)}
                  placeholder="Describe the assigned task"
                  rows="4"
                  required
                />
              </div>

              <div className="tob-form-field-group">
                <label>Time Duration *</label>
                <input
                  type="text"
                  value={teamOBData.entries[currentEntryGroup - 1]?.time_duration || ''}
                  onChange={(e) => handleEntryChange(currentEntryGroup - 1, 'time_duration', e.target.value)}
                  placeholder="e.g., 8:00 AM - 5:00 PM"
                  required
                />
              </div>

              <div className="tob-form-field-group">
                <label>Remarks</label>
                <textarea
                  value={teamOBData.entries[currentEntryGroup - 1]?.remarks || ''}
                  onChange={(e) => handleEntryChange(currentEntryGroup - 1, 'remarks', e.target.value)}
                  placeholder="Additional remarks (optional)"
                  rows="3"
                />
              </div>

              <div className="tob-entry-navigation">
                <div className="tob-entry-indicators">
                  {teamOBData.entries.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`tob-entry-indicator ${currentEntryGroup === index + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentEntryGroup(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="tob-add-entry-btn"
                  onClick={handleAddEntry}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  Add More
                </button>
              </div>

              <div className="tob-form-actions">
                {currentEntryGroup > 1 && (
                  <button
                    type="button"
                    className="tob-prev-btn"
                    onClick={() => setCurrentEntryGroup(currentEntryGroup - 1)}
                  >
                    Previous
                  </button>
                )}
                
                {currentEntryGroup < teamOBData.entries.length && (
                  <button
                    type="button"
                    className="tob-next-btn"
                    onClick={() => setCurrentEntryGroup(currentEntryGroup + 1)}
                  >
                    Next
                  </button>
                )}

                {teamOBData.entries.length > 1 && (
                  <button
                    type="button"
                    className="tob-remove-entry-btn"
                    onClick={() => handleRemoveEntry(currentEntryGroup - 1)}
                  >
                    Remove This Entry
                  </button>
                )}
                
                <button 
                  type="button" 
                  className="tob-cancel-btn" 
                  onClick={() => {
                    setShowTeamOBModal(false);
                    setTeamOBData({
                      title: '',
                      entries: [{
                        employee_ids: [],
                        designation: '',
                        assign_task: '',
                        time_duration: '',
                        remarks: ''
                      }]
                    });
                    setCurrentEntryGroup(1);
                  }}
                >
                  Cancel
                </button>
                
                <button type="submit" className="tob-submit-btn">
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEmployeeModal && (
        <div className="tob-modal-backdrop">
          <div className="tob-employee-modal">
            <div className="tob-modal-header">
              <h3>Select Team Members</h3>
              <button
                className="tob-modal-close-btn"
                onClick={() => {
                  setShowEmployeeModal(false);
                  setEmployeeSearchTerm('');
                }}
              >
                ×
              </button>
            </div>
            <div className="tob-modal-content">
              <div className="tob-search-container">
                <input
                  type="text"
                  placeholder="Search team members..."
                  className="tob-search-input"
                  value={employeeSearchTerm}
                  onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                />
              </div>
              <div className="tob-employee-list">
                {filteredTeamMembers.map((member) => (
                  <div key={member.emp_id} className="tob-employee-item">
                    <div className="tob-employee-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(member.emp_id)}
                        onChange={() => handleEmployeeSelection(member.emp_id)}
                      />
                    </div>
                    <div className="tob-employee-info">
                      <span className="tob-employee-name">
                        {member.firstName} {member.lastName}
                      </span>
                      <span className="tob-employee-position">{member.position}</span>
                      <span className="tob-employee-email">{member.email}</span>
                    </div>
                  </div>
                ))}
                {filteredTeamMembers.length === 0 && (
                  <div className="tob-empty-state">No team members found</div>
                )}
              </div>
              <div className="tob-modal-actions">
                <button
                  className="tob-cancel-btn"
                  onClick={() => {
                    setShowEmployeeModal(false);
                    setEmployeeSearchTerm('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="tob-confirm-btn"
                  onClick={handleConfirmEmployees}
                >
                  Confirm Selection ({selectedEmployees.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && reportDetails && (
        <div className="tob-modal-backdrop">
          <div className="tob-form-modal-wrapper">
            <div className="tob-form-modal-header">
              <h3>Report Details</h3>
              <button 
                className="tob-modal-close-btn" 
                onClick={() => {
                  setShowDetailsModal(false);
                  setReportDetails(null);
                  setSelectedReport(null);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="tob-details-modal-content">
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader className="tob-loading-spinner-circle" size={40} />
                  <p>Loading details...</p>
                </div>
              ) : reportDetails.status === 'Rejected' ? (
                <div className="tob-rejection-display">
                  <div className="tob-rejection-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                      <line x1="15" y1="9" x2="9" y2="15" stroke="#ef4444" strokeWidth="2"/>
                      <line x1="9" y1="9" x2="15" y2="15" stroke="#ef4444" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h3 className="tob-rejection-title">Report Rejected</h3>
                  <div className="tob-rejection-reason-box">
                    <label>Reason for Rejection:</label>
                    <p>{reportDetails.remarks || 'No reason provided'}</p>
                  </div>
                  <div className="tob-modal-actions" style={{ marginTop: '30px' }}>
                    <button 
                      className="tob-cancel-btn"
                      onClick={() => {
                        setShowDetailsModal(false);
                        setReportDetails(null);
                        setSelectedReport(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="tob-details-section">
                    <div className="tob-form-field-group">
                      <label>Report Title</label>
                      <input
                        type="text"
                        value={reportDetails.title}
                        disabled
                        className="tob-disabled-input"
                      />
                    </div>

                    <div className="tob-form-field-group">
                      <label>Date Submitted</label>
                      <input
                        type="text"
                        value={formatTimestamp(reportDetails.date_submitted)}
                        disabled
                        className="tob-disabled-input"
                      />
                    </div>

                    <div className="tob-form-field-group">
                      <label>Status</label>
                      <input
                        type="text"
                        value={reportDetails.status}
                        disabled
                        className="tob-disabled-input"
                      />
                    </div>

                    {reportDetails.report_type && (
                      <div className="tob-form-field-group">
                        <label>Report Type</label>
                        <input
                          type="text"
                          value={reportDetails.report_type}
                          disabled
                          className="tob-disabled-input"
                        />
                      </div>
                    )}
                  </div>

                  {reportDetails.report_type === 'Service Report' && (
                    <div className="tob-service-report-section">
                      <h4>Service Report Details</h4>
                      <div className="tob-form-field-group">
                        <label>Description</label>
                        <textarea
                          value={reportDetails.description || 'No description provided'}
                          disabled
                          className="tob-disabled-input"
                          rows="4"
                        />
                      </div>

                      {reportDetails.file_path && (
                        <div className="tob-form-field-group">
                          <label>Attached File</label>
                          <div className="tob-file-download-box">
                            <div className="tob-file-download-info">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="14,2 14,8 20,8" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <div className="tob-file-download-details">
                                <p className="tob-file-download-name">{reportDetails.file_name}</p>
                                <p className="tob-file-download-size">{formatFileSize(reportDetails.file_size)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => window.open(`http://localhost/difsysapi/${reportDetails.file_path}`, '_blank')}
                              className="tob-submit-btn"
                              style={{ margin: 0 }}
                            >
                              Open File
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {reportDetails.activities && reportDetails.activities.length > 0 && reportDetails.report_type === 'OB Form' && (
                    <div className="tob-activities-section">
                      <h4>Team Activities</h4>
                      {reportDetails.activities.map((activity, index) => (
                        <div key={index} className="tob-activity-card">
                          <div className="tob-activity-header">
                            <h5>Entry {index + 1}</h5>
                          </div>
                          <div className="tob-activity-content">
                            <div className="tob-form-field-group">
                              <label>Employees</label>
                              <div className="tob-employee-names">
                                {activity.employee_name}
                              </div>
                            </div>
                            <div className="tob-form-field-group">
                              <label>Designation</label>
                              <input
                                type="text"
                                value={activity.designation}
                                disabled
                                className="tob-disabled-input"
                              />
                            </div>
                            <div className="tob-form-field-group">
                              <label>Assigned Task</label>
                              <textarea
                                value={activity.assign_task}
                                disabled
                                className="tob-disabled-input"
                                rows="3"
                              />
                            </div>
                            <div className="tob-form-field-group">
                              <label>Time Duration</label>
                              <input
                                type="text"
                                value={activity.time_duration}
                                disabled
                                className="tob-disabled-input"
                              />
                            </div>
                            {activity.remarks && (
                              <div className="tob-form-field-group">
                                <label>Remarks</label>
                                <textarea
                                  value={activity.remarks}
                                  disabled
                                  className="tob-disabled-input"
                                  rows="2"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="tob-form-actions">
                    {reportDetails.report_type === 'OB Form' && reportDetails.activities && reportDetails.activities.length > 0 && (
                      <button
                        className="tob-submit-btn"
                        onClick={async () => {
                          const success = await generateOBFormExcelFromReport(reportDetails, reportDetails.activities);
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
                      className="tob-cancel-btn"
                      onClick={() => {
                        setShowDetailsModal(false);
                        setReportDetails(null);
                        setSelectedReport(null);
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

      <div className="tob-header-container">
        <div className="tob-header-content">
          <div className="tob-title-section">
            <h1 className="tob-title">TEAM SERVICE REPORT</h1>
            <div className="tob-supervisor-info">
              <p className="tob-team-count">{reports.length} Report{reports.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="tob-actions">
            <div className="tob-dropdown-container" ref={dropdownRef}>
              <button 
                className="tob-select-action-btn" 
                onClick={() => setShowActionDropdown(!showActionDropdown)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Select Action
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="tob-dropdown-icon">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </button>
              
              {showActionDropdown && (
                <div className="tob-dropdown-menu">
                  <button
                    className="tob-dropdown-item"
                    onClick={() => {
                      setShowTeamOBModal(true);
                      setShowActionDropdown(false);
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                    </svg>
                    File OB Form
                  </button>
                  
                  <button
                    className="tob-dropdown-item"
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
        </div>
      </div>

      <div className="tob-content">
        <div className="tob-table-wrapper">
          <table className="tob-data-table">
            <thead>
              <tr className="tob-table-header">
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
                <tr key={index} className="tob-table-row">
                  <td className="tob-id-cell">{report.id}</td>
                  <td className="tob-type-cell">{report.type || 'OB Form'}</td>
                  <td className="tob-title-cell">{report.title}</td>
                  <td className="tob-date-cell">{formatDate(report.date_submitted)}</td>
                  <td className="tob-status-cell">
                    <span className={`tob-status-badge ${getTableStatusClass(report.status)}`}>
                      {report.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="tob-actions-cell">
                    <button 
                      className="tob-view-btn"
                      onClick={() => handleViewDetails(report)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedReports.length === 0 && (
                <tr>
                  <td colSpan="6" className="tob-empty-state">
                    No reports found. Click "Select Action" to submit a report.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="tob-pagination-section">
              <div className="tob-pagination-info">
                Showing {startIndex + 1} to {Math.min(endIndex, reports.length)} of {reports.length} entries
              </div>
              <div className="tob-pagination-controls">
                {renderPaginationButtons()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamOB;