import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { subscribeTickets, createTicket, updateTicket, logActivity, subscribeUsers } from '../services/firestoreService';
import { KANBAN_COLUMNS, STATUS_LABELS, isOverdue } from '../utils/helpers';
import TicketCard from '../components/TicketCard';
import CreateTicketModal from '../components/CreateTicketModal';
import TicketDetailModal from '../components/TicketDetailModal';
import { SkeletonKanban } from '../components/Skeleton';
import { Plus, Search, Filter, Columns3 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export default function Kanban() {
  const { userDoc } = useAuth();
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
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

    // WIP limit for In Production
    if (newStatus === 'in_production') {
      const inProd = tickets.filter((t) => t.status === 'in_production');
      const userAlreadyHas = inProd.find((t) => t.assigneeId === userDoc.uid);
      if (inProd.length >= 2) {
        toast.error('In Production is limited to 2 tickets (1 per designer)');
        return;
      }
      if (userAlreadyHas && userAlreadyHas.id !== ticket.id) {
        toast.error('You already have an active ticket in production');
        return;
      }
    }

    try {
      const updates = {
        status: newStatus,
        statusHistory: [
          ...(ticket.statusHistory || []),
          { status: newStatus, timestamp: Timestamp.now(), movedBy: userDoc.uid },
        ],
      };

      // Auto-assign when moved to In Production
      if (newStatus === 'in_production') {
        updates.assigneeId = userDoc.uid;
      }

      // Auto-create new version when moving from Feedback Ready back to In Production
      if (newStatus === 'in_production' && ticket.status === 'feedback_ready') {
        const versions = [...(ticket.versions || [])];
        versions.push({
          versionNumber: versions.length + 1,
          startedAt: Timestamp.now(),
          submittedAt: null,
          completedAt: null,
          feedbackItems: [],
        });
        updates.versions = versions;
      }

      // Record submitted timestamp when going to Ready for Feedback
      if (newStatus === 'ready_for_feedback') {
        const versions = [...(ticket.versions || [])];
        if (versions.length > 0) {
          versions[versions.length - 1].submittedAt = Timestamp.now();
          updates.versions = versions;
        }
      }

      if (newStatus === 'completed') {
        updates.completedAt = Timestamp.now();
      }

      await updateTicket(ticket.id, updates);

      // Log activity with full details
      const movedByUser = users.find((u) => u.uid === userDoc.uid);
      await logActivity({
        userId: userDoc.uid,
        type: newStatus === 'completed' ? 'ticket_completed' : 'ticket_moved',
        ticketId: ticket.id,
        description: `${movedByUser?.name || 'User'} moved ${ticket.jiraId} "${ticket.title}" from ${STATUS_LABELS[ticket.status]} to ${STATUS_LABELS[newStatus]}`,
      });

      toast.success(`Moved to ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast.error('Failed to move ticket');
    }
  };

  const handleCreateTicket = async (form) => {
    try {
      const id = await createTicket({
        ...form,
        createdBy: userDoc.uid,
      });
      const movedByUser = users.find((u) => u.uid === userDoc.uid);
      await logActivity({
        userId: userDoc.uid,
        type: 'ticket_created',
        ticketId: id,
        description: `${movedByUser?.name || 'User'} created ticket ${form.jiraId} "${form.title}"`,
      });
      setShowCreate(false);
      toast.success(`Ticket ${form.jiraId} created`);
    } catch (err) {
      console.error('Ticket creation error:', err);
      toast.error('Failed to create ticket: ' + (err.message || err.code || 'Unknown error'));
    }
  };

  const designers = users.filter((u) => u.role !== 'pending' && u.isActive);

  if (loading) return <SkeletonKanban />;

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F3F2F1', padding: '6px 12px', borderRadius: 8, border: '1px solid #D4D2D0' }}>
          <Search size={14} color="#767676" />
          <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            placeholder="Search tickets..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: 160, color: '#1A1A2E' }} />
        </div>

        <select value={filters.designer} onChange={(e) => setFilters((p) => ({ ...p, designer: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D4D2D0', fontSize: 13, background: '#fff' }}>
          <option value="all">All Designers</option>
          {designers.map((u) => <option key={u.uid} value={u.uid}>{u.name}</option>)}
        </select>

        <select value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D4D2D0', fontSize: 13, background: '#fff' }}>
          <option value="all">All Types</option>
          <option value="webinar">Webinar</option>
          <option value="video">Video</option>
          <option value="screengrabs">Screengrabs</option>
          <option value="motion_graphics">Motion Graphics</option>
          <option value="other">Other</option>
        </select>

        <div style={{ flex: 1 }} />

        <button onClick={() => setShowCreate(true)} className="btn-primary" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: '"Poppins", sans-serif',
        }}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 20 }}>
          {KANBAN_COLUMNS.map((col) => (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    flex: 1, minWidth: 240,
                    background: snapshot.isDraggingOver ? '#E8EDF7' : '#F3F2F1',
                    borderRadius: 12, padding: 12,
                    transition: 'background 0.2s ease',
                    minHeight: 400,
                    border: '1px solid #E8E8E8',
                  }}
                >
                  {/* Column header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 12, padding: '0 4px',
                  }}>
                    <span style={{
                      fontFamily: '"Poppins", sans-serif', fontWeight: 700,
                      fontSize: 13, color: '#1A1A2E',
                    }}>
                      {col.label}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '2px 10px',
                      borderRadius: 20, background: '#fff',
                      color: '#4B5563', border: '1px solid #D4D2D0',
                    }}>
                      {columns[col.id]?.length || 0}
                    </span>
                  </div>

                  {/* Cards */}
                  {(columns[col.id] || []).map((ticket, index) => (
                    <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            marginBottom: 8,
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.9 : 1,
                          }}
                        >
                          <TicketCard
                            ticket={ticket}
                            users={users}
                            onClick={() => setSelectedTicket(ticket)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {/* Empty state */}
                  {(columns[col.id] || []).length === 0 && (
                    <div style={{
                      border: '2px dashed #D4D2D0', borderRadius: 10,
                      padding: 32, textAlign: 'center',
                    }}>
                      <Columns3 size={24} color="#C4C4C4" style={{ margin: '0 auto 8px', display: 'block' }} />
                      <p style={{ fontSize: 13, color: '#999', margin: 0 }}>No tickets</p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* Modals */}
      {showCreate && (
        <CreateTicketModal
          users={users}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateTicket}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          users={users}
          currentUserId={userDoc?.uid}
          onClose={() => setSelectedTicket(null)}
          onUpdate={() => {
            // Ticket will update via subscription
            // Re-select the updated version
            setTimeout(() => {
              setSelectedTicket((prev) => {
                if (!prev) return null;
                return tickets.find((t) => t.id === prev.id) || prev;
              });
            }, 500);
          }}
        />
      )}
    </div>
  );
}
