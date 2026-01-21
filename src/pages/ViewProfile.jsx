import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';
import { User, Mail, Phone, Calendar, Edit2, Save, X, Lock, Camera, Upload,Trash2, LogOut} from 'lucide-react';
import DatePicker from '../components/DatePicker';

export default function ViewProfile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({});
    const [changePasswordModal, setChangePasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    // Image upload & crop states
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);

    useEffect(() => {
        fetchProfile();
    }, []);
// Replace the fetchProfile function in ViewProfile.jsx with this improved version:

const fetchProfile = async () => {
    try {
        setLoading(true);
        const session = JSON.parse(localStorage.getItem('userSession'));

        console.log('🔍 Session from localStorage:', session);

        if (!session || !session.account_id) {
            console.error('❌ No session found');
            Swal.fire({
                icon: 'error',
                title: 'Not Logged In',
                text: 'Please log in to view your profile.'
            });
            setLoading(false);
            return;
        }

        const userRole = session?.role;
        let profileData = null;

        console.log('🔍 Fetching profile for:', session.account_id, 'Role:', userRole);

        // Fetch based on role
        if (userRole === 'frontdesk') {
            const { data: frontdeskData, error: frontdeskError } = await supabase
                .from('front_desk')
                .select('*')
                .eq('account_id', session.account_id)
                .maybeSingle();

            console.log('📊 Frontdesk data:', frontdeskData, 'Error:', frontdeskError);

            if (frontdeskError) {
                console.error('❌ Frontdesk fetch error:', frontdeskError);
                throw frontdeskError;
            }

            if (!frontdeskData) {
                console.warn('⚠️ No front_desk data found for account_id:', session.account_id);
                Swal.fire({
                    icon: 'warning',
                    title: 'Profile Not Found',
                    text: 'No frontdesk profile found for your account. Please contact admin.'
                });
                setLoading(false);
                return;
            }

            const { data: profilesData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.account_id)
                .maybeSingle();

            const { data: accountData } = await supabase
                .from('accounts')
                .select('ProfilePicuture')
                .eq('account_id', session.account_id)
                .maybeSingle();

            const fullName = profilesData?.full_name || frontdeskData.staff_name || '';
            const nameParts = fullName.split(' ');

            profileData = {
                account_id: frontdeskData.account_id,
                frontdesk_id: frontdeskData.frontdesk_id,
                first_name: nameParts[0] || '',
                last_name: nameParts.slice(1).join(' ') || '',
                middle_name: null,
                email: profilesData?.email || frontdeskData.email,
                contact_number: profilesData?.phone || '',
                birthdate: null,
                gender: profilesData?.Gender || null,
                username: null,
                password: frontdeskData.password,
                role: 'frontdesk',
                ProfilePicuture: accountData?.ProfilePicuture || null
            };
        } else if (userRole === 'manager') {
            const { data: managerData, error: managerError } = await supabase
                .from('manager')
                .select('*')
                .eq('account_id', session.account_id)
                .maybeSingle();

            console.log('📊 Manager data:', managerData, 'Error:', managerError);

            if (managerError) {
                console.error('❌ Manager fetch error:', managerError);
                throw managerError;
            }

            if (!managerData) {
                console.warn('⚠️ No manager data found');
                Swal.fire({
                    icon: 'warning',
                    title: 'Profile Not Found',
                    text: 'No manager profile found for your account.'
                });
                setLoading(false);
                return;
            }

            const { data: profilesData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.account_id)
                .maybeSingle();

            const { data: accountData } = await supabase
                .from('accounts')
                .select('ProfilePicuture')
                .eq('account_id', session.account_id)
                .maybeSingle();

            const fullName = profilesData?.full_name || managerData.manager_name || '';
            const nameParts = fullName.split(' ');

            profileData = {
                account_id: managerData.account_id,
                manager_id: managerData.manager_id,
                first_name: nameParts[0] || '',
                last_name: nameParts.slice(1).join(' ') || '',
                middle_name: null,
                email: profilesData?.email || managerData.email,
                contact_number: profilesData?.phone || '',
                birthdate: null,
                gender: profilesData?.Gender || null,
                username: null,
                password: managerData.password,
                role: 'manager',
                ProfilePicuture: accountData?.ProfilePicuture || null
            };
        } else if (userRole === 'admin' || userRole === 'superadmin') {
            const { data: adminData, error: adminError } = await supabase
                .from('admin')
                .select('*')
                .eq('account_id', session.account_id)
                .maybeSingle();

            console.log('📊 Admin data:', adminData, 'Error:', adminError);

            if (adminError) {
                console.error('❌ Admin fetch error:', adminError);
                throw adminError;
            }

            if (!adminData) {
                console.warn('⚠️ No admin data found');
                Swal.fire({
                    icon: 'warning',
                    title: 'Profile Not Found',
                    text: 'No admin profile found for your account.'
                });
                setLoading(false);
                return;
            }

            const { data: profilesData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.account_id)
                .maybeSingle();

            const { data: accountData } = await supabase
                .from('accounts')
                .select('ProfilePicuture')
                .eq('account_id', session.account_id)
                .maybeSingle();

            const fullName = profilesData?.full_name || adminData.admin_name || '';
            const nameParts = fullName.split(' ');

            profileData = {
                account_id: adminData.account_id,
                admin_id: adminData.admin_id,
                first_name: nameParts[0] || '',
                last_name: nameParts[1] || '',
                middle_name: nameParts[2] || null,
                email: profilesData?.email || adminData.email,
                contact_number: profilesData?.phone || '',
                birthdate: null,
                gender: profilesData?.Gender || null,
                username: null,
                password: adminData.password,
                role: userRole,
                ProfilePicuture: accountData?.ProfilePicuture || null
            };
        } else {
            // CUSTOMER role - THIS IS THE IMPORTANT PART FOR GOOGLE USERS
            console.log('🔍 Fetching customer data for account_id:', session.account_id);
            
            const { data: customerData, error: customerError } = await supabase
                .from('customer')
                .select('*')
                .eq('account_id', session.account_id)
                .maybeSingle();

            console.log('📊 Customer data:', customerData);
            console.log('📊 Customer error:', customerError);

            if (customerError) {
                console.error('❌ Customer fetch error:', customerError);
                throw customerError;
            }

            if (!customerData) {
                console.error('❌ No customer data found for account_id:', session.account_id);
                
                // Try to fetch from accounts table to see if account exists
                const { data: accountCheck } = await supabase
                    .from('accounts')
                    .select('account_id, email, role')
                    .eq('account_id', session.account_id)
                    .maybeSingle();
                
                console.log('🔍 Account check:', accountCheck);
                
                Swal.fire({
                    icon: 'warning',
                    title: 'Profile Not Found',
                    text: 'No customer profile found for your account. Please try logging in again.',
                    confirmButtonText: 'Logout',
                    confirmButtonColor: '#dc2626'
                }).then((result) => {
                    if (result.isConfirmed) {
                        localStorage.removeItem('userSession');
                        window.location.href = '/';
                    }
                });
                setLoading(false);
                return;
            }

            const { data: accountData } = await supabase
                .from('accounts')
                .select('ProfilePicuture')
                .eq('account_id', session.account_id)
                .maybeSingle();

            console.log('📊 Account data (profile pic):', accountData);

            profileData = {
                account_id: customerData.account_id,
                customer_id: customerData.customer_id,
                first_name: customerData.first_name,
                middle_name: customerData.middle_name,
                last_name: customerData.last_name,
                email: customerData.email,
                contact_number: customerData.contact_number,
                birthdate: customerData.birthdate,
                gender: customerData.gender,
                username: customerData.username,
                password: customerData.password,
                role: 'customer',
                ProfilePicuture: accountData?.ProfilePicuture || null
            };
        }

        console.log('✅ Profile data loaded:', profileData);
        setProfile(profileData);
        setFormData(profileData);
        
    } catch (err) {
        console.error('❌ Error fetching profile:', err);
        console.error('Error details:', {
            message: err.message,
            code: err.code,
            details: err.details,
            hint: err.hint
        });
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load profile: ' + err.message
        });
    } finally {
        setLoading(false);
    }
};

const handleDeleteAccount = async () => {
    const result = await Swal.fire({
        icon: 'warning',
        title: 'Delete Account?',
        text: 'This action is permanent and cannot be undone. All your data will be deleted.',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
        const session = JSON.parse(localStorage.getItem('userSession'));
        const userRole = profile.role;

        // Delete from role-specific tables
        if (userRole === 'customer') {
            await supabase
                .from('customer')
                .delete()
                .eq('customer_id', profile.customer_id);
        } else if (userRole === 'frontdesk') {
            await supabase
                .from('front_desk')
                .delete()
                .eq('frontdesk_id', profile.frontdesk_id);
        } else if (userRole === 'manager') {
            await supabase
                .from('manager')
                .delete()
                .eq('manager_id', profile.manager_id);
        } else if (userRole === 'admin' || userRole === 'superadmin') {
            await supabase
                .from('admin')
                .delete()
                .eq('admin_id', profile.admin_id);
        }

        // Delete from profiles table
        await supabase
            .from('profiles')
            .delete()
            .eq('id', profile.account_id);

        // Delete from accounts table (last)
        await supabase
            .from('accounts')
            .delete()
            .eq('account_id', profile.account_id);

        localStorage.removeItem('userSession');

        Swal.fire({
            icon: 'success',
            title: 'Account Deleted',
            text: 'Your account has been permanently deleted.',
            timer: 2000
        }).then(() => {
            window.location.href = '/';
        });

    } catch (err) {
        console.error('Error deleting account:', err);
        Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: 'Failed to delete account: ' + err.message
        });
    }
};


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleSave = async () => {
        try {
            if (!formData.email) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Missing Fields',
                    text: 'Please fill in all required fields.'
                });
                return;
            }

            const session = JSON.parse(localStorage.getItem('userSession'));
            const userRole = profile.role;

            // Update based on role
            if (userRole === 'frontdesk') {
                const fullName = `${formData.first_name} ${formData.last_name}`.trim();

                const { error: frontdeskError } = await supabase
                    .from('front_desk')
                    .update({
                        staff_name: fullName,
                        email: formData.email
                    })
                    .eq('frontdesk_id', profile.frontdesk_id);

                if (frontdeskError) throw frontdeskError;

                // ✅ UPDATE/INSERT to profiles table for frontdesk
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', profile.account_id)
                    .maybeSingle();

                const profilePayload = {
                    email: formData.email,
                    full_name: fullName,
                    phone: formData.contact_number || '',
                    Gender: formData.gender || null,
                    updated_at: new Date().toISOString()
                };

                if (existingProfile) {
                    await supabase
                        .from('profiles')
                        .update(profilePayload)
                        .eq('id', profile.account_id);
                } else {
                    await supabase
                        .from('profiles')
                        .insert({
                            id: profile.account_id,
                            ...profilePayload,
                            role: 'user',
                            password: profile.password
                        });
                }

            } else if (userRole === 'manager') {
                const fullName = `${formData.first_name} ${formData.last_name}`.trim();

                const { error: managerError } = await supabase
                    .from('manager')
                    .update({
                        manager_name: fullName,
                        email: formData.email
                    })
                    .eq('manager_id', profile.manager_id);

                if (managerError) throw managerError;

                // ✅ UPDATE/INSERT to profiles table for manager
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', profile.account_id)
                    .maybeSingle();

                const profilePayload = {
                    email: formData.email,
                    full_name: fullName,
                    phone: formData.contact_number || '',
                    Gender: formData.gender || null,
                    updated_at: new Date().toISOString()
                };

                if (existingProfile) {
                    await supabase
                        .from('profiles')
                        .update(profilePayload)
                        .eq('id', profile.account_id);
                } else {
                    await supabase
                        .from('profiles')
                        .insert({
                            id: profile.account_id,
                            ...profilePayload,
                            role: 'admin', // manager = admin role
                            password: profile.password
                        });
                }

            } else if (userRole === 'admin' || userRole === 'superadmin') {
                // ✅ UPDATE/INSERT to profiles table for admin/superadmin
                const fullName = `${formData.first_name} ${formData.middle_name ? formData.middle_name + ' ' : ''}${formData.last_name}`.trim();

                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', profile.account_id)
                    .maybeSingle();

                const profilePayload = {
                    email: formData.email,
                    full_name: fullName,
                    phone: formData.contact_number || '',
                    Gender: formData.gender || null,
                    updated_at: new Date().toISOString()
                };

                if (existingProfile) {
                    await supabase
                        .from('profiles')
                        .update(profilePayload)
                        .eq('id', profile.account_id);
                } else {
                    await supabase
                        .from('profiles')
                        .insert({
                            id: profile.account_id,
                            ...profilePayload,
                            role: 'admin',
                            password: profile.password
                        });
                }

            } else {
                // ✅ CUSTOMER - save to customer table ONLY
                if (!formData.first_name || !formData.last_name || !formData.contact_number || !formData.birthdate) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Fields',
                        text: 'Please fill in all required fields (First Name, Last Name, Contact Number, Birthdate).'
                    });
                    return;
                }

                const { error: customerError } = await supabase
                    .from('customer')
                    .update({
                        first_name: formData.first_name,
                        middle_name: formData.middle_name || null,
                        last_name: formData.last_name,
                        email: formData.email,
                        contact_number: formData.contact_number,
                        birthdate: formData.birthdate,
                        gender: formData.gender || null,
                        username: formData.username || null
                    })
                    .eq('customer_id', profile.customer_id);

                if (customerError) throw customerError;
            }

            // ✅ Update accounts table (for ALL roles - email only)
            await supabase
                .from('accounts')
                .update({ email: formData.email })
                .eq('account_id', profile.account_id);

            await fetchProfile();
            setEditMode(false);

            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Profile updated successfully!',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            console.error('Error updating profile:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to update profile: ' + err.message
            });
        }
    };

const handleChangePassword = async () => {
    // ✅ CHECK IF GOOGLE USER
    const session = JSON.parse(localStorage.getItem('userSession'));
    const { data: accountData } = await supabase
        .from('accounts')
        .select('auth_provider')
        .eq('account_id', profile.account_id)
        .maybeSingle();

    if (accountData?.auth_provider === 'google') {
        Swal.fire({
            icon: 'info',
            title: 'Google Account',
            text: 'You are using Google Sign-In. Password changes must be done through your Google account settings.',
            confirmButtonColor: '#1e293b',
        });
        setChangePasswordModal(false);
        return;
    }

    if (!passwordData.new || !passwordData.confirm) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Fields',
            text: 'Please fill in all password fields!'
        });
        return;
    }

    if (passwordData.new !== passwordData.confirm) {
        Swal.fire({
            icon: 'error',
            title: 'Mismatch',
            text: 'New passwords do not match!'
        });
        return;
    }

    if (passwordData.new.length < 6) {
        Swal.fire({
            icon: 'warning',
            title: 'Weak Password',
            text: 'Password must be at least 6 characters long!'
        });
        return;
    }

    try {
        const userRole = profile.role;

        // Update password based on role
        if (userRole === 'customer') {
            const { error } = await supabase
                .from('customer')
                .update({ password: passwordData.new })
                .eq('customer_id', profile.customer_id); // ✅ FIXED: Use customer_id
            if (error) throw error;
        } else if (userRole === 'frontdesk') {
            const { error } = await supabase
                .from('front_desk')
                .update({ password: passwordData.new })
                .eq('frontdesk_id', profile.frontdesk_id);
            if (error) throw error;
        } else if (userRole === 'manager') {
            const { error } = await supabase
                .from('manager')
                .update({ password: passwordData.new })
                .eq('manager_id', profile.manager_id);
            if (error) throw error;
        } else if (userRole === 'admin' || userRole === 'superadmin') {
            const { error } = await supabase
                .from('admin')
                .update({ password: passwordData.new })
                .eq('admin_id', profile.admin_id);
            if (error) throw error;
        }

        // Update accounts table
        await supabase
            .from('accounts')
            .update({ password: passwordData.new })
            .eq('account_id', profile.account_id);

        // Update profiles table ONLY for non-customer roles
        if (['frontdesk', 'manager', 'admin', 'superadmin'].includes(userRole)) {
            await supabase
                .from('profiles')
                .update({
                    password: passwordData.new,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.account_id);
        }

        setChangePasswordModal(false);
        setPasswordData({ current: '', new: '', confirm: '' });

        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Password changed successfully!',
            timer: 2000,
            showConfirmButton: false
        });

        await fetchProfile();
    } catch (err) {
        console.error('Error changing password:', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to change password: ' + err.message
        });
    }
};
    const handleCancel = () => {
        setFormData(profile);
        setEditMode(false);
    };

    // Image upload functions
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                Swal.fire({
                    icon: 'warning',
                    title: 'File Too Large',
                    text: 'Please select an image smaller than 5MB'
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                setSelectedImage(event.target.result);
                setShowImageModal(true);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
            };
            reader.readAsDataURL(file);
        }
    };

    const getCroppedImage = () => {
        const canvas = canvasRef.current;
        const image = imageRef.current;

        if (!canvas || !image) return null;

        const ctx = canvas.getContext('2d');
        const size = 300;

        canvas.width = size;
        canvas.height = size;

        const scale = zoom;
        const imageWidth = image.naturalWidth;
        const imageHeight = image.naturalHeight;

        const sourceX = (crop.x / scale);
        const sourceY = (crop.y / scale);
        const sourceSize = Math.min(imageWidth, imageHeight) / scale;

        ctx.drawImage(
            image,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            size,
            size
        );

        return canvas.toDataURL('image/jpeg', 0.9);
    };

    const handleSaveImage = async () => {
        try {
            setUploading(true);
            const croppedImageData = getCroppedImage();

            if (!croppedImageData) {
                throw new Error('Failed to crop image');
            }

            // Update database with base64 image
            const { error } = await supabase
                .from('accounts')
                .update({ ProfilePicuture: croppedImageData })
                .eq('account_id', profile.account_id);

            if (error) throw error;

            setShowImageModal(false);
            setSelectedImage(null);

            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Profile picture updated!',
                timer: 2000,
                showConfirmButton: false
            });

            await fetchProfile();
        } catch (err) {
            console.error('Error uploading image:', err);
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: err.message
            });
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-b-4 border-blue-600 rounded-full animate-spin"></div>
                    <p className="font-medium text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100">
                <div className="p-8 text-center border shadow-2xl backdrop-blur-xl bg-white/60 border-white/50 rounded-3xl">
                    <User size={64} className="mx-auto mb-4 text-blue-400" />
                    <h2 className="mb-2 text-2xl font-bold text-gray-800">Profile Not Found</h2>
                    <p className="text-gray-600">Please log in to view your profile.</p>
                </div>
            </div>
        );
    }

return (
    <div className="min-h-screen px-4 py-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
            {/* Header Card */}
            <div className="mb-6 overflow-hidden bg-white shadow-sm rounded-2xl">
                {/* Blue gradient header */}
                <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                
                {/* Profile section */}
                <div className="px-6 pb-6 sm:px-8">
                    <div className="flex flex-col items-center mb-6 -mt-16 sm:flex-row sm:items-end">
                        {/* Profile Picture */}
                        <div className="relative group">
                            <div className="flex items-center justify-center w-32 h-32 overflow-hidden bg-white border-4 border-white rounded-full shadow-lg">
                                {profile.ProfilePicuture ? (
                                    <img
                                        src={profile.ProfilePicuture}
                                        alt="Profile"
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-400 to-blue-500">
                                        <User size={64} className="text-white" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 flex items-center justify-center w-10 h-10 text-white transition-all duration-200 bg-blue-600 rounded-full shadow-lg opacity-0 hover:bg-blue-700 group-hover:opacity-100"
                            >
                                <Camera size={18} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                        </div>

                        {/* Name and Email - ✅ FIXED CAPITALIZATION */}
                        <div className="flex-1 mt-4 text-center sm:ml-6 sm:text-left sm:mt-0">
                            <h1 className="text-2xl font-bold text-gray-900 sm:text-2xl">
                                {[profile.first_name, profile.last_name]
                                    .filter(Boolean)
                                    .join(' ')
                                    .toLowerCase()
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ')}
                            </h1>
                            <p className="mt-1 text-gray-600 sm:text-1xl">{profile.email}</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
              {/* Action Buttons */}
<div className="flex flex-wrap gap-3">
    {!editMode ? (
        <>
            <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
            >
                <Edit2 size={16} />
                Edit Profile
            </button>
            {/* ✅ ONLY SHOW FOR NON-GOOGLE USERS */}
            {profile.password && !profile.password.startsWith('GOOGLE_') && (
                <button
                    onClick={() => setChangePasswordModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-sm font-medium"
                >
                    <Lock size={16} />
                    Change Password
                </button>
            )}
        </>
    ) : (
        <>
            <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium"
            >
                <Save size={16} />
                Save Changes
            </button>
            <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-sm font-medium"
            >
                <X size={16} />
                Cancel
            </button>
        </>
    )}
</div>
                </div>
            </div>

          {/* Personal Information Card */}
            <div className="p-6 bg-white shadow-sm rounded-2xl sm:p-8">
                <h2 className="flex items-center gap-2 mb-6 text-xl font-bold text-gray-900">
                    <User size={20} className="text-blue-600" />
                    Personal Information
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* First Name */}
                    <div>
                        <label className="block mb-3 text-sm font-semibold text-gray-700">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        {editMode ? (
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter first name"
                            />
                        ) : (
                            <div className="w-full px-4 py-3 font-medium text-gray-900 capitalize border border-gray-200 rounded-lg bg-gray-50">
                                {profile.first_name?.toLowerCase() || '-'}
                            </div>
                        )}
                    </div>

                    {/* Middle Name */}
                    <div>
                        <label className="block mb-3 text-sm font-semibold text-gray-700">
                            Middle Name
                        </label>
                        {editMode ? (
                            <input
                                type="text"
                                name="middle_name"
                                value={formData.middle_name || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter middle name"
                            />
                        ) : (
                            <div className="w-full px-4 py-3 font-medium text-gray-900 capitalize border border-gray-200 rounded-lg bg-gray-50">
                                {profile.middle_name?.toLowerCase() || '-'}
                            </div>
                        )}
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block mb-3 text-sm font-semibold text-gray-700">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        {editMode ? (
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter last name"
                            />
                        ) : (
                            <div className="w-full px-4 py-3 font-medium text-gray-900 capitalize border border-gray-200 rounded-lg bg-gray-50">
                                {profile.last_name?.toLowerCase() || '-'}
                            </div>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="flex items-center block gap-2 mb-3 text-sm font-semibold text-gray-700">
                            <Mail size={16} className="text-blue-600" />
                            Email <span className="text-red-500">*</span>
                        </label>
                        {editMode ? (
                            <input
                                type="email"
                                name="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter email"
                            />
                        ) : (
                            <div className="w-full px-4 py-3 font-medium text-gray-900 border border-gray-200 rounded-lg bg-gray-50">
                                {profile.email || '-'}
                            </div>
                        )}
                    </div>

                    {/* Contact Number */}
                    <div>
                        <label className="flex items-center block gap-2 mb-3 text-sm font-semibold text-gray-700">
                            <Phone size={16} className="text-blue-600" />
                            Contact Number <span className="text-red-500">*</span>
                        </label>
                        {editMode ? (
                            <input
                                type="text"
                                name="contact_number"
                                value={formData.contact_number || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-200 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter contact number"
                            />
                        ) : (
                            <div className="w-full px-4 py-3 font-medium text-gray-900 border border-gray-200 rounded-lg bg-gray-50">
                                {profile.contact_number || '-'}
                            </div>
                        )}
                    </div>

                    {/* Birthdate */}
                    {profile.birthdate && (
                        <div>
                            <label className="flex items-center block gap-2 mb-3 text-sm font-semibold text-gray-700">
                                <Calendar size={16} className="text-blue-600" />
                                Birthdate <span className="text-red-500">*</span>
                            </label>
                            {editMode ? (
                                <DatePicker
                                    value={formData.birthdate}
                                    onChange={(date) => setFormData(prev => ({ ...prev, birthdate: date }))}
                                    placeholder="Select date"
                                />
                            ) : (
                                <div className="w-full px-4 py-3 font-medium text-gray-900 border border-gray-200 rounded-lg bg-gray-50">
                                    {new Date(profile.birthdate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Gender */}
                    <div>
                        <label className="block mb-3 text-sm font-semibold text-gray-700">
                            Gender
                        </label>
                        {editMode ? (
                            <select
                                name="gender"
                                value={formData.gender || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 text-gray-900 transition-all duration-200 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        ) : (
                            <div className="w-full px-4 py-3 font-medium text-gray-900 border border-gray-200 rounded-lg bg-gray-50">
                                {profile.gender || '-'}
                            </div>
                        )}
                    </div>
                </div>

    {/* Danger Zone */}
                <div className="pt-8 mt-8 border-t border-gray-200">
                    <p className="mb-4 text-sm font-semibold text-gray-700">Account Actions</p>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleDeleteAccount}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-100 hover:border-red-400 transition-all duration-200 text-sm font-semibold shadow-sm"
                        >
                            <Trash2 size={16} />
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

      {/* Change Password Modal */}
{changePasswordModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="w-full max-w-md bg-white shadow-xl rounded-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
                <button
                    onClick={() => setChangePasswordModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <X size={24} />
                </button>
            </div>

            <div className="p-6 space-y-4">
                {/* New Password */}
                <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                        New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="password"
                        value={passwordData.new}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                        placeholder="Enter new password"
                        className="w-full px-4 py-3 transition-all duration-200 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                        Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="password"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                        placeholder="Confirm new password"
                        className="w-full px-4 py-3 transition-all duration-200 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* ✅ ADD THIS FOOTER PART - ITO YUNG KULANG */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
                <button
                    onClick={() => setChangePasswordModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                    Cancel
                </button>
                <button
                    onClick={handleChangePassword}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                    Change Password
                </button>
            </div>
        </div>
    </div>
)}
           {/* Image Crop Modal - ADD THIS AFTER Change Password Modal */}
            {showImageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="w-full max-w-lg bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900">Crop Profile Picture</h3>
                            <button
                                onClick={() => {
                                    setShowImageModal(false);
                                    setSelectedImage(null);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Image Preview */}
                            <div className="relative mb-4 overflow-hidden bg-gray-100 rounded-lg" style={{ height: '400px' }}>
                                <img
                                    ref={imageRef}
                                    src={selectedImage}
                                    alt="Crop preview"
                                    style={{
                                        transform: `translate(${crop.x}px, ${crop.y}px) scale(${zoom})`,
                                        transformOrigin: 'center',
                                        maxWidth: 'none',
                                        width: '100%',
                                        height: 'auto'
                                    }}
                                    className="absolute"
                                    onLoad={() => {
                                        const img = imageRef.current;
                                        if (img) {
                                            const containerWidth = img.parentElement.offsetWidth;
                                            const containerHeight = img.parentElement.offsetHeight;
                                            setCrop({
                                                x: (containerWidth - img.offsetWidth) / 2,
                                                y: (containerHeight - img.offsetHeight) / 2
                                            });
                                        }
                                    }}
                                />
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute inset-0 border-2 border-white border-dashed rounded-lg"></div>
                                </div>
                            </div>

                            {/* Zoom Control */}
                            <div className="mb-4">
                                <label className="block mb-2 text-sm font-semibold text-gray-700">
                                    Zoom: {zoom.toFixed(1)}x
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="0.1"
                                    value={zoom}
                                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            {/* Position Controls */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                                        Horizontal
                                    </label>
                                    <input
                                        type="range"
                                        min="-200"
                                        max="200"
                                        value={crop.x}
                                        onChange={(e) => setCrop(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                                        Vertical
                                    </label>
                                    <input
                                        type="range"
                                        min="-200"
                                        max="200"
                                        value={crop.y}
                                        onChange={(e) => setCrop(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <canvas ref={canvasRef} className="hidden"></canvas>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setShowImageModal(false);
                                    setSelectedImage(null);
                                }}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveImage}
                                disabled={uploading}
                                className="flex items-center justify-center flex-1 gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        Save Picture
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);
}