import { Users, Clock, UserX, UserCheck, ChevronLeft, ChevronRight, Calendar, X, FileDown, Loader } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import '../../components/HRLayout/PerformanceEvaluation.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper functions moved outside component to avoid scope issues
const getCurrentDateUTC8 = () => {
  const now = new Date();
  const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
  return utc8Time.toISOString().split('T')[0];
};

const getFirstDayOfMonth = () => {
  const currentDateUTC8 = getCurrentDateUTC8();
  const firstDayOfMonth = new Date(currentDateUTC8);
  firstDayOfMonth.setDate(1);
  return firstDayOfMonth.toISOString().split('T')[0];
};

const PerformanceEvaluation = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempFromDate, setTempFromDate] = useState('');
  const [tempToDate, setTempToDate] = useState('');
  const [performanceData, setPerformanceData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pdfStatus, setPdfStatus] = useState(''); // 'loading', 'success', 'error', or ''
  const [pdfMessage, setPdfMessage] = useState('');

  // Ref for managing refresh interval
  const refreshIntervalRef = useRef(null);

  // API base URL - adjust according to your setup
  const API_BASE_URL = 'http://localhost/difsysapi/performance_api.php';

  const itemsPerPage = isMobile ? 4 : 5;

  // Get current date in UTC+8 timezone
  const getCurrentDateUTC8 = () => {
    const now = new Date();
    // Convert to UTC+8 (Philippines/Singapore/Hong Kong time)
    const utc8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return utc8Time.toISOString().split('T')[0];
  };

  const checkIsMobile = () => {
    setIsMobile(window.innerWidth <= 500);
  };

  useEffect(() => {
    checkIsMobile();
    const handleResize = () => {
      checkIsMobile();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [isMobile]);

  // Initialize dates and fetch data on component mount
  useEffect(() => {
    const currentDateUTC8 = getCurrentDateUTC8();
    const firstDayOfMonth = getFirstDayOfMonth();
    
    setFromDate(firstDayOfMonth);
    setToDate(currentDateUTC8);
    setTempFromDate(firstDayOfMonth);
    setTempToDate(currentDateUTC8);
    setIsInitialized(true);
  }, []);

  // Fetch data when initialized or when dates change
  useEffect(() => {
    if (!isInitialized || !fromDate || !toDate) return;

    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Fetch data immediately
    fetchPerformanceData();
    
    // Set up automatic refresh every 1 second for real-time updates
    refreshIntervalRef.current = setInterval(() => {
      fetchPerformanceData(true); // Silent refresh to avoid UI flicker
    }, 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isInitialized, fromDate, toDate]);

  const fetchPerformanceData = async (silent = false) => {
    try {
      // Only show loading state on initial load, not on silent refreshes
      if (!silent) {
        setLoading(true);
      }
      
      console.log(`Fetching data from ${fromDate} to ${toDate}`); // Debug log
      
      const response = await fetch(`${API_BASE_URL}?action=get_performance_data&from_date=${fromDate}&to_date=${toDate}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data); // Debug log
      
      if (data.success) {
        // Process records to include profile images like AttendanceTracking
        const processedRecords = await Promise.all((data.records || []).map(async (record) => {
          // Fetch employee profile image from useraccounts table
          try {
            const profileResponse = await fetch(`http://localhost/difsysapi/attendance_api.php?action=get_employee_info&emp_id=${record.emp_id}`);
            const profileData = await profileResponse.json();
            
            return {
              ...record,
              profile_image: profileData.success ? profileData.employee.profile_image : null
            };
          } catch (error) {
            console.error('Error fetching profile for employee:', record.emp_id, error);
            return {
              ...record,
              profile_image: null
            };
          }
        }));

        // Update data seamlessly without affecting UI state
        setPerformanceData(processedRecords);
        setSummaryStats(data.summary_stats || {});
      } else {
        console.error('API returned error:', data.message);
        if (!silent) {
          setPerformanceData([]);
          setSummaryStats({});
        }
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      // Only reset data if it's not a silent refresh to avoid clearing existing data
      if (!silent) {
        setPerformanceData([]);
        setSummaryStats({});
      }
    } finally {
      // Only hide loading state if it was shown
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Function to render employee avatar with profile image or initials (matching AttendanceTracking pattern)
  const renderEmployeeAvatar = (employee) => {
    const initials = employee.employee_name ? employee.employee_name.split(' ').map(n => n[0]).join('') : 'N/A';
    
    return (
      <div className="performance-evaluation-employee-avatar">
        {employee.profile_image ? (
          <img 
            src={employee.profile_image.startsWith('http') ? employee.profile_image : `http://localhost/difsysapi/${employee.profile_image}`} 
            alt={employee.employee_name || 'Employee'}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              objectPosition: 'center',
              // High quality image settings
              imageRendering: 'high-quality',
              filter: 'contrast(1.1) brightness(1.05)',
              transition: 'all 0.2s ease'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
            onLoad={(e) => {
              // Ensure high quality rendering
              e.target.style.imageRendering = 'high-quality';
              e.target.style.filter = 'contrast(1.1) brightness(1.05)';
            }}
          />
        ) : null}
        <span style={{ 
          display: employee.profile_image ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {initials}
        </span>
      </div>
    );
  };

  const generatePDFSummary = async () => {
    try {
      setGeneratingPDF(true);
      setPdfStatus('loading');
      setPdfMessage('Generating PDF summary...');
      
      // Create new PDF document
      const doc = new jsPDF();
      
      // Set document properties
      doc.setProperties({
        title: 'Performance Evaluation Summary',
        subject: 'Employee Performance Report',
        author: 'HR Department',
        creator: 'DIF Attendance System'
      });
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Performance Evaluation Summary', 14, 20);
      
      // Add date range
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text(`Date Range: ${formatDateDisplay(fromDate, toDate)}`, 14, 30);
      doc.text(`Generated on: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`, 14, 37);
      
      // Add summary statistics section
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Summary Statistics', 14, 50);
      
      // Summary statistics table
      const summaryData = [
        ['Average Present Days', summaryStats.avg_present_days || 0],
        ['Average Late Days', summaryStats.avg_late_days || 0],
        ['Average Absent Days', summaryStats.avg_absent_days || 0],
        ['Average Leave Days', summaryStats.avg_leave_days || 0]
      ];
      
      // Summary statistics table
      autoTable(doc, {
        startY: 55,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 123, 255],
          textColor: 255,
          fontSize: 12,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 11,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'wrap',
        columnStyles: {
          0: { halign: 'left', cellWidth: 100 },
          1: { halign: 'center', cellWidth: 40, fontStyle: 'bold' }
        }
      });
      
      // Add employee performance details section
      const finalY = doc.lastAutoTable?.finalY || 90;
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Employee Performance Details', 14, finalY + 15);
      
      // Prepare employee data for the table
      const employeeTableData = performanceData.map(employee => [
        employee.employee_name || 'Unknown',
        employee.position || 'N/A',
        employee.total_present_days || 0,
        employee.total_late_days || 0,
        employee.total_absent_days || 0,
        employee.total_leave_days || 0
      ]);
      
      // Employee performance table
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Employee Name', 'Position', 'Present Days', 'Late Days', 'Absent Days', 'Leave Days']],
        body: employeeTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 123, 255],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 50 },
          1: { halign: 'left', cellWidth: 35 },
          2: { halign: 'center', cellWidth: 25, textColor: [40, 167, 69] },
          3: { halign: 'center', cellWidth: 20, textColor: [255, 193, 7] },
          4: { halign: 'center', cellWidth: 25, textColor: [220, 53, 69] },
          5: { halign: 'center', cellWidth: 25, textColor: [23, 162, 184] }
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            if (data.column.index === 2 && data.cell.raw > 0) {
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.index === 3 && data.cell.raw > 0) {
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.index === 4 && data.cell.raw > 0) {
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.index === 5 && data.cell.raw > 0) {
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        didDrawPage: function(data) {
          const pageCount = doc.internal.getNumberOfPages();
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text('Page ' + data.pageNumber + ' of ' + pageCount, 14, pageHeight - 10);
          
          doc.text('Generated: ' + new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }), 
                  pageSize.width - 14, pageHeight - 10, { align: 'right' });
        }
      });
      
      // Add footer note on the last page
      const lastY = doc.lastAutoTable?.finalY || 150;
      const pageHeight = doc.internal.pageSize.height;
      
      if (lastY < pageHeight - 30) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('This report was automatically generated by the DIF Attendance System.', 14, lastY + 20);
        doc.text('For questions or concerns, please contact the HR Department.', 14, lastY + 27);
      }
      
      // Generate filename with date range
      const filename = `Performance_Summary_${fromDate}_to_${toDate}.pdf`;
      
      // Save the PDF
      doc.save(filename);
      
      // Success state
      setPdfStatus('success');
      setPdfMessage('PDF summary generated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPdfStatus('');
        setPdfMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      setPdfStatus('error');
      setPdfMessage('Error generating PDF summary. Please try again.');
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setPdfStatus('');
        setPdfMessage('');
      }, 5000);
    } finally {
      setGeneratingPDF(false);
    }
  };
  
  // Optional: Add this helper function for better date formatting in PDF
  const formatDateForPDF = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Manila'
    };
    return date.toLocaleDateString('en-US', options);
  };

  const totalPages = Math.ceil(performanceData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = performanceData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleDatePickerOpen = () => {
    setTempFromDate(fromDate);
    setTempToDate(toDate);
    setShowDatePicker(true);
  };

  const handleDatePickerClose = () => {
    setShowDatePicker(false);
  };

  const handleDatePickerConfirm = () => {
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setShowDatePicker(false);
    setCurrentPage(1);
  };

  const formatDateDisplay = (fromDateString, toDateString) => {
    const fromDate = new Date(fromDateString + 'T00:00:00');
    const toDate = new Date(toDateString + 'T00:00:00');
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'Asia/Manila'
    };
    
    return `${fromDate.toLocaleDateString('en-US', options)} - ${toDate.toLocaleDateString('en-US', options)}`;
  };

  if (loading) {
    return (
      <div className="performance-evaluation-page">
        <div className="performance-evaluation-loading">
          <Loader className="performance-evaluation-loading-spinner" />
          <p>Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-evaluation-page">
      {/* Header Container */}
      <div className="performance-evaluation-header-container">
        <div className="performance-evaluation-header-content">
          <h1 className="performance-evaluation-title">PERFORMANCE EVALUATION</h1>
          <div className="performance-evaluation-actions">
            <div className="performance-evaluation-date-picker-box">
              <input
                type="text"
                value={formatDateDisplay(fromDate, toDate)}
                readOnly
                onClick={handleDatePickerOpen}
                style={{ cursor: 'pointer' }}
              />
              <button className="performance-evaluation-date-picker-button" onClick={handleDatePickerOpen}>
                <Calendar size={16} />
              </button>
            </div>
            <button 
              className="performance-evaluation-generate-pdf-btn"
              onClick={generatePDFSummary}
              disabled={generatingPDF}
            >
              <FileDown size={16} />
              {generatingPDF ? 'Generating...' : 'Generate Summary'}
            </button>
          </div>
        </div>
      </div>

      {/* PDF Status Notification */}
        {pdfStatus && (
          <div className={`perf-eval-pdf-notification perf-eval-pdf-notification-${pdfStatus}`}>
            <div className="perf-eval-pdf-notification-content">
              {pdfStatus === 'loading' && (
                <div className="perf-eval-pdf-notification-spinner"></div>
              )}
              {pdfStatus === 'success' && (
                <svg className="perf-eval-pdf-notification-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {pdfStatus === 'error' && (
                <svg className="perf-eval-pdf-notification-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <span className="perf-eval-pdf-notification-message">{pdfMessage}</span>
            </div>
          </div>
        )}

      {/* Content Area */}
      <div className="performance-evaluation-content">
        {/* Statistics Cards - These will update every second seamlessly */}
        <div className="performance-evaluation-stats-grid">
          {/* Present Employees Card */}
          <div className="performance-evaluation-stat-card">
            <div className="performance-evaluation-stat-icon performance-evaluation-present">
              <UserCheck size={24} />
            </div>
            <div className="performance-evaluation-stat-content">
              <div className="performance-evaluation-stat-number">{summaryStats.avg_present_days || 0}</div>
              <div className="performance-evaluation-stat-label">Avg. Present Days</div>
            </div>
          </div>

          {/* Late Employees Card */}
          <div className="performance-evaluation-stat-card">
            <div className="performance-evaluation-stat-icon performance-evaluation-late">
              <Clock size={24} />
            </div>
            <div className="performance-evaluation-stat-content">
              <div className="performance-evaluation-stat-number">{summaryStats.avg_late_days || 0}</div>
              <div className="performance-evaluation-stat-label">Avg. Late Days</div>
            </div>
          </div>

          {/* Absent Employees Card */}
          <div className="performance-evaluation-stat-card">
            <div className="performance-evaluation-stat-icon performance-evaluation-absent">
              <UserX size={24} />
            </div>
            <div className="performance-evaluation-stat-content">
              <div className="performance-evaluation-stat-number">{summaryStats.avg_absent_days || 0}</div>
              <div className="performance-evaluation-stat-label">Avg. Absent Days</div>
            </div>
          </div>

          {/* On Leave Employees Card */}
          <div className="performance-evaluation-stat-card">
            <div className="performance-evaluation-stat-icon performance-evaluation-on-leave">
              <Users size={24} />
            </div>
            <div className="performance-evaluation-stat-content">
              <div className="performance-evaluation-stat-number">{summaryStats.avg_leave_days || 0}</div>
              <div className="performance-evaluation-stat-label">Avg. Leave Days</div>
            </div>
          </div>
        </div>

        {/* Table Container - This will also update every second seamlessly */}
        <div className="performance-evaluation-table-container">
          {/* Table Header */}
          <div className="performance-evaluation-table-header1">
            <h2 className="performance-evaluation-table-title">Employee Performance Records</h2>
          </div>

          {/* Table */}
          <div className="performance-evaluation-table-wrapper">
            <table className="performance-evaluation-table">
              <thead>
                <tr className="performance-evaluation-table-header-row">
                  <th className="performance-evaluation-table-th">EMPLOYEE NAME</th>
                  <th className="performance-evaluation-table-th">PRESENT DAYS</th>
                  <th className="performance-evaluation-table-th">LATE DAYS</th>
                  <th className="performance-evaluation-table-th">ABSENT DAYS</th>
                  <th className="performance-evaluation-table-th">LEAVE DAYS</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((employee, index) => (
                  <tr key={employee.emp_id || index} className="performance-evaluation-table-row">
                    <td className="performance-evaluation-table-td">
                      <div className="performance-evaluation-employee-info">
                        {renderEmployeeAvatar(employee)}
                        <div>
                          <span className="performance-evaluation-employee-name">{employee.employee_name || 'Unknown'}</span>
                          <div style={{ fontSize: '13px', color: '#666' }}>{employee.position || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="performance-evaluation-table-td">
                      <span className="performance-evaluation-status-badge performance-evaluation-present">
                        {employee.total_present_days || 0} days
                      </span>
                    </td>
                    <td className="performance-evaluation-table-td">
                      <span className="performance-evaluation-status-badge performance-evaluation-late">
                        {employee.total_late_days || 0} days
                      </span>
                    </td>
                    <td className="performance-evaluation-table-td">
                      <span className="performance-evaluation-status-badge performance-evaluation-absent">
                        {employee.total_absent_days || 0} days
                      </span>
                    </td>
                    <td className="performance-evaluation-table-td">
                      <span className="performance-evaluation-status-badge performance-evaluation-on-leave">
                        {employee.total_leave_days || 0} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {currentData.length === 0 && (
              <div className="performance-evaluation-no-data">
                <UserX size={48} />
                <h3>No performance data found</h3>
                <p>No performance records available for the selected date range.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="performance-evaluation-pagination">
              <div className="performance-evaluation-pagination-info">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, performanceData.length)} of {performanceData.length} entries
              </div>
              <div className="performance-evaluation-pagination-controls">
                <button 
                  className="performance-evaluation-pagination-btn" 
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    className={`performance-evaluation-pagination-btn ${currentPage === index + 1 ? 'performance-evaluation-active' : ''}`}
                    onClick={() => handlePageChange(index + 1)}
                  >
                    {index + 1}
                  </button>
                ))}

                <button 
                  className="performance-evaluation-pagination-btn" 
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="performance-evaluation-date-picker-overlay" onClick={handleDatePickerClose}>
          <div className="performance-evaluation-date-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="performance-evaluation-date-picker-header">
              <h3 className="performance-evaluation-date-picker-title">Select Date Range</h3>
              <button className="performance-evaluation-date-picker-close" onClick={handleDatePickerClose}>
                <X size={20} />
              </button>
            </div>
            <div className="performance-evaluation-date-picker-content">
              <div className="performance-evaluation-date-input-group">
                <label className="performance-evaluation-date-input-label">From Date</label>
                <input
                  type="date"
                  value={tempFromDate}
                  onChange={(e) => setTempFromDate(e.target.value)}
                  className="performance-evaluation-date-picker-input"
                  max={tempToDate}
                />
              </div>
              <div className="performance-evaluation-date-input-group">
                <label className="performance-evaluation-date-input-label">To Date</label>
                <input
                  type="date"
                  value={tempToDate}
                  onChange={(e) => setTempToDate(e.target.value)}
                  className="performance-evaluation-date-picker-input"
                  min={tempFromDate}
                />
              </div>
              <div className="performance-evaluation-date-picker-actions">
                <button className="performance-evaluation-date-picker-btn performance-evaluation-secondary" onClick={handleDatePickerClose}>
                  Cancel
                </button>
                <button className="performance-evaluation-date-picker-btn performance-evaluation-primary" onClick={handleDatePickerConfirm}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceEvaluation;