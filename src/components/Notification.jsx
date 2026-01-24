import React, { useState, useEffect, useCallback } from "react";
import { Bell, X, ChevronLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const Notification = ({
  isOpen,
  onClose,
  accountId,
  userRole,
}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // ✅ FIXED: Proper role-based filtering using account_id
const applyRoleFilter = useCallback((query) => {
  // 👤 CUSTOMER
  if (userRole === 'customer') {
    return query
      .eq('account_id', accountId)
      .or('message.ilike.%rejected%,message.ilike.%reject%,message.ilike.%approved%')
      .not('message', 'ilike', '%reschedule pending%'); 
  }

  // 🧑‍💼 MANAGER / FRONTDESK
  if (userRole === 'manager' || userRole === 'frontdesk') {
    return query
      .or('message.ilike.%reschedule%,message.ilike.%new reservation%')
      .not('message', 'ilike', '%approved%')
      .not('message', 'ilike', '%reject%')
      .not('message', 'ilike', '%rejected%');
  }

  // 👑 ADMIN / SUPERADMIN
  return query;

}, [userRole, accountId]);




  const fetchNotifications = useCallback(async () => {
    if (!accountId) {
      console.log('No account ID provided');
      return;
    }

    console.log('Fetching notifications for account_id:', accountId, 'role:', userRole);
    setLoading(true);

    try {
      let query = supabase
        .from('notification')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply unread filter
      if (showUnreadOnly) {
        query = query.eq('is_read', false);
      }

      // ✅ Apply role-based filter consistently
      query = applyRoleFilter(query);

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched notifications:', data);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId, userRole, showUnreadOnly, applyRoleFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleNotificationClick = async (notification) => {
    try {
      const { error } = await supabase
        .from('notification')
        .update({ is_read: true })
        .eq('id', notification.id);

      if (error) throw error;

      // ✅ Optimistic update
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );

      setSelectedNotification({ ...notification, is_read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleCloseDetail = () => {
    setSelectedNotification(null);
  };

  const handleMarkAllAsRead = async () => {
    try {
      let query = supabase
        .from('notification')
        .update({ is_read: true })
        .eq('is_read', false);

      // ✅ Apply same role-based filter
      query = applyRoleFilter(query);

      const { error } = await query;

      if (error) throw error;

      // ✅ Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // ✅ Count is now consistent - it counts from the already-filtered notifications
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityType = (message) => {
    const lower = message?.toLowerCase() || '';

    // ✅ Check for reschedule-related keywords
    if (lower.includes('requester') && lower.includes('rescheduled')) return 'reschedule';
    if (lower.includes('reschedule') && lower.includes('approved')) return 'approval';
    if (lower.includes('reschedule') && lower.includes('rejected')) return 'rejection';
    if (lower.includes('reschedule')) return 'reschedule';

    if (lower.includes('new reservation')) return 'new_reservation';
    if (lower.includes('extension')) return 'extension';
    if (lower.includes('reject')) return 'rejection';
    if (lower.includes('approved') || lower.includes('approval')) return 'approval';
    if (lower.includes('status')) return 'status_change';
    if (lower.includes('payment')) return 'payment';
    if (lower.includes('check in')) return 'check_in';
    if (lower.includes('check out')) return 'check_out';
    if (lower.includes('reservation')) return 'status_change';

    return 'payment';
  };

  const getActivityIcon = (activityType) => {
    const iconMap = {
      new_reservation: "🆕",
      reschedule: "🔄",
      rejection: "❌",
      approval: "✅",
      extension: "⏱️",
      status_change: "📋",
      payment: "₱",
      check_in: "✓",
      check_out: "←",
    };
    return iconMap[activityType] || "📋";
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Notification Panel */}
      {!selectedNotification ? (
        <div
          className="fixed right-6 top-20 w-full max-w-md bg-white/95 backdrop-blur-xl border border-blue-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn max-h-[600px] flex flex-col"
          role="dialog"
          aria-label="Notifications"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0 px-5 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <Bell size={18} aria-hidden="true" />
              Notifications
              {userRole !== 'customer' && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {userRole === 'manager' ? 'Manager' :
                    userRole === 'frontdesk' ? 'Front Desk' : 'All'}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-lg animate-pulse">
                  {unreadCount} new
                </span>
              )}
              <button
                onClick={onClose}
                className="p-1 transition-colors rounded-lg hover:bg-white/20"
                aria-label="Close notifications"
              >
                <X size={18} className="text-white" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 px-5 py-3 bg-white border-b border-gray-100" role="tablist">
            <button
              onClick={() => setShowUnreadOnly(false)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${!showUnreadOnly
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              role="tab"
              aria-selected={!showUnreadOnly}
            >
              All
            </button>
            <button
              onClick={() => setShowUnreadOnly(true)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all relative ${showUnreadOnly
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              role="tab"
              aria-selected={showUnreadOnly}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto" role="list">
            {loading ? (
              <div className="flex flex-col items-center justify-center px-4 py-12">
                <div className="w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                <p className="mt-3 text-sm text-gray-500">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12">
                <div className="flex items-center justify-center w-16 h-16 mb-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-50">
                  <Bell size={28} className="text-blue-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  {showUnreadOnly ? 'No unread notifications' : 'No notifications'}
                </p>
                <p className="mt-1 text-xs text-gray-400">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((note, index) => {
                  const activityType = getActivityType(note.message);
                  const isUnread = !note.is_read;

                  return (
                    <div
                      key={note.id}
                      onClick={() => handleNotificationClick(note)}
                      className={`px-4 py-4 hover:bg-blue-50 cursor-pointer transition-all duration-200 group relative border-l-4 ${isUnread
                        ? 'bg-gradient-to-r from-blue-50 to-white border-l-blue-500 shadow-sm'
                        : 'bg-white border-l-transparent'
                        }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                      role="listitem"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNotificationClick(note);
                        }
                      }}
                    >
                      {/* Unread Badge */}
                      {isUnread && (
                        <div className="absolute top-3 right-3">
                          <div className="relative">
                            <span className="flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-lg"></span>
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`flex items-center justify-center flex-shrink-0 w-11 h-11 transition-transform duration-200 rounded-full shadow-md group-hover:scale-110 ${isUnread
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 ring-4 ring-blue-100'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                          }`}>
                          <span className="text-base font-bold text-white" aria-hidden="true">
                            {getActivityIcon(activityType)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-6">
                          <p className={`text-sm leading-relaxed ${isUnread ? 'font-bold text-gray-900' : 'font-normal text-gray-600'
                            }`}>
                            {note.message}
                          </p>

                          {note.reservation_no && (
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${isUnread
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-blue-100 text-blue-700'
                                }`}>
                                📋 {note.reservation_no}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <p className={`text-xs font-semibold ${isUnread ? 'text-blue-600' : 'text-blue-500'
                              }`}>
                              {getTimeAgo(note.created_at)}
                            </p>
                            <span className="text-xs text-gray-400">•</span>
                            <span className={`text-xs capitalize ${isUnread ? 'text-gray-700 font-medium' : 'text-gray-500'
                              }`}>
                              {activityType.replace("_", " ")}
                            </span>
                          </div>

                          {isUnread && (
                            <div className="mt-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-red-600 bg-red-50 rounded-full border border-red-200">
                                <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                                NEW
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Arrow indicator */}
                        <div className="flex-shrink-0 mt-2">
                          <svg className={`w-5 h-5 transition-colors ${isUnread ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'
                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {unreadCount > 0 && (
            <div className="flex-shrink-0 px-5 py-3 border-t border-blue-100 bg-gradient-to-r from-blue-50 to-white">
              <button
                onClick={handleMarkAllAsRead}
                className="w-full px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                ✓ Mark all {unreadCount} as read
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Detail Modal */
        <div
          className="fixed right-6 top-20 w-full max-w-md bg-white/95 backdrop-blur-xl border border-blue-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn max-h-[600px] flex flex-col"
          role="dialog"
          aria-label="Notification details"
          aria-modal="true"
        >
          <div className="flex items-center justify-between flex-shrink-0 px-5 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
            <button
              onClick={handleCloseDetail}
              className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
              aria-label="Back to notifications"
            >
              <ChevronLeft size={18} />
              <span className="text-sm font-medium">Back</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 transition-colors rounded-lg hover:bg-white/20"
              aria-label="Close"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <span className="text-2xl font-bold text-white" aria-hidden="true">
                {getActivityIcon(getActivityType(selectedNotification.message))}
              </span>
            </div>

            <h3 className="mb-4 text-lg font-bold text-center text-gray-900">
              Notification Details
            </h3>

            <div className="p-4 mb-4 rounded-lg bg-blue-50 border-l-4 border-blue-500">
              <p className="text-sm leading-relaxed text-gray-800 font-medium">
                {selectedNotification.message}
              </p>
            </div>

            <div className="space-y-3">
              {selectedNotification.reservation_no && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Reservation No.</span>
                  <span className="text-sm font-bold text-gray-900">{selectedNotification.reservation_no}</span>
                </div>
              )}

              {selectedNotification.account_id && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Account ID</span>
                  <span className="text-sm font-bold text-gray-900">#{selectedNotification.account_id}</span>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-600">Time</span>
                <span className="text-sm font-bold text-gray-900">
                  {new Date(selectedNotification.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Notification;