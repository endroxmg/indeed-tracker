import { IndianRupee, Download } from 'lucide-react';
import SalaryBreakdownCard from './SalaryBreakdownCard';
import DailyBreakdownTable from './DailyBreakdownTable';
import BonusDetailsCard from './BonusDetailsCard';
import { generateSalarySlip } from '../../utils/salaryPdf';
import { useAuth } from '../../contexts/AuthContext';

export default function MySalaryView({ record, currentMonth }) {
  const { userDoc } = useAuth();
  
  if (!record) {
    return (
      <div style={{ 
        background: '#fff', padding: '60px', borderRadius: 16, border: '1px solid #E5E7EB',
        textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' 
      }}>
        <div style={{ background: '#F3F4F6', padding: '20px', borderRadius: '50%', marginBottom: 16 }}>
          <IndianRupee size={48} color="#9CA3AF" />
        </div>
        <h3 style={{ fontSize: 18, color: '#1A1A2E', margin: '0 0 8px' }}>No Salary Data for this Month</h3>
        <p style={{ color: '#6B7280', maxWidth: 300, margin: 0 }}>
          Your salary record for this month hasn't been generated yet. Please contact your administrator.
        </p>
      </div>
    );
  }

  const formatCurrency = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  const stats = [
    { label: 'Gross Monthly Salary', value: formatCurrency(record.monthlySalary), icon: IndianRupee, color: '#2D2D2D' },
    { label: 'Per Day Rate', value: `₹${record.dailyRate.toFixed(2)}`, icon: IndianRupee, color: '#2D2D2D' },
    { label: 'Bonuses This Month', value: formatCurrency(record.sundayBonusAmount + record.holidayBonusAmount + record.overtimeAmount), icon: IndianRupee, color: '#16A34A' },
    { label: 'Take Home This Month', value: formatCurrency(record.netSalary), icon: IndianRupee, color: '#0451CC', bold: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ 
            background: '#fff', padding: '20px', borderRadius: 16, border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ color: '#6B7280', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontSize: 24, fontWeight: stat.bold ? 700 : 600, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <SalaryBreakdownCard record={record} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        <DailyBreakdownTable record={record} />
        <BonusDetailsCard record={record} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button 
          onClick={() => generateSalarySlip(record, userDoc)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', fontSize: 15 }}
        >
          <Download size={20} /> Download Salary Slip — {stats[3].value}
        </button>
      </div>
    </div>
  );
}
