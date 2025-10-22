import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../components/AccountantLayout/ManagePayroll.css';

const ManagePayroll = () => {
  // State management
  const [currentView, setCurrentView] = useState('dashboard');
  const [isManaging, setIsManaging] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showHolidaySelector, setShowHolidaySelector] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formulaError, setFormulaError] = useState('');
  
  // Data states
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [payComponents, setPayComponents] = useState([]);
  const [availableHolidays, setAvailableHolidays] = useState([]);
  const [selectedPeriodDetails, setSelectedPeriodDetails] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [holidaySearchTerm, setHolidaySearchTerm] = useState('');
  

  // Form data
  const [formData, setFormData] = useState({
  dateFrom: '',
  dateTo: '',
  selectedHolidays: [],
  holidayName: '',
  holidayType: 'Regular',
  component: '',
  baseRateType: '',                        // ADD THIS
  rateType: '',
  rateMultiplier: '',                      // ADD THIS
  amountCalculationType: 'rate_times_hours', // ADD THIS
  formula: '',
  rateFormula: '',                         // ADD THIS
  amountFormula: 'RATE * HOURS',           // ADD THIS
  status: 'Active'
});

  const itemsPerPage = 8;
  const API_BASE = 'http://localhost/difsysapi/manage_payroll.php';

  // Dashboard cards configuration
  const dashboardCards = [
    {
      id: 'payroll-period',
      title: 'Payroll Period Configuration',
      lastUpdate: new Date().toISOString().split('T')[0],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
        </svg>
      )
    },
    {
      id: 'setup-holiday',
      title: 'Setup Holiday',
      lastUpdate: new Date().toISOString().split('T')[0],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      )
    },
    {
      id: 'pay-components',
      title: 'Pay Components Configuration',
      lastUpdate: new Date().toISOString().split('T')[0],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
      )
    }
  ];

  // Rate types for pay components
  const rateTypes = [
    'Basic pay-Monthly',
    'Basic Pay-Semi-Monthly',
    'Rate Per Day',
    'Rate Per Hour',
    'Rate Per Min',
    'Regular Overtime',
    'Regular OT+ND',
    'Rest Day OT',
    'Rest Day OT+OT',
    'Rest Day ND',
    'Regular Holiday',
    'Regular Holiday OT',
    'Regular Holiday + Night Diff',
    'Regular Holiday + ROT + OT',
    'Special Holiday',
    'Special Holiday OT',
    'Special Holiday + Night Diff',
    'Special Holiday + ROT',
    'Special Holiday + ROT + OT',
    'Special Holiday + ROT + ND',
    'Undertime/Late',
    'Absences',
    'Travel Time'
  ];

  const baseRateColumns = [
    'Rate Per Hour',
    'Rate Per Day', 
    'Rate Per Minute',
    'Basic Pay Monthly',
    'Basic Pay Semi-Monthly',
    'Regular OT Rate',
    'Regular OT + ND Rate',
    'Rest Day OT Rate',
    'Rest Day OT + OT Rate', 
    'Rest Day ND Rate',
    'Regular Holiday Rate',
    'Regular Holiday OT Rate',
    'Regular Holiday + Night Diff Rate',
    'Regular Holiday + ROT + OT Rate',
    'Special Holiday Rate',
    'Special Holiday OT Rate', 
    'Special Holiday + Night Diff Rate',
    'Special Holiday + ROT',
    'Special Holiday + ROT + OT Rate',
    'Special Holiday + ROT + ND Rate'
];

const autoSelectHolidaysInRange = (dateFrom, dateTo) => {
  if (!dateFrom || !dateTo || availableHolidays.length === 0) {
    return [];
  }

  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);
  
  const holidaysInRange = availableHolidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate >= startDate && holidayDate <= endDate;
  });

  return holidaysInRange.map(holiday => holiday.id);
};

  // Effects
  useEffect(() => {
    if (currentView !== 'dashboard') {
      loadData();
    }
  }, [currentView]);

  useEffect(() => {
            document.title = "DIFSYS | MANAGE PAYROLL";
          }, []);
  
          useEffect(() => {
            const handleClickOutside = (event) => {
              // Check if the click is outside the holiday dropdown
              if (!event.target.closest('.mp-holiday-dropdown')) {
                setShowHolidaySelector(false);
                setHolidaySearchTerm('');
              }
            };
          
            // Only add the event listener when the dropdown is open
            if (showHolidaySelector) {
              document.addEventListener('mousedown', handleClickOutside);
            }
          
            // Cleanup the event listener
            return () => {
              document.removeEventListener('mousedown', handleClickOutside);
            };
          }, [showHolidaySelector]);

  useEffect(() => {
    if (showHolidaySelector || showAddForm || showEditForm) {
      loadAvailableHolidays();
    }
  }, [showHolidaySelector, showAddForm, showEditForm]);

  useEffect(() => {
    setSelectAll(selectedItems.length === getCurrentData().length && getCurrentData().length > 0);
  }, [selectedItems, currentView]);

  useEffect(() => {
    // Auto-select holidays when available holidays are loaded and we have date range
    if (currentView === 'payroll-period' && formData.dateFrom && formData.dateTo && availableHolidays.length > 0) {
      const autoSelectedHolidays = autoSelectHolidaysInRange(formData.dateFrom, formData.dateTo);
      
      // Only update if the selection would actually change
      if (JSON.stringify(autoSelectedHolidays.sort()) !== JSON.stringify(formData.selectedHolidays.sort())) {
        setFormData(prev => ({
          ...prev,
          selectedHolidays: autoSelectedHolidays
        }));
      }
    }
  }, [availableHolidays, currentView, formData.dateFrom, formData.dateTo]);

  const filteredHolidays = availableHolidays.filter(holiday =>
    holiday.name.toLowerCase().includes(holidaySearchTerm.toLowerCase()) ||
    holiday.type.toLowerCase().includes(holidaySearchTerm.toLowerCase())
  );

  const fetchPhilippineHolidays = async (year = new Date().getFullYear()) => {
    try {
      setLoading(true);
      console.log('Fetching holidays for year:', year); // Debug log
      
      // Correct API URL format
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`);
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const holidays = await response.json();
      console.log('Fetched holidays:', holidays); // Debug log
      
      if (!Array.isArray(holidays) || holidays.length === 0) {
        console.warn('No holidays data received');
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const holiday of holidays) {
        try {
          await axios.post(`${API_BASE}?action=holiday`, {
            holidayName: holiday.name,
            holidayType: holiday.global ? 'Regular' : 'Special',
            dateFrom: holiday.date
          });
          successCount++;
          console.log(`Created holiday: ${holiday.name}`); // Debug log
        } catch (error) {
          console.error(`Failed to create holiday: ${holiday.name}`, error);
          errorCount++;
        }
      }
      
      console.log(`Import complete: ${successCount} success, ${errorCount} errors`); // Debug log
      alert(`Successfully imported ${successCount} holidays for ${year}. ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
      
      // Refresh the data after import
      await loadData();
      
    } catch (error) {
      console.error('Error fetching holidays:', error);
      alert(`Failed to fetch holidays: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentView !== 'dashboard') {
      loadData();
      
      // Auto-import holidays when first visiting setup-holiday
      if (currentView === 'setup-holiday') {
        // Check if holidays already exist to avoid duplicates
        checkAndImportHolidays();
      }
    }
  }, [currentView]);
  
  const checkAndImportHolidays = async () => {
    try {
      const response = await axios.get(`${API_BASE}?action=holidays`);
      const existingHolidays = response.data.data;
      
      // Only import if no holidays exist
      if (existingHolidays.length === 0) {
        await fetchPhilippineHolidays();
      }
    } catch (error) {
      console.error('Error checking existing holidays:', error);
    }
  };

  // API Functions
  const loadData = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (currentView) {
        case 'payroll-period':
          endpoint = 'payroll_periods';
          break;
        case 'setup-holiday':
          endpoint = 'holidays';
          break;
        case 'pay-components':
          endpoint = 'pay_components';
          break;
      }

      const response = await axios.get(`${API_BASE}?action=${endpoint}`);
      const data = response.data.data;

      switch (currentView) {
        case 'payroll-period':
          setPayrollPeriods(data);
          break;
        case 'setup-holiday':
          setHolidays(data);
          break;
        case 'pay-components':
          setPayComponents(data);
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFormulaChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'rateFormula' || field === 'amountFormula') {
      const validation = validateFormula(value);
      if (!validation.valid) {
        setFormulaError(validation.message);
      } else {
        setFormulaError('');
      }
    }
  };

  
  const validateFormula = (formula) => {
    if (!formula || formula.trim() === '') return { valid: true, message: '' };
    
    // Check for invalid patterns
    const invalidPatterns = [
      /\*\*+/, // Double asterisks
      /\/\/+/, // Double slashes  
      /[+\-*\/]{2,}/, // Multiple consecutive operators
      /^[+\-*\/]/, // Starting with operator
      /[+\-*\/]$/, // Ending with operator
      /\(\)/, // Empty parentheses
      /[^0-9+\-*\/\.\(\)\s\w]/ // Invalid characters (allow word characters for column names)
    ];
    
    for (let pattern of invalidPatterns) {
      if (pattern.test(formula)) {
        return { 
          valid: false, 
          message: 'Invalid formula pattern. Check for double operators or invalid characters.' 
        };
      }
    }
    
    return { valid: true, message: '' };
  };

  const errorStyles = `
.mp-form-input.error {
  border-color: #dc2626;
  background-color: #fef2f2;
}
`;


  const loadAvailableHolidays = async () => {
    try {
      const response = await axios.get(`${API_BASE}?action=available_holidays`);
      setAvailableHolidays(response.data.data);
    } catch (error) {
      console.error('Error loading available holidays:', error);
    }
  };

  const loadPayrollPeriodDetails = async (id) => {
    try {
      const response = await axios.get(`${API_BASE}?action=payroll_period_details&id=${id}`);
      setSelectedPeriodDetails(response.data.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading payroll period details:', error);
      alert('Error loading period details.');
    }
  };

  const saveData = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      let data = {};

      switch (currentView) {
        case 'payroll-period':
          endpoint = 'payroll_period';
          data = {
            dateFrom: formData.dateFrom,
            dateTo: formData.dateTo,
            selectedHolidays: formData.selectedHolidays
          };
          break;
        case 'setup-holiday':
          endpoint = 'holiday';
          data = {
            holidayName: formData.holidayName,
            holidayType: formData.holidayType,
            dateFrom: formData.dateFrom 
          };
          break;
          case 'pay-components':
          endpoint = 'pay_component';
          data = {
            component: formData.component || '',
            baseRateType: formData.baseRateType || '',
            rateType: formData.rateType || '',
            rateMultiplier: formData.rateMultiplier || '',
            amountCalculationType: formData.amountCalculationType || 'rate_times_hours',
            formula: formData.formula || '',
            rateFormula: formData.rateFormula || '',
            amountFormula: formData.amountFormula || '',
            status: formData.status || 'Active'
          };
          
          console.log('DEBUG: Sending pay component data:', data);
          break;
      }

      if (editingItem) {
        data.id = editingItem.id;
        await axios.put(`${API_BASE}?action=${endpoint}`, data);
      } else {
        await axios.post(`${API_BASE}?action=${endpoint}`, data);
      }

      closeAllModals();
      loadData();
      alert(editingItem ? 'Item updated successfully!' : 'Item created successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Error saving data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteItems = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to delete.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} item(s)?`)) {
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';
      switch (currentView) {
        case 'payroll-period':
          endpoint = 'payroll_periods';
          break;
        case 'setup-holiday':
          endpoint = 'holidays';
          break;
        case 'pay-components':
          endpoint = 'pay_components';
          break;
      }

      await axios.delete(`${API_BASE}?action=${endpoint}`, {
        data: { ids: selectedItems }
      });

      setSelectedItems([]);
      loadData();
      alert('Items deleted successfully!');
    } catch (error) {
      console.error('Error deleting items:', error);
      alert('Error deleting items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper Functions
  const getCurrentData = () => {
    switch (currentView) {
      case 'payroll-period':
        return payrollPeriods;
      case 'setup-holiday':
        return holidays;
      case 'pay-components':
        return payComponents;
      default:
        return [];
    }
  };

  const resetFormData = () => {
    setFormData({
      dateFrom: '',
      dateTo: '',
      date: '', // Add this line
      selectedHolidays: [],
      holidayName: '',
      holidayType: 'Regular',
      component: '',
      baseRateType: '',
      rateType: '',
      rateMultiplier: '',
      amountCalculationType: 'rate_times_hours',
      formula: '',
      rateFormula: '',
      amountFormula: 'RATE * HOURS',
      status: 'Active'
    });
    setFormulaError(''); // Clear any formula errors
  };

  const closeAllModals = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setShowHolidaySelector(false);
    setShowDetailModal(false);
    setEditingItem(null);
    resetFormData();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusClass = (status) => {
    return status.toLowerCase() === 'active' ? 'mp-status-active' : 'mp-status-inactive';
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'payroll-period':
        return 'Payroll Period Configuration';
      case 'setup-holiday':
        return 'Setup Holiday';
      case 'pay-components':
        return 'Pay Components Configuration';
      default:
        return '';
    }
  };

  // Event Handlers
  const handleCardClick = (cardId) => {
    setCurrentView(cardId);
    setIsManaging(false);
    setSelectedItems([]);
    setSelectAll(false);
    setCurrentPage(1);
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setIsManaging(false);
    setSelectedItems([]);
    setSelectAll(false);
  };

  const handleManage = () => {
    setIsManaging(true);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(getCurrentData().map(item => item.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingItem(null);
    resetFormData();
  };

  const handleEdit = (itemId) => {
    const item = getCurrentData().find(data => data.id === itemId);
    if (item) {
      setEditingItem(item);
      setShowEditForm(true);
      
      switch (currentView) {
        case 'payroll-period':
          loadPayrollPeriodForEdit(item.id);
          setFormData({
            ...formData,
            dateFrom: item.dateFrom,
            dateTo: item.dateTo,
            selectedHolidays: []
          });
          break;
        case 'setup-holiday':
          setFormData({
            ...formData,
            dateFrom: item.dateFrom,
            dateTo: item.dateTo,
            holidayName: item.name,
            holidayType: item.type
          });
          break;
          case 'pay-components':
            // Extract multiplier from rate formula if it exists
            
            let rateMultiplier = '';
            if (item.rateFormula && item.baseRateType) {
              const multiplierMatch = item.rateFormula.match(/\* ([\d.]+)$/);
              if (multiplierMatch) {
                rateMultiplier = multiplierMatch[1];
              } else {
                rateMultiplier = 'custom';
              }
            }

            if (['Undertime/Late', 'Late/Undertime', 'Absences'].includes(item.rateType)) {
              // For deduction types, no multiplier is used
              rateMultiplier = '';
            } else if (item.rateFormula && item.baseRateType) {
              const multiplierMatch = item.rateFormula.match(/\* ([\d.]+)$/);
              if (multiplierMatch) {
                rateMultiplier = multiplierMatch[1];
              } else {
                rateMultiplier = 'custom';
              }
            }

            
            
            // Determine amount calculation type
            let amountCalculationType = 'rate_times_hours';
            if (item.amountFormula === 'RATE * DAYS') {
              amountCalculationType = 'rate_times_days';
            } else if (item.amountFormula === 'RATE * MINUTES') {
              amountCalculationType = 'rate_times_minutes';
            } else if (item.amountFormula !== 'RATE * HOURS') {
              amountCalculationType = 'custom';
            }
            
            setFormData({
              ...formData,
              component: item.component,
              baseRateType: item.baseRateType || '',
              rateType: item.rateType,
              rateMultiplier: rateMultiplier,
              amountCalculationType: amountCalculationType,
              formula: item.formula,
              rateFormula: item.rateFormula || '',
              amountFormula: item.amountFormula || '',
              status: item.status
            });
            break;
      }
    }
  };

  const loadPayrollPeriodForEdit = async (id) => {
    try {
      const response = await axios.get(`${API_BASE}?action=payroll_period_details&id=${id}`);
      const details = response.data.data;
      setFormData(prev => ({
        ...prev,
        selectedHolidays: details.holidays.map(h => h.id)
      }));
    } catch (error) {
      console.error('Error loading payroll period for edit:', error);
    }
  };

  const handleRowClick = (item) => {
    if (currentView === 'payroll-period' && !isManaging) {
      loadPayrollPeriodDetails(item.id);
    }
  };

  const handleHolidayToggle = (holidayId) => {
    setFormData(prev => ({
      ...prev,
      selectedHolidays: prev.selectedHolidays.includes(holidayId)
        ? prev.selectedHolidays.filter(id => id !== holidayId)
        : [...prev.selectedHolidays, holidayId]
    }));
  };

  // Pagination
  const currentData = getCurrentData();
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);

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
          className={`mp-pagination-btn ${currentPage === i ? 'mp-pagination-active' : ''}`}
        >
          {i.toString().padStart(2, '0')}
        </button>
      );
    }
    
    if (totalPages > 5) {
      buttons.push(
        <span key="dots" className="mp-pagination-dots">...</span>
      );
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`mp-pagination-btn ${currentPage === totalPages ? 'mp-pagination-active' : ''}`}
        >
          {totalPages.toString().padStart(2, '0')}
        </button>
      );
    }
    
    return buttons;
  };

  // Table Configuration
  const getTableHeaders = () => {
    switch (currentView) {
      case 'payroll-period':
        return isManaging 
          ? ['', 'PRP ID', 'Date From', 'Date To', 'No. of Regular Holiday', 'No. of Special Holiday', 'Action']
          : ['PRP ID', 'Date From', 'Date To', 'No. of Regular Holiday', 'No. of Special Holiday'];
      case 'setup-holiday':
        return isManaging
          ? ['', 'Holiday ID', 'Holiday Name', 'Holiday Type', 'Date', 'Action']
          : ['Holiday ID', 'Holiday Name', 'Holiday Type', 'Date'];
      case 'pay-components':
        return isManaging
          ? ['', 'PPC ID', 'Pay Components', 'Rate Type', 'Formula', 'Date Added', 'Status', 'Action']
          : ['PPC ID', 'Pay Components', 'Rate Type', 'Formula', 'Date Added', 'Status'];
      default:
        return [];
    }
  };

  const shouldShowAmountCalculation = (rateType) => {
    const rateTypesWithoutAmount = [
      'Rate Per Day',
      'Rate Per Hour', 
      'Rate Per Min',
      'Basic pay-Monthly',
      'Basic Pay-Semi-Monthly'
    ];
    return !rateTypesWithoutAmount.includes(rateType);
  };



  const renderTableRow = (item, index) => {
    const rowClassName = `mp-table-row ${!isManaging && currentView === 'payroll-period' ? 'clickable-row' : ''}`;
    
    switch (currentView) {
      case 'payroll-period':
        return (
          <tr key={item.id} className={rowClassName} onClick={() => handleRowClick(item)}>
            {isManaging && (
              <td className="mp-checkbox-cell" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => handleSelectItem(item.id)}
                  className="mp-checkbox"
                />
              </td>
            )}
            <td className="mp-id-cell">{item.prpId}</td>
            <td className="mp-date-cell">{formatDate(item.dateFrom)}</td>
            <td className="mp-date-cell">{formatDate(item.dateTo)}</td>
            <td className="mp-number-cell">{item.regularHolidays}</td>
            <td className="mp-number-cell">{item.specialHolidays}</td>
            {isManaging && (
              <td className="mp-action-cell" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleEdit(item.id)} className="mp-table-action-btn mp-edit-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  Edit
                </button>
              </td>
            )}
          </tr>
        );

      case 'setup-holiday':
        return (
          <tr key={item.id} className="mp-table-row">
            {isManaging && (
              <td className="mp-checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => handleSelectItem(item.id)}
                  className="mp-checkbox"
                />
              </td>
            )}
            <td className="mp-id-cell">{item.holidayId}</td>
            <td className="mp-name-cell">{item.name}</td>
            <td className="mp-type-cell">
              <span className={`mp-type-badge mp-type-${item.type.toLowerCase()}`}>
                {item.type}
              </span>
            </td>
            <td className="mp-date-range-cell">{formatDate(item.dateFrom)}</td>
            {isManaging && (
              <td className="mp-action-cell">
                <button onClick={() => handleEdit(item.id)} className="mp-table-action-btn mp-edit-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  Edit
                </button>
              </td>
            )}
          </tr>
        );

      case 'pay-components':
        return (
          <tr key={item.id} className="mp-table-row">
            {isManaging && (
              <td className="mp-checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => handleSelectItem(item.id)}
                  className="mp-checkbox"
                />
              </td>
            )}
            <td className="mp-id-cell">{item.ppcId}</td>
            <td className="mp-component-cell">{item.component}</td>
            <td className="mp-component-cell">{item.rateType}</td>
            <td className="mp-formula-cell">{item.formula}</td>
            <td className="mp-date-cell">{formatDate(item.dateAdded)}</td>
            <td className="mp-status-cell">
              <span className={`mp-status-badge ${getStatusClass(item.status)}`}>
                {item.status}
              </span>
            </td>
            {isManaging && (
              <td className="mp-action-cell">
                <button onClick={() => handleEdit(item.id)} className="mp-table-action-btn mp-edit-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  Edit
                </button>
              </td>
            )}
          </tr>
        );

      default:
        return null;
    }
  };

  // Render Dashboard
  if (currentView === 'dashboard') {
    return (
      <div className="mp-page">
        <div className="mp-header-container">
          <div className="mp-header-content">
            <h1 className="mp-title">MANAGE PAYROLL</h1>
          </div>
        </div>
        <div className="mp-content">
          <div className="mp-cards-grid">
            {dashboardCards.map((card) => (
              <div key={card.id} className="mp-card" onClick={() => handleCardClick(card.id)}>
                <div className="mp-card-header">
                  <div className="mp-card-icon">{card.icon}</div>
                  <div className="mp-card-info">
                    <h3 className="mp-card-title">{card.title}</h3>
                    <p className="mp-card-subtitle">Last Update: {formatDate(card.lastUpdate)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render Main Content
  return (
    <div className="mp-page">
      {/* Payroll Period Details Modal */}
      {showDetailModal && selectedPeriodDetails && (
        <div className="mp-form-overlay">
          <div className="mp-form-modal">
            <div className="mp-form-header">
              <h3 className="mp-form-title">Payroll Period Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="mp-form-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="mp-form-content">
              <div className="mp-form-group">
                <label className="mp-form-label">Period ID:</label>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                  {selectedPeriodDetails.prpId}
                </div>
              </div>
              <div className="mp-form-row">
                <div className="mp-form-group">
                  <label className="mp-form-label">Date From:</label>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                    {formatDate(selectedPeriodDetails.dateFrom)}
                  </div>
                </div>
                <div className="mp-form-group">
                  <label className="mp-form-label">Date To:</label>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                    {formatDate(selectedPeriodDetails.dateTo)}
                  </div>
                </div>
              </div>
              <div className="mp-form-group">
                <label className="mp-form-label">Associated Holidays:</label>
                <div className="mp-selected-holidays">
                  {selectedPeriodDetails.holidays.length > 0 ? (
                    selectedPeriodDetails.holidays.map(holiday => (
                      <div key={holiday.id} className="mp-selected-holiday-item">
                        <span className="mp-selected-holiday-name">{holiday.name}</span>
                        <span className="mp-selected-holiday-date">{formatDate(holiday.dateFrom)}</span>
                        <span className={`mp-selected-holiday-type mp-type-${holiday.type.toLowerCase()}`}>
                          {holiday.type}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
                      No holidays associated with this period
                    </div>
                  )}
                </div>
              </div>
              <div className="mp-form-actions">
                <button onClick={() => setShowDetailModal(false)} className="mp-form-btn mp-cancel-btn">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {(showAddForm || showEditForm) && (
        <div className="mp-form-overlay">
          <div className="mp-form-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="mp-form-header">
              <h3 className="mp-form-title">
                {editingItem ? `Edit ${getViewTitle()}` : `Add New ${getViewTitle()}`}
              </h3>
              <button onClick={closeAllModals} className="mp-form-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="mp-form-content" style={{ position: 'relative', zIndex: 1001 }}>
              {/* Date Fields for Payroll Period */}
                {currentView === 'payroll-period' && (
                  <div className="mp-form-row">
                    <div className="mp-form-group">
                      <label className="mp-form-label">Date From:</label>
                      <input
                          type="date"
                          value={formData.dateFrom}
                          onChange={(e) => {
                            const selectedDate = new Date(e.target.value);
                            const dateTo = new Date(selectedDate);
                            
                            // Check if the month has 31 days
                            const year = selectedDate.getFullYear();
                            const month = selectedDate.getMonth();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            
                            // Add 15 days if month has 31 days, otherwise add 14
                            const daysToAdd = daysInMonth === 31 ? 15 : 14;
                            dateTo.setDate(selectedDate.getDate() + daysToAdd);
                            
                            const dateToString = dateTo.toISOString().split('T')[0];
                            
                            // Auto-select holidays in the date range
                            const autoSelectedHolidays = autoSelectHolidaysInRange(e.target.value, dateToString);
                            
                            setFormData(prev => ({ 
                              ...prev, 
                              dateFrom: e.target.value,
                              dateTo: dateToString,
                              selectedHolidays: autoSelectedHolidays
                            }));
                          }}
                          className="mp-form-input"
                        />
                    </div>
                    <div className="mp-form-group">
                      <label className="mp-form-label">Date To:</label>
                      <input
                          type="date"
                          value={formData.dateTo}
                          onChange={(e) => {
                            // Auto-select holidays in the updated date range
                            const autoSelectedHolidays = autoSelectHolidaysInRange(formData.dateFrom, e.target.value);
                            
                            setFormData(prev => ({ 
                              ...prev, 
                              dateTo: e.target.value,
                              selectedHolidays: autoSelectedHolidays
                            }));
                          }}
                          className="mp-form-input"
                        />
                    </div>
                  </div>
                )}

                {/* Date Field for Holiday */}
                {currentView === 'setup-holiday' && (
                  <div className="mp-form-group">
                    <label className="mp-form-label">Date:</label>
                    <input
                      type="date"
                      value={formData.dateFrom}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateFrom: e.target.value }))}
                      className="mp-form-input"
                    />
                  </div>
                )}

              {/* Holiday Selection for Payroll Period */}
              {currentView === 'payroll-period' && (
                <div className="mp-form-group">
                <label className="mp-form-label">Select Holiday:</label>
                <div className="mp-holiday-dropdown">
                  <div 
                    className="mp-holiday-dropdown-trigger"
                    onClick={() => setShowHolidaySelector(!showHolidaySelector)}
                  >
                    <input
                      type="text"
                      value={showHolidaySelector ? holidaySearchTerm : 'Click to select holidays'}
                      onChange={(e) => setHolidaySearchTerm(e.target.value)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHolidaySelector(true);
                      }}
                      className="mp-form-input mp-holiday-search"
                      placeholder={showHolidaySelector ? "Search holidays..." : "Click to select holidays"}
                      readOnly={!showHolidaySelector}
                    />
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                      className={`mp-dropdown-arrow ${showHolidaySelector ? 'open' : ''}`}
                    >
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  </div>
                  
                  {showHolidaySelector && (
                    <div className="mp-holiday-dropdown-menu">
                      {filteredHolidays.map((holiday) => (
                        <label key={holiday.id} className="mp-holiday-dropdown-option">
                          <input
                            type="checkbox"
                            checked={formData.selectedHolidays.includes(holiday.id)}
                            onChange={() => handleHolidayToggle(holiday.id)}
                            className="mp-holiday-checkbox"
                          />
                          <div className="mp-holiday-option-content">
                            <span className="mp-holiday-option-name">{holiday.name}</span>
                            <span className="mp-holiday-option-date">{formatDate(holiday.date)}</span>
                            <span className={`mp-holiday-option-type mp-type-${holiday.type.toLowerCase()}`}>
                              {holiday.type}
                            </span>
                          </div>
                        </label>
                      ))}
                      {filteredHolidays.length === 0 && (
                        <div className="mp-holiday-no-results">No holidays found</div>
                      )}
                    </div>
                  )}
                </div>
                
                {formData.selectedHolidays.length > 0 && (
                  <div className="mp-selected-holidays">
                    {availableHolidays
                      .filter(holiday => formData.selectedHolidays.includes(holiday.id))
                      .map(holiday => (
                        <div key={holiday.id} className="mp-selected-holiday-item">
                          <span className="mp-selected-holiday-name">{holiday.name}</span>
                          <span className="mp-selected-holiday-date">{formatDate(holiday.date)}</span>
                          <span className={`mp-selected-holiday-type mp-type-${holiday.type.toLowerCase()}`}>
                            {holiday.type}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
              )}

              {/* Holiday Name and Type */}
              {currentView === 'setup-holiday' && (
                <>
                  <div className="mp-form-group">
                    <label className="mp-form-label">Holiday Name:</label>
                    <input
                      type="text"
                      value={formData.holidayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, holidayName: e.target.value }))}
                      className="mp-form-input"
                      placeholder="Enter holiday name"
                    />
                  </div>
                  <div className="mp-form-group">
                    <label className="mp-form-label">Holiday Type:</label>
                    <div className="mp-radio-group">
                      <label className="mp-radio-option">
                        <input
                          type="radio"
                          name="holidayType"
                          value="Regular"
                          checked={formData.holidayType === 'Regular'}
                          onChange={(e) => setFormData(prev => ({ ...prev, holidayType: e.target.value }))}
                        />
                        <span>Regular</span>
                      </label>
                      <label className="mp-radio-option">
                        <input
                          type="radio"
                          name="holidayType"
                          value="Special"
                          checked={formData.holidayType === 'Special'}
                          onChange={(e) => setFormData(prev => ({ ...prev, holidayType: e.target.value }))}
                        />
                        <span>Special</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

            
            {currentView === 'pay-components' && (
              <>
                <div className="mp-form-group">
                  <label className="mp-form-label">Pay Component:</label>
                  <input
                    type="text"
                    value={formData.component}
                    onChange={(e) => setFormData(prev => ({ ...prev, component: e.target.value }))}
                    className="mp-form-input"
                    placeholder="Enter pay component name (e.g., Regular Holiday)"
                  />
                </div>
                
                <div className="mp-form-group">
                  <label className="mp-form-label">Rate Type:</label>
                  <select
                    value={formData.rateType}
                    onChange={(e) => setFormData(prev => ({ ...prev, rateType: e.target.value }))}
                    className="mp-form-input"
                  >
                    <option value="">Select Rate Type</option>
                    {rateTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* FIXED: Show Rate Calculation section for ALL rate types, but with different behavior */}
                {formData.rateType && (
                  <>
                    <div className="mp-form-group">
                      <label className="mp-form-label">Base Rate Column:</label>
                      <select
                        value={formData.baseRateType}
                        onChange={(e) => setFormData(prev => ({ ...prev, baseRateType: e.target.value }))}
                        className="mp-form-input"
                      >
                        <option value="">Select Base Rate</option>
                        {baseRateColumns.map((rate) => (
                          <option key={rate} value={rate}>{rate}</option>
                        ))}
                      </select>
                      <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                        {['Undertime/Late', 'Late/Undertime', 'Absences'].includes(formData.rateType) 
                          ? 'The base rate used for deduction calculations' 
                          : 'The base rate column to use in calculations'}
                      </small>
                    </div>
                    
                    {/* CONDITIONAL: Hide multiplier for deduction types */}
                    {!['Undertime/Late', 'Late/Undertime', 'Absences'].includes(formData.rateType) && (
                      <>
                        <div className="mp-form-group">
                          <label className="mp-form-label">Rate Multiplier:</label>
                          <select
                            value={formData.rateMultiplier || ''}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              rateMultiplier: e.target.value,
                              rateFormula: prev.baseRateType && e.target.value ? `${prev.baseRateType} * ${e.target.value}` : ''
                            }))}
                            className="mp-form-input"
                          >
                            <option value="">Select Multiplier</option>
                            <option value="1.0">1.0 (Same Rate)</option>
                            <option value="1.25">1.25 (Regular OT - 25%)</option>
                            <option value="1.30">1.30 (Special Holiday - 30%)</option>
                            <option value="1.50">1.50 (Rest Day - 50%)</option>
                            <option value="2.0">2.0 (Regular Holiday - 100%)</option>
                            <option value="2.50">2.50 (Holiday + OT - 150%)</option>
                            <option value="custom">Custom (Enter manually)</option>
                          </select>
                          <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                            How much to multiply the base rate by
                          </small>
                        </div>

                        {formData.rateMultiplier === 'custom' && (
                          <div className="mp-form-group">
                            <label className="mp-form-label">Custom Rate Formula:</label>
                            <input
                              type="text"
                              value={formData.rateFormula || ''}
                              onChange={(e) => handleFormulaChange('rateFormula', e.target.value)}
                              className={`mp-form-input ${formulaError ? 'error' : ''}`}
                              placeholder="Rate Per Hour * 1.5"
                              style={{ fontFamily: 'monospace' }}
                            />
                            {formulaError && (
                              <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                                {formulaError}
                              </div>
                            )}
                            <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                              Examples:<br/>
                              • Rate Per Hour * 1.5<br/>
                              • Rate Per Hour / 8 * 1.3<br/>
                              • (Rate Per Hour + 50) * 1.25<br/>
                              Avoid spaces around operators and double operators like **
                            </small>
                          </div>
                        )}
                      </>
                    )}

                    {/* CONDITIONAL: Show info box for deduction types */}
                    {['Undertime/Late', 'Late/Undertime', 'Absences'].includes(formData.rateType) && (
                      <div className="mp-form-group">
                        <div style={{ 
                          padding: '12px', 
                          backgroundColor: '#eff6ff', 
                          borderRadius: '8px',
                          border: '1px solid #bfdbfe'
                        }}>
                          <div style={{ color: '#1e40af', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                            Deduction Rate Information
                          </div>
                          <div style={{ color: '#1e40af', fontSize: '12px' }}>
                            For {formData.rateType}, the rate is taken directly from the selected base rate column without any multiplier. 
                            The amount will be calculated based on the time units specified below.
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Amount Calculation Section */}
                {shouldShowAmountCalculation(formData.rateType) && (
                  <>
                    <div className="mp-form-group">
                      <label className="mp-form-label">Amount Calculation:</label>
                      <select
                        value={formData.amountCalculationType || 'rate_times_hours'}
                        onChange={(e) => {
                          let newAmountFormula = '';
                          // FIXED: Set correct default formulas for late/undertime and absences
                          if (formData.rateType === 'Undertime/Late' || formData.rateType === 'Late/Undertime') {
                            newAmountFormula = e.target.value === 'custom' ? '' : 'RATE * MINUTES';
                          } else if (formData.rateType === 'Absences') {
                            newAmountFormula = e.target.value === 'custom' ? '' : 'RATE * DAYS';
                          } else {
                            newAmountFormula = e.target.value === 'rate_times_hours' ? 'RATE * HOURS' : 
                                              e.target.value === 'rate_times_days' ? 'RATE * DAYS' :
                                              e.target.value === 'rate_times_minutes' ? 'RATE * MINUTES' : '';
                          }
                          
                          setFormData(prev => ({ 
                            ...prev, 
                            amountCalculationType: e.target.value,
                            amountFormula: newAmountFormula
                          }));
                        }}
                        className="mp-form-input"
                      >
                        {/* CONDITIONAL: Show different options based on rate type */}
                        {(formData.rateType === 'Undertime/Late' || formData.rateType === 'Late/Undertime') ? (
                          <>
                            <option value="rate_times_minutes">Rate × Minutes</option>
                            <option value="custom">Custom Formula</option>
                          </>
                        ) : formData.rateType === 'Absences' ? (
                          <>
                            <option value="rate_times_days">Rate × Days</option>
                            <option value="custom">Custom Formula</option>
                          </>
                        ) : (
                          <>
                            <option value="rate_times_hours">Rate × Hours</option>
                            <option value="rate_times_days">Rate × Days</option>
                            <option value="rate_times_minutes">Rate × Minutes</option>
                            <option value="custom">Custom Formula</option>
                          </>
                        )}
                      </select>
                      <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                        How to calculate the final amount
                      </small>
                    </div>

                    {formData.amountCalculationType === 'custom' && (
                      <div className="mp-form-group">
                        <label className="mp-form-label">Custom Amount Formula:</label>
                        <input
                          type="text"
                          value={formData.amountFormula || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, amountFormula: e.target.value }))}
                          className="mp-form-input"
                          placeholder="e.g., RATE * HOURS * 0.5"
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Preview Section - UPDATED */}
                <div className="mp-form-group">
                  <label className="mp-form-label">Formula Preview:</label>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f3f4f6', 
                    borderRadius: '8px',
                    border: '1px solid #d1d5db'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Rate Formula:</strong> {
                        ['Undertime/Late', 'Late/Undertime', 'Absences'].includes(formData.rateType) 
                          ? (formData.baseRateType || 'Base rate (no multiplier applied)')
                          : (formData.rateFormula || 
                            (formData.baseRateType && formData.rateMultiplier && formData.rateMultiplier !== 'custom' 
                              ? `${formData.baseRateType} * ${formData.rateMultiplier}` 
                              : 'Not set'))
                      }
                    </div>
                    <div>
                      <strong>Amount Formula:</strong> {
                        shouldShowAmountCalculation(formData.rateType) 
                          ? (formData.amountFormula || 'Not set')
                          : 'N/A (Rate calculation only)'
                      }
                    </div>
                    {formData.baseRateType && formData.rateMultiplier && formData.rateMultiplier !== 'custom' && 
                    !['Undertime/Late', 'Late/Undertime', 'Absences'].includes(formData.rateType) && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#059669' }}>
                        <strong>Example:</strong> If {formData.baseRateType} = ₱100, then Rate = ₱{(100 * parseFloat(formData.rateMultiplier || 1)).toFixed(2)}
                      </div>
                    )}
                    {['Undertime/Late', 'Late/Undertime', 'Absences'].includes(formData.rateType) && formData.baseRateType && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>
                        <strong>Deduction Example:</strong> If {formData.baseRateType} = ₱100, deduction rate = ₱100 (no multiplier)
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mp-form-group">
                  <label className="mp-form-label">Status:</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="mp-form-input"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </>
            )}
                        <div className="mp-form-actions">
                <button onClick={closeAllModals} className="mp-form-btn mp-cancel-btn" disabled={loading}>
                  Cancel
                </button>
                <button onClick={saveData} className="mp-form-btn mp-save-btn" disabled={loading}>
                  {loading ? 'Saving...' : (editingItem ? 'Update' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="mp-main-container">
        {/* Action Buttons */}
        <div className="mp-action-section">
          <div className="mp-view-actions">
            <button onClick={handleBackToDashboard} className="mp-action-btn mp-back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Back to Dashboard
            </button>
            
            {!isManaging ? (
              <button onClick={handleManage} className="mp-action-btn mp-manage-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                </svg>
                Manage
              </button>
            ) : (
              <div className="mp-manage-actions">
                <button
                  onClick={handleSelectAll}
                  className={`mp-action-btn mp-select-all-btn ${selectAll ? 'active' : ''}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {selectAll ? 'Deselect All' : 'Select All'}
                </button>
                <button onClick={handleAdd} className="mp-action-btn mp-add-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  Add
                </button>
                <button
                  onClick={deleteItems}
                  disabled={selectedItems.length === 0 || loading}
                  className="mp-action-btn mp-delete-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                  Delete ({selectedItems.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '40px',
            color: '#64748b' 
          }}>
            Loading...
          </div>
        )}

        {/* Table Section */}
        {!loading && (
          <div className="mp-table-section">
            <div className="mp-table-container">
              <table className="mp-data-table">
                <thead>
                  <tr className="mp-table-header">
                    {getTableHeaders().map((header, index) => (
                      <th key={index} className={index === 0 && isManaging ? 'mp-checkbox-header' : ''}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={getTableHeaders().length} style={{ 
                        textAlign: 'center', 
                        padding: '40px',
                        color: '#64748b' 
                      }}>
                        No data available. Click "Manage" and then "Add" to create new entries.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, index) => renderTableRow(item, index))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {currentData.length > 0 && (
              <div className="mp-pagination-area">
                <div className="mp-pagination-info">
                  Showing {startIndex + 1} to {Math.min(endIndex, currentData.length)} of {currentData.length} entries
                </div>
                <div className="mp-pagination-buttons">
                  {renderPaginationButtons()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagePayroll;