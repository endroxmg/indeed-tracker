import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ThumbsUp, Edit2 } from 'lucide-react';
import { ChartCard, EmptyChart, CustomTooltip } from './ChartCard';
import { FEEDBACK_COLORS, FEEDBACK_LABELS, getTotalFeedbackCount, getFeedbackByCategory } from '../../utils/reportUtils';

const CATEGORIES = ['ui', 'storyboard', 'voiceover', 'animation', 'text', 'timing', 'other'];
const TYPES = ['update', 'error'];

export default function FeedbackBreakdownChart({ tickets, onTicketClick, chartRef, isEditMode }) {
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
      _isOverridden: t._isOverridden,
      ...Object.fromEntries(CATEGORIES.map(c => [c, cats[c] || 0])),
    };
  }).filter(d => d.total > 0);

  return (
    <ChartCard title="Feedback Breakdown" icon={ThumbsUp} chartRef={chartRef}>
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left: Type of Feedback bar chart */}
        <div style={{ width: '45%' }}>
          <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 13, color: '#fff', margin: '0 0 8px' }}>Type of Feedback</h4>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={leftData} margin={{ top: 10, right: 10, bottom: 40, left: 0 }}>
              <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: '"Noto Sans"', fill: 'var(--color-secondary-text)' }} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} angle={-45} textAnchor="end" interval={0} height={80} />
              <YAxis tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: 'var(--color-secondary-text)' }} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[3, 3, 0, 0]}>
                <LabelList dataKey="count" position="top" fontSize={10} fontWeight={600} fill="var(--color-primary)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right: Feedback by Tickets stacked horizontal */}
        <div style={{ width: '55%' }}>
          <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 13, color: '#fff', margin: '0 0 8px' }}>Feedback by Tickets</h4>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={rightData} layout="vertical" margin={{ top: 10, right: 40, bottom: 5, left: 10 }}>
              <CartesianGrid horizontal={false} vertical stroke="var(--color-border)" strokeDasharray="4 4" />
              <XAxis type="number" tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: 'var(--color-secondary-text)' }} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} allowDecimals={false} />
              <YAxis
                dataKey="jiraId"
                type="category"
                tick={(props) => {
                  const data = rightData.find(d => d.jiraId === props.payload.value);
                  return (
                    <g transform={`translate(${props.x},${props.y})`} style={{ cursor: 'pointer' }} onClick={() => onTicketClick(data?.ticketId)}>
                      <text x={-5} y={0} dy={4} textAnchor="end" fontSize={11} fontFamily='"Poppins"' fontWeight={600} fill={isEditMode ? '#EF4444' : 'var(--color-primary)'}>
                        {props.payload.value}
                      </text>
                      {isEditMode && <path d="M-60 -4 L-50 -4 L-50 4 L-60 4 Z" fill="transparent" />} {/* Hit area */}
                      {isEditMode && (
                        <foreignObject x={-80} y={-8} width={16} height={16}>
                          <Edit2 size={12} color="#EF4444" />
                        </foreignObject>
                      )}
                    </g>
                  );
                }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11, fontFamily: '"Noto Sans"' }} />
              {CATEGORIES.map(cat => (
                <Bar key={cat} dataKey={cat} name={FEEDBACK_LABELS[cat]} stackId="a" fill={FEEDBACK_COLORS[cat]}>
                  {cat === CATEGORIES[CATEGORIES.length - 1] && (
                    <LabelList dataKey="total" position="right" fontSize={10} fontWeight={600} fill="#fff" />
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
