// components/ForgotPassword.jsx
import React, { useState } from "react";
import { X, Mail } from "lucide-react";
import { sendPasswordResetEmail } from "../lib/supabaseClient";
import Swal from "sweetalert2";

function ForgotPassword({ isOpen, onClose, onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async (e) => {
    e.preventDefault();
    
    console.log("🔄 Password reset request started");
    console.log("📧 Email entered:", email);
    
    if (!email) {
      console.log("❌ No email provided");
      Swal.fire({
        icon: "warning",
        title: "Email Required",
        text: "Please enter your email address.",
        confirmButtonColor: "#1e293b",
      });
      return;
    }

    setLoading(true);
    console.log("⏳ Loading started...");

    try {
      console.log("📤 Sending reset email to:", email.toLowerCase());
      console.log("🔗 Redirect URL:", `${window.location.origin}/reset-password`);
      
      const { data, error } = await sendPasswordResetEmail(email.toLowerCase());

      console.log("📬 Supabase response:");
      console.log("  - Data:", data);
      console.log("  - Error:", error);

      if (error) {
        console.error("❌ Reset email error:", error);
        throw error;
      }

      console.log("✅ Reset email sent successfully!");
      console.log("📧 Check your email:", email.toLowerCase());

      Swal.fire({
        icon: "success",
        title: "Email Sent!",
        html: `
          <p>Check your inbox for the password reset link.</p>
          <p class="text-sm text-gray-600 mt-2">Sent to: <strong>${email.toLowerCase()}</strong></p>
          <p class="text-xs text-gray-500 mt-2">Check spam folder if you don't see it.</p>
        `,
        confirmButtonColor: "#1e293b",
      });

      setEmail("");
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error("❌ Reset error details:");
      console.error("  - Message:", err.message);
      console.error("  - Full error:", err);
      
      Swal.fire({
        icon: "error",
        title: "Failed to Send",
        text: err.message || "Please try again later.",
        confirmButtonColor: "#1e293b",
      });
    } finally {
      setLoading(false);
      console.log("⏸️ Loading finished");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="flex items-center justify-center mb-4">
          <div className="bg-purple-100 p-3 rounded-full">
            <Mail size={32} className="text-purple-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Forgot Password?
        </h2>
        <p className="text-gray-600 text-sm text-center mb-6">
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={handleResetRequest}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <button
          onClick={() => {
            onClose();
            onBackToLogin();
          }}
          className="w-full text-gray-600 text-sm mt-4 hover:text-gray-800"
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
}

export default ForgotPassword;