import React, { useState, useEffect, useCallback } from 'react';
import { getUserId } from '../../utils/auth';
import axios from 'axios';
import * as ExcelJS from 'exceljs';
import { Loader, Search, Filter } from 'lucide-react';
import difsyslogo from '../../assets/difsyslogo.png';
import '../../components/HRLayout/SRApproval.css';

// Utility functions
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

const calculateDuration = (departure, arrival) => {
  if (!departure || !arrival) return 0;
  
  const [depHour, depMin] = departure.split(':').map(Number);
  const [arrHour, arrMin] = arrival.split(':').map(Number);
  
  let totalMinutes = (arrHour * 60 + arrMin) - (depHour * 60 + depMin);
  
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60; // Handle overnight
  }
  
  return Math.floor(totalMinutes / 60); // Return only hours, ignore minutes
};

const getTableStatusClass = (status) => {
  switch (status) {
    case 'Pending': return 'sra-status-pending';
    case 'Approved': return 'sra-status-approved';
    case 'Rejected': return 'sra-status-rejected';
    default: return 'sra-status-pending';
  }
};

const SRApproval = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetails, setReportDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [rejectReason, setRejectReason] = useState('');
  const [googleHours, setGoogleHours] = useState('');
  const [totalHours, setTotalHours] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentReportId, setCurrentReportId] = useState(null);

  const API_BASE_URL = 'http://localhost/difsysapi/service_approval.php';
  const itemsPerPage = 8;

  useEffect(() => {
    document.title = "DIFSYS | SERVICE REPORT APPROVAL";
    fetchAllReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter, typeFilter]);

  const fetchAllReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}?action=getAllReports`);
      
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

  const filterReports = () => {
    let filtered = [...reports];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.id.toString().includes(searchTerm) ||
        report.submitted_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.report_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'All') {
      filtered = filtered.filter(report => report.source === typeFilter);
    }

    setFilteredReports(filtered);
    setCurrentPage(1);
  };

  const fetchReportDetails = async (reportId, source) => {
    try {
      setLoadingDetails(true);
      const response = await axios.get(
        `${API_BASE_URL}?action=getReportDetails&report_id=${reportId}&source=${source}`
      );
      
      if (response.data.success) {
        setReportDetails(response.data.report);
        
        // Calculate total hours for employee reports
        if (source === 'employee' && response.data.report.ob_entries) {
          const total = response.data.report.ob_entries.reduce((sum, entry) => {
            return sum + calculateDuration(entry.departure_time, entry.arrival_time);
          }, 0);
          setTotalHours(total);
        }
        
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
    setGoogleHours('');
    setTotalHours(0);
    fetchReportDetails(report.report_id, report.source);
  };

  const handleApprove = () => {
    if (selectedReport.source === 'employee') {
      // Show approval with hours computation
      return; // Hours are already visible in modal
    } else {
      // Direct approval for supervisor reports
      submitApproval();
    }
  };

  const submitApproval = async () => {
    try {
      setShowLoading(true);

      const reviewerId = getUserId();
      const formData = new FormData();
      formData.append('action', 'approveReport');
      formData.append('report_id', selectedReport.report_id);
      formData.append('source', selectedReport.source);
      formData.append('reviewer_id', reviewerId);
      
      if (selectedReport.source === 'employee') {
        formData.append('google_hours', googleHours);
        formData.append('total_hours', totalHours);
      }

      const response = await axios.post(API_BASE_URL, formData);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowLoading(false);

      if (response.data.success) {
        setCurrentReportId(selectedReport.report_id);
        setShowDetailsModal(false);
        setSuccessMessage('Report approved successfully!');
        setShowSuccessPopup(true);
        await fetchAllReports();
      } else {
        alert('Failed to approve report: ' + response.data.message);
      }
    } catch (error) {
      setShowLoading(false);
      console.error('Error approving report:', error);
      alert('Failed to approve report. Please try again.');
    }
  };

  const handleReject = () => {
    setShowDetailsModal(false);
    setShowRejectModal(true);
  };

  const submitRejection = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setShowLoading(true);

      const reviewerId = getUserId();
      const formData = new FormData();
      formData.append('action', 'rejectReport');
      formData.append('report_id', selectedReport.report_id);
      formData.append('source', selectedReport.source);
      formData.append('reviewer_id', reviewerId);
      formData.append('remarks', rejectReason);

      const response = await axios.post(API_BASE_URL, formData);

      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowLoading(false);

      if (response.data.success) {
        setShowRejectModal(false);
        setShowDetailsModal(false);
        setRejectReason('');
        setSuccessMessage('Report rejected successfully.');
        setShowSuccessPopup(true);
        await fetchAllReports();
      } else {
        alert('Failed to reject report: ' + response.data.message);
      }
    } catch (error) {
      setShowLoading(false);
      console.error('Error rejecting report:', error);
      alert('Failed to reject report. Please try again.');
    }
  };

  const createOBFormInExcel = async (worksheet, startCol, reportData, formNumber, obEntries = [], teamActivities = []) => {
    const colOffset = startCol === 'B' ? 1 : 9;
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

    // Borders
    for (let row = 2; row <= 44; row++) {
      worksheet.getCell(`${getCol(0)}${row}`).border = { left: { style: 'medium' } };
      worksheet.getCell(`${getCol(6)}${row}`).border = { right: { style: 'medium' } };
    }

    for (let col = 0; col <= 6; col++) {
      const cell = worksheet.getCell(`${getCol(col)}44`);
      let border = { bottom: { style: 'medium' } };
      if (col === 0) border.left = { style: 'medium' };
      if (col === 6) border.right = { style: 'medium' };
      cell.border = border;
    }

    // Title
    worksheet.mergeCells(`${getCol(2)}2:${getCol(5)}2`);
    const titleCell = worksheet.getCell(`${getCol(2)}2`);
    titleCell.value = 'OB FORM';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    for (let col = 0; col <= 6; col++) {
      const cell = worksheet.getCell(`${getCol(col)}2`);
      cell.border = { ...cell.border, top: { style: 'medium' } };
    }

    // Employee Info
    worksheet.mergeCells(`${getCol(0)}4:${getCol(1)}4`);
    worksheet.getCell(`${getCol(0)}4`).value = 'Employee Name:';
    worksheet.getCell(`${getCol(0)}4`).font = { bold: true };
    
    worksheet.mergeCells(`${getCol(3)}4:${getCol(5)}4`);
    const nameCell = worksheet.getCell(`${getCol(3)}4`);
    nameCell.value = reportData.employee_name || reportData.submitted_by;
    nameCell.alignment = { horizontal: 'center', vertical: 'middle' };
    nameCell.border = { bottom: { style: 'thin' } };

    worksheet.mergeCells(`${getCol(0)}5:${getCol(1)}5`);
    worksheet.getCell(`${getCol(0)}5`).value = 'Position:';
    worksheet.getCell(`${getCol(0)}5`).font = { bold: true };
    
    worksheet.mergeCells(`${getCol(3)}5:${getCol(5)}5`);
    const posCell = worksheet.getCell(`${getCol(3)}5`);
    posCell.value = reportData.position || 'N/A';
    posCell.alignment = { horizontal: 'center', vertical: 'middle' };
    posCell.border = { bottom: { style: 'thin' } };

    worksheet.mergeCells(`${getCol(0)}6:${getCol(1)}6`);
    worksheet.getCell(`${getCol(0)}6`).value = 'Date file :';
    worksheet.getCell(`${getCol(0)}6`).font = { bold: true };
    
    worksheet.mergeCells(`${getCol(3)}6:${getCol(5)}6`);
    const dateCell = worksheet.getCell(`${getCol(3)}6`);
    dateCell.value = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateCell.border = { bottom: { style: 'thin' } };

    // Table headers
    worksheet.getCell(`${getCol(1)}9`).value = 'DATE';
    worksheet.getCell(`${getCol(1)}9`).font = { bold: true, size: 11 };
    worksheet.getCell(`${getCol(1)}9`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell(`${getCol(1)}9`).border = {
      top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' }
    };

    worksheet.mergeCells(`${getCol(2)}9:${getCol(3)}9`);
    const destCell = worksheet.getCell(`${getCol(2)}9`);
    destCell.value = 'DESTINATION';
    destCell.font = { bold: true, size: 11 };
    destCell.alignment = { horizontal: 'center', vertical: 'middle' };
    destCell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' }
    };

    worksheet.mergeCells(`${getCol(4)}9:${getCol(5)}9`);
    const timeCell = worksheet.getCell(`${getCol(4)}9`);
    timeCell.value = 'TIME';
    timeCell.font = { bold: true, size: 11 };
    timeCell.alignment = { horizontal: 'center', vertical: 'middle' };
    timeCell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' }
    };

    // Sub-headers
    const subHeaders = ['', 'From', 'To', 'Departure', 'Arrival'];
    subHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(`${getCol(index + 1)}10`);
      cell.value = header;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      let border = { top: { style: 'thin'}, bottom: { style: 'thin' } };
      if (index === 0) border.left = { style: 'thin' };
      if (index === 4) border.right = { style: 'thin' };
      if (index > 0 && index < 4) {
        border.left = { style: 'thin' };
        border.right = { style: 'thin' };
      }
      cell.border = border;
    });

    // Data rows
    for (let row = 11; row <= 18; row++) {
      for (let col = 1; col <= 5; col++) {
        const cell = worksheet.getCell(`${getCol(col)}${row}`);
        
        const entryIndex = row - 11;
        if (Array.isArray(obEntries) && entryIndex < obEntries.length) {
          const entry = obEntries[entryIndex];
          if (col === 1) cell.value = entry.ob_date || entry.date || '';
          else if (col === 2) cell.value = entry.destination_from || entry.destinationFrom || '';
          else if (col === 3) cell.value = entry.destination_to || entry.destinationTo || '';
          else if (col === 4) cell.value = formatTime12Hour(entry.departure_time || entry.departure) || '';
          else if (col === 5) cell.value = formatTime12Hour(entry.arrival_time || entry.arrival) || '';
        }
        
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        let border = { top: { style: 'thin' }, bottom: row === 18 ? { style: 'thin'} : { style: 'thin' } };
        if (col === 1) border.left = { style: 'thin' };
        if (col === 5) border.right = { style: 'thin' };
        if (col > 1 && col < 5) {
          border.left = { style: 'thin' };
          border.right = { style: 'thin' };
        }
        cell.border = border;
      }
    }

    // Purpose section
    worksheet.getCell(`${getCol(1)}20`).value = 'PURPOSE :';
    worksheet.getCell(`${getCol(1)}20`).font = { bold: true, size: 11 };
    worksheet.getCell(`${getCol(1)}20`).alignment = { horizontal: 'right', vertical: 'top' };
    
    worksheet.mergeCells(`${getCol(2)}20:${getCol(5)}23`);
    const purposeCell = worksheet.getCell(`${getCol(2)}20`);
    
    let combinedPurposes = '';
    if (Array.isArray(obEntries)) {
      combinedPurposes = obEntries.map((entry, index) => {
        return `${index + 1}. ${entry.purpose}`;
      }).join('\n');
    }
    purposeCell.value = combinedPurposes;
    purposeCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

    // Team Activity section
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
      top: { style: 'thin' }, left: { style: 'thin'}, right: { style: 'thin' }, bottom: { style: 'thin' }
    };

    const activityHeaders = ['EMPLOYEE NAME', 'DESIGNATION', 'ASSIGN TASK', 'TIME DURATION', 'REMARKS'];
    activityHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(`${getCol(index + 1)}27`);
      cell.value = header;
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      
      let border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
      if (index === 0) border.left = { style: 'thin' };
      if (index === 4) border.right = { style: 'thin'};
      if (index > 0 && index < 4) {
        border.left = { style: 'thin' };
        border.right = { style: 'thin' };
      }
      cell.border = border;
    });

    for (let row = 28; row <= 33; row++) {
      for (let col = 1; col <= 5; col++) {
        const cell = worksheet.getCell(`${getCol(col)}${row}`);
        
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
        
        let border = { top: { style: 'thin' }, bottom: row === 33 ? { style: 'thin' } : { style: 'thin' } };
        if (col === 1) border.left = { style: 'thin' };
        if (col === 5) border.right = { style: 'thin' };
        if (col > 1 && col < 5) {
          border.left = { style: 'thin' };
          border.right = { style: 'thin' };
        }
        cell.border = border;
      }
    }

    // HR/Admin section
    worksheet.mergeCells(`${getCol(0)}34:${getCol(6)}34`);
    const supCell = worksheet.getCell(`${getCol(0)}34`);
    supCell.value = '----------------------------------------------------------------To be filled out by HR / Admin----------------------------------------------------------------';
    supCell.font = { italic: true, size: 9 };
    supCell.alignment = { horizontal: 'center', vertical: 'middle' };
    supCell.border = { right: { style: 'medium' }, left: { style: 'medium' } };

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

    worksheet.mergeCells(`${getCol(0)}36:${getCol(1)}36`);
    const mapsCell = worksheet.getCell(`${getCol(0)}36`);
    mapsCell.value = "Google Maps' hours:";
    mapsCell.font = { size: 9 };
    mapsCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.mergeCells(`${getCol(2)}36:${getCol(3)}36`);
    const googleHoursCell = worksheet.getCell(`${getCol(2)}36`);
    googleHoursCell.value = reportData.google_hours || '';
    googleHoursCell.border = { bottom: { style: 'thin' } };

    worksheet.mergeCells(`${getCol(2)}37:${getCol(3)}37`);
    worksheet.getCell(`${getCol(3)}37`).border = { bottom: { style: 'thin' } };

    worksheet.mergeCells(`${getCol(0)}38:${getCol(1)}38`);
    const totalCell = worksheet.getCell(`${getCol(0)}38`);
    totalCell.value = 'Total hours:';
    totalCell.font = { size: 9 };
    totalCell.alignment = { horizontal: 'right', vertical: 'middle' };

    worksheet.mergeCells(`${getCol(2)}38:${getCol(3)}38`);
    const totalHoursCell = worksheet.getCell(`${getCol(2)}38`);
    totalHoursCell.value = reportData.total_hours ? `${reportData.total_hours} hrs` : '';
    totalHoursCell.border = { bottom: { style: 'thin' } };

    worksheet.mergeCells(`${getCol(4)}40:${getCol(5)}40`);
    const sigCell = worksheet.getCell(`${getCol(4)}40`);
    sigCell.value = 'Employee Signature';
    sigCell.font = { size: 9 };
    sigCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sigCell.border = { top: { style: 'thin' } };

    worksheet.mergeCells(`${getCol(4)}42:${getCol(5)}42`);
    const approveCell = worksheet.getCell(`${getCol(4)}42`);
    approveCell.value = 'Approved by: HR/Admin';
    approveCell.font = { size: 9 };
    approveCell.alignment = { horizontal: 'center', vertical: 'middle' };
    approveCell.border = { top: { style: 'thin' } };
  };

  const downloadExcel = async (reportData = null) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('OB Form');
      
      // Use provided reportData or fall back to reportDetails state
      const dataToUse = reportData || reportDetails;
      
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
      
      const obEntries = dataToUse.ob_entries || [];
      const teamActivities = dataToUse.activities || [];

      await createOBFormInExcel(worksheet, leftFormCol, dataToUse, 1, obEntries, teamActivities);
      await createOBFormInExcel(worksheet, rightFormCol, dataToUse, 2, obEntries, teamActivities);

      const filename = `OB_Form_${dataToUse.submitted_by}_${selectedReport.report_id}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
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

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  const renderPaginationButtons = () => {
    const buttons = [];
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`sra-pagination-btn ${currentPage === i ? 'sra-pagination-active' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(<span key="dots" className="sra-pagination-dots">...</span>);
      buttons.push(
        <button
          key={totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className={`sra-pagination-btn ${currentPage === totalPages ? 'sra-pagination-active' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  if (loading) {
    return (
      <div className="sra-container">
        <div className="sra-loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="sra-page">
      {showLoading && (
        <div className="sra-loading-backdrop">
          <div className="sra-loading-spinner-container">
            <Loader className="sra-loading-spinner-circle" size={60} />
            <p className="sra-loading-text">Processing...</p>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className="sra-success-backdrop">
          <div className="sra-success-modal">
            <div className="sra-success-header">
              <div className="sra-success-icon">
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
            
            <div className="sra-success-content">
              <h3 className="sra-success-title">Success!</h3>
              <p className="sra-success-message">
                {successMessage} Would you like to download the Excel file?
              </p>
            </div>
            
            <div className="sra-success-footer">
              <button 
                className="sra-cancel-btn"
                onClick={() => setShowSuccessPopup(false)}
                style={{ marginRight: '10px' }}
              >
                No, thanks
              </button>
              <button 
                className="sra-success-close-btn"
                onClick={async () => {
                  setShowLoading(true);
                  try {
                    const response = await axios.get(
                      `${API_BASE_URL}?action=getReportDetails&report_id=${currentReportId || selectedReport?.report_id}&source=${selectedReport?.source}`
                    );
                    
                    if (response.data.success) {
                      // Pass the fresh data directly to downloadExcel
                      const success = await downloadExcel(response.data.report);
                      if (!success) {
                        alert('Failed to generate Excel file. Please try again.');
                      }
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
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="sra-modal-backdrop">
          <div className="sra-reject-modal">
            <div className="sra-modal-header">
              <h3>Reject Report</h3>
              <button 
                className="sra-modal-close-btn" 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setShowDetailsModal(true);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="sra-modal-content">
              <div className="sra-form-field-group">
                <label>Reason for Rejection *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a detailed reason for rejecting this report..."
                  rows="6"
                  required
                />
              </div>

              <div className="sra-modal-actions">
                <button 
                  className="sra-cancel-btn"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setShowDetailsModal(true);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="sra-reject-btn"
                  onClick={submitRejection}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && reportDetails && (
        <div className="sra-modal-backdrop">
          <div className="sra-details-modal-wrapper">
            <div className="sra-modal-header">
              <h3>Report Details - {reportDetails.report_type}</h3>
              <button 
                className="sra-modal-close-btn" 
                onClick={() => {
                  setShowDetailsModal(false);
                  setReportDetails(null);
                  setSelectedReport(null);
                  setGoogleHours('');
                  setTotalHours(0);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="sra-details-modal-content">
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader className="sra-loading-spinner-circle" size={40} />
                  <p>Loading details...</p>
                </div>
              ) : (
                <>
                  <div className="sra-details-section">
                    <div className="sra-info-grid">
                      <div className="sra-info-item">
                        <label>Submitted By</label>
                        <p>{reportDetails.submitted_by}</p>
                      </div>
                      <div className="sra-info-item">
                        <label>Position</label>
                        <p>{reportDetails.position || 'N/A'}</p>
                      </div>
                      <div className="sra-info-item">
                        <label>Date Submitted</label>
                        <p>{formatTimestamp(reportDetails.date_submitted)}</p>
                      </div>
                      <div className="sra-info-item">
                        <label>Status</label>
                        <span className={`sra-status-badge ${getTableStatusClass(reportDetails.status)}`}>
                          {reportDetails.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {reportDetails.report_type === 'Service Report' && (
                    <div className="sra-service-report-section">
                      <h4>Service Report Details</h4>
                      <div className="sra-form-field-group">
                        <label>Title</label>
                        <input
                          type="text"
                          value={reportDetails.title}
                          disabled
                          className="sra-disabled-input"
                        />
                      </div>
                      <div className="sra-form-field-group">
                        <label>Description</label>
                        <textarea
                          value={reportDetails.description || 'No description provided'}
                          disabled
                          className="sra-disabled-input"
                          rows="4"
                        />
                      </div>
                      {reportDetails.file_path && (
                        <div className="sra-form-field-group">
                          <label>Attached File</label>
                          <div className="sra-file-download-box">
                            <div className="sra-file-download-info">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="14,2 14,8 20,8" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <div className="sra-file-download-details">
                                <p className="sra-file-download-name">{reportDetails.file_name}</p>
                                <p className="sra-file-download-size">{reportDetails.file_size} bytes</p>
                              </div>
                            </div>
                            <button
                              onClick={() => window.open(`http://localhost/difsysapi/${reportDetails.file_path}`, '_blank')}
                              className="sra-view-file-btn"
                            >
                              Open File
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {reportDetails.report_type === 'OB Form' && reportDetails.ob_entries && reportDetails.ob_entries.length > 0 && (
                    <div className="sra-ob-entries-section">
                      <h4>Official Business Entries</h4>
                      <div className="sra-entries-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>From</th>
                              <th>To</th>
                              <th>Departure</th>
                              <th>Arrival</th>
                              <th>Purpose</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportDetails.ob_entries.map((entry, index) => (
                              <tr key={index}>
                                <td>{formatDate(entry.ob_date)}</td>
                                <td>{entry.destination_from}</td>
                                <td>{entry.destination_to}</td>
                                <td>{formatTime12Hour(entry.departure_time)}</td>
                                <td>{formatTime12Hour(entry.arrival_time)}</td>
                                <td>{entry.purpose}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {selectedReport?.source === 'employee' && reportDetails.status === 'Pending' && (
                        <div className="sra-hours-computation">
                          <h4>Hours Computation</h4>
                          <div className="sra-computation-grid">
                            <div className="sra-form-field-group">
                              <label>Google Maps Hours</label>
                              <input
                                type="text"
                                value={googleHours}
                                onChange={(e) => setGoogleHours(e.target.value)}
                                placeholder="e.g., 2"
                              />
                            </div>
                            <div className="sra-form-field-group">
                              <label>Total Hours (Auto-calculated)</label>
                              <input
                                type="number"
                                value={totalHours}
                                onChange={(e) => setTotalHours(parseInt(e.target.value) || 0)}
                                placeholder="Total hours"
                              />
                              <small className="sra-helper-text">
                                Auto-calculated: {totalHours} hours (minutes excluded)
                              </small>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedReport?.source === 'employee' && reportDetails.status === 'Approved' && (
                        <div className="sra-approved-hours">
                          <div className="sra-info-grid">
                            <div className="sra-info-item">
                              <label>Google Maps Hours</label>
                              <p>{reportDetails.google_hours || 'N/A'}</p>
                            </div>
                            <div className="sra-info-item">
                              <label>Total Hours</label>
                              <p>{reportDetails.total_hours || 0} hrs</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {reportDetails.activities && reportDetails.activities.length > 0 && (
                    <div className="sra-activities-section">
                      <h4>Team Activities</h4>
                      {reportDetails.activities.map((activity, index) => (
                        <div key={index} className="sra-activity-card">
                          <div className="sra-activity-header">
                            <h5>Entry {index + 1}</h5>
                          </div>
                          <div className="sra-activity-content">
                            <div className="sra-form-field-group">
                              <label>Employees</label>
                              <div className="sra-employee-names">
                                {activity.employee_name}
                              </div>
                            </div>
                            <div className="sra-form-field-group">
                              <label>Designation</label>
                              <input
                                type="text"
                                value={activity.designation}
                                disabled
                                className="sra-disabled-input"
                              />
                            </div>
                            <div className="sra-form-field-group">
                              <label>Assigned Task</label>
                              <textarea
                                value={activity.assign_task}
                                disabled
                                className="sra-disabled-input"
                                rows="3"
                              />
                            </div>
                            <div className="sra-form-field-group">
                              <label>Time Duration</label>
                              <input
                                type="text"
                                value={activity.time_duration}
                                disabled
                                className="sra-disabled-input"
                              />
                            </div>
                            {activity.remarks && (
                              <div className="sra-form-field-group">
                                <label>Remarks</label>
                                <textarea
                                  value={activity.remarks}
                                  disabled
                                  className="sra-disabled-input"
                                  rows="2"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {reportDetails.status === 'Rejected' && reportDetails.remarks && (
                    <div className="sra-rejection-section">
                      <h4>Rejection Reason</h4>
                      <div className="sra-rejection-box">
                        <p>{reportDetails.remarks}</p>
                      </div>
                    </div>
                  )}

                  <div className="sra-modal-actions">
                    {reportDetails.status === 'Pending' && (
                      <>
                        <button 
                          className="sra-reject-btn"
                          onClick={handleReject}
                        >
                          Reject
                        </button>
                        <button 
                          className="sra-approve-btn"
                          onClick={selectedReport?.source === 'employee' ? submitApproval : submitApproval}
                        >
                          {selectedReport?.source === 'employee' ? 'Save and Submit' : 'Approve'}
                        </button>
                      </>
                    )}
                    {reportDetails.status === 'Approved' && (
                      <button 
                        className="sra-download-btn"
                        onClick={downloadExcel}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                        Download Copy
                      </button>
                    )}
                    <button 
                      className="sra-cancel-btn"
                      onClick={() => {
                        setShowDetailsModal(false);
                        setReportDetails(null);
                        setSelectedReport(null);
                        setGoogleHours('');
                        setTotalHours(0);
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

      <div className="sra-header-container">
        <div className="sra-header-content">
          <div className="sra-title-section">
            <h1 className="sra-title">SERVICE REPORT APPROVAL</h1>
            <p className="sra-subtitle">{filteredReports.length} Report{filteredReports.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="sra-controls">
            <div className="sra-search-box">
              <Search size={18} className="sra-search-icon" />
              <input
                type="text"
                placeholder="Search by ID, name, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sra-search-input"
              />
            </div>
            <div className="sra-filter-group">
              <Filter size={16} className="sra-filter-icon" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="sra-filter-select"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="sra-filter-select"
              >
                <option value="All">All Types</option>
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="sra-content">
        <div className="sra-table-wrapper">
          <table className="sra-data-table">
            <thead>
              <tr className="sra-table-header">
                <th>REPORT ID</th>
                <th>REPORT TYPE</th>
                <th>SUBMITTED BY</th>
                <th>DATE FILED</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.map((report, index) => (
                <tr key={index} className="sra-table-row">
                  <td className="sra-id-cell">{report.report_id}</td>
                  <td className="sra-type-cell">
                    {report.report_type}
                    <span className="sra-source-badge">{report.source}</span>
                  </td>
                  <td className="sra-name-cell">{report.submitted_by}</td>
                  <td className="sra-date-cell">{formatDate(report.date_submitted)}</td>
                  <td className="sra-status-cell">
                    <span className={`sra-status-badge ${getTableStatusClass(report.status)}`}>
                      {report.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="sra-actions-cell">
                    <button 
                      className="sra-view-btn"
                      onClick={() => handleViewDetails(report)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedReports.length === 0 && (
                <tr>
                  <td colSpan="6" className="sra-empty-state">
                    No reports found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="sra-pagination-section">
              <div className="sra-pagination-info">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredReports.length)} of {filteredReports.length} entries
              </div>
              <div className="sra-pagination-controls">
                {renderPaginationButtons()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SRApproval;