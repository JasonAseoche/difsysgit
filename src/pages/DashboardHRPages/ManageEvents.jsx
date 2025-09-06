import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SlPencil, SlTrash } from "react-icons/sl";
import axios from 'axios';
import '../../components/HRLayout/ManageEvents.css'

const ManageEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    per_page: 10
  });

  const [alert, setAlert] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    status: 'active',
    created_by: 'HR_Admin'
  });

  const API_BASE_URL = 'http://localhost/difsysapi/manage_events.php';

  // Custom Alert Component
  const CustomAlert = ({ isOpen, onClose, title, message, type = 'info', onConfirm }) => {
    if (!isOpen) return null;

    return createPortal(
      <div className="hr-custom-alert-overlay">
        <div className="hr-custom-alert">
          <div className="hr-custom-alert-header">
            <h3 className="hr-custom-alert-title">{title}</h3>
          </div>
          <div className="hr-custom-alert-content">
            <p className="hr-custom-alert-message">{message}</p>
          </div>
          <div className="hr-custom-alert-actions">
            {type === 'confirm' ? (
              <>
                <button className="hr-custom-alert-btn hr-custom-alert-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button className="hr-custom-alert-btn hr-custom-alert-btn-danger" onClick={onConfirm}>
                  Confirm
                </button>
              </>
            ) : (
              <button className="hr-custom-alert-btn hr-custom-alert-btn-primary" onClick={onClose}>
                OK
              </button>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Fetch events
  const fetchEvents = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}?page=${page}&limit=${pagination.per_page}`);
      
      if (response.data.events) {
        setEvents(response.data.events);
        setPagination(response.data.pagination);
      } else {
        setEvents([]);
      }
    } catch (err) {
      setError('Failed to fetch events. Please try again.');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: '',
      start_time: '',
      end_time: '',
      location: '',
      status: 'active',
      created_by: 'HR_Admin'
    });
    setEditingEvent(null);
  };

  const handleAddNew = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (event) => {
    setFormData({
      title: event.title || '',
      description: event.description || '',
      event_date: event.event_date || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location: event.location || '',
      status: event.status || 'active',
      created_by: event.created_by || 'HR_Admin'
    });
    setEditingEvent(event);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      
      if (!formData.title || !formData.event_date || !formData.start_time || 
          !formData.end_time || !formData.location) {
        setAlert({
          isOpen: true,
          title: 'Validation Error',
          message: 'Please fill in all required fields.',
          type: 'info'
        });
        return;
      }
  
      if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
        setAlert({
          isOpen: true,
          title: 'Validation Error', 
          message: 'End time must be after start time.',
          type: 'info'
        });
        return;
      }
  
      let response;
      if (editingEvent) {
        response = await axios.put(`${API_BASE_URL}?id=${editingEvent.id}`, formData);
      } else {
        response = await axios.post(API_BASE_URL, formData);
      }
  
      if (response.data) {
        setShowModal(false);
        resetForm();
        fetchEvents(pagination.current_page);
      }
    } catch (err) {
      setAlert({
        isOpen: true,
        title: 'Error',
        message: err.response?.data?.error || 'Failed to save event. Please try again.',
        type: 'info'
      });
      console.error('Error saving event:', err);
    }
  };

  const handleDelete = (eventId) => {
    console.log('Delete clicked, setting alert state'); // Add this line
    setAlert({
      isOpen: true,
      title: 'Delete Event',
      message: 'Are you sure you want to delete this event? This action cannot be undone.',
      type: 'confirm',
      onConfirm: () => confirmDelete(eventId)
    });
  };

  const confirmDelete = async (eventId) => {
    try {
      setError(null);
      await axios.delete(`${API_BASE_URL}?id=${eventId}`);
      fetchEvents(pagination.current_page);
      setAlert(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete event. Please try again.');
      console.error('Error deleting event:', err);
      setAlert(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchEvents(newPage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <>
      <div className="hr-events-container">
        <div className="hr-events-header">
          <h1 className="hr-events-title">EVENT MANAGEMENT</h1>
          <button className="hr-events-add-btn" onClick={handleAddNew}>
            <span>+</span>
            Add New Event
          </button>
        </div>

        {error && (
          <div className="hr-events-error">
            {error}
          </div>
        )}

        <div className="hr-events-card">
          {loading ? (
            <div className="hr-events-loading">
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <div className="hr-events-empty-state">
              <div className="hr-events-empty-icon">📅</div>
              <div className="hr-events-empty-title">No Events Found</div>
              <div className="hr-events-empty-description">
                Get started by creating your first event
              </div>
            </div>
          ) : (
            <>
              <table className="hr-events-table">
                <thead>
                  <tr>
                    <th>Event Title</th>
                    <th>Date & Time</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <div>
                          <div className="hr-events-event-title">
                            {event.title}
                          </div>
                          {event.description && (
                            <div className="hr-events-event-description">
                              {event.description.substring(0, 50)}
                              {event.description.length > 50 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="hr-events-date-time">
                          <div className="hr-events-date">{formatDate(event.event_date)}</div>
                          <div className="hr-events-time">
                            {formatTime(event.start_time)} - {formatTime(event.end_time)}
                          </div>
                        </div>
                      </td>
                      <td>{event.location}</td>
                      <td>
                        <span className={`hr-events-status ${event.status}`}>
                          {event.status}
                        </span>
                      </td>
                      <td>
                        <div className="hr-events-actions">
                          <button
                            className="hr-events-action-btn edit"
                            onClick={() => handleEdit(event)}
                            title="Edit Event"
                          >
                           <SlPencil />
                          </button>
                          <button
                            className="hr-events-action-btn delete"
                            onClick={() => handleDelete(event.id)}
                            title="Delete Event"
                          >
                            <SlTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="hr-events-pagination">
                <div className="hr-events-pagination-info">
                  Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                  {Math.min(pagination.current_page * pagination.per_page, pagination.total_records)} of{' '}
                  {pagination.total_records} entries
                </div>
                <div className="hr-events-pagination-controls">
                  <button
                    className="hr-events-pagination-btn"
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0 16px', color: '#64748b' }}>
                    Page {pagination.current_page} of {pagination.total_pages}
                  </span>
                  <button
                    className="hr-events-pagination-btn"
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.total_pages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal rendered via portal */}
      {showModal && createPortal(
        <div className="hr-events-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="hr-events-modal">
            <div className="hr-events-modal-header">
              <h2 className="hr-events-modal-title">
                {editingEvent ? 'Edit Event' : 'Add New Event'}
              </h2>
            </div>
            <div className="hr-events-modal-content">
              <form onSubmit={handleSubmit}>
                <div className="hr-events-form-grid">
                  <div className="hr-events-form-group full-width">
                    <label className="hr-events-form-label">Event Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="hr-events-form-input"
                      required
                      placeholder="Enter event title"
                    />
                  </div>

                  <div className="hr-events-form-group full-width">
                    <label className="hr-events-form-label">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="hr-events-form-textarea"
                      placeholder="Enter event description"
                    />
                  </div>

                  <div className="hr-events-form-group">
                    <label className="hr-events-form-label">Event Date *</label>
                    <input
                      type="date"
                      name="event_date"
                      value={formData.event_date}
                      onChange={handleInputChange}
                      className="hr-events-form-input hr-events-date-input"
                      required
                    />
                  </div>

                  <div className="hr-events-form-group">
                    <label className="hr-events-form-label">Location *</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="hr-events-form-input"
                      required
                      placeholder="Enter location"
                    />
                  </div>

                  <div className="hr-events-form-group">
                    <label className="hr-events-form-label">Start Time *</label>
                    <input
                      type="time"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleInputChange}
                      className="hr-events-form-input hr-events-time-input"
                      required
                    />
                  </div>

                  <div className="hr-events-form-group">
                    <label className="hr-events-form-label">End Time *</label>
                    <input
                      type="time"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleInputChange}
                      className="hr-events-form-input hr-events-time-input"
                      required
                    />
                  </div>

                  <div className="hr-events-form-group">
                    <label className="hr-events-form-label">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="hr-events-form-select"
                    >
                      <option value="active">Active</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="hr-events-form-actions">
                  <button
                    type="button"
                    className="hr-events-form-btn secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="hr-events-form-btn primary"
                  >
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Alert rendered via portal */}
      <CustomAlert
        isOpen={alert.isOpen}
        onClose={() => setAlert(prev => ({ ...prev, isOpen: false }))}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onConfirm={alert.onConfirm}
      />
    </>
  );
};

export default ManageEvents;