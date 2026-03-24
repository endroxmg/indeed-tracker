import { useState } from 'react';
import { X, ExternalLink, Clock, CheckCircle2, Circle, ArrowRight, Plus, RefreshCw, ChevronDown, ChevronRight, Edit3, Save, Trash2 } from 'lucide-react';
import { TICKET_TYPE_COLORS, STATUS_COLORS, PRIORITY_COLORS, FEEDBACK_CATEGORY_COLORS, STATUS_LABELS, TYPE_LABELS, formatDate, formatDuration, LDAP_ACCOUNTS } from '../utils/helpers';
import { useToast } from './Toast';
import { updateTicket, logActivity, deleteTicket, getGlobalSettings } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';

export default function TicketDetailModal({ ticket, users = [], currentUserId, onClose, onUpdate, onDelete }) {
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState({ 0: true });
  const [addingFeedback, setAddingFeedback] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ text: '', category: 'other', type: 'update' });

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
    } catch (err) { toast.error('Failed to update'); }
  };

  const handleFieldSave = async (field, value) => {
    try { await updateTicket(ticket.id, { [field]: value }); onUpdate?.(); toast.success('Updated'); }
    catch (err) { toast.error('Failed to update'); }
  };

  const handleSync = async () => {
    if (!ticket.frameioLink) { toast.warning('No Frame.io link set'); return; }
    setSyncing(true);
    try {
      const settings = await getGlobalSettings();
      const token = settings.frameioToken;
      const res = await fetch(`/api/frameio?action=resolveReview&url=${encodeURIComponent(ticket.frameioLink)}`, {
        headers: token ? { 'x-frameio-token': token } : {}
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Sync failed');
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
    } catch (err) { toast.error('Sync failed: ' + err.message); } finally { setSyncing(false); }
  };

  const handleQuickAction = async (newStatus) => {
    try {
      const updates = { status: newStatus, statusHistory: [...(ticket.statusHistory || []), { status: newStatus, timestamp: Timestamp.now(), movedBy: currentUserId }] };
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
      case 'todo': return [{ label: 'Start Production', status: 'in_production', color: 'var(--color-primary)' }];
      case 'in_production': return [{ label: 'Submit for Feedback', status: 'ready_for_feedback', color: 'var(--color-primary)' }];
      case 'ready_for_feedback': return [{ label: 'Feedback Ready', status: 'feedback_ready', color: '#F59E0B' }];
      case 'feedback_ready': return [
        { label: 'Back to Production', status: 'in_production', color: 'var(--color-primary)' },
        { label: 'Mark Completed', status: 'completed', color: '#10B981' },
      ];
      default: return [];
    }
  };

  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--color-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: '"Poppins", sans-serif', marginBottom: 8, display: 'block' };
  const inputStyleObj = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 14, background: 'var(--color-surface)', color: '#fff', outline: 'none' };
  const selectStyleObj = { padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 14, background: 'var(--color-surface)', color: '#fff', outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 40, overflow: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 20, width: 880, maxHeight: 'calc(100vh - 80px)', overflow: 'hidden', boxShadow: 'var(--shadow-modal)', marginBottom: 40, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>

        {/* ─── Header ─── */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {editingField === 'jiraId' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inputStyleObj, width: 140, fontWeight: 700 }} value={editValues.jiraId} autoFocus
                  onChange={(e) => setEditValues({ ...editValues, jiraId: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit('jiraId')} />
                <button onClick={() => saveEdit('jiraId')} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Save"><Save size={14} color="#fff" /></button>
                <button onClick={() => setEditingField(null)} style={{ background: 'var(--color-surface-hover)', border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Cancel"><X size={14} color="#fff" /></button>
              </div>
            ) : (
              <span onClick={() => startEdit('jiraId', ticket.jiraId)} style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {ticket.jiraId} <Edit3 size={14} color="var(--color-secondary-text)" />
              </span>
            )}
            <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: '#fff', border: `1px solid ${statusColor.text}40` }}>{STATUS_LABELS[ticket.status]}</span>
            <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: priorityColor.text, border: `1px solid ${priorityColor.text}40` }}>{ticket.priority.toUpperCase()}</span>
            <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: typeColor.text, border: `1px solid ${typeColor.text}40` }}>{TYPE_LABELS[ticket.type]}</span>
            {ticket.ldap && (
              <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(37, 87, 167, 0.15)', color: 'var(--color-primary)', fontFamily: 'monospace', border: '1px solid rgba(37, 87, 167, 0.3)' }}>{ticket.ldap}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={async () => {
                if (deleting) return;
                if (!window.confirm(`Delete ticket ${ticket.jiraId}?`)) return;
                setDeleting(true);
                try {
                  await deleteTicket(ticket.id);
                  await logActivity({ userId: currentUserId, type: 'ticket_deleted', description: `Deleted ticket ${ticket.jiraId}` });
                  toast.success(`Ticket deleted`);
                  if (onDelete) onDelete(ticket.id);
                  onClose();
                } catch (err) { toast.error('Failed to delete'); setDeleting(false); }
              }}
              style={{ background: deleting ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: deleting ? 'wait' : 'pointer', padding: 8, borderRadius: 10, display: 'flex', transition: 'all 0.2s' }}
            >
              <Trash2 size={16} color="#EF4444" />
            </button>
            <button onClick={onClose} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', cursor: 'pointer', padding: 8, borderRadius: 10, display: 'flex', transition: 'all 0.2s' }}>
              <X size={16} color="var(--color-secondary-text)" />
            </button>
          </div>
        </div>

        {/* ─── Body ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 360px', overflowY: 'auto' }}>

          {/* LEFT COLUMN */}
          <div style={{ padding: '32px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Title */}
            <div>
              <label style={labelStyle}>Title</label>
              {editingField === 'title' ? (
                <div style={{ display: 'flex', gap: 12 }}>
                  <input style={{ ...inputStyleObj, fontWeight: 600, fontSize: 16 }} value={editValues.title} autoFocus
                    onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit('title')} />
                  <button onClick={() => saveEdit('title')} className="btn-primary" style={{ padding: '0 16px' }}>Save</button>
                  <button onClick={() => setEditingField(null)} className="btn-secondary" style={{ padding: '0 16px' }}>Cancel</button>
                </div>
              ) : (
                <h3 onClick={() => startEdit('title', ticket.title)} style={{
                  fontSize: 20, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.4,
                  fontFamily: '"Poppins", sans-serif', cursor: 'pointer',
                  borderBottom: '1px dashed transparent', paddingBottom: 4
                }} onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = 'var(--color-border)'} onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}>
                  {ticket.title} <Edit3 size={14} color="var(--color-secondary-text)" style={{ marginLeft: 8 }} />
                </h3>
              )}
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              {editingField === 'description' ? (
                <div>
                  <textarea style={{ ...inputStyleObj, minHeight: 120, resize: 'vertical' }} value={editValues.description} autoFocus onChange={(e) => setEditValues({ ...editValues, description: e.target.value })} />
                  <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditingField(null)} className="btn-secondary">Cancel</button>
                    <button onClick={() => saveEdit('description')} className="btn-primary">Save Description</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => startEdit('description', ticket.description)} style={{
                  fontSize: 14, color: '#fff', lineHeight: 1.6, background: 'var(--color-surface-hover)',
                  padding: 20, borderRadius: 12, cursor: 'pointer', minHeight: 80,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid var(--color-border)'
                }}>
                  {ticket.description || <span style={{ color: 'var(--color-secondary-text)', fontStyle: 'italic' }}>Click to add description...</span>}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={labelStyle}>Assignee</label>
                <select value={ticket.assigneeId || ''} onChange={(e) => handleFieldSave('assigneeId', e.target.value)} style={selectStyleObj}>
                  <option value="">Unassigned</option>
                  {users.filter((u) => u.isActive && (u.roles?.some(r => r !== 'pending') || u.role !== 'pending')).map((u) => (
                    <option key={u.uid} value={u.uid}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select value={ticket.priority || 'medium'} onChange={(e) => handleFieldSave('priority', e.target.value)} style={selectStyleObj}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Frame.io Link */}
            <div>
              <label style={labelStyle}>Frame.io Link</label>
              {editingField === 'frameioLink' ? (
                <div style={{ display: 'flex', gap: 12 }}>
                  <input style={inputStyleObj} value={editValues.frameioLink} autoFocus placeholder="https://app.frame.io/..." onChange={(e) => setEditValues({ ...editValues, frameioLink: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && saveEdit('frameioLink')} />
                  <button onClick={() => saveEdit('frameioLink')} className="btn-primary" style={{ padding: '0 16px' }}>Save</button>
                </div>
              ) : (
                <div onClick={() => startEdit('frameioLink', ticket.frameioLink)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10,
                  background: 'var(--color-surface-hover)', cursor: 'pointer', fontSize: 14, color: ticket.frameioLink ? 'var(--color-primary)' : 'var(--color-secondary-text)', border: '1px solid var(--color-border)', wordBreak: 'break-all'
                }}>
                  {ticket.frameioLink || 'Click to add Frame.io collection link...'}
                  {ticket.frameioLink && (
                    <a href={ticket.frameioLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0, marginLeft: 'auto' }}>
                      <ExternalLink size={16} color="var(--color-primary)" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Deliverables */}
            <div>
              <label style={labelStyle}>Deliverables Required</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {[{ key: 'mp4', label: 'MP4' }, { key: 'webm', label: 'WEBM' }, { key: 'afterEffects', label: 'Ae' }, { key: 'premiere', label: 'Pr' }, { key: 'figma', label: 'Fig' }].map(({ key, label }) => (
                  <button key={key} onClick={() => handleDeliveryToggle(key)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10,
                    border: `1px solid ${ticket.fileDelivery?.[key] ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: ticket.fileDelivery?.[key] ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    color: ticket.fileDelivery?.[key] ? 'var(--color-primary)' : 'var(--color-secondary-text)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                    {ticket.fileDelivery?.[key] ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Version History */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Review Versions</label>
                <button onClick={async () => {
                  const versions = [...(ticket.versions || [])];
                  versions.push({ versionNumber: versions.length + 1, startedAt: Timestamp.now(), submittedAt: null, completedAt: null, feedbackItems: [] });
                  await updateTicket(ticket.id, { versions });
                  onUpdate?.();
                  toast.success('Version added');
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-primary)', background: 'var(--color-surface)', fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer', transition: 'all 0.2s'
                }} className="hover:bg-[var(--color-primary-light)]">
                  <Plus size={14} /> New Version
                </button>
              </div>

              {(ticket.versions || []).map((v, idx) => {
                const expanded = expandedVersions[idx];
                return (
                  <div key={idx} style={{ border: '1px solid var(--color-border)', borderRadius: 12, marginBottom: 12, overflow: 'hidden', background: 'var(--color-surface)' }}>
                    <div onClick={() => setExpandedVersions((p) => ({ ...p, [idx]: !p[idx] }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', background: expanded ? 'var(--color-surface-hover)' : 'var(--color-surface)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span style={{ fontWeight: 700, fontFamily: '"Poppins"' }}>Version {v.versionNumber}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-secondary-text)', background: 'var(--color-background)', padding: '2px 8px', borderRadius: 12 }}>{v.feedbackItems?.length || 0} feedback items</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--color-secondary-text)' }}>{v.startedAt && formatDate(v.startedAt)}</span>
                    </div>

                    {expanded && (
                      <div style={{ padding: '20px', borderTop: '1px solid var(--color-border)' }}>
                        {(v.feedbackItems || []).length === 0 && <div style={{ textAlign: 'center', color: 'var(--color-secondary-text)', fontSize: 13, marginBottom: 16 }}>No feedback available for this version.</div>}
                        {(v.feedbackItems || []).map((fb, fi) => {
                          const catColor = FEEDBACK_CATEGORY_COLORS[fb.category] || FEEDBACK_CATEGORY_COLORS.other;
                          return (
                            <div key={fi} style={{ background: 'var(--color-background)', borderRadius: 10, padding: '12px 16px', marginBottom: 12, borderLeft: `3px solid ${catColor.text}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: catColor.bg, color: catColor.text, fontWeight: 700 }}>{fb.category.toUpperCase()}</span>
                                <span style={{ fontSize: 11, color: 'var(--color-secondary-text)', marginLeft: 'auto' }}>{fb.author}</span>
                              </div>
                              <p style={{ fontSize: 13, color: '#fff', margin: 0, lineHeight: 1.6, wordBreak: 'break-word' }}>{fb.text}</p>
                            </div>
                          );
                        })}

                        {addingFeedback === idx ? (
                          <div style={{ marginTop: 12, padding: 16, background: 'var(--color-surface)', borderRadius: 12, border: '1px dashed var(--color-primary)' }}>
                            <textarea value={feedbackForm.text} onChange={(e) => setFeedbackForm((p) => ({ ...p, text: e.target.value }))} placeholder="Write feedback here..." style={{ ...inputStyleObj, minHeight: 80, resize: 'vertical', marginBottom: 12, background: 'var(--color-background)' }} />
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              <select value={feedbackForm.category} onChange={(e) => setFeedbackForm((p) => ({ ...p, category: e.target.value }))} style={{ ...selectStyleObj, fontSize: 13, padding: '8px 12px' }}>
                                {['ui', 'voiceover', 'animation', 'storyboard', 'text', 'timing', 'other'].map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <div style={{ flex: 1 }} />
                              <button onClick={() => setAddingFeedback(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Cancel</button>
                              <button onClick={() => handleAddFeedback(idx)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Add Feedback</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setAddingFeedback(idx)} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '12px 0', borderRadius: 10, border: '1px dashed var(--color-border)', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--color-secondary-text)', cursor: 'pointer', marginTop: 12, width: '100%', transition: 'all 0.2s' }} className="hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"><Plus size={16} /> Add Feedback</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ padding: '32px 24px', background: 'var(--color-surface-hover)' }}>
            
            {/* Quick Actions */}
            <div style={{ marginBottom: 32 }}>
              <label style={labelStyle}>Next Action</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {getNextActions().map((action) => (
                  <button key={action.status} onClick={() => handleQuickAction(action.status)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px', borderRadius: 10, border: 'none', background: action.color, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'all 0.2s', boxShadow: `0 4px 14px ${action.color}40`,
                  }} className="hover:opacity-90 hover:scale-[1.02]">
                    <ArrowRight size={16} /> {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame.io Sync */}
            <div style={{ marginBottom: 32 }}>
              <label style={labelStyle}>Frame.io Integration</label>
              <button onClick={handleSync} disabled={syncing} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--color-primary)', background: syncing ? 'var(--color-surface)' : 'var(--color-primary-light)', fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', cursor: syncing ? 'wait' : 'pointer', transition: 'all 0.2s'
              }} className="hover:bg-[var(--color-primary)] hover:text-white">
                <RefreshCw size={16} className={syncing ? 'spinning' : ''} /> {syncing ? 'Syncing comments...' : 'Sync Feedback Now'}
              </button>
              {ticket.videoDurationSec && <p style={{ fontSize: 12, color: 'var(--color-secondary-text)', margin: '12px 0 0', textAlign: 'center' }}><Clock size={12} style={{display:'inline', marginRight:4}}/> Duration: {formatDuration(ticket.videoDurationSec)}</p>}
            </div>

            {/* Status Timeline */}
            <div>
              <label style={labelStyle}>Activity Timeline</label>
              <div style={{ paddingLeft: 12, marginTop: 16 }}>
                {(ticket.statusHistory || []).map((entry, i) => {
                  const isLast = i === (ticket.statusHistory || []).length - 1;
                  const mover = users.find((u) => u.uid === entry.movedBy);
                  return (
                    <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16, position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: isLast ? 'var(--color-primary)' : 'var(--color-border)', flexShrink: 0, marginTop: 4, boxShadow: isLast ? 'var(--shadow-glow)' : 'none' }} />
                        {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--color-border)', marginTop: 4 }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isLast ? '#fff' : 'var(--color-secondary-text)' }}>
                          {STATUS_LABELS[entry.status]}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-secondary-text)', marginTop: 2 }}>
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
