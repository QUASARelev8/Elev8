import React, { useEffect, useState } from "react";
import { Eye, Edit3, Save, Shield, Lock, Unlock, X, Users, Table, Database, Clock, Grid } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";

// ✅ COMPLETE LIST - Database permission names (with spaces)
const sidebarPages = [
  // Dashboards
  "Admin Dashboard",
  "Manager Dashboard",
  "Customer Dashboard",
  "FrontDesk Dashboard",
  "Revenue Dashboard",
  
  // Reservations
  "Reservation (Customer)",
  "Reservation (Front Desk)",
  "Reservation (Manager)",
  "Reservation (Admin)",
  "Reservation (Super Admin)",
  
  // Main Features
  "QR Check-In",
  "Finalize Payment",
  "Calendar",
  "History",
  "Profile",
  "CancelBookings",
 "RejectedBookings",

  "RejectedFrontdesk",
  // Maintenance/Admin
  "User Management",
  "Reference",
  "Audit Trail",
  "Support",
];

export default function RolePermissionCards() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [editingRole, setEditingRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);

      // Fetch all roles
      const { data: rolesData, error: rolesError } = await supabase.from("UserRole").select("*");
      if (rolesError) throw rolesError;

      setRoles(rolesData);

      // Fetch all permissions
      const { data: permissionsData, error: permError } = await supabase.from("Role_Permission").select("*");
      if (permError) throw permError;

      // Transform permissions into { roleId: { page: boolean } }
      const permObj = {};
      permissionsData.forEach((perm) => {
        if (!permObj[perm.role_id]) permObj[perm.role_id] = {};
        permObj[perm.role_id][perm.page] = perm.has_access;
      });

      setPermissions(permObj);
      console.log("📋 Loaded permissions:", permObj);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch roles or permissions",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (roleId, page) => {
    setPermissions((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [page]: !prev[roleId]?.[page],
      },
    }));
  };

  const handleSave = async (roleId) => {
    try {
      const updates = sidebarPages.map((page) => ({
        role_id: roleId,
        page,
        has_access: permissions[roleId]?.[page] || false,
      }));

      console.log("💾 Saving permissions:", updates);

      // Delete existing permissions for this role first
      await supabase.from("Role_Permission").delete().eq("role_id", roleId);

      // Insert new/updated permissions
      const { error } = await supabase.from("Role_Permission").insert(updates);
      if (error) throw error;

      setEditingRole(null);

      Swal.fire({
        icon: "success",
        title: "Permissions Saved!",
        text: "✅ Permissions saved for this role!",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "OK",
      });

      // Refresh permissions after save
      fetchRolesAndPermissions();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "❌ Error saving permissions.",
        confirmButtonColor: "#d33",
        confirmButtonText: "OK",
      });
    }
  };

  const getRoleIcon = (index) => {
    const icons = [Users, Shield, Table, Database, Clock, Grid];
    return icons[index % icons.length];
  };

  const getRoleIconBg = (index) => {
    const colors = [
      "from-blue-400 to-blue-600",
      "from-cyan-400 to-cyan-600",
      "from-sky-400 to-sky-600",
      "from-indigo-400 to-indigo-600",
      "from-blue-500 to-blue-700",
      "from-teal-400 to-teal-600",
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-white to-cyan-100">
        <div className="flex flex-col items-center gap-4 bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-700 text-lg font-bold">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Role & Permissions</h1>
          <p className="text-gray-600">Manage user roles and their access to different pages</p>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">💡 Tip:</span> Click "Edit Access" to modify permissions. 
              Changes are saved to the database and will affect user access immediately.
            </p>
          </div>
        </div>

        {/* Role Cards Grid */}
        <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
          {roles.map((role, index) => {
            const isEditing = editingRole === role.role_id;
            const enabledCount = Object.values(permissions[role.role_id] || {}).filter(Boolean).length;
            const IconComponent = getRoleIcon(index);

            return (
              <div
                key={role.role_id}
                className={`relative rounded-3xl bg-white/40 backdrop-blur-2xl border border-white/60 shadow-2xl p-6 transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.5)] hover:scale-[1.03] hover:bg-white/50 ${
                  isEditing ? "ring-2 ring-blue-400/60 shadow-[0_20px_60px_-15px_rgba(59,130,246,0.6)]" : ""
                }`}
                style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
              >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-cyan-50/50 rounded-3xl pointer-events-none"></div>

                {/* Content */}
                <div className="relative z-10">
                  <div className={`w-16 h-16 bg-gradient-to-br ${getRoleIconBg(index)} rounded-2xl flex items-center justify-center mb-4 shadow-xl`}>
                    <IconComponent className="w-8 h-8 text-white" strokeWidth={2.5} />
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 uppercase mb-2 tracking-wide">{role.role}</h3>
                  <p className="text-sm text-gray-600 mb-5">Manage user roles and permissions</p>
                  <div className="border-t border-gray-300/50 mb-4"></div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 animate-pulse"></div>
                      <span>Active</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {enabledCount} / {sidebarPages.length} pages
                    </div>
                  </div>

                  <button
                    onClick={() => (isEditing ? handleSave(role.role_id) : setEditingRole(role.role_id))}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 transition-all duration-300 font-medium group w-full justify-center py-2 rounded-lg hover:bg-blue-50"
                  >
                    {isEditing ? (
                      <>
                        <div className="p-1.5 rounded-lg bg-blue-100/80 group-hover:bg-blue-200/80 transition-colors">
                          <Save size={16} className="group-hover:scale-110 transition-transform" />
                        </div>
                        <span>Save Changes</span>
                      </>
                    ) : (
                      <>
                        <div className="p-1.5 rounded-lg bg-gray-100/80 group-hover:bg-blue-100/80 transition-colors">
                          <Edit3 size={16} className="group-hover:rotate-12 transition-transform" />
                        </div>
                        <span>Edit Access</span>
                      </>
                    )}
                  </button>

                  {isEditing && (
                    <div className="mt-4 bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/60 max-h-80 overflow-y-auto shadow-inner">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-gray-600 font-semibold">
                          <span className="text-blue-600 text-sm">{enabledCount}</span>
                          <span className="text-gray-400"> / {sidebarPages.length}</span>
                          <span className="ml-1">enabled</span>
                        </div>
                        <button
                          onClick={() => setEditingRole(null)}
                          className="p-1.5 hover:bg-white/80 rounded-lg transition-all duration-300 hover:rotate-90"
                        >
                          <X size={16} className="text-gray-600" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {sidebarPages.map((page) => {
                          const isChecked = permissions[role.role_id]?.[page] || false;
                          return (
                            <label
                              key={page}
                              className="flex justify-between items-center py-2.5 px-3 text-xs hover:bg-white/80 rounded-xl cursor-pointer transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-white/60 hover:shadow-md group"
                            >
                              <span className="flex items-center gap-2.5 flex-1">
                                {isChecked ? (
                                  <div className="p-1 bg-blue-100 rounded-lg">
                                    <Unlock size={14} className="text-blue-600" />
                                  </div>
                                ) : (
                                  <div className="p-1 bg-gray-100 rounded-lg">
                                    <Lock size={14} className="text-gray-400" />
                                  </div>
                                )}
                                <span className={`${isChecked ? "text-gray-800 font-semibold" : "text-gray-500"} transition-colors`}>
                                  {page}
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handlePermissionToggle(role.role_id, page)}
                                className="w-4 h-4 accent-blue-500 cursor-pointer rounded transition-transform group-hover:scale-110"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/20 via-transparent to-transparent"></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}