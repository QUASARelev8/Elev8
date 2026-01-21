import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import { Calendar, Clock, DollarSign, TrendingUp, Eye, X } from 'lucide-react';
import Swal from 'sweetalert2';

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [todayBookings, setTodayBookings] = useState(0);
  const [yesterdayBookings, setYesterdayBookings] = useState(0);
  const [tableStatuses, setTableStatuses] = useState([]);
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [revenueTarget, setRevenueTarget] = useState(10000);
  const [rescheduleRequests, setRescheduleRequests] = useState([]); 
  const [currentUser, setCurrentUser] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    const userSession = localStorage.getItem('userSession');
    console.log('📦 User Session:', userSession);
    if (userSession) {
      const userData = JSON.parse(userSession);
      console.log('👤 Current User:', userData);
      setCurrentUser(userData);
    }
    
    fetchDashboardData();
  }, []);

  useEffect(() => {
    console.log('🔐 Can View Reschedules:', canViewReschedules());
    console.log('👤 Current User State:', currentUser);
  }, [currentUser]);

  const canViewReschedules = () => {
    if (!currentUser) return false;
    const allowedRoles = ['admin', 'manager', 'superadmin'];
    return allowedRoles.includes(currentUser.role?.toLowerCase());
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = getTodayDate();
      const yesterday = getYesterdayDate();

      // Fetch today's bookings
      const { data: todayData, error: todayError } = await supabase
        .from('reservation')
        .select('*', { count: 'exact' })
        .eq('reservation_date', today);

      if (todayError) throw todayError;
      setTodayBookings(todayData?.length || 0);

      // Fetch yesterday's bookings for comparison
      const { data: yesterdayData, error: yesterdayError } = await supabase
        .from('reservation')
        .select('*', { count: 'exact' })
        .eq('reservation_date', yesterday);

      if (yesterdayError) throw yesterdayError;
      setYesterdayBookings(yesterdayData?.length || 0);

      // Fetch table statuses from billiard_table_info
      const { data: tablesData, error: tablesError } = await supabase
        .from('billiard_table_info')
        .select('*')
        .order('table_id', { ascending: true });

    if (tablesError) {
  console.error('❌ Error fetching table statuses:', tablesError);
  throw tablesError;
}
console.log('✅ Table statuses loaded:', tablesData?.length);
setTableStatuses(tablesData || []);
      // Calculate daily revenue from today's reservations
      const { data: revenueData, error: revenueError } = await supabase
        .from('reservation')
        .select('total_bill')
        .eq('reservation_date', today)
        .in('status', ['approved', 'completed', 'ongoing']);

      if (revenueError) throw revenueError;

      const totalRevenue = revenueData?.reduce((sum, item) => sum + (item.total_bill || 0), 0) || 0;
      setDailyRevenue(totalRevenue);

  console.log('🔍 Starting reschedule fetch...');

const { data: rescheduleData, error: rescheduleError } = await supabase
  .from('reschedule_request')
  .select(`
    *,
    reservation:reservation_id (
      reservation_no,
      reference_no,
      reservation_date,
      start_time,
      time_end,
      duration,
      billiard_type,
      total_bill,
      table_id
    )
  `)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });

console.log('📊 Reschedule Query Result:', { 
  error: rescheduleError, 
  dataCount: rescheduleData?.length,
  rawData: rescheduleData 
});

if (rescheduleError) {
  console.error('❌ Error fetching reschedules:', rescheduleError);
  setRescheduleRequests([]);
} else if (rescheduleData && rescheduleData.length > 0) {
  console.log('✅ Found', rescheduleData.length, 'reschedule requests');
  
  const enrichedData = await Promise.all(
    rescheduleData.map(async (request) => {
      console.log('🔍 Processing request ID:', request.id);
      console.log('   - Account ID:', request.account_id);
      console.log('   - Reservation data:', request.reservation);
      
      const { data: customerData, error: customerError } = await supabase
        .from('customer')
        .select('first_name, middle_name, last_name, email')
        .eq('account_id', request.account_id)
        .single();
      
      if (customerError) {
        console.error('❌ Error fetching customer for account_id:', request.account_id, customerError);
      } else {
        console.log('✅ Customer found:', customerData);
      }
      
      const fullName = customerData 
        ? `${customerData.first_name} ${customerData.middle_name ? customerData.middle_name + ' ' : ''}${customerData.last_name}`.trim()
        : 'Unknown';
      
      return {
        ...request,
        customer: {
          full_name: fullName,
          email: customerData?.email || 'N/A'
        }
      };
    })
  );
  
  console.log('✅ Final Enriched Data:', enrichedData);
  console.log('📊 Setting', enrichedData.length, 'requests to state');
  setRescheduleRequests(enrichedData);
} else {
  console.log('⚠️ No reschedule data found');
  setRescheduleRequests([]);
}

console.log('✅ Reschedule fetch complete');

      // Fetch tables for names
      const { data: tablesDataList, error: tablesListError } = await supabase
        .from('billiard_table')
        .select('*');

      if (tablesListError) throw tablesListError;
      setTables(tablesDataList || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBookingDifference = () => {
    if (yesterdayBookings === 0) return todayBookings > 0 ? '+100%' : '0%';
    const diff = todayBookings - yesterdayBookings;
    const percentage = ((diff / yesterdayBookings) * 100).toFixed(0);
    return diff >= 0 ? `+${Math.abs(diff)}` : `-${Math.abs(diff)}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return '#28a745';
      case 'maintenance':
        return '#ff9800';
      case 'occupied':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getAvailableTablesCount = () => {
    return tableStatuses.filter(t => t.status?.toLowerCase() === 'available').length;
  };

  const getTotalTablesCount = () => {
    return tableStatuses.length;
  };

  const getInMaintenanceCount = () => {
    return tableStatuses.filter(t => t.status?.toLowerCase() === 'maintenance').length;
  };

  const getTableName = (tableId) => {
    const table = tables.find(t => t.table_id === tableId);
    return table ? table.table_name : 'Unknown Table';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleApproveReschedule = async (rescheduleRequestId) => {
    const result = await Swal.fire({
      title: 'Approve Reschedule?',
      text: 'Are you sure you want to approve this reschedule request?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, approve it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      // Get the reschedule request details
      const { data: rescheduleRequest, error: fetchError } = await supabase
        .from('reschedule_request')
        .select('*')
        .eq('id', rescheduleRequestId)
        .single();

      if (fetchError) throw fetchError;

      // Update the original reservation with new details
      const { error: updateError } = await supabase
        .from('reservation')
        .update({
          table_id: rescheduleRequest.new_table_id,
          reservation_date: rescheduleRequest.new_reservation_date,
          start_time: rescheduleRequest.new_start_time,
          time_end: rescheduleRequest.new_time_end,
          duration: rescheduleRequest.new_duration,
          billiard_type: rescheduleRequest.new_billiard_type,
          total_bill: rescheduleRequest.new_total_bill,
          status: 'approved'
        })
        .eq('id', rescheduleRequest.reservation_id);

      if (updateError) throw updateError;

      // Delete the reschedule request
      const { error: deleteError } = await supabase
        .from('reschedule_request')
        .delete()
        .eq('id', rescheduleRequestId);

      if (deleteError) throw deleteError;

      await Swal.fire({
        title: 'Approved!',
        text: 'Reschedule request has been approved successfully!',
        icon: 'success',
        confirmButtonColor: '#28a745'
      });

      fetchDashboardData();
    } catch (error) {
      console.error('Error approving reschedule:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to approve reschedule request',
        icon: 'error',
        confirmButtonColor: '#dc3545'
      });
    }
  };

const handleRejectReschedule = async (rescheduleRequestId) => {
  /* ================================
     STEP 0: GET USER FROM LOCALSTORAGE & FETCH ROLE FROM DB
  ================================= */
  const userSessionStr = localStorage.getItem("userSession");

  if (!userSessionStr) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "User session not found. Please log in again.",
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
  // 2. ROLE from accounts table kung wala (Manager / Frontdesk)
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
  const { data: rejectReasonsData, error: reasonsError } = await supabase
    .from("reject")
    .select("reason")
    .order("created_at", { ascending: true });

  if (reasonsError) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to load rejection reasons",
    });
    return;
  }

  const rejectReasons =
    rejectReasonsData?.map((r) => r.reason).filter(Boolean) || [];

  if (rejectReasons.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "No Reasons Available",
      text: "Please add rejection reasons first.",
    });
    return;
  }

  /* ================================
     STEP 2: INPUT MODAL
  ================================= */
  const { value: formValues } = await Swal.fire({
    title: "Reject Reschedule",
    icon: "warning",
    width: 480,
    html: `
      <div style="text-align:left; font-size:14px;">
        <label style="font-weight:600;">Reason <span style="color:red">*</span></label>
        <select id="reject-reason" style="width:100%; padding:8px; margin-bottom:12px;">
          <option value="">Select reason</option>
          ${rejectReasons.map(r => `<option value="${r}">${r}</option>`).join("")}
        </select>

        <label style="font-weight:600;">Comment (optional)</label>
        <textarea id="reject-comment" style="width:100%; min-height:80px;"></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Reject",
    confirmButtonColor: "#ef4444",
    preConfirm: () => {
      const reason = document.getElementById("reject-reason").value;
      const comment = document.getElementById("reject-comment").value;

      if (!reason) {
        Swal.showValidationMessage("Please select a reason");
        return false;
      }
      return { reason, comment };
    },
  });

  if (!formValues) return;

  /* ================================
     STEP 3: CONFIRM
  ================================= */
  const confirm = await Swal.fire({
    title: "Confirm Rejection?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Reject",
    confirmButtonColor: "#ef4444",
    html: `
      <p><strong>Reason:</strong> ${formValues.reason}</p>
      ${formValues.comment ? `<p><strong>Comment:</strong> ${formValues.comment}</p>` : ""}
      <p><strong>Rejected By:</strong> ${rejectName}</p>
      <p><strong>Role:</strong> ${userRole}</p>
    `,
  });

  if (!confirm.isConfirmed) return;

  /* ================================
     STEP 4: UPDATE DATABASE
  ================================= */
  try {
    // Get reschedule request + reservation
    const { data: rescheduleRequest, error: fetchError } = await supabase
      .from("reschedule_request")
      .select(`
        *,
        reservation:reservation_id (
          reservation_no,
          account_id
        )
      `)
      .eq("id", rescheduleRequestId)
      .single();

    if (fetchError) throw fetchError;

    // Update reschedule_request
    await supabase
      .from("reschedule_request")
      .update({
        status: "rejected",
        reject_reason: formValues.reason,
        reject_comment: formValues.comment || null,
      })
      .eq("id", rescheduleRequestId);

    // ✅ Update reservation + Reject_Name with ROLE (Manager/Frontdesk)
    await supabase
      .from("reservation")
      .update({
        status: "rejected",
        Reject_Name: userRole, // Store the role: "manager" or "frontdesk"
        remark_reject: formValues.reason,
        reject_comment: formValues.comment || null,
      })
      .eq("id", rescheduleRequest.reservation_id);

    // Create notification
    const reservationNo =
      rescheduleRequest.reservation?.reservation_no ||
      `#${rescheduleRequest.reservation_id}`;

    const message = formValues.comment
      ? `Your reschedule request for reservation ${reservationNo} was rejected by ${userRole}. Reason: ${formValues.reason}. ${formValues.comment}`
      : `Your reschedule request for reservation ${reservationNo} was rejected by ${userRole}. Reason: ${formValues.reason}.`;

    await supabase.from("notification").insert({
      account_id:
        rescheduleRequest.reservation?.account_id ||
        rescheduleRequest.account_id,
      message,
      reservation_no: reservationNo,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    Swal.fire({
      icon: "success",
      title: "Rejected",
      text: "Reschedule request rejected successfully.",
      timer: 2000,
      showConfirmButton: false,
    });

    fetchDashboardData();
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to reject reschedule request",
    });
  }
};

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #e0e0e0',
            borderTop: '5px solid #28a745',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '15px', color: '#666' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '30px'
        }}>
          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '32px',
            fontWeight: '700',
            color: '#333'
          }}>
            Manager Dashboard
          </h1>
          <p style={{
            margin: 0,
            fontSize: '16px',
            color: '#666'
          }}>
            Oversee daily operations and management
          </p>
        </div>

        {/* Reschedule Requests Section */}
        {rescheduleRequests.length > 0 && canViewReschedules() && (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}>
            <h2 style={{
              margin: '0 0 25px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: '#333'
            }}>
              Pending Approvals - Reschedule Requests
            </h2>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              {rescheduleRequests.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#999'
                }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>No pending reschedule requests</p>
                </div>
              ) : (
                rescheduleRequests.map((request) => (
                  <div
                    key={request.id}
                    style={{
                      padding: '20px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#fff9e6',
                      gap: '15px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      flex: 1,
                      minWidth: '300px'
                    }}>
                      {/* Warning Icon */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#fff3cd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Calendar size={20} color="#ff9800" />
                      </div>

                      {/* Request Info */}
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          margin: '0 0 5px 0',
                          fontSize: '16px',
                          fontWeight: '700',
                          color: '#333'
                        }}>
                          Reschedule Request
                        </h3>
                        <p style={{
                          margin: '0 0 3px 0',
                          fontSize: '14px',
                          color: '#666'
                        }}>
                          {getTableName(request.new_table_id)} - {request.new_billiard_type || 'Standard'}
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          color: '#999'
                        }}>
                          Customer: {request.customer?.full_name || 'Unknown'} • {formatDate(request.new_reservation_date)} at {request.new_start_time}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      flexShrink: 0
                    }}>
                      <button
                        onClick={() => handleViewDetails(request)}
                        style={{
                          padding: '10px 18px',
                          backgroundColor: '#f8f9fa',
                          color: '#333',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e9ecef';
                          e.currentTarget.style.borderColor = '#ccc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                          e.currentTarget.style.borderColor = '#ddd';
                        }}
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Table Status Overview */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 25px 0',
            fontSize: '20px',
            fontWeight: '700',
            color: '#333'
          }}>
            Table Status Overview
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {tableStatuses.map((table) => (
              <div
                key={table.table_info_id}
                style={{
                  padding: '20px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <h3 style={{
                    margin: '0 0 5px 0',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#333'
                  }}>
                    {table.billiard_table?.table_name || `Table ${table.table_id}`} - {table.billiard_type || 'Standard'}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    ₱{parseFloat(table.price || 0).toFixed(2)}/hour
                  </p>
                </div>
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700',
                  backgroundColor: getStatusColor(table.status),
                  color: 'white',
                  textTransform: 'uppercase'
                }}>
                  {table.status || 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedRequest && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={closeDetailsModal}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div style={{
                padding: '25px 30px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                backgroundColor: 'white',
                zIndex: 1
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#333'
                }}>
                  Reservation Details
                </h2>
                <button
                  onClick={closeDetailsModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#333'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '30px' }}>
                {/* Status Badge */}
                <div style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '700',
                  backgroundColor: '#fff3cd',
                  color: '#ff9800',
                  marginBottom: '25px',
                  textTransform: 'uppercase'
                }}>
                  {selectedRequest.status}
                </div>

                {/* Customer Info */}
                <div style={{
                  marginBottom: '25px',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr',
                    gap: '10px',
                    fontSize: '15px'
                  }}>
                    <div style={{ fontWeight: '600', color: '#666' }}>Reservation No:</div>
                    <div style={{ color: '#333' }}>{selectedRequest.reservation?.reservation_no || '-'}</div>

                    <div style={{ fontWeight: '600', color: '#666' }}>Reference No:</div>
                    <div style={{ color: '#333' }}>{selectedRequest.reservation?.reference_no || '-'}</div>

                    <div style={{ fontWeight: '600', color: '#666' }}>Customer:</div>
                    <div style={{ color: '#333' }}>{selectedRequest.customer?.full_name || 'Unknown'}</div>

                    <div style={{ fontWeight: '600', color: '#666' }}>Email:</div>
                    <div style={{ color: '#333' }}>{selectedRequest.customer?.email || '-'}</div>

                    <div style={{ fontWeight: '600', color: '#666' }}>Request Date:</div>
                    <div style={{ color: '#333' }}>
                      {new Date(selectedRequest.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Two Column Comparison */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px',
                  marginBottom: '25px'
                }}>
                  {/* Original Details Column */}
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0'
                  }}>
                    <h3 style={{
                      margin: '0 0 15px 0',
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Original Details
                    </h3>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      fontSize: '14px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Table:</div>
                        <div style={{ color: '#333' }}>{getTableName(selectedRequest.reservation?.table_id)}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Billiard Type:</div>
                        <div style={{ color: '#333' }}>{selectedRequest.reservation?.billiard_type || 'Standard'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Date:</div>
                        <div style={{ color: '#333' }}>{formatDate(selectedRequest.reservation?.reservation_date)}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Time:</div>
                        <div style={{ color: '#333' }}>
                          {selectedRequest.reservation?.start_time}
                          {selectedRequest.reservation?.time_end && ` - ${selectedRequest.reservation.time_end}`}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Duration:</div>
                        <div style={{ color: '#333' }}>{selectedRequest.reservation?.duration || '-'} hour(s)</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Total Bill:</div>
                        <div style={{ color: '#333', fontWeight: '700' }}>
                          ₱{parseFloat(selectedRequest.reservation?.total_bill || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reschedule Request Column */}
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#fff9e6',
                    borderRadius: '8px',
                    border: '2px solid #ffc107'
                  }}>
                    <h3 style={{
                      margin: '0 0 15px 0',
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#ff9800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Reschedule Request
                    </h3>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      fontSize: '14px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Table:</div>
                        <div style={{ color: '#333' }}>{getTableName(selectedRequest.new_table_id)}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Billiard Type:</div>
                        <div style={{ color: '#333' }}>{selectedRequest.new_billiard_type || 'Standard'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Date:</div>
                        <div style={{ color: '#333' }}>{formatDate(selectedRequest.new_reservation_date)}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Time:</div>
                        <div style={{ color: '#333' }}>
                          {selectedRequest.new_start_time}
                          {selectedRequest.new_time_end && ` - ${selectedRequest.new_time_end}`}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Duration:</div>
                        <div style={{ color: '#333' }}>{selectedRequest.new_duration || '-'} hour(s)</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Total Bill:</div>
                        <div style={{ color: '#333', fontWeight: '700' }}>
                          ₱{parseFloat(selectedRequest.new_total_bill || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons in Modal */}
                <div style={{
                  marginTop: '30px',
                  paddingTop: '20px',
                  borderTop: '1px solid #e0e0e0',
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => {
                      handleApproveReschedule(selectedRequest.id);
                      closeDetailsModal();
                    }}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                  >
                    Approve Reschedule
                  </button>
                  <button
                    onClick={() => {
                      handleRejectReschedule(selectedRequest.id);
                      closeDetailsModal();
                    }}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                  >
                    Reject Reschedule
                  </button>
                </div>
              </div>
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

export default ManagerDashboard;