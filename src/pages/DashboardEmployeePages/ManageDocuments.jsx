import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, Plus, X, Upload, Edit3, Trash2 } from 'lucide-react';
import { getUserId, isAuthenticated, getUserRole, getCurrentUser } from '../../utils/auth';
import '../../components/EmployeeLayout/ManageDocuments.css';

const ManageDocuments = () => {
  const [selectedRequirement, setSelectedRequirement] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stagedFile, setStagedFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documentPreviews, setDocumentPreviews] = useState({});
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageCanvas, setPageCanvas] = useState(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const requirements = [
    'Birth Certificate',
    'Diploma/Transcript',
    'Government ID',
    'Proof of Address',
    'Medical Certificate',
    'Police Clearance',
    'Employment Certificate',
    'Tax Identification Number',
    'Contract',
    'NDA Agreement',
    'Health Insurance',
    'Emergency Contact Form'
  ];

  const userId = getUserId();
  const userRole = getUserRole();
  const currentUser = getCurrentUser();

  // Load PDF.js library
  useEffect(() => {
    const loadPdfJs = async () => {
      if (window.pdfjsLib) {
        setPdfJsLoaded(true);
        return;
      }

      try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            setPdfJsLoaded(true);
            console.log('PDF.js loaded successfully');
          }
        };
        script.onerror = () => {
          console.error('Failed to load PDF.js');
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading PDF.js:', error);
      }
    };

    loadPdfJs();
  }, []);

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login';
      return;
    }
    
    loadExistingFiles();
  }, []);

  useEffect(() => {
    document.title = "DIFSYS | MANAGE DOCUMENTS";
  }, []);

  const loadExistingFiles = async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      const response = await fetch(`http://localhost/difsysapi/employee-file-manager.php?action=files&emp_id=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const documents = data.files.map(file => ({
            id: file.id,
            name: file.name,
            type: file.type_file,
            fileType: 'pdf',
            uploadDate: file.uploaded_at,
            size: file.size,
            isUploaded: true
          }));
          setUploadedFiles(documents);
          
          if (pdfJsLoaded && documents.length > 0) {
            generatePreviewsForDocuments(documents);
          }
        }
      }
    } catch (error) {
      console.error('Error loading existing files:', error);
    } finally {
      setLoading(false);
    }
  };

  // Re-generate previews when PDF.js loads and we have documents
  useEffect(() => {
    if (pdfJsLoaded && uploadedFiles.length > 0) {
      generatePreviewsForDocuments(uploadedFiles);
    }
  }, [pdfJsLoaded, uploadedFiles]);

  // Send notification function
const sendNotification = async (notificationType, title, message, relatedId = null) => {
  try {
    // Determine target based on user role
    let targetUserId = 0; // 0 means send to all HR
    let targetRole = 'HR'; // Default to HR
    
    // If current user is HR, send to applicant/employee
    if (userRole === 'Employee') {
      targetUserId = relatedId; // Send to specific user
      targetRole = 'HR'; // or 'employee' based on context
    }
    
    const notificationData = {
      user_id: targetUserId,
      user_role: targetRole,
      type: notificationType,
      title: title,
      message: message,
      related_id: relatedId,
      related_type: notificationType.split('_')[0] // Extract type from notification type
    };
    
    const response = await fetch('http://localhost/difsysapi/notifications_api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationData)
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('Notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

  const generatePreviewsForDocuments = async (documents) => {
    if (!pdfJsLoaded) {
      console.log('PDF.js not loaded yet, skipping preview generation');
      return;
    }

    console.log('Starting to generate previews for', documents.length, 'documents');
    
    const previews = {};
    
    for (const doc of documents) {
      console.log('Generating preview for:', doc.name);
      
      if (doc.fileType === 'pdf' || getFileTypeFromExtension(doc.name) === 'pdf') {
        try {
          const response = await fetch(`http://localhost/difsysapi/employee-file-manager.php?action=file&id=${doc.id}&emp_id=${getUserId()}`);

          if (response.ok) {
            const blob = await response.blob();
            const pdfPreview = await generatePDFPreview(blob);
            if (pdfPreview) {
              previews[doc.id] = pdfPreview;
              console.log('Successfully generated PDF preview for:', doc.name);
            }
          }
        } catch (error) {
          console.error('Error generating preview for document:', doc.id, error);
        }
      }
    }
    
    console.log('Generated previews for', Object.keys(previews).length, 'documents');
    setDocumentPreviews(prev => ({ ...prev, ...previews }));
  };

  const getFileTypeFromExtension = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return 'image';
      case 'xls':
      case 'xlsx':
      case 'csv': return 'excel';
      default: return 'other';
    }
  };

  const generatePDFPreview = async (file) => {
    try {
      if (!window.pdfjsLib || !pdfJsLoaded) {
        console.log('PDF.js not loaded yet');
        return null;
      }

      console.log('Generating PDF preview...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      const viewport = page.getViewport({ scale: 1 });
      canvas.width = 280;
      canvas.height = 150;
      
      const scaleX = canvas.width / viewport.width;
      const scaleY = canvas.height / viewport.height;
      const scale = Math.min(scaleX, scaleY) * 2.2;
      
      const scaledViewport = page.getViewport({ scale });
      
      const offsetX = (canvas.width - scaledViewport.width) / 2;
      const offsetY = -30;
      
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.save();
      context.translate(offsetX, offsetY);
      
      await page.render({
        canvasContext: context,
        viewport: scaledViewport
      }).promise;
      
      context.restore();
      
      const dataURL = canvas.toDataURL();
      console.log('PDF preview generated successfully');
      return dataURL;
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      return null;
    }
  };

  const validateFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf'];
    
    // Check file extension as well
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.pdf');
    
    if (!allowedTypes.includes(file.type) || !hasValidExtension) {
      return 'Only PDF files are allowed';
    }
    
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    
    return null;
  };

  const uploadFileToServer = async (file, requirement) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type_file', requirement);
    formData.append('emp_id', getUserId());
    
    try {
      const response = await fetch('http://localhost/difsysapi/employee-file-manager.php?action=upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const handleFileSelect = (files) => {
    if (!selectedRequirement) {
      setMessage({ type: 'error', text: 'Please select a requirement type first.' });
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setMessage({ type: 'error', text: 'User not authenticated.' });
      return;
    }

    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    setStagedFile({
      file: file,
      requirement: selectedRequirement,
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    setMessage({ type: 'info', text: `File "${file.name}" ready to upload. Click UPLOAD button to proceed.` });
  };

  const handleUploadClick = () => {
    if (!stagedFile) {
      if (!selectedRequirement) {
        setMessage({ type: 'error', text: 'Please select a requirement type first.' });
        return;
      }
      fileInputRef.current.click();
      return;
    }

    proceedWithUpload();
  };

  const proceedWithUpload = async () => {
    if (!stagedFile) {
      setMessage({ type: 'error', text: 'No file selected for upload.' });
      return;
    }

    const existingFile = uploadedFiles.find(f => f.type === stagedFile.requirement);
    if (existingFile) {
      const confirmReplace = window.confirm(
        `You already have a ${stagedFile.requirement} uploaded. Do you want to replace it?`
      );
      if (!confirmReplace) {
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    setMessage({ type: 'info', text: 'Uploading file...' });

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      const result = await uploadFileToServer(stagedFile.file, stagedFile.requirement);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (result.success) {
        const newFile = {
          id: result.id,
          name: stagedFile.file.name,
          size: stagedFile.file.size,
          type: stagedFile.requirement,
          fileType: 'pdf',
          uploadDate: new Date().toISOString()
        };

        let updatedFiles = uploadedFiles.filter(f => f.type !== stagedFile.requirement);
        updatedFiles.push(newFile);
        
        setUploadedFiles(updatedFiles);
        setCurrentFileIndex(updatedFiles.length - 1);
        setStagedFile(null);
        setSelectedRequirement('');
        setMessage({ type: 'success', text: 'File uploaded successfully!' });
        setShowUploadModal(false);

        if (pdfJsLoaded) {
          generatePreviewsForDocuments([newFile]);
        }
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
    }
    await sendNotification(
      'manage_document',                                    // type
      'New Documents Uploaded',                               // title
      `${currentUser.firstName} has uploaded a documents`, // message
      userId                                                // related_id
    );
  };

  const clearStagedFile = () => {
    setStagedFile(null);
    setMessage({ type: '', text: '' });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const pdfFiles = Array.from(files).filter(file => 
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      );
      
      if (pdfFiles.length === 0) {
        setMessage({ type: 'error', text: 'Only PDF files are allowed.' });
        return;
      }
      
      handleFileSelect(pdfFiles);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleBrowseClick = () => {
    if (!selectedRequirement) {
      setMessage({ type: 'error', text: 'Please select a requirement type first.' });
      return;
    }
    fileInputRef.current.click();
  };

  const deleteFileFromServer = async (fileId) => {
    try {
      const response = await fetch('http://localhost/difsysapi/employee-file-manager.php?action=delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: fileId, emp_id: getUserId() })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Delete failed');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const confirmDeleteFile = async () => {
    const fileToDelete = uploadedFiles[currentFileIndex];
    
    if (!fileToDelete) {
      setShowDeleteModal(false);
      return;
    }

    try {
      await deleteFileFromServer(fileToDelete.id);
      
      const newFiles = uploadedFiles.filter((_, index) => index !== currentFileIndex);
      setUploadedFiles(newFiles);
      setCurrentFileIndex(prev => Math.min(prev, newFiles.length - 1));
      
      setDocumentPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[fileToDelete.id];
        return newPreviews;
      });
      
      setMessage({ type: 'success', text: 'File deleted successfully!' });
      
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
    
    setShowDeleteModal(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDocumentClick = async (doc) => {
    try {
      setLoading(true);
      
      const response = await fetch(`http://localhost/difsysapi/employee-file-manager.php?action=file&id=${doc.id}&emp_id=${getUserId()}`);

      if (response.ok) {
        const blob = await response.blob();
        const pdfDataUri = URL.createObjectURL(blob);
        setSelectedDocument({
          ...doc,
          previewUrl: pdfDataUri
        });
      } else {
        setSelectedDocument(doc);
      }
      
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Error fetching document preview:', error);
      setSelectedDocument(doc);
      setShowPreviewModal(true);
    } finally {
      setLoading(false);
    }
  };

  const renderCardPreview = (doc) => {
    const previewUrl = documentPreviews && documentPreviews[doc.id];
    
    console.log('Rendering card preview for:', doc.name, 'Preview available:', !!previewUrl);
    
    if (previewUrl) {
      return (
        <img 
          src={previewUrl}
          alt={`${doc.name} preview`}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain', 
            backgroundColor: 'white', 
            borderRadius: '4px' 
          }}
          onError={(e) => {
            console.error('Preview image failed to load for:', doc.name);
            e.target.style.display = 'none';
          }}
        />
      );
    }
    
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#f8f9fa' 
      }}>
        <FileText size={40} color="#dc2626" />
      </div>
    );
  };

  const renderDocumentPreview = (doc) => {
    const goToPrevPage = () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    };
  
    const goToNextPage = () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    };
  
    if (doc.previewUrl && pdfJsLoaded) {
      return (
        <div style={{ 
          width: '100%', 
          height: '80vh',  // 80% of viewport height
          minHeight: '400px',  // Minimum height for small screens
          maxHeight: '850px',  // Maximum height for large screens
          display: 'flex', 
          flexDirection: 'column' 
        }}>
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: '#282828',
            overflow: 'auto'
          }}>
            <canvas 
              ref={canvasRef}
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
              }} 
            />
          </div>
          
          <div style={{ 
            padding: '16px', 
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'white'
          }}>
            <button 
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              style={{
                padding: '8px 16px',
                backgroundColor: currentPage <= 1 ? '#f3f4f6' : '#003979',
                color: currentPage <= 1 ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              Previous
            </button>
            
            <span style={{ 
              fontSize: '14px', 
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Page {currentPage} of {totalPages}
            </span>
            
            <button 
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              style={{
                padding: '8px 16px',
                backgroundColor: currentPage >= totalPages ? '#f3f4f6' : '#003979',
                color: currentPage >= totalPages ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              Next
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="md-emp-preview-placeholder" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '400px' 
      }}>
        <FileText size={80} color="#dc2626" />
        <p>{doc.type}</p>
        <p className="md-emp-preview-note">Preview not available</p>
      </div>
    );
  };

  // PDF loading effect - add this after your existing useEffects
useEffect(() => {
  if (selectedDocument?.previewUrl && pdfJsLoaded && window.pdfjsLib) {
    const loadPdfDocument = async () => {
      try {
        const response = await fetch(selectedDocument.previewUrl);
        const arrayBuffer = await response.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };
    loadPdfDocument();
  }
}, [selectedDocument?.previewUrl, pdfJsLoaded]);

// PDF rendering effect
useEffect(() => {
  if (pdfDocument && currentPage && canvasRef.current) {
    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(currentPage);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
      } catch (error) {
        console.error('Error rendering page:', error);
      }
    };
    renderPage();
  }
}, [pdfDocument, currentPage]);
  
  // Also add this reset function to handle modal close
  const resetPdfViewer = () => {
    setCurrentPage(1);
    setTotalPages(0);
    setPdfDocument(null);
    setPageCanvas(null);
  };

  const handleDownload = async (doc, event) => {
    event.stopPropagation();
    
    try {
      const response = await fetch(`http://localhost/difsysapi/employee-file-manager.php?action=file&id=${doc.id}&emp_id=${getUserId()}`, {
        method: 'GET'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error downloading document');
    }
  };

  const handleEditDocument = (doc, event) => {
    event.stopPropagation();
    setEditingDocument(doc);
    setSelectedRequirement(doc.type);
    setShowEditModal(true);
  };

  const handleDeleteDocument = (doc, event) => {
    event.stopPropagation();
    setSelectedDocument(doc);
    setShowDeleteModal(true);
  };

  const updateDocumentOnServer = async (docId, newFile, newType) => {
    const formData = new FormData();
    formData.append('file', newFile);
    formData.append('type_file', newType);
    formData.append('emp_id', getUserId());
    formData.append('update_id', docId);
    
    try {
      const response = await fetch('http://localhost/difsysapi/employee-file-manager.php?action=update', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Update failed');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  

  

  const confirmDeleteDocument = async () => {
    if (!selectedDocument) {
      setShowDeleteModal(false);
      return;
    }

    try {
      await deleteFileFromServer(selectedDocument.id);
      
      const newFiles = uploadedFiles.filter(file => file.id !== selectedDocument.id);
      setUploadedFiles(newFiles);
      
      setDocumentPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[selectedDocument.id];
        return newPreviews;
      });
      
      setMessage({ type: 'success', text: 'Document deleted successfully!' });
      
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
    
    setSelectedDocument(null);
    setShowDeleteModal(false);
  };

  return (
    <div className="md-emp-container">
      {/* Header Card */}
      <div className="md-emp-header-row">
        <div className="md-emp-title-card">
          <h1 className="md-emp-main-title">MANAGE DOCUMENTS</h1>
          <button 
              className="md-emp-add-button"
              onClick={() => setShowUploadModal(true)}
            >
              <Plus size={16} />
              Add Document
            </button>
        </div>
      </div>

      {/* Content Row */}
      <div className="md-emp-content-row">
        {/* Left Panel - Documents Grid */}
        <div className="md-emp-documents-panel">

          {/* Documents Grid */}
          <div className="md-emp-documents-grid">
            {loading ? (
              <div className="md-emp-loading">
                <div className="md-emp-loading-spinner"></div>
                <p>Loading documents...</p>
              </div>
            ) : uploadedFiles.length > 0 ? (
              uploadedFiles.map((doc) => (
                <div 
                  key={doc.id} 
                  className="md-emp-document-card"
                  onClick={() => handleDocumentClick(doc)}
                >
                  <div className="md-emp-document-preview-container">
                    <div className="md-emp-document-preview">
                      {renderCardPreview(doc)}
                    </div>
                    <div className="md-emp-document-preview-overlay">
                      <div className="md-emp-document-icon">
                        <FileText size={20} color="#dc2626" />
                      </div>
                    </div>
                  </div>
                  <div className="md-emp-document-info">
                    <h4 className="md-emp-document-name">{doc.name}</h4>
                    <p className="md-emp-document-type">{doc.type}</p>
                    <p className="md-emp-document-date">
                      Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="md-emp-document-actions">
                    <button 
                      className="md-emp-download-button"
                      onClick={(e) => handleDownload(doc, e)}
                      title="Download Document"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      className="md-emp-delete-button"
                      onClick={(e) => handleDeleteDocument(doc, e)}
                      title="Delete Document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="md-emp-no-documents">
                <FileText size={48} color="#6b7280" />
                <h3>No Documents Found</h3>
                <p>You have no documents uploaded yet.</p>
                <button 
                  className="md-emp-add-button"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Plus size={16} />
                  Upload First Document
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingDocument && (
        <div className="md-emp-modal-overlay">
          <div className="md-emp-upload-card">
            <div className="md-emp-card-header">
              <div className="md-emp-modal-header">
                <h2 className="md-emp-card-title">Edit Document</h2>
                <button 
                  className="md-emp-close-button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDocument(null);
                    setStagedFile(null);
                    setSelectedRequirement('');
                    setMessage({ type: '', text: '' });
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <p className="md-emp-card-subtitle">
                Update document type or replace file for: {editingDocument.name}
              </p>
              
              {/* Message Display */}
              {message.text && (
                <div className={`md-emp-message ${message.type}`}>
                  {message.text}
                </div>
              )}
              
              <div className="md-emp-dropdown-container">
                <select 
                  className="md-emp-dropdown"
                  value={selectedRequirement}
                  onChange={(e) => {
                    setSelectedRequirement(e.target.value);
                  }}
                  disabled={isUploading}
                >
                  <option value="">Select requirement type...</option>
                  {requirements.map((req, index) => (
                    <option key={index} value={req}>{req}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md-emp-card-body">
             
              
              <div 
                className={`md-emp-upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''} ${stagedFile ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
              >
                {isUploading ? (
                  <div className="md-emp-upload-progress">
                    <div className="md-emp-progress-bar">
                      <div 
                        className="md-emp-progress-fill" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p>Updating... {Math.round(uploadProgress)}%</p>
                  </div>
                ) : stagedFile ? (
                  <div className="md-emp-staged-file">
                    <div className="md-emp-file-icon">
                      <FileText size={48} />
                    </div>
                    <div className="md-emp-staged-info">
                      <h4>{stagedFile.name}</h4>
                      <p>Type: {selectedRequirement || 'Select type above'}</p>
                      <p>Size: {formatFileSize(stagedFile.size)}</p>
                    </div>
                    <button 
                      className="md-emp-clear-file"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearStagedFile();
                      }}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="md-emp-upload-icon">
                      <Upload size={48} />
                    </div>
                    <h3 className="md-emp-upload-title">BROWSE YOUR FILES OR DRAG A FILE HERE</h3>
                    <p className="md-emp-upload-note">Take note: Only .pdf file can be uploaded (Max 10MB)</p>
                    <p className="md-emp-upload-note-small">Leave empty to only update document type</p>
                  </>
                )}
              </div>
            </div>

            <div className="md-emp-upload-button-container">
              <button 
                className={`md-emp-upload-button ${(!selectedRequirement || selectedRequirement === editingDocument.type) ? 'disabled' : ''}`}
                onClick={proceedWithEdit}
                disabled={!selectedRequirement || selectedRequirement === editingDocument.type}
                type="button"
              >
                UPDATE TYPE
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".pdf,application/pdf"
            disabled={isUploading}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="md-emp-modal-overlay">
          <div className="md-emp-upload-card">
            <div className="md-emp-card-header">
              <div className="md-emp-modal-header">
                <h2 className="md-emp-card-title">Upload Document</h2>
                <button 
                  className="md-emp-close-button"
                  onClick={() => setShowUploadModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <p className="md-emp-card-subtitle">Select a requirement type and upload your file</p>
              
              {/* Message Display */}
              {message.text && (
                <div className={`md-emp-message ${message.type}`}>
                  {message.text}
                </div>
              )}
              
              <div className="md-emp-dropdown-container">
                <select 
                  className="md-emp-dropdown"
                  value={selectedRequirement}
                  onChange={(e) => {
                    setSelectedRequirement(e.target.value);
                    if (stagedFile && stagedFile.requirement !== e.target.value) {
                      setStagedFile(null);
                    }
                  }}
                  disabled={isUploading}
                >
                  <option value="">Select requirement type...</option>
                  {requirements.map((req, index) => (
                    <option key={index} value={req}>{req}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md-emp-card-body">
              <div 
                className={`md-emp-upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''} ${stagedFile ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
              >
                {isUploading ? (
                  <div className="md-emp-upload-progress">
                    <div className="md-emp-progress-bar">
                      <div 
                        className="md-emp-progress-fill" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p>Uploading... {Math.round(uploadProgress)}%</p>
                  </div>
                ) : stagedFile ? (
                  <div className="md-emp-staged-file">
                    <div className="md-emp-file-icon">
                      <FileText size={48} />
                    </div>
                    <div className="md-emp-staged-info">
                      <h4>{stagedFile.name}</h4>
                      <p>Type: {stagedFile.requirement}</p>
                      <p>Size: {formatFileSize(stagedFile.size)}</p>
                    </div>
                    <button 
                      className="md-emp-clear-file"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearStagedFile();
                      }}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="md-emp-upload-icon">
                      <Upload size={48} />
                    </div>
                    <h3 className="md-emp-upload-title">BROWSE YOUR FILES OR DRAG A FILE HERE</h3>
                    <p className="md-emp-upload-note">Take note: Only .pdf file can be uploaded (Max 10MB)</p>
                  </>
                )}
              </div>
            </div>

            <div className="md-emp-upload-button-container">
              <button 
                className={`md-emp-upload-button ${!stagedFile || isUploading ? 'disabled' : ''}`}
                onClick={handleUploadClick}
                disabled={!stagedFile || isUploading}
                type="button"
              >
                {isUploading ? 'UPLOADING...' : 'UPLOAD'}
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".pdf,application/pdf"
            disabled={isUploading}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedDocument && (
        <div className="md-emp-modal-overlay">
          <div className="md-emp-preview-modal">
            <div className="md-emp-preview-header">
              <div className="md-emp-preview-info">
                <h3>{selectedDocument.name}</h3>
                <p>{selectedDocument.type}</p>
              </div>
              <div className="md-emp-preview-actions">
                <button 
                  className="md-emp-preview-download"
                  onClick={(e) => handleDownload(selectedDocument, e)}
                >
                  <Download size={16} />
                  Download
                </button>
                <button 
                  className="md-emp-close-button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    resetPdfViewer();
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="md-emp-preview-content">
              {renderDocumentPreview(selectedDocument)}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDocument && (
        <div className="md-emp-modal-overlay">
          <div className="md-emp-modal">
            <h3>Are you sure you want to delete this document?</h3>
            <p><strong>Document:</strong> {selectedDocument.name}</p>
            <p><strong>Type:</strong> {selectedDocument.type}</p>
            <p>This action cannot be undone.</p>
            <div className="md-emp-modal-buttons">
              <button 
                className="md-emp-modal-btn md-emp-modal-btn-no"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedDocument(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="md-emp-modal-btn md-emp-modal-btn-yes"
                onClick={confirmDeleteDocument}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDocuments;