
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
  const [tableName, setTableName] = useState("");

  useEffect(() => {
    const fetchTableName = async () => {
      if (!selectedReservation?.table_id) return;

      const { data, error } = await supabase
        .from("billiard_table")
        .select("table_name")
        .eq("table_id", selectedReservation.table_id)
        .single();

      if (!error && data) {
        setTableName(data.table_name);
      }
    };

    fetchTableName();
  }, [selectedReservation?.table_id]);

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

  const onScanSuccess = (decodedText) => {
    let searchValue = decodedText;

    // Try to parse as JSON to extract reservationNo
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.reservationNo) {
        searchValue = parsed.reservationNo;
      }
    } catch (e) {
      // If not valid JSON, use the raw text
      searchValue = decodedText;
    }

    // Set the search query to the extracted reservation number
    setSearchQuery(searchValue);
    // Automatically search using the scanned QR code
    handleSearch(searchValue);
    // Stop the scanner after successful scan
    stopScanner();
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

    const found = reservations.find(r => r.reservation_no === searchTerm);

    if (!found) {
      // Show verification dialog
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Double Check Required',
        html: `
    <div style="text-align: left;">
      <p style="margin-bottom: 15px;">Reservation number not found in the system.</p>
      <p style="margin-bottom: 10px;"><strong>Scanned/Entered:</strong></p>
      <div style="padding: 12px; background-color: #f3f4f6; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 15px;">
        <code style="font-size: 16px; font-weight: 600; color: #1f2937;">${searchTerm}</code>
      </div>
      <p style="margin-bottom: 10px; font-size: 14px; color: #6b7280;">
        Please verify:
      </p>
      <ul style="margin-left: 20px; margin-bottom: 15px; font-size: 14px; color: #6b7280;">
        <li>The reservation number is correct</li>
        <li>The reservation exists in the system</li>
        <li>There are no typos in the number</li>
      </ul>
    </div>
  `,
        input: 'text',
        inputLabel: 'Re-type or correct the Reservation Number',
        inputValue: searchTerm,
        inputPlaceholder: 'Enter reservation number',
        showCancelButton: false,  // TANGGALIN ANG CANCEL BUTTON
        confirmButtonText: 'OK',  // PALITAN NG "OK"
        confirmButtonColor: '#3085d6',
        allowOutsideClick: true,  // PWEDE NA MAG-CLICK OUTSIDE
        allowEscapeKey: true,      // PWEDE NA ESC KEY
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return 'Please enter a reservation number';
          }
        },
        preConfirm: async (value) => {
          const trimmedValue = value.trim();
          const recheckFound = reservations.find(r => r.reservation_no === trimmedValue);

          if (!recheckFound) {
            Swal.showValidationMessage('Reservation number still not found. Please check again.');
            return false;
          }

          return recheckFound;
        }
      });

      if (result.isConfirmed && result.value) {
        const foundReservation = result.value;

        // Update search query
        setSearchQuery(foundReservation.reservation_no);

        // Check status and handle accordingly
        if (foundReservation.status === "ongoing") {
          const viewResult = await Swal.fire({
            icon: 'info',
            title: 'Reservation Ongoing',
            text: 'This reservation is currently ongoing.',
            showCancelButton: true,
            confirmButtonText: 'View Details',
            cancelButtonText: 'Close',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#6b7280'
          });

          if (viewResult.isConfirmed) {
            setSelectedReservation(foundReservation);
            setShowSuggestions(false);
          }
          return;
        }

        if (foundReservation.status !== "pending" && foundReservation.status !== "approved") {
          const viewResult = await Swal.fire({
            icon: 'warning',
            title: 'Invalid Status',
            text: `Reservation status: ${foundReservation.status}`,
            showCancelButton: true,
            confirmButtonText: 'View Details',
            cancelButtonText: 'Close',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#6b7280'
          });

          if (viewResult.isConfirmed) {
            setSelectedReservation(foundReservation);
            setShowSuggestions(false);
          }
          return;
        }

        // If pending or approved, show directly
        setSelectedReservation(foundReservation);
        setShowSuggestions(false);
      }
      return;
    }

    // If found on first try, check status
    if (found.status === "ongoing") {
      const viewResult = await Swal.fire({
        icon: 'info',
        title: 'Reservation Ongoing',
        text: 'This reservation is currently ongoing.',
        showCancelButton: true,
        confirmButtonText: 'View Details',
        cancelButtonText: 'Close',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6b7280'
      });

      if (viewResult.isConfirmed) {
        setSelectedReservation(found);
        setShowSuggestions(false);
      }
      return;
    }

    if (found.status !== "pending" && found.status !== "approved") {
      const viewResult = await Swal.fire({
        icon: 'warning',
        title: 'Invalid Status',
        text: `Reservation status: ${found.status}`,
        showCancelButton: true,
        confirmButtonText: 'View Details',
        cancelButtonText: 'Close',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6b7280'
      });

      if (viewResult.isConfirmed) {
        setSelectedReservation(found);
        setShowSuggestions(false);
      }
      return;
    }

    // If pending or approved, show directly
    setSelectedReservation(found);
    setShowSuggestions(false);
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
            status: 'pending',
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
            status: 'pending',
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
          .update({ status: 'pending' })
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
    <div className="flex justify-center min-h-screen p-6 bg-gradient-to-br from-slate-100 to-slate-200">

      {/* Left Section (Scanner + Manual Search) */}
      <div className="bg-white shadow-xl rounded-2xl p-6 w-[430px] h-[600px]">
        <h1 className="mb-4 text-2xl font-bold text-gray-800">QR Code Verification</h1>

        {/* GCash-style QR Scanner */}
        <div className="relative mb-4 overflow-hidden rounded-xl" style={{ height: '250px' }}>
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
                <div className="absolute left-0 right-0 text-center bottom-4">
                  <p className="inline-block px-4 py-2 text-sm font-semibold text-white rounded-full bg-black/60">
                    Align QR code within frame
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 border-2 border-blue-300 border-dashed bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
              <div className="relative">
                <QrCode size={60} className="text-blue-500" />
                {/* Decorative scan lines */}
                <div className="absolute border-2 border-blue-300 rounded-lg opacity-50 -inset-2"></div>
                <div className="absolute border-2 border-blue-200 rounded-lg -inset-4 opacity-30"></div>
              </div>
              <p className="mt-4 text-base font-semibold text-blue-700">Scan QR Code</p>
              <p className="mt-1 text-xs text-blue-500">Position QR code within frame</p>
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
              className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {cameraDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label || `Camera ${device.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="mt-4 mb-2 text-xs text-center text-gray-400">OR</p>

        {/* Real-time Search with Suggestions */}
        <div className="relative" ref={searchRef}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" size={18} />
              <input
                type="text"
                placeholder="Search reservation number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                onFocus={() => searchQuery && setShowSuggestions(true)}
                className="w-full py-2 pl-10 pr-4 transition-all border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              className="px-4 py-2 text-sm font-semibold text-white transition bg-gray-900 rounded-lg hover:bg-gray-800"
            >
              Verify
            </button>
          </div>

          {/* Real-time Suggestions Dropdown */}
          {showSuggestions && filteredReservations.length > 0 && (
            <div className="absolute z-10 w-full mt-2 overflow-y-auto bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60">
              {filteredReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  onClick={() => handleSuggestionClick(reservation)}
                  className="px-4 py-3 transition-colors border-b border-gray-100 cursor-pointer hover:bg-blue-50 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[600px] relative">

            <button
              onClick={() => setSelectedReservation(null)}
              className="absolute text-gray-500 top-4 right-4 hover:text-black"
            >
              <X size={22} />
            </button>

            <div ref={cardRef}>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-green-600">
                <CheckCircle size={26} className="text-green-500" />
                Reservation Verified
              </h2>

              <div className="mt-4 space-y-2 text-gray-700">
                <Detail label="Reservation No" value={selectedReservation.reservation_no || "N/A"} />
                <Detail label="Reservation ID" value={`#${selectedReservation.id}`} />
                <Detail label="Table" value={tableName ? tableName : `Table ${selectedReservation.table_id}`} />

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
                className="flex-1 py-3 font-semibold text-white transition bg-blue-600 rounded-xl hover:bg-blue-700"
              >
                Download PDF
              </button>

              <button
                onClick={saveAsImage}
                className="flex-1 py-3 font-semibold text-white transition bg-purple-600 rounded-xl hover:bg-purple-700"
              >
                Save Image
              </button>

              <button
                onClick={() => setShowProofModal(true)}
                className="flex items-center justify-center flex-1 gap-2 py-3 font-semibold text-white transition bg-amber-600 rounded-xl hover:bg-amber-700"
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

            <button
              onClick={() => setSelectedReservation(null)}
              className="w-full py-3 mt-4 font-semibold text-white transition bg-gray-800 rounded-xl hover:bg-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {selectedReservation && confirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[500px] relative">

            <button
              onClick={() => setConfirmationModal(false)}
              className="absolute text-gray-500 top-4 right-4 hover:text-black"
            >
              <X size={22} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <AlertCircle size={28} className="text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">Confirm Check-in</h2>
            </div>

            <div className="p-4 mb-6 space-y-3 rounded-lg bg-gray-50">
              <Detail label="Reservation No" value={selectedReservation.reservation_no || "N/A"} />
              <Detail label="Table" value={`Table ${selectedReservation.table_id}`} />
              <Detail label="Payment Method" value={selectedReservation.paymentMethod || "N/A"} />
              <Detail label="Payment Type" value={selectedReservation.payment_type || "N/A"} />
              <Detail label="Total Bill" value={`₱${selectedReservation.total_bill || 0}`} />
              {generatedRefNo && (
                <div className="p-2 mt-3 border-2 border-blue-200 rounded bg-blue-50">
                  <Detail label="Reference No" value={generatedRefNo} />
                </div>
              )}
            </div>

            {selectedReservation.paymentMethod === 'GCash' && (
              <div className="mb-6">
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  GCash Reference Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter GCash Reference Number"
                  value={gcashRefNo}
                  onChange={(e) => setGcashRefNo(e.target.value)}
                  className="w-full px-4 py-2 transition-all border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {selectedReservation.paymentMethod === 'Cash' && selectedReservation.payment_type === 'Full Payment' && (
              <div className="p-4 mb-6 border-2 border-green-200 rounded-lg bg-green-50">
                <p className="text-sm font-semibold text-green-700">
                  ✓ Payment will be marked as <strong>COMPLETE</strong> upon check-in
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmationModal(false)}
                className="flex-1 py-3 font-semibold text-gray-800 transition bg-gray-300 rounded-xl hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCheckIn}
                className="flex-1 py-3 font-semibold text-white transition bg-green-600 rounded-xl hover:bg-green-700"
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
              className="absolute z-10 text-gray-500 top-4 right-4 hover:text-black"
            >
              <X size={22} />
            </button>

            <h2 className="flex items-center gap-2 mb-4 text-2xl font-bold text-gray-800">
              <FileImage size={26} className="text-amber-600" />
              Proof of Payment
            </h2>

            <div className="p-4 mb-4 rounded-lg bg-gray-50">
              <Detail label="Reservation No" value={selectedReservation.reservation_no || "N/A"} />
              <Detail label="Payment Method" value={selectedReservation.paymentMethod || "N/A"} />
            </div>

            {selectedReservation.proof_of_payment ? (
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                <img
                  src={selectedReservation.proof_of_payment}
                  alt="Proof of Payment"
                  className="w-full h-auto rounded-lg shadow-md"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 bg-gray-100 border-2 border-gray-300 border-dashed rounded-lg">
                <FolderOpen size={60} className="mb-4 text-gray-400" />
                <p className="text-lg font-semibold text-gray-500">No Proof of Payment</p>
                <p className="mt-2 text-sm text-gray-400">Customer has not uploaded proof of payment yet.</p>
              </div>
            )}

            <button
              onClick={() => setShowProofModal(false)}
              className="w-full py-3 mt-6 font-semibold text-white transition bg-gray-800 rounded-xl hover:bg-gray-900"
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
    <div className="flex justify-between pb-1 border-b">
      <span className="text-sm font-medium">{label}:</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
