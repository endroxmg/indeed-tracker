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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <h2 style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 700, fontSize: 24, color: '#fff', margin: '0 0 8px' }}>
            Leave Management
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-secondary-text)', margin: 0, fontWeight: 500 }}>
            Track and manage employee time off and holidays.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: 32, flex: 1 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 0 16px',
                fontSize: 14,
                fontWeight: activeTab === tab.id ? 700 : 600,
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-secondary-text)',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                background: 'none',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              className={activeTab !== tab.id ? 'hover:text-white' : ''}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div style={{
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          padding: '8px 16px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: '"Poppins", sans-serif',
          border: '1px solid rgba(37, 87, 167, 0.2)',
          marginLeft: 24
        }}>
          FY {currentFY} | Resets: 1 Apr {parseInt(currentFY.split('-')[1])}
        </div>

        {isAdmin && (
          <button 
            onClick={() => setShowHolidayModal(true)}
            style={manageHolidaysBtnStyle}
            className="hover:bg-[var(--color-surface-hover)]"
          >
            <Settings size={16} color="var(--color-secondary-text)" /> Manage Holidays
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
  padding: '10px 16px',
  borderRadius: 12,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};
