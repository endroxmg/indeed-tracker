import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LeaveOverviewTab from '../components/leaves/LeaveOverviewTab';
import LeaveCalendarTab from '../components/leaves/LeaveCalendarTab';
import LeaveLogTab from '../components/leaves/LeaveLogTab';
import PublicHolidays from './PublicHolidays';
import { getCurrentFinancialYear } from '../utils/helpers';
import { Settings } from 'lucide-react';

export default function LeaveManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const { isAdmin } = useAuth();
  const currentFY = getCurrentFinancialYear();

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'calendar', label: 'Leave Calendar' },
    { id: 'log', label: 'Leave Log' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', gap: 32, flex: 1 }}>
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
        
        <div style={{
          background: '#EAF0FD',
          color: '#0451CC',
          padding: '6px 16px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'Poppins, sans-serif'
        }}>
          FY {currentFY} | Resets: 1 Apr {parseInt(currentFY.split('-')[1])}
        </div>

        {isAdmin && (
          <button 
            onClick={() => setShowHolidayModal(true)}
            style={manageHolidaysBtnStyle}
          >
            <Settings size={16} /> Manage Holidays
          </button>
        )}
      </div>

      <div style={{ minHeight: 400 }}>
        {activeTab === 'overview' && <LeaveOverviewTab />}
        {activeTab === 'calendar' && <LeaveCalendarTab />}
        {activeTab === 'log' && <LeaveLogTab />}
      </div>

      {showHolidayModal && (
        <PublicHolidays onClose={() => setShowHolidayModal(false)} />
      )}
    </div>
  );
}

const manageHolidaysBtnStyle = {
  marginLeft: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 16px',
  borderRadius: 10,
  border: '1px solid #E5E7EB',
  background: '#fff',
  fontSize: 13,
  fontWeight: 600,
  color: '#4B5563',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};
