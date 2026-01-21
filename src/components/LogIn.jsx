import React, { useState, useEffect } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";

function Login({ isOpen, onClose, onLoginSuccess, onSwitchToRegister, onSwitchToForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

// ===== LISTEN FOR GOOGLE AUTH CALLBACK =====
useEffect(() => {
  const handleAuthCallback = async () => {
    try {
      // Check if there's a Google auth pending flag
      const isGoogleAuth = localStorage.getItem('google_auth_pending');
      
      if (isGoogleAuth) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          localStorage.removeItem('google_auth_pending');
          await handleGoogleAuthSuccess(session.user);
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
      setLoading(false);
    }
  };

  // Run on component mount
  handleAuthCallback();

  // Listen for auth state changes
  const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event);
    
    if (event === 'SIGNED_IN' && session?.user) {
      const isGoogleAuth = localStorage.getItem('google_auth_pending');
      if (isGoogleAuth) {
        localStorage.removeItem('google_auth_pending');
        await handleGoogleAuthSuccess(session.user);
      }
    }
    
    if (event === 'SIGNED_OUT') {
      setLoading(false);
    }
  });

  return () => {
    authListener.subscription.unsubscribe();
  };
}, []);

// ===== GOOGLE SIGN IN =====
const handleGoogleLogin = async () => {
  try {
    setLoading(true);
    // Set flag before redirecting
    localStorage.setItem('google_auth_pending', 'true');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        }
      }
    });

    if (error) {
      localStorage.removeItem('google_auth_pending');
      throw error;
    }
  } catch (err) {
    console.error("Google login error:", err);
    localStorage.removeItem('google_auth_pending');
    Swal.fire({
      icon: "error",
      title: "Google Login Failed",
      text: err.message || "Unable to sign in with Google.",
      confirmButtonColor: "#1e293b",
    });
    setLoading(false);
  }
};

// ===== HANDLE GOOGLE AUTH SUCCESS =====

const handleGoogleAuthSuccess = async (user) => {
  try {
    setLoading(true);
    console.log('🔵 Google Auth Success - User:', user.email);
    console.log('📋 Google user metadata:', user.user_metadata);
    
    // Check if user already exists in accounts table
    const { data: existingAccount, error: checkError } = await supabase
      .from("accounts")
      .select("account_id, email, role, status, auth_provider")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();

    if (checkError) {
      console.error('❌ Account check error:', checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    console.log('🔍 Existing account:', existingAccount);

    let accountData;

    if (!existingAccount) {
      console.log('✅ Creating new Google account...');
      
      // Create new account for Google user
      const { data: newAccount, error: insertError } = await supabase
        .from("accounts")
        .insert({
          email: user.email.toLowerCase(),
          role: "customer",
          status: "active",
          password: null,
          auth_provider: "google",
          ProfilePicuture: user.user_metadata?.avatar_url || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Account insert error:', insertError);
        throw new Error(`Failed to create account: ${insertError.message}`);
      }
      
      accountData = newAccount;
      console.log('✅ Account created with ID:', accountData.account_id);

      // Parse name from Google data
      const fullNameFromGoogle = user.user_metadata?.full_name || 
                                  user.user_metadata?.name || 
                                  user.email.split('@')[0];
      console.log('📝 Full name from Google:', fullNameFromGoogle);
      
      const nameParts = fullNameFromGoogle.trim().split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'User';
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;

      console.log('📝 Parsed name:', { firstName, middleName, lastName });

      // ✅ Create customer record with proper structure
      const customerInsertData = {
        account_id: accountData.account_id,
        first_name: firstName,
        last_name: lastName,
        email: user.email.toLowerCase(),
        contact_number: user.user_metadata?.phone || '',
        username: user.user_metadata?.preferred_username || user.email.split('@')[0],
        birthdate: '2000-01-01', // Default placeholder - user can update later
        gender: null,
        password: null, // Google users don't have password
      };

      // Only add middle_name if it exists
      if (middleName) {
        customerInsertData.middle_name = middleName;
      }

      console.log('📝 Creating customer with data:', customerInsertData);
      
      const { data: newCustomer, error: customerError } = await supabase
        .from("customer")
        .insert(customerInsertData)
        .select()
        .single();

      if (customerError) {
        console.error('❌ Customer insert error:', customerError);
        console.error('Error details:', {
          message: customerError.message,
          code: customerError.code,
          details: customerError.details,
          hint: customerError.hint
        });
        
        // Rollback: Delete the account we just created
        await supabase
          .from("accounts")
          .delete()
          .eq("account_id", accountData.account_id);
        
        throw new Error(`Failed to create customer profile: ${customerError.message}`);
      }

      console.log('✅ Customer created:', newCustomer);

      // Create profile entry (optional, for additional tracking)
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: accountData.account_id,
          email: user.email.toLowerCase(),
          full_name: fullNameFromGoogle,
          phone: user.user_metadata?.phone || '',
          Gender: null,
          role: 'user',
          password: null,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.warn('⚠️ Profile insert warning (non-critical):', profileError);
      } else {
        console.log('✅ Profile entry created');
      }

    } else {
      // Account exists - check status and customer record
      accountData = existingAccount;
      console.log('✅ Existing account found with ID:', accountData.account_id);

      // Check if account is deactivated
      if (accountData.status === 'deactivated') {
        const { data: deactData } = await supabase
          .from('deact_user')
          .select('duration_days')
          .eq('account_id', accountData.account_id)
          .eq('status', 'deactivated')
          .maybeSingle();

        let message = "Your account has been deactivated.";
        if (deactData?.duration_days) {
          message = `Your account has been deactivated for ${deactData.duration_days} day${deactData.duration_days > 1 ? 's' : ''}.`;
        }

        await supabase.auth.signOut();
        
        Swal.fire({
          icon: "warning",
          title: "Account Deactivated",
          text: message,
          confirmButtonColor: "#1e293b",
        });
        setLoading(false);
        return;
      }

      // ✅ CRITICAL: Verify customer record exists
      const { data: existingCustomer, error: customerCheckError } = await supabase
        .from('customer')
        .select('customer_id, first_name, last_name, middle_name')
        .eq('account_id', accountData.account_id)
        .maybeSingle();

      console.log('🔍 Existing customer check:', existingCustomer);

      if (customerCheckError) {
        console.error('❌ Customer check error:', customerCheckError);
      }

      // If customer record is missing, create it
      if (!existingCustomer) {
        console.log('⚠️ Customer record missing for existing account! Creating now...');
        
        const fullNameFromGoogle = user.user_metadata?.full_name || 
                                    user.user_metadata?.name || 
                                    user.email.split('@')[0];
        const nameParts = fullNameFromGoogle.trim().split(' ');
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'User';
        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;

        const customerInsertData = {
          account_id: accountData.account_id,
          first_name: firstName,
          last_name: lastName,
          email: user.email.toLowerCase(),
          contact_number: user.user_metadata?.phone || '',
          username: user.user_metadata?.preferred_username || user.email.split('@')[0],
          birthdate: '2000-01-01',
          gender: null,
          password: null,
        };

        if (middleName) {
          customerInsertData.middle_name = middleName;
        }

        console.log('📝 Creating missing customer record:', customerInsertData);

        const { data: newCustomer, error: createCustomerError } = await supabase
          .from("customer")
          .insert(customerInsertData)
          .select()
          .single();

        if (createCustomerError) {
          console.error('❌ Failed to create customer:', createCustomerError);
          throw new Error(`Failed to create customer record: ${createCustomerError.message}`);
        }
        
        console.log('✅ Customer record created:', newCustomer);
      }

      // Update profile picture if Google user and picture changed
      if (accountData.auth_provider === 'google' && user.user_metadata?.avatar_url) {
        await supabase
          .from('accounts')
          .update({ ProfilePicuture: user.user_metadata.avatar_url })
          .eq('account_id', accountData.account_id);
        console.log('✅ Profile picture updated');
      }
    }

    // ✅ Fetch the complete customer data for session
    const { data: customerData, error: customerFetchError } = await supabase
      .from("customer")
      .select("first_name, middle_name, last_name")
      .eq("account_id", accountData.account_id)
      .maybeSingle();

    console.log('🔍 Final customer data fetch:', customerData);

    if (customerFetchError) {
      console.error('❌ Customer fetch error:', customerFetchError);
      throw new Error(`Failed to fetch customer data: ${customerFetchError.message}`);
    }

    if (!customerData) {
      console.error('❌ No customer data found after creation/check!');
      throw new Error('Customer profile not found. Please try logging in again.');
    }

    // Build full name from customer data
    const fullName = `${customerData.first_name} ${customerData.middle_name || ""} ${customerData.last_name}`.trim();
    console.log('✅ Final full name:', fullName);

    // Create session data
    const sessionData = {
      account_id: accountData.account_id,
      email: accountData.email,
      role: accountData.role,
      full_name: fullName,
    };
    
    localStorage.setItem("userSession", JSON.stringify(sessionData));
    console.log('✅ Session saved:', sessionData);

    // Log the login action
    try {
      await supabase.from("system_log").insert({
        account_id: accountData.account_id,
        action: "Google OAuth login",
      });
    } catch (logErr) {
      console.warn('⚠️ System log warning (non-critical):', logErr);
    }

    Swal.fire({
      icon: "success",
      title: "Login Successful",
      text: `Welcome, ${fullName}!`,
      showConfirmButton: false,
      timer: 1800,
    });

    setTimeout(() => {
      onClose();
      if (onLoginSuccess) onLoginSuccess(sessionData);
    }, 1800);

  } catch (err) {
    console.error("❌ Google auth error:", err);
    
    // Sign out the Google session if there was an error
    await supabase.auth.signOut();
    
    Swal.fire({
      icon: "error",
      title: "Authentication Failed",
      text: err.message || "Unable to complete Google sign-in. Please try again.",
      confirmButtonColor: "#1e293b",
    });
  } finally {
    setLoading(false);
  }
};

  // ===== REGULAR EMAIL/PASSWORD LOGIN =====
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please enter both email and password.",
        confirmButtonColor: "#1e293b",
      });
      return;
    }

    setLoading(true);

    try {
      // Check for hardcoded ADMIN login first
      if (
        email.trim().toUpperCase() === "ADMIN" &&
        password.trim().toUpperCase() === "ADMIN"
      ) {
        const sessionData = {
          account_id: "0000",
          email: "ADMIN",
          role: "admin",
          full_name: "Administrator",
        };
        localStorage.setItem("userSession", JSON.stringify(sessionData));

        try {
          await supabase.from("system_log").insert({
            account_id: "0000",
            action: "Admin login",
          });
        } catch (logErr) {
          console.warn("Log skipped:", logErr.message);
        }

        Swal.fire({
          icon: "success",
          title: "Welcome Admin!",
          text: "You have logged in successfully.",
          showConfirmButton: false,
          timer: 1800,
        });

        setTimeout(() => {
          onClose();
          if (onLoginSuccess) onLoginSuccess(sessionData);
        }, 1800);
        return;
      }

      // Regular login via Supabase
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("account_id, email, role, password, status")
        .eq("email", email.toLowerCase())
        .single();

      if (accountError || !accountData) {
        throw new Error("Invalid email or password.");
      }

      // Check if account is deactivated
      if (accountData.status === 'deactivated') {
        const { data: deactData } = await supabase
          .from('deact_user')
          .select('duration_days, deactivated_until')
          .eq('account_id', accountData.account_id)
          .eq('status', 'deactivated')
          .maybeSingle();

        let message = "Your account has been deactivated.";
        if (deactData?.duration_days) {
          message = `Your account has been deactivated for ${deactData.duration_days} day${deactData.duration_days > 1 ? 's' : ''}.`;
        }

        Swal.fire({
          icon: "warning",
          title: "Account Deactivated",
          text: message,
          confirmButtonColor: "#1e293b",
        });
        return;
      }

      if (accountData.password !== password) {
        throw new Error("Invalid email or password.");
      }

      let fullName = email;
      if (accountData.role === "customer") {
        const { data: customerData } = await supabase
          .from("customer")
          .select("first_name, middle_name, last_name")
          .eq("account_id", accountData.account_id)
          .single();

        if (customerData) {
          fullName = `${customerData.first_name} ${customerData.middle_name || ""} ${customerData.last_name}`.trim();
        }
      }

      const sessionData = {
        account_id: accountData.account_id,
        email: accountData.email,
        role: accountData.role,
        full_name: fullName,
      };
      localStorage.setItem("userSession", JSON.stringify(sessionData));

      await supabase.from("system_log").insert({
        account_id: accountData.account_id,
        action: `${accountData.role.charAt(0).toUpperCase() + accountData.role.slice(1)} login`,
      });

      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: `Welcome back, ${fullName}!`,
        showConfirmButton: false,
        timer: 1800,
      });

      setTimeout(() => {
        onClose();
        if (onLoginSuccess) onLoginSuccess(sessionData);
      }, 1800);
    } catch (err) {
      console.error("Login error:", err);
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: err.message || "An unexpected error occurred.",
        confirmButtonColor: "#1e293b",
      });
    } finally {
      setLoading(false);
    }
  };

 const handleClose = () => {
  setEmail("");
  setPassword("");
  setLoading(false); // Add this line - reset loading state
  onClose();
};
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-md p-8 mx-4 bg-white rounded-lg">
        <button
          onClick={handleClose}
          className="absolute text-gray-400 top-4 right-4 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-center text-gray-900">Log In</h2>

   

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-gray-500 bg-white">Or continue with email</span>
          </div>
        </div>

        {/* Email Input */}
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter your email"
          />
        </div>

        {/* Password Input */}
        <div className="mb-2">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your password"
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

        {/* Forgot Password Link */}
        <div className="mb-6 text-right">
          <button
            onClick={() => {
              handleClose();
              onSwitchToForgotPassword();
            }}
            className="text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            Forgot Password?
          </button>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2 font-medium text-white transition bg-gray-900 mb-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
     {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 mb-6 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="font-medium">Continue with Google</span>
        </button>
        {/* Register Link */}
        <p className="mt-4 text-sm text-center text-gray-600">
          Don't have an account?{" "}
          <button
            onClick={() => {
              handleClose();
              onSwitchToRegister();
            }}
            className="font-semibold text-purple-600 hover:text-purple-700"
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;