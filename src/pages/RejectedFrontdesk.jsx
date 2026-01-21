import React, { useState, useEffect } from 'react';
import { XCircle, Eye, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';

export default function RejectedFrontdesk() {
  const [rejectedBookings, setRejectedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentAccountId, setCurrentAccountId] = useState(null);

  useEffect(() => {
    fetchRejectedBookings();
  }, []);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('userSession'));
    if (session) {
      setUserRole(session.role);
      setCurrentAccountId(session.account_id);
    }
  }, []);

  const fetchRejectedBookings = async () => {
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('userSession'));
      const role = session?.role;
      const accountId = session?.account_id;

      // 🔍 DEBUG: Print mo sa console
      console.log('User Role:', role);
      console.log('Account ID:', accountId);

      let query = supabase
        .from('reservation')
        .select('*')
        .eq('status', 'rejected')
        .order('reservation_date', { ascending: false })
        .order('start_time', { ascending: true });

      if (role === 'customer') {
        // Customers see only their own rejected bookings
        query = query.eq('account_id', accountId);
      } else if (role === 'frontdesk') {
        // frontdesks see only bookings they rejected (using Reject_Name column)
        query = query.eq('"Reject_Name"', 'frontdesk');
      }

      const { data: reservationData, error: reservationError } = await query;

      // 🔍 DEBUG: Check kung ilang results
      console.log('Filtered reservations:', reservationData?.length);
      console.log('Data:', reservationData);
      if (reservationError) throw reservationError;

      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('account_id, email');

      // Fetch customers separately
      const { data: customersData, error: customersError } = await supabase
        .from('customer')
        .select('customer_id, account_id, first_name, last_name, middle_name');

      if (accountsError) throw accountsError;
      if (customersError) throw customersError;

      // Join manually
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

      setRejectedBookings(combinedData);

    } catch (error) {
      console.error('Error fetching rejected bookings:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load rejected bookings.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRejectedBookings();
    setRefreshing(false);
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-orange-500 rounded-full animate-spin border-t-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading rejected bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="flex items-center gap-3 mb-2 text-4xl font-bold text-gray-900">
              <AlertCircle className="text-orange-600" size={36} />
              Rejected Bookings
            </h1>
            <p className="text-lg text-gray-600">View rejected reservations and rejection reasons</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-3 font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-orange-500 to-red-500 rounded-xl hover:from-orange-600 hover:to-red-600 disabled:opacity-50"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6 bg-white border-2 border-orange-100 shadow-xl rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Rejected Reservations</h2>
            <p className="text-sm text-gray-600">
              {rejectedBookings.length} rejected booking(s)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
          {rejectedBookings.length > 0 ? (
            rejectedBookings.map((booking) => {
              const customerName = `${booking.accounts?.customer?.first_name || ''} ${booking.accounts?.customer?.last_name || ''}`.trim() || 'N/A';

              return (
                <div key={booking.id} className="p-5 transition-all border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl hover:shadow-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 text-lg font-bold text-white rounded-full bg-gradient-to-br from-orange-500 to-red-600">
                        {customerName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{customerName}</h3>
                        <p className="text-sm text-gray-600">Table {booking.table_id}</p>
                      </div>
                    </div>
                    <span className="px-4 py-1.5 bg-orange-500 text-white rounded-full text-sm font-bold shadow-md">
                      Rejected
                    </span>
                  </div>

                  <div className="mb-3 space-y-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Date:</span> {formatDate(booking.reservation_date)}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Time:</span> {formatTime(booking.start_time)}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Duration:</span> {booking.duration} hours
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Billiard Type:</span> {booking.billiard_type || 'Standard'}
                    </p>

                    {booking.remark_reject && (
                      <div className="p-2 mt-2 bg-orange-100 border border-orange-300 rounded-lg">
                        <p className="text-xs font-semibold text-orange-800 mb-1">Rejection Reason:</p>
                        <p className="text-sm text-orange-900">{booking.remark_reject}</p>
                      </div>
                    )}

                    {booking.reject_comment && (
                      <div className="p-2 mt-2 bg-red-100 border border-red-300 rounded-lg">
                        <p className="text-xs font-semibold text-red-800 mb-1">Admin Comment:</p>
                        <p className="text-sm text-red-900">{booking.reject_comment}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleViewDetails(booking)}
                    className="flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-semibold text-orange-700 transition-all bg-white border-2 border-orange-300 rounded-lg hover:bg-orange-50"
                  >
                    <Eye size={16} />
                    View Details
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center col-span-full">
              <AlertCircle size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-500">No rejected bookings</p>
            </div>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-white bg-gradient-to-r from-orange-500 to-red-500">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-1 text-2xl font-bold">Rejected Booking Details</h3>
                  <p className="text-orange-100">Reference #{selectedBooking.id}</p>
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
                    {`${selectedBooking.accounts?.customer?.first_name || ''} ${selectedBooking.accounts?.customer?.last_name || ''}`.trim() || 'N/A'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Email</p>
                  <p className="font-bold text-gray-900">{selectedBooking.accounts?.email || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Table Number</p>
                  <p className="font-bold text-gray-900">Table {selectedBooking.table_id}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Billiard Type</p>
                  <p className="font-bold text-gray-900 capitalize">{selectedBooking.billiard_type || 'Standard'}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Date</p>
                  <p className="font-bold text-gray-900">{formatDate(selectedBooking.reservation_date)}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Time</p>
                  <p className="font-bold text-gray-900">{formatTime(selectedBooking.start_time)}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Duration</p>
                  <p className="font-bold text-gray-900">{selectedBooking.duration} hours</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="mb-1 text-sm text-gray-600">Reservation Number</p>
                  <p className="font-bold text-gray-900">{selectedBooking.reservation_no || 'N/A'}</p>
                </div>
              </div>

              {/* Rejection Information */}
              <div className="p-4 mb-6 border-2 border-orange-200 rounded-lg bg-gradient-to-r from-orange-50 to-red-50">
                <h4 className="mb-3 text-lg font-bold text-gray-900">Rejection Information</h4>

                <div className="space-y-3">
                  {selectedBooking.remark_reject && (
                    <div className="p-3 bg-orange-100 border border-orange-300 rounded-lg">
                      <p className="mb-2 text-sm font-semibold text-orange-800">Rejection Reason:</p>
                      <p className="text-gray-900">{selectedBooking.remark_reject}</p>
                    </div>
                  )}

                  {selectedBooking.reject_comment && (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                      <p className="mb-2 text-sm font-semibold text-red-800">Admin Comment:</p>
                      <p className="text-gray-900">{selectedBooking.reject_comment}</p>
                    </div>
                  )}

                  {!selectedBooking.remark_reject && !selectedBooking.reject_comment && (
                    <div className="p-3 text-center bg-gray-100 rounded-lg">
                      <p className="text-sm text-gray-600">No rejection reason provided</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {selectedBooking.payment_method && (
                  <div className="p-4 rounded-lg bg-gray-50">
                    <p className="mb-1 text-sm text-gray-600">Payment Method</p>
                    <p className="font-bold text-gray-900 capitalize">{selectedBooking.payment_method}</p>
                  </div>
                )}
                {selectedBooking.created_at && (
                  <div className="p-4 rounded-lg bg-gray-50">
                    <p className="mb-1 text-sm text-gray-600">Created At</p>
                    <p className="font-bold text-gray-900">
                      {new Date(selectedBooking.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 border-2 border-orange-200 rounded-lg bg-gradient-to-r from-orange-50 to-red-50">
                <p className="mb-1 text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold text-orange-600 capitalize">{selectedBooking.status}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}