import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { GitBranch, Edit2 } from 'lucide-react';
import { ChartCard, EmptyChart, CustomTooltip } from './ChartCard';

function getVersionColor(count) {
  if (count <= 1) return '#10B981';
  if (count === 2) return '#D97706';
  return '#EF4444';
}

export default function VersionEfficiencyChart({ tickets, onTicketClick, chartRef, isEditMode }) {
  const data = tickets.map(t => ({
    jiraId: t.jiraId,
    ticketId: t.id,
    versions: t.versions?.length || 1,
    _isOverridden: t._isOverridden,
  }));

  if (data.length === 0) {
    return <ChartCard title="Version Efficiency" icon={GitBranch} chartRef={chartRef}><EmptyChart /></ChartCard>;
  }

  const oneVersion = data.filter(d => d.versions === 1).length;
  const multiVersion = data.filter(d => d.versions >= 2).length;
  const onePct = data.length > 0 ? Math.round((oneVersion / data.length) * 100) : 0;
  const multiPct = data.length > 0 ? Math.round((multiVersion / data.length) * 100) : 0;

  return (
    <ChartCard title="Version Efficiency" subtitle="How many versions did each ticket need?" icon={GitBranch} chartRef={chartRef}>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 36 + 60, 240)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
          <CartesianGrid horizontal={false} vertical stroke="var(--color-border)" strokeDasharray="4 4" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: 'var(--color-secondary-text)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            allowDecimals={false}
          />
          <YAxis
            dataKey="jiraId"
            type="category"
            tick={(props) => {
              const d = data.find(item => item.jiraId === props.payload.value);
              return (
                <g transform={`translate(${props.x},${props.y})`} style={{ cursor: 'pointer' }} onClick={() => onTicketClick(d?.ticketId)}>
                  <text x={-20} y={0} dy={4} textAnchor="end" fontSize={11} fontFamily='"Poppins"' fontWeight={600} fill={isEditMode ? '#EF4444' : 'var(--color-primary)'}>
                    {props.payload.value}
                  </text>
                  {isEditMode && (
                    <foreignObject x={-15} y={-8} width={12} height={12}>
                      <Edit2 size={10} color="#EF4444" />
                    </foreignObject>
                  )}
                </g>
              );
            }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            width={80}
          />
          <Tooltip content={<CustomTooltip formatter={v => `${v} version${v !== 1 ? 's' : ''}`} />} />
          <Bar dataKey="versions" name="Versions" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getVersionColor(entry.versions)} />
            ))}
            <LabelList dataKey="versions" position="insideRight" fontSize={10} fontWeight={700} fill="#fff" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{
        textAlign: 'center', fontSize: 12, color: 'var(--color-secondary-text)', marginTop: 8,
        padding: '8px 16px', background: 'var(--color-surface-hover)', borderRadius: 8,
      }}>
        <span style={{ color: '#10B981', fontWeight: 600 }}>{oneVersion} tickets completed in 1 version ({onePct}%)</span>
        <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>|</span>
        <span style={{ color: '#EF4444', fontWeight: 600 }}>{multiVersion} tickets needed 2+ versions ({multiPct}%)</span>
      </div>
    </ChartCard>
  );
}
