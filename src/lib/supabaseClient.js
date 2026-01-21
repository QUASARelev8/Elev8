import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ecserxlzqdyvnreshwte.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjc2VyeGx6cWR5dm5yZXNod3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MDU1NTgsImV4cCI6MjA3ODQ4MTU1OH0.G0IvKj2fwXmRcPOHy0A4ZDq-ceMFKAThkdW2u3bc1rE'

export const supabase = createClient(supabaseUrl, supabaseKey);

export const sendPasswordResetEmail = async (email) => {
    console.log("🔐 sendPasswordResetEmail called");
    console.log("  - Email:", email);
    console.log("  - Redirect URL:", `${window.location.origin}/reset-password`);
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });
    
    console.log("📨 Supabase resetPasswordForEmail result:");
    console.log("  - Data:", data);
    console.log("  - Error:", error);
    
    return { data, error };
}

export const updatePassword = async (newPassword) => {
    console.log("🔑 updatePassword called");
    console.log("  - New password length:", newPassword.length);
    
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });
    
    console.log("🔄 Supabase updateUser result:");
    console.log("  - Data:", data);
    console.log("  - Error:", error);
    
    return { data, error };
}