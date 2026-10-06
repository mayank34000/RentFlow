import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';
import { useTheme } from '../../useNavbarBehavior';
import '../../styles/admin/admin-dashboard.css';

export default function AdminDashboard() {
  useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeKycFilter, setActiveKycFilter] = useState('all');
  
  const [editUser, setEditUser] = useState(null);
  
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateKyc = async (userId, newStatus) => {
    const confirmMap = {
      rejected: `Reject this user's KYC? This will mark them as rejected.`,
      pending: 'Reset KYC status to Pending?'
    };
    if (confirmMap[newStatus] && !window.confirm(confirmMap[newStatus])) return;

    try {
      await apiRequest(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: { kycStatus: newStatus }
      });
      setUsers(users.map(u => u._id === userId ? { ...u, kycStatus: newStatus } : u));
    } catch (err) {
      alert('KYC update failed: ' + err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      await apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' });
      setUsers(users.filter(u => u._id !== id));
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest(`/api/admin/users/${editUser._id}`, {
        method: 'PATCH',
        body: {
          name: editUser.name,
          email: editUser.email,
          role: editUser.role,
          kycStatus: editUser.kycStatus,
          isPro: editUser.isPro
        }
      });
      setUsers(users.map(u => u._id === editUser._id ? res.data.user : u));
      setEditUser(null);
    } catch (err) {
      alert('Error updating user: ' + err.message);
    }
  };

  const filteredUsers = activeKycFilter === 'all' 
    ? users 
    : users.filter(u => (u.kycStatus || 'none') === activeKycFilter);

  return (
    <div className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <h1>Admin Dashboard</h1>
          <p>User Management & KYC Workflow</p>
        </header>
        
        {/* KYC Filter Tabs */}
        <div className="kyc-tabs" id="kycFilterTabs">
          {['all', 'pending', 'approved', 'rejected', 'none'].map(filter => (
            <button 
              key={filter}
              className="kyc-tab" 
              style={{ background: activeKycFilter === filter ? 'rgba(58,91,217,0.35)' : '', opacity: activeKycFilter === filter ? 1 : 0.6 }}
              onClick={() => setActiveKycFilter(filter)}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
          <button onClick={fetchUsers} className="refresh-btn" style={{ marginLeft: 'auto' }}>S» Refresh</button>
        </div>

        {error && (
          <div className="error-card">
            <p>{error}</p>
            <button onClick={fetchUsers}>Retry</button>
          </div>
        )}

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Tier</th>
                <th>KYC Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{textAlign: 'center'}}>Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center'}}>No users found.</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ color: '#fff' }}>{u.name || 'Unknown'}</strong>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: '#9ca3af' }}>{u.email || 'N/A'}</td>
                    <td><span className="badge badge-normal" style={{ textTransform: 'capitalize' }}>{u.role || 'customer'}</span></td>
                    <td><span className={`badge ${u.isPro ? 'badge-low' : 'badge-normal'}`}>{u.isPro ? '-? Pro' : 'Standard'}</span></td>
                    <td>
                      <span className={`badge`} style={{ textTransform: 'capitalize' }}>{u.kycStatus || 'none'}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {(u.kycStatus === 'none' || u.kycStatus === 'pending' || u.kycStatus === 'rejected') && (
                        <button className="action-btn" style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }} onClick={() => handleUpdateKyc(u._id, 'approved')}>Approve</button>
                      )}
                      {(u.kycStatus === 'pending' || u.kycStatus === 'approved') && (
                        <button className="action-btn" style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }} onClick={() => handleUpdateKyc(u._id, 'rejected')}>Reject</button>
                      )}
                      {(u.kycStatus === 'approved' || u.kycStatus === 'rejected') && (
                        <button className="action-btn" style={{ color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' }} onClick={() => handleUpdateKyc(u._id, 'pending')}>Set Pending</button>
                      )}
                      <button className="action-btn" onClick={() => setEditUser(u)}>Edit</button>
                      <button className="action-btn" style={{ color: '#f87171' }} onClick={() => handleDeleteUser(u._id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editUser && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit User</h2>
              <button className="close-btn" onClick={() => setEditUser(null)}>-</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={editUser.role} onChange={e => setEditUser({...editUser, role: e.target.value})}>
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>KYC Status</label>
                <select value={editUser.kycStatus || 'none'} onChange={e => setEditUser({...editUser, kycStatus: e.target.value})}>
                  <option value="none">None</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <input type="checkbox" id="isPro" checked={editUser.isPro} onChange={e => setEditUser({...editUser, isPro: e.target.checked})} />
                <label htmlFor="isPro" style={{ marginBottom: 0, marginLeft: '8px' }}>Pro User</label>
              </div>
              <button type="submit" className="submit-btn" style={{ marginTop: '15px' }}>Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
