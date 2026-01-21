// components/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { updatePassword, supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";

function ResetPassword({ onSuccess }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    console.log("🔍 ResetPassword component mounted");
    console.log("🌐 Current URL:", window.location.href);
    console.log("🔗 Hash:", window.location.hash);
    
    // Check if user came from reset email
    const checkSession = async () => {
      console.log("🔐 Checking session...");
      
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log("📋 Session data:", session);
      
      if (session) {
        console.log("✅ Valid session found!");
        console.log("  - User email:", session.user?.email);
        console.log("  - Access token:", session.access_token ? "Present" : "Missing");
        setIsValidToken(true);
      } else {
        console.log("❌ No valid session found");
        Swal.fire({
          icon: "error",
          title: "Invalid Link",
          text: "This password reset link is invalid or has expired.",
          confirmButtonColor: "#1e293b",
        }).then(() => {
          window.location.href = '/';
        });
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔔 Auth state changed:");
      console.log("  - Event:", event);
      console.log("  - Session:", session);
      
      if (event === "PASSWORD_RECOVERY") {
        console.log("✅ PASSWORD_RECOVERY event detected!");
        setIsValidToken(true);
      }
    });

    return () => {
      console.log("🧹 Cleaning up auth listener");
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    console.log("🔄 Password reset process started");
    console.log("  - New password length:", newPassword.length);
    console.log("  - Passwords match:", newPassword === confirmPassword);

    if (newPassword.length < 6) {
      console.log("❌ Password too short");
      Swal.fire({
        icon: "warning",
        title: "Password Too Short",
        text: "Password must be at least 6 characters.",
        confirmButtonColor: "#1e293b",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      console.log("❌ Passwords don't match");
      Swal.fire({
        icon: "error",
        title: "Passwords Don't Match",
        text: "Please make sure both passwords are the same.",
        confirmButtonColor: "#1e293b",
      });
      return;
    }

    setLoading(true);
    console.log("⏳ Starting password update...");

    try {
      // ✅ Update password in Supabase Auth
      console.log("🔑 Step 1: Updating Supabase Auth password...");
      const { error: authError } = await updatePassword(newPassword);
      if (authError) {
        console.error("❌ Auth update error:", authError);
        throw authError;
      }
      console.log("✅ Supabase Auth password updated");

      // ✅ Get current user
      console.log("👤 Step 2: Getting current user...");
      const { data: { user } } = await supabase.auth.getUser();
      console.log("  - User email:", user?.email);
      
      if (user) {
        // ✅ Update password in accounts table
        console.log("📝 Step 3: Updating accounts table...");
        const { error: accountError } = await supabase
          .from("accounts")
          .update({ password: newPassword })
          .eq("email", user.email);
        
        if (accountError) {
          console.error("❌ Accounts table error:", accountError);
        } else {
          console.log("✅ Accounts table updated");
        }

        // ✅ Update password in customer table (if customer)
        console.log("📝 Step 4: Updating customer table...");
        const { error: customerError } = await supabase
          .from("customer")
          .update({ password: newPassword })
          .eq("email", user.email);
        
        if (customerError) {
          console.log("⚠️ Customer table error (may not exist):", customerError);
        } else {
          console.log("✅ Customer table updated");
        }

        // ✅ Log the action
        console.log("📊 Step 5: Logging system action...");
        const { data: accountData } = await supabase
          .from("accounts")
          .select("account_id")
          .eq("email", user.email)
          .single();

        if (accountData) {
          await supabase.from("system_log").insert({
            account_id: accountData.account_id,
            action: "Password reset",
          });
          console.log("✅ System log created");
        }
      }

      // ✅ Sign out after password reset
      console.log("🚪 Step 6: Signing out...");
      await supabase.auth.signOut();
      console.log("✅ Signed out successfully");

      Swal.fire({
        icon: "success",
        title: "Password Reset!",
        text: "Your password has been updated successfully. Please login with your new password.",
        confirmButtonColor: "#1e293b",
      });

      console.log("✅ Password reset complete! Redirecting...");

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = '/';
        }
      }, 2000);
    } catch (err) {
      console.error("❌ Reset error details:");
      console.error("  - Message:", err.message);
      console.error("  - Full error:", err);
      
      Swal.fire({
        icon: "error",
        title: "Reset Failed",
        text: err.message || "Please try again.",
        confirmButtonColor: "#1e293b",
      });
    } finally {
      setLoading(false);
      console.log("⏸️ Password reset process finished");
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
          <p className="mt-2 text-xs text-gray-500">Check browser console for details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-purple-100 p-3 rounded-full">
            <Lock size={32} className="text-purple-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Reset Password
        </h2>
        <p className="text-gray-600 text-sm text-center mb-6">
          Enter your new password below
        </p>

        <form onSubmit={handlePasswordReset}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
