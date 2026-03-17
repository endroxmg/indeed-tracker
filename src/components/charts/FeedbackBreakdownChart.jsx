import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ThumbsUp } from 'lucide-react';
import { ChartCard, EmptyChart, CustomTooltip } from './ChartCard';
import { FEEDBACK_COLORS, FEEDBACK_LABELS, getTotalFeedbackCount, getFeedbackByCategory } from '../../utils/reportUtils';

const CATEGORIES = ['ui', 'storyboard', 'voiceover', 'animation', 'text', 'timing', 'other'];
const TYPES = ['update', 'error'];

export default function FeedbackBreakdownChart({ tickets, onTicketClick, chartRef }) {
  if (!tickets.length) {
    return <ChartCard title="Feedback Breakdown" icon={ThumbsUp} chartRef={chartRef}><EmptyChart /></ChartCard>;
  }

  // Left chart: Type of Feedback (category + type combos)
  const comboCounts = {};
  tickets.forEach(t => {
    (t.versions || []).forEach(v => {
      (v.feedbackItems || []).forEach(fb => {
        const cat = fb.category || 'other';
        const type = fb.type || 'update';
        const label = `${FEEDBACK_LABELS[cat] || cat} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        comboCounts[label] = (comboCounts[label] || 0) + 1;
      });
    });
  });

  // Build all combos including zeros
  const leftData = [];
  CATEGORIES.forEach(cat => {
    TYPES.forEach(type => {
      const label = `${FEEDBACK_LABELS[cat] || cat} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
      leftData.push({ name: label, count: comboCounts[label] || 0 });
    });
  });

  // Right chart: Feedback by Tickets stacked horizontal
  const rightData = tickets.map(t => {
    const cats = getFeedbackByCategory(t);
    return {
      jiraId: t.jiraId,
      ticketId: t.id,
      total: getTotalFeedbackCount(t),
      ...Object.fromEntries(CATEGORIES.map(c => [c, cats[c] || 0])),
    };
  }).filter(d => d.total > 0);

  return (
    <ChartCard title="Feedback Breakdown" icon={ThumbsUp} chartRef={chartRef}>
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left: Type of Feedback bar chart */}
        <div style={{ width: '45%' }}>
          <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 13, color: '#2D2D2D', margin: '0 0 8px' }}>Type of Feedback</h4>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={leftData} margin={{ top: 10, right: 10, bottom: 40, left: 0 }}>
              <CartesianGrid horizontal vertical={false} stroke="#F3F4F6" strokeDasharray="4 4" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: '"Noto Sans"', fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} angle={-45} textAnchor="end" interval={0} height={80} />
              <YAxis tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#0451CC" radius={[3, 3, 0, 0]}>
                <LabelList dataKey="count" position="top" fontSize={10} fontWeight={600} fill="#0451CC" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right: Feedback by Tickets stacked horizontal */}
        <div style={{ width: '55%' }}>
          <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 13, color: '#2D2D2D', margin: '0 0 8px' }}>Feedback by Tickets</h4>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={rightData} layout="vertical" margin={{ top: 10, right: 40, bottom: 5, left: 10 }}>
              <CartesianGrid horizontal={false} vertical stroke="#F3F4F6" strokeDasharray="4 4" />
              <XAxis type="number" tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} allowDecimals={false} />
              <YAxis
                dataKey="jiraId"
                type="category"
                tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#0451CC', fontWeight: 600, cursor: 'pointer' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                width={80}
                onClick={(e) => {
                  const ticket = rightData.find(d => d.jiraId === e?.value);
                  if (ticket && onTicketClick) onTicketClick(ticket.ticketId);
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11, fontFamily: '"Noto Sans"' }} />
              {CATEGORIES.map(cat => (
                <Bar key={cat} dataKey={cat} name={FEEDBACK_LABELS[cat]} stackId="a" fill={FEEDBACK_COLORS[cat]}>
                  {cat === CATEGORIES[CATEGORIES.length - 1] && (
                    <LabelList dataKey="total" position="right" fontSize={10} fontWeight={600} fill="#2D2D2D" />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
