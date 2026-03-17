import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, ReferenceLine } from 'recharts';
import { Search } from 'lucide-react';
import { ChartCard, EmptyChart, CustomTooltip } from './ChartCard';
import { getTotalFeedbackCount, getFeedbackRounds, durationInMinutes, linearRegression } from '../../utils/reportUtils';

export default function CorrelationScatterChart({ tickets, chartRef }) {
  const withDuration = tickets.filter(t => t.videoDurationSec && t.videoDurationSec > 0);

  if (withDuration.length < 3) {
    return (
      <ChartCard title="Does Longer Video = More Feedback?" icon={Search} chartRef={chartRef}>
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Search size={40} color="#D1D5DB" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h4 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, color: '#6B7280', margin: '0 0 4px', fontSize: 14 }}>
            Not enough data to show correlation yet
          </h4>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Need at least 3 tickets with video duration recorded</p>
        </div>
      </ChartCard>
    );
  }

  const data = withDuration.map(t => ({
    jiraId: t.jiraId,
    x: durationInMinutes(t.videoDurationSec),
    y: getTotalFeedbackCount(t),
    rounds: Math.max(getFeedbackRounds(t), 1),
  }));

  const reg = linearRegression(data);
  const minX = Math.min(...data.map(d => d.x));
  const maxX = Math.max(...data.map(d => d.x));

  const trendPoints = reg ? [
    { x: minX, y: reg.slope * minX + reg.intercept },
    { x: maxX, y: reg.slope * maxX + reg.intercept },
  ] : [];

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    const r = Math.min(4 + payload.rounds * 2, 14);
    return (
      <circle cx={cx} cy={cy} r={r} fill="#0451CC" fillOpacity={0.6} stroke="#0451CC" strokeWidth={1.5} />
    );
  };

  const CustomScatterTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
        padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.jiraId}</div>
        <div>Duration: {Math.floor(d.x)}:{String(Math.round((d.x % 1) * 60)).padStart(2, '0')} min</div>
        <div>Feedback: {d.y} items</div>
        <div>Rounds: {d.rounds}</div>
      </div>
    );
  };

  return (
    <ChartCard title="Does Longer Video = More Feedback?" icon={Search} chartRef={chartRef}>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid horizontal vertical={false} stroke="#F3F4F6" strokeDasharray="4 4" />
          <XAxis
            dataKey="x"
            name="Duration (min)"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            label={{ value: 'Video Duration (minutes)', position: 'insideBottom', offset: -5, style: { fontSize: 11, fill: '#6B7280' } }}
          />
          <YAxis
            dataKey="y"
            name="Feedback Count"
            tick={{ fontSize: 11, fontFamily: '"Noto Sans"', fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            allowDecimals={false}
            label={{ value: 'Total Feedback Count', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6B7280' } }}
          />
          <ZAxis dataKey="rounds" range={[40, 200]} />
          <Tooltip content={<CustomScatterTooltip />} />
          <Scatter data={data} shape={<CustomDot />} />
          {reg && trendPoints.length === 2 && (
            <ReferenceLine
              segment={[
                { x: trendPoints[0].x, y: Math.max(0, trendPoints[0].y) },
                { x: trendPoints[1].x, y: Math.max(0, trendPoints[1].y) },
              ]}
              stroke="#6B7280"
              strokeDasharray="6 4"
              strokeWidth={1.5}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
