import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import Swal from 'sweetalert2';
import { Plus, Edit2, Trash2, X, Search } from 'lucide-react';

const Status = () => {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    status: ''
  });

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      console.log('Fetching statuses from Supabase...');
      
      const { data, error } = await supabase
        .from('status')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Supabase Response:', { data, error });
      console.log('Number of statuses:', data?.length);

      if (error) {
        console.error('Supabase Error:', error);
        throw error;
      }
      
      setStatuses(data || []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to fetch statuses',
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

    if (!formData.status.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Required Field',
        text: 'Status is required',
      });
      return;
    }

    try {
      if (editMode && currentStatus) {
        // Update
        const { error } = await supabase
          .from('status')
          .update({
            status: formData.status
          })
          .eq('id', currentStatus.id);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Status updated successfully',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        // Insert - status_code is auto-generated
        const { error } = await supabase
          .from('status')
          .insert([{
            status: formData.status
          }]);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Status added successfully',
          timer: 1500,
          showConfirmButton: false,
        });
      }

      handleCloseModal();
      fetchStatuses();
    } catch (error) {
      console.error('Error saving status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save status',
      });
    }
  };

  const handleEdit = (status) => {
    setCurrentStatus(status);
    setFormData({
      status: status.status || ''
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id, statusName) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete status "${statusName}"? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('status')
          .delete()
          .eq('id', id);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Status has been deleted.',
          timer: 1500,
          showConfirmButton: false,
        });

        fetchStatuses();
      } catch (error) {
        console.error('Error deleting status:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete status',
        });
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentStatus(null);
    setFormData({
      status: ''
    });
  };

  // Filter statuses based on search
  const filteredStatuses = statuses.filter(status =>
    status.status?.toLowerCase().includes(searchTerm.toLowerCase())
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
            borderTop: '5px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '15px', color: '#666' }}>Loading statuses...</p>
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
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#333' }}>
            Status Management
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Total: {statuses.length} status{statuses.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 5px rgba(0,123,255,0.3)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#0056b3';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,123,255,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#007bff';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,123,255,0.3)';
          }}
        >
          <Plus size={18} />
          Add Status
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
            placeholder="Search statuses..."
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
            onFocus={e => e.currentTarget.style.borderColor = '#007bff'}
            onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
          />
        </div>
      </div>

      {/* Statuses Table */}
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
                  Status Code
                </th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>
                  Status
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
              {filteredStatuses.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ 
                    textAlign: 'center', 
                    padding: '50px', 
                    color: '#999',
                    fontSize: '14px'
                  }}>
                    {searchTerm ? 'No statuses match your search' : 'No statuses found. Click "Add Status" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredStatuses.map((status) => (
                  <tr 
                    key={status.id} 
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <td style={{ padding: '15px' }}>
                      <span style={{ 
                        backgroundColor: '#007bff', 
                        color: 'white', 
                        padding: '4px 12px', 
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>
                        {status.status_code}
                      </span>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <strong style={{ color: '#333', fontSize: '15px' }}>{status.status}</strong>
                    </td>
                    <td style={{ padding: '15px', color: '#666', fontSize: '13px' }}>
                      {status.created_at ? new Date(status.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : '-'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(status)}
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
                          onClick={() => handleDelete(status.id, status.status)}
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
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#333' }}>
                {editMode ? 'Edit Status' : 'Add New Status'}
              </h3>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#666'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#333'}
                onMouseLeave={e => e.currentTarget.style.color = '#666'}
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
                  Status <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  placeholder="e.g., Available, Occupied, Maintenance, Reserved"
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#007bff'}
                  onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px', marginBottom: 0 }}>
                  💡 Enter the status name (e.g., Available, Occupied, etc.)
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
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0056b3'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#007bff'}
                >
                  {editMode ? 'Update Status' : 'Add Status'}
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

export default Status;