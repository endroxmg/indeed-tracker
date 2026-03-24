import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { TrendingUp, Edit2 } from 'lucide-react';
import { ChartCard, EmptyChart, CustomTooltip } from './ChartCard';
import { getArcgateProductiveTime, getIndeedReviewTime, formatVideoDuration } from '../../utils/reportUtils';

export default function TurnaroundTimeChart({ tickets, dateRange, publicHolidays, onTicketClick, chartRef, isEditMode }) {
  const data = tickets.map(t => {
    const arcgate = getArcgateProductiveTime(t, dateRange.start, dateRange.end, publicHolidays);
    const indeed = getIndeedReviewTime(t, dateRange.start, dateRange.end, publicHolidays);
    return {
      jiraId: t.jiraId,
      ticketId: t.id,
      totalDays: arcgate + indeed,
      durationMin: t.videoDurationSec ? Math.round(t.videoDurationSec / 60 * 100) / 100 : null,
      durationLabel: formatVideoDuration(t.videoDurationSec),
      _isOverridden: t._isOverridden,
    };
  });

  if (data.length === 0) {
    return <ChartCard title="Tickets Turnaround Time" icon={TrendingUp} chartRef={chartRef}><EmptyChart /></ChartCard>;
  }

  return (
    <ChartCard title="Tickets Turnaround Time" icon={TrendingUp} chartRef={chartRef}>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
          <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
          <XAxis
            dataKey="jiraId"
            tick={(props) => {
              const d = data.find(item => item.jiraId === props.payload.value);
              return (
                <g transform={`translate(${props.x},${props.y})`} style={{ cursor: 'pointer' }} onClick={() => onTicketClick(d?.ticketId)}>
                  <text x={0} y={0} dy={16} textAnchor="middle" fontSize={11} fontFamily='"Poppins"' fontWeight={600} fill={isEditMode ? '#EF4444' : 'var(--color-primary)'}>
                    {props.payload.value}
                  </text>
                  {isEditMode && (
                    <foreignObject x={-6} y={18} width={12} height={12}>
                      <Edit2 size={10} color="#EF4444" />
                    </foreignObject>
                  )}
                </g>
              );
            }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: 'var(--color-secondary-text)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            allowDecimals={false}
            label={{ value: 'Total Days', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--color-secondary-text)' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: 'var(--color-secondary-text)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickFormatter={v => {
              const m = Math.floor(v);
              const s = Math.round((v - m) * 60);
              return `${m}:${String(s).padStart(2, '0')}`;
            }}
          />
          <Tooltip content={<CustomTooltip formatter={(v, name) => {
            if (name === 'Video Length') {
              const m = Math.floor(v);
              const s = Math.round((v - m) * 60);
              return `${m}:${String(s).padStart(2, '0')}`;
            }
            return `${v} days`;
          }} />} />
          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, fontFamily: '"Noto Sans"' }} />
          <Bar yAxisId="left" dataKey="totalDays" name="Total days" fill="var(--color-primary)" radius={[3, 3, 0, 0]} barSize={32}>
            <LabelList dataKey="totalDays" position="top" fontSize={10} fontWeight={600} fill="var(--color-primary)" />
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="durationMin"
            name="Video Length"
            stroke="#D97706"
            strokeWidth={2}
            dot={{ r: 4, fill: '#D97706', stroke: '#fff', strokeWidth: 2 }}
            connectNulls={false}
            label={({ x, y, value }) => value ? (
              <text x={x} y={y - 10} textAnchor="middle" fontSize={9} fontWeight={600} fill="#D97706">
                {formatVideoDuration(value * 60)}
              </text>
            ) : null}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
