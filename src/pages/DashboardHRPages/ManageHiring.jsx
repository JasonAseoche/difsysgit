import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import '../../components/HRLayout/ManageHiring.css';
const ManageHiring = () => {
  const [hiringPositions, setHiringPositions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    tags: '',
    location: 'Cabuyao City',
    requirements: [''],
    duties: ['']
  });

  const API_URL = 'http://localhost/difsysapi/manage_hiring.php';
  const COMPANY_NAME = "DIFSYS, INC";

  useEffect(() => {
    fetchHiringPositions();
  }, []);

  useEffect(() => {
    document.title = "DIFSYS | MANAGE HIRING";
  }, []);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRequirementsChange = (index, value) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData(prev => ({
      ...prev,
      requirements: newRequirements
    }));
  };

  const handleDutiesChange = (index, value) => {
    const newDuties = [...formData.duties];
    newDuties[index] = value;
    setFormData(prev => ({
      ...prev,
      duties: newDuties
    }));
  };

  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const removeRequirement = (index) => {
    const newRequirements = formData.requirements.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      requirements: newRequirements
    }));
  };

  const addDuty = () => {
    setFormData(prev => ({
      ...prev,
      duties: [...prev.duties, '']
    }));
  };

  const removeDuty = (index) => {
    const newDuties = formData.duties.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      duties: newDuties
    }));
  };

  const openCreateModal = () => {
    setEditingPosition(null);
    setFormData({
      title: '',
      short_description: '',
      tags: '',
      location: 'Cabuyao City',
      requirements: [''],
      duties: ['']
    });
    setShowModal(true);
  };

  const openEditModal = (position) => {
    setEditingPosition(position);
    setFormData({
      title: position.title,
      short_description: position.short_description,
      tags: position.tags || '',
      location: position.location || 'Cabuyao City',
      requirements: position.requirements || [''],
      duties: position.duties || ['']
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPosition(null);
    setFormData({
      title: '',
      short_description: '',
      tags: '',
      location: 'Cabuyao City',
      requirements: [''],
      duties: ['']
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.short_description) {
      alert('Please fill in all required fields');
      return;
    }

    const filteredRequirements = formData.requirements.filter(req => req.trim() !== '');
    const filteredDuties = formData.duties.filter(duty => duty.trim() !== '');

    try {
      setIsLoading(true);
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('short_description', formData.short_description);
      submitData.append('tags', formData.tags);
      submitData.append('location', formData.location);
      submitData.append('requirements', JSON.stringify(filteredRequirements));
      submitData.append('duties', JSON.stringify(filteredDuties));

      let response;
      if (editingPosition) {
        submitData.append('_method', 'PUT');
        response = await axios.post(`${API_URL}?id=${editingPosition.id}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
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

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const parseTags = (tagsString) => {
    if (!tagsString) return [];
    return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
  };

  return (
    <div className="managehiring-container">
      <div className="managehiring-header">
        <h1 className="managehiring-title">Manage Hiring Positions</h1>
        <button className="managehiring-create-btn" onClick={openCreateModal}>
          Create New Position
        </button>
      </div>

      <div className="managehiring-content-wrapper">
        {isLoading && (
          <div className="managehiring-loading">
            <div className="managehiring-loading-spinner"></div>
            <span>Loading...</span>
          </div>
        )}

        <div className="managehiring-grid">
          {hiringPositions.map((position, index) => {
            const tags = parseTags(position.tags);
            
            return (
              <div key={position.id} className="managehiring-card">
                <div className="managehiring-inner-card" data-index={index % 6}>
                  <div className="managehiring-card-header">
                    <span className="managehiring-card-date">
                      {formatDate(position.created_at)}
                    </span>
                  </div>

                  <div>
                    <div className="managehiring-card-company">{COMPANY_NAME}</div>
                    <h3 className="managehiring-card-title">{position.title}</h3>
                    
                    <div className="managehiring-card-tags">
                      {tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="managehiring-card-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="managehiring-card-footer">
                  <span className="managehiring-card-footer-location">
                    {position.location || 'Cabuyao City'}
                  </span>
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
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="managehiring-modal-overlay" onClick={closeModal}>
          <div className="managehiring-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="managehiring-modal-close" onClick={closeModal} aria-label="Close modal">
              <X />
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
                <label className="managehiring-label">Tags (separate with commas) *</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="managehiring-input"
                  placeholder="e.g. Full time, Mid level, Remote"
                  required
                />
                <small className="managehiring-hint">Separate multiple tags with commas</small>
              </div>

              <div className="managehiring-form-group">
                <label className="managehiring-label">Location *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="managehiring-input"
                  required
                />
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