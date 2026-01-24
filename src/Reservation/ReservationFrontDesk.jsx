  import React, { useState, useEffect } from 'react';
  import { Search, Calendar, Filter, Eye, RefreshCw, X, Receipt, CheckCircle, Download } from 'lucide-react';
  import { supabase } from '../lib/supabaseClient';
  import Swal from 'sweetalert2';
  import { FileText } from 'lucide-react';
  import gcash from "../logo/gcashlogo.png";
  import { jsPDF } from 'jspdf';
  import autoTable from 'jspdf-autotable';

  export default function ReservationFrontDesk() {
    const [activeTab, setActiveTab] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTable, setSelectedTable] = useState('all');
    const [selectedDate, setSelectedDate] = useState('');
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [rejectReasons, setRejectReasons] = useState([]);
    const [exportFilter, setExportFilter] = useState('today'); // today, week, month
    const [tableMap, setTableMap] = useState({});
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedWeek, setSelectedWeek] = useState('');

    useEffect(() => {
      fetchReservations();
    }, []);

    useEffect(() => {
      const fetchRejectReasons = async () => {
        try {
          const { data, error } = await supabase
            .from('reject_frontdesk')
            .select('id, reason')
            .order('id', { ascending: true });

          if (error) throw error;

          const reasons = data.map(item => item.reason);
          setRejectReasons(reasons);
        } catch (error) {
          console.error('Error fetching reject reasons:', error);
          setRejectReasons([
            'Invalid Payment',
            'Duplicate Reservation',
            'Table Not Available',
            'Customer Request',
            'Incomplete Information',
            'Suspicious Activity',
            'Time Conflict',
            'Other'
          ]);
        }
      };

      fetchRejectReasons();
    }, []);

    useEffect(() => {
      const fetchTables = async () => {
        const { data, error } = await supabase
          .from("billiard_table")
          .select("table_id, table_name");

        if (!error && data) {
          const map = {};
          data.forEach(t => {
            map[t.table_id] = t.table_name;
          });
          setTableMap(map);
        }
      };

      fetchTables();
    }, []);

    const fetchReservations = async () => {
      setLoading(true);
      try {
        const { data: reservationData, error: reservationError } = await supabase
          .from('reservation')
          .select('*')
          .order('reservation_date', { ascending: false })
          .order('start_time', { ascending: true });

        if (reservationError) throw reservationError;

        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('account_id, email');

        const { data: customersData, error: customersError } = await supabase
          .from('customer')
          .select('customer_id, account_id, first_name, last_name, middle_name');

        if (accountsError) throw accountsError;
        if (customersError) throw customersError;

        const combinedData = reservationData.map(reservation => {
          const account = accountsData.find(acc => acc.account_id === reservation.account_id);
          const customer = customersData.find(c => c.account_id === reservation.account_id);
          return {
            ...reservation,
            accounts: {
              ...account,
              customer: customer || null
            }
          };
        });

        setReservations(combinedData);
      } catch (error) {
        console.error('Error fetching reservations:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleRefresh = async () => {
      setRefreshing(true);
      await fetchReservations();
      setRefreshing(false);
    };

    const handleViewDetails = (reservation) => {
      setSelectedReservation(reservation);
      setShowModal(true);
    };

    const handleViewReceipt = async (reservation) => {
      if (reservation.payment_method?.toLowerCase() !== 'gcash' || !reservation.proof_of_payment) {
        Swal.fire({
          icon: 'info',
          title: 'No Receipt',
          text: 'No payment receipt available for this reservation.',
        });
        return;
      }

      try {
        let imageUrl = reservation.proof_of_payment;

        if (!reservation.proof_of_payment.startsWith('data:')) {
          const { data, error } = await supabase.storage
            .from('payment-proofs')
            .getPublicUrl(reservation.proof_of_payment);

          if (error) throw error;
          imageUrl = data.publicUrl;
        }

        const img = new Image();
        img.onload = () => {
          Swal.fire({
            title: 'Payment Receipt',
            html: `
            <div class="text-left mb-4">
              <p class="text-sm text-gray-600"><strong>Reference No:</strong> ${reservation.reference_no || 'N/A'}</p>
              <p class="text-sm text-gray-600"><strong>Amount:</strong> ₱${reservation.total_bill || 0}</p>
            </div>
            <img src="${imageUrl}" alt="Payment Receipt" class="w-full rounded-lg" />
          `,
            width: 600,
            confirmButtonText: 'Close',
            confirmButtonColor: '#6366f1',
          });
        };

        img.onerror = () => {
          throw new Error('Failed to load receipt image');
        };

        img.src = imageUrl;

      } catch (error) {
        console.error('Error loading receipt:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load payment receipt',
        });
      }
    };

    const filteredReservations = reservations.filter(res => {
      const matchesStatus = res.status === activeTab;
      const customerName = `${res.accounts?.customer?.first_name || ''} ${res.accounts?.customer?.last_name || ''}`.toLowerCase();
      const matchesSearch = customerName.includes(searchQuery.toLowerCase()) ||
        res.id.toString().includes(searchQuery);
      const matchesTable = selectedTable === 'all' || res.table_id.toString() === selectedTable;
      const matchesDate = !selectedDate || res.reservation_date === selectedDate;

      return matchesStatus && matchesSearch && matchesTable && matchesDate;
    });

    const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedReservations = filteredReservations.slice(startIndex, endIndex);

    useEffect(() => {
      setCurrentPage(1);
    }, [activeTab, searchQuery, selectedTable, selectedDate]);

    const getStatusCount = (status) => {
      return reservations.filter(r => r.status === status).length;
    };
const handleApprove = async (id, payment_method, referenceNo) => {
  const generateNumericRefNo = () => {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  };

  let finalRefNo = referenceNo;

  /* ================================
     STEP 1: PAYMENT VALIDATION
  ================================= */
  if (payment_method?.toLowerCase() === "gcash") {
    if (!referenceNo) {
      Swal.fire({
        icon: "error",
        title: "Missing Reference Number",
        text: "Please upload a GCash receipt with a valid reference number first.",
      });
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: "Verify GCash Payment",
      html: `
        <div style="text-align: left; padding: 20px; background-color: #f0f9ff; border-radius: 8px; margin: 10px 0;">
          <p style="margin: 10px 0;"><strong>Reference Number:</strong></p>
          <div style="background-color: white; padding: 12px; border-radius: 6px; border: 2px solid #3b82f6; font-weight: bold; font-size: 16px; letter-spacing: 1px;">
            ${referenceNo}
          </div>
        </div>
        <p style="margin-top: 15px; color: #666;">Please verify this matches the GCash receipt before approving.</p>
      `,
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Looks Good, Approve",
      cancelButtonText: "Cancel",
    });

    if (!isConfirmed) return;
    finalRefNo = referenceNo;
  } else if (payment_method?.toLowerCase() === "cash") {
    finalRefNo = referenceNo || generateNumericRefNo();
  }

  /* ================================
     STEP 2: FINAL CONFIRMATION
  ================================= */
  const confirm = await Swal.fire({
    title: "Approve Reservation?",
    html: `
      <div style="text-align: left;">
        <p>Are you sure you want to approve this reservation?</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 8px 0;"><strong>Payment Method:</strong> <span style="text-transform: uppercase;">${payment_method}</span></p>
          <p style="margin: 8px 0;"><strong>Reference No:</strong></p>
          <div style="background-color: white; padding: 10px; border-radius: 6px; border-left: 4px solid #10b981; font-weight: bold; font-size: 14px;">
            ${finalRefNo}
          </div>
        </div>
      </div>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#10b981",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "Yes, Approve",
    cancelButtonText: "Cancel",
  });

  if (!confirm.isConfirmed) return;

  try {
    /* ================================
       STEP 3: FETCH RESERVATION INFO
    ================================= */
    const { data: reservationData, error: fetchError } = await supabase
      .from("reservation")
      .select("account_id, reservation_no, payment_type")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    /* ================================
       STEP 4: DETERMINE PAYMENT STATUS
    ================================= */
    const isFullPayment = reservationData.payment_type?.toLowerCase().includes("full");
    const newPaymentStatus = isFullPayment ? "completed" : "pending";

    /* ================================
       STEP 5: UPDATE RESERVATION
    ================================= */
    const { error: updateError } = await supabase
      .from("reservation")
      .update({
        status: "approved",
        reference_no: finalRefNo,
        payment_status: newPaymentStatus,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    /* ================================
       STEP 6: INSERT NOTIFICATION
    ================================= */
    const notificationMessage = `Your reservation #${reservationData.reservation_no || id} has been APPROVED. Reference No: ${finalRefNo}`;

    const { error: notifError } = await supabase
      .from("notification")
      .insert({
        account_id: reservationData.account_id,
        reservation_no: reservationData.reservation_no || `#${id}`,
        message: notificationMessage,
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (notifError) {
      console.error("Notification insert failed:", notifError);
    }

    /* ================================
       STEP 7: SUCCESS UI
    ================================= */
    Swal.fire({
      icon: "success",
      title: "Approved!",
      html: `
        <p>Reservation approved successfully</p>
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin-top: 15px; border: 2px solid #10b981;">
          <p style="margin: 0; font-weight: bold;">Reference No:</p>
          <p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #10b981;">${finalRefNo}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Payment Status: <strong style="color: ${isFullPayment ? "#10b981" : "#f59e0b"};">${isFullPayment ? "Completed" : "Pending (Half Payment)"}</strong></p>
        </div>
      `,
      timer: 2500,
      showConfirmButton: false,
    });

    fetchReservations();
  } catch (error) {
    console.error("Error approving reservation:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to approve reservation",
    });
  }
};

const handleReject = async (id) => {
  const reservation = reservations.find(r => r.id === id);
  if (!reservation) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Reservation not found'
    });
    return;
  }

  /* ================================
     STEP 0: GET USER FROM LOCALSTORAGE & FETCH ROLE FROM DB
  ================================= */
  const userSessionStr = localStorage.getItem("userSession");
  if (!userSessionStr) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'User session not found. Please log in again.'
    });
    return;
  }

  const userSession = JSON.parse(userSessionStr);

  // ✅ Fetch role from accounts table based on account_id
  const { data: accountData, error: accountError } = await supabase
    .from("accounts")
    .select("role, email")
    .eq("account_id", userSession.account_id)
    .single();

  if (accountError) {
    console.error("Error fetching account role:", accountError);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to fetch user role from database.",
    });
    return;
  }

  const userRole = accountData?.role || "Unknown";

  // ✅ FINAL RULE:
  // 1. full_name kung meron
  // 2. ROLE from accounts table kung wala (Frontdesk / Manager)
  let rejectName = "Unknown";

  if (userSession.full_name && userSession.full_name.trim() !== "") {
    rejectName = userSession.full_name;
  } else {
    // Capitalize first letter ng role
    rejectName = userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase();
  }

  /* ================================
     STEP 1: FETCH REJECT REASONS
  ================================= */
  const { value: formValues } = await Swal.fire({
    title: 'Reject Reservation',
    icon: 'warning',
    width: 480,
    html: `
      <div style="text-align:left; padding:10px 5px; font-size:14px;">
        
        <div style="margin-bottom:18px;">
          <label style="font-weight:600; color:#374151; margin-bottom:6px; display:block;">
            Reason for Rejection <span style="color:#ef4444">*</span>
          </label>
          <select id="reject-reason"
            style="
              width:100%;
              padding:10px;
              border:1px solid #d1d5db;
              border-radius:6px;
              font-size:14px;
              outline:none;
            ">
            <option value="">Select reason</option>
            ${rejectReasons.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>

        <div>
          <label style="font-weight:600; color:#374151; margin-bottom:6px; display:block;">
            Additional Comments <span style="color:#9ca3af">(Optional)</span>
          </label>
          <textarea id="reject-comment"
            placeholder="Add any additional details..."
            style="
              width:100%;
              min-height:90px;
              padding:10px;
              border:1px solid #d1d5db;
              border-radius:6px;
              font-size:14px;
              resize:vertical;
            "></textarea>
        </div>

      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Reject Reservation',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    focusConfirm: false,
    preConfirm: () => {
      const reason = document.getElementById('reject-reason').value;
      const comment = document.getElementById('reject-comment').value;

      if (!reason) {
        Swal.showValidationMessage('Please select a reason for rejection');
        return false;
      }
      return { reason, comment };
    }
  });

  if (!formValues) return;

  const confirmResult = await Swal.fire({
    title: 'Confirm Rejection?',
    icon: 'warning',
    confirmButtonText: 'Yes, Reject',
    cancelButtonText: 'Go Back',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    html: `
      <div style="text-align:left; font-size:14px;">
        <p style="margin-bottom:10px; font-weight:600;">
          You are about to reject this reservation:
        </p>
        <div style="background:#f9fafb; padding:12px; border-radius:6px;">
          <p><strong>Reason:</strong> ${formValues.reason}</p>
          ${
            formValues.comment
              ? `<p style="margin-top:8px;"><strong>Comments:</strong><br>${formValues.comment}</p>`
              : ''
          }
          <p style="margin-top:8px;"><strong>Rejected By:</strong> ${rejectName}</p>
          <p style="margin-top:8px;"><strong>Role:</strong> ${userRole}</p>
        </div>
        <p style="margin-top:12px; color:#991b1b; font-size:13px;">
          This action cannot be undone.
        </p>
      </div>
    `
  });

  if (!confirmResult.isConfirmed) return;

  try {
    // ✅ Update reservation status WITH Reject_Name as ROLE
    const { error: updateError } = await supabase
      .from('reservation')
      .update({
        status: 'rejected',
        remark_reject: formValues.reason,
        reject_comment: formValues.comment || null,
        Reject_Name: userRole // ✅ Store the role: "frontdesk" or "manager"
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Create notification for the customer
    const notificationMessage = formValues.comment 
      ? `Your reservation #${reservation.reservation_no || id} has been rejected by ${userRole}. Reason: ${formValues.reason}. ${formValues.comment}`
      : `Your reservation #${reservation.reservation_no || id} has been rejected by ${userRole}. Reason: ${formValues.reason}.`;
    
    const { error: notificationError } = await supabase
      .from('notification')
      .insert({
        account_id: reservation.account_id,
        message: notificationMessage,
        reservation_no: reservation.reservation_no || `#${id}`,
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    Swal.fire({
      icon: 'success',
      title: 'Reservation Rejected',
      text: 'The reservation has been successfully rejected and the customer has been notified.',
      timer: 2500,
      showConfirmButton: false
    });

    fetchReservations();
  } catch (error) {
    console.error('Error rejecting reservation:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to reject reservation'
    });
  }
};
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const formatTime = (timeString) => {
      if (!timeString) return 'N/A';
      return timeString;
    };

    const getDateRange = (filterType, customMonth = null, customWeek = null) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let startDate, endDate;

      if (filterType === 'today') {
        startDate = new Date(today);
        endDate = new Date(today);
      } else if (filterType === 'week') {
        if (customWeek) {
          // Parse custom week format "2025-W01"
          const [year, week] = customWeek.split('-W');
          const firstDayOfYear = new Date(parseInt(year), 0, 1);
          const daysOffset = (parseInt(week) - 1) * 7;
          const dayOfWeek = firstDayOfYear.getDay();
          const daysToMonday = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;

          startDate = new Date(firstDayOfYear);
          startDate.setDate(firstDayOfYear.getDate() + daysToMonday + daysOffset);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
        } else {
          // Current week
          const dayOfWeek = today.getDay();
          startDate = new Date(today);
          startDate.setDate(today.getDate() - dayOfWeek);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
        }
      } else if (filterType === 'month') {
        if (customMonth) {
          // Parse custom month format "2025-01"
          const [year, month] = customMonth.split('-');
          startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          endDate = new Date(parseInt(year), parseInt(month), 0);
        } else {
          // Current month
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
      }

      return { startDate, endDate };
    };

    const getAvailableMonths = () => {
      // Get unique months from reservations
      const months = new Set();
      reservations.forEach(res => {
        if (res.reservation_date && (res.status === 'pending' || res.status === 'approved')) {
          const date = new Date(res.reservation_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          months.add(monthKey);
        }
      });
      return Array.from(months).sort().reverse();
    };

    const getAvailableWeeks = () => {
      // Get unique weeks from reservations
      const weeks = new Set();
      reservations.forEach(res => {
        if (res.reservation_date && (res.status === 'pending' || res.status === 'approved')) {
          const date = new Date(res.reservation_date);
          const weekNumber = getWeekNumber(date);
          const weekKey = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
          weeks.add(weekKey);
        }
      });
      return Array.from(weeks).sort().reverse();
    };

    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    const formatMonthLabel = (monthKey) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const formatWeekLabel = (weekKey) => {
      const [year, week] = weekKey.split('-W');
      const { startDate, endDate } = getDateRange('week', null, weekKey);
      return `Week ${week}, ${year} (${formatDate(formatDateForDB(startDate))} - ${formatDate(formatDateForDB(endDate))})`;
    };

    const formatDateForDB = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const handleExportPDF = async () => {
      try {
        const { startDate, endDate } = getDateRange(exportFilter, selectedMonth, selectedWeek);
        const startDateStr = formatDateForDB(startDate);
        const endDateStr = formatDateForDB(endDate);

        const { data: reservationData, error: reservationError } = await supabase
          .from('reservation')
          .select('*')
          .in('status', ['pending', 'approved'])
          .gte('reservation_date', startDateStr)
          .lte('reservation_date', endDateStr)
          .order('reservation_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (reservationError) {
          console.error('Reservation Error:', reservationError);
          throw reservationError;
        }

        if (!reservationData || reservationData.length === 0) {
          Swal.fire({
            icon: 'info',
            title: 'No Data',
            text: `No pending or approved reservations found for the selected period.`,
          });
          setShowExportModal(false);
          return;
        }

        const { data: accountsData } = await supabase
          .from('accounts')
          .select('account_id, email');

        const { data: customersData } = await supabase
          .from('customer')
          .select('customer_id, account_id, first_name, last_name, middle_name');

        const { data: tablesData } = await supabase
          .from('billiard_table')
          .select('table_id, table_name');

        const combinedData = reservationData.map(reservation => {
          const account = accountsData?.find(acc => acc.account_id === reservation.account_id);
          const customer = customersData?.find(c => c.account_id === reservation.account_id);
          const table = tablesData?.find(t => t.table_id === reservation.table_id);
          return {
            ...reservation,
            customerName: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'N/A',
            email: account?.email || 'N/A',
            tableName: table?.table_name || `Table ${reservation.table_id}`
          };
        });

        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();

        let filterTitle = '';
        if (exportFilter === 'today') {
          filterTitle = `Today's Reservations - ${formatDate(startDateStr)}`;
        } else if (exportFilter === 'week') {
          if (selectedWeek && selectedWeek !== 'current') {
            filterTitle = `Weekly Reservations - ${formatWeekLabel(selectedWeek)}`;
          } else {
            filterTitle = `Weekly Reservations - ${formatDate(startDateStr)} to ${formatDate(endDateStr)}`;
          }
        } else {
          if (selectedMonth && selectedMonth !== 'current') {
            filterTitle = `Monthly Reservations - ${formatMonthLabel(selectedMonth)}`;
          } else {
            filterTitle = `Monthly Reservations - ${new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
          }
        }

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Reservation Report', pageWidth / 2, 15, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(filterTitle, pageWidth / 2, 22, { align: 'center' });
        doc.text(`Status: Pending & Approved Only`, pageWidth / 2, 28, { align: 'center' });

        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, pageWidth / 2, 33, { align: 'center' });

        const tableData = combinedData.map((res, index) => [
          index + 1,
          res.reservation_no || `#${res.id}`,
          res.customerName,
          res.tableName,
          res.billiard_type?.charAt(0).toUpperCase() + res.billiard_type?.slice(1) || 'Standard',
          formatDate(res.reservation_date),
          formatTime(res.start_time),
          `${res.duration} hrs`,
          `P${(res.total_bill || 0).toFixed(2)}`,
          res.payment_method?.toUpperCase() || 'N/A',
          res.status.charAt(0).toUpperCase() + res.status.slice(1),
          res.reference_no || '-'
        ]);

        autoTable(doc, {
          startY: 38,
          head: [['#', 'Res. No', 'Customer', 'Table', 'Type', 'Date', 'Time', 'Duration', 'Amount', 'Payment', 'Status', 'Ref. No']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [0, 0, 0],
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2,
            textColor: [0, 0, 0]
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35 },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 25, halign: 'center' },
            6: { cellWidth: 20, halign: 'center' },
            7: { cellWidth: 18, halign: 'center' },
            8: { cellWidth: 22, halign: 'right' },
            9: { cellWidth: 22, halign: 'center' },
            10: { cellWidth: 22, halign: 'center' },
            11: { cellWidth: 25, halign: 'center' }
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          },
          margin: { left: 10, right: 10 }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Summary:', 15, finalY);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Reservations: ${combinedData.length}`, 15, finalY + 6);
        doc.text(`Pending: ${combinedData.filter(r => r.status === 'pending').length}`, 15, finalY + 12);
        doc.text(`Approved: ${combinedData.filter(r => r.status === 'approved').length}`, 15, finalY + 18);

        const totalAmount = combinedData.reduce((sum, res) => sum + (res.total_bill || 0), 0);
        doc.text(`Total Amount: P${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 15, finalY + 24);

        const fileName = `Reservations_${exportFilter}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

        Swal.fire({
          icon: 'success',
          title: 'PDF Generated!',
          text: `Successfully exported ${combinedData.length} reservations`,
          timer: 2000,
          showConfirmButton: false
        });

        setShowExportModal(false);
        setSelectedMonth('');
        setSelectedWeek('');

      } catch (error) {
        console.error('Error generating PDF:', error);
        Swal.fire({
          icon: 'error',
          title: 'Export Failed',
          text: error.message || 'Failed to generate PDF report',
        });
        setShowExportModal(false);
      }
    };

    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-700 font-semibold text-lg">Loading reservations...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Reservation Management</h1>
              <p className="text-gray-600 text-sm mt-1">Manage and track all customer reservations</p>
            </div>
            <div className="flex gap-3">
              {/* Export PDF Button */}
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all font-semibold shadow-lg"
              >
                <Download size={20} />
                Export PDF
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-5 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all font-semibold shadow-lg disabled:opacity-50"
              >
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Filter size={20} />
            Search & Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Table</label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              >
                <option value="all">All Tables</option>
                {Object.entries(tableMap).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search Customer</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <TabButton
            active={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
            label="Pending"
            count={getStatusCount('pending')}
            color="bg-yellow-100 text-yellow-700 border-yellow-200"
          />
          <TabButton
            active={activeTab === 'approved'}
            onClick={() => setActiveTab('approved')}
            label="Approved"
            count={getStatusCount('approved')}
            color="bg-blue-100 text-blue-700 border-blue-200"
          />

          <TabButton
            active={activeTab === 'completed'}
            onClick={() => setActiveTab('completed')}
            label="Completed"
            count={getStatusCount('completed')}
            color="bg-gray-100 text-gray-700 border-gray-200"
          />
        </div>

        {/* Reservations Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Reservation #</th>

                  <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Table</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Payment</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedReservations.length > 0 ? (
                  paginatedReservations.map((reservation) => {
                    const customerName = `${reservation.accounts?.customer?.first_name || ''} ${reservation.accounts?.customer?.last_name || ''}`.trim() || 'N/A';

                    return (
                      <tr key={reservation.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">#{reservation.id}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">#{reservation.reservation_no}</td>



                        <td className="px-4 py-3 text-sm text-gray-700">{customerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {tableMap[reservation.table_id] || `Table ${reservation.table_id}`}
                          <span className="text-xs text-gray-500 ml-1 capitalize">
                            ({reservation.billiard_type || 'Standard'})
                          </span>
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(reservation.reservation_date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatTime(reservation.start_time)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{reservation.duration} hrs</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-800">₱{reservation.total_bill || 0}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            {/* Payment Method Badge */}
                            <span
                              className={`px-4 py-2 rounded-full text-xs font-bold capitalize inline-flex items-center gap-2 ${reservation.payment_method?.toLowerCase() === "gcash"
                                ? "bg-gradient-to-r from-white to-blue-200 text-black shadow-md"
                                : "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md"
                                }`}
                            >
                              {reservation.payment_method?.toLowerCase() === "gcash" && (
                                <img
                                  src={gcash}
                                  alt="GCash Logo"
                                  className="w-5 h-5 object-contain"
                                />
                              )}

                              {reservation.payment_method || "N/A"}
                            </span>



                            {/* Receipt Button - Only for GCash */}
                            {reservation.payment_method?.toLowerCase() === 'gcash' && (
                              <button
                                onClick={() => handleViewReceipt(reservation)}
                                className="p-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                                title="View GCash Receipt"
                              >
                                <FileText size={18} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleViewDetails(reservation)}
                              className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>

                            {activeTab === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(reservation.id, reservation.payment_method, reservation.reference_no)}
                                  className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-all"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(reservation.id)}
                                  className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-all"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="px-4 py-12 text-center text-gray-500">
                      No reservations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredReservations.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(endIndex, filteredReservations.length)}</span> of{' '}
                <span className="font-semibold">{filteredReservations.length}</span> results
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>

                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNum = index + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${currentPage === pageNum
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === currentPage - 2 ||
                      pageNum === currentPage + 2
                    ) {
                      return <span key={pageNum} className="px-2 text-gray-500">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {showModal && selectedReservation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold">Reservation Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Customer Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-3 text-lg">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Full Name</p>
                      <p className="text-gray-800 font-semibold">{`${selectedReservation.accounts?.customer?.first_name || ''} ${selectedReservation.accounts?.customer?.last_name || ''}`.trim() || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Email</p>
                      <p className="text-gray-800 font-semibold">{selectedReservation.accounts?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Reservation Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-3 text-lg">Reservation Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Reservation Number</p>
                      <p className="text-gray-800 font-semibold">{selectedReservation.reservation_no || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Payment Status</p>
                      <p className={`font-semibold capitalize px-2 py-1 rounded w-fit text-sm ${selectedReservation.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        selectedReservation.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          selectedReservation.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>{selectedReservation.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Date</p>
                      <p className="text-gray-800 font-semibold">{formatDate(selectedReservation.reservation_date)}</p>
                    </div>
                  </div>
                </div>

                {/* Table & Billiard Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-3 text-lg">Table Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Table</p>
                      <p className="text-gray-800 font-semibold">
                        {tableMap[selectedReservation.table_id] || `Table ${selectedReservation.table_id}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Billiard Type</p>
                      <p className="text-gray-800 font-semibold capitalize">{selectedReservation.billiard_type || 'Standard'}</p>
                    </div>
                  </div>
                </div>

                {/* Time Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-3 text-lg">Time Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Start Time</p>
                      <p className="text-gray-800 font-semibold">{formatTime(selectedReservation.start_time)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">End Time</p>
                      <p className="text-gray-800 font-semibold">{selectedReservation.time_end || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Duration</p>
                      <p className="text-gray-800 font-semibold">{selectedReservation.duration} hours</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Extension</p>
                      <p className="text-gray-800 font-semibold">{selectedReservation.extension ? `${selectedReservation.extension} hours` : 'None'}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                {/* Payment Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-3 text-lg">Payment Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Total Bill</p>
                      <p className="text-gray-800 font-semibold text-lg">₱{selectedReservation.total_bill || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Payment Method</p>
                      <p className="text-gray-800 font-semibold capitalize">{selectedReservation.payment_method || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Payment Type</p>
                      <p className="text-gray-800 font-semibold capitalize">{selectedReservation.payment_type || 'N/A'}</p>
                    </div>

                    {/* ✅ FIXED: Show Full Payment or Half Payment based on payment_type */}
                    {selectedReservation.payment_type?.toLowerCase().includes('full') ? (
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Full Payment</p>
                        <p className="text-gray-800 font-semibold">₱{selectedReservation.full_amount || selectedReservation.total_bill || 0}</p>
                      </div>
                    ) : selectedReservation.payment_type?.toLowerCase().includes('half') ? (
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Half Payment</p>
                        <p className="text-gray-800 font-semibold">₱{selectedReservation.half_amount || (selectedReservation.total_bill ? Math.ceil(selectedReservation.total_bill / 2) : 0)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Amount Paid</p>
                        <p className="text-gray-800 font-semibold">₱{selectedReservation.full_amount || selectedReservation.half_amount || 0}</p>
                      </div>
                    )}

                    {/* ✅ Show Reference Number if available */}
                    {selectedReservation.reference_no && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-600 uppercase tracking-wide">Reference Number</p>
                        <p className="text-gray-800 font-semibold font-mono">{selectedReservation.reference_no}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-3 text-lg">Additional Information</h3>
                  <div className="grid grid-cols-2 gap-4">
            
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Created At</p>
                      <p className="text-gray-800 font-semibold">{formatDate(selectedReservation.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-100 p-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex justify-between items-center rounded-t-xl">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Download size={24} />
                  Export PDF Report
                </h2>
                <button
                  onClick={() => {
                    setShowExportModal(false);
                    setSelectedMonth('');
                    setSelectedWeek('');
                  }}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Select Export Period</label>

                  {/* Today Button */}
                  <button
                    onClick={() => {
                      setExportFilter('today');
                      setSelectedMonth('');
                      setSelectedWeek('');
                    }}
                    className={`w-full px-4 py-3 rounded-lg text-left font-semibold transition-all mb-2 ${exportFilter === 'today' && !selectedMonth && !selectedWeek
                        ? 'bg-green-100 border-2 border-green-500 text-green-700'
                        : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <Calendar size={18} className="inline mr-2" />
                    Today
                  </button>

                  {/* Week Selection */}
                  <div className="mb-2">
                    <button
                      onClick={() => {
                        setExportFilter('week');
                        setSelectedMonth('');
                        if (!selectedWeek) setSelectedWeek('current');
                      }}
                      className={`w-full px-4 py-3 rounded-lg text-left font-semibold transition-all ${exportFilter === 'week'
                          ? 'bg-green-100 border-2 border-green-500 text-green-700'
                          : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <Calendar size={18} className="inline mr-2" />
                      Week
                    </button>

                    {exportFilter === 'week' && (
                      <div className="mt-2 ml-6">
                        <select
                          value={selectedWeek}
                          onChange={(e) => setSelectedWeek(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="current">Current Week</option>
                          {getAvailableWeeks().map(week => (
                            <option key={week} value={week}>
                              {formatWeekLabel(week)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Month Selection */}
                  <div>
                    <button
                      onClick={() => {
                        setExportFilter('month');
                        setSelectedWeek('');
                        if (!selectedMonth) setSelectedMonth('current');
                      }}
                      className={`w-full px-4 py-3 rounded-lg text-left font-semibold transition-all ${exportFilter === 'month'
                          ? 'bg-green-100 border-2 border-green-500 text-green-700'
                          : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <Calendar size={18} className="inline mr-2" />
                      Month
                    </button>

                    {exportFilter === 'month' && (
                      <div className="mt-2 ml-6">
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="current">Current Month</option>
                          {getAvailableMonths().map(month => (
                            <option key={month} value={month}>
                              {formatMonthLabel(month)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Only <span className="font-bold">Pending</span> and <span className="font-bold">Approved</span> reservations will be included in the report.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 flex justify-end gap-3 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowExportModal(false);
                    setSelectedMonth('');
                    setSelectedWeek('');
                  }}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-all shadow-lg"
                >
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function TabButton({ active, onClick, label, count, color }) {
    return (
      <button
        onClick={onClick}
        className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all border-2 whitespace-nowrap ${active
          ? `${color} shadow-md scale-105`
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
      >
        {label} ({count})
      </button>
    );
  }