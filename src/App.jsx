import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useState, useEffect } from 'react';
import { subscribeTickets, subscribeUsers } from './services/firestoreService';
import { isOverdue } from './utils/helpers';
import Layout from './components/Layout';
import Login from './pages/Login';
import PendingAccess from './pages/PendingAccess';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import TimeLog from './pages/TimeLog';
import Reports from './pages/Reports';
import Team from './pages/Team';
import ActivityLog from './pages/ActivityLog';
import Shifts from './pages/Shifts';
import LeaveManagement from './pages/LeaveManagement';
import Salary from './pages/Salary';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, userDoc, loading, isAdmin, isPending, isActive } = useAuth();

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F9FAFB',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px' }} />
        <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 8, margin: '0 auto' }} />
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (isPending || !isActive) return <PendingAccess />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return children;
}

export default function App() {
  const { user, userDoc, loading } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!user || !userDoc || (userDoc.roles?.includes('pending') || userDoc.role === 'pending')) return;
    const unsub1 = subscribeTickets(setTickets);
    const unsub2 = subscribeUsers(setUsers);
    return () => { unsub1(); unsub2(); };
  }, [user, userDoc]);

  const overdueCount = tickets.filter(isOverdue).length;

  const handleSelectTicket = (ticket) => {
    // Navigate to kanban and open the ticket — simplified for now
    window.location.href = '/kanban';
  };

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F9FAFB',
    }}>
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
    </div>
  );

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  if ((userDoc?.roles?.includes('pending') || userDoc?.role === 'pending') || !userDoc?.isActive) {
    return <PendingAccess />;
  }

  return (
    <Layout tickets={tickets} onSelectTicket={handleSelectTicket} overdueCount={overdueCount}>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
        <Route path="/timelog" element={<ProtectedRoute><TimeLog /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/activity-log" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
        <Route path="/shifts" element={<Navigate to="/" />} />
        <Route path="/leaves" element={<Navigate to="/" />} />
        <Route path="/salary" element={<Navigate to="/" />} />
        <Route path="/team" element={<ProtectedRoute adminOnly><Team /></ProtectedRoute>} />
        <Route path="/login" element={<Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
