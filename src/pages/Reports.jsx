import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeTickets, subscribeUsers, getTimeEntriesForRange } from '../services/firestoreService';
import { getWorkingDays, STATUS_LABELS, TYPE_LABELS, TICKET_TYPE_COLORS, FEEDBACK_CATEGORY_COLORS, formatDate, formatDuration, calculateUtilization } from '../utils/helpers';
import { SkeletonCard, SkeletonTable } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Calendar, Download, FileText, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';

export default function Reports() {
  const { userDoc } = useAuth();
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [generated, setGenerated] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState({});
  const [exporting, setExporting] = useState(false);
  const chartsRef = useRef(null);

  useEffect(() => {
    const unsub1 = subscribeTickets((data) => { setTickets(data); setLoading(false); });
    const unsub2 = subscribeUsers(setUsers);
    return () => { unsub1(); unsub2(); };
  }, []);

  const designers = users.filter((u) => u.isActive && u.role !== 'pending');

  const handleGenerate = async () => {
    try {
      const entries = await getTimeEntriesForRange(dateRange.start, dateRange.end);
      setTimeEntries(entries);
      setGenerated(true);
    } catch (err) {
      toast.error('Failed to generate report');
    }
  };

  const setQuickRange = (label) => {
    const now = new Date();
    let start, end;
    if (label === 'this') { start = startOfMonth(now); end = endOfMonth(now); }
    else if (label === 'last') { start = startOfMonth(subMonths(now, 1)); end = endOfMonth(subMonths(now, 1)); }
    else { start = startOfMonth(subMonths(now, 2)); end = endOfMonth(now); }
    setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!generated) return [];
    const rangeStart = new Date(dateRange.start);
    const rangeEnd = new Date(dateRange.end);
    const ticketsInRange = tickets.filter((t) => {
      const created = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      return created >= rangeStart && created <= rangeEnd;
    });
    const completed = tickets.filter((t) => {
      if (!t.completedAt) return false;
      const d = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt);
      return d >= rangeStart && d <= rangeEnd;
    });
    const totalVersions = tickets.reduce((s, t) => s + (t.versions?.length || 0), 0);
    const totalFeedback = tickets.reduce((s, t) =>
      s + (t.versions || []).reduce((vs, v) => vs + (v.feedbackItems?.length || 0), 0), 0);
    const totalHours = timeEntries.reduce((s, e) => s + (e.hours || 0), 0);

    return [
      { label: 'Tickets Started', value: ticketsInRange.length },
      { label: 'Tickets Completed', value: completed.length },
      { label: 'Total Versions', value: totalVersions },
      { label: 'Feedback Items', value: totalFeedback },
      { label: 'Hours Logged', value: `${totalHours}h` },
    ];
  }, [generated, tickets, timeEntries, dateRange]);

  // Utilization per designer
  const utilizationData = useMemo(() => {
    if (!generated) return [];
    const workDays = getWorkingDays(dateRange.start, dateRange.end);
    return designers.map((user) => {
      const logged = timeEntries.filter((e) => e.userId === user.uid).reduce((s, e) => s + (e.hours || 0), 0);
      const expected = workDays * (user.dailyCapacity || 8);
      const pct = expected > 0 ? Math.round((logged / expected) * 100) : 0;
      return { user, workDays, expected, logged, pct };
    });
  }, [generated, designers, timeEntries, dateRange]);

  // Tickets completed per month (last 6 months)
  const ticketsPerMonth = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    return months.map((m) => {
      const ms = startOfMonth(m);
      const me = endOfMonth(m);
      const count = tickets.filter((t) => {
        if (!t.completedAt) return false;
        const d = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt);
        return d >= ms && d <= me;
      }).length;
      return { month: format(m, 'MMM yy'), count };
    });
  }, [tickets]);

  // Avg versions by type
  const avgVersionsByType = useMemo(() => {
    const types = ['webinar', 'video', 'screengrabs', 'motion_graphics', 'other'];
    return types.map((type) => {
      const ofType = tickets.filter((t) => t.type === type);
      const avg = ofType.length > 0
        ? (ofType.reduce((s, t) => s + (t.versions?.length || 0), 0) / ofType.length).toFixed(1)
        : 0;
      return { type: TYPE_LABELS[type], avg: parseFloat(avg) };
    }).filter((d) => d.avg > 0);
  }, [tickets]);

  // Feedback category distribution
  const feedbackDistribution = useMemo(() => {
    const counts = {};
    tickets.forEach((t) => {
      (t.versions || []).forEach((v) => {
        (v.feedbackItems || []).forEach((fb) => {
          counts[fb.category] = (counts[fb.category] || 0) + 1;
        });
      });
    });
    const COLORS_MAP = { ui: '#4338CA', voiceover: '#7E22CE', animation: '#C2410C', storyboard: '#166534', text: '#1D4ED8', timing: '#BE123C', other: '#374151' };
    return Object.entries(counts).map(([cat, count]) => ({
      name: cat, value: count, color: COLORS_MAP[cat] || '#6B7280',
    }));
  }, [tickets]);

  // PDF Export
  const handleExport = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const html2canvas = (await import('html2canvas')).default;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const addFooter = (pageNum, totalPages) => {
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text('MotionDesk — Confidential', 14, pageH - 10);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pageW - 14, pageH - 10, { align: 'right' });
      };

      // Page 1: Cover
      pdf.setFillColor(4, 81, 204);
      pdf.rect(0, 0, pageW, 60, 'F');
      pdf.setFontSize(24);
      pdf.setTextColor(255, 255, 255);
      pdf.text('MotionDesk', 14, 30);
      pdf.setFontSize(12);
      pdf.text('Monthly Business Review', 14, 42);
      pdf.setFontSize(10);
      pdf.text(`${dateRange.start} to ${dateRange.end}`, 14, 52);

      pdf.setTextColor(45, 45, 45);
      pdf.setFontSize(11);
      let y = 80;
      summaryStats.forEach((s) => {
        pdf.text(`${s.label}: ${s.value}`, 14, y);
        y += 10;
      });

      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 14, pageH - 20);

      // Page 2: Utilization
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.setTextColor(4, 81, 204);
      pdf.text('Designer Utilization', 14, 20);
      pdf.autoTable({
        startY: 30,
        head: [['Designer', 'Working Days', 'Expected Hrs', 'Logged Hrs', 'Utilization']],
        body: utilizationData.map((d) => [d.user.name, d.workDays, `${d.expected}h`, `${d.logged}h`, `${d.pct}%`]),
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [4, 81, 204], textColor: 255 },
      });

      // Charts
      if (chartsRef.current) {
        const canvas = await html2canvas(chartsRef.current, { scale: 1.5, backgroundColor: '#fff' });
        const imgData = canvas.toDataURL('image/png');
        const imgW = pageW - 28;
        const imgH = (canvas.height * imgW) / canvas.width;
        if (pdf.lastAutoTable.finalY + imgH + 10 > pageH) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 14, pdf.lastAutoTable.finalY + 10, imgW, Math.min(imgH, pageH - 40));
      }

      // Page 3+: Ticket Table
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.setTextColor(4, 81, 204);
      pdf.text('Ticket Details', 14, 20);
      pdf.autoTable({
        startY: 30,
        head: [['Jira ID', 'Title', 'Assignee', 'Type', 'Versions', 'Feedback', 'Status']],
        body: tickets.map((t) => [
          t.jiraId, t.title?.substring(0, 30),
          users.find((u) => u.uid === t.assigneeId)?.name || '—',
          TYPE_LABELS[t.type], t.versions?.length || 0,
          (t.versions || []).reduce((s, v) => s + (v.feedbackItems?.length || 0), 0),
          STATUS_LABELS[t.status],
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [4, 81, 204], textColor: 255 },
        columnStyles: { 1: { cellWidth: 40 } },
      });

      // Add footers
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addFooter(i, totalPages);
      }

      pdf.save(`MBR_${dateRange.start}_to_${dateRange.end}.pdf`);
      toast.success('PDF exported successfully');
    } catch (err) {
      toast.error('PDF export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 };

  if (loading) return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div>
      {/* Date Range Selector */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '16px 24px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <Calendar size={18} color="#0451CC" />
        <input type="date" value={dateRange.start} onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))} style={inputStyle} />
        <span style={{ color: '#6B7280' }}>to</span>
        <input type="date" value={dateRange.end} onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))} style={inputStyle} />
        <button onClick={() => setQuickRange('this')} style={{ ...inputStyle, background: '#F9FAFB', cursor: 'pointer', fontWeight: 500, border: '1px solid #E5E7EB' }}>This Month</button>
        <button onClick={() => setQuickRange('last')} style={{ ...inputStyle, background: '#F9FAFB', cursor: 'pointer', fontWeight: 500, border: '1px solid #E5E7EB' }}>Last Month</button>
        <button onClick={() => setQuickRange('3months')} style={{ ...inputStyle, background: '#F9FAFB', cursor: 'pointer', fontWeight: 500, border: '1px solid #E5E7EB' }}>Last 3 Months</button>
        <div style={{ flex: 1 }} />
        <button onClick={handleGenerate} style={{
          padding: '8px 20px', borderRadius: 10, border: 'none',
          background: '#0451CC', color: '#fff', fontSize: 14,
          fontWeight: 600, cursor: 'pointer',
        }}>Generate Report</button>
        <button onClick={handleExport} disabled={!generated || exporting} style={{
          padding: '8px 20px', borderRadius: 10, border: '1px solid #E5E7EB',
          background: generated ? '#fff' : '#F3F4F6', color: generated ? '#0451CC' : '#9CA3AF',
          fontSize: 14, fontWeight: 500, cursor: generated ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Download size={14} /> {exporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>

      {!generated ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <FileText size={48} color="#D1D5DB" style={{ margin: '0 auto 16px', display: 'block' }} />
          <h3 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: '#6B7280', margin: '0 0 8px' }}>Select a date range and generate report</h3>
          <p style={{ fontSize: 14, color: '#9CA3AF' }}>Use the controls above to define your reporting period</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
            {summaryStats.map((s, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16, padding: 20,
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 28, color: '#0451CC' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Utilization Gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(designers.length, 4)}, 1fr)`, gap: 16, marginBottom: 24 }}>
            {utilizationData.map(({ user, workDays, expected, logged, pct }) => (
              <div key={user.uid} style={{
                background: '#fff', borderRadius: 16, padding: 24,
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
                textAlign: 'center',
              }}>
                <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px' }}>
                  <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#0451CC" strokeWidth="10"
                      strokeDasharray={`${(Math.min(pct, 100) / 100) * 314} 314`}
                      strokeLinecap="round" />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 24, color: '#0451CC',
                  }}>
                    {pct}%
                  </div>
                </div>
                <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 14, margin: '0 0 8px' }}>{user.name}</h4>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.8 }}>
                  <div>{workDays} working days</div>
                  <div>Expected: {expected}h | Logged: {logged}h</div>
                  <div>Capacity: {user.dailyCapacity || 8}h/day</div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div ref={chartsRef} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Tickets per month */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 14, margin: '0 0 12px' }}>Tickets Completed / Month</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={ticketsPerMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0451CC" strokeWidth={2} dot={{ fill: '#0451CC' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Avg versions */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 14, margin: '0 0 12px' }}>Avg Versions per Ticket</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={avgVersionsByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#0451CC" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category distribution */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 14, margin: '0 0 12px' }}>Feedback Category Distribution</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={feedbackDistribution} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name }) => name}>
                    {feedbackDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ticket Table */}
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 24,
          }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB' }}>
              <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 15, margin: 0 }}>Ticket Details</h4>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['', 'Jira ID', 'Title', 'Assignee', 'Type', 'Versions', 'Total Days', 'Duration', 'Feedback', 'Errors', 'Updates', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', fontFamily: '"Poppins", sans-serif', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => {
                    const assignee = users.find((u) => u.uid === t.assigneeId);
                    const totalFb = (t.versions || []).reduce((s, v) => s + (v.feedbackItems?.length || 0), 0);
                    const errorCount = (t.versions || []).reduce((s, v) => s + (v.feedbackItems || []).filter((f) => f.type === 'error').length, 0);
                    const updateCount = totalFb - errorCount;
                    const expanded = expandedTickets[t.id];
                    const statusColor = t.status === 'completed' ? '#16A34A' : 'transparent';
                    const totalDays = t.createdAt ? getWorkingDays(
                      t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt),
                      t.completedAt ? (t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt)) : new Date()
                    ) : '—';

                    return (
                      <tr key={t.id} className="alt-row" style={{ borderBottom: '1px solid #F3F4F6', borderLeft: `3px solid ${statusColor}` }}>
                        <td style={{ padding: '8px 8px', width: 28 }}>
                          <button onClick={() => setExpandedTickets((p) => ({ ...p, [t.id]: !p[t.id] }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0451CC', fontSize: 13 }}>{t.jiraId}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13 }}>{assignee?.name || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: TICKET_TYPE_COLORS[t.type]?.bg, color: TICKET_TYPE_COLORS[t.type]?.text }}>{TYPE_LABELS[t.type]}</span>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 13, textAlign: 'center' }}>{t.versions?.length || 0}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, textAlign: 'center' }}>{totalDays}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13 }}>{formatDuration(t.videoDurationSec)}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, textAlign: 'center' }}>{totalFb}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, textAlign: 'center', color: '#DC2626' }}>{errorCount}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, textAlign: 'center', color: '#D97706' }}>{updateCount}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: (STATUS_COLORS[t.status]||{}).bg, color: (STATUS_COLORS[t.status]||{}).text, fontWeight: 500 }}>
                            {STATUS_LABELS[t.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
