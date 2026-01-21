import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

function DatePicker({ value, onChange, placeholder = "Select date", disabled = false }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerStep, setDatePickerStep] = useState('day');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDaySelect = (day) => {
    const selected = new Date(selectedYear, selectedMonth, day);
    const formattedDate = selected.toISOString().split('T')[0];
    onChange(formattedDate);
    setShowDatePicker(false);
  };

  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setDatePickerStep('day');
    setCurrentMonth(new Date(selectedYear, month, 1));
  };

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setDatePickerStep('month');
  };

  const renderDayPicker = () => {
    const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth));
    const firstDay = getFirstDayOfMonth(new Date(selectedYear, selectedMonth));
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days.map((day, i) => (
      <button
        key={i}
        type="button"
        onClick={() => day && handleDaySelect(day)}
        disabled={!day}
        className={`p-2 text-sm rounded font-medium transition ${
          !day ? 'text-transparent cursor-default' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {day}
      </button>
    ));
  };

  const renderMonthPicker = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, i) => (
      <button
        key={i}
        type="button"
        onClick={() => handleMonthSelect(i)}
        className="p-2 text-sm rounded font-medium transition text-gray-700 hover:bg-gray-100"
      >
        {month}
      </button>
    ));
  };

  const renderYearPicker = () => {
    const startYear = Math.floor(selectedYear / 10) * 10;
    const years = [];
    for (let i = startYear; i < startYear + 12; i++) {
      years.push(i);
    }

    return years.map((year) => (
      <button
        key={year}
        type="button"
        onClick={() => handleYearSelect(year)}
        className="p-2 text-sm rounded font-medium transition text-gray-700 hover:bg-gray-100"
      >
        {year}
      </button>
    ));
  };

  const prevYearRange = () => {
    setSelectedYear(selectedYear - 10);
  };

  const nextYearRange = () => {
    setSelectedYear(selectedYear + 10);
  };

  const prevMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
    setSelectedMonth(newMonth.getMonth());
    setSelectedYear(newMonth.getFullYear());
  };

  const nextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
    setSelectedMonth(newMonth.getMonth());
    setSelectedYear(newMonth.getFullYear());
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setShowDatePicker(!showDatePicker);
            setDatePickerStep('day');
          }
        }}
        disabled={disabled}
        className="flex items-center justify-between w-full px-4 py-2.5 text-left bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value ? new Date(value + 'T00:00:00').toLocaleDateString() : placeholder}
        </span>
        <Calendar size={18} className="text-gray-400" />
      </button>

      {showDatePicker && (
        <>
          {/* Backdrop to close picker when clicking outside */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDatePicker(false)}
          />

          <div className="absolute left-0 z-20 p-4 bg-white border border-gray-300 rounded-lg shadow-lg top-12 w-80">
            {datePickerStep === 'day' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-gray-100">
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatePickerStep('month')}
                    className="text-sm font-medium cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                  >
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </button>
                  <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-gray-100">
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-xs font-semibold text-center text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {renderDayPicker()}
                </div>
              </>
            )}

            {datePickerStep === 'month' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button type="button" onClick={() => setDatePickerStep('year')} className="p-1 rounded hover:bg-gray-100">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium">{selectedYear}</span>
                  <div className="w-5" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {renderMonthPicker()}
                </div>
              </>
            )}

            {datePickerStep === 'year' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button type="button" onClick={prevYearRange} className="p-1 rounded hover:bg-gray-100">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium">
                    {Math.floor(selectedYear / 10) * 10} - {Math.floor(selectedYear / 10) * 10 + 9}
                  </span>
                  <button type="button" onClick={nextYearRange} className="p-1 rounded hover:bg-gray-100">
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {renderYearPicker()}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DatePicker;