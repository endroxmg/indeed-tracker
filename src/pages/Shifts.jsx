import { useState } from 'react';
import ShiftScheduleTab from '../components/shifts/ShiftScheduleTab';
import AttendanceCalendarTab from '../components/shifts/AttendanceCalendarTab';
import DailyLogTab from '../components/shifts/DailyLogTab';

export default function Shifts() {
  const [activeTab, setActiveTab] = useState('schedule');

  const tabs = [
    { id: 'schedule', label: 'Shift Schedule' },
    { id: 'calendar', label: 'Attendance Calendar' },
    { id: 'daily', label: 'Daily Log' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', gap: 32 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 0 16px',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? '#0451CC' : '#6B7280',
              borderBottom: activeTab === tab.id ? '2px solid #0451CC' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ minHeight: 400 }}>
        {activeTab === 'schedule' && <ShiftScheduleTab />}
        {activeTab === 'calendar' && <AttendanceCalendarTab />}
        {activeTab === 'daily' && <DailyLogTab />}
      </div>
    </div>
  );
}
