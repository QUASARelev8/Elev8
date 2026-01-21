// pages/Dashboard.js
import React, { useState, useEffect } from "react";
import { 
  Users, Calendar, Clock, TrendingUp, 
  DollarSign, Activity, CheckCircle, XCircle 
} from "lucide-react";

function Dashboard() {
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // Get user info from session
    const sessionData = localStorage.getItem("userSession");
    if (sessionData) {
      const session = JSON.parse(sessionData);
      setUserRole(session.role);
      setUserName(session.full_name || session.username);
    }
  }, []);

  // Stats for Admin
  const adminStats = [
    {
      title: "Total Reservations",
      value: "127",
      change: "+12%",
      icon: Calendar,
      color: "bg-blue-500"
    },
    {
      title: "Active Customers",
      value: "342",
      change: "+8%",
      icon: Users,
      color: "bg-green-500"
    },
    {
      title: "Revenue (This Month)",
      value: "₱45,230",
      change: "+23%",
      icon: DollarSign,
      color: "bg-purple-500"
    },
    {
      title: "Tables Available",
      value: "8/12",
      change: "Now",
      icon: Activity,
      color: "bg-orange-500"
    }
  ];

  // Stats for Customer
  const customerStats = [
    {
      title: "My Reservations",
      value: "5",
      change: "Total",
      icon: Calendar,
      color: "bg-blue-500"
    },
    {
      title: "Upcoming",
      value: "2",
      change: "This week",
      icon: Clock,
      color: "bg-green-500"
    },
    {
      title: "Completed",
      value: "3",
      change: "Last 30 days",
      icon: CheckCircle,
      color: "bg-purple-500"
    },
    {
      title: "Cancelled",
      value: "0",
      change: "Last 30 days",
      icon: XCircle,
      color: "bg-red-500"
    }
  ];

  const stats = userRole === "admin" ? adminStats : customerStats;

  // Recent Activity
  const recentActivity = [
    {
      id: 1,
      action: "New reservation created",
      user: "Juan Dela Cruz",
      time: "5 minutes ago",
      status: "pending"
    },
    {
      id: 2,
      action: "Payment received",
      user: "Maria Santos",
      time: "15 minutes ago",
      status: "success"
    },
    {
      id: 3,
      action: "Reservation completed",
      user: "Pedro Reyes",
      time: "1 hour ago",
      status: "success"
    },
    {
      id: 4,
      action: "Reservation cancelled",
      user: "Ana Garcia",
      time: "2 hours ago",
      status: "cancelled"
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "success":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {userName}!
        </h1>
        <p className="text-gray-600">
          {userRole === "admin" 
            ? "Here's what's happening with your billiards business today." 
            : "Here's an overview of your reservations."}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white" size={24} />
              </div>
              <span className="text-sm font-medium text-green-600">
                {stat.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {stat.value}
            </h3>
            <p className="text-sm text-gray-600">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-600">{activity.user}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activity.time}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                      activity.status
                    )}`}
                  >
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Quick Actions
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition">
                <div className="flex items-center gap-3">
                  <Calendar className="text-purple-600" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">
                      New Reservation
                    </p>
                    <p className="text-sm text-gray-600">
                      Book a table now
                    </p>
                  </div>
                </div>
              </button>

              <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                <div className="flex items-center gap-3">
                  <Clock className="text-blue-600" size={20} />
                  <div>
                    <p className="font-medium text-gray-900">
                      View Schedule
                    </p>
                    <p className="text-sm text-gray-600">
                      Check available times
                    </p>
                  </div>
                </div>
              </button>

              {userRole === "admin" && (
                <>
                  <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <Users className="text-green-600" size={20} />
                      <div>
                        <p className="font-medium text-gray-900">
                          Manage Users
                        </p>
                        <p className="text-sm text-gray-600">
                          View all customers
                        </p>
                      </div>
                    </div>
                  </button>

                  <button className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="text-orange-600" size={20} />
                      <div>
                        <p className="font-medium text-gray-900">
                          View Reports
                        </p>
                        <p className="text-sm text-gray-600">
                          Analytics & insights
                        </p>
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;