import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Clock, Edit2 } from 'lucide-react';
import { ChartCard, EmptyChart, CustomTooltip } from './ChartCard';
import { getArcgateProductiveTime, getIndeedReviewTime } from '../../utils/reportUtils';

export default function TotalTimeChart({ tickets, dateRange, publicHolidays, onTicketClick, chartRef, isEditMode }) {
  const data = tickets.map(t => {
    const arcgate = getArcgateProductiveTime(t, dateRange.start, dateRange.end, publicHolidays);
    const indeed = getIndeedReviewTime(t, dateRange.start, dateRange.end, publicHolidays);
    return {
      jiraId: t.jiraId,
      ticketId: t.id,
      arcgate,
      indeed,
      total: arcgate + indeed,
      _isOverridden: t._isOverridden,
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
          <CartesianGrid horizontal={false} vertical stroke="var(--color-border)" strokeDasharray="4 4" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: 'var(--color-secondary-text)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            allowDecimals={false}
            domain={[0, maxVal]}
            label={{ value: 'Days', position: 'insideBottom', style: { fontSize: 11, fill: 'var(--color-secondary-text)' } }}
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
          <Tooltip content={<CustomTooltip formatter={(v, name) => `${v} days`} />} />
          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, fontFamily: '"Noto Sans"' }} />
          <Bar dataKey="arcgate" name="Arcgate Productive Time" stackId="a" fill="#86EFAC" barSize={24}>
            <LabelList dataKey="arcgate" position="center" fontSize={10} fontWeight={700} fill="#166534" formatter={v => v > 0 ? v : ''} />
          </Bar>
          <Bar dataKey="indeed" name="Indeed Review Time" stackId="a" fill="#FDE68A" barSize={24}>
            <LabelList dataKey="indeed" position="center" fontSize={10} fontWeight={700} fill="#92400E" formatter={v => v > 0 ? v : ''} />
            <LabelList dataKey="total" position="right" fontSize={10} fontWeight={700} fill="#fff" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
