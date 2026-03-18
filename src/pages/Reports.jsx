import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeTickets, subscribeUsers, getTimeEntriesForRange } from '../services/firestoreService';
import { getWorkingDaysInRange, ticketsCreatedInRange, ticketsCompletedInRange, ticketsActiveInRange } from '../utils/reportUtils';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import TicketDetailModal from '../components/TicketDetailModal';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getEnhancedTicketData } from '../utils/mbrOverrides';
import EditTicketDataModal from '../components/reports/EditTicketDataModal';
import { Edit2, Eye, Info } from 'lucide-react';

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
  const { userDoc, publicHolidays } = useAuth();
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
      const entries = await getTimeEntriesForRange(dateRange.start, dateRange.end);
      setTimeEntries(entries);
      // Also fetch 6 months of data for trend chart
      const sixMonthStart = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');
      const allEntries = await getTimeEntriesForRange(sixMonthStart, dateRange.end);
      setAllTimeEntries(allEntries);
      setGenerated(true);
    } catch (err) {
      toast.error('Failed to generate report');
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
    const expectedHours = workingDaysCount * totalCapacity;
    const utilPct = expectedHours > 0 ? ((totalHours / expectedHours) * 100).toFixed(2) : '0.00';

    return [
      { label: 'Tickets Assigned', value: created.length },
      { label: 'Tickets Completed', value: completed.length },
      { label: 'Time Spent', value: `${totalHours} hours` },
      { label: 'Daily Avg. Utilization', value: `${dailyAvg} hours` },
      { label: '% Utilization', value: `${utilPct}%` },
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

  const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: '"Noto Sans", sans-serif' };
  const quickBtnStyle = { ...inputStyle, background: '#F9FAFB', cursor: 'pointer', fontWeight: 500, border: '1px solid #E5E7EB', transition: 'all 0.15s' };

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
      {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );

  return (
    <div>
      {/* ─── Top Bar ─── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 22, color: '#1A1A2E', margin: '0 0 4px',
        }}>
          Monthly Business Review — Video Content Creation
        </h2>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px', fontWeight: 500 }}>
          Client Enablement & Scaled Ops | Arcgate × Indeed
        </p>

        <div style={{
          background: '#fff', borderRadius: 16, padding: '14px 24px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <Calendar size={18} color="#0451CC" />
          <input type="date" value={dateRange.start} onChange={e => { setDateRange(p => ({ ...p, start: e.target.value })); setGenerated(false); }} style={inputStyle} />
          <span style={{ color: '#6B7280', fontSize: 13 }}>to</span>
          <input type="date" value={dateRange.end} onChange={e => { setDateRange(p => ({ ...p, end: e.target.value })); setGenerated(false); }} style={inputStyle} />
          <button onClick={() => setQuickRange('this')} style={quickBtnStyle}>This Month</button>
          <button onClick={() => setQuickRange('last')} style={quickBtnStyle}>Last Month</button>
          <button onClick={() => setQuickRange('3months')} style={quickBtnStyle}>Last 3 Months</button>
          <div style={{ flex: 1 }} />
          {(userDoc?.role === 'admin' || userDoc?.role === 'moderator' || userDoc?.roles?.includes('moderator')) && (
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              style={{
                padding: '9px 16px', borderRadius: 10, border: '1px solid',
                background: isEditMode ? '#FEF2F2' : '#fff',
                borderColor: isEditMode ? '#DC2626' : '#E5E7EB',
                color: isEditMode ? '#DC2626' : '#374151',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
            >
              {isEditMode ? <Edit2 size={16} /> : <Eye size={16} />}
              {isEditMode ? 'Edit Mode ON' : 'Edit Mode'}
            </button>
          )}
          <button onClick={handleGenerate} disabled={generating} style={{
            padding: '9px 22px', borderRadius: 10, border: 'none',
            background: '#0451CC', color: '#fff', fontSize: 14,
            fontWeight: 600, cursor: generating ? 'wait' : 'pointer',
            fontFamily: '"Poppins", sans-serif',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: generating ? 0.7 : 1, transition: 'opacity 0.2s',
          }}>
            {generating && <Loader size={14} className="spinning" />}
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
          <button onClick={handleExport} disabled={!generated || exporting} style={{
            padding: '9px 22px', borderRadius: 10, border: '1px solid #E5E7EB',
            background: generated ? '#fff' : '#F3F4F6', color: generated ? '#0451CC' : '#9CA3AF',
            fontSize: 14, fontWeight: 500, cursor: generated && !exporting ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: '"Poppins", sans-serif',
          }}>
            {exporting ? <Loader size={14} className="spinning" /> : <Download size={14} />}
            {exporting ? 'Generating PDF…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {!generated ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <FileText size={48} color="#D1D5DB" style={{ margin: '0 auto 16px', display: 'block' }} />
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: '#6B7280', margin: '0 0 8px' }}>
            Select a date range and generate report
          </h3>
          <p style={{ fontSize: 14, color: '#9CA3AF' }}>Use the controls above to define your reporting period</p>
        </div>
      ) : (
        <>
          {/* ─── Section 1: Summary Stats ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 8 }}>
            {summaryStats.map((s, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16, padding: '20px 18px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, fontFamily: '"Noto Sans", sans-serif' }}>{s.label}</div>
                <div style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 28, color: '#0451CC' }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            {isEditMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', background: '#FEF2F2', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                <Info size={16} /> Clicking a ticket in charts will now open the Edit Overrides modal.
              </div>
            )}
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right', fontSize: 12, color: '#6B7280', fontFamily: '"Noto Sans", sans-serif' }}>
              Time Range: {dateRange.start} – {dateRange.end} ({workingDays} working days)
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
            fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 18,
            color: '#1A1A2E', margin: '32px 0 16px', paddingBottom: 8,
            borderBottom: '2px solid #E5E7EB',
          }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 0 }}>
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
          background: 'rgba(26,26,46,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '32px 48px',
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <Loader size={32} color="#0451CC" className="spinning" style={{ margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: '#2D2D2D', margin: '0 0 4px' }}>Generating PDF…</h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Capturing charts and building report</p>
          </div>
        </div>
      )}
    </div>
  );
}
