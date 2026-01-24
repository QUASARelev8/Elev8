import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {Clock,Calendar,AlertCircle,CheckCircle,XCircle, Eye} from "lucide-react";
import { getTodayDate, isDateClosed, getDayNameFromDate, isTimeInPast,createDateFilter,createDayClassName } from '../components/dateUtils';

const CustomerReservation = () => {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [currentUser, setCurrentUser] = useState(null);

  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleData, setRescheduleData] = useState(null);
  const [tableInfos, setTableInfos] = useState([]);
  const [durations, setDurations] = useState([]);
  const [timeDates, setTimeDates] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [availableTimesCache, setAvailableTimesCache] = useState({});
  const [maxDurations, setMaxDurations] = useState({});
  const [rescheduleForm, setRescheduleForm] = useState({
    date: "",
    time: "",
    duration: "",
  });
  const [availableTimes, setAvailableTimes] = useState([]);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchReservations();
    }
  }, [currentUser, activeTab]);

  const getCurrentUser = () => {
    try {
      const userSession = localStorage.getItem("userSession");

      if (!userSession) {
        Swal.fire({
          icon: "error",
          title: "Not Logged In",
          text: "Please log in to view your reservations",
        });
        return;
      }

      const userData = JSON.parse(userSession);

      if (!userData.account_id) {
        Swal.fire({
          icon: "error",
          title: "Invalid Session",
          text: "Please log in again",
        });
        return;
      }

      setCurrentUser({
        account_id: userData.account_id,
        email: userData.email,
        role: userData.role,
        full_name: userData.full_name,
      });
    } catch (error) {
      console.error("Error getting user:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to get user information",
      });
    }
  };

  const fetchReservations = async () => {
    try {
      setLoading(true);

      const { data: tablesData, error: tablesError } = await supabase
        .from("billiard_table")
        .select("*");

      if (tablesError) throw tablesError;
      setTables(tablesData || []);

      const { data: infosData, error: infosError } = await supabase
        .from("billiard_table_info")
        .select("*");

      if (infosError) throw infosError;
      setTableInfos(infosData || []);

      const { data: durationsData, error: durationsError } = await supabase
        .from("duration")
        .select("*")
        .order("hours", { ascending: true });

      if (durationsError) throw durationsError;
      setDurations(durationsData || []);

      const { data: timeDatesData, error: timeDatesError } = await supabase
        .from("TimeDate")
        .select("*");

      if (timeDatesError) throw timeDatesError;
      setTimeDates(timeDatesData || []);

      const { data: typesData, error: typesError } = await supabase
        .from("billiard_type")
        .select("*")
        .order("billiard_type", { ascending: true });

      if (typesError) throw typesError;
      setTypes(typesData || []);

      let query = supabase
        .from("reservation")
        .select("*")
        .eq("account_id", currentUser.account_id)
        .order("created_at", { ascending: false });

      if (activeTab === "pending") {
        query = query.eq("status", "pending");
      } else if (activeTab === "rescheduled") {
        query = query.eq("status", "rescheduled");
      } else if (activeTab === "approved") {
        query = query.eq("status", "approved");
      } else if (activeTab === "ongoing") {
        query = query.eq("status", "ongoing");
      } else if (activeTab === "completed") {
        query = query.in("status", ["completed", "cancelled"]);
      }

      const { data: reservationsData, error: reservationsError } = await query;

      if (reservationsError) throw reservationsError;

      setReservations(reservationsData || []);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch reservations",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTimes = async (tableId, date) => {
    if (!date) {
      return [];
    }

    if (isDateClosed(date, timeDates)) {
      return [];
    }

    const dayName = getDayNameFromDate(date);

    const schedules = timeDates.filter(
      (td) => td.Date === dayName && td.Actions === "Active" && !td.CloseDay
    );

    if (schedules.length === 0) {
      return [];
    }

    const activeSchedule = schedules[0];

    const parseTime = (timeString) => {
      if (!timeString) return { hour: 0, minute: 0 };
      const [hour, minute] = timeString.split(":");
      return {
        hour: parseInt(hour),
        minute: parseInt(minute),
      };
    };

    const openTime = parseTime(activeSchedule.OpenTime);
    const closeTime = parseTime(activeSchedule.CloseTime);

    const today = getTodayDate();

    const { data: existingReservations, error: reservationError } =
      await supabase
        .from("reservation")
        .select("start_time, time_end")
        .eq("table_id", tableId)
        .eq("reservation_date", date)
        .not("status", "in", "(cancelled,completed)")
        .order("start_time", { ascending: true });

    if (reservationError) {
      console.error("Error checking existing reservations:", reservationError);
    }

    const reservations = existingReservations || [];

    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const timeSlots = [];
    let currentHour = openTime.hour;
    let currentMinute = openTime.minute;

    while (
      currentHour < closeTime.hour ||
      (currentHour === closeTime.hour && currentMinute < closeTime.minute)
    ) {
      const period = currentHour >= 12 ? "PM" : "AM";
      const displayHour =
        currentHour === 0
          ? 12
          : currentHour > 12
          ? currentHour - 12
          : currentHour;
      const timeString = `${displayHour}:${String(currentMinute).padStart(
        2,
        "0"
      )} ${period}`;
      const dbTime = `${String(currentHour).padStart(2, "0")}:${String(
        currentMinute
      ).padStart(2, "0")}:00`;

      const isPast = date === today && isTimeInPast(timeString, date);

      let createsGap = false;
      const slotMinutes = timeToMinutes(dbTime);

      const openMinutes = openTime.hour * 60 + openTime.minute;
      const gapFromOpen = slotMinutes - openMinutes;
      if (gapFromOpen > 0 && gapFromOpen < 60) {
        createsGap = true;
      }

      const closeMinutes = closeTime.hour * 60 + closeTime.minute;
      const timeUntilClose = closeMinutes - slotMinutes;
      if (timeUntilClose < 60) {
        createsGap = true;
      }

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
        createsGap: createsGap,
      });

      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour += 1;
      }

      if (
        currentHour > closeTime.hour ||
        (currentHour === closeTime.hour && currentMinute >= closeTime.minute)
      ) {
        break;
      }
    }

    const availabilityChecks = timeSlots.map(async (slot) => {
      if (slot.isPast) {
        return {
          time: slot.time,
          available: false,
          createsGap: false,
        };
      }

      if (slot.createsGap) {
        return {
          time: slot.time,
          available: false,
          createsGap: true,
        };
      }

      try {
        const { data: isAvailable, error } = await supabase.rpc(
          "is_table_available",
          {
            p_table_id: tableId,
            p_reservation_date: date,
            p_start_time: slot.dbTime,
            p_duration_hours: 0.5,
          }
        );

        if (error) {
          console.error("RPC Error:", error);
          return {
            time: slot.time,
            available: true,
            createsGap: false,
          };
        }

        return {
          time: slot.time,
          available: isAvailable === true,
          createsGap: false,
        };
      } catch (err) {
        console.error("Error checking availability:", err);
        return {
          time: slot.time,
          available: true,
          createsGap: false,
        };
      }
    });

    const results = await Promise.all(availabilityChecks);
    return results;
  };

  const getMaxAvailableDuration = async (tableId, date, startTime) => {
    if (!date || !startTime) return 0;

    const dayName = getDayNameFromDate(date);
    const schedules = timeDates.filter(
      (td) => td.Date === dayName && td.Actions === "Active" && !td.CloseDay
    );

    if (schedules.length === 0) return 0;

    const activeSchedule = schedules[0];

    const parseTime = (timeString) => {
      if (!timeString) return { hour: 0, minute: 0 };
      const [hour, minute] = timeString.split(":");
      return {
        hour: parseInt(hour),
        minute: parseInt(minute),
      };
    };

    const closeTime = parseTime(activeSchedule.CloseTime);

    const [time, period] = startTime.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    const startTimeInHours = hours + minutes / 60;
    const closeTimeInHours = closeTime.hour + closeTime.minute / 60;
    const maxPossibleHours = closeTimeInHours - startTimeInHours;

    const dbTime = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:00`;

    const { data: nextReservations, error: resError } = await supabase
      .from("reservation")
      .select("start_time")
      .eq("table_id", tableId)
      .eq("reservation_date", date)
      .not("status", "in", "(cancelled,completed)")
      .gt("start_time", dbTime)
      .order("start_time", { ascending: true })
      .limit(1);

    if (resError) {
      console.error("Error fetching next reservation:", resError);
    }

    let maxHoursUntilNextReservation = maxPossibleHours;

    if (nextReservations && nextReservations.length > 0) {
      const nextResTime = nextReservations[0].start_time;
      const [nextHour, nextMinute] = nextResTime.split(":").map(Number);
      const nextTimeInHours = nextHour + nextMinute / 60;

      const availableHours = nextTimeInHours - startTimeInHours - 1;
      maxHoursUntilNextReservation = Math.max(0, availableHours);
    }

    const finalMaxHours = Math.min(
      maxPossibleHours,
      maxHoursUntilNextReservation
    );

    const sortedDurations = [...durations].sort((a, b) => a.hours - b.hours);

    let maxDuration = 0;
    for (const duration of sortedDurations) {
      if (duration.hours > finalMaxHours) {
        break;
      }

      try {
        const dbTimeFormatted = `${String(hours).padStart(2, "0")}:${String(
          minutes
        ).padStart(2, "0")}:00`;

        const { data: isAvailable, error } = await supabase.rpc(
          "is_table_available",
          {
            p_table_id: tableId,
            p_reservation_date: date,
            p_start_time: dbTimeFormatted,
            p_duration_hours: duration.hours,
          }
        );

        if (error) {
          console.error("RPC Error:", error);
          maxDuration = duration.hours;
          continue;
        }

        if (isAvailable === true) {
          maxDuration = duration.hours;
        } else {
          break;
        }
      } catch (err) {
        console.error("Error checking duration:", err);
        break;
      }
    }

    return maxDuration;
  };

  const handleCancel = async (reservationId) => {
    const result = await Swal.fire({
      title: "Cancel Reservation?",
      text: "Are you sure you want to cancel this reservation?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, cancel it!",
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from("reservation")
          .update({ status: "cancelled" })
          .eq("id", reservationId);

        if (error) throw error;

        Swal.fire({
          icon: "success",
          title: "Cancelled!",
          text: "Your reservation has been cancelled.",
          timer: 1500,
          showConfirmButton: false,
        });

        fetchReservations();
      } catch (error) {
        console.error("Error cancelling reservation:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to cancel reservation",
        });
      }
    }
  };

  const handleReschedule = (reservation) => {
    if (reservation.status === "rescheduled") {
      Swal.fire({
        icon: "warning",
        title: "Already Rescheduled",
        text: "This reservation has already been rescheduled once. You cannot reschedule it again.",
      });
      return;
    }

    setRescheduleData(reservation);
    setShowReschedule(true);
    setSelectedTable(null);
    setRescheduleForm({
      date: "",
      time: "",
      duration: durations.length > 0 ? durations[0].id : "",
    });
    setAvailableTimes([]);
  };

  const handleTableSelect = async (table, info) => {
    if (info.status !== "Available") return;

    setSelectedTable({ ...table, info });
    setRescheduleForm({
      date: "",
      time: "",
      duration: durations.length > 0 ? durations[0].id : "",
    });
    setAvailableTimes([]);
  };

  const handleRescheduleFormChange = async (field, value) => {
    setRescheduleForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "date" ? { time: "" } : {}),
      ...(field === "time"
        ? { duration: durations.length > 0 ? durations[0].id : "" }
        : {}),
    }));

    if (field === "date" && selectedTable) {
      Swal.fire({
        title: "Loading available times...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const times = await getAvailableTimes(selectedTable.table_id, value);

      setAvailableTimesCache((prev) => ({
        ...prev,
        [`${selectedTable.table_id}-${value}`]: times,
      }));

      setAvailableTimes(times);

      Swal.close();
    }

    if (field === "time" && value && selectedTable) {
      Swal.fire({
        title: "Checking available hours...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const maxDuration = await getMaxAvailableDuration(
        selectedTable.table_id,
        rescheduleForm.date,
        value
      );

      setMaxDurations((prev) => ({
        ...prev,
        [selectedTable.table_id]: maxDuration,
      }));

      Swal.close();
    }
  };

  const handleConfirmReschedule = async () => {
    if (
      !selectedTable ||
      !rescheduleForm.date ||
      !rescheduleForm.time ||
      !rescheduleForm.duration
    ) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Information",
        text: "Please fill in all fields",
      });
      return;
    }

    try {
      // ✅ SAFE CUSTOMER NAME
      const customerName =
        currentUser?.full_name ||
        currentUser?.email ||
        "Customer";

      // ✅ GET DURATION
      const selectedDuration = durations.find(
        (d) => d.id === parseInt(rescheduleForm.duration)
      );

      if (!selectedDuration) {
        Swal.fire({
          icon: "error",
          title: "Invalid Duration",
          text: "Please select a valid duration",
        });
        return;
      }

      // ✅ CALCULATE END TIME
      const { data: endTimeData, error: endTimeError } =
        await supabase.rpc("calculate_end_time", {
          p_start_time: rescheduleForm.time,
          p_duration_hours: selectedDuration.hours,
        });

      if (endTimeError) throw endTimeError;

      // ✅ CHECK TABLE AVAILABILITY
      const { data: isAvailable, error: availError } =
        await supabase.rpc("is_table_available", {
          p_table_id: selectedTable.table_id,
          p_reservation_date: rescheduleForm.date,
          p_start_time: rescheduleForm.time,
          p_duration_hours: selectedDuration.hours,
        });

      if (availError) throw availError;

      if (!isAvailable) {
        Swal.fire({
          icon: "error",
          title: "Table Not Available",
          text: "This table is already booked at the selected time.",
        });
        return;
      }

      // ✅ COMPUTE NEW BILL
      const newTotalBill =
        parseFloat(selectedTable.info.price) *
        selectedDuration.hours;

      // ✅ UPDATE ORIGINAL RESERVATION STATUS
      const { error: updateError } = await supabase
        .from("reservation")
        .update({ status: "rescheduled" })
        .eq("id", rescheduleData.id);

      if (updateError) throw updateError;

      // ✅ INSERT RESCHEDULE REQUEST
      const { error: insertError } = await supabase
        .from("reschedule_request")
        .insert({
          reservation_id: rescheduleData.id,
          account_id: currentUser.account_id,
          new_table_id: selectedTable.table_id,
          new_reservation_date: rescheduleForm.date,
          new_start_time: rescheduleForm.time,
          new_time_end: endTimeData,
          new_duration: selectedDuration.hours,
          new_billiard_type: selectedTable.info.billiard_type,
          new_total_bill: newTotalBill,
          status: "pending",
        });

      if (insertError) throw insertError;

      // ✅ FORMAT DATE FUNCTION
      const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      // ✅ CUSTOMER NOTIFICATION
      await supabase.from("notification").insert({
        account_id: currentUser.account_id,
        reservation_no: rescheduleData.reservation_no,
        message: `Your reschedule request for ${rescheduleData.reservation_no} has been submitted and is waiting for approval`,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      // ✅ MANAGER / FRONTDESK NOTIFICATION
      await supabase.from("notification").insert({
        account_id: null, // 👈 manager / frontdesk
        reservation_no: rescheduleData.reservation_no,
        message: `Requester ${customerName} rescheduled reservation ${rescheduleData.reservation_no
          } from ${formatDate(rescheduleData.reservation_date)} at ${rescheduleData.start_time
          } (${getTableName(rescheduleData.table_id)}) to ${formatDate(
            rescheduleForm.date
          )} at ${rescheduleForm.time} (${selectedTable.table_name})`,
        is_read: false,
        created_at: new Date().toISOString(),
      });


      // ✅ SUCCESS MESSAGE
      Swal.fire({
        icon: "success",
        title: "Reschedule Request Sent!",
        text: "Your reschedule request has been submitted. You will be notified once it's reviewed.",
        timer: 2000,
        showConfirmButton: false,
      });

      // ✅ RESET STATES
      setShowReschedule(false);
      setRescheduleData(null);
      setSelectedTable(null);
      fetchReservations();

    } catch (error) {
      console.error("Error creating reschedule request:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to submit reschedule request",
      });
    }
  };

  const handleCancelReschedule = () => {
    setShowReschedule(false);
    setRescheduleData(null);
    setSelectedTable(null);
  };

  const getTableName = (tableId) => {
    const table = tables.find((t) => t.table_id === tableId);
    return table ? table.table_name : "Unknown Table";
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "#ff9800";
      case "approved":
      case "confirmed":
        return "#28a745";
      case "rescheduled":
        return "#9c27b0";
      case "ongoing":
        return "#17a2b8";
      case "completed":
        return "#6c757d";
      case "cancelled":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <AlertCircle size={20} />;
      case "approved":
      case "confirmed":
        return <CheckCircle size={20} />;
      case "rescheduled":
        return <Calendar size={20} />;
      case "ongoing":
        return <Clock size={20} />;
      case "completed":
        return <CheckCircle size={20} />;
      case "cancelled":
        return <XCircle size={20} />;
      default:
        return <Clock size={20} />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f5f5f5",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "5px solid #e0e0e0",
              borderTop: "5px solid #28a745",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          ></div>
          <p style={{ marginTop: "15px", color: "#666" }}>
            Loading reservations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "white",
            padding: "40px",
            borderRadius: "12px",
            marginBottom: "30px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: "0 0 10px 0",
              fontSize: "32px",
              fontWeight: "700",
              color: "#333",
            }}
          >
            My Reservations
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "16px",
              color: "#666",
            }}
          >
            Manage your current and upcoming bookings
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "30px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {["pending", "rescheduled", "approved", "ongoing", "completed"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 30px",
                  backgroundColor: activeTab === tab ? "#28a745" : "#e0e0e0",
                  color: activeTab === tab ? "white" : "#666",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textTransform: "capitalize",
                }}
              >
                {tab}
              </button>
            )
          )}
        </div>

        {/* Warning Messages */}
        {activeTab === "pending" && reservations.length > 0 && (
          <div
            style={{
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "8px",
              padding: "15px 20px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <AlertCircle size={24} color="#856404" />
            <p
              style={{
                margin: 0,
                color: "#856404",
                fontSize: "15px",
                fontWeight: "500",
              }}
            >
              Your reservation is being processed. Please wait for confirmation.
            </p>
          </div>
        )}

        {activeTab === "rescheduled" && reservations.length > 0 && (
          <div
            style={{
              backgroundColor: "#f3e5f5",
              border: "1px solid #9c27b0",
              borderRadius: "8px",
              padding: "15px 20px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Calendar size={24} color="#6a1b9a" />
            <p
              style={{
                margin: 0,
                color: "#6a1b9a",
                fontSize: "15px",
                fontWeight: "500",
              }}
            >
              These reservations have been rescheduled and are awaiting
              approval. You cannot reschedule them again.
            </p>
          </div>
        )}

        {/* Reservations List */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {reservations.length === 0 ? (
            <div
              style={{
                backgroundColor: "white",
                padding: "60px 40px",
                borderRadius: "12px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "18px",
                  color: "#999",
                }}
              >
                No {activeTab} reservations found.
              </p>
            </div>
          ) : (
            reservations.map((reservation) => (
              <div
                key={reservation.id}
                style={{
                  backgroundColor: "white",
                  padding: "25px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  display: "flex",
                  gap: "20px",
                  alignItems: "flex-start",
                  position: "relative",
                  flexWrap: "wrap",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    backgroundColor: `${getStatusColor(reservation.status)}20`,
                    color: getStatusColor(reservation.status),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {getStatusIcon(reservation.status)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: "250px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "10px",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: "0 0 5px 0",
                          fontSize: "20px",
                          fontWeight: "700",color: "#333",
                        }}
                      >
                        {getTableName(reservation.table_id)} -{" "}
                        {reservation.billiard_type || "Standard"}
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          color: "#666",
                        }}
                      >
                        Reference no:{" "}
                        {reservation.reservation_no ||
                          `RF${String(reservation.id).padStart(3, "0")}`}
                      </p>
                    </div>
                  
                  </div>

                  {/* Details */}
                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      marginBottom: "10px",
                      fontSize: "14px",
                      color: "#666",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Calendar size={16} />
                      <span>{formatDate(reservation.reservation_date)}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Clock size={16} />
                      <span>
                        {reservation.start_time} - {reservation.time_end}
                      </span>
                    </div>
                  </div>

                  {/* Duration, Amount, Payment, QR Code */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(120px, 1fr))",
                      gap: "15px",
                      marginTop: "15px",
                      paddingTop: "15px",
                      borderTop: "1px solid #e0e0e0",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: "0 0 5px 0",
                          fontSize: "13px",
                          color: "#999",
                          fontWeight: "500",
                        }}
                      >
                        Duration:
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: "700",
                          color: "#333",
                        }}
                      >
                        {reservation.duration} hour
                        {reservation.duration > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          margin: "0 0 5px 0",
                          fontSize: "13px",
                          color: "#999",
                          fontWeight: "500",
                        }}
                      >
                        Amount:
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: "700",
                          color: "#333",
                        }}
                      >
                        ₱{(reservation.total_bill || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          margin: "0 0 5px 0",
                          fontSize: "13px",
                          color: "#999",
                          fontWeight: "500",
                        }}
                      >
                        Payment Status:
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: "700",
                          color: reservation.payment_status === "completed" ? "#28a745" : 
                                 reservation.payment_status === "pending" ? "#ff9800" : "#6c757d",
                          textTransform: "capitalize"
                        }}
                      >
                        {reservation.payment_status || "Pending"}
                      </p>
                    </div>
                {/* QR Code - Only show for approved, ongoing, or completed reservations */}
                    {reservation.qr_code && reservation.status !== "pending" && reservation.status !== "rescheduled" && (
                      <div>
                        <p
                          style={{
                            margin: "0 0 5px 0",
                            fontSize: "13px",
                            color: "#999",
                            fontWeight: "500",
                          }}
                        >
                          QR Code:
                        </p>
                        <button
                          onClick={() => {
                            Swal.fire({
                              title: "Your QR Code",
                              html: `
                                <div style="text-align: center; padding: 20px;">
                                  <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
                                    Reservation: <strong>${reservation.reservation_no}</strong>
                                  </p>
                                  <img src="${reservation.qr_code}" alt="QR Code" style="max-width: 300px; width: 100%; border-radius: 8px;" />
                                  <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                                    Show this QR code at the front desk
                                  </p>
                                </div>
                              `,
                              confirmButtonColor: "#28a745",
                              confirmButtonText: "Close",
                              width: "400px",
                            });
                          }}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#17a2b8",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#138496")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "#17a2b8")
                          }
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          View
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {(reservation.status === "pending" ||
                    reservation.status === "rescheduled") && (
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "20px",
                      }}
                    >
                      <button
                        onClick={() => handleCancel(reservation.id)}
                        style={{
                          padding: "10px 20px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#c82333")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "#dc3545")
                        }
                      >
                        Cancel
                      </button>
    
                      <button
                        onClick={() => handleReschedule(reservation)}
                        disabled={reservation.status === "rescheduled"}
                        style={{
                          padding: "10px 20px",
                          backgroundColor:
                            reservation.status === "rescheduled"
                              ? "#6c757d"
                              : "#17a2b8",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor:
                            reservation.status === "rescheduled"
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            reservation.status === "rescheduled" ? 0.6 : 1,
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (reservation.status !== "rescheduled") {
                            e.currentTarget.style.backgroundColor = "#138496";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (reservation.status !== "rescheduled") {
                            e.currentTarget.style.backgroundColor = "#17a2b8";
                          }
                        }}
                      >
                        {reservation.status === "rescheduled"
                          ? "Already Rescheduled"
                          : "Reschedule"}
                      </button>
                                        {/* VIEW QR CODE BUTTON - For Pending */}
    {reservation.status === "pending" && reservation.qr_code && (
      <button
        onClick={() => {
          Swal.fire({
            title: "Your QR Code",
            html: `
              <div style="text-align: center; padding: 20px;">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
                  Reservation: <strong>${reservation.reservation_no}</strong>
                </p>
                <img src="${reservation.qr_code}" alt="QR Code" style="max-width: 300px; width: 100%; border-radius: 8px;" />
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                  Show this QR code at the front desk
                </p>
              </div>
            `,
            confirmButtonColor: "#28a745",
            confirmButtonText: "Close",
            width: "400px",
          });
        }}
        style={{
          padding: "10px 20px",
          backgroundColor: "#17a2b8",
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#138496")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "#17a2b8")
        }
      >
        <Eye size={16} />
        View QR Code
      </button>
    )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {showReschedule && rescheduleData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px",
            overflow: "auto",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              maxWidth: "1200px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "30px",
                borderBottom: "1px solid #e0e0e0",
                position: "sticky",
                top: 0,
                backgroundColor: "white",
                zIndex: 1,
              }}
            >
              <h2
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#333",
                }}
              >
                Reschedule Reservation
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "15px",
                  color: "#666",
                }}
              >
                Current: {getTableName(rescheduleData.table_id)} -{" "}
                {formatDate(rescheduleData.reservation_date)} at{" "}
                {rescheduleData.start_time}
              </p>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "30px" }}>
              {selectedTable && (
                <div
                  style={{
                    marginBottom: "30px",
                    padding: "25px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    border: "2px solid #28a745",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 20px 0",
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#28a745",
                    }}
                  >
                    Selected: {selectedTable.table_name} - ₱
                    {parseFloat(selectedTable.info.price).toFixed(2)}/hour
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "15px",
                    }}
                  >
                    {/* Date */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#555",
                        }}
                      >
                        Date
                      </label>
                      <DatePicker
                        selected={rescheduleForm.date ? new Date(rescheduleForm.date + 'T00:00:00') : null}
                        onChange={(date) => {
                          if (!date) return;
                          
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const dateString = `${year}-${month}-${day}`;
                          
                          if (isDateClosed(dateString, timeDates)) {
                            Swal.fire({
                              icon: 'error',
                              title: 'Date Closed',
                              text: 'This date is not available for booking',
                            });
                            return;
                          }
                          
                          handleRescheduleFormChange('date', dateString);
                        }}
                        minDate={new Date()}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select a date"
                        filterDate={createDateFilter(timeDates, selectedTable)}
                        dayClassName={createDayClassName(timeDates)}
                        inline={false}
                        showPopperArrow={false}
                        className="custom-datepicker"
                        wrapperClassName="datepicker-wrapper"
                      />
                    </div>

                    {/* Time */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#555",
                        }}
                      >
                        Time
                      </label>
                      <select
                        value={rescheduleForm.time}
                        onChange={(e) => {
                          const selectedTime = e.target.value;
                          const timeObj = availableTimes.find(
                            (t) => t.time === selectedTime
                          );

                          if (timeObj && timeObj.createsGap) {
                            Swal.fire({
                              icon: "warning",
                              title: "Time Slot Not Available",
                              html: `
                                <p><strong>${selectedTime}</strong> cannot be booked.</p>
                                <p>This time would create a gap of less than 1 hour with an existing reservation.</p>
                                <p>Please select a different time slot.</p>
                              `,
                              confirmButtonColor: "#28a745",
                              confirmButtonText: "OK",
                            });
                            return;
                          }

                          if (timeObj && !timeObj.available) {
                            Swal.fire({
                              icon: "error",
                              title: "Time Already Reserved",
                              text: `${selectedTime} is already booked. Please select another time.`,
                              confirmButtonColor: "#dc3545",
                              confirmButtonText: "OK",
                            });
                            return;
                          }

                          handleRescheduleFormChange("time", selectedTime);
                        }}
                        disabled={
                          !rescheduleForm.date ||
                          isDateClosed(rescheduleForm.date, timeDates) ||
                          availableTimes.length === 0
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          cursor:
                            !rescheduleForm.date ||
                            isDateClosed(rescheduleForm.date, timeDates) ||
                            availableTimes.length === 0
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            !rescheduleForm.date ||
                            isDateClosed(rescheduleForm.date, timeDates) ||
                            availableTimes.length === 0
                              ? 0.6
                              : 1,
                        }}
                      >
                        <option value="">
                          {!rescheduleForm.date
                            ? "Select a date first"
                            : isDateClosed(rescheduleForm.date, timeDates)
                            ? "Date is closed"
                            : availableTimes.length === 0
                            ? "Loading..."
                            : "Select time"}
                        </option>
                        {availableTimes.map((timeObj) => {
                          const isReserved =
                            !timeObj.available && !timeObj.createsGap;
                          const createsGap = timeObj.createsGap;

                          return (
                            <option
                              key={timeObj.time}
                              value={timeObj.time}
                              style={{
                                backgroundColor: isReserved
                                  ? "#ffebee"
                                  : createsGap
                                  ? "#fff3cd"
                                  : "white",
                                color: isReserved
                                  ? "#dc3545"
                                  : createsGap
                                  ? "#856404"
                                  : "#333",
                                fontWeight:
                                  isReserved || createsGap ? "600" : "normal",
                              }}
                            >
                              {timeObj.time}
                              {isReserved ? " (Reserved)" : ""}
                              {createsGap ? " (Gap Issue)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#555",
                        }}
                      >
                        Duration
                      </label>
                      <select
                        value={rescheduleForm.duration}
                        onChange={(e) =>
                          handleRescheduleFormChange("duration", e.target.value)
                        }
                        disabled={!rescheduleForm.time}
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          cursor: !rescheduleForm.time
                            ? "not-allowed"
                            : "pointer",
                          opacity: !rescheduleForm.time ? 0.6 : 1,
                        }}
                      >
                        <option value="">
                          {!rescheduleForm.time
                            ? "Select time first"
                            : "Select duration"}
                        </option>
                        {durations
                          .filter((duration) => {
                            const maxDuration =
                              maxDurations[selectedTable?.table_id] || 0;
                            return duration.hours <= maxDuration;
                          })
                          .map((duration) => {
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
                      {rescheduleForm.time &&
                        maxDurations[selectedTable?.table_id] && (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#666",
                              marginTop: "5px",
                              marginBottom: 0,
                            }}
                          >
                            ⏱️ Maximum {maxDurations[selectedTable?.table_id]}{" "}
                            hour
                            {maxDurations[selectedTable?.table_id] > 1
                              ? "s"
                              : ""}{" "}
                            available
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* All Tables */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "25px",
                }}
              >
                {tables
                  .sort((a, b) => a.table_id - b.table_id)
                  .map((table) => {
                    const info = tableInfos.find(
                      (i) => i.table_id === table.table_id
                    );
                    if (!info) return null;

                    const isSelected =
                      selectedTable?.table_id === table.table_id;
                    const isAvailable = info.status === "Available";

                    return (
                      <div
                        key={table.table_id}
                        onClick={() => handleTableSelect(table, info)}
                        style={{
                          backgroundColor: "white",
                          border: isSelected
                            ? "3px solid #28a745"
                            : "2px solid #e9ecef",
                          borderRadius: "16px",
                          overflow: "hidden",
                          cursor: isAvailable ? "pointer" : "not-allowed",
                          transition: "all 0.3s ease",
                          opacity: isAvailable ? 1 : 0.6,
                          position: "relative",
                          boxShadow: isSelected
                            ? "0 8px 24px rgba(40,167,69,0.3)"
                            : "0 2px 8px rgba(0,0,0,0.08)",
                          transform: isSelected ? "translateY(-4px)" : "none",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "12px",
                            right: "12px",
                            padding: "6px 14px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontWeight: "700",
                            backgroundColor: isAvailable
                              ? "#28a745"
                              : "#dc3545",
                            color: "white",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            zIndex: 2,
                          }}
                        >
                          {isAvailable ? "AVAILABLE" : "FULLY BOOKED"}
                        </div>

                        <div
                          style={{
                            height: "200px",
                            backgroundColor: "#f8f9fa",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderBottom: "1px solid #e9ecef",
                            overflow: "hidden",
                          }}
                        >
                          {table.table_image ? (
                            <img
                              src={table.table_image}
                              alt={table.table_name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                color: "#adb5bd",
                                fontSize: "14px",
                                fontWeight: "500",
                              }}
                            >
                              No Image Available
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            padding: "24px",
                            textAlign: "center",
                          }}
                        >
                          <h3
                            style={{
                              margin: "0 0 8px 0",
                              fontSize: "20px",
                              fontWeight: "700",
                              color: "#2c3e50",
                            }}
                          >
                            {table.table_name}
                          </h3>
                          <p
                            style={{
                              margin: "0 0 16px 0",
                              fontSize: "13px",
                              color: "#7f8c8d",
                              fontWeight: "500",
                            }}
                          >
                            {info.billiard_type}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: "28px",
                                fontWeight: "800",
                                color: "#28a745",
                              }}
                            >
                              ₱{parseFloat(info.price).toFixed(2)}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "14px",
                                color: "#95a5a6",
                                fontWeight: "600",
                              }}
                            >
                              /hour
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: "0",
                              left: "0",
                              right: "0",
                              height: "4px",
                              backgroundColor: "#28a745",
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "20px 30px",
                borderTop: "1px solid #e0e0e0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                position: "sticky",
                bottom: 0,
                backgroundColor: "white",
              }}
            >
              <button
                onClick={handleCancelReschedule}
                style={{
                  padding: "12px 30px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
  onClick={handleConfirmReschedule}
  disabled={
    !selectedTable || 
    !rescheduleForm.date || 
    !rescheduleForm.time || 
    !rescheduleForm.duration // ✅ ADD duration check
  }
  style={{
    padding: "12px 30px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "600",
    cursor:
      !selectedTable ||
      !rescheduleForm.date ||
      !rescheduleForm.time ||
      !rescheduleForm.duration // ✅ ADD duration check
        ? "not-allowed"
        : "pointer",
    opacity:
      !selectedTable ||
      !rescheduleForm.date ||
      !rescheduleForm.time ||
      !rescheduleForm.duration // ✅ ADD duration check
        ? 0.5
        : 1,
  }}
>
  Confirm Reschedule
</button>
            </div>
          </div>
        </div>
      )}
 <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .datepicker-wrapper {
            width: 100%;
          }
          
          .custom-datepicker {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            box-sizing: border-box;
            cursor: pointer;
          }
          
          .custom-datepicker:focus {
            outline: none;
            border-color: #17a2b8;
          }
          
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
          
          .react-datepicker__day {
            color: #333;
            font-size: 14px;
            margin: 2px;
            border-radius: 4px;
          }
          
          .react-datepicker__day:hover {
            background-color: #e3f2fd;
          }
          
          .react-datepicker__day--selected,
          .react-datepicker__day--keyboard-selected {
            background-color: #28a745 !important;
            color: white !important;
            font-weight: 600;
          }
          
          .react-datepicker__day--today {
            font-weight: 600;
            background-color: #fff3cd;
          }
          
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
          
          .react-datepicker__day--disabled {
            color: #ccc !important;
            cursor: not-allowed !important;
          }
          
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

export default CustomerReservation;