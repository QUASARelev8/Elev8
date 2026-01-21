import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import Swal from 'sweetalert2';
import { ArrowLeft, Plus, X } from 'lucide-react';

const BilliardTableInfo = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [tableInfos, setTableInfos] = useState([]);
const [types, setTypes] = useState([]);
const [statuses, setStatuses] = useState([]);


  const [formData, setFormData] = useState({
    status: '',
    price: '',
    description: '',
    billiard_type: ''
  });


const fetchData = async () => {
  try {
    setLoading(true);
    console.log('Fetching data from Supabase...');
    
    // Fetch tables
    const { data: tablesData, error: tablesError } = await supabase
      .from('billiard_table')
      .select('*')
      .order('table_id', { ascending: true });

    console.log('Tables:', { tablesData, tablesError });
    if (tablesError) throw tablesError;

    // Fetch table infos
    const { data: infosData, error: infosError } = await supabase
      .from('billiard_table_info')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Table Infos:', { infosData, infosError });
    if (infosError) throw infosError;

    // Fetch billiard types
    const { data: typesData, error: typesError } = await supabase
      .from('billiard_type')
      .select('*')
      .order('billiard_type', { ascending: true });

    console.log('Types:', { typesData, typesError });
    if (typesError) throw typesError;

    // ADD THIS: Fetch statuses
    const { data: statusesData, error: statusesError } = await supabase
      .from('status')
      .select('*')
      .order('status', { ascending: true });

    console.log('Statuses:', { statusesData, statusesError });
    if (statusesError) throw statusesError;

    setTables(tablesData || []);
    setTableInfos(infosData || []);
    setTypes(typesData || []);
    setStatuses(statusesData || []); // ADD THIS
  } catch (error) {
    console.error('Error fetching data:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to fetch data',
    });
  } finally {
    setLoading(false);
  }
};
// Update yung useEffect:
useEffect(() => {
  fetchData();
}, []);

// Update yung handleSubmit sa dulo, palitan yung fetchTables() with fetchData():

const handleTableClick = (table) => {
  setSelectedTable(table);
  
  // Check if table already has info
  const existingInfo = tableInfos.find(i => i.table_id === table.table_id);
  
  if (existingInfo) {
    // Edit mode - pre-fill the form
    setEditMode(true);
    setFormData({
      status: existingInfo.status || '',
      price: existingInfo.price || '',
      description: existingInfo.description || '',
      billiard_type: existingInfo.billiard_type || ''
    });
  } else {
    // Add mode - empty form
    setEditMode(false);
    setFormData({
      status: '',
      price: '',
      description: '',
      billiard_type: ''
    });
  }
  
  setShowModal(true);
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

  if (!formData.status?.trim() || !formData.price || !formData.billiard_type?.trim()) {
    Swal.fire({
      icon: 'warning',
      title: 'Required Fields',
      text: 'Status, Price, and Table Type are required',
    });
    return;
  }

  try {
    const existingInfo = tableInfos.find(i => i.table_id === selectedTable.table_id);
    
    if (existingInfo) {
      // UPDATE existing record
      const { error } = await supabase
        .from('billiard_table_info')
        .update({
          status: formData.status,
          price: parseFloat(formData.price),
          description: formData.description || null,
          billiard_type: formData.billiard_type
        })
        .eq('table_info_id', existingInfo.table_info_id);

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Table information updated successfully',
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      // INSERT new record
      const { error } = await supabase
        .from('billiard_table_info')
        .insert([{
          table_id: selectedTable.table_id,
          status: formData.status,
          price: parseFloat(formData.price),
          description: formData.description || null,
          table_code: selectedTable.table_code,
          billiard_type: formData.billiard_type
        }]);

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Table information added successfully',
        timer: 1500,
        showConfirmButton: false,
      });
    }

    handleCloseModal();
    fetchData();
  } catch (error) {
    console.error('Error saving table info:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Failed to save table information',
    });
  }
};
const handleCloseModal = () => {
  setShowModal(false);
  setSelectedTable(null);
  setEditMode(false); 
  setFormData({
    status: '',
    price: '',
    description: '',
    billiard_type: ''
  });
};

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid rgba(255,255,255,0.3)',
            borderTop: '5px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '15px', color: 'white', fontWeight: '600' }}>Loading tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>

      {/* Title */}
      <h1 style={{
        textAlign: 'center',
        color: 'white',
        fontSize: '42px',
        fontWeight: '700',
        marginBottom: '50px',
        textShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
      TABLE INFORMATION
      </h1>

      {/* Categories Grid */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px'
      }}>
        {tables.map((table) => (
          <button
            key={table.table_id}
            onClick={() => handleTableClick(table)}
            style={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '16px',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            }}
          >
            {/* Header */}
            <div style={{
              backgroundColor: '#0891b2',
              padding: '20px',
              color: 'white'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {table.table_name}
              </h3>
            </div>

            <div style={{
  padding: '25px',
  backgroundColor: 'white',
  textAlign: 'left'
}}>
  <p style={{
    margin: '0 0 15px 0',
    fontSize: '15px',
    color: '#666',
    fontWeight: '500'
  }}>
    Code: <span style={{ 
      color: '#0891b2', 
      fontWeight: '700',
      fontSize: '16px'
    }}>{table.table_code}</span>
  </p>
  
  {/* Display existing table info */}
 {(() => {
  const info = tableInfos.find(i => i.table_id === table.table_id);
  if (info) {
    return (
      <div style={{
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: '2px solid #e5e7eb'
      }}>
        {/* ADD THIS - Table Type Display */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '12px',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Type:</span>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '700',
            color: '#0891b2',
            backgroundColor: '#e0f2fe',
            padding: '4px 10px',
            borderRadius: '6px'
          }}>
            {info.billiard_type|| 'N/A'}
          </span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '12px',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Status:</span>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '700',
            color: info.status === 'Available' ? '#28a745' : 
                   info.status === 'Occupied' ? '#dc3545' : 
                   info.status === 'Reserved' ? '#ffc107' : '#6c757d'
          }}>
            {info.status}
          </span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Price:</span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0891b2' }}>
            ₱{parseFloat(info.price).toFixed(2)}/hr
          </span>
        </div>
        {info.description && (
          <p style={{ 
            fontSize: '12px', 
            color: '#999', 
            marginTop: '12px',
            fontStyle: 'italic',
            textAlign: 'right'
          }}>
            {info.description}
          </p>
        )}
      </div>
    );
  }
  return (
    <p style={{ 
      fontSize: '13px', 
      color: '#999', 
      marginTop: '15px',
      fontStyle: 'italic',
      textAlign: 'center'
    }}>
      No information yet
    </p>
  );
})()}
</div>
            
          </button>
        ))}
      </div>

      {/* Empty State */}
      {tables.length === 0 && (
        <div style={{
          textAlign: 'center',
          color: 'white',
          padding: '50px',
          fontSize: '16px'
        }}>
          No tables available. Please add tables first.
        </div>
      )}

      {/* Modal */}
      {showModal && selectedTable && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '550px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '25px',
              borderBottom: '2px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0891b2'
            }}>
              <div>
    <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: 'white' }}>
      {editMode ? 'Update Table Information' : 'Add Table Information'} {/* CHANGED */}
    </h3>
    <p style={{ margin: '5px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
      {selectedTable.table_name} - {selectedTable.table_code}
    </p>
  </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '8px',
                  color: 'white',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: '25px' }}>
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
  <select
    name="status"
    value={formData.status}
    onChange={handleInputChange}
    required
    style={{
      width: '100%',
      padding: '12px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    }}
    onFocus={e => e.currentTarget.style.borderColor = '#0891b2'}
    onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
  >
    <option value="">Select status...</option>
    {statuses.map(status => (
      <option key={status.id} value={status.status}>
        {status.status}
      </option>
    ))}
  </select>
</div>


<div style={{ marginBottom: '20px' }}>
  <label style={{ 
    display: 'block', 
    marginBottom: '8px', 
    fontWeight: '600',
    color: '#333',
    fontSize: '14px'
  }}>
    Table Type <span style={{ color: '#dc3545' }}>*</span>
  </label>
  <select
    name="billiard_type"
    value={formData.billiard_type}  // CHANGED: was formData.billiard_type_code
    onChange={handleInputChange}
    required
    style={{
      width: '100%',
      padding: '12px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    }}
    onFocus={e => e.currentTarget.style.borderColor = '#0891b2'}
    onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
  >
    <option value="">Select table type...</option>
    {types.map(type => (
      <option key={type.id} value={type.billiard_type}>
        {type.billiard_type}
      </option>
    ))}
  </select>
</div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#333',
                  fontSize: '14px'
                }}>
                  Price (₱) <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="Enter price per hour"
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#0891b2'}
                  onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#333',
                  fontSize: '14px'
                }}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter additional information (optional)"
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#0891b2'}
                  onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Modal Footer */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '20px',
                borderTop: '2px solid #e5e7eb'
              }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4b5563'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6b7280'}
                >
                  Cancel
                </button>
               <button
  type="submit"
  style={{
    padding: '12px 24px',
    backgroundColor: '#0891b2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}
  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0e7490'}
  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0891b2'}
>
  <Plus size={18} />
  {editMode ? 'Update Information' : 'Add Information'} {/* CHANGED */}
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
          
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default BilliardTableInfo;