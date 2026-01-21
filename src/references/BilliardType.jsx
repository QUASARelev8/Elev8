import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import Swal from 'sweetalert2';
import { Plus, Edit2, Trash2, X, Search } from 'lucide-react';

const BilliardType = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentType, setCurrentType] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    billiard_type: ''
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      console.log('Fetching billiard types from Supabase...');
      
      const { data, error } = await supabase
        .from('billiard_type')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Supabase Response:', { data, error });
      console.log('Number of types:', data?.length);

      if (error) {
        console.error('Supabase Error:', error);
        throw error;
      }
      
      setTypes(data || []);
    } catch (error) {
      console.error('Error fetching types:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to fetch billiard types',
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

  if (!formData.billiard_type.trim()) {
    Swal.fire({
      icon: 'warning',
      title: 'Required Field',
      text: 'Billiard type is required',
    });
    return;
  }

  try {
    if (editMode && currentType) {
      // Update (no need to change code)
      const { error } = await supabase
        .from('billiard_type')
        .update({
          billiard_type: formData.billiard_type
        })
        .eq('id', currentType.id);

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Billiard type updated successfully',
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      // Insert - generate code first
      const newCode = await generateTypeCode();
      
      const { error } = await supabase
        .from('billiard_type')
        .insert([{
          billiard_type: formData.billiard_type,
          billiard_type_code: newCode
        }]);

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Billiard type added successfully',
        timer: 1500,
        showConfirmButton: false,
      });
    }

    handleCloseModal();
    fetchTypes();
  } catch (error) {
    console.error('Error saving type:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Failed to save billiard type',
    });
  }
};

  const handleEdit = (type) => {
    setCurrentType(type);
    setFormData({
      billiard_type: type.billiard_type || ''
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (id, typeName) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete type "${typeName}"? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('billiard_type')
          .delete()
          .eq('id', id);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Billiard type has been deleted.',
          timer: 1500,
          showConfirmButton: false,
        });

        fetchTypes();
      } catch (error) {
        console.error('Error deleting type:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete billiard type',
        });
      }
    }
  };
const generateTypeCode = async () => {
  try {
    // Get the latest type code
    const { data, error } = await supabase
      .from('billiard_type')
      .select('billiard_type_code')
      .order('id', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return 'BT-001'; // First code
    }

    // Extract number from last code (e.g., "BT-001" -> 1)
    const lastCode = data[0].billiard_type_code;
    const lastNumber = parseInt(lastCode.split('-')[1]);
    const newNumber = lastNumber + 1;

    // Format with leading zeros (e.g., 2 -> "002")
    return `BT-${String(newNumber).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating type code:', error);
    return 'BT-001';
  }
};
  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentType(null);
    setFormData({
      billiard_type: ''
    });
  };

  // Filter types based on search
  const filteredTypes = types.filter(type =>
    type.billiard_type?.toLowerCase().includes(searchTerm.toLowerCase())
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
            borderTop: '5px solid #28a745',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '15px', color: '#666' }}>Loading types...</p>
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
            Billiard Types
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Total: {types.length} type{types.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 5px rgba(40,167,69,0.3)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#218838';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(40,167,69,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#28a745';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 5px rgba(40,167,69,0.3)';
          }}
        >
          <Plus size={18} />
          Add Type
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
            placeholder="Search billiard types..."
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
            onFocus={e => e.currentTarget.style.borderColor = '#28a745'}
            onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
          />
        </div>
      </div>

      {/* Types Grid/List */}
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
      Billiard Type Code
    </th>
    <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>
      Billiard Type
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
  {filteredTypes.length === 0 ? (
    <tr>
      <td colSpan="4" style={{ 
        textAlign: 'center', 
        padding: '50px', 
        color: '#999',
        fontSize: '14px'
      }}>
        {searchTerm ? 'No types match your search' : 'No types found. Click "Add Type" to create one.'}
      </td>
    </tr>
  ) : (
    filteredTypes.map((type) => (
      <tr 
        key={type.id} 
        style={{ borderBottom: '1px solid #f0f0f0' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
      >
        <td style={{ padding: '15px' }}>
          <span style={{ 
            backgroundColor: '#28a745', 
            color: 'white', 
            padding: '4px 12px', 
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            {type.billiard_type_code}
          </span>
        </td>
        <td style={{ padding: '15px' }}>
          <strong style={{ color: '#333', fontSize: '15px' }}>{type.billiard_type}</strong>
        </td>
                    <td style={{ padding: '15px', color: '#666', fontSize: '13px' }}>
                      {type.created_at ? new Date(type.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : '-'}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(type)}
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
                          onClick={() => handleDelete(type.id, type.billiard_type)}
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
                {editMode ? 'Edit Billiard Type' : 'Add New Type'}
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
                  Billiard Type <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  name="billiard_type"
                  value={formData.billiard_type}
                  onChange={handleInputChange}
                  placeholder="e.g., Standard, Premium etc."
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
                  onFocus={e => e.currentTarget.style.borderColor = '#28a745'}
                  onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px', marginBottom: 0 }}>
                  💡 Enter the type of billiard table 
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
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#218838'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#28a745'}
                >
                  {editMode ? 'Update Type' : 'Add Type'}
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

export default BilliardType;