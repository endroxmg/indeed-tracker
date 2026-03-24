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
    background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-card)',
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: '1px solid var(--color-border)', fontSize: 14, color: '#fff',
    background: 'var(--color-background)', transition: 'border-color 0.2s',
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 24, color: '#fff', margin: '0 0 8px' }}>
          Team Management
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-secondary-text)', margin: 0, fontWeight: 500 }}>
          Manage access, roles, and capacity for team members.
        </p>
      </div>

      {/* Top Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <button onClick={() => setShowAddUser(true)} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
          <UserPlus size={18} /> Add Team Member
        </button>
        <button onClick={() => setShowInvite(true)} className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
          <Mail size={18} /> Invite by Email
        </button>
      </div>

      {/* Pending Access Requests */}
      {pendingUsers.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{
            fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 16,
            color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: 6, borderRadius: 8 }}><Clock size={16} color="#F59E0B" /></div>
            Pending Access Requests
            <span style={{
              background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', padding: '2px 10px',
              borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.2)'
            }}>{pendingUsers.length}</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {pendingUsers.map((user) => (
              <div key={user.id} style={{
                ...cardStyle, padding: 20,
                borderLeft: '4px solid #F59E0B',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <InitialsAvatar name={user.name || user.email} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{user.name || 'Unknown'}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-secondary-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => approveUser(user)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 10, border: 'none',
                    background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s', border: '1px solid rgba(16, 185, 129, 0.3)'
                  }} className="hover:bg-[rgba(16,185,129,0.25)]">
                    <UserCheck size={16} /> Approve
                  </button>
                  <button onClick={() => rejectUser(user)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} className="hover:bg-[rgba(239,68,68,0.2)]">
                    <UserX size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{
            fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 16,
            color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ background: 'var(--color-primary-light)', padding: 6, borderRadius: 8 }}><Send size={16} color="var(--color-primary)" /></div> 
            Pending Invitations
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {pendingInvites.map((inv) => (
              <div key={inv.id} style={{
                ...cardStyle, padding: '12px 20px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <Mail size={16} color="var(--color-primary)" />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{inv.email}</span>
                <span style={{ fontSize: 11, color: 'var(--color-secondary-text)', background: 'var(--color-surface-hover)', padding: '2px 8px', borderRadius: 12 }}>pending</span>
                <button onClick={() => cancelInvite(inv)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 8, transition: 'all 0.2s', marginLeft: 8
                }} className="hover:bg-[rgba(239,68,68,0.1)]">
                  <X size={16} color="#EF4444" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Team Members */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={{
          fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 16,
          color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: 6, borderRadius: 8 }}><Users size={16} color="#10B981" /></div> 
          Active Team ({activeUsers.length})
        </h3>
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-hover)' }}>
                {['Member', 'Email', 'LDAP Account', 'Role', 'Capacity', 'Actions'].map((h) => (
                  <th key={h} style={{
                    padding: '16px 20px', textAlign: 'left', fontSize: 12,
                    fontWeight: 700, color: 'var(--color-secondary-text)', fontFamily: '"Poppins", sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((user) => (
                <tr 
                  key={user.id} 
                  onClick={() => setSelectedProfileId(user.uid || user.id)}
                  style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'all 0.2s' }}
                  className="hover:bg-[var(--color-surface-hover)]"
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <InitialsAvatar name={user.name} size={36} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>{user.name}</div>
                        {user.isManual && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', border: '1px solid rgba(245, 158, 11, 0.2)' }}>Manual</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--color-secondary-text)' }}>{user.email}</td>
                  <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--color-primary)', fontFamily: 'monospace', fontWeight: 600 }}>
                    {user.ldap || <span style={{ color: '#EF4444', fontWeight: 600 }}>Not Set</span>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
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
                              padding: '4px 10px',
                              borderRadius: 6,
                              cursor: (roleKey === 'admin' && user.email?.toLowerCase() !== 'jayveer7773@gmail.com') ? 'not-allowed' : 'pointer',
                              border: isAssigned ? 'none' : '1px dashed var(--color-border)',
                              background: isAssigned ? colors.bg : 'transparent',
                              color: isAssigned ? colors.text : 'var(--color-secondary-text)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              opacity: (roleKey === 'admin' && user.email?.toLowerCase() !== 'jayveer7773@gmail.com' && !isAssigned) ? 0.3 : 1
                            }}
                          >
                            {isAssigned && <Check size={12} />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>{user.dailyCapacity || 8}h</span>
                  </td>

                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: 10 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleEditUser(user)} style={{
                        padding: '8px', borderRadius: 10, border: '1px solid var(--color-primary)',
                        background: 'transparent', cursor: 'pointer', color: 'var(--color-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                      }} className="hover:bg-[var(--color-primary-light)]" title="Edit User">
                        <Edit size={16} />
                      </button>
                      {(!user.roles?.includes('admin') && user.role !== 'admin') && (
                        <button onClick={() => toggleActive(user)} style={{
                          padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.3)',
                          background: 'rgba(239, 68, 68, 0.1)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          color: '#EF4444', transition: 'all 0.2s'
                        }} className="hover:bg-[rgba(239,68,68,0.2)]">Deactivate</button>
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
            fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 16,
            color: 'var(--color-secondary-text)', margin: '0 0 16px',
          }}>Inactive ({inactiveUsers.length})</h3>
          <div style={{ ...cardStyle, overflow: 'hidden', opacity: 0.8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {inactiveUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <InitialsAvatar name={user.name} size={32} />
                        <span style={{ fontSize: 15, color: '#fff', fontWeight: 500 }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--color-secondary-text)' }}>{user.email}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <button onClick={() => toggleActive(user)} className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: 13 }}>Reactivate</button>
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
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowAddUser(false)}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 24, width: 480, padding: 32,
            boxShadow: 'var(--shadow-modal)', border: '1px solid var(--color-border)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 20, margin: '0 0 4px', color: '#fff' }}>
                  Add Team Member
                </h2>
                <p style={{ fontSize: 13, color: 'var(--color-secondary-text)', margin: 0 }}>
                  Add a user manually to begin tracking their time metrics.
                </p>
              </div>
              <button onClick={() => setShowAddUser(false)} style={{ background: 'var(--color-surface-hover)', border: 'none', padding: 8, borderRadius: 10, cursor: 'pointer' }}>
                <X size={20} color="var(--color-secondary-text)" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-text)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name *</label>
                <input style={inputStyle} placeholder="Full name" value={newUser.name}
                  onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} className="focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-text)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email *</label>
                <input style={inputStyle} type="email" placeholder="email@example.com" value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} className="focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-text)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Capacity (hrs)</label>
                <input style={inputStyle} type="number" min="1" max="24" value={newUser.dailyCapacity}
                  onChange={(e) => setNewUser((p) => ({ ...p, dailyCapacity: parseInt(e.target.value) || 8 }))} className="focus:border-[var(--color-primary)]" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 }}>
              <button onClick={() => setShowAddUser(false)} className="btn-secondary" style={{ padding: '10px 24px' }}>Cancel</button>
              <button onClick={handleAddManualUser} className="btn-primary" style={{ padding: '10px 24px' }}>Add Member</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setEditingUser(null)}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 24, width: 480, padding: 32,
            boxShadow: 'var(--shadow-modal)', border: '1px solid var(--color-border)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 20, margin: '0 0 4px', color: '#fff' }}>
                  Edit Team Member
                </h2>
                <p style={{ fontSize: 13, color: 'var(--color-secondary-text)', margin: 0 }}>
                  Update details for {editingUser.name}.
                </p>
              </div>
              <button onClick={() => setEditingUser(null)} style={{ background: 'var(--color-surface-hover)', border: 'none', padding: 8, borderRadius: 10, cursor: 'pointer' }}>
                <X size={20} color="var(--color-secondary-text)" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-text)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name *</label>
                <input style={inputStyle} placeholder="Full name" value={editData.name}
                  onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))} className="focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-text)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email *</label>
                <input style={inputStyle} type="email" placeholder="email@example.com" value={editData.email}
                  onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))} className="focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-text)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LDAP Account</label>
                <select style={inputStyle} value={editData.ldap}
                  onChange={(e) => setEditData((p) => ({ ...p, ldap: e.target.value }))} className="focus:border-[var(--color-primary)]">
                  <option value="">Select LDAP Account</option>
                  {LDAP_ACCOUNTS.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-text)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Capacity (hrs)</label>
                <input style={inputStyle} type="number" min="1" max="24" value={editData.dailyCapacity}
                  onChange={(e) => setEditData((p) => ({ ...p, dailyCapacity: parseFloat(e.target.value) || 8 }))} className="focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-secondary-text)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roles</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
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
                          fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, 
                          cursor: (roleKey === 'admin' && editData.email?.toLowerCase() !== 'jayveer7773@gmail.com') ? 'not-allowed' : 'pointer',
                          border: isStaged ? 'none' : '1px solid var(--color-border)',
                          background: isStaged ? colors.bg : 'var(--color-surface)',
                          color: isStaged ? colors.text : 'var(--color-secondary-text)',
                          transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em',
                          opacity: (roleKey === 'admin' && editData.email?.toLowerCase() !== 'jayveer7773@gmail.com' && !isStaged) ? 0.3 : 1
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 }}>
              <button onClick={() => setEditingUser(null)} className="btn-secondary" style={{ padding: '10px 24px' }}>Cancel</button>
              <button onClick={saveUserEdits} className="btn-primary" style={{ padding: '10px 24px' }}>Save Changes</button>
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
