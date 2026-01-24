import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import { ChevronDown, Bell } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import Notification from "./components/Notification";

// Pages
import Home from "./pages/Home";
import Reservation from "./pages/Reservation";
import History from "./pages/History";
import ReservationCalendar from "./pages/Calendar";
import UserManagement from "./pages/UserManagement";
import AuditTrail from "./pages/AuditTrail";
import Reference from "./pages/Reference";
import CustomerDashboard from "./dashboard/CustomerDashBoard";
import FrontDeskDashboard from "./dashboard/FrontDeskDashboard";
import ManagerDashboard from "./dashboard/ManagerDashboard";
import QRCheckInPage from "./pages/QRCheckInPage";
import ReservationFrontDesk from "./Reservation/ReservationFrontDesk";
import CustomerReservation from "./Reservation/ReservationCustomer";
import FinalizePayment from "./pages/FinalizePayment";
import Payment from "./customer/Payment";
import ViewProfile from "./pages/ViewProfile";
import HomeDashboardUpload from "./components/HomeDashboardUpload";
import ForgotPassword from "./components/ForgotPassword";
import MarketingDashboard from "./dashboard/MarketingDashboard";
import ResetPassword from "./components/ResetPassword";
import CancelBookings from "./components/CancelBookings";
import RejectedBookings from "./pages/RejectedBooking";
import RejectedFrontdesk from "./pages/RejectedFrontdesk";
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [currentPage, setCurrentPage] = useState(
    localStorage.getItem("currentPage") || "MarketingDashboard"
  );
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const [permissions, setPermissions] = useState({});
  const [noPermissionsData, setNoPermissionsData] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // ✅ FIXED: Map database permission names to internal page names
  const permissionToPageMap = {
    'Manager Dashboard': 'ManagerDashboard',
    'Customer Dashboard': 'CustomerDashboard',
    'FrontDesk Dashboard': 'frontDeskDashboard',
    'Revenue Dashboard': 'MarketingDashboard',
    'Reservation (Customer)': 'CustomerReservation',
    'Reservation (Front Desk)': 'ReservationFrontDesk',
    'Reservation (Manager)': 'Reservation',
    'Reservation (Admin)': 'Reservation',
    'QR Check-In': 'QRCheckInPage',
    'Finalize Payment': 'finalize',
    'Calendar': 'calendar',
    'History': 'history',
    'User Management': 'UserManagement',
    'Reference': 'Reference',
    'Audit Trail': 'auditTrail',
    'Profile': 'Profile',
    'CancelBookings': 'CancelBookings',
    'RejectedBookings' : 'RejectedBookings',
        'RejectedFrontdesk' : 'RejectedFrontdesk',

    
  };

  // Fetch role permissions
  useEffect(() => {
    const loadSession = async () => {
      const sessionData = localStorage.getItem("userSession");
      if (!sessionData) return;

      try {
        const session = JSON.parse(sessionData);
        setUserRole(session.role);
        setIsLoggedIn(true);

        const savedPage = localStorage.getItem("currentPage");

        // Default pages using INTERNAL names
        const defaultPages = {
          customer: 'CustomerDashboard',
          frontdesk: 'frontDeskDashboard',
          manager: 'ManagerDashboard',
          admin: 'MarketingDashboard',
          superadmin: 'MarketingDashboard'
        };

        if (savedPage) {
          setCurrentPage(savedPage);
        } else {
          setCurrentPage(defaultPages[session.role] || 'MarketingDashboard');
        }

        const { data, error } = await supabase
          .from("accounts")
          .select("*")
          .eq("email", session.email)
          .single();

        if (!error) {
          setUserProfile({
            name: session.full_name || session.username || "User",
            email: data.email,
            role: data.role,
            profilePicture: data.ProfilePicuture || "",
          });
        }
      } catch (error) {
        console.error("Error parsing session:", error);
        localStorage.removeItem("userSession");
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    const fetchRolePermissions = async () => {
      const sessionData = localStorage.getItem("userSession");
      if (!sessionData) return;

      try {
        const session = JSON.parse(sessionData);
        const userRole = session.role;

        if (!userRole) {
          console.warn("⚠️ No role found in session");
          setNoPermissionsData(true);
          return;
        }

        // ✅ ADMIN BYPASS - Grant all permissions
        if (userRole.toLowerCase() === "admin" || userRole.toLowerCase() === "superadmin") {
          console.log("✅ Admin detected - Full access granted");
          const allPermissions = {
            "ManagerDashboard": true,
            "CustomerDashboard": true,
            "frontDeskDashboard": true,
            "MarketingDashboard": true,
            "CustomerReservation": true,
            "ReservationFrontDesk": true,
            "Reservation": true,
            "QRCheckInPage": true,
            "finalize": true,
            "calendar": true,
            "history": true,
            "UserManagement": true,
            "Reference": true,
            "auditTrail": true,
            "Profile": true,
            "CancelBookings": true,
            "RejectedBookings": true,
            "RejectedFrontdesk": true,
          };
          setPermissions(allPermissions);
          setNoPermissionsData(false);
          return;
        }

        // Fetch from database for other roles
        const { data: roleData, error: roleError } = await supabase
          .from("UserRole")
          .select("role_id, role")
          .ilike("role", userRole)
          .maybeSingle();

        if (roleError || !roleData) {
          console.error("❌ Error fetching role:", roleError);
          setNoPermissionsData(true);
          return;
        }

        const roleId = roleData.role_id;
        console.log("✅ Found role_id:", roleId, "for role:", roleData.role);

        const { data: permsData, error: permsError } = await supabase
          .from("Role_Permission")
          .select("page, has_access")
          .eq("role_id", roleId);

        if (permsError) {
          console.error("❌ Error fetching permissions:", permsError);
          setNoPermissionsData(true);
          return;
        }

        if (!permsData || permsData.length === 0) {
          console.warn("⚠️ No permissions found for role_id:", roleId);

          // Default permissions using INTERNAL names
          const defaultPerms = {
            frontdesk: {
              "frontDeskDashboard": true,
              "ReservationFrontDesk": true,
              "QRCheckInPage": true,
              "finalize": true,
              "calendar": true,
              "profile": true,
              "history": true,
              "RejectedFrontdesk": true
            },
            customer: {
              "CustomerDashboard": true,
              "CustomerReservation": true,
              "calendar": true,
              "profile": true,
              "history": true,
              "CancelBookings": true,
            },
            manager: {
              "ManagerDashboard": true,
              "Reservation": true,
              "calendar": true,
              "profile": true,
              "history": true,
              "RejectedBookings": true
            }
          };

          setPermissions(defaultPerms[userRole.toLowerCase()] || {});
          setNoPermissionsData(false);
          return;
        }

        // ✅ FIXED: Convert database permission names to internal page names
        const permissionsObj = {};
        permsData.forEach(({ page, has_access }) => {
          if (has_access) {
            // Convert permission name to internal page name
            const internalPageName = permissionToPageMap[page] || page;
            permissionsObj[internalPageName] = true;
            console.log(`✅ Permission: ${page} -> Internal: ${internalPageName}`);
          }
        });

        console.log("✅ Final permissions loaded:", permissionsObj);
        setPermissions(permissionsObj);
        setNoPermissionsData(false);

      } catch (error) {
        console.error("❌ Error in fetchRolePermissions:", error);
        setNoPermissionsData(true);
      }
    };

    if (isLoggedIn) {
      fetchRolePermissions();
    }
  }, [isLoggedIn]);

  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    role: "",
    profilePicture: "",
  });

 // ✅ Fetch notification count - FIXED to match Notification.js filtering

useEffect(() => {
  if (!isLoggedIn || !userRole) return;

  const fetchNotificationCount = async () => {
    try {
      const sessionData = localStorage.getItem("userSession");
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      const accountId = session.account_id || session.id;

      let query = supabase
        .from("notification")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);

      // ✅ CUSTOMER
      if (userRole === "customer") {
        query = query
          .eq("account_id", accountId)
          .or(
            "message.ilike.%rejected%,message.ilike.%reject%,message.ilike.%approved%"
          );
      }

      // ✅ MANAGER / FRONTDESK
      if (userRole === "manager" || userRole === "frontdesk") {
        query = query.or(
          "message.ilike.%reschedule%,message.ilike.%new reservation%"
        );
      }

      const { count, error } = await query;

      if (error) {
        console.error("❌ Error fetching notification count:", error);
        return;
      }

      setNotificationCount(count ?? 0);
    } catch (err) {
      console.error("❌ Notification count error:", err);
    }
  };

  fetchNotificationCount();

  const channel = supabase
    .channel("notification_count")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notification" },
      fetchNotificationCount
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [isLoggedIn, userRole]);



  // Save current page
  useEffect(() => {
    if (currentPage) {
      localStorage.setItem("currentPage", currentPage);
      console.log("📄 Current page set to:", currentPage);
    }
  }, [currentPage]);

  const handleLoginSuccess = async (sessionData) => {
    setUserRole(sessionData.role);
    setIsLoggedIn(true);

    setTimeout(() => {
      // Using INTERNAL page names
      switch (sessionData.role) {
        case 'customer':
          setCurrentPage('CustomerDashboard');
          break;
        case 'frontdesk':
          setCurrentPage('frontDeskDashboard');
          break;
        case 'manager':
          setCurrentPage('ManagerDashboard');
          break;
        case 'admin':
        case 'superadmin':
          setCurrentPage('MarketingDashboard');
          break;
        default:
          setCurrentPage('MarketingDashboard');
      }
    }, 0);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setUserProfile({ name: "", email: "", role: "", profilePicture: "" });
    setCurrentPage("MarketingDashboard");
    localStorage.removeItem("userSession");
  };

  // ✅ FIXED: Check access using INTERNAL page names
  const hasAccess = (page) => {
    console.log(`🔍 Checking access for page: ${page}`);
    console.log(`📋 Current permissions:`, permissions);
    
    // Admin has access to everything
    if (userRole === "admin" || userRole === "superadmin") {
      console.log("✅ Admin bypass - access granted");
      return true;
    }

    // Check permissions using internal page name
    if (permissions[page] !== undefined) {
      console.log(`✅ Permission found: ${page} = ${permissions[page]}`);
      return permissions[page] === true;
    }

    // Common pages accessible by all (fallback)
    const commonPages = ["calendar", "profile", "history", "CancelBookings"];
    const hasCommonAccess = commonPages.includes(page);
    console.log(`🔍 Common page check: ${page} = ${hasCommonAccess}`);
    return hasCommonAccess;
  };

  const NotFoundPage = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-300">403</h1>
        <h2 className="mb-2 text-2xl font-semibold text-gray-700">Access Denied</h2>
        <p className="mb-6 text-gray-500">You don't have permission to access this page.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );

  // ✅ FIXED: Render page using INTERNAL page names
  const renderPage = () => {
    console.log("🎯 Rendering page:", currentPage);
    console.log("🔐 Has access:", hasAccess(currentPage));
    
    // Check access before rendering
    if (!hasAccess(currentPage)) {
      const defaultPages = {
        customer: 'CustomerDashboard',
        frontdesk: 'frontDeskDashboard',
        manager: 'ManagerDashboard',
        admin: 'MarketingDashboard',
        superadmin: 'MarketingDashboard'
      };

      const defaultPage = defaultPages[userRole] || 'MarketingDashboard';

      setTimeout(() => setCurrentPage(defaultPage), 0);

      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600">Redirecting to your dashboard...</p>
          </div>
        </div>
      );
    }

    if (isLoggedIn && noPermissionsData) {
      return <NotFoundPage />;
    }

    // ✅ FIXED: Use INTERNAL page names (no spaces)
    const pages = {
      // Dashboards
      "ManagerDashboard": <ManagerDashboard />,
      "CustomerDashboard": <CustomerDashboard />,
      "frontDeskDashboard": <FrontDeskDashboard />,
      "MarketingDashboard": <MarketingDashboard />,
      
      // Reservations
      "Reservation": <Reservation />,
      "CustomerReservation": <CustomerReservation />,
      "ReservationFrontDesk": <ReservationFrontDesk />,
      
      // Other pages
      "RejectedBookings": <RejectedBookings />,
      "QRCheckInPage": <QRCheckInPage />,
      "finalize": <FinalizePayment />,
      "calendar": <ReservationCalendar />,
      "history": <History />,
      "UserManagement": <UserManagement />,
      "Reference": <Reference />,
      "auditTrail": <AuditTrail />,
      "Profile": <ViewProfile />,
      "CancelBookings": <CancelBookings />,
      "Payment": <Payment />,
      "ResetPassword": <ResetPassword />,
      "homeDashboardUpload": <HomeDashboardUpload />,

      "RejectedFrontdesk": <RejectedFrontdesk />,

      
    };

    const PageComponent = pages[currentPage];
    
    if (PageComponent) {
      console.log("✅ Rendering component for:", currentPage);
      return PageComponent;
    } else {
      console.error("❌ No component found for page:", currentPage);
      return <MarketingDashboard />;
    }
  };

  const [isResetPasswordPage, setIsResetPasswordPage] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsResetPasswordPage(true);
    }
  }, []);

  if (isResetPasswordPage) {
    return <ResetPassword onSuccess={() => {
      setIsResetPasswordPage(false);
      window.location.href = '/';
    }} />;
  }

  if (!isLoggedIn) {
    return (
      <>
        <Home onLoginSuccess={handleLoginSuccess} />
        <ForgotPassword
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          onBackToLogin={() => setShowForgotPassword(false)}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        userRole={userRole}
        isDesktopOpen={isDesktopOpen}
        setIsDesktopOpen={setIsDesktopOpen}
      />
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900 capitalize">
          </h1>

          <div className="flex items-center gap-4">
            {/* Notification Bell - Unified for All Users */}
            <div className="relative">
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative p-2 transition-all duration-200 rounded-full hover:bg-blue-50 focus:outline-none"
                title="Notifications"
              >
                <Bell size={24} className="text-blue-600" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg animate-pulse">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Notification Component */}
              <Notification
                isOpen={notificationOpen}
                onClose={() => setNotificationOpen(false)}
                accountId={
                  (() => {
                    const sessionData = localStorage.getItem("userSession");
                    if (!sessionData) return null;
                    const session = JSON.parse(sessionData);
                    return session.account_id || session.id;
                  })()
                }
                userRole={userRole}
              />
            </div>

            {/* Profile Dropdown */}
            {!isDesktopOpen && (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-3 px-3 py-2 transition-all duration-200 focus:outline-none hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent rounded-xl group"
                >
                  <div className="relative">
                    <img
                      src={
                        userProfile.profilePicture ||
                        `https://ui-avatars.com/api/?name=${userProfile.name || "User"}&background=3B82F6&color=fff`
                      }
                      alt="Profile"
                      className="object-cover w-10 h-10 transition-all duration-200 border-2 border-blue-200 rounded-full shadow-md group-hover:border-blue-400"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>

                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                      {userProfile.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize truncate">
                      {userProfile.role}
                    </p>
                  </div>

                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform duration-200 ${profileMenuOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 z-50 mt-3 overflow-hidden border border-gray-200 shadow-2xl w-72 bg-white/95 backdrop-blur-xl rounded-2xl animate-fadeIn">
                    {/* Profile Header with Gradient */}
                    <div className="relative px-6 py-8 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700">
                      <div className="absolute top-0 right-0 w-32 h-32 -mt-16 -mr-16 rounded-full bg-white/10"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 -mb-12 -ml-12 rounded-full bg-white/10"></div>

                      <div className="relative flex flex-col items-center">
                        <div className="relative mb-3">
                          <img
                            src={
                              userProfile.profilePicture ||
                              `https://ui-avatars.com/api/?name=${userProfile.name || "User"}&background=fff&color=3B82F6&size=128`
                            }
                            alt="Profile"
                            className="object-cover w-20 h-20 border-4 border-white rounded-full shadow-xl"
                          />
                          <div className="absolute w-6 h-6 bg-green-500 border-4 border-white rounded-full -bottom-1 -right-1"></div>
                        </div>

                        <h3 className="max-w-full px-2 text-lg font-bold text-white truncate">
                          {userProfile.name}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-blue-100 capitalize">
                          {userProfile.role}
                        </p>
                        <p className="max-w-full px-2 mt-1 text-xs text-blue-200 truncate">
                          {userProfile.email}
                        </p>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setCurrentPage('Profile');
                          setProfileMenuOpen(false);
                        }}
                        className="flex items-center w-full gap-3 px-4 py-3 text-sm text-gray-700 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent rounded-xl group"
                      >
                        <div className="flex items-center justify-center w-10 h-10 transition-colors bg-blue-100 rounded-xl group-hover:bg-blue-200">
                          <span className="text-lg">👤</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">View Profile</p>
                          <p className="text-xs text-gray-500">Manage your account</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          // Add settings functionality here
                          setProfileMenuOpen(false);
                        }}
                        className="flex items-center w-full gap-3 px-4 py-3 text-sm text-gray-700 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent rounded-xl group"
                      >
                        <div className="flex items-center justify-center w-10 h-10 transition-colors bg-purple-100 rounded-xl group-hover:bg-purple-200">
                          <span className="text-lg">⚙️</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">Settings</p>
                          <p className="text-xs text-gray-500">Preferences & privacy</p>
                        </div>
                      </button>
                    </div>

                    {/* Logout Button */}
                    <div className="p-2 border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full gap-3 px-4 py-3 text-sm text-red-600 transition-all duration-200 hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent rounded-xl group"
                      >
                        <div className="flex items-center justify-center w-10 h-10 transition-colors bg-red-100 rounded-xl group-hover:bg-red-200">
                          <span className="text-lg">🚪</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold">Logout</p>
                          <p className="text-xs text-red-400">Sign out of your account</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="min-h-full p-0 bg-gray-50">{renderPage()}</div>
      </div>
    </div>
  );
}

export default App;