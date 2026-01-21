import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Payment from '../customer/Payment';


const CustomerDashboard = () => {
  const [tables, setTables] = useState([]);
  const [tableInfos, setTableInfos] = useState([]);
  const [durations, setDurations] = useState([]);
  const [types, setTypes] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedTables, setSelectedTables] = useState([]);
  const [timeDates, setTimeDates] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [reservationData, setReservationData] = useState(null);
  const [tableFormData, setTableFormData] = useState({});
  const [availableTimesCache, setAvailableTimesCache] = useState({});
  const [unavailableDates, setUnavailableDates] = useState({});
 const [maxDurations, setMaxDurations] = useState({});
const [tableStatuses, setTableStatuses] = useState({});
const handleTableFormChange = async (tableId, field, value) => {
  setTableFormData(prev => ({
    ...prev,
    [tableId]: {
      ...prev[tableId],
      [field]: value,
      // Reset time when date changes
      ...(field === 'date' ? { time: '' } : {}),
      // Reset duration to 1 when time changes
      ...(field === 'time' ? { duration: durations.length > 0 ? durations[0].id : '' } : {})
    }
  }));
  
  // Refresh available times when date changes
  if (field === 'date') {
    Swal.fire({
      title: 'Loading available times...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    const times = await getAvailableTimes(tableId, value);
    setAvailableTimesCache(prev => ({
      ...prev,
      [`${tableId}-${value}`]: times
    }));
    
    Swal.close();
  }
  
  // Calculate max duration when time is selected
  if (field === 'time' && value) {
    const currentFormData = tableFormData[tableId] || {};
    const selectedDate = currentFormData.date;
    
    Swal.fire({
      title: 'Checking available hours...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    const maxDuration = await getMaxAvailableDuration(tableId, selectedDate, value);
    
    setMaxDurations(prev => ({
      ...prev,
      [tableId]: maxDuration
    }));
    
    Swal.close();
  }
};
const checkDateAvailability = async (tableId, date) => {
  if (!date || isDateClosed(date)) {
    return false;
  }

  const dayName = getDayNameFromDate(date);
  
  const schedules = timeDates.filter(td => 
    td.Date === dayName && 
    td.Actions === 'Active' && 
    !td.CloseDay
  );

  if (schedules.length === 0) {
    return false;
  }

  const activeSchedule = schedules[0];
  
  // Parse TIME format properly
  const parseTime = (timeString) => {
    if (!timeString) return { hour: 0, minute: 0 };
    const [hour, minute] = timeString.split(':');
    return { 
      hour: parseInt(hour), 
      minute: parseInt(minute) 
    };
  };

  const openTime = parseTime(activeSchedule.OpenTime);
  const closeTime = parseTime(activeSchedule.CloseTime);

  // Check 30-minute intervals
  let currentHour = openTime.hour;
  let currentMinute = openTime.minute;
  
  while (currentHour < closeTime.hour || (currentHour === closeTime.hour && currentMinute < closeTime.minute)) {
    const period = currentHour >= 12 ? 'PM' : 'AM';
    const displayHour = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
    const timeString = `${displayHour}:${String(currentMinute).padStart(2, '0')} ${period}`;
    const dbTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`;
    
    const today = getTodayDate();
    if (date === today && isTimeInPast(timeString, date)) {
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour += 1;
      }
      continue;
    }

    try {
      const { data: isAvailable, error } = await supabase
        .rpc('is_table_available', {
          p_table_id: tableId,
          p_reservation_date: date,
          p_start_time: dbTime,
          p_duration_hours: 0.5
        });
      
      if (!error && isAvailable) {
        return true;
      }
    } catch (err) {
      console.error('Error checking availability:', err);
    }
    
    // Move to next 30-minute interval
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour += 1;
    }
  }

  return false;
};
const checkTableAvailabilityForDate = async (tableId, date) => {
  try {
    const dayName = getDayNameFromDate(date);
    
    const schedules = timeDates.filter(td => 
      td.Date === dayName && 
      td.Actions === 'Active' && 
      !td.CloseDay
    );

    if (schedules.length === 0) {
      return { isFullyBooked: true, reason: 'No schedule' };
    }

    const activeSchedule = schedules[0];
    
    const parseTime = (timeString) => {
      if (!timeString) return { hour: 0, minute: 0 };
      const [hour, minute] = timeString.split(':');
      return { 
        hour: parseInt(hour), 
        minute: parseInt(minute) 
      };
    };

    const openTime = parseTime(activeSchedule.OpenTime);
    const closeTime = parseTime(activeSchedule.CloseTime);

    const totalMinutes = (closeTime.hour * 60 + closeTime.minute) - (openTime.hour * 60 + openTime.minute);
    
    const { data: reservations, error } = await supabase
      .from('reservation')
      .select('start_time, time_end, duration')
      .eq('table_id', tableId)
      .eq('reservation_date', date)
      .neq('status', 'cancelled');

    if (error) throw error;

    if (!reservations || reservations.length === 0) {
      return { isFullyBooked: false, reason: 'Available' };
    }

    let totalReservedMinutes = 0;
    reservations.forEach(res => {
      const durationHours = parseFloat(res.duration);
      totalReservedMinutes += durationHours * 60;
    });

    const occupancyRate = (totalReservedMinutes / totalMinutes) * 100;
    
    if (occupancyRate >= 90) {
      return { isFullyBooked: true, reason: 'Fully Booked' };
    }

    return { isFullyBooked: false, reason: 'Available' };

  } catch (error) {
    console.error('Error checking table availability:', error);
    return { isFullyBooked: false, reason: 'Available' };
  }
};
const preloadUnavailableDates = async (tableId) => {
  const unavailableDatesList = [];
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 60); // Check next 60 days

  const checkDate = new Date(today);
  
  while (checkDate <= endDate) {
    const year = checkDate.getFullYear();
    const month = String(checkDate.getMonth() + 1).padStart(2, '0');
    const day = String(checkDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const hasAvailability = await checkDateAvailability(tableId, dateString);
    
    if (!hasAvailability) {
      unavailableDatesList.push(dateString);
    }
    
    checkDate.setDate(checkDate.getDate() + 1);
  }

  setUnavailableDates(prev => ({
    ...prev,
    [tableId]: unavailableDatesList
  }));
};
const getTableStatus = async (tableId, info) => {
  // 1. ✅ ALWAYS check the latest status from database first
  try {
    const { data: latestInfo, error } = await supabase
      .from('billiard_table_info')
      .select('status')
      .eq('table_id', tableId)
      .single();
    
    if (error) {
      console.error('Error fetching table status:', error);
    }
    
    // Use latest status from database if available
    const currentStatus = latestInfo?.status || info.status;
    
    // Check maintenance/unavailable status
    if (currentStatus === 'Maintenance' || currentStatus === 'Unavailable') {
      return {
        status: currentStatus,
        isSelectable: false,
        displayText: currentStatus.toUpperCase()
      };
    }
  } catch (err) {
    console.error('Error checking table status:', err);
  }

  // 2. Check if there are ANY available time slots for today
  const today = getTodayDate();
  const todayTimes = await getAvailableTimes(tableId, today);
  
  // Count how many available time slots exist
  const availableSlots = todayTimes.filter(t => t.available && !t.createsGap);
  
  // If NO available slots at all for today, check future availability
  if (availableSlots.length === 0) {
    let hasAnyAvailability = false;
    const checkDate = new Date();
    
    for (let i = 1; i <= 7; i++) {
      checkDate.setDate(checkDate.getDate() + 1);
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, '0');
      const day = String(checkDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const futureTimes = await getAvailableTimes(tableId, dateString);
      const futureAvailable = futureTimes.filter(t => t.available && !t.createsGap);
      
      if (futureAvailable.length > 0) {
        hasAnyAvailability = true;
        break;
      }
    }
    
    if (!hasAnyAvailability) {
      return {
        status: 'Fully Booked',
        isSelectable: false,
        displayText: 'FULLY BOOKED'
      };
    }
    
    // Has availability in future days
    return {
      status: 'Available',
      isSelectable: true,
      displayText: 'Available'
    };
  }

  // 3. Has available slots - mark as available
  return {
    status: 'Available',
    isSelectable: true,
    displayText: 'AVAILABLE'
  };
};
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const isDateClosed = (date) => {
  if (!date) return false;
  
  // Normalize the date string to YYYY-MM-DD format
  let dateString = date;
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dateString = `${year}-${month}-${day}`;
  }
  
  const closedDays = timeDates.filter(td => td.CloseDay);
  return closedDays.some(cd => cd.CloseDay === dateString);
};
const getDayNameFromDate = (dateString) => {
  if (!dateString) return null;
  
  // Parse the date string properly to avoid timezone issues
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};
const isTimeInPast = (selectedTime, date) => {
  if (!date) return false;
  
  const today = getTodayDate();
  if (date !== today) return false;
  
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  
  const [time, period] = selectedTime.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  // Compare both hours and minutes
  if (hours < currentHours) return true;
  if (hours === currentHours && minutes <= currentMinutes) return true;
  
  return false;
};
const getMaxAvailableDuration = async (tableId, date, startTime) => {
  if (!date || !startTime) return 0;

  const dayName = getDayNameFromDate(date);
  const schedules = timeDates.filter(td => 
    td.Date === dayName && 
    td.Actions === 'Active' && 
    !td.CloseDay
  );

  if (schedules.length === 0) return 0;

  const activeSchedule = schedules[0];
  
  const parseTime = (timeString) => {
    if (!timeString) return { hour: 0, minute: 0 };
    const [hour, minute] = timeString.split(':');
    return { 
      hour: parseInt(hour), 
      minute: parseInt(minute) 
    };
  };

  const closeTime = parseTime(activeSchedule.CloseTime);

  const [time, period] = startTime.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  const startTimeInHours = hours + (minutes / 60);
  const closeTimeInHours = closeTime.hour + (closeTime.minute / 60);
  const maxPossibleHours = closeTimeInHours - startTimeInHours;

  // ✅ Get existing reservations that come AFTER this start time
  const dbTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  
  const { data: nextReservations, error: resError } = await supabase
    .from('reservation')
    .select('start_time')
    .eq('table_id', tableId)
    .eq('reservation_date', date)
   .neq('status', 'cancelled')
    .gt('start_time', dbTime)
    .order('start_time', { ascending: true })
    .limit(1);

  if (resError) {
    console.error('Error fetching next reservation:', resError);
  }

  // ✅ Calculate time until next reservation (if exists)
  let maxHoursUntilNextReservation = maxPossibleHours;
  
  if (nextReservations && nextReservations.length > 0) {
    const nextResTime = nextReservations[0].start_time;
    const [nextHour, nextMinute] = nextResTime.split(':').map(Number);
    const nextTimeInHours = nextHour + (nextMinute / 60);
    
    // ✅ Ensure at least 1 hour gap before next reservation
    const availableHours = nextTimeInHours - startTimeInHours - 1; // -1 for mandatory gap
    maxHoursUntilNextReservation = Math.max(0, availableHours);
  }

  // Use the smaller of: closing time or next reservation
  const finalMaxHours = Math.min(maxPossibleHours, maxHoursUntilNextReservation);

  const sortedDurations = [...durations].sort((a, b) => a.hours - b.hours);

  let maxDuration = 0;
  for (const duration of sortedDurations) {
    if (duration.hours > finalMaxHours) {
      break;
    }

    try {
      const dbTimeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

      const { data: isAvailable, error } = await supabase
        .rpc('is_table_available', {
          p_table_id: tableId,
          p_reservation_date: date,
          p_start_time: dbTimeFormatted,
          p_duration_hours: duration.hours
        });
      
      if (error) {
        console.error('RPC Error:', error);
        maxDuration = duration.hours;
        continue;
      }
      
      if (isAvailable === true) {
        maxDuration = duration.hours;
      } else {
        break;
      }
    } catch (err) {
      console.error('Error checking duration:', err);
      break;
    }
  }

  return maxDuration;
};
const getAvailableTimes = async (tableId, date) => {
  if (!date) {
    return [];
  }

  if (isDateClosed(date)) {
    return [];
  }

  const dayName = getDayNameFromDate(date);
  
  const schedules = timeDates.filter(td => 
    td.Date === dayName && 
    td.Actions === 'Active' && 
    !td.CloseDay
  );

  if (schedules.length === 0) {
    return [];
  }

  const activeSchedule = schedules[0];
  
  const parseTime = (timeString) => {
    if (!timeString) return { hour: 0, minute: 0 };
    const [hour, minute] = timeString.split(':');
    return { 
      hour: parseInt(hour), 
      minute: parseInt(minute) 
    };
  };

  const openTime = parseTime(activeSchedule.OpenTime);
  const closeTime = parseTime(activeSchedule.CloseTime);

  const today = getTodayDate();
  
  // Get all existing reservations
  const { data: existingReservations, error: reservationError } = await supabase
    .from('reservation')
    .select('start_time, time_end')
    .eq('table_id', tableId)
    .eq('reservation_date', date)
   .neq('status', 'cancelled')
    .order('start_time', { ascending: true });

  if (reservationError) {
    console.error('Error checking existing reservations:', reservationError);
  }

  const reservations = existingReservations || [];

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const timeSlots = [];
  let currentHour = openTime.hour;
  let currentMinute = openTime.minute;

  while (currentHour < closeTime.hour || (currentHour === closeTime.hour && currentMinute < closeTime.minute)) {
    const period = currentHour >= 12 ? 'PM' : 'AM';
    const displayHour = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
    const timeString = `${displayHour}:${String(currentMinute).padStart(2, '0')} ${period}`;
    const dbTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`;
    
    const isPast = date === today && isTimeInPast(timeString, date);
    
    // ✅ GAP PREVENTION LOGIC
    let createsGap = false;
    const slotMinutes = timeToMinutes(dbTime);
    
    // 1. Check gap from opening time (no 30-min gap after opening)
    const openMinutes = openTime.hour * 60 + openTime.minute;
    const gapFromOpen = slotMinutes - openMinutes;
    if (gapFromOpen > 0 && gapFromOpen < 60) {
      createsGap = true;
    }
    
    // 2. Check gap BEFORE closing time (need at least 1 hour before close)
    const closeMinutes = closeTime.hour * 60 + closeTime.minute;
    const timeUntilClose = closeMinutes - slotMinutes;
    if (timeUntilClose < 60) {
      createsGap = true;
    }
    
    // 3. Check gap after each reservation (no 30-min gap after a reservation ends)
    for (const reservation of reservations) {
      const resEndMinutes = timeToMinutes(reservation.time_end);
      const gapAfterRes = slotMinutes - resEndMinutes;
      
      if (gapAfterRes > 0 && gapAfterRes < 60) {
        createsGap = true;
        break;
      }
    }
    
    timeSlots.push({
      time: timeString,
      dbTime: dbTime,
      isPast: isPast,
      createsGap: createsGap
    });
    
    // Move to next 30-minute interval
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour += 1;
    }
    
    if (currentHour > closeTime.hour || (currentHour === closeTime.hour && currentMinute >= closeTime.minute)) {
      break;
    }
  }

  const availabilityChecks = timeSlots.map(async (slot) => {
    if (slot.isPast) {
      return { 
        time: slot.time, 
        available: false,
        createsGap: false
      };
    }
    
    // ✅ If it creates a gap, mark as unavailable with gap flag
    if (slot.createsGap) {
      return {
        time: slot.time,
        available: false,
        createsGap: true
      };
    }
    
    try {
      const { data: isAvailable, error } = await supabase
        .rpc('is_table_available', {
          p_table_id: tableId,
          p_reservation_date: date,
          p_start_time: slot.dbTime,
          p_duration_hours: 0.5
        });
      
      if (error) {
        console.error('RPC Error:', error);
        return { 
          time: slot.time, 
          available: true,
          createsGap: false
        };
      }
      
      return {
        time: slot.time,
        available: isAvailable === true,
        createsGap: false
      };
    } catch (err) {
      console.error('Error checking availability:', err);
      return { 
        time: slot.time, 
        available: true,
        createsGap: false
      };
    }
  });

  const results = await Promise.all(availabilityChecks);
  
  return results;
};
const loadTableStatuses = async () => {
  const statuses = {};
  
  for (const table of tables) {
    const info = tableInfos.find(i => i.table_id === table.table_id);
    if (info) {
      statuses[table.table_id] = await getTableStatus(table.table_id, info);
    }
  }
  
  setTableStatuses(statuses);
};
useEffect(() => {
    fetchData();
  }, []);
useEffect(() => {
  if (tables.length > 0 && tableInfos.length > 0 && timeDates.length > 0) {
    loadTableStatuses();
  }
}, [tables, tableInfos, timeDates]);

const fetchData = async () => {
  try {
    setLoading(true);
    
    // Fetch tables
    const { data: tablesData, error: tablesError } = await supabase
      .from('billiard_table')
      .select('*')
      .order('table_id', { ascending: true });

    if (tablesError) throw tablesError;

    // Fetch table infos
    const { data: infosData, error: infosError } = await supabase
      .from('billiard_table_info')
      .select('*');

    if (infosError) throw infosError;

    // Fetch durations
    const { data: durationsData, error: durationsError } = await supabase
      .from('duration')
      .select('*')
      .order('hours', { ascending: true });

    if (durationsError) throw durationsError;

    // Fetch time dates
    const { data: timeDatesData, error: timeDatesError } = await supabase
      .from('TimeDate')
      .select('*');

    if (timeDatesError) throw timeDatesError;

    // ADD THIS: Fetch billiard types
    const { data: typesData, error: typesError } = await supabase
      .from('billiard_type')
      .select('*')
      .order('billiard_type', { ascending: true });

    if (typesError) throw typesError;

    setTables(tablesData || []);
    setTableInfos(infosData || []);
    setDurations(durationsData || []);
    setTimeDates(timeDatesData || []);
    setTypes(typesData || []);
    
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    setLoading(false);
  }
};

const handleTableSelect = async (table, info) => {
  const tableStatus = tableStatuses[table.table_id];
  
  if (!tableStatus || !tableStatus.isSelectable) {
    Swal.fire({
      icon: 'warning',
      title: 'Table Not Available',
      text: `This table is currently ${tableStatus?.status || 'unavailable'}`,
    });
    return;
  }

  const isSelected = selectedTables.some(t => t.table_id === table.table_id);
  
  if (isSelected) {
    setSelectedTables(selectedTables.filter(t => t.table_id !== table.table_id));
    setTableFormData(prev => {
      const newData = { ...prev };
      delete newData[table.table_id];
      return newData;
    });
    setMaxDurations(prev => {
      const newData = { ...prev };
      delete newData[table.table_id];
      return newData;
    });
  } else {
    setSelectedTables([...selectedTables, { ...table, info }]);
    setTableFormData(prev => ({
      ...prev,
      [table.table_id]: {
        date: '',
        time: '',
        duration: durations.length > 0 ? durations[0].id : ''
      }
    }));
  }
};

const generateReservationNo = async () => {
  try {
    // Get current date in YYYYMMDD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;
    
    // Get the latest reservation number for today
    const { data, error } = await supabase
      .from('reservation')
      .select('reservation_no')
      .like('reservation_no', `R-${datePrefix}-%`)
      .order('id', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    
    if (data && data.length > 0 && data[0].reservation_no) {
      // Extract number from format R-20251123-0001
      const lastNo = data[0].reservation_no;
      const parts = lastNo.split('-');
      if (parts.length === 3) {
        const numberPart = parseInt(parts[2]);
        nextNumber = numberPart + 1;
      }
    }

    // Format as R-20251123-0001, R-20251123-0002, etc.
    return `R-${datePrefix}-${String(nextNumber).padStart(4, '0')}`;
    
  } catch (error) {
    console.error('Error generating reservation number:', error);
    throw error;
  }
};

const handleReservation = async () => {
  if (selectedTables.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'No Tables Selected',
      text: 'Please select at least one table',
    });
    return;
  }

  const incompleteTables = [];
  for (const table of selectedTables) {
    const formData = tableFormData[table.table_id];
    if (!formData || !formData.date || !formData.time || !formData.duration) {
      incompleteTables.push(table.table_name);
    }
  }

  if (incompleteTables.length > 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Missing Information',
      html: `
        <p>Please select date, time, and duration for:</p>
        <p><strong>${incompleteTables.join(', ')}</strong></p>
      `,
    });
    return;
  }

  try {
    const reservationsData = [];

    for (const table of selectedTables) {
      const formData = tableFormData[table.table_id];
      
      if (formData.date < getTodayDate()) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Date',
          text: `Cannot book past dates for ${table.table_name}`,
        });
        return;
      }

      if (formData.date === getTodayDate() && isTimeInPast(formData.time, formData.date)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Time',
          text: `Cannot book past times for ${table.table_name}`,
        });
        return;
      }

      const selectedDuration = durations.find(d => d.id === parseInt(formData.duration));
      
      const startTimeFormatted = formData.time; 

      // Calculate end time
      const { data: endTimeData, error: endTimeError } = await supabase
        .rpc('calculate_end_time', {
          p_start_time: startTimeFormatted,
          p_duration_hours: selectedDuration.hours
        });

      if (endTimeError) throw endTimeError;

      // Check availability
      const { data: isAvailable, error: availError } = await supabase
        .rpc('is_table_available', {
          p_table_id: table.table_id,
          p_reservation_date: formData.date,
          p_start_time: startTimeFormatted,
          p_duration_hours: selectedDuration.hours
        });

      if (availError) throw availError;
      
      if (!isAvailable) {
        Swal.fire({
          icon: 'error',
          title: 'Table Not Available',
          html: `
            <p><strong>${table.table_name}</strong> is already booked at:</p>
            <p>Date: ${formData.date}</p>
            <p>Time: ${formData.time}</p>
            <p>Please select a different time.</p>
          `,
        });
        return;
      }

      reservationsData.push({
        table: table,
        date: formData.date,
        time: startTimeFormatted,
        timeEnd: endTimeData,
        duration: selectedDuration,
        billiard_type: table.info.billiard_type
      });
    }

    setReservationData({
      reservations: reservationsData
    });
    setShowPayment(true);

  } catch (error) {
    console.error('Error validating reservation:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Failed to validate reservation',
    });
  }
};
const handleBackFromPayment = () => {
  setShowPayment(false);
};

const handlePaymentSuccess = () => {
  setShowPayment(false);
  setSelectedTables([]);
  setTableFormData({});
  setReservationData(null);
};
  const getTablesByType = (typeName) => {
  return tables.filter(table => {
    const info = tableInfos.find(i => i.table_id === table.table_id);
    if (!info) return false;
    return info.billiard_type === typeName;
  });
};
const getClosedDatesAsString = () => {
  return timeDates
    .filter(td => td.CloseDay)
    .map(td => td.CloseDay)
    .join(',');
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
          <p style={{ marginTop: '15px', color: '#666' }}>Loading...</p>
        </div>
      </div>
    );
  }
if (showPayment) {
  return (
    <Payment
      reservationData={reservationData}
      onBack={handleBackFromPayment}
      onSuccess={handlePaymentSuccess}
    />
  );
}
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          marginBottom: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '32px',
            fontWeight: '700',
            color: '#333',
            textAlign: 'center'
          }}>
            Reserve Your Table
          </h1>
          <p style={{
            margin: 0,
            fontSize: '16px',
            color: '#666',
            textAlign: 'center'
          }}>
            Reserve your perfect billiard experience
          </p>

     
       {/* Date & Time Selection - MOVE BELOW TABLES */}

        </div>
{selectedTables.length > 0 && (
  <div style={{
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '100px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }}>
    <h2 style={{
      margin: '0 0 25px 0',
      fontSize: '24px',
      fontWeight: '700',
      color: '#333',
      textAlign: 'center'
    }}>
      Select Date & Time for Each Table
    </h2>

    {selectedTables.map((table, index) => {
  const formData = tableFormData[table.table_id] || { date: '', time: '', duration: '' };
  const cacheKey = `${table.table_id}-${formData.date}`;
  const availableTimes = availableTimesCache[cacheKey] || [];
  
  return (
        <div key={table.table_id} style={{
          marginBottom: index < selectedTables.length - 1 ? '30px' : '0',
          padding: '25px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '2px solid #28a745'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#28a745',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{
              backgroundColor: '#28a745',
              color: 'white',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '700'
            }}>
              {index + 1}
            </span>
            {table.table_name}
            <span style={{
              marginLeft: 'auto',
              fontSize: '16px',
              fontWeight: '700',
              color: '#28a745'
            }}>
              ₱{parseFloat(table.info.price).toFixed(2)}/hour
            </span>
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            {/* Date */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#555'
              }}>
                Date
              </label>
              <DatePicker
                selected={formData.date ? new Date(formData.date + 'T00:00:00') : null}
                onChange={(date) => {
                  if (!date) return;
                  
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const dateString = `${year}-${month}-${day}`;
                  
                  if (isDateClosed(dateString)) {
                    Swal.fire({
                      icon: 'error',
                      title: 'Date Closed',
                      text: 'This date is not available for booking',
                    });
                 return ;
                  }
                  
                  handleTableFormChange(table.table_id, 'date', dateString);
                }}
                minDate={new Date()}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select a date"
filterDate={(date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  
  // Check if date is closed
  if (isDateClosed(dateString)) {
    return false;
  }
  
  // ✅ Check if timeDates is loaded
  if (timeDates.length === 0) {
    return true; // Show all dates if data not loaded yet
  }
  
  // Get day name and check if there's an active schedule
  const dayName = getDayNameFromDate(dateString);
  const hasSchedule = timeDates.some(td => 
    td.Date === dayName && 
    td.Actions === 'Active' && 
    !td.CloseDay
  );
  
  return hasSchedule;
}}
     dayClassName={(date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  
  // ✅ Only mark closed days as blocked
  if (isDateClosed(dateString)) {
    return 'blocked-date';
  }
  
  return undefined;
}}
                inline={false}
                showPopperArrow={false}
                className="custom-datepicker"
                wrapperClassName="datepicker-wrapper"
              />
            </div>

{/* Time */}
{/* Time */}
<div>
  <label style={{
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#555'
  }}>
    Time
  </label>
  <select
    value={formData.time}
    onChange={(e) => {
      const selectedTime = e.target.value;
      const timeObj = availableTimes.find(t => t.time === selectedTime);
      
      // ✅ Check if this time creates a gap
      if (timeObj && timeObj.createsGap) {
        Swal.fire({
          icon: 'warning',
          title: 'Time Slot Not Available',
          html: `
            <p><strong>${selectedTime}</strong> cannot be booked.</p>
            <p>This time would create a gap of less than 1 hour with an existing reservation.</p>
            <p>Please select a different time slot.</p>
          `,
          confirmButtonColor: '#28a745',
          confirmButtonText: 'OK'
        });
        return; // Don't update the form
      }
      
      // ✅ Check if reserved
      if (timeObj && !timeObj.available) {
        Swal.fire({
          icon: 'error',
          title: 'Time Already Reserved',
          text: `${selectedTime} is already booked. Please select another time.`,
          confirmButtonColor: '#dc3545',
          confirmButtonText: 'OK'
        });
        return; // Don't update the form
      }
      
      // ✅ If available, proceed
      handleTableFormChange(table.table_id, 'time', selectedTime);
    }}
    disabled={!formData.date || isDateClosed(formData.date) || availableTimes.length === 0}
    style={{
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      cursor: (!formData.date || isDateClosed(formData.date) || availableTimes.length === 0) ? 'not-allowed' : 'pointer',
      opacity: (!formData.date || isDateClosed(formData.date) || availableTimes.length === 0) ? 0.6 : 1
    }}
  >
    <option value="">
      {!formData.date 
        ? 'Select a date first' 
        : isDateClosed(formData.date)
        ? 'Date is closed'
        : availableTimes.length === 0
        ? 'Loading...'
        : 'Select time'
      }
    </option>
    {availableTimes.map(timeObj => {
      const isReserved = !timeObj.available && !timeObj.createsGap;
      const createsGap = timeObj.createsGap;
      
      return (
        <option 
          key={timeObj.time} 
          value={timeObj.time}
          style={{
            backgroundColor: isReserved 
              ? '#ffebee' 
              : createsGap 
              ? '#fff3cd' 
              : 'white',
            color: isReserved 
              ? '#dc3545' 
              : createsGap 
              ? '#856404' 
              : '#333',
            fontWeight: (isReserved || createsGap) ? '600' : 'normal'
          }}
        >
          {timeObj.time} 
          {isReserved ? ' (Reserved)' : ''}
          {createsGap ? ' (Gap Issue)' : ''}
        </option>
      );
    })}
  </select>
</div>

       
          {/* Duration */}
<div>
  <label style={{
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#555'
  }}>
    Duration
  </label>
  <select
    value={formData.duration}
    onChange={(e) => handleTableFormChange(table.table_id, 'duration', e.target.value)}
    disabled={!formData.time}
    style={{
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      cursor: !formData.time ? 'not-allowed' : 'pointer',
      opacity: !formData.time ? 0.6 : 1
    }}
  >
    <option value="">
      {!formData.time ? 'Select time first' : 'Select duration'}
    </option>
{durations
  .filter(duration => {
    const maxDuration = maxDurations[table.table_id] || 0;
    return duration.hours <= maxDuration;
  })
  .map(duration => {
    // Format the display text
    const hours = Math.floor(duration.hours);
    const minutes = (duration.hours % 1) * 60;
    
    let displayText = '';
    if (hours > 0) {
      displayText += `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
      if (hours > 0) displayText += ' ';
      displayText += `${minutes} mins`;
    }
    
    return (
      <option key={duration.id} value={duration.id}>
        {displayText}
      </option>
    );
  })}
  </select>
  {formData.time && maxDurations[table.table_id] && (
    <p style={{
      fontSize: '12px',
      color: '#666',
      marginTop: '5px',
      marginBottom: 0
    }}>
      ⏱️ Maximum {maxDurations[table.table_id]} hour{maxDurations[table.table_id] > 1 ? 's' : ''} available
    </p>
  )}
</div>
          </div>
        </div>
      );
    })}
  </div>
)}
   
{/* All Tables in One Section */}
<div style={{
  backgroundColor: 'white',
  padding: '40px',
  borderRadius: '12px',
  marginBottom: '30px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
}}>
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '25px'
  }}>
    {tables.map(table => {
  const info = tableInfos.find(i => i.table_id === table.table_id);
  if (!info) return null;

  const isSelected = selectedTables.some(t => t.table_id === table.table_id);
  const tableStatus = tableStatuses[table.table_id] || { 
    status: 'Loading...', 
    isSelectable: false, 
    displayText: 'LOADING...' 
  };
  const isAvailable = tableStatus.isSelectable;

      return (
    <div
      key={table.table_id}
      onClick={() => handleTableSelect(table, info)}
      style={{
        backgroundColor: 'white',
        border: isSelected ? '3px solid #28a745' : '2px solid #e9ecef',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        transition: 'all 0.3s ease',
        opacity: isAvailable ? 1 : 0.6,
        position: 'relative',
        boxShadow: isSelected 
          ? '0 8px 24px rgba(40,167,69,0.3)' 
          : '0 2px 8px rgba(0,0,0,0.08)',
        transform: isSelected ? 'translateY(-4px)' : 'none'
      }}
    >
          {/* Status Badge */}
          <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '700',
        backgroundColor: isAvailable ? '#28a745' : '#dc3545',
        color: 'white',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        zIndex: 2
      }}>
        {tableStatus.displayText}
      </div>

          {/* Table Image Container */}
        <div style={{
  height: '200px',
  backgroundColor: '#f8f9fa',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderBottom: '1px solid #e9ecef',
  overflow: 'hidden'
}}>
  {table.table_image ? (
    <img 
      src={table.table_image} 
      alt={table.table_name}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover'
      }}
    />
  ) : (
    <span style={{
      color: '#adb5bd',
      fontSize: '14px',
      fontWeight: '500'
    }}>
      No Image Available
    </span>
  )}
</div>

          {/* Table Info */}
          <div style={{
            padding: '24px',
            textAlign: 'center'
          }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: '#2c3e50'
            }}>
              {table.table_name}
            </h3>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '13px',
              color: '#7f8c8d',
              fontWeight: '500'
            }}>
              {info.billiard_type}
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '800',
                color: '#28a745'
              }}>
                ₱{parseFloat(info.price).toFixed(2)}
              </p>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#95a5a6',
                fontWeight: '600'
              }}>
                /hour
              </p>
            </div>
          </div>

          {/* Selected Indicator */}
          {isSelected && (
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '4px',
              backgroundColor: '#28a745'
            }} />
          )}
        </div>
      );
    })}
  </div>
</div>
        {/* Footer - Reserve Button */}
       <div style={{
  position: 'fixed',
  bottom: 0,
  left: '255px', 
  right: 0,
  backgroundColor: '#5a5a5a',
  padding: '20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
  zIndex: 100
}}>
  <p style={{
    margin: 0,
    color: 'white',
    fontSize: '16px',
    fontWeight: '600'
  }}>
    {selectedTables.length === 0 ? 'No tables selected' : `${selectedTables.length} table(s) selected`}
  </p>
  <button
    onClick={handleReservation}
    disabled={selectedTables.length === 0}
    style={{
      padding: '12px 40px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: selectedTables.length > 0 ? 'pointer' : 'not-allowed',
      opacity: selectedTables.length > 0 ? 1 : 0.5,
      transition: 'all 0.2s'
    }}
    onMouseEnter={e => {
      if (selectedTables.length > 0) {
        e.currentTarget.style.backgroundColor = '#218838';
      }
    }}
    onMouseLeave={e => {
      e.currentTarget.style.backgroundColor = '#28a745';
    }}
  >
    Next →
  </button>
</div>
      </div>

 <style>
  {`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* DatePicker Styles */
    .datepicker-wrapper {
      width: 100%;
    }
    
    .custom-datepicker {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      borderRadius: 6px;
      fontSize: 14px;
      boxSizing: border-box;
      cursor: pointer;
    }
    
    .custom-datepicker:focus {
      outline: none;
      border-color: #17a2b8;
    }
    
    /* Calendar container */
    .react-datepicker {
      font-family: inherit;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .react-datepicker__header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
      padding: 10px 0;
    }
    
    .react-datepicker__current-month {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .react-datepicker__day-name {
      color: #666;
      font-weight: 600;
      font-size: 13px;
    }
    
    /* Regular days */
    .react-datepicker__day {
      color: #333;
      font-size: 14px;
      margin: 2px;
      border-radius: 4px;
    }
    
    .react-datepicker__day:hover {
      background-color: #e3f2fd;
    }
    
    /* Selected day */
    .react-datepicker__day--selected,
    .react-datepicker__day--keyboard-selected {
      background-color: #28a745 !important;
      color: white !important;
      font-weight: 600;
    }
    
    /* Today */
    .react-datepicker__day--today {
      font-weight: 600;
      background-color: #fff3cd;
    }
    
    /* Blocked dates - RED and disabled */
    .react-datepicker__day.blocked-date {
      background-color: #ffebee !important;
      color: #dc3545 !important;
      text-decoration: line-through;
      cursor: not-allowed !important;
      font-weight: 600;
      position: relative;
      pointer-events: none;
    }
    
    .react-datepicker__day.blocked-date:hover {
      background-color: #ffcdd2 !important;
    }
    
    /* Add X mark on blocked dates */
    .react-datepicker__day.blocked-date::after {
      content: '✕';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 10px;
      color: #dc3545;
      font-weight: bold;
    }
    
    /* Disabled dates (past dates) */
    .react-datepicker__day--disabled {
      color: #ccc !important;
      cursor: not-allowed !important;
    }
    
    /* Navigation buttons */
    .react-datepicker__navigation {
      top: 12px;
    }
    
    .react-datepicker__navigation:hover {
      background-color: #e9ecef;
      border-radius: 4px;
    }
  `}
</style>
    </div>
  );
};

export default CustomerDashboard;
