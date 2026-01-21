import React, { useState, useRef, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import Swal from 'sweetalert2';
import jsQR from 'jsqr';

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [reservationDetails, setReservationDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.play();
        setScanning(true);
        scanQRCode();
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Camera Access Denied',
        text: 'Please allow camera access to scan QR codes',
      });
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setScanning(false);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        handleQRCodeDetected(code.data);
        return;
      }
    }

    animationRef.current = requestAnimationFrame(scanQRCode);
  };

  const handleQRCodeDetected = async (qrData) => {
    stopScanning();
    setLoading(true);

    try {
      const parsedData = JSON.parse(qrData);
      const { reservationNo } = parsedData;

      if (!reservationNo) {
        throw new Error('Invalid QR code');
      }

      // Fetch reservation details
      const { data, error } = await supabase
        .from('reservation')
        .select(`
          *,
          accounts:account_id (
            first_name,
            last_name,
            email,
            phone_number
          ),
          billiard_table_info:table_id (
            table_name,
            price
          )
        `)
        .eq('reservation_no', reservationNo);

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Reservation not found');
      }

      // Group by reservation number
      const reservations = data;
      const customerInfo = reservations[0].accounts;

      setReservationDetails({
        reservationNo,
        customer: customerInfo,
        reservations: reservations
      });

    } catch (error) {
      console.error('Error fetching reservation:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load reservation details',
      });
      setReservationDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualInput = async () => {
    const { value: reservationNo } = await Swal.fire({
      title: 'Enter Reservation Number',
      input: 'text',
      inputPlaceholder: 'e.g., R-20251123-0001',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Please enter a reservation number';
        }
      }
    });

    if (reservationNo) {
      handleQRCodeDetected(JSON.stringify({ reservationNo }));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const clearResults = () => {
    setReservationDetails(null);
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#333',
            textAlign: 'center'
          }}>
            🎯 QR Code Scanner
          </h1>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#666',
            textAlign: 'center'
          }}>
            Scan customer's QR code to view reservation details
          </p>
        </div>

        {!reservationDetails && (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            {!scanning ? (
              <div>
                <div style={{
                  width: '120px',
                  height: '120px',
                  margin: '0 auto 20px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '60px'
                }}>
                  📷
                </div>
                <h2 style={{
                  margin: '0 0 10px 0',
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Ready to Scan
                </h2>
                <p style={{
                  margin: '0 0 30px 0',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  Click the button below to start scanning
                </p>
                <button
                  onClick={startScanning}
                  disabled={loading}
                  style={{
                    padding: '15px 40px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginRight: '10px',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  📷 Start Scanning
                </button>
                <button
                  onClick={handleManualInput}
                  disabled={loading}
                  style={{
                    padding: '15px 40px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  ⌨️ Manual Input
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  position: 'relative',
                  maxWidth: '500px',
                  margin: '0 auto 20px',
                  backgroundColor: '#000',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <video
                    ref={videoRef}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '250px',
                    height: '250px',
                    border: '3px solid #28a745',
                    borderRadius: '12px',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                  }} />
                </div>
                <p style={{
                  margin: '0 0 20px 0',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  Position the QR code within the frame
                </p>
                <button
                  onClick={stopScanning}
                  style={{
                    padding: '12px 30px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ❌ Stop Scanning
                </button>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '5px solid #f0f0f0',
              borderTop: '5px solid #28a745',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ margin: 0, fontSize: '16px', color: '#666' }}>
              Loading reservation details...
            </p>
          </div>
        )}

        {reservationDetails && !loading && (
          <div>
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '12px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Customer Information
                </h2>
                <span style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  {reservationDetails.reservationNo}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                    Name
                  </p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#333' }}>
                    {reservationDetails.customer.first_name} {reservationDetails.customer.last_name}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                    Email
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
                    {reservationDetails.customer.email}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                    Phone
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
                    {reservationDetails.customer.phone_number || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '12px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{
                margin: '0 0 20px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: '#333'
              }}>
                Reservation Details
              </h2>

              {reservationDetails.reservations.map((reservation, index) => (
                <div key={reservation.id} style={{
                  marginBottom: index < reservationDetails.reservations.length - 1 ? '20px' : '0',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '2px solid #28a745'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '15px',
                    paddingBottom: '15px',
                    borderBottom: '2px solid #e0e0e0'
                  }}>
                    <div>
                      <span style={{
                        padding: '6px 12px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginRight: '10px'
                      }}>
                        {reservation.billiard_table_info?.table_name || `Table ${reservation.table_id}`}
                      </span>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#28a745'
                      }}>
                        ₱{parseFloat(reservation.billiard_table_info?.price || 0).toFixed(2)}/hour
                      </span>
                    </div>
                    <span style={{
                      padding: '6px 12px',
                      backgroundColor: reservation.status === 'approved' ? '#28a745' : '#ffc107',
                      color: reservation.status === 'approved' ? 'white' : '#333',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {reservation.status}
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '15px'
                  }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                        Date
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        {formatDate(reservation.reservation_date)}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                        Time
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        {reservation.start_time} - {reservation.time_end}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                        Duration
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        {reservation.duration} hour{reservation.duration > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                        Table Bill
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#28a745' }}>
                        ₱{parseFloat(reservation.total_bill || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '15px',
                    paddingTop: '15px',
                    borderTop: '2px solid #e0e0e0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '15px'
                  }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                        Payment Method
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        {reservation.payment_method || 'N/A'}
                      </p>
                    </div>
                    {reservation.reference_no && (
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                          Reference No.
                        </p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333', fontFamily: "'Courier New', monospace" }}>
                          {reservation.reference_no}
                        </p>
                      </div>
                    )}
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                        Payment Type
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        {reservation.payment_type || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>
                        Payment Status
                      </p>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        fontWeight: '700',
                        color: reservation.payment_status === 'completed' ? '#28a745' : '#ff9800',
                        textTransform: 'uppercase'
                      }}>
                        {reservation.payment_status || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              textAlign: 'center'
            }}>
              <button
                onClick={clearResults}
                style={{
                  padding: '15px 40px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔍 Scan Another QR Code
              </button>
            </div>
          </div>
        )}
      </div>

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

export default QRScanner;