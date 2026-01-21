import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import Swal from 'sweetalert2';
import { Calendar, Clock, DollarSign, Filter, ChevronLeft, ChevronRight, X, User, CreditCard } from 'lucide-react';

const History = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [tables, setTables] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, userRole]);

  const fetchCurrentUser = async () => {
    try {
      const userSession = localStorage.getItem('userSession');
      
      if (userSession) {
        const userData = JSON.parse(userSession);
        
        setCurrentUser({
          account_id: userData.account_id,
          email: userData.email,
          role: userData.role
        });
        setUserRole(userData.role);
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Not Logged In',
          text: 'Please log in to view transaction history',
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch user information',
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    filterTransactions();
  }, [selectedMonth, selectedStatus, transactions]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: tablesData, error: tablesError } = await supabase
        .from('billiard_table')
        .select('*');

      if (tablesError) throw tablesError;
      setTables(tablesData || []);

      let query = supabase
        .from('transaction_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (userRole === 'customer' && currentUser) {
        query = query.eq('account_id', currentUser.account_id);
      }

      const { data: transactionsData, error: transactionsError } = await query;

      if (transactionsError) throw transactionsError;

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch transaction history',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    if (selectedMonth !== 'all') {
      filtered = filtered.filter(t => {
        const date = new Date(t.created_at);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthYear === selectedMonth;
      });
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(t => t.status?.toLowerCase() === selectedStatus.toLowerCase());
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  const getTableName = (tableId) => {
    const table = tables.find(t => t.table_id === tableId);
    return table ? table.table_name : 'Unknown Table';
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'pending':
        return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'cancelled':
        return 'bg-gradient-to-r from-red-500 to-rose-500';
      case 'rescheduled':
        return 'bg-gradient-to-r from-cyan-500 to-blue-500';
      case 'approved':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500';
      case 'ongoing':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      default:
        return 'bg-gradient-to-r from-gray-500 to-slate-500';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUniqueMonths = () => {
    const months = transactions.map(t => {
      const date = new Date(t.created_at);
      return {
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      };
    });

    const uniqueMonths = Array.from(new Map(months.map(m => [m.value, m])).values());
    return uniqueMonths.sort((a, b) => b.value.localeCompare(a.value));
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedTransaction(null);
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
          <p className="mt-4 text-lg font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="mx-auto max-w-7xl">
        {/* Header - Compact */}
        <div className="p-4 mb-4 border shadow-lg backdrop-blur-xl bg-white/70 border-white/40 rounded-2xl md:p-6">
          <h1 className="text-2xl font-bold text-center text-transparent md:text-3xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
            Transaction History
          </h1>
        </div>

        {/* Filters - Compact */}
        <div className="p-4 mb-4 border shadow-lg backdrop-blur-xl bg-white/70 border-white/40 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-800">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-blue-200 bg-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Months</option>
              {getUniqueMonths().map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-blue-200 bg-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="ongoing">OnGoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>
        </div>

        {/* Transactions Grid */}
        <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2 lg:grid-cols-3">
          {currentTransactions.length === 0 ? (
            <div className="p-12 text-center border shadow-lg col-span-full backdrop-blur-xl bg-white/70 border-white/40 rounded-2xl">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-blue-600" />
              <p className="text-lg font-semibold text-gray-600">No transactions found</p>
            </div>
          ) : (
            currentTransactions.map(transaction => (
              <div
                key={transaction.id}
                onClick={() => handleViewDetails(transaction)}
                className="p-4 transition-all duration-300 border shadow-lg cursor-pointer backdrop-blur-xl bg-gradient-to-br from-white/80 to-blue-50/50 border-white/40 rounded-2xl hover:shadow-xl hover:scale-105"
              >
                {/* Date */}
                <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(transaction.created_at)}</span>
                </div>

                {/* Table Name */}
                <h3 className="mb-2 text-lg font-bold text-gray-800">
                  {getTableName(transaction.table_id)}
                </h3>

                {/* Billiard Type */}
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-lg">
                    {transaction.billiard_type || 'Standard'}
                  </span>
                </div>

                {/* Time Info */}
                <div className="flex items-center gap-2 mb-4 text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>{transaction.duration}h • {transaction.start_time} - {transaction.time_end}</span>
                </div>

                {/* Amount and Status */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-bold text-green-600">
                      ₱{parseFloat(transaction.amount || 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className={`${getStatusStyle(transaction.status)} px-3 py-1 rounded-full`}>
                    <span className="text-xs font-bold text-white uppercase">
                      {transaction.status || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div className="p-4 border shadow-lg backdrop-blur-xl bg-white/70 border-white/40 rounded-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 text-blue-600 transition-all bg-blue-100 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => goToPage(index + 1)}
                      className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                        currentPage === index + 1
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 text-blue-600 transition-all bg-blue-100 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 p-6 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Transaction Details</h2>
                  <p className="mt-1 text-sm text-blue-100">Transaction ID: #{selectedTransaction.id}</p>
                </div>
                <button
                  onClick={closeDetailsModal}
                  className="p-2 transition-all rounded-full hover:bg-white/20"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-3 space-y-6">
              {/* Table Information */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
                <h3 className="mb-4 text-lg font-bold text-gray-800">Table Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Table Name:</span>
                    <span className="font-semibold text-gray-800">{getTableName(selectedTransaction.table_id)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Billiard Type:</span>
                    <span className="font-semibold text-gray-800">{selectedTransaction.billiard_type || 'Standard'}</span>
                  </div>
                </div>
              </div>

              {/* Date & Time Information */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-800">
                  <Calendar className="w-5 h-5" />
                  Date & Time
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Transaction Date:</span>
                    <span className="font-semibold text-gray-800">{formatDate(selectedTransaction.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Reservation Date:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedTransaction.reservation_date ? formatFullDate(selectedTransaction.reservation_date) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Start Time:</span>
                    <span className="font-semibold text-gray-800">{selectedTransaction.start_time || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">End Time:</span>
                    <span className="font-semibold text-gray-800">{selectedTransaction.time_end || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold text-gray-800">{selectedTransaction.duration || 0} hour{selectedTransaction.duration > 1 ? 's' : ''}</span>
                  </div>
                  {selectedTransaction.extension > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Extension:</span>
                      <span className="font-semibold text-orange-600">+{selectedTransaction.extension} hour{selectedTransaction.extension > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
                <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-800">
                  <CreditCard className="w-5 h-5" />
                  Payment Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-semibold text-gray-800 capitalize">
                      {selectedTransaction.paymentMethod === 'full' ? 'Paid in Full' : 
                       selectedTransaction.paymentMethod === 'half' ? 'Half Payment' : 
                       selectedTransaction.paymentMethod || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-green-200">
                    <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
                    <span className="text-2xl font-bold text-green-600">
                      ₱{parseFloat(selectedTransaction.amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Information (if available) */}
              {selectedTransaction.account_id && (
                <div className="p-6 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl">
                  <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-gray-800">
                    <User className="w-5 h-5" />
                    Account Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Account ID:</span>
                      <span className="font-semibold text-gray-800">#{selectedTransaction.account_id}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 p-6 border-t border-gray-200 bg-gray-50 rounded-b-3xl">
              <button
                onClick={closeDetailsModal}
                className="w-full py-3 font-semibold text-white transition-all bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;