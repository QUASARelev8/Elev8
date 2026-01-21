import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabaseClient";
import Swal from 'sweetalert2';
import { Plus, Edit2, Trash2, X, Search, Calendar, Clock, Ban, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';

const TimeDate = () => {
  const [timeDates, setTimeDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTimeDate, setCurrentTimeDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalType, setModalType] = useState('schedule'); // 'schedule' or 'closeday'
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [expandedDays, setExpandedDays] = useState({});

const [formData, setFormData] = useState({
  Date: '',
  OpenTime: '',
  CloseTime: '',
  Actions: 'Inactive', // Default to Inactive
  CloseDay: ''
});
  // Convert 24-hour format to 12-hour time string (HH:MM AM/PM)
 const convertTo12Hour = (hour24, minute = 0) => {
    if (hour24 === null || hour24 === undefined) return '';
    const h = parseInt(hour24);
    const m = parseInt(minute);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  };

  // Convert time input (HH:MM AM/PM) to 24-hour format
  const convertTo24Hour = (timeStr) => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    
    let hour = parseInt(match[1]);
    const minute = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    return { hour, minute };
  };

  useEffect(() => {
    fetchTimeDates();
  }, []);
  

  const fetchTimeDates = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('TimeDate')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      
      setTimeDates(data || []);
    } catch (error) {
      console.error('Error fetching time dates:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to fetch time dates',
      });
    } finally {
      setLoading(false);
    }
  };
 const schedules = timeDates.filter(td => !td.CloseDay);
const closeDays = timeDates.filter(td => td.CloseDay);

const groupedSchedules = schedules.reduce((acc, schedule) => {
  const day = schedule.Date;
  if (!acc[day]) {
    acc[day] = [];
  }
  acc[day].push(schedule);
  return acc;
}, {});
// Get active schedule for each day
const getActiveSchedule = (daySchedules) => {
  return daySchedules.find(s => s.Actions === 'Active') || daySchedules[0];
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
const formatTime = (timeString) => {
  if (!timeString) return '-';
  
  // Parse time string from database (format: "HH:MM:SS" or "HH:MM")
    const timeParts = timeString.split(':');
  if (timeParts.length < 2) return '-';
  const [hour, minute] = timeString.split(':');
  const h = parseInt(hour);
  const m = parseInt(minute || 0);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modalType === 'closeday') {
      // Handle Close Day
      if (!formData.CloseDay) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid Input',
          text: 'Please enter a close date',
        });
        return;
      }

      try {
        if (editMode && currentTimeDate) {
          const { error } = await supabase
            .from('TimeDate')
            .update({
              CloseDay: formData.CloseDay,
              Date: null,
              OpenTime: null,
              CloseTime: null,
              Actions: null
            })
            .eq('id', currentTimeDate.id);

          if (error) throw error;

          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Close day updated successfully',
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          const existing = timeDates.find(td => td.CloseDay === formData.CloseDay);
          if (existing) {
            Swal.fire({
              icon: 'warning',
              title: 'Duplicate Entry',
              text: 'This close day already exists',
            });
            return;
          }

          const { error } = await supabase
            .from('TimeDate')
            .insert([{
              CloseDay: formData.CloseDay,
              Date: null,
              OpenTime: null,
              CloseTime: null,
              Actions: null
            }]);

          if (error) throw error;

          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Close day added successfully',
            timer: 1500,
            showConfirmButton: false,
          });
        }

        handleCloseModal();
        fetchTimeDates();
      } catch (error) {
        console.error('Error saving close day:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to save close day',
        });
      }
    } else {
      // Handle Schedule
      if (!formData.Date || !formData.OpenTime || !formData.CloseTime) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid Input',
          text: 'Please fill in all fields',
        });
        return;
      }

   const openTimeObj = convertTo24Hour(formData.OpenTime);
   const closeTimeObj = convertTo24Hour(formData.CloseTime);

     if (!openTimeObj || !closeTimeObj) {
  Swal.fire({
    icon: 'warning',
    title: 'Invalid Time',
    text: 'Please enter valid time format (e.g., 10:30 AM)',
  });
  return;
}

try {
  if (editMode && currentTimeDate) {
    const { error } = await supabase
      .from('TimeDate')
  .update({
    Date: formData.Date,
    OpenTime: `${String(openTimeObj.hour).padStart(2, '0')}:${String(openTimeObj.minute).padStart(2, '0')}:00`,
    CloseTime: `${String(closeTimeObj.hour).padStart(2, '0')}:${String(closeTimeObj.minute).padStart(2, '0')}:00`,
    Actions: formData.Actions,
    CloseDay: null
  })
  .eq('id', currentTimeDate.id);

          if (error) throw error;

          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Schedule updated successfully',
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          const { error } = await supabase
            .from('TimeDate')
            .insert([{
                Date: formData.Date,
    OpenTime: `${String(openTimeObj.hour).padStart(2, '0')}:${String(openTimeObj.minute).padStart(2, '0')}:00`,
    CloseTime: `${String(closeTimeObj.hour).padStart(2, '0')}:${String(closeTimeObj.minute).padStart(2, '0')}:00`,
    Actions: formData.Actions,
    CloseDay: null
            }]);

          if (error) throw error;

          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Schedule added successfully',
            timer: 1500,
            showConfirmButton: false,
          });
        }

        handleCloseModal();
        fetchTimeDates();
      } catch (error) {
        console.error('Error saving schedule:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to save schedule',
        });
      }
    }
  };

const handleEdit = (timeDate) => {
  setCurrentTimeDate(timeDate);
  if (timeDate.CloseDay) {
    setModalType('closeday');
    setFormData({
      Date: '',
      OpenTime: '',
      CloseTime: '',
      Actions: 'Active',
      CloseDay: timeDate.CloseDay || ''
    });
  } else {
    setModalType('schedule');
    

    const openTimeArr = timeDate.OpenTime ? timeDate.OpenTime.split(':') : ['0', '0'];
    const closeTimeArr = timeDate.CloseTime ? timeDate.CloseTime.split(':') : ['0', '0'];
    
    setFormData({
      Date: timeDate.Date || '',
      OpenTime: convertTo12Hour(parseInt(openTimeArr[0]), parseInt(openTimeArr[1])),
      CloseTime: convertTo12Hour(parseInt(closeTimeArr[0]), parseInt(closeTimeArr[1])),
      Actions: timeDate.Actions || 'Active',
      CloseDay: ''
    });
  }
  setEditMode(true);
  setShowModal(true);
};

  const handleDelete = async (id, identifier) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${identifier}"? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('TimeDate')
          .delete()
          .eq('id', id);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Record has been deleted.',
          timer: 1500,
          showConfirmButton: false,
        });

        fetchTimeDates();
      } catch (error) {
        console.error('Error deleting:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete',
        });
      }
    }
  };
const toggleExpand = (day) => {
  setExpandedDays(prev => ({
    ...prev,
    [day]: !prev[day]
  }));
};

 const handleToggleStatus = async (timeDate) => {
  const newStatus = timeDate.Actions === 'Active' ? 'Inactive' : 'Active';
  
  try {
    // If activating, deactivate all other schedules for the same day
    if (newStatus === 'Active') {
      const sameDaySchedules = schedules.filter(s => s.Date === timeDate.Date && s.id !== timeDate.id);
      
      for (const schedule of sameDaySchedules) {
        await supabase
          .from('TimeDate')
          .update({ Actions: 'Inactive' })
          .eq('id', schedule.id);
      }
    }

    const { error } = await supabase
      .from('TimeDate')
      .update({ Actions: newStatus })
      .eq('id', timeDate.id);

    if (error) throw error;

    Swal.fire({
      icon: 'success',
      title: 'Updated!',
      text: `Status changed to ${newStatus}`,
      timer: 1500,
      showConfirmButton: false,
    });

    fetchTimeDates();
  } catch (error) {
    console.error('Error toggling status:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Failed to update status',
    });
  }
};

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentTimeDate(null);
    setModalType('schedule');
    setFormData({
      Date: '',
      OpenTime: '',
      CloseTime: '',
      Actions: 'Active',
      CloseDay: ''
    });
  };

  const openScheduleModal = () => {
    setModalType('schedule');
    setShowModal(true);
  };

  const openCloseDayModal = () => {
    setModalType('closeday');
    setShowModal(true);
  };


  // Filter based on search
 const filteredSchedules = schedules.filter(td =>
  td.Date?.toLowerCase().includes(searchTerm.toLowerCase())
);

const filteredCloseDays = closeDays.filter(td =>
  td.CloseDay?.toLowerCase().includes(searchTerm.toLowerCase())
);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #17a2b8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '15px', color: '#666' }}>Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={32} color="#17a2b8" />
            Time & Date Management
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Schedules: {schedules.length} | Close Days: {closeDays.length}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={openScheduleModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 5px rgba(23,162,184,0.3)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#138496';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#17a2b8';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Clock size={18} />
            Add Schedule
          </button>
          <button
            onClick={openCloseDayModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 5px rgba(220,53,69,0.3)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#c82333';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#dc3545';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Ban size={18} />
            Add Close Day
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          position: 'relative',
          maxWidth: '400px'
        }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#999'
            }} 
          />
          <input
            type="text"
            placeholder="Search schedules or close days..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#17a2b8'}
            onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
          />
        </div>
      </div>

      {/* Schedules Table */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#333', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={24} color="#17a2b8" />
          Operating Schedules
        </h3>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>
                    Date/Day
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>
                    Open Time
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>
                    Close Time
                  </th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#333' }}>
                    Status
                  </th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#333' }}>
                    Actions
                  </th>
                </tr>
              </thead>
        <tbody>
  {Object.keys(groupedSchedules).length === 0 ? (
    <tr>
      <td colSpan="5" style={{ 
        textAlign: 'center', 
        padding: '50px', 
        color: '#999',
        fontSize: '14px'
      }}>
        {searchTerm ? 'No schedules match your search' : 'No schedules found. Click "Add Schedule" to create one.'}
      </td>
    </tr>
  ) : (
    Object.entries(groupedSchedules)
      .filter(([day]) => day.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(([day, daySchedules]) => {
        const activeSchedule = getActiveSchedule(daySchedules);
        const isExpanded = expandedDays[day];
        const hasMultiple = daySchedules.length > 1;

        return (
          <React.Fragment key={day}>
            {/* Main row - shows active schedule */}
            <tr 
              style={{ 
                borderBottom: isExpanded ? 'none' : '1px solid #f0f0f0',
                backgroundColor: hasMultiple ? '#f0f9ff' : 'white'
              }}
              onMouseEnter={e => !isExpanded && (e.currentTarget.style.backgroundColor = hasMultiple ? '#e0f2fe' : '#f9f9f9')}
              onMouseLeave={e => !isExpanded && (e.currentTarget.style.backgroundColor = hasMultiple ? '#f0f9ff' : 'white')}
            >
              <td style={{ padding: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={20} color="#17a2b8" />
                  <strong style={{ color: '#333', fontSize: '16px' }}>
                    {day}
                  </strong>
                  {hasMultiple && (
                    <span style={{
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {daySchedules.length} options
                    </span>
                  )}
                  {hasMultiple && (
                    <button
                      onClick={() => toggleExpand(day)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#17a2b8'
                      }}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  )}
                </div>
              </td>
           <td style={{ padding: '15px' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <Clock size={18} color="#28a745" />
    <span style={{ color: '#28a745', fontWeight: '600' }}>
      {formatTime(activeSchedule.OpenTime)}
    </span>
  </div>
</td>
<td style={{ padding: '15px' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <Clock size={18} color="#dc3545" />
    <span style={{ color: '#dc3545', fontWeight: '600' }}>
      {formatTime(activeSchedule.CloseTime)}
    </span>
  </div>
</td>
              <td style={{ padding: '15px', textAlign: 'center' }}>
                {!hasMultiple && (
                  <button
                    onClick={() => handleToggleStatus(activeSchedule)}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: activeSchedule.Actions === 'Active' ? '#28a745' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {activeSchedule.Actions === 'Active' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {activeSchedule.Actions || 'Active'}
                  </button>
                )}
              </td>
              <td style={{ padding: '15px', textAlign: 'center' }}>
                {!hasMultiple && (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleEdit(activeSchedule)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ffc107',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#e0a800';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = '#ffc107';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(activeSchedule.id, activeSchedule.Date)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#c82333';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = '#dc3545';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>

            {/* Expanded rows - show all options */}
            {isExpanded && daySchedules.map((schedule, index) => (
              <tr 
                key={schedule.id}
                style={{ 
                  borderBottom: index === daySchedules.length - 1 ? '1px solid #f0f0f0' : 'none',
                  backgroundColor: '#fafafa'
                }}
              >
                <td style={{ padding: '12px 15px 12px 50px' }}>
                  <span style={{ 
                    color: '#666', 
                    fontSize: '14px',
                    fontStyle: 'italic'
                  }}>
                    Option {index + 1}
                  </span>
                </td>
                <td style={{ padding: '12px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="#28a745" />
                    <span style={{ color: '#28a745', fontWeight: '500', fontSize: '14px' }}>
                      {formatTime(schedule.OpenTime)}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="#dc3545" />
                    <span style={{ color: '#dc3545', fontWeight: '500', fontSize: '14px' }}>
                      {formatTime(schedule.CloseTime)}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleToggleStatus(schedule)}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: schedule.Actions === 'Active' ? '#28a745' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {schedule.Actions === 'Active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {schedule.Actions || 'Active'}
                  </button>
                </td>
                <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleEdit(schedule)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#ffc107',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#e0a800';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = '#ffc107';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id, schedule.Date)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#c82333';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = '#dc3545';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </React.Fragment>
        );
      })
  )}
</tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Close Days Table */}
      <div>
        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#333', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Ban size={24} color="#dc3545" />
          Closed Dates
        </h3>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>
                    Closed Date
                  </th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>
                    Created
                  </th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#333' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCloseDays.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ 
                      textAlign: 'center', 
                      padding: '50px', 
                      color: '#999',
                      fontSize: '14px'
                    }}>
                      {searchTerm ? 'No close days match your search' : 'No close days found. Click "Add Close Day" to create one.'}
                    </td>
                  </tr>
                ) : (
                  filteredCloseDays.map((closeDay) => (
                    <tr 
                      key={closeDay.id} 
                      style={{ borderBottom: '1px solid #f0f0f0' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff5f5'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <td style={{ padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Ban size={20} color="#dc3545" />
                          <strong style={{ color: '#dc3545', fontSize: '16px' }}>
                            {closeDay.CloseDay || '-'}
                          </strong>
                        </div>
                      </td>
                      <td style={{ padding: '15px', color: '#666', fontSize: '13px' }}>
                        {closeDay.created_at ? new Date(closeDay.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : '-'}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEdit(closeDay)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#ffc107',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '13px',
                              fontWeight: '600',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = '#e0a800';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = '#ffc107';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(closeDay.id, closeDay.CloseDay)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '13px',
                              fontWeight: '600',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = '#c82333';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = '#dc3545';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: modalType === 'schedule' ? '#17a2b8' : '#dc3545',
              borderRadius: '12px 12px 0 0'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {modalType === 'schedule' ? <Clock size={24} /> : <Ban size={24} />}
                {editMode 
                  ? (modalType === 'schedule' ? 'Edit Schedule' : 'Edit Close Day')
                  : (modalType === 'schedule' ? 'Add New Schedule' : 'Add Close Day')
                }
              </h3>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'white',
                  borderRadius: '4px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              {modalType === 'schedule' ? (
                <>
                  <div style={{ marginBottom: '20px' }}>
  <label style={{ 
    display: 'block', 
    marginBottom: '8px', 
    fontWeight: '600',
    color: '#333',
    fontSize: '14px'
  }}>
    Day of Week <span style={{ color: '#dc3545' }}>*</span>
  </label>
  <select
    name="Date"
    value={formData.Date}
    onChange={handleInputChange}
    required
    style={{
      width: '100%',
      padding: '10px',
      border: '2px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
      cursor: 'pointer'
    }}
    onFocus={e => e.currentTarget.style.borderColor = '#17a2b8'}
    onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
  >
    <option value="">Select a day</option>
    {daysOfWeek.map(day => (
      <option key={day} value={day}>{day}</option>
    ))}
  </select>
  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
    💡 Select the day of the week for this schedule
  </p>
</div>

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
  <div>
    <label style={{ 
      display: 'block', 
      marginBottom: '8px', 
      fontWeight: '600',
      color: '#333',
      fontSize: '14px'
    }}>
      Open Time <span style={{ color: '#dc3545' }}>*</span>
    </label>
    <input
      type="time"
      name="OpenTime"
      value={(() => {
        if (!formData.OpenTime) return '';
        const timeObj = convertTo24Hour(formData.OpenTime);
        if (!timeObj) return '';
        return `${String(timeObj.hour).padStart(2, '0')}:${String(timeObj.minute).padStart(2, '0')}`;
      })()}
      onChange={(e) => {
        const time = e.target.value;
        if (time) {
          const [hour, minute] = time.split(':');
          const h = parseInt(hour);
          const period = h >= 12 ? 'PM' : 'AM';
          const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
          setFormData(prev => ({
            ...prev,
            OpenTime: `${String(displayHour).padStart(2, '0')}:${minute} ${period}`
          }));
        } else {
          setFormData(prev => ({ ...prev, OpenTime: '' }));
        }
      }}
      required
      style={{
        width: '100%',
        padding: '10px',
        border: '2px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box'
      }}
      onFocus={e => e.currentTarget.style.borderColor = '#28a745'}
      onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
    />
    <p style={{ fontSize: '12px', color: '#28a745', marginTop: '5px', fontWeight: '600' }}>
      {formData.OpenTime || 'Select opening time'}
    </p>
  </div>

  <div>
    <label style={{ 
      display: 'block', 
      marginBottom: '8px', 
      fontWeight: '600',
      color: '#333',
      fontSize: '14px'
    }}>
      Close Time <span style={{ color: '#dc3545' }}>*</span>
    </label>
    <input
      type="time"
      name="CloseTime"
      value={(() => {
        if (!formData.CloseTime) return '';
        const timeObj = convertTo24Hour(formData.CloseTime);
        if (!timeObj) return '';
        return `${String(timeObj.hour).padStart(2, '0')}:${String(timeObj.minute).padStart(2, '0')}`;
      })()}
      onChange={(e) => {
        const time = e.target.value;
        if (time) {
          const [hour, minute] = time.split(':');
          const h = parseInt(hour);
          const period = h >= 12 ? 'PM' : 'AM';
          const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
          setFormData(prev => ({
            ...prev,
            CloseTime: `${String(displayHour).padStart(2, '0')}:${minute} ${period}`
          }));
        } else {
          setFormData(prev => ({ ...prev, CloseTime: '' }));
        }
      }}
      required
      style={{
        width: '100%',
        padding: '10px',
        border: '2px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box'
      }}
      onFocus={e => e.currentTarget.style.borderColor = '#dc3545'}
      onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
    />
    <p style={{ fontSize: '12px', color: '#dc3545', marginTop: '5px', fontWeight: '600' }}>
      {formData.CloseTime || 'Select closing time'}
    </p>
  </div>
</div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: '#333',
                      fontSize: '14px'
                    }}>
                      Status <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <select
                      name="Actions"
                      value={formData.Actions}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#17a2b8'}
                      onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      💡 Set to "Inactive" to temporarily disable this schedule
                    </p>
                  </div>

                  <div style={{
                    backgroundColor: '#e7f3ff',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #b3d9ff'
                  }}>
                   <p style={{ margin: 0, fontSize: '13px', color: '#004085' }}>
  <strong>ℹ️ Time Format Guide:</strong><br />
  • Use the time picker to select hours and minutes<br />
  • Format: HH:MM AM/PM (e.g., 10:30 AM, 11:00 PM)<br />
  • Select exact opening and closing times for the day
</p>
                  </div>
                </>
              ) : (
                <>
            <>
 <>
  <div style={{ marginBottom: '20px' }}>
    <label style={{ 
      display: 'block', 
      marginBottom: '8px', 
      fontWeight: '600',
      color: '#333',
      fontSize: '14px'
    }}>
      Close Date <span style={{ color: '#dc3545' }}>*</span>
    </label>
    <input
      type="date"
      name="CloseDay"
      value={formData.CloseDay}
      onChange={handleInputChange}
      min={new Date().toISOString().split('T')[0]}
      required
      style={{
        width: '100%',
        padding: '10px',
        border: '2px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box',
        cursor: 'pointer',
        colorScheme: 'light'
      }}
      onFocus={e => e.currentTarget.style.borderColor = '#dc3545'}
      onBlur={e => e.currentTarget.style.borderColor = '#ddd'}
    />
    <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
      💡 Select the date when the establishment will be closed
    </p>
  </div>

  <div style={{
    backgroundColor: '#fff3cd',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #ffc107'
  }}>
    <p style={{ margin: 0, fontSize: '13px', color: '#856404' }}>
      <strong>⚠️ Note:</strong><br />
      Close days will block the entire date. No bookings or operations will be allowed on these dates. The calendar will show this date in red.
    </p>
  </div>
  
  <style>
    {`
      /* Style the date input calendar to show blocked dates in red */
      input[type="date"]::-webkit-calendar-picker-indicator {
        cursor: pointer;
        filter: invert(28%) sepia(94%) saturate(2588%) hue-rotate(346deg) brightness(92%) contrast(89%);
      }
      
      input[type="date"]:hover::-webkit-calendar-picker-indicator {
        filter: invert(18%) sepia(98%) saturate(3588%) hue-rotate(346deg) brightness(82%) contrast(99%);
      }
    `}
  </style>
</>


</>

                 
                </>
              )}

              {/* Modal Footer */}
              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                paddingTop: '20px',
                borderTop: '1px solid #dee2e6'
              }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#5a6268'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6c757d'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: modalType === 'schedule' ? '#17a2b8' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = modalType === 'schedule' ? '#138496' : '#c82333'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = modalType === 'schedule' ? '#17a2b8' : '#dc3545'}
                >
                  {editMode 
                    ? (modalType === 'schedule' ? 'Update Schedule' : 'Update Close Day')
                    : (modalType === 'schedule' ? 'Add Schedule' : 'Add Close Day')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default TimeDate;