import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Clock, DollarSign, Users, XCircle, Layers, Activity, Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MarketingDashboard() {
  const [dateRange, setDateRange] = useState('today');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
const [reportFilter, setReportFilter] = useState('week');
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
const [availableYears, setAvailableYears] = useState([]);
const [availableMonths, setAvailableMonths] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    todayBookings: 0,
    weeklyRevenue: 0,
    cancelledBookings: 0,
    availableTables: 0,
    peakHours: [],
    bookingsPerDay: [],
    revenueByType: [],
    bookingStatus: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  useEffect(() => {
  fetchAvailableYearsAndMonths();
}, []);

const fetchAvailableYearsAndMonths = async () => {
  try {
    const { data: reservations } = await supabase
      .from('reservation')
      .select('reservation_date')
      .order('reservation_date', { ascending: true });

    if (reservations && reservations.length > 0) {
      // Get unique years
      const years = [...new Set(reservations.map(r => new Date(r.reservation_date).getFullYear()))];
      setAvailableYears(years.sort((a, b) => b - a)); // descending order

      // Get unique months (year-month combinations)
      const monthYearCombos = reservations.map(r => {
        const date = new Date(r.reservation_date);
        return { year: date.getFullYear(), month: date.getMonth() };
      });
      
      // Remove duplicates
      const uniqueMonths = Array.from(
        new Set(monthYearCombos.map(m => `${m.year}-${m.month}`))
      ).map(str => {
        const [year, month] = str.split('-');
        return { year: parseInt(year), month: parseInt(month) };
      });
      
      setAvailableMonths(uniqueMonths.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }));
    }
  } catch (error) {
    console.error('Error fetching available dates:', error);
  }
};
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: todayData } = await supabase
        .from('reservation')
        .select('*')
        .eq('reservation_date', today);

      const { data: weeklyPayments } = await supabase
        .from('payment')
        .select('amount, payment_date')
        .gte('payment_date', oneWeekAgo);

      const weeklyRevenue = weeklyPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

      const { data: cancelledData } = await supabase
        .from('reservation')
        .select('*')
        .eq('status', 'cancelled')
        .gte('reservation_date', oneWeekAgo);

      const { data: allTables } = await supabase
        .from('billiard_table_info')
        .select('*');

      const { data: occupiedTables } = await supabase
        .from('reservation')
        .select('table_id')
        .eq('reservation_date', today)
        .in('status', ['ongoing', 'approved']);

      const occupiedTableIds = occupiedTables?.map(r => r.table_id) || [];
      const availableTables = allTables?.filter(t => !occupiedTableIds.includes(t.table_id)).length || 0;

      const { data: monthlyReservations } = await supabase
        .from('reservation')
        .select('start_time')
        .gte('reservation_date', oneMonthAgo);

      const hourCounts = {};
      monthlyReservations?.forEach(r => {
        const hour = r.start_time?.split(':')[0] || '00';
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({
          hour: `${hour}:00`,
          bookings: count
        }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 24);

      const bookingsPerDay = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];

        const { data: dayData } = await supabase
          .from('reservation')
          .select('*')
          .eq('reservation_date', dateStr);

        bookingsPerDay.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          bookings: dayData?.length || 0
        });
      }

      const { data: revenueByTypeData } = await supabase
        .from('payment')
        .select('billiard_type, amount')
        .gte('payment_date', oneWeekAgo);

      const typeRevenue = {};
      revenueByTypeData?.forEach(p => {
        const type = p.billiard_type || 'Standard';
        typeRevenue[type] = (typeRevenue[type] || 0) + parseFloat(p.amount || 0);
      });

      const revenueByType = Object.entries(typeRevenue).map(([type, amount]) => ({
        name: type,
        value: amount
      }));

      const { data: statusData } = await supabase
        .from('reservation')
        .select('status')
        .gte('reservation_date', oneWeekAgo);

      const statusCounts = {};
      statusData?.forEach(r => {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      });

      const bookingStatus = Object.entries(statusCounts).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count
      }));

      setDashboardData({
        todayBookings: todayData?.length || 0,
        weeklyRevenue,
        cancelledBookings: cancelledData?.length || 0,
        availableTables,
        peakHours,
        bookingsPerDay,
        revenueByType,
        bookingStatus
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    } 
  };

const generateRevenuePDF = async () => {
  setGenerating(true);
  try {
    // Load jsPDF from CDN if not already loaded
    if (!window.jspdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(script);

      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load jsPDF library'));
      });
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('jsPDF library not available');
    }

    const { jsPDF } = window.jspdf;

    // Helper function to format currency
    const formatCurrency = (amount) => {
      const num = parseFloat(amount || 0);
      return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // Calculate date ranges based on filter
    // Calculate date ranges based on filter
    const today = new Date();
    let startDate, endDate, reportTitle, periodLabel;

    switch (reportFilter) {
      case 'day':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        reportTitle = 'DAILY REVENUE REPORT';
        periodLabel = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        break;
      case 'week':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = new Date(today);
        reportTitle = 'WEEKLY REVENUE REPORT';
        periodLabel = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        break;
      case 'month':
        startDate = new Date(selectedYear, selectedMonth, 1);
        endDate = new Date(selectedYear, selectedMonth + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        reportTitle = 'MONTHLY REVENUE REPORT';
        periodLabel = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        break;
      case 'year':
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        reportTitle = 'YEARLY REVENUE REPORT';
        periodLabel = selectedYear.toString();
        break;
      default:
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = new Date(today);
        reportTitle = 'WEEKLY REVENUE REPORT';
        periodLabel = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

/// Fetch payments for the selected period
const { data: periodPayments } = await supabase
  .from('payment')
  .select('*')
  .gte('payment_date', startDateStr)
  .lte('payment_date', endDateStr)
  .order('payment_date', { ascending: false });

// Get all reservations for the period to find table_id AND get proper amounts
// ONLY include completed and cancelled reservations
const { data: reservationsData } = await supabase
  .from('reservation')
  .select('id, table_id, status, total_bill, cancelled_amount')
  .gte('reservation_date', startDateStr)
  .lte('reservation_date', endDateStr)
  .in('status', ['completed', 'cancelled']);

// Create a map of reservation_id to table_id and amounts
const reservationTableMap = {};
const reservationAmountMap = {};
reservationsData?.forEach(r => {
  reservationTableMap[r.id] = r.table_id;
  // Use cancelled_amount if status is cancelled, otherwise use total_bill for completed
  reservationAmountMap[r.id] = {
    amount: r.status === 'cancelled' ? (r.cancelled_amount || 0) : (r.total_bill || 0),
    status: r.status
  };
});

// Get all unique table_ids from reservations
const tableIds = [...new Set(Object.values(reservationTableMap).filter(Boolean))];

const { data: tablesData } = await supabase
  .from('billiard_table')
  .select('table_id, table_name')
  .in('table_id', tableIds);

const tableMap = {};
tablesData?.forEach(t => {
  tableMap[t.table_id] = t.table_name;
});

// Add table names to payments and use correct amount based on status
const paymentsWithTables = periodPayments?.map(p => {
  const tableId = p.table_id || reservationTableMap[p.reservation_id];
  const reservationInfo = reservationAmountMap[p.reservation_id] || {};
  
  // Use the correct amount based on reservation status
  const correctAmount = reservationInfo.amount || p.amount || 0;
  
  return {
    ...p,
    table_id: tableId,
    table_name: tableMap[tableId] || 'N/A',
    amount: correctAmount, // Override with correct amount
    reservation_status: reservationInfo.status
  };
}) || [];

const totalRevenue = paymentsWithTables.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Calculate daily revenue breakdown
    const dailyRevenue = {};
    paymentsWithTables.forEach(p => {
      const date = new Date(p.payment_date);
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + parseFloat(p.amount || 0);
    });

    // Get bookings for the period
    const { data: periodBookings } = await supabase
      .from('reservation')
      .select('*')
      .gte('reservation_date', startDateStr)
      .lte('reservation_date', endDateStr);

    const { data: completedBookings } = await supabase
      .from('reservation')
      .select('*')
      .eq('status', 'completed')
      .gte('reservation_date', startDateStr)
      .lte('reservation_date', endDateStr);

    const { data: cancelledBookings } = await supabase
      .from('reservation')
      .select('*')
      .eq('status', 'cancelled')
      .gte('reservation_date', startDateStr)
      .lte('reservation_date', endDateStr);

    // Revenue by type
    const typeRevenue = {};
    paymentsWithTables.forEach(p => {
      const type = p.billiard_type || 'Standard';
      typeRevenue[type] = (typeRevenue[type] || 0) + parseFloat(p.amount || 0);
    });

    const avgRevenuePerBooking = paymentsWithTables.length > 0 
      ? (totalRevenue / paymentsWithTables.length)
      : 0;

    const completionRate = periodBookings?.length > 0
      ? ((completedBookings?.length / periodBookings.length) * 100)
      : 0;

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(reportTitle, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(periodLabel, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 6;
    doc.setFontSize(9);
    const generatedDate = `Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    })} at ${new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    doc.text(generatedDate, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 5;
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 12;

    // Total Revenue Box - Big and centered
    const bigBoxWidth = 120;
    const bigBoxHeight = 25;
    const bigBoxX = (pageWidth - bigBoxWidth) / 2;

    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.rect(bigBoxX, yPos, bigBoxWidth, bigBoxHeight);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text('TOTAL REVENUE', pageWidth / 2, yPos + 8, { align: 'center' });
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(`P${formatCurrency(totalRevenue)}`, pageWidth / 2, yPos + 18, { align: 'center' });

    yPos += bigBoxHeight + 15;

    // KPI Section
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text('Key Performance Indicators', 15, yPos);
    yPos += 8;

    const kpiBoxWidth = 90;
    const kpiBoxHeight = 15;

    // KPI Box 1
    doc.setDrawColor(220);
    doc.setLineWidth(0.1);
    doc.rect(15, yPos, kpiBoxWidth, kpiBoxHeight);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Total Bookings`, 20, yPos + 6);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text(`${periodBookings?.length || 0}`, 100, yPos + 6, { align: 'right' });

    // KPI Box 2
    doc.rect(110, yPos, kpiBoxWidth, kpiBoxHeight);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Completed Bookings`, 115, yPos + 6);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text(`${completedBookings?.length || 0}`, 195, yPos + 6, { align: 'right' });

    yPos += kpiBoxHeight + 3;

    // KPI Box 3
    doc.rect(15, yPos, kpiBoxWidth, kpiBoxHeight);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Cancelled Bookings`, 20, yPos + 6);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text(`${cancelledBookings?.length || 0}`, 100, yPos + 6, { align: 'right' });

    // KPI Box 4
    doc.rect(110, yPos, kpiBoxWidth, kpiBoxHeight);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Total Transactions`, 115, yPos + 6);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text(`${paymentsWithTables.length}`, 195, yPos + 6, { align: 'right' });

    yPos += kpiBoxHeight + 3;

    // KPI Box 5
    doc.rect(15, yPos, kpiBoxWidth, kpiBoxHeight);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Avg Revenue/Booking`, 20, yPos + 6);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text(`P${formatCurrency(avgRevenuePerBooking)}`, 100, yPos + 6, { align: 'right' });

    // KPI Box 6
    doc.rect(110, yPos, kpiBoxWidth, kpiBoxHeight);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Completion Rate`, 115, yPos + 6);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text(`${completionRate.toFixed(1)}%`, 195, yPos + 6, { align: 'right' });

    yPos += kpiBoxHeight + 12;

    // Daily Revenue Table (if there's data)
    if (Object.keys(dailyRevenue).length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Revenue Breakdown by Date', 15, yPos);
      yPos += 8;

      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos, pageWidth - 30, 8, 'F');
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Date', 20, yPos + 5);
      doc.text('Amount', pageWidth - 20, yPos + 5, { align: 'right' });
      yPos += 8;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      // Sort dates chronologically
      const sortedDates = Object.keys(dailyRevenue).sort((a, b) => new Date(a) - new Date(b));
      
      sortedDates.forEach((date) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        
        const amount = dailyRevenue[date];
        doc.text(date, 20, yPos + 5);
        doc.text(`P${formatCurrency(amount)}`, pageWidth - 20, yPos + 5, { align: 'right' });
        doc.line(15, yPos + 7, pageWidth - 15, yPos + 7);
        yPos += 7;
      });

      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos, pageWidth - 30, 8, 'F');
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL', 20, yPos + 5);
      doc.text(`P${formatCurrency(totalRevenue)}`, pageWidth - 20, yPos + 5, { align: 'right' });
      yPos += 15;
    }

    // Check if new page needed
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    // Revenue by Type
    if (Object.keys(typeRevenue).length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Revenue by Table Type', 15, yPos);
      yPos += 8;

      Object.entries(typeRevenue)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, amount]) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.text(type, 20, yPos);
          doc.setFont(undefined, 'bold');
          doc.text(`P${formatCurrency(amount)}`, pageWidth - 20, yPos, { align: 'right' });
          doc.line(15, yPos + 2, pageWidth - 15, yPos + 2);
          yPos += 7;
        });

      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos - 2, pageWidth - 30, 8, 'F');
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL', 20, yPos + 3);
      doc.text(`P${formatCurrency(totalRevenue)}`, pageWidth - 20, yPos + 3, { align: 'right' });
      yPos += 15;
    }

    // New page for transactions
    doc.addPage();
    yPos = 20;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Transaction Details', 15, yPos);
    yPos += 8;

    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos, pageWidth - 30, 8, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Date', 20, yPos + 5);
    doc.text('Table', 55, yPos + 5);
    doc.text('Type', 100, yPos + 5);
    doc.text('Amount', pageWidth - 20, yPos + 5, { align: 'right' });
    yPos += 8;

    doc.setFont(undefined, 'normal');
    const transactionsToShow = paymentsWithTables?.slice(0, 50) || [];
    
    transactionsToShow.forEach((payment) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      
      const date = new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const tableName = payment.table_name || 'N/A';
      doc.text(date, 20, yPos + 4);
      doc.text(tableName, 55, yPos + 4);
      doc.text(payment.billiard_type || 'Standard', 100, yPos + 4);
      doc.text(`P${formatCurrency(payment.amount)}`, pageWidth - 20, yPos + 4, { align: 'right' });
      doc.line(15, yPos + 6, pageWidth - 15, yPos + 6);
      yPos += 7;
    });

    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos - 1, pageWidth - 30, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('TOTAL:', 100, yPos + 4);
    doc.text(`P${formatCurrency(totalRevenue)}`, pageWidth - 20, yPos + 4, { align: 'right' });

    // Footer on last page
    yPos = pageHeight - 20;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150);
    doc.text('Master Billiards Management System', pageWidth / 2, yPos, { align: 'center' });
    doc.text('This is an automatically generated report. For inquiries, contact management.', pageWidth / 2, yPos + 4, { align: 'center' });

    // Save PDF
    const filterName = reportFilter.charAt(0).toUpperCase() + reportFilter.slice(1);
    const fileName = `${filterName}_Revenue_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    // Load SweetAlert2 if not already loaded
    if (!window.Swal) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
    }

    window.Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: 'PDF Report generated successfully!',
      confirmButtonColor: '#3b82f6'
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // Load SweetAlert2 if not already loaded
    if (!window.Swal) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
    }

    window.Swal.fire({
      icon: 'error',
      title: 'Error!',
      text: `Error generating PDF report: ${error.message || 'Please try again.'}`,
      confirmButtonColor: '#ef4444'
    });
  } finally {
    setGenerating(false);
  }
};

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
<div className="mb-8 flex items-start justify-between flex-wrap gap-4">
  <div>
    <h1 className="flex items-center gap-3 mb-2 text-4xl font-bold text-gray-900">
      <Activity className="text-blue-600" size={36} />
      MASTER MARKETING DASHBOARD
    </h1>
    <p className="text-lg text-gray-600">Real-time insights and analytics</p>
  </div>
  <div className="flex items-center gap-3 flex-wrap">
    <select
      value={reportFilter}
      onChange={(e) => setReportFilter(e.target.value)}
      className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-semibold text-gray-700"
    >
      <option value="day">Daily Report</option>
      <option value="week">Weekly Report</option>
      <option value="month">Monthly Report</option>
      <option value="year">Yearly Report</option>
    </select>

    {reportFilter === 'year' && (
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-semibold text-gray-700"
      >
        {availableYears.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    )}

    {reportFilter === 'month' && (
      <select
        value={`${selectedYear}-${selectedMonth}`}
        onChange={(e) => {
          const [year, month] = e.target.value.split('-');
          setSelectedYear(parseInt(year));
          setSelectedMonth(parseInt(month));
        }}
        className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-semibold text-gray-700"
      >
        {availableMonths.map(({ year, month }) => (
          <option key={`${year}-${month}`} value={`${year}-${month}`}>
            {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </option>
        ))}
      </select>
    )}

    <button
      onClick={generateRevenuePDF}
      disabled={generating}
      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {generating ? (
        <>
          <FileText size={20} className="animate-pulse" />
          Generating...
        </>
      ) : (
        <>
          <Download size={20} />
          Export Revenue Report
        </>
      )}
    </button>
  </div>
</div>

      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 transition-all bg-white shadow-lg rounded-2xl hover:shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
              <Calendar className="text-blue-600" size={24} />
            </div>
            <span className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">Today</span>
          </div>
          <p className="text-sm text-gray-600">Today's Bookings</p>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.todayBookings}</p>
        </div>

        <div className="p-6 transition-all bg-white shadow-lg rounded-2xl hover:shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 font-bold text-lg">₱</span>
            </div>
            <span className="px-3 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded-full">7 Days</span>
          </div>
          <p className="text-sm text-gray-600">Weekly Revenue</p>
          <p className="text-3xl font-bold text-gray-900">₱{dashboardData.weeklyRevenue.toLocaleString()}</p>
        </div>

        <div className="p-6 transition-all bg-white shadow-lg rounded-2xl hover:shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl">
              <Layers className="text-purple-600" size={24} />
            </div>
            <span className="px-3 py-1 text-xs font-semibold text-purple-600 bg-purple-100 rounded-full">Now</span>
          </div>
          <p className="text-sm text-gray-600">Available Tables</p>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.availableTables}</p>
        </div>

        <div className="p-6 transition-all bg-white shadow-lg rounded-2xl hover:shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl">
              <XCircle className="text-red-600" size={24} />
            </div>
            <span className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full">7 Days</span>
          </div>
          <p className="text-sm text-gray-600">Cancelled Bookings</p>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.cancelledBookings}</p>
        </div>
      </div>

<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
  <div className="p-6 bg-white shadow-lg rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Peak Hours (Last Month)</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.peakHours.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="bookings" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-6 bg-white shadow-lg rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="text-green-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Revenue by Table Type</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.revenueByType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ₱${value.toLocaleString()}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dashboardData.revenueByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="p-6 bg-white shadow-lg rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Users className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Booking Status (Last 7 Days)</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.bookingStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dashboardData.bookingStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}