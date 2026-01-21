import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaEdit, FaTrash, FaCog, FaChevronLeft, FaChevronRight, FaUndo } from 'react-icons/fa';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';

const roleCategories = {
    'Administration': ['Admin', 'Manager'],
    'Staff': ['Front Desk'],
    'Users': ['Customer']
};

const roles = ['Admin', 'Manager', 'Front Desk', 'Customer'];

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        role: 'Admin',
        name: '',
        email: '',
        password: '',
        extra: {}
    });
    const [errors, setErrors] = useState({});
    const [search, setSearch] = useState('');
    const [settingsModal, setSettingsModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [changePasswordModal, setChangePasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [userStatuses, setUserStatuses] = useState({});

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage] = useState(8);
    const [roleFilter, setRoleFilter] = useState('All');

    // ===== FIX THE fetchUsers FUNCTION =====

    const fetchUsers = async () => {
        try {
            let allUsers = [];
            for (const role of roles) {
                const table = role.toLowerCase().replace(' ', '_');
                const { data, error } = await supabase.from(table).select('*');
                if (error) {
                    console.error(`Error fetching ${table}:`, error);
                    continue;
                }

                const mapped = data.map(u => ({
                    id: u.id || u.admin_id || u.manager_id || u.frontdesk_id || u.customer_id,
                    role,
                    name: role === 'Customer'
                        ? `${u.first_name} ${u.last_name}`
                        : u.name || u.admin_name || u.manager_name || u.staff_name,
                    email: u.email,
                    extra: { ...u, account_id: u.account_id }
                }));
                allUsers.push(...mapped);
            }

            // Fetch profile pictures and deactivation status
            const statuses = {};
            const usersWithImages = await Promise.all(allUsers.map(async (user) => {
                if (user.extra.account_id) {
                    // Get profile picture AND status
                    const { data: accountData } = await supabase
                        .from('accounts')
                        .select('ProfilePicuture, status')
                        .eq('account_id', user.extra.account_id)
                        .single();

                    // Check status from accounts table
                    if (accountData?.status === 'deactivated') {
                        statuses[user.extra.account_id] = 'deactivated';
                    } else {
                        // Also check deact_user table as backup
                        const { data: deactData } = await supabase
                            .from('deact_user')
                            .select('*')
                            .eq('account_id', user.extra.account_id)
                            .eq('status', 'deactivated')
                            .maybeSingle();

                        if (deactData) {
                            const deactivatedUntil = new Date(deactData.deactivated_until);
                            const now = new Date();
                            statuses[user.extra.account_id] = deactivatedUntil > now ? 'deactivated' : 'active';
                        } else {
                            statuses[user.extra.account_id] = 'active';
                        }
                    }

                    return {
                        ...user,
                        profilePicture: accountData?.ProfilePicuture || null
                    };
                }
                return user;
            }));

            setUserStatuses(statuses);
            setUsers(usersWithImages);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('extra.')) {
            const key = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                extra: { ...prev.extra, [key]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const validate = () => {
        let errs = {};
        if (!formData.name.trim() && formData.role !== 'Customer')
            errs.name = 'Name is required';
        if (!formData.email.trim())
            errs.email = 'Email is required';

        if (!formData.extra.account_id && !formData.password.trim()) {
            errs.password = 'Password is required';
        }

        if (formData.role === 'Customer') {
            if (!formData.extra.first_name) errs.firstName = 'First name required';
            if (!formData.extra.last_name) errs.lastName = 'Last name required';
            if (!formData.extra.birthdate) errs.birthdate = 'Birthdate required';
            if (!formData.extra.contact_number) errs.contactNumber = 'Contact number required';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            const roleMapping = {
                'Admin': 'admin',
                'Manager': 'manager',
                'Front Desk': 'frontdesk',
                'Customer': 'customer'
            };

            const isEditMode = formData.extra.account_id;

            if (isEditMode) {
                const account_id = formData.extra.account_id;
                let tableName = '';
                let tableData = {};

                if (formData.password.trim()) {
                    const { error: accountError } = await supabase
                        .from('accounts')
                        .update({
                            password: formData.password,
                        })
                        .eq('account_id', account_id);

                    if (accountError) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Error updating account: ' + accountError.message
                        });
                        return;
                    }
                }

                switch (formData.role) {
                    case 'Customer':
                        tableName = 'customer';
                        tableData = {
                            first_name: formData.extra.first_name,
                            middle_name: formData.extra.middle_name || null,
                            last_name: formData.extra.last_name,
                            birthdate: formData.extra.birthdate,
                            email: formData.extra.email || formData.email,
                            contact_number: formData.extra.contact_number,
                        };
                        if (formData.password.trim()) {
                            tableData.password = formData.password;
                        }
                        break;
                    case 'Front Desk':
                        tableName = 'front_desk';
                        tableData = {
                            staff_name: formData.name,
                            email: formData.email,
                        };
                        if (formData.password.trim()) {
                            tableData.password = formData.password;
                        }
                        break;
                    case 'Manager':
                        tableName = 'manager';
                        tableData = {
                            manager_name: formData.name,
                            email: formData.email,
                        };
                        if (formData.password.trim()) {
                            tableData.password = formData.password;
                        }
                        break;
                    case 'Admin':
                        tableName = 'admin';
                        tableData = {
                            admin_name: formData.name,
                            email: formData.email,
                        };
                        if (formData.password.trim()) {
                            tableData.password = formData.password;
                        }
                        break;
                }

                const { error: roleError } = await supabase
                    .from(tableName)
                    .update(tableData)
                    .eq('account_id', account_id);

                if (roleError) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Error updating user: ' + roleError.message
                    });
                    return;
                }

                setModalOpen(false);
                setFormData({ role: 'Admin', name: '', email: '', password: '', extra: {} });
                setErrors({});
                await fetchUsers();

                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'User updated successfully!',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                const { data: accountData, error: accountError } = await supabase
                    .from('accounts')
                    .insert([{
                        email: formData.email,
                        password: formData.password,
                        role: roleMapping[formData.role],
                    }])
                    .select("account_id, email, role, password, status")
                    .single();
                if (accountError || !accountData) {
                    throw new Error("Invalid email or password.");
                }

                // ✅ ADD THIS CHECK
                if (accountData.status === 'deactivated') {
                    throw new Error("Your account has been deactivated. Please contact support to reactivate.");
                }


                if (accountError) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Error creating account: ' + accountError.message
                    });
                    return;
                }

                const account_id = accountData.account_id;
                let tableData = {};
                let tableName = '';

                switch (formData.role) {
                    case 'Customer':
                        tableName = 'customer';
                        tableData = {
                            account_id,
                            first_name: formData.extra.first_name,
                            middle_name: formData.extra.middle_name || null,
                            last_name: formData.extra.last_name,
                            birthdate: formData.extra.birthdate,
                            email: formData.extra.email || formData.email,
                            contact_number: formData.extra.contact_number,
                            password: formData.extra.password || formData.password,
                            role: 'customer'
                        };
                        break;
                    case 'Front Desk':
                        tableName = 'front_desk';
                        tableData = {
                            account_id,
                            staff_name: formData.name,
                            email: formData.email,
                            password: formData.password
                        };
                        break;
                    case 'Manager':
                        tableName = 'manager';
                        tableData = {
                            account_id,
                            manager_name: formData.name,
                            email: formData.email,
                            password: formData.password
                        };
                        break;
                    case 'Admin':
                        tableName = 'admin';
                        tableData = {
                            account_id,
                            admin_name: formData.name,
                            email: formData.email,
                            password: formData.password
                        };
                        break;
                }

                const { error: roleError } = await supabase.from(tableName).insert([tableData]);
                if (roleError) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Error creating user role: ' + roleError.message
                    });
                    return;
                }

                setModalOpen(false);
                setFormData({ role: 'Admin', name: '', email: '', password: '', extra: {} });
                setErrors({});
                await fetchUsers();

                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'User created successfully!',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message
            });
        }
    };

    const handleDeleteAccount = async (user) => {
        const result = await Swal.fire({
            title: 'Archive this user?',
            text: "User data will be moved to archives",
            icon: 'warning',
            input: 'textarea',
            inputPlaceholder: 'Reason for deletion (optional)',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, archive it!'
        });

        if (!result.isConfirmed) return;

        try {
            const table = user.role.toLowerCase().replace(' ', '_');

            // Archive the user first
            const { error: archiveError } = await supabase
                .from('archived_users')
                .insert([{
                    account_id: user.extra.account_id,
                    role: user.role,
                    name: user.name,
                    email: user.email,
                    reason: result.value || 'No reason provided',
                    user_data: user.extra // Store all original data
                }]);

            if (archiveError) throw archiveError;

            // Then delete from role table
            await supabase.from(table).delete().eq('account_id', user.extra.account_id);

            // Delete from accounts
            await supabase.from('accounts').delete().eq('account_id', user.extra.account_id);

            await fetchUsers();

            Swal.fire({
                icon: 'success',
                title: 'Archived!',
                text: 'User has been archived.',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message
            });
        }
    };

    const handleDeactivateAccount = async (user, duration) => {
        try {
            const durationDays = { '3days': 3, '7days': 7, '2weeks': 14, '1month': 30, '1year': 365 };
            const deactivateUntil = new Date();
            deactivateUntil.setDate(deactivateUntil.getDate() + durationDays[duration]);
            const accountId = user.extra.account_id;

            if (!accountId) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Account ID not found!'
                });
                return;
            }

            const { data: existing } = await supabase
                .from('deact_user')
                .select('*')
                .eq('account_id', accountId)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('deact_user')
                    .update({
                        deactivated_until: deactivateUntil.toISOString(),
                        duration_days: durationDays[duration],
                        deactivation_date: new Date().toISOString(),
                        status: 'deactivated'
                    })
                    .eq('deact_id', existing.deact_id);
            } else {
                await supabase
                    .from('deact_user')
                    .insert([{
                        account_id: accountId,
                        deactivated_until: deactivateUntil.toISOString(),
                        duration_days: durationDays[duration],
                        status: 'deactivated'
                    }]);
            }

            // ✅ ADD THIS: Update accounts table status
            await supabase
                .from('accounts')
                .update({ status: 'deactivated' })
                .eq('account_id', accountId);

            setSettingsModal(false);
            await fetchUsers();

            const durationText = duration.replace('3days', '3 days').replace('7days', '7 days').replace('2weeks', '2 weeks').replace('1month', '1 month').replace('1year', '1 year');

            Swal.fire({
                icon: 'success',
                title: 'Deactivated!',
                text: `Account deactivated for ${durationText}`,
                timer: 2500,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message
            });
        }
    };
    const handleReactivateAccount = async (user) => {
        try {
            const accountId = user.extra.account_id;

            if (!accountId) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Account ID not found!'
                });
                return;
            }

            const { error } = await supabase
                .from('deact_user')
                .update({
                    status: 'reactivated',
                    reactivated_date: new Date().toISOString()
                })
                .eq('account_id', accountId);

            if (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error reactivating account: ' + error.message
                });
                return;
            }

            // ✅ ADD THIS: Update accounts table status to active
            await supabase
                .from('accounts')
                .update({ status: 'active' })
                .eq('account_id', accountId);

            setSettingsModal(false);
            await fetchUsers();

            Swal.fire({
                icon: 'success',
                title: 'Reactivated!',
                text: 'Account reactivated successfully!',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message
            });
        }
    };

    const handleChangePassword = async () => {
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

        try {
            const table = selectedUser.role.toLowerCase().replace(' ', '_');
            await supabase.from(table).update({ password: passwordData.new }).eq('account_id', selectedUser.extra.account_id);
            await supabase.from('accounts').update({ password: passwordData.new }).eq('account_id', selectedUser.extra.account_id);

            setChangePasswordModal(false);
            setPasswordData({ current: '', new: '', confirm: '' });

            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Password changed successfully',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message
            });
        }
    };

    // Filter and pagination logic
    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            u.role.toLowerCase().includes(search.toLowerCase());

        const matchesRole = roleFilter === 'All' || u.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);
    const handleRestoreUser = async (archive) => {
        const result = await Swal.fire({
            title: 'Restore this user?',
            html: `<p class="text-gray-600">Restore <strong>${archive.name}</strong> back to active users?</p>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, restore!'
        });

        if (!result.isConfirmed) return;

        try {
            const roleMapping = {
                'Admin': 'admin',
                'Manager': 'manager',
                'Front Desk': 'frontdesk',
                'Customer': 'customer'
            };

            // Check if email already exists in accounts
            const { data: existingAccount } = await supabase
                .from('accounts')
                .select('account_id, email')
                .eq('email', archive.email)
                .maybeSingle();

            let account_id;

            if (existingAccount) {
                // Email exists, use existing account_id
                account_id = existingAccount.account_id;

                // Update the existing account
                await supabase
                    .from('accounts')
                    .update({
                        password: archive.user_data.password || 'default123',
                        role: roleMapping[archive.role],
                        status: 'active'
                    })
                    .eq('account_id', account_id);
            } else {
                // Create new account
                const { data: accountData, error: accountError } = await supabase
                    .from('accounts')
                    .insert([{
                        email: archive.email,
                        password: archive.user_data.password || 'default123',
                        role: roleMapping[archive.role],
                        status: 'active'
                    }])
                    .select()
                    .single();

                if (accountError) throw accountError;
                account_id = accountData.account_id;
            }

            // Restore to role table
            // Restore to role table
            const table = archive.role.toLowerCase().replace(' ', '_');

            // Remove ID fields that should auto-generate
            const userData = { ...archive.user_data, account_id };
            delete userData.customer_id;
            delete userData.admin_id;
            delete userData.manager_id;
            delete userData.frontdesk_id;
            delete userData.id;

            // Check if already exists in role table
            const idField = table === 'customer' ? 'customer_id' :
                table === 'front_desk' ? 'frontdesk_id' :
                    table === 'manager' ? 'manager_id' : 'admin_id';

            const { data: existingRole } = await supabase
                .from(table)
                .select('*')
                .eq('account_id', account_id)
                .maybeSingle();

            if (existingRole) {
                // Update existing
                await supabase
                    .from(table)
                    .update(userData)
                    .eq(idField, existingRole[idField]);
            } else {
                // Insert new
                const { error: roleError } = await supabase
                    .from(table)
                    .insert([userData]);

                if (roleError) throw roleError;
            }

            // Remove from archives
            await supabase
                .from('archived_users')
                .delete()
                .eq('archive_id', archive.archive_id);

            await fetchArchivedUsers();
            await fetchUsers();

            Swal.fire({
                icon: 'success',
                title: 'Restored!',
                text: `${archive.name} has been restored successfully`,
                timer: 2500,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message
            });
        }
    };

    const handlePermanentDelete = async (archive) => {
        const result = await Swal.fire({
            title: 'Permanently delete?',
            html: `<p class="text-red-600 font-semibold">⚠️ This action CANNOT be undone!</p>
               <p class="text-gray-600 mt-2">Delete <strong>${archive.name}</strong> forever?</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete forever!'
        });

        if (!result.isConfirmed) return;

        try {
            const { error } = await supabase
                .from('archived_users')
                .delete()
                .eq('archive_id', archive.archive_id);

            if (error) throw error;

            await fetchArchivedUsers();

            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Archive permanently deleted',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message
            });
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }; const fetchArchivedUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('archived_users')
                .select('*')
                .order('deleted_date', { ascending: false });

            if (error) throw error;
            setArchivedUsers(data || []);
        } catch (err) {
            console.error('Error fetching archives:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load archived users'
            });
        }
    }; const [showArchives, setShowArchives] = useState(false);
    const [archivedUsers, setArchivedUsers] = useState([]);
    // Show Archives View
    if (showArchives) {
        return (
            <div className="min-h-screen px-6 py-10 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-3">
                        <button
                            onClick={() => setShowArchives(false)}
                            className="p-3 text-gray-600 transition-all bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50"
                        >
                            <FaChevronLeft size={20} />
                        </button>
                        <h1 className="text-5xl font-black text-transparent bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 bg-clip-text">
                            📦 Archived Users
                        </h1>
                    </div>
                    <p className="ml-16 text-gray-600">View and manage deleted user accounts</p>
                </div>

                {/* Stats */}
                <div className="p-6 mb-8 bg-white border border-gray-100 shadow-lg rounded-2xl">
                    <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 w-fit">
                        <span className="font-semibold text-gray-700">Total Archived: {archivedUsers.length}</span>
                    </div>
                </div>

                {/* Archive Grid */}
                {archivedUsers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {archivedUsers.map(archive => (
                            <div
                                key={archive.archive_id}
                                className="relative flex flex-col p-6 text-center transition-all duration-300 bg-white border-2 border-gray-200 shadow-md rounded-2xl hover:shadow-xl"
                            >
                                {/* Archived Badge */}
                                <div className="absolute top-3 left-3">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 rounded-full ring-2 ring-gray-300">
                                        📦 Archived
                                    </span>
                                </div>

                                {/* Profile Picture */}
                                <div className="flex items-center justify-center w-24 h-24 mx-auto mb-4 overflow-hidden bg-gray-300 rounded-full shadow-lg ring-4 ring-gray-200">
                                    <FaUserCircle size={60} className="text-gray-500" />
                                </div>

                                {/* User Info */}
                                <h2 className="mb-1 text-xl font-bold text-gray-800">{archive.name}</h2>
                                <p className="px-3 py-1 mb-1 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg">{archive.role}</p>
                                <p className="mb-2 text-sm text-gray-500 break-all">{archive.email}</p>

                                {/* Deletion Info */}
                                <div className="p-3 mb-4 border border-gray-200 rounded-lg bg-gray-50">
                                    <p className="text-xs font-semibold text-gray-600">Deleted on:</p>
                                    <p className="text-xs text-gray-500">{formatDate(archive.deleted_date)}</p>
                                    {archive.reason && (
                                        <>
                                            <p className="mt-2 text-xs font-semibold text-gray-600">Reason:</p>
                                            <p className="text-xs italic text-gray-500">"{archive.reason}"</p>
                                        </>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 mt-auto">
                                    <button
                                        onClick={() => handleRestoreUser(archive)}
                                        className="flex items-center justify-center flex-1 gap-2 px-4 py-2.5 font-semibold text-white transition bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 shadow-md"
                                    >
                                        <FaUndo size={14} /> Restore
                                    </button>
                                    <button
                                        onClick={() => handlePermanentDelete(archive)}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 font-semibold text-white transition bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700 shadow-md"
                                    >
                                        <FaTrash size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <div className="mb-4 text-gray-400">
                            <FaUserCircle size={80} className="mx-auto opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-gray-500">No archived users found</p>
                        <p className="text-sm text-gray-400">Deleted users will appear here</p>
                    </div>
                )}
            </div>
        );
    }
    return (
        <div className="min-h-screen px-6 py-10 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <div className="mb-10">
                <h1 className="mb-3 text-5xl font-black text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text">
                    User Management
                </h1>
            </div>

            {/* Controls */}
            <div className="p-6 mb-8 bg-white border border-gray-100 shadow-lg rounded-2xl">
                <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
                    <div className="flex flex-col flex-1 w-full gap-4 sm:flex-row lg:w-auto">
                        <input
                            type="text"
                            placeholder="🔍 Search users..."
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="flex-1 px-5 py-3 text-gray-700 transition-all border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />

                        <select
                            value={roleFilter}
                            onChange={e => {
                                setRoleFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-5 py-3 font-medium text-gray-700 transition-all border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        >
                            <option value="All">All Roles</option>
                            <option disabled>──────────</option>
                            {Object.entries(roleCategories).map(([category, categoryRoles]) => (
                                <optgroup key={category} label={category}>
                                    {categoryRoles.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    <button
                        className="flex items-center gap-2 px-8 py-3 font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-xl hover:from-blue-700 hover:to-indigo-700"
                        onClick={() => {
                            setFormData({ role: 'Admin', name: '', email: '', password: '', extra: {} });
                            setModalOpen(true);
                        }}
                    >
                        <span className="text-xl">+</span> Add New User
                    </button>
                    <button
                        className="flex items-center gap-2 px-8 py-3 font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-gray-600 to-gray-800 rounded-xl hover:shadow-xl"
                        onClick={() => {
                            fetchArchivedUsers();
                            setShowArchives(true);
                        }}
                    >
                        📦 View Archives
                    </button>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 mt-6">
                    <div className="px-4 py-2 border border-blue-200 rounded-lg bg-blue-50">
                        <span className="font-semibold text-blue-600">Total: {filteredUsers.length}</span>
                    </div>
                    <div className="px-4 py-2 border border-green-200 rounded-lg bg-green-50">
                        <span className="font-semibold text-green-600">Active: {Object.values(userStatuses).filter(s => s === 'active').length}</span>
                    </div>
                    <div className="px-4 py-2 border border-red-200 rounded-lg bg-red-50">
                        <span className="font-semibold text-red-600">Deactivated: {Object.values(userStatuses).filter(s => s === 'deactivated').length}</span>
                    </div>
                </div>
            </div>

            {/* User Grid */}
            <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {currentUsers.length > 0 ? currentUsers.map(u => (
                    <div
                        key={u.id}
                        className="relative flex flex-col items-center p-6 text-center transition-all duration-300 bg-white border border-gray-100 shadow-md rounded-2xl hover:shadow-2xl group"
                    >
                        {/* Action Buttons */}
                        <div className="absolute flex gap-2 transition-opacity opacity-0 top-3 right-3 group-hover:opacity-100">
                            <button
                                onClick={() => handleDeleteAccount(u)}
                                className="p-2 text-white transition bg-red-500 rounded-lg shadow-md hover:bg-red-600"
                                title="Delete Account"
                            >
                                <FaTrash size={12} />
                            </button>
                        </div>

                        {/* Profile Picture */}
                        <div className="flex items-center justify-center w-24 h-24 mb-4 overflow-hidden rounded-full shadow-lg bg-gradient-to-br from-blue-400 to-indigo-600 ring-4 ring-blue-100">
                            {u.profilePicture ? (
                                <img
                                    src={u.profilePicture}
                                    alt={u.name}
                                    className="object-cover w-full h-full"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div style={{ display: u.profilePicture ? 'none' : 'flex' }} className="items-center justify-center w-full h-full">
                                <FaUserCircle size={60} className="text-white" />
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mb-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${userStatuses[u.extra.account_id] === 'deactivated'
                                ? 'bg-red-100 text-red-700 ring-2 ring-red-200'
                                : 'bg-green-100 text-green-700 ring-2 ring-green-200'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${userStatuses[u.extra.account_id] === 'deactivated' ? 'bg-red-500' : 'bg-green-500'
                                    } animate-pulse`}></span>
                                {userStatuses[u.extra.account_id] === 'deactivated' ? 'Deactivated' : 'Active'}
                            </span>
                        </div>

                        {/* User Info */}
                        <h2 className="mb-1 text-xl font-bold text-gray-800">{u.name}</h2>
                        <p className="px-3 py-1 mb-1 text-sm font-semibold text-indigo-600 rounded-lg bg-indigo-50">{u.role}</p>
                        <p className="mb-5 text-sm text-gray-500 break-all">{u.email}</p>

                        {/* Action Buttons */}
                        <div className="flex w-full gap-2 mt-auto">
                            <button
                                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2.5 rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-md flex items-center justify-center gap-2 font-semibold"
                                onClick={() => {
                                    setFormData({
                                        role: u.role,
                                        name: u.name,
                                        email: u.email,
                                        password: '',
                                        extra: u.extra
                                    });
                                    setModalOpen(true);
                                }}
                            >
                                <FaEdit /> Edit
                            </button>

                            <button
                                className="p-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition shadow-md"
                                onClick={() => {
                                    setSelectedUser(u);
                                    setSettingsModal(true);
                                }}
                                title="Settings"
                            >
                                <FaCog size={18} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 text-center col-span-full">
                        <div className="mb-4 text-gray-400">
                            <FaUserCircle size={80} className="mx-auto opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-gray-500">No users found</p>
                        <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`p-3 rounded-xl font-semibold transition-all ${currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-blue-600 hover:bg-blue-50 shadow-md'
                            }`}
                    >
                        <FaChevronLeft />
                    </button>

                    <div className="flex gap-2">
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => paginate(i + 1)}
                                className={`w-10 h-10 rounded-xl font-bold transition-all ${currentPage === i + 1
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`p-3 rounded-xl font-semibold transition-all ${currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-blue-600 hover:bg-blue-50 shadow-md'
                            }`}
                    >
                        <FaChevronRight />
                    </button>

                    <span className="ml-4 font-medium text-gray-600">
                        Page {currentPage} of {totalPages}
                    </span>
                </div>
            )}

            {/* Add/Edit User Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="mb-6 text-3xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
                            {formData.extra.account_id ? 'Edit User' : 'Add New User'}
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700">Role</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    disabled={formData.extra.account_id}
                                    className="w-full px-4 py-3 font-medium transition-all border-2 border-gray-200 bg-gray-50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                >
                                    {Object.entries(roleCategories).map(([category, categoryRoles]) => (
                                        <optgroup key={category} label={`── ${category} ──`}>
                                            {categoryRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            {formData.role !== 'Customer' && (
                                <>
                                    <div>
                                        <label className="block mb-2 font-semibold text-gray-700">Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 transition-all border-2 border-gray-200 bg-gray-50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                            placeholder="Enter full name"
                                        />
                                        {errors.name && <p className="mt-1 text-sm font-medium text-red-500">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-semibold text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 transition-all border-2 border-gray-200 bg-gray-50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                            placeholder="user@example.com"
                                        />
                                        {errors.email && <p className="mt-1 text-sm font-medium text-red-500">{errors.email}</p>}
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-semibold text-gray-700">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder={formData.extra.account_id ? "Leave blank to keep current password" : "Enter password"}
                                            className="w-full px-4 py-3 transition-all border-2 border-gray-200 bg-gray-50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                        />
                                        {errors.password && <p className="mt-1 text-sm font-medium text-red-500">{errors.password}</p>}
                                    </div>
                                </>
                            )}

                            {formData.role === 'Customer' && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {[
                                        { label: 'First Name', name: 'first_name', type: 'text', error: 'firstName' },
                                        { label: 'Middle Name', name: 'middle_name', type: 'text' },
                                        { label: 'Last Name', name: 'last_name', type: 'text', error: 'lastName' },
                                        { label: 'Birthdate', name: 'birthdate', type: 'date', error: 'birthdate' },
                                        { label: 'Email', name: 'email', type: 'email', error: 'email' },
                                        { label: 'Contact Number', name: 'contact_number', type: 'text', error: 'contactNumber' },
                                        { label: 'Username', name: 'username', type: 'text' },
                                        { label: 'Password', name: 'password', type: 'password' },
                                    ].map(fld => (
                                        <div key={fld.name} className="p-4 border border-gray-200 shadow-sm bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl">
                                            <label className="block mb-2 text-sm font-semibold text-gray-700">{fld.label}</label>
                                            <input
                                                type={fld.type}
                                                name={`extra.${fld.name}`}
                                                value={formData.extra[fld.name] || ''}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 transition-all bg-white border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                            />
                                            {fld.error && errors[fld.error] && (
                                                <p className="mt-1 text-xs font-medium text-red-500">{errors[fld.error]}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        setModalOpen(false);
                                        setFormData({ role: 'Admin', name: '', email: '', password: '', extra: {} });
                                        setErrors({});
                                    }}
                                    className="px-6 py-3 font-semibold text-gray-700 transition border-2 border-gray-300 rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-8 py-3 font-semibold text-white transition shadow-lg rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                >
                                    {formData.extra.account_id ? 'Update' : 'Create'} User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {settingsModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md p-8 bg-white shadow-2xl rounded-3xl">
                        <h2 className="mb-6 text-3xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">Account Settings</h2>

                        <div className="p-5 mb-6 border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="flex items-center justify-center w-16 h-16 overflow-hidden rounded-full shadow-lg bg-gradient-to-br from-blue-400 to-indigo-600">
                                    {selectedUser.profilePicture ? (
                                        <img
                                            src={selectedUser.profilePicture}
                                            alt={selectedUser.name}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <FaUserCircle size={40} className="text-white" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-gray-800">{selectedUser.name}</p>
                                    <p className="text-sm font-semibold text-indigo-600">{selectedUser.role}</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 break-all">{selectedUser.email}</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setSettingsModal(false);
                                    setChangePasswordModal(true);
                                }}
                                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition font-semibold shadow-lg"
                            >
                                Change Password
                            </button>

                            {userStatuses[selectedUser.extra.account_id] === 'deactivated' ? (
                                <button
                                    onClick={() => handleReactivateAccount(selectedUser)}
                                    className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition font-semibold shadow-lg"
                                >
                                    ✓ Reactivate Account
                                </button>
                            ) : (
                                <div className="pt-4 border-t-2 border-gray-200">
                                    <p className="mb-3 text-sm font-bold text-gray-700">⏸️ Deactivate Account</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: '3 Days', value: '3days' },
                                            { label: '7 Days', value: '7days' },
                                            { label: '2 Weeks', value: '2weeks' },
                                            { label: '1 Month', value: '1month' },
                                            { label: '1 Year', value: '1year' }
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleDeactivateAccount(selectedUser, opt.value)}
                                                className="py-2.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition text-sm font-bold border-2 border-yellow-300"
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setSettingsModal(false)}
                                className="w-full py-3.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {changePasswordModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md p-8 bg-white shadow-2xl rounded-3xl">
                        <h2 className="mb-6 text-3xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">Change Password</h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.current}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                                    className="w-full px-4 py-3 transition-all border-2 border-gray-200 bg-gray-50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    placeholder="Enter current password"
                                />
                            </div>
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700">New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.new}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                                    className="w-full px-4 py-3 transition-all border-2 border-gray-200 bg-gray-50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirm}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                                    className="w-full px-4 py-3 transition-all border-2 border-gray-200 bg-gray-50 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    placeholder="Confirm new password"
                                />
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        setChangePasswordModal(false);
                                        setPasswordData({ current: '', new: '', confirm: '' });
                                    }}
                                    className="flex-1 py-3 font-semibold text-gray-700 transition bg-gray-200 rounded-xl hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleChangePassword}
                                    className="flex-1 py-3 font-semibold text-white transition shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700"
                                >
                                    Update Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}