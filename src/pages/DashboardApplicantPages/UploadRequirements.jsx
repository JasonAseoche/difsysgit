import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, Plus, Trash2, Image, FileSpreadsheet, Edit3, Upload, X, CheckCircle, AlertCircle, User, Clock } from 'lucide-react';
import { getUserId, isAuthenticated } from '../../utils/auth';
import '../../components/ApplicantLayout/UploadRequirements.css';

const UploadRequirements = () => {
  const [selectedRequirement, setSelectedRequirement] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [stagedFile, setStagedFile] = useState(null);
  const [userStatus, setUserStatus] = useState('pending');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documentPreviews, setDocumentPreviews] = useState({});
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [requirements, setRequirements] = useState([]);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    document.title = "DIFSYS | UPLOAD REQUIREMENTS";
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/login';
      return;
    }
    
    loadExistingFiles();
    fetchUserStatus();
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    setLoadingRequirements(true);
    try {
      const userId = getUserId();
      const response = await fetch(`http://localhost/difsysapi/get_applicant_requirements.php?app_id=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.requirements) {
          setRequirements(data.requirements);
        } else {
          setRequirements(['Resume/CV', 'Government ID']);
        }
      }
    } catch (error) {
      console.error('Error fetching requirements:', error);
      setRequirements(['Resume/CV', 'Government ID']);
    } finally {
      setLoadingRequirements(false);
    }
  };

  const fetchUserStatus = async () => {
    try {
      const userId = getUserId();
      const response = await fetch(`http://localhost/difsysapi/get_applicant_status.php?app_id=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.status) {
          setUserStatus(data.status);
        } else {
          setUserStatus(data.status || 'pending');
        }
      }
    } catch (error) {
      console.error('Error fetching user status:', error);
      setUserStatus('pending');
    }
  };

  const loadExistingFiles = async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      const response = await fetch(`http://localhost/difsysapi/file-manager.php?action=files&app_id=${userId}`);
      
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

  useEffect(() => {
    if (pdfJsLoaded && uploadedFiles.length > 0) {
      generatePreviewsForDocuments(uploadedFiles);
    }
  }, [pdfJsLoaded, uploadedFiles]);

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
          const response = await fetch(`http://localhost/difsysapi/file-manager.php?action=file&id=${doc.id}&app_id=${getUserId()}&preview=true`);

          if (response.ok) {
            const data = await response.json();
            console.log('Preview API response for', doc.name, ':', data);

            if (data.content) {
              try {
                const binaryString = atob(data.content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const pdfPreview = await generatePDFPreview(blob);
                if (pdfPreview) {
                  previews[doc.id] = pdfPreview;
                  console.log('Successfully generated PDF preview for:', doc.name);
                }
              } catch (pdfError) {
                console.error('Error generating PDF preview for', doc.name, ':', pdfError);
              }
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

      let canvasWidth, canvasHeight;
      const screenWidth = window.innerWidth;

      if (screenWidth <= 480) {
        canvasWidth = 240;
        canvasHeight = 150;
      } else if (screenWidth <= 768) {
        canvasWidth = 260;
        canvasHeight = 165;
      } else if (screenWidth <= 1024) {
        canvasWidth = 270;
        canvasHeight = 175;
      } else {
        canvasWidth = 280;
        canvasHeight = 180;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const scaleX = canvas.width / viewport.width;
      const scaleY = canvas.height / viewport.height;
      const scale = Math.min(scaleX, scaleY) * 2.2;

      const scaledViewport = page.getViewport({ scale });

      const offsetX = (canvas.width - scaledViewport.width) / 2;

      let offsetY;
      if (screenWidth <= 480) {
        offsetY = -30;
      } else if (screenWidth <= 768) {
        offsetY = -40;
      } else if (screenWidth <= 1024) {
        offsetY = -45;
      } else {
        offsetY = -50;
      }

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
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['application/pdf'];
    
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
    formData.append('app_id', getUserId());
    
    try {
      const response = await fetch('http://localhost/difsysapi/file-manager.php?action=upload', {
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
        try {
          const userData = localStorage.getItem('user');
          const user = userData ? JSON.parse(userData) : null;
          
          await fetch('http://localhost/difsysapi/notifications_api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: 0,
              user_role: 'HR',
              type: 'requirements_uploaded',
              title: 'Requirements Uploaded',
              message: `${user?.firstName || 'Applicant'} ${user?.lastName || ''} has uploaded required documents: ${stagedFile.requirement}`,
              related_id: getUserId(),
              related_type: 'applicant'
            })
          });
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      
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

  const handleDeleteFile = (doc, event) => {
    event.stopPropagation();
    setFileToDelete(doc);
    setShowDeleteModal(true);
  };

  const deleteFileFromServer = async (fileId) => {
    try {
      const response = await fetch('http://localhost/difsysapi/file-manager.php?action=delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: fileId, app_id: getUserId() })
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
    if (!fileToDelete) {
      setShowDeleteModal(false);
      return;
    }

    try {
      await deleteFileFromServer(fileToDelete.id);
      
      const newFiles = uploadedFiles.filter(file => file.id !== fileToDelete.id);
      setUploadedFiles(newFiles);
      
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
    
    setFileToDelete(null);
    setShowDeleteModal(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      case 'under review': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return <CheckCircle size={20} />;
      case 'pending': return <Clock size={20} />;
      case 'rejected': return <AlertCircle size={20} />;
      case 'under review': return <User size={20} />;
      default: return <Clock size={20} />;
    }
  };

  const getRequirementStatus = (requirement) => {
    const uploaded = uploadedFiles.find(file => file.type === requirement);
    return uploaded ? 'Uploaded' : 'Not Uploaded';
  };

  const getRequirementStatusColor = (requirement) => {
    const uploaded = uploadedFiles.find(file => file.type === requirement);
    return uploaded ? '#10b981' : '#ef4444';
  };

  const handleDocumentClick = async (doc) => {
    try {
      setLoading(true);
      
      const response = await fetch(`http://localhost/difsysapi/file-manager.php?action=file&id=${doc.id}&app_id=${getUserId()}&preview=true`);

      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          const pdfDataUri = `data:application/pdf;base64,${data.content}`;
          setSelectedDocument({
            ...doc,
            previewUrl: pdfDataUri
          });
        } else {
          setSelectedDocument(doc);
        }
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
    if (doc.previewUrl) {
      return (
        <div style={{ width: '100%', height: '500px' }}>
          <iframe
            src={doc.previewUrl}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title={`PDF Preview: ${doc.name}`}
          />
        </div>
      );
    }
    
    return (
      <div className="upload-req-preview-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <FileText size={80} color="#dc2626" />
        <p>{doc.type}</p>
        <p className="upload-req-preview-note">Preview not available</p>
      </div>
    );
  };

  const handleDownload = async (doc, event) => {
    event.stopPropagation();
    
    try {
      const response = await fetch(`http://localhost/difsysapi/file-manager.php?action=file&id=${doc.id}&app_id=${getUserId()}`, {
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

  return (
    <div className="upload-req-container">
      {/* Header Cards Row */}
      <div className="upload-req-header-row">
        {/* Main Title Card */}
        <div className="upload-req-title-card">
          <h1 className="upload-req-main-title">Upload Requirements</h1>
        </div>

        {/* Status Card */}
        <div className="upload-req-status-card">
          <h3 className="upload-req-status-title">Status</h3>
          <div className="upload-req-status-content" style={{ borderColor: getStatusColor(userStatus) }}>
            <div className="upload-req-status-icon" style={{ color: getStatusColor(userStatus) }}>
              {getStatusIcon(userStatus)}
            </div>
            <span className="upload-req-status-text" style={{ color: getStatusColor(userStatus) }}>
              {userStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Conditional Content Based on Status */}
      {userStatus?.toLowerCase() === 'pending' && uploadedFiles.length > 0 ? (
        /* Pending Status Message */
        <div className="upload-req-pending-container">
          <div className="upload-req-pending-simple">
            <div className="upload-req-pending-icon">
              <Clock size={64} color="#f59e0b" />
            </div>
            <h2 className="upload-req-pending-title">Your Application is Uploaded.</h2>
            <p className="upload-req-pending-message">
              Wait for the HR Department to process your Application.
            </p>
          </div>
        </div>
      ) : (
        /* Normal Upload Interface */
        <div className="upload-req-content-row">
          {/* Left Panel - Documents Grid */}
          <div className="upload-req-documents-panel">
            <div className="upload-req-documents-header">
              <h2 className="upload-req-documents-title">Uploaded Documents</h2>
              <button 
                className="upload-req-add-button"
                onClick={() => setShowUploadModal(true)}
              >
                <Plus size={16} />
                Add Document
              </button>
            </div>

            {/* Documents Grid */}
            <div className="upload-req-documents-grid">
              {loading ? (
                <div className="upload-req-loading">
                  <div className="upload-req-loading-spinner"></div>
                  <p>Loading documents...</p>
                </div>
              ) : uploadedFiles.length > 0 ? (
                uploadedFiles.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="upload-req-document-card"
                    onClick={() => handleDocumentClick(doc)}
                  >
                    <div className="upload-req-document-preview-container">
                      <div className="upload-req-document-preview">
                        {renderCardPreview(doc)}
                      </div>
                      <div className="upload-req-document-preview-overlay">
                        <div className="upload-req-document-icon">
                          <FileText size={20} color="#dc2626" />
                        </div>
                      </div>
                    </div>
                    <div className="upload-req-document-info">
                      <h4 className="upload-req-document-name">{doc.name}</h4>
                      <p className="upload-req-document-type">{doc.type}</p>
                      <p className="upload-req-document-date">
                        Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="upload-req-document-actions">
                      <button 
                        className="upload-req-download-button"
                        onClick={(e) => handleDownload(doc, e)}
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        className="upload-req-delete-button"
                        onClick={(e) => handleDeleteFile(doc, e)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="upload-req-no-documents">
                  <FileText size={48} color="#6b7280" />
                  <h3>No Documents Found</h3>
                  <p>You have no documents uploaded yet.</p>
                  <button 
                    className="upload-req-add-button"
                    onClick={() => setShowUploadModal(true)}
                  >
                    <Plus size={16} />
                    Upload First Document
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Requirements List */}
          <div className="upload-req-requirements-panel">
            <h3 className="upload-req-requirements-title">List of Requirements</h3>
            
            <div className="upload-req-requirements-list">
              {loadingRequirements ? (
                <div className="upload-req-loading">
                  <div className="upload-req-loading-spinner"></div>
                  <p>Loading requirements...</p>
                </div>
              ) : requirements.length > 0 ? (
                requirements.map((requirement, index) => (
                  <div key={index} className="upload-req-requirement-item">
                    <span className="upload-req-requirement-name">{requirement}</span>
                    <span 
                      className="upload-req-requirement-status"
                      style={{ backgroundColor: getRequirementStatusColor(requirement) }}
                    >
                      {getRequirementStatus(requirement)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="upload-req-no-requirements">
                  <p>No requirements have been set by HR yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="upload-req-modal-overlay">
          <div className="upload-req-upload-card">
            <div className="upload-req-card-header">
              <div className="upload-req-modal-header">
                <h2 className="upload-req-card-title">Upload Document</h2>
                <button 
                  className="upload-req-close-button"
                  onClick={() => setShowUploadModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <p className="upload-req-card-subtitle">Select a requirement type and upload your file</p>
              
              {/* Message Display */}
              {message.text && (
                <div className={`upload-req-message ${message.type}`}>
                  {message.text}
                </div>
              )}
              
              <div className="upload-req-dropdown-container">
                <select 
                  className="upload-req-dropdown"
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

            <div className="upload-req-card-body">
              <div 
                className={`upload-req-upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''} ${stagedFile ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
              >
                {isUploading ? (
                  <div className="upload-req-upload-progress">
                    <div className="upload-req-progress-bar">
                      <div 
                        className="upload-req-progress-fill" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p>Uploading... {Math.round(uploadProgress)}%</p>
                  </div>
                ) : stagedFile ? (
                  <div className="upload-req-staged-file">
                    <div className="upload-req-file-icon">
                      <FileText size={48} />
                    </div>
                    <div className="upload-req-staged-info">
                      <h4>{stagedFile.name}</h4>
                      <p>Type: {stagedFile.requirement}</p>
                      <p>Size: {formatFileSize(stagedFile.size)}</p>
                    </div>
                    <button 
                      className="upload-req-clear-file"
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
                    <div className="upload-req-upload-icon">
                      <Upload size={48} />
                    </div>
                    <h3 className="upload-req-upload-title">BROWSE YOUR FILES OR DRAG A FILE HERE</h3>
                    <p className="upload-req-upload-note">Take note: Only .pdf file can be uploaded (Max 10MB)</p>
                  </>
                )}
              </div>
            </div>

            <div className="upload-req-upload-button-container">
              <button 
                className={`upload-req-upload-button ${!stagedFile || isUploading ? 'disabled' : ''}`}
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
        <div className="upload-req-modal-overlay">
          <div className="upload-req-preview-modal">
            <div className="upload-req-preview-header">
              <div className="upload-req-preview-info">
                <h3>{selectedDocument.name}</h3>
                <p>{selectedDocument.type}</p>
              </div>
              <div className="upload-req-preview-actions">
                <button 
                  className="upload-req-preview-download"
                  onClick={(e) => handleDownload(selectedDocument, e)}
                >
                  <Download size={16} />
                  Download
                </button>
                <button 
                  className="upload-req-close-button"
                  onClick={() => setShowPreviewModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="upload-req-preview-content">
              {renderDocumentPreview(selectedDocument)}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="upload-req-modal-overlay">
          <div className="upload-req-modal">
            <h3>Are you sure you want to delete this file?</h3>
            <p>{fileToDelete ? `"${fileToDelete.name}" will be permanently deleted.` : 'This action cannot be undone.'}</p>
            <div className="upload-req-modal-buttons">
              <button 
                className="upload-req-modal-btn upload-req-modal-btn-no"
                onClick={() => {
                  setShowDeleteModal(false);
                  setFileToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="upload-req-modal-btn upload-req-modal-btn-yes"
                onClick={confirmDeleteFile}
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

export default UploadRequirements;