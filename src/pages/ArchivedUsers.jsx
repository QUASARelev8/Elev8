import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaTrash, FaUndo, FaChevronLeft, FaChevronRight, FaSearch } from 'react-icons/fa';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';

export default function ArchivedUsers() {
    const [archivedUsers, setArchivedUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage] = useState(8);
    const [roleFilter, setRoleFilter] = useState('All');
    const [loading, setLoading] = useState(true);

    const roles = ['Admin', 'Manager', 'Front Desk', 'Customer'];

    useEffect(() => {
        fetchArchivedUsers();
    }, []);

    const fetchArchivedUsers = async () => {
        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

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

            // Restore to accounts table
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

            // Restore to role table
            const table = archive.role.toLowerCase().replace(' ', '_');
            const userData = { ...archive.user_data, account_id: accountData.account_id };
            
            const { error: roleError } = await supabase
                .from(table)
                .insert([userData]);

            if (roleError) throw roleError;

            // Remove from archives
            await supabase
                .from('archived_users')
                .delete()
                .eq('archive_id', archive.archive_id);

            await fetchArchivedUsers();
            
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
            confirmButtonText: 'Yes, delete forever!',
            cancelButtonText: 'Cancel'
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

    // Filter logic
    const filteredUsers = archivedUsers.filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.role?.toLowerCase().includes(search.toLowerCase());
        
        const matchesRole = roleFilter === 'All' || u.role === roleFilter;
        
        return matchesSearch && matchesRole;
    });

    // Pagination
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen px-6 py-10 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-4 mb-3">
                    <button
                        onClick={() => window.history.back()}
                        className="p-3 text-gray-600 transition-all bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300"
                    >
                        <FaChevronLeft size={20} />
                    </button>
                    <h1 className="text-5xl font-black text-transparent bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 bg-clip-text">
                        📦 Archived Users
                    </h1>
                </div>
                <p className="ml-16 text-gray-600">View and manage deleted user accounts</p>
            </div>

            {/* Controls */}
            <div className="p-6 mb-8 bg-white border border-gray-100 shadow-lg rounded-2xl">
                <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
                    <div className="flex flex-col flex-1 w-full gap-4 sm:flex-row lg:w-auto">
                        <div className="relative flex-1">
                            <FaSearch className="absolute text-gray-400 transform -translate-y-1/2 left-4 top-1/2" />
                            <input
                                type="text"
                                placeholder="Search archived users..."
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full py-3 pl-12 pr-5 text-gray-700 transition-all border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-100"
                            />
                        </div>
                        
                        <select
                            value={roleFilter}
                            onChange={e => {
                                setRoleFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-5 py-3 font-medium text-gray-700 transition-all border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-100"
                        >
                            <option value="All">All Roles</option>
                            <option disabled>──────────</option>
                            {roles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 mt-6">
                    <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-100">
                        <span className="font-semibold text-gray-700">Total Archived: {filteredUsers.length}</span>
                    </div>
                </div>
            </div>

            {/* Archive Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 border-4 border-gray-300 rounded-full border-t-gray-600 animate-spin"></div>
                        <p className="text-gray-600">Loading archives...</p>
                    </div>
                </div>
            ) : currentUsers.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {currentUsers.map(archive => (
                        <div
                            key={archive.archive_id}
                            className="relative flex flex-col p-6 text-center transition-all duration-300 bg-white border-2 border-gray-200 shadow-md rounded-2xl hover:shadow-xl group"
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`p-3 rounded-xl font-semibold transition-all ${
                            currentPage === 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-600 hover:bg-gray-50 shadow-md'
                        }`}
                    >
                        <FaChevronLeft />
                    </button>
                    
                    <div className="flex gap-2">
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => paginate(i + 1)}
                                className={`w-10 h-10 rounded-xl font-bold transition-all ${
                                    currentPage === i + 1
                                        ? 'bg-gradient-to-r from-gray-600 to-gray-800 text-white shadow-lg'
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
                        className={`p-3 rounded-xl font-semibold transition-all ${
                            currentPage === totalPages
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-600 hover:bg-gray-50 shadow-md'
                        }`}
                    >
                        <FaChevronRight />
                    </button>
                    
                    <span className="ml-4 font-medium text-gray-600">
                        Page {currentPage} of {totalPages}
                    </span>
                </div>
            )}
        </div>
    );
}