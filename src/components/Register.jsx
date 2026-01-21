import React, { useState } from "react";
import { X, Eye, EyeOff, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import emailjs from '@emailjs/browser';
import DatePicker from './DatePicker';

function Register({ isOpen, onClose, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    birthdate: "",
    gender: "",
    email: "",
    contactNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // OTP States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.email ||
      !formData.contactNumber || !formData.birthdate || !formData.gender) {
      setError("Please fill in all required fields");
      return false;
    }

    if (!agreedToTerms) {
      setError("Please agree to the Terms and Conditions");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(formData.contactNumber.replace(/\D/g, ""))) {
      setError("Please enter a valid contact number");
      return false;
    }

    const birthDate = new Date(formData.birthdate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 13) {
      setError("You must be at least 13 years old to register");
      return false;
    }

    return true;
  };

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOTP = async (otpCode) => {
    try {
      emailjs.init("KkbuKQ2rTv-t7S5KK");

      const templateParams = {
        to_email: formData.email,
        to_name: formData.firstName,
        otp_code: otpCode,
        expiry_time: "10 minutes",
        reply_to: formData.email
      };

      const response = await emailjs.send(
        'service_cchiaxm',
        'template_a41djil',
        templateParams,
        'KkbuKQ2rTv-t7S5KK'
      );

      console.log('OTP sent successfully:', response);
      return true;
    } catch (error) {
      console.error('Failed to send OTP:', error);
      setError(`Email sending failed: ${error.text || error.message}`);
      return false;
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const otpCode = generateOTP();
      setGeneratedOtp(otpCode);

      const otpSent = await sendOTP(otpCode);

      if (!otpSent) {
        setError("Failed to send OTP. Please try again.");
        setLoading(false);
        return;
      }

      setShowOtpModal(true);
      startResendTimer();
      setLoading(false);

    } catch (err) {
      setError(err.message || "Failed to send OTP.");
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setOtpError("");
    const otpCode = generateOTP();
    setGeneratedOtp(otpCode);

    const otpSent = await sendOTP(otpCode);
    if (otpSent) {
      startResendTimer();
      setOtpError("OTP resent successfully!");
      setTimeout(() => setOtpError(""), 3000);
    } else {
      setOtpError("Failed to resend OTP. Please try again.");
    }
  };

  const handleVerifyOTP = async () => {
    if (otp !== generatedOtp) {
      setOtpError("Invalid OTP. Please try again.");
      return;
    }

    setLoading(true);
    setOtpError("");

    try {
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .insert({
          email: formData.email.toLowerCase(),
          password: formData.password,
          role: 'customer'
        })
        .select()
        .single();

      if (accountError) {
        console.error('Account Insert Error:', accountError);
        setOtpError(`Failed to create account: ${accountError.message}`);
        setLoading(false);
        return;
      }

      const { error: customerError } = await supabase
        .from("customer")
        .insert({
          account_id: accountData.account_id,
          first_name: formData.firstName,
          middle_name: formData.middleName || null,
          last_name: formData.lastName,
          birthdate: formData.birthdate,
          gender: formData.gender,
          email: formData.email.toLowerCase(),
          contact_number: formData.contactNumber,
          password: formData.password,
          role: 'customer',
          username: formData.email.split('@')[0]
        });

      if (customerError) {
        console.error('Customer Insert Error:', customerError);
        await supabase.from("accounts").delete().eq('account_id', accountData.account_id);
        setOtpError(`Registration failed: ${customerError.message}`);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setShowOtpModal(false);
      setFormData({
        firstName: "",
        middleName: "",
        lastName: "",
        birthdate: "",
        gender: "",
        email: "",
        contactNumber: "",
        password: "",
        confirmPassword: "",
      });
      setAgreedToTerms(false);

      setTimeout(() => {
        setSuccess(false);
        onSwitchToLogin();
      }, 2000);

    } catch (err) {
      console.error('Registration Error:', err);
      setOtpError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
        <div className="relative w-full max-w-2xl p-6 my-8 bg-white rounded-lg shadow-xl">
          <button
            onClick={onClose}
            className="absolute text-gray-400 top-4 right-4 hover:text-gray-600"
          >
            <X size={24} />
          </button>

          <h2 className="mb-2 text-2xl font-bold text-gray-900">Create Account</h2>
          <p className="mb-6 text-gray-600">Join ELEV8 Billiards today</p>

          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
              <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-600">Registration successful! Redirecting to login...</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* First Name */}
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="First Name"
              />
            </div>

            {/* Middle Name */}
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Middle Name
              </label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Middle Name"
              />
            </div>

            {/* Last Name */}
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Last Name"
              />
            </div>

            {/* Birthdate & Gender */}
            <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Birthdate *
                </label>
                <DatePicker
                  value={formData.birthdate}
                  onChange={(date) => {
                    setFormData({ ...formData, birthdate: date });
                    setError("");
                  }}
                  placeholder="Select date"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Email & Contact */}
            <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="09123456789"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="flex items-start gap-2 mb-6">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  setError("");
                }}
                className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Terms and Conditions
                </button>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-2 font-medium text-white transition bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending OTP..." : success ? "Success!" : "Create Account"}
            </button>
          </form>

          <p className="mt-4 text-sm text-center text-gray-600">
            Already have an account?{" "}
            <button
              onClick={onSwitchToLogin}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Log In
            </button>
          </p>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header - Fixed */}
            <div className="relative px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800 rounded-t-2xl">
              <button
                onClick={() => setShowTermsModal(false)}
                className="absolute text-white transition top-6 right-6 hover:text-gray-300"
              >
                <X size={28} />
              </button>
              <div className="pr-12">
                <h2 className="mb-2 text-3xl font-bold text-white">Terms and Conditions</h2>
                <p className="text-gray-300">ELEV8 Billiards - User Agreement</p>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 px-8 py-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Welcome Note */}
                <div className="p-4 border-l-4 border-blue-500 rounded-r-lg bg-blue-50">
                  <p className="text-sm leading-relaxed text-gray-700">
                    Please read these terms and conditions carefully before creating your account. 
                    By registering with ELEV8 Billiards, you acknowledge that you have read, understood, 
                    and agree to be bound by these terms.
                  </p>
                </div>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">1</span>
                    Acceptance of Terms
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10">
                    By creating an account with ELEV8 Billiards, you agree to be bound by these Terms and Conditions. 
                    If you do not agree to these terms, please do not register or use our services.
                  </p>
                </section>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">2</span>
                    Account Registration
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10">
                    You must provide accurate, current, and complete information during registration. You are responsible 
                    for maintaining the confidentiality of your account credentials and for all activities that occur under 
                    your account. Notify us immediately if you suspect any unauthorized access.
                  </p>
                </section>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">3</span>
                    Age Requirement
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10">
                    You must be at least 13 years old to create an account. By registering, you confirm that you meet 
                    this age requirement and have the legal capacity to enter into this agreement.
                  </p>
                </section>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">4</span>
                    User Responsibilities
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10 mb-3">You agree to:</p>
                  <ul className="space-y-2 text-gray-700 pl-10">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-gray-900 rounded-full"></span>
                      <span>Provide accurate and truthful personal information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-gray-900 rounded-full"></span>
                      <span>Keep your password secure and confidential at all times</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-gray-900 rounded-full"></span>
                      <span>Notify us immediately of any unauthorized access to your account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-gray-900 rounded-full"></span>
                      <span>Use the services in compliance with all applicable laws and regulations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-gray-900 rounded-full"></span>
                      <span>Respect other users, staff members, and facility property</span>
                    </li>
                  </ul>
                </section>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">5</span>
                    Booking and Reservations
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10">
                    All bookings are subject to availability. We reserve the right to cancel or modify reservations 
                    in case of unforeseen circumstances, maintenance, or special events. Cancellation policies apply 
                    as stated at the time of booking. We recommend arriving on time for your reservation.
                  </p>
                </section>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">6</span>
                    Payment Terms
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10">
                    Payment is required at the time of booking or as otherwise specified. All prices are subject to 
                    change without prior notice. Refunds will be processed according to our refund policy. We accept 
                    various payment methods as indicated during the booking process.
                  </p>
                </section>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">7</span>
                    Privacy and Data Protection
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10">
                    We collect and process your personal data in accordance with our Privacy Policy and applicable 
                    data protection laws. By registering, you consent to the collection, use, and storage of your 
                    information as described in our Privacy Policy. We are committed to protecting your privacy 
                    and personal information.
                  </p>
                </section>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">8</span>
                    Prohibited Activities
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10 mb-3">You may not:</p>
                  <ul className="space-y-2 text-gray-700 pl-10">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-red-500 rounded-full"></span>
                      <span>Use the service for any illegal or unauthorized purpose</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-red-500 rounded-full"></span>
                      <span>Attempt to gain unauthorized access to our systems or networks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-red-500 rounded-full"></span>
                      <span>Interfere with or disrupt the service, servers, or networks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-red-500 rounded-full"></span>
                      <span>Harass, abuse, threaten, or harm other users or staff members</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-red-500 rounded-full"></span>
                      <span>Impersonate any person or entity, or falsely represent your affiliation</span>
                    </li>
                  </ul>
                </section>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">9</span>
                    Facility Rules
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10">
                    Users must comply with all facility rules and regulations while on the premises. This includes 
                    respecting equipment, maintaining cleanliness, following safety guidelines, and adhering to 
                    conduct standards. Failure to comply may result in account suspension or termination.
                  </p>
                </section>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">10</span>
                    Limitation of Liability
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10">
                    ELEV8 Billiards is not liable for any indirect, incidental, special, consequential, or punitive 
                    damages arising from your use of our services. We are not responsible for loss or damage to 
                    personal property. Use of our facilities and services is at your own risk.
                  </p>
                </section>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">11</span>
                    Account Termination
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10">
                    We reserve the right to suspend or terminate your account at any time for violation of these terms, 
                    suspicious activity, or for any other reason we deem appropriate. You may also request account 
                    deletion at any time through our customer support.
                  </p>
                </section>

                <section className="pb-4 border-b border-gray-100">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">12</span>
                    Changes to Terms
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10">
                    We reserve the right to modify these Terms and Conditions at any time. We will notify users of 
                    significant changes via email or through the platform. Continued use of the service after changes 
                    constitutes acceptance of the modified terms.
                  </p>
                </section>

                <section className="pb-4">
                  <h3 className="flex items-center gap-2 mb-3 text-lg font-bold text-gray-900">
                    <span className="flex items-center justify-center w-8 h-8 text-sm text-white bg-gray-900 rounded-full">13</span>
                    Contact Information
                  </h3>
                  <p className="leading-relaxed text-gray-700 pl-10">
                    If you have any questions about these Terms and Conditions, need clarification, or wish to 
                    report a concern, please contact us through our customer support channels available on our 
                    website or at the facility.
                  </p>
                </section>

                {/* Footer Info */}
                <div className="p-4 mt-6 border-t-2 border-gray-200 rounded-lg bg-gray-50">
                  <p className="mb-2 text-xs font-semibold text-gray-900">
                    Last Updated: January 10, 2026
                  </p>
                  <p className="text-xs leading-relaxed text-gray-600">
                    By clicking "Continue" and creating an account, you acknowledge that you have read, 
                    understood, and agree to be bound by these Terms and Conditions in their entirety.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setAgreedToTerms(true);
                  setShowTermsModal(false);
                  setError("");
                }}
                className="w-full py-3.5 text-base font-semibold text-white transition transform bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl hover:from-gray-800 hover:to-gray-700 hover:scale-[1.02] shadow-lg"
              >
                Continue to Registration
              </button>
              <p className="mt-3 text-xs text-center text-gray-500">
                By continuing, you accept our terms and conditions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
            <button
              onClick={() => {
                setShowOtpModal(false);
                setOtp("");
                setOtpError("");
              }}
              className="absolute text-gray-400 top-4 right-4 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 mb-4 bg-blue-100 rounded-full">
                <Mail size={32} className="text-blue-600" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-gray-900">Verify Your Email</h3>
              <p className="text-center text-gray-600">
                We've sent a 6-digit code to<br />
                <span className="font-medium">{formData.email}</span>
              </p>
            </div>

            {otpError && (
              <div className="flex items-start gap-2 p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{otpError}</p>
              </div>
            )}

            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-center text-gray-700">
                Enter OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 6) {
                    setOtp(value);
                    setOtpError("");
                  }
                }}
                maxLength={6}
                className="w-full px-4 py-3 text-2xl font-bold text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 tracking-widest"
                placeholder="000000"
              />
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full py-3 mb-4 font-medium text-white transition bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{" "}
                <button
                  onClick={handleResendOTP}
                  disabled={resendTimer > 0}
                  className="font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Register;