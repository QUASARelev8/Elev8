import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import Swal from 'sweetalert2';
import { Plus, Edit2, Trash2, X, Search, Download, QrCode as QrCodeIcon } from 'lucide-react';

const QRCodeManagement = () => {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentQrCode, setCurrentQrCode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false); 
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    cellphone_number: '',
    status: true,
    qr_image: null
  });

  useEffect(() => {
    fetchQRCodes();
  }, []);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      console.log('Fetching QR codes from Supabase...');
      
      const { data, error } = await supabase
        .from('qr_code')
        .select('*')
        .order('generated_at', { ascending: false });

      console.log('Supabase Response:', { data, error });

      if (error) {
        console.error('Supabase Error:', error);
        throw error;
      }
      
      setQrCodes(data || []);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to fetch QR codes',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File',
        text: 'Please upload an image file (JPG, PNG, etc.)',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Please upload an image smaller than 5MB',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      setFormData(prev => ({
        ...prev,
        qr_image: base64String
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Input',
        text: 'Please enter a payment method name',
      });
      return;
    }

    if (!formData.cellphone_number || formData.cellphone_number.length !== 11) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Cellphone Number',
        text: 'Please enter a valid 11-digit Philippine mobile number',
      });
      return;
    }

    if (!formData.cellphone_number.startsWith('09')) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Number Format',
        text: 'Philippine mobile numbers must start with 09',
      });
      return;
    }

    if (!formData.qr_image) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing QR Code',
        text: 'Please upload a QR code image',
      });
      return;
    }

    try {
      setUploading(true);

      if (editMode && currentQrCode) {
        const { error } = await supabase
          .from('qr_code')
          .update({
            full_name: formData.full_name.trim(),
            cellphone_number: formData.cellphone_number,
            qr_image: formData.qr_image,
            status: formData.status
          })
          .eq('qr_id', currentQrCode.qr_id);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'QR code updated successfully',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        const existing = qrCodes.find(qr => qr.cellphone_number === formData.cellphone_number);
        if (existing) {
          Swal.fire({
            icon: 'warning',
            title: 'Duplicate Entry',
            text: 'This cellphone number already exists',
          });
          return;
        }

        const { error } = await supabase
          .from('qr_code')
          .insert([{
            full_name: formData.full_name.trim(),
            cellphone_number: formData.cellphone_number,
            qr_image: formData.qr_image,
            status: formData.status
          }]);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'QR code uploaded successfully',
          timer: 1500,
          showConfirmButton: false,
        });
      }

      handleCloseModal();
      fetchQRCodes();
    } catch (error) {
      console.error('Error saving QR code:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save QR code',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (qrCode) => {
    setCurrentQrCode(qrCode);
    setFormData({
      full_name: qrCode.full_name || '',
      cellphone_number: qrCode.cellphone_number?.toString() || '',
      status: qrCode.status ?? true,
      qr_image: qrCode.qr_image
    });
    setImagePreview(qrCode.qr_image);
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (qrId, fullName) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete QR code for "${fullName}"? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('qr_code')
          .delete()
          .eq('qr_id', qrId);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'QR code has been deleted.',
          timer: 1500,
          showConfirmButton: false,
        });

        fetchQRCodes();
      } catch (error) {
        console.error('Error deleting QR code:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete QR code',
        });
      }
    }
  };

  const handleDownload = (qrImage, fullName, qrNumber) => {
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `QR_${qrNumber}_${fullName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentQrCode(null);
    setImagePreview(null);
    setFormData({
      full_name: '',
      cellphone_number: '',
      status: true,
      qr_image: null
    });
  };

  const filteredQRCodes = qrCodes.filter(qr =>
    qr.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    qr.cellphone_number?.toString().includes(searchTerm)
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
          <p style={{ marginTop: '15px', color: '#666' }}>Loading QR codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{`
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
        
        .qr-card {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '35px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            fontSize: '32px', 
            fontWeight: '800', 
            color: '#1a1a1a',
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            letterSpacing: '-0.5px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #6f42c1 0%, #8b5cf6 100%)',
              padding: '8px 12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <QrCodeIcon size={28} color="white" />
            </div>
            QR Code Management
          </h2>
          <p style={{ 
            margin: '8px 0 0 0', 
            color: '#666', 
            fontSize: '15px',
            fontWeight: '500'
          }}>
            Manage and organize payment QR codes • Total: <span style={{ fontWeight: '700', color: '#6f42c1' }}>{qrCodes.length}</span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #6f42c1 0%, #8b5cf6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 15px rgba(111, 66, 193, 0.3)',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(111, 66, 193, 0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(111, 66, 193, 0.3)';
          }}
        >
          <Plus size={20} />
          Add QR Code
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          position: 'relative',
          maxWidth: '450px'
        }}>
          <Search 
            size={20} 
            style={{ 
              position: 'absolute', 
              left: '14px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }} 
          />
          <input
            type="text"
            placeholder="Search by payment method or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 46px',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '15px',
              outline: 'none',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#6f42c1';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(111, 66, 193, 0.1)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
            }}
          />
        </div>
      </div>

      {/* QR Codes Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {filteredQRCodes.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px 40px',
            background: 'linear-gradient(135deg, rgba(111, 66, 193, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
            borderRadius: '16px',
            border: '2px dashed #e5e7eb'
          }}>
            <div style={{ fontSize: '64px', display: 'block', margin: '0 auto 20px' }}>📱</div>
            <p style={{ color: '#666', fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0' }}>
              {searchTerm ? 'No QR codes found' : 'No payment QR codes yet'}
            </p>
            <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
              {searchTerm ? 'Try adjusting your search' : 'Click the button above to add your first QR code'}
            </p>
          </div>
        ) : (
          filteredQRCodes.map((qr) => (
            <div 
              key={qr.qr_id}
              className="qr-card"
              style={{
                background: 'white',
                borderRadius: '14px',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid #f0f0f0',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(111, 66, 193, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.08)';
              }}
            >
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 10,
                background: qr.status ? '#10b981' : '#ef4444',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {qr.status ? '✓ Active' : '✗ Inactive'}
              </div>

              {/* QR Code Image */}
              <div style={{
                padding: '24px',
                background: 'linear-gradient(135deg, #f8f7ff 0%, #f5f3ff 100%)',
                textAlign: 'center',
                borderBottom: '1px solid #f0f0f0',
                flex: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={qr.qr_image} 
                  alt={`QR Code for ${qr.full_name}`}
                  style={{
                    width: '160px',
                    height: '160px',
                    objectFit: 'contain',
                    border: '3px solid white',
                    borderRadius: '10px',
                    background: 'white',
                    padding: '8px',
                    boxShadow: '0 4px 12px rgba(111, 66, 193, 0.15)'
                  }}
                />
              </div>

              {/* Card Details */}
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ 
                    margin: '0 0 6px 0', 
                    fontSize: '12px', 
                    color: '#999',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Payment Method
                  </p>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    fontWeight: '700', 
                    color: '#1a1a1a',
                  }}>
                    {qr.full_name}
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ 
                    margin: '0 0 6px 0', 
                    fontSize: '12px', 
                    color: '#999',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Phone Number
                  </p>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#6f42c1',
                    fontFamily: "'Courier New', monospace"
                  }}>
                    {qr.cellphone_number}
                  </p>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  <button
                    onClick={() => handleEdit(qr)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(qr.qr_id, qr.full_name)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                  <button
                    onClick={() => handleDownload(qr.qr_image, qr.full_name, qr.qr_id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              background: 'linear-gradient(135deg, #6f42c1 0%, #8b5cf6 100%)',
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '22px', 
                fontWeight: '800', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                letterSpacing: '-0.3px'
              }}>
                <QrCodeIcon size={26} />
                {editMode ? 'Edit QR Code' : 'Add New QR Code'}
              </h3>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'white',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '28px' }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '700',
                  color: '#1a1a1a',
                  fontSize: '15px'
                }}>
                  Payment Method Name <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="e.g., GCash - Store Name"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#6f42c1';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(111, 66, 193, 0.1)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '700',
                  color: '#1a1a1a',
                  fontSize: '15px'
                }}>
                  Cellphone Number <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="tel"
                  name="cellphone_number"
                  value={formData.cellphone_number}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 11) {
                      setFormData(prev => ({
                        ...prev,
                        cellphone_number: value
                      }));
                    }
                  }}
                  placeholder="09XXXXXXXXX"
                  required
                  maxLength="11"
                  pattern="09[0-9]{9}"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#6f42c1';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(111, 66, 193, 0.1)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '700',
                  color: '#1a1a1a',
                  fontSize: '15px'
                }}>
                  Upload QR Code Image <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <div style={{
                  border: '2px dashed #e5e7eb',
                  borderRadius: '10px',
                  padding: '24px',
                  textAlign: 'center',
                  background: '#f9f7ff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#6f42c1';
                  e.currentTarget.style.backgroundColor = '#f0e6ff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = '#f9f7ff';
                }}
                onClick={() => document.getElementById('qr-upload').click()}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>📤</div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>
                    Click to upload
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>
                    PNG, JPG up to 5MB
                  </p>
                </div>
                <input
                  id="qr-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />

                {imagePreview && (
                  <div style={{
                    marginTop: '18px',
                    border: '2px solid #6f42c1',
                    borderRadius: '10px',
                    padding: '16px',
                    textAlign: 'center',
                    backgroundColor: '#f9f7ff'
                  }}>
                    <p style={{
                      margin: '0 0 12px 0',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#6f42c1',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Preview
                    </p>
                    <img 
                      src={imagePreview} 
                      alt="QR Code preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '280px',
                        borderRadius: '8px',
                        border: '2px solid white'
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  margin: 0
                }}>
                  <input
                    type="checkbox"
                    name="status"
                    checked={formData.status}
                    onChange={handleInputChange}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#6f42c1'
                    }}
                  />
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>
                    Set as Active
                  </span>
                </label>
                <p style={{ fontSize: '13px', color: '#999', marginTop: '6px', marginLeft: '28px', margin: '6px 0 0 28px' }}>
                  Customers will see this payment method when enabled
                </p>
              </div>

              {/* Modal Footer */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '24px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={handleCloseModal}
                  disabled={uploading}
                  style={{
                    padding: '11px 24px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: uploading ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => !uploading && (e.currentTarget.style.backgroundColor = '#e5e7eb')}
                  onMouseLeave={e => !uploading && (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  style={{
                    padding: '11px 24px',
                    background: 'linear-gradient(135deg, #6f42c1 0%, #8b5cf6 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: uploading ? 0.6 : 1,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={e => !uploading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => !uploading && (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {uploading ? (
                    <>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid white',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Uploading...
                    </>
                  ) : (
                   editMode ? 'Save Changes' : 'Add QR Code'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeManagement;