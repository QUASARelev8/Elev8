import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, AlertCircle, Edit2, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Swal from 'sweetalert2';

export default function RejectFrontdesk() {
  const [rejects, setRejects] = useState([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchRejects();
  }, []);

  const fetchRejects = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('reject_frontdesk')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRejects(data || []);
    } catch (err) {
      console.error('Error fetching rejects:', err);
      setError('Failed to load rejection reasons');
    } finally {
      setLoading(false);
    }
  };

  const addReject = async () => {
    if (!reason.trim()) {
      setError('Please enter a reason');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('reject_frontdesk')
        .insert([{ reason: reason.trim() }])
        .select();

      if (insertError) throw insertError;

      setRejects([data[0], ...rejects]);
      setReason('');
      setError('');

      Swal.fire({
        icon: 'success',
        title: 'Added!',
        text: 'Rejection reason added successfully',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error adding reject:', err);
      setError('Failed to add rejection reason');
    }
  };

  const startEdit = (reject_frontdesk) => {
    setEditingId(reject_frontdesk.id);
    setEditValue(reject_frontdesk.reason);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (id) => {
    if (!editValue.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Empty Reason',
        text: 'Reason cannot be empty'
      });
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('reject_frontdesk')
        .update({ reason: editValue.trim() })
        .eq('id', id);

      if (updateError) throw updateError;

      setRejects(rejects.map(r => 
        r.id === id ? { ...r, reason: editValue.trim() } : r
      ));
      setEditingId(null);
      setEditValue('');

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Rejection reason updated successfully',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error updating reject:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update rejection reason'
      });
    }
  };

  const deleteReject = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Reason?',
      text: 'Are you sure you want to delete this rejection reason?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const { error: deleteError } = await supabase
        .from('reject_frontdesk')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setRejects(rejects.filter(r => r.id !== id));

      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Rejection reason deleted successfully',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error deleting reject:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete rejection reason'
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      addReject();
    }
  };

  const handleEditKeyPress = (e, id) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveEdit(id);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Reject FrontDesk</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter reason... (Ctrl+Enter to submit)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="3"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              onClick={addReject}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Reject Reason
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Rejection Records ({rejects.length})
          </h2>

          {rejects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No rejection records yet
            </div>
          ) : (
            <div className="space-y-3">
              {rejects.map((reject_frontdesk) => (
                <div
                  key={reject_frontdesk.id}
                  className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    {editingId === reject_frontdesk.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleEditKeyPress(e, reject_frontdesk.id)}
                          className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows="2"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(reject_frontdesk.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-900 mb-2">{reject_frontdesk.reason}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {formatDate(reject_frontdesk.created_at)}
                        </div>
                      </>
                    )}
                  </div>
                  {editingId !== reject_frontdesk.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(reject_frontdesk)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteReject(reject_frontdesk.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}