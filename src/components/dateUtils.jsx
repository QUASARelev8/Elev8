
export const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isDateClosed = (date, timeDates) => {
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

export const getDayNameFromDate = (dateString) => {
  if (!dateString) return null;
  
  // Parse the date string properly to avoid timezone issues
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

export const isTimeInPast = (selectedTime, date) => {
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

// DatePicker filter function
export const createDateFilter = (timeDates, selectedTable = null) => {
  return (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Check if date is closed
    if (isDateClosed(dateString, timeDates)) {
      return false;
    }
    
    // ✅ If no table selected yet, show all non-closed dates
    if (!selectedTable) {
      return true;
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
  };
};

// DatePicker dayClassName function
export const createDayClassName = (timeDates) => {
  return (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // ✅ Only mark closed days as blocked
    if (isDateClosed(dateString, timeDates)) {
      return 'blocked-date';
    }
    
    return undefined;
  };
};