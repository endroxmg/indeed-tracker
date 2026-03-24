import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeTickets, subscribeUsers, getTimeEntriesForRange } from '../services/firestoreService';
import { getWorkingDaysInRange, ticketsCreatedInRange, ticketsCompletedInRange, ticketsActiveInRange, toDate } from '../utils/reportUtils';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import TicketDetailModal from '../components/TicketDetailModal';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getEnhancedTicketData } from '../utils/mbrOverrides';
import EditTicketDataModal from '../components/reports/EditTicketDataModal';
import { Edit2, Eye, Info, Calendar, Download, Loader2, FileText } from 'lucide-react';

// Chart components
import UtilizationChart from '../components/charts/UtilizationChart';
import FeedbackBreakdownChart from '../components/charts/FeedbackBreakdownChart';
import FeedbackVsLengthChart from '../components/charts/FeedbackVsLengthChart';
import FeedbackRoundsChart from '../components/charts/FeedbackRoundsChart';
import TurnaroundTimeChart from '../components/charts/TurnaroundTimeChart';
import TotalTimeChart from '../components/charts/TotalTimeChart';
import DesignerWorkloadCards from '../components/charts/DesignerWorkloadCards';
import VersionEfficiencyChart from '../components/charts/VersionEfficiencyChart';
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart';
import CorrelationScatterChart from '../components/charts/CorrelationScatterChart';
import FeedbackDonutChart from '../components/charts/FeedbackDonutChart';
import { ChartSkeleton } from '../components/charts/ChartCard';

export default function Reports() {
  const { user, userDoc, publicHolidays, isAdmin, isModerator, loading: authLoading } = useAuth();
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [allTimeEntries, setAllTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [mbrOverrides, setMbrOverrides] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);

  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  // Chart refs for pdf capture
  const chartRefs = {
    utilization: useRef(null),
    feedbackBreakdown: useRef(null),
    feedbackVsLength: useRef(null),
    feedbackRounds: useRef(null),
    turnaround: useRef(null),
    totalTime: useRef(null),
    designerWorkload: useRef(null),
    versionEfficiency: useRef(null),
    monthlyTrend: useRef(null),
    correlation: useRef(null),
    feedbackDonut: useRef(null),
  };

  useEffect(() => {
    const unsub1 = subscribeTickets(data => { setTickets(data); setLoading(false); });
    const unsub2 = subscribeUsers(setUsers);
    
    // Listen to MBR Overrides
    const unsub3 = onSnapshot(collection(db, 'mbrOverrides'), (snap) => {
      setMbrOverrides(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const designers = useMemo(() =>
    users.filter(u => u.isActive && (u.roles?.includes('designer') || u.role === 'designer')),
    [users]
  );

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let entries = [];
      let allEntries = [];
      try {
        entries = await getTimeEntriesForRange(dateRange.start, dateRange.end);
      } catch (queryErr) {
        console.warn('Time entries query failed (may need Firestore index):', queryErr);
      }
      setTimeEntries(entries);
      // Also fetch 6 months of data for trend chart
      try {
        const sixMonthStart = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');
        allEntries = await getTimeEntriesForRange(sixMonthStart, dateRange.end);
      } catch (trendErr) {
        console.warn('Trend data query failed:', trendErr);
      }
      setAllTimeEntries(allEntries);
      setGenerated(true);
      if (entries.length === 0) {
        toast.success('Report generated — no time entries found for this range');
      }
    } catch (err) {
      console.error('Report generation error:', err);
      toast.error('Failed to generate report: ' + (err.message || ''));
    } finally {
      setGenerating(false);
    }
  };

  const setQuickRange = (label) => {
    const now = new Date();
    let start, end;
    if (label === 'this') { start = startOfMonth(now); end = endOfMonth(now); }
    else if (label === 'last') { start = startOfMonth(subMonths(now, 1)); end = endOfMonth(subMonths(now, 1)); }
    else { start = startOfMonth(subMonths(now, 2)); end = endOfMonth(now); }
    setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
    setGenerated(false);
  };

  // ─── Summary Stats ────────────────────────────────────────
  const summaryStats = useMemo(() => {
    if (!generated) return [];
    const created = ticketsCreatedInRange(tickets, dateRange.start, dateRange.end);
    const completed = ticketsCompletedInRange(tickets, dateRange.start, dateRange.end);
    const totalHours = timeEntries.reduce((s, e) => s + (e.hours || 0), 0);
    const workingDaysCount = getWorkingDaysInRange(dateRange.start, dateRange.end, publicHolidays);
    const dailyAvg = workingDaysCount > 0 ? (totalHours / workingDaysCount).toFixed(2) : '0.00';
    const totalCapacity = designers.reduce((s, u) => s + (u.dailyCapacity || 8), 0);
    const expectedHours = (workingDaysCount || 0) * totalCapacity;
    const utilPct = (expectedHours > 0 && !isNaN(totalHours)) ? ((totalHours / expectedHours) * 100).toFixed(2) : '0.00';

    return [
      { label: 'Tickets Assigned', value: created.length },
      { label: 'Tickets Completed', value: completed.length },
      { label: 'Time Spent', value: `${totalHours} hours` },
      { label: 'Daily Avg', value: `${dailyAvg} hours` },
      { label: 'Utilization', value: `${utilPct}%` },
    ];
  }, [generated, tickets, timeEntries, dateRange, designers, publicHolidays]);

  // Tickets active in the selected range (for charts)
  const activeTickets = useMemo(() => {
    if (!generated) return [];
    const baseActive = ticketsActiveInRange(tickets, dateRange.start, dateRange.end);
    return getEnhancedTicketData(baseActive, mbrOverrides);
  }, [generated, tickets, dateRange, mbrOverrides]);

  const workingDays = useMemo(() =>
    getWorkingDaysInRange(dateRange.start, dateRange.end, publicHolidays),
    [dateRange, publicHolidays]
  );

  // ─── Ticket click handler ────────────────────────────────
  const handleTicketClick = useCallback((ticketId) => {
    const t = activeTickets.find(t => t.id === ticketId);
    if (!t) return;

    if (isEditMode) {
      setEditingTicket(t);
    } else {
      setSelectedTicket(t);
    }
  }, [activeTickets, isEditMode]);

  // ─── PDF Export ───────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const { exportReportPDF } = await import('../utils/pdfExport');
      await exportReportPDF({
        dateRange,
        summaryStats,
        chartRefs,
        workingDays,
        isAnyOverridden: activeTickets.some(t => t._isOverridden)
      });
      toast.success('PDF exported successfully');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('PDF export failed: ' + (err.message || ''));
    } finally {
      setExporting(false);
    }
  };

  const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13, fontFamily: '"Noto Sans", sans-serif', background: 'var(--color-surface-hover)', color: '#fff' };
  const quickBtnStyle = { ...inputStyle, background: 'var(--color-surface)', cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s' };

  if (authLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader"></div></div>;
  if (!user) return <div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>Please log in to access reports.</div>;

  if (loading) return (
    <div style={{ padding: 48 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  return (
    <div>
      {/* ─── Top Bar ─── */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{
          fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 24, color: '#fff', margin: '0 0 4px',
        }}>
          Analytics & Reports
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-secondary-text)', margin: '0 0 20px', fontWeight: 500 }}>
          Client Enablement & Scaled Ops | Arcgate × Indeed
        </p>

        <div style={{
          background: 'var(--color-surface)', borderRadius: 16, padding: '16px 24px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <Calendar size={18} color="var(--color-primary)" />
          <input type="date" value={dateRange.start} onChange={e => { setDateRange(p => ({ ...p, start: e.target.value })); setGenerated(false); }} style={inputStyle} />
          <span style={{ color: 'var(--color-secondary-text)', fontSize: 13 }}>to</span>
          <input type="date" value={dateRange.end} onChange={e => { setDateRange(p => ({ ...p, end: e.target.value })); setGenerated(false); }} style={inputStyle} />
          <button onClick={() => setQuickRange('this')} style={quickBtnStyle} className="hover:bg-[var(--color-surface-hover)] hover:text-white">This Month</button>
          <button onClick={() => setQuickRange('last')} style={quickBtnStyle} className="hover:bg-[var(--color-surface-hover)] hover:text-white">Last Month</button>
          <button onClick={() => setQuickRange('3months')} style={quickBtnStyle} className="hover:bg-[var(--color-surface-hover)] hover:text-white">Last 3 Months</button>
          <div style={{ flex: 1 }} />
          {(isAdmin || isModerator) && (
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              style={{
                padding: '10px 16px', borderRadius: 10, border: '1px solid',
                background: isEditMode ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-surface-hover)',
                borderColor: isEditMode ? '#EF4444' : 'var(--color-border)',
                color: isEditMode ? '#EF4444' : '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
              className="hover:border-[var(--color-primary)]"
            >
              {isEditMode ? <Edit2 size={16} /> : <Eye size={16} />}
              {isEditMode ? 'Edit Mode ON' : 'Edit Mode'}
            </button>
          )}
          <button onClick={handleGenerate} disabled={generating} style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: 'var(--color-primary)', color: '#fff', fontSize: 14,
            fontWeight: 700, cursor: generating ? 'wait' : 'pointer',
            fontFamily: '"Poppins", sans-serif',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: 'var(--shadow-glow)', transition: 'all 0.2s'
          }} className="hover:bg-[var(--color-primary-dark)] hover:scale-[1.02]">
            {generating && <Loader2 size={14} className="spinning" />}
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
          <button onClick={handleExport} disabled={!generated || exporting} style={{
            padding: '10px 20px', borderRadius: 10, border: '1px solid var(--color-primary)',
            background: generated ? 'var(--color-background)' : 'var(--color-surface)', color: generated ? 'var(--color-primary)' : 'var(--color-secondary-text)',
            fontSize: 14, fontWeight: 600, cursor: generated && !exporting ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: '"Poppins", sans-serif', transition: 'all 0.2s'
          }} className={generated && !exporting ? 'hover:bg-[var(--color-primary)] hover:text-white' : ''}>
            {exporting ? <Loader2 size={14} className="spinning" /> : <Download size={14} />}
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {!generated ? (
        <div style={{ textAlign: 'center', padding: 80, background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)' }}>
          <FileText size={48} color="var(--color-secondary-text)" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.5 }} />
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
            Select a date range and generate report
          </h3>
          <p style={{ fontSize: 14, color: 'var(--color-secondary-text)' }}>Use the controls above to define your reporting period</p>
        </div>
      ) : (
        <>
          {/* ─── Section 1: Summary Stats ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 8 }}>
            {summaryStats.map((s, i) => (
              <div key={i} style={{
                background: 'var(--color-surface)', borderRadius: 16, padding: '24px 20px',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-dark))' }} />
                <div style={{ fontSize: 12, color: 'var(--color-secondary-text)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 32, color: '#fff', lineHeight: 1 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
            {isEditMode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <Info size={16} /> Clicking a ticket in charts will now open the Edit Overrides modal.
              </div>
            ) : <div />}
            <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--color-secondary-text)', fontWeight: 500, background: 'var(--color-surface)', padding: '6px 16px', borderRadius: 20, border: '1px solid var(--color-border)' }}>
              Range: <span style={{ color: '#fff' }}>{dateRange.start}</span> to <span style={{ color: '#fff' }}>{dateRange.end}</span> • {workingDays} working days
            </div>
          </div>

          {/* ─── Section 2: Task Allocation / Utilization ─── */}
          <UtilizationChart
            dateRange={dateRange}
            timeEntries={timeEntries}
            users={users}
            publicHolidays={publicHolidays}
            chartRef={chartRefs.utilization}
            isEditMode={isEditMode}
          />

          {/* ─── Section 3: Feedback Breakdown ─── */}
          <FeedbackBreakdownChart
            tickets={activeTickets}
            onTicketClick={handleTicketClick}
            chartRef={chartRefs.feedbackBreakdown}
          />

          {/* ─── Section 4: Feedback Count vs Video Length ─── */}
          <FeedbackVsLengthChart
            tickets={activeTickets}
            onTicketClick={handleTicketClick}
            chartRef={chartRefs.feedbackVsLength}
            isEditMode={isEditMode}
          />

          {/* ─── Section 5: Feedback Rounds ─── */}
          <FeedbackRoundsChart
            tickets={activeTickets}
            onTicketClick={handleTicketClick}
            chartRef={chartRefs.feedbackRounds}
            isEditMode={isEditMode}
          />

          {/* ─── Section 6: Tickets Turnaround Time ─── */}
          <TurnaroundTimeChart
            tickets={activeTickets}
            dateRange={dateRange}
            publicHolidays={publicHolidays}
            onTicketClick={handleTicketClick}
            chartRef={chartRefs.turnaround}
            isEditMode={isEditMode}
          />

          {/* ─── Section 7: Total Time to Complete ─── */}
          <TotalTimeChart
            tickets={activeTickets}
            dateRange={dateRange}
            publicHolidays={publicHolidays}
            onTicketClick={handleTicketClick}
            chartRef={chartRefs.totalTime}
            isEditMode={isEditMode}
          />

          {/* ─── Section 8: Additional Insights ─── */}
          <div style={{
            fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 20,
            color: '#fff', margin: '40px 0 24px', paddingBottom: 12,
            borderBottom: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{ width: 4, height: 24, background: 'var(--color-primary)', borderRadius: 4 }} />
            Additional Insights
          </div>

          {/* 8A: Designer Workload */}
          <DesignerWorkloadCards
            users={users}
            timeEntries={timeEntries}
            dateRange={dateRange}
            tickets={activeTickets}
            publicHolidays={publicHolidays}
            chartRef={chartRefs.designerWorkload}
          />

          {/* 8B: Version Efficiency */}
          <VersionEfficiencyChart
            tickets={activeTickets}
            onTicketClick={handleTicketClick}
            chartRef={chartRefs.versionEfficiency}
            isEditMode={isEditMode}
          />

          {/* 8C + 8D side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 0 }}>
            <MonthlyTrendChart
              tickets={tickets}
              timeEntries={allTimeEntries}
              users={users}
              publicHolidays={publicHolidays}
              chartRef={chartRefs.monthlyTrend}
            />
            <CorrelationScatterChart
              tickets={activeTickets}
              chartRef={chartRefs.correlation}
            />
          </div>

          {/* 8E: Feedback Donut */}
          <FeedbackDonutChart
            tickets={activeTickets}
            chartRef={chartRefs.feedbackDonut}
          />
        </>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          users={users}
          currentUserId={userDoc?.uid}
          onClose={() => setSelectedTicket(null)}
          onUpdate={() => {
            setTimeout(() => {
              setSelectedTicket(prev => {
                if (!prev) return null;
                return tickets.find(t => t.id === prev.id) || prev;
              });
            }, 500);
          }}
        />
      )}

      {/* Edit Override Modal */}
      {editingTicket && (
        <EditTicketDataModal 
          ticket={editingTicket}
          onClose={() => setEditingTicket(null)}
        />
      )}

      {/* Overlay during export */}
      {exporting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 20, padding: '40px 60px',
            textAlign: 'center', boxShadow: 'var(--shadow-modal)', border: '1px solid var(--color-border)'
          }}>
            <Loader2 size={40} color="var(--color-primary)" className="spinning" style={{ margin: '0 auto 16px', display: 'block' }} />
            <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, color: '#fff', margin: '0 0 8px', fontSize: 20 }}>Generating PDF</h3>
            <p style={{ fontSize: 14, color: 'var(--color-secondary-text)', margin: 0 }}>Capturing stunning charts for your report...</p>
          </div>
        </div>
      )}
    </div>
  );
}
