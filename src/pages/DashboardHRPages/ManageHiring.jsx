import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../components/HRLayout/ManageHiring.css';

const ManageHiring = () => {
  const [hiringPositions, setHiringPositions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    requirements: [''],
    duties: [''],
    image: null
  });

  const API_URL = 'http://localhost/difsysapi/manage_hiring.php';

  useEffect(() => {
    fetchHiringPositions();
  }, []);

  useEffect(() => {
    document.title = "DIFSYS | MANAGE HIRING";
  }, []);



  // Fetch all hiring positions
  const fetchHiringPositions = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(API_URL);
      if (response.data.success) {
        setHiringPositions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching hiring positions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle image file change
  const handleImageChange = (e) => {
    setFormData(prev => ({
      ...prev,
      image: e.target.files[0]
    }));
  };

  // Handle requirements array changes
  const handleRequirementsChange = (index, value) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData(prev => ({
      ...prev,
      requirements: newRequirements
    }));
  };

  // Handle duties array changes
  const handleDutiesChange = (index, value) => {
    const newDuties = [...formData.duties];
    newDuties[index] = value;
    setFormData(prev => ({
      ...prev,
      duties: newDuties
    }));
  };

  // Add new requirement field
  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  // Remove requirement field
  const removeRequirement = (index) => {
    const newRequirements = formData.requirements.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      requirements: newRequirements
    }));
  };

  // Add new duty field
  const addDuty = () => {
    setFormData(prev => ({
      ...prev,
      duties: [...prev.duties, '']
    }));
  };

  // Remove duty field
  const removeDuty = (index) => {
    const newDuties = formData.duties.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      duties: newDuties
    }));
  };

  // Open modal for creating new position
  const openCreateModal = () => {
    setEditingPosition(null);
    setFormData({
      title: '',
      short_description: '',
      requirements: [''],
      duties: [''],
      image: null
    });
    setShowModal(true);
  };

  // Open modal for editing position
  const openEditModal = (position) => {
    setEditingPosition(position);
    setFormData({
      title: position.title,
      short_description: position.short_description,
      requirements: position.requirements || [''],
      duties: position.duties || [''],
      image: null,
      current_image: position.image_path
    });
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingPosition(null);
    setFormData({
      title: '',
      short_description: '',
      requirements: [''],
      duties: [''],
      image: null
    });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title || !formData.short_description) {
      alert('Please fill in all required fields');
      return;
    }

    // Filter out empty requirements and duties
    const filteredRequirements = formData.requirements.filter(req => req.trim() !== '');
    const filteredDuties = formData.duties.filter(duty => duty.trim() !== '');

    try {
      setIsLoading(true);
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('short_description', formData.short_description);
      submitData.append('requirements', JSON.stringify(filteredRequirements));
      submitData.append('duties', JSON.stringify(filteredDuties));
      
      if (formData.image) {
        submitData.append('image', formData.image);
      }
      if (formData.current_image) {
        submitData.append('current_image', formData.current_image);
      }

      let response;
      if (editingPosition) {
        // Update existing position
        submitData.append('_method', 'PUT');
        response = await axios.post(`${API_URL}?id=${editingPosition.id}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Create new position
        response = await axios.post(API_URL, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (response.data.success) {
        alert(response.data.message);
        closeModal();
        fetchHiringPositions();
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete position
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this position?')) {
      try {
        setIsLoading(true);
        const response = await axios.delete(`${API_URL}?id=${id}`);
        if (response.data.success) {
          alert(response.data.message);
          fetchHiringPositions();
        } else {
          alert(response.data.message);
        }
      } catch (error) {
        console.error('Error deleting position:', error);
        alert('Error deleting position');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="managehiring-container">
      <div className="managehiring-header">
        <h1 className="managehiring-title">Manage Hiring Positions</h1>
        <button className="managehiring-create-btn" onClick={openCreateModal}>
          Create New Position
        </button>
      </div>

      {isLoading && (
        <div className="managehiring-loading">Loading...</div>
      )}

      <div className="managehiring-grid">
        {hiringPositions.map((position) => (
          <div key={position.id} className="managehiring-card">
            <div className="managehiring-card-image">
              <img 
                src={position.image_path ? `http://localhost/difsysapi/${position.image_path}` : '/placeholder-image.jpg'} 
                alt={position.title}
                onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
              />
            </div>
            <div className="managehiring-card-body">
              <h3 className="managehiring-card-title">{position.title}</h3>
              <p className="managehiring-card-text">{position.short_description}</p>
              <div className="managehiring-card-actions">
                <button 
                  className="managehiring-edit-btn"
                  onClick={() => openEditModal(position)}
                >
                  Edit
                </button>
                <button 
                  className="managehiring-delete-btn"
                  onClick={() => handleDelete(position.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="managehiring-modal-overlay" onClick={closeModal}>
          <div className="managehiring-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="managehiring-modal-close" onClick={closeModal}>
              ×
            </button>
            
            <div className="managehiring-modal-header">
              <h2 className="managehiring-modal-title">
                {editingPosition ? 'Edit Position' : 'Create New Position'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="managehiring-form">
              <div className="managehiring-form-group">
                <label className="managehiring-label">Position Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="managehiring-input"
                  required
                />
              </div>

              <div className="managehiring-form-group">
                <label className="managehiring-label">Short Description *</label>
                <textarea
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleInputChange}
                  className="managehiring-textarea"
                  rows="3"
                  required
                />
              </div>

              <div className="managehiring-form-group">
                <label className="managehiring-label">Position Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="managehiring-file-input"
                />
                {editingPosition && formData.current_image && (
                  <div className="managehiring-current-image">
                    <small>Current image: {formData.current_image.split('/').pop()}</small>
                  </div>
                )}
              </div>

              <div className="managehiring-form-group">
                <label className="managehiring-label">Requirements</label>
                {formData.requirements.map((requirement, index) => (
                  <div key={index} className="managehiring-list-item">
                    <input
                      type="text"
                      value={requirement}
                      onChange={(e) => handleRequirementsChange(index, e.target.value)}
                      className="managehiring-list-input"
                      placeholder="Enter requirement"
                    />
                    {formData.requirements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="managehiring-remove-btn"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addRequirement}
                  className="managehiring-add-btn"
                >
                  Add Requirement
                </button>
              </div>

              <div className="managehiring-form-group">
                <label className="managehiring-label">Duties and Responsibilities</label>
                {formData.duties.map((duty, index) => (
                  <div key={index} className="managehiring-list-item">
                    <input
                      type="text"
                      value={duty}
                      onChange={(e) => handleDutiesChange(index, e.target.value)}
                      className="managehiring-list-input"
                      placeholder="Enter duty"
                    />
                    {formData.duties.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDuty(index)}
                        className="managehiring-remove-btn"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDuty}
                  className="managehiring-add-btn"
                >
                  Add Duty
                </button>
              </div>

              <div className="managehiring-form-actions">
                <button
                  type="button"
                  onClick={closeModal}
                  className="managehiring-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="managehiring-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : (editingPosition ? 'Update Position' : 'Create Position')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageHiring;