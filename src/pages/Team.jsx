import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import {
  subscribeUsers, updateUser, deleteUser, createManualUser,
  createInvite, subscribeInvites, deleteInvite, logActivity,
} from '../services/firestoreService';
import {
  Shield, Clock, Send, Plus, Users, Edit, ExternalLink,
  UserPlus, Mail, UserCheck, UserX, X, Check
} from 'lucide-react';
import UserProfilePopup from '../components/team/UserProfilePopup';
import { ROLE_LABELS, ROLE_COLORS, LDAP_ACCOUNTS } from '../utils/helpers';
import InitialsAvatar from '../components/InitialsAvatar';

export default function Team() {
  const { userDoc } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', dailyCapacity: 8 });
  const [inviteEmail, setInviteEmail] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState({ name: '', email: '', ldap: '', dailyCapacity: 8 });
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  useEffect(() => {
    const unsub1 = subscribeUsers(setUsers);
    const unsub2 = subscribeInvites(setInvites);
    return () => { unsub1(); unsub2(); };
  }, []);

  const pendingUsers = users.filter((u) => u.roles?.includes('pending') || u.role === 'pending');
  const activeUsers = users.filter((u) => !(u.roles?.includes('pending') || u.role === 'pending') && u.isActive);
  const inactiveUsers = users.filter((u) => !(u.roles?.includes('pending') || u.role === 'pending') && !u.isActive);
  const pendingInvites = invites.filter((i) => i.status === 'pending');

  const approveUser = async (user) => {
    try {
      await updateUser(user.uid || user.id, {
        roles: ['designer'],
        role: 'designer', // legacy
        isActive: true
      });
      await logActivity({
        userId: userDoc.uid,
        type: 'user_approved',
        description: `Admin approved ${user.name || user.email} to join the team`,
      });
      toast.success(`${user.name || user.email} approved!`);
    } catch (err) {
      toast.error('Failed to approve user');
    }
  };

  const rejectUser = async (user) => {
    try {
      await deleteUser(user.uid || user.id);
      toast.success('User rejected');
    } catch (err) {
      toast.error('Failed to reject user');
    }
  };

  const toggleActive = async (user) => {
    try {
      await updateUser(user.uid || user.id, { isActive: !user.isActive });
      toast.success(`${user.name} ${user.isActive ? 'deactivated' : 'activated'}`);
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  const toggleRole = async (user, roleToToggle) => {
    try {
      const currentRoles = user.roles || (user.role ? [user.role] : []);
      let newRoles;

      if (currentRoles.includes(roleToToggle)) {
        // Don't allow removing the last role
        if (currentRoles.length === 1) {
          toast.error('User must have at least one role');
          return;
        }
        newRoles = currentRoles.filter(r => r !== roleToToggle);
      } else {
      // Restriction: Only jayveer7773@gmail.com can be admin
      if (roleToToggle === 'admin' && user.email?.toLowerCase() !== 'jayveer7773@gmail.com') {
        toast.error('Admin role is restricted to authorized personnel only');
        return;
      }
      newRoles = [...currentRoles, roleToToggle];
    }

    // Filter out 'pending' if it was there and we are adding real roles
    if (newRoles.length > 0 && newRoles.some(r => ['admin', 'moderator', 'designer'].includes(r))) {
      newRoles = newRoles.filter(r => r !== 'pending');
    }

      await updateUser(user.uid || user.id, {
        roles: newRoles,
        role: newRoles[0] || 'pending' // fallback for legacy
      });

      await logActivity({
        userId: userDoc.uid,
        type: 'role_changed',
        description: `Admin updated roles for ${user.name}: ${newRoles.map(r => ROLE_LABELS[r]).join(', ')}`,
      });

      toast.success(`Updated roles for ${user.name}`);
    } catch (err) {
      toast.error('Failed to change roles');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditData({
      name: user.name || '',
      email: user.email || '',
      ldap: user.ldap || '',
      dailyCapacity: user.dailyCapacity || 8,
      roles: user.roles || (user.role ? [user.role] : []),
    });
  };

  const saveUserEdits = async () => {
    if (!editData.name.trim() || !editData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    try {
      // If roles changed, also update legacy 'role' string (first one in array)
      const updates = { ...editData };
      if (updates.roles?.length > 0) {
        updates.role = updates.roles[0];
      }

      await updateUser(editingUser.uid || editingUser.id, updates);
      await logActivity({
        userId: userDoc.uid,
        type: 'user_updated',
        description: `Admin updated details for ${editData.name}`,
      });
      setEditingUser(null);
      toast.success('User updated successfully');
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  const handleAddManualUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    try {
      await createManualUser(newUser);
      await logActivity({
        userId: userDoc.uid,
        type: 'user_created',
        description: `Admin manually added ${newUser.name} (${newUser.email})`,
      });
      setShowAddUser(false);
      setNewUser({ name: '', email: '', dailyCapacity: 8 });
      toast.success(`${newUser.name} added to the team`);
    } catch (err) {
      toast.error('Failed to add user');
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    try {
      await createInvite(inviteEmail, userDoc.uid);
      // Open mailto with pre-filled invite
      const appUrl = window.location.origin;
      const subject = encodeURIComponent('You\'re invited to Indeed Content Creation Tracker');
      const body = encodeURIComponent(
        `Hi,\n\nYou've been invited to join the Indeed Content Creation Tracker.\n\n` +
        `Click the link below to sign in with your Google account:\n${appUrl}\n\n` +
        `Your access has been pre-approved — just click "Continue with Google" and you're in!\n\n` +
        `— ${userDoc.name || 'Admin'}`
      );
      window.open(`mailto:${inviteEmail}?subject=${subject}&body=${body}`, '_blank');

      await logActivity({
        userId: userDoc.uid,
        type: 'user_invited',
        description: `Admin invited ${inviteEmail} to join the team`,
      });

      setShowInvite(false);
      setInviteEmail('');
      toast.success(`Invite sent to ${inviteEmail}`);
    } catch (err) {
      toast.error('Failed to send invite');
    }
  };

  const cancelInvite = async (invite) => {
    try {
      await deleteInvite(invite.id);
      toast.success('Invite cancelled');
    } catch (err) {
      toast.error('Failed to cancel');
    }
  };

  const cardStyle = {
    background: '#fff', borderRadius: 12, border: '1px solid #D4D2D0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #D4D2D0', fontSize: 14, color: '#1A1A2E',
  };

  return (
    <div>
      {/* Top Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setShowAddUser(true)} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserPlus size={16} /> Add Team Member
        </button>
        <button onClick={() => setShowInvite(true)} className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mail size={16} /> Invite by Email
        </button>
      </div>

      {/* Pending Access Requests */}
      {pendingUsers.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{
            fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 15,
            color: '#1A1A2E', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Clock size={18} color="#D97706" />
            Pending Access Requests
            <span style={{
              background: '#FFF7ED', color: '#9A3412', padding: '2px 10px',
              borderRadius: 20, fontSize: 12, fontWeight: 700,
            }}>{pendingUsers.length}</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {pendingUsers.map((user) => (
              <div key={user.id} style={{
                ...cardStyle, padding: 16,
                borderLeft: '4px solid #D97706',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <InitialsAvatar name={user.name || user.email} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>{user.name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#767676', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => approveUser(user)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: '#0D7A3F', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    <UserCheck size={14} /> Approve
                  </button>
                  <button onClick={() => rejectUser(user)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 12px', borderRadius: 8, border: '1px solid #D4D2D0',
                    background: '#fff', color: '#C91B1B', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    <UserX size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{
            fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 15,
            color: '#1A1A2E', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Send size={18} color="#2557A7" /> Pending Invitations
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {pendingInvites.map((inv) => (
              <div key={inv.id} style={{
                ...cardStyle, padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Mail size={14} color="#2557A7" />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>{inv.email}</span>
                <span style={{ fontSize: 11, color: '#999' }}>pending</span>
                <button onClick={() => cancelInvite(inv)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  display: 'flex', borderRadius: 4,
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <X size={14} color="#C91B1B" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Team Members */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{
          fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 15,
          color: '#1A1A2E', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Users size={18} color="#0D7A3F" /> Active Team ({activeUsers.length})
        </h3>
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F3F2F1' }}>
                {['Member', 'Email', 'LDAP Account', 'Role', 'Capacity', 'Actions'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: 12,
                    fontWeight: 700, color: '#767676', fontFamily: '"Poppins", sans-serif',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((user) => (
                <tr 
                  key={user.id} 
                  onClick={() => setSelectedProfileId(user.uid || user.id)}
                  style={{ borderBottom: '1px solid #F3F2F1', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <InitialsAvatar name={user.name} size={32} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E' }}>{user.name}</div>
                        {user.isManual && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#FFF7ED', color: '#9A3412', fontWeight: 700, textTransform: 'uppercase' }}>Manual</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#767676' }}>{user.email}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#1A1A2E', fontFamily: 'monospace' }}>
                    {user.ldap || <span style={{ color: '#C91B1B', fontWeight: 600 }}>Not Set</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {['designer', 'moderator', 'admin'].map(roleKey => {
                        const userRoles = user.roles || (user.role ? [user.role] : []);
                        const isAssigned = userRoles.includes(roleKey);
                        const label = ROLE_LABELS[roleKey];
                        const colors = ROLE_COLORS[roleKey] || ROLE_COLORS.designer;

                        return (
                          <button
                            key={roleKey}
                            onClick={(e) => { e.stopPropagation(); toggleRole(user, roleKey); }}
                            disabled={roleKey === 'admin' && user.email?.toLowerCase() !== 'jayveer7773@gmail.com'}
                            title={roleKey === 'admin' && user.email?.toLowerCase() !== 'jayveer7773@gmail.com' ? 'Restricted role' : (isAssigned ? 'Click to remove role' : 'Click to add role')}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              cursor: (roleKey === 'admin' && user.email?.toLowerCase() !== 'jayveer7773@gmail.com') ? 'not-allowed' : 'pointer',
                              border: isAssigned ? 'none' : '1px dashed #D4D2D0',
                              background: isAssigned ? colors.bg : 'transparent',
                              color: isAssigned ? colors.text : '#767676',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              opacity: (roleKey === 'admin' && user.email?.toLowerCase() !== 'jayveer7773@gmail.com' && !isAssigned) ? 0.4 : 1
                            }}
                          >
                            {isAssigned && <Check size={10} />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E' }}>{user.dailyCapacity || 8}h</span>
                  </td>

                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleEditUser(user)} style={{
                        padding: '6px', borderRadius: 8, border: '1px solid #D4D2D0',
                        background: '#fff', cursor: 'pointer', color: '#2557A7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }} title="Edit User">
                        <Edit size={14} />
                      </button>
                      {(!user.roles?.includes('admin') && user.role !== 'admin') && (
                        <button onClick={() => toggleActive(user)} style={{
                          padding: '6px 14px', borderRadius: 8, border: '1px solid #D4D2D0',
                          background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          color: '#C91B1B',
                        }}>Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inactive */}
      {inactiveUsers.length > 0 && (
        <div>
          <h3 style={{
            fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 15,
            color: '#767676', margin: '0 0 12px',
          }}>Inactive ({inactiveUsers.length})</h3>
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {inactiveUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #F3F2F1', opacity: 0.6 }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <InitialsAvatar name={user.name} size={28} />
                        <span style={{ fontSize: 14, color: '#767676' }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>{user.email}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => toggleActive(user)} className="btn-primary"
                        style={{ padding: '5px 14px', fontSize: 12 }}>Reactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowAddUser(false)}>
          <div style={{
            background: '#fff', borderRadius: 16, width: 440, padding: 32,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 18, margin: '0 0 4px', color: '#1A1A2E' }}>
              Add Team Member
            </h2>
            <p style={{ fontSize: 13, color: '#767676', margin: '0 0 24px' }}>
              Add a user manually — you can log time for them even before they sign in.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6, display: 'block', fontFamily: '"Poppins"' }}>Name *</label>
                <input style={inputStyle} placeholder="Full name" value={newUser.name}
                  onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6, display: 'block', fontFamily: '"Poppins"' }}>Email *</label>
                <input style={inputStyle} type="email" placeholder="email@example.com" value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6, display: 'block', fontFamily: '"Poppins"' }}>Daily Capacity (hrs)</label>
                <input style={inputStyle} type="number" min="1" max="24" value={newUser.dailyCapacity}
                  onChange={(e) => setNewUser((p) => ({ ...p, dailyCapacity: parseInt(e.target.value) || 8 }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setShowAddUser(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddManualUser} className="btn-primary">Add Member</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setEditingUser(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, width: 440, padding: 32,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 18, margin: '0 0 4px', color: '#1A1A2E' }}>
              Edit Team Member
            </h2>
            <p style={{ fontSize: 13, color: '#767676', margin: '0 0 24px' }}>
              Update details for {editingUser.name}.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6, display: 'block', fontFamily: '"Poppins"' }}>Name *</label>
                <input style={inputStyle} placeholder="Full name" value={editData.name}
                  onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6, display: 'block', fontFamily: '"Poppins"' }}>Email *</label>
                <input style={inputStyle} type="email" placeholder="email@example.com" value={editData.email}
                  onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6, display: 'block', fontFamily: '"Poppins"' }}>LDAP Account</label>
                <select style={inputStyle} value={editData.ldap}
                  onChange={(e) => setEditData((p) => ({ ...p, ldap: e.target.value }))}>
                  <option value="">Select LDAP Account</option>
                  {LDAP_ACCOUNTS.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6, display: 'block', fontFamily: '"Poppins"' }}>Daily Capacity (hrs)</label>
                <input style={inputStyle} type="number" min="1" max="24" value={editData.dailyCapacity}
                  onChange={(e) => setEditData((p) => ({ ...p, dailyCapacity: parseFloat(e.target.value) || 8 }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6, display: 'block', fontFamily: '"Poppins"' }}>Roles</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['designer', 'moderator', 'admin'].map(roleKey => {
                    const currentRoles = editingUser.roles || (editingUser.role ? [editingUser.role] : []);
                    const isAssigned = currentRoles.includes(roleKey);
                    const label = ROLE_LABELS[roleKey];
                    const colors = ROLE_COLORS[roleKey] || ROLE_COLORS.designer;

                    const stagedRoles = editData.roles || currentRoles;
                    const isStaged = stagedRoles.includes(roleKey);

                    return (
                      <button
                        key={roleKey}
                        disabled={roleKey === 'admin' && editData.email?.toLowerCase() !== 'jayveer7773@gmail.com'}
                        onClick={() => {
                          const next = isStaged ? stagedRoles.filter(r => r !== roleKey) : [...stagedRoles, roleKey];
                          setEditData(p => ({ ...p, roles: next }));
                        }}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, 
                          cursor: (roleKey === 'admin' && editData.email?.toLowerCase() !== 'jayveer7773@gmail.com') ? 'not-allowed' : 'pointer',
                          border: isStaged ? 'none' : '1px solid #D4D2D0',
                          background: isStaged ? colors.bg : '#fff',
                          color: isStaged ? colors.text : '#767676',
                          transition: 'all 0.2s',
                          opacity: (roleKey === 'admin' && editData.email?.toLowerCase() !== 'jayveer7773@gmail.com' && !isStaged) ? 0.4 : 1
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setEditingUser(null)} className="btn-secondary">Cancel</button>
              <button onClick={saveUserEdits} className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {selectedProfileId && (
        <UserProfilePopup 
          userId={selectedProfileId} 
          onClose={() => setSelectedProfileId(null)} 
        />
      )}
    </div>
  );
}
