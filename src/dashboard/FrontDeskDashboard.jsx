import React, { useState, useEffect } from 'react';
import { Search, QrCode,  ArrowUpDown, ArrowUp, ArrowDown, Clock, User, Calendar, CheckCircle, XCircle, AlertCircle, TrendingUp, Loader } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function FrontDeskDashboard() {
  const [activeTab, setActiveTab] = useState('qr-checkin');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [animate, setAnimate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentSessions, setCurrentSessions] = useState([]);
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    setAnimate(true);
    fetchData();

    // Set up real-time subscription
    const subscription = supabase
      .channel('reservation_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reservation' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

 const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);

    const today = new Date().toISOString().split('T')[0];

    // Get ALL reservations first
    const { data: reservationData, error: reservationError } = await supabase
      .from('reservation')
      .select('*')
      .order('start_time', { ascending: true });

    console.log('All reservations (no date filter):', reservationData);
    
    // Fetch customer emails separately
    const accountIds = reservationData?.map(r => r.account_id).filter(Boolean) || [];
    const { data: customersData } = await supabase
      .from('customer')
      .select('account_id, email')
      .in('account_id', accountIds);

    // Fetch tables separately
    const tableIds = reservationData?.map(r => r.table_id).filter(Boolean) || [];
    const { data: tablesData } = await supabase
      .from('table')
      .select('*')
      .in('id', tableIds);

    // Create lookup maps
    const customersMap = {};
    customersData?.forEach(cust => {
      customersMap[cust.account_id] = cust;
    });

    const tablesMap = {};
    tablesData?.forEach(tbl => {
      tablesMap[tbl.id] = tbl;
    });

    // Merge the data
    const sessions = [];
    const upcomingReservations = [];

    reservationData?.forEach(item => {
      const customer = customersMap[item.account_id];
      const table = tablesMap[item.table_id];

      const sessionData = {
        id: item.id,
        customer: customer?.email || 'Unknown Customer',
        table: table?.table_number || `T-${item.table_id}`,
        startTime: item.start_time,
        duration: `${item.duration}h`,
        status: item.customer_status || item.status,
        phone: customer?.email || 'N/A',
        amount: item.total_bill ? `₱${item.total_bill}` : '₱0',
        reservationDate: item.reservation_date,
        timeEnd: item.time_end,
        extension: item.extension,
        paymentStatus: item.payment_status,
        rawData: item
      };

      // Para sa Current Sessions - ongoing at active sessions
      if (item.status === 'ongoing' || item.customer_status === 'ongoing' ||
        item.customer_status === 'active' || item.customer_status === 'extended' ||
        item.customer_status === 'checked-in') {
        sessions.push(sessionData);
      }
      // Para sa Reservations - pending at confirmed lang
      else if (item.status === 'pending' || item.status === 'confirmed') {
        upcomingReservations.push(sessionData);
      }
    });
    console.log('All reservations for today:', reservationData);
    console.log('Filtered sessions:', sessions);
    console.log('Today date:', today);

    setCurrentSessions(sessions);
    setReservations(upcomingReservations);

  } catch (err) {
    console.error('Error fetching data:', err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

const handleSearch = async () => {
  if (!searchQuery.trim()) return;

  try {
    const today = new Date().toISOString().split('T')[0];

    // First get reservations for today
    const { data: reservationData, error: reservationError } = await supabase
      .from('reservation')
      .select('*')
      .eq('reservation_date', today);

    if (reservationError) throw reservationError;

    if (!reservationData || reservationData.length === 0) {
      setSelectedCustomer(null);
      alert('No reservations found for today.');
      return;
    }

    // Get all account IDs
    const accountIds = reservationData.map(r => r.account_id);

    // Search in customer table by email
    const { data: customersData, error: customerError } = await supabase
      .from('customer')
      .select('account_id, email')
      .in('account_id', accountIds)
      .ilike('email', `%${searchQuery}%`);

    if (customerError) throw customerError;

    if (customersData && customersData.length > 0) {
      // Find the reservation that matches
      const matchedCustomer = customersData[0];
      const matchedReservation = reservationData.find(r => r.account_id === matchedCustomer.account_id);

      if (matchedReservation) {
        // Get table info
        const { data: tableData } = await supabase
          .from('table')
          .select('*')
          .eq('id', matchedReservation.table_id)
          .single();

        setSelectedCustomer({
          id: matchedReservation.id,
          customer: matchedCustomer.email || 'Unknown Customer',
          table: tableData?.table_number || `T-${matchedReservation.table_id}`,
          phone: matchedCustomer.email || 'N/A',
          status: matchedReservation.customer_status || matchedReservation.status,
          startTime: matchedReservation.start_time,
          duration: `${matchedReservation.duration}h`,
          amount: matchedReservation.total_bill ? `₱${matchedReservation.total_bill}` : '₱0'
        });
      }
    } else {
      setSelectedCustomer(null);
      alert('No customer found with that email.');
    }
  } catch (err) {
    console.error('Error searching:', err);
    alert('Error searching for customer');
  }
};
  const handleCheckIn = async (id) => {
    try {
      const { error } = await supabase
        .from('reservation')
        .update({
          customer_status: 'checked-in',
          status: 'checked-in'
        })
        .eq('id', id);

      if (error) throw error;

      await fetchData();
      alert('Customer checked in successfully!');
    } catch (err) {
      console.error('Error checking in:', err);
      alert('Error checking in customer');
    }
  };
const filterAndSortData = (data, searchTerm, sortConfig) => {
  let filtered = data;
  
  // Filter
  if (searchTerm) {
    filtered = data.filter(item => 
      item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.table.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];
    
    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  return sorted;
};

const handleSort = (field, currentSort, setSort) => {
  setSort({
    field,
    direction: currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc'
  });
};

const SortIcon = ({ field, currentSort }) => {
  if (currentSort.field !== field) return <ArrowUpDown size={16} className="opacity-50" />;
  return currentSort.direction === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
};
  const [sessionsSearch, setSessionsSearch] = useState('');
const [reservationsSearch, setReservationsSearch] = useState('');
const [sessionsSort, setSessionsSort] = useState({ field: 'startTime', direction: 'asc' });
const [reservationsSort, setReservationsSort] = useState({ field: 'startTime', direction: 'asc' });

  const [currentSessionsPage, setCurrentSessionsPage] = useState(1);
  const [reservationsPage, setReservationsPage] = useState(1);
  const itemsPerPage = 10; // or 5, adjust as needed
  const getPaginatedData = (data, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (dataLength) => {
    return Math.ceil(dataLength / itemsPerPage);
  };
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'extended': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'confirmed': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'checked-in': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  const PaginationControls = ({ currentPage, totalPages, onPageChange }) => (
    <div className="flex items-center justify-between px-6 py-4 border-t-2 border-gray-100 bg-gray-50">
      <div className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 transition-all bg-white border-2 border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 transition-all bg-white border-2 border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300"
        >
          Next
        </button>
      </div>
    </div>
  );
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader className="mx-auto mb-4 text-blue-600 animate-spin" size={48} />
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="p-8 text-center bg-white shadow-lg rounded-2xl">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />
          <p className="mb-2 text-lg font-semibold text-red-600">Error loading data</p>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-2 text-white transition-all bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 mb-8 border shadow-lg bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-white/20 rounded-2xl">
      {/* Header with Animation */}
      <div className={`mb-8 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
              Front Desk Dashboard
            </h1>
            <p className="flex items-center gap-2 mt-2 text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live monitoring system
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Current Time</div>
            <div className="text-2xl font-bold text-gray-800">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* Action Cards with Beautiful Design */}
      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
        {/* QR Check-in Card */}
        <div
          onClick={() => setActiveTab('qr-checkin')}
          className={`group cursor-pointer relative overflow-hidden rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl ${activeTab === 'qr-checkin'
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl scale-105'
            : 'bg-white shadow-md hover:shadow-xl'
            } ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '100ms' }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 -translate-x-20 -translate-y-20 bg-white rounded-full"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 translate-x-16 translate-y-16 bg-white rounded-full"></div>
          </div>

          <div className="absolute top-0 left-0 w-full h-1 opacity-50 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>

          <div className="relative p-6">
            <div className={`flex items-center justify-between mb-4 ${activeTab === 'qr-checkin' ? 'text-white' : 'text-gray-700'}`}>
              <QrCode size={40} className="transition-transform group-hover:rotate-12" />
              <TrendingUp size={20} className="opacity-60" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${activeTab === 'qr-checkin' ? 'text-white' : 'text-gray-800'}`}>
              QR Check-in
            </h3>
            <p className={`text-sm ${activeTab === 'qr-checkin' ? 'text-blue-100' : 'text-gray-500'}`}>
              Quick customer entry
            </p>
            <div className="flex items-center gap-2 mt-4">
              <div className={`h-1 flex-1 rounded-full ${activeTab === 'qr-checkin' ? 'bg-white/30' : 'bg-blue-200'}`}>
                <div className={`h-1 rounded-full ${activeTab === 'qr-checkin' ? 'bg-white' : 'bg-blue-500'}`} style={{ width: '75%' }}></div>
              </div>
              <span className={`text-xs font-semibold ${activeTab === 'qr-checkin' ? 'text-white' : 'text-blue-600'}`}>75%</span>
            </div>
          </div>
        </div>

        {/* Finalize Payment Card */}
        <div
          onClick={() => setActiveTab('payment')}
          className={`group cursor-pointer relative overflow-hidden rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl ${activeTab === 'payment'
            ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-xl scale-105'
            : 'bg-white shadow-md hover:shadow-xl'
            } ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '200ms' }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 translate-x-20 -translate-y-20 bg-white rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 -translate-x-16 translate-y-16 bg-white rounded-full"></div>
          </div>

          <div className="absolute top-0 left-0 w-full h-1 opacity-50 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>

          <div className="relative p-6">
            <div className={`flex items-center justify-between mb-4 ${activeTab === 'payment' ? 'text-white' : 'text-gray-700'}`}>
              <div className="text-[40px] transition-transform group-hover:rotate-12">
                ₱
              </div>
              <TrendingUp size={20} className="opacity-60" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${activeTab === 'payment' ? 'text-white' : 'text-gray-800'}`}>
              Finalize Payment
            </h3>
            <p className={`text-sm ${activeTab === 'payment' ? 'text-green-100' : 'text-gray-500'}`}>
              Process transactions
            </p>
            <div className="flex items-center gap-2 mt-4">
              <div className={`h-1 flex-1 rounded-full ${activeTab === 'payment' ? 'bg-white/30' : 'bg-green-200'}`}>
                <div className={`h-1 rounded-full ${activeTab === 'payment' ? 'bg-white' : 'bg-green-500'}`} style={{ width: '60%' }}></div>
              </div>
              <span className={`text-xs font-semibold ${activeTab === 'payment' ? 'text-white' : 'text-green-600'}`}>60%</span>
            </div>
          </div>
        </div>

        {/* Time Extensions Card */}
        <div
          onClick={() => setActiveTab('extension')}
          className={`group cursor-pointer relative overflow-hidden rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl ${activeTab === 'extension'
            ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-xl scale-105'
            : 'bg-white shadow-md hover:shadow-xl'
            } ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '300ms' }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 -translate-x-20 -translate-y-20 bg-white rounded-full"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 translate-x-16 translate-y-16 bg-white rounded-full"></div>
          </div>

          <div className="absolute top-0 left-0 w-full h-1 opacity-50 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>

          <div className="relative p-6">
            <div className={`flex items-center justify-between mb-4 ${activeTab === 'extension' ? 'text-white' : 'text-gray-700'}`}>
              <Clock size={40} className="transition-transform group-hover:rotate-12" />
              <TrendingUp size={20} className="opacity-60" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${activeTab === 'extension' ? 'text-white' : 'text-gray-800'}`}>
              Time Extensions
            </h3>
            <p className={`text-sm ${activeTab === 'extension' ? 'text-orange-100' : 'text-gray-500'}`}>
              Extend session time
            </p>
            <div className="flex items-center gap-2 mt-4">
              <div className={`h-1 flex-1 rounded-full ${activeTab === 'extension' ? 'bg-white/30' : 'bg-orange-200'}`}>
                <div className={`h-1 rounded-full ${activeTab === 'extension' ? 'bg-white' : 'bg-orange-500'}`} style={{ width: '85%' }}></div>
              </div>
              <span className={`text-xs font-semibold ${activeTab === 'extension' ? 'text-white' : 'text-orange-600'}`}>85%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Lookup with Modern Design */}
 {/* Current Sessions Table with Search and Sort */}
<div className="p-6 mb-8 border shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl border-white/20">
  <h2 className="flex items-center mb-6 text-2xl font-bold text-gray-900">
    <div className="p-2 mr-3 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
      <User className="text-white" size={24} />
    </div>
    Current Sessions
    <span className="px-3 py-1 ml-3 text-sm font-semibold rounded-full bg-emerald-100 text-emerald-700">
      {currentSessions.length} Active
    </span>
  </h2>
  
  {/* Search Bar */}
  <div className="relative mb-4">
    <input
      type="text"
      placeholder="Search sessions by customer, table, or phone..."
      value={sessionsSearch}
      onChange={(e) => setSessionsSearch(e.target.value)}
      className="w-full px-4 py-2 pl-10 transition-all border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <Search className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" size={18} />
  </div>

  <div className="overflow-hidden border-2 border-gray-100 rounded-xl">
    <table className="w-full">
      <thead>
        <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
          <th 
            className="px-6 py-4 text-sm font-bold tracking-wider text-left text-gray-700 uppercase transition-all cursor-pointer hover:bg-gray-200"
            onClick={() => handleSort('customer', sessionsSort, setSessionsSort)}
          >
            <div className="flex items-center gap-2">
              Customer
              <SortIcon field="customer" currentSort={sessionsSort} />
            </div>
          </th>
          <th 
            className="px-6 py-4 text-sm font-bold tracking-wider text-left text-gray-700 uppercase transition-all cursor-pointer hover:bg-gray-200"
            onClick={() => handleSort('table', sessionsSort, setSessionsSort)}
          >
            <div className="flex items-center gap-2">
              Table
              <SortIcon field="table" currentSort={sessionsSort} />
            </div>
          </th>
          <th 
            className="px-6 py-4 text-sm font-bold tracking-wider text-left text-gray-700 uppercase transition-all cursor-pointer hover:bg-gray-200"
            onClick={() => handleSort('startTime', sessionsSort, setSessionsSort)}
          >
            <div className="flex items-center gap-2">
              Start Time
              <SortIcon field="startTime" currentSort={sessionsSort} />
            </div>
          </th>
          <th className="px-6 py-4 text-sm font-bold tracking-wider text-left text-gray-700 uppercase">Duration</th>
          <th className="px-6 py-4 text-sm font-bold tracking-wider text-left text-gray-700 uppercase">Amount</th>
          <th className="px-6 py-4 text-sm font-bold tracking-wider text-left text-gray-700 uppercase">Status</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y-2 divide-gray-50">
        {filterAndSortData(currentSessions, sessionsSearch, sessionsSort).length === 0 ? (
          <tr>
            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
              {sessionsSearch ? 'No sessions found matching your search' : 'No active sessions at the moment'}
            </td>
          </tr>
        ) : (
          getPaginatedData(filterAndSortData(currentSessions, sessionsSearch, sessionsSort), currentSessionsPage).map((session) => (
            <tr key={session.id} className="transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{session.customer}</td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 text-sm font-bold text-white rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                  {session.table}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">{session.startTime}</td>
              <td className="px-6 py-4 text-sm font-semibold text-gray-900">{session.duration}</td>
              <td className="px-6 py-4 text-sm font-bold text-emerald-600">{session.amount}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(session.status)}`}>
                  {session.status.toUpperCase()}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
    {filterAndSortData(currentSessions, sessionsSearch, sessionsSort).length > itemsPerPage && (
      <div className="flex items-center justify-between px-6 py-4 border-t-2 border-gray-100 bg-gray-50">
        <div className="text-sm text-gray-600">
          Page {currentSessionsPage} of {Math.ceil(filterAndSortData(currentSessions, sessionsSearch, sessionsSort).length / itemsPerPage)}
          <span className="ml-2 text-gray-500">
            ({filterAndSortData(currentSessions, sessionsSearch, sessionsSort).length} results)
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentSessionsPage(currentSessionsPage - 1)}
            disabled={currentSessionsPage === 1}
            className="px-4 py-2 font-semibold transition-all bg-white border-2 border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentSessionsPage(currentSessionsPage + 1)}
            disabled={currentSessionsPage === Math.ceil(filterAndSortData(currentSessions, sessionsSearch, sessionsSort).length / itemsPerPage)}
            className="px-4 py-2 font-semibold transition-all bg-white border-2 border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300"
          >
            Next
          </button>
        </div>
      </div>
    )}
  </div>
</div>

{/* Today's Reservations Table with Search and Sort */}
<div className="p-6 border shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl border-white/20">
  <h2 className="flex items-center mb-6 text-2xl font-bold text-gray-900">
    <div className="p-2 mr-3 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
      <Calendar className="text-white" size={24} />
    </div>
    Today's Reservation Schedule
    <span className="px-3 py-1 ml-3 text-sm font-semibold text-purple-700 bg-purple-100 rounded-full">
      {reservations.length} Bookings
    </span>
  </h2>
  
  {/* Search Bar */}
  <div className="relative mb-4">
    <input
      type="text"
      placeholder="Search reservations by customer, table, or phone..."
      value={reservationsSearch}
      onChange={(e) => setReservationsSearch(e.target.value)}
      className="w-full px-4 py-2 pl-10 transition-all border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
    />
    <Search className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" size={18} />
  </div>

  <div className="overflow-hidden border-2 border-gray-100 rounded-xl">
    <table className="w-full">
      <thead>
        <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
          <th 
            className="px-6 py-4 text-sm font-bold tracking-wider text-left text-gray-700 uppercase transition-all cursor-pointer hover:bg-gray-200"
            onClick={() => handleSort('startTime', reservationsSort, setReservationsSort)}
          >
            <div className="flex items-center gap-2">
              Time
              <SortIcon field="startTime" currentSort={reservationsSort} />
            </div>
          </th>
          <th 
            className="px-6 py-4 text-sm font-bold tracking-wider text-left text-gray-700 uppercase transition-all cursor-pointer hover:bg-gray-200"
            onClick={() => handleSort('table', reservationsSort, setReservationsSort)}
          >
            <div className="flex items-center gap-2">
              Table
              <SortIcon field="table" currentSort={reservationsSort} />
            </div>
          </th>
          <th 
            className="px-6 py-4 text-sm font-bold tracking-wider text-left text-gray-700 uppercase transition-all cursor-pointer hover:bg-gray-200"
            onClick={() => handleSort('customer', reservationsSort, setReservationsSort)}
          >
            <div className="flex items-center gap-2">
              Customer
              <SortIcon field="customer" currentSort={reservationsSort} />
            </div>
          </th>
          <th className="px-6 py-4 text-sm font-bold tracking-wider text-left text-gray-700 uppercase">Duration</th>
          <th className="px-6 py-4 text-sm font-bold tracking-wider text-left text-gray-700 uppercase">Status</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y-2 divide-gray-50">
        {filterAndSortData(reservations, reservationsSearch, reservationsSort).length === 0 ? (
          <tr>
            <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
              {reservationsSearch ? 'No reservations found matching your search' : 'No reservations scheduled for today'}
            </td>
          </tr>
        ) : (
          getPaginatedData(filterAndSortData(reservations, reservationsSearch, reservationsSort), reservationsPage).map((reservation) => (
            <tr key={reservation.id} className="transition-all duration-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50">
              <td className="px-6 py-4 text-sm font-bold text-gray-900">{reservation.startTime}</td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 text-sm font-bold text-white rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600">
                  {reservation.table}
                </span>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{reservation.customer}</td>
              <td className="px-6 py-4 text-sm font-semibold text-gray-900">{reservation.duration}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(reservation.status)}`}>
                  {reservation.status.toUpperCase()}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
    {filterAndSortData(reservations, reservationsSearch, reservationsSort).length > itemsPerPage && (
      <div className="flex items-center justify-between px-6 py-4 border-t-2 border-gray-100 bg-gray-50">
        <div className="text-sm text-gray-600">
          Page {reservationsPage} of {Math.ceil(filterAndSortData(reservations, reservationsSearch, reservationsSort).length / itemsPerPage)}
          <span className="ml-2 text-gray-500">
            ({filterAndSortData(reservations, reservationsSearch, reservationsSort).length} results)
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setReservationsPage(reservationsPage - 1)}
            disabled={reservationsPage === 1}
            className="px-4 py-2 font-semibold transition-all bg-white border-2 border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50 hover:border-purple-300"
          >
            Previous
          </button>
          <button
            onClick={() => setReservationsPage(reservationsPage + 1)}
            disabled={reservationsPage === Math.ceil(filterAndSortData(reservations, reservationsSearch, reservationsSort).length / itemsPerPage)}
            className="px-4 py-2 font-semibold transition-all bg-white border-2 border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50 hover:border-purple-300"
          >
            Next
          </button>
        </div>
      </div>
    )}
  </div>
</div>



      {/* Enhanced Footer */}
      <div className="mt-8 text-center">
        <div className="inline-block px-6 py-3 border rounded-full shadow-lg bg-white/80 backdrop-blur-sm border-white/20">
          <p className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Front Desk Dashboard • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}