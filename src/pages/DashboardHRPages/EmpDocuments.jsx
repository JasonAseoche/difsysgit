import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, Plus, Trash2, Image, FileSpreadsheet, Edit3, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import '../../components/HRLayout/EmployeeDetails.css';

const EmpDocuments = ({ empId }) => {
  const [showEditActions, setShowEditActions] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [documentsData, setDocumentsData] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [documentPreviews, setDocumentPreviews] = useState({});
  const fileInputRef = useRef(null);

  const API_BASE_URL = 'http://localhost/difsysapi';

  // Load PDF.js dynamically
  useEffect(() => {
    const loadPDFJS = async () => {
      if (!window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        };
        document.head.appendChild(script);
      }
    };
    loadPDFJS();
  }, []);

  useEffect(() => {
    document.title = "DIFSYS | EMPLOYEE DOCUMENTS";
  }, []);

  // Get user ID from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('user_id');
    if (userIdFromUrl) {
      setUserId(userIdFromUrl);
    } else if (empId) {
      setUserId(empId);
    }
  }, [empId]);

  // Load documents on component mount
  useEffect(() => {
    if (userId) {
      fetchDocuments();
    }
  }, [userId]);

  const fetchDocuments = async () => {
    if (!userId) {
      console.error('No employee ID provided');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching documents for user ID:', userId);
      
      const response = await axios.get(`${API_BASE_URL}/empdocsatt.php`, {
        params: { emp_id: userId }
      });
      
      console.log('API Response:', response.data);
      
      if (response.data.documents && response.data.documents.length > 0) {
        const documents = response.data.documents.map(doc => ({
          ...doc,
          isUploaded: true // Mark as uploaded from backend
        }));
        setDocumentsData(documents);
        
        // Generate previews for uploaded documents
        generatePreviewsForDocuments(documents);
      } else {
        setDocumentsData([]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      console.error('Fetch error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setDocumentsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine file type from extension
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

  // Generate previews for documents fetched from backend
  const generatePreviewsForDocuments = async (documents) => {
    const previews = {};
    
    for (const doc of documents) {
      // Use the original fileType from API or determine from extension
      const fileType = doc.fileType || getFileTypeFromExtension(doc.name);
      
      console.log('Generating preview for:', doc.name, 'FileType:', fileType);
      
      if (fileType === 'pdf' || fileType === 'image') {
        try {
          // Fetch document content for preview generation
          const response = await axios.get(`${API_BASE_URL}/empdocsatt.php`, {
            params: { 
              document_id: doc.id,
              preview: true 
            }
          });

          console.log('Preview API response for', doc.name, ':', response.data);

          if (fileType === 'image' && response.data.content) {
            // For images, create data URL from base64
            const mimeType = response.data.mime_type || 'image/jpeg';
            const imageUrl = `data:${mimeType};base64,${response.data.content}`;
            previews[doc.id] = imageUrl;
            console.log('Generated image preview for:', doc.name);
          } else if (fileType === 'pdf' && response.data.content) {
            // Convert base64 to blob and generate PDF preview
            try {
              const binaryString = atob(response.data.content);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: 'application/pdf' });
              const pdfPreview = await generatePDFPreview(blob);
              if (pdfPreview) {
                previews[doc.id] = pdfPreview;
                console.log('Generated PDF preview for:', doc.name);
              }
            } catch (pdfError) {
              console.error('Error generating PDF preview for', doc.name, ':', pdfError);
            }
          }
        } catch (error) {
          console.error('Error generating preview for document:', doc.id, error);
        }
      }
    }
    
    console.log('All generated previews:', Object.keys(previews));
    // Update all previews at once to avoid multiple re-renders
    setDocumentPreviews(previews);
  };

  // Generate PDF preview using PDF.js
  const generatePDFPreview = async (file) => {
    try {
      if (!window.pdfjsLib) {
        console.log('PDF.js not loaded yet');
        return null;
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      const viewport = page.getViewport({ scale: 1 });
      canvas.width = 280;
      canvas.height = 180;
      
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
      
      return canvas.toDataURL();
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      return null;
    }
  };

  const getDocumentIcon = (fileType) => {
    switch (fileType) {
      case 'pdf':
        return <FileText size={40} color="#dc2626" />;
      case 'image':
        return <Image size={40} color="#7c3aed" />;
      case 'excel':
        return <FileSpreadsheet size={40} color="#16a34a" />;
      default:
        return <FileText size={40} color="#6b7280" />;
    }
  };

  const handleEditClick = () => {
    setShowEditActions(!showEditActions);
    setSelectedDocuments([]);
  };

  const handleAddDocumentClick = () => {
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setDragOver(false);
  };

  const handleDocumentClick = async (doc) => {
    try {
      setLoading(true);
      
      if (doc.isUploaded) {
        // For backend documents, fetch full content
        const response = await axios.get(`${API_BASE_URL}/empdocsatt.php`, {
          params: { 
            document_id: doc.id,
            preview: true 
          }
        });

        if (response.data) {
          setSelectedDocument({
            ...doc,
            previewData: response.data,
            fileType: doc.fileType || getFileTypeFromExtension(doc.name) // Keep original fileType
          });
        } else {
          setSelectedDocument({
            ...doc,
            fileType: doc.fileType || getFileTypeFromExtension(doc.name)
          });
        }
      } else {
        // For newly uploaded documents
        setSelectedDocument({
          ...doc,
          fileType: doc.fileType || getFileTypeFromExtension(doc.name)
        });
      }
      
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Error fetching document preview:', error);
      setSelectedDocument({
        ...doc,
        fileType: doc.fileType || getFileTypeFromExtension(doc.name)
      });
      setShowPreviewModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc, event) => {
    event.stopPropagation();
    
    try {
      if (doc.isUploaded) {
        // Download from backend with proper headers
        const response = await axios.get(`${API_BASE_URL}/empdocsatt.php`, {
          params: { 
            document_id: doc.id,
            download: true // Add download flag to ensure proper response
          },
          responseType: 'blob'
        });

        // Determine proper MIME type based on file extension
        const fileType = getFileTypeFromExtension(doc.name);
        let mimeType = 'application/octet-stream'; // Default
        
        switch (fileType) {
          case 'pdf':
            mimeType = 'application/pdf';
            break;
          case 'image':
            const extension = doc.name.split('.').pop().toLowerCase();
            if (extension === 'jpg' || extension === 'jpeg') {
              mimeType = 'image/jpeg';
            } else if (extension === 'png') {
              mimeType = 'image/png';
            } else if (extension === 'gif') {
              mimeType = 'image/gif';
            } else {
              mimeType = `image/${extension}`;
            }
            break;
          case 'excel':
            const ext = doc.name.split('.').pop().toLowerCase();
            if (ext === 'xlsx') {
              mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            } else if (ext === 'xls') {
              mimeType = 'application/vnd.ms-excel';
            } else if (ext === 'csv') {
              mimeType = 'text/csv';
            }
            break;
        }

        const blob = new Blob([response.data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (doc.file) {
        // Download newly uploaded file
        const url = URL.createObjectURL(doc.file);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error downloading document');
    }
  };

  const handleClosePreviewModal = () => {
    setShowPreviewModal(false);
    setSelectedDocument(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files);
  };

  const handleFileUpload = async (files) => {
    setUploadLoading(true);
    setUploadError(null);
    setUploadSuccess(false);
    
    try {
      for (const file of files) {
        console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        // Upload to backend directly
        const formData = new FormData();
        formData.append('file', file);
        formData.append('emp_id', userId);
        formData.append('file_type', getFileTypeFromName(file.name));

        console.log('FormData contents:', {
          file: file.name,
          emp_id: userId,
          file_type: getFileTypeFromName(file.name)
        });

        const response = await axios.post(`${API_BASE_URL}/empdocsatt.php`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log('Upload response:', response.data);
      }
      
      // Show success message
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      
      // Refresh documents list from backend to get all documents including newly uploaded ones
      await fetchDocuments();
      
      setShowUploadModal(false);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      let errorMessage = 'Failed to upload files. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 413) {
        errorMessage = 'File size too large. Maximum size is 10MB.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please check file format and try again.';
      }
      
      setUploadError(errorMessage);
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setUploadLoading(false);
    }
  };

  const getFileType = (mimeType) => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'excel';
    return 'other';
  };

  const getFileTypeFromName = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf': return 'PDF Document';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'Image Document';
      case 'xls':
      case 'xlsx': return 'Excel Document';
      default: return 'Other Document';
    }
  };

  const handleDocumentSelect = (docId, isSelected) => {
    if (isSelected) {
      setSelectedDocuments([...selectedDocuments, docId]);
    } else {
      setSelectedDocuments(selectedDocuments.filter(id => id !== docId));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDocuments.length === 0) {
      alert('Please select documents to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedDocuments.length} document(s)?`)) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/empdocsatt.php`, {
        data: { document_ids: selectedDocuments }
      });
      
      await fetchDocuments();
      setSelectedDocuments([]);
      
    } catch (error) {
      console.error('Error deleting documents:', error);
      alert('Error deleting documents');
    } finally {
      setLoading(false);
    }
  };

  const renderDocumentPreview = (doc) => {
    // Use original fileType from API or determine from extension  
    const fileType = doc.fileType || getFileTypeFromExtension(doc.name);
    
    console.log('Rendering preview for:', doc.name, 'FileType:', fileType, 'PreviewData:', !!doc.previewData);
    
    if (fileType === 'image') {
      let imageSrc;
      if (doc.previewData && doc.previewData.content) {
        const mimeType = doc.previewData.mime_type || 'image/jpeg';
        imageSrc = `data:${mimeType};base64,${doc.previewData.content}`;
        console.log('Using preview data for image:', doc.name);
      } else if (doc.file) {
        imageSrc = URL.createObjectURL(doc.file);
        console.log('Using file object for image:', doc.name);
      } else if (doc.previewDataUrl) {
        imageSrc = doc.previewDataUrl;
        console.log('Using preview data URL for image:', doc.name);
      } else {
        // Try to get from documentPreviews
        imageSrc = documentPreviews[doc.id];
        console.log('Using cached preview for image:', doc.name, !!imageSrc);
      }
      
      return imageSrc ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <img 
            src={imageSrc}
            alt={doc.name}
            className="empdet-preview-image"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            onError={(e) => {
              console.error('Image failed to load:', e.target.src);
              e.target.style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="empdet-preview-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <Image size={80} color="#7c3aed" />
          <p>Image Preview</p>
          <p style={{ fontSize: '12px', color: '#666' }}>Unable to load image</p>
        </div>
      );
    } else if (fileType === 'pdf') {
      // For PDF preview, show iframe if browser supports it, otherwise show download message
      if (doc.previewData && doc.previewData.content) {
        const pdfDataUri = `data:application/pdf;base64,${doc.previewData.content}`;
        console.log('Rendering PDF iframe for:', doc.name);
        return (
          <div style={{ width: '100%', height: '500px' }}>
            <iframe
              src={pdfDataUri}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title={`PDF Preview: ${doc.name}`}
              onError={() => console.error('PDF iframe failed to load')}
            />
          </div>
        );
      }
      
      console.log('No PDF content available for:', doc.name);
      return (
        <div className="empdet-preview-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <FileText size={80} color="#dc2626" />
          <p>PDF Preview</p>
          <p className="empdet-preview-note">Click download to view full document</p>
        </div>
      );
    } else {
      return (
        <div className="empdet-preview-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          {getDocumentIcon(fileType)}
          <p>{doc.type}</p>
          <p className="empdet-preview-note">Preview not available</p>
        </div>
      );
    }
  };

  const renderCardPreview = (doc) => {
    // Use original fileType from API or determine from extension
    const fileType = doc.fileType || getFileTypeFromExtension(doc.name);
    
    // For images
    if (fileType === 'image') {
      const previewUrl = documentPreviews[doc.id];
      if (previewUrl) {
        return (
          <img 
            src={previewUrl}
            alt={doc.name}
            className="empdet-card-preview-image"
            style={{ width: '100%', height: '150px', objectFit: 'cover' }}
          />
        );
      }
    }
    
    // For PDFs
    if (fileType === 'pdf') {
      const previewUrl = documentPreviews[doc.id];
      if (previewUrl) {
        return (
          <img 
            src={previewUrl}
            alt={`${doc.name} preview`}
            className="empdet-card-preview-pdf-image"
            style={{ width: '100%', height: '150px', objectFit: 'cover' }}
          />
        );
      }
    }
    
    // Default icon fallback
    return (
      <div className="empdet-card-preview-placeholder">
        {getDocumentIcon(fileType)}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Debug info */}
      {!userId && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          <strong>Error:</strong> No employee ID found in URL or props. Expected ?user_id=XXX in URL.
        </div>
      )}
      
      {/* Content Header */}
      <div className="empdet-content-header">
        <h2 className="empdet-section-title">Documents</h2>
        <button className="empdet-edit-btn" onClick={handleEditClick}>
          <Edit3 size={16} />
          {showEditActions ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="empdet-documents-container">
        {showEditActions && (
          <div className="empdet-edit-actions">
            <button className="empdet-add-btn" onClick={handleAddDocumentClick}>
              <Plus size={16} />
              Add Document
            </button>
            <button 
              className="empdet-delete-btn"
              onClick={handleDeleteSelected}
              disabled={selectedDocuments.length === 0}
            >
              <Trash2 size={16} />
              Delete Selected ({selectedDocuments.length})
            </button>
          </div>
        )}
        
        {loading && (
          <div className="empdet-loading">
            <div className="empdet-docs-spinner"></div>
            <p>Loading documents...</p>
          </div>
        )}

        {uploadLoading && (
          <div className="empdet-docs-upload-overlay">
            <div className="empdet-docs-upload-modal">
              <div className="empdet-docs-upload-spinner"></div>
              <h3>Uploading Files...</h3>
              <p>Please wait while we upload your documents</p>
            </div>
          </div>
        )}

        {uploadSuccess && (
          <div className="empdet-docs-message-overlay">
            <div className="empdet-docs-success-modal">
              <div className="empdet-docs-success-icon">
                <CheckCircle size={48} />
              </div>
              <h3>Upload Successful!</h3>
              <p>Your documents have been uploaded successfully</p>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="empdet-docs-message-overlay">
            <div className="empdet-docs-error-modal">
              <div className="empdet-docs-error-icon">
                <AlertCircle size={48} />
              </div>
              <h3>Upload Failed</h3>
              <p>{uploadError}</p>
              <button 
                className="empdet-docs-error-close"
                onClick={() => setUploadError(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        <div className="empdet-documents-grid">
          {documentsData.length > 0 ? documentsData.map((doc) => (
            <div 
              key={doc.id} 
              className="empdet-document-card"
              onClick={() => handleDocumentClick(doc)}
              style={{ cursor: 'pointer' }}
            >
              <div className="empdet-document-preview-container">
                <div className="empdet-document-preview">
                  {renderCardPreview(doc)}
                </div>
                <div className="empdet-document-preview-overlay">
                  <div className="empdet-document-icon">
                    {getDocumentIcon(doc.fileType || getFileTypeFromExtension(doc.name))}
                  </div>
                </div>
              </div>
              <div className="empdet-document-info">
                <h4 className="empdet-document-name">{doc.name}</h4>
                <p className="empdet-document-type">{doc.type}</p>
                <p className="empdet-document-date">
                  Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                </p>
              </div>
              <div className="empdet-document-actions">
                <button 
                  className="empdet-download-btn"
                  onClick={(e) => handleDownload(doc, e)}
                  title="Download Document"
                >
                  <Download size={16} />
                </button>
                {showEditActions && (
                  <input 
                    type="checkbox" 
                    className="empdet-document-checkbox"
                    checked={selectedDocuments.includes(doc.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleDocumentSelect(doc.id, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            </div>
          )) : (
            <div className="empdet-no-documents">
              <div className="empdet-no-documents-content">
                <FileText size={48} color="#6b7280" />
                <h3>No Documents Found</h3>
                <p>This employee has no documents uploaded yet.</p>
                {showEditActions && (
                  <button className="empdet-add-btn" onClick={handleAddDocumentClick}>
                    <Plus size={16} />
                    Upload First Document
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="empdet-upload-modal-overlay">
          <div className="empdet-upload-modal">
            <div className="empdet-upload-modal-header">
              <h3 className="empdet-upload-modal-title">Upload A File</h3>
              <button 
                className="empdet-upload-modal-close"
                onClick={handleCloseUploadModal}
              >
                <X size={20} />
              </button>
            </div>
            <div className="empdet-upload-modal-content">
              <div 
                className={`empdet-upload-dropzone ${dragOver ? 'empdet-upload-dropzone-active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={48} className="empdet-upload-icon" />
                <h4 className="empdet-upload-title">Drag and drop files here</h4>
                <p className="empdet-upload-subtitle">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="empdet-upload-input"
                  onChange={handleFileInputChange}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
                  style={{ display: 'none' }}
                />
              </div>
              <div className="empdet-upload-info">
                <p className="empdet-upload-note">Supported formats: PDF, JPG, PNG, Excel</p>
                <p className="empdet-upload-note">Maximum file size: 10MB</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedDocument && (
        <div className="empdet-preview-modal-overlay">
          <div className="empdet-preview-modal">
            <div className="empdet-preview-modal-header">
              <div className="empdet-preview-modal-info">
                <h3 className="empdet-preview-modal-title">{selectedDocument.name}</h3>
                <p className="empdet-preview-modal-subtitle">{selectedDocument.type}</p>
              </div>
              <div className="empdet-preview-modal-actions">
                <button 
                  className="empdet-preview-download-btn"
                  onClick={(e) => handleDownload(selectedDocument, e)}
                >
                  <Download size={16} />
                  Download
                </button>
                <button 
                  className="empdet-preview-modal-close"
                  onClick={handleClosePreviewModal}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="empdet-preview-modal-content">
              {renderDocumentPreview(selectedDocument)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmpDocuments;