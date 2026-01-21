import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from "../lib/supabaseClient";

const localizer = momentLocalizer(moment);

export default function ReservationCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservation')
        .select('*')
        .order('reservation_date', { ascending: true });

      if (error) throw error;

      const calendarEvents = data.map(reservation => {
        const startDateTime = moment(`${reservation.reservation_date} ${reservation.start_time}`, 'YYYY-MM-DD HH:mm');
        const endDateTime = reservation.time_end 
          ? moment(`${reservation.reservation_date} ${reservation.time_end}`, 'YYYY-MM-DD HH:mm')
          : startDateTime.clone().add(reservation.duration, 'hours');

        return {
          id: reservation.id,
          title: `Table ${reservation.table_id} - ${reservation.status}`,
          start: startDateTime.toDate(),
          end: endDateTime.toDate(),
          resource: reservation,
          status: reservation.status
        };
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching reservations:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3b82f6';
    
    switch(event.status) {
      case 'pending':
        backgroundColor = '#f59e0b';
        break;
      case 'confirmed':
        backgroundColor = '#10b981';
        break;
      case 'completed':
        backgroundColor = '#6366f1';
        break;
      case 'cancelled':
        backgroundColor = '#ef4444';
        break;
      default:
        backgroundColor = '#3b82f6';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '8px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
  };

 

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Billiard Reservation Calendar
          </h1>
          <p className="text-gray-600">Manage and view all your billiard table reservations</p>
        </div>
        
        <div className="backdrop-blur-lg bg-white/70 border border-white/40 rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Legend</h3>
          <div className="flex gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-amber-500 rounded-lg shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-500 rounded-lg shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700">Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-indigo-500 rounded-lg shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-500 rounded-lg shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700">Cancelled</span>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-lg bg-white/70 border border-white/40 rounded-2xl shadow-xl p-6" style={{ height: '650px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            views={['month', 'week', 'day', 'agenda']}
            defaultView="month"
          />
        </div>

        {selectedEvent && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            onClick={() => setSelectedEvent(null)}
          >
            <div 
              className="backdrop-blur-xl bg-white/90 border border-white/40 rounded-3xl shadow-2xl p-8 max-w-5xl w-full mx-4 transform transition-all" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Reservation Details
                </h2>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="backdrop-blur-sm bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Reservation Number</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedEvent.Reservation_No || 'N/A'}</p>
                </div>

                <div className="backdrop-blur-sm bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Table</p>
                  <p className="text-lg font-semibold text-gray-800">#{selectedEvent.table_id}</p>
                </div>

                <div className="backdrop-blur-sm bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className="text-lg font-semibold capitalize text-gray-800">{selectedEvent.status}</p>
                </div>

                <div className="backdrop-blur-sm bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <p className="text-lg font-semibold text-gray-800">{moment(selectedEvent.reservation_date).format('MMM DD, YYYY')}</p>
                </div>

                <div className="backdrop-blur-sm bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Start Time</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedEvent.start_time}</p>
                </div>

                <div className="backdrop-blur-sm bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">End Time</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedEvent.time_end || 'N/A'}</p>
                </div>

                <div className="backdrop-blur-sm bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedEvent.duration} hours</p>
                </div>

                {selectedEvent.billiard_type && (
                  <div className="backdrop-blur-sm bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                    <p className="text-sm text-gray-600 mb-1">Billiard Type</p>
                    <p className="text-lg font-semibold text-gray-800">{selectedEvent.billiard_type}</p>
                  </div>
                )}

                <div className="backdrop-blur-sm bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedEvent.paymentMethod || 'N/A'}</p>
                </div>

                <div className="backdrop-blur-sm bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Payment Type</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedEvent.payment_type || 'N/A'}</p>
                </div>

                <div className="backdrop-blur-sm bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Customer Status</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedEvent.customer_status || 'N/A'}</p>
                </div>

                <div className="backdrop-blur-sm bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 text-white">
                  <p className="text-sm mb-1 opacity-90">Total Bill</p>
                  <p className="text-2xl font-bold">₱{selectedEvent.total_bill?.toLocaleString() || 0}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedEvent(null)}
                className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}