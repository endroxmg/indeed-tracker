import { useState } from 'react';
import { X, ExternalLink, Clock, CheckCircle2, Circle, ArrowRight, Plus, RefreshCw, ChevronDown, ChevronRight, Edit3, Save, Trash2 } from 'lucide-react';
import { TICKET_TYPE_COLORS, STATUS_COLORS, PRIORITY_COLORS, FEEDBACK_CATEGORY_COLORS, STATUS_LABELS, TYPE_LABELS, formatDate, formatDuration, daysInCurrentStage, LDAP_ACCOUNTS } from '../utils/helpers';
import { useToast } from './Toast';
import { updateTicket, logActivity, deleteTicket } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import InitialsAvatar from './InitialsAvatar';

export default function TicketDetailModal({ ticket, users = [], currentUserId, onClose, onUpdate, onDelete }) {
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState({ 0: true });
  const [addingFeedback, setAddingFeedback] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ text: '', category: 'other', type: 'update' });

  const assignee = users.find((u) => u.uid === ticket.assigneeId);
  const typeColor = TICKET_TYPE_COLORS[ticket.type] || TICKET_TYPE_COLORS.other;
  const statusColor = STATUS_COLORS[ticket.status] || STATUS_COLORS.todo;
  const priorityColor = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium;

  const startEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValues({ ...editValues, [field]: currentValue || '' });
  };

  const saveEdit = async (field) => {
    try {
      await updateTicket(ticket.id, { [field]: editValues[field] });
      onUpdate?.();
      setEditingField(null);
      toast.success('Updated');
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update: ' + (err.message || ''));
    }
  };

  const handleFieldSave = async (field, value) => {
    try {
      await updateTicket(ticket.id, { [field]: value });
      onUpdate?.();
      toast.success('Updated');
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const handleSync = async () => {
    if (!ticket.frameioLink) { toast.warning('No Frame.io link set'); return; }
    setSyncing(true);
    try {
      const res = await fetch(`/api/frameio?action=resolveReview&url=${encodeURIComponent(ticket.frameioLink)}`);
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      const updates = {};
      if (data.duration) updates.videoDurationSec = data.duration;
      if (data.assetId) updates.frameioAssetId = data.assetId;
      updates.lastSyncedAt = Timestamp.now();
      if (data.comments?.length > 0) {
        const versions = [...(ticket.versions || [])];
        const currentVersion = versions[versions.length - 1];
        if (currentVersion) {
          const existingIds = new Set((currentVersion.feedbackItems || []).map((f) => f.id));
          const newItems = data.comments.filter((c) => !existingIds.has(c.id)).map((c) => ({
            id: c.id, text: c.text, author: c.author?.name || 'Unknown', createdAt: c.createdAt,
            category: c.category || 'other', type: c.commentType || 'update',
            timecode: c.timestamp || null, source: 'frameio', resolved: c.completed || false,
          }));
          currentVersion.feedbackItems = [...(currentVersion.feedbackItems || []), ...newItems];
          updates.versions = versions;
        }
      }
      await updateTicket(ticket.id, updates);
      onUpdate?.();
      toast.success('Frame.io synced');
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
    } finally { setSyncing(false); }
  };

  const handleQuickAction = async (newStatus) => {
    try {
      const updates = {
        status: newStatus,
        statusHistory: [...(ticket.statusHistory || []), { status: newStatus, timestamp: Timestamp.now(), movedBy: currentUserId }],
      };
      if (newStatus === 'completed') updates.completedAt = Timestamp.now();
      if (newStatus === 'in_production' && ticket.status === 'feedback_ready') {
        const versions = [...(ticket.versions || [])];
        versions.push({ versionNumber: versions.length + 1, startedAt: Timestamp.now(), submittedAt: null, completedAt: null, feedbackItems: [] });
        updates.versions = versions;
        updates.assigneeId = currentUserId;
      }
      await updateTicket(ticket.id, updates);
      await logActivity({ userId: currentUserId, type: newStatus === 'completed' ? 'ticket_completed' : 'ticket_moved', ticketId: ticket.id, description: `Moved ${ticket.jiraId} to ${STATUS_LABELS[newStatus]}` });
      onUpdate?.();
      toast.success(`Moved to ${STATUS_LABELS[newStatus]}`);
    } catch (err) { toast.error('Failed to update'); }
  };

  const handleAddFeedback = async (versionIndex) => {
    if (!feedbackForm.text.trim()) { toast.error('Comment required'); return; }
    try {
      const versions = [...(ticket.versions || [])];
      versions[versionIndex].feedbackItems = [
        ...(versions[versionIndex].feedbackItems || []),
        { id: Date.now().toString(), text: feedbackForm.text, author: users.find((u) => u.uid === currentUserId)?.name || 'Unknown', createdAt: new Date().toISOString(), category: feedbackForm.category, type: feedbackForm.type, source: 'manual', resolved: false },
      ];
      await updateTicket(ticket.id, { versions });
      onUpdate?.();
      setAddingFeedback(null);
      setFeedbackForm({ text: '', category: 'other', type: 'update' });
      toast.success('Feedback added');
    } catch (err) { toast.error('Failed to add feedback'); }
  };

  const handleDeliveryToggle = async (key) => {
    const fd = { ...(ticket.fileDelivery || {}) };
    fd[key] = !fd[key];
    await updateTicket(ticket.id, { fileDelivery: fd });
    onUpdate?.();
  };

  const getNextActions = () => {
    switch (ticket.status) {
      case 'todo': return [{ label: 'Start Production', status: 'in_production', color: '#2557A7' }];
      case 'in_production': return [{ label: 'Submit for Feedback', status: 'ready_for_feedback', color: '#2557A7' }];
      case 'ready_for_feedback': return [{ label: 'Feedback Ready', status: 'feedback_ready', color: '#D97706' }];
      case 'feedback_ready': return [
        { label: 'Back to Production', status: 'in_production', color: '#2557A7' },
        { label: 'Mark Completed', status: 'completed', color: '#0D7A3F' },
      ];
      default: return [];
    }
  };

  const labelStyle = { fontSize: 11, fontWeight: 700, color: '#767676', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: '"Poppins", sans-serif', marginBottom: 6, display: 'block' };
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D4D2D0', fontSize: 13, color: '#1A1A2E', fontFamily: '"Noto Sans", sans-serif' };
  const selectStyle = { padding: '6px 10px', borderRadius: 8, border: '1px solid #D4D2D0', fontSize: 13, color: '#1A1A2E' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(26,26,46,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 40, overflow: 'auto',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, width: 780,
        maxHeight: 'calc(100vh - 80px)', overflow: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        marginBottom: 40,
      }} onClick={(e) => e.stopPropagation()}>

        {/* ─── Header ─── */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #E8E8E8',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderRadius: '14px 14px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 16, color: '#2557A7' }}>
              {ticket.jiraId}
            </span>
            <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: statusColor.bg, color: statusColor.text }}>{STATUS_LABELS[ticket.status]}</span>
            <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: priorityColor.bg, color: priorityColor.text }}>{ticket.priority}</span>
            <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: typeColor.bg, color: typeColor.text }}>{TYPE_LABELS[ticket.type]}</span>
            {ticket.ldap && (
              <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#F0FDF4', color: '#166534', fontFamily: '"Noto Sans", monospace' }}>{ticket.ldap}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={async () => {
                if (deleting) return;
                if (!window.confirm(`Delete ticket ${ticket.jiraId}? This cannot be undone.`)) return;
                setDeleting(true);
                try {
                  await deleteTicket(ticket.id);
                  await logActivity({
                    userId: currentUserId,
                    type: 'ticket_deleted',
                    description: `Deleted ticket ${ticket.jiraId} — "${ticket.title}"`,
                  });
                  toast.success(`Ticket ${ticket.jiraId} deleted`);
                  if (onDelete) onDelete(ticket.id);
                  onClose();
                } catch (err) {
                  toast.error('Failed to delete ticket');
                  setDeleting(false);
                }
              }}
              style={{
                background: deleting ? '#FEE2E2' : '#FEF2F2', border: '1px solid #FECACA',
                cursor: deleting ? 'wait' : 'pointer', padding: 6, borderRadius: 8, display: 'flex',
              }}
              title="Delete ticket"
            >
              <Trash2 size={15} color="#DC2626" />
            </button>
          <button onClick={onClose} style={{ background: '#F3F2F1', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#E8E8E8'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#F3F2F1'}>
            <X size={18} color="#767676" />
          </button>
          </div>
        </div>

        {/* ─── Body ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px' }}>

          {/* LEFT COLUMN */}
          <div style={{ padding: '20px 24px', borderRight: '1px solid #F3F2F1' }}>

            {/* Title — editable */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Title</label>
              {editingField === 'title' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inputStyle, fontWeight: 600, fontSize: 15 }} value={editValues.title} autoFocus
                    onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit('title')} />
                  <button onClick={() => saveEdit('title')} style={{ background: '#2557A7', border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Save size={14} color="#fff" /></button>
                  <button onClick={() => setEditingField(null)} style={{ background: '#F3F2F1', border: 'none', borderRadius: 8, padding: '0 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={14} color="#767676" /></button>
                </div>
              ) : (
                <h3 onClick={() => startEdit('title', ticket.title)} style={{
                  fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: 0, lineHeight: 1.4,
                  fontFamily: '"Poppins", sans-serif', cursor: 'pointer', padding: '6px 0',
                  borderBottom: '1px dashed transparent',
                }} onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = '#D4D2D0'}
                   onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}>
                  {ticket.title} <Edit3 size={12} color="#C4C4C4" style={{ marginLeft: 6 }} />
                </h3>
              )}
            </div>

            {/* Description — editable */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Description</label>
              {editingField === 'description' ? (
                <div>
                  <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={editValues.description} autoFocus
                    onChange={(e) => setEditValues({ ...editValues, description: e.target.value })} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingField(null)} className="btn-secondary" style={{ padding: '5px 14px', fontSize: 12 }}>Cancel</button>
                    <button onClick={() => saveEdit('description')} className="btn-primary" style={{ padding: '5px 14px', fontSize: 12 }}>Save</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => startEdit('description', ticket.description)} style={{
                  fontSize: 13, color: '#1A1A2E', lineHeight: 1.7, background: '#F9F9F9',
                  padding: 14, borderRadius: 8, cursor: 'pointer', minHeight: 50,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  border: '1px solid transparent', maxHeight: 200, overflowY: 'auto',
                }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#D4D2D0'}
                   onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                  {ticket.description || <span style={{ color: '#C4C4C4', fontStyle: 'italic' }}>Click to add description...</span>}
                  <Edit3 size={11} color="#C4C4C4" style={{ float: 'right' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>LDAP Account</label>
                <select value={ticket.ldap || ''} onChange={(e) => handleFieldSave('ldap', e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                  <option value="">Select LDAP...</option>
                  {LDAP_ACCOUNTS.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Designer</label>
                <select value={ticket.assigneeId || ''} onChange={(e) => handleFieldSave('assigneeId', e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                  <option value="">Unassigned</option>
                  {users.filter((u) => u.isActive && (u.roles?.some(r => r !== 'pending') || u.role !== 'pending')).map((u) => (
                    <option key={u.uid} value={u.uid}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Type + Priority row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={ticket.type || 'other'} onChange={(e) => handleFieldSave('type', e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                  <option value="webinar">Webinar</option>
                  <option value="video">Video</option>
                  <option value="screengrabs">Screengrabs</option>
                  <option value="motion_graphics">Motion Graphics</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select value={ticket.priority || 'medium'} onChange={(e) => handleFieldSave('priority', e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Frame.io Link — editable */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Frame.io Link</label>
              {editingField === 'frameioLink' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={inputStyle} value={editValues.frameioLink} autoFocus placeholder="https://app.frame.io/..."
                    onChange={(e) => setEditValues({ ...editValues, frameioLink: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit('frameioLink')} />
                  <button onClick={() => saveEdit('frameioLink')} style={{ background: '#2557A7', border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Save size={14} color="#fff" /></button>
                </div>
              ) : (
                <div onClick={() => startEdit('frameioLink', ticket.frameioLink)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
                  background: '#F9F9F9', cursor: 'pointer', fontSize: 13, color: ticket.frameioLink ? '#2557A7' : '#C4C4C4',
                  border: '1px solid transparent', wordBreak: 'break-all',
                }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#D4D2D0'}
                   onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                  {ticket.frameioLink || 'Click to add link...'}
                  {ticket.frameioLink && (
                    <a href={ticket.frameioLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      style={{ flexShrink: 0 }}>
                      <ExternalLink size={13} color="#2557A7" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* File Delivery */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Deliverables</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { key: 'mp4', label: 'MP4' }, { key: 'webm', label: 'WEBM' },
                  { key: 'afterEffects', label: 'AE' }, { key: 'premiere', label: 'Premiere' }, { key: 'figma', label: 'Figma' },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => handleDeliveryToggle(key)} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 6,
                    border: `1px solid ${ticket.fileDelivery?.[key] ? '#2557A7' : '#E8E8E8'}`,
                    background: ticket.fileDelivery?.[key] ? '#E8EDF7' : '#fff',
                    color: ticket.fileDelivery?.[key] ? '#2557A7' : '#999',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    {ticket.fileDelivery?.[key] ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Version History */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Versions</label>
                <button onClick={async () => {
                  const versions = [...(ticket.versions || [])];
                  versions.push({ versionNumber: versions.length + 1, startedAt: Timestamp.now(), submittedAt: null, completedAt: null, feedbackItems: [] });
                  await updateTicket(ticket.id, { versions });
                  onUpdate?.();
                  toast.success('Version added');
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 6, border: '1px solid #D4D2D0',
                  background: '#fff', fontSize: 11, fontWeight: 600, color: '#2557A7', cursor: 'pointer',
                }}>
                  <Plus size={11} /> Add
                </button>
              </div>

              {(ticket.versions || []).map((v, idx) => {
                const expanded = expandedVersions[idx];
                return (
                  <div key={idx} style={{ border: '1px solid #E8E8E8', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
                    <div onClick={() => setExpandedVersions((p) => ({ ...p, [idx]: !p[idx] }))} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', cursor: 'pointer', background: expanded ? '#F9F9F9' : '#fff',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        <span style={{ fontWeight: 700, fontFamily: '"Poppins"' }}>v{v.versionNumber}</span>
                        <span style={{ fontSize: 11, color: '#999' }}>{v.feedbackItems?.length || 0} items</span>
                      </div>
                      <span style={{ fontSize: 10, color: '#999' }}>{v.startedAt && formatDate(v.startedAt)}</span>
                    </div>

                    {expanded && (
                      <div style={{ padding: '10px 12px', borderTop: '1px solid #F3F2F1' }}>
                        {(v.feedbackItems || []).map((fb, fi) => {
                          const catColor = FEEDBACK_CATEGORY_COLORS[fb.category] || FEEDBACK_CATEGORY_COLORS.other;
                          return (
                            <div key={fi} style={{
                              background: '#F9F9F9', borderRadius: 6, padding: '8px 10px',
                              marginBottom: 4, borderLeft: `3px solid ${catColor.text}`,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: catColor.bg, color: catColor.text, fontWeight: 600 }}>{fb.category}</span>
                                <span style={{ fontSize: 10, color: '#999', marginLeft: 'auto' }}>{fb.author}</span>
                              </div>
                              <p style={{ fontSize: 12, color: '#1A1A2E', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{fb.text}</p>
                            </div>
                          );
                        })}

                        {addingFeedback === idx ? (
                          <div style={{ marginTop: 6, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #E8E8E8' }}>
                            <textarea value={feedbackForm.text} onChange={(e) => setFeedbackForm((p) => ({ ...p, text: e.target.value }))}
                              placeholder="Add feedback..." style={{ ...inputStyle, minHeight: 50, resize: 'vertical', marginBottom: 6 }} />
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <select value={feedbackForm.category} onChange={(e) => setFeedbackForm((p) => ({ ...p, category: e.target.value }))} style={{ ...selectStyle, fontSize: 11 }}>
                                {['ui', 'voiceover', 'animation', 'storyboard', 'text', 'timing', 'other'].map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <div style={{ flex: 1 }} />
                              <button onClick={() => setAddingFeedback(null)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>Cancel</button>
                              <button onClick={() => handleAddFeedback(idx)} className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}>Add</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setAddingFeedback(idx)} style={{
                            display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center',
                            padding: '5px 0', borderRadius: 6, border: '1px dashed #D4D2D0',
                            background: 'transparent', fontSize: 11, color: '#999',
                            cursor: 'pointer', marginTop: 6, width: '100%',
                          }}><Plus size={11} /> Add Feedback</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ padding: '20px 20px' }}>
            {/* Quick Actions */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Actions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {getNextActions().map((action) => (
                  <button key={action.status} onClick={() => handleQuickAction(action.status)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 14px', borderRadius: 8, border: 'none',
                    background: action.color, color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', width: '100%', transition: 'opacity 0.15s',
                  }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                     onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                    <ArrowRight size={13} /> {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame.io Sync */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Frame.io</label>
              <button onClick={handleSync} disabled={syncing} style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                padding: '8px 14px', borderRadius: 8, border: '1px solid #D4D2D0',
                background: syncing ? '#F9F9F9' : '#fff', fontSize: 12, fontWeight: 600,
                color: '#2557A7', cursor: syncing ? 'wait' : 'pointer',
              }}>
                <RefreshCw size={13} className={syncing ? 'spinning' : ''} /> {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              {ticket.videoDurationSec && <p style={{ fontSize: 11, color: '#999', margin: '6px 0 0' }}>Duration: {formatDuration(ticket.videoDurationSec)}</p>}
            </div>

            {/* Status Timeline */}
            <div>
              <label style={labelStyle}>Timeline</label>
              <div style={{ paddingLeft: 8 }}>
                {(ticket.statusHistory || []).map((entry, i) => {
                  const isLast = i === (ticket.statusHistory || []).length - 1;
                  const mover = users.find((u) => u.uid === entry.movedBy);
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: isLast ? '#2557A7' : '#D4D2D0', flexShrink: 0, marginTop: 2,
                        }} />
                        {!isLast && <div style={{ width: 1, flex: 1, background: '#E8E8E8', marginTop: 2 }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: isLast ? '#2557A7' : '#1A1A2E' }}>
                          {STATUS_LABELS[entry.status]}
                        </div>
                        <div style={{ fontSize: 10, color: '#999' }}>
                          {formatDate(entry.timestamp, 'dd MMM, hh:mm a')}
                          {mover && ` · ${mover.name}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
