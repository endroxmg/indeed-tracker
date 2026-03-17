import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Gauge } from 'lucide-react';
import { ChartCard, EmptyChart, CustomTooltip } from './ChartCard';
import { getWorkingDatesInRange, getDailyTeamHours } from '../../utils/reportUtils';
import { format } from 'date-fns';

export default function UtilizationChart({ dateRange, timeEntries, users, chartRef }) {
  const activeDesigners = users.filter(u => u.isActive && u.role === 'designer');
  const totalCapacity = activeDesigners.reduce((s, u) => s + (u.dailyCapacity || 8), 0);
  const workingDates = getWorkingDatesInRange(dateRange.start, dateRange.end);

  const data = workingDates.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const hours = getDailyTeamHours(dateStr, timeEntries);
    return {
      date: format(d, 'M/d'),
      fullDate: dateStr,
      utilization: Math.round(hours * 100) / 100,
      capacity: totalCapacity,
    };
  });

  if (data.length === 0) {
    return (
      <ChartCard title="Task Allocation" icon={Gauge} chartRef={chartRef}>
        <EmptyChart />
      </ChartCard>
    );
  }

  const maxY = Math.max(totalCapacity, ...data.map(d => d.utilization)) + 2;
  const rangeLabel = `Time Range: ${dateRange.start} – ${dateRange.end} (${workingDates.length} days)`;

  const renderLabel = ({ x, y, value }) => (
    <text x={x} y={y - 8} textAnchor="middle" fontSize={10} fontWeight={600} fill="#0451CC">{value}</text>
  );

  return (
    <ChartCard title="Task Allocation" icon={Gauge} rightLabel={rangeLabel} chartRef={chartRef}>
      <h4 style={{ textAlign: 'center', fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 14, color: '#0451CC', margin: '0 0 12px' }}>
        Team Utilization vs Available Capacity
      </h4>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid horizontal vertical={false} stroke="#F3F4F6" strokeDasharray="4 4" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
          <YAxis domain={[0, maxY]} tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
          <Tooltip content={<CustomTooltip formatter={(v, n) => n === 'capacity' ? `${v} hrs` : `${v} hrs`} />} />
          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, fontFamily: '"Noto Sans"' }} />
          <Line
            type="monotone"
            dataKey="utilization"
            name="Utilization"
            stroke="#0451CC"
            strokeWidth={2}
            dot={{ r: 4, fill: '#0451CC', stroke: '#fff', strokeWidth: 2 }}
            label={renderLabel}
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="capacity"
            name="Available Capacity"
            stroke="#D97706"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
