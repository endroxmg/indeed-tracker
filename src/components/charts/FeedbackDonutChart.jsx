import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ChartCard, EmptyChart } from './ChartCard';
import { FEEDBACK_COLORS, FEEDBACK_LABELS } from '../../utils/reportUtils';

const CATEGORIES = ['ui', 'voiceover', 'storyboard', 'animation', 'text', 'timing', 'other'];

export default function FeedbackDonutChart({ tickets, chartRef }) {
  const counts = {};
  let total = 0;
  tickets.forEach(t => {
    (t.versions || []).forEach(v => {
      (v.feedbackItems || []).forEach(fb => {
        const cat = fb.category || 'other';
        counts[cat] = (counts[cat] || 0) + 1;
        total++;
      });
    });
  });

  const data = CATEGORIES
    .filter(c => counts[c] > 0)
    .map(c => ({
      name: FEEDBACK_LABELS[c] || c,
      value: counts[c],
      color: FEEDBACK_COLORS[c],
      pct: Math.round((counts[c] / total) * 100),
    }));

  if (data.length === 0) {
    return <ChartCard title="Feedback Category Distribution" icon={PieChartIcon} chartRef={chartRef}><EmptyChart /></ChartCard>;
  }

  const CustomDonutTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8,
        padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.name}</div>
        <div>{d.value} items ({d.pct}%)</div>
      </div>
    );
  };

  return (
    <ChartCard title="Feedback Category Distribution" icon={PieChartIcon} chartRef={chartRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ position: 'relative', width: 220, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomDonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 26, color: 'var(--color-primary)' }}>{total}</div>
            <div style={{ fontSize: 11, color: 'var(--color-secondary-text)', fontWeight: 500 }}>Total Feedback</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ flex: 1 }}>
          {data.map(d => (
            <div key={d.name} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#fff', flex: 1 }}>{d.name}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', minWidth: 30, textAlign: 'right' }}>{d.value}</span>
              <span style={{ fontSize: 11, color: 'var(--color-secondary-text)', minWidth: 35, textAlign: 'right' }}>{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
