import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import Swal from 'sweetalert2';
import { Plus, Edit2, Trash2, X, Search, Clock } from 'lucide-react';

const Duration = () => {
  const [durations, setDurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    hours: ''
  });

  useEffect(() => {
    fetchDurations();
  }, []);

  const fetchDurations = async () => {
    try {
      setLoading(true);
      console.log('Fetching durations from Supabase...');
      
      const { data, error } = await supabase
        .from('duration')
        .select('*')
        .order('hours', { ascending: true });

      console.log('Supabase Response:', { data, error });
      console.log('Number of durations:', data?.length);

      if (error) {
        console.error('Supabase Error:', error);
        throw error;
      }
      
      setDurations(data || []);
    } catch (error) {
      console.error('Error fetching durations:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to fetch durations',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

if (!formData.hours || parseFloat(formData.hours) < 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Input',
        text: 'Please enter a valid number of hours (greater than 0)',
      });
      return;
    }

    try {
    if (editMode && currentDuration) {
  // Update
  const { error } = await supabase
    .from('duration')
    .update({
      hours: parseFloat(formData.hours)
    })
    .eq('id', currentDuration.id);

  if (error) throw error;

  Swal.fire({
    icon: 'success',
    title: 'Updated!',
    text: 'Duration updated successfully',
    timer: 1500,
    showConfirmButton: false,
  });
} else {
  // Check if hours already exists
  const existing = durations.find(d => d.hours === parseFloat(formData.hours));
  if (existing) {
    Swal.fire({
      icon: 'warning',
      title: 'Duplicate Entry',
      text: 'This duration already exists',
    });
    return;
  }

  // Insert
  const { error } = await supabase
    .from('duration')
    .insert([{
      hours: parseFloat(formData.hours)
    }]);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Duration added successfully',
          timer: 1500,
          showConfirmButton: false,
        });
      }

      handleCloseModal();
      fetchDurations();
    } catch (error) {
      console.error('Error saving duration:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save duration',
      });
    }
  };

  const handleEdit = (duration) => {
    setCurrentDuration(duration);
    setFormData({
      hours: duration.hours.toString()
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id, hours) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete duration "${hours} ${hours === 1 ? 'hour' : 'hours'}"? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('duration')
          .delete()
          .eq('id', id);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Duration has been deleted.',
          timer: 1500,
          showConfirmButton: false,
        });

        fetchDurations();
      } catch (error) {
        console.error('Error deleting duration:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete duration',
        });
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentDuration(null);
    setFormData({
      hours: ''
    });
  };

  // Filter durations based on search
const filteredDurations = durations.filter(duration =>
  duration.hours !== null && 
  duration.hours !== undefined && 
  duration.hours.toString().includes(searchTerm)
);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #17a2b8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '15px', color: '#666' }}>Loading durations...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={32} color="#17a2b8" />
            Duration Hours
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Total: {durations.length} duration{durations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 5px rgba(23,162,184,0.3)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#138496';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(23,162,184,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#17a2b8';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 5px rgba(23,162,184,0.3)';
          }}
        >
          <Plus size={18} />
          Add Duration
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          position: 'relative',
          maxWidth: '400px'
        }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#999'
            }} 
          />
          <input
            type="text"
            placeholder="Search duration hours..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#17a2b8'}
            onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
          />
        </div>
      </div>

      {/* Durations Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>
                  Duration (Hours)
                </th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>
                  Created
                </th>
                <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#333' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDurations.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ 
                    textAlign: 'center', 
                    padding: '50px', 
                    color: '#999',
                    fontSize: '14px'
                  }}>
                    {searchTerm ? 'No durations match your search' : 'No durations found. Click "Add Duration" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredDurations.map((duration) => (
                  <tr 
                    key={duration.id} 
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                  <td style={{ padding: '15px' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <Clock size={20} color="#17a2b8" />
    <strong style={{ color: '#333', fontSize: '16px' }}>
      {duration.hours % 1 === 0 
        ? `${duration.hours} ${duration.hours === 1 ? 'hour' : 'hours'}`
        : `${duration.hours} hours`
      }
    </strong>
  </div>
</td>
                    <td style={{ padding: '15px', color: '#666', fontSize: '13px' }}>
                      {duration.created_at ? new Date(duration.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : '-'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(duration)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ffc107',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#e0a800';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = '#ffc107';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(duration.id, duration.hours)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#c82333';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = '#dc3545';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#17a2b8',
              borderRadius: '12px 12px 0 0'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={24} />
                {editMode ? 'Edit Duration' : 'Add New Duration'}
              </h3>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'white',
                  borderRadius: '4px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#333',
                  fontSize: '14px'
                }}>
                  Number of Hours <span style={{ color: '#dc3545' }}>*</span>
                </label>
               <input
  type="number"
  name="hours"
  value={formData.hours}
  onChange={handleInputChange}
  placeholder="Enter hours (e.g., 1, 1.5, 2, 2.5)"
  required
  min="1"  // Changed from "0.5" to "1"
  step="0.5"
  style={{
    width: '100%',
    padding: '10px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  }}
  onFocus={e => e.currentTarget.style.borderColor = '#17a2b8'}
  onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
/>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
  💡 Enter hours in 0.5 increments (e.g., 1, 1.5, 2, 2.5, 3)                
                  </p>
              </div>

              {/* Modal Footer */}
              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                paddingTop: '20px',
                borderTop: '1px solid #dee2e6'
              }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#5a6268'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6c757d'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#138496'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#17a2b8'}
                >
                  {editMode ? 'Update Duration' : 'Add Duration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Duration;