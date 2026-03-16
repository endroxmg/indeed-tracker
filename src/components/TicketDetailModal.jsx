import { useState } from 'react';
import { X, ExternalLink, Clock, CheckCircle2, Circle, ArrowRight, Plus, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { TICKET_TYPE_COLORS, STATUS_COLORS, PRIORITY_COLORS, FEEDBACK_CATEGORY_COLORS, STATUS_LABELS, TYPE_LABELS, formatDate, formatDuration, daysInCurrentStage } from '../utils/helpers';
import { useToast } from './Toast';
import { updateTicket, logActivity } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';

export default function TicketDetailModal({ ticket, users = [], currentUserId, onClose, onUpdate }) {
  const toast = useToast();
  const [editing, setEditing] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState({});
  const [addingFeedback, setAddingFeedback] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ text: '', category: 'other', type: 'update' });

  const assignee = users.find((u) => u.uid === ticket.assigneeId);
  const typeColor = TICKET_TYPE_COLORS[ticket.type] || TICKET_TYPE_COLORS.other;
  const statusColor = STATUS_COLORS[ticket.status] || STATUS_COLORS.todo;
  const priorityColor = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium;

  const handleFieldSave = async (field, value) => {
    try {
      await updateTicket(ticket.id, { [field]: value });
      onUpdate?.();
      setEditing({});
      toast.success('Updated successfully');
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const handleSync = async () => {
    if (!ticket.frameioLink) {
      toast.warning('No Frame.io link set');
      return;
    }
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
          const newItems = data.comments
            .filter((c) => !existingIds.has(c.id))
            .map((c) => ({
              id: c.id,
              text: c.text,
              author: c.author?.name || 'Unknown',
              createdAt: c.createdAt,
              category: c.category || 'other',
              type: c.commentType || 'update',
              timecode: c.timestamp || null,
              source: 'frameio',
              resolved: c.completed || false,
            }));
          currentVersion.feedbackItems = [...(currentVersion.feedbackItems || []), ...newItems];
          updates.versions = versions;
        }
      }

      await updateTicket(ticket.id, updates);
      await logActivity({
        userId: currentUserId,
        type: 'feedback_synced',
        ticketId: ticket.id,
        description: `Synced Frame.io feedback for ${ticket.jiraId}`,
      });
      onUpdate?.();
      toast.success('Frame.io sync completed');
    } catch (err) {
      toast.error('Frame.io sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleQuickAction = async (newStatus) => {
    try {
      const updates = {
        status: newStatus,
        statusHistory: [
          ...(ticket.statusHistory || []),
          { status: newStatus, timestamp: Timestamp.now(), movedBy: currentUserId },
        ],
      };
      if (newStatus === 'completed') updates.completedAt = Timestamp.now();
      if (newStatus === 'in_production' && ticket.status === 'feedback_ready') {
        const versions = [...(ticket.versions || [])];
        const nextNum = versions.length + 1;
        versions.push({
          versionNumber: nextNum,
          startedAt: Timestamp.now(),
          submittedAt: null,
          completedAt: null,
          feedbackItems: [],
        });
        updates.versions = versions;
        updates.assigneeId = currentUserId;
      }
      await updateTicket(ticket.id, updates);
      await logActivity({
        userId: currentUserId,
        type: newStatus === 'completed' ? 'ticket_completed' : 'ticket_moved',
        ticketId: ticket.id,
        description: `Moved ${ticket.jiraId} to ${STATUS_LABELS[newStatus]}`,
      });
      onUpdate?.();
      toast.success(`Moved to ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleAddFeedback = async (versionIndex) => {
    if (!feedbackForm.text.trim()) { toast.error('Comment text required'); return; }
    try {
      const versions = [...(ticket.versions || [])];
      const v = versions[versionIndex];
      v.feedbackItems = [
        ...(v.feedbackItems || []),
        {
          id: Date.now().toString(),
          text: feedbackForm.text,
          author: users.find((u) => u.uid === currentUserId)?.name || 'Unknown',
          createdAt: new Date().toISOString(),
          category: feedbackForm.category,
          type: feedbackForm.type,
          timecode: null,
          source: 'manual',
          resolved: false,
        },
      ];
      await updateTicket(ticket.id, { versions });
      onUpdate?.();
      setAddingFeedback(null);
      setFeedbackForm({ text: '', category: 'other', type: 'update' });
      toast.success('Feedback added');
    } catch (err) {
      toast.error('Failed to add feedback');
    }
  };

  const handleDeliveryToggle = async (key) => {
    const fd = { ...(ticket.fileDelivery || {}) };
    fd[key] = !fd[key];
    await updateTicket(ticket.id, { fileDelivery: fd });
    onUpdate?.();
  };

  const getNextActions = () => {
    switch (ticket.status) {
      case 'todo': return [{ label: 'Move to In Production', status: 'in_production' }];
      case 'in_production': return [{ label: 'Submit for Feedback', status: 'ready_for_feedback' }];
      case 'ready_for_feedback': return [{ label: 'Feedback Ready', status: 'feedback_ready' }];
      case 'feedback_ready': return [
        { label: 'Back to Production', status: 'in_production' },
        { label: 'Mark Completed', status: 'completed' },
      ];
      default: return [];
    }
  };

  const timeSinceSynced = () => {
    if (!ticket.lastSyncedAt) return null;
    const ts = ticket.lastSyncedAt?.toDate ? ticket.lastSyncedAt.toDate() : new Date(ticket.lastSyncedAt);
    const mins = Math.floor((Date.now() - ts.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const selectStyle = {
    padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB',
    fontSize: 13, color: '#2D2D2D',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 40, overflow: 'auto',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, width: 820,
        maxHeight: 'calc(100vh - 80px)', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        marginBottom: 40,
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 16, color: '#0451CC' }}>
              {ticket.jiraId}
            </span>
            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: typeColor.bg, color: typeColor.text }}>
              {TYPE_LABELS[ticket.type]}
            </span>
            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: priorityColor.bg, color: priorityColor.text }}>
              {ticket.priority}
            </span>
            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: statusColor.bg, color: statusColor.text }}>
              {STATUS_LABELS[ticket.status]}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={20} color="#6B7280" />
          </button>
        </div>

        {/* Body - 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '55% 45%', minHeight: 500 }}>
          {/* LEFT */}
          <div style={{ padding: 24, borderRight: '1px solid #E5E7EB' }}>
            <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 17, color: '#2D2D2D', margin: '0 0 16px' }}>
              {ticket.title}
            </h3>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', fontFamily: '"Poppins", sans-serif', marginBottom: 6, display: 'block' }}>Description</label>
              <p style={{ fontSize: 14, color: '#2D2D2D', lineHeight: 1.6, background: '#F9FAFB', padding: 12, borderRadius: 8, margin: 0, minHeight: 60 }}>
                {ticket.description || 'No description provided'}
              </p>
            </div>

            {/* Assignee */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', fontFamily: '"Poppins", sans-serif' }}>Assignee:</label>
              <select value={ticket.assigneeId || ''} onChange={(e) => handleFieldSave('assigneeId', e.target.value)} style={selectStyle}>
                <option value="">Unassigned</option>
                {users.filter((u) => u.isActive && u.role !== 'pending').map((u) => (
                  <option key={u.uid} value={u.uid}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Frame.io */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', fontFamily: '"Poppins", sans-serif', marginBottom: 6, display: 'block' }}>Frame.io Link</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={ticket.frameioLink || ''} readOnly
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, color: '#2D2D2D' }} />
                {ticket.frameioLink && (
                  <a href={ticket.frameioLink} target="_blank" rel="noopener noreferrer"
                    style={{ padding: 8, borderRadius: 8, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center' }}>
                    <ExternalLink size={14} color="#0451CC" />
                  </a>
                )}
              </div>
            </div>

            {/* File Delivery */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', fontFamily: '"Poppins", sans-serif', marginBottom: 8, display: 'block' }}>File Delivery Checklist</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { key: 'mp4', label: 'MP4' },
                  { key: 'webm', label: 'WEBM' },
                  { key: 'afterEffects', label: 'After Effects' },
                  { key: 'premiere', label: 'Premiere Pro' },
                  { key: 'figma', label: 'Figma File' },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => handleDeliveryToggle(key)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    border: `1px solid ${ticket.fileDelivery?.[key] ? '#0451CC' : '#E5E7EB'}`,
                    background: ticket.fileDelivery?.[key] ? '#EAF0FD' : '#fff',
                    color: ticket.fileDelivery?.[key] ? '#0451CC' : '#6B7280',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease',
                  }}>
                    {ticket.fileDelivery?.[key] ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Version History */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#2D2D2D', fontFamily: '"Poppins", sans-serif' }}>Version History</label>
                <button onClick={async () => {
                  const versions = [...(ticket.versions || [])];
                  versions.push({
                    versionNumber: versions.length + 1,
                    startedAt: Timestamp.now(),
                    submittedAt: null,
                    completedAt: null,
                    feedbackItems: [],
                  });
                  await updateTicket(ticket.id, { versions });
                  await logActivity({ userId: currentUserId, type: 'version_submitted', ticketId: ticket.id, description: `Added version ${versions.length} to ${ticket.jiraId}` });
                  onUpdate?.();
                  toast.success('New version created');
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                  background: '#fff', fontSize: 12, fontWeight: 500, color: '#0451CC',
                  cursor: 'pointer',
                }}>
                  <Plus size={12} /> Add Version
                </button>
              </div>

              {(ticket.versions || []).map((v, idx) => {
                const expanded = expandedVersions[idx];
                return (
                  <div key={idx} style={{
                    border: '1px solid #E5E7EB', borderRadius: 10,
                    marginBottom: 8, overflow: 'hidden',
                  }}>
                    <div onClick={() => setExpandedVersions((p) => ({ ...p, [idx]: !p[idx] }))}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', cursor: 'pointer', background: expanded ? '#F9FAFB' : '#fff',
                        transition: 'background 0.15s',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span style={{ fontWeight: 600, fontSize: 13, fontFamily: '"Poppins", sans-serif' }}>
                          Version {v.versionNumber}
                        </span>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>
                          {v.feedbackItems?.length || 0} feedback items
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>
                        {v.startedAt && formatDate(v.startedAt)}
                      </span>
                    </div>

                    {expanded && (
                      <div style={{ padding: '12px 14px', borderTop: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', gap: 24, fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                          <span>Started: {v.startedAt ? formatDate(v.startedAt) : '—'}</span>
                          <span>Submitted: {v.submittedAt ? formatDate(v.submittedAt) : '—'}</span>
                        </div>

                        {/* Feedback items */}
                        {(v.feedbackItems || []).map((fb, fi) => {
                          const catColor = FEEDBACK_CATEGORY_COLORS[fb.category] || FEEDBACK_CATEGORY_COLORS.other;
                          return (
                            <div key={fi} style={{
                              background: '#F9FAFB', borderRadius: 8, padding: '10px 12px',
                              marginBottom: 6, borderLeft: `3px solid ${catColor.text}`,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: catColor.bg, color: catColor.text, fontWeight: 500 }}>
                                  {fb.category}
                                </span>
                                <span style={{
                                  fontSize: 11, padding: '1px 8px', borderRadius: 20, fontWeight: 500,
                                  background: fb.type === 'error' ? '#FEE2E2' : '#FEF3C7',
                                  color: fb.type === 'error' ? '#991B1B' : '#92400E',
                                }}>
                                  {fb.type?.toUpperCase()}
                                </span>
                                <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>{fb.author} · {fb.source}</span>
                              </div>
                              <p style={{ fontSize: 13, color: '#2D2D2D', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {fb.text}
                              </p>
                            </div>
                          );
                        })}

                        {/* Add feedback */}
                        {addingFeedback === idx ? (
                          <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #E5E7EB', marginTop: 8 }}>
                            <textarea value={feedbackForm.text} onChange={(e) => setFeedbackForm((p) => ({ ...p, text: e.target.value }))}
                              placeholder="Feedback comment..."
                              style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, minHeight: 60, resize: 'vertical', marginBottom: 8 }} />
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                              <select value={feedbackForm.category} onChange={(e) => setFeedbackForm((p) => ({ ...p, category: e.target.value }))} style={selectStyle}>
                                {['ui', 'voiceover', 'animation', 'storyboard', 'text', 'timing', 'other'].map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              <select value={feedbackForm.type} onChange={(e) => setFeedbackForm((p) => ({ ...p, type: e.target.value }))} style={selectStyle}>
                                <option value="error">Error</option>
                                <option value="update">Update</option>
                              </select>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button onClick={() => setAddingFeedback(null)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                              <button onClick={() => handleAddFeedback(idx)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#0451CC', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Save</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setAddingFeedback(idx)} style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '6px 12px', borderRadius: 8, border: '1px dashed #E5E7EB',
                            background: 'transparent', fontSize: 12, color: '#6B7280',
                            cursor: 'pointer', marginTop: 8, width: '100%', justifyContent: 'center',
                          }}>
                            <Plus size={12} /> Add Manual Feedback
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ padding: 24 }}>
            {/* Frame.io Sync */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 14, margin: '0 0 12px' }}>Frame.io Sync</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: ticket.lastSyncedAt ? '#16A34A' : '#D97706',
                }} />
                <span style={{ fontSize: 13, color: '#6B7280' }}>
                  {ticket.lastSyncedAt ? `Synced ${timeSinceSynced()}` : 'Not synced yet'}
                </span>
              </div>
              {ticket.videoDurationSec && (
                <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 8px' }}>Duration: {formatDuration(ticket.videoDurationSec)}</p>
              )}
              <button onClick={handleSync} disabled={syncing} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: '1px solid #E5E7EB',
                background: syncing ? '#F9FAFB' : '#fff', fontSize: 13, fontWeight: 500,
                color: '#0451CC', cursor: syncing ? 'not-allowed' : 'pointer',
              }}>
                <RefreshCw size={14} className={syncing ? 'spinning' : ''} /> {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>

            {/* Status Timeline */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 14, margin: '0 0 12px' }}>Status Timeline</h4>
              <div style={{ paddingLeft: 12 }}>
                {(ticket.statusHistory || []).map((entry, i) => {
                  const isLast = i === ticket.statusHistory.length - 1;
                  const mover = users.find((u) => u.uid === entry.movedBy);
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: isLast ? '#0451CC' : '#D1D5DB',
                          border: isLast ? '2px solid #EAF0FD' : 'none',
                          flexShrink: 0,
                        }} />
                        {!isLast && <div style={{ width: 1, flex: 1, background: '#E5E7EB', marginTop: 2 }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: isLast ? '#0451CC' : '#2D2D2D' }}>
                          {STATUS_LABELS[entry.status]}
                        </div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>
                          {formatDate(entry.timestamp, 'dd MMM yyyy, hh:mm a')}
                          {mover && ` · ${mover.name}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 14, margin: '0 0 12px' }}>Quick Actions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {getNextActions().map((action) => (
                  <button key={action.status} onClick={() => handleQuickAction(action.status)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 10, border: 'none',
                    background: action.status === 'completed' ? '#16A34A' : '#0451CC',
                    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s ease', width: '100%',
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <ArrowRight size={14} /> {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
