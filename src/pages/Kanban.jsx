import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { subscribeTickets, createTicket, updateTicket, logActivity, subscribeUsers } from '../services/firestoreService';
import { KANBAN_COLUMNS, STATUS_LABELS, LDAP_ACCOUNTS } from '../utils/helpers';
import TicketCard from '../components/TicketCard';
import CreateTicketModal from '../components/CreateTicketModal';
import TicketDetailModal from '../components/TicketDetailModal';
import { SkeletonKanban } from '../components/Skeleton';
import { Plus, Search, Columns3, X } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export default function Kanban() {
  const { userDoc } = useAuth();
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [pendingDrag, setPendingDrag] = useState(null);
  const [assignForm, setAssignForm] = useState({ ldap: '', designerId: '' });
  const [filters, setFilters] = useState({ designer: 'all', type: 'all', search: '' });

  useEffect(() => {
    const unsub1 = subscribeTickets((data) => { setTickets(data); setLoading(false); });
    const unsub2 = subscribeUsers(setUsers);
    return () => { unsub1(); unsub2(); };
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filters.designer !== 'all' && t.assigneeId !== filters.designer) return false;
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!t.jiraId?.toLowerCase().includes(q) && !t.title?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tickets, filters]);

  const columns = useMemo(() => {
    const map = {};
    KANBAN_COLUMNS.forEach((col) => { map[col.id] = []; });
    filteredTickets.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [filteredTickets]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId;
    const ticket = tickets.find((t) => t.id === draggableId);
    if (!ticket) return;

    if (newStatus === 'in_production') {
      const inProd = tickets.filter((t) => t.status === 'in_production');
      if (inProd.length >= 2) {
        toast.error('In Production is limited to 2 tickets');
        return;
      }
      setAssignForm({ ldap: ticket.ldap || '', designerId: ticket.assigneeId || '' });
      setPendingDrag({ ticket, result });
      return;
    }

    await executeMove(ticket, newStatus, result);
  };

  const executeMove = async (ticket, newStatus, result, overrides = {}) => {
    try {
      const updates = {
        status: newStatus,
        statusHistory: [
          ...(ticket.statusHistory || []),
          { status: newStatus, timestamp: Timestamp.now(), movedBy: userDoc.uid },
        ],
        ...overrides,
      };

      if (newStatus === 'in_production' && ticket.status === 'feedback_ready') {
        const versions = [...(ticket.versions || [])];
        versions.push({
          versionNumber: versions.length + 1,
          startedAt: Timestamp.now(), submittedAt: null, completedAt: null, feedbackItems: [],
        });
        updates.versions = versions;
      }

      if (newStatus === 'ready_for_feedback') {
        const versions = [...(ticket.versions || [])];
        if (versions.length > 0) {
          versions[versions.length - 1].submittedAt = Timestamp.now();
          updates.versions = versions;
        }
      }

      if (newStatus === 'completed') updates.completedAt = Timestamp.now();

      await updateTicket(ticket.id, updates);
      const movedByUser = users.find((u) => u.uid === userDoc.uid);
      await logActivity({
        userId: userDoc.uid, type: newStatus === 'completed' ? 'ticket_completed' : 'ticket_moved', ticketId: ticket.id,
        description: `${movedByUser?.name || 'User'} moved ${ticket.jiraId} from ${STATUS_LABELS[ticket.status]} to ${STATUS_LABELS[newStatus]}`,
      });

      toast.success(`Moved to ${STATUS_LABELS[newStatus]}`);
    } catch (err) { toast.error('Failed to move ticket'); }
  };

  const confirmAssignment = async () => {
    if (!pendingDrag) return;
    if (!assignForm.ldap) { toast.error('Please select an LDAP account'); return; }
    const { ticket } = pendingDrag;
    const overrides = { ldap: assignForm.ldap };
    if (assignForm.designerId) overrides.assigneeId = assignForm.designerId;
    await executeMove(ticket, 'in_production', pendingDrag.result, overrides);
    setPendingDrag(null);
    setAssignForm({ ldap: '', designerId: '' });
  };

  const handleCreateTicket = async (form) => {
    try {
      const id = await createTicket({ ...form, createdBy: userDoc.uid });
      const movedByUser = users.find((u) => u.uid === userDoc.uid);
      await logActivity({
        userId: userDoc.uid, type: 'ticket_created', ticketId: id,
        description: `${movedByUser?.name || 'User'} created ticket ${form.jiraId}`,
      });
      setShowCreate(false);
      toast.success(`Ticket ${form.jiraId} created`);
    } catch (err) { toast.error('Failed to create ticket'); }
  };

  const designers = users.filter((u) => (u.roles?.includes('designer') || u.role === 'designer') && u.isActive);

  if (loading) return <SkeletonKanban />;

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface)', padding: '8px 16px', borderRadius: 10, border: '1px solid var(--color-border)', flex: 1, maxWidth: 300 }}>
          <Search size={16} color="var(--color-secondary-text)" />
          <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            placeholder="Search tickets..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', color: '#fff' }} />
        </div>

        <select value={filters.designer} onChange={(e) => setFilters((p) => ({ ...p, designer: e.target.value }))}
          style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)', color: '#fff' }}>
          <option value="all">All Designers</option>
          {designers.map((u) => <option key={u.uid} value={u.uid}>{u.name}</option>)}
        </select>

        <select value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
          style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)', color: '#fff' }}>
          <option value="all">All Types</option>
          <option value="webinar">Webinar</option>
          <option value="video">Video</option>
          <option value="screengrabs">Screengrabs</option>
          <option value="motion_graphics">Motion Graphics</option>
          <option value="other">Other</option>
        </select>

        <div style={{ flex: 1 }} />

        <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 20, minHeight: 'calc(100vh - 200px)' }}>
          {KANBAN_COLUMNS.map((col) => {
            const isTodo = col.id === 'todo';
            return (
              <Droppable key={col.id} droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      flex: 1, minWidth: 280,
                      background: snapshot.isDraggingOver ? 'var(--color-surface-hover)' : (isTodo ? 'rgba(255,255,255,0.02)' : 'var(--color-surface)'),
                      borderRadius: 16, padding: 16,
                      transition: 'background 0.2s ease',
                      border: isTodo ? '1px dashed var(--color-border)' : '1px solid var(--color-border)',
                      display: 'flex', flexDirection: 'column'
                    }}
                  >
                    {/* Column header */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 16, padding: '0 4px',
                    }}>
                      <span style={{
                        fontFamily: '"Poppins", sans-serif', fontWeight: 600,
                        fontSize: 14, color: '#fff',
                      }}>
                        {col.label}
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%', background: 'var(--color-surface-hover)', color: 'var(--color-secondary-text)',
                      }}>
                        {columns[col.id]?.length || 0}
                      </span>
                    </div>

                    {/* Cards */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {(columns[col.id] || []).map((ticket, index) => (
                        <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                transform: snapshot.isDragging ? provided.draggableProps.style.transform : 'none',
                              }}
                            >
                              <TicketCard ticket={ticket} users={users} onClick={() => setSelectedTicket(ticket)} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Empty state */}
                      {(columns[col.id] || []).length === 0 && (
                        <div style={{
                          border: '1px dashed var(--color-border)', borderRadius: 12,
                          padding: 40, textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center'
                        }}>
                          <Columns3 size={24} color="var(--color-secondary-text)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                          <p style={{ fontSize: 13, color: 'var(--color-secondary-text)', margin: 0 }}>Empty</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modals */}
      {showCreate && (
        <CreateTicketModal users={users} onClose={() => setShowCreate(false)} onSubmit={handleCreateTicket} />
      )}

      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} users={users} currentUserId={userDoc?.uid} onClose={() => setSelectedTicket(null)} onDelete={() => setSelectedTicket(null)} onUpdate={() => { setTimeout(() => { setSelectedTicket((prev) => { if (!prev) return null; return tickets.find((t) => t.id === prev.id) || prev; }); }, 500); }} />
      )}

      {/* Assignment Popup */}
      {pendingDrag && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setPendingDrag(null); setAssignForm({ ldap: '', designerId: '' }); }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, width: 440, padding: 32, boxShadow: 'var(--shadow-modal)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 18, margin: 0, color: '#fff' }}>Assign Ticket</h2>
              <button onClick={() => { setPendingDrag(null); setAssignForm({ ldap: '', designerId: '' }); }} style={{ background: 'var(--color-surface-hover)', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex' }}><X size={16} color="var(--color-secondary-text)" /></button>
            </div>

            <div style={{ background: 'rgba(37, 87, 167, 0.1)', borderRadius: 12, padding: 16, marginBottom: 24, border: '1px solid rgba(37, 87, 167, 0.2)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-primary)', marginBottom: 4 }}>{pendingDrag.ticket.jiraId}</div>
              <div style={{ fontSize: 14, color: '#fff' }}>{pendingDrag.ticket.title}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-secondary-text)', marginBottom: 8, display: 'block' }}>LDAP Account *</label>
                <select value={assignForm.ldap} onChange={(e) => setAssignForm(p => ({ ...p, ldap: e.target.value }))} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 14, background: 'var(--color-surface-hover)', color: '#fff', outline: 'none' }} className="focus:border-[var(--color-primary)]">
                  <option value="">Select LDAP...</option>
                  {LDAP_ACCOUNTS.map((l) => (<option key={l.id} value={l.id}>{l.label}</option>))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-secondary-text)', marginBottom: 8, display: 'block' }}>Designer</label>
                <select value={assignForm.designerId} onChange={(e) => setAssignForm(p => ({ ...p, designerId: e.target.value }))} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 14, background: 'var(--color-surface-hover)', color: '#fff', outline: 'none' }} className="focus:border-[var(--color-primary)]">
                  <option value="">Select designer...</option>
                  {designers.map((u) => (<option key={u.uid} value={u.uid}>{u.name}</option>))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 }}>
              <button onClick={() => { setPendingDrag(null); setAssignForm({ ldap: '', designerId: '' }); }} className="btn-secondary">Cancel</button>
              <button onClick={confirmAssignment} className="btn-primary">Confirm Assignment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
