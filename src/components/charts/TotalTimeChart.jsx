import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Clock } from 'lucide-react';
import { ChartCard, EmptyChart, CustomTooltip } from './ChartCard';
import { getArcgateProductiveTime, getIndeedReviewTime } from '../../utils/reportUtils';

export default function TotalTimeChart({ tickets, dateRange, publicHolidays, onTicketClick, chartRef }) {
  const data = tickets.map(t => {
    const arcgate = getArcgateProductiveTime(t, dateRange.start, dateRange.end, publicHolidays);
    const indeed = getIndeedReviewTime(t, dateRange.start, dateRange.end, publicHolidays);
    return {
      jiraId: t.jiraId,
      ticketId: t.id,
      arcgate,
      indeed,
      total: arcgate + indeed,
    };
  }).filter(d => d.total > 0);

  if (data.length === 0) {
    return <ChartCard title="Total Time to Complete" icon={Clock} chartRef={chartRef}><EmptyChart /></ChartCard>;
  }

  const maxVal = Math.max(...data.map(d => d.total)) + 2;

  return (
    <ChartCard title="Total Time to Complete" subtitle="Total Time to Completion Breakdown" icon={Clock} chartRef={chartRef}>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 40 + 60, 300)}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 50, bottom: 5, left: 10 }}>
          <CartesianGrid horizontal={false} vertical stroke="#F3F4F6" strokeDasharray="4 4" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            allowDecimals={false}
            domain={[0, maxVal]}
            label={{ value: 'Days', position: 'insideBottom', style: { fontSize: 11, fill: '#6B7280' } }}
          />
          <YAxis
            dataKey="jiraId"
            type="category"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#0451CC', fontWeight: 600, cursor: 'pointer' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            width={80}
          />
          <Tooltip content={<CustomTooltip formatter={(v, name) => `${v} days`} />} />
          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, fontFamily: '"Noto Sans"' }} />
          <Bar dataKey="arcgate" name="Arcgate Productive Time" stackId="a" fill="#86EFAC" barSize={24}>
            <LabelList dataKey="arcgate" position="center" fontSize={10} fontWeight={700} fill="#166534" formatter={v => v > 0 ? v : ''} />
          </Bar>
          <Bar dataKey="indeed" name="Indeed Review Time" stackId="a" fill="#FDE68A" barSize={24}>
            <LabelList dataKey="indeed" position="center" fontSize={10} fontWeight={700} fill="#92400E" formatter={v => v > 0 ? v : ''} />
            <LabelList dataKey="total" position="right" fontSize={10} fontWeight={700} fill="#2D2D2D" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
