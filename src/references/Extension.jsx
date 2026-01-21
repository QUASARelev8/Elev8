import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import Swal from 'sweetalert2';
import { Plus, Edit2, Trash2, X, Search, Timer } from 'lucide-react';

const Extension = () => {
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentExtension, setCurrentExtension] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    extension_hours: ''
  });

  useEffect(() => {
    fetchExtensions();
  }, []);

  const fetchExtensions = async () => {
    try {
      setLoading(true);
      console.log('Fetching extensions from Supabase...');
      
      const { data, error } = await supabase
        .from('extension')
        .select('*')
        .order('extension_hours', { ascending: true });

      console.log('Supabase Response:', { data, error });
      console.log('Number of extensions:', data?.length);

      if (error) {
        console.error('Supabase Error:', error);
        throw error;
      }
      
      setExtensions(data || []);
    } catch (error) {
      console.error('Error fetching extensions:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to fetch extensions',
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

    if (!formData.extension_hours || formData.extension_hours <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Input',
        text: 'Please enter valid extension hours (greater than 0)',
      });
      return;
    }

    try {
      if (editMode && currentExtension) {
        // Update
        const { error } = await supabase
          .from('extension')
          .update({
            extension_hours: parseFloat(formData.extension_hours)
          })
          .eq('id', currentExtension.id);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Extension updated successfully',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        // Check if extension hours already exists
        const existing = extensions.find(e => e.extension_hours === parseFloat(formData.extension_hours));
        if (existing) {
          Swal.fire({
            icon: 'warning',
            title: 'Duplicate Entry',
            text: 'This extension duration already exists',
          });
          return;
        }

        // Insert
        const { error } = await supabase
          .from('extension')
          .insert([{
            extension_hours: parseFloat(formData.extension_hours)
          }]);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Extension added successfully',
          timer: 1500,
          showConfirmButton: false,
        });
      }

      handleCloseModal();
      fetchExtensions();
    } catch (error) {
      console.error('Error saving extension:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save extension',
      });
    }
  };

  const handleEdit = (extension) => {
    setCurrentExtension(extension);
    setFormData({
      extension_hours: extension.extension_hours.toString()
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id, hours) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete extension "${hours} ${hours === 1 ? 'hour' : 'hours'}"? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('extension')
          .delete()
          .eq('id', id);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Extension has been deleted.',
          timer: 1500,
          showConfirmButton: false,
        });

        fetchExtensions();
      } catch (error) {
        console.error('Error deleting extension:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete extension',
        });
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentExtension(null);
    setFormData({
      extension_hours: ''
    });
  };

  // Filter extensions based on search
  const filteredExtensions = extensions.filter(extension =>
    extension.extension_hours.toString().includes(searchTerm)
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
            borderTop: '5px solid #6f42c1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '15px', color: '#666' }}>Loading extensions...</p>
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
            <Timer size={32} color="#6f42c1" />
            Time Extensions
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Total: {extensions.length} extension{extensions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 5px rgba(111,66,193,0.3)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#5a32a3';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(111,66,193,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#6f42c1';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 5px rgba(111,66,193,0.3)';
          }}
        >
          <Plus size={18} />
          Add Extension
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
            placeholder="Search extensions..."
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
            onFocus={e => e.currentTarget.style.borderColor = '#6f42c1'}
            onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
          />
        </div>
      </div>

      {/* Extensions Table */}
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
                  Extension Hours
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
              {filteredExtensions.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ 
                    textAlign: 'center', 
                    padding: '50px', 
                    color: '#999',
                    fontSize: '14px'
                  }}>
                    {searchTerm ? 'No extensions match your search' : 'No extensions found. Click "Add Extension" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredExtensions.map((extension) => (
                  <tr 
                    key={extension.id} 
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <td style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Timer size={20} color="#6f42c1" />
                        <strong style={{ color: '#333', fontSize: '16px' }}>
                          {extension.extension_hours} {extension.extension_hours === 1 ? 'hour' : 'hours'}
                        </strong>
                      </div>
                    </td>
                    <td style={{ padding: '15px', color: '#666', fontSize: '13px' }}>
                      {extension.created_at ? new Date(extension.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : '-'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(extension)}
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
                          onClick={() => handleDelete(extension.id, extension.extension_hours)}
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
              backgroundColor: '#6f42c1',
              borderRadius: '12px 12px 0 0'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Timer size={24} />
                {editMode ? 'Edit Extension' : 'Add New Extension'}
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
                  Extension Hours <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="number"
                  name="extension_hours"
                  value={formData.extension_hours}
                  onChange={handleInputChange}
                  placeholder="Enter hours (e.g., 0.5, 1, 1.5)"
                  required
                  min="0.5"
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
                  onFocus={e => e.currentTarget.style.borderColor = '#6f42c1'}
                  onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  💡 You can use decimals (e.g., 0.5 for 30 mins, 1.5 for 1.5 hours)
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
                    backgroundColor: '#6f42c1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#5a32a3'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6f42c1'}
                >
                  {editMode ? 'Update Extension' : 'Add Extension'}
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

export default Extension;