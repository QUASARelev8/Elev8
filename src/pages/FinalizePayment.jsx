import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, Hourglass, User, Calendar, CheckCircle, XCircle, Eye, RefreshCw, Plus, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';

export default function FinalizePayment() {
  // ============================================
  // ALL STATES AT THE TOP - COMPLETE LIST
  // ============================================
  const [activePayments, setActivePayments] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [completedPayments, setCompletedPayments] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedExtension, setSelectedExtension] = useState('');
  const [combinedData, setCombinedData] = useState([]);

  // SYNC PAYMENT STATES - MUST BE HERE
  const [syncing, setSyncing] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncedPayments, setSyncedPayments] = useState([]);

  // TAB & FILTER STATES
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'ongoing', 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'name'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'full', 'half'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9); // 9 items per page (3x3 grid)

  useEffect(() => {
    fetchPayments();
    fetchExtensions();
  }, []);

  const fetchExtensions = async () => {
    try {
      const { data, error } = await supabase
        .from('extensionTagging')
        .select('*');

      if (error) throw error;
      setExtensions(data || []);
    } catch (error) {
      console.error('Error fetching extensions:', error);
    }
  };

  const getExtensionPrice = (billiardType, hours) => {
    const extension = extensions.find(
      ext => ext.billiard_type === billiardType && parseFloat(ext.extension_hours) === parseFloat(hours)
    );
    return extension?.price || 0;
  };

  const getAvailableExtensions = (billiardType) => {
    return extensions.filter(ext => ext.billiard_type === billiardType);
  };

  const handleCancelReservation = async (reservationId) => {
    const result = await Swal.fire({
      title: 'Cancel Reservation?',
      text: 'Are you sure you want to cancel this reservation?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, cancel it!'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('reservation')
          .update({ status: 'cancelled' })
          .eq('id', reservationId);

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: 'Cancelled!',
          text: 'The reservation has been cancelled.',
          timer: 1500,
          showConfirmButton: false,
        });

        fetchPayments();
      } catch (error) {
        console.error('Error cancelling reservation:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to cancel reservation',
        });
      }
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservation')
        .select('*')
        .in('status', ['ongoing', 'approved', 'completed'])
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

      const active = combinedData.filter(r => r.status === 'ongoing');
      const pending = combinedData.filter(r => r.status === 'approved');
      const completed = combinedData.filter(r => r.status === 'completed');

      setActivePayments(active);
      setPendingPayments(pending);
      setCompletedPayments(completed);

      const { data: syncedData } = await supabase
        .from('payment')
        .select('reservation_id');

      setSyncedPayments(syncedData?.map(p => p.reservation_id) || []);

    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    await fetchExtensions();
    setRefreshing(false);
  };

  const handleEndSession = async (id) => {
    const payment = activePayments.find(p => p.id === id);
    if (!payment) return;

    const totalBill = payment.total_bill || 0;
    const paymentType = payment.payment_type;

    let totalPaid = 0;

    if (paymentType === 'Full Payment') {
      totalPaid = payment.full_amount || 0;
    } else if (paymentType === 'Half Payment') {
      totalPaid = payment.half_amount || 0;
    }

    if (totalPaid < totalBill) {
      const remaining = totalBill - totalPaid;

      const paymentChoice = await Swal.fire({
        icon: 'warning',
        title: 'Payment Incomplete!',
        html: `
      <div style="text-align: left; margin: 20px 0;">
        <p style="margin-bottom: 10px;"><strong>Cannot end session!</strong></p>
        <p style="margin-bottom: 8px;">Total Bill: <strong>₱${totalBill}</strong></p>
        <p style="margin-bottom: 8px;">Amount Paid: <strong>₱${totalPaid}</strong></p>
        <p style="margin-bottom: 8px; color: #d32f2f;">Remaining Balance: <strong>₱${remaining}</strong></p>
        <hr style="margin: 15px 0;">
        <p style="color: #666;">Please complete the full payment before ending the session.</p>
      </div>
    `,
        showCancelButton: true,
        confirmButtonText: 'Pay Now',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
      });

      if (!paymentChoice.isConfirmed) return;

      try {
        let updateData = {
          status: 'completed',
          payment_status: 'Completed',
          End_Session: true,
          End_Session_Notice: true
        };

        if (paymentType === 'Full Payment') {
          updateData.full_amount = totalBill;
        } else if (paymentType === 'Half Payment') {
          updateData.half_amount = totalBill;
        }

        const { error } = await supabase
          .from('reservation')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;

        await Swal.fire({
          icon: 'success',
          title: 'Payment Complete!',
          html: `
        <div style="text-align: center; margin: 20px 0;">
          <p style="margin-bottom: 10px;">Remaining balance of <strong>₱${remaining}</strong> has been paid.</p>
          <p style="color: #10b981; font-weight: bold;">Session completed successfully!</p>
        </div>
      `,
          timer: 2500,
          showConfirmButton: false
        });

        await supabase
          .from('transaction_history')
          .insert({
            table_id: payment.table_id,
            reservation_date: payment.reservation_date,
            start_time: payment.start_time,
            duration: payment.duration,
            status: 'completed',
            extension: payment.extension || 0,
            time_end: calculateEndTime(payment.start_time, payment.duration),
            paymentMethod: 'Cash',
            billiard_type: payment.billiard_type,
            amount: totalBill
          });

        fetchPayments();
        return;
      } catch (error) {
        console.error('Error processing payment:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to process payment. Please try again.',
          confirmButtonColor: '#ef4444'
        });
        return;
      }
    }

    const result = await Swal.fire({
      title: 'End Session?',
      text: 'Are you sure you want to end this session?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, end session',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('reservation')
        .update({
          status: 'completed',
          payment_status: 'Completed',
          End_Session: true,
          End_Session_Notice: true
        })
        .eq('id', id);

      if (error) throw error;

      await Swal.fire({
        icon: 'success',
        title: 'Session Ended!',
        text: 'The session has been completed successfully.',
        timer: 2000,
        showConfirmButton: false
      });

      await supabase
        .from('transaction_history')
        .insert({
          table_id: payment.table_id,
          reservation_date: payment.reservation_date,
          start_time: payment.start_time,
          duration: payment.duration,
          status: 'completed',
          extension: payment.extension || 0,
          time_end: calculateEndTime(payment.start_time, payment.duration),
          paymentMethod: payment.paymentMethod || 'Cash',
          billiard_type: payment.billiard_type,
          amount: totalBill
        });

      fetchPayments();
    } catch (error) {
      console.error('Error ending session:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to end session. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleExtensionClick = (payment) => {
    setSelectedPayment(payment);
    setSelectedExtension('');
    setPaymentAmount('');
    setShowExtensionModal(true);
  };

  const handleExtensionSubmit = async () => {
    if (!selectedExtension) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Extension Selected',
        text: 'Please select an extension duration.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    const extensionData = extensions.find(ext => ext.id === parseInt(selectedExtension));
    if (!extensionData) return;

    const paymentChoice = await Swal.fire({
      title: 'Extension Payment',
      html: `
      <div style="text-align: left; margin: 20px 0;">
        <p style="margin-bottom: 10px;"><strong>Extension Details:</strong></p>
        <p style="margin-bottom: 8px;">Hours: <strong>${extensionData.extension_hours} hour(s)</strong></p>
        <p style="margin-bottom: 8px;">Price: <strong>₱${extensionData.price}</strong></p>
        <p style="margin-bottom: 8px;">New Total: <strong>₱${(selectedPayment.total_bill || 0) + extensionData.price}</strong></p>
        <hr style="margin: 15px 0;">
        <p style="font-weight: bold; color: #2563eb;">When will customer pay for extension?</p>
      </div>
    `,
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Pay Now (Cash)',
      denyButtonText: 'Pay Later',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
    });

    if (paymentChoice.isDismissed) return;

    const payNow = paymentChoice.isConfirmed;

    try {
      const newTotalBill = (selectedPayment.total_bill || 0) + extensionData.price;
      const extensionHours = Math.round(parseFloat(extensionData.extension_hours));
      const newExtension = (selectedPayment.extension || 0) + extensionHours;
      const newDuration = selectedPayment.duration + extensionHours;

      let updateData = {
        extension: newExtension,
        duration: newDuration,
        total_bill: newTotalBill,
        status: 'ongoing',
      };

      if (payNow) {
        const paymentType = selectedPayment.payment_type;

        if (paymentType === 'Full Payment') {
          updateData.full_amount = newTotalBill;
        } else if (paymentType === 'Half Payment') {
          updateData.half_amount = newTotalBill;
        }

        updateData.paymentMethod = 'Cash';
        updateData.payment_status = 'Completed';
      }

      const { error } = await supabase
        .from('reservation')
        .update(updateData)
        .eq('id', selectedPayment.id);

      if (error) throw error;

      await Swal.fire({
        icon: 'success',
        title: payNow ? 'Extension Paid!' : 'Extension Added!',
        text: payNow
          ? 'Extension paid with cash. Session continues.'
          : 'Extension added. Payment can be settled later.',
        timer: 2000,
        showConfirmButton: false
      });

      await supabase
        .from('transaction_history')
        .insert({
          table_id: selectedPayment.table_id,
          reservation_date: selectedPayment.reservation_date,
          start_time: selectedPayment.start_time,
          duration: newDuration,
          status: 'ongoing',
          extension: newExtension,
          time_end: calculateEndTime(selectedPayment.start_time, newDuration),
          paymentMethod: payNow ? 'Cash' : 'Pending',
          billiard_type: selectedPayment.billiard_type,
          amount: newTotalBill
        });

      setShowExtensionModal(false);
      setSelectedPayment(null);
      fetchPayments();
    } catch (error) {
      console.error('Error adding extension:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to add extension. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleConfirmPaymentClick = (payment) => {
    setSelectedPayment(payment);
    setPaymentAmount('');
    setShowConfirmModal(true);
  };

  const handleConfirmPaymentSubmit = async () => {
    if (!selectedPayment) return;

    const paymentType = selectedPayment.payment_type;
    const totalBill = selectedPayment.total_bill || 0;

    if (paymentType === 'Full Payment') {
      const autoReferenceNo = `${Date.now()}`;

      const paymentConfirm = await Swal.fire({
        title: 'Process Full Payment',
        html: `
        <div style="text-align: left; padding: 20px;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Reference Number</p>
            <p style="margin: 5px 0; font-weight: bold; font-size: 18px; color: #1f2937;">${autoReferenceNo}</p>
          </div>
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border: 2px solid #0ea5e9;">
            <p style="margin: 5px 0; color: #0369a1; font-size: 14px;">Total Bill</p>
            <p style="margin: 5px 0; font-weight: bold; font-size: 28px; color: #0c4a6e;">₱${totalBill}</p>
          </div>
          
          <p style="margin-top: 20px; color: #059669; font-weight: 600; text-align: center;">
            ✅ Customer will pay the full amount
          </p>
        </div>
      `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<span style="font-size: 16px;">💳 Process Payment</span>',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        width: '500px'
      });

      if (!paymentConfirm.isConfirmed) {
        setShowConfirmModal(false);
        setSelectedPayment(null);
        return;
      }

      Swal.fire({
        title: 'Processing Payment...',
        html: '<div style="padding: 20px;"><p style="margin-top: 15px; font-size: 16px;">Please wait...</p></div>',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const updateData = {
          status: 'ongoing',
          full_amount: totalBill,
          payment_status: 'Completed',
          reference_no: autoReferenceNo
        };

        const { error } = await supabase
          .from('reservation')
          .update(updateData)
          .eq('id', selectedPayment.id);

        if (error) throw error;

        await supabase
          .from('transaction_history')
          .insert({
            table_id: selectedPayment.table_id,
            reservation_date: selectedPayment.reservation_date,
            start_time: selectedPayment.start_time,
            duration: selectedPayment.duration,
            status: 'ongoing',
            extension: selectedPayment.extension || 0,
            time_end: calculateEndTime(selectedPayment.start_time, selectedPayment.duration),
            paymentMethod: 'Cash',
            billiard_type: selectedPayment.billiard_type,
            amount: totalBill,
            reference_no: autoReferenceNo
          });

        await Swal.fire({
          icon: 'success',
          title: 'Payment Confirmed!',
          html: `
          <div style="text-align: left; padding: 20px;">
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 2px solid #10b981; margin-bottom: 15px;">
              <p style="margin: 5px 0; color: #065f46; font-size: 14px;">Reference Number</p>
              <p style="margin: 5px 0; font-weight: bold; font-size: 18px; color: #047857;">${autoReferenceNo}</p>
            </div>
            
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px;">
              <p style="margin: 5px 0; color: #1e40af; font-size: 14px;">Amount Paid</p>
              <p style="margin: 5px 0; font-weight: bold; font-size: 24px; color: #1e3a8a;">₱${totalBill}</p>
            </div>
            
            <p style="margin-top: 20px; color: #10b981; font-weight: 600; text-align: center;">
              ✅ Payment confirmed! Moving to Ongoing sessions.
            </p>
          </div>
        `,
          confirmButtonColor: '#10b981',
          timer: 3000,
          timerProgressBar: true
        });

        setShowConfirmModal(false);
        setSelectedPayment(null);
        fetchPayments();
        return;

      } catch (error) {
        console.error('Error processing full payment:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Payment Failed',
          text: 'Failed to process payment. Please try again.',
          confirmButtonColor: '#ef4444'
        });
        return;
      }
    }

    if (paymentType === 'Half Payment' && !paymentAmount) {
      await Swal.fire({
        icon: 'warning',
        title: 'Amount Required',
        text: 'Please enter the payment amount.',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    try {
      const newAmount = parseInt(paymentAmount) || 0;
      const previousAmount = selectedPayment.half_amount || 0;
      const newTotal = previousAmount + newAmount;

      if (newTotal > totalBill) {
        await Swal.fire({
          icon: 'error',
          title: 'Amount Exceeds Bill',
          text: `Total payment (₱${newTotal}) cannot exceed total bill (₱${totalBill})`,
          confirmButtonColor: '#ef4444'
        });
        return;
      }

      const paymentMethodChoice = await Swal.fire({
        title: 'Select Payment Method',
        html: `
        <div style="text-align: left; padding: 20px;">
          <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 2px solid #0ea5e9;">
            <p style="margin: 5px 0; color: #0369a1; font-size: 14px;">Payment Amount</p>
            <p style="margin: 5px 0; font-weight: bold; font-size: 24px; color: #0c4a6e;">₱${newAmount}</p>
          </div>
          <p style="color: #666; font-size: 14px; margin-bottom: 15px;">How will the customer pay?</p>
        </div>
      `,
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '💵 Cash',
        denyButtonText: '📱 GCash',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#10b981',
        denyButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
      });

      if (paymentMethodChoice.isDismissed) return;

      const isCash = paymentMethodChoice.isConfirmed;
      let refNumber = '';

      if (isCash) {
        refNumber = `${Date.now()}`;

        const confirmCash = await Swal.fire({
          title: 'Confirm Cash Payment',
          html: `
          <div style="text-align: left; padding: 20px;">
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Reference Number</p>
              <p style="margin: 5px 0; font-weight: bold; font-size: 18px; color: #1f2937;">${refNumber}</p>
            </div>
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border: 2px solid #0ea5e9;">
              <p style="margin: 5px 0; color: #0369a1; font-size: 14px;">Amount</p>
              <p style="margin: 5px 0; font-weight: bold; font-size: 24px; color: #0c4a6e;">₱${newAmount}</p>
            </div>
          </div>
        `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: '💳 Process Payment',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#10b981',
          cancelButtonColor: '#6b7280',
        });

        if (!confirmCash.isConfirmed) return;

      } else {
        const gcashInput = await Swal.fire({
          title: 'GCash Payment',
          html: `
          <div style="text-align: left; padding: 20px;">
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 2px solid #0ea5e9;">
              <p style="margin: 5px 0; color: #0369a1; font-size: 14px;">Amount</p>
              <p style="margin: 5px 0; font-weight: bold; font-size: 24px; color: #0c4a6e;">₱${newAmount}</p>
            </div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">GCash Reference Number *</label>
            <input id="gcash-ref" type="text" placeholder="Enter GCash reference number" 
              style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 16px;" />
            <p style="margin-top: 8px; font-size: 12px; color: #6b7280;">Enter the GCash transaction reference number</p>
          </div>
        `,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: '💳 Process Payment',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#3b82f6',
          cancelButtonColor: '#6b7280',
          preConfirm: () => {
            const ref = document.getElementById('gcash-ref').value;
            if (!ref.trim()) {
              Swal.showValidationMessage('Reference number is required');
              return false;
            }
            return ref.trim();
          }
        });

        if (!gcashInput.isConfirmed) return;
        refNumber = gcashInput.value;
      }

      Swal.fire({
        title: 'Processing Payment...',
        html: '<div style="padding: 20px;"><p style="margin-top: 15px; font-size: 16px;">Please wait...</p></div>',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const updateData = {
        half_amount: newTotal,
        paymentMethod: isCash ? 'Cash' : 'GCash'
      };

      const existingRefs = selectedPayment.reference_no
        ? (Array.isArray(selectedPayment.reference_no)
          ? selectedPayment.reference_no
          : [selectedPayment.reference_no])
        : [];

      updateData.reference_no = [...existingRefs, refNumber];

      if (newTotal >= totalBill) {
        updateData.status = 'ongoing';
        updateData.payment_status = 'Completed';
      } else {
        updateData.status = 'approved';
        updateData.payment_status = 'Pending';
      }

      const { error } = await supabase
        .from('reservation')
        .update(updateData)
        .eq('id', selectedPayment.id);

      if (error) throw error;

      await Swal.fire({
        icon: 'success',
        title: 'Payment Confirmed!',
        html: `
        <div style="text-align: left; padding: 20px;">
          <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 2px solid #10b981; margin-bottom: 15px;">
            <p style="margin: 5px 0; color: #065f46; font-size: 14px;">Reference Numbers</p>
            <p style="margin: 5px 0; font-weight: bold; font-size: 16px; color: #047857;">
              ${updateData.reference_no.join(', ')}
            </p>
          </div>
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px;">
            <p style="margin: 5px 0; color: #1e40af; font-size: 14px;">Amount Paid</p>
            <p style="margin: 5px 0; font-weight: bold; font-size: 24px; color: #1e3a8a;">
              ₱${newTotal}
            </p>
          </div>
        </div>
      `,
        confirmButtonColor: '#10b981',
        timer: 3000,
        timerProgressBar: true
      });

      await supabase
        .from('transaction_history')
        .insert({
          table_id: selectedPayment.table_id,
          reservation_date: selectedPayment.reservation_date,
          start_time: selectedPayment.start_time,
          duration: selectedPayment.duration,
          status: updateData.status,
          extension: selectedPayment.extension || 0,
          time_end: calculateEndTime(selectedPayment.start_time, selectedPayment.duration),
          paymentMethod: updateData.paymentMethod,
          billiard_type: selectedPayment.billiard_type,
          amount: newTotal,
          reference_no: updateData.reference_no
        });

      setShowConfirmModal(false);
      setSelectedPayment(null);
      setPaymentAmount('');
      fetchPayments();

    } catch (error) {
      console.error('Error confirming payment:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to confirm payment. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
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

  const calculateEndTime = (startTime, duration) => {
    if (!startTime || !duration) return 'N/A';
    const [time, period] = startTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    hours += duration;

    const endPeriod = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${hours}:${minutes.toString().padStart(2, '0')} ${endPeriod}`;
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const handleSyncPayment = async (payment) => {
    setSelectedPayment(payment);
    setReferenceNumber('');

    try {
      const { data: existingPayment } = await supabase
        .from('payment')
        .select('payment_id')
        .eq('reservation_id', payment.id)
        .maybeSingle();

      if (existingPayment) {
        await Swal.fire({
          icon: 'info',
          title: 'Already Synced',
          text: 'This payment has already been synced to the payment table.',
          confirmButtonColor: '#3b82f6'
        });
        return;
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
    }

    setShowSyncModal(true);
  };
  const getPaginatedPayments = (payments) => {
  const filtered = getFilteredAndSortedPayments(payments);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return {
    currentItems,
    totalPages,
    totalItems: filtered.length
  };
};
useEffect(() => {
  setCurrentPage(1); // Reset to page 1 when changing tabs
}, [activeTab]);
  const handleSyncSubmit = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const autoRefNumber = `${year}${month}${day}${hour}${minute}${second}${random}`;

    setSyncing(true);
    try {
      const { data: existingPayment } = await supabase
        .from('payment')
        .select('payment_id')
        .eq('reservation_id', selectedPayment.id)
        .maybeSingle();

      if (existingPayment) {
        await Swal.fire({
          icon: 'info',
          title: 'Already Synced',
          text: 'This payment has already been synced to the payment table.',
          confirmButtonColor: '#3b82f6'
        });
        setSyncing(false);
        setShowSyncModal(false);
        return;
      }

      let totalAmountPaid = 0;

      if (selectedPayment.payment_type === 'Full Payment') {
        totalAmountPaid = selectedPayment.full_amount || selectedPayment.total_bill || 0;
      } else if (selectedPayment.payment_type === 'Half Payment') {
        totalAmountPaid = selectedPayment.half_amount || 0;
      }

      let paymentMethod = (selectedPayment.payment_method || 'cash').toLowerCase();
      const validMethods = ['cash', 'gcash', 'card', 'online'];
      if (!validMethods.includes(paymentMethod)) {
        paymentMethod = 'cash';
      }

      const paymentData = {
        reservation_id: selectedPayment.id,
        account_id: selectedPayment.account_id,
        amount: totalAmountPaid,
        total_bill: selectedPayment.total_bill,
        method: paymentMethod,
        payment_date: new Date().toISOString(),
        reference_number: autoRefNumber,
        status: 'completed',
        payment_type: selectedPayment.payment_type
      };

      const { data, error } = await supabase
        .from('payment')
        .insert([paymentData])
        .select();

      if (error) {
        console.error('Insert Error:', error);
        throw error;
      }

      await supabase
        .from('reservation')
        .update({ synced_to_payment: true })
        .eq('id', selectedPayment.id);

      const reservationDate = selectedPayment.reservation_date;
      const startTime = selectedPayment.start_time;
      const endTime = selectedPayment.time_end;
      const duration = selectedPayment.duration;
      const extension = selectedPayment.extension || 0;

      await Swal.fire({
        icon: 'success',
        title: 'Payment Synced!',
        html: `
        <div style="text-align: left; font-size: 14px;">
          <p><strong>Date:</strong> ${formatDateForDisplay(reservationDate)}</p>
          <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
          <p><strong>Duration:</strong> ${duration} hours</p>
          ${extension > 0 ? `<p><strong>Extension:</strong> ${extension} hours</p>` : ''}
          <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <strong>Amount Paid:</strong> ₱${totalAmountPaid}
          </p>
          <p><strong>Total Bill:</strong> ₱${selectedPayment.total_bill || 0}</p>
          <p style="margin-top: 10px; color: ${totalAmountPaid >= selectedPayment.total_bill ? '#10b981' : '#f59e0b'};">
            ${totalAmountPaid >= selectedPayment.total_bill ? '✅ Fully Paid' : '⚠️ Partial Payment'}
          </p>
          <p style="margin-top: 15px; font-size: 12px; color: #6b7280;">
            Reference: ${autoRefNumber}
          </p>
        </div>
      `,
        timer: 2500,
        showConfirmButton: false,
        willClose: () => {
          window.location.reload();
        }
      });

      setShowSyncModal(false);
      setSelectedPayment(null);
      fetchPayments();

    } catch (error) {
      console.error('Error syncing payment:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Sync Failed',
        html: `
        <div style="text-align: left;">
          <p>${error.message || 'Failed to sync payment data.'}</p>
          ${error.details ? `<p style="margin-top: 10px; font-size: 12px; color: #6b7280;">${error.details}</p>` : ''}
        </div>
      `,
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setSyncing(false);
    }
  };

  const [tableMap, setTableMap] = useState({});

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

  // ============================================
  // FILTER & SORT FUNCTIONS
  // ============================================
  const getFilteredAndSortedPayments = (payments) => {
    let filtered = [...payments];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(payment => {
        const customerName = `${payment.accounts?.customer?.first_name || ''} ${payment.accounts?.customer?.last_name || ''}`.toLowerCase();
        const tableName = (tableMap[payment.table_id] || '').toLowerCase();
        const reservationNo = (payment.reservation_no || '').toLowerCase();
        const query = searchQuery.toLowerCase();

        return customerName.includes(query) || 
               tableName.includes(query) || 
               reservationNo.includes(query);
      });
    }

    // Payment type filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(payment => {
        if (filterBy === 'full') return payment.payment_type === 'Full Payment';
        if (filterBy === 'half') return payment.payment_type === 'Half Payment';
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.reservation_date) - new Date(a.reservation_date);
      } else if (sortBy === 'amount') {
        return (b.total_bill || 0) - (a.total_bill || 0);
      } else if (sortBy === 'name') {
        const nameA = `${a.accounts?.customer?.first_name || ''} ${a.accounts?.customer?.last_name || ''}`.toLowerCase();
        const nameB = `${b.accounts?.customer?.first_name || ''} ${b.accounts?.customer?.last_name || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return filtered;
  };

  // ============================================
  // RENDER PAYMENT CARD
  // ============================================
  const renderPaymentCard = (payment, type) => {
    const customerName = `${payment.accounts?.customer?.first_name || ''} ${payment.accounts?.customer?.last_name || ''}`.trim() || 'N/A';
    const extensionPrice = payment.extension ? getExtensionPrice(payment.billiard_type, payment.extension) : 0;
    const isSynced = syncedPayments.includes(payment.id);

    return (
      <div 
        key={payment.id} 
        className={`p-5 transition-all border-2 rounded-xl hover:shadow-lg ${
          type === 'pending' ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50' :
          type === 'ongoing' ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50' :
          'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-12 h-12 text-lg font-bold text-white rounded-full ${
              type === 'pending' ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
              type === 'ongoing' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
              'bg-gradient-to-br from-gray-500 to-gray-600'
            }`}>
              {customerName.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{customerName}</h3>
              <p className="text-sm text-gray-600">
                {tableMap[payment.table_id] || `Table ${payment.table_id}`}
              </p>
            </div>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-md text-white ${
            type === 'pending' ? 'bg-orange-500' :
            type === 'ongoing' ? 'bg-green-500' :
            'bg-gray-500'
          }`}>
            {type === 'pending' ? 'Pending' : type === 'ongoing' ? 'Ongoing' : 'Done'}
          </span>
        </div>

        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Date:</span> {formatDate(payment.reservation_date)}
            </p>
            {type !== 'completed' && (
              <>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Time:</span> {formatTime(payment.start_time)} - {formatTime(payment.time_end)}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Duration:</span> {payment.duration} hours
                </p>
              </>
            )}
            {payment.extension > 0 && (
              <div className="flex items-center gap-2 p-2 border border-blue-200 rounded-lg bg-blue-50">
                <Plus size={14} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">
                  Extension: {payment.extension}h - ₱{extensionPrice}
                </span>
              </div>
            )}
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Amount:</span> ₱{payment.total_bill || 0}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold text-gray-700">Reservation No:</p>
            <p className="text-sm font-bold text-gray-900">{payment.reservation_no}</p>
          </div>
        </div>

        {type === 'ongoing' && (
          <div className="p-3 mb-3 border-2 border-green-200 rounded-lg bg-green-50">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Total Bill:</span>
                <span className="font-bold text-gray-900">₱{payment.total_bill || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Amount Paid:</span>
                <span className="font-bold text-green-600">
                  ₱{payment.payment_type === 'Full Payment'
                    ? (payment.full_amount || 0)
                    : payment.payment_type === 'Half Payment'
                      ? (payment.half_amount || 0)
                      : 0
                  }
                </span>
              </div>
              {(() => {
                const totalBill = payment.total_bill || 0;
                const amountPaid = payment.payment_type === 'Full Payment'
                  ? (payment.full_amount || 0)
                  : payment.payment_type === 'Half Payment'
                    ? (payment.half_amount || 0)
                    : 0;
                const remaining = totalBill - amountPaid;

                if (remaining > 0) {
                  return (
                    <div className="pt-2 mt-2 border-t border-green-300">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-orange-700">Remaining:</span>
                        <span className="font-bold text-orange-600">₱{remaining}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}

        <div className={`grid ${type === 'completed' ? 'grid-cols-2' : 'grid-cols-2'} gap-2 mb-2`}>
          <button
            onClick={() => handleViewDetails(payment)}
            className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold transition-all bg-white border-2 rounded-lg ${
              type === 'pending' ? 'text-orange-700 border-orange-300 hover:bg-orange-50' :
              'text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Eye size={16} />
            View
          </button>
          {type !== 'completed' && (
            <button
              onClick={() => handleExtensionClick(payment)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white transition-all bg-blue-500 rounded-lg hover:bg-blue-600"
            >
              <Plus size={16} />
              Extend
            </button>
          )}
          {type === 'completed' && (
            <button
              onClick={() => handleSyncPayment(payment)}
              disabled={syncing || isSynced}
              className={`px-3 py-2 rounded-lg transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isSynced
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
              }`}
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {isSynced ? 'Synced' : syncing ? 'Syncing...' : 'Sync'}
            </button>
          )}
        </div>

        {type === 'pending' && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => handleCancelReservation(payment.id)}
              className="px-4 py-2 text-sm font-semibold text-white transition-all bg-red-500 rounded-lg shadow-md hover:bg-red-600"
            >
              Cancel
            </button>
          </div>
        )}

        {type === 'pending' && (
          <button
            onClick={() => handleConfirmPaymentClick(payment)}
            className="w-full px-4 py-2 text-sm font-semibold text-white transition-all rounded-lg shadow-md bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            Confirm Payment
          </button>
        )}

        {type === 'ongoing' && (
          <button
            onClick={() => handleEndSession(payment.id)}
            className="w-full px-4 py-2 text-sm font-semibold text-white transition-all rounded-lg shadow-md bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
          >
            End Session
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="flex items-center gap-3 mb-2 text-4xl font-bold text-gray-900">
              <CreditCard className="text-indigo-600" size={36} />
              Finalize Payment
            </h1>
            <p className="text-lg text-gray-600">Manage current sessions and process final payments</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-3 font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all ${
              activeTab === 'pending'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Hourglass size={20} />
            Pending ({pendingPayments.length})
          </button>
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all ${
              activeTab === 'ongoing'
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Clock size={20} />
            Ongoing ({activePayments.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all ${
              activeTab === 'completed'
                ? 'bg-gray-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CheckCircle size={20} />
            Completed ({completedPayments.length})
          </button>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 gap-4 p-4 mb-6 bg-white shadow-lg md:grid-cols-3 rounded-xl">
          <div className="relative">
            <Search className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" size={20} />
            <input
              type="text"
              placeholder="Search by name, table, or reservation #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 pl-10 pr-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" size={20} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-3 pl-10 pr-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" size={20} />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="w-full py-3 pl-10 pr-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Payment Types</option>
              <option value="full">Full Payment</option>
              <option value="half">Half Payment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
   <div>
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {activeTab === 'pending' && (
      (() => {
        const { currentItems, totalPages, totalItems } = getPaginatedPayments(pendingPayments);
        return (
          <>
            {currentItems.length > 0 ? (
              currentItems.map(payment => renderPaymentCard(payment, 'pending'))
            ) : (
              <div className="col-span-full">
                <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
                  <CheckCircle size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-semibold text-gray-500">No pending payments found</p>
                </div>
              </div>
            )}
          </>
        );
      })()
    )}

    {activeTab === 'ongoing' && (
      (() => {
        const { currentItems, totalPages, totalItems } = getPaginatedPayments(activePayments);
        return (
          <>
            {currentItems.length > 0 ? (
              currentItems.map(payment => renderPaymentCard(payment, 'ongoing'))
            ) : (
              <div className="col-span-full">
                <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
                  <CheckCircle size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-semibold text-gray-500">No ongoing sessions found</p>
                </div>
              </div>
            )}
          </>
        );
      })()
    )}

    {activeTab === 'completed' && (
      (() => {
        const { currentItems, totalPages, totalItems } = getPaginatedPayments(completedPayments);
        return (
          <>
            {currentItems.length > 0 ? (
              currentItems.map(payment => renderPaymentCard(payment, 'completed'))
            ) : (
              <div className="col-span-full">
                <div className="py-12 text-center bg-white shadow-lg rounded-2xl">
                  <CheckCircle size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-semibold text-gray-500">No completed sessions found</p>
                </div>
              </div>
            )}
          </>
        );
      })()
    )}
  </div>

  {/* Pagination Controls */}
  {(() => {
    const payments = activeTab === 'pending' ? pendingPayments : 
                     activeTab === 'ongoing' ? activePayments : 
                     completedPayments;
    const { totalPages, totalItems } = getPaginatedPayments(payments);

    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between p-4 mt-6 bg-white shadow-lg rounded-xl">
        <div className="text-sm text-gray-600">
          Showing page {currentPage} of {totalPages} ({totalItems} total)
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 font-semibold text-gray-700 transition-all bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, idx) => {
              const pageNum = idx + 1;
              // Show first page, last page, current page, and pages around current
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 font-semibold rounded-lg transition-all ${
                      currentPage === pageNum
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              } else if (
                pageNum === currentPage - 2 ||
                pageNum === currentPage + 2
              ) {
                return <span key={pageNum} className="px-2 py-2 text-gray-500">...</span>;
              }
              return null;
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 font-semibold text-gray-700 transition-all bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  })()}
</div>

      {/* Extension Modal */}
      {showExtensionModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl">
            <div className="p-6 text-white bg-gradient-to-r from-blue-500 to-indigo-500">
              <h3 className="mb-1 text-2xl font-bold">Add Extension</h3>
              <p className="text-blue-100">
                {`${selectedPayment.accounts?.customer?.first_name || ''} ${selectedPayment.accounts?.customer?.last_name || ''}`.trim() || 'N/A'} - Table {selectedPayment.table_id}
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Billiard Type</p>
                  <p className="font-bold text-gray-900 capitalize">{selectedPayment.billiard_type || 'Standard'}</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Current Duration</p>
                  <p className="font-bold text-gray-900">{selectedPayment.duration} hours</p>
                </div>

                {selectedPayment.extension > 0 && (
                  <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <p className="mb-1 text-sm text-blue-600">Current Extension</p>
                    <p className="font-bold text-blue-900">{selectedPayment.extension} hours</p>
                  </div>
                )}

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Select Extension
                  </label>
                  <select
                    value={selectedExtension}
                    onChange={(e) => setSelectedExtension(e.target.value)}
                    className="w-full px-4 py-3 text-sm font-semibold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose extension hours...</option>
                    {getAvailableExtensions(selectedPayment.billiard_type).map((ext) => (
                      <option key={ext.id} value={ext.id}>
                        {ext.extension_hours} hour{parseFloat(ext.extension_hours) !== 1 ? 's' : ''} - ₱{ext.price}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedExtension && (
                  <div className="p-4 border-2 border-indigo-200 rounded-lg bg-indigo-50">
                    <p className="mb-2 text-sm text-indigo-600">New Total</p>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Duration:</span> {selectedPayment.duration + parseFloat(extensions.find(e => e.id === parseInt(selectedExtension))?.extension_hours || 0)} hours
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Amount:</span> ₱{(selectedPayment.total_bill || 0) + (extensions.find(e => e.id === parseInt(selectedExtension))?.price || 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowExtensionModal(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 px-4 py-3 font-semibold text-gray-700 transition-all bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtensionSubmit}
                  className="flex-1 px-4 py-3 font-semibold text-white transition-all rounded-lg shadow-md bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                >
                  Add Extension
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal */}
      {showConfirmModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl">
            <div className="p-6 text-white bg-gradient-to-r from-green-500 to-emerald-500">
              <h3 className="mb-1 text-2xl font-bold">Confirm Payment</h3>
              <p className="text-green-100">Reference #{selectedPayment.reservation_no}</p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Billiard Type</p>
                  <p className="font-bold text-gray-900 capitalize">{selectedPayment.billiard_type || 'Standard'}</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Payment Type</p>
                  <p className="font-bold text-gray-900 capitalize">{selectedPayment.payment_type || 'N/A'}</p>
                </div>

                {selectedPayment.extension > 0 && (
                  <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <p className="mb-1 text-sm text-blue-600">Extension</p>
                    <p className="font-bold text-blue-900">
                      {selectedPayment.extension} hours - ₱{getExtensionPrice(selectedPayment.billiard_type, selectedPayment.extension)}
                    </p>
                  </div>
                )}

                <div className="p-4 border-2 border-indigo-200 rounded-lg bg-indigo-50">
                  <p className="mb-1 text-sm text-indigo-600">Total Bill</p>
                  <p className="text-3xl font-bold text-indigo-900">₱{selectedPayment.total_bill || 0}</p>
                </div>

                {(selectedPayment.payment_type === 'Half Payment') && (
                  <>
                    <div className="p-4 border-2 rounded-lg bg-amber-50 border-amber-200">
                      <p className="mb-2 text-sm font-semibold text-amber-600">Previous Payment</p>
                      <p className="text-2xl font-bold text-amber-900">
                        ₱{selectedPayment.payment_type === 'Half Payment'
                          ? (selectedPayment.half_amount || 0)
                          : 0
                        }
                      </p>
                      <p className="mt-1 text-sm text-amber-700">
                        Remaining: ₱{selectedPayment.total_bill - (selectedPayment.payment_type === 'Half Payment'
                          ? (selectedPayment.half_amount || 0)
                          : 0
                        )}
                      </p>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-700">
                        Enter Payment Amount
                      </label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Enter amount to pay"
                        className="w-full px-4 py-3 text-lg font-semibold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enter the amount customer is paying now
                      </p>
                    </div>

                    {paymentAmount && (() => {
                      const previousAmount = selectedPayment.payment_type === 'Half Payment'
                        ? (selectedPayment.half_amount || 0)
                        : 0;
                      const newTotal = previousAmount + parseInt(paymentAmount || 0);
                      const remaining = selectedPayment.total_bill - newTotal;
                      const isExceeding = newTotal > selectedPayment.total_bill;

                      return (
                        <div className={`p-4 border-2 rounded-lg ${isExceeding
                          ? 'bg-red-50 border-red-300'
                          : 'bg-green-50 border-green-200'
                          }`}>
                          <p className={`mb-2 text-sm font-semibold ${isExceeding ? 'text-red-600' : 'text-green-600'
                            }`}>
                            {isExceeding ? '⚠️ Amount Exceeds Bill' : 'New Total Payment'}
                          </p>
                          <p className={`text-2xl font-bold ${isExceeding ? 'text-red-900' : 'text-green-900'
                            }`}>
                            ₱{newTotal}
                          </p>
                          <p className={`mt-1 text-sm ${isExceeding ? 'text-red-700' : 'text-green-700'
                            }`}>
                            {isExceeding
                              ? `Exceeds by: ₱${Math.abs(remaining)}`
                              : `Still Remaining: ₱${Math.max(0, remaining)}`
                            }
                          </p>

                          {!isExceeding && remaining === 0 && (
                            <div className="p-2 mt-2 bg-green-100 rounded-lg">
                              <p className="text-sm font-bold text-green-800">✅ Payment Complete - Will move to Current!</p>
                            </div>
                          )}

                          {isExceeding && (
                            <div className="p-2 mt-2 bg-red-100 border border-red-300 rounded-lg">
                              <p className="text-sm font-bold text-red-800">❌ Cannot exceed total bill!</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}

                {selectedPayment.payment_type === 'Full Payment' && (
                  <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
                    <p className="mb-2 text-sm font-semibold text-green-600">✅ Full Payment</p>
                    <p className="mb-3 text-sm text-green-700">
                      Customer will pay the full amount
                    </p>
                    <p className="text-3xl font-bold text-green-900">₱{selectedPayment.total_bill}</p>
                    <div className="p-2 mt-3 bg-green-100 rounded-lg">
                      <p className="text-sm font-bold text-green-800">Will move to Current sessions immediately</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedPayment(null);
                    setPaymentAmount('');
                  }}
                  className="flex-1 px-4 py-3 font-semibold text-gray-700 transition-all bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPaymentSubmit}
                  className="flex-1 px-4 py-3 font-semibold text-white transition-all rounded-lg shadow-md bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-white bg-gradient-to-r from-indigo-500 to-purple-500">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-1 text-2xl font-bold">Payment Details</h3>
                  <p className="text-indigo-100">Reservation #{selectedPayment.reservation_no || 'N/A'}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-white transition-all rounded-lg hover:bg-white hover:bg-opacity-20"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Customer Name</p>
                  <p className="font-bold text-gray-900">
                    {`${selectedPayment.accounts?.customer?.first_name || ''} ${selectedPayment.accounts?.customer?.last_name || ''}`.trim() || 'N/A'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Table Number</p>
                  <p className="font-bold text-gray-900">
                    {tableMap[selectedPayment.table_id] || `Table ${selectedPayment.table_id}`}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Date</p>
                  <p className="font-bold text-gray-900">{formatDate(selectedPayment.reservation_date)}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Time</p>
                  <p className="font-bold text-gray-900">{formatTime(selectedPayment.start_time)} - {formatTime(selectedPayment.time_end)}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Duration</p>
                  <p className="font-bold text-gray-900">{selectedPayment.duration} hours</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Billiard Type</p>
                  <p className="font-bold text-gray-900 capitalize">{selectedPayment.billiard_type || 'Standard'}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Payment Method</p>
                  <p className="font-bold text-gray-900">{selectedPayment.payment_method || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Payment Type</p>
                  <p className="font-bold text-gray-900 capitalize">{selectedPayment.payment_type || 'N/A'}</p>
                </div>
                {selectedPayment.extension > 0 && (
                  <div className="col-span-2 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <p className="mb-1 text-sm text-blue-600">Extension</p>
                    <p className="font-bold text-blue-900">
                      {selectedPayment.extension} hours - ₱{getExtensionPrice(selectedPayment.billiard_type, selectedPayment.extension)}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 mb-6 border-2 border-purple-200 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50">
                <h4 className="mb-3 text-lg font-bold text-gray-900">Payment Information</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Total Bill:</span>
                    <span className="text-lg font-bold text-gray-900">₱{selectedPayment.total_bill || 0}</span>
                  </div>

                  {selectedPayment.payment_type === 'Full Payment' && (
                    <>
                      <hr className="border-gray-300" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Full Payment:</span>
                        <span className="text-lg font-bold text-green-600">₱{selectedPayment.full_amount || 0}</span>
                      </div>
                      <div className="p-2 border border-green-200 rounded-lg bg-green-50">
                        <p className="text-sm font-semibold text-center text-green-800">
                          {(selectedPayment.full_amount || 0) >= (selectedPayment.total_bill || 0)
                            ? '✅ Fully Paid'
                            : '⚠️ Not Yet Paid'}
                        </p>
                      </div>
                    </>
                  )}

                  {selectedPayment.payment_type === 'Half Payment' && (
                    <>
                      <hr className="border-gray-300" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Amount Paid:</span>
                        <span className="text-lg font-bold text-blue-600">₱{selectedPayment.half_amount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Remaining:</span>
                        <span className="text-lg font-bold text-orange-600">
                          ₱{Math.max(0, (selectedPayment.total_bill || 0) - (selectedPayment.half_amount || 0))}
                        </span>
                      </div>
                      <div className={`${(selectedPayment.half_amount || 0) >= (selectedPayment.total_bill || 0)
                        ? 'p-2 border border-green-200 rounded-lg bg-green-50'
                        : ''
                        }`}>
                        <p className={`text-sm font-semibold text-center ${(selectedPayment.half_amount || 0) >= (selectedPayment.total_bill || 0)
                          ? 'text-green-800'
                          : 'text-yellow-800'
                          }`}>
                          {(selectedPayment.half_amount || 0) >= (selectedPayment.total_bill || 0)
                            ? '✅ Fully Paid'
                            : ''}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Modal */}
      {showSyncModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl">
            <div className="p-6 text-white bg-gradient-to-r from-green-500 to-emerald-500">
              <h3 className="mb-1 text-2xl font-bold">Sync Payment</h3>
              <p className="text-green-100">Reference #{selectedPayment.id}</p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Customer Name</p>
                  <p className="font-bold text-gray-900">
                    {`${selectedPayment.accounts?.customer?.first_name || ''} ${selectedPayment.accounts?.customer?.last_name || ''}`.trim() || 'N/A'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Table Number</p>
                  <p className="font-bold text-gray-900">Table {selectedPayment.table_id}</p>
                </div>

                <div className="p-4 border-2 border-indigo-200 rounded-lg bg-indigo-50">
                  <p className="mb-1 text-sm text-indigo-600">Total Amount</p>
                  <p className="text-3xl font-bold text-indigo-900">₱{selectedPayment.total_bill || 0}</p>
                </div>

                <div className="p-3 border-l-4 border-blue-500 rounded bg-blue-50">
                  <p className="text-sm font-semibold text-blue-800">
                    ℹ️ Reference number will be auto-generated
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSyncModal(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 px-4 py-3 font-semibold text-gray-700 transition-all bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSyncSubmit}
                  disabled={syncing}
                  className="flex-1 px-4 py-3 font-semibold text-white transition-all rounded-lg shadow-md bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50"
                >
                  {syncing ? 'Syncing...' : 'Sync Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}