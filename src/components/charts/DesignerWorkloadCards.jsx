import { Users, Info } from 'lucide-react';
import { ChartCard, EmptyChart } from './ChartCard';
import { getWorkingDaysInRange } from '../../utils/reportUtils';
import InitialsAvatar from '../InitialsAvatar';

export default function DesignerWorkloadCards({ users, timeEntries, dateRange, tickets, publicHolidays, chartRef, isEditMode }) {
  const activeDesigners = users.filter(u => u.isActive && (u.roles?.includes('designer') || u.role === 'designer'));
  const workingDays = getWorkingDaysInRange(dateRange.start, dateRange.end, publicHolidays);

  if (activeDesigners.length === 0) {
    return <ChartCard title="Designer Workload Split" icon={Users} chartRef={chartRef}><EmptyChart /></ChartCard>;
  }

  const designerData = activeDesigners.map(user => {
    const logged = timeEntries
      .filter(e => e.userId === user.uid)
      .reduce((s, e) => s + (e.hours || 0), 0);
    const expected = workingDays * (user.dailyCapacity || 8);
    const pct = expected > 0 ? Math.round((logged / expected) * 100) : 0;
    const diff = Math.round((logged - expected) * 100) / 100;
    const designerTickets = tickets.filter(t => t.assigneeId === user.uid || t.ldap === user.ldap);
    const ticketsWorked = designerTickets.length;
    const anyOverridden = designerTickets.some(t => t._isOverridden);

    return { user, workingDays, expected, logged, pct, diff, ticketsWorked, anyOverridden };
  });

  const arcRadius = 50;
  const arcCircumference = 2 * Math.PI * arcRadius;

  return (
    <ChartCard title="Designer Workload Split" icon={Users} chartRef={chartRef}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(activeDesigners.length, 3)}, 1fr)`, gap: 20 }}>
        {designerData.map(({ user, workingDays: wd, expected, logged, pct, diff, ticketsWorked, anyOverridden }) => (
          <div key={user.uid} style={{
            border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, textAlign: 'center',
            background: '#FAFAFA',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, position: 'relative' }}>
              <InitialsAvatar name={user.name} size={28} bg="#0451CC" color="#fff" />
              <span style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 600, fontSize: 14, color: '#2D2D2D' }}>{user.name}</span>
              {anyOverridden && (
                <div style={{ position: 'absolute', top: -4, right: 0 }} title="Contains overridden ticket data">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D97706', border: '2px solid #FAFAFA' }} />
                </div>
              )}
            </div>

            {/* SVG gauge */}
            <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px' }}>
              <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r={arcRadius} fill="none" stroke="#E5E7EB" strokeWidth="10" />
                <circle cx="60" cy="60" r={arcRadius} fill="none" stroke="#0451CC" strokeWidth="10"
                  strokeDasharray={`${(Math.min(pct, 100) / 100) * arcCircumference} ${arcCircumference}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.8s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 22, color: '#0451CC',
              }}>
                {pct}%
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 2, textAlign: 'left', padding: '0 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Working Days:</span>
                <span style={{ fontWeight: 600, color: '#2D2D2D' }}>{wd}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Expected Hours:</span>
                <span style={{ fontWeight: 600, color: '#2D2D2D' }}>{expected} hrs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Logged Hours:</span>
                <span style={{ fontWeight: 600, color: '#2D2D2D' }}>{logged} hrs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{diff >= 0 ? 'Extra Hours:' : 'Diff:'}</span>
                <span style={{ fontWeight: 600, color: diff >= 0 ? '#16A34A' : '#DC2626' }}>
                  {diff >= 0 ? '+' : ''}{diff} hrs
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tickets Worked On:</span>
                <span style={{ fontWeight: 600, color: '#2D2D2D' }}>{ticketsWorked}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
