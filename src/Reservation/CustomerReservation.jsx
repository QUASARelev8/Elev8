// import React, { useState, useEffect } from 'react';
// import { supabase } from "../lib/supabaseClient";
// import Swal from 'sweetalert2';
// import DatePicker from 'react-datepicker';
// import "react-datepicker/dist/react-datepicker.css";
// import { Clock, Calendar, DollarSign, AlertCircle, CheckCircle, XCircle } from 'lucide-react';


// const CustomerReservation = () => {
//   // Existing state variables
//   const [reservations, setReservations] = useState([]);
//   const [tables, setTables] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState('pending');
//   const [currentUser, setCurrentUser] = useState(null);
  
//   // Additional state variables for reschedule
//   const [showReschedule, setShowReschedule] = useState(false);
//   const [rescheduleData, setRescheduleData] = useState(null);
//   const [tableInfos, setTableInfos] = useState([]);
//   const [durations, setDurations] = useState([]);
//   const [timeDates, setTimeDates] = useState([]);
//   const [types, setTypes] = useState([]);
//   const [selectedTable, setSelectedTable] = useState(null);
//   const [rescheduleForm, setRescheduleForm] = useState({
//     date: '',
//     time: '',
//     duration: ''
//   });
//   const [availableTimes, setAvailableTimes] = useState([]);

// useEffect(() => {
//   getCurrentUser();
// }, []);

// useEffect(() => {
//   if (currentUser) {
//     fetchReservations();
//   }
// }, [currentUser, activeTab]);

// const getCurrentUser = () => {
//   try {
//     // Get user session from localStorage
//     const userSession = localStorage.getItem('userSession');
    
//     if (!userSession) {
//       Swal.fire({
//         icon: 'error',
//         title: 'Not Logged In',
//         text: 'Please log in to view your reservations',
//       });
//       return;
//     }

//     const userData = JSON.parse(userSession);
    
//     if (!userData.account_id) {
//       Swal.fire({
//         icon: 'error',
//         title: 'Invalid Session',
//         text: 'Please log in again',
//       });
//       return;
//     }

//     // Set current user with account_id from localStorage
//     setCurrentUser({
//       account_id: userData.account_id,
//       email: userData.email,
//       role: userData.role,
//       full_name: userData.full_name
//     });
//   } catch (error) {
//     console.error('Error getting user:', error);
//     Swal.fire({
//       icon: 'error',
//       title: 'Error',
//       text: 'Failed to get user information',
//     });
//   }
// };
// const fetchReservations = async () => {
//   try {
//     setLoading(true);

//     // Fetch tables
//     const { data: tablesData, error: tablesError } = await supabase
//       .from('billiard_table')
//       .select('*');

//     if (tablesError) throw tablesError;
//     setTables(tablesData || []);

//     // Fetch table infos
//     const { data: infosData, error: infosError } = await supabase
//       .from('billiard_table_info')
//       .select('*');

//     if (infosError) throw infosError;
//     setTableInfos(infosData || []);

//     // Fetch durations
//     const { data: durationsData, error: durationsError } = await supabase
//       .from('duration')
//       .select('*')
//       .order('hours', { ascending: true });

//     if (durationsError) throw durationsError;
//     setDurations(durationsData || []);

//     // Fetch time dates
//     const { data: timeDatesData, error: timeDatesError } = await supabase
//       .from('TimeDate')
//       .select('*');

//     if (timeDatesError) throw timeDatesError;
//     setTimeDates(timeDatesData || []);

//     // Fetch billiard types
//     const { data: typesData, error: typesError } = await supabase
//       .from('billiard_type')
//       .select('*')
//       .order('billiard_type', { ascending: true });

//     if (typesError) throw typesError;
//     setTypes(typesData || []);

//     // Fetch reservations based on status using account_id
//     let query = supabase
//       .from('reservation')
//       .select('*')
//       .eq('account_id', currentUser.account_id)
//       .order('created_at', { ascending: false });

//     if (activeTab === 'pending') {
//       query = query.eq('status', 'pending');
//     } else if (activeTab === 'upcoming') {
//       query = query.eq('status', 'confirmed');
//     } else if (activeTab === 'completed') {
//       query = query.in('status', ['completed', 'cancelled']);
//     }

//     const { data: reservationsData, error: reservationsError } = await query;

//     if (reservationsError) throw reservationsError;

//     setReservations(reservationsData || []);
//   } catch (error) {
//     console.error('Error fetching reservations:', error);
//     Swal.fire({
//       icon: 'error',
//       title: 'Error',
//       text: 'Failed to fetch reservations',
//     });
//   } finally {
//     setLoading(false);
//   }
// };
// const getTodayDate = () => {
//   const today = new Date();
//   const year = today.getFullYear();
//   const month = String(today.getMonth() + 1).padStart(2, '0');
//   const day = String(today.getDate()).padStart(2, '0');
//   return `${year}-${month}-${day}`;
// };

// const isDateClosed = (date) => {
//   if (!date) return false;
  
//   let dateString = date;
//   if (date instanceof Date) {
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, '0');
//     const day = String(date.getDate()).padStart(2, '0');
//     dateString = `${year}-${month}-${day}`;
//   }
  
//   const closedDays = timeDates.filter(td => td.CloseDay);
//   return closedDays.some(cd => cd.CloseDay === dateString);
// };

// const getDayNameFromDate = (dateString) => {
//   if (!dateString) return null;
  
//   const date = new Date(dateString);
//   const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//   return days[date.getDay()];
// };

// const isTimeInPast = (selectedTime, date) => {
//   if (!date) return false;
  
//   const today = getTodayDate();
//   if (date !== today) return false;
  
//   const now = new Date();
//   const currentHours = now.getHours();
  
//   const [time, period] = selectedTime.split(' ');
//   let [hours] = time.split(':').map(Number);
  
//   if (period === 'PM' && hours !== 12) hours += 12;
//   if (period === 'AM' && hours === 12) hours = 0;
  
//   return hours <= currentHours;
// };

// const getAvailableTimes = async (tableId, date) => {
//   if (!date) {
//     return [];
//   }

//   if (isDateClosed(date)) {
//     return [];
//   }

//   const dayName = getDayNameFromDate(date);
  
//   const schedules = timeDates.filter(td => 
//     td.Date === dayName && 
//     td.Actions === 'Active' && 
//     !td.CloseDay
//   );

//   if (schedules.length === 0) {
//     return [];
//   }

//   const activeSchedule = schedules[0];
//   const openTime = activeSchedule.OpenTime;
//   const closeTime = activeSchedule.CloseTime;

//   const timeSlots = [];
//   const today = getTodayDate();
  
//   for (let hour = openTime; hour <= closeTime; hour++) {
//     const period = hour >= 12 ? 'PM' : 'AM';
//     const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
//     const timeString = `${displayHour}:00 ${period}`;
    
//     const isPast = date === today && isTimeInPast(timeString, date);
    
//     timeSlots.push({
//       time: timeString,
//       isPast: isPast
//     });
//   }

//   const availabilityChecks = timeSlots.map(async (slot) => {
//     if (slot.isPast) {
//       return { ...slot, available: false };
//     }
    
//     try {
//       const { data: isAvailable, error } = await supabase
//         .rpc('is_table_available', {
//           p_table_id: tableId,
//           p_reservation_date: date,
//           p_start_time: slot.time,
//           p_duration_hours: 1
//         });
      
//       return {
//         time: slot.time,
//         available: !error && isAvailable
//       };
//     } catch (err) {
//       console.error('Error checking availability:', err);
//       return { time: slot.time, available: false };
//     }
//   });

//   const results = await Promise.all(availabilityChecks);
  
//   return results;
// };

// const getTablesByType = (typeName) => {
//   return tables.filter(table => {
//     const info = tableInfos.find(i => i.table_id === table.table_id);
//     if (!info) return false;
//     return info.billiard_type === typeName;
//   });
// };

//   const handleCancel = async (reservationId) => {
//     const result = await Swal.fire({
//       title: 'Cancel Reservation?',
//       text: 'Are you sure you want to cancel this reservation?',
//       icon: 'warning',
//       showCancelButton: true,
//       confirmButtonColor: '#dc3545',
//       cancelButtonColor: '#6c757d',
//       confirmButtonText: 'Yes, cancel it!'
//     });

//     if (result.isConfirmed) {
//       try {
//         const { error } = await supabase
//           .from('reservation')
//           .update({ status: 'cancelled' })
//           .eq('id', reservationId);

//         if (error) throw error;

//         Swal.fire({
//           icon: 'success',
//           title: 'Cancelled!',
//           text: 'Your reservation has been cancelled.',
//           timer: 1500,
//           showConfirmButton: false,
//         });

//         fetchReservations();
//       } catch (error) {
//         console.error('Error cancelling reservation:', error);
//         Swal.fire({
//           icon: 'error',
//           title: 'Error',
//           text: 'Failed to cancel reservation',
//         });
//       }
//     }
//   };

// const handleReschedule = (reservation) => {
//   setRescheduleData(reservation);
//   setShowReschedule(true);
//   setSelectedTable(null);
//   setRescheduleForm({
//     date: '',
//     time: '',
//     duration: durations.length > 0 ? durations[0].id : ''
//   });
//   setAvailableTimes([]);
// };

// const handleTableSelect = (table, info) => {
//   if (info.status !== 'Available') return;
  
//   setSelectedTable({ ...table, info });
//   setRescheduleForm({
//     date: '',
//     time: '',
//     duration: durations.length > 0 ? durations[0].id : ''
//   });
//   setAvailableTimes([]);
// };

// const handleRescheduleFormChange = async (field, value) => {
//   setRescheduleForm(prev => ({
//     ...prev,
//     [field]: value,
//     ...(field === 'date' ? { time: '' } : {})
//   }));
  
//   if (field === 'date' && selectedTable) {
//     const times = await getAvailableTimes(selectedTable.table_id, value);
//     setAvailableTimes(times);
//   }
// };

// const handleConfirmReschedule = async () => {
//   if (!selectedTable) {
//     Swal.fire({
//       icon: 'warning',
//       title: 'No Table Selected',
//       text: 'Please select a table',
//     });
//     return;
//   }

//   if (!rescheduleForm.date || !rescheduleForm.time) {
//     Swal.fire({
//       icon: 'warning',
//       title: 'Missing Information',
//       text: 'Please select date and time',
//     });
//     return;
//   }

//   try {
//     if (rescheduleForm.date < getTodayDate()) {
//       Swal.fire({
//         icon: 'error',
//         title: 'Invalid Date',
//         text: 'Cannot book past dates',
//       });
//       return;
//     }

//     if (rescheduleForm.date === getTodayDate() && isTimeInPast(rescheduleForm.time, rescheduleForm.date)) {
//       Swal.fire({
//         icon: 'error',
//         title: 'Invalid Time',
//         text: 'Cannot book past times',
//       });
//       return;
//     }

//     const selectedDuration = durations.find(d => d.id === parseInt(rescheduleForm.duration));
    
//     const { data: endTimeData, error: endTimeError } = await supabase
//       .rpc('calculate_end_time', {
//         p_start_time: rescheduleForm.time,
//         p_duration_hours: selectedDuration.hours
//       });

//     if (endTimeError) throw endTimeError;

//     const { data: isAvailable, error: availError } = await supabase
//       .rpc('is_table_available', {
//         p_table_id: selectedTable.table_id,
//         p_reservation_date: rescheduleForm.date,
//         p_start_time: rescheduleForm.time,
//         p_duration_hours: selectedDuration.hours
//       });

//     if (availError) throw availError;
    
//     if (!isAvailable) {
//       Swal.fire({
//         icon: 'error',
//         title: 'Table Not Available',
//         text: 'This table is already booked at the selected time. Please choose a different time.',
//       });
//       return;
//     }

//     // Calculate new total bill
//     const newTotalBill = parseFloat(selectedTable.info.price) * selectedDuration.hours;

//     // Update reservation
//     const { error: updateError } = await supabase
//       .from('reservation')
//       .update({
//         table_id: selectedTable.table_id,
//         billiard_type: selectedTable.info.billiard_type,
//         reservation_date: rescheduleForm.date,
//         start_time: rescheduleForm.time,
//         time_end: endTimeData,
//         duration: selectedDuration.hours,
//         total_bill: newTotalBill
//       })
//       .eq('id', rescheduleData.id);

//     if (updateError) throw updateError;

//     Swal.fire({
//       icon: 'success',
//       title: 'Rescheduled!',
//       text: 'Your reservation has been rescheduled successfully.',
//       timer: 1500,
//       showConfirmButton: false,
//     });

//     setShowReschedule(false);
//     setRescheduleData(null);
//     setSelectedTable(null);
//     fetchReservations();

//   } catch (error) {
//     console.error('Error rescheduling reservation:', error);
//     Swal.fire({
//       icon: 'error',
//       title: 'Error',
//       text: error.message || 'Failed to reschedule reservation',
//     });
//   }
// };

// const handleCancelReschedule = () => {
//   setShowReschedule(false);
//   setRescheduleData(null);
//   setSelectedTable(null);
// };
//   const getTableName = (tableId) => {
//     const table = tables.find(t => t.table_id === tableId);
//     return table ? table.table_name : 'Unknown Table';
//   };

//   const getStatusColor = (status) => {
//     switch (status.toLowerCase()) {
//       case 'pending':
//         return '#ff9800';
//       case 'confirmed':
//         return '#28a745';
//       case 'completed':
//         return '#6c757d';
//       case 'cancelled':
//         return '#dc3545';
//       default:
//         return '#6c757d';
//     }
//   };

//   const getStatusIcon = (status) => {
//     switch (status.toLowerCase()) {
//       case 'pending':
//         return <AlertCircle size={20} />;
//       case 'confirmed':
//         return <CheckCircle size={20} />;
//       case 'completed':
//         return <CheckCircle size={20} />;
//       case 'cancelled':
//         return <XCircle size={20} />;
//       default:
//         return <Clock size={20} />;
//     }
//   };

//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric'
//     });
//   };

//   if (loading) {
//     return (
//       <div style={{
//         display: 'flex',
//         justifyContent: 'center',
//         alignItems: 'center',
//         minHeight: '100vh',
//         backgroundColor: '#f5f5f5'
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{
//             width: '50px',
//             height: '50px',
//             border: '5px solid #e0e0e0',
//             borderTop: '5px solid #28a745',
//             borderRadius: '50%',
//             animation: 'spin 1s linear infinite',
//             margin: '0 auto'
//           }}></div>
//           <p style={{ marginTop: '15px', color: '#666' }}>Loading reservations...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div style={{
//       minHeight: '100vh',
//       backgroundColor: '#f5f5f5',
//       padding: '40px 20px'
//     }}>
//       <div style={{
//         maxWidth: '1200px',
//         margin: '0 auto'
//       }}>
//         {/* Header */}
//         <div style={{
//           backgroundColor: 'white',
//           padding: '40px',
//           borderRadius: '12px',
//           marginBottom: '30px',
//           boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
//           textAlign: 'center'
//         }}>
//           <h1 style={{
//             margin: '0 0 10px 0',
//             fontSize: '32px',
//             fontWeight: '700',
//             color: '#333'
//           }}>
//             My Reservations
//           </h1>
//           <p style={{
//             margin: 0,
//             fontSize: '16px',
//             color: '#666'
//           }}>
//             Manage your current and upcoming bookings
//           </p>
//         </div>

//         {/* Tabs */}
//         <div style={{
//           display: 'flex',
//           gap: '10px',
//           marginBottom: '30px',
//           justifyContent: 'center',
//           flexWrap: 'wrap'
//         }}>
//           {['pending', 'upcoming', 'completed'].map(tab => (
//             <button
//               key={tab}
//               onClick={() => setActiveTab(tab)}
//               style={{
//                 padding: '12px 30px',
//                 backgroundColor: activeTab === tab ? '#28a745' : '#e0e0e0',
//                 color: activeTab === tab ? 'white' : '#666',
//                 border: 'none',
//                 borderRadius: '8px',
//                 fontSize: '16px',
//                 fontWeight: '600',
//                 cursor: 'pointer',
//                 transition: 'all 0.2s',
//                 textTransform: 'capitalize'
//               }}
//             >
//               {tab}
//             </button>
//           ))}
//         </div>

//         {/* Warning Message for Pending */}
//         {activeTab === 'pending' && reservations.length > 0 && (
//           <div style={{
//             backgroundColor: '#fff3cd',
//             border: '1px solid #ffc107',
//             borderRadius: '8px',
//             padding: '15px 20px',
//             marginBottom: '20px',
//             display: 'flex',
//             alignItems: 'center',
//             gap: '10px'
//           }}>
//             <AlertCircle size={24} color="#856404" />
//             <p style={{
//               margin: 0,
//               color: '#856404',
//               fontSize: '15px',
//               fontWeight: '500'
//             }}>
//               Your reservation is being processed. Please wait for confirmation.
//             </p>
//           </div>
//         )}

//         {/* Reservations List */}
//         <div style={{
//           display: 'flex',
//           flexDirection: 'column',
//           gap: '20px'
//         }}>
//           {reservations.length === 0 ? (
//             <div style={{
//               backgroundColor: 'white',
//               padding: '60px 40px',
//               borderRadius: '12px',
//               textAlign: 'center',
//               boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
//             }}>
//               <p style={{
//                 margin: 0,
//                 fontSize: '18px',
//                 color: '#999'
//               }}>
//                 No {activeTab} reservations found.
//               </p>
//             </div>
//           ) : (
//             reservations.map(reservation => (
//               <div
//                 key={reservation.id}
//                 style={{
//                   backgroundColor: 'white',
//                   padding: '25px',
//                   borderRadius: '12px',
//                   boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
//                   display: 'flex',
//                   gap: '20px',
//                   alignItems: 'flex-start',
//                   position: 'relative',
//                   flexWrap: 'wrap'
//                 }}
//               >
//                 {/* Icon */}
//                 <div style={{
//                   width: '50px',
//                   height: '50px',
//                   borderRadius: '50%',
//                   backgroundColor: `${getStatusColor(reservation.status)}20`,
//                   color: getStatusColor(reservation.status),
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   flexShrink: 0
//                 }}>
//                   {getStatusIcon(reservation.status)}
//                 </div>

//                 {/* Content */}
//                 <div style={{ flex: 1, minWidth: '250px' }}>
//                   {/* Title and Status Badge */}
//                   <div style={{
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'flex-start',
//                     marginBottom: '10px',
//                     flexWrap: 'wrap',
//                     gap: '10px'
//                   }}>
//                     <div>
//                       <h3 style={{
//                         margin: '0 0 5px 0',
//                         fontSize: '20px',
//                         fontWeight: '700',
//                         color: '#333'
//                       }}>
//                         {getTableName(reservation.table_id)} - {reservation.billiard_type || 'Standard'}
//                       </h3>
//                       <p style={{
//                         margin: 0,
//                         fontSize: '14px',
//                         color: '#666'
//                       }}>
//                         Reference ID: RF{String(reservation.id).padStart(3, '0')}
//                       </p>
//                     </div>
//                     <div style={{
//                       padding: '6px 16px',
//                       borderRadius: '20px',
//                       fontSize: '13px',
//                       fontWeight: '700',
//                       backgroundColor: getStatusColor(reservation.status),
//                       color: 'white',
//                       textTransform: 'uppercase'
//                     }}>
//                       {reservation.status === 'confirmed' ? 'CONFIRMED' : reservation.status.toUpperCase()}
//                     </div>
//                   </div>

//                   {/* Details */}
//                   <div style={{
//                     display: 'flex',
//                     gap: '15px',
//                     marginBottom: '10px',
//                     fontSize: '14px',
//                     color: '#666',
//                     flexWrap: 'wrap'
//                   }}>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                       <Calendar size={16} />
//                       <span>{formatDate(reservation.reservation_date)}</span>
//                     </div>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                       <Clock size={16} />
//                       <span>{reservation.start_time} - {reservation.time_end}</span>
//                     </div>
//                   </div>

//                   {/* Duration, Amount, Payment */}
//                   <div style={{
//                     display: 'grid',
//                     gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
//                     gap: '15px',
//                     marginTop: '15px',
//                     paddingTop: '15px',
//                     borderTop: '1px solid #e0e0e0'
//                   }}>
//                     <div>
//                       <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#999', fontWeight: '500' }}>
//                         Duration:
//                       </p>
//                       <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#333' }}>
//                         {reservation.duration} hour{reservation.duration > 1 ? 's' : ''}
//                       </p>
//                     </div>
//                     <div>
//                       <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#999', fontWeight: '500' }}>
//                         Amount:
//                       </p>
//                       <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#333' }}>
//                         ₱{(reservation.total_bill || 0).toFixed(2)}
//                       </p>
//                     </div>
//                     <div>
//                       <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#999', fontWeight: '500' }}>
//                         Payment:
//                       </p>
//                       <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#28a745' }}>
//                         {reservation.paymentMethod === 'full' ? 'Paid' : 
//                          reservation.paymentMethod === 'half' ? 'Partial' : 'Pending'}
//                       </p>
//                     </div>
//                   </div>

//                   {/* Action Buttons */}
//                   {reservation.status === 'pending' && (
//                     <div style={{
//                       display: 'flex',
//                       gap: '10px',
//                       marginTop: '20px'
//                     }}>
//                       <button
//                         onClick={() => handleCancel(reservation.id)}
//                         style={{
//                           padding: '10px 20px',
//                           backgroundColor: '#dc3545',
//                           color: 'white',
//                           border: 'none',
//                           borderRadius: '6px',
//                           fontSize: '14px',
//                           fontWeight: '600',
//                           cursor: 'pointer',
//                           transition: 'background-color 0.2s'
//                         }}
//                         onMouseEnter={e => e.currentTarget.style.backgroundColor = '#c82333'}
//                         onMouseLeave={e => e.currentTarget.style.backgroundColor = '#dc3545'}
//                       >
//                         Cancel
//                       </button>
//                     <button
//   onClick={() => handleReschedule(reservation)}
//   style={{
//     padding: '10px 20px',
//     backgroundColor: '#007bff',
//     color: 'white',
//     border: 'none',
//     borderRadius: '6px',
//     fontSize: '14px',
//     fontWeight: '600',
//     cursor: 'pointer',
//     transition: 'background-color 0.2s'
//   }}
//   onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0056b3'}
//   onMouseLeave={e => e.currentTarget.style.backgroundColor = '#007bff'}
// >
//   Reschedule
// </button>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       </div>
// {/* Reschedule Modal */}
// {showReschedule && rescheduleData && (
//   <div style={{
//     position: 'fixed',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     display: 'flex',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 1000,
//     padding: '20px',
//     overflow: 'auto'
//   }}>
//     <div style={{
//       backgroundColor: 'white',
//       borderRadius: '12px',
//       maxWidth: '1200px',
//       width: '100%',
//       maxHeight: '90vh',
//       overflow: 'auto',
//       boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
//     }}>
//       {/* Modal Header */}
//       <div style={{
//         padding: '30px',
//         borderBottom: '1px solid #e0e0e0',
//         position: 'sticky',
//         top: 0,
//         backgroundColor: 'white',
//         zIndex: 1
//       }}>
//         <h2 style={{
//           margin: '0 0 10px 0',
//           fontSize: '28px',
//           fontWeight: '700',
//           color: '#333'
//         }}>
//           Reschedule Reservation
//         </h2>
//         <p style={{
//           margin: 0,
//           fontSize: '15px',
//           color: '#666'
//         }}>
//           Current: {getTableName(rescheduleData.table_id)} - {formatDate(rescheduleData.reservation_date)} at {rescheduleData.start_time}
//         </p>
//       </div>

//       {/* Modal Content */}
//       <div style={{ padding: '30px' }}>
        
//         {/* Table Selection */}
//         {types.map((type, typeIndex) => {
//           const typeTables = getTablesByType(type.billiard_type);
          
//           if (typeTables.length === 0) return null;

//           const typeColors = ['#ff9800', '#2196F3', '#9c27b0', '#4caf50', '#f44336', '#00bcd4'];
//           const typeColor = typeColors[typeIndex % typeColors.length];

//           return (
//             <div key={type.id} style={{
//               marginBottom: '30px'
//             }}>
//               <h3 style={{
//                 margin: '0 0 20px 0',
//                 fontSize: '20px',
//                 fontWeight: '700',
//                 color: typeColor
//               }}>
//                 {type.billiard_type} Tables
//               </h3>

//               <div style={{
//                 display: 'grid',
//                 gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
//                 gap: '15px'
//               }}>
//                 {typeTables.map(table => {
//                   const info = tableInfos.find(i => i.table_id === table.table_id);
//                   if (!info) return null;

//                   const isSelected = selectedTable?.table_id === table.table_id;
//                   const isAvailable = info.status === 'Available';

//                   return (
//                     <div
//                       key={table.table_id}
//                       onClick={() => handleTableSelect(table, info)}
//                       style={{
//                         border: isSelected ? '3px solid #28a745' : '1px solid #e0e0e0',
//                         borderRadius: '8px',
//                         overflow: 'hidden',
//                         cursor: isAvailable ? 'pointer' : 'not-allowed',
//                         transition: 'all 0.3s',
//                         opacity: isAvailable ? 1 : 0.6,
//                         position: 'relative',
//                         boxShadow: isSelected ? '0 4px 12px rgba(40,167,69,0.3)' : '0 2px 6px rgba(0,0,0,0.1)'
//                       }}
//                     >
//                       <div style={{
//                         position: 'absolute',
//                         top: '8px',
//                         right: '8px',
//                         padding: '3px 10px',
//                         borderRadius: '15px',
//                         fontSize: '11px',
//                         fontWeight: '700',
//                         backgroundColor: isAvailable ? '#28a745' : '#dc3545',
//                         color: 'white'
//                       }}>
//                         {info.status.toUpperCase()}
//                       </div>

//                       <div style={{
//                         height: '100px',
//                         backgroundColor: '#f0f0f0',
//                         display: 'flex',
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         color: '#999',
//                         fontSize: '12px'
//                       }}>
//                         Table Image
//                       </div>

//                       <div style={{
//                         padding: '15px',
//                         textAlign: 'center'
//                       }}>
//                         <h4 style={{
//                           margin: '0 0 5px 0',
//                           fontSize: '16px',
//                           fontWeight: '700',
//                           color: '#333'
//                         }}>
//                           {table.table_name}
//                         </h4>
//                         <p style={{
//                           margin: 0,
//                           fontSize: '14px',
//                           fontWeight: '700',
//                           color: '#28a745'
//                         }}>
//                           ₱{parseFloat(info.price).toFixed(2)}/hr
//                         </p>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           );
//         })}

//         {/* Date, Time, Duration Selection */}
//         {selectedTable && (
//           <div style={{
//             marginTop: '30px',
//             padding: '25px',
//             backgroundColor: '#f8f9fa',
//             borderRadius: '8px',
//             border: '2px solid #28a745'
//           }}>
//             <h3 style={{
//               margin: '0 0 20px 0',
//               fontSize: '18px',
//               fontWeight: '600',
//               color: '#28a745'
//             }}>
//               Selected: {selectedTable.table_name} - ₱{parseFloat(selectedTable.info.price).toFixed(2)}/hour
//             </h3>

//             <div style={{
//               display: 'grid',
//               gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
//               gap: '15px'
//             }}>
//               {/* Date */}
//               <div>
//                 <label style={{
//                   display: 'block',
//                   marginBottom: '8px',
//                   fontSize: '14px',
//                   fontWeight: '600',
//                   color: '#555'
//                 }}>
//                   Date
//                 </label>
//                 <DatePicker
//                   selected={rescheduleForm.date ? new Date(rescheduleForm.date + 'T00:00:00') : null}
//                   onChange={(date) => {
//                     if (!date) return;
                    
//                     const year = date.getFullYear();
//                     const month = String(date.getMonth() + 1).padStart(2, '0');
//                     const day = String(date.getDate()).padStart(2, '0');
//                     const dateString = `${year}-${month}-${day}`;
                    
//                     if (isDateClosed(dateString)) {
//                       Swal.fire({
//                         icon: 'error',
//                         title: 'Date Closed',
//                         text: 'This date is not available for booking',
//                       });
//                       return;
//                     }
                    
//                     handleRescheduleFormChange('date', dateString);
//                   }}
//                   minDate={new Date()}
//                   dateFormat="dd/MM/yyyy"
//                   placeholderText="Select a date"
//                   filterDate={(date) => {
//                     const year = date.getFullYear();
//                     const month = String(date.getMonth() + 1).padStart(2, '0');
//                     const day = String(date.getDate()).padStart(2, '0');
//                     const dateString = `${year}-${month}-${day}`;
//                     return !isDateClosed(dateString);
//                   }}
//                   className="custom-datepicker"
//                   wrapperClassName="datepicker-wrapper"
//                 />
//               </div>

//               {/* Time */}
//               <div>
//                 <label style={{
//                   display: 'block',
//                   marginBottom: '8px',
//                   fontSize: '14px',
//                   fontWeight: '600',
//                   color: '#555'
//                 }}>
//                   Time
//                 </label>
//                 <select
//                   value={rescheduleForm.time}
//                   onChange={(e) => handleRescheduleFormChange('time', e.target.value)}
//                   disabled={!rescheduleForm.date || isDateClosed(rescheduleForm.date) || availableTimes.length === 0}
//                   style={{
//                     width: '100%',
//                     padding: '10px',
//                     border: '1px solid #ddd',
//                     borderRadius: '6px',
//                     fontSize: '14px',
//                     boxSizing: 'border-box',
//                     cursor: (!rescheduleForm.date || isDateClosed(rescheduleForm.date) || availableTimes.length === 0) ? 'not-allowed' : 'pointer',
//                     opacity: (!rescheduleForm.date || isDateClosed(rescheduleForm.date) || availableTimes.length === 0) ? 0.6 : 1
//                   }}
//                 >
//                   <option value="">
//                     {!rescheduleForm.date 
//                       ? 'Select a date first' 
//                       : isDateClosed(rescheduleForm.date)
//                       ? 'Date is closed'
//                       : 'Select time'
//                     }
//                   </option>
//                   {availableTimes.map(timeObj => (
//                     <option 
//                       key={timeObj.time} 
//                       value={timeObj.time}
//                       disabled={!timeObj.available}
//                     >
//                       {timeObj.time} {!timeObj.available ? '(Not Available)' : ''}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Duration */}
//               <div>
//                 <label style={{
//                   display: 'block',
//                   marginBottom: '8px',
//                   fontSize: '14px',
//                   fontWeight: '600',
//                   color: '#555'
//                 }}>
//                   Duration
//                 </label>
//                 <select
//                   value={rescheduleForm.duration}
//                   onChange={(e) => handleRescheduleFormChange('duration', e.target.value)}
//                   style={{
//                     width: '100%',
//                     padding: '10px',
//                     border: '1px solid #ddd',
//                     borderRadius: '6px',
//                     fontSize: '14px',
//                     boxSizing: 'border-box'
//                   }}
//                 >
//                   {durations.map(duration => (
//                     <option key={duration.id} value={duration.id}>
//                       {duration.hours} hour{duration.hours > 1 ? 's' : ''}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Modal Footer */}
//       <div style={{
//         padding: '20px 30px',
//         borderTop: '1px solid #e0e0e0',
//         display: 'flex',
//         justifyContent: 'flex-end',
//         gap: '10px',
//         position: 'sticky',
//         bottom: 0,
//         backgroundColor: 'white'
//       }}>
//         <button
//           onClick={handleCancelReschedule}
//           style={{
//             padding: '12px 30px',
//             backgroundColor: '#6c757d',
//             color: 'white',
//             border: 'none',
//             borderRadius: '6px',
//             fontSize: '16px',
//             fontWeight: '600',
//             cursor: 'pointer'
//           }}
//         >
//           Cancel
//         </button>
//         <button
//           onClick={handleConfirmReschedule}
//           disabled={!selectedTable || !rescheduleForm.date || !rescheduleForm.time}
//           style={{
//             padding: '12px 30px',
//             backgroundColor: '#28a745',
//             color: 'white',
//             border: 'none',
//             borderRadius: '6px',
//             fontSize: '16px',
//             fontWeight: '600',
//             cursor: (!selectedTable || !rescheduleForm.date || !rescheduleForm.time) ? 'not-allowed' : 'pointer',
//             opacity: (!selectedTable || !rescheduleForm.date || !rescheduleForm.time) ? 0.5 : 1
//           }}
//         >
//           Confirm Reschedule
//         </button>
//       </div>
//     </div>
//   </div>
// )}
//       <style>
//         {`
//           @keyframes spin {
//             0% { transform: rotate(0deg); }
//             100% { transform: rotate(360deg); }
//           }
//             .datepicker-wrapper {
//   width: 100%;
// }

// .custom-datepicker {
//   width: 100%;
//   padding: 10px;
//   border: 1px solid #ddd;
//   borderRadius: 6px;
//   fontSize: 14px;
//   boxSizing: border-box;
//   cursor: pointer;
// }

// .custom-datepicker:focus {
//   outline: none;
//   border-color: #17a2b8;
// }

// .react-datepicker {
//   font-family: inherit;
//   border: 1px solid #ddd;
//   border-radius: 8px;
//   box-shadow: 0 4px 12px rgba(0,0,0,0.15);
// }

// .react-datepicker__header {
//   background-color: #f8f9fa;
//   border-bottom: 1px solid #dee2e6;
//   padding: 10px 0;
// }

// .react-datepicker__day--selected {
//   background-color: #28a745 !important;
//   color: white !important;
// }
//         `}
//       </style>
//     </div>
//   );
// };

// export default CustomerReservation;