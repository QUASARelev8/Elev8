import React, { useState, useEffect, useRef } from 'react';
import { QrCode, CheckCircle, X, AlertCircle, FileImage, FolderOpen, Search } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function QRCheckInPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [generatedRefNo, setGeneratedRefNo] = useState(null);
  const [gcashRefNo, setGcashRefNo] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const html5QrCodeRef = useRef(null);
  const cardRef = useRef(null);
  const searchRef = useRef(null);

  // Fetch reservations on load
  useEffect(() => {
    fetchReservations();
    checkCameras();
  }, []);

  // Real-time search filter
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = reservations.filter(r =>
        r.reservation_no?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredReservations(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredReservations([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, reservations]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check available cameras
  const checkCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameraDevices(devices);
      if (devices && devices.length > 0) {
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0];
        setSelectedCamera(backCamera.id);
      }
    } catch (err) {
      console.error("Error checking cameras:", err);
    }
  };

  // Handle QR Scanner
  useEffect(() => {
    const startScanner = async () => {
      if (scannerActive && !isScanning) {
        if (cameraDevices.length === 0) {
          Swal.fire({
            icon: 'error',
            title: 'No Camera Found',
            html: `
              <p>No camera detected on this device.</p>
              <br>
              <p><strong>Solutions:</strong></p>
              <ul style="text-align: left; margin-left: 20px;">
                <li>Make sure your camera is connected and enabled</li>
                <li>Check if another app is using the camera</li>
                <li>Try refreshing the page</li>
                <li>Use the manual search below instead</li>
              </ul>
            `,
            confirmButtonColor: '#3085d6'
          });
          setScannerActive(false);
          return;
        }

        try {
          const html5QrCode = new Html5Qrcode("qr-reader");
          html5QrCodeRef.current = html5QrCode;

          const cameraId = selectedCamera || cameraDevices[0].id;

          await html5QrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            onScanSuccess,
            onScanError
          );

          setIsScanning(true);
        } catch (err) {
          console.error("Error starting scanner:", err);

          let errorMessage = 'Unable to access camera. Please check permissions.';

          if (err.toString().includes('NotFoundError')) {
            errorMessage = 'Camera not found. Please make sure your camera is connected and enabled.';
          } else if (err.toString().includes('NotAllowedError')) {
            errorMessage = 'Camera access denied. Please allow camera permissions in your browser settings.';
          } else if (err.toString().includes('NotReadableError')) {
            errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.';
          }

          Swal.fire({
            icon: 'error',
            title: 'Camera Error',
            text: errorMessage,
            confirmButtonColor: '#3085d6'
          });
          setScannerActive(false);
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      if (html5QrCodeRef.current && isScanning) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current = null;
            setIsScanning(false);
          })
          .catch(err => {
            console.error("Error stopping scanner:", err);
            setIsScanning(false);
          });
      }
    };
  }, [scannerActive]);

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservation')
        .select('*');
      // Remove the .in('status', ['pending', 'approved']) to get all reservations

      if (error) throw error;
      setReservations(data || []);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  };
  const [isLoading, setIsLoading] = useState(false);
  const onScanSuccess = async (decodedText) => {
    let searchValue = decodedText;

    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.reservationNo) {
        searchValue = parsed.reservationNo;
      }
    } catch (e) {
      searchValue = decodedText; // fallback to raw QR
    }

    setSearchQuery(searchValue);
    setIsLoading(true);

    await stopScanner(); // stop scanner immediately

    // Just call handleSearch
    await handleSearch(searchValue);
  };



  const onScanError = (error) => {
    // Silent - normal scanning errors
  };



  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
        setIsScanning(false);
        setScannerActive(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
        setIsScanning(false);
        setScannerActive(false);
      }
    } else {
      setScannerActive(false);
      setIsScanning(false);
    }
  };

  const toggleScanner = async () => {
    if (scannerActive) {
      await stopScanner();
    } else {
      setScannerActive(true);
    }
  };

  const handleSearch = async (query = searchQuery) => {
    const searchTerm = String(query).trim();
    if (!searchTerm) return;

    setIsLoading(true);

    try {
      // Fetch directly from Supabase for real-time accuracy
      const { data: foundReservations, error } = await supabase
        .from('reservation')
        .select('*')
        .eq('reservation_no', searchTerm)
        .limit(1);

      if (error) throw error;

      if (!foundReservations || foundReservations.length === 0) {
        return Swal.fire("Not Found", "Reservation does not exist.", "error");
      }

      const found = foundReservations[0];

      // ✅ Just show the modal immediately
      setSelectedReservation(found);
      setShowSuggestions(false);

    } catch (err) {
      console.error("Error fetching reservation:", err);
      Swal.fire("Error", "Failed to fetch reservation. Try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (reservation) => {
    setSearchQuery(reservation.reservation_no);
    setShowSuggestions(false);
    handleSearch(reservation.reservation_no);
  };

  const handleCheckInClick = () => {
    const refNo = selectedReservation.paymentMethod === 'Cash' &&
      selectedReservation.payment_type === 'Full Payment'
      ? generateReferenceNumber()
      : null;
    setGeneratedRefNo(refNo);
    setConfirmationModal(true);
  };

  const generateReferenceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    return `${year}${month}${day}${hour}${minute}${second}${random}`;
  };

  const handleConfirmCheckIn = async () => {
    if (!selectedReservation) return;

    const paymentMethod = selectedReservation.paymentMethod;
    const paymentType = selectedReservation.payment_type;

    if (paymentMethod === 'GCash' && !gcashRefNo.trim()) {
      return Swal.fire("Error", "Please enter GCash Reference Number", "error");
    }

    if (paymentMethod === 'Cash' && paymentType === 'Full Payment') {
      try {
        const { error } = await supabase
          .from('reservation')
          .update({
            status: 'approved',
            payment_status: true,
            reference_no: generatedRefNo
          })
          .eq('id', selectedReservation.id);

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: 'Check-in Successful!',
          html: `<div style="text-align: left;">
            <p style="margin-bottom: 10px;">Customer checked in and payment marked as complete.</p>
            <p style="margin-top: 15px; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">
              <strong>Reference No:</strong> ${generatedRefNo}
            </p>
          </div>`,
          timer: 3000,
          showConfirmButton: false
        });

        fetchReservations();
        setSelectedReservation(null);
        setConfirmationModal(false);
        setGcashRefNo('');
      } catch (error) {
        console.error('Error during check-in:', error);
        Swal.fire("Error", "Check-in failed. Please try again.", "error");
      }
    } else if (paymentMethod === 'GCash') {
      try {
        const { error } = await supabase
          .from('reservation')
          .update({
            status: 'approved',
            reference_no: gcashRefNo
          })
          .eq('id', selectedReservation.id);

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: 'Check-in Successful!',
          html: `<div style="text-align: left;">
            <p style="margin-bottom: 10px;">Customer checked in.</p>
            <p style="margin-top: 15px; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">
              <strong>GCash Ref No:</strong> ${gcashRefNo}
            </p>
          </div>`,
          timer: 3000,
          showConfirmButton: false
        });

        fetchReservations();
        setSelectedReservation(null);
        setConfirmationModal(false);
        setGcashRefNo('');
      } catch (error) {
        console.error('Error during check-in:', error);
        Swal.fire("Error", "Check-in failed. Please try again.", "error");
      }
    } else {
      try {
        const { error } = await supabase
          .from('reservation')
          .update({ status: 'approved' })
          .eq('id', selectedReservation.id);

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: 'Check-in Successful!',
          text: 'Customer checked in.',
          timer: 2000,
          showConfirmButton: false
        });

        fetchReservations();
        setSelectedReservation(null);
        setConfirmationModal(false);
        setGcashRefNo('');
      } catch (error) {
        console.error('Error during check-in:', error);
        Swal.fire("Error", "Check-in failed. Please try again.", "error");
      }
    }
  };

  const saveAsImage = async () => {
    const card = cardRef.current;

    const canvas = await html2canvas(card, {
      scale: 4,
      useCORS: true
    });

    const maxWidth = 1000;
    const scaleFactor = maxWidth / canvas.width;

    const outputCanvas = document.createElement("canvas");
    const ctx = outputCanvas.getContext("2d");

    outputCanvas.width = maxWidth;
    outputCanvas.height = canvas.height * scaleFactor;

    ctx.drawImage(
      canvas,
      0,
      0,
      outputCanvas.width,
      outputCanvas.height
    );

    const image = outputCanvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = image;
    link.download = `reservation_${selectedReservation.reservation_no}.png`;
    link.click();
  };

  const downloadPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const card = cardRef.current;

    html2canvas(card, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`reservation_${selectedReservation.reservation_no}.pdf`);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6 flex justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-xl z-50">
          <div className="text-gray-700 font-medium animate-pulse">Verifying...</div>
        </div>
      )}

      {/* Left Section (Scanner + Manual Search) */}
      <div className="bg-white shadow-xl rounded-2xl p-6 w-[430px] h-[600px]">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">QR Code Verification</h1>

        {/* GCash-style QR Scanner */}
        <div className="rounded-xl overflow-hidden mb-4 relative" style={{ height: '250px' }}>
          {scannerActive ? (
            <div className="relative w-full h-full">
              <div id="qr-reader" className="w-full h-full"></div>
              {/* GCash-style scanning frame overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[250px] h-[250px]">
                    {/* Corner borders - GCash style */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>

                    {/* Scanning line animation */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-scan"></div>
                  </div>
                </div>

                {/* Instructions text */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-white text-sm font-semibold bg-black/60 px-4 py-2 rounded-full inline-block">
                    Align QR code within frame
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border-2 border-dashed border-blue-300 h-full flex flex-col justify-center items-center">
              <div className="relative">
                <QrCode size={60} className="text-blue-500" />
                {/* Decorative scan lines */}
                <div className="absolute -inset-2 border-2 border-blue-300 rounded-lg opacity-50"></div>
                <div className="absolute -inset-4 border-2 border-blue-200 rounded-lg opacity-30"></div>
              </div>
              <p className="text-blue-700 font-semibold text-base mt-4">Scan QR Code</p>
              <p className="text-blue-500 text-xs mt-1">Position QR code within frame</p>
            </div>
          )}
        </div>

        <button
          onClick={toggleScanner}
          disabled={cameraDevices.length === 0}
          className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${cameraDevices.length === 0
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : scannerActive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          <QrCode size={18} />
          {scannerActive ? "Stop Scanner" : cameraDevices.length === 0 ? "No Camera Detected" : "Start Scanner"}
        </button>

        {cameraDevices.length > 1 && !scannerActive && (
          <div className="mt-3">
            <select
              value={selectedCamera || ''}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {cameraDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label || `Camera ${device.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mt-4 mb-2">OR</p>

        {/* Real-time Search with Suggestions */}
        <div className="relative" ref={searchRef}>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search reservation number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                onFocus={() => searchQuery && setShowSuggestions(true)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition font-semibold"
            >
              Verify
            </button>
          </div>

          {/* Real-time Suggestions Dropdown */}
          {showSuggestions && filteredReservations.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {filteredReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  onClick={() => handleSuggestionClick(reservation)}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800">{reservation.reservation_no}</p>
                      <p className="text-xs text-gray-500">Table {reservation.table_id} • {reservation.reservation_date}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                      {reservation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL FOR RESERVATION DETAILS */}
      {selectedReservation && !confirmationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[600px] relative">

            <button
              onClick={() => setSelectedReservation(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X size={22} />
            </button>

            <div ref={cardRef}>
              <h2 className="text-2xl font-bold text-green-600 flex items-center gap-2">
                <CheckCircle size={26} className="text-green-500" />
                Reservation Verified
              </h2>

              <div className="mt-4 space-y-2 text-gray-700">
                <Detail label="Reservation No" value={selectedReservation.reservation_no || "N/A"} />
                <Detail label="Reservation ID" value={`#${selectedReservation.id}`} />
                <Detail label="Table" value={`Table ${selectedReservation.table_id}`} />
                <Detail label="Date" value={selectedReservation.reservation_date} />
                <Detail label="Start Time" value={selectedReservation.start_time} />
                <Detail label="Duration" value={`${selectedReservation.duration} hr(s)`} />
                <Detail label="Payment Method" value={selectedReservation.paymentMethod || "N/A"} />
                <Detail label="Payment Type" value={selectedReservation.payment_type || "N/A"} />
                <Detail label="Total Bill" value={`₱${selectedReservation.total_bill || 0}`} />
                <Detail label="Payment Status" value={selectedReservation.payment_status ? "Paid" : "Pending"} />
                <Detail label="Billiard Type" value={selectedReservation.billiard_type || "N/A"} />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={downloadPDF}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Download PDF
              </button>

              <button
                onClick={saveAsImage}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition"
              >
                Save Image
              </button>

              <button
                onClick={() => setShowProofModal(true)}
                className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition flex items-center justify-center gap-2"
              >
                {selectedReservation.proof_of_payment ? (
                  <>
                    <FileImage size={18} />
                    View Proof
                  </>
                ) : (
                  <>
                    <FolderOpen size={18} />
                    No Proof
                  </>
                )}
              </button>
            </div>

            {/* <button
              onClick={handleCheckInClick}
              className="mt-4 w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition"
            >
              Check-in Customer
            </button> */}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {selectedReservation && confirmationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[500px] relative">

            <button
              onClick={() => setConfirmationModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X size={22} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <AlertCircle size={28} className="text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">Confirm Check-in</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <Detail label="Reservation No" value={selectedReservation.reservation_no || "N/A"} />
              <Detail label="Table" value={`Table ${selectedReservation.table_id}`} />
              <Detail label="Payment Method" value={selectedReservation.paymentMethod || "N/A"} />
              <Detail label="Payment Type" value={selectedReservation.payment_type || "N/A"} />
              <Detail label="Total Bill" value={`₱${selectedReservation.total_bill || 0}`} />
              {generatedRefNo && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded p-2 mt-3">
                  <Detail label="Reference No" value={generatedRefNo} />
                </div>
              )}
            </div>

            {selectedReservation.paymentMethod === 'GCash' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  GCash Reference Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter GCash Reference Number"
                  value={gcashRefNo}
                  onChange={(e) => setGcashRefNo(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {selectedReservation.paymentMethod === 'Cash' && selectedReservation.payment_type === 'Full Payment' && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-700 font-semibold text-sm">
                  ✓ Payment will be marked as <strong>COMPLETE</strong> upon check-in
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmationModal(false)}
                className="flex-1 py-3 bg-gray-300 text-gray-800 rounded-xl font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCheckIn}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition"
              >
                Confirm Check-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROOF OF PAYMENT MODAL */}
      {selectedReservation && showProofModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[700px] max-h-[90vh] overflow-y-auto relative">

            <button
              onClick={() => setShowProofModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black z-10"
            >
              <X size={22} />
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileImage size={26} className="text-amber-600" />
              Proof of Payment
            </h2>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <Detail label="Reservation No" value={selectedReservation.reservation_no || "N/A"} />
              <Detail label="Payment Method" value={selectedReservation.paymentMethod || "N/A"} />
            </div>

            {selectedReservation.proof_of_payment ? (
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <img
                  src={selectedReservation.proof_of_payment}
                  alt="Proof of Payment"
                  className="w-full h-auto rounded-lg shadow-md"
                />
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                <FolderOpen size={60} className="text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg font-semibold">No Proof of Payment</p>
                <p className="text-gray-400 text-sm mt-2">Customer has not uploaded proof of payment yet.</p>
              </div>
            )}

            <button
              onClick={() => setShowProofModal(false)}
              className="mt-6 w-full py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-900 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add CSS for scanning animation */}
      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between border-b pb-1">
      <span className="font-medium text-sm">{label}:</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}