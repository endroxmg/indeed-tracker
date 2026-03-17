import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { GitBranch } from 'lucide-react';
import { ChartCard, EmptyChart, CustomTooltip } from './ChartCard';

function getVersionColor(count) {
  if (count <= 1) return '#16A34A';
  if (count === 2) return '#D97706';
  return '#DC2626';
}

export default function VersionEfficiencyChart({ tickets, onTicketClick, chartRef }) {
  const data = tickets.map(t => ({
    jiraId: t.jiraId,
    ticketId: t.id,
    versions: t.versions?.length || 1,
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
          <CartesianGrid horizontal={false} vertical stroke="#F3F4F6" strokeDasharray="4 4" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            allowDecimals={false}
          />
          <YAxis
            dataKey="jiraId"
            type="category"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#0451CC', fontWeight: 600, cursor: 'pointer' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
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
        textAlign: 'center', fontSize: 12, color: '#6B7280', marginTop: 8,
        padding: '8px 16px', background: '#F9FAFB', borderRadius: 8,
      }}>
        <span style={{ color: '#16A34A', fontWeight: 600 }}>{oneVersion} tickets completed in 1 version ({onePct}%)</span>
        <span style={{ margin: '0 8px', color: '#D1D5DB' }}>|</span>
        <span style={{ color: '#DC2626', fontWeight: 600 }}>{multiVersion} tickets needed 2+ versions ({multiPct}%)</span>
      </div>
    </ChartCard>
  );
}
