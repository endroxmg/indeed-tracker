import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { ChartCard, EmptyChart, CustomTooltip } from './ChartCard';
import { getSixMonthTrendData } from '../../utils/reportUtils';

export default function MonthlyTrendChart({ tickets, timeEntries, users, publicHolidays, chartRef }) {
  const data = getSixMonthTrendData(tickets, timeEntries, users, publicHolidays);

  if (data.length === 0) {
    return <ChartCard title="6-Month Trend Overview" icon={TrendingUp} chartRef={chartRef}><EmptyChart /></ChartCard>;
  }

  return (
    <ChartCard title="6-Month Trend Overview" icon={TrendingUp} chartRef={chartRef}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fontFamily: '"Noto Sans"', fill: 'var(--color-secondary-text)', fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: 'var(--color-secondary-text)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: 'var(--color-secondary-text)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip formatter={(v, name) => name === 'Utilization %' ? `${v}%` : v} />} />
          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, fontFamily: '"Noto Sans"' }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ticketsCompleted"
            name="Tickets Completed"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--color-primary)', stroke: '#fff', strokeWidth: 2 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avgFeedback"
            name="Avg Feedback / Ticket"
            stroke="#EF4444"
            strokeWidth={2}
            dot={{ r: 4, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="utilization"
            name="Utilization %"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
