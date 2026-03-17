import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Layers } from 'lucide-react';
import { ChartCard, EmptyChart, CustomTooltip } from './ChartCard';
import { getFeedbackRounds, formatVideoDuration } from '../../utils/reportUtils';

export default function FeedbackRoundsChart({ tickets, onTicketClick, chartRef }) {
  const data = tickets.map(t => ({
    jiraId: t.jiraId,
    ticketId: t.id,
    rounds: getFeedbackRounds(t),
    durationMin: t.videoDurationSec ? Math.round(t.videoDurationSec / 60 * 100) / 100 : null,
    durationLabel: formatVideoDuration(t.videoDurationSec),
  }));

  if (data.length === 0) {
    return <ChartCard title="Feedback Rounds" icon={Layers} chartRef={chartRef}><EmptyChart /></ChartCard>;
  }

  return (
    <ChartCard title="Feedback Rounds" icon={Layers} chartRef={chartRef}>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
          <CartesianGrid horizontal vertical={false} stroke="#F3F4F6" strokeDasharray="4 4" />
          <XAxis
            dataKey="jiraId"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#0451CC', fontWeight: 600, cursor: 'pointer' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            allowDecimals={false}
            label={{ value: 'Feedback Rounds', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6B7280' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            tickFormatter={v => {
              const m = Math.floor(v);
              const s = Math.round((v - m) * 60);
              return `${m}:${String(s).padStart(2, '0')}`;
            }}
            label={{ value: 'Video Length (MM:SS)', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#6B7280' } }}
          />
          <Tooltip content={<CustomTooltip formatter={(v, name) => {
            if (name === 'Video Length (Minutes)') {
              const m = Math.floor(v);
              const s = Math.round((v - m) * 60);
              return `${m}:${String(s).padStart(2, '0')}`;
            }
            return v;
          }} />} />
          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, fontFamily: '"Noto Sans"' }} />
          <Bar yAxisId="left" dataKey="rounds" name="Feedback Rounds" fill="#0451CC" radius={[3, 3, 0, 0]} barSize={32}>
            <LabelList dataKey="rounds" position="top" fontSize={10} fontWeight={600} fill="#0451CC" />
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="durationMin"
            name="Video Length (Minutes)"
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
